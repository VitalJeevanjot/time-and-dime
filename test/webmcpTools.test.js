import assert from 'node:assert/strict'
import test from 'node:test'
import { getProject, saveProject } from '../src/services/projectStorage.js'
import { registerCreateInitialNodeTool } from '../src/webmcp/registerCreateInitialNodeTool.js'
import { createValueNodeInput } from '../src/webmcp/registerCreateValueNodeTool.js'
import { createProjectToolsetManager } from '../src/webmcp/registerProjectToolsetTools.js'
import { registerProjectWorkspaceTools } from '../src/webmcp/registerProjectWorkspaceTools.js'

function installBrowserMocks() {
  const storage = new Map()
  const tools = new Map()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  }
  globalThis.document = {
    modelContext: {
      registerTool: async (tool, options = {}) => {
        if (tools.has(tool.name)) throw new Error(`Tool ${tool.name} is already registered.`)
        tools.set(tool.name, tool)
        options.signal?.addEventListener(
          'abort',
          () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name)
          },
          { once: true },
        )
      },
    },
  }
  return tools
}

function projectDetails(id, name, value) {
  return {
    id,
    name,
    description: `${name} description`,
    endTime: { mode: 'duration', duration: 1, durationUnit: 'Seconds' },
    nodes: [
      {
        id: `${id}-node`,
        index: 1,
        type: 'value',
        value,
        operation: '+',
        isStatic: false,
        details: { name: 'Result', description: `${name} result` },
        timing: { value: 1, unit: 'Seconds' },
        timeLimit: { enabled: false },
        relations: { aboveCardIds: [], belowCardIds: [] },
      },
    ],
  }
}

test('workspace WebMCP tools list, open, calculate, clone, and compare projects', async () => {
  const tools = installBrowserMocks()
  saveProject(projectDetails('baseline', 'Baseline', '100'))
  saveProject(projectDetails('scenario', 'Scenario', '120'))
  const navigations = []
  const router = {
    push: async (target) => navigations.push(target),
  }
  const controller = new AbortController()

  await registerProjectWorkspaceTools({
    router,
    getCurrentProjectId: () => 'baseline',
    signal: controller.signal,
  })

  assert.deepEqual(
    [...tools.keys()].sort(),
    [
      'calculate_project',
      'clone_project',
      'compare_scenarios',
      'get_calculation_result',
      'list_projects',
      'open_project',
    ],
  )
  assert.equal(tools.get('list_projects').annotations.readOnlyHint, true)
  assert.equal(tools.get('open_project').annotations.readOnlyHint, false)
  assert.equal(tools.get('calculate_project').annotations.readOnlyHint, false)
  assert.equal(tools.get('calculate_project').annotations.untrustedContentHint, true)
  assert.deepEqual(tools.get('calculate_project').inputSchema.not, {
    required: ['projectId', 'projectName'],
  })

  const listed = JSON.parse(tools.get('list_projects').execute({}))
  assert.equal(listed.projectCount, 2)

  await tools.get('open_project').execute({ projectName: 'Baseline' })
  assert.deepEqual(navigations.at(-1), {
    name: 'project',
    params: { id: 'baseline' },
  })

  const calculated = JSON.parse(await tools.get('calculate_project').execute({ projectId: 'baseline' }))
  assert.equal(calculated.nodes[0].name, 'Result')
  assert.equal(calculated.nodes[0].finalValue, '100')
  assert.equal(calculated.isCurrent, true)
  const detailed = JSON.parse(tools.get('get_calculation_result').execute({ projectId: 'baseline' }))
  assert.equal(detailed.isCurrent, true)
  assert.equal(detailed.nodes[0].description, 'Baseline result')

  const comparison = JSON.parse(
    await tools.get('compare_scenarios').execute({
      scenarios: [
        { projectId: 'baseline', nodeSelectors: [{ nodeName: 'Result' }] },
        { projectId: 'scenario', nodeSelectors: [{ nodeName: 'Result' }] },
      ],
    }),
  )
  assert.equal(comparison.comparisons[0].nodes[0].finalValueDifference, '20')

  const changedWithoutTimestampChange = getProject('baseline')
  changedWithoutTimestampChange.nodes[0].value = '101'
  globalThis.localStorage.setItem(
    'time-and-dime.project.baseline',
    JSON.stringify(changedWithoutTimestampChange),
  )
  const staleResult = JSON.parse(
    tools.get('get_calculation_result').execute({ projectId: 'baseline' }),
  )
  assert.equal(staleResult.isCurrent, false)

  const cloned = JSON.parse(
    await tools.get('clone_project').execute({
      sourceProjectId: 'baseline',
      name: 'Baseline Copy',
      openAfterClone: false,
    }),
  )
  assert.notEqual(cloned.project.projectId, 'baseline')
  assert.equal(getProject(cloned.project.projectId).name, 'Baseline Copy')
})

test('create_initial_node creates exactly one first Value or Percentage card', async () => {
  const tools = installBrowserMocks()
  saveProject({
    id: 'empty-project',
    name: 'Empty',
    endTime: { mode: 'duration', duration: 1, durationUnit: 'Days' },
    nodes: [],
  })
  let updatedProject = null

  await registerCreateInitialNodeTool({
    getProjectId: () => 'empty-project',
    onProjectUpdated: (project) => {
      updatedProject = project
    },
    signal: new AbortController().signal,
  })

  const created = JSON.parse(
    tools.get('create_initial_node').execute({
      nodeType: 'percentage',
      operation: '+',
      percentage: '6.25',
      referenceValue: '0',
      isStatic: false,
      time: 5,
      timeUnit: 'Seconds',
      name: 'Growth',
      description: 'First node',
    }),
  )

  assert.equal(created.node.type, 'percentage')
  assert.equal(created.node.percentage.value, '6.25')
  assert.equal(updatedProject.nodes.length, 1)
  assert.throws(
    () =>
      tools.get('create_initial_node').execute({
        nodeType: 'value',
        operation: '+',
        value: '1',
        time: 1,
        timeUnit: 'Seconds',
        name: 'Second',
      }),
    /already has nodes/,
  )

  const initialNodeSchema = tools.get('create_initial_node').inputSchema
  assert.equal(
    initialNodeSchema.oneOf[0].properties.time.maximum,
    Number.MAX_SAFE_INTEGER,
  )
  assert.equal(initialNodeSchema.oneOf[0].properties.timeLimit.properties.from.type, 'object')
  assert.throws(
    () =>
      createValueNodeInput(
        {
          operation: '+',
          value: '1',
          time: 1,
          timeUnit: 'Seconds',
          timeLimit: {
            from: { value: Number.MAX_SAFE_INTEGER + 1, unit: 'Seconds' },
            until: { value: 2, unit: 'Seconds' },
          },
          name: 'Invalid time limit',
        },
        { endTime: { mode: 'duration' } },
      ),
    /timeLimit\.from\.value must be an integer/,
  )
})

test('project WebMCP toolsets stay within active count and metadata budgets', async () => {
  const tools = installBrowserMocks()
  let projectState = saveProject({
    id: 'toolset-project',
    name: 'Toolsets',
    endTime: { mode: 'duration', duration: 1, durationUnit: 'Days' },
    nodes: [],
  })
  const pageController = new AbortController()

  await registerProjectWorkspaceTools({
    router: { push: async () => {} },
    getCurrentProjectId: () => projectState.id,
    signal: pageController.signal,
  })

  const manager = createProjectToolsetManager({
    getProjectId: () => projectState.id,
    getProjectState: () => projectState,
    onProjectUpdated: (updatedProject) => {
      projectState = updatedProject
    },
    goHome: async () => {},
    deleteCurrentProject: () => projectState,
    getStoredProjectInfo: () => ({ ...projectState, nodeCount: projectState.nodes.length }),
    signal: pageController.signal,
  })
  await manager.register()

  const assertToolBudget = () => {
    assert.ok(tools.size <= 10, `expected at most 10 active tools, received ${tools.size}`)
    const metadataCharacters = [...tools.values()].reduce((total, tool) => {
      const { execute: _execute, ...metadata } = tool
      assert.ok(tool.description.length <= 500, `${tool.name} description exceeds 500 characters`)
      return total + JSON.stringify(metadata).length
    }, 0)
    assert.ok(
      metadataCharacters <= 12_000,
      `expected at most 12000 metadata characters, received ${metadataCharacters}`,
    )
  }

  assert.equal(tools.size, 9)
  assert.equal(tools.has('create_initial_node'), true)
  assert.equal(tools.has('get_project_nodes'), true)
  assert.equal(tools.has('set_project_toolset'), true)
  assertToolBudget()

  tools.get('create_initial_node').execute({
    nodeType: 'value',
    operation: '+',
    value: '10',
    time: 1,
    timeUnit: 'Seconds',
    name: 'Root',
  })
  await manager.refreshBuildTools()
  assert.equal(tools.has('create_initial_node'), false)
  assert.equal(tools.has('create_value_node'), true)
  assert.equal(tools.has('create_percentage_node'), true)
  assertToolBudget()

  await tools.get('set_project_toolset').execute({ toolset: 'edit' })
  assert.equal(tools.has('create_value_node'), false)
  assert.equal(tools.has('edit_project_node'), true)
  assert.equal(tools.has('delete_project_node'), true)
  assertToolBudget()

  await tools.get('set_project_toolset').execute({ toolset: 'project' })
  assert.equal(tools.has('edit_project_node'), false)
  assert.equal(tools.has('go_to_home'), true)
  assert.equal(tools.has('delete_project'), true)
  assert.equal(tools.has('get_project_info'), true)
  assertToolBudget()

  manager.dispose()
  pageController.abort()
})

test('scenario comparison pairs default nodes by stable index and rejects unlike fields', async () => {
  const tools = installBrowserMocks()
  const baseline = projectDetails('baseline-index', 'Baseline index', '10')
  baseline.nodes.push({
    ...baseline.nodes[0],
    id: 'baseline-index-node-2',
    index: 2,
    value: '20',
    details: { name: 'Second', description: '' },
  })
  const scenario = projectDetails('scenario-index', 'Scenario index', '15')
  scenario.nodes = [
    {
      ...scenario.nodes[0],
      id: 'scenario-index-node-2',
      index: 2,
      value: '25',
      details: { name: 'Second', description: '' },
    },
    scenario.nodes[0],
  ]
  saveProject(baseline)
  saveProject(scenario)
  saveProject({
    ...projectDetails('percentage-index', 'Percentage index', '0'),
    nodes: [
      {
        ...projectDetails('percentage-index', 'Percentage index', '0').nodes[0],
        type: 'percentage',
        percentage: { value: '10' },
        referenceValue: '0',
        value: undefined,
      },
    ],
  })

  await registerProjectWorkspaceTools({
    router: { push: async () => {} },
    getCurrentProjectId: () => '',
    signal: new AbortController().signal,
  })

  const indexedComparison = JSON.parse(
    await tools.get('compare_scenarios').execute({
      scenarios: [{ projectId: 'baseline-index' }, { projectId: 'scenario-index' }],
    }),
  ).comparisons[0]
  assert.equal(indexedComparison.pairing, 'node.index')
  assert.deepEqual(
    indexedComparison.nodes.map(({ nodeIndex, finalValueDifference }) => [
      nodeIndex,
      finalValueDifference,
    ]),
    [[1, '5'], [2, '5']],
  )

  const mismatchedComparison = JSON.parse(
    await tools.get('compare_scenarios').execute({
      scenarios: [{ projectId: 'baseline-index' }, { projectId: 'percentage-index' }],
    }),
  ).comparisons[0].nodes[0]
  assert.equal(mismatchedComparison.mismatch, true)
  assert.match(mismatchedComparison.mismatchReason, /mismatch/)
  assert.equal(mismatchedComparison.finalValueDifference, null)
})

test('calculate_project forwards an execution cancellation signal', async () => {
  const tools = installBrowserMocks()
  saveProject(projectDetails('cancelled', 'Cancelled', '1'))
  await registerProjectWorkspaceTools({
    router: { push: async () => {} },
    getCurrentProjectId: () => '',
    signal: new AbortController().signal,
  })
  const executionController = new AbortController()
  executionController.abort()

  await assert.rejects(
    tools.get('calculate_project').execute(
      { projectId: 'cancelled' },
      { signal: executionController.signal },
    ),
    { name: 'AbortError' },
  )
})
