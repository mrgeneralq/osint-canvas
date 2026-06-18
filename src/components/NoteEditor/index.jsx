import { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import useStore from '../../store/useStore'
import styles from './NoteEditor.module.css'

marked.setOptions({ breaks: true, gfm: true })

export default function NoteEditor({ noteId }) {
  const notes = useStore((s) => s.notes)
  const updateNote = useStore((s) => s.updateNote)
  const note = notes.find((n) => n.id === noteId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mode, setMode] = useState('split') // 'edit' | 'preview' | 'split'
  const saveTimer = useRef(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? '')
      setContent(note.content ?? '')
    }
  }, [noteId])

  const scheduleSave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote(noteId, { title: newTitle, content: newContent })
    }, 800)
  }, [noteId, updateNote])

  const handleTitle = (e) => {
    setTitle(e.target.value)
    scheduleSave(e.target.value, content)
  }

  const handleContent = (e) => {
    setContent(e.target.value)
    scheduleSave(title, e.target.value)
  }

  // Tab key inserts spaces instead of changing focus
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.target
      const start = el.selectionStart
      const end = el.selectionEnd
      const newVal = content.substring(0, start) + '  ' + content.substring(end)
      setContent(newVal)
      scheduleSave(title, newVal)
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2 })
    }
  }

  if (!note) return <div className={styles.empty}>Select a note from the sidebar.</div>

  const html = marked.parse(content || '')

  return (
    <div className={styles.editor}>
      <div className={styles.topBar}>
        <input
          className={styles.titleInput}
          value={title}
          onChange={handleTitle}
          placeholder="Note title…"
        />
        <div className={styles.modeBtns}>
          <button className={`${styles.modeBtn} ${mode === 'edit' ? styles.modeBtnActive : ''}`} onClick={() => setMode('edit')}>Edit</button>
          <button className={`${styles.modeBtn} ${mode === 'split' ? styles.modeBtnActive : ''}`} onClick={() => setMode('split')}>Split</button>
          <button className={`${styles.modeBtn} ${mode === 'preview' ? styles.modeBtnActive : ''}`} onClick={() => setMode('preview')}>Preview</button>
        </div>
      </div>

      <div className={`${styles.body} ${styles[`body_${mode}`]}`}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            className={styles.textarea}
            value={content}
            onChange={handleContent}
            onKeyDown={handleKeyDown}
            placeholder={`# Start writing...\n\nMarkdown is supported.\n- **Bold**, *italic*, \`code\`\n- ## Headings\n- > Blockquotes\n- [ ] Checkboxes`}
            spellCheck
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: html || '<p class="placeholder">Nothing to preview yet.</p>' }}
          />
        )}
      </div>
    </div>
  )
}
