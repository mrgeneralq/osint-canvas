import { useCallback, useRef, useState, useEffect } from 'react'
import { Handle, Position, NodeToolbar } from '@xyflow/react'
import { NODE_TYPE_CONFIG, CONFIDENCE_LEVELS } from '../../config/nodeTypes'
import { METHOD_TECHNIQUES } from '../../config/methodTypes'
import useStore from '../../store/useStore'
import styles from './OsintNode.module.css'

const CONF_CYCLE = ['unverified', 'probable', 'confirmed']

// ── Helpers ──────────────────────────────────────────────────────────────────

function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return ''
  return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))
}

function relativeTime(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diff)) return null
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const PLATFORMS = [
  { name: 'Twitter / X', color: '#000',    re: /twitter\.com|x\.com/i,           icon: '𝕏' },
  { name: 'Instagram',   color: '#C13584', re: /instagram\.com/i,                 icon: '📸' },
  { name: 'LinkedIn',    color: '#0077B5', re: /linkedin\.com/i,                  icon: 'in' },
  { name: 'Facebook',    color: '#1877F2', re: /facebook\.com/i,                  icon: 'f' },
  { name: 'TikTok',      color: '#010101', re: /tiktok\.com/i,                    icon: '♪' },
  { name: 'Telegram',    color: '#2AABEE', re: /t\.me|telegram\.org|telegram/i,   icon: '✈' },
  { name: 'Discord',     color: '#5865F2', re: /discord\.(com|gg)/i,              icon: '◆' },
  { name: 'Reddit',      color: '#FF4500', re: /reddit\.com/i,                    icon: '👾' },
  { name: 'GitHub',      color: '#e0e0e0', re: /github\.com/i,                    icon: '⌥' },
  { name: 'YouTube',     color: '#FF0000', re: /youtube\.com|youtu\.be/i,         icon: '▶' },
  { name: 'Snapchat',    color: '#FFFC00', re: /snapchat\.com/i,                  icon: '👻' },
  { name: 'Pinterest',   color: '#E60023', re: /pinterest\.com/i,                 icon: '📌' },
  { name: 'Twitch',      color: '#9146FF', re: /twitch\.tv/i,                     icon: '🎮' },
  { name: 'VK',          color: '#4C75A3', re: /vk\.com/i,                        icon: 'vk' },
]

function detectPlatform(value) {
  if (!value) return null
  return PLATFORMS.find(p => p.re.test(value)) ?? null
}

function detectChain(address) {
  if (!address) return null
  if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { chain: 'Ethereum', symbol: 'ETH', color: '#627EEA' }
  if (/^(bc1)[a-z0-9]{39,59}$/.test(address))  return { chain: 'Bitcoin', symbol: 'BTC', color: '#F7931A' }
  if (/^[13][a-zA-Z0-9]{25,34}$/.test(address)) return { chain: 'Bitcoin', symbol: 'BTC', color: '#F7931A' }
  if (/^T[a-zA-Z0-9]{33}$/.test(address))       return { chain: 'Tron',    symbol: 'TRX', color: '#E50915' }
  if (/^L[a-zA-Z0-9]{33}$/.test(address))       return { chain: 'Litecoin',symbol: 'LTC', color: '#BFBBBB' }
  if (/^X[a-zA-Z0-9]{33}$/.test(address))       return { chain: 'XRP',     symbol: 'XRP', color: '#00AAE4' }
  return null
}

const PHONE_PREFIXES = [
  ['+1',   '🇺🇸', 'US / CA'],  ['+7',   '🇷🇺', 'Russia'],
  ['+31',  '🇳🇱', 'Netherlands'], ['+32', '🇧🇪', 'Belgium'],
  ['+33',  '🇫🇷', 'France'],   ['+34',  '🇪🇸', 'Spain'],
  ['+39',  '🇮🇹', 'Italy'],    ['+44',  '🇬🇧', 'UK'],
  ['+45',  '🇩🇰', 'Denmark'],  ['+46',  '🇸🇪', 'Sweden'],
  ['+47',  '🇳🇴', 'Norway'],   ['+49',  '🇩🇪', 'Germany'],
  ['+52',  '🇲🇽', 'Mexico'],   ['+55',  '🇧🇷', 'Brazil'],
  ['+61',  '🇦🇺', 'Australia'], ['+64', '🇳🇿', 'New Zealand'],
  ['+81',  '🇯🇵', 'Japan'],    ['+82',  '🇰🇷', 'South Korea'],
  ['+86',  '🇨🇳', 'China'],    ['+90',  '🇹🇷', 'Turkey'],
  ['+91',  '🇮🇳', 'India'],    ['+92',  '🇵🇰', 'Pakistan'],
  ['+971', '🇦🇪', 'UAE'],      ['+972', '🇮🇱', 'Israel'],
  ['+380', '🇺🇦', 'Ukraine'],  ['+48',  '🇵🇱', 'Poland'],
]
function detectPhoneCountry(phone) {
  const digits = phone?.replace(/[\s\-().]/g, '') ?? ''
  // Sort by length desc for longest-prefix match
  const sorted = [...PHONE_PREFIXES].sort((a, b) => b[0].length - a[0].length)
  return sorted.find(([prefix]) => digits.startsWith(prefix)) ?? null
}

// IP geo cache
const geoCache = new Map()
async function fetchGeo(ip) {
  if (geoCache.has(ip)) return geoCache.get(ip)
  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,city,isp,org`)
    const d = await r.json()
    if (d.status === 'success') { geoCache.set(ip, d); return d }
  } catch {}
  return null
}

function extractDomain(value) {
  try { return new URL(value.startsWith('http') ? value : 'https://' + value).hostname } catch { return value }
}

// Simple markdown renderer (no library)
function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className={styles.markdown}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />
        const isH1 = line.startsWith('# ')
        const isH2 = line.startsWith('## ')
        const isBullet = /^[-*] /.test(line)
        const content = isH1 ? line.slice(2) : isH2 ? line.slice(3) : isBullet ? line.slice(2) : line
        const formatted = inlineFormat(content)
        if (isH1) return <strong key={i} className={styles.mdH1}>{formatted}</strong>
        if (isH2) return <span key={i} className={styles.mdH2}>{formatted}</span>
        if (isBullet) return <div key={i} className={styles.mdBullet}>· {formatted}</div>
        return <div key={i}>{formatted}</div>
      })}
    </div>
  )
}

function inlineFormat(text) {
  // Split on **bold**, *italic*, `code`
  const parts = []
  let remaining = text
  let key = 0
  const patterns = [
    { re: /\*\*(.+?)\*\*/, tag: 'b' },
    { re: /\*(.+?)\*/, tag: 'i' },
    { re: /`(.+?)`/, tag: 'code' },
  ]
  while (remaining.length) {
    let earliest = null
    for (const { re, tag } of patterns) {
      const m = re.exec(remaining)
      if (m && (!earliest || m.index < earliest.index)) earliest = { ...m, tag }
    }
    if (!earliest) { parts.push(remaining); break }
    if (earliest.index > 0) parts.push(remaining.slice(0, earliest.index))
    const Tag = earliest.tag
    parts.push(<Tag key={key++}>{earliest[1]}</Tag>)
    remaining = remaining.slice(earliest.index + earliest[0].length)
  }
  return parts
}

// ── Type-specific node bodies ─────────────────────────────────────────────────

function ImageBody({ data, update }) {
  const [lightbox, setLightbox] = useState(false)
  const fileRef = useRef()
  const [imgError, setImgError] = useState(false)
  return (
    <>
      {data.imageUrl && !imgError ? (
        <>
          <img
            className={styles.image}
            src={data.imageUrl}
            alt="evidence"
            onError={() => setImgError(true)}
            onClick={() => setLightbox(true)}
            title="Click to enlarge"
            style={{ cursor: 'zoom-in' }}
          />
          {lightbox && (
            <div className={styles.lightbox} onClick={() => setLightbox(false)}>
              <img src={data.imageUrl} alt="evidence" className={styles.lightboxImg} />
              <span className={styles.lightboxClose}>✕</span>
            </div>
          )}
        </>
      ) : (
        <div className={styles.imageDrop} onClick={() => fileRef.current?.click()}>
          <span>🖼 Drop image or click to upload</span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return
              const reader = new FileReader()
              reader.onload = (ev) => { update({ imageUrl: ev.target.result }); setImgError(false) }
              reader.readAsDataURL(file)
            }}
          />
        </div>
      )}
    </>
  )
}

function PersonBody({ data, update }) {
  const fileRef = useRef()
  return (
    <div className={styles.personWrap}>
      <div className={styles.avatarWrap} onClick={() => fileRef.current?.click()} title="Click to set photo">
        {data.imageUrl ? (
          <img className={styles.avatar} src={data.imageUrl} alt="avatar" onError={(e) => { update({ imageUrl: '' }) }} />
        ) : (
          <div className={styles.avatarPlaceholder}>📷</div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]; if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => update({ imageUrl: ev.target.result })
            reader.readAsDataURL(file)
          }}
        />
      </div>
      <div className={styles.personInfo}>
        <input
          className={styles.inlineInput}
          value={data.value || ''}
          onChange={(e) => update({ value: e.target.value })}
          placeholder="Full name…"
          onMouseDown={(e) => e.stopPropagation()}
        />
        {data.note && <div className={styles.personNote}>{data.note.split('\n')[0]}</div>}
      </div>
    </div>
  )
}

function SocialBody({ data, update }) {
  const platform = detectPlatform(data.value)
  return (
    <div className={styles.socialWrap}>
      {platform && (
        <span className={styles.platformBadge} style={{ background: platform.color, color: platform.color === '#FFFC00' ? '#000' : '#fff' }}>
          {platform.icon} {platform.name}
        </span>
      )}
      <input
        className={styles.inlineInput}
        value={data.value || ''}
        onChange={(e) => update({ value: e.target.value })}
        placeholder="URL or @handle…"
        onMouseDown={(e) => e.stopPropagation()}
      />
      {data.value?.startsWith('http') && (
        <a href={data.value} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          Open profile ↗
        </a>
      )}
    </div>
  )
}

function IpBody({ data, update }) {
  const [geo, setGeo] = useState(null)
  const [loading, setLoading] = useState(false)
  const ip = data.value?.trim()

  useEffect(() => {
    if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$|^[a-fA-F0-9:]+$/.test(ip)) return
    if (geoCache.has(ip)) { setGeo(geoCache.get(ip)); return }
    setLoading(true)
    fetchGeo(ip).then(d => { setGeo(d); setLoading(false) })
  }, [ip])

  return (
    <div className={styles.ipWrap}>
      <input
        className={styles.inlineInput}
        value={data.value || ''}
        onChange={(e) => update({ value: e.target.value })}
        placeholder="IP address or domain…"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ fontFamily: 'monospace' }}
      />
      {loading && <div className={styles.geoLoading}>Looking up…</div>}
      {geo && (
        <div className={styles.geoInfo}>
          <span className={styles.geoFlag}>{flagEmoji(geo.countryCode)}</span>
          <div>
            <div className={styles.geoCountry}>{geo.city ? `${geo.city}, ` : ''}{geo.country}</div>
            <div className={styles.geoIsp}>{geo.isp || geo.org}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function UrlBody({ data, update }) {
  const domain = extractDomain(data.value ?? '')
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null
  return (
    <div className={styles.urlWrap}>
      <div className={styles.urlRow}>
        {faviconUrl && <img className={styles.favicon} src={faviconUrl} alt="" onError={(e) => e.target.style.display='none'} />}
        <input
          className={styles.inlineInput}
          value={data.value || ''}
          onChange={(e) => update({ value: e.target.value })}
          placeholder="https://…"
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      {data.value?.startsWith('http') && (
        <a href={data.value} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
          Open ↗
        </a>
      )}
    </div>
  )
}

function EmailBody({ data, update }) {
  const domain = data.value?.split('@')[1] ?? ''
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(data.value ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className={styles.emailWrap}>
      <div className={styles.emailRow}>
        {faviconUrl && <img className={styles.favicon} src={faviconUrl} alt="" onError={(e) => e.target.style.display='none'} />}
        <input
          className={styles.inlineInput}
          value={data.value || ''}
          onChange={(e) => update({ value: e.target.value })}
          placeholder="user@example.com"
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button className={styles.copyBtn} onClick={copy} title="Copy to clipboard">{copied ? '✓' : '📋'}</button>
      </div>
    </div>
  )
}

function PhoneBody({ data, update }) {
  const match = detectPhoneCountry(data.value ?? '')
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(data.value ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className={styles.phoneWrap}>
      <div className={styles.phoneRow}>
        {match && <span className={styles.phoneFlag}>{match[1]}</span>}
        <input
          className={styles.inlineInput}
          value={data.value || ''}
          onChange={(e) => update({ value: e.target.value })}
          placeholder="+1 555 000 0000"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ fontFamily: 'monospace' }}
        />
        <button className={styles.copyBtn} onClick={copy} title="Copy to clipboard">{copied ? '✓' : '📋'}</button>
      </div>
      {match && <div className={styles.phoneCountry}>{match[2]}</div>}
    </div>
  )
}

function CryptoBody({ data, update }) {
  const chain = detectChain(data.value?.trim())
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(data.value ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className={styles.cryptoWrap}>
      {chain && (
        <span className={styles.chainBadge} style={{ borderColor: chain.color, color: chain.color }}>
          {chain.symbol} · {chain.chain}
        </span>
      )}
      <div className={styles.cryptoAddr}>
        <input
          className={styles.inlineInput}
          value={data.value || ''}
          onChange={(e) => update({ value: e.target.value })}
          placeholder="Wallet address…"
          onMouseDown={(e) => e.stopPropagation()}
          style={{ fontFamily: 'monospace', fontSize: '10px' }}
        />
        <button className={styles.copyBtn} onClick={copy} title="Copy address">{copied ? '✓' : '📋'}</button>
      </div>
    </div>
  )
}

function NoteBody({ data, update }) {
  const [editing, setEditing] = useState(false)
  return editing ? (
    <textarea
      className={styles.noteTextarea}
      value={data.value}
      onChange={(e) => update({ value: e.target.value })}
      onBlur={() => setEditing(false)}
      autoFocus
      rows={5}
      onMouseDown={(e) => e.stopPropagation()}
    />
  ) : (
    <div className={styles.notePreview} onClick={() => setEditing(true)} title="Click to edit">
      {data.value ? <Markdown text={data.value} /> : <span className={styles.notePlaceholder}>Click to write notes…</span>}
    </div>
  )
}

function EventBody({ data, update }) {
  const rel = relativeTime(data.value || data.dateAdded)
  return (
    <div className={styles.eventWrap}>
      <input
        className={styles.inlineInput}
        value={data.value || ''}
        onChange={(e) => update({ value: e.target.value })}
        placeholder="Date or event description…"
        onMouseDown={(e) => e.stopPropagation()}
      />
      {rel && <div className={styles.eventRel}>{rel}</div>}
    </div>
  )
}

const OUTPUT_NODE_TYPES = [
  { type: 'phone',        label: '📱 Phone' },
  { type: 'email',        label: '📧 Email' },
  { type: 'person',       label: '👤 Person' },
  { type: 'address',      label: '📍 Address' },
  { type: 'social',       label: '🌐 Social Profile' },
  { type: 'url',          label: '🔗 URL' },
  { type: 'ip',           label: '🖥 IP / Domain' },
  { type: 'document',     label: '📄 Document' },
  { type: 'image',        label: '🖼 Image' },
  { type: 'note',         label: '📝 Note' },
  { type: 'crypto',       label: '₿ Crypto Wallet' },
  { type: 'organization', label: '🏢 Organization' },
]

function MethodBody({ data, update, nodeId }) {
  const addConnectedNode = useStore((s) => s.addConnectedNode)
  const technique = METHOD_TECHNIQUES[data.value] ?? null
  const [showOutputPicker, setShowOutputPicker] = useState(false)

  return (
    <div className={styles.methodWrap}>
      <select
        className={styles.methodSelect}
        value={data.value || ''}
        onChange={(e) => update({ value: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <option value="">— Select technique —</option>
        {Object.entries(METHOD_TECHNIQUES).map(([key, t]) => (
          <option key={key} value={key}>{t.icon} {t.label}</option>
        ))}
      </select>
      {technique && <div className={styles.methodDesc}>{technique.desc}</div>}

      <div className={styles.methodIOBlock}>
        <span className={styles.methodIOLabel}>📥 Input used</span>
        <textarea
          className={styles.methodNote}
          value={data.sourceUrl || ''}
          onChange={(e) => update({ sourceUrl: e.target.value })}
          placeholder="e.g. email: john@example.com"
          rows={2}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      <div className={styles.methodArrow}>↓ revealed</div>

      {showOutputPicker ? (
        <div className={styles.outputPicker} onMouseDown={(e) => e.stopPropagation()}>
          {OUTPUT_NODE_TYPES.map(({ type, label }) => (
            <button
              key={type}
              className={styles.outputPickerBtn}
              onClick={(e) => {
                e.stopPropagation()
                addConnectedNode(nodeId, type, 'leads_to')
                setShowOutputPicker(false)
              }}
            >
              {label}
            </button>
          ))}
          <button className={styles.outputPickerCancel} onClick={(e) => { e.stopPropagation(); setShowOutputPicker(false) }}>Cancel</button>
        </div>
      ) : (
        <button
          className={styles.addOutputBtn}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowOutputPicker(true) }}
        >
          ➕ Add output node
        </button>
      )}
    </div>
  )
}

function DefaultBody({ data, update, cfg }) {
  return (
    <textarea
      className={styles.valueInput}
      value={data.value}
      onChange={(e) => update({ value: e.target.value })}
      placeholder={`${cfg.label}…`}
      rows={2}
      onMouseDown={(e) => e.stopPropagation()}
    />
  )
}

// ── Main node ─────────────────────────────────────────────────────────────────

export default function OsintNode({ id, data, selected }) {
  const cfg = NODE_TYPE_CONFIG[data.nodeType] ?? NODE_TYPE_CONFIG.note
  const confidence = CONFIDENCE_LEVELS[data.confidence] ?? CONFIDENCE_LEVELS.unverified
  const updateNodeData = useStore((s) => s.updateNodeData)
  const deleteNode = useStore((s) => s.deleteNode)
  const duplicateNode = useStore((s) => s.duplicateNode)
  const toggleNodeLock = useStore((s) => s.toggleNodeLock)
  const setSelectedNodeId = useStore((s) => s.setSelectedNodeId)
  const allSources  = useStore((s) => s.sources)
  const nodeSources = allSources.filter((s) => (data.sourceIds ?? []).includes(s.id))
  const allSubjects = useStore((s) => s.subjects)
  const linkedSubjects = allSubjects.filter((sub) => sub.linkedNodeIds?.includes(id))
  const setActiveView  = useStore((s) => s.setActiveView)

  const update = useCallback((patch) => updateNodeData(id, patch), [id, updateNodeData])
  const collapsed = data.collapsed ?? false

  const cycleConfidence = useCallback(() => {
    const idx = CONF_CYCLE.indexOf(data.confidence ?? 'unverified')
    update({ confidence: CONF_CYCLE[(idx + 1) % CONF_CYCLE.length] })
  }, [data.confidence, update])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => update({ imageUrl: ev.target.result, value: file.name })
      reader.readAsDataURL(file)
    }
  }, [update])

  if (collapsed) {
    return (
      <div
        className={`${styles.collapsed} ${selected ? styles.selectedCollapsed : ''}`}
        style={{ '--node-color': cfg.color, '--confidence-color': confidence.color }}
        onClick={() => setSelectedNodeId(id)}
      >
        <Handle type="target" position={Position.Left} className={styles.handle} />
        <span className={styles.collapsedIcon} style={{ background: cfg.color }}>{cfg.icon}</span>
        <span className={styles.collapsedLabel}>{data.value?.slice(0, 24) || cfg.label}</span>
        <button className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); update({ collapsed: false }) }} title="Expand">⤢</button>
        <Handle type="source" position={Position.Right} className={styles.handle} />
      </div>
    )
  }

  function renderBody() {
    switch (data.nodeType) {
      case 'image':   return <ImageBody data={data} update={update} />
      case 'person':  return <PersonBody data={data} update={update} />
      case 'social':  return <SocialBody data={data} update={update} />
      case 'ip':      return <IpBody data={data} update={update} />
      case 'url':     return <UrlBody data={data} update={update} />
      case 'email':   return <EmailBody data={data} update={update} />
      case 'phone':   return <PhoneBody data={data} update={update} />
      case 'crypto':  return <CryptoBody data={data} update={update} />
      case 'note':    return <NoteBody data={data} update={update} />
      case 'event':   return <EventBody data={data} update={update} />
      case 'method':  return <MethodBody data={data} update={update} nodeId={id} />
      default:        return <DefaultBody data={data} update={update} cfg={cfg} />
    }
  }

  return (
    <div
      className={`${styles.node} ${selected ? styles.selected : ''} ${data.locked ? styles.locked : ''}`}
      style={{ '--node-color': cfg.color, '--node-border': cfg.border, '--confidence-color': confidence.color }}
      onClick={() => setSelectedNodeId(id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} offset={6}>
        <div className={styles.floatingBar}>
          <button
            className={styles.fbBtn}
            style={{ color: confidence.color, borderColor: confidence.color + '55' }}
            onClick={cycleConfidence}
            title={`Confidence: ${confidence.label}`}
          >
            <span className={styles.fbDot} style={{ background: confidence.color }} />
            {confidence.label}
          </button>
          <div className={styles.fbSep} />
          <button className={styles.fbBtn} onClick={() => update({ collapsed: true })} title="Collapse node">⤡</button>
          <button className={styles.fbBtn} onClick={() => duplicateNode(id)} title="Duplicate">⧉</button>
          <button
            className={`${styles.fbBtn} ${data.locked ? styles.fbActive : ''}`}
            onClick={() => toggleNodeLock(id)}
            title={data.locked ? 'Unlock' : 'Lock position'}
          >
            {data.locked ? '🔒' : '🔓'}
          </button>
          <div className={styles.fbSep} />
          <button className={`${styles.fbBtn} ${styles.fbDanger}`} onClick={() => deleteNode(id)} title="Delete">✕</button>
        </div>
      </NodeToolbar>

      <div className={styles.confidenceStrip} style={{ background: confidence.color }} />

      <Handle type="target" position={Position.Left} className={styles.handle} />

      <div className={styles.header}>
        <span className={styles.icon} style={{ background: cfg.color }}>{cfg.icon}</span>
        <span className={styles.typeLabel}>{cfg.label}</span>
        {data.locked && <span className={styles.lockBadge}>🔒</span>}
        <span
          className={styles.confidenceBadge}
          style={{ color: confidence.color, borderColor: confidence.color + '44', background: confidence.bg }}
          onClick={cycleConfidence}
          title="Click to cycle confidence"
        >
          {confidence.label}
        </span>
      </div>

      <div className={styles.body}>
        {renderBody()}

        {data.tags && (
          <div className={styles.tagRow}>
            {data.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}

        {nodeSources.length > 0 && (
          <div className={styles.sourceDotsRow}>
            {nodeSources.map((src) => (
              <span key={src.id} className={styles.sourceDot} style={{ background: src.color }} title={src.name} />
            ))}
            <span className={styles.sourceDotsLabel}>
              {nodeSources.map((s) => s.name).join(', ')}
            </span>
          </div>
        )}

        {data.sourceUrl && (
          <div className={styles.sourceRow} title={data.sourceUrl}>
            <span>🔗</span>
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceText}
              onClick={(e) => e.stopPropagation()}>{data.sourceUrl}</a>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className={styles.handle} />
    </div>
  )
}
