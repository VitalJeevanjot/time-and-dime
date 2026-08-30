import { createPercentageNode, createProjectRecord, createValueNode } from '../models/project.js'

const PROJECT_INDEX_KEY = 'time-and-dime.project-ids'
const PROJECT_KEY_PREFIX = 'time-and-dime.project.'

function readJson(storageKey, fallback) {
  try {
    const storedValue = localStorage.getItem(storageKey)
    return storedValue === null ? fallback : JSON.parse(storedValue)
  } catch {
    return fallback
  }
}

function projectStorageKey(projectId) {
  return `${PROJECT_KEY_PREFIX}${projectId}`
}

function readProjectIds() {
  const projectIds = readJson(PROJECT_INDEX_KEY, [])
  return Array.isArray(projectIds) ? projectIds : []
}

function addProjectToIndex(projectId) {
  const projectIds = readProjectIds()
  if (!projectIds.includes(projectId)) {
    projectIds.push(projectId)
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(projectIds))
  }
}

export function saveProject(projectDetails) {
  const project = createProjectRecord(projectDetails)

  localStorage.setItem(projectStorageKey(project.id), JSON.stringify(project))
  addProjectToIndex(project.id)

  return project
}

export function getProject(projectId) {
  return readJson(projectStorageKey(projectId), null)
}

export function getProjects() {
  return readProjectIds().map(getProject).filter(Boolean)
}

export function updateProject(project) {
  if (!project?.id) throw new Error('A project ID is required to update a project.')

  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(projectStorageKey(project.id), JSON.stringify(updatedProject))
  addProjectToIndex(project.id)

  return updatedProject
}

function createUniqueProjectNode(project, node) {
  if (!['value', 'percentage'].includes(node.type)) {
    throw new Error(`Unsupported node type: ${node.type}`)
  }

  const createNode = node.type === 'value' ? createValueNode : createPercentageNode
  const nextNodeIndex =
    Math.max(
      project.nodes.length,
      ...project.nodes.map((projectNode) =>
        Number.isInteger(projectNode.index) ? projectNode.index : 0,
      ),
    ) + 1
  const nodeWithIndex = {
    ...node,
    index: node.index ?? nextNodeIndex,
  }
  let normalizedNode = createNode(nodeWithIndex)
  const existingNodeIds = new Set(project.nodes.map((projectNode) => projectNode.id))
  if (existingNodeIds.has(normalizedNode.id)) {
    normalizedNode = createNode({ ...nodeWithIndex, id: undefined })
  }

  return normalizedNode
}

function saveNodes(project, nodes) {
  const updatedProject = {
    ...project,
    nodes,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(projectStorageKey(project.id), JSON.stringify(updatedProject))
  return updatedProject
}

export function addProjectNode(projectId, node) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const normalizedNode = createUniqueProjectNode(project, node)

  return saveNodes(project, [...project.nodes, normalizedNode])
}

export function addProjectNodeAbove(projectId, targetNodeId, node) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const targetIndex = project.nodes.findIndex((projectNode) => projectNode.id === targetNodeId)
  if (targetIndex === -1) throw new Error(`Node ${targetNodeId} was not found.`)

  const normalizedNode = createUniqueProjectNode(project, node)
  const targetNode = project.nodes[targetIndex]
  const previousAboveCardId = targetNode.relations?.aboveCardId ?? null
  const nodeAbove = {
    ...normalizedNode,
    relations: {
      ...normalizedNode.relations,
      aboveCardId: previousAboveCardId,
      belowCardId: targetNode.id,
    },
  }
  const updatedTargetNode = {
    ...targetNode,
    relations: {
      ...targetNode.relations,
      aboveCardId: nodeAbove.id,
    },
  }
  const nodes = [...project.nodes]
  const previousAboveIndex = nodes.findIndex(
    (projectNode) => projectNode.id === previousAboveCardId,
  )
  if (previousAboveIndex !== -1) {
    nodes[previousAboveIndex] = {
      ...nodes[previousAboveIndex],
      relations: {
        ...nodes[previousAboveIndex].relations,
        belowCardId: nodeAbove.id,
      },
    }
  }
  nodes[targetIndex] = updatedTargetNode
  nodes.splice(targetIndex, 0, nodeAbove)

  return saveNodes(project, nodes)
}
