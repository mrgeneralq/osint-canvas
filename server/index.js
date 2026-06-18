import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname, basename } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || __dir
const SCRIPTS_FILE = join(DATA_DIR, 'scripts.json')
const CASES_DIR = join(DATA_DIR, 'cases')
const DIST = join(__dir, '../dist')
const IS_PROD = existsSync(DIST)
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

if (!existsSync(CASES_DIR)) mkdirSync(CASES_DIR, { recursive: true })

if (IS_PROD) app.use(express.static(DIST))

// ── case helpers ──────────────────────────────────────────────────────────────
function caseMeta(caseDir) {
  const metaFile = join(caseDir, 'case.json')
  if (!existsSync(metaFile)) return null
  try { return JSON.parse(readFileSync(metaFile, 'utf8')) } catch { return null }
}

function listCases() {
  if (!existsSync(CASES_DIR)) return []
  return readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => caseMeta(join(CASES_DIR, d.name)))
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

function saveCase(id, data) {
  const dir = join(CASES_DIR, id)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const notesDir = join(dir, 'notes')
  if (!existsSync(notesDir)) mkdirSync(notesDir)
  writeFileSync(join(dir, 'case.json'), JSON.stringify(data, null, 2))
}

// ── note helpers ──────────────────────────────────────────────────────────────
function notesDir(caseId) { return join(CASES_DIR, caseId, 'notes') }

function listNotes(caseId) {
  const dir = notesDir(caseId)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try { return JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch { return null }
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function saveNote(caseId, note) {
  const dir = notesDir(caseId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${note.id}.json`), JSON.stringify(note, null, 2))
}

// ── scripts helpers ───────────────────────────────────────────────────────────
function loadScripts() {
  if (!existsSync(SCRIPTS_FILE)) return []
  try { return JSON.parse(readFileSync(SCRIPTS_FILE, 'utf8')) } catch { return [] }
}
function saveScripts(scripts) { writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2)) }

// ── OSINT pattern detection ───────────────────────────────────────────────────
const OSINT_PATTERNS = [
  { id: 'email',       nodeType: 'email',        label: 'Email',        re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { id: 'ip',          nodeType: 'ip',            label: 'IP Address',   re: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}\b/g },
  { id: 'url',         nodeType: 'url',           label: 'URL',          re: /https?:\/\/[^\s"'<>\]]+/g },
  { id: 'domain',      nodeType: 'domain',        label: 'Domain',       re: /\b(?:[a-zA-Z0-9\-]+\.)+(?:com|net|org|io|co|uk|de|nl|ru|fr|es|onion|gov|edu|biz|info|me|app|dev|xyz)\b/gi },
  { id: 'phone',       nodeType: 'phone',         label: 'Phone',        re: /\b(?:\+\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g },
  { id: 'btc',         nodeType: 'crypto',        label: 'Bitcoin',      re: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|\bbc1[a-z0-9]{39,59}\b/g },
  { id: 'eth',         nodeType: 'crypto',        label: 'Ethereum',     re: /\b0x[a-fA-F0-9]{40}\b/g },
  { id: 'hash_md5',    nodeType: 'file_hash',     label: 'MD5 Hash',     re: /\b[a-fA-F0-9]{32}\b/g },
  { id: 'hash_sha1',   nodeType: 'file_hash',     label: 'SHA1 Hash',    re: /\b[a-fA-F0-9]{40}\b/g },
  { id: 'hash_sha256', nodeType: 'file_hash',     label: 'SHA256 Hash',  re: /\b[a-fA-F0-9]{64}\b/g },
  { id: 'iban',        nodeType: 'bank_account',  label: 'IBAN',         re: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{0,16}\b/g },
  { id: 'imei',        nodeType: 'imei',          label: 'IMEI',         re: /\b\d{15}\b/g },
  { id: 'onion',       nodeType: 'darkweb',       label: 'Onion address',re: /\b[a-z2-7]{16,56}\.onion\b/gi },
]

// Relationship inferences for auto-detected secondaries
const SECONDARY_RELS = {
  email: 'owns', ip: 'owns', url: 'owns', domain: 'owns', phone: 'owns',
  crypto: 'owns', file_hash: 'evidence_of', bank_account: 'owns', imei: 'owns', darkweb: 'owns',
}

function detectEntities(text, excludeNodeType = null) {
  const seen = new Set()
  const results = []
  for (const pat of OSINT_PATTERNS) {
    if (pat.nodeType === excludeNodeType) continue
    pat.re.lastIndex = 0
    for (const m of text.matchAll(pat.re)) {
      const value = m[0].trim()
      const key = `${pat.nodeType}:${value}`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({ patternId: pat.id, nodeType: pat.nodeType, label: pat.label, value })
      }
    }
  }
  return results
}

function parseOutput(raw, script) {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const nodes = []
  const edges = []
  for (const line of lines) {
    if (line.startsWith('{')) {
      try {
        const obj = JSON.parse(line)
        if (obj.type && obj.value) {
          nodes.push({ type: obj.type, value: obj.value, note: obj.note ?? '', confidence: obj.confidence ?? 'unverified' })
          if (obj.connects_to) edges.push({ from: obj.value, to: obj.connects_to, label: obj.relationship ?? '' })
        }
        continue
      } catch { /* not JSON */ }
    }
    detectEntities(line).forEach((e) => {
      if (!nodes.find((n) => n.value === e.value))
        nodes.push({ type: e.nodeType, value: e.value, note: `From: ${script.name}`, confidence: 'unverified' })
    })
  }
  return { nodes, edges }
}

// ── source file helpers ───────────────────────────────────────────────────────
function filesDir(caseId) {
  const dir = join(CASES_DIR, caseId, 'files')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function splitRecords(content, splitBy) {
  if (splitBy === 'csv') {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
    const headers = lines[0]?.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    return lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
      const obj = {}
      headers?.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return { raw: line, fields: obj }
    })
  }
  if (splitBy === 'json') {
    try {
      const parsed = JSON.parse(content)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      return arr.map((item) => ({ raw: JSON.stringify(item), fields: item }))
    } catch { return [{ raw: content, fields: {} }] }
  }
  if (splitBy === 'tsv') {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
    const headers = lines[0]?.split('\t').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const vals = line.split('\t').map((v) => v.trim())
      const obj = {}
      headers?.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return { raw: line, fields: obj }
    })
  }
  // default: line by line
  return content.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => ({ raw: l, fields: {} }))
}

function buildProposals(records, extractor, sourceId, sourceName) {
  const proposals = []
  for (const rec of records) {
    // Primary value: use fieldMapping if set, else whole raw line
    let primaryValue = rec.raw
    if (extractor.fieldMapping?.primary && rec.fields[extractor.fieldMapping.primary]) {
      primaryValue = rec.fields[extractor.fieldMapping.primary]
    }
    if (!primaryValue.trim()) continue

    // Detect secondaries from full raw text (skip same type as primary)
    const secondaries = extractor.autoDetect
      ? detectEntities(rec.raw, extractor.primaryNodeType)
          .filter((e) => e.value !== primaryValue)
      : []

    // Also extract mapped secondary fields
    if (extractor.fieldMapping?.secondaries) {
      for (const { field, nodeType } of extractor.fieldMapping.secondaries) {
        const val = rec.fields[field]
        if (val && !secondaries.find((s) => s.value === val)) {
          secondaries.push({ patternId: 'field_map', nodeType, label: nodeType, value: val })
        }
      }
    }

    proposals.push({
      id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sourceId,
      sourceName,
      extractorId: extractor.id,
      extractorName: extractor.name,
      primaryNode: {
        nodeType: extractor.primaryNodeType,
        value: primaryValue.trim(),
        rawText: rec.raw,
      },
      secondaryNodes: secondaries.map((s) => ({
        nodeType: s.nodeType,
        value: s.value,
        patternId: s.patternId,
        relationship: SECONDARY_RELS[s.nodeType] ?? 'linked to',
      })),
      status: 'pending',
    })
  }
  return proposals
}

// ── case routes ───────────────────────────────────────────────────────────────
app.get('/cases', (_, res) => res.json(listCases()))

app.post('/cases', (req, res) => {
  const id = `case_${Date.now()}`
  const now = new Date().toISOString()
  const caseData = {
    id,
    name: req.body.name ?? 'Untitled Case',
    investigator: req.body.investigator ?? '',
    status: req.body.status ?? 'Active',
    description: req.body.description ?? '',
    target: req.body.target ?? '',
    tags: req.body.tags ?? '',
    createdAt: now,
    updatedAt: now,
    canvases: [{ id: 'canvas_1', name: 'Main Canvas', nodes: [], edges: [], sources: [] }],
    activeCanvasId: 'canvas_1',
  }
  saveCase(id, caseData)
  res.json(caseData)
})

app.get('/cases/:id', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  const notes = listNotes(req.params.id)
  res.json({ ...meta, notes })
})

app.put('/cases/:id', (req, res) => {
  const existing = caseMeta(join(CASES_DIR, req.params.id))
  if (!existing) return res.status(404).json({ error: 'Case not found' })
  const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() }
  saveCase(req.params.id, updated)
  res.json(updated)
})

app.delete('/cases/:id', (req, res) => {
  const dir = join(CASES_DIR, req.params.id)
  if (!existsSync(dir)) return res.status(404).json({ error: 'Not found' })
  rmSync(dir, { recursive: true, force: true })
  res.json({ ok: true })
})

// ── note routes ───────────────────────────────────────────────────────────────
app.get('/cases/:id/notes', (req, res) => res.json(listNotes(req.params.id)))

app.post('/cases/:id/notes', (req, res) => {
  const note = {
    id: `note_${Date.now()}`,
    title: req.body.title ?? 'Untitled Note',
    content: req.body.content ?? '',
    order: req.body.order ?? Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveNote(req.params.id, note)
  res.json(note)
})

app.put('/cases/:id/notes/:noteId', (req, res) => {
  const dir = notesDir(req.params.id)
  const file = join(dir, `${req.params.noteId}.json`)
  if (!existsSync(file)) return res.status(404).json({ error: 'Note not found' })
  const existing = JSON.parse(readFileSync(file, 'utf8'))
  const updated = { ...existing, ...req.body, id: req.params.noteId, updatedAt: new Date().toISOString() }
  saveNote(req.params.id, updated)
  res.json(updated)
})

app.delete('/cases/:id/notes/:noteId', (req, res) => {
  const file = join(notesDir(req.params.id), `${req.params.noteId}.json`)
  if (existsSync(file)) rmSync(file)
  res.json({ ok: true })
})

// ── source file routes ────────────────────────────────────────────────────────
app.get('/cases/:id/sources', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  res.json(meta.sourceFiles ?? [])
})

// Raw binary upload — no size cap from JSON middleware
app.post('/cases/:id/sources/upload', express.raw({ type: '*/*', limit: '500mb' }), (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })

  let name
  try { name = decodeURIComponent(req.headers['x-filename'] || 'upload.txt') } catch { name = 'upload.txt' }

  const id = `sf_${Date.now()}`
  const ext = extname(name) || '.txt'
  const dir = filesDir(req.params.id)
  const resolvedPath = join(dir, `${id}${ext}`)

  writeFileSync(resolvedPath, req.body)

  const sourceFile = {
    id, name,
    path: resolvedPath,
    size: req.body.length,
    format: ext.slice(1) || 'txt',
    isServerPath: false,
    createdAt: new Date().toISOString(),
  }

  const updated = { ...meta, sourceFiles: [...(meta.sourceFiles ?? []), sourceFile], updatedAt: new Date().toISOString() }
  saveCase(req.params.id, updated)
  res.json(sourceFile)
})

app.post('/cases/:id/sources', (req, res) => {
  const { name, content, serverPath } = req.body
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })

  const id = `sf_${Date.now()}`
  let resolvedPath, size, format

  if (serverPath) {
    // Register a path already on the server filesystem
    if (!existsSync(serverPath)) return res.status(400).json({ error: 'Path not found on server' })
    const stat = statSync(serverPath)
    resolvedPath = serverPath
    size = stat.size
    format = extname(serverPath).slice(1) || 'txt'
  } else if (content !== undefined) {
    // Upload content directly
    const dir = filesDir(req.params.id)
    const ext = extname(name || 'file.txt') || '.txt'
    resolvedPath = join(dir, `${id}${ext}`)
    writeFileSync(resolvedPath, content, 'utf8')
    size = Buffer.byteLength(content, 'utf8')
    format = ext.slice(1) || 'txt'
  } else {
    return res.status(400).json({ error: 'Provide content or serverPath' })
  }

  const sourceFile = {
    id,
    name: name || basename(serverPath || 'upload'),
    path: resolvedPath,
    size,
    format,
    isServerPath: !!serverPath,
    createdAt: new Date().toISOString(),
  }

  const updated = { ...meta, sourceFiles: [...(meta.sourceFiles ?? []), sourceFile], updatedAt: new Date().toISOString() }
  saveCase(req.params.id, updated)
  res.json(sourceFile)
})

app.delete('/cases/:id/sources/:srcId', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  const src = (meta.sourceFiles ?? []).find((s) => s.id === req.params.srcId)
  // Only delete the file if we uploaded it (not a registered server path)
  if (src && !src.isServerPath && existsSync(src.path)) rmSync(src.path)
  const updated = { ...meta, sourceFiles: (meta.sourceFiles ?? []).filter((s) => s.id !== req.params.srcId) }
  saveCase(req.params.id, updated)
  res.json({ ok: true })
})

// ── extractor routes ──────────────────────────────────────────────────────────
app.get('/cases/:id/extractors', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  res.json(meta.extractors ?? [])
})

app.post('/cases/:id/extractors', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  const extractor = {
    id: `ext_${Date.now()}`,
    name: req.body.name ?? 'Untitled Extractor',
    primaryNodeType: req.body.primaryNodeType ?? 'person',
    splitBy: req.body.splitBy ?? 'line',
    command: req.body.command ?? '',
    autoDetect: req.body.autoDetect ?? true,
    fieldMapping: req.body.fieldMapping ?? null,
    createdAt: new Date().toISOString(),
  }
  const updated = { ...meta, extractors: [...(meta.extractors ?? []), extractor] }
  saveCase(req.params.id, updated)
  res.json(extractor)
})

app.put('/cases/:id/extractors/:extId', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  const extractors = (meta.extractors ?? []).map((e) =>
    e.id === req.params.extId ? { ...e, ...req.body, id: e.id } : e
  )
  saveCase(req.params.id, { ...meta, extractors })
  res.json(extractors.find((e) => e.id === req.params.extId))
})

app.delete('/cases/:id/extractors/:extId', (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })
  saveCase(req.params.id, { ...meta, extractors: (meta.extractors ?? []).filter((e) => e.id !== req.params.extId) })
  res.json({ ok: true })
})

// ── run endpoint ──────────────────────────────────────────────────────────────
app.post('/cases/:id/run', async (req, res) => {
  const meta = caseMeta(join(CASES_DIR, req.params.id))
  if (!meta) return res.status(404).json({ error: 'Case not found' })

  const { extractorIds = 'all', sourceIds = 'all' } = req.body
  const extractors = (meta.extractors ?? []).filter((e) =>
    extractorIds === 'all' || extractorIds.includes(e.id)
  )
  const sources = (meta.sourceFiles ?? []).filter((s) =>
    sourceIds === 'all' || sourceIds.includes(s.id)
  )

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
  const allProposals = []

  for (const extractor of extractors) {
    for (const source of sources) {
      send({ type: 'progress', message: `Running "${extractor.name}" on ${source.name}…` })

      try {
        let content
        if (!existsSync(source.path)) {
          send({ type: 'warn', message: `File not found: ${source.path}` })
          continue
        }

        if (extractor.command) {
          // Run shell command with {file} substituted
          const cmd = extractor.command.replaceAll('{file}', source.path).replaceAll('{dir}', source.path)
          content = await new Promise((resolve, reject) => {
            const proc = spawn('bash', ['-c', cmd], { shell: false })
            let out = ''
            proc.stdout.on('data', (d) => { out += d.toString() })
            proc.stderr.on('data', (d) => { send({ type: 'stderr', message: d.toString().trim() }) })
            proc.on('close', (code) => {
              send({ type: 'progress', message: `Command exited (${code})` })
              resolve(out)
            })
            proc.on('error', reject)
          })
        } else {
          content = readFileSync(source.path, 'utf8')
        }

        const records = splitRecords(content, extractor.splitBy)
        send({ type: 'progress', message: `Parsed ${records.length} records` })

        const proposals = buildProposals(records, extractor, source.id, source.name)
        allProposals.push(...proposals)
        send({ type: 'progress', message: `Generated ${proposals.length} proposals` })
      } catch (err) {
        send({ type: 'error', message: err.message })
      }
    }
  }

  send({ type: 'done', proposals: allProposals, total: allProposals.length })
  res.end()
})

// ── script routes ─────────────────────────────────────────────────────────────
app.get('/scripts', (_, res) => res.json(loadScripts()))

app.post('/scripts', (req, res) => {
  const scripts = loadScripts()
  const script = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() }
  scripts.push(script)
  saveScripts(scripts)
  res.json(script)
})

app.put('/scripts/:id', (req, res) => {
  const scripts = loadScripts()
  const idx = scripts.findIndex((s) => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  scripts[idx] = { ...scripts[idx], ...req.body }
  saveScripts(scripts)
  res.json(scripts[idx])
})

app.delete('/scripts/:id', (req, res) => {
  const scripts = loadScripts().filter((s) => s.id !== req.params.id)
  saveScripts(scripts)
  res.json({ ok: true })
})

app.post('/scripts/:id/run', (req, res) => {
  const scripts = loadScripts()
  const script = scripts.find((s) => s.id === req.params.id)
  if (!script) return res.status(404).json({ error: 'Not found' })

  const vars = req.body?.vars ?? {}
  let body = script.body
  for (const [k, v] of Object.entries(vars)) {
    body = body.replaceAll(`$${k}`, v).replaceAll(`{{${k}}}`, v)
  }

  let cmd, args
  switch (script.shell) {
    case 'python': cmd = 'python'; args = ['-c', body]; break
    case 'bash':   cmd = 'bash';   args = ['-c', body]; break
    case 'powershell':
    default:
      cmd = process.platform === 'win32' ? 'powershell.exe' : 'pwsh'
      args = ['-NoProfile', '-NonInteractive', '-Command', body]
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const proc = spawn(cmd, args, { shell: false })
  let stdout = ''
  let finished = false

  proc.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
    res.write(`data: ${JSON.stringify({ type: 'stdout', line: chunk.toString() })}\n\n`)
  })
  proc.stderr.on('data', (chunk) => {
    res.write(`data: ${JSON.stringify({ type: 'stderr', line: chunk.toString() })}\n\n`)
  })
  proc.on('close', (code) => {
    finished = true
    const { nodes, edges } = parseOutput(stdout, script)
    res.write(`data: ${JSON.stringify({ type: 'done', code, nodes, edges })}\n\n`)
    res.end()
  })
  proc.on('error', (err) => {
    finished = true
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    res.end()
  })
  res.on('close', () => { if (!finished) { try { proc.kill() } catch {} } })
})

if (IS_PROD) app.get('/{*path}', (_, res) => res.sendFile(join(DIST, 'index.html')))

app.listen(PORT, () => console.log(`OSINT Canvas listening on http://localhost:${PORT} (${IS_PROD ? 'production' : 'dev'})`))
