import useToastStore from '../../store/toastStore'
import styles from './Toast.module.css'

const ICONS = { info: 'ℹ', success: '✓', error: '✕', warn: '⚠' }

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>{ICONS[t.type]}</span>
          <span className={styles.msg}>{t.message}</span>
          <button className={styles.close} onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
