'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the main PdfRenderer component
// We can use { ssr: false } here because this is a Client Component.
const PdfRenderer = dynamic(() => import('@/components/PdfRenderer'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center'>
      <Loader2 className='my-24 h-6 w-6 animate-spin' />
    </div>
  ),
})

interface PdfRendererClientProps {
  url: string
}

// This wrapper component just passes the props through
const PdfRendererClient = ({ url }: PdfRendererClientProps) => {
  return <PdfRenderer url={url} />
}

export default PdfRendererClient