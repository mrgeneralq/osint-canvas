import styles from './SubjectsView.module.css'

export default function SubjectsView() {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Subjects</div>
          <div className={styles.subtitle}>Structured profiles for each person, organization, or asset under investigation</div>
        </div>
        <button className={styles.addBtn} disabled>+ Add Subject</button>
      </div>
      <div className={styles.comingSoon}>
        <div className={styles.csIcon}>👤</div>
        <div className={styles.csTitle}>Subject profiles coming soon</div>
        <div className={styles.csDesc}>
          Each subject will have a structured dossier — known aliases, contact details, associated accounts,
          linked organizations, timeline of activity, and all canvas nodes referencing them.
          Subjects sync bidirectionally with canvas nodes.
        </div>
        <div className={styles.csFeatures}>
          <Feature icon="🪪" label="Identity fields" desc="Name, DOB, nationality, aliases" />
          <Feature icon="🔗" label="Canvas sync" desc="Linked to all referencing nodes" />
          <Feature icon="📁" label="Evidence" desc="Attach evidence directly to a subject" />
          <Feature icon="🕐" label="Activity timeline" desc="Events attributed to this subject" />
          <Feature icon="🤝" label="Associates" desc="Known connections to other subjects" />
          <Feature icon="📋" label="Export dossier" desc="Generate PDF or markdown report" />
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
