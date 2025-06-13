import Image from 'next/image'
import { PADDING_TOP } from '../const'
import { cn } from '@/lib/utils'

const Test = () => {
  return (
    <div className={cn(PADDING_TOP)}>
      <div className="absolute h-40 w-40">
        <Image
          src="https://ssm.res.meizu.com/admin/2025/06/06/1037623787/e99fHVovtI.png"
          alt="test"
          fill
          sizes="100vw"
          objectFit="cover"
        />
      </div>
    </div>
  )
}

export default Test
