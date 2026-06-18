import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { EDGE_RELATIONSHIP_TYPES, EDGE_CONFIDENCE } from '../../config/edgeTypes'
import useStore from '../../store/useStore'
import styles from './OsintEdge.module.css'

export default function OsintEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected,
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [draft, setDraft] = useState('')
  const updateEdgeData = useStore((s) => s.updateEdgeData)
  const deleteEdge = useStore((s) => s.deleteEdge)

  const relType = EDGE_RELATIONSHIP_TYPES[data?.relationshipType] ?? EDGE_RELATIONSHIP_TYPES.default
  const conf = EDGE_CONFIDENCE[data?.confidence] ?? EDGE_CONFIDENCE.probable
  const edgeColor = conf.color ?? relType.color
  const isDashed = relType.dash || data?.confidence === 'unverified' || data?.confidence === 'suspected'
  const strokeWidth = selected ? conf.strokeWidth + 0.8 : conf.strokeWidth
  const opacity = selected ? 1 : conf.opacity
  const direction = data?.direction ?? (relType.bidirectional ? 'bidirectional' : 'one-way')

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const commitLabel = () => { updateEdgeData(id, { label: draft.trim() }); setEditingLabel(false) }
  const displayLabel = data?.label || relType.label
  const markerId = `arrow-${edgeColor.replace('#', '')}`

  return (
    <>
      <defs>
        <marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L9,3 z" fill={edgeColor} opacity={opacity} />
        </marker>
        <marker id={`${markerId}-start`} markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L9,3 z" fill={edgeColor} opacity={opacity} />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray: isDashed ? '6 3' : undefined,
          opacity,
          markerEnd: direction !== 'none' ? `url(#${markerId})` : undefined,
          markerStart: direction === 'bidirectional' ? `url(#${markerId}-start)` : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className={`${styles.labelWrap} ${selected ? styles.selected : ''}`}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, '--edge-color': edgeColor }}
        >
          {editingLabel ? (
            <input
              autoFocus
              className={styles.labelInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') setEditingLabel(false) }}
            />
          ) : (
            <span
              className={styles.label}
              style={{ color: edgeColor }}
              onDoubleClick={(e) => { e.stopPropagation(); setDraft(data?.label ?? ''); setEditingLabel(true) }}
              title="Click edge to change type · Double-click label to rename"
            >
              {direction === 'bidirectional' && <span style={{ fontSize: 8, opacity: 0.6 }}>↔ </span>}
              {displayLabel}
            </span>
          )}

          {selected && !editingLabel && (
            <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); deleteEdge(id) }} title="Delete edge">✕</button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
