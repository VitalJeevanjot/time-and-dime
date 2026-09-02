import { createPercentageNode, createProjectRecord, createValueNode } from '../models/project.js'

const PROJECT_INDEX_KEY = 'time-and-dime.project-ids'
const PROJECT_KEY_PREFIX = 'time-and-dime.project.'
const MAX_ID_GENERATION_ATTEMPTS = 100

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

function generateUniqueId(createId, isReserved, label) {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = createId()
    if (typeof id === 'string' && id.length > 0 && !isReserved(id)) return id
  }

  throw new Error(
    `Could not generate a unique ${label} after ${MAX_ID_GENERATION_ATTEMPTS} attempts.`,
  )
}

function storedProjectIdExists(projectId, knownProjectIds = new Set()) {
  return (
    knownProjectIds.has(projectId) ||
    readProjectIds().includes(projectId) ||
    localStorage.getItem(projectStorageKey(projectId)) !== null
  )
}

/** Creates an independent copy with new project/node IDs and remapped graph relations. */
export function cloneProject(sourceProjectId, overrides = {}) {
  const sourceProject = getProject(sourceProjectId)
  if (!sourceProject) throw new Error(`Project ${sourceProjectId} was not found.`)
  if (!Array.isArray(sourceProject.nodes)) {
    throw new Error(`Project ${sourceProjectId} does not contain a valid nodes array.`)
  }

  const sourceNodeIds = new Set()
  sourceProject.nodes.forEach((node) => {
    if (!node?.id) throw new Error('Every source node must have an ID before cloning.')
    if (sourceNodeIds.has(node.id)) throw new Error(`Duplicate source node ID: ${node.id}.`)
    if (!['value', 'percentage'].includes(node.type)) {
      throw new Error(`Unsupported node type: ${node.type}.`)
    }
    sourceNodeIds.add(node.id)
  })

  const reservedNodeIds = new Set(sourceNodeIds)
  const clonedNodes = sourceProject.nodes.map((node) => {
    const createNode = node.type === 'value' ? createValueNode : createPercentageNode
    const createClonedNode = () => createNode({
      ...node,
      id: undefined,
      relations: { aboveCardIds: [], belowCardIds: [] },
    })
    const id = generateUniqueId(
      () => createClonedNode().id,
      (candidateId) => reservedNodeIds.has(candidateId),
      `node ID for ${node.id}`,
    )
    reservedNodeIds.add(id)

    return createNode({
      ...node,
      id,
      relations: { aboveCardIds: [], belowCardIds: [] },
    })
  })
  const nodeIdMap = new Map(
    sourceProject.nodes.map((node, index) => [node.id, clonedNodes[index].id]),
  )

  const mapRelationIds = (node, relationName) => {
    const relationIds = node.relations?.[relationName] ?? []
    if (!Array.isArray(relationIds)) {
      throw new Error(`Node ${node.id}.relations.${relationName} must be an array.`)
    }
    return relationIds.map((relationId) => {
      const clonedRelationId = nodeIdMap.get(relationId)
      if (!clonedRelationId) {
        throw new Error(`Related node ${relationId} was not found while cloning.`)
      }
      return clonedRelationId
    })
  }

  const nodes = clonedNodes.map((node, index) => ({
    ...node,
    relations: {
      aboveCardIds: mapRelationIds(sourceProject.nodes[index], 'aboveCardIds'),
      belowCardIds: mapRelationIds(sourceProject.nodes[index], 'belowCardIds'),
    },
  }))

  const knownProjectIds = new Set(readProjectIds())
  getProjects().forEach((project) => {
    if (project?.id) knownProjectIds.add(project.id)
  })
  const projectId = generateUniqueId(
    () => createProjectRecord().id,
    (candidateId) => storedProjectIdExists(candidateId, knownProjectIds),
    'project ID',
  )
  const clonedProject = createProjectRecord({
    ...sourceProject,
    id: projectId,
    name: overrides.name ?? `${sourceProject.name} Copy`,
    description: overrides.description ?? sourceProject.description,
    nodes,
    createdAt: undefined,
    updatedAt: undefined,
  })

  // Recheck immediately before writing so an observed collision can never overwrite a project.
  if (storedProjectIdExists(clonedProject.id, knownProjectIds)) {
    throw new Error(`Project ID ${clonedProject.id} became unavailable before the clone was saved.`)
  }
  localStorage.setItem(projectStorageKey(clonedProject.id), JSON.stringify(clonedProject))
  addProjectToIndex(clonedProject.id)

  return {
    project: clonedProject,
    nodeIdMap: Object.fromEntries(nodeIdMap),
  }
}

export function deleteProject(projectId) {
  localStorage.removeItem(projectStorageKey(projectId))
  const remainingProjectIds = readProjectIds().filter((storedProjectId) => storedProjectId !== projectId)
  localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(remainingProjectIds))
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

function relationIds(node, relationName) {
  const ids = node.relations?.[relationName]
  return Array.isArray(ids) ? ids : []
}

function sameIds(firstIds, secondIds) {
  return (
    firstIds.length === secondIds.length &&
    firstIds.every((id, index) => id === secondIds[index])
  )
}

function nodesShareLevel(firstNode, secondNode) {
  return (
    sameIds(relationIds(firstNode, 'aboveCardIds'), relationIds(secondNode, 'aboveCardIds')) &&
    sameIds(relationIds(firstNode, 'belowCardIds'), relationIds(secondNode, 'belowCardIds'))
  )
}

function uniqueIds(ids) {
  return [...new Set(ids)]
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

  const targetNode = project.nodes[targetIndex]
  const normalizedNode = createUniqueProjectNode(project, node)
  const targetLevelNodeIds = project.nodes
    .filter((projectNode) => nodesShareLevel(projectNode, targetNode))
    .map((projectNode) => projectNode.id)
  const targetLevelIdSet = new Set(targetLevelNodeIds)
  const previousAboveCardIds = relationIds(targetNode, 'aboveCardIds')
  const previousAboveIdSet = new Set(previousAboveCardIds)
  const nodeAbove = {
    ...normalizedNode,
    relations: {
      ...normalizedNode.relations,
      aboveCardIds: previousAboveCardIds,
      belowCardIds: targetLevelNodeIds,
    },
  }
  const nodes = project.nodes.map((projectNode) => {
    if (targetLevelIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          aboveCardIds: [nodeAbove.id],
        },
      }
    }

    if (previousAboveIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          belowCardIds: [nodeAbove.id],
        },
      }
    }

    return projectNode
  })
  const insertionIndex = nodes.findIndex((projectNode) => targetLevelIdSet.has(projectNode.id))
  nodes.splice(insertionIndex, 0, nodeAbove)

  return saveNodes(project, nodes)
}

export function addProjectNodeBelow(projectId, targetNodeId, node) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const targetIndex = project.nodes.findIndex((projectNode) => projectNode.id === targetNodeId)
  if (targetIndex === -1) throw new Error(`Node ${targetNodeId} was not found.`)

  const targetNode = project.nodes[targetIndex]
  const normalizedNode = createUniqueProjectNode(project, node)
  const targetLevelNodeIds = project.nodes
    .filter((projectNode) => nodesShareLevel(projectNode, targetNode))
    .map((projectNode) => projectNode.id)
  const targetLevelIdSet = new Set(targetLevelNodeIds)
  const previousBelowCardIds = relationIds(targetNode, 'belowCardIds')
  const previousBelowIdSet = new Set(previousBelowCardIds)
  const nodeBelow = {
    ...normalizedNode,
    relations: {
      ...normalizedNode.relations,
      aboveCardIds: targetLevelNodeIds,
      belowCardIds: previousBelowCardIds,
    },
  }
  const nodes = project.nodes.map((projectNode) => {
    if (targetLevelIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          belowCardIds: [nodeBelow.id],
        },
      }
    }

    if (previousBelowIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          aboveCardIds: [nodeBelow.id],
        },
      }
    }

    return projectNode
  })
  const targetLevelIndexes = nodes
    .map((projectNode, index) => (targetLevelIdSet.has(projectNode.id) ? index : -1))
    .filter((index) => index !== -1)
  const insertionIndex = Math.max(...targetLevelIndexes) + 1
  nodes.splice(insertionIndex, 0, nodeBelow)

  return saveNodes(project, nodes)
}

export function addProjectNodeRight(projectId, targetNodeId, node) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const targetIndex = project.nodes.findIndex((projectNode) => projectNode.id === targetNodeId)
  if (targetIndex === -1) throw new Error(`Node ${targetNodeId} was not found.`)

  const targetNode = project.nodes[targetIndex]
  const normalizedNode = createUniqueProjectNode(project, node)
  const aboveCardIds = relationIds(targetNode, 'aboveCardIds')
  const belowCardIds = relationIds(targetNode, 'belowCardIds')
  const nodeToRight = {
    ...normalizedNode,
    relations: {
      ...normalizedNode.relations,
      aboveCardIds,
      belowCardIds,
    },
  }
  const aboveIdSet = new Set(aboveCardIds)
  const belowIdSet = new Set(belowCardIds)
  const nodes = project.nodes.map((projectNode) => {
    if (aboveIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          belowCardIds: uniqueIds([
            ...relationIds(projectNode, 'belowCardIds'),
            nodeToRight.id,
          ]),
        },
      }
    }

    if (belowIdSet.has(projectNode.id)) {
      return {
        ...projectNode,
        relations: {
          ...projectNode.relations,
          aboveCardIds: uniqueIds([
            ...relationIds(projectNode, 'aboveCardIds'),
            nodeToRight.id,
          ]),
        },
      }
    }

    return projectNode
  })
  nodes.splice(targetIndex + 1, 0, nodeToRight)

  return saveNodes(project, nodes)
}

export function deleteProjectNode(projectId, nodeId) {
  const project = getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} was not found.`)

  const nodeToDelete = project.nodes.find((projectNode) => projectNode.id === nodeId)
  if (!nodeToDelete) throw new Error(`Node ${nodeId} was not found.`)

  const remainingNodes = project.nodes.filter((projectNode) => projectNode.id !== nodeId)
  const hasSameLevelSibling = remainingNodes.some((projectNode) =>
    nodesShareLevel(projectNode, nodeToDelete),
  )
  const deletedAboveCardIds = relationIds(nodeToDelete, 'aboveCardIds')
  const deletedBelowCardIds = relationIds(nodeToDelete, 'belowCardIds')
  const nodes = remainingNodes.map((projectNode) => {
    const aboveCardIds = relationIds(projectNode, 'aboveCardIds')
    const belowCardIds = relationIds(projectNode, 'belowCardIds')
    const updatedAboveCardIds = hasSameLevelSibling
      ? aboveCardIds.filter((id) => id !== nodeId)
      : uniqueIds(
          aboveCardIds.flatMap((id) => (id === nodeId ? deletedAboveCardIds : [id])),
        )
    const updatedBelowCardIds = hasSameLevelSibling
      ? belowCardIds.filter((id) => id !== nodeId)
      : uniqueIds(
          belowCardIds.flatMap((id) => (id === nodeId ? deletedBelowCardIds : [id])),
        )

    if (
      sameIds(aboveCardIds, updatedAboveCardIds) &&
      sameIds(belowCardIds, updatedBelowCardIds)
    ) {
      return projectNode
    }

    return {
      ...projectNode,
      relations: {
        ...projectNode.relations,
        aboveCardIds: updatedAboveCardIds,
        belowCardIds: updatedBelowCardIds,
      },
    }
  })

  return saveNodes(project, nodes)
}
