'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageModalProps {
  src: string
  alt: string
  width: number
  height: number
}

export default function ImageModal({ src, alt, width, height }: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <div
          className="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image src={src} alt={alt} width={width * 2} height={height * 2} className="object-contain" />
            <button
              className="absolute -top-12 -right-12 text-3xl text-white transition-colors hover:text-gray-300"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
