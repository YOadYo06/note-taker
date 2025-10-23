import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Expand, Loader2, X } from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { Document, Page } from 'react-pdf'
import { toast } from 'sonner'
import { useResizeDetector } from 'react-resize-detector'

interface PdfFullscreenProps {
  fileUrl: string
}

const PdfFullscreen = ({ fileUrl }: PdfFullscreenProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [numPages, setNumPages] = useState<number>()
  const containerRef = useRef<HTMLDivElement>(null)
  const { width, ref } = useResizeDetector()

  // ✅ Detect fullscreen changes (user pressing ESC, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  return (
    <>
      <Button
        onClick={toggleFullscreen}
        variant='ghost'
        className='gap-1.5'
        aria-label='fullscreen'>
        <Expand className='h-4 w-4' />
      </Button>

      {/* ✅ Always render the container — just toggle visibility */}
      <div
        ref={containerRef}
        className={`fixed inset-0 z-50 bg-white transition-opacity duration-200 ${
          isFullscreen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}>
        {isFullscreen && (
          <>
            <button
              onClick={toggleFullscreen}
              className='absolute top-4 right-4 z-50 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors'>
              <X className='h-6 w-6' />
            </button>

            <SimpleBar autoHide={false} className='h-full w-full'>
              <div ref={ref} className='p-8'>
                <Document
                  loading={
                    <div className='flex justify-center'>
                      <Loader2 className='my-24 h-6 w-6 animate-spin' />
                    </div>
                  }
                  onLoadError={() => {
                    toast.error('Error loading PDF', {
                      description: 'Please try again later',
                    })
                  }}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  file={fileUrl}>
                  {Array.from({ length: numPages ?? 0 }).map((_, i) => (
                    <Page key={i} width={width ?? 1} pageNumber={i + 1} />
                  ))}
                </Document>
              </div>
            </SimpleBar>
          </>
        )}
      </div>
    </>
  )
}

export default PdfFullscreen
