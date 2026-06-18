import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import LZString from 'lz-string'
import Toolbar from './components/Toolbar'
import NodePalette from './components/NodePalette'
import Canvas from './components/Canvas'
import NodeProperties from './components/NodeProperties'
import StatsBar from './components/StatsBar'
import ToastContainer from './components/Toast'
import useStore from './store/useStore'
import styles from './App.module.css'

export default function App() {
  const exportRef = useRef(null)
  const importJSON = useStore((s) => s.importJSON)
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [propsOpen, setPropsOpen] = useState(true)

  // Auto-open props panel when a node is selected
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  useEffect(() => { if (selectedNodeId) setPropsOpen(true) }, [selectedNodeId])

  // Load from shared URL on mount
  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/^#share=(.+)$/)
    if (match) {
      try {
        const data = LZString.decompressFromEncodedURIComponent(match[1])
        if (data) { importJSON(data); window.location.hash = '' }
      } catch { /* ignore bad hash */ }
    }
  }, [])

  return (
    <ReactFlowProvider>
      <div className={styles.layout}>
        <Toolbar
          onExportPng={() => exportRef.current?.()}
          canvasRef={exportRef}
          paletteOpen={paletteOpen}
          propsOpen={propsOpen}
          onTogglePalette={() => setPaletteOpen((v) => !v)}
          onToggleProps={() => setPropsOpen((v) => !v)}
        />
        <div className={styles.main}>
          <div className={`${styles.panel} ${paletteOpen ? styles.panelOpen : styles.panelClosed}`}>
            <NodePalette />
          </div>
          <Canvas exportRef={exportRef} />
          <div className={`${styles.panel} ${propsOpen ? styles.panelOpen : styles.panelClosed}`}>
            <NodeProperties />
          </div>
        </div>
        <StatsBar />
      </div>
      <ToastContainer />
    </ReactFlowProvider>
  )
}
