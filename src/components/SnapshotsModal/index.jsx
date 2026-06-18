import { useState } from 'react'
import useStore from '../../store/useStore'
import styles from './SnapshotsModal.module.css'

export default function SnapshotsModal({ onClose }) {
  const [name, setName] = useState('')
  const snapshots = useStore((s) => s.snapshots)
  const saveSnapshot = useStore((s) => s.saveSnapshot)
  const loadSnapshot = useStore((s) => s.loadSnapshot)
  const deleteSnapshot = useStore((s) => s.deleteSnapshot)
  const nodes = useStore((s) => s.nodes)

  const save = () => {
    if (!name.trim()) return
    saveSnapshot(name.trim())
    setName('')
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>📸 Snapshots</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          <div className={styles.saveRow}>
            <input
              className={styles.input}
              placeholder="Snapshot name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button className={styles.saveBtn} onClick={save} disabled={!name.trim()}>
              Save ({nodes.length} nodes)
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className={styles.empty}>No snapshots yet. Save one above to create a checkpoint.</div>
          ) : (
            <div className={styles.list}>
              {snapshots.map((snap, i) => (
                <div key={i} className={styles.snapItem}>
                  <div className={styles.snapInfo}>
                    <span className={styles.snapName}>{snap.name}</span>
                    <span className={styles.snapMeta}>
                      {snap.nodes.length} nodes · {new Date(snap.savedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.snapActions}>
                    <button className={styles.loadBtn} onClick={() => { loadSnapshot(i); onClose() }}>Restore</button>
                    <button className={styles.delBtn} onClick={() => deleteSnapshot(i)}>✕</button>
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
