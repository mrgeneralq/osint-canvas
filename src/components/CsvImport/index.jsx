import { useState } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'
import styles from './CsvImport.module.css'

export default function CsvImport({ onClose }) {
  const [raw, setRaw] = useState('')
  const [nodeType, setNodeType] = useState('phone')
  const [colIndex, setColIndex] = useState(0)
  const [preview, setPreview] = useState([])
  const addNode = useStore((s) => s.addNode)
  const updateNodeData = useStore((s) => s.updateNodeData)

  const parsePreview = (text) => {
    const lines = text.trim().split('\n').filter(Boolean)
    const parsed = lines.map((l) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
    setPreview(parsed.slice(0, 8))
    return parsed
  }

  const handleImport = () => {
    const lines = raw.trim().split('\n').filter(Boolean)
    const parsed = lines.map((l) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
    const START_X = 400, START_Y = 200, GAP = 60
    parsed.forEach((row, i) => {
      const value = row[colIndex] ?? ''
      if (!value) return
      const id = addNode(nodeType, { x: START_X + (i % 5) * 240, y: START_Y + Math.floor(i / 5) * GAP })
      setTimeout(() => updateNodeData(id, { value }), 20 * i)
    })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>📥 Bulk CSV Import</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          <Row label="Node type">
            <select className={styles.select} value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
              {Object.entries(NODE_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </Row>

          <Row label="Paste CSV / TSV data">
            <textarea
              className={styles.textarea}
              rows={6}
              placeholder={`+31612345678\n+31687654321\n...`}
              value={raw}
              onChange={(e) => { setRaw(e.target.value); parsePreview(e.target.value) }}
            />
          </Row>

          {preview.length > 0 && preview[0].length > 1 && (
            <Row label="Value column">
              <select className={styles.select} value={colIndex} onChange={(e) => setColIndex(Number(e.target.value))}>
                {preview[0].map((_, i) => (
                  <option key={i} value={i}>Column {i + 1} — {preview[0][i]}</option>
                ))}
              </select>
            </Row>
          )}

          {preview.length > 0 && (
            <div className={styles.previewBox}>
              <div className={styles.previewLabel}>Preview ({Math.min(preview.length, 8)} of {raw.trim().split('\n').filter(Boolean).length} rows)</div>
              {preview.map((row, i) => (
                <div key={i} className={styles.previewRow}>{row[colIndex] ?? '—'}</div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.importBtn} disabled={!raw.trim()} onClick={handleImport}>
            Import {raw.trim().split('\n').filter(Boolean).length} nodes
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  )
}
