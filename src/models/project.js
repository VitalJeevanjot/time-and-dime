function createUuid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createNodeDetails(details = {}) {
  return {
    name: details.name ?? '',
    description: details.description ?? '',
  }
}

function createTiming(timing = {}) {
  return {
    value: timing.value ?? 0,
    unit: timing.unit ?? 'Seconds',
  }
}

function createTimeLimitBoundary(boundary = {}) {
  return {
    value: boundary.value ?? 0,
    unit: boundary.unit ?? 'Seconds',
    date: boundary.date ?? '',
    hours: boundary.hours ?? '00',
    minutes: boundary.minutes ?? '00',
    seconds: boundary.seconds ?? '00',
  }
}

function createTimeLimit(timeLimit = {}) {
  return {
    enabled: timeLimit.enabled ?? false,
    type: timeLimit.type ?? 'duration',
    from: createTimeLimitBoundary(timeLimit.from),
    until: createTimeLimitBoundary(timeLimit.until),
  }
}

function createBaseNode(type, node = {}) {
  return {
    id: node.id ?? createUuid(),
    index: node.index ?? 0,
    type,
    details: createNodeDetails(node.details),
    operation: node.operation ?? '+',
    timing: createTiming(node.timing),
    timeLimit: createTimeLimit(node.timeLimit),
    relations: {
      aboveCardIds: Array.isArray(node.relations?.aboveCardIds)
        ? node.relations.aboveCardIds
        : [],
      belowCardIds: Array.isArray(node.relations?.belowCardIds)
        ? node.relations.belowCardIds
        : [],
    },
  }
}

export function createValueNode(node = {}) {
  return {
    ...createBaseNode('value', node),
    value: node.value ?? 0,
  }
}

export function createPercentageNode(node = {}) {
  return {
    ...createBaseNode('percentage', node),
    percentage: {
      value: node.percentage?.value ?? 0,
    },
  }
}

export function createProjectRecord(project = {}) {
  return {
    id: project.id ?? createUuid(),
    name: project.name ?? '',
    description: project.description ?? '',
    startTime: {
      date: project.startTime?.date ?? '',
      hours: project.startTime?.hours ?? '00',
      minutes: project.startTime?.minutes ?? '00',
      seconds: project.startTime?.seconds ?? '00',
    },
    endTime: {
      mode: project.endTime?.mode ?? 'duration',
      duration: project.endTime?.duration ?? 0,
      durationUnit: project.endTime?.durationUnit ?? 'Seconds',
      date: project.endTime?.date ?? '',
      hours: project.endTime?.hours ?? '00',
      minutes: project.endTime?.minutes ?? '00',
      seconds: project.endTime?.seconds ?? '00',
    },
    nodes: Array.isArray(project.nodes) ? project.nodes : [],
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
