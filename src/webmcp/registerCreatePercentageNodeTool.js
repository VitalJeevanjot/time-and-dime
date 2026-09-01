import {
  addProjectNodeAbove,
  addProjectNodeBelow,
  addProjectNodeRight,
  getProject,
} from '../services/projectStorage.js'

const operations = ['+', '-', '/', '*', '%']
const nodeTimeUnits = ['Millisecond', 'Seconds', 'Minute', 'Hours', 'Days', 'Months', 'Years']
const timeLimitUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const durationBoundarySchema = {
  type: 'object',
  properties: {
    value: { type: 'integer', minimum: 0 },
    unit: { type: 'string', enum: timeLimitUnits },
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

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${fieldName} is required.`)
  return value.trim()
}

function requiredEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`)
  }
  return value
}

function requiredInteger(value, fieldName, minimum = Number.NEGATIVE_INFINITY, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${fieldName} must be an integer from ${minimum} to ${maximum}.`)
  }
  return value
}

function requiredNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`)
  }
  return value
}

function optionalBoolean(value, defaultValue, fieldName) {
  if (value === undefined) return defaultValue
  if (typeof value !== 'boolean') throw new Error(`${fieldName} must be a boolean.`)
  return value
}

function normalizeDurationBoundary(boundary, fieldName) {
  if (!boundary || typeof boundary !== 'object' || Array.isArray(boundary)) {
    throw new Error(`${fieldName} is required for a duration time limit.`)
  }
  return {
    value: requiredInteger(boundary.value, `${fieldName}.value`, 0),
    unit: requiredEnum(boundary.unit, timeLimitUnits, `${fieldName}.unit`),
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
  if (timeLimit === undefined) return { enabled: false, type: projectMode }
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
  if (matchingNodes.length === 0) throw new Error(`No node named "${targetNodeName}" was found.`)
  if (matchingNodes.length > 1) {
    throw new Error(
      `More than one node is named "${targetNodeName}". Use targetNodeId to select one exactly.`,
    )
  }
  return matchingNodes[0].id
}

function createPercentageNodeInput(input, project) {
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new Error('description must be a string when provided.')
  }

  return {
    type: 'percentage',
    operation: requiredEnum(input.operation, operations, 'operation'),
    isStatic: optionalBoolean(input.isStatic, true, 'isStatic'),
    referenceValue:
      input.referenceValue === undefined
        ? 0
        : requiredNumber(input.referenceValue, 'referenceValue'),
    percentage: {
      value: requiredNumber(input.percentage, 'percentage'),
    },
    timing: {
      value: requiredInteger(input.time, 'time', 0),
      unit: requiredEnum(input.timeUnit, nodeTimeUnits, 'timeUnit'),
    },
    timeLimit: normalizeTimeLimit(input.timeLimit, project.endTime.mode),
    details: {
      name: requiredString(input.name, 'name'),
      description: input.description?.trim() ?? '',
    },
  }
}

function addPercentageNode(projectId, input) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const targetNodeId = resolveTargetNodeId(project, input)
  const side = requiredEnum(input.side, ['above', 'right', 'bottom'], 'side')
  const existingNodeIds = new Set(project.nodes.map((node) => node.id))
  const node = createPercentageNodeInput(input, project)
  let updatedProject

  if (side === 'above') {
    updatedProject = addProjectNodeAbove(projectId, targetNodeId, node)
  } else if (side === 'right') {
    updatedProject = addProjectNodeRight(projectId, targetNodeId, node)
  } else {
    updatedProject = addProjectNodeBelow(projectId, targetNodeId, node)
  }

  const createdNode = updatedProject.nodes.find((projectNode) => !existingNodeIds.has(projectNode.id))
  if (!createdNode) throw new Error('The percentage node was saved but could not be identified.')
  return { updatedProject, createdNode, side, targetNodeId }
}

export function registerCreatePercentageNodeTool({ getProjectId, onProjectUpdated, signal }) {
  if (!document.modelContext?.registerTool) return Promise.resolve()

  return document.modelContext.registerTool(
    {
      name: 'create_percentage_node',
      description:
        'Create a Percentage node in the currently open Time&Dime project. isStatic is optional and defaults to true. When isStatic is true, this node’s Percentage number does not change when operations from cards below are applied to it. referenceValue is optional and defaults to 0. When referenceValue is non-zero, calculate the percentage amount from referenceValue and apply that calculated amount to the value field of each node above using the Percentage node selected operation. When referenceValue is 0, process the nodes above one by one: first calculate the percentage amount from each above node’s current value, then apply that calculated amount back to that same node value using the selected operation. Identify the target by exactly one of targetNodeName or targetNodeId. "above" creates a level above the target, "right" adds to its horizontal level, and "bottom" creates below its level. Bottom inserts between connected levels when a lower level exists, or creates a new lowest level when the target is already lowest. The optional timeLimit must match the project interval mode.',
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
              'Optional unique Name-field value of the placement target. Use this instead of targetNodeId.',
          },
          side: {
            type: 'string',
            enum: ['above', 'right', 'bottom'],
            description: 'Required placement relative to the target node or horizontal level.',
          },
          operation: {
            type: 'string',
            enum: operations,
            description:
              'Required arithmetic operation applied to each above node value. When referenceValue is non-zero, apply the percentage amount calculated from referenceValue. When referenceValue is 0, calculate a separate percentage amount from each above node’s current value and apply it back to that same node, one by one. Operations are + Plus, - Minus, / Divide, * Multiply, or % Modulus.',
          },
          percentage: {
            type: 'number',
            description:
              'Required finite percentage; decimal and negative values are allowed. When referenceValue is 0, use this percentage to calculate an amount from each above node’s current value separately before applying that amount back to the same node’s value. When referenceValue is non-zero, calculate the percentage amount from referenceValue and apply it to above-node values one by one using the selected operation.',
          },
          isStatic: {
            type: 'boolean',
            description:
              'Optional; defaults to true. When true, this node’s Percentage number will not change when operations from cards below are applied to it.',
          },
          referenceValue: {
            type: 'number',
            description:
              'Optional finite number that defaults to 0; decimal and negative values are allowed. When non-zero, calculate the percentage amount from this reference and apply it to each above node value using this node operation. When 0, calculate the percentage amount independently from each above node’s current value, then apply it back to that same node value one by one.',
          },
          time: {
            type: 'integer',
            minimum: 0,
            description: 'Required non-negative integer time value.',
          },
          timeUnit: {
            type: 'string',
            enum: nodeTimeUnits,
            description: 'Required unit for time.',
          },
          timeLimit: {
            description:
              'Optional time limit. Supply duration boundaries for a Duration project or date-time boundaries for a Date & time project.',
            oneOf: [
              {
                title: 'Duration time limit',
                type: 'object',
                properties: { from: durationBoundarySchema, until: durationBoundarySchema },
                required: ['from', 'until'],
                additionalProperties: false,
              },
              {
                title: 'Date and time limit',
                type: 'object',
                properties: { from: dateTimeBoundarySchema, until: dateTimeBoundarySchema },
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
        required: [
          'side',
          'operation',
          'percentage',
          'time',
          'timeUnit',
          'name',
        ],
        oneOf: [{ required: ['targetNodeId'] }, { required: ['targetNodeName'] }],
        additionalProperties: false,
      },
      execute: (input) => {
        const projectId = requiredString(getProjectId(), 'projectId')
        const result = addPercentageNode(projectId, input)
        onProjectUpdated?.(result.updatedProject)
        return JSON.stringify(
          {
            projectId,
            placement: { side: result.side, targetNodeId: result.targetNodeId },
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
