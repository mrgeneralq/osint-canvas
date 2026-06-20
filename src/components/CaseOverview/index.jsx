import useStore from '../../store/useStore'
import styles from './CaseOverview.module.css'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'

const STATUS_COLORS = { Active: '#22c55e', Pending: '#f59e0b', Cold: '#60a5fa', Closed: '#6b7280' }

export default function CaseOverview() {
  const caseInfo   = useStore((s) => s.caseInfo)
  const nodes      = useStore((s) => s.nodes)
  const edges      = useStore((s) => s.edges)
  const canvases   = useStore((s) => s.canvases)
  const notes      = useStore((s) => s.notes)
  const setActiveView = useStore((s) => s.setActiveView)
  const lastSavedAt   = useStore((s) => s.lastSavedAt)
  const isDirty       = useStore((s) => s.isDirty)

  const statusColor = STATUS_COLORS[caseInfo.status] ?? '#6b7280'

  // Node type breakdown
  const typeCounts = {}
  for (const n of nodes) {
    const t = n.data?.nodeType ?? 'unknown'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }
  const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Confirmed vs total
  const confirmed  = nodes.filter((n) => n.data?.confidence === 'confirmed').length
  const probable   = nodes.filter((n) => n.data?.confidence === 'probable').length
  const unverified = nodes.filter((n) => n.data?.confidence === 'unverified' || !n.data?.confidence).length

  const saved = lastSavedAt ? lastSavedAt.toLocaleString() : 'Never'

  return (
    <div className={styles.wrap}>
      {/* Hero header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTitle}>{caseInfo.name || 'Untitled Case'}</div>
          {caseInfo.subject && <div className={styles.heroSubject}>Subject: {caseInfo.subject}</div>}
          {caseInfo.description && <div className={styles.heroDesc}>{caseInfo.description}</div>}
          <div className={styles.heroBadges}>
            <span className={styles.statusBadge} style={{ background: statusColor + '22', color: statusColor, borderColor: statusColor + '55' }}>
              ● {caseInfo.status}
            </span>
            {caseInfo.priority && (
              <span className={styles.priorityBadge}>Priority: {caseInfo.priority}</span>
            )}
            <span className={styles.savedBadge}>
              {isDirty ? '⬤ Unsaved' : `✓ Saved ${saved}`}
            </span>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.heroBtn} onClick={() => setActiveView('canvas')}>
            🗺 Open Canvas
          </button>
          <button className={`${styles.heroBtn} ${styles.heroBtnSecondary}`} onClick={() => setActiveView('subjects')}>
            👤 Subjects
          </button>
          <button className={`${styles.heroBtn} ${styles.heroBtnSecondary}`} onClick={() => setActiveView('intel')}>
            📡 Intel Feed
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <StatCard icon="🔵" label="Nodes" value={nodes.length} sub={`${edges.length} connections`} onClick={() => setActiveView('canvas')} />
        <StatCard icon="🗺" label="Canvases" value={canvases.length} sub="relationship maps" onClick={() => setActiveView('canvas')} />
        <StatCard icon="📝" label="Notes" value={notes.length} sub="case notes" onClick={() => setActiveView('note')} />
        <StatCard icon="✅" label="Confirmed" value={confirmed} sub={`${probable} probable · ${unverified} unverified`} accent="#22c55e" />
      </div>

      {/* Two-column grid */}
      <div className={styles.grid}>
        {/* Node breakdown */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Entity breakdown</span>
            <button className={styles.cardLink} onClick={() => setActiveView('canvas')}>View canvas →</button>
          </div>
          {topTypes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔵</div>
              <div className={styles.emptyText}>No nodes yet</div>
              <div className={styles.emptyHint}>Open the canvas and add your first entity</div>
              <button className={styles.emptyBtn} onClick={() => setActiveView('canvas')}>Open Canvas</button>
            </div>
          ) : (
            <div className={styles.typeList}>
              {topTypes.map(([type, count]) => {
                const cfg = NODE_TYPE_CONFIG[type] ?? {}
                const pct = Math.round((count / nodes.length) * 100)
                return (
                  <div key={type} className={styles.typeRow}>
                    <span className={styles.typeIcon} style={{ background: cfg.color }}>{cfg.icon}</span>
                    <span className={styles.typeLabel}>{cfg.label ?? type}</span>
                    <div className={styles.typeBar}>
                      <div className={styles.typeBarFill} style={{ width: `${pct}%`, background: cfg.color ?? 'var(--accent)' }} />
                    </div>
                    <span className={styles.typeCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Workspace modules */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Workspace</span>
          </div>
          <div className={styles.moduleGrid}>
            <ModuleCard icon="👤" label="Subjects" desc="Structured profiles for each person, org, or asset under investigation" view="subjects" setView={setActiveView} />
            <ModuleCard icon="📁" label="Evidence" desc="Numbered, sourced evidence items with chain of custody" view="evidence" setView={setActiveView} />
            <ModuleCard icon="📡" label="Intel Feed" desc="Raw collection — paste URLs, screenshots, findings before organizing" view="intel" setView={setActiveView} />
            <ModuleCard icon="✅" label="Tasks" desc="Track leads, to-dos, and follow-ups tied to this case" view="tasks" setView={setActiveView} />
            <ModuleCard icon="📅" label="Timeline" desc="Chronological view of events across all entities" view="timeline" setView={setActiveView} />
            <ModuleCard icon="🔬" label="Sources" desc="Intelligence source files and automated extraction pipeline" view="sources" setView={setActiveView} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, accent, onClick }) {
  return (
    <div className={styles.statCard} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue} style={{ color: accent }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

function ModuleCard({ icon, label, desc, view, setView }) {
  return (
    <div className={styles.moduleCard} onClick={() => setView(view)}>
      <div className={styles.moduleIcon}>{icon}</div>
      <div className={styles.moduleLabel}>{label}</div>
      <div className={styles.moduleDesc}>{desc}</div>
    </div>
  )
}
