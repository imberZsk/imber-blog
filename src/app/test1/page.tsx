import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'
import DemoImage from './images/avatar.jpg'

const Test = () => {
  return (
    <div className={cn(PADDING_TOP)}>
      <Image src={DemoImage} alt="test" />
    </div>
  )
}

export default Test
