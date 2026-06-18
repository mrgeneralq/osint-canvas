import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { NODE_TYPE_CONFIG } from '../config/nodeTypes'
import { findShortestPath, getEdgesOnPath } from '../utils/graphUtils'
import { toast } from './toastStore'

let nodeCounter = 1
const MAX_HISTORY = 60

function makeNode(type, position) {
  const cfg = NODE_TYPE_CONFIG[type]
  return {
    id: `node_${nodeCounter++}`,
    type: 'osint',
    position,
    data: {
      nodeType: type,
      label: cfg?.label ?? type,
      value: '',
      note: '',
      imageUrl: '',
      confidence: 'unverified',
      sourceUrl: '',
      dateAdded: new Date().toISOString().slice(0, 10),
      tags: '',
      locked: false,
      sourceIds: [],
    },
  }
}

function snapshot(nodes, edges) {
  return { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }
}

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  searchTerm: '',
  highlightNodeIds: null,
  highlightEdgeIds: null,
  pathPickMode: false,
  pathPickFirst: null,
  history: [],
  historyIndex: -1,
  snapshots: JSON.parse(localStorage.getItem('osint-snapshots') ?? '[]'),
  caseInfo: { name: 'Untitled Case', investigator: '', status: 'Active', description: '' },
  sources: [],
  filterSourceId: null,

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    get()._pushHistory()
    set({ edges: addEdge({ ...connection, type: 'osint', data: { label: '', relationshipType: 'default' } }, get().edges) })
  },

  onNodeDragStop: () => get()._pushHistory(),

  _pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const trimmed = history.slice(0, historyIndex + 1)
    const next = [...trimmed, snapshot(nodes, edges)].slice(-MAX_HISTORY)
    set({ history: next, historyIndex: next.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1 })
    toast.info('Undone')
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1 })
    toast.info('Redone')
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addNode: (type, position) => {
    get()._pushHistory()
    const node = makeNode(type, position)
    set({ nodes: [...get().nodes, node], selectedNodeId: node.id })
    return node.id
  },

  updateNodeData: (id, patch) =>
    set({ nodes: get().nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n) }),

  addConnectedNode: (sourceId, nodeType, edgeRelationshipType = 'leads_to') => {
    get()._pushHistory()
    const src = get().nodes.find((n) => n.id === sourceId)
    const pos = src ? { x: src.position.x + 280, y: src.position.y } : { x: 400, y: 400 }
    const newNode = makeNode(nodeType, pos)
    const newEdge = {
      id: `edge_${Date.now()}`,
      source: sourceId,
      target: newNode.id,
      type: 'osint',
      data: { label: '', relationshipType: edgeRelationshipType },
    }
    set({ nodes: [...get().nodes, newNode], edges: [...get().edges, newEdge], selectedNodeId: newNode.id })
    return newNode.id
  },

  toggleNodeLock: (id) => {
    const n = get().nodes.find((n) => n.id === id)
    if (!n) return
    const locked = !n.data.locked
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, draggable: !locked, data: { ...node.data, locked } } : node
      ),
    })
    toast.info(locked ? 'Node locked' : 'Node unlocked')
  },

  deleteNode: (id) => {
    get()._pushHistory()
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    })
  },

  duplicateNode: (id) => {
    get()._pushHistory()
    const src = get().nodes.find((n) => n.id === id)
    if (!src) return
    const node = { ...src, id: `node_${nodeCounter++}`, position: { x: src.position.x + 30, y: src.position.y + 30 }, selected: false }
    set({ nodes: [...get().nodes, node], selectedNodeId: node.id })
    toast.success('Node duplicated')
  },

  setNodes: (nodes) => set({ nodes }),

  // ── sources ──────────────────────────────────────────────────────────────
  addSource: (source) => {
    const s = { id: `src_${Date.now()}`, color: '#7c8cf8', ...source, createdAt: new Date().toISOString() }
    set({ sources: [...get().sources, s] })
    toast.success('Source added')
    return s.id
  },
  updateSource: (id, patch) =>
    set({ sources: get().sources.map((s) => s.id === id ? { ...s, ...patch } : s) }),
  deleteSource: (id) => {
    set({
      sources: get().sources.filter((s) => s.id !== id),
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, sourceIds: (n.data.sourceIds ?? []).filter((sid) => sid !== id) },
      })),
      filterSourceId: get().filterSourceId === id ? null : get().filterSourceId,
    })
    toast.info('Source removed')
  },
  setFilterSource: (id) => set({ filterSourceId: id }),

  updateEdgeData: (id, patch) =>
    set({ edges: get().edges.map((e) => e.id === id ? { ...e, data: { ...e.data, ...patch } } : e) }),

  deleteEdge: (id) => {
    get()._pushHistory()
    set({ edges: get().edges.filter((e) => e.id !== id) })
  },

  setHighlight: (nodeIds, edgeIds) => set({ highlightNodeIds: nodeIds, highlightEdgeIds: edgeIds }),
  clearHighlight: () => set({ highlightNodeIds: null, highlightEdgeIds: null, pathPickMode: false, pathPickFirst: null }),

  startPathPick: () => {
    set({ pathPickMode: true, pathPickFirst: null, highlightNodeIds: null, highlightEdgeIds: null })
    toast.info('Click a starting node, then a destination node')
  },

  pickPathNode: (id) => {
    const { pathPickFirst, nodes, edges } = get()
    if (!pathPickFirst) {
      set({ pathPickFirst: id })
      toast.info('Now click the destination node')
    } else {
      const path = findShortestPath(nodes, edges, pathPickFirst, id)
      if (path && path.length > 1) {
        set({
          highlightNodeIds: new Set(path),
          highlightEdgeIds: getEdgesOnPath(path, edges),
          pathPickMode: false,
          pathPickFirst: null,
        })
        toast.success(`Path found — ${path.length} nodes, ${path.length - 1} steps`)
      } else {
        toast.error('No path found between these nodes')
        set({ pathPickMode: false, pathPickFirst: null })
      }
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),

  saveSnapshot: (name) => {
    const { nodes, edges, caseInfo } = get()
    const snap = { name, savedAt: new Date().toISOString(), nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), caseInfo }
    const snaps = [snap, ...get().snapshots].slice(0, 10)
    localStorage.setItem('osint-snapshots', JSON.stringify(snaps))
    set({ snapshots: snaps })
    toast.success(`Snapshot "${name}" saved`)
  },

  loadSnapshot: (idx) => {
    get()._pushHistory()
    const snap = get().snapshots[idx]
    if (!snap) return
    set({ nodes: snap.nodes, edges: snap.edges, caseInfo: snap.caseInfo ?? get().caseInfo })
    toast.success(`Restored "${snap.name}"`)
  },

  deleteSnapshot: (idx) => {
    const snaps = get().snapshots.filter((_, i) => i !== idx)
    localStorage.setItem('osint-snapshots', JSON.stringify(snaps))
    set({ snapshots: snaps })
  },

  updateCaseInfo: (patch) => set({ caseInfo: { ...get().caseInfo, ...patch } }),

  clearAll: () => {
    get()._pushHistory()
    set({ nodes: [], edges: [], selectedNodeId: null })
    toast.info('Canvas cleared')
  },

  exportJSON: () => {
    const { nodes, edges, caseInfo, sources } = get()
    const blob = new Blob([JSON.stringify({ nodes, edges, caseInfo, sources, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `osint-${(caseInfo.name || 'case').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Case exported as JSON')
  },

  importJSON: (data) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.nodes && parsed.edges) {
        const maxId = parsed.nodes.reduce((m, n) => Math.max(m, parseInt(n.id.replace('node_', '')) || 0), 0)
        nodeCounter = maxId + 1
        get()._pushHistory()
        set({ nodes: parsed.nodes, edges: parsed.edges, caseInfo: parsed.caseInfo ?? get().caseInfo, sources: parsed.sources ?? [], selectedNodeId: null, filterSourceId: null })
        toast.success(`Loaded ${parsed.nodes.length} nodes, ${parsed.edges.length} edges`)
      }
    } catch { toast.error('Invalid JSON file') }
  },
}))

export default useStore
