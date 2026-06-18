import { useState } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG, CONFIDENCE_LEVELS } from '../../config/nodeTypes'
import DorkPanel from '../DorkPanel'
import SourcesModal from '../SourcesModal'
import styles from './NodeProperties.module.css'

export default function NodeProperties() {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const nodes = useStore((s) => s.nodes)
  const updateNodeData = useStore((s) => s.updateNodeData)
  const duplicateNode = useStore((s) => s.duplicateNode)
  const deleteNode = useStore((s) => s.deleteNode)
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const sources = useStore((s) => s.sources)
  const [showDorks, setShowDorks] = useState(false)
  const [showSources, setShowSources] = useState(false)

  if (!node) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>Select a node to view and edit its properties</p>
        </div>
      </aside>
    )
  }

  const cfg = NODE_TYPE_CONFIG[node.data.nodeType] ?? NODE_TYPE_CONFIG.note
  const update = (patch) => updateNodeData(node.id, patch)

  return (
    <>
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon} style={{ background: cfg.color }}>{cfg.icon}</span>
        <div>
          <div className={styles.panelTitle}>{cfg.label}</div>
          <div className={styles.panelId}>{node.id}</div>
        </div>
        <button className={styles.closeBtn} onClick={() => setSelectedNodeId(null)}>✕</button>
      </div>

      <div className={styles.scroll}>
        <Section title="Confidence Level">
          <div className={styles.confidenceGrid}>
            {Object.entries(CONFIDENCE_LEVELS).map(([key, lvl]) => (
              <button
                key={key}
                className={`${styles.confBtn} ${node.data.confidence === key ? styles.confActive : ''}`}
                style={{ '--lvl-color': lvl.color }}
                onClick={() => update({ confidence: key })}
              >
                <span className={styles.confDot} style={{ background: lvl.color }} />
                {lvl.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Value">
          <textarea
            className={styles.input}
            rows={3}
            value={node.data.value}
            onChange={(e) => update({ value: e.target.value })}
            placeholder={`${cfg.label} value…`}
          />
        </Section>

        <Section title="Source URL">
          <input
            className={styles.input}
            type="text"
            value={node.data.sourceUrl}
            onChange={(e) => update({ sourceUrl: e.target.value })}
            placeholder="https://source.example.com"
          />
        </Section>

        <Section title="Date Added">
          <input
            className={styles.input}
            type="date"
            value={node.data.dateAdded}
            onChange={(e) => update({ dateAdded: e.target.value })}
          />
        </Section>

        <Section title="Tags (comma-separated)">
          <input
            className={styles.input}
            type="text"
            value={node.data.tags}
            onChange={(e) => update({ tags: e.target.value })}
            placeholder="suspect, confirmed, dutch…"
          />
        </Section>

        <Section title="Data Sources">
          {sources.length === 0 ? (
            <button className={styles.dorkBtn} style={{ fontSize: 11 }} onClick={() => setShowSources(true)}>+ Define sources</button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {sources.map((src) => {
                const active = (node.data.sourceIds ?? []).includes(src.id)
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      const cur = node.data.sourceIds ?? []
                      update({ sourceIds: active ? cur.filter((id) => id !== src.id) : [...cur, src.id] })
                    }}
                    style={{
                      background: active ? src.color : 'var(--bg-elevated)',
                      color: active ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${active ? src.color : 'var(--border-subtle)'}`,
                      borderRadius: 12, padding: '3px 9px', fontSize: 11, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    title={src.description || src.type}
                  >
                    {src.name}
                  </button>
                )
              })}
              <button className={styles.actionBtn} style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setShowSources(true)}>⚙</button>
            </div>
          )}
        </Section>

        <Section title="Notes">
          <textarea
            className={styles.input}
            rows={4}
            value={node.data.note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder="Analyst notes…"
          />
        </Section>

        <div className={styles.actions}>
          <button className={styles.dorkBtn} onClick={() => setShowDorks(true)}>🎯 Dork Builder</button>
        </div>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => duplicateNode(node.id)}>⧉ Duplicate</button>
          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => deleteNode(node.id)}>✕ Delete</button>
        </div>
      </div>
    </aside>

    {showSources && <SourcesModal onClose={() => setShowSources(false)} />}
    {showDorks && (
      <DorkPanel
        nodeType={node.data.nodeType}
        value={node.data.value}
        onClose={() => setShowDorks(false)}
      />
    )}
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-dimmed)', marginBottom: '6px' }}>
        {title}
      </div>
      {children}
    </div>
  )
}
