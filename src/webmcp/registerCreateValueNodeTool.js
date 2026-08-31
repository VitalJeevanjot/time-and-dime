import {
  addProjectNodeAbove,
  addProjectNodeBelow,
  addProjectNodeRight,
  getProject,
} from '../services/projectStorage.js'

const operations = ['+', '-', '/', '*', '%']
const timeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const durationBoundarySchema = {
  type: 'object',
  properties: {
    value: { type: 'integer', minimum: 0 },
    unit: { type: 'string', enum: timeUnits },
  },
  required: ['value', 'unit'],
  additionalProperties: false,
}

const dateTimeBoundarySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date' },
    hours: { type: 'integer', minimum: 0, maximum: 23 },
    minutes: { type: 'integer', minimum: 0, maximum: 59 },
    seconds: { type: 'integer', minimum: 0, maximum: 59 },
  },
  required: ['date', 'hours', 'minutes', 'seconds'],
  additionalProperties: false,
}

function requiredInteger(value, fieldName, minimum = Number.NEGATIVE_INFINITY, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${fieldName} must be an integer from ${minimum} to ${maximum}.`)
  }

  return value
}

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`)
  }

  return value.trim()
}

function requiredEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`)
  }

  return value
}

function normalizeDurationBoundary(boundary, fieldName) {
  if (!boundary || typeof boundary !== 'object' || Array.isArray(boundary)) {
    throw new Error(`${fieldName} is required for a duration time limit.`)
  }

  return {
    value: requiredInteger(boundary.value, `${fieldName}.value`, 0),
    unit: requiredEnum(boundary.unit, timeUnits, `${fieldName}.unit`),
  }
}

function normalizeDateTimeBoundary(boundary, fieldName) {
  if (!boundary || typeof boundary !== 'object' || Array.isArray(boundary)) {
    throw new Error(`${fieldName} is required for a date-time time limit.`)
  }

  return {
    date: requiredString(boundary.date, `${fieldName}.date`),
    hours: String(requiredInteger(boundary.hours, `${fieldName}.hours`, 0, 23)).padStart(2, '0'),
    minutes: String(requiredInteger(boundary.minutes, `${fieldName}.minutes`, 0, 59)).padStart(
      2,
      '0',
    ),
    seconds: String(requiredInteger(boundary.seconds, `${fieldName}.seconds`, 0, 59)).padStart(
      2,
      '0',
    ),
  }
}

function normalizeTimeLimit(timeLimit, projectMode) {
  if (timeLimit === undefined) {
    return {
      enabled: false,
      type: projectMode,
    }
  }

  if (!timeLimit || typeof timeLimit !== 'object' || Array.isArray(timeLimit)) {
    throw new Error('timeLimit must be an object when provided.')
  }

  const normalizeBoundary =
    projectMode === 'dateTime' ? normalizeDateTimeBoundary : normalizeDurationBoundary

  return {
    enabled: true,
    type: projectMode,
    from: normalizeBoundary(timeLimit.from, 'timeLimit.from'),
    until: normalizeBoundary(timeLimit.until, 'timeLimit.until'),
  }
}

function createValueNodeInput(input, project) {
  const description = input.description
  if (description !== undefined && typeof description !== 'string') {
    throw new Error('description must be a string when provided.')
  }

  return {
    type: 'value',
    operation: requiredEnum(input.operation, operations, 'operation'),
    referenceValue:
      input.referenceValue === undefined
        ? 0
        : requiredInteger(input.referenceValue, 'referenceValue'),
    value: requiredInteger(input.value, 'value'),
    timing: {
      value: requiredInteger(input.time, 'time', 0),
      unit: requiredEnum(input.timeUnit, timeUnits, 'timeUnit'),
    },
    timeLimit: normalizeTimeLimit(input.timeLimit, project.endTime.mode),
    details: {
      name: requiredString(input.name, 'name'),
      description: description?.trim() ?? '',
    },
  }
}

function resolveTargetNodeId(project, input) {
  const hasTargetNodeId = input.targetNodeId !== undefined
  const hasTargetNodeName = input.targetNodeName !== undefined

  if (hasTargetNodeId === hasTargetNodeName) {
    throw new Error('Provide exactly one of targetNodeId or targetNodeName.')
  }

  if (hasTargetNodeId) {
    const targetNodeId = requiredString(input.targetNodeId, 'targetNodeId')
    if (!project.nodes.some((node) => node.id === targetNodeId)) {
      throw new Error(`Node ${targetNodeId} was not found.`)
    }

    return targetNodeId
  }

  const targetNodeName = requiredString(input.targetNodeName, 'targetNodeName')
  const matchingNodes = project.nodes.filter((node) => node.details?.name === targetNodeName)

  if (matchingNodes.length === 0) {
    throw new Error(`No node named "${targetNodeName}" was found.`)
  }
  if (matchingNodes.length > 1) {
    throw new Error(
      `More than one node is named "${targetNodeName}". Use targetNodeId to select one exactly.`,
    )
  }

  return matchingNodes[0].id
}

function addValueNode(projectId, input) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const targetNodeId = resolveTargetNodeId(project, input)
  const side = requiredEnum(input.side, ['above', 'right', 'bottom'], 'side')
  const existingNodeIds = new Set(project.nodes.map((node) => node.id))
  const node = createValueNodeInput(input, project)
  let updatedProject

  if (side === 'above') {
    updatedProject = addProjectNodeAbove(projectId, targetNodeId, node)
  } else if (side === 'right') {
    updatedProject = addProjectNodeRight(projectId, targetNodeId, node)
  } else {
    updatedProject = addProjectNodeBelow(projectId, targetNodeId, node)
  }

  const createdNode = updatedProject.nodes.find((projectNode) => !existingNodeIds.has(projectNode.id))
  if (!createdNode) throw new Error('The value node was saved but could not be identified.')

  return { updatedProject, createdNode, side, targetNodeId }
}

export function registerCreateValueNodeTool({ getProjectId, onProjectUpdated, signal }) {
  if (!document.modelContext?.registerTool) return Promise.resolve()

  return document.modelContext.registerTool(
    {
      name: 'create_value_node',
      description:
        'Create a Value node in the currently open Time&Dime project. referenceValue is an optional stable value that calculations do not modify, while value is required and can change. Identify the target by exactly one of targetNodeName or targetNodeId, and provide a side. "above" creates a level above the target, "right" adds to the target horizontal level, and "bottom" creates below the target level. If the target has a lower level, bottom inserts the new level between them; if the target is on the lowest level, bottom creates a new lowest level. The optional timeLimit must match the project interval mode: duration boundaries for duration projects, or date-time boundaries for date-time projects.',
      inputSchema: {
        type: 'object',
        properties: {
          targetNodeId: {
            type: 'string',
            minLength: 1,
            description:
              'Optional exact ID of the existing placement target. Use this instead of targetNodeName.',
          },
          targetNodeName: {
            type: 'string',
            minLength: 1,
            description:
              'Optional Name-field value of the existing placement target. It must uniquely identify one node. Use this instead of targetNodeId.',
          },
          side: {
            type: 'string',
            enum: ['above', 'right', 'bottom'],
            description: 'Required placement relative to the target node or its horizontal level.',
          },
          operation: {
            type: 'string',
            enum: operations,
            description: 'Required arithmetic operation: + Plus, - Minus, / Divide, * Multiply, or % Modulus.',
          },
          value: {
            type: 'integer',
            description: 'Required integer value. Negative integers are allowed.',
          },
          referenceValue: {
            type: 'integer',
            description:
              'Optional stable integer value that does not change when calculations are applied to the node. Defaults to 0.',
          },
          time: {
            type: 'integer',
            minimum: 0,
            description: 'Required non-negative integer time value.',
          },
          timeUnit: {
            type: 'string',
            enum: timeUnits,
            description: 'Required unit for time.',
          },
          timeLimit: {
            description:
              'Optional time limit. Supply duration boundaries when the project uses Duration, or date-time boundaries when it uses Date & time.',
            oneOf: [
              {
                title: 'Duration time limit',
                type: 'object',
                properties: {
                  from: durationBoundarySchema,
                  until: durationBoundarySchema,
                },
                required: ['from', 'until'],
                additionalProperties: false,
              },
              {
                title: 'Date and time limit',
                type: 'object',
                properties: {
                  from: dateTimeBoundarySchema,
                  until: dateTimeBoundarySchema,
                },
                required: ['from', 'until'],
                additionalProperties: false,
              },
            ],
          },
          name: {
            type: 'string',
            minLength: 1,
            description: 'Required node name.',
          },
          description: {
            type: 'string',
            description: 'Optional node description.',
          },
        },
        required: ['side', 'operation', 'value', 'time', 'timeUnit', 'name'],
        oneOf: [{ required: ['targetNodeId'] }, { required: ['targetNodeName'] }],
        additionalProperties: false,
      },
      execute: (input) => {
        const projectId = requiredString(getProjectId(), 'projectId')
        const result = addValueNode(projectId, input)
        onProjectUpdated?.(result.updatedProject)

        return JSON.stringify(
          {
            projectId,
            placement: {
              side: result.side,
              targetNodeId: result.targetNodeId,
            },
            node: result.createdNode,
          },
          null,
          2,
        )
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: false,
      },
    },
    { signal },
  )
}
