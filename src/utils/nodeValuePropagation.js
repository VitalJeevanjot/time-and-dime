import {
  applyDecimalOperation,
  calculatePercentageAmount,
  isZeroDecimal,
  normalizeDecimalValue,
} from './decimalCalculation.js'

/** Builds a validated UUID lookup for the project's nodes. */
function createNodeIndex(nodes) {
  const nodesById = new Map()

  nodes.forEach((node) => {
    if (!node?.id) throw new Error('Every project node must have an ID.')
    if (nodesById.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}.`)
    nodesById.set(node.id, node)
  })

  return nodesById
}

/**
 * Finds every transitive ancestor by following aboveCardIds.
 * The visited set deduplicates horizontal/diamond paths and safely terminates cycles.
 */
export function findNodesAbove(project, sourceNodeId) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')

  const nodesById = createNodeIndex(project.nodes)
  const sourceNode = nodesById.get(sourceNodeId)
  if (!sourceNode) throw new Error(`Node ${sourceNodeId} was not found.`)

  const visitedNodeIds = new Set([sourceNodeId])
  const pendingNodeIds = [...(sourceNode.relations?.aboveCardIds ?? [])]
  const nodesAbove = []
  let pendingIndex = 0

  while (pendingIndex < pendingNodeIds.length) {
    const nodeId = pendingNodeIds[pendingIndex]
    pendingIndex += 1

    if (visitedNodeIds.has(nodeId)) continue
    visitedNodeIds.add(nodeId)

    const node = nodesById.get(nodeId)
    if (!node) throw new Error(`Related node ${nodeId} was not found.`)

    nodesAbove.push(node)
    pendingNodeIds.push(...(node.relations?.aboveCardIds ?? []))
  }

  return nodesAbove
}

/** Calculates the operand supplied by a Value or Percentage source card. */
function getOperandForTarget(sourceNode, targetNode) {
  if (sourceNode.type === 'value') {
    return normalizeDecimalValue(sourceNode.value, `node ${sourceNode.id}.value`)
  }

  if (sourceNode.type === 'percentage') {
    const percentageValue = normalizeDecimalValue(
      sourceNode.percentage?.value,
      `node ${sourceNode.id}.percentage.value`,
    )
    const referenceValue = normalizeDecimalValue(
      sourceNode.referenceValue ?? '0',
      `node ${sourceNode.id}.referenceValue`,
    )
    const percentageBase = isZeroDecimal(referenceValue) ? targetNode.value : referenceValue

    return calculatePercentageAmount(percentageBase, percentageValue)
  }

  throw new Error(`Unsupported source node type: ${sourceNode.type}.`)
}

/**
 * Applies one scheduled source node to every mutable Value node above it.
 * Static Value nodes are skipped but remain part of the traversal path.
 * All results are calculated first so an error cannot partially mutate the graph.
 */
export function applyNodeToAboveValueNodes(project, sourceNodeId) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')

  const sourceNode = project.nodes.find((node) => node.id === sourceNodeId)
  if (!sourceNode) throw new Error(`Node ${sourceNodeId} was not found.`)

  const targetNodes = findNodesAbove(project, sourceNodeId).filter(
    (node) => node.type === 'value' && node.isStatic !== true,
  )
  const updates = targetNodes.map((targetNode) => {
    const previousValue = normalizeDecimalValue(
      targetNode.value,
      `node ${targetNode.id}.value`,
    )
    const operand = getOperandForTarget(sourceNode, targetNode)
    const value = applyDecimalOperation(previousValue, operand, sourceNode.operation)

    return {
      nodeId: targetNode.id,
      previousValue,
      operand,
      operation: sourceNode.operation,
      value,
    }
  })
  const updatesByNodeId = new Map(updates.map((update) => [update.nodeId, update]))
  const nodes = project.nodes.map((node) => {
    const update = updatesByNodeId.get(node.id)
    return update ? { ...node, value: update.value } : node
  })

  return {
    project: { ...project, nodes },
    sourceNodeId,
    updates,
  }
}
