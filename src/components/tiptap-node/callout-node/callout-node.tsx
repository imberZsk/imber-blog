import React from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Icon } from '@/components/ui/Icon'

interface CalloutNodeProps {
  node: {
    attrs: {
      background: string
    }
  }
}

const CalloutNode: React.FC<CalloutNodeProps> = ({ node }) => {
  const { background = 'gray' } = node.attrs

  // 根据背景色选择对应的图标
  const getIconName = (bg: string) => {
    switch (bg) {
      case 'blue':
        return 'Info'
      case 'green':
        return 'Check'
      case 'purple':
        return 'Sparkles'
      case 'orange':
        return 'TriangleAlert'
      case 'yellow':
        return 'Lightbulb'
      case 'red':
        return 'Circle'
      default:
        return 'Lightbulb'
    }
  }

  return (
    <NodeViewWrapper className={`callout callout-${background} not-prose`} data-type="callout">
      <div className="callout-content">
        <div className="callout-icon">
          <Icon name={getIconName(background)} className="h-5 w-5" />
        </div>
        <div className="callout-text">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

export default CalloutNode
