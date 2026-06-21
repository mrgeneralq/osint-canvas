import { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'
import styles from './SubjectsView.module.css'

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'person',       label: 'Person',       icon: '👤' },
  { value: 'organization', label: 'Organization', icon: '🏢' },
  { value: 'asset',        label: 'Asset',        icon: '🎯' },
]

const ROLES = {
  target:    { label: 'Primary Target',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)'    },
  poi:       { label: 'Person of Interest',  color: '#f97316', bg: 'rgba(249,115,22,0.12)'   },
  associate: { label: 'Associate',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'   },
  witness:   { label: 'Witness',             color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'   },
  unknown:   { label: 'Unknown role',        color: '#6b7280', bg: 'rgba(107,114,128,0.12)'  },
}

const PRIORITIES = {
  critical: { label: 'Critical', color: '#ef4444' },
  high:     { label: 'High',     color: '#f97316' },
  medium:   { label: 'Medium',   color: '#f59e0b' },
  low:      { label: 'Low',      color: '#6b7280' },
}

const PLATFORMS = [
  { value: 'twitter',   label: 'X / Twitter',  icon: '𝕏',   base: 'https://x.com/' },
  { value: 'telegram',  label: 'Telegram',     icon: '✈',   base: 'https://t.me/' },
  { value: 'instagram', label: 'Instagram',    icon: '📷',  base: 'https://instagram.com/' },
  { value: 'facebook',  label: 'Facebook',     icon: '𝒻',   base: 'https://facebook.com/' },
  { value: 'linkedin',  label: 'LinkedIn',     icon: 'in',  base: 'https://linkedin.com/in/' },
  { value: 'tiktok',    label: 'TikTok',       icon: '♪',   base: 'https://tiktok.com/@' },
  { value: 'discord',   label: 'Discord',      icon: '☁',   base: '' },
  { value: 'reddit',    label: 'Reddit',       icon: '🔴',  base: 'https://reddit.com/u/' },
  { value: 'github',    label: 'GitHub',       icon: '⌥',   base: 'https://github.com/' },
  { value: 'email',     label: 'Email',        icon: '✉',   base: 'mailto:' },
  { value: 'phone',     label: 'Phone',        icon: '☎',   base: '' },
  { value: 'custom',    label: 'Other',        icon: '🔗',  base: '' },
]

const PERSON_FIELDS = [
  { key: 'dob',         label: 'Date of birth', type: 'date', span: 1 },
  { key: 'nationality', label: 'Nationality',   type: 'text', placeholder: 'e.g. American', span: 1 },
  { key: 'gender',      label: 'Gender',        type: 'select', span: 1,
    options: ['Male','Female','Non-binary','Other','Unknown'] },
  { key: 'occupation',  label: 'Occupation',    type: 'text', placeholder: 'e.g. Software engineer', span: 1 },
]
const PERSON_PHYSICAL = [
  { key: 'height',    label: 'Height',               type: 'text', placeholder: 'e.g. 180 cm / 5\'11"' },
  { key: 'build',     label: 'Build',                type: 'select',
    options: ['Slim','Athletic','Average','Heavy-set','Muscular','Unknown'] },
  { key: 'eyeColor',  label: 'Eye colour',           type: 'select',
    options: ['Brown','Blue','Green','Hazel','Gray','Amber','Unknown'] },
  { key: 'hairColor', label: 'Hair colour',          type: 'select',
    options: ['Black','Dark brown','Brown','Blonde','Red','Gray','White','Bald','Unknown'] },
  { key: 'marks',     label: 'Distinguishing marks', type: 'textarea', placeholder: 'Tattoos, scars, piercings…', span: 2 },
]
const ORG_FIELDS = [
  { key: 'orgType',  label: 'Organisation type', type: 'select', span: 1,
    options: ['Corporation','LLC','Partnership','NGO / Non-profit','Government','Military','Criminal','Other'] },
  { key: 'country',  label: 'Country / HQ',      type: 'text', placeholder: '', span: 1 },
  { key: 'founded',  label: 'Founded',            type: 'number', placeholder: 'YYYY', span: 1 },
  { key: 'industry', label: 'Industry / Sector',  type: 'text', placeholder: 'e.g. Finance, Tech', span: 1 },
]
const ASSET_FIELDS = [
  { key: 'assetType',   label: 'Asset type',  type: 'select', span: 1,
    options: ['Domain / Website','IP Address','Email address','Phone number','Vehicle','Property / Real estate','Cryptocurrency wallet','Bank account','Document','Social media account','Other'] },
  { key: 'identifier',  label: 'Identifier',  type: 'text', placeholder: 'IP, VIN, URL, IBAN…', span: 1 },
  { key: 'owner',       label: 'Owner',       type: 'text', placeholder: '', span: 1 },
  { key: 'assetStatus', label: 'Status',      type: 'select', span: 1,
    options: ['Active','Inactive','Seized','Transferred','Unknown'] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function subjectColor(id) {
  const colors = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777']
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

function computeCompleteness(subject) {
  const checks = [
    subject.name,
    subject.aliases?.length > 0,
    subject.description,
    subject.role !== 'unknown',
    subject.onlinePresence?.length > 0,
    subject.linkedNodeIds?.length > 0,
    subject.type === 'person'       ? (subject.dob || subject.nationality || subject.occupation) : true,
    subject.type === 'organization' ? (subject.orgType || subject.country) : true,
    subject.type === 'asset'        ? (subject.assetType || subject.identifier) : true,
  ]
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

// ── List card ─────────────────────────────────────────────────────────────────

function SubjectCard({ subject, active, onClick }) {
  const role     = ROLES[subject.role]     ?? ROLES.unknown
  const priority = PRIORITIES[subject.priority] ?? PRIORITIES.medium
  const pct      = computeCompleteness(subject)
  const initials = subject.name
    ? subject.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (subject.type === 'organization' ? '🏢' : subject.type === 'asset' ? '🎯' : '?')

  return (
    <div className={`${styles.card} ${active ? styles.cardActive : ''}`} onClick={onClick}>
      {/* Priority stripe */}
      <div className={styles.cardStripe} style={{ background: priority.color }} />

      <div className={styles.cardAvatar}>
        {subject.photoUrl
          ? <img src={subject.photoUrl} alt="" className={styles.cardAvatarImg} />
          : <div className={styles.cardAvatarInitials} style={{ background: subjectColor(subject.id) }}>{initials}</div>
        }
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardTop}>
          <span className={styles.cardName}>{subject.name || <em className={styles.unnamed}>Unnamed {TYPE_OPTIONS.find(t=>t.value===subject.type)?.label}</em>}</span>
          <span className={styles.roleBadge} style={{ color: role.color, background: role.bg }}>{role.label}</span>
        </div>
        <div className={styles.cardMeta}>
          {subject.nationality && <span>{subject.nationality}</span>}
          {subject.dob         && <span>{subject.dob}</span>}
          {subject.orgType     && <span>{subject.orgType}</span>}
          {subject.assetType   && <span>{subject.assetType}</span>}
          {subject.aliases?.length > 0 && <span>aka {subject.aliases[0]}{subject.aliases.length > 1 ? ` +${subject.aliases.length-1}` : ''}</span>}
        </div>
        {/* Completeness bar */}
        <div className={styles.completenessBar}>
          <div className={styles.completenessBarFill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.cardFoot}>
          <span className={styles.completenessPct}>{pct}% complete</span>
          {subject.onlinePresence?.length > 0 && <span className={styles.cardStat}>🌐 {subject.onlinePresence.length}</span>}
          {subject.linkedNodeIds?.length  > 0 && <span className={styles.cardStat}>🔗 {subject.linkedNodeIds.length}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function Field({ label, value, placeholder, onChange, span, type = 'text', options }) {
  const cls = `${styles.field} ${span === 2 ? styles.fieldSpan2 : ''}`
  const inputCls = styles.fieldInput

  if (type === 'select') {
    return (
      <label className={cls}>
        <span className={styles.fieldLabel}>{label}</span>
        <select className={`${inputCls} ${styles.fieldSelect}`} value={value ?? ''} onChange={e => onChange(e.target.value)}>
          <option value="">— select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    )
  }

  if (type === 'textarea') {
    return (
      <label className={cls}>
        <span className={styles.fieldLabel}>{label}</span>
        <textarea className={`${inputCls} ${styles.fieldTextarea}`} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} />
      </label>
    )
  }

  return (
    <label className={cls}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={inputCls} type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

function OnlinePresenceTab({ subject, update }) {
  const [adding, setAdding] = useState(false)
  const [newPlatform, setNewPlatform] = useState('twitter')
  const [newHandle, setNewHandle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const presence = subject.onlinePresence ?? []

  const addEntry = () => {
    if (!newHandle.trim()) return
    const plat = PLATFORMS.find(p => p.value === newPlatform)
    const url  = newUrl.trim() || (plat?.base ? plat.base + newHandle.trim().replace(/^@/, '') : '')
    update({ onlinePresence: [...presence, { id: `op_${Date.now()}`, platform: newPlatform, handle: newHandle.trim(), url }] })
    setNewHandle(''); setNewUrl(''); setAdding(false)
  }

  const remove = (id) => update({ onlinePresence: presence.filter(e => e.id !== id) })

  return (
    <div className={styles.onlineTab}>
      {presence.length === 0 && !adding && (
        <div className={styles.onlineEmpty}>
          <div className={styles.onlineEmptyIcon}>🌐</div>
          <div className={styles.onlineEmptyText}>No online presence recorded</div>
          <div className={styles.onlineEmptyHint}>Add social media accounts, email addresses, phone numbers, and other online identifiers</div>
        </div>
      )}

      <div className={styles.onlineList}>
        {presence.map(entry => {
          const plat = PLATFORMS.find(p => p.value === entry.platform) ?? PLATFORMS[PLATFORMS.length - 1]
          return (
            <div key={entry.id} className={styles.onlineEntry}>
              <div className={styles.onlineEntryIcon}>{plat.icon}</div>
              <div className={styles.onlineEntryInfo}>
                <div className={styles.onlineEntryPlatform}>{plat.label}</div>
                <div className={styles.onlineEntryHandle}>{entry.handle}</div>
              </div>
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noreferrer" className={styles.onlineEntryLink} onClick={e => e.stopPropagation()}>
                  ↗ Open
                </a>
              )}
              <button className={styles.onlineEntryRemove} onClick={() => remove(entry.id)}>✕</button>
            </div>
          )
        })}
      </div>

      {adding ? (
        <div className={styles.onlineAddForm}>
          <div className={styles.onlineAddRow}>
            <select className={styles.onlineSelect} value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
            </select>
            <input
              className={styles.onlineHandleInput}
              value={newHandle}
              onChange={e => setNewHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              placeholder="Handle / username / number…"
              autoFocus
            />
          </div>
          <input
            className={styles.onlineUrlInput}
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="URL (optional — auto-generated for known platforms)"
          />
          <div className={styles.onlineAddActions}>
            <button className={styles.onlineAddSave} onClick={addEntry}>Save</button>
            <button className={styles.onlineAddCancel} onClick={() => { setAdding(false); setNewHandle(''); setNewUrl('') }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className={styles.onlineAddBtn} onClick={() => setAdding(true)}>+ Add account / identifier</button>
      )}
    </div>
  )
}

function SubjectDetail({ subject, onDelete }) {
  const updateSubject = useStore(s => s.updateSubject)
  const nodes         = useStore(s => s.nodes)
  const unlinkNode    = useStore(s => s.unlinkNodeFromSubject)
  const setActiveView = useStore(s => s.setActiveView)
  const [aliasInput, setAliasInput] = useState('')
  const [activeTab, setActiveTab]   = useState('identity')
  const [physOpen, setPhysOpen]     = useState(false)
  const aliasRef = useRef()

  const update = patch => updateSubject(subject.id, patch)

  const addAlias = () => {
    const val = aliasInput.trim(); if (!val) return
    update({ aliases: [...(subject.aliases ?? []), val] })
    setAliasInput('')
    aliasRef.current?.focus()
  }

  const linkedNodes  = nodes.filter(n => subject.linkedNodeIds?.includes(n.id))
  const role         = ROLES[subject.role]         ?? ROLES.unknown
  const priority     = PRIORITIES[subject.priority] ?? PRIORITIES.medium
  const pct          = computeCompleteness(subject)
  const initials     = subject.name
    ? subject.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const identityFields   = subject.type === 'organization' ? ORG_FIELDS : subject.type === 'asset' ? ASSET_FIELDS : PERSON_FIELDS

  const TABS = [
    { id: 'identity', label: 'Identity' },
    { id: 'online',   label: 'Online',  count: subject.onlinePresence?.length },
    { id: 'notes',    label: 'Notes' },
    { id: 'nodes',    label: 'Canvas',  count: linkedNodes.length },
  ]

  return (
    <div className={styles.detail}>
      {/* ── Header ── */}
      <div className={styles.detailHeader}>
        <div className={styles.detailAvatarWrap}>
          {subject.photoUrl
            ? <img src={subject.photoUrl} alt="" className={styles.detailAvatar} />
            : <div className={styles.detailAvatarInitials} style={{ background: subjectColor(subject.id) }}>{initials}</div>
          }
          <button className={styles.avatarEditBtn}
            onClick={() => { const u = window.prompt('Photo URL:', subject.photoUrl ?? ''); if (u !== null) update({ photoUrl: u }) }}
          >✎</button>
        </div>

        <div className={styles.detailMeta}>
          <input
            className={styles.detailName}
            value={subject.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="Subject name…"
          />

          {/* Role + Priority row */}
          <div className={styles.detailBadgeRow}>
            <div className={styles.roleSelect}>
              {Object.entries(ROLES).map(([key, r]) => (
                <button
                  key={key}
                  className={`${styles.roleOption} ${subject.role === key ? styles.roleOptionActive : ''}`}
                  style={subject.role === key ? { color: r.color, background: r.bg, borderColor: r.color + '60' } : {}}
                  onClick={() => update({ role: key })}
                >{r.label}</button>
              ))}
            </div>
            <div className={styles.prioritySelect}>
              {Object.entries(PRIORITIES).map(([key, p]) => (
                <button
                  key={key}
                  className={`${styles.priorityDot} ${subject.priority === key ? styles.priorityDotActive : ''}`}
                  style={{ '--dot-color': p.color }}
                  title={p.label}
                  onClick={() => update({ priority: key })}
                >{p.label}</button>
              ))}
            </div>
          </div>

          {/* Completeness */}
          <div className={styles.detailCompletenessRow}>
            <div className={styles.detailCompletenessBar}>
              <div className={styles.detailCompleteFill} style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : 'var(--accent)' }} />
            </div>
            <span className={styles.detailCompletePct}>{pct}% complete</span>
          </div>

          {/* Aliases inline */}
          {(subject.aliases?.length > 0 || true) && (
            <div className={styles.detailAliasRow}>
              {(subject.aliases ?? []).map(a => (
                <span key={a} className={styles.detailAlias}>
                  {a}<button className={styles.aliasX} onClick={() => update({ aliases: subject.aliases.filter(x => x !== a) })}>✕</button>
                </span>
              ))}
              <input
                ref={aliasRef}
                className={styles.aliasInlineInput}
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAlias()}
                placeholder={subject.aliases?.length ? '+ alias…' : '+ Add alias…'}
              />
            </div>
          )}
        </div>

        <button className={styles.deleteBtn} onClick={onDelete} title="Delete subject">🗑</button>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
            {t.count > 0 && <span className={styles.tabBadge}>{t.count}</span>}
          </button>
        ))}
        <div className={styles.tabSpacer} />
        <button className={styles.deleteTabBtn} onClick={onDelete}>Delete subject</button>
      </div>

      {/* ── Tab content ── */}
      <div className={styles.tabContent}>

        {/* Identity */}
        {activeTab === 'identity' && (
          <div className={styles.identityTab}>
            <div className={styles.fieldSection}>
              <div className={styles.fieldSectionLabel}>Basic information</div>
              <div className={styles.fieldGrid}>
                {identityFields.map(f => (
                  <Field key={f.key} label={f.label} value={subject[f.key]} placeholder={f.placeholder} type={f.type} options={f.options} span={f.span} onChange={v => update({ [f.key]: v })} />
                ))}
              </div>
            </div>

            {subject.type === 'person' && (
              <div className={styles.fieldSection}>
                <button className={styles.collapsibleHeader} onClick={() => setPhysOpen(v => !v)}>
                  <span className={styles.collapsibleArrow}>{physOpen ? '▾' : '▸'}</span>
                  Physical description
                  {!physOpen && PERSON_PHYSICAL.some(f => subject[f.key]) && (
                    <span className={styles.collapsibleFilled}>●</span>
                  )}
                </button>
                {physOpen && (
                  <div className={styles.fieldGrid}>
                    {PERSON_PHYSICAL.map(f => (
                      <Field key={f.key} label={f.label} value={subject[f.key]} placeholder={f.placeholder} type={f.type} options={f.options} span={f.span} onChange={v => update({ [f.key]: v })} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.fieldSection}>
              <div className={styles.fieldSectionLabel}>Type</div>
              <div className={styles.typeChips}>
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    className={`${styles.typeChip} ${subject.type === t.value ? styles.typeChipActive : ''}`}
                    onClick={() => update({ type: t.value })}
                  >{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Online presence */}
        {activeTab === 'online' && (
          <OnlinePresenceTab subject={subject} update={update} />
        )}

        {/* Notes */}
        {activeTab === 'notes' && (
          <div className={styles.notesTab}>
            <textarea
              className={styles.notesArea}
              value={subject.description ?? ''}
              onChange={e => update({ description: e.target.value })}
              placeholder="Background, findings, behavioural patterns, open questions, source notes…"
            />
          </div>
        )}

        {/* Canvas nodes */}
        {activeTab === 'nodes' && (
          <div className={styles.nodesTab}>
            {linkedNodes.length === 0 ? (
              <div className={styles.nodesEmpty}>
                <div className={styles.nodesEmptyIcon}>🔗</div>
                <div className={styles.nodesEmptyText}>No canvas nodes linked</div>
                <div className={styles.nodesEmptyHint}>Right-click any node → "Link to subject…"</div>
                <button className={styles.nodesEmptyBtn} onClick={() => setActiveView('canvas')}>Open Canvas</button>
              </div>
            ) : (
              <div className={styles.nodesList}>
                {linkedNodes.map(node => {
                  const ncfg = NODE_TYPE_CONFIG[node.data?.nodeType] ?? {}
                  return (
                    <div key={node.id} className={styles.nodeItem}>
                      <div className={styles.nodeItemIcon} style={{ background: ncfg.color }}>{ncfg.icon}</div>
                      <div className={styles.nodeItemInfo}>
                        <div className={styles.nodeItemValue}>{node.data?.value || ncfg.label || '—'}</div>
                        <div className={styles.nodeItemType}>{ncfg.label}</div>
                      </div>
                      <button className={styles.nodeItemGo}
                        onClick={() => { setActiveView('canvas'); setTimeout(() => useStore.getState().setSelectedNodeId(node.id), 150) }}>
                        → Canvas
                      </button>
                      <button className={styles.nodeItemUnlink} onClick={() => unlinkNode(subject.id, node.id)}>✕</button>
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
  const subjects      = useStore(s => s.subjects)
  const addSubject    = useStore(s => s.addSubject)
  const deleteSubject = useStore(s => s.deleteSubject)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = subjects.filter(s => {
    if (typeFilter !== 'all' && s.type !== typeFilter) return false
    if (roleFilter !== 'all' && s.role !== roleFilter) return false
    const q = search.toLowerCase()
    return !q || s.name?.toLowerCase().includes(q) ||
      s.aliases?.some(a => a.toLowerCase().includes(q)) ||
      s.description?.toLowerCase().includes(q)
  })

  const selected = subjects.find(s => s.id === selectedId) ?? null

  const handleAdd = () => { const id = addSubject(); setSelectedId(id) }
  const handleDelete = () => { deleteSubject(selectedId); setSelectedId(null) }

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
            <input className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
            {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
          </div>

          <div className={styles.filterRow}>
            <select className={styles.filterSelect} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
            <select className={styles.filterSelect} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All roles</option>
              {Object.entries(ROLES).map(([key, r]) => <option key={key} value={key}>{r.label}</option>)}
            </select>
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
              <div className={styles.emptyHint}>No subjects match your filters</div>
            </div>
          )}
          {filtered.map(s => (
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
              <div className={styles.emptyIcon} style={{ opacity: 0.2, fontSize: 48 }}>👤</div>
              <div className={styles.emptyTitle}>Select a subject</div>
              <div className={styles.emptyHint}>or create a new one to start building a profile</div>
            </div>
          )
        }
      </div>
    </div>
  )
}
