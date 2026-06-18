import { useState, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG, PALETTE_GROUPS } from '../../config/nodeTypes'
import styles from './WorkspaceSidebar.module.css'

const STATUS_COLORS = { Active: '#4ade80', Pending: '#facc15', Cold: '#60a5fa', Closed: '#6b7280' }

function NodeGrid() {
  const addNode = useStore((s) => s.addNode)
  const { getViewport } = useReactFlow()

  const onDragStart = (e, type) => {
    e.dataTransfer.setData('application/osint-node-type', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (type) => {
    const vp = getViewport()
    const cx = (window.innerWidth / 2 - vp.x) / vp.zoom
    const cy = (window.innerHeight / 2 - vp.y) / vp.zoom
    addNode(type, { x: cx - 110, y: cy - 50 })
  }

  return (
    <div className={styles.nodeList}>
      {PALETTE_GROUPS.map((group) => {
        const items = Object.entries(NODE_TYPE_CONFIG).filter(([, cfg]) => cfg.group === group)
        return (
          <div key={group} className={styles.nodeGroup}>
            <span className={styles.nodeGroupLabel}>{group}</span>
            {items.map(([type, cfg]) => (
              <div
                key={type}
                className={styles.nodeRow}
                style={{ '--tile-bg': cfg.color, '--tile-border': cfg.border }}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                onClick={() => handleClick(type)}
              >
                <span className={styles.nodeRowBadge}>{cfg.icon}</span>
                <span className={styles.nodeRowLabel}>{cfg.label}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function WorkspaceSidebar() {
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

  const [canvasesOpen, setCanvasesOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(true)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef()

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

  return (
    <div className={styles.sidebar}>
      {/* Case header */}
      <div className={styles.caseHeader}>
        <button className={styles.backBtn} onClick={closeCase} title="Back to cases">←</button>
        <div className={styles.caseInfo}>
          <span className={styles.caseName}>{caseInfo.name || 'Untitled Case'}</span>
          <span className={styles.caseStatus} style={{ color: STATUS_COLORS[caseInfo.status] ?? '#6b7280' }}>
            ● {caseInfo.status}
          </span>
        </div>
      </div>

      {/* Node type grid — top of sidebar */}
      <NodeGrid />

      <div className={styles.divider} />

      {/* File sections */}
      <div className={styles.sections}>
        {/* Canvases */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => setCanvasesOpen((v) => !v)}>
            <span className={styles.sectionIcon}>{canvasesOpen ? '▾' : '▸'}</span>
            <span className={styles.sectionLabel}>Canvases</span>
            <span className={styles.addBtn} onClick={(e) => { e.stopPropagation(); addCanvas() }} title="New canvas">+</span>
          </button>
          {canvasesOpen && (
            <div className={styles.items}>
              {canvases.map((c) => (
                <div
                  key={c.id}
                  className={`${styles.item} ${c.id === activeCanvasId && activeView === 'canvas' ? styles.itemActive : ''}`}
                  onClick={() => { switchCanvas(c.id); setActiveView('canvas') }}
                >
                  <span className={styles.itemIcon}>🗺</span>
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
                    <span className={styles.itemName}>{c.name}</span>
                  )}
                  <div className={styles.itemActions}>
                    <button className={styles.actionBtn} onClick={(e) => startRename(c.id, c.name, e)} title="Rename">✏️</button>
                    <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id) }} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className={styles.section}>
          <button className={styles.sectionHeader} onClick={() => setNotesOpen((v) => !v)}>
            <span className={styles.sectionIcon}>{notesOpen ? '▾' : '▸'}</span>
            <span className={styles.sectionLabel}>Notes</span>
            <span className={styles.addBtn} onClick={(e) => { e.stopPropagation(); createNote() }} title="New note">+</span>
          </button>
          {notesOpen && (
            <div className={styles.items}>
              {notes.length === 0 && <p className={styles.emptyHint}>No notes yet</p>}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.item} ${activeView === 'note' && activeNoteId === n.id ? styles.itemActive : ''}`}
                  onClick={() => setActiveView('note', n.id)}
                >
                  <span className={styles.itemIcon}>📝</span>
                  <span className={styles.itemName}>{n.title || 'Untitled Note'}</span>
                  <div className={styles.itemActions}>
                    <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); deleteNote(n.id) }} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
