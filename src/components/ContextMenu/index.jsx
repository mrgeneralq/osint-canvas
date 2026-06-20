import { useEffect, useRef, useState } from 'react'
import { NODE_TYPE_CONFIG, CONFIDENCE_LEVELS } from '../../config/nodeTypes'
import { LOOKUP_URLS } from '../../config/lookupUrls'
import useStore from '../../store/useStore'
import styles from './ContextMenu.module.css'

export default function ContextMenu({ x, y, nodeId, onClose }) {
  const ref = useRef()
  const nodes = useStore((s) => s.nodes)
  const updateNodeData = useStore((s) => s.updateNodeData)
  const duplicateNode = useStore((s) => s.duplicateNode)
  const deleteNode = useStore((s) => s.deleteNode)
  const toggleNodeLock = useStore((s) => s.toggleNodeLock)
  const startPathPick = useStore((s) => s.startPathPick)
  const setHighlight = useStore((s) => s.setHighlight)
  const mergeNodes = useStore((s) => s.mergeNodes)
  const subjects = useStore((s) => s.subjects)
  const linkNodeToSubject = useStore((s) => s.linkNodeToSubject)
  const setActiveView = useStore((s) => s.setActiveView)
  const edges = useStore((s) => s.edges)
  const [showMergePicker, setShowMergePicker] = useState(false)
  const [mergeSearch, setMergeSearch] = useState('')
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [subjectSearch, setSubjectSearch] = useState('')

  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const cfg = NODE_TYPE_CONFIG[node.data.nodeType] ?? {}
  const lookups = LOOKUP_URLS[node.data.nodeType] ?? []
  const value = encodeURIComponent(node.data.value || '')

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const act = (fn) => { fn(); onClose() }

  const highlightChain = () => {
    const connected = new Set([nodeId])
    const edgeIds = new Set()
    edges.forEach((e) => {
      if (e.source === nodeId) { connected.add(e.target); edgeIds.add(e.id) }
      if (e.target === nodeId) { connected.add(e.source); edgeIds.add(e.id) }
    })
    setHighlight(connected, edgeIds)
  }

  return (
    <div ref={ref} className={styles.menu} style={{ left: x, top: y }}>
      <div className={styles.header}>
        <span>{cfg.icon}</span>
        <span>{node.data.value || cfg.label || 'Node'}</span>
      </div>

      <div className={styles.sep} />

      <Item icon="🔗" label="Highlight connections" onClick={() => act(highlightChain)} />
      <Item icon="↔️" label="Find path from here…" onClick={() => act(() => { startPathPick(); setTimeout(() => useStore.getState().pickPathNode(nodeId), 10) })} />

      {lookups.length > 0 && <>
        <div className={styles.sep} />
        <div className={styles.groupLabel}>Look up online</div>
        {lookups.map((lu) => (
          <Item
            key={lu.label}
            icon="↗"
            label={lu.label}
            onClick={() => { window.open(lu.url.replace('{value}', value), '_blank'); onClose() }}
          />
        ))}
      </>}

      <div className={styles.sep} />
      <div className={styles.groupLabel}>Confidence</div>
      {Object.entries(CONFIDENCE_LEVELS).map(([key, lvl]) => (
        <Item
          key={key}
          icon={<span style={{ width: 8, height: 8, borderRadius: '50%', background: lvl.color, display: 'inline-block' }} />}
          label={lvl.label}
          active={node.data.confidence === key}
          onClick={() => act(() => updateNodeData(nodeId, { confidence: key }))}
        />
      ))}

      <div className={styles.sep} />
      <Item icon="⧉" label="Duplicate" onClick={() => act(() => duplicateNode(nodeId))} />
      <Item icon={node.data.locked ? '🔓' : '🔒'} label={node.data.locked ? 'Unlock position' : 'Lock position'} onClick={() => act(() => toggleNodeLock(nodeId))} />
      <Item icon="⇢" label="Merge into…" onClick={() => setShowMergePicker((v) => !v)} />

      {showMergePicker && (
        <div className={styles.mergePicker}>
          <input
            autoFocus
            className={styles.mergeSearch}
            placeholder="Search nodes…"
            value={mergeSearch}
            onChange={(e) => setMergeSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.mergeList}>
            {nodes
              .filter((n) => n.id !== nodeId)
              .filter((n) => !mergeSearch || (n.data.value ?? '').toLowerCase().includes(mergeSearch.toLowerCase()))
              .slice(0, 12)
              .map((n) => {
                const ncfg = NODE_TYPE_CONFIG[n.data.nodeType] ?? {}
                return (
                  <button key={n.id} className={styles.mergeItem} onClick={() => { mergeNodes(n.id, nodeId); onClose() }}>
                    <span>{ncfg.icon}</span>
                    <span className={styles.mergeItemVal}>{n.data.value || ncfg.label || n.id}</span>
                  </button>
                )
              })}
          </div>
        </div>
      )}

      <div className={styles.sep} />
      <Item icon="👤" label="Link to subject…" onClick={() => { setShowMergePicker(false); setShowSubjectPicker((v) => !v) }} />

      {showSubjectPicker && (
        <div className={styles.mergePicker}>
          <input
            autoFocus
            className={styles.mergeSearch}
            placeholder="Search subjects…"
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.mergeList}>
            {subjects.length === 0 && (
              <button className={styles.mergeItem} onClick={() => { setActiveView('subjects'); onClose() }}>
                <span>+</span>
                <span className={styles.mergeItemVal}>Create a subject first…</span>
              </button>
            )}
            {subjects
              .filter((s) => !subjectSearch || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
              .slice(0, 12)
              .map((s) => (
                <button
                  key={s.id}
                  className={`${styles.mergeItem} ${s.linkedNodeIds?.includes(nodeId) ? styles.mergeItemActive : ''}`}
                  onClick={() => { linkNodeToSubject(s.id, nodeId); onClose() }}
                >
                  <span>{s.type === 'organization' ? '🏢' : s.type === 'asset' ? '🎯' : '👤'}</span>
                  <span className={styles.mergeItemVal}>{s.name || 'Unnamed subject'}</span>
                  {s.linkedNodeIds?.includes(nodeId) && <span style={{ fontSize: 9, color: 'var(--accent)', marginLeft: 'auto' }}>linked</span>}
                </button>
              ))}
          </div>
        </div>
      )}

      <div className={styles.sep} />
      <Item icon="✕" label="Delete node" danger onClick={() => act(() => deleteNode(nodeId))} />
    </div>
  )
}

function Item({ icon, label, onClick, danger, active }) {
  return (
    <button className={`${styles.item} ${danger ? styles.danger : ''} ${active ? styles.active : ''}`} onClick={onClick}>
      <span className={styles.itemIcon}>{icon}</span>
      {label}
    </button>
  )
}
