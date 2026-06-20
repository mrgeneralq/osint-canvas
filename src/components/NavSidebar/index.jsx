import { useState, useRef, useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG, PALETTE_GROUPS } from '../../config/nodeTypes'
import styles from './NavSidebar.module.css'

const STATUS_COLORS = { Active: '#4ade80', Pending: '#facc15', Cold: '#60a5fa', Closed: '#6b7280' }

function NodeGrid({ onAdd }) {
  const addNode = useStore((s) => s.addNode)
  let rf = null
  try { rf = useReactFlow() } catch {}

  const onDragStart = (e, type) => {
    e.dataTransfer.setData('application/osint-node-type', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (type) => {
    if (rf) {
      const vp = rf.getViewport()
      const cx = (window.innerWidth / 2 - vp.x) / vp.zoom
      const cy = (window.innerHeight / 2 - vp.y) / vp.zoom
      addNode(type, { x: cx - 110, y: cy - 50 })
    } else {
      addNode(type)
    }
  }

  return (
    <div className={styles.nodeGrid}>
      {PALETTE_GROUPS.map((group) => {
        const items = Object.entries(NODE_TYPE_CONFIG).filter(([, cfg]) => cfg.group === group)
        return (
          <div key={group} className={styles.nodeGroup}>
            <span className={styles.nodeGroupLabel}>{group}</span>
            <div className={styles.nodeRow}>
              {items.map(([type, cfg]) => (
                <div
                  key={type}
                  className={styles.nodeTile}
                  style={{ background: cfg.color, border: `1px solid ${cfg.border}` }}
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  onClick={() => handleClick(type)}
                  title={cfg.label}
                >
                  <span className={styles.nodeTileIcon}>{cfg.icon}</span>
                  <span className={styles.nodeTileLabel}>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AnalyticsSection() {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const setHighlight = useStore((s) => s.setHighlight)
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId)

  const stats = useMemo(() => {
    const degree = {}
    for (const n of nodes) degree[n.id] = 0
    for (const e of edges) {
      if (degree[e.source] !== undefined) degree[e.source]++
      if (degree[e.target] !== undefined) degree[e.target]++
    }
    const sorted = nodes.map((n) => ({ node: n, deg: degree[n.id] ?? 0 })).sort((a, b) => b.deg - a.deg)
    const isolated = sorted.filter((x) => x.deg === 0)
    return { sorted, isolated }
  }, [nodes, edges])

  const highlight = (nodeId) => {
    setSelectedNodeId(nodeId)
    const connEdges = new Set(edges.filter((e) => e.source === nodeId || e.target === nodeId).map((e) => e.id))
    setHighlight(new Set([nodeId]), connEdges)
  }

  if (nodes.length === 0) return null

  return (
    <div className={styles.analyticsWrap}>
      <div className={styles.analyticsTitle}>Top connections</div>
      {stats.sorted.slice(0, 6).map(({ node, deg }) => {
        const cfg = NODE_TYPE_CONFIG[node.data?.nodeType] ?? {}
        return (
          <div key={node.id} className={styles.analyticsRow} onClick={() => highlight(node.id)}>
            <span className={styles.analyticsIcon}>{cfg.icon}</span>
            <span className={styles.analyticsName}>{node.data?.value || cfg.label || node.id}</span>
            <span className={styles.analyticsDeg}>{deg}</span>
          </div>
        )
      })}
      {stats.isolated.length > 0 && (
        <button
          className={styles.isolatedBtn}
          onClick={() => setHighlight(new Set(stats.isolated.map((x) => x.node.id)), new Set())}
        >
          ⚠ {stats.isolated.length} isolated
        </button>
      )}
    </div>
  )
}

export default function NavSidebar({ theme, onToggleTheme }) {
  const caseInfo = useStore((s) => s.caseInfo)
  const canvases = useStore((s) => s.canvases)
  const activeCanvasId = useStore((s) => s.activeCanvasId)
  const activeView = useStore((s) => s.activeView)
  const activeNoteId = useStore((s) => s.activeNoteId)
  const notes = useStore((s) => s.notes)
  const switchCanvas = useStore((s) => s.switchCanvas)
  const addCanvas = useStore((s) => s.addCanvas)
  const renameCanvas = useStore((s) => s.renameCanvas)
  const deleteCanvas = useStore((s) => s.deleteCanvas)
  const setActiveView = useStore((s) => s.setActiveView)
  const createNote = useStore((s) => s.createNote)
  const deleteNote = useStore((s) => s.deleteNote)
  const closeCase = useStore((s) => s.closeCase)
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)

  const [canvasesOpen, setCanvasesOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(true)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef()

  const statusColor = STATUS_COLORS[caseInfo.status] ?? '#6b7280'
  const isCanvas = activeView === 'canvas'

  const startRename = (id, current, e) => {
    e.stopPropagation()
    setRenamingId(id)
    setRenameValue(current)
    setTimeout(() => renameRef.current?.focus(), 50)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) renameCanvas(renamingId, renameValue.trim())
    setRenamingId(null)
  }

  const navItem = (icon, label, view, noteId) => {
    const active = activeView === view && (!noteId || activeNoteId === noteId)
    return (
      <button
        key={view + (noteId ?? '')}
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        onClick={() => setActiveView(view, noteId)}
      >
        <span className={styles.navIcon}>{icon}</span>
        <span className={styles.navLabel}>{label}</span>
      </button>
    )
  }

  return (
    <aside className={styles.sidebar}>
      {/* Case header */}
      <div className={styles.caseHeader}>
        <div className={styles.caseNameRow}>
          <span className={styles.caseName}>{caseInfo.name || 'Untitled Case'}</span>
        </div>
        <div className={styles.caseMeta}>
          <span className={styles.caseStatus} style={{ color: statusColor }}>● {caseInfo.status}</span>
          {caseInfo.subject && <span className={styles.caseSubject}>{caseInfo.subject}</span>}
        </div>
        <div className={styles.caseStats}>
          <span className={styles.caseStat}><b>{nodes.length}</b> nodes</span>
          <span className={styles.caseStat}><b>{edges.length}</b> links</span>
          <span className={styles.caseStat}><b>{canvases.length}</b> canvas{canvases.length !== 1 ? 'es' : ''}</span>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {/* Primary navigation */}
        <div className={styles.navSection}>
          {navItem('🏠', 'Overview', 'overview')}
        </div>

        <div className={styles.navDivider} />

        {/* Canvases */}
        <div className={styles.navSection}>
          <button className={styles.sectionToggle} onClick={() => setCanvasesOpen((v) => !v)}>
            <span className={styles.sectionArrow}>{canvasesOpen ? '▾' : '▸'}</span>
            <span className={styles.sectionLabel}>Canvases</span>
            <button className={styles.addTiny} onClick={(e) => { e.stopPropagation(); addCanvas() }} title="New canvas">+</button>
          </button>
          {canvasesOpen && canvases.map((c) => (
            <div
              key={c.id}
              className={`${styles.subItem} ${c.id === activeCanvasId && activeView === 'canvas' ? styles.subItemActive : ''}`}
              onClick={() => { switchCanvas(c.id); setActiveView('canvas') }}
            >
              <span className={styles.subIcon}>🗺</span>
              {renamingId === c.id ? (
                <input
                  ref={renameRef}
                  className={styles.renameInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null) }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.subLabel}>{c.name}</span>
              )}
              <div className={styles.subActions}>
                <button className={styles.subBtn} onClick={(e) => startRename(c.id, c.name, e)}>✏</button>
                <button className={styles.subBtn} onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id) }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.navDivider} />

        {/* Workspace views */}
        <div className={styles.navSection}>
          {navItem('👤', 'Subjects', 'subjects')}
          {navItem('📁', 'Evidence', 'evidence')}
          {navItem('📡', 'Intel Feed', 'intel')}
          {navItem('✅', 'Tasks', 'tasks')}
        </div>

        <div className={styles.navDivider} />

        <div className={styles.navSection}>
          {navItem('📅', 'Timeline', 'timeline')}
          {navItem('🔬', 'Sources', 'sources')}
        </div>

        {/* Notes */}
        <div className={styles.navDivider} />
        <div className={styles.navSection}>
          <button className={styles.sectionToggle} onClick={() => setNotesOpen((v) => !v)}>
            <span className={styles.sectionArrow}>{notesOpen ? '▾' : '▸'}</span>
            <span className={styles.sectionLabel}>Notes</span>
            <button className={styles.addTiny} onClick={(e) => { e.stopPropagation(); createNote() }} title="New note">+</button>
          </button>
          {notesOpen && (
            <>
              {notes.length === 0 && <p className={styles.emptyHint}>No notes yet</p>}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.subItem} ${activeView === 'note' && activeNoteId === n.id ? styles.subItemActive : ''}`}
                  onClick={() => setActiveView('note', n.id)}
                >
                  <span className={styles.subIcon}>📝</span>
                  <span className={styles.subLabel}>{n.title || 'Untitled Note'}</span>
                  <div className={styles.subActions}>
                    <button className={styles.subBtn} onClick={(e) => { e.stopPropagation(); deleteNote(n.id) }}>✕</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Canvas tools — only when on canvas */}
        {isCanvas && (
          <>
            <div className={styles.navDivider} />
            <div className={styles.navSection}>
              <button className={styles.sectionToggle} onClick={() => setToolsOpen((v) => !v)}>
                <span className={styles.sectionArrow}>{toolsOpen ? '▾' : '▸'}</span>
                <span className={styles.sectionLabel}>Node Palette</span>
              </button>
              {toolsOpen && <NodeGrid />}
            </div>
            <div className={styles.navSection}>
              <AnalyticsSection />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.footerBtn} onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button className={styles.footerBtn} onClick={closeCase} title="Back to cases">
          ← Cases
        </button>
      </div>
    </aside>
  )
}
