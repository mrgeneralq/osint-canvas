import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { EDGE_RELATIONSHIP_TYPES } from '../../config/edgeTypes'
import useStore from '../../store/useStore'
import styles from './OsintEdge.module.css'

export default function OsintEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, data, selected,
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [draft, setDraft] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const updateEdgeData = useStore((s) => s.updateEdgeData)
  const deleteEdge = useStore((s) => s.deleteEdge)

  const relType = EDGE_RELATIONSHIP_TYPES[data?.relationshipType] ?? EDGE_RELATIONSHIP_TYPES.default
  const edgeColor = relType.color
  const strokeDash = relType.dash ? '6 3' : undefined

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const commitLabel = () => {
    updateEdgeData(id, { label: draft.trim() })
    setEditingLabel(false)
  }

  const setRelType = (type) => {
    updateEdgeData(id, { relationshipType: type })
    setShowTypeMenu(false)
  }

  const displayLabel = data?.label || relType.label

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 2.5 : 1.8,
          strokeDasharray: strokeDash,
          opacity: selected ? 1 : 0.75,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className={`${styles.labelWrap} ${selected ? styles.selected : ''}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            '--edge-color': edgeColor,
          }}
        >
          {showTypeMenu ? (
            <div className={styles.typeMenu}>
              {Object.entries(EDGE_RELATIONSHIP_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  className={styles.typeOption}
                  style={{ '--opt-color': cfg.color }}
                  onClick={() => setRelType(key)}
                >
                  <span className={styles.typeColorDot} style={{ background: cfg.color }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          ) : editingLabel ? (
            <input
              autoFocus
              className={styles.labelInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') setEditingLabel(false)
              }}
            />
          ) : (
            <span
              className={styles.label}
              style={{ color: edgeColor }}
              onDoubleClick={() => { setDraft(data?.label ?? ''); setEditingLabel(true) }}
              onClick={(e) => { if (selected) { e.stopPropagation(); setShowTypeMenu(true) } }}
              title={selected ? 'Click to change type · Double-click to edit label' : ''}
            >
              {displayLabel}
            </span>
          )}

          {selected && !editingLabel && !showTypeMenu && (
            <button className={styles.deleteBtn} onClick={() => deleteEdge(id)} title="Delete edge">✕</button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
