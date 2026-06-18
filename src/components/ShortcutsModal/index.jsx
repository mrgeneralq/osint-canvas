import styles from './ShortcutsModal.module.css'

const SHORTCUTS = [
  { group: 'Canvas' },
  { key: 'Scroll',         action: 'Zoom in / out' },
  { key: 'Drag (empty)',   action: 'Pan canvas' },
  { key: 'Ctrl + Z',      action: 'Undo' },
  { key: 'Ctrl + Y',      action: 'Redo' },
  { key: 'Ctrl + V',      action: 'Paste image from clipboard' },
  { group: 'Nodes' },
  { key: 'Drag palette',  action: 'Add a new node' },
  { key: 'Click node',    action: 'Select & open properties' },
  { key: 'Right-click',   action: 'Context menu (lookup, highlight, lock…)' },
  { key: 'Delete / ⌫',   action: 'Delete selected node or edge' },
  { key: 'Drag handle ◉', action: 'Create a connection to another node' },
  { group: 'Edges' },
  { key: 'Click edge',    action: 'Select edge' },
  { key: 'Click label',   action: 'Change relationship type' },
  { key: 'Dbl-click label', action: 'Edit custom label' },
  { group: 'Tools' },
  { key: '?',             action: 'Show this shortcuts panel' },
  { key: 'Escape',        action: 'Cancel path finder / clear highlight' },
]

export default function ShortcutsModal({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>⌨ Keyboard Shortcuts</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          {SHORTCUTS.map((s, i) =>
            s.group ? (
              <div key={i} className={styles.group}>{s.group}</div>
            ) : (
              <div key={i} className={styles.row}>
                <kbd className={styles.kbd}>{s.key}</kbd>
                <span className={styles.action}>{s.action}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
