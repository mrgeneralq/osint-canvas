import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, MarkerType } from '@xyflow/react'
import { EDGE_RELATIONSHIP_TYPES, EDGE_CONFIDENCE, EDGE_REL_GROUPS } from '../../config/edgeTypes'
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
  const conf = EDGE_CONFIDENCE[data?.confidence] ?? EDGE_CONFIDENCE.probable
  const edgeColor = conf.color ?? relType.color

  // Dash: unverified/suspected types dash; confidence unverified also dashes
  const isDashed = relType.dash || data?.confidence === 'unverified' || data?.confidence === 'suspected'
  const strokeDash = isDashed ? '6 3' : undefined
  const strokeWidth = selected ? conf.strokeWidth + 0.8 : conf.strokeWidth
  const opacity = selected ? 1 : conf.opacity

  // Direction: edge data can override the type default
  const direction = data?.direction ?? (relType.bidirectional ? 'bidirectional' : 'one-way')

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

  // Build marker ids for this edge's color
  const markerId = `arrow-${edgeColor.replace('#', '')}`

  return (
    <>
      {/* Inline SVG defs for dynamic arrow color */}
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
          strokeDasharray: strokeDash,
          opacity,
          markerEnd: direction !== 'none' ? `url(#${markerId})` : undefined,
          markerStart: direction === 'bidirectional' ? `url(#${markerId}-start)` : undefined,
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
            <TypeMenu onSelect={setRelType} onClose={() => setShowTypeMenu(false)} current={data?.relationshipType} />
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
              {direction === 'bidirectional' && <span style={{ fontSize: 8, opacity: 0.7 }}>↔ </span>}
              {displayLabel}
            </span>
          )}

          {selected && !editingLabel && !showTypeMenu && (
            <>
              <ConfidencePip confidence={data?.confidence} onChange={(c) => updateEdgeData(id, { confidence: c })} />
              <DirectionToggle direction={direction} onChange={(d) => updateEdgeData(id, { direction: d })} />
              <button className={styles.deleteBtn} onClick={() => deleteEdge(id)} title="Delete edge">✕</button>
            </>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

function TypeMenu({ onSelect, onClose, current }) {
  return (
    <div className={styles.typeMenu}>
      {EDGE_REL_GROUPS.map((group) => {
        const entries = Object.entries(EDGE_RELATIONSHIP_TYPES).filter(([, cfg]) => cfg.group === group)
        return (
          <div key={group}>
            <div className={styles.typeGroupLabel}>{group}</div>
            {entries.map(([key, cfg]) => (
              <button
                key={key}
                className={`${styles.typeOption} ${current === key ? styles.typeOptionActive : ''}`}
                style={{ '--opt-color': cfg.color }}
                onClick={() => onSelect(key)}
              >
                <span className={styles.typeColorDot} style={{ background: cfg.color }} />
                {cfg.label}
                {cfg.dash && <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 'auto' }}>- -</span>}
              </button>
            ))}
          </div>
        )
      })}
      <button className={styles.typeCancel} onClick={onClose}>Cancel</button>
    </div>
  )
}

const CONF_ORDER = ['unverified', 'suspected', 'probable', 'confirmed']
const CONF_LABELS = { unverified: 'U', suspected: 'S', probable: 'P', confirmed: '✓' }
const CONF_COLORS = { unverified: '#4b5563', suspected: '#94a3b8', probable: '#f59e0b', confirmed: '#22c55e' }

function ConfidencePip({ confidence, onChange }) {
  const cur = confidence ?? 'probable'
  const next = CONF_ORDER[(CONF_ORDER.indexOf(cur) + 1) % CONF_ORDER.length]
  return (
    <button
      className={styles.pipBtn}
      style={{ color: CONF_COLORS[cur], borderColor: CONF_COLORS[cur] }}
      onClick={(e) => { e.stopPropagation(); onChange(next) }}
      title={`Confidence: ${cur} — click to cycle`}
    >
      {CONF_LABELS[cur]}
    </button>
  )
}

function DirectionToggle({ direction, onChange }) {
  const cycle = { 'one-way': 'bidirectional', 'bidirectional': 'none', 'none': 'one-way' }
  const icons = { 'one-way': '→', 'bidirectional': '↔', 'none': '—' }
  const next = cycle[direction ?? 'one-way']
  return (
    <button
      className={styles.pipBtn}
      onClick={(e) => { e.stopPropagation(); onChange(next) }}
      title={`Direction: ${direction} — click to cycle`}
    >
      {icons[direction ?? 'one-way']}
    </button>
  )
}
