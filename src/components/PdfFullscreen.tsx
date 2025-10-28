"use client"
import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Expand, Loader2, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { Document, Page } from 'react-pdf'
import { toast } from 'sonner'
import { useResizeDetector } from 'react-resize-detector'

interface PdfFullscreenProps {
  fileUrl: string
  currentPage?: number
  onPageChange?: (page: number) => void
  onGenerateAI?: (text: string) => void
  fileId?: string
}

const PdfFullscreen = ({ fileUrl, currentPage = 1, onPageChange, onGenerateAI }: PdfFullscreenProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [numPages, setNumPages] = useState<number>()
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [shouldScrollToPage, setShouldScrollToPage] = useState(false)
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const { width, ref } = useResizeDetector()

  // Selection menu state
  const [selectedText, setSelectedText] = useState<string>('')
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Prevent background scrolling when in fullscreen
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : 'auto'
    return () => { document.body.style.overflow = 'auto' }
  }, [isFullscreen])

  // Handle text selection (only active in fullscreen)
  useEffect(() => {
    if (!isFullscreen) return

    const handleSelection = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()

        if (rect) {
          setSelectedText(text)
          setMenuPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          })
        }
      } else {
        setSelectedText('')
        setMenuPosition(null)
      }
    }

    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
    }
  }, [isFullscreen])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuPosition && !(e.target as HTMLElement).closest('.selection-menu')) {
        setMenuPosition(null)
        setSelectedText('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuPosition])

  // Trigger parent's AI dialog (this OPENS the language/response modal)
  const handleGenerateAI = () => {
    if (onGenerateAI && selectedText) {
      onGenerateAI(selectedText) // This calls PdfRendererClient's handleGenerateAI
    } else if (!selectedText) {
      toast.info('Please select text first to generate an AI response.')
    } else {
      toast.error('AI generation is unavailable.')
    }
    setMenuPosition(null)
    setSelectedText('')
    window.getSelection()?.removeAllRanges()
  }

  // Scroll to current page when entering fullscreen
  useEffect(() => {
    if (isFullscreen && pdfLoaded && shouldScrollToPage && pageRefs.current[currentPage]) {
      setTimeout(() => {
        pageRefs.current[currentPage]?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        })
        setShouldScrollToPage(false)
      }, 200)
    }
  }, [isFullscreen, pdfLoaded, shouldScrollToPage, currentPage])

  // Track visible page while scrolling (sync with parent)
  useEffect(() => {
    if (!isFullscreen || !numPages || !pdfLoaded) return

    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0,
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1')
          onPageChange?.(pageNum)
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    setTimeout(() => {
      Object.values(pageRefs.current).forEach((pageElement) => {
        if (pageElement) {
          observer.observe(pageElement)
        }
      })
    }, 300)

    return () => {
      observer.disconnect()
    }
  }, [isFullscreen, numPages, pdfLoaded, onPageChange])

  // Toggle CUSTOM fullscreen (no native API - fixes dialog visibility)
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      if (!prev) {
        // Prepare for fullscreen entry
        setShouldScrollToPage(true)
        setPdfLoaded(false)
      } else {
        // Cleanup on exit
        setPdfLoaded(false)
        setShouldScrollToPage(false)
        setMenuPosition(null)
        setSelectedText('')
      }
      return !prev
    })
  }

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= (numPages ?? 0)) {
      onPageChange?.(pageNum)
      pageRefs.current[pageNum]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setTimeout(() => {
      setPdfLoaded(true)
    }, 150)
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

      {/* CUSTOM Fullscreen Overlay (replaces native fullscreen) */}
      <div
        className={`fixed inset-0 z-50 bg-white transition-all duration-300 ease-in-out ${
          isFullscreen 
            ? 'opacity-100 visible pointer-events-auto' 
            : 'opacity-0 invisible pointer-events-none'
        }`}>
        {isFullscreen && (
          <>
            {/* Selection Menu (appears above PDF content) */}
            {menuPosition && selectedText && (
              <div
                className="selection-menu fixed z-[60] bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2"
                style={{
                  left: `${menuPosition.x}px`,
                  top: `${menuPosition.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleGenerateAI}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Translate/Answer
                </Button>
              </div>
            )}

            {/* Navigation Controls */}
            <div className='absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 flex items-center gap-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}>
                <ChevronLeft className='h-4 w-4' />
              </Button>
              
              <span className='text-sm font-medium'>
                Page {currentPage} of {numPages ?? '...'}
              </span>
              
              <Button
                variant='ghost'
                size='sm'
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= (numPages ?? 0)}>
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>

            {/* Close Button */}
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
                  onLoadSuccess={handleLoadSuccess}
                  file={fileUrl}>
                  {Array.from({ length: numPages ?? 0 }).map((_, i) => (
                    <div
                      key={i}
                      ref={(el) => {
                        pageRefs.current[i + 1] = el
                      }}
                      data-page-number={i + 1}
                      className='mb-4'>
                      <Page width={width ?? 1} pageNumber={i + 1} />
                    </div>
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