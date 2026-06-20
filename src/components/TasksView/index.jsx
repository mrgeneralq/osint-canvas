import styles from './TasksView.module.css'

export default function TasksView() {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Tasks</div>
          <div className={styles.subtitle}>Track leads, follow-ups, and to-dos tied to this investigation</div>
        </div>
        <button className={styles.addBtn} disabled>+ Add Task</button>
      </div>
      <div className={styles.comingSoon}>
        <div className={styles.csIcon}>✅</div>
        <div className={styles.csTitle}>Task tracking coming soon</div>
        <div className={styles.csDesc}>
          Keep track of what still needs to be done — check an alias on a forum, verify an address,
          run a reverse image search. Tasks can be tied to specific canvas nodes or subjects.
        </div>
        <div className={styles.csFeatures}>
          <Feature icon="🎯" label="Tied to entities" desc="Link tasks to nodes, subjects, or evidence" />
          <Feature icon="🔴" label="Priority levels" desc="Critical, high, normal, low" />
          <Feature icon="📅" label="Due dates" desc="Set deadlines and get reminders" />
          <Feature icon="🏷" label="Categories" desc="Verify, Research, Contact, Legal, Other" />
          <Feature icon="👤" label="Assignment" desc="Assign to team members (future)" />
          <Feature icon="📋" label="Board view" desc="Kanban-style To Do / In Progress / Done" />
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
