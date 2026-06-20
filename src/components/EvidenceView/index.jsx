import styles from './EvidenceView.module.css'

export default function EvidenceView() {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Evidence</div>
          <div className={styles.subtitle}>Numbered, sourced evidence items with chain of custody</div>
        </div>
        <button className={styles.addBtn} disabled>+ Add Evidence</button>
      </div>
      <div className={styles.comingSoon}>
        <div className={styles.csIcon}>📁</div>
        <div className={styles.csTitle}>Evidence locker coming soon</div>
        <div className={styles.csDesc}>
          Each evidence item gets a unique reference number, a source, date of capture, type classification,
          and links to the subjects or canvas nodes it supports.
        </div>
        <div className={styles.csFeatures}>
          <Feature icon="🔢" label="Reference numbers" desc="Auto-numbered: EVD-001, EVD-002…" />
          <Feature icon="🗂" label="Types" desc="Screenshot, document, URL archive, OSINT result, file" />
          <Feature icon="🔗" label="Node linking" desc="Attach evidence to specific canvas nodes or subjects" />
          <Feature icon="📅" label="Date captured" desc="When the evidence was collected" />
          <Feature icon="🌐" label="Source URL" desc="Where the evidence was found, archived link" />
          <Feature icon="🔒" label="Integrity hash" desc="SHA-256 hash for tamper detection" />
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, label, desc }) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <div className={styles.featureLabel}>{label}</div>
      <div className={styles.featureDesc}>{desc}</div>
    </div>
  )
}
