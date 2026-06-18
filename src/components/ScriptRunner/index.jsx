import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'
import { toast } from '../../store/toastStore'
import styles from './ScriptRunner.module.css'

const API = import.meta.env.VITE_API_URL ?? ''

const SHELL_OPTIONS = [
  { value: 'powershell', label: '⚡ PowerShell' },
  { value: 'python',     label: '🐍 Python' },
  { value: 'bash',       label: '🐚 Bash' },
]

const STARTER_SCRIPTS = [
  {
    name: 'DNS Lookup',
    shell: 'powershell',
    description: 'Resolve a hostname to IPs',
    vars: [{ name: 'TARGET', default: 'example.com', hint: 'hostname or domain' }],
    body: String.raw`$result = Resolve-DnsName -Name $TARGET -ErrorAction SilentlyContinue
if ($result) {
  foreach ($r in $result) {
    if ($r.IPAddress) {
      $obj = @{ type="ip"; value=$r.IPAddress; note="DNS record: $($r.Type) for $TARGET" }
      Write-Output ($obj | ConvertTo-Json -Compress)
    }
  }
} else {
  Write-Output "Could not resolve $TARGET"
}`,
  },
  {
    name: 'Port Scanner',
    shell: 'powershell',
    description: 'Check common ports on a target',
    vars: [{ name: 'TARGET', default: '127.0.0.1', hint: 'IP or hostname' }],
    body: String.raw`$ports = 21,22,23,25,53,80,443,445,3389,8080,8443
foreach ($port in $ports) {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $conn = $tcp.BeginConnect($TARGET, $port, $null, $null)
  $wait = $conn.AsyncWaitHandle.WaitOne(500, $false)
  if ($wait -and !$tcp.Client.Connected -eq $false) {
    try {
      $tcp.EndConnect($conn)
      $obj = @{ type="ip"; value=($TARGET + ':' + $port); note=("Port $port open on $TARGET") }
      Write-Output ($obj | ConvertTo-Json -Compress)
    } catch {}
  }
  $tcp.Close()
}`,
  },
  {
    name: 'Extract Emails from Text',
    shell: 'powershell',
    description: 'Paste raw text, extracts all email addresses',
    vars: [{ name: 'TEXT', default: 'Paste text here...', hint: 'raw text content' }],
    body: String.raw`$text = $TEXT
$found = [regex]::Matches($text, '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
foreach ($m in $found) {
  $obj = @{ type="email"; value=$m.Value; note="Extracted from pasted text" }
  Write-Output ($obj | ConvertTo-Json -Compress)
}`,
  },
  {
    name: 'WhoIs Lookup',
    shell: 'powershell',
    description: 'Fetch WHOIS data for a domain',
    vars: [{ name: 'DOMAIN', default: 'example.com', hint: 'domain name' }],
    body: String.raw`$result = Invoke-WebRequest -Uri "https://rdap.org/domain/$DOMAIN" -UseBasicParsing -ErrorAction SilentlyContinue
if ($result) {
  $data = $result.Content | ConvertFrom-Json
  if ($data.entities) {
    foreach ($e in $data.entities) {
      $name = ($e.vcardArray[1] | Where-Object { $_[0] -eq 'fn' })[2]
      if ($name) {
        $obj = @{ type="person"; value=$name; note="WHOIS contact for $DOMAIN" }
        Write-Output ($obj | ConvertTo-Json -Compress)
      }
    }
  }
  $obj2 = @{ type="url"; value=$DOMAIN; note="WHOIS looked up domain" }
  Write-Output ($obj2 | ConvertTo-Json -Compress)
}`,
  },
]

const emptyScript = { name: '', shell: 'powershell', description: '', vars: [], body: '' }

export default function ScriptRunner({ onClose }) {
  const addNode = useStore((s) => s.addNode)
  const updateNodeData = useStore((s) => s.updateNodeData)

  const [scripts, setScripts] = useState([])
  const [selected, setSelected] = useState(null)   // script being viewed/run
  const [editing, setEditing] = useState(null)      // script being edited
  const [runtimeVars, setRuntimeVars] = useState({})
  const [output, setOutput] = useState([])           // { type, line } log lines
  const [running, setRunning] = useState(false)
  const [resultNodes, setResultNodes] = useState([])
  const outputRef = useRef()

  useEffect(() => { fetchScripts() }, [])
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  async function fetchScripts() {
    try {
      const r = await fetch(`${API}/scripts`)
      const data = await r.json()
      setScripts(data)
    } catch { toast.error('Script Runner server not reachable (port 3001)') }
  }

  async function saveScript() {
    if (!editing.name.trim()) { toast.warn('Script needs a name'); return }
    const method = editing.id ? 'PUT' : 'POST'
    const url = editing.id ? `${API}/scripts/${editing.id}` : `${API}/scripts`
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    const saved = await r.json()
    await fetchScripts()
    setEditing(null)
    setSelected(saved)
    toast.success(`Script "${saved.name}" saved`)
  }

  async function deleteScript(id) {
    await fetch(`${API}/scripts/${id}`, { method: 'DELETE' })
    setScripts((s) => s.filter((x) => x.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.info('Script deleted')
  }

  async function installStarters() {
    for (const s of STARTER_SCRIPTS) {
      await fetch(`${API}/scripts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
    }
    await fetchScripts()
    toast.success('Starter scripts installed')
  }

  async function runScript() {
    if (!selected) return
    setOutput([])
    setResultNodes([])
    setRunning(true)

    try {
      const r = await fetch(`${API}/scripts/${selected.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars: runtimeVars }),
      })

      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const events = buf.split('\n\n')
        buf = events.pop()
        for (const ev of events) {
          const line = ev.replace(/^data: /, '').trim()
          if (!line) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'stdout') setOutput((o) => [...o, { type: 'out', text: msg.line }])
            if (msg.type === 'stderr') setOutput((o) => [...o, { type: 'err', text: msg.line }])
            if (msg.type === 'done') {
              setResultNodes(msg.nodes ?? [])
              if (msg.code !== 0) setOutput((o) => [...o, { type: 'err', text: `Exited with code ${msg.code}` }])
              else setOutput((o) => [...o, { type: 'ok', text: `✓ Done — ${msg.nodes?.length ?? 0} entities found` }])
            }
            if (msg.type === 'error') setOutput((o) => [...o, { type: 'err', text: msg.message }])
          } catch {}
        }
      }
    } catch (e) {
      setOutput((o) => [...o, { type: 'err', text: `Connection failed: ${e.message}` }])
    }
    setRunning(false)
  }

  function importNodes() {
    if (!resultNodes.length) return
    // Create a "run" anchor node
    const runId = useStore.getState().addNode('document', { x: 200, y: 200 })
    setTimeout(() => {
      useStore.getState().updateNodeData(runId, {
        label: 'Script Run',
        value: selected.name,
        note: `Run at ${new Date().toLocaleTimeString()}`,
        confidence: 'unverified',
      })
      // Place result nodes in an arc around the run node
      resultNodes.forEach((n, i) => {
        const angle = (i / resultNodes.length) * 2 * Math.PI - Math.PI / 2
        const r = 260
        const x = 200 + Math.cos(angle) * r
        const y = 200 + Math.sin(angle) * r
        const nid = useStore.getState().addNode(n.type, { x, y })
        setTimeout(() => {
          useStore.getState().updateNodeData(nid, {
            value: n.value,
            note: n.note ?? '',
            confidence: n.confidence ?? 'unverified',
          })
          // Connect to run node
          useStore.getState().onConnect({ source: runId, target: nid, sourceHandle: null, targetHandle: null })
        }, 20)
      })
    }, 20)
    toast.success(`Imported ${resultNodes.length} nodes from "${selected.name}"`)
    onClose()
  }

  function addVar() {
    setEditing((e) => ({ ...e, vars: [...(e.vars ?? []), { name: '', default: '', hint: '' }] }))
  }
  function updateVar(i, field, val) {
    setEditing((e) => {
      const vars = [...e.vars]
      vars[i] = { ...vars[i], [field]: val }
      return { ...e, vars }
    })
  }
  function removeVar(i) {
    setEditing((e) => ({ ...e, vars: e.vars.filter((_, j) => j !== i) }))
  }

  // Init runtime vars when script selected
  function selectScript(s) {
    setSelected(s)
    setEditing(null)
    setOutput([])
    setResultNodes([])
    const defaults = {}
    ;(s.vars ?? []).forEach((v) => { defaults[v.name] = v.default ?? '' })
    setRuntimeVars(defaults)
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>⚡ Script Runner</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Left: script list */}
          <div className={styles.sidebar}>
            <div className={styles.sidebarTop}>
              <button className={styles.newBtn} onClick={() => { setEditing({ ...emptyScript }); setSelected(null) }}>
                + New Script
              </button>
            </div>

            {scripts.length === 0 ? (
              <div className={styles.emptyList}>
                <p>No scripts yet.</p>
                <button className={styles.starterBtn} onClick={installStarters}>
                  Install starter scripts
                </button>
              </div>
            ) : (
              <ul className={styles.scriptList}>
                {scripts.map((s) => (
                  <li
                    key={s.id}
                    className={`${styles.scriptItem} ${selected?.id === s.id ? styles.active : ''}`}
                    onClick={() => selectScript(s)}
                  >
                    <span className={styles.scriptShell}>{s.shell === 'python' ? '🐍' : s.shell === 'bash' ? '🐚' : '⚡'}</span>
                    <div className={styles.scriptMeta}>
                      <span className={styles.scriptName}>{s.name}</span>
                      {s.description && <span className={styles.scriptDesc}>{s.description}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: editor or runner */}
          <div className={styles.main}>
            {editing ? (
              /* ── Editor ── */
              <div className={styles.editor}>
                <div className={styles.editorRow}>
                  <input className={styles.input} placeholder="Script name" value={editing.name}
                    onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} />
                  <select className={styles.select} value={editing.shell}
                    onChange={(e) => setEditing((x) => ({ ...x, shell: e.target.value }))}>
                    {SHELL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <input className={styles.input} placeholder="Short description (optional)"
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing((x) => ({ ...x, description: e.target.value }))} />

                {/* Variables */}
                <div className={styles.varsHeader}>
                  <span className={styles.label}>Runtime variables</span>
                  <button className={styles.addVarBtn} onClick={addVar}>+ Add</button>
                </div>
                {(editing.vars ?? []).map((v, i) => (
                  <div key={i} className={styles.varRow}>
                    <input className={styles.input} placeholder="$VAR_NAME" value={v.name}
                      onChange={(e) => updateVar(i, 'name', e.target.value)} style={{ width: 110 }} />
                    <input className={styles.input} placeholder="default value" value={v.default}
                      onChange={(e) => updateVar(i, 'default', e.target.value)} style={{ flex: 1 }} />
                    <input className={styles.input} placeholder="hint" value={v.hint}
                      onChange={(e) => updateVar(i, 'hint', e.target.value)} style={{ flex: 1 }} />
                    <button className={styles.removeVar} onClick={() => removeVar(i)}>✕</button>
                  </div>
                ))}

                <span className={styles.label}>Script body</span>
                <textarea className={styles.codeArea} value={editing.body}
                  onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))}
                  placeholder={`# Output JSON lines for structured results:\n# {"type":"ip","value":"1.2.3.4","note":"..."}\n# Or plain text — emails, IPs, URLs are auto-extracted`}
                  spellCheck={false}
                />

                <div className={styles.editorActions}>
                  <button className={styles.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
                  <button className={styles.saveBtn} onClick={saveScript}>Save script</button>
                </div>
              </div>
            ) : selected ? (
              /* ── Runner ── */
              <div className={styles.runner}>
                <div className={styles.runnerHeader}>
                  <div>
                    <h2 className={styles.runTitle}>{selected.name}</h2>
                    {selected.description && <p className={styles.runDesc}>{selected.description}</p>}
                  </div>
                  <div className={styles.runnerActions}>
                    <button className={styles.editBtn} onClick={() => setEditing({ ...selected })}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => deleteScript(selected.id)}>Delete</button>
                  </div>
                </div>

                {/* Runtime vars */}
                {(selected.vars ?? []).length > 0 && (
                  <div className={styles.varsSection}>
                    <span className={styles.label}>Variables</span>
                    {selected.vars.map((v) => (
                      <div key={v.name} className={styles.varInputRow}>
                        <span className={styles.varName}>${v.name}</span>
                        <input
                          className={styles.input}
                          placeholder={v.hint || v.default}
                          value={runtimeVars[v.name] ?? v.default ?? ''}
                          onChange={(e) => setRuntimeVars((r) => ({ ...r, [v.name]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button className={`${styles.runBtn} ${running ? styles.runBtnActive : ''}`}
                  onClick={runScript} disabled={running}>
                  {running ? '⏳ Running…' : '▶ Run Script'}
                </button>

                {/* Output log */}
                {output.length > 0 && (
                  <div className={styles.outputWrap} ref={outputRef}>
                    {output.map((line, i) => (
                      <div key={i} className={`${styles.outputLine} ${styles[line.type]}`}>
                        {line.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Results */}
                {resultNodes.length > 0 && (
                  <div className={styles.results}>
                    <div className={styles.resultsHeader}>
                      <span>{resultNodes.length} entities found</span>
                      <button className={styles.importBtn} onClick={importNodes}>
                        ↗ Import to canvas
                      </button>
                    </div>
                    <div className={styles.resultChips}>
                      {resultNodes.map((n, i) => (
                        <span key={i} className={styles.chip} title={n.note}>
                          <span className={styles.chipType}>{n.type}</span> {n.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.placeholder}>
                <p>Select a script from the list, or create a new one.</p>
                <p className={styles.hint}>Scripts can output JSON lines or plain text.<br />
                  Entities (IPs, emails, URLs, phones, crypto) are auto-detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
