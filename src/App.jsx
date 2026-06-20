import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import LZString from 'lz-string'
import Toolbar from './components/Toolbar'
import Canvas from './components/Canvas'
import NodeProperties from './components/NodeProperties'
import StatsBar from './components/StatsBar'
import ToastContainer from './components/Toast'
import CaseDashboard from './components/CaseDashboard'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import NoteEditor from './components/NoteEditor'
import Timeline from './components/Timeline'
import SourcesView from './components/SourcesView'
import ProposalPanel from './components/ProposalPanel'
import useStore from './store/useStore'
import styles from './App.module.css'

const AUTOSAVE_DELAY = 3000

function WorkspaceView({ theme, onToggleTheme }) {
  const exportRef = useRef(null)
  const [propsOpen, setPropsOpen] = useState(true)
  const [proposalsOpen, setProposalsOpen] = useState(false)
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const activeView = useStore((s) => s.activeView)
  const activeNoteId = useStore((s) => s.activeNoteId)
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const isDirty = useStore((s) => s.isDirty)
  const activeCaseId = useStore((s) => s.activeCaseId)
  const saveCase = useStore((s) => s.saveCase)

  useEffect(() => { if (selectedNodeId) setPropsOpen(true) }, [selectedNodeId])

  // Auto-save 3s after last change, but only when a case is open and canvas is dirty
  useEffect(() => {
    if (!activeCaseId || !isDirty) return
    const t = setTimeout(() => saveCase(), AUTOSAVE_DELAY)
    return () => clearTimeout(t)
  }, [nodes, edges, isDirty, activeCaseId])

  const isSourcesView = activeView === 'sources'

  return (
    <div className={styles.layout}>
      <Toolbar
        onExportPng={() => exportRef.current?.()}
        canvasRef={exportRef}
        propsOpen={propsOpen}
        onToggleProps={() => setPropsOpen((v) => !v)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <div className={styles.main}>
        <WorkspaceSidebar />
        <div className={styles.center}>
          {activeView === 'note' ? (
            <NoteEditor noteId={activeNoteId} />
          ) : activeView === 'timeline' ? (
            <Timeline />
          ) : activeView === 'sources' ? (
            <SourcesView onOpenProposals={() => setProposalsOpen(true)} />
          ) : (
            <Canvas exportRef={exportRef} />
          )}
        </div>
        {!isSourcesView && (
          <div className={`${styles.panel} ${propsOpen ? styles.panelOpen : styles.panelClosed}`}>
            <NodeProperties />
          </div>
        )}
      </div>
      <StatsBar />
      {proposalsOpen && (
        <ProposalPanel onClose={() => setProposalsOpen(false)} />
      )}
    </div>
  )
}

export default function App() {
  const activeView = useStore((s) => s.activeView)
  const importJSON = useStore((s) => s.importJSON)
  const loadCases = useStore((s) => s.loadCases)

  // Theme — persisted to localStorage, applied to <html>
  const [theme, setTheme] = useState(() => localStorage.getItem('osint-theme') ?? 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('osint-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  useEffect(() => {
    loadCases()
    const hash = window.location.hash
    const match = hash.match(/^#share=(.+)$/)
    if (match) {
      try {
        const data = LZString.decompressFromEncodedURIComponent(match[1])
        if (data) { importJSON(data); window.location.hash = '' }
      } catch { /* ignore */ }
    }
  }, [])

  if (activeView === 'dashboard') {
    return (
      <>
        <CaseDashboard theme={theme} onToggleTheme={toggleTheme} />
        <ToastContainer />
      </>
    )
  }

  return (
    <ReactFlowProvider>
      <WorkspaceView theme={theme} onToggleTheme={toggleTheme} />
      <ToastContainer />
    </ReactFlowProvider>
  )
}
