import dagre from '@dagrejs/dagre'

export function applyDagreLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, nodesep: 80, ranksep: 140, marginx: 60, marginy: 60 })

  nodes.forEach((node) => {
    const el = document.querySelector(`[data-id="${node.id}"]`)
    const w = (el?.offsetWidth  ?? 220) + 20
    const h = (el?.offsetHeight ?? 100) + 20
    g.setNode(node.id, { width: w, height: h })
  })

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map((node) => {
    const n = g.node(node.id)
    return {
      ...node,
      position: { x: n.x - n.width / 2, y: n.y - n.height / 2 },
    }
  })
}
