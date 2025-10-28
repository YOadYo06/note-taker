'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { trpc } from '@/app/_trpc/client'
import { Ghost, Loader2, MessageSquare, Plus, Trash } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import { Button } from './ui/button'
import UploadButton from './UploadButon'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface PageProps {
  subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>
}

const Dashboard = ({ subscriptionPlan }: PageProps) => {
  const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)

  const utils = trpc.useUtils()
  const { data: files, isLoading } = trpc.getUserFiles.useQuery()

  const { mutate: deleteFile } = trpc.deleteFile.useMutation({
    onSuccess: () => utils.getUserFiles.invalidate(),
    onMutate(vars) {
      if (vars) setCurrentlyDeletingFile(vars.id)
    },
    onSettled() {
      setCurrentlyDeletingFile(null)
    },
  })

  return (
    <main className='mx-auto max-w-7xl md:p-10'>
      <div className='mt-8 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:gap-0'>
        <h1 className='mb-3 font-bold text-5xl text-gray-900'>My Files</h1>
        <UploadButton isSubscribed={subscriptionPlan.isSubscribed} />
      </div>

      {files && files.length !== 0 ? (
        <ul className='mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3'>
          {files
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((file: any) => (
              <li
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className='cursor-pointer col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg'>
                <div className='pt-6 px-6 flex w-full items-center justify-between space-x-6'>
                  <div className='h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500' />
                  <div className='flex-1 truncate'>
                    <div className='flex items-center space-x-3'>
                      <h3 className='truncate text-lg font-medium text-zinc-900'>{file.name}</h3>
                    </div>
                  </div>
                </div>

                <div className='px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500'>
                  <div className='flex items-center gap-2'>
                    <Plus className='h-4 w-4' />
                    {format(new Date(file.createdAt), 'MMM yyyy')}
                  </div>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4' />
                    mocked
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFile({ id: file.id })
                    }}
                    size='sm'
                    className='w-full'
                    variant='destructive'>
                    {currentlyDeletingFile === file.id ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      ) : isLoading ? (
        <Skeleton height={100} className='my-2' count={3} />
      ) : (
        <div className='mt-16 flex flex-col items-center gap-2'>
          <Ghost className='h-8 w-8 text-zinc-800' />
          <h3 className='font-semibold text-xl'>Pretty empty around here</h3>
          <p>Let&apos;s upload your first PDF.</p>
        </div>
      )}

      {/* ==== DIALOG FOR FILE OPTIONS ==== */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose an action</DialogTitle>
            <DialogDescription>
              What would you like to do with <strong>{selectedFile?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className='flex gap-3 justify-end'>
            <Link href={`/dashboard/${selectedFile?.id}`} onClick={() => setSelectedFile(null)}>
              <Button variant='default'>Read File</Button>
            </Link>
            <Link href={`/dashboard/${selectedFile?.id}/flashcards`} onClick={() => setSelectedFile(null)}>
              <Button variant='secondary'>Flashcards</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default Dashboard
