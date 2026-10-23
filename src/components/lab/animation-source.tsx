'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/** 动画实现与关联组件的源码参数。 */
interface AnimationSourceProps {
  pageCode: string
  pageFilename: string
  componentCodes?: Array<{ content: string; filename: string }>
  triggerButton?: ReactNode
  showInCorner?: boolean
}

/** 展示原实验源码，使用原生模态框管理 Escape、焦点与复制操作。 */
export function AnimationSourceStatic({
  pageCode,
  pageFilename,
  componentCodes = [],
  triggerButton,
  showInCorner = true
}: AnimationSourceProps) {
  /** 源码模态框元素。 */
  const dialogRef = useRef<HTMLDialogElement>(null)
  /** 当前复制结果，失败时同样给出可见反馈。 */
  const [copyStatus, setCopyStatus] = useState('复制代码')
  /** 页面与依赖组件的完整源码。 */
  const code = [{ content: pageCode, filename: pageFilename }, ...componentCodes]
    .map((file) => `// ${file.filename}\n${file.content}`)
    .join('\n\n')

  /** 将当前源码复制到剪贴板。 */
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopyStatus('已复制')
    } catch {
      setCopyStatus('复制失败，请手动选择')
    }
  }

  return (
    <>
      <div className={showInCorner ? 'absolute top-4 right-4 z-10' : ''}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCopyStatus('复制代码')
            dialogRef.current?.showModal()
          }}
        >
          {triggerButton || '查看源码'}
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        aria-label="动画源码"
        className="lab-source border-border bg-background text-foreground m-auto w-[min(90vw,960px)] rounded-lg border p-5 backdrop:bg-black/60"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">源码 · {pageFilename}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyCode}>
              {copyStatus}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => dialogRef.current?.close()}>
              关闭
            </Button>
          </div>
        </div>
        <pre className="bg-muted max-h-[65svh] overflow-auto rounded p-4 text-xs leading-6">
          <code>{code}</code>
        </pre>
      </dialog>
    </>
  )
}
