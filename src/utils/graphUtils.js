// BFS shortest path between two node IDs
export function findShortestPath(nodes, edges, fromId, toId) {
  if (fromId === toId) return [fromId]
  const adj = {}
  nodes.forEach((n) => { adj[n.id] = [] })
  edges.forEach((e) => {
    adj[e.source]?.push(e.target)
    adj[e.target]?.push(e.source)
  })
  const visited = new Set([fromId])
  const queue = [[fromId]]
  while (queue.length) {
    const path = queue.shift()
    const node = path[path.length - 1]
    for (const neighbor of (adj[node] ?? [])) {
      if (neighbor === toId) return [...path, neighbor]
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  return null // no path
}

// Get all node IDs directly connected to a given node (1 hop)
export function getConnectedIds(nodeId, edges) {
  const ids = new Set([nodeId])
  edges.forEach((e) => {
    if (e.source === nodeId) ids.add(e.target)
    if (e.target === nodeId) ids.add(e.source)
  })
  return ids
}

// Get edge IDs that are part of a path
export function getEdgesOnPath(path, edges) {
  const edgeIds = new Set()
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    edges.forEach((e) => {
      if ((e.source === a && e.target === b) || (e.source === b && e.target === a))
        edgeIds.add(e.id)
    })
  }
  return edgeIds
}

// Case stats
export function computeStats(nodes, edges) {
  const byType = {}
  const byConfidence = { confirmed: 0, probable: 0, unverified: 0 }
  nodes.forEach((n) => {
    byType[n.data.nodeType] = (byType[n.data.nodeType] ?? 0) + 1
    const c = n.data.confidence ?? 'unverified'
    byConfidence[c] = (byConfidence[c] ?? 0) + 1
  })
  const orphans = nodes.filter(
    (n) => !edges.some((e) => e.source === n.id || e.target === n.id)
  ).length
  return { total: nodes.length, edges: edges.length, byConfidence, orphans }
}
