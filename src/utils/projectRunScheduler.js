import { extractNodeRunTimesInMilliseconds } from './calculation.js'

/**
 * Event-driven project scheduler — step-by-step flow:
 *
 * 1. Convert every node's timing information into exact BigInt milliseconds.
 * 2. Find the earliest virtual timestamp that still has runnable nodes.
 * 3. Fetch the latest card data for every node due at that timestamp.
 * 4. Emit one event containing the card values needed by the calculation engine.
 * 5. Advance each executed node's next run time by its own interval.
 * 6. Queue the next virtual timestamp as a new task so the browser can stay responsive.
 * 7. Finish when no node has another valid run, or stop when the caller cancels.
 *
 * This scheduler never waits for the project's real-world duration. It advances through
 * virtual time, one timestamp per queued task, without a blocking while/for traversal.
 */

const defaultTaskQueue = {
  schedule: (callback) => setTimeout(callback, 0),
  cancel: (taskId) => clearTimeout(taskId),
}

/** Returns whether a node is allowed to run at its next scheduled timestamp. */
function canNodeRun({ time, next_time_to_run: nextTimeToRun, end_time: endTime }) {
  return time > 0n && nextTimeToRun > 0n && endTime > 0n && nextTimeToRun <= endTime
}

/** Finds the earliest pending virtual timestamp without stepping through unused time. */
function findNextVirtualTime(nodeRunTimes) {
  return nodeRunTimes
    .filter(canNodeRun)
    .reduce((earliestTime, { next_time_to_run: nextTimeToRun }) => {
      if (earliestTime === null || nextTimeToRun < earliestTime) return nextTimeToRun
      return earliestTime
    }, null)
}

/** Orders simultaneous events from lower graph levels to higher graph levels. */
function orderRunTimesBottomToTop(nodeRunTimes, project) {
  const nodesById = new Map(project.nodes.map((node) => [node.id, node]))
  const nodePositions = new Map(project.nodes.map((node, index) => [node.id, index]))
  const depthByNodeId = new Map()

  function getDepthFromTop(nodeId, activePath = new Set()) {
    if (depthByNodeId.has(nodeId)) return depthByNodeId.get(nodeId)
    if (activePath.has(nodeId)) return 0

    const node = nodesById.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} was not found.`)

    const nextPath = new Set(activePath)
    nextPath.add(nodeId)
    const aboveNodeIds = node.relations?.aboveCardIds ?? []
    const depth =
      aboveNodeIds.length === 0
        ? 0
        : 1 + Math.max(...aboveNodeIds.map((aboveNodeId) => getDepthFromTop(aboveNodeId, nextPath)))

    depthByNodeId.set(nodeId, depth)
    return depth
  }

  return [...nodeRunTimes].sort((firstRunTime, secondRunTime) => {
    const depthDifference =
      getDepthFromTop(secondRunTime.id) - getDepthFromTop(firstRunTime.id)
    if (depthDifference !== 0) return depthDifference
    return nodePositions.get(firstRunTime.id) - nodePositions.get(secondRunTime.id)
  })
}

/** Extracts only the calculation fields belonging to the node's card type. */
function getCardCalculationValues(node) {
  if (node.type === 'value') {
    return {
      type: 'value',
      value: node.value,
    }
  }

  if (node.type === 'percentage') {
    return {
      type: 'percentage',
      percentageValue: node.percentage?.value,
      referenceValue: node.referenceValue,
    }
  }

  throw new Error(`Unsupported node type: ${node.type}.`)
}

/** Creates a safe copy so callers cannot mutate the scheduler's internal timing state. */
function copyNodeRunTimes(nodeRunTimes) {
  return nodeRunTimes.map((nodeRunTime) => ({
    ...nodeRunTime,
    cardValues: nodeRunTime.cardValues ? { ...nodeRunTime.cardValues } : undefined,
  }))
}

/**
 * Creates a controllable virtual-time scheduler for one project run.
 *
 * `getProject` is called at every virtual timestamp, so edits to card values made while
 * the scheduler is active are read immediately. The controller is single-use; create a
 * new controller to restart a completed or stopped project.
 */
export function createProjectRunScheduler({
  project,
  projectEndTimeInMilliseconds,
  getProject = () => project,
  onNodeRun = () => {},
  onComplete = () => {},
  onError = () => {},
  taskQueue = defaultTaskQueue,
}) {
  let nodeRunTimes = extractNodeRunTimesInMilliseconds(
    project,
    projectEndTimeInMilliseconds,
  )
  let status = 'idle'
  let queuedTaskId = null
  let resolveRun
  let rejectRun
  let runPromise

  /** Returns the public result shared by completion, cancellation, and manual inspection. */
  function createResult(resultStatus = status) {
    return {
      status: resultStatus,
      nodeRunTimes: copyNodeRunTimes(nodeRunTimes),
    }
  }

  /** Completes the active run and resolves its Promise exactly once. */
  function finishRun() {
    status = 'completed'
    queuedTaskId = null
    const result = createResult()
    onComplete(result)
    resolveRun?.(result)
  }

  /** Reports a scheduler failure and rejects its Promise exactly once. */
  function failRun(error) {
    status = 'failed'
    queuedTaskId = null
    onError(error)
    rejectRun?.(error)
  }

  /**
   * Processes every node due at one virtual timestamp, then queues the next timestamp.
   * Scheduling another task lets the JavaScript call stack unwind between timestamps.
   */
  function processNextVirtualTime() {
    if (status !== 'running') return

    try {
      const nextVirtualTime = findNextVirtualTime(nodeRunTimes)
      if (nextVirtualTime === null) {
        finishRun()
        return
      }

      const projectAtCurrentTime = getProject()
      if (!Array.isArray(projectAtCurrentTime?.nodes)) {
        throw new Error('The current project and its nodes are required while running.')
      }

      const dueNodeRunTimes = orderRunTimesBottomToTop(
        nodeRunTimes.filter(
          (nodeRunTime) =>
            canNodeRun(nodeRunTime) && nodeRunTime.next_time_to_run === nextVirtualTime,
        ),
        projectAtCurrentTime,
      )

      dueNodeRunTimes.forEach((nodeRunTime) => {
        const currentProject = getProject()
        if (!Array.isArray(currentProject?.nodes)) {
          throw new Error('The current project and its nodes are required while running.')
        }

        const currentNode = currentProject.nodes.find((node) => node.id === nodeRunTime.id)
        if (!currentNode) throw new Error(`Node ${nodeRunTime.id} was not found.`)

        const cardValues = getCardCalculationValues(currentNode)
        nodeRunTime.cardValues = cardValues
        nodeRunTime.next_time_to_run += nodeRunTime.time

        const runEvent = {
          id: nodeRunTime.id,
          virtualTime: nextVirtualTime,
          cardValues: { ...cardValues },
          next_time_to_run: nodeRunTime.next_time_to_run,
          end_time: nodeRunTime.end_time,
        }

        onNodeRun(runEvent)
      })

      queuedTaskId = taskQueue.schedule(processNextVirtualTime)
    } catch (error) {
      failRun(error)
    }
  }

  /** Starts the event-driven run and resolves after completion or cancellation. */
  function start() {
    if (runPromise) return runPromise

    status = 'running'
    runPromise = new Promise((resolve, reject) => {
      resolveRun = resolve
      rejectRun = reject
      queuedTaskId = taskQueue.schedule(processNextVirtualTime)
    })

    return runPromise
  }

  /** Cancels the queued task and resolves the active run as stopped. */
  function stop() {
    if (status !== 'running') return createResult()

    if (queuedTaskId !== null) taskQueue.cancel(queuedTaskId)
    queuedTaskId = null
    status = 'stopped'
    const result = createResult()
    resolveRun?.(result)
    return result
  }

  return {
    start,
    stop,
    getResult: () => createResult(),
  }
}
