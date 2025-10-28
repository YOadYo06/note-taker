import { db } from '@/db'
import { gemini } from '@/lib/gemini'
import { getPineconeClient } from '@/lib/pinecone'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const RequestValidator = z.object({
  text: z.string(),
  language: z.string(),
  fileId: z.string(),
})

export const POST = async (req: NextRequest) => {
  const body = await req.json()

  const { getUser } = getKindeServerSession()
  const user = await getUser()

  const userId = user?.id

  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { text, language, fileId } = RequestValidator.parse(body)

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  })

  if (!file)
    return new Response('Not found', { status: 404 })

  // 1: vectorize the selected text to get context
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY!,
    model: 'text-embedding-004',
  })

  const pinecone = await getPineconeClient()
  const pineconeIndex = pinecone.Index('note-taker')

  const vectorStore = await PineconeStore.fromExistingIndex(
    embeddings,
    {
      pineconeIndex,
      namespace: file.id,
    }
  )

  const results = await vectorStore.similaritySearch(text, 3)

  const contextText = results.map((r) => r.pageContent).join('\n\n')

  // Get language name for better prompts
  const languageNames: Record<string, string> = {
    ar: 'Arabic',
    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    ja: 'Japanese',
  }

  const targetLanguageName = languageNames[language] || 'English'

  const prompt = `You are a helpful AI assistant and a flashcard generator , but you generate only te answer part, you have to consider he selected text as something needs to be explained, in order to generate an answer to it, our job to generate an answer of a flash card tat already have the selected text as a something need to be explained (question).
   The user has selected the following text from a document and wants your help.

SELECTED TEXT:
${text}

RELEVANT CONTEXT FROM DOCUMENT:
${contextText}

TASK:
1. If the text needs translation, translate it to ${targetLanguageName}.
2. If the text is a question or concept, provide a clear and concise explanation or answer in ${targetLanguageName}.
3. If the text is a definition or term, explain it thoroughly in ${targetLanguageName}.

Provide a helpful response that would be useful as a flashcard answer. Keep it concise but informative.
give only the answer in 3 to 5 lines`

  const model = gemini.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.3,
    }
  })

  try {
    const result = await model.generateContentStream(prompt)
    
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            controller.enqueue(encoder.encode(chunkText))
          }
          
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })

  } catch (error) {
    console.error('Gemini API error:', error)
    return new Response('Error generating response', { status: 500 })
  }
}