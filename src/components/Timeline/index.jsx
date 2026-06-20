import { useState, useMemo } from 'react'
import useStore from '../../store/useStore'
import styles from './Timeline.module.css'

const CATEGORIES = {
  event:    { label: 'Event',     color: '#60a5fa', icon: '📅' },
  finding:  { label: 'Finding',   color: '#4ade80', icon: '🔍' },
  contact:  { label: 'Contact',   color: '#f59e0b', icon: '📞' },
  action:   { label: 'Action',    color: '#a78bfa', icon: '⚡' },
  note:     { label: 'Note',      color: '#94a3b8', icon: '📝' },
}

function EntryForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '',
    title: '',
    description: '',
    category: 'event',
    ...initial,
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label>Date</label>
          <input type="date" className={styles.input} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div className={styles.formField}>
          <label>Time</label>
          <input type="time" className={styles.input} value={form.time} onChange={(e) => set('time', e.target.value)} placeholder="Optional" />
        </div>
        <div className={styles.formField}>
          <label>Category</label>
          <select className={styles.select} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.formField}>
        <label>Title *</label>
        <input
          autoFocus
          className={styles.input}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What happened?"
          onKeyDown={(e) => e.key === 'Enter' && form.title && onSave(form)}
        />
      </div>
      <div className={styles.formField}>
        <label>Details</label>
        <textarea className={styles.textarea} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Additional context…" />
      </div>
      <div className={styles.formActions}>
        <button className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
        <button className={styles.btnPrimary} disabled={!form.title} onClick={() => onSave(form)}>Save</button>
      </div>
    </div>
  )
}

export default function Timeline() {
  const timelineEntries = useStore((s) => s.timelineEntries)
  const canvases = useStore((s) => s.canvases)
  const addTimelineEntry = useStore((s) => s.addTimelineEntry)
  const updateTimelineEntry = useStore((s) => s.updateTimelineEntry)
  const deleteTimelineEntry = useStore((s) => s.deleteTimelineEntry)
  const setActiveView = useStore((s) => s.setActiveView)

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Auto-derived entries from Event/Date nodes across all canvases
  const canvasEntries = useMemo(() => {
    const entries = []
    for (const canvas of canvases) {
      for (const node of canvas.nodes ?? []) {
        if (node.data?.nodeType === 'event' && node.data?.value) {
          entries.push({
            id: `canvas_${node.id}`,
            date: node.data.dateAdded ?? '',
            time: '',
            title: node.data.value,
            description: node.data.note ?? '',
            category: 'event',
            nodeId: node.id,
            canvasId: canvas.id,
            _derived: true,
          })
        }
      }
    }
    return entries
  }, [canvases])

  const allEntries = useMemo(() => {
    const combined = [...timelineEntries, ...canvasEntries]
    return combined.sort((a, b) => {
      const da = `${a.date ?? ''}T${a.time ?? '00:00'}`
      const db = `${b.date ?? ''}T${b.time ?? '00:00'}`
      return da.localeCompare(db)
    })
  }, [timelineEntries, canvasEntries])

  const handleAdd = (form) => {
    addTimelineEntry(form)
    setAdding(false)
  }

  const handleEdit = (form) => {
    updateTimelineEntry(editingId, form)
    setEditingId(null)
  }

  const goToCanvasNode = useStore((s) => s.goToCanvasNode)

  const goToNode = (entry) => {
    if (entry.canvasId && entry.nodeId) goToCanvasNode(entry.canvasId, entry.nodeId)
    else setActiveView('canvas')
  }

  // Group entries by year-month for section headers
  const grouped = useMemo(() => {
    const groups = []
    let lastKey = null
    for (const entry of allEntries) {
      const key = entry.date ? entry.date.slice(0, 7) : 'Unknown'
      if (key !== lastKey) { groups.push({ key, entries: [] }); lastKey = key }
      groups[groups.length - 1].entries.push(entry)
    }
    return groups
  }, [allEntries])

  const formatMonthKey = (key) => {
    if (key === 'Unknown') return 'Unknown Date'
    const [y, m] = key.split('-')
    return new Date(+y, +m - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.header}>
        <h2 className={styles.title}>Timeline</h2>
        <button className={styles.addBtn} onClick={() => { setAdding(true); setEditingId(null) }}>
          + Add entry
        </button>
      </div>

      {adding && (
        <div className={styles.formWrap}>
          <EntryForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {allEntries.length === 0 && !adding ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🕐</div>
          <p>No timeline entries yet.</p>
          <p className={styles.emptyHint}>Add entries manually, or Event nodes from the canvas will appear here automatically.</p>
          <button className={styles.btnPrimary} onClick={() => setAdding(true)}>Add first entry</button>
        </div>
      ) : (
        <div className={styles.entries}>
          {grouped.map(({ key, entries }) => (
            <div key={key} className={styles.group}>
              <div className={styles.monthLabel}>{formatMonthKey(key)}</div>
              {entries.map((entry, i) => {
                const cat = CATEGORIES[entry.category] ?? CATEGORIES.event
                const isEditing = editingId === entry.id

                return (
                  <div key={entry.id} className={styles.entry}>
                    {/* stem line */}
                    <div className={styles.stem}>
                      <div className={styles.dot} style={{ background: cat.color }} />
                      {i < entries.length - 1 && <div className={styles.line} />}
                    </div>

                    <div className={`${styles.card} ${entry._derived ? styles.cardDerived : ''}`}>
                      {isEditing ? (
                        <EntryForm
                          initial={entry}
                          onSave={handleEdit}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          <div className={styles.cardTop}>
                            <span className={styles.catBadge} style={{ color: cat.color }}>{cat.icon} {cat.label}</span>
                            <span className={styles.cardTime}>
                              {entry.date}{entry.time ? ` · ${entry.time}` : ''}
                            </span>
                            {!entry._derived && (
                              <div className={styles.cardActions}>
                                <button className={styles.actionBtn} onClick={() => { setEditingId(entry.id); setAdding(false) }}>Edit</button>
                                <button className={styles.actionBtn} onClick={() => deleteTimelineEntry(entry.id)}>✕</button>
                              </div>
                            )}
                            {entry._derived && (
                              <button className={styles.goToBtn} onClick={() => goToNode(entry)} title="Go to canvas">↗ Canvas</button>
                            )}
                          </div>
                          <div className={styles.cardTitle}>{entry.title}</div>
                          {entry.description && <div className={styles.cardDesc}>{entry.description}</div>}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
