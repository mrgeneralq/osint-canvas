<div align="center">

# 🔍 OSINT Canvas

**A visual investigation workspace for mapping intelligence, connections, and leads — all in your browser.**

[![Docker](https://img.shields.io/badge/runs%20in-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/products/docker-desktop/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Built with React Flow](https://img.shields.io/badge/built%20with-React%20Flow-7c8cf8)](https://reactflow.dev/)

```bash
git clone https://github.com/mrgeneralq/osint-canvas.git
cd osint-canvas
docker compose up -d
```
**Then open [http://localhost:3001](http://localhost:3001)**

</div>

---

OSINT Canvas is a self-hosted, privacy-first tool for investigators, journalists, security researchers, and analysts. Map people, organisations, infrastructure, and events as a visual graph — connect the dots, run extraction pipelines, and build a picture that a spreadsheet can't.

No accounts. No cloud. No data leaving your machine.

---

## What it looks like

> *Canvas with nodes, edges, a typed relationship picker, and the Intelligence Sources panel*

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 John Doe ──[owns]──► 📧 j.doe@proton.me                     │
│       │                        │                                 │
│    [member_of]            [resolves_to]                          │
│       ▼                        ▼                                 │
│  🏢 Acme Corp          🌐 acmecorp.io ──[hosted_on]──► 🖥 1.2.3.4│
│                                │                                 │
│                          [registered]                            │
│                                ▼                                 │
│                         📋 WHOIS record                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

### 🗺 Visual Canvas
- **38 node types** across 9 groups — Identity, Contact, Online, Technical, Financial, Physical, Evidence, Intelligence, and Method
- **Drag from the palette** or double-click anywhere on the canvas to place a node
- **Pull an edge handle** to empty space → ghost outline tracks your cursor → release to pick a node type and auto-connect
- **Box-select** multiple nodes (drag on empty space), then fit-view or bulk-delete the selection
- **Ctrl+A** to select everything; **Delete** to remove selected nodes
- Collapse, lock, and add photos to any node

### 🔗 Rich Relationships
- **18 typed edge relationships** in 6 categories — General, Identity, Communication, Technical, Location, Evidence
- **4 confidence levels** — Unverified → Suspected → Probable → Confirmed — visualised as stroke weight and opacity
- **Direction control** — one-way, bidirectional, or undirected per edge
- **Auto-inferred relationship type** when you connect two nodes, based on their types
- **Single-click EdgePicker** — floating panel at cursor, pre-filtered suggestions + free-text custom label
- Full edge properties in the right panel: date observed, source URL, notes

### 🔬 Intelligence Sources Pipeline
- **Upload any file** (txt, csv, tsv, json, log) up to 500 MB — or register a server path
- **Define extractors** — choose primary node type, split mode (line / CSV / TSV / JSON), optional shell command (runs in WSL/bash with `{file}` substitution), and auto-detect toggle
- **Auto-detect 12 OSINT entity types** from free text — email, IP, URL, domain, phone, Bitcoin, Ethereum, MD5/SHA1/SHA256, IBAN, IMEI, .onion
- **Run the pipeline** — streams progress live; each source × extractor combination produces proposals
- **Proposal review panel** — inspect every suggested node before it touches your canvas; accept, reject, or expand to see the raw source line; bulk accept by type; import with deduplication

### 🧭 Analysis Tools
- **Path finder** — click two nodes to highlight the shortest connection chain between them
- **Auto-layout** — one-click Dagre layout that resolves overlaps and organises nodes left-to-right
- **Search** — dims non-matching nodes as you type
- **Highlight neighbours** — right-click any node to isolate its direct connections
- **Timeline** — plot events chronologically alongside the canvas
- **Dork builder** — generate Google / Shodan / Maltego queries from any selected node value

### 📁 Case Management
- Multiple named **canvases per case** — separate maps for separate threads
- **Notes** — rich-text notes attached to the case
- **Undo / redo** — 60-step history
- **Report generator** — export a Markdown summary of all nodes and relationships

### 💾 Import & Export
- **Save to server** — cases persist across container restarts in a Docker volume
- **Export PNG** — high-resolution 3× snapshot of the full canvas
- **Export / import JSON** — full case round-trip
- **CSV bulk import** — paste a spreadsheet column of entities to create nodes instantly
- **Share via URL** — compressed shareable link encoding the entire canvas state
- **AI import** — copy a system prompt that tells Claude, ChatGPT, or any model exactly how to produce importable JSON; describe your investigation and paste back the result

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — that's it.

### Run

```bash
git clone https://github.com/mrgeneralq/osint-canvas.git
cd osint-canvas
docker compose up -d
```

Open **http://localhost:3001** — the Express server builds and serves the entire app. No separate frontend process, no external dependencies, no accounts.

```bash
# Stop
docker compose down

# Rebuild after pulling updates
docker compose down && docker compose build --no-cache && docker compose up -d

# View logs
docker compose logs -f
```

Data is stored in a named Docker volume (`osint-scripts`) and survives container restarts and rebuilds.

---

## Local Development

```bash
# Install deps
npm install

# Start both Vite dev server + Express backend together
npm run dev
```

The Vite dev server (port 5173) proxies API calls to Express (port 3001) automatically — no config needed.

---

## Intelligence Sources — walkthrough

1. Open a case → click **Intelligence Sources** in the left sidebar
2. Upload a file (e.g. a list of suspect usernames, a grep output, a breach dump excerpt)
3. Click **+ New Extractor** → choose what the file represents (e.g. *Person*), how to split it (*one record per line*), and optionally a shell command to pre-filter it:
   ```
   grep -Eo '[a-z0-9.]+@[a-z0-9.]+\.[a-z]{2,}' {file}
   ```
4. Check **Auto-detect** to also extract emails, IPs, hashes, and other entities from each record automatically
5. Click **▶ Run Pipeline** — watch the log stream as each source is processed
6. Click **Review proposals** — accept what looks right, reject noise, expand cards to see the raw source line
7. Click **Import to canvas** — accepted nodes appear on the canvas, deduplicated against what's already there, with edges auto-inferred from node type relationships

---

## Project Structure

```
osint-canvas/
├── server/
│   └── index.js              # Express API — cases, notes, sources, extractors, run (SSE)
├── src/
│   ├── components/
│   │   ├── Canvas/           # React Flow canvas, box-select, ghost node, edge picker
│   │   ├── nodes/            # OsintNode, OsintEdge — renderers for all 38 types
│   │   ├── NodeProperties/   # Right panel — node + edge property editor
│   │   ├── WorkspaceSidebar/ # Left panel — palette, canvases, notes, sources nav
│   │   ├── SourcesView/      # Intelligence Sources pipeline UI
│   │   ├── ProposalPanel/    # Proposal review drawer
│   │   ├── CaseDashboard/    # Case list and creation
│   │   ├── Timeline/         # Chronological event view
│   │   └── ...               # Toolbar, ContextMenu, Toast, Dorks, CSV import, etc.
│   ├── config/
│   │   ├── nodeTypes.js      # 38 node type definitions across 9 groups
│   │   ├── edgeTypes.js      # 18 relationship types, confidence, inference logic
│   │   └── lookupUrls.js     # Right-click OSINT lookup URLs per node type
│   ├── store/
│   │   └── useStore.js       # Zustand — nodes, edges, cases, pipeline, history
│   └── utils/
│       ├── autoLayout.js     # Dagre graph layout
│       └── graphUtils.js     # Shortest path algorithm
├── Dockerfile                # Multi-stage: Vite build → slim Node runtime
└── docker-compose.yml
```

---

## License

MIT — use it, fork it, self-host it.
