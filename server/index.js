import express from 'express'
import cors from 'cors'
import { spawn } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || __dir
const SCRIPTS_FILE = join(DATA_DIR, 'scripts.json')
const DIST = join(__dir, '../dist')
const IS_PROD = existsSync(DIST)
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

// Serve built React app in production
if (IS_PROD) {
  app.use(express.static(DIST))
}

// ── persistence ───────────────────────────────────────────────────────────────
function loadScripts() {
  if (!existsSync(SCRIPTS_FILE)) return []
  try { return JSON.parse(readFileSync(SCRIPTS_FILE, 'utf8')) } catch { return [] }
}
function saveScripts(scripts) {
  writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2))
}

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
    // Try JSON line first
    if (line.startsWith('{')) {
      try {
        const obj = JSON.parse(line)
        if (obj.type && obj.value) {
          nodes.push({ type: obj.type, value: obj.value, note: obj.note ?? '', confidence: obj.confidence ?? 'unverified' })
          if (obj.connects_to) edges.push({ from: obj.value, to: obj.connects_to, label: obj.relationship ?? '' })
        }
        continue
      } catch { /* not JSON, fall through */ }
    }
    // Plain text — extract entities
    extractEntities(line).forEach((e) => {
      if (!nodes.find((n) => n.value === e.value))
        nodes.push({ ...e, note: `From: ${script.name}`, confidence: 'unverified' })
    })
  }
  return { nodes, edges }
}

// ── routes ────────────────────────────────────────────────────────────────────
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

  // Inject runtime variables into script body
  const vars = req.body?.vars ?? {}
  let body = script.body
  for (const [k, v] of Object.entries(vars)) {
    body = body.replaceAll(`$${k}`, v).replaceAll(`{{${k}}}`, v)
  }

  // Pick shell
  let cmd, args
  switch (script.shell) {
    case 'python':
      cmd = 'python'; args = ['-c', body]; break
    case 'bash':
      cmd = 'bash'; args = ['-c', body]; break
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
  let stderr = ''
  let finished = false

  proc.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
    res.write(`data: ${JSON.stringify({ type: 'stdout', line: chunk.toString() })}\n\n`)
  })

  proc.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
    res.write(`data: ${JSON.stringify({ type: 'stderr', line: chunk.toString() })}\n\n`)
  })

  proc.on('close', (code) => {
    finished = true
    const { nodes, edges } = parseOutput(stdout, script)
    res.write(`data: ${JSON.stringify({ type: 'done', code, nodes, edges, stderr })}\n\n`)
    res.end()
  })

  proc.on('error', (err) => {
    finished = true
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    res.end()
  })

  // Only kill if client disconnects from the response before script finishes
  res.on('close', () => { if (!finished) { try { proc.kill() } catch {} } })
})

// SPA fallback in production
if (IS_PROD) {
  app.get('/{*path}', (_, res) => res.sendFile(join(DIST, 'index.html')))
}

app.listen(PORT, () => console.log(`OSINT Canvas listening on http://localhost:${PORT} (${IS_PROD ? 'production' : 'dev'})`))

