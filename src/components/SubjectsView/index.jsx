import { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'
import styles from './SubjectsView.module.css'

const TYPE_OPTIONS = [
  { value: 'person',       label: 'Person',       icon: '👤' },
  { value: 'organization', label: 'Organization', icon: '🏢' },
  { value: 'asset',        label: 'Asset',        icon: '🎯' },
]

const FIELDS = {
  person:       [
    { key: 'dob',        label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
    { key: 'nationality',label: 'Nationality',   placeholder: 'e.g. American' },
    { key: 'gender',     label: 'Gender',        placeholder: '' },
    { key: 'occupation', label: 'Occupation',    placeholder: '' },
  ],
  organization: [
    { key: 'orgType',    label: 'Type',          placeholder: 'Corporation, NGO…' },
    { key: 'country',    label: 'Country',       placeholder: '' },
    { key: 'founded',    label: 'Founded',       placeholder: 'YYYY' },
    { key: 'industry',   label: 'Industry',      placeholder: '' },
  ],
  asset: [
    { key: 'assetType',  label: 'Asset type',    placeholder: 'Domain, Vehicle…' },
    { key: 'identifier', label: 'Identifier',    placeholder: 'IP, VIN, URL…' },
    { key: 'owner',      label: 'Owner',         placeholder: '' },
    { key: 'assetStatus',label: 'Status',        placeholder: 'Active / Inactive' },
  ],
}

// ── Subject list card ─────────────────────────────────────────────────────────
function SubjectCard({ subject, active, onClick }) {
  const cfg = TYPE_OPTIONS.find((t) => t.value === subject.type) ?? TYPE_OPTIONS[0]
  const initials = subject.name ? subject.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className={`${styles.card} ${active ? styles.cardActive : ''}`} onClick={onClick}>
      <div className={styles.cardAvatar}>
        {subject.photoUrl
          ? <img src={subject.photoUrl} alt="" className={styles.cardAvatarImg} />
          : <div className={styles.cardAvatarInitials} style={{ background: subjectColor(subject.id) }}>
              {initials}
            </div>
        }
        <span className={styles.cardTypeIcon}>{cfg.icon}</span>
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardName}>{subject.name || <span className={styles.unnamed}>Unnamed {cfg.label}</span>}</div>
        <div className={styles.cardMeta}>
          {subject.dob && <span>{subject.dob}</span>}
          {subject.nationality && <span>{subject.nationality}</span>}
          {subject.orgType && <span>{subject.orgType}</span>}
          {subject.assetType && <span>{subject.assetType}</span>}
        </div>
        {subject.aliases?.length > 0 && (
          <div className={styles.cardAliases}>
            aka {subject.aliases.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>
      {subject.linkedNodeIds?.length > 0 && (
        <div className={styles.cardNodes}>
          <span className={styles.cardNodesBadge}>{subject.linkedNodeIds.length}</span>
          <span className={styles.cardNodesLabel}>nodes</span>
        </div>
      )}
    </div>
  )
}

function subjectColor(id) {
  const colors = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777']
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

// ── Subject detail ────────────────────────────────────────────────────────────
function SubjectDetail({ subject, onDelete }) {
  const updateSubject  = useStore((s) => s.updateSubject)
  const nodes          = useStore((s) => s.nodes)
  const unlinkNode     = useStore((s) => s.unlinkNodeFromSubject)
  const setActiveView  = useStore((s) => s.setActiveView)
  const [aliasInput, setAliasInput] = useState('')
  const [activeTab, setActiveTab]   = useState('identity')
  const aliasRef = useRef()

  const update = (patch) => updateSubject(subject.id, patch)

  const addAlias = () => {
    const val = aliasInput.trim(); if (!val) return
    update({ aliases: [...(subject.aliases ?? []), val] })
    setAliasInput('')
    aliasRef.current?.focus()
  }

  const linkedNodes = nodes.filter((n) => subject.linkedNodeIds?.includes(n.id))
  const fields = FIELDS[subject.type] ?? FIELDS.person
  const cfg = TYPE_OPTIONS.find((t) => t.value === subject.type) ?? TYPE_OPTIONS[0]
  const initials = subject.name ? subject.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className={styles.detail}>
      {/* Header band */}
      <div className={styles.detailHeader}>
        <div className={styles.detailAvatarWrap}>
          {subject.photoUrl
            ? <img src={subject.photoUrl} alt="" className={styles.detailAvatar} />
            : <div className={styles.detailAvatarInitials} style={{ background: subjectColor(subject.id) }}>
                {initials}
              </div>
          }
          <button
            className={styles.avatarEditBtn}
            onClick={() => { const url = window.prompt('Photo URL:', subject.photoUrl ?? ''); if (url !== null) update({ photoUrl: url }) }}
            title="Set photo URL"
          >✎</button>
        </div>

        <div className={styles.detailMeta}>
          <input
            className={styles.detailName}
            value={subject.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Subject name…"
          />
          <div className={styles.detailTypeRow}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                className={`${styles.typeChip} ${subject.type === t.value ? styles.typeChipActive : ''}`}
                onClick={() => update({ type: t.value })}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {subject.aliases?.length > 0 && (
            <div className={styles.detailAliasRow}>
              {subject.aliases.map((a) => (
                <span key={a} className={styles.detailAlias}>
                  {a}
                  <button className={styles.aliasX} onClick={() => update({ aliases: subject.aliases.filter((x) => x !== a) })}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button className={styles.deleteBtn} onClick={onDelete} title="Delete subject">🗑</button>
      </div>

      {/* Tab bar */}
      <div className={styles.tabs}>
        {[['identity','Identity'],['notes','Notes'],['nodes','Canvas nodes']].map(([tab, label]) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {label}
            {tab === 'nodes' && linkedNodes.length > 0 && (
              <span className={styles.tabBadge}>{linkedNodes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'identity' && (
          <div className={styles.identityTab}>
            <div className={styles.fieldGrid}>
              {fields.map(({ key, label, placeholder }) => (
                <label key={key} className={styles.field}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <input
                    className={styles.fieldInput}
                    value={subject[key] ?? ''}
                    onChange={(e) => update({ [key]: e.target.value })}
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>

            <div className={styles.fieldSection}>
              <span className={styles.fieldSectionLabel}>Aliases / handles</span>
              <div className={styles.aliasList}>
                {(subject.aliases ?? []).length === 0 && (
                  <span className={styles.noAliases}>None added yet</span>
                )}
                {(subject.aliases ?? []).map((alias) => (
                  <span key={alias} className={styles.aliasBadge}>
                    {alias}
                    <button className={styles.aliasX} onClick={() => update({ aliases: subject.aliases.filter((a) => a !== alias) })}>✕</button>
                  </span>
                ))}
              </div>
              <div className={styles.aliasInputRow}>
                <input
                  ref={aliasRef}
                  className={styles.aliasInput}
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addAlias() }}
                  placeholder="Add alias or online handle…"
                />
                <button className={styles.aliasAdd} onClick={addAlias}>Add</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className={styles.notesTab}>
            <textarea
              className={styles.notesArea}
              value={subject.description ?? ''}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Background, findings, open questions, behavioural patterns…"
            />
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className={styles.nodesTab}>
            {linkedNodes.length === 0 ? (
              <div className={styles.nodesEmpty}>
                <div className={styles.nodesEmptyIcon}>🔗</div>
                <div className={styles.nodesEmptyText}>No canvas nodes linked</div>
                <div className={styles.nodesEmptyHint}>Right-click any node on the canvas → "Link to subject"</div>
                <button className={styles.nodesEmptyBtn} onClick={() => setActiveView('canvas')}>Open Canvas</button>
              </div>
            ) : (
              <div className={styles.nodesList}>
                {linkedNodes.map((node) => {
                  const ncfg = NODE_TYPE_CONFIG[node.data?.nodeType] ?? {}
                  return (
                    <div key={node.id} className={styles.nodeItem}>
                      <div className={styles.nodeItemIcon} style={{ background: ncfg.color }}>{ncfg.icon}</div>
                      <div className={styles.nodeItemInfo}>
                        <div className={styles.nodeItemValue}>{node.data?.value || ncfg.label || '—'}</div>
                        <div className={styles.nodeItemType}>{ncfg.label}</div>
                      </div>
                      <button className={styles.nodeItemGo} onClick={() => { setActiveView('canvas'); setTimeout(() => useStore.getState().setSelectedNodeId(node.id), 150) }}>
                        → Canvas
                      </button>
                      <button className={styles.nodeItemUnlink} onClick={() => unlinkNode(subject.id, node.id)} title="Unlink">✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SubjectsView() {
  const subjects      = useStore((s) => s.subjects)
  const addSubject    = useStore((s) => s.addSubject)
  const deleteSubject = useStore((s) => s.deleteSubject)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = subjects.filter((s) => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false
    const q = search.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) ||
      s.aliases?.some((a) => a.toLowerCase().includes(q)) ||
      s.description?.toLowerCase().includes(q)
  })

  const selected = subjects.find((s) => s.id === selectedId) ?? null

  const handleAdd = () => {
    const id = addSubject()
    setSelectedId(id)
  }

  const handleDelete = () => {
    deleteSubject(selectedId)
    setSelectedId(null)
  }

  return (
    <div className={styles.wrap}>
      {/* List panel */}
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div>
            <div className={styles.listTitle}>Subjects</div>
            <div className={styles.listCount}>{subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}</div>
          </div>
          <button className={styles.addBtn} onClick={handleAdd}>+ Add</button>
        </div>

        <div className={styles.listControls}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
            {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
          </div>
          <div className={styles.typeFilters}>
            {['all','person','organization','asset'].map((t) => (
              <button
                key={t}
                className={`${styles.typeFilter} ${typeFilter === t ? styles.typeFilterActive : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : TYPE_OPTIONS.find((o) => o.value === t)?.icon + ' ' + TYPE_OPTIONS.find((o) => o.value === t)?.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.list}>
          {filtered.length === 0 && subjects.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👤</div>
              <div className={styles.emptyTitle}>No subjects yet</div>
              <div className={styles.emptyHint}>Add a person, organization, or asset you're investigating</div>
              <button className={styles.emptyAddBtn} onClick={handleAdd}>+ Add first subject</button>
            </div>
          )}
          {filtered.length === 0 && subjects.length > 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyHint}>No subjects match your filter</div>
            </div>
          )}
          {filtered.map((s) => (
            <SubjectCard key={s.id} subject={s} active={s.id === selectedId} onClick={() => setSelectedId(s.id)} />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className={styles.detailPanel}>
        {selected
          ? <SubjectDetail subject={selected} onDelete={handleDelete} />
          : (
            <div className={styles.detailEmpty}>
              <div className={styles.emptyIcon}>←</div>
              <div className={styles.emptyTitle}>Select a subject</div>
              <div className={styles.emptyHint}>or create a new one to start building a profile</div>
            </div>
          )
        }
      </div>
    </div>
  )
}
