import { db } from '@/db'
import { gemini } from '@/lib/gemini'
import { getPineconeClient } from '@/lib/pinecone'
import { SendMessageValidator } from '@/lib/validators/SendMessageValidator'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PineconeStore } from '@langchain/pinecone'
import { NextRequest } from 'next/server'

export const POST = async (req: NextRequest) => {
  // endpoint for asking a question to a pdf file

  const body = await req.json()

  const { getUser } = getKindeServerSession()
  const user = await getUser()

const userId = user?.id

  if (!userId)
    return new Response('Unauthorized', { status: 401 })

  const { fileId, message } =
    SendMessageValidator.parse(body)

  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  })



  if (!file)
    return new Response('Not found', { status: 404 })

  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  })

  // 1: vectorize message
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

  const results = await vectorStore.similaritySearch(
    message,
    4
  )
  console.log('RAG results:', results.map(r => r.pageContent)) // <- Add this


  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 6,
  })

const formattedPrevMessages = prevMessages.map((msg: typeof prevMessages[number]) => ({
      role: msg.isUserMessage
      ? ('user' as const)
      : ('model' as const), // Changed from 'assistant' to 'model' for Gemini
    content: msg.text,
  }))

  // Build the prompt for Gemini
  const contextText = results.map((r) => r.pageContent).join('\n\n')
  const conversationHistory = formattedPrevMessages.map((message) => {
    if (message.role === 'user')
      return `User: ${message.content}\n`
    return `Assistant: ${message.content}\n`
  }).join('')

  const prompt = `Use the following pieces of context (or previous conversation if needed) to answer the user's question in markdown format. If you don't know the answer, just say that you don't know, don't try to make up an answer.

----------------

PREVIOUS CONVERSATION:
${conversationHistory}

----------------

CONTEXT:
${contextText}

USER INPUT: ${message}

Please provide a helpful response based on the context and conversation history.`

  const model = gemini.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0,
    }
  })

  try {
    const result = await model.generateContentStream(prompt)
    
    // Create a readable stream for the response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            fullResponse += chunkText
            controller.enqueue(encoder.encode(chunkText))
          }
          
          // Save the complete response to database
          await db.message.create({
            data: {
              text: fullResponse,
              isUserMessage: false,
              fileId,
              userId,
            },
          })
          
          controller.close()
        } catch (error) {
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