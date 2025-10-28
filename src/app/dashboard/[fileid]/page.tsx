import ChatWrapper from '@/components/chat/ChatWrapper'
import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { notFound, redirect } from 'next/navigation'
import PdfRendererClient from '@/components/PdfRendererClient'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

interface PageProps {
  params: {
    fileid: string
  }
}

const Page = async ({ params }: PageProps) => {
  const { fileid } = await params

  const { getUser } = getKindeServerSession()
  const user = await getUser()

  if (!user || !user.id)
    redirect(`/auth-callback?origin=dashboard/${fileid}`)

  const file = await db.file.findFirst({
    where: {
      id: fileid,
      userId: user.id,
    },
  })

  if (!file) notFound()

  const plan = await getUserSubscriptionPlan()

  return (
    <div className='flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]'>
      {/* ✅ Add Flashcards Navigation Button */}
      <div className='border-b border-gray-200 bg-white px-4 py-2 flex justify-between items-center'>
        <h2 className='text-sm font-medium text-gray-700 truncate'>
          {file.name}
        </h2>
        <Link href={`/dashboard/${fileid}/flashcards`}>
          <Button variant='outline' size='sm'>
            <BookOpen className='h-4 w-4 mr-2' />
            Flashcards
          </Button>
        </Link>
      </div>

      <div className='mx-auto w-full max-w-8xl grow lg:flex xl:px-2'>
        {/* Left sidebar & main wrapper */}
        <div className='flex-1 xl:flex'>
          <div className='px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6'>
            <PdfRendererClient url={file.url} fileId={file.id} />
          </div>
        </div>

        <div className='shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0'>
          <ChatWrapper fileId={file.id} isSubscribed={plan.isSubscribed}/>
        </div>
      </div>
    </div>
  )
}

export default Page