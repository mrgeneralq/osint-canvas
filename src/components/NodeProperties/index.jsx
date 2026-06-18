import { useState } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG, CONFIDENCE_LEVELS } from '../../config/nodeTypes'
import { EDGE_RELATIONSHIP_TYPES, EDGE_CONFIDENCE, EDGE_REL_GROUPS, inferRelationship } from '../../config/edgeTypes'
import DorkPanel from '../DorkPanel'
import SourcesModal from '../SourcesModal'
import styles from './NodeProperties.module.css'

export default function NodeProperties() {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const selectedEdgeId = useStore((s) => s.selectedEdgeId)
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const updateNodeData = useStore((s) => s.updateNodeData)
  const updateEdgeData = useStore((s) => s.updateEdgeData)
  const deleteEdge = useStore((s) => s.deleteEdge)
  const duplicateNode = useStore((s) => s.duplicateNode)
  const deleteNode = useStore((s) => s.deleteNode)
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useStore((s) => s.setSelectedEdgeId)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const edge = edges.find((e) => e.id === selectedEdgeId)
  const sources = useStore((s) => s.sources)
  const [showDorks, setShowDorks] = useState(false)
  const [showSources, setShowSources] = useState(false)

  if (edge) {
    return <EdgeProperties edge={edge} nodes={nodes} updateEdgeData={updateEdgeData} deleteEdge={deleteEdge} onClose={() => setSelectedEdgeId(null)} />
  }

  if (!node) {
    return (
      <aside className={styles.panel}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <p>Select a node or edge to view its properties</p>
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

function EdgeProperties({ edge, nodes, updateEdgeData, deleteEdge, onClose }) {
  const relType = EDGE_RELATIONSHIP_TYPES[edge.data?.relationshipType] ?? EDGE_RELATIONSHIP_TYPES.default
  const srcNode = nodes.find((n) => n.id === edge.source)
  const tgtNode = nodes.find((n) => n.id === edge.target)
  const update = (patch) => updateEdgeData(edge.id, patch)

  const direction = edge.data?.direction ?? (relType.bidirectional ? 'bidirectional' : 'one-way')

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon} style={{ background: relType.color, fontSize: 14, color: '#fff' }}>⟶</span>
        <div>
          <div className={styles.panelTitle}>Relationship</div>
          <div className={styles.panelId}>{srcNode?.data?.label ?? '?'} → {tgtNode?.data?.label ?? '?'}</div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.scroll}>
        <Section title="Relationship Type">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {EDGE_REL_GROUPS.map((group) => {
              const entries = Object.entries(EDGE_RELATIONSHIP_TYPES).filter(([, cfg]) => cfg.group === group)
              return (
                <div key={group} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-dimmed)', padding: '2px 0 3px' }}>{group}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {entries.map(([key, cfg]) => {
                      const active = (edge.data?.relationshipType ?? 'default') === key
                      return (
                        <button key={key} onClick={() => update({ relationshipType: key })} style={{
                          background: active ? cfg.color : 'var(--bg-elevated)',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          border: `1px solid ${active ? cfg.color : 'var(--border-subtle)'}`,
                          borderRadius: 10, padding: '3px 9px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                          {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="Confidence">
          <div style={{ display: 'flex', gap: 5 }}>
            {Object.entries(EDGE_CONFIDENCE).map(([key, cfg]) => {
              const active = (edge.data?.confidence ?? 'probable') === key
              const col = cfg.color ?? EDGE_RELATIONSHIP_TYPES[edge.data?.relationshipType ?? 'default']?.color ?? '#6b7280'
              return (
                <button key={key} onClick={() => update({ confidence: key })} style={{
                  flex: 1,
                  background: active ? col : 'var(--bg-elevated)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${active ? col : 'var(--border-subtle)'}`,
                  borderRadius: 6, padding: '5px 4px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontWeight: active ? 600 : 400,
                }}>
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="Direction">
          <div style={{ display: 'flex', gap: 5 }}>
            {[['one-way', '→ One-way'], ['bidirectional', '↔ Both ways'], ['none', '— None']].map(([val, label]) => (
              <button key={val} onClick={() => update({ direction: val })} style={{
                flex: 1,
                background: direction === val ? 'var(--accent)' : 'var(--bg-elevated)',
                color: direction === val ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${direction === val ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 6, padding: '5px 4px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Custom Label">
          <input
            className={styles.input}
            value={edge.data?.label ?? ''}
            onChange={(e) => update({ label: e.target.value })}
            placeholder={`Default: "${relType.label}"`}
          />
        </Section>

        <Section title="Date Observed">
          <input className={styles.input} type="date" value={edge.data?.dateObserved ?? ''} onChange={(e) => update({ dateObserved: e.target.value })} />
        </Section>

        <Section title="Source / Evidence URL">
          <input className={styles.input} type="text" value={edge.data?.sourceUrl ?? ''} onChange={(e) => update({ sourceUrl: e.target.value })} placeholder="https://…" />
        </Section>

        <Section title="Notes">
          <textarea className={styles.input} rows={3} value={edge.data?.note ?? ''} onChange={(e) => update({ note: e.target.value })} placeholder="Evidence notes…" />
        </Section>

        <div className={styles.actions}>
          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => { deleteEdge(edge.id); onClose() }}>✕ Delete relationship</button>
        </div>
      </div>
    </aside>
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
