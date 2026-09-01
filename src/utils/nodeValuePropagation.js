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

/** Finds the unique nodes connected directly above one source node. */
export function findImmediateNodesAbove(project, sourceNodeId) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')

  const nodesById = createNodeIndex(project.nodes)
  const sourceNode = nodesById.get(sourceNodeId)
  if (!sourceNode) throw new Error(`Node ${sourceNodeId} was not found.`)

  const aboveCardIds = sourceNode.relations?.aboveCardIds ?? []
  if (!Array.isArray(aboveCardIds)) {
    throw new Error(`Node ${sourceNodeId}.relations.aboveCardIds must be an array.`)
  }

  return [...new Set(aboveCardIds)].map((nodeId) => {
    if (nodeId === sourceNodeId) {
      throw new Error(`Node ${sourceNodeId} cannot be directly above itself.`)
    }
    const node = nodesById.get(nodeId)
    if (!node) throw new Error(`Related node ${nodeId} was not found.`)
    return node
  })
}

/** Returns the mutable calculation field belonging to either supported card type. */
function getNodeCalculationField(node) {
  if (node.type === 'value') return { field: 'value', value: node.value }
  if (node.type === 'percentage') {
    return { field: 'percentage.value', value: node.percentage?.value }
  }
  throw new Error(`Unsupported target node type: ${node.type}.`)
}

/** Calculates the operand supplied by a Value or Percentage source card. */
function getOperandForTarget(sourceNode, targetValue) {
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
    const percentageBase = isZeroDecimal(referenceValue) ? targetValue : referenceValue

    return calculatePercentageAmount(percentageBase, percentageValue)
  }

  throw new Error(`Unsupported source node type: ${sourceNode.type}.`)
}

/**
 * Applies one scheduled source node only to mutable cards directly above it.
 * Value targets update `value`; Percentage targets update `percentage.value`.
 * All results are calculated first so an error cannot partially mutate the graph.
 */
export function applyNodeToImmediateAboveNodes(project, sourceNodeId) {
  if (!Array.isArray(project?.nodes)) throw new Error('A project with nodes is required.')

  const sourceNode = project.nodes.find((node) => node.id === sourceNodeId)
  if (!sourceNode) throw new Error(`Node ${sourceNodeId} was not found.`)

  const targetNodes = findImmediateNodesAbove(project, sourceNodeId).filter(
    (node) => node.isStatic !== true,
  )
  const updates = targetNodes.map((targetNode) => {
    const targetField = getNodeCalculationField(targetNode)
    const previousValue = normalizeDecimalValue(
      targetField.value,
      `node ${targetNode.id}.${targetField.field}`,
    )
    const operand = getOperandForTarget(sourceNode, previousValue)
    const value = applyDecimalOperation(previousValue, operand, sourceNode.operation)

    return {
      nodeId: targetNode.id,
      nodeType: targetNode.type,
      field: targetField.field,
      previousValue,
      operand,
      operation: sourceNode.operation,
      value,
    }
  })
  const updatesByNodeId = new Map(updates.map((update) => [update.nodeId, update]))
  const nodes = project.nodes.map((node) => {
    const update = updatesByNodeId.get(node.id)
    if (!update) return node
    if (update.field === 'value') return { ...node, value: update.value }
    return {
      ...node,
      percentage: { ...node.percentage, value: update.value },
    }
  })

  return {
    project: { ...project, nodes },
    sourceNodeId,
    updates,
  }
}
