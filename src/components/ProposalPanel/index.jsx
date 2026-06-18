import { useState } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'
import styles from './ProposalPanel.module.css'

export default function ProposalPanel({ onClose }) {
  const proposals        = useStore((s) => s.proposals)
  const isRunning        = useStore((s) => s.isRunning)
  const setProposalStatus    = useStore((s) => s.setProposalStatus)
  const setAllProposalsStatus = useStore((s) => s.setAllProposalsStatus)
  const importProposals  = useStore((s) => s.importProposals)
  const nodes            = useStore((s) => s.nodes)

  const [filterType, setFilterType] = useState('all') // 'all' | nodeType
  const [search, setSearch] = useState('')

  const pending  = proposals.filter((p) => p.status === 'pending').length
  const accepted = proposals.filter((p) => p.status === 'accepted').length
  const imported = proposals.filter((p) => p.status === 'imported').length

  // Group by primary node type
  const grouped = {}
  for (const p of proposals) {
    const t = p.primaryNode.nodeType
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(p)
  }

  const typeKeys = Object.keys(grouped).sort()

  const visible = proposals.filter((p) => {
    if (filterType !== 'all' && p.primaryNode.nodeType !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      return p.primaryNode.value.toLowerCase().includes(q) ||
             p.sourceName?.toLowerCase().includes(q) ||
             p.secondaryNodes?.some((s) => s.value.toLowerCase().includes(q))
    }
    return true
  })

  const visibleGroups = {}
  for (const p of visible) {
    const t = p.primaryNode.nodeType
    if (!visibleGroups[t]) visibleGroups[t] = []
    visibleGroups[t].push(p)
  }

  const handleImport = () => {
    importProposals()
    onClose()
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.title}>Proposals</span>
          <div className={styles.stats}>
            <span className={styles.statChip} style={{ color: '#94a3b8' }}>{proposals.length} total</span>
            {accepted > 0 && <span className={styles.statChip} style={{ color: '#4ade80' }}>✓ {accepted}</span>}
            {imported > 0 && <span className={styles.statChip} style={{ color: '#60a5fa' }}>↑ {imported}</span>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className={styles.searchRow}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search proposals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Bulk actions */}
        <div className={styles.bulkRow}>
          <button className={styles.bulkBtn} onClick={() => setAllProposalsStatus('accepted')}>Accept all</button>
          <button className={styles.bulkBtn} onClick={() => setAllProposalsStatus('pending')}>Reset all</button>
          <button className={styles.bulkBtnDanger} onClick={() => setAllProposalsStatus('rejected')}>Reject all</button>
        </div>

        {/* Type filter tabs */}
        {typeKeys.length > 1 && (
          <div className={styles.typeTabs}>
            <button className={`${styles.typeTab} ${filterType === 'all' ? styles.typeTabActive : ''}`} onClick={() => setFilterType('all')}>
              All ({proposals.length})
            </button>
            {typeKeys.map((t) => {
              const cfg = NODE_TYPE_CONFIG[t]
              return (
                <button key={t} className={`${styles.typeTab} ${filterType === t ? styles.typeTabActive : ''}`}
                  onClick={() => setFilterType(filterType === t ? 'all' : t)}
                  style={{ '--tab-col': cfg?.color }}>
                  {cfg?.icon} {cfg?.label ?? t} ({grouped[t].length})
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Proposal list */}
      <div className={styles.list}>
        {isRunning && (
          <div className={styles.runningBanner}>⏳ Pipeline running — proposals will appear here</div>
        )}

        {Object.keys(visibleGroups).length === 0 && !isRunning && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>{proposals.length === 0 ? 'Run the pipeline to generate proposals' : 'No proposals match your filter'}</p>
          </div>
        )}

        {Object.entries(visibleGroups).map(([type, typeProposals]) => {
          const cfg = NODE_TYPE_CONFIG[type]
          return (
            <div key={type} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupIcon} style={{ background: cfg?.color, border: `1px solid ${cfg?.border}` }}>{cfg?.icon}</span>
                <span className={styles.groupLabel}>{cfg?.label ?? type}</span>
                <span className={styles.groupCount}>{typeProposals.length}</span>
                <button className={styles.groupAcceptAll} onClick={() => {
                  typeProposals.forEach((p) => setProposalStatus(p.id, 'accepted'))
                }}>Accept all</button>
              </div>

              {typeProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onToggle={() => {
                    const next = proposal.status === 'accepted' ? 'pending'
                               : proposal.status === 'rejected' ? 'pending'
                               : 'accepted'
                    setProposalStatus(proposal.id, next)
                  }}
                  onReject={() => setProposalStatus(proposal.id, 'rejected')}
                  existingNode={nodes.find(
                    (n) => n.data.nodeType === proposal.primaryNode.nodeType &&
                           n.data.value?.toLowerCase() === proposal.primaryNode.value?.toLowerCase()
                  )}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer import bar */}
      {accepted > 0 && (
        <div className={styles.importBar}>
          <span className={styles.importCount}>{accepted} proposal{accepted !== 1 ? 's' : ''} accepted</span>
          <button className={styles.importBtn} onClick={handleImport}>
            Import to canvas →
          </button>
        </div>
      )}
    </div>
  )
}

function ProposalCard({ proposal, onToggle, onReject, existingNode }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = NODE_TYPE_CONFIG[proposal.primaryNode.nodeType]
  const status = proposal.status

  const borderColor = status === 'accepted' ? '#4ade80'
                    : status === 'rejected'  ? '#4b5563'
                    : status === 'imported'  ? '#60a5fa'
                    : 'var(--border-subtle)'

  return (
    <div className={styles.card} style={{ borderColor, opacity: status === 'rejected' ? 0.45 : 1 }}>
      <div className={styles.cardMain}>
        {/* Status toggle */}
        <button
          className={`${styles.statusBtn} ${status === 'accepted' ? styles.statusAccepted : status === 'rejected' ? styles.statusRejected : status === 'imported' ? styles.statusImported : ''}`}
          onClick={onToggle}
          title={status === 'accepted' ? 'Click to undo' : 'Accept'}
          disabled={status === 'imported'}
        >
          {status === 'accepted' ? '✓' : status === 'rejected' ? '✕' : status === 'imported' ? '↑' : '○'}
        </button>

        {/* Node type badge + value */}
        <span className={styles.cardIcon} style={{ background: cfg?.color, border: `1px solid ${cfg?.border}` }}>{cfg?.icon}</span>
        <div className={styles.cardContent}>
          <span className={styles.cardValue}>{proposal.primaryNode.value}</span>
          <span className={styles.cardMeta}>
            {proposal.sourceName}
            {existingNode && <span className={styles.existsBadge} title="Already on canvas">⚠ exists</span>}
          </span>
        </div>

        {/* Secondary count + expand */}
        {proposal.secondaryNodes?.length > 0 && (
          <button className={styles.expandBtn} onClick={() => setExpanded((v) => !v)}>
            +{proposal.secondaryNodes.length} {expanded ? '▴' : '▾'}
          </button>
        )}

        {/* Reject */}
        {status !== 'imported' && (
          <button className={styles.rejectBtn} onClick={onReject} title="Reject">✕</button>
        )}
      </div>

      {/* Expanded: secondaries + raw text */}
      {expanded && (
        <div className={styles.cardExpanded}>
          {proposal.secondaryNodes.length > 0 && (
            <div className={styles.secondaries}>
              {proposal.secondaryNodes.map((sec, i) => {
                const scfg = NODE_TYPE_CONFIG[sec.nodeType]
                return (
                  <span key={i} className={styles.secChip} style={{ background: scfg?.color, border: `1px solid ${scfg?.border}` }}>
                    {scfg?.icon} {sec.value}
                    <span className={styles.secRel}> {sec.relationship}</span>
                  </span>
                )
              })}
            </div>
          )}
          {proposal.primaryNode.rawText && proposal.primaryNode.rawText !== proposal.primaryNode.value && (
            <div className={styles.rawText}>
              <span className={styles.rawLabel}>source: </span>
              <HighlightedText text={proposal.primaryNode.rawText} highlight={proposal.primaryNode.value} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HighlightedText({ text, highlight }) {
  if (!highlight || !text.includes(highlight)) {
    return <span className={styles.rawValue}>{text.slice(0, 120)}{text.length > 120 ? '…' : ''}</span>
  }
  const idx = text.indexOf(highlight)
  return (
    <span className={styles.rawValue}>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(250,204,21,0.3)', borderRadius: 2, padding: '0 1px' }}>{highlight}</mark>
      {text.slice(idx + highlight.length, 120)}
      {text.length > 120 ? '…' : ''}
    </span>
  )
}
