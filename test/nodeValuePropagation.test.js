import assert from 'node:assert/strict'
import test from 'node:test'
import { applyNodeToImmediateAboveNodes } from '../src/utils/nodeValuePropagation.js'
import { createProjectRunScheduler } from '../src/utils/projectRunScheduler.js'

function valueNode(id, value, aboveCardIds = [], options = {}) {
  return {
    id,
    type: 'value',
    value,
    operation: options.operation ?? '+',
    isStatic: options.isStatic ?? false,
    timing: { value: options.time ?? 1, unit: 'Seconds' },
    timeLimit: { enabled: false },
    relations: { aboveCardIds, belowCardIds: [] },
  }
}

function percentageNode(id, percentage, aboveCardIds = [], options = {}) {
  return {
    id,
    type: 'percentage',
    percentage: { value: percentage },
    referenceValue: options.referenceValue ?? '0',
    operation: options.operation ?? '+',
    isStatic: options.isStatic ?? false,
    timing: { value: options.time ?? 1, unit: 'Seconds' },
    timeLimit: { enabled: false },
    relations: { aboveCardIds, belowCardIds: [] },
  }
}

test('a node updates its immediate parent but never a grandparent directly', () => {
  const project = {
    nodes: [
      valueNode('top', '100'),
      valueNode('middle', '10', ['top']),
      valueNode('bottom', '5', ['middle']),
    ],
  }

  const result = applyNodeToImmediateAboveNodes(project, 'bottom')

  assert.equal(result.project.nodes[0].value, '100')
  assert.equal(result.project.nodes[1].value, '15')
  assert.deepEqual(result.updates.map(({ nodeId }) => nodeId), ['middle'])
})

test('a Value source updates mutable Value and Percentage parents once', () => {
  const project = {
    nodes: [
      valueNode('value-target', '100'),
      percentageNode('percentage-target', '20'),
      valueNode('static-value', '100', [], { isStatic: true }),
      percentageNode('static-percentage', '20', [], { isStatic: true }),
      valueNode('source', '5', [
        'value-target',
        'percentage-target',
        'static-value',
        'static-percentage',
        'value-target',
      ]),
    ],
  }

  const result = applyNodeToImmediateAboveNodes(project, 'source')

  assert.equal(result.project.nodes[0].value, '105')
  assert.equal(result.project.nodes[1].percentage.value, '25')
  assert.equal(result.project.nodes[2].value, '100')
  assert.equal(result.project.nodes[3].percentage.value, '20')
  assert.deepEqual(
    result.updates.map(({ nodeId, field }) => [nodeId, field]),
    [
      ['value-target', 'value'],
      ['percentage-target', 'percentage.value'],
    ],
  )
})

test('a Percentage source uses each target field when Reference Value is zero', () => {
  const project = {
    nodes: [
      valueNode('value-target', '200'),
      percentageNode('percentage-target', '40'),
      percentageNode('source', '10', ['value-target', 'percentage-target']),
    ],
  }

  const result = applyNodeToImmediateAboveNodes(project, 'source')

  assert.equal(result.project.nodes[0].value, '220')
  assert.equal(result.project.nodes[1].percentage.value, '44')
})

test('a Percentage source uses one non-zero Reference Value for mixed parents', () => {
  const project = {
    nodes: [
      valueNode('value-target', '200'),
      percentageNode('percentage-target', '40'),
      percentageNode('source', '10', ['value-target', 'percentage-target'], {
        operation: '-',
        referenceValue: '500',
      }),
    ],
  }

  const result = applyNodeToImmediateAboveNodes(project, 'source')

  assert.equal(result.project.nodes[0].value, '150')
  assert.equal(result.project.nodes[1].percentage.value, '-10')
})

test('same-time runs propagate bottom-to-top through separate node executions', async () => {
  let currentProject = {
    endTime: { mode: 'duration' },
    nodes: [
      valueNode('top', '100'),
      percentageNode('middle', '10', ['top']),
      valueNode('bottom', '10', ['middle']),
    ],
  }

  const scheduler = createProjectRunScheduler({
    project: currentProject,
    projectEndTimeInMilliseconds: 1_000n,
    getProject: () => currentProject,
    onNodeRun: ({ id }) => {
      currentProject = applyNodeToImmediateAboveNodes(currentProject, id).project
    },
  })

  await scheduler.start()

  assert.equal(currentProject.nodes[0].value, '120')
  assert.equal(currentProject.nodes[1].percentage.value, '20')
})
