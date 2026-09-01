const millisecondsPerUnit = {
  Milliseconds: 1n,
  Seconds: 1_000n,
  Minutes: 60_000n,
  Hours: 3_600_000n,
  Days: 86_400_000n,
  Months: 2_592_000_000n,
  Years: 31_536_000_000n,
}

function toBigInt(value, fieldName) {
  if (typeof value === 'bigint') return value

  const normalizedValue = String(value).trim()
  if (!/^-?\d+$/.test(normalizedValue)) {
    throw new Error(`${fieldName} must be an integer.`)
  }

  return BigInt(normalizedValue)
}

function durationValueToMilliseconds(value, unit, fieldName) {
  const multiplier = millisecondsPerUnit[unit]
  if (multiplier === undefined) {
    throw new Error(`Unsupported time unit: ${unit}.`)
  }

  return toBigInt(value, fieldName) * multiplier
}

function durationToMilliseconds(endTime) {
  return durationValueToMilliseconds(
    endTime.duration,
    endTime.durationUnit,
    'endTime.duration',
  )
}

function dateTimeToMilliseconds(dateTime, fieldName) {
  const date = String(dateTime?.date ?? '')
  const hours = String(dateTime?.hours ?? '').padStart(2, '0')
  const minutes = String(dateTime?.minutes ?? '').padStart(2, '0')
  const seconds = String(dateTime?.seconds ?? '').padStart(2, '0')
  const timestamp = Date.parse(`${date}T${hours}:${minutes}:${seconds}Z`)

  if (!Number.isFinite(timestamp)) {
    throw new Error(`${fieldName} must contain a valid date and time.`)
  }

  return BigInt(timestamp)
}

export function calculateProjectDurationInMilliseconds(project) {
  if (!project?.endTime) throw new Error('A project with an end time is required.')

  let projectDurationInMilliseconds

  if (project.endTime.mode === 'duration') {
    projectDurationInMilliseconds = durationToMilliseconds(project.endTime)
  } else if (project.endTime.mode === 'dateTime') {
    const startTimeInMilliseconds = dateTimeToMilliseconds(project.startTime, 'startTime')
    const endTimeInMilliseconds = dateTimeToMilliseconds(project.endTime, 'endTime')
    projectDurationInMilliseconds = endTimeInMilliseconds - startTimeInMilliseconds
  } else {
    throw new Error(`Unsupported project interval mode: ${project.endTime.mode}.`)
  }

  console.log(projectDurationInMilliseconds)
  return projectDurationInMilliseconds
}

function hasTimeLimitBoundary(node, boundaryName, projectMode) {
  if (!node.timeLimit?.enabled) return false

  const boundary = node.timeLimit[boundaryName]
  if (!boundary || typeof boundary !== 'object') return false

  if (projectMode === 'dateTime') return Boolean(boundary.date)
  return boundary.value !== undefined && boundary.value !== null && Boolean(boundary.unit)
}

function timeLimitBoundaryToMilliseconds(project, boundary, fieldName) {
  if (project.endTime.mode === 'duration') {
    return durationValueToMilliseconds(boundary.value, boundary.unit, `${fieldName}.value`)
  }

  const projectStartInMilliseconds = dateTimeToMilliseconds(project.startTime, 'startTime')
  return dateTimeToMilliseconds(boundary, fieldName) - projectStartInMilliseconds
}

export function extractNodeRunTimesInMilliseconds(
  project,
  projectEndTimeInMilliseconds = calculateProjectDurationInMilliseconds(project),
) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')

  return project.nodes.map((node) => {
    const time = durationValueToMilliseconds(
      node.timing?.value,
      node.timing?.unit,
      `node ${node.id}.timing.value`,
    )
    const timeLimitFrom = hasTimeLimitBoundary(node, 'from', project.endTime.mode)
      ? timeLimitBoundaryToMilliseconds(
          project,
          node.timeLimit.from,
          `node ${node.id}.timeLimit.from`,
        )
      : 0n
    const endTime = hasTimeLimitBoundary(node, 'until', project.endTime.mode)
      ? timeLimitBoundaryToMilliseconds(
          project,
          node.timeLimit.until,
          `node ${node.id}.timeLimit.until`,
        )
      : projectEndTimeInMilliseconds

    return {
      id: node.id,
      time,
      next_time_to_run: timeLimitFrom + time,
      end_time: endTime,
    }
  })
}

function getNodeCalculationValues(node) {
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

export function traverseNodeRunTimes(
  project,
  projectEndTimeInMilliseconds = calculateProjectDurationInMilliseconds(project),
) {
  const nodeRunTimes = extractNodeRunTimesInMilliseconds(
    project,
    projectEndTimeInMilliseconds,
  )
  const nodesById = new Map(project.nodes.map((node) => [node.id, node]))
  // while (true) {
  //   const nodesWithEndTimes = nodeRunTimes.filter(({ end_time: endTime }) => endTime !== 0n)
  //   const allNodesFinished =
  //     nodesWithEndTimes.length === 0 ||
  //     nodesWithEndTimes.every(
  //       ({ next_time_to_run: nextTimeToRun, end_time: endTime }) => nextTimeToRun > endTime,
  //     )
  //   if (allNodesFinished) break

  //   let advancedNode = false

  //   for (const nodeRunTime of nodeRunTimes) {
  //     const { time, next_time_to_run: nextTimeToRun, end_time: endTime } = nodeRunTime
  //     const canRun = time > 0n && nextTimeToRun > 0n && endTime > 0n && nextTimeToRun < endTime
  //     if (!canRun) continue

  //     const node = nodesById.get(nodeRunTime.id)
  //     if (!node) throw new Error(`Node ${nodeRunTime.id} was not found.`)

  //     nodeRunTime.cardValues = getNodeCalculationValues(node)
  //     nodeRunTime.next_time_to_run += time
  //     advancedNode = true
  //   }

  //   if (!advancedNode) break
  // }

  return nodeRunTimes
}
