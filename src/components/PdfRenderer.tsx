'use client'

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { toast } from 'sonner'

import { useResizeDetector } from 'react-resize-detector'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState, useEffect } from 'react'

import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

import SimpleBar from 'simplebar-react'
import PdfFullscreen from './PdfFullscreen'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfRendererProps {
  url: string
  fileId?: string
  onCreateFlashcard?: (text: string) => void
  onGenerateAI?: (text: string) => void
}

const PdfRenderer = ({ url, fileId, onCreateFlashcard, onGenerateAI }: PdfRendererProps) => {
  const [numPages, setNumPages] = useState<number>()
  const [currPage, setCurrPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [renderedScale, setRenderedScale] = useState<number | null>(null)
  
  // Selection menu state
  const [selectedText, setSelectedText] = useState<string>('')
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)

  const isLoading = renderedScale !== scale

  const CustomPageValidator = z.object({
    page: z
      .string()
      .refine(
        (num) => Number(num) > 0 && Number(num) <= numPages!
      ),
  })

  type TCustomPageValidator = z.infer<typeof CustomPageValidator>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TCustomPageValidator>({
    defaultValues: {
      page: '1',
    },
    resolver: zodResolver(CustomPageValidator),
  })

  const { width, ref } = useResizeDetector()

  const handlePageSubmit = ({ page }: TCustomPageValidator) => {
    setCurrPage(Number(page))
    setValue('page', String(page))
  }

  // Handle text selection
  useEffect(() => {
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
  }, [])

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

  const handleGenerateAI = () => {
    if (onGenerateAI) {
      onGenerateAI(selectedText)
    } else {
      toast.success('Generating AI response...', {
        description: selectedText.substring(0, 50) + '...',
      })
    }
    setMenuPosition(null)
    setSelectedText('')
    window.getSelection()?.removeAllRanges()
  }

  return (
    <div className='w-full bg-white rounded-md shadow flex flex-col items-center relative'>
      {/* Selection Menu */}
      {menuPosition && selectedText && (
        <div
          className="selection-menu fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2"
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

      <div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2'>
        <div className='flex items-center gap-1.5'>
          <Button
            disabled={currPage <= 1}
            onClick={() => {
              setCurrPage((prev) =>
                prev - 1 > 1 ? prev - 1 : 1
              )
              setValue('page', String(currPage - 1))
            }}
            variant='ghost'
            aria-label='previous page'>
            <ChevronDown className='h-4 w-4' />
          </Button>

          <div className='flex items-center gap-1.5'>
            <Input
              {...register('page')}
              className={cn(
                'w-12 h-8',
                errors.page && 'focus-visible:ring-red-500'
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(handlePageSubmit)()
                }
              }}
            />
            <p className='text-zinc-700 text-sm space-x-1'>
              <span>/</span>
              <span>{numPages ?? 'x'}</span>
            </p>
          </div>

          <Button
            disabled={
              numPages === undefined ||
              currPage === numPages
            }
            onClick={() => {
              setCurrPage((prev) =>
                prev + 1 > numPages! ? numPages! : prev + 1
              )
              setValue('page', String(currPage + 1))
            }}
            variant='ghost'
            aria-label='next page'>
            <ChevronUp className='h-4 w-4' />
          </Button>
        </div>

        <div className='space-x-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className='gap-1.5'
                aria-label='zoom'
                variant='ghost'>
                <Search className='h-4 w-4' />
                {scale * 100}%
                <ChevronDown className='h-3 w-3 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => setScale(1)}>
                100%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(1.5)}>
                150%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(2)}>
                200%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(2.5)}>
                250%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setRotation((prev) => prev + 90)}
            variant='ghost'
            aria-label='rotate 90 degrees'>
            <RotateCw className='h-4 w-4' />
          </Button>

            <PdfFullscreen
    fileUrl={url}
    currentPage={currPage}
    onPageChange={(newPage) => {
      setCurrPage(newPage)
      setValue('page', String(newPage))
    }}
    onGenerateAI={onGenerateAI} // Keep passing this prop
    fileId={fileId} // Add this line
  />
        </div>
      </div>

      <div className='flex-1 w-full max-h-screen'>
        <SimpleBar
          autoHide={false}
          className='max-h-[calc(100vh-10rem)]'>
          <div ref={ref}>
            <Document
              loading={
                <div className='flex justify-center'>
                  <Loader2 className='my-24 h-6 w-6 animate-spin' />
                </div>
              }
              onLoadError={() => {
                toast.error('Error loading PDF',{
                  description: 'Please try again later',
                })
              }}
              onLoadSuccess={({ numPages }) =>
                setNumPages(numPages)
              }
              file={url}
              className='max-h-full'>
              {isLoading && renderedScale ? (
                <Page
                  width={width ? width : 1}
                  pageNumber={currPage}
                  scale={scale}
                  rotate={rotation}
                  key={'@' + renderedScale}
                />
              ) : null}

              <Page
                className={cn(isLoading ? 'hidden' : '')}
                width={width ? width : 1}
                pageNumber={currPage}
                scale={scale}
                rotate={rotation}
                key={'@' + scale}
                loading={
                  <div className='flex justify-center'>
                    <Loader2 className='my-24 h-6 w-6 animate-spin' />
                  </div>
                }
                onRenderSuccess={() =>
                  setRenderedScale(scale)
                }
              />
            </Document>
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}

export default PdfRenderer