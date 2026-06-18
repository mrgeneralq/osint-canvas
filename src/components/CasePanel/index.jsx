import { useState } from 'react'
import useStore from '../../store/useStore'
import styles from './CasePanel.module.css'

export default function CasePanel({ onClose }) {
  const caseInfo = useStore((s) => s.caseInfo)
  const updateCaseInfo = useStore((s) => s.updateCaseInfo)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span>📁 Case Information</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <Field label="Case Name">
            <input
              className={styles.input}
              value={caseInfo.name}
              onChange={(e) => updateCaseInfo({ name: e.target.value })}
              placeholder="Operation Nighthawk…"
            />
          </Field>

          <Field label="Investigator">
            <input
              className={styles.input}
              value={caseInfo.investigator}
              onChange={(e) => updateCaseInfo({ investigator: e.target.value })}
              placeholder="Your name or handle…"
            />
          </Field>

          <Field label="Status">
            <select
              className={styles.input}
              value={caseInfo.status}
              onChange={(e) => updateCaseInfo({ status: e.target.value })}
            >
              <option>Active</option>
              <option>Pending</option>
              <option>Cold</option>
              <option>Closed</option>
            </select>
          </Field>

          <Field label="Description / Objective">
            <textarea
              className={styles.input}
              rows={4}
              value={caseInfo.description}
              onChange={(e) => updateCaseInfo({ description: e.target.value })}
              placeholder="Brief description of the investigation objective…"
            />
          </Field>
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}
