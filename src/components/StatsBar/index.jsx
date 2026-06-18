import { useMemo } from 'react'
import useStore from '../../store/useStore'
import { computeStats } from '../../utils/graphUtils'
import { CONFIDENCE_LEVELS } from '../../config/nodeTypes'
import styles from './StatsBar.module.css'

export default function StatsBar() {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const caseInfo = useStore((s) => s.caseInfo)
  const highlightNodeIds = useStore((s) => s.highlightNodeIds)
  const clearHighlight = useStore((s) => s.clearHighlight)
  const pathPickMode = useStore((s) => s.pathPickMode)
  const pathPickFirst = useStore((s) => s.pathPickFirst)

  const stats = useMemo(() => computeStats(nodes, edges), [nodes, edges])

  return (
    <footer className={styles.bar}>
      <span className={styles.stat}>
        <span className={styles.num}>{stats.total}</span> nodes
      </span>
      <span className={styles.dot}>·</span>
      <span className={styles.stat}>
        <span className={styles.num}>{stats.edges}</span> connections
      </span>
      <span className={styles.dot}>·</span>
      {Object.entries(CONFIDENCE_LEVELS).map(([key, lvl]) => (
        <span key={key} className={styles.stat}>
          <span className={styles.confDot} style={{ background: lvl.color }} />
          <span className={styles.num} style={{ color: lvl.color }}>{stats.byConfidence[key] ?? 0}</span>
          <span>{lvl.label}</span>
        </span>
      ))}
      {stats.orphans > 0 && <>
        <span className={styles.dot}>·</span>
        <span className={styles.stat} style={{ color: '#f59e0b' }}>
          ⚠ {stats.orphans} unconnected
        </span>
      </>}

      {pathPickMode && (
        <span className={styles.modeBadge} style={{ background: '#2d1f4f', borderColor: '#7c8cf8' }}>
          {pathPickFirst ? '↔ Click second node to find path' : '↔ Path finder: click first node'}
          <button className={styles.modeClose} onClick={clearHighlight}>✕</button>
        </span>
      )}

      {highlightNodeIds && !pathPickMode && (
        <span className={styles.modeBadge} style={{ background: '#1a2820', borderColor: '#22c55e' }}>
          Highlighting {highlightNodeIds.size} nodes
          <button className={styles.modeClose} onClick={clearHighlight}>✕</button>
        </span>
      )}

      <span className={styles.right}>
        <span className={styles.caseName}>{caseInfo.name}</span>
        <span className={styles.caseStatus}>{caseInfo.status}</span>
      </span>
    </footer>
  )
}
