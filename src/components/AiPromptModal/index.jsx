import { useState } from 'react'
import styles from './AiPromptModal.module.css'

const PROMPT = `You are generating JSON for the OSINT Canvas investigation tool. The output must be a single valid JSON object that can be imported directly.

## Top-level structure

\`\`\`json
{
  "nodes": [ ...node objects ],
  "edges": [ ...edge objects ]
}
\`\`\`

---

## Node object schema

\`\`\`json
{
  "id": "node_1",
  "type": "osint",
  "position": { "x": 100, "y": 200 },
  "data": {
    "nodeType": "<type>",
    "label": "<human-readable label>",
    "value": "<primary value shown on the card>",
    "note": "<optional multi-line notes>",
    "imageUrl": "",
    "confidence": "unverified",
    "sourceUrl": "",
    "dateAdded": "2024-01-15",
    "tags": "",
    "locked": false,
    "sourceIds": []
  }
}
\`\`\`

### Rules for nodes

- \`id\` must be unique. Use the pattern \`node_1\`, \`node_2\`, ... incrementing integers.
- \`type\` is always the literal string \`"osint"\`. Never change this.
- \`position\` is \`{ x, y }\` in canvas pixels. Spread nodes out so they don't overlap — use at least 280px horizontal spacing and 160px vertical spacing. Arrange logically (e.g. person nodes in the center, connected attributes around them).
- \`data.nodeType\` must be one of the following exact strings:
  - \`person\` — a real individual
  - \`alias\` — username, nickname, pseudonym
  - \`phone\` — phone number
  - \`email\` — email address
  - \`address\` — physical address
  - \`social\` — social media profile (Facebook, Instagram, Twitter/X, LinkedIn, TikTok, etc.)
  - \`url\` — a website or URL
  - \`ip\` — IP address or domain name
  - \`image\` — a photo or image file reference
  - \`document\` — a file, PDF, or document
  - \`note\` — a free-form analysis note
  - \`event\` — a date, time, or event (e.g. date of birth, incident date)
  - \`organization\` — a company, group, or institution
  - \`vehicle\` — a car, plate number, or vehicle
  - \`location\` — a geographic location or GPS coordinate
  - \`crypto\` — a cryptocurrency wallet address
  - \`method\` — an investigation pivot/technique (what action you took to get from one piece of intel to another). For method nodes, \`data.value\` must be one of these technique keys: \`password_reset\`, \`breach_search\`, \`whois\`, \`reverse_phone\`, \`reverse_image\`, \`username_search\`, \`social_search\`, \`google_dork\`, \`email_verify\`, \`port_scan\`, \`phone_lookup\`, \`address_lookup\`, \`court_records\`, \`darkweb_search\`, \`ip_lookup\`, \`account_recovery\`, \`manual\`, \`other\`. Use \`data.note\` to describe what it revealed.
- \`data.confidence\` must be one of: \`"unverified"\`, \`"probable"\`, \`"confirmed"\`
- \`data.value\` is the main display text (phone number, email address, name, URL, etc.)
- \`data.note\` can contain multi-line text with \\n separators
- \`data.imageUrl\` leave as \`""\` unless you have a data URI; do not put HTTP URLs here
- \`data.tags\` is a comma-separated string of tags, e.g. \`"suspect,primary"\`

---

## Edge object schema

\`\`\`json
{
  "id": "edge_1",
  "source": "node_1",
  "target": "node_2",
  "type": "osint",
  "data": {
    "label": "<optional short label describing the connection>",
    "relationshipType": "<type>"
  }
}
\`\`\`

### Rules for edges

- \`id\` must be unique. Use the pattern \`edge_1\`, \`edge_2\`, ... incrementing integers.
- \`source\` and \`target\` must reference existing node \`id\` values.
- \`type\` is always the literal string \`"osint"\`. Never change this.
- \`data.label\` is optional (use \`""\` if not needed) — a short phrase shown on the connection line.
- \`data.relationshipType\` must be one of these exact strings:
  - \`"default"\` — generic link (grey)
  - \`"leads_to"\` — one piece of intel leads to another (blue)
  - \`"same_as"\` — two nodes refer to the same entity (purple)
  - \`"confirmed_via"\` — relationship is confirmed through evidence (green)
  - \`"contradicts"\` — relationship is contradictory or disputed (red dashed)
  - \`"associated"\` — loosely associated (grey dashed)
  - \`"owns"\` — one entity owns another (amber)
  - \`"used_by"\` — an account/number/address is used by a person (orange)
  - \`"located_at"\` — entity is physically located at a place (teal)

---

## Layout guidance

- Place the central subject (person / organization) near the center, e.g. \`{ x: 600, y: 400 }\`
- Radiate related nodes outward: contact info to the left, online profiles to the right, locations below, documents/notes to the upper area
- Nodes of the same category should be grouped together
- Never place two nodes at exactly the same \`x, y\` position
- The canvas is infinite — use as much space as you need

---

## Example (minimal)

\`\`\`json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "osint",
      "position": { "x": 600, "y": 400 },
      "data": {
        "nodeType": "person",
        "label": "Person",
        "value": "John Doe",
        "note": "Primary subject",
        "imageUrl": "",
        "confidence": "probable",
        "sourceUrl": "",
        "dateAdded": "2024-06-14",
        "tags": "suspect",
        "locked": false
      }
    },
    {
      "id": "node_2",
      "type": "osint",
      "position": { "x": 300, "y": 400 },
      "data": {
        "nodeType": "phone",
        "label": "Phone",
        "value": "+1 555-123-4567",
        "note": "",
        "imageUrl": "",
        "confidence": "confirmed",
        "sourceUrl": "",
        "dateAdded": "2024-06-14",
        "tags": "",
        "locked": false
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "type": "osint",
      "data": {
        "label": "",
        "relationshipType": "owns"
      }
    }
  ]
}
\`\`\`

---

## Output instructions

- Output ONLY the raw JSON object. No markdown fences, no explanation, no preamble.
- The JSON must be valid and parseable — no trailing commas, no comments.
- All string values must be properly escaped.
- Do not invent node IDs that skip numbers (node_1, node_2, node_3 ... not node_1, node_5, node_10).
`

export default function AiPromptModal({ onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>🤖 AI Import Prompt</span>
          <span className={styles.subtitle}>
            Copy this system prompt and paste it into any AI. Then describe what you want mapped — the AI will output importable JSON.
          </span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <pre className={styles.prompt}>{PROMPT}</pre>
        <div className={styles.footer}>
          <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy prompt'}
          </button>
          <span className={styles.tip}>
            After the AI responds, save the output as a <code>.json</code> file and use <strong>More → Import JSON</strong>.
          </span>
        </div>
      </div>
    </div>
  )
}
