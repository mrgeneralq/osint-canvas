import { useState } from 'react'
import { DORK_TEMPLATES, DORK_OPERATORS, ENGINES } from '../../config/dorkTemplates'
import styles from './DorkPanel.module.css'

function launch(query, engine) {
  const e = engine ?? ENGINES[0]
  window.open(e.url + encodeURIComponent(query), '_blank', 'noopener')
}

export default function DorkPanel({ nodeType, value, onClose }) {
  const templates = DORK_TEMPLATES[nodeType] ?? DORK_TEMPLATES.default
  const [engine, setEngine] = useState(ENGINES[0])
  const [custom, setCustom] = useState('')
  const [copied, setCopied] = useState(null)

  const val = value?.trim() || ''

  function copyQuery(q) {
    navigator.clipboard.writeText(q)
    setCopied(q)
    setTimeout(() => setCopied(null), 1500)
  }

  function insertOp(op) {
    const cleaned = op === '"..."' ? '"' : op
    setCustom((c) => c + (c && !c.endsWith(' ') ? ' ' : '') + cleaned)
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <span className={styles.title}>🎯 Dork Builder</span>
            {val && <span className={styles.target}>— {val.length > 40 ? val.slice(0, 40) + '…' : val}</span>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Engine selector */}
        <div className={styles.engineRow}>
          <span className={styles.sectionLabel}>Launch in</span>
          <div className={styles.engines}>
            {ENGINES.map((e) => (
              <button
                key={e.name}
                className={`${styles.engineBtn} ${engine.name === e.name ? styles.engineActive : ''}`}
                onClick={() => setEngine(e)}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          {/* Left: auto-generated dorks */}
          <div className={styles.left}>
            <div className={styles.sectionLabel}>Generated dorks</div>
            {!val ? (
              <p className={styles.hint}>Set a value on the node to generate dorks.</p>
            ) : (
              <div className={styles.dorkList}>
                {templates.map((t, i) => {
                  const q = t.query(val)
                  const eng = t.engine ?? engine
                  const isCopied = copied === q
                  return (
                    <div key={i} className={styles.dorkRow}>
                      <div className={styles.dorkInfo}>
                        <span className={styles.dorkLabel}>{t.label}</span>
                        <span className={styles.dorkQuery}>{q}</span>
                      </div>
                      <div className={styles.dorkActions}>
                        {t.engine && (
                          <span className={styles.engineTag}>{t.engine.name}</span>
                        )}
                        <button
                          className={styles.copyBtn}
                          onClick={() => copyQuery(q)}
                          title="Copy query"
                        >
                          {isCopied ? '✓' : '⎘'}
                        </button>
                        <button
                          className={styles.launchBtn}
                          onClick={() => launch(q, eng)}
                          title={`Open in ${eng.name}`}
                        >
                          ↗
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: custom builder */}
          <div className={styles.right}>
            <div className={styles.sectionLabel}>Custom dork builder</div>

            <div className={styles.operatorGrid}>
              {DORK_OPERATORS.map((o) => (
                <button
                  key={o.op}
                  className={styles.opChip}
                  title={o.hint}
                  onClick={() => insertOp(o.op)}
                >
                  {o.op}
                </button>
              ))}
            </div>

            {val && (
              <button
                className={styles.insertValue}
                onClick={() => setCustom((c) => c + (c && !c.endsWith(' ') ? ' ' : '') + `"${val}"`)}
              >
                + Insert node value
              </button>
            )}

            <textarea
              className={styles.customInput}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder='Build your query here… e.g. site:example.com filetype:pdf "keyword"'
              rows={4}
              spellCheck={false}
            />

            <div className={styles.customActions}>
              <button className={styles.clearBtn} onClick={() => setCustom('')}>Clear</button>
              <button
                className={styles.copyBtn2}
                onClick={() => copyQuery(custom)}
                disabled={!custom.trim()}
              >
                {copied === custom ? '✓ Copied' : '⎘ Copy'}
              </button>
              <div className={styles.launchGroup}>
                {ENGINES.map((e) => (
                  <button
                    key={e.name}
                    className={styles.launchEngineBtn}
                    disabled={!custom.trim()}
                    onClick={() => launch(custom, e)}
                  >
                    ↗ {e.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Operator reference */}
            <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Operator reference</div>
            <div className={styles.opRef}>
              {DORK_OPERATORS.map((o) => (
                <div key={o.op} className={styles.opRefRow}>
                  <code className={styles.opCode}>{o.op}</code>
                  <span className={styles.opHint}>{o.hint}</span>
                  <code className={styles.opExample}>{o.placeholder}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
