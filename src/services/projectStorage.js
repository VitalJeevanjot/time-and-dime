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

export function addProjectNode(projectId, node) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const createNode = node.type === 'value' ? createValueNode : createPercentageNode
  if (!['value', 'percentage'].includes(node.type)) {
    throw new Error(`Unsupported node type: ${node.type}`)
  }

  let normalizedNode = createNode(node)
  const existingNodeIds = new Set(project.nodes.map((projectNode) => projectNode.id))
  if (existingNodeIds.has(normalizedNode.id)) {
    normalizedNode = createNode({ ...node, id: undefined })
  }

  const updatedProject = {
    ...project,
    nodes: [...project.nodes, normalizedNode],
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(projectStorageKey(projectId), JSON.stringify(updatedProject))
  return updatedProject
}
