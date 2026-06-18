import { useRef, useState, useEffect } from 'react'
import LZString from 'lz-string'
import useStore from '../../store/useStore'
import { toast } from '../../store/toastStore'
import CasePanel from '../CasePanel'
import ReportModal from '../ReportModal'
import CsvImport from '../CsvImport'
import ShortcutsModal from '../ShortcutsModal'
import SnapshotsModal from '../SnapshotsModal'
import ScriptRunner from '../ScriptRunner'
import AiPromptModal from '../AiPromptModal'
import SourcesModal from '../SourcesModal'
import styles from './Toolbar.module.css'

export default function Toolbar({ onExportPng, canvasRef, onToggleProps, propsOpen }) {
  const fileRef = useRef()
  const moreRef = useRef()
  const { exportJSON, importJSON, clearAll, searchTerm, setSearchTerm, caseInfo, undo, redo, saveCase } = useStore()
  const canUndo = useStore((s) => s.historyIndex > 0)
  const canRedo = useStore((s) => s.historyIndex < s.history.length - 1)

  const [showMore, setShowMore] = useState(false)
  const [showCase, setShowCase] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showScripts, setShowScripts] = useState(false)
  const [showAiPrompt, setShowAiPrompt] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const filterSourceId = useStore((s) => s.filterSourceId)
  const setFilterSource = useStore((s) => s.setFilterSource)

  // Close overflow menu on outside click
  useEffect(() => {
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '?') setShowShortcuts(true)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCase() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJSON(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClear = () => {
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) clearAll()
  }

  const handleShare = () => {
    const { nodes, edges, caseInfo } = useStore.getState()
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify({ nodes, edges, caseInfo }))
    const url = `${window.location.origin}${window.location.pathname}#share=${compressed}`
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied to clipboard'))
  }

  const statusColor = { Active: '#22c55e', Pending: '#f59e0b', Cold: '#94a3b8', Closed: '#ef4444' }[caseInfo.status] ?? '#6b7280'

  return (
    <>
      <header className={styles.toolbar}>
        {/* Logo */}
        <span className={styles.logo}>🔍 OSINT</span>
        <div className={styles.sep} />

        {/* Panel toggle */}
        <button className={`${styles.iconBtn} ${propsOpen ? styles.active : ''}`} onClick={onToggleProps} title="Toggle properties panel">
          <PanelRightIcon />
        </button>
        <div className={styles.sep} />

        {/* Undo / redo */}
        <button className={styles.iconBtn} disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          <UndoIcon />
        </button>
        <button className={styles.iconBtn} disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Y)">
          <RedoIcon />
        </button>
        <div className={styles.sep} />

        {/* Case pill */}
        <button className={styles.casePill} onClick={() => setShowCase(true)} title="Edit case info">
          <span className={styles.caseDot} style={{ background: statusColor }} />
          <span className={styles.caseName}>{caseInfo.name}</span>
          <span className={styles.caseStatusTag}>{caseInfo.status}</span>
        </button>

        <div className={styles.sep} />

        {/* Search */}
        <div className={styles.search}>
          <SearchIcon />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search nodes…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className={styles.searchClear} onClick={() => setSearchTerm('')}>✕</button>}
        </div>

        <div className={styles.sep} />

        {/* Primary actions */}
        <button
          className={`${styles.btn} ${filterSourceId ? styles.active : ''}`}
          onClick={() => setShowSources(true)}
          title={filterSourceId ? 'Canvas filtered by source — click to manage' : 'Manage data sources'}
        >
          🗂 Sources{filterSourceId ? ' ●' : ''}
        </button>
        <button className={styles.btn} onClick={() => canvasRef?.autoLayout?.()} title="Auto-arrange nodes">
          ⚙ Layout
        </button>
        <button className={styles.btn} onClick={onExportPng} title="Export high-quality PNG">
          🖼 PNG
        </button>
        <button className={styles.btn} onClick={saveCase} title="Save case to server (Ctrl+S)">
          💾 Save
        </button>
        <button className={styles.btn} onClick={exportJSON} title="Export canvas as JSON file">
          ⬇ Export
        </button>

        {/* More dropdown */}
        <div className={styles.moreWrap} ref={moreRef}>
          <button className={`${styles.btn} ${showMore ? styles.active : ''}`} onClick={() => setShowMore((v) => !v)}>
            More ▾
          </button>
          {showMore && (
            <div className={styles.dropdown}>
              <DropItem icon="⚡" label="Script Runner"      onClick={() => { setShowScripts(true); setShowMore(false) }} />
              <DropItem icon="📥" label="Bulk CSV Import"    onClick={() => { setShowCsv(true); setShowMore(false) }} />
              <DropItem icon="📸" label="Snapshots"          onClick={() => { setShowSnapshots(true); setShowMore(false) }} />
              <DropItem icon="🔗" label="Share via URL"      onClick={() => { handleShare(); setShowMore(false) }} />
              <DropItem icon="📄" label="Generate Report"    onClick={() => { setShowReport(true); setShowMore(false) }} />
              <DropItem icon="📂" label="Import JSON"        onClick={() => { fileRef.current?.click(); setShowMore(false) }} />
              <DropItem icon="🤖" label="AI Import Prompt"  onClick={() => { setShowAiPrompt(true); setShowMore(false) }} />
              <div className={styles.dropSep} />
              <DropItem icon="⌨"  label="Shortcuts  ?"      onClick={() => { setShowShortcuts(true); setShowMore(false) }} />
              <div className={styles.dropSep} />
              <DropItem icon="🗑" label="Clear canvas"       onClick={() => { handleClear(); setShowMore(false) }} danger />
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </header>

      {showCase      && <CasePanel      onClose={() => setShowCase(false)} />}
      {showReport    && <ReportModal    onClose={() => setShowReport(false)} />}
      {showCsv       && <CsvImport      onClose={() => setShowCsv(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showSnapshots && <SnapshotsModal onClose={() => setShowSnapshots(false)} />}
      {showScripts   && <ScriptRunner  onClose={() => setShowScripts(false)} />}
      {showAiPrompt  && <AiPromptModal onClose={() => setShowAiPrompt(false)} />}
      {showSources   && <SourcesModal  onClose={() => setShowSources(false)} />}
    </>
  )
}

function DropItem({ icon, label, onClick, danger }) {
  return (
    <button className={`${styles.dropItem} ${danger ? styles.dropDanger : ''}`} onClick={onClick}>
      <span className={styles.dropIcon}>{icon}</span>
      {label}
    </button>
  )
}

// SVG icons
const PanelLeftIcon  = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="5" y1="1" x2="5" y2="15"/></svg>
const PanelRightIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="11" y1="1" x2="11" y2="15"/></svg>
const UndoIcon  = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7 C3 4 6 2 9 2 C12 2 14 4.5 14 7 C14 9.5 12 12 9 12 L5 12"/><polyline points="3,9 3,7 5,7"/></svg>
const RedoIcon  = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 7 C13 4 10 2 7 2 C4 2 2 4.5 2 7 C2 9.5 4 12 7 12 L11 12"/><polyline points="13,9 13,7 11,7"/></svg>
const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
