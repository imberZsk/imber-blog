import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'

const Test = () => {
  return (
    <div className={cn(PADDING_TOP)}>
      <Image
        src="https://img.res.meizu.com/img/download/uc/17/35/38/56/70/173538567/w200h200?t=1671342932000"
        alt="test"
        width={100}
        height={100}
      />
    </div>
  )
}

export default Test
