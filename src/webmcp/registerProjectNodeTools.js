import { deleteProjectNode, getProject, updateProject } from '../services/projectStorage.js'

const operations = ['+', '-', '/', '*', '%']
const valueTimeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']
const percentageTimeUnits = ['Millisecond', 'Seconds', 'Minute', 'Hours', 'Days', 'Months', 'Years']
const timeLimitUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']
const editableFields = [
  'operation',
  'details.name',
  'details.description',
  'isStatic',
  'referenceValue',
  'value',
  'percentage.value',
  'timing.value',
  'timing.unit',
  'timeLimit.enabled',
  'timeLimit.from.value',
  'timeLimit.from.unit',
  'timeLimit.from.date',
  'timeLimit.from.hours',
  'timeLimit.from.minutes',
  'timeLimit.from.seconds',
  'timeLimit.until.value',
  'timeLimit.until.unit',
  'timeLimit.until.date',
  'timeLimit.until.hours',
  'timeLimit.until.minutes',
  'timeLimit.until.seconds',
]

function getStoredProject(projectId) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)
  return project
}

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`)
  }
  return value.trim()
}

function stringValue(value, fieldName) {
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string.`)
  return value.trim()
}

function enumValue(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`)
  }
  return value
}

function integerValue(value, fieldName, minimum = Number.NEGATIVE_INFINITY, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${fieldName} must be an integer from ${minimum} to ${maximum}.`)
  }
  return value
}

function finiteNumberValue(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`)
  }
  return value
}

function booleanValue(value, fieldName) {
  if (typeof value !== 'boolean') throw new Error(`${fieldName} must be a boolean.`)
  return value
}

function dateValue(value, fieldName) {
  const date = stringValue(value, fieldName)
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

function resolveNode(project, input) {
  const hasNodeId = input.nodeId !== undefined
  const hasNodeName = input.nodeName !== undefined
  if (hasNodeId === hasNodeName) {
    throw new Error('Provide exactly one of nodeId or nodeName.')
  }

  if (hasNodeId) {
    const nodeId = requiredString(input.nodeId, 'nodeId')
    const node = project.nodes.find((projectNode) => projectNode.id === nodeId)
    if (!node) throw new Error(`Node ${nodeId} was not found.`)
    return node
  }

  const nodeName = requiredString(input.nodeName, 'nodeName')
  const matchingNodes = project.nodes.filter((node) => node.details?.name === nodeName)
  if (matchingNodes.length === 0) throw new Error(`No node named "${nodeName}" was found.`)
  if (matchingNodes.length > 1) {
    throw new Error(`More than one node is named "${nodeName}". Use nodeId to select one exactly.`)
  }
  return matchingNodes[0]
}

function replaceNestedValue(node, section, field, value) {
  return {
    ...node,
    timeLimit: {
      ...node.timeLimit,
      [section]: {
        ...node.timeLimit[section],
        [field]: value,
      },
    },
  }
}

function updateTimeLimitBoundary(node, projectMode, field, value) {
  const [, section, boundaryField] = field.split('.')

  if (['value', 'unit'].includes(boundaryField)) {
    if (projectMode !== 'duration') {
      throw new Error(`${field} is only editable for a Duration project.`)
    }
    const normalizedValue =
      boundaryField === 'value'
        ? integerValue(value, field, 0)
        : enumValue(value, timeLimitUnits, field)
    return replaceNestedValue(node, section, boundaryField, normalizedValue)
  }

  if (projectMode !== 'dateTime') {
    throw new Error(`${field} is only editable for a Date & time project.`)
  }

  const normalizedValue =
    boundaryField === 'date'
      ? dateValue(value, field)
      : String(
          integerValue(
            value,
            field,
            0,
            boundaryField === 'hours' ? 23 : 59,
          ),
        ).padStart(2, '0')
  return replaceNestedValue(node, section, boundaryField, normalizedValue)
}

function updateNodeField(node, projectMode, field, value) {
  enumValue(field, editableFields, 'field')

  if (field === 'operation') {
    return { ...node, operation: enumValue(value, operations, field) }
  }
  if (field === 'details.name') {
    return { ...node, details: { ...node.details, name: stringValue(value, field) } }
  }
  if (field === 'details.description') {
    return { ...node, details: { ...node.details, description: stringValue(value, field) } }
  }
  if (field === 'isStatic') {
    return { ...node, isStatic: booleanValue(value, field) }
  }
  if (field === 'value') {
    if (node.type !== 'value') throw new Error('value is only editable on a Value node.')
    return { ...node, value: finiteNumberValue(value, field) }
  }
  if (field === 'referenceValue') {
    if (node.type !== 'percentage') {
      throw new Error('referenceValue is only editable on a Percentage node.')
    }
    return { ...node, referenceValue: finiteNumberValue(value, field) }
  }
  if (field === 'percentage.value') {
    if (node.type !== 'percentage') {
      throw new Error('percentage.value is only editable on a Percentage node.')
    }
    return {
      ...node,
      percentage: { ...node.percentage, value: finiteNumberValue(value, field) },
    }
  }
  if (field === 'timing.value') {
    return { ...node, timing: { ...node.timing, value: integerValue(value, field, 0) } }
  }
  if (field === 'timing.unit') {
    const allowedUnits = node.type === 'percentage' ? percentageTimeUnits : valueTimeUnits
    return { ...node, timing: { ...node.timing, unit: enumValue(value, allowedUnits, field) } }
  }
  if (field === 'timeLimit.enabled') {
    return {
      ...node,
      timeLimit: { ...node.timeLimit, enabled: booleanValue(value, field), type: projectMode },
    }
  }

  return updateTimeLimitBoundary(node, projectMode, field, value)
}

function editProjectNode(projectId, input) {
  const project = getStoredProject(projectId)
  const selectedNode = resolveNode(project, input)
  const updatedNode = updateNodeField(selectedNode, project.endTime.mode, input.field, input.value)
  const updatedProject = updateProject({
    ...project,
    nodes: project.nodes.map((node) => (node.id === selectedNode.id ? updatedNode : node)),
  })

  return { updatedProject, updatedNode }
}

const targetProperties = {
  nodeId: {
    type: 'string',
    minLength: 1,
    description: 'Optional exact node UUID. Use this instead of nodeName.',
  },
  nodeName: {
    type: 'string',
    minLength: 1,
    description:
      'Optional exact Name-field value. It must identify one node uniquely. Use this instead of nodeId.',
  },
}

export async function registerProjectNodeTools({ getProjectId, onProjectUpdated, signal }) {
  if (!document.modelContext?.registerTool) return

  await document.modelContext.registerTool(
    {
      name: 'get_project_nodes',
      description:
        'Read and return every structured node in the currently open Time&Dime project, including node names, UUIDs, card values, timing, time limits, and graph relations.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: () => {
        const projectId = requiredString(getProjectId(), 'projectId')
        const project = getStoredProject(projectId)
        return JSON.stringify({ projectId, nodeCount: project.nodes.length, nodes: project.nodes }, null, 2)
      },
      annotations: {
        readOnlyHint: true,
        untrustedContentHint: true,
      },
    },
    { signal },
  )

  await document.modelContext.registerTool(
    {
      name: 'edit_project_node',
      description:
        'Edit one user-controlled field on a node in the currently open Time&Dime project. Select the node by exactly one of nodeName or nodeId. Set isStatic to true when the node’s Value or Percentage number must not change from operations applied by cards below; set it to false to allow those operations to change the number. A Value node value is applied to the value field of its node or nodes above using the operation selected on the current Value node. For a Percentage node with a non-zero referenceValue, calculate the percentage amount from that reference and apply it to each above node value using the selected operation. When referenceValue is 0, process above nodes one by one: calculate a separate percentage amount from each node’s current value, then apply that amount back to the same node value using the selected operation. Use get_project_nodes first when the node identity or current structure is unknown. Structural fields such as UUID, index, type, and relations cannot be changed.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProperties,
          field: {
            type: 'string',
            enum: editableFields,
            description:
              'Required structured path of the editable card field. isStatic controls whether operations from cards below may change this node’s Value or Percentage number.',
          },
          value: {
            description:
              'Required replacement value. Its type must match the selected field: string, number, or boolean.',
            oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
          },
        },
        required: ['field', 'value'],
        oneOf: [{ required: ['nodeId'] }, { required: ['nodeName'] }],
        additionalProperties: false,
      },
      execute: (input) => {
        const projectId = requiredString(getProjectId(), 'projectId')
        const result = editProjectNode(projectId, input)
        onProjectUpdated?.(result.updatedProject)
        return JSON.stringify({ projectId, node: result.updatedNode }, null, 2)
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        untrustedContentHint: false,
      },
    },
    { signal },
  )

  await document.modelContext.registerTool(
    {
      name: 'delete_project_node',
      description:
        'Permanently delete one node from the currently open Time&Dime project. Select it by exactly one of nodeName or nodeId. If a name is duplicated, use get_project_nodes to find the exact UUID. Connected levels are relinked by the project graph storage logic.',
      inputSchema: {
        type: 'object',
        properties: targetProperties,
        oneOf: [{ required: ['nodeId'] }, { required: ['nodeName'] }],
        additionalProperties: false,
      },
      execute: (input) => {
        const projectId = requiredString(getProjectId(), 'projectId')
        const project = getStoredProject(projectId)
        const node = resolveNode(project, input)
        const updatedProject = deleteProjectNode(projectId, node.id)
        onProjectUpdated?.(updatedProject)

        return JSON.stringify(
          {
            projectId,
            deletedNode: node,
            remainingNodeCount: updatedProject.nodes.length,
          },
          null,
          2,
        )
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        untrustedContentHint: false,
      },
    },
    { signal },
  )
}
