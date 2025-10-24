import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  createUploadthing,
  type FileRouter,
} from 'uploadthing/next'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { PineconeStore } from '@langchain/pinecone'
import { getPineconeClient } from '@/lib/pinecone'

import { getUserSubscriptionPlan } from '@/lib/stripe'
import { PLANS } from '@/config/stripe'


const f = createUploadthing();


export const ourFileRouter = {

    pdfUploader: f({
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
        const { getUser } = getKindeServerSession()
        const user = await getUser()

        if (!user || !user.id) throw new Error('Unauthorized')

        const subscriptionPlan = await getUserSubscriptionPlan()

        return { subscriptionPlan, userId: user.id }

    })
    .onUploadComplete(async ({ metadata, file }) => {
        const createdFile = await db.file.create({
            data: {
                key: file.key,
                name: file.name,
                userId: metadata.userId,
                url:  `https://aly3srcyyg.ufs.sh/f/${file.key}`,
                uploadStatus: "PROCESSING"
            }
        })
        try {
            const response = await fetch(
            `https://aly3srcyyg.ufs.sh/f/${file.key}`
            )

            const blob = await response.blob()

            const loader = new PDFLoader(blob)

            const pageLevelDocs = await loader.load()
            console.log('Loaded pages:', pageLevelDocs.length)  // <- Add this line


            const pagesAmt = pageLevelDocs.length

            const { subscriptionPlan } = metadata
            const { isSubscribed } = subscriptionPlan

            const isProExceeded =
            pagesAmt >
            PLANS.find((plan) => plan.name === 'Pro')!.pagesPerPdf
            const isFreeExceeded =
            pagesAmt >
            PLANS.find((plan) => plan.name === 'Free')!
                .pagesPerPdf

            if (
            (isSubscribed && isProExceeded) ||
            (!isSubscribed && isFreeExceeded)
            ) {
            await db.file.update({
                data: {
                uploadStatus: 'FAILED',
                },
                where: {
                id: createdFile.id,
                },
            })
            console.log('Indexed PDF to Pinecone:', createdFile.id)  // <- Add this
            
            }

            // vectorize and index entire document
            const pinecone = await getPineconeClient()
            const pineconeIndex = pinecone.Index('quill')

            const embeddings = new GoogleGenerativeAIEmbeddings({
            apiKey: process.env.GEMINI_API_KEY,
            model: 'text-embedding-001', // Free tier supports this model
            })
            

            await PineconeStore.fromDocuments(
            pageLevelDocs,
            embeddings,
            {
                pineconeIndex,
                namespace: createdFile.id,
            }
            )

            await db.file.update({
            data: {
                uploadStatus: 'SUCCESS',
            },
            where: {
                id: createdFile.id,
            },
            })
        } catch (err) {
            await db.file.update({
            data: {
                uploadStatus: 'FAILED',
            },
            where: {
                id: createdFile.id,
            },
            })
        }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
  