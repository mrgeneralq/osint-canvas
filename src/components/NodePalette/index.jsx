import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { NODE_TYPE_CONFIG, PALETTE_GROUPS } from '../../config/nodeTypes'
import useStore from '../../store/useStore'
import styles from './NodePalette.module.css'

export default function NodePalette() {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const addNode = useStore((s) => s.addNode)
  const { getViewport } = useReactFlow()

  const onDragStart = (e, type) => {
    e.dataTransfer.setData('application/osint-node-type', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (type) => {
    // Place at visible center of canvas
    const vp = getViewport()
    const cx = (window.innerWidth / 2 - vp.x) / vp.zoom
    const cy = (window.innerHeight / 2 - vp.y) / vp.zoom
    addNode(type, { x: cx - 110, y: cy - 50 })
  }

  const toggleGroup = (group) => setCollapsed((c) => ({ ...c, [group]: !c[group] }))

  const q = search.toLowerCase()
  const allEntries = Object.entries(NODE_TYPE_CONFIG)
  const filtered = q
    ? allEntries.filter(([type, cfg]) => cfg.label.toLowerCase().includes(q) || type.includes(q))
    : null

  const grouped = PALETTE_GROUPS.map((group) => ({
    group,
    items: (filtered ?? allEntries).filter(([, cfg]) => cfg.group === group),
  })).filter(({ items }) => items.length > 0)

  return (
    <aside className={styles.palette}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes…"
        />
        {search && <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>}
      </div>

      <div className={styles.hint}>Click to add · Drag to place</div>

      <div className={styles.groups}>
        {grouped.map(({ group, items }) => (
          <div key={group} className={styles.group}>
            <button className={styles.groupHeader} onClick={() => toggleGroup(group)}>
              <span className={styles.groupName}>{group}</span>
              <span className={styles.groupChevron}>{collapsed[group] ? '▸' : '▾'}</span>
            </button>
            {!collapsed[group] && (
              <div className={styles.grid}>
                {items.map(([type, cfg]) => (
                  <div
                    key={type}
                    className={styles.tile}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    onClick={() => handleClick(type)}
                    title={`${cfg.label} — click to add, drag to place`}
                    style={{ '--tile-color': cfg.color, '--tile-border': cfg.border }}
                  >
                    <span className={styles.tileIcon}>{cfg.icon}</span>
                    <span className={styles.tileLabel}>{cfg.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
