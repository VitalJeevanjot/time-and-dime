import assert from 'node:assert/strict'
import test from 'node:test'
import { cloneProject, getProject, saveProject } from '../src/services/projectStorage.js'
import { calculateProjectSnapshot } from '../src/utils/projectCalculation.js'

function valueNode(id, value, aboveCardIds = [], options = {}) {
  return {
    id,
    index: options.index ?? 0,
    type: 'value',
    value,
    operation: options.operation ?? '+',
    isStatic: options.isStatic ?? false,
    details: { name: options.name ?? id, description: options.description ?? '' },
    timing: { value: options.time ?? 1, unit: options.timeUnit ?? 'Seconds' },
    timeLimit: { enabled: false },
    relations: { aboveCardIds, belowCardIds: options.belowCardIds ?? [] },
  }
}

function percentageNode(id, percentage, aboveCardIds = [], options = {}) {
  return {
    id,
    index: options.index ?? 0,
    type: 'percentage',
    percentage: { value: percentage },
    referenceValue: options.referenceValue ?? '0',
    operation: options.operation ?? '+',
    isStatic: options.isStatic ?? false,
    details: { name: options.name ?? id, description: options.description ?? '' },
    timing: { value: options.time ?? 1, unit: options.timeUnit ?? 'Seconds' },
    timeLimit: { enabled: false },
    relations: { aboveCardIds, belowCardIds: options.belowCardIds ?? [] },
  }
}

function calculationProject(nodes, endTime = { mode: 'duration', duration: 1, durationUnit: 'Seconds' }) {
  return {
    id: 'project-id',
    name: 'Scenario',
    description: 'Calculation test',
    startTime: { date: '', hours: '00', minutes: '00', seconds: '00' },
    endTime,
    nodes,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

test('project calculation is pure and chains same-time immediate updates bottom-to-top', async () => {
  const project = calculationProject([
    valueNode('top', '100', [], { index: 1, name: 'Revenue' }),
    percentageNode('middle', '10', ['top'], { index: 2, name: 'Growth' }),
    valueNode('bottom', '10', ['middle'], { index: 3, name: 'Adjustment' }),
  ])
  const before = JSON.stringify(project)

  const result = await calculateProjectSnapshot(project)

  assert.equal(JSON.stringify(project), before)
  assert.equal(result.status, 'completed')
  assert.equal(result.totals.nodeRunCount, '3')
  assert.equal(result.totals.valueUpdateCount, '2')
  assert.equal(result.nodes.find((node) => node.id === 'middle').finalValue, '20')
  assert.equal(result.nodes.find((node) => node.id === 'top').finalValue, '120')
  assert.equal(result.nodes.find((node) => node.id === 'top').name, 'Revenue')
})

test('a static immediate parent ignores incoming changes but still runs upward', async () => {
  const project = calculationProject([
    valueNode('top', '100'),
    percentageNode('middle', '10', ['top'], { isStatic: true }),
    valueNode('bottom', '10', ['middle']),
  ])

  const result = await calculateProjectSnapshot(project)

  assert.equal(result.nodes.find((node) => node.id === 'middle').finalValue, '10')
  assert.equal(result.nodes.find((node) => node.id === 'top').finalValue, '110')
})

test('project calculation rejects cycles and excessive schedules before running', async () => {
  const cyclicProject = calculationProject([
    valueNode('first', '1', ['second']),
    valueNode('second', '1', ['first']),
  ])
  await assert.rejects(calculateProjectSnapshot(cyclicProject), /cycle/)

  const excessiveProject = calculationProject(
    [valueNode('fast', '1', [], { time: 1, timeUnit: 'Milliseconds' })],
    { mode: 'duration', duration: 1, durationUnit: 'Years' },
  )
  await assert.rejects(calculateProjectSnapshot(excessiveProject), /requires .* node runs/)
})

test('project calculation rejects ambiguous static state and respects cancellation', async () => {
  const malformedProject = calculationProject([valueNode('malformed', '1')])
  malformedProject.nodes[0].isStatic = 'false'
  await assert.rejects(calculateProjectSnapshot(malformedProject), /isStatic must be a boolean/)

  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    calculateProjectSnapshot(calculationProject([valueNode('cancelled', '1')]), {
      signal: controller.signal,
    }),
    { name: 'AbortError' },
  )
})

test('cloneProject remaps every project and relation ID without changing the source', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }

  const source = saveProject({
    id: 'source-project',
    name: 'Source',
    description: 'Original',
    endTime: { mode: 'duration', duration: 1, durationUnit: 'Seconds' },
    nodes: [
      valueNode('top', '100', [], { index: 1, belowCardIds: ['bottom'] }),
      valueNode('bottom', '10', ['top'], { index: 2 }),
    ],
  })

  const clone = cloneProject(source.id, { name: 'Scenario Copy' })
  const storedSource = getProject(source.id)

  assert.notEqual(clone.project.id, source.id)
  assert.equal(clone.project.name, 'Scenario Copy')
  assert.notEqual(clone.project.nodes[0].id, source.nodes[0].id)
  assert.notEqual(clone.project.nodes[1].id, source.nodes[1].id)
  assert.equal(clone.project.nodes[1].relations.aboveCardIds[0], clone.project.nodes[0].id)
  assert.equal(clone.project.nodes[0].relations.belowCardIds[0], clone.project.nodes[1].id)
  assert.equal(storedSource.nodes[1].relations.aboveCardIds[0], 'top')
})

test('cloneProject retries project and node UUID collisions before writing', () => {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const generatedIds = [
    'top',
    'clone-top',
    'bottom',
    'clone-bottom',
    'source-project',
    'clone-project',
  ]
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { randomUUID: () => generatedIds.shift() },
  })

  try {
    saveProject({
      id: 'source-project',
      name: 'Source',
      endTime: { mode: 'duration', duration: 1, durationUnit: 'Seconds' },
      nodes: [
        valueNode('top', '100', [], { index: 1, belowCardIds: ['bottom'] }),
        valueNode('bottom', '10', ['top'], { index: 2 }),
      ],
    })

    const clone = cloneProject('source-project')

    assert.equal(clone.project.id, 'clone-project')
    assert.deepEqual(clone.project.nodes.map((node) => node.id), ['clone-top', 'clone-bottom'])
    assert.equal(getProject('source-project').nodes[0].id, 'top')
  } finally {
    Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
  }
})
