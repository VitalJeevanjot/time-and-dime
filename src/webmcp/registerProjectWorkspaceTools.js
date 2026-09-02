import { cloneProject, getProject, getProjects } from '../services/projectStorage.js'
import { applyDecimalOperation } from '../utils/decimalCalculation.js'
import {
  calculateProjectSnapshot,
  summarizeProjectCalculation,
} from '../utils/projectCalculation.js'

const MAX_CACHED_CALCULATION_RESULTS = 10
const MAX_TOOL_RESULT_CHARACTERS = 1_000_000
const calculationResults = new Map()
const activeCalculationProjectIds = new Set()

function serializeProjectSnapshot(project) {
  return JSON.stringify(project)
}

function serializeToolResult(result) {
  const serializedResult = JSON.stringify(result, null, 2)
  if (serializedResult.length > MAX_TOOL_RESULT_CHARACTERS) {
    throw new Error(
      `The tool result exceeds the ${MAX_TOOL_RESULT_CHARACTERS}-character safety limit. Select fewer nodes or shorten project text.`,
    )
  }
  return serializedResult
}

function cacheCalculationResult(projectId, sourceProjectSnapshot, result) {
  calculationResults.delete(projectId)
  calculationResults.set(projectId, { sourceProjectSnapshot, result })

  while (calculationResults.size > MAX_CACHED_CALCULATION_RESULTS) {
    const oldestProjectId = calculationResults.keys().next().value
    calculationResults.delete(oldestProjectId)
  }
}

function getCachedCalculationResult(projectId) {
  return calculationResults.get(projectId)
}

function requiredString(value, fieldName, maximumLength = 200) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`)
  }
  const normalizedValue = value.trim()
  if (normalizedValue.length > maximumLength) {
    throw new Error(`${fieldName} cannot exceed ${maximumLength} characters.`)
  }
  return normalizedValue
}

function optionalString(value, fieldName, maximumLength) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${fieldName} must be a string.`)
  const normalizedValue = value.trim()
  if (normalizedValue.length > maximumLength) {
    throw new Error(`${fieldName} cannot exceed ${maximumLength} characters.`)
  }
  return normalizedValue
}

function resolveProjectBySelector(input, { allowCurrent = false, getCurrentProjectId } = {}) {
  const hasProjectId = input?.projectId !== undefined
  const hasProjectName = input?.projectName !== undefined
  if (hasProjectId && hasProjectName) {
    throw new Error('Provide projectId or projectName, not both.')
  }

  if (hasProjectId) {
    const projectId = requiredString(input.projectId, 'projectId')
    const project = getProject(projectId)
    if (!project) throw new Error(`Project ${projectId} was not found.`)
    return project
  }

  if (hasProjectName) {
    const projectName = requiredString(input.projectName, 'projectName')
    const matchingProjects = getProjects().filter((project) => project.name === projectName)
    if (matchingProjects.length === 0) {
      throw new Error(`No project named "${projectName}" was found.`)
    }
    if (matchingProjects.length > 1) {
      throw new Error(`More than one project is named "${projectName}". Use projectId.`)
    }
    return matchingProjects[0]
  }

  if (allowCurrent) {
    const currentProjectId = String(getCurrentProjectId?.() ?? '').trim()
    if (currentProjectId) {
      const project = getProject(currentProjectId)
      if (!project) throw new Error(`Project ${currentProjectId} was not found.`)
      return project
    }
  }

  throw new Error('Provide projectId or projectName, or open a project first.')
}

function resolveCloneSource(input) {
  return resolveProjectBySelector({
    projectId: input.sourceProjectId,
    projectName: input.sourceProjectName,
  })
}

function resolveCalculationNode(result, selector) {
  const hasNodeId = selector.nodeId !== undefined
  const hasNodeName = selector.nodeName !== undefined
  if (hasNodeId === hasNodeName) {
    throw new Error('Each node selector must provide exactly one of nodeId or nodeName.')
  }

  if (hasNodeId) {
    const nodeId = requiredString(selector.nodeId, 'nodeId')
    const node = result.nodes.find((candidate) => candidate.id === nodeId)
    if (!node) throw new Error(`Node ${nodeId} was not found in project ${result.projectId}.`)
    return node
  }

  const nodeName = requiredString(selector.nodeName, 'nodeName')
  const matches = result.nodes.filter((candidate) => candidate.name === nodeName)
  if (matches.length === 0) {
    throw new Error(`No node named "${nodeName}" was found in project ${result.projectId}.`)
  }
  if (matches.length > 1) {
    throw new Error(
      `More than one node is named "${nodeName}" in project ${result.projectId}. Use nodeId.`,
    )
  }
  return matches[0]
}

function selectCalculationNodes(result, selectors) {
  if (!selectors?.length) return result.nodes
  return selectors.map((selector) => resolveCalculationNode(result, selector))
}

function compactComparisonNode(node) {
  if (!node) return null
  return {
    id: node.id,
    index: node.index,
    name: node.name,
    description: node.description,
    type: node.type,
    calculationField: node.calculationField,
    initialValue: node.initialValue,
    finalValue: node.finalValue,
    meaning: node.meaning,
  }
}

function describeComparisonMismatch(baselineNode, scenarioNode) {
  if (!baselineNode) return 'baseline_node_missing'
  if (!scenarioNode) return 'scenario_node_missing'

  const typeMismatch = baselineNode.type !== scenarioNode.type
  const calculationFieldMismatch =
    baselineNode.calculationField !== scenarioNode.calculationField
  if (typeMismatch && calculationFieldMismatch) {
    return 'type_and_calculation_field_mismatch'
  }
  if (typeMismatch) return 'type_mismatch'
  if (calculationFieldMismatch) return 'calculation_field_mismatch'
  return null
}

function compareNodeIndices(firstIndex, secondIndex) {
  if (typeof firstIndex === 'number' && typeof secondIndex === 'number') {
    return firstIndex - secondIndex
  }
  return String(firstIndex).localeCompare(String(secondIndex), undefined, { numeric: true })
}

function createIndexPairs(baselineNodes, scenarioNodes) {
  const createNodesByIndex = (nodes, label) => {
    const nodesByIndex = new Map()
    nodes.forEach((node) => {
      if (node.index === undefined || node.index === null) {
        throw new Error(`${label} node ${node.id} does not have a stable index.`)
      }
      if (nodesByIndex.has(node.index)) {
        throw new Error(`${label} contains duplicate node index ${node.index}.`)
      }
      nodesByIndex.set(node.index, node)
    })
    return nodesByIndex
  }
  const baselineNodesByIndex = createNodesByIndex(baselineNodes, 'Baseline')
  const scenarioNodesByIndex = createNodesByIndex(scenarioNodes, 'Scenario')
  const nodeIndices = [...new Set([...baselineNodesByIndex.keys(), ...scenarioNodesByIndex.keys()])]
    .sort(compareNodeIndices)

  return nodeIndices.map((nodeIndex) => ({
    nodeIndex,
    baselineNode: baselineNodesByIndex.get(nodeIndex),
    scenarioNode: scenarioNodesByIndex.get(nodeIndex),
  }))
}

function createPositionPairs(baselineNodes, scenarioNodes) {
  const pairCount = Math.max(baselineNodes.length, scenarioNodes.length)
  return Array.from({ length: pairCount }, (_, index) => ({
    nodeIndex: null,
    baselineNode: baselineNodes[index],
    scenarioNode: scenarioNodes[index],
  }))
}

function createPairwiseComparison(baseline, scenario) {
  const pairByNodeIndex = baseline.usesDefaultNodeSelection && scenario.usesDefaultNodeSelection
  const pairs = pairByNodeIndex
    ? createIndexPairs(baseline.nodes, scenario.nodes)
    : createPositionPairs(baseline.nodes, scenario.nodes)
  const nodes = pairs.map(({ nodeIndex, baselineNode, scenarioNode }, index) => {
    const mismatchReason = describeComparisonMismatch(baselineNode, scenarioNode)
    return {
      position: index + 1,
      nodeIndex,
      baseline: compactComparisonNode(baselineNode),
      scenario: compactComparisonNode(scenarioNode),
      mismatch: mismatchReason !== null,
      mismatchReason,
      finalValueDifference:
        mismatchReason === null
          ? applyDecimalOperation(scenarioNode.finalValue, baselineNode.finalValue, '-')
          : null,
    }
  })

  return {
    baselineProjectId: baseline.result.projectId,
    baselineProjectName: baseline.result.projectName,
    scenarioProjectId: scenario.result.projectId,
    scenarioProjectName: scenario.result.projectName,
    pairing: pairByNodeIndex ? 'node.index' : 'selector_order',
    nodes,
  }
}

const projectSelectorProperties = {
  projectId: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Exact project UUID. Use this instead of projectName.',
  },
  projectName: {
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Exact unique project name. Use this instead of projectId.',
  },
}

const optionalProjectSelectorSchema = {
  type: 'object',
  properties: projectSelectorProperties,
  not: { required: ['projectId', 'projectName'] },
  additionalProperties: false,
}

const nodeSelectorSchema = {
  type: 'object',
  properties: {
    nodeId: { type: 'string', minLength: 1, maxLength: 200 },
    nodeName: { type: 'string', minLength: 1, maxLength: 200 },
  },
  oneOf: [{ required: ['nodeId'] }, { required: ['nodeName'] }],
  additionalProperties: false,
}

export async function registerProjectWorkspaceTools({ router, getCurrentProjectId, signal }) {
  if (!document.modelContext?.registerTool) return

  const toolDefinitions = [
    {
      name: 'list_projects',
      title: 'List projects',
      description:
        'List locally stored Time&Dime projects newest-first. Returns summaries and stable project IDs, not full node data.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      execute: () => {
        const projects = getProjects()
          .sort((first, second) => (Date.parse(second.createdAt) || 0) - (Date.parse(first.createdAt) || 0))
          .map((project) => ({
            projectId: project.id,
            name: project.name,
            description: project.description,
            intervalMode: project.endTime?.mode,
            nodeCount: Array.isArray(project.nodes) ? project.nodes.length : 0,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          }))
        return serializeToolResult({ projectCount: projects.length, projects })
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: 'open_project',
      title: 'Open project',
      description:
        'Open one stored Time&Dime project by exact UUID or unique exact name. This navigates the shared page but does not modify project data.',
      inputSchema: {
        type: 'object',
        properties: projectSelectorProperties,
        oneOf: [{ required: ['projectId'] }, { required: ['projectName'] }],
        additionalProperties: false,
      },
      execute: async (input) => {
        const project = resolveProjectBySelector(input)
        await router.push({ name: 'project', params: { id: project.id } })
        return serializeToolResult({
          projectId: project.id,
          name: project.name,
          route: `/projects/${project.id}`,
        })
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
    },
    {
      name: 'calculate_project',
      title: 'Calculate project',
      description:
        'Calculate a Time&Dime project on an in-memory clone without changing localStorage. Uses virtual time, exact decimal-string arithmetic, immediate-node propagation, and workload safety limits. Omit the selector when a project is already open.',
      inputSchema: optionalProjectSelectorSchema,
      execute: async (input, { signal: executionSignal } = {}) => {
        const project = resolveProjectBySelector(input, { allowCurrent: true, getCurrentProjectId })
        if (activeCalculationProjectIds.has(project.id)) {
          throw new Error(`Project ${project.id} is already being calculated.`)
        }
        activeCalculationProjectIds.add(project.id)
        const sourceProjectSnapshot = serializeProjectSnapshot(project)
        cacheCalculationResult(project.id, sourceProjectSnapshot, {
          status: 'running',
          projectId: project.id,
          projectName: project.name,
          sourceUpdatedAt: project.updatedAt ?? null,
        })

        try {
          const result = await calculateProjectSnapshot(project, { signal: executionSignal })
          cacheCalculationResult(project.id, sourceProjectSnapshot, result)
          const currentProject = getProject(project.id)
          return serializeToolResult(
            {
              ...summarizeProjectCalculation(result),
              isCurrent:
                currentProject !== null &&
                serializeProjectSnapshot(currentProject) === sourceProjectSnapshot,
            },
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          cacheCalculationResult(project.id, sourceProjectSnapshot, {
            status: 'failed',
            projectId: project.id,
            projectName: project.name,
            sourceUpdatedAt: project.updatedAt ?? null,
            error: message,
          })
          throw error
        } finally {
          activeCalculationProjectIds.delete(project.id)
        }
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
    },
    {
      name: 'get_calculation_result',
      title: 'Get calculation result',
      description:
        'Return the latest detailed in-memory calculation result for a project, including every node’s name, description, meaning, initial/final calculation value, schedule, and run/update counts. Call calculate_project first. Omit the selector when a project is open.',
      inputSchema: optionalProjectSelectorSchema,
      execute: (input) => {
        const project = resolveProjectBySelector(input, { allowCurrent: true, getCurrentProjectId })
        const cachedResult = getCachedCalculationResult(project.id)
        if (!cachedResult) {
          return serializeToolResult(
            {
              status: 'not_calculated',
              projectId: project.id,
              message: 'Call calculate_project for this project first.',
            },
          )
        }
        const isCurrent =
          cachedResult.sourceProjectSnapshot === serializeProjectSnapshot(project)
        return serializeToolResult(
          {
            ...cachedResult.result,
            isCurrent,
          },
        )
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
    {
      name: 'clone_project',
      title: 'Clone project',
      description:
        'Clone a complete Time&Dime project with a new project UUID and new UUIDs for every node while preserving and remapping the graph. The clone is stored locally and opens by default.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceProjectId: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Exact source project UUID. Use instead of sourceProjectName.',
          },
          sourceProjectName: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'Exact unique source project name. Use instead of sourceProjectId.',
          },
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 5_000 },
          openAfterClone: { type: 'boolean', default: true },
        },
        oneOf: [{ required: ['sourceProjectId'] }, { required: ['sourceProjectName'] }],
        additionalProperties: false,
      },
      execute: async (input) => {
        const sourceProject = resolveCloneSource(input)
        const name = optionalString(input.name, 'name', 200)
        if (name !== undefined && !name) throw new Error('name cannot be empty.')
        const description = optionalString(input.description, 'description', 5_000)
        const clone = cloneProject(sourceProject.id, { name, description })
        globalThis.window?.dispatchEvent?.(new Event('time-and-dime:projects-changed'))
        const openAfterClone = input.openAfterClone ?? true
        if (openAfterClone) {
          await router.push({ name: 'project', params: { id: clone.project.id } })
        }

        return serializeToolResult(
          {
            sourceProjectId: sourceProject.id,
            project: {
              projectId: clone.project.id,
              name: clone.project.name,
              description: clone.project.description,
              nodeCount: clone.project.nodes.length,
            },
            nodeIdMap: clone.nodeIdMap,
            opened: openAfterClone,
          },
        )
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
    },
    {
      name: 'compare_scenarios',
      title: 'Compare scenarios',
      description:
        'Calculate and compare nodes from two to five Time&Dime projects without changing stored data. The first project is the baseline; finalValueDifference is scenario minus baseline. Each scenario may select nodes by UUID or unique exact name. When both sides omit selectors, nodes pair by stable node.index; otherwise they pair by selected/stored order. Exact differences are returned only for nodes with matching types and calculation fields.',
      inputSchema: {
        type: 'object',
        properties: {
          scenarios: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: {
              type: 'object',
              properties: {
                ...projectSelectorProperties,
                nodeSelectors: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 100,
                  items: nodeSelectorSchema,
                },
              },
              oneOf: [{ required: ['projectId'] }, { required: ['projectName'] }],
              additionalProperties: false,
            },
          },
        },
        required: ['scenarios'],
        additionalProperties: false,
      },
      execute: async (input, { signal: executionSignal } = {}) => {
        if (!Array.isArray(input.scenarios) || input.scenarios.length < 2 || input.scenarios.length > 5) {
          throw new Error('scenarios must contain from 2 to 5 projects.')
        }

        const projects = input.scenarios.map((scenario) => resolveProjectBySelector(scenario))
        if (new Set(projects.map((project) => project.id)).size !== projects.length) {
          throw new Error('Each scenario must refer to a different project.')
        }
        const results = []
        for (const project of projects) {
          results.push(await calculateProjectSnapshot(project, { signal: executionSignal }))
        }
        const scenarios = results.map((result, index) => ({
          result,
          nodes: selectCalculationNodes(result, input.scenarios[index].nodeSelectors),
          usesDefaultNodeSelection: !input.scenarios[index].nodeSelectors?.length,
        }))
        const baseline = scenarios[0]

        return serializeToolResult(
          {
            status: 'completed',
            comparedAt: new Date().toISOString(),
            scenarioCount: scenarios.length,
            scenarios: scenarios.map((scenario) => ({
              projectId: scenario.result.projectId,
              projectName: scenario.result.projectName,
              projectDescription: scenario.result.projectDescription,
              totals: scenario.result.totals,
              nodes: scenario.nodes.map(compactComparisonNode),
            })),
            comparisons: scenarios.slice(1).map((scenario) => createPairwiseComparison(baseline, scenario)),
          },
        )
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
    },
  ]

  await Promise.all(
    toolDefinitions.map(async (tool) => {
      try {
        await document.modelContext.registerTool(tool, { signal })
      } catch (error) {
        if (!signal.aborted) console.warn(`Could not register the WebMCP ${tool.name} tool.`, error)
      }
    }),
  )
}
