import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  BackgroundVariant, useReactFlow, SelectionMode,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'

import useStore from '../../store/useStore'
import { toast } from '../../store/toastStore'
import OsintNode from '../nodes/OsintNode'
import OsintEdge from '../nodes/OsintEdge'
import ContextMenu from '../ContextMenu'
import { NODE_TYPE_CONFIG, PALETTE_GROUPS } from '../../config/nodeTypes'
import { EDGE_RELATIONSHIP_TYPES, EDGE_REL_GROUPS, EDGE_CONFIDENCE, suggestedRelationships } from '../../config/edgeTypes'
import { applyDagreLayout } from '../../utils/autoLayout'
import styles from './Canvas.module.css'

const nodeTypes = { osint: OsintNode }
const edgeTypes = { osint: OsintEdge }
const defaultEdgeOptions = { type: 'osint', data: { label: '', relationshipType: 'default' } }

export default function Canvas({ exportRef }) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect, onNodeDragStop,
    addNode, setSelectedNodeId, setSelectedEdgeId, updateNodeData, setNodes,
    searchTerm, highlightNodeIds, highlightEdgeIds,
    pathPickMode, pathPickFirst, clearHighlight,
    undo, redo, filterSourceId, deleteNode,
  } = useStore()

  const selectedCount = nodes.filter((n) => n.selected).length

  const { screenToFlowPosition, fitView } = useReactFlow()
  const [ctxMenu, setCtxMenu] = useState(null)
  const [quickAdd, setQuickAdd] = useState(null) // { screenX, screenY, flowX, flowY, sourceNodeId? }
  const [edgePicker, setEdgePicker] = useState(null) // { screenX, screenY, edgeId }
  const connectingFrom = useRef(null) // nodeId being dragged from
  const suppressNextPaneClick = useRef(false)
  const dragMoveCleanup = useRef(null)
  const [ghostPos, setGhostPos] = useState(null) // { x, y } screen coords while dragging edge

  // Expose fns to parent via ref object
  useEffect(() => {
    if (!exportRef) return
    exportRef.current = handleExportPng
    exportRef.autoLayout = handleAutoLayout
  })

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport')
    if (!el) return

    // Blank external images before capture to avoid CORS canvas taint.
    // data: URIs (user-uploaded photos) are preserved.
    const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    const externalImgs = [...el.querySelectorAll('img')].filter(
      (img) => img.src && !img.src.startsWith('data:')
    )
    const origSrcs = externalImgs.map((img) => img.src)
    externalImgs.forEach((img) => { img.src = BLANK })

    try {
      await new Promise((r) => setTimeout(r, 30)) // let DOM settle
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 3, backgroundColor: '#0f1117' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `osint-canvas-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      toast.success('Canvas exported as PNG')
    } catch (err) {
      console.error('PNG export error:', err)
      toast.error(`PNG export failed: ${err?.message ?? err}`)
    } finally {
      externalImgs.forEach((img, i) => { img.src = origSrcs[i] })
    }
  }, [])

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) { toast.warn('No nodes to layout'); return }
    const laid = applyDagreLayout(nodes, edges)
    setNodes(laid)
    setTimeout(() => fitView({ padding: 0.2 }), 50)
    toast.success('Auto layout applied')
  }, [nodes, edges, setNodes, fitView])

  // Ctrl+V paste image
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = Array.from(e.clipboardData?.items ?? [])
      const imgItem = items.find((i) => i.type.startsWith('image/'))
      if (!imgItem) return
      const file = imgItem.getAsFile()
      const reader = new FileReader()
      reader.onload = (ev) => {
        const pos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
        const id = addNode('image', { x: pos.x - 110, y: pos.y - 60 })
        setTimeout(() => updateNodeData(id, { imageUrl: ev.target.result, value: 'Pasted image' }), 30)
        toast.success('Image pasted as node')
      }
      reader.readAsDataURL(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [screenToFlowPosition, addNode, updateNodeData])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
      if (e.key === 'Escape') { clearHighlight(); setCtxMenu(null); setQuickAdd(null) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        useStore.setState({ nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })) })
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [undo, redo, clearHighlight])

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/osint-node-type')
    if (!type) return
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type, { x: pos.x - 100, y: pos.y - 40 })
  }, [screenToFlowPosition, addNode])

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdgeId(edge.id)
    setEdgePicker({ screenX: event.clientX, screenY: event.clientY, edgeId: edge.id })
  }, [setSelectedEdgeId])

  const onNodeClick = useCallback((_, node) => {
    if (pathPickMode) { useStore.getState().pickPathNode(node.id); return }
    setSelectedNodeId(node.id)
    setCtxMenu(null)
  }, [setSelectedNodeId, pathPickMode])

  const onNodeContextMenu = useCallback((e, node) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id })
  }, [])

  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingFrom.current = nodeId
    const handler = (e) => setGhostPos({ x: e.clientX, y: e.clientY })
    document.addEventListener('mousemove', handler)
    dragMoveCleanup.current = () => {
      document.removeEventListener('mousemove', handler)
      setGhostPos(null)
    }
  }, [])

  const onConnectEnd = useCallback((event, connectionState) => {
    dragMoveCleanup.current?.()
    dragMoveCleanup.current = null
    const sourceNodeId = connectingFrom.current
    connectingFrom.current = null
    if (connectionState?.isValid || !sourceNodeId) return
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY
    if (clientX == null) return
    const pos = screenToFlowPosition({ x: clientX, y: clientY })
    suppressNextPaneClick.current = true
    setQuickAdd({ screenX: clientX, screenY: clientY, flowX: pos.x, flowY: pos.y, sourceNodeId })
  }, [screenToFlowPosition])

  const onPaneClick = useCallback(() => {
    if (suppressNextPaneClick.current) { suppressNextPaneClick.current = false; return }
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setCtxMenu(null)
    setQuickAdd(null)
    setEdgePicker(null)
  }, [setSelectedNodeId, setSelectedEdgeId])

  const wrapRef = useRef()
  useEffect(() => {
    // Attach to the pane directly via native event to avoid React Flow eating the dblclick
    const pane = wrapRef.current?.querySelector('.react-flow__pane')
    if (!pane) return
    const handler = (e) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setQuickAdd({ screenX: e.clientX, screenY: e.clientY, flowX: pos.x, flowY: pos.y })
    }
    pane.addEventListener('dblclick', handler)
    return () => pane.removeEventListener('dblclick', handler)
  }, [screenToFlowPosition])

  const minimapColor = useCallback((node) => NODE_TYPE_CONFIG[node.data?.nodeType]?.color ?? '#1e2235', [])

  const visibleNodes = nodes.map((n) => {
    let opacity = 1
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      const match = [n.data.value, n.data.note, n.data.tags, n.data.label, n.data.sourceUrl].some((f) => f?.toLowerCase().includes(t))
      if (!match) opacity = 0.1
    }
    if (highlightNodeIds && !highlightNodeIds.has(n.id)) opacity = Math.min(opacity, 0.1)
    const nodeSourceIds = n.data.sourceIds ?? []
    if (filterSourceId && nodeSourceIds.length > 0 && !nodeSourceIds.includes(filterSourceId)) opacity = Math.min(opacity, 0.1)
    return { ...n, style: { ...n.style, opacity } }
  })

  const visibleEdges = edges.map((e) => ({
    ...e,
    style: { ...e.style, opacity: highlightEdgeIds ? (highlightEdgeIds.has(e.id) ? 1 : 0.06) : 1 },
  }))

  return (
    <div className={styles.canvasWrap} ref={wrapRef}>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker id="arrow-default" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--border-strong)" />
          </marker>
          <marker id="arrow-selected" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--accent)" />
          </marker>
        </defs>
      </svg>

      {/* Path finder banner */}
      {pathPickMode && (
        <div className={styles.pathBanner}>
          <span className={styles.pathIcon}>↔</span>
          {pathPickFirst ? 'Now click the destination node' : 'Click the starting node'}
          <button onClick={clearHighlight}>Cancel</button>
        </div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && !pathPickMode && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h2 className={styles.emptyTitle}>Start your investigation</h2>
          <p className={styles.emptyHint}>Drag any node type from the left panel onto the canvas</p>
          <div className={styles.emptyTips}>
            <Tip icon="✌" text="Double-click anywhere on the canvas to add a node" />
            <Tip icon="🔗" text="Drag the ◉ handle on a node to connect it to another" />
            <Tip icon="🖱" text="Right-click any node for quick actions and lookups" />
            <Tip icon="⌨" text="Press ? to see all keyboard shortcuts" />
          </div>
        </div>
      )}

      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}

        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode="Delete"
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        connectionRadius={50}
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#2d3148" />
        <Controls />
        <MiniMap nodeColor={minimapColor} maskColor="rgba(15,17,23,0.75)"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }} />
      </ReactFlow>

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} nodeId={ctxMenu.nodeId} onClose={() => setCtxMenu(null)} />
      )}

      {selectedCount > 1 && (
        <SelectionBar
          count={selectedCount}
          onFit={() => fitView({ nodes: nodes.filter((n) => n.selected), padding: 0.3, duration: 300 })}
          onDelete={() => {
            const ids = nodes.filter((n) => n.selected).map((n) => n.id)
            ids.forEach((id) => deleteNode(id))
          }}
        />
      )}

      {edgePicker && (
        <EdgePickerMenu
          screenX={edgePicker.screenX}
          screenY={edgePicker.screenY}
          edgeId={edgePicker.edgeId}
          onClose={() => setEdgePicker(null)}
        />
      )}

      {ghostPos && (
        <div className={styles.ghostNode} style={{ left: ghostPos.x, top: ghostPos.y }}>
          <div className={styles.ghostNodeInner}>+</div>
        </div>
      )}

      {quickAdd && (
        <QuickAddMenu
          screenX={quickAdd.screenX}
          screenY={quickAdd.screenY}
          sourceNodeId={quickAdd.sourceNodeId}
          onSelect={(type) => {
            if (quickAdd.sourceNodeId) {
              useStore.getState().addConnectedNode(quickAdd.sourceNodeId, type)
            } else {
              addNode(type, { x: quickAdd.flowX - 110, y: quickAdd.flowY - 50 })
            }
            setQuickAdd(null)
          }}
          onClose={() => setQuickAdd(null)}
        />
      )}
    </div>
  )
}

function QuickAddMenu({ screenX, screenY, sourceNodeId, onSelect, onClose }) {
  const ref = useRef()
  const inputRef = useRef()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => { inputRef.current?.focus() }, [])

  const W = 280, H = 380
  const left = Math.min(screenX, window.innerWidth - W - 12)
  const top  = Math.min(screenY, window.innerHeight - H - 12)

  const q = search.toLowerCase()
  const allEntries = Object.entries(NODE_TYPE_CONFIG)
  const filtered = q ? allEntries.filter(([type, cfg]) => cfg.label.toLowerCase().includes(q) || type.includes(q)) : null
  const groups = PALETTE_GROUPS.map((group) => ({
    group,
    items: (filtered ?? allEntries).filter(([, cfg]) => cfg.group === group),
  })).filter(({ items }) => items.length > 0)

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
    // Enter selects first visible result
    if (e.key === 'Enter' && groups[0]?.items[0]) onSelect(groups[0].items[0][0])
  }

  return (
    <div ref={ref} style={{
      position: 'fixed', left, top, zIndex: 500, width: W,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-mid)',
      borderRadius: 12,
      boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Context label when connecting */}
      {sourceNodeId && (
        <div style={{ padding: '7px 12px 0', fontSize: 10, color: 'var(--text-dimmed)', letterSpacing: '0.3px' }}>
          🔗 Connect to…
        </div>
      )}
      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--text-dimmed)' }}>🔍</span>
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search node types…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
          }}
        />
        <kbd style={{ fontSize: 9, color: 'var(--text-dimmed)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '2px 5px' }}>esc</kbd>
      </div>

      {/* Results */}
      <div style={{ overflowY: 'auto', maxHeight: H - 50, padding: '6px 8px 10px' }}>
        {groups.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dimmed)', fontSize: 12, padding: '20px 0' }}>No node types match "{search}"</div>
        )}
        {groups.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-dimmed)', padding: '6px 4px 4px' }}>{group}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {items.map(([type, cfg], i) => (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  title={cfg.label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 4px 7px',
                    background: cfg.color,
                    border: `1px solid ${search && i === 0 && groups[0].group === group ? 'var(--accent)' : cfg.border}`,
                    borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'transform 0.1s, border-color 0.12s, box-shadow 0.12s',
                    boxShadow: search && i === 0 && groups[0].group === group ? '0 0 0 2px rgba(124,140,248,0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = cfg.border; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.2 }}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border-subtle)', fontSize: 9, color: 'var(--text-dimmed)', display: 'flex', gap: 10 }}>
        <span><kbd style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 4px', fontSize: 9 }}>Enter</kbd> first result</span>
        <span><kbd style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 4px', fontSize: 9 }}>Esc</kbd> close</span>
      </div>
    </div>
  )
}

const CONF_ORDER = ['unverified', 'suspected', 'probable', 'confirmed']
const CONF_COLORS = { unverified: '#4b5563', suspected: '#94a3b8', probable: '#f59e0b', confirmed: '#22c55e' }
const DIR_CYCLE = { 'one-way': 'bidirectional', 'bidirectional': 'none', 'none': 'one-way' }
const DIR_ICONS = { 'one-way': '→', 'bidirectional': '↔', 'none': '—' }

function EdgePickerMenu({ screenX, screenY, edgeId, onClose }) {
  const ref = useRef()
  const customRef = useRef()
  const [showAll, setShowAll] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const edges = useStore((s) => s.edges)
  const nodes = useStore((s) => s.nodes)
  const updateEdgeData = useStore((s) => s.updateEdgeData)
  const deleteEdge = useStore((s) => s.deleteEdge)
  const setSelectedEdgeId = useStore((s) => s.setSelectedEdgeId)

  const edge = edges.find((e) => e.id === edgeId)
  const srcNode = nodes.find((n) => n.id === edge?.source)
  const tgtNode = nodes.find((n) => n.id === edge?.target)
  const currentType = edge?.data?.relationshipType ?? 'default'
  const currentConf = edge?.data?.confidence ?? 'probable'
  const currentDir = edge?.data?.direction ?? (EDGE_RELATIONSHIP_TYPES[currentType]?.bidirectional ? 'bidirectional' : 'one-way')

  const suggestions = suggestedRelationships(srcNode?.data?.nodeType, tgtNode?.data?.nodeType)
  const hasSuggestions = suggestions && suggestions.length > 0

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const W = 260
  const left = Math.min(screenX + 12, window.innerWidth - W - 12)
  const top  = Math.min(screenY - 20, window.innerHeight - 520)

  if (!edge) return null

  const nextConf = CONF_ORDER[(CONF_ORDER.indexOf(currentConf) + 1) % CONF_ORDER.length]
  const nextDir  = DIR_CYCLE[currentDir]

  const applyType = (key) => {
    updateEdgeData(edgeId, { relationshipType: key, label: '' })
    onClose()
  }

  const applyCustom = () => {
    const val = customLabel.trim()
    if (!val) return
    updateEdgeData(edgeId, { label: val, relationshipType: 'default' })
    onClose()
  }

  const TypeChip = ({ typeKey }) => {
    const cfg = EDGE_RELATIONSHIP_TYPES[typeKey]
    if (!cfg) return null
    const active = currentType === typeKey && !edge.data?.label
    return (
      <button onClick={() => applyType(typeKey)} style={{
        background: active ? cfg.color : 'var(--bg-elevated)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? cfg.color : 'var(--border-subtle)'}`,
        borderRadius: 10, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        fontWeight: active ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: 5,
      }}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.color = cfg.color } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
      >
        {cfg.dash && <span style={{ fontSize: 8, opacity: 0.6 }}>╌</span>}
        {cfg.label}
      </button>
    )
  }

  return (
    <div ref={ref} style={{
      position: 'fixed', left, top, zIndex: 500, width: W,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-mid)',
      borderRadius: 12,
      boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontSize: 12,
    }}>
      {/* Header */}
      <div style={{ padding: '9px 12px 7px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dimmed)' }}>Relationship</span>
        <button onClick={() => updateEdgeData(edgeId, { confidence: nextConf })} style={{
          background: 'none', border: `1px solid ${CONF_COLORS[currentConf]}`,
          color: CONF_COLORS[currentConf], borderRadius: 4, padding: '2px 7px',
          fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }} title={`Confidence: ${currentConf} — click to cycle`}>
          {EDGE_CONFIDENCE[currentConf]?.label}
        </button>
        <button onClick={() => updateEdgeData(edgeId, { direction: nextDir })} style={{
          background: 'none', border: '1px solid var(--border-mid)',
          color: 'var(--text-secondary)', borderRadius: 4, padding: '2px 7px',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }} title={`Direction: ${currentDir} — click to cycle`}>
          {DIR_ICONS[currentDir]}
        </button>
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 340, padding: '8px 10px 4px' }}>
        {/* Suggested section */}
        {hasSuggestions && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', padding: '0 2px 5px' }}>Suggested</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {suggestions.map((key) => <TypeChip key={key} typeKey={key} />)}
            </div>
          </div>
        )}

        {/* All types — collapsed by default when suggestions exist */}
        {(!hasSuggestions || showAll) ? (
          EDGE_REL_GROUPS.map((group) => {
            const entries = Object.entries(EDGE_RELATIONSHIP_TYPES).filter(([, cfg]) => cfg.group === group)
            return (
              <div key={group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-dimmed)', padding: '2px 2px 4px' }}>{group}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {entries.map(([key]) => <TypeChip key={key} typeKey={key} />)}
                </div>
              </div>
            )
          })
        ) : (
          <button onClick={() => setShowAll(true)} style={{
            background: 'none', border: '1px dashed var(--border-subtle)',
            borderRadius: 8, padding: '5px 0', width: '100%', fontSize: 11,
            color: 'var(--text-dimmed)', cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: 8,
          }}>Show all types ▾</button>
        )}

        {/* Custom label */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8, marginTop: 2 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-dimmed)', marginBottom: 5 }}>Custom label</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              ref={customRef}
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyCustom(); if (e.key === 'Escape') onClose() }}
              placeholder="e.g. paid, reported to…"
              style={{
                flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 6, padding: '5px 8px', fontSize: 11, color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
            <button onClick={applyCustom} disabled={!customLabel.trim()} style={{
              background: customLabel.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
              border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11,
              color: customLabel.trim() ? '#fff' : 'var(--text-dimmed)',
              cursor: customLabel.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>Set</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 10px 9px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 6 }}>
        <button onClick={() => { deleteEdge(edgeId); setSelectedEdgeId(null); onClose() }} style={{
          flex: 1, background: 'none', border: '1px solid var(--border-subtle)',
          borderRadius: 6, padding: '5px', fontSize: 11, cursor: 'pointer',
          color: '#f87171', fontFamily: 'inherit',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >Delete</button>
        <button onClick={onClose} style={{
          flex: 1, background: 'none', border: '1px solid var(--border-subtle)',
          borderRadius: 6, padding: '5px', fontSize: 11, cursor: 'pointer',
          color: 'var(--text-secondary)', fontFamily: 'inherit',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >Close</button>
      </div>
    </div>
  )
}

function SelectionBar({ count, onFit, onDelete }) {
  return (
    <div style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 400, display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg-surface)', border: '1px solid var(--border-mid)',
      borderRadius: 10, padding: '7px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontSize: 12, color: 'var(--text-secondary)',
      userSelect: 'none',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{count}</span>
      <span>nodes selected</span>
      <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
      <button onClick={onFit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, padding: '2px 6px', borderRadius: 5, fontFamily: 'inherit' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >Fit view</button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 11, padding: '2px 6px', borderRadius: 5, fontFamily: 'inherit' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >Delete all</button>
    </div>
  )
}

function Tip({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{text}
    </div>
  )
}
