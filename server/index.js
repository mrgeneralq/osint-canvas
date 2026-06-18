import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

// ── entity auto-detection ─────────────────────────────────────────────────────
const PATTERNS = [
  { type: 'email',  re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g },
  { type: 'ip',     re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: 'url',    re: /https?:\/\/[^\s"'<>]+/g },
  { type: 'phone',  re: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g },
  { type: 'crypto', re: /\b(?:0x[a-fA-F0-9]{40}|[13][a-zA-Z0-9]{25,34}|bc1[a-z0-9]{39,59})\b/g },
]

function extractEntities(text) {
  const seen = new Set()
  const results = []
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) {
      const value = m[0].trim()
      if (!seen.has(value)) { seen.add(value); results.push({ type, value }) }
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
    extractEntities(line).forEach((e) => {
      if (!nodes.find((n) => n.value === e.value))
        nodes.push({ ...e, note: `From: ${script.name}`, confidence: 'unverified' })
    })
  }
  return { nodes, edges }
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
