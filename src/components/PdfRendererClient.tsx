'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/app/_trpc/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Dynamically import PdfRenderer with SSR disabled
const PdfRenderer = dynamic(() => import('@/components/PdfRenderer'), {
  ssr: false,
  loading: () => (
    <div className='flex justify-center items-center h-[calc(100vh-10rem)]'>
      <Loader2 className='h-8 w-8 animate-spin' />
    </div>
  ),
})

interface PdfRendererClientProps {
  url: string
  fileId: string
}

const LANGUAGES = [
  { value: 'ar', label: 'Arabic' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

export default function PdfRendererClient({ url, fileId }: PdfRendererClientProps) {
  const [aiDialog, setAiDialog] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [targetLanguage, setTargetLanguage] = useState('ar')

  const utils = trpc.useUtils()

  const createFlashcard = trpc.createFlashcard.useMutation({
    onSuccess: () => {
      toast.success('Flashcard created successfully!')
      utils.getFlashcardsByFileId.invalidate({ fileId })
    },
    onError: () => {
      toast.error('Failed to create flashcard')
    },
  })

  const handleCreateFlashcard = (text: string) => {
    setSelectedText(text)
    // You can add flashcard dialog here if needed
    toast.success('Creating flashcard...', {
      description: text.substring(0, 50) + '...',
    })
  }

  const handleGenerateAI = async (text: string) => {
    setSelectedText(text)
    setAiDialog(true)
    setIsGenerating(true)
    setAiResponse('')

    try {
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          language: targetLanguage,
          fileId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate AI response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let done = false
      let accResponse = ''

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        accResponse += chunkValue
        setAiResponse(accResponse)
      }
    } catch (error) {
      toast.error('Failed to generate AI response')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveAsFlashcard = () => {
    if (!selectedText || !aiResponse) {
      toast.error('No content to save')
      return
    }

    createFlashcard.mutate({
      fileId,
      question: selectedText,
      answer: aiResponse,
    })
  }

  // Automatically regenerate AI response when language changes
  useEffect(() => {
    if (aiDialog && selectedText) {
      handleGenerateAI(selectedText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage])

  return (
    <>
      <PdfRenderer
        url={url}
        fileId={fileId}
        onCreateFlashcard={handleCreateFlashcard}
        onGenerateAI={handleGenerateAI}
      />

      {/* AI Dialog */}
      <Dialog open={aiDialog} onOpenChange={setAiDialog}>
<DialogContent className="sm:max-w-[600px] z-[100]">
            <DialogHeader>
            <DialogTitle>AI Translation/Answer</DialogTitle>
            <DialogDescription>
              AI-generated response for your selected text
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 z-[99]">
            <div>
              <label className="text-sm font-medium mb-2 block">Target Language</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage} >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Selected Text</label>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                {selectedText}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">AI Response</label>
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating response...
                </div>
              ) : aiResponse ? (
                <div className="text-sm text-gray-900 bg-blue-50 p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {aiResponse}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  Waiting for response...
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAiDialog(false)}>
                Close
              </Button>
              {aiResponse && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResponse)
                      toast.success('Copied to clipboard!')
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    onClick={saveAsFlashcard}
                    disabled={createFlashcard.isPending}
                  >
                    {createFlashcard.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Save as Flashcard'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}