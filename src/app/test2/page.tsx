import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'

const Test = () => {
  return (
    <div className={cn(PADDING_TOP)}>
      <Image src="/avatar.jpg" alt="test" width={100} height={100} />
    </div>
  )
}

export default Test
