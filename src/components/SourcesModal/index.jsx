import { useState } from 'react'
import useStore from '../../store/useStore'
import styles from './SourcesModal.module.css'

const SOURCE_TYPES = [
  { value: 'leak',          label: 'Data Leak / Breach',   icon: '💧' },
  { value: 'public_record', label: 'Public Record',         icon: '🏛' },
  { value: 'social',        label: 'Social Media',          icon: '🌐' },
  { value: 'osint_tool',   label: 'OSINT Tool',            icon: '🔍' },
  { value: 'darkweb',       label: 'Dark Web',              icon: '🕶' },
  { value: 'document',      label: 'Document / File',       icon: '📄' },
  { value: 'witness',       label: 'Witness / Informant',   icon: '👁' },
  { value: 'manual',        label: 'Manual Research',       icon: '🖊' },
  { value: 'other',         label: 'Other',                 icon: '📌' },
]

const PRESET_COLORS = [
  '#7c8cf8', '#a855f7', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#94a3b8',
]

const BLANK = { name: '', type: 'leak', date: '', url: '', description: '', color: '#7c8cf8' }

export default function SourcesModal({ onClose }) {
  const sources = useStore((s) => s.sources)
  const nodes = useStore((s) => s.nodes)
  const filterSourceId = useStore((s) => s.filterSourceId)
  const addSource = useStore((s) => s.addSource)
  const updateSource = useStore((s) => s.updateSource)
  const deleteSource = useStore((s) => s.deleteSource)
  const setFilterSource = useStore((s) => s.setFilterSource)

  const [form, setForm] = useState(BLANK)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const nodeCountForSource = (id) =>
    nodes.filter((n) => (n.data.sourceIds ?? []).includes(id)).length

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      updateSource(editId, form)
    } else {
      addSource(form)
    }
    setForm(BLANK)
    setEditId(null)
    setShowForm(false)
  }

  const startEdit = (src) => {
    setForm({ name: src.name, type: src.type, date: src.date ?? '', url: src.url ?? '', description: src.description ?? '', color: src.color })
    setEditId(src.id)
    setShowForm(true)
  }

  const handleFilter = (id) => {
    setFilterSource(filterSourceId === id ? null : id)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>🗂 Data Sources</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Source list */}
          {sources.length === 0 && !showForm && (
            <div className={styles.empty}>No sources defined yet. Add one to tag nodes with where data came from.</div>
          )}

          {sources.map((src) => {
            const typeInfo = SOURCE_TYPES.find((t) => t.value === src.type)
            const count = nodeCountForSource(src.id)
            return (
              <div key={src.id} className={styles.sourceRow}>
                <span className={styles.colorDot} style={{ background: src.color }} />
                <span className={styles.srcIcon}>{typeInfo?.icon ?? '📌'}</span>
                <div className={styles.srcInfo}>
                  <div className={styles.srcName}>{src.name}</div>
                  <div className={styles.srcMeta}>
                    {typeInfo?.label}
                    {src.date && ` · ${src.date}`}
                    {src.url && <> · <a href={src.url} target="_blank" rel="noopener noreferrer" className={styles.srcUrl}>{src.url}</a></>}
                  </div>
                  {src.description && <div className={styles.srcDesc}>{src.description}</div>}
                </div>
                <div className={styles.srcActions}>
                  <span className={styles.nodeBadge} title={`${count} node${count !== 1 ? 's' : ''} tagged`}>{count} nodes</span>
                  <button
                    className={`${styles.filterBtn} ${filterSourceId === src.id ? styles.filterActive : ''}`}
                    onClick={() => handleFilter(src.id)}
                    title="Filter canvas to this source"
                  >🔦</button>
                  <button className={styles.editBtn} onClick={() => startEdit(src)}>✎</button>
                  <button className={styles.delBtn} onClick={() => { if (window.confirm(`Delete source "${src.name}"?`)) deleteSource(src.id) }}>✕</button>
                </div>
              </div>
            )
          })}

          {/* Add / edit form */}
          {showForm ? (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formTitle}>{editId ? 'Edit source' : 'New source'}</div>

              <label className={styles.label}>Name *</label>
              <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Collection #1 breach, LinkedIn scrape…" autoFocus />

              <label className={styles.label}>Type</label>
              <select className={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>

              <label className={styles.label}>Date obtained</label>
              <input className={styles.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />

              <label className={styles.label}>URL / Reference</label>
              <input className={styles.input} type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />

              <label className={styles.label}>Description</label>
              <textarea className={styles.input} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What data does this source contain?" />

              <label className={styles.label}>Colour</label>
              <div className={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" className={`${styles.colorSwatch} ${form.color === c ? styles.colorSelected : ''}`}
                    style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
                ))}
                <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn}>{editId ? 'Save changes' : 'Add source'}</button>
                <button type="button" className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK) }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ Add source</button>
          )}
        </div>

        {filterSourceId && (
          <div className={styles.filterBanner}>
            Canvas filtered by: <strong>{sources.find((s) => s.id === filterSourceId)?.name}</strong>
            <button onClick={() => { setFilterSource(null); onClose() }}>Clear filter</button>
          </div>
        )}
      </div>
    </div>
  )
}
