'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useDebouncedCallback } from 'use-debounce'
import './tiptap.css'

// 样式组件化
import { EditorAllClassNames } from './style'

const Tiptap = () => {
  const updateContent = useDebouncedCallback(() => {
    if (typeof window === 'undefined') return
    const data = editor?.getJSON()
    localStorage.setItem('editor-content', JSON.stringify(data))
  }, 1000)

  const editor = useEditor({
    onUpdate() {
      updateContent()
    },
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Write something, ' / ' for commands…`
      })
    ],
    content: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('editor-content') || '{}') : '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-80'
      }
    }
  })

  return <EditorContent editor={editor} className={EditorAllClassNames} />
}

export default Tiptap
