import { addProjectNode, getProject } from '../services/projectStorage.js'
import { createPercentageNodeInput } from './registerCreatePercentageNodeTool.js'
import { createValueNodeInput } from './registerCreateValueNodeTool.js'

const operations = ['+', '-', '/', '*', '%']
const timeUnits = ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years']

const durationBoundarySchema = {
  type: 'object',
  properties: {
    value: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    unit: { type: 'string', enum: timeUnits },
  },
  required: ['value', 'unit'],
  additionalProperties: false,
}

const dateTimeBoundarySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', format: 'date', maxLength: 10 },
    hours: { type: 'integer', minimum: 0, maximum: 23 },
    minutes: { type: 'integer', minimum: 0, maximum: 59 },
    seconds: { type: 'integer', minimum: 0, maximum: 59 },
  },
  required: ['date', 'hours', 'minutes', 'seconds'],
  additionalProperties: false,
}

const timeLimitSchema = {
  description:
    'Optional node time limit. Its boundary type must match the current project interval mode.',
  oneOf: [
    {
      type: 'object',
      title: 'Duration time limit',
      properties: { from: durationBoundarySchema, until: durationBoundarySchema },
      required: ['from', 'until'],
      additionalProperties: false,
    },
    {
      type: 'object',
      title: 'Date and time limit',
      properties: { from: dateTimeBoundarySchema, until: dateTimeBoundarySchema },
      required: ['from', 'until'],
      additionalProperties: false,
    },
  ],
}

const commonProperties = {
  operation: {
    type: 'string',
    enum: operations,
    description: 'Operation this node applies to its immediate node or nodes above when it runs.',
  },
  isStatic: {
    type: 'boolean',
    description:
      'Whether this node calculation field ignores incoming operations from directly below.',
  },
  time: {
    type: 'integer',
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    description: 'Non-negative safe-integer scheduled interval value.',
  },
  timeUnit: {
    type: 'string',
    enum: timeUnits,
    description: 'Unit for the scheduled interval.',
  },
  timeLimit: timeLimitSchema,
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Node name.',
  },
  description: {
    type: 'string',
    maxLength: 2_000,
    description: 'Optional node description.',
  },
}

export function registerCreateInitialNodeTool({ getProjectId, onProjectUpdated, signal }) {
  if (!document.modelContext?.registerTool) return Promise.resolve()

  return document.modelContext.registerTool(
    {
      name: 'create_initial_node',
      title: 'Create initial node',
      description:
        'Create the first/root card in the currently open empty Time&Dime project, matching the initial + Add button. Choose Value or Percentage and provide that card’s fields. Once any node exists, use create_value_node or create_percentage_node with a target and side instead.',
      inputSchema: {
        oneOf: [
          {
            type: 'object',
            title: 'Initial Value node',
            properties: {
              ...commonProperties,
              nodeType: { const: 'value' },
              value: {
                type: 'string',
                minLength: 1,
                maxLength: 10_050,
                description:
                  'Required decimal string. Strings preserve very large and high-precision values.',
              },
            },
            required: ['nodeType', 'operation', 'value', 'time', 'timeUnit', 'name'],
            additionalProperties: false,
          },
          {
            type: 'object',
            title: 'Initial Percentage node',
            properties: {
              ...commonProperties,
              nodeType: { const: 'percentage' },
              percentage: {
                type: 'string',
                minLength: 1,
                maxLength: 10_050,
                description:
                  'Required Percentage decimal string. Strings preserve very large and high-precision values.',
              },
              referenceValue: {
                type: 'string',
                minLength: 1,
                maxLength: 10_050,
                description:
                  'Optional Reference Value decimal string. Defaults to 0, meaning calculate the percentage from each immediate target field.',
              },
            },
            required: ['nodeType', 'operation', 'percentage', 'time', 'timeUnit', 'name'],
            additionalProperties: false,
          },
        ],
      },
      execute: (input) => {
        if (!['value', 'percentage'].includes(input.nodeType)) {
          throw new Error('nodeType must be value or percentage.')
        }
        const projectId = String(getProjectId() ?? '').trim()
        if (!projectId) throw new Error('A current project ID is required.')

        const project = getProject(projectId)
        if (!project) throw new Error(`Project ${projectId} was not found.`)
        if (project.nodes.length !== 0) {
          throw new Error(
            'The project already has nodes. Use create_value_node or create_percentage_node with a target and side.',
          )
        }

        const node =
          input.nodeType === 'value'
            ? createValueNodeInput(input, project)
            : createPercentageNodeInput(input, project)
        const updatedProject = addProjectNode(projectId, node)
        const createdNode = updatedProject.nodes[0]
        onProjectUpdated?.(updatedProject)

        return JSON.stringify({ projectId, node: createdNode }, null, 2)
      },
      annotations: {
        readOnlyHint: false,
        untrustedContentHint: true,
      },
    },
    { signal },
  )
}
