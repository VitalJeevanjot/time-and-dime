import {
  addProjectNodeAbove,
  addProjectNodeBelow,
  addProjectNodeRight,
  getProject,
} from '../services/projectStorage.js'
import { normalizeDecimalValue } from '../utils/decimalCalculation.js'

const operations = ['+', '-', '/', '*', '%']
const nodeTimeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']
const timeLimitUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const timeLimitSchema = {
  type: 'object',
  description:
    'Optional. Use {value, unit} boundaries for Duration, or {date, hours, minutes, seconds} for Date & time.',
  properties: {
    from: { type: 'object', description: 'Inclusive start boundary matching the project mode.' },
    until: { type: 'object', description: 'Inclusive end boundary matching the project mode.' },
  },
  required: ['from', 'until'],
  additionalProperties: false,
}

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${fieldName} is required.`)
  const normalizedValue = value.trim()
  if (normalizedValue.length > 200) {
    throw new Error(`${fieldName} cannot be longer than 200 characters.`)
  }
  return normalizedValue
}

function requiredDate(value, fieldName) {
  const date = requiredString(value, fieldName)
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${fieldName} must be a valid date in YYYY-MM-DD format.`)
  }
  return date
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

function optionalBoolean(value, defaultValue, fieldName) {
  if (value === undefined) return defaultValue
  if (typeof value !== 'boolean') throw new Error(`${fieldName} must be a boolean.`)
  return value
}

function requiredDecimalString(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be supplied as a decimal string.`)
  }
  return normalizeDecimalValue(value, fieldName)
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
    date: requiredDate(boundary.date, `${fieldName}.date`),
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

export function createPercentageNodeInput(input, project) {
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new Error('description must be a string when provided.')
  }
  if (input.description?.trim().length > 2_000) {
    throw new Error('description cannot be longer than 2000 characters.')
  }

  return {
    type: 'percentage',
    operation: requiredEnum(input.operation, operations, 'operation'),
    isStatic: optionalBoolean(input.isStatic, true, 'isStatic'),
    referenceValue:
      input.referenceValue === undefined
        ? '0'
        : requiredDecimalString(input.referenceValue, 'referenceValue'),
    percentage: {
      value: requiredDecimalString(input.percentage, 'percentage'),
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
        'Create a Percentage node above, right of, or below one existing node. Its operation affects only directly connected non-static nodes above: Value targets change value and Percentage targets change percentage.value. With referenceValue 0, calculate from each target; otherwise use the reference. It never skips a level. Select one target by ID or unique name. isStatic defaults true. timeLimit must match the project mode.',
      inputSchema: {
        type: 'object',
        properties: {
          targetNodeId: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description:
              'Optional exact ID of the existing placement target. Use this instead of targetNodeName.',
          },
          targetNodeName: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
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
              'Operation for immediate non-static targets; the operand uses each target or the non-zero referenceValue.',
          },
          percentage: {
            type: 'string',
            minLength: 1,
            maxLength: 10_050,
            description:
              'Finite percentage string. With referenceValue 0 it uses each immediate target; otherwise it uses the reference.',
          },
          isStatic: {
            type: 'boolean',
            description:
              'Optional; defaults to true. When true, this node’s Percentage number will not change when operations from cards below are applied to it.',
          },
          referenceValue: {
            type: 'string',
            minLength: 1,
            maxLength: 10_050,
            description:
              'Optional decimal string. Non-zero creates one shared amount; 0 uses each immediate target field.',
          },
          time: {
            type: 'integer',
            minimum: 0,
            maximum: Number.MAX_SAFE_INTEGER,
            description: 'Required non-negative safe-integer time value.',
          },
          timeUnit: {
            type: 'string',
            enum: nodeTimeUnits,
            description: 'Required unit for time.',
          },
          timeLimit: timeLimitSchema,
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Required node name.',
          },
          description: {
            type: 'string',
            maxLength: 2_000,
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
        untrustedContentHint: true,
      },
    },
    { signal },
  )
}
