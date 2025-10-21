import * as React from 'react'

export type SparklesIconProps = React.SVGProps<SVGSVGElement>

export const SparklesIcon = React.forwardRef<SVGSVGElement, SparklesIconProps>((props, ref) => (
  <svg ref={ref} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M8 1L9.5 4.5L13 6L9.5 7.5L8 11L6.5 7.5L3 6L6.5 4.5L8 1Z" fill="currentColor" />
    <path d="M14 2L14.5 3L15.5 3.5L14.5 4L14 5L13.5 4L12.5 3.5L13.5 3L14 2Z" fill="currentColor" />
    <path d="M2 12L2.5 13L3.5 13.5L2.5 14L2 15L1.5 14L0.5 13.5L1.5 13L2 12Z" fill="currentColor" />
  </svg>
))

SparklesIcon.displayName = 'SparklesIcon'
