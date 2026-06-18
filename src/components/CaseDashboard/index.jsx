import { useEffect, useState } from 'react'
import useStore from '../../store/useStore'
import styles from './CaseDashboard.module.css'

const STATUS_COLORS = {
  Active: '#4ade80',
  Pending: '#facc15',
  Cold: '#60a5fa',
  Closed: '#6b7280',
}

function NewCaseModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', investigator: '', target: '', status: 'Active', description: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>New Case</h2>
        <div className={styles.field}>
          <label>Case Name *</label>
          <input autoFocus className={styles.input} value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. John Doe Investigation" onKeyDown={(e) => e.key === 'Enter' && form.name && onCreate(form)} />
        </div>
        <div className={styles.field}>
          <label>Target / Subject</label>
          <input className={styles.input} value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="Name, username, email…" />
        </div>
        <div className={styles.field}>
          <label>Investigator</label>
          <input className={styles.input} value={form.investigator} onChange={(e) => set('investigator', e.target.value)} placeholder="Your name" />
        </div>
        <div className={styles.field}>
          <label>Status</label>
          <select className={styles.select} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {['Active', 'Pending', 'Cold', 'Closed'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Description</label>
          <textarea className={styles.textarea} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief case overview…" />
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} disabled={!form.name} onClick={() => onCreate(form)}>Create Case</button>
        </div>
      </div>
    </div>
  )
}

export default function CaseDashboard() {
  const cases = useStore((s) => s.cases)
  const loadCases = useStore((s) => s.loadCases)
  const openCase = useStore((s) => s.openCase)
  const createCase = useStore((s) => s.createCase)
  const deleteCase = useStore((s) => s.deleteCase)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => { loadCases() }, [])

  const filtered = cases.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.target?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (info) => {
    setShowNew(false)
    await createCase(info)
  }

  const handleDelete = async (id) => {
    setConfirmDelete(null)
    await deleteCase(id)
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🔍</span>
            <span className={styles.logoText}>OSINT Canvas</span>
          </div>
          <p className={styles.subtitle}>Investigation Workspace</p>
        </div>
        <button className={styles.newBtn} onClick={() => setShowNew(true)}>+ New Case</button>
      </header>

      <div className={styles.body}>
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="Search cases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className={styles.count}>{filtered.length} case{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📁</div>
            <p>{search ? 'No cases match your search.' : 'No cases yet. Create your first case to get started.'}</p>
            {!search && <button className={styles.btnPrimary} onClick={() => setShowNew(true)}>Create Case</button>}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((c) => (
              <div key={c.id} className={styles.card} onClick={() => openCase(c.id)}>
                <div className={styles.cardTop}>
                  <span className={styles.statusDot} style={{ background: STATUS_COLORS[c.status] ?? '#6b7280' }} />
                  <span className={styles.statusLabel}>{c.status}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(c) }}
                    title="Delete case"
                  >✕</button>
                </div>
                <h3 className={styles.cardName}>{c.name || 'Untitled Case'}</h3>
                {c.target && <p className={styles.cardTarget}>🎯 {c.target}</p>}
                {c.investigator && <p className={styles.cardMeta}>👤 {c.investigator}</p>}
                {c.description && <p className={styles.cardDesc}>{c.description}</p>}
                <div className={styles.cardFooter}>
                  <span className={styles.cardDate}>
                    {c.updatedAt ? `Updated ${new Date(c.updatedAt).toLocaleDateString()}` : ''}
                  </span>
                  <span className={styles.cardCanvases}>
                    {c.canvases?.length ?? 0} canvas{(c.canvases?.length ?? 0) !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewCaseModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}

      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete Case</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Permanently delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(confirmDelete.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
