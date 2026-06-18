import { useState, useRef } from 'react'
import useStore from '../../store/useStore'
import { NODE_TYPE_CONFIG, PALETTE_GROUPS } from '../../config/nodeTypes'
import styles from './SourcesView.module.css'

const FORMAT_ICONS = { txt: '📄', csv: '📊', json: '📋', tsv: '📊', log: '📜', default: '📄' }
const SPLIT_OPTIONS = [
  { value: 'line',  label: 'One record per line' },
  { value: 'csv',   label: 'CSV (first row = headers)' },
  { value: 'tsv',   label: 'TSV (tab-separated)' },
  { value: 'json',  label: 'JSON array' },
]

export default function SourcesView({ onOpenProposals }) {
  const sourceFiles    = useStore((s) => s.sourceFiles)
  const extractors     = useStore((s) => s.extractors)
  const proposals      = useStore((s) => s.proposals)
  const isRunning      = useStore((s) => s.isRunning)
  const runLog         = useStore((s) => s.runLog)
  const uploadSourceFile   = useStore((s) => s.uploadSourceFile)
  const registerServerPath = useStore((s) => s.registerServerPath)
  const deleteSourceFile   = useStore((s) => s.deleteSourceFile)
  const saveExtractor      = useStore((s) => s.saveExtractor)
  const deleteExtractor    = useStore((s) => s.deleteExtractor)
  const runExtractors      = useStore((s) => s.runExtractors)

  const [selectedSources, setSelectedSources]     = useState(new Set())
  const [selectedExtractors, setSelectedExtractors] = useState(new Set())
  const [editingExt, setEditingExt]               = useState(null) // null | 'new' | extractor obj
  const [pathInput, setPathInput]                 = useState('')
  const [showPathInput, setShowPathInput]         = useState(false)
  const fileInputRef = useRef()

  // ── source selection helpers ────────────────────────────────────────────────
  const toggleSource = (id) => setSelectedSources((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const toggleExtractor = (id) => setSelectedExtractors((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const allSourcesSelected = sourceFiles.length > 0 && selectedSources.size === sourceFiles.length
  const allExtractorsSelected = extractors.length > 0 && selectedExtractors.size === extractors.length

  // ── file upload ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      await uploadSourceFile(file)
    }
    e.target.value = ''
  }

  // ── run ──────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    const srcIds = selectedSources.size > 0 ? [...selectedSources] : 'all'
    const extIds = selectedExtractors.size > 0 ? [...selectedExtractors] : 'all'
    await runExtractors(extIds, srcIds)
    if (proposals.length > 0 || true) onOpenProposals()
  }

  const pendingCount = proposals.filter((p) => p.status === 'pending').length

  return (
    <div className={styles.view}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Intelligence Sources</h2>
          <p className={styles.subtitle}>Load files, define extractors, run the pipeline — review proposals before importing to canvas</p>
        </div>
        <div className={styles.headerActions}>
          {proposals.length > 0 && (
            <button className={styles.proposalsBtn} onClick={onOpenProposals}>
              Review {pendingCount} proposal{pendingCount !== 1 ? 's' : ''} →
            </button>
          )}
          <button
            className={styles.runBtn}
            onClick={handleRun}
            disabled={isRunning || extractors.length === 0 || sourceFiles.length === 0}
          >
            {isRunning ? '⏳ Running…' : '▶ Run Pipeline'}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* ── Source Files panel ────────────────────────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Source Files</span>
            <span className={styles.panelCount}>{sourceFiles.length}</span>
            <div className={styles.panelActions}>
              <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()} title="Upload files">↑ Upload</button>
              <button className={styles.actionBtn} onClick={() => setShowPathInput((v) => !v)} title="Register server path">⌂ Path</button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />

          {showPathInput && (
            <div className={styles.pathInputRow}>
              <input
                className={styles.pathInput}
                placeholder="/mnt/data/suspects.csv or /cases/files/"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pathInput.trim()) {
                    registerServerPath(pathInput.trim())
                    setPathInput('')
                    setShowPathInput(false)
                  }
                  if (e.key === 'Escape') setShowPathInput(false)
                }}
              />
              <button className={styles.actionBtn} onClick={() => {
                if (pathInput.trim()) { registerServerPath(pathInput.trim()); setPathInput(''); setShowPathInput(false) }
              }}>Add</button>
            </div>
          )}

          {sourceFiles.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📂</div>
              <p>Upload files or register a server path</p>
              <p className={styles.emptyHint}>Supports .txt, .csv, .tsv, .json, .log</p>
            </div>
          ) : (
            <div className={styles.list}>
              <div className={styles.selectAll}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={allSourcesSelected}
                    onChange={() => setSelectedSources(allSourcesSelected ? new Set() : new Set(sourceFiles.map((s) => s.id)))} />
                  Select all
                </label>
              </div>
              {sourceFiles.map((sf) => (
                <div key={sf.id} className={`${styles.fileCard} ${selectedSources.has(sf.id) ? styles.cardSelected : ''}`}
                  onClick={() => toggleSource(sf.id)}>
                  <span className={styles.fileIcon}>{FORMAT_ICONS[sf.format] ?? FORMAT_ICONS.default}</span>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{sf.name}</span>
                    <span className={styles.fileMeta}>
                      {sf.isServerPath ? '⌂ server path' : formatBytes(sf.size)} · .{sf.format}
                    </span>
                  </div>
                  <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); deleteSourceFile(sf.id) }} title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Extractors panel ──────────────────────────────────────────── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Extractors</span>
            <span className={styles.panelCount}>{extractors.length}</span>
            <div className={styles.panelActions}>
              <button className={styles.actionBtn} onClick={() => setEditingExt('new')}>+ New</button>
            </div>
          </div>

          {extractors.length === 0 && editingExt !== 'new' ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚙️</div>
              <p>No extractors yet</p>
              <p className={styles.emptyHint}>An extractor defines how to parse a source and what node type to create</p>
              <button className={styles.emptyBtn} onClick={() => setEditingExt('new')}>Create first extractor</button>
            </div>
          ) : (
            <div className={styles.list}>
              {extractors.length > 0 && (
                <div className={styles.selectAll}>
                  <label className={styles.checkLabel}>
                    <input type="checkbox" checked={allExtractorsSelected}
                      onChange={() => setSelectedExtractors(allExtractorsSelected ? new Set() : new Set(extractors.map((e) => e.id)))} />
                    Select all
                  </label>
                </div>
              )}
              {extractors.map((ext) => (
                editingExt?.id === ext.id ? (
                  <ExtractorForm key={ext.id} initial={ext}
                    onSave={async (data) => { await saveExtractor({ ...data, id: ext.id }); setEditingExt(null) }}
                    onCancel={() => setEditingExt(null)} />
                ) : (
                  <div key={ext.id} className={`${styles.extCard} ${selectedExtractors.has(ext.id) ? styles.cardSelected : ''}`}
                    onClick={() => toggleExtractor(ext.id)}>
                    <div className={styles.extCardTop}>
                      <NodeTypeBadge type={ext.primaryNodeType} />
                      <span className={styles.extName}>{ext.name}</span>
                      <div className={styles.extMeta}>
                        {ext.command ? <span className={styles.tag}>shell</span> : <span className={styles.tag}>direct</span>}
                        <span className={styles.tag}>{ext.splitBy}</span>
                        {ext.autoDetect && <span className={`${styles.tag} ${styles.tagGreen}`}>auto-detect</span>}
                      </div>
                      <div className={styles.extActions}>
                        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); setEditingExt(ext) }} title="Edit">✏️</button>
                        <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); deleteExtractor(ext.id) }} title="Delete">🗑</button>
                      </div>
                    </div>
                    {ext.command && (
                      <code className={styles.cmdPreview}>{ext.command}</code>
                    )}
                  </div>
                )
              ))}
            </div>
          )}

          {editingExt === 'new' && (
            <ExtractorForm initial={null}
              onSave={async (data) => { await saveExtractor(data); setEditingExt(null) }}
              onCancel={() => setEditingExt(null)} />
          )}
        </section>

        {/* ── Run log panel ─────────────────────────────────────────────── */}
        {(isRunning || runLog.length > 0) && (
          <section className={`${styles.panel} ${styles.logPanel}`}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Run Log</span>
              {isRunning && <span className={styles.runningDot} />}
            </div>
            <div className={styles.log}>
              {runLog.map((entry, i) => (
                <div key={i} className={`${styles.logLine} ${styles[`log_${entry.level}`]}`}>
                  <span className={styles.logBullet}>{entry.level === 'error' ? '✕' : entry.level === 'warn' ? '⚠' : '›'}</span>
                  {entry.msg}
                </div>
              ))}
              {isRunning && <div className={styles.logLine}><span className={styles.logBullet}>⏳</span>Running…</div>}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function ExtractorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    primaryNodeType: initial?.primaryNodeType ?? 'person',
    splitBy: initial?.splitBy ?? 'line',
    command: initial?.command ?? '',
    autoDetect: initial?.autoDetect ?? true,
  })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div className={styles.form}>
      <div className={styles.formTitle}>{initial ? 'Edit Extractor' : 'New Extractor'}</div>

      <label className={styles.fieldLabel}>Name</label>
      <input className={styles.input} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Email grep, Person list…" />

      <label className={styles.fieldLabel}>Primary node type</label>
      <div className={styles.typeGrid}>
        {PALETTE_GROUPS.flatMap((group) =>
          Object.entries(NODE_TYPE_CONFIG)
            .filter(([, cfg]) => cfg.group === group)
            .map(([key, cfg]) => (
              <button
                key={key}
                className={`${styles.typeBtn} ${form.primaryNodeType === key ? styles.typeBtnActive : ''}`}
                style={{ '--col': cfg.color, '--brd': cfg.border }}
                onClick={() => set({ primaryNodeType: key })}
                title={cfg.label}
              >
                <span>{cfg.icon}</span>
                <span className={styles.typeBtnLabel}>{cfg.label}</span>
              </button>
            ))
        )}
      </div>

      <label className={styles.fieldLabel}>Split source by</label>
      <div className={styles.splitRow}>
        {SPLIT_OPTIONS.map((opt) => (
          <button key={opt.value}
            className={`${styles.splitBtn} ${form.splitBy === opt.value ? styles.splitBtnActive : ''}`}
            onClick={() => set({ splitBy: opt.value })}>
            {opt.label}
          </button>
        ))}
      </div>

      <label className={styles.fieldLabel}>Shell command <span className={styles.optional}>(optional — leave empty to read file directly)</span></label>
      <input className={styles.input} value={form.command}
        onChange={(e) => set({ command: e.target.value })}
        placeholder="grep -Eo '[a-z0-9.]+@[a-z0-9.]+\.[a-z]{2,}' {file}" />
      <p className={styles.hint}>Use <code>{'{file}'}</code> for the source path. Runs in bash.</p>

      <label className={styles.checkLabel} style={{ marginTop: 6 }}>
        <input type="checkbox" checked={form.autoDetect} onChange={(e) => set({ autoDetect: e.target.checked })} />
        Auto-detect secondary entities (email, IP, phone, domain, hashes…)
      </label>

      <div className={styles.formActions}>
        <button className={styles.saveBtn} disabled={!form.name.trim()} onClick={() => onSave(form)}>Save</button>
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function NodeTypeBadge({ type }) {
  const cfg = NODE_TYPE_CONFIG[type]
  if (!cfg) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 5, padding: '1px 6px', fontSize: 10, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
