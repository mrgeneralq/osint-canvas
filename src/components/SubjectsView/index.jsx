import { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG } from '../../config/nodeTypes'
import styles from './SubjectsView.module.css'

const TYPE_OPTIONS = [
  { value: 'person', label: 'Person', icon: '👤' },
  { value: 'organization', label: 'Organization', icon: '🏢' },
  { value: 'asset', label: 'Asset', icon: '🎯' },
]

const PERSON_FIELDS = [
  { key: 'dob',         label: 'Date of birth',  placeholder: 'YYYY-MM-DD' },
  { key: 'nationality', label: 'Nationality',     placeholder: 'e.g. American' },
  { key: 'gender',      label: 'Gender',          placeholder: '' },
  { key: 'occupation',  label: 'Occupation',      placeholder: '' },
]

const ORG_FIELDS = [
  { key: 'orgType',     label: 'Type',            placeholder: 'e.g. Corporation, NGO' },
  { key: 'country',     label: 'Country',         placeholder: '' },
  { key: 'founded',     label: 'Founded',         placeholder: 'YYYY' },
  { key: 'industry',    label: 'Industry',        placeholder: '' },
]

const ASSET_FIELDS = [
  { key: 'assetType',   label: 'Asset type',      placeholder: 'e.g. Domain, Vehicle, Account' },
  { key: 'identifier',  label: 'Identifier',      placeholder: 'IP, VIN, URL, etc.' },
  { key: 'owner',       label: 'Owner',           placeholder: '' },
  { key: 'status',      label: 'Status',          placeholder: 'Active / Inactive' },
]

function typeFields(type) {
  if (type === 'organization') return ORG_FIELDS
  if (type === 'asset') return ASSET_FIELDS
  return PERSON_FIELDS
}

function typeIcon(type) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.icon ?? '👤'
}

// ── Subject list item ─────────────────────────────────────────────────────────
function SubjectRow({ subject, active, onClick }) {
  return (
    <div className={`${styles.row} ${active ? styles.rowActive : ''}`} onClick={onClick}>
      <div className={styles.rowAvatar}>
        {subject.photoUrl
          ? <img src={subject.photoUrl} alt="" className={styles.rowAvatarImg} />
          : <span className={styles.rowAvatarIcon}>{typeIcon(subject.type)}</span>
        }
      </div>
      <div className={styles.rowInfo}>
        <div className={styles.rowName}>{subject.name || <span className={styles.unnamed}>Unnamed subject</span>}</div>
        <div className={styles.rowMeta}>
          <span className={styles.rowType}>{TYPE_OPTIONS.find((t) => t.value === subject.type)?.label}</span>
          {subject.nationality && <span className={styles.rowDetail}>{subject.nationality}</span>}
          {subject.aliases?.length > 0 && (
            <span className={styles.rowDetail}>aka {subject.aliases.slice(0, 2).join(', ')}</span>
          )}
        </div>
      </div>
      {subject.linkedNodeIds?.length > 0 && (
        <span className={styles.rowLinks}>{subject.linkedNodeIds.length}</span>
      )}
    </div>
  )
}

// ── Subject detail ────────────────────────────────────────────────────────────
function SubjectDetail({ subject, onDelete }) {
  const updateSubject = useStore((s) => s.updateSubject)
  const nodes         = useStore((s) => s.nodes)
  const unlinkNode    = useStore((s) => s.unlinkNodeFromSubject)
  const setActiveView = useStore((s) => s.setActiveView)
  const switchCanvas  = useStore((s) => s.switchCanvas)
  const [aliasInput, setAliasInput] = useState('')
  const aliasRef = useRef()

  const update = (patch) => updateSubject(subject.id, patch)

  const addAlias = () => {
    const val = aliasInput.trim()
    if (!val) return
    update({ aliases: [...(subject.aliases ?? []), val] })
    setAliasInput('')
    aliasRef.current?.focus()
  }

  const removeAlias = (alias) =>
    update({ aliases: subject.aliases.filter((a) => a !== alias) })

  const linkedNodes = nodes.filter((n) => subject.linkedNodeIds?.includes(n.id))

  const goToNode = (nodeId) => {
    setActiveView('canvas')
    // slight delay so canvas mounts before we try to select
    setTimeout(() => useStore.getState().setSelectedNodeId(nodeId), 150)
  }

  const fields = typeFields(subject.type)

  return (
    <div className={styles.detail}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailAvatarWrap}>
          {subject.photoUrl
            ? <img src={subject.photoUrl} alt="" className={styles.detailAvatar} />
            : <div className={styles.detailAvatarPlaceholder}>{typeIcon(subject.type)}</div>
          }
          <button
            className={styles.avatarEditBtn}
            onClick={() => {
              const url = window.prompt('Photo URL:', subject.photoUrl ?? '')
              if (url !== null) update({ photoUrl: url })
            }}
            title="Set photo URL"
          >✎</button>
        </div>
        <div className={styles.detailHeaderInfo}>
          <input
            className={styles.detailName}
            value={subject.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Subject name…"
          />
          <div className={styles.typeRow}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                className={`${styles.typeBtn} ${subject.type === t.value ? styles.typeBtnActive : ''}`}
                onClick={() => update({ type: t.value })}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <button className={styles.deleteBtn} onClick={onDelete} title="Delete subject">🗑</button>
      </div>

      <div className={styles.detailBody}>
        {/* Structured fields */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Identity</div>
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
        </section>

        {/* Aliases */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Aliases / handles</div>
          <div className={styles.aliasList}>
            {(subject.aliases ?? []).map((alias) => (
              <span key={alias} className={styles.aliasBadge}>
                {alias}
                <button className={styles.aliasRemove} onClick={() => removeAlias(alias)}>✕</button>
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
              placeholder="Add alias or handle…"
            />
            <button className={styles.aliasAdd} onClick={addAlias}>Add</button>
          </div>
        </section>

        {/* Description */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Notes</div>
          <textarea
            className={styles.descTextarea}
            value={subject.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Background, context, open questions…"
            rows={4}
          />
        </section>

        {/* Linked canvas nodes */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Canvas nodes ({linkedNodes.length})</div>
          {linkedNodes.length === 0 ? (
            <p className={styles.emptyHint}>
              No canvas nodes linked yet. Right-click any node on the canvas and choose "Link to subject."
            </p>
          ) : (
            <div className={styles.nodeList}>
              {linkedNodes.map((node) => {
                const cfg = NODE_TYPE_CONFIG[node.data?.nodeType] ?? {}
                return (
                  <div key={node.id} className={styles.nodeRow}>
                    <span className={styles.nodeIcon} style={{ background: cfg.color }}>{cfg.icon}</span>
                    <span className={styles.nodeLabel}>{node.data?.value || cfg.label}</span>
                    <span className={styles.nodeType}>{cfg.label}</span>
                    <button className={styles.nodeGo} onClick={() => goToNode(node.id)}>→ Canvas</button>
                    <button className={styles.nodeUnlink} onClick={() => unlinkNode(subject.id, node.id)}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function SubjectsView() {
  const subjects      = useStore((s) => s.subjects)
  const addSubject    = useStore((s) => s.addSubject)
  const deleteSubject = useStore((s) => s.deleteSubject)
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = subjects.filter((s) => {
    const matchType = typeFilter === 'all' || s.type === typeFilter
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) ||
      s.aliases?.some((a) => a.toLowerCase().includes(q)) ||
      s.description?.toLowerCase().includes(q)
    return matchType && matchSearch
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
          <div className={styles.listTitle}>Subjects</div>
          <button className={styles.addBtn} onClick={handleAdd}>+ Add</button>
        </div>

        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects…"
          />
        </div>

        <div className={styles.typeFilters}>
          {['all', 'person', 'organization', 'asset'].map((t) => (
            <button
              key={t}
              className={`${styles.typeFilter} ${typeFilter === t ? styles.typeFilterActive : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All' : TYPE_OPTIONS.find((o) => o.value === t)?.label}
            </button>
          ))}
        </div>

        <div className={styles.list}>
          {filtered.length === 0 && (
            <div className={styles.emptyList}>
              {subjects.length === 0
                ? <>
                    <div className={styles.emptyIcon}>👤</div>
                    <div className={styles.emptyText}>No subjects yet</div>
                    <div className={styles.emptyHint}>Add a person, organization, or asset you're investigating</div>
                    <button className={styles.emptyAdd} onClick={handleAdd}>+ Add first subject</button>
                  </>
                : <div className={styles.emptyHint}>No subjects match your filter</div>
              }
            </div>
          )}
          {filtered.map((s) => (
            <SubjectRow
              key={s.id}
              subject={s}
              active={s.id === selectedId}
              onClick={() => setSelectedId(s.id)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className={styles.detailPanel}>
        {selected
          ? <SubjectDetail subject={selected} onDelete={handleDelete} />
          : (
            <div className={styles.detailEmpty}>
              <div className={styles.emptyIcon}>👈</div>
              <div className={styles.emptyText}>Select a subject</div>
              <div className={styles.emptyHint}>or add a new one to get started</div>
            </div>
          )
        }
      </div>
    </div>
  )
}
