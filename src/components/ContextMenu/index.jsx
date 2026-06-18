import { useEffect, useRef } from 'react'
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
  const edges = useStore((s) => s.edges)

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
