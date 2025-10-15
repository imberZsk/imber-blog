'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import './tiptap.css'

// 样式组件化
import { EditorAllClassNames } from './style'

const Tiptap = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Write something, ' / ' for commands…`
      })
    ],
    content: content || '',
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
