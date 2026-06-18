import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { NODE_TYPE_CONFIG } from '../config/nodeTypes'
import { findShortestPath, getEdgesOnPath } from '../utils/graphUtils'
import { toast } from './toastStore'

let nodeCounter = 1
const MAX_HISTORY = 60
const API = 'http://localhost:3001'

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

function activeCanvas(state) {
  const c = state.canvases.find((c) => c.id === state.activeCanvasId)
  return c ?? state.canvases[0] ?? null
}

const useStore = create((set, get) => ({
  // ── workspace ─────────────────────────────────────────────────────────────
  cases: [],
  activeCaseId: null,
  activeView: 'dashboard', // 'dashboard' | 'canvas' | 'note'
  activeNoteId: null,

  // ── canvas (per active canvas inside active case) ─────────────────────────
  canvases: [],
  activeCanvasId: null,
  notes: [],
  caseInfo: { name: '', investigator: '', status: 'Active', description: '', target: '', tags: '' },

  // ── canvas state ──────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  sources: [],
  selectedNodeId: null,
  searchTerm: '',
  highlightNodeIds: null,
  highlightEdgeIds: null,
  pathPickMode: false,
  pathPickFirst: null,
  history: [],
  historyIndex: -1,
  snapshots: JSON.parse(localStorage.getItem('osint-snapshots') ?? '[]'),
  filterSourceId: null,
  _savePending: false,

  // ── workspace actions ─────────────────────────────────────────────────────
  loadCases: async () => {
    try {
      const res = await fetch(`${API}/cases`)
      const cases = await res.json()
      set({ cases })
    } catch { toast.error('Could not reach server') }
  },

  createCase: async (info = {}) => {
    try {
      const res = await fetch(`${API}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      })
      const caseData = await res.json()
      set((s) => ({ cases: [caseData, ...s.cases] }))
      await get().openCase(caseData.id)
      toast.success(`Case "${caseData.name}" created`)
    } catch { toast.error('Failed to create case') }
  },

  openCase: async (id) => {
    try {
      const res = await fetch(`${API}/cases/${id}`)
      const data = await res.json()
      const canvases = data.canvases ?? []
      const activeCanvasId = data.activeCanvasId ?? canvases[0]?.id ?? null
      const canvas = canvases.find((c) => c.id === activeCanvasId)
      const maxId = (canvas?.nodes ?? []).reduce((m, n) => Math.max(m, parseInt(n.id.replace('node_', '')) || 0), 0)
      nodeCounter = maxId + 1
      set({
        activeCaseId: id,
        activeView: 'canvas',
        canvases,
        activeCanvasId,
        notes: data.notes ?? [],
        caseInfo: {
          name: data.name ?? '',
          investigator: data.investigator ?? '',
          status: data.status ?? 'Active',
          description: data.description ?? '',
          target: data.target ?? '',
          tags: data.tags ?? '',
        },
        nodes: canvas?.nodes ?? [],
        edges: canvas?.edges ?? [],
        sources: canvas?.sources ?? [],
        selectedNodeId: null,
        filterSourceId: null,
        history: [],
        historyIndex: -1,
      })
    } catch { toast.error('Failed to open case') }
  },

  saveCase: async () => {
    const { activeCaseId, canvases, activeCanvasId, nodes, edges, sources, caseInfo } = get()
    if (!activeCaseId) return
    const updatedCanvases = canvases.map((c) =>
      c.id === activeCanvasId ? { ...c, nodes, edges, sources } : c
    )
    try {
      await fetch(`${API}/cases/${activeCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caseInfo, canvases: updatedCanvases, activeCanvasId }),
      })
      set({ canvases: updatedCanvases, _savePending: false })
      toast.success('Case saved')
    } catch { toast.error('Failed to save case') }
  },

  deleteCase: async (id) => {
    try {
      await fetch(`${API}/cases/${id}`, { method: 'DELETE' })
      set((s) => ({
        cases: s.cases.filter((c) => c.id !== id),
        ...(s.activeCaseId === id ? { activeCaseId: null, activeView: 'dashboard' } : {}),
      }))
      toast.info('Case deleted')
    } catch { toast.error('Failed to delete case') }
  },

  closeCase: () => {
    set({
      activeCaseId: null,
      activeView: 'dashboard',
      canvases: [],
      activeCanvasId: null,
      notes: [],
      nodes: [],
      edges: [],
      sources: [],
      selectedNodeId: null,
    })
    get().loadCases()
  },

  setActiveView: (view, noteId = null) => set({ activeView: view, activeNoteId: noteId }),

  // ── canvas management ─────────────────────────────────────────────────────
  addCanvas: () => {
    const { canvases, activeCaseId } = get()
    if (!activeCaseId) return
    const id = `canvas_${Date.now()}`
    const newCanvas = { id, name: `Canvas ${canvases.length + 1}`, nodes: [], edges: [], sources: [] }
    const updated = [...canvases, newCanvas]
    set({ canvases: updated, activeCanvasId: id, nodes: [], edges: [], sources: [], selectedNodeId: null })
    toast.success('New canvas created')
  },

  switchCanvas: (id) => {
    const { canvases, activeCanvasId, nodes, edges, sources } = get()
    if (id === activeCanvasId) return
    // persist current canvas state
    const updatedCanvases = canvases.map((c) =>
      c.id === activeCanvasId ? { ...c, nodes, edges, sources } : c
    )
    const target = updatedCanvases.find((c) => c.id === id)
    if (!target) return
    const maxId = (target.nodes ?? []).reduce((m, n) => Math.max(m, parseInt(n.id.replace('node_', '')) || 0), 0)
    nodeCounter = maxId + 1
    set({
      canvases: updatedCanvases,
      activeCanvasId: id,
      nodes: target.nodes ?? [],
      edges: target.edges ?? [],
      sources: target.sources ?? [],
      selectedNodeId: null,
      filterSourceId: null,
      history: [],
      historyIndex: -1,
    })
  },

  renameCanvas: (id, name) => {
    set({ canvases: get().canvases.map((c) => c.id === id ? { ...c, name } : c) })
  },

  deleteCanvas: (id) => {
    const { canvases, activeCanvasId } = get()
    if (canvases.length <= 1) { toast.error('Cannot delete the last canvas'); return }
    const remaining = canvases.filter((c) => c.id !== id)
    if (activeCanvasId === id) {
      const next = remaining[0]
      set({
        canvases: remaining,
        activeCanvasId: next.id,
        nodes: next.nodes ?? [],
        edges: next.edges ?? [],
        sources: next.sources ?? [],
        selectedNodeId: null,
      })
    } else {
      set({ canvases: remaining })
    }
    toast.info('Canvas deleted')
  },

  // ── note actions ──────────────────────────────────────────────────────────
  createNote: async (title = 'Untitled Note') => {
    const { activeCaseId } = get()
    if (!activeCaseId) return
    try {
      const res = await fetch(`${API}/cases/${activeCaseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const note = await res.json()
      set((s) => ({ notes: [...s.notes, note], activeView: 'note', activeNoteId: note.id }))
    } catch { toast.error('Failed to create note') }
  },

  updateNote: async (id, patch) => {
    const { activeCaseId, notes } = get()
    if (!activeCaseId) return
    const updated = notes.map((n) => n.id === id ? { ...n, ...patch } : n)
    set({ notes: updated })
    try {
      await fetch(`${API}/cases/${activeCaseId}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch { /* silent */ }
  },

  deleteNote: async (id) => {
    const { activeCaseId, activeNoteId } = get()
    if (!activeCaseId) return
    try {
      await fetch(`${API}/cases/${activeCaseId}/notes/${id}`, { method: 'DELETE' })
      set((s) => ({
        notes: s.notes.filter((n) => n.id !== id),
        ...(activeNoteId === id ? { activeView: 'canvas', activeNoteId: null } : {}),
      }))
    } catch { toast.error('Failed to delete note') }
  },

  // ── canvas node/edge actions ───────────────────────────────────────────────
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

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

  // ── sources ───────────────────────────────────────────────────────────────
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

  updateCaseInfo: async (patch) => {
    set({ caseInfo: { ...get().caseInfo, ...patch } })
    const { activeCaseId, caseInfo, canvases, activeCanvasId, nodes, edges, sources } = get()
    if (!activeCaseId) return
    const updatedCanvases = canvases.map((c) =>
      c.id === activeCanvasId ? { ...c, nodes, edges, sources } : c
    )
    try {
      await fetch(`${API}/cases/${activeCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...get().caseInfo, canvases: updatedCanvases, activeCanvasId }),
      })
    } catch { /* silent */ }
  },

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
    toast.success('Canvas exported as JSON')
  },

  importJSON: (data) => {
    try {
      const parsed = JSON.parse(data)
      if (parsed.nodes && parsed.edges) {
        const maxId = parsed.nodes.reduce((m, n) => Math.max(m, parseInt(n.id.replace('node_', '')) || 0), 0)
        nodeCounter = maxId + 1
        get()._pushHistory()
        set({ nodes: parsed.nodes, edges: parsed.edges, sources: parsed.sources ?? [], selectedNodeId: null, filterSourceId: null })
        toast.success(`Loaded ${parsed.nodes.length} nodes, ${parsed.edges.length} edges`)
      }
    } catch { toast.error('Invalid JSON file') }
  },
}))

export default useStore
