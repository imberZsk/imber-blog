import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'

const Test = () => {
  return (
    <div className={cn(PADDING_TOP, 'relative size-10')}>
      <Image
        src="/avatar.jpg"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        alt="test"
        objectFit="cover"
      />
    </div>
  )
}

export default Test
