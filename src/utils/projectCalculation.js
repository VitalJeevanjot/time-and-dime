import { calculateProjectDurationInMilliseconds, extractNodeRunTimesInMilliseconds } from './calculation.js'
import { normalizeDecimalValue } from './decimalCalculation.js'
import { applyNodeToImmediateAboveNodes } from './nodeValuePropagation.js'
import { createProjectRunScheduler } from './projectRunScheduler.js'

export const PROJECT_CALCULATION_LIMITS = Object.freeze({
  maximumNodes: 500,
  maximumRelations: 5_000,
  maximumNodeRuns: 25_000n,
  maximumValueUpdates: 10_000n,
  maximumProjectCharacters: 1_000_000,
  maximumResultCharacters: 1_000_000,
  maximumRuntimeMilliseconds: 10_000,
})

const supportedNodeTypes = new Set(['value', 'percentage'])
const supportedOperations = new Set(['+', '-', '/', '*', '%'])

function cloneProject(project) {
  return structuredClone(project)
}

function getNodeCalculationField(node) {
  if (node.type === 'value') {
    return {
      field: 'value',
      value: normalizeDecimalValue(node.value, `node ${node.id}.value`),
    }
  }

  if (node.type === 'percentage') {
    return {
      field: 'percentage.value',
      value: normalizeDecimalValue(
        node.percentage?.value,
        `node ${node.id}.percentage.value`,
      ),
    }
  }

  throw new Error(`Unsupported node type: ${node.type}.`)
}

function getNodeMeaning(node) {
  if (node.type === 'value') {
    return `At each scheduled run, applies ${node.operation} using its current Value to each immediate, non-static node above.`
  }

  const referenceMeaning =
    normalizeDecimalValue(node.referenceValue ?? '0') === '0'
      ? 'each target’s current calculation field'
      : `Reference Value ${normalizeDecimalValue(node.referenceValue)}`
  return `At each scheduled run, calculates its current Percentage of ${referenceMeaning}, then applies ${node.operation} to each immediate, non-static node above.`
}

function createCalculationGuard({ signal, timeoutMilliseconds }) {
  const startedAt = Date.now()
  const maximumRuntime = Math.min(
    PROJECT_CALCULATION_LIMITS.maximumRuntimeMilliseconds,
    Math.max(1, Number(timeoutMilliseconds) || PROJECT_CALCULATION_LIMITS.maximumRuntimeMilliseconds),
  )

  return () => {
    if (signal?.aborted) {
      const error = new Error('The project calculation was cancelled.')
      error.name = 'AbortError'
      throw error
    }
    if (Date.now() - startedAt > maximumRuntime) {
      throw new Error(`The project calculation exceeded its ${maximumRuntime} ms runtime limit.`)
    }
  }
}

function validateSerializedSize(value, maximumCharacters, label) {
  let serializedValue
  try {
    serializedValue = JSON.stringify(value)
  } catch {
    throw new Error(`${label} must be JSON-serializable.`)
  }

  if (serializedValue.length > maximumCharacters) {
    throw new Error(`${label} exceeds the ${maximumCharacters}-character safety limit.`)
  }
}

/** Validates the layered graph before any simulation work starts. */
function validateProjectGraph(project) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')
  if (project.nodes.length > PROJECT_CALCULATION_LIMITS.maximumNodes) {
    throw new Error(
      `Project has ${project.nodes.length} nodes; the calculation limit is ${PROJECT_CALCULATION_LIMITS.maximumNodes}.`,
    )
  }

  const nodesById = new Map()
  project.nodes.forEach((node) => {
    if (!node?.id) throw new Error('Every project node must have an ID.')
    if (nodesById.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}.`)
    if (!supportedNodeTypes.has(node.type)) {
      throw new Error(`Unsupported node type: ${node.type}.`)
    }
    if (!supportedOperations.has(node.operation)) {
      throw new Error(`Unsupported operation on node ${node.id}: ${node.operation}.`)
    }
    if (typeof node.isStatic !== 'boolean') {
      throw new Error(`Node ${node.id}.isStatic must be a boolean.`)
    }
    getNodeCalculationField(node)
    nodesById.set(node.id, node)
  })

  let relationCount = 0
  project.nodes.forEach((node) => {
    const aboveCardIds = node.relations?.aboveCardIds ?? []
    if (!Array.isArray(aboveCardIds)) {
      throw new Error(`Node ${node.id}.relations.aboveCardIds must be an array.`)
    }
    relationCount += aboveCardIds.length
    aboveCardIds.forEach((aboveNodeId) => {
      if (aboveNodeId === node.id) throw new Error(`Node ${node.id} cannot be above itself.`)
      if (!nodesById.has(aboveNodeId)) {
        throw new Error(`Related node ${aboveNodeId} was not found.`)
      }
    })
  })

  if (relationCount > PROJECT_CALCULATION_LIMITS.maximumRelations) {
    throw new Error(
      `Project has ${relationCount} upward relations; the calculation limit is ${PROJECT_CALCULATION_LIMITS.maximumRelations}.`,
    )
  }

  const visitState = new Map()
  function visit(nodeId) {
    const state = visitState.get(nodeId)
    if (state === 'visited') return
    if (state === 'visiting') throw new Error('The project graph contains an upward cycle.')

    visitState.set(nodeId, 'visiting')
    const node = nodesById.get(nodeId)
    new Set(node.relations?.aboveCardIds ?? []).forEach(visit)
    visitState.set(nodeId, 'visited')
  }
  project.nodes.forEach((node) => visit(node.id))

  return nodesById
}

function countScheduledRuns({ time, next_time_to_run: firstRun, end_time: endTime }) {
  if (time <= 0n || firstRun <= 0n || endTime <= 0n || firstRun > endTime) return 0n
  return (endTime - firstRun) / time + 1n
}

/** Rejects calculations whose exact schedule would be too large for an interactive tool call. */
function validateCalculationWorkload(project, nodeRunTimes, nodesById) {
  const runCountByNodeId = new Map()
  let totalNodeRuns = 0n
  let maximumValueUpdates = 0n

  nodeRunTimes.forEach((nodeRunTime) => {
    const runCount = countScheduledRuns(nodeRunTime)
    runCountByNodeId.set(nodeRunTime.id, runCount)
    totalNodeRuns += runCount

    const node = nodesById.get(nodeRunTime.id)
    const mutableTargetCount = new Set(node.relations?.aboveCardIds ?? []).size
      ? [...new Set(node.relations?.aboveCardIds ?? [])].filter(
          (nodeId) => nodesById.get(nodeId)?.isStatic !== true,
        ).length
      : 0
    maximumValueUpdates += runCount * BigInt(mutableTargetCount)
  })

  if (totalNodeRuns > PROJECT_CALCULATION_LIMITS.maximumNodeRuns) {
    throw new Error(
      `This project requires ${totalNodeRuns} node runs; narrow its interval or time limits to stay at or below ${PROJECT_CALCULATION_LIMITS.maximumNodeRuns}.`,
    )
  }
  if (maximumValueUpdates > PROJECT_CALCULATION_LIMITS.maximumValueUpdates) {
    throw new Error(
      `This project can produce ${maximumValueUpdates} value updates; narrow its interval or time limits to stay at or below ${PROJECT_CALCULATION_LIMITS.maximumValueUpdates}.`,
    )
  }

  return { runCountByNodeId, totalNodeRuns, maximumValueUpdates }
}

/** Uses microtasks for speed while yielding to the browser every 100 virtual timestamps. */
function createCalculationTaskQueue() {
  let scheduledTaskCount = 0

  return {
    schedule(callback) {
      scheduledTaskCount += 1
      const task = { cancelled: false, timerId: null }
      const run = () => {
        if (!task.cancelled) callback()
      }

      if (scheduledTaskCount % 100 === 0) task.timerId = setTimeout(run, 0)
      else queueMicrotask(run)
      return task
    },
    cancel(task) {
      task.cancelled = true
      if (task.timerId !== null) clearTimeout(task.timerId)
    },
  }
}

function incrementCount(counts, nodeId, amount = 1n) {
  counts.set(nodeId, (counts.get(nodeId) ?? 0n) + amount)
}

/**
 * Calculates a project entirely in memory. The supplied object and localStorage are never changed.
 * Milliseconds and counters are returned as decimal strings so the result is JSON-safe.
 */
export async function calculateProjectSnapshot(
  sourceProject,
  {
    signal,
    timeoutMilliseconds = PROJECT_CALCULATION_LIMITS.maximumRuntimeMilliseconds,
  } = {},
) {
  validateSerializedSize(
    sourceProject,
    PROJECT_CALCULATION_LIMITS.maximumProjectCharacters,
    'Project input',
  )
  const assertCalculationActive = createCalculationGuard({ signal, timeoutMilliseconds })
  assertCalculationActive()
  const initialProject = cloneProject(sourceProject)
  let workingProject = cloneProject(sourceProject)
  const nodesById = validateProjectGraph(initialProject)
  const durationMilliseconds = calculateProjectDurationInMilliseconds(initialProject)
  const initialRunTimes = extractNodeRunTimesInMilliseconds(
    initialProject,
    durationMilliseconds,
  )
  const workload = validateCalculationWorkload(initialProject, initialRunTimes, nodesById)
  const executedRunsByNodeId = new Map()
  const receivedUpdatesByNodeId = new Map()
  let actualNodeRunCount = 0n
  let actualValueUpdateCount = 0n
  let virtualTimestampCount = 0n
  let lastVirtualTime = null

  const scheduler = createProjectRunScheduler({
    project: initialProject,
    projectEndTimeInMilliseconds: durationMilliseconds,
    getProject: () => workingProject,
    taskQueue: createCalculationTaskQueue(),
    onNodeRun: (runEvent) => {
      assertCalculationActive()
      actualNodeRunCount += 1n
      if (actualNodeRunCount > PROJECT_CALCULATION_LIMITS.maximumNodeRuns) {
        throw new Error('The calculation exceeded its node-run safety limit.')
      }
      if (lastVirtualTime === null || runEvent.virtualTime !== lastVirtualTime) {
        virtualTimestampCount += 1n
        lastVirtualTime = runEvent.virtualTime
      }

      incrementCount(executedRunsByNodeId, runEvent.id)
      const calculation = applyNodeToImmediateAboveNodes(workingProject, runEvent.id)
      actualValueUpdateCount += BigInt(calculation.updates.length)
      if (actualValueUpdateCount > PROJECT_CALCULATION_LIMITS.maximumValueUpdates) {
        throw new Error('The calculation exceeded its value-update safety limit.')
      }
      calculation.updates.forEach((update) => incrementCount(receivedUpdatesByNodeId, update.nodeId))
      workingProject = calculation.project
    },
  })

  await scheduler.start()
  assertCalculationActive()

  const initialNodesById = new Map(initialProject.nodes.map((node) => [node.id, node]))
  const runTimesByNodeId = new Map(initialRunTimes.map((runTime) => [runTime.id, runTime]))
  const nodes = workingProject.nodes.map((node) => {
    const initialNode = initialNodesById.get(node.id)
    const initialCalculation = getNodeCalculationField(initialNode)
    const finalCalculation = getNodeCalculationField(node)
    const runTime = runTimesByNodeId.get(node.id)

    return {
      id: node.id,
      index: node.index,
      name: node.details?.name ?? '',
      description: node.details?.description ?? '',
      type: node.type,
      operation: node.operation,
      isStatic: node.isStatic === true,
      meaning: getNodeMeaning(node),
      calculationField: finalCalculation.field,
      initialValue: initialCalculation.value,
      finalValue: finalCalculation.value,
      referenceValue:
        node.type === 'percentage'
          ? normalizeDecimalValue(node.referenceValue ?? '0')
          : null,
      schedule: {
        intervalMilliseconds: runTime.time.toString(),
        firstRunMilliseconds: runTime.next_time_to_run.toString(),
        endTimeMilliseconds: runTime.end_time.toString(),
        estimatedRunCount: (workload.runCountByNodeId.get(node.id) ?? 0n).toString(),
      },
      executedRunCount: (executedRunsByNodeId.get(node.id) ?? 0n).toString(),
      receivedUpdateCount: (receivedUpdatesByNodeId.get(node.id) ?? 0n).toString(),
    }
  })

  const result = {
    status: 'completed',
    calculatedAt: new Date().toISOString(),
    projectId: initialProject.id,
    projectName: initialProject.name,
    projectDescription: initialProject.description,
    sourceUpdatedAt: initialProject.updatedAt ?? null,
    durationMilliseconds: durationMilliseconds.toString(),
    ordering: 'bottom-to-top; project-array order within a horizontal level',
    totals: {
      nodeCount: nodes.length,
      virtualTimestampCount: virtualTimestampCount.toString(),
      nodeRunCount: actualNodeRunCount.toString(),
      valueUpdateCount: actualValueUpdateCount.toString(),
      estimatedMaximumValueUpdates: workload.maximumValueUpdates.toString(),
    },
    nodes,
  }
  validateSerializedSize(
    result,
    PROJECT_CALCULATION_LIMITS.maximumResultCharacters,
    'Calculation result',
  )
  return result
}

/** Returns the compact node values used by the calculate_project tool. */
export function summarizeProjectCalculation(result) {
  return {
    status: result.status,
    calculatedAt: result.calculatedAt,
    projectId: result.projectId,
    projectName: result.projectName,
    projectDescription: result.projectDescription,
    sourceUpdatedAt: result.sourceUpdatedAt,
    durationMilliseconds: result.durationMilliseconds,
    totals: result.totals,
    nodes: result.nodes.map((node) => ({
      id: node.id,
      name: node.name,
      description: node.description,
      type: node.type,
      calculationField: node.calculationField,
      finalValue: node.finalValue,
      meaning: node.meaning,
    })),
  }
}
