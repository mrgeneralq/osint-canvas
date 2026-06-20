import styles from './IntelFeedView.module.css'

export default function IntelFeedView() {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Intel Feed</div>
          <div className={styles.subtitle}>Raw collection scratchpad — dump findings here before organizing them on the canvas</div>
        </div>
        <button className={styles.addBtn} disabled>+ Add Item</button>
      </div>
      <div className={styles.comingSoon}>
        <div className={styles.csIcon}>📡</div>
        <div className={styles.csTitle}>Intel collection feed coming soon</div>
        <div className={styles.csDesc}>
          The intel feed is an unstructured collection area where you paste URLs, text snippets, screenshots,
          and raw findings during active research — before you know where they fit. Items can then be promoted
          to canvas nodes, subjects, or evidence with one click.
        </div>
        <div className={styles.csFeatures}>
          <Feature icon="📋" label="Paste anything" desc="URLs, text, JSON, IPs, emails — just dump it" />
          <Feature icon="🤖" label="Auto-classify" desc="AI detects entity types automatically" />
          <Feature icon="➡️" label="Promote to canvas" desc="Turn any item into a node with one click" />
          <Feature icon="🏷" label="Tag & filter" desc="Tag items by type, priority, or subject" />
          <Feature icon="🌐" label="URL archiving" desc="Auto-archive URLs via Wayback Machine" />
          <Feature icon="📸" label="Screenshots" desc="Paste screenshots directly into the feed" />
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
