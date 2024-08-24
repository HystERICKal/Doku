'use client'

import { trpc } from '@/app/_trpc/client'
import UploadButton from './UploadButton'
import {
  Ghost,
  Loader2,
  MessageSquare,
  Plus,
  Trash,
} from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from './ui/button'
import { useState } from 'react'
import { getUserSubscriptionPlan } from '@/lib/stripe'

interface PageProps {
  subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>
}

const Dashboard = ({subscriptionPlan}: PageProps) => {
  const [currentlyDeletingFile, setCurrentlyDeletingFile] =
    useState<string | null>(null)

  const utils = trpc.useContext() //invalidates the query below forcing it to refresh the data so that when it refreshes, it will see that the file no longer exists since it was deleted and remove it from the page without the user having to reload the page

  const { data: files, isLoading } =
    trpc.getUserFiles.useQuery() //client side utility that allows data to be fetched

  const { mutate: deleteFile } =
    trpc.deleteFile.useMutation({
      onSuccess: () => {
        utils.getUserFiles.invalidate()
      },
      onMutate({ id }) {
        setCurrentlyDeletingFile(id) //get the id of the current file being deleted so that the loading state can only be shown on this file and not all files
      },
      onSettled() {
        setCurrentlyDeletingFile(null) //when everything is done, set it back to null to remove the loading state
      },
    })

  return (
    <main className='mx-auto max-w-7xl md:p-10'>
      <div className='mt-8 flex flex-col items-start justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:gap-0'>
        <h1 className='mb-3 font-bold text-5xl text-gray-900'>
          My Files
        </h1>

        <UploadButton isSubscribed={subscriptionPlan.isSubscribed} /> {/* separate component */}
      </div>

      {/* display all user files */}
      {files && files?.length !== 0 ? ( // if we have 1 or more files...
        <ul className='mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3'>
          {files
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .map((file) => (
              <li
                key={file.id} //everytime when map is is used one needs a key
                className='col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg'>
                <Link
                  href={`/dashboard/${file.id}`} //made possible by using dynamic next.js routes
                  className='flex flex-col gap-2'>
                  <div className='pt-6 px-6 flex w-full items-center justify-between space-x-6'>
                    <div className='h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500' /> {/*just for decoration */}
                    <div className='flex-1 truncate'> {/*truncate to cut off file names if they are really long */}
                      <div className='flex items-center space-x-3'>
                        <h3 className='truncate text-lg font-medium text-zinc-900'>
                          {file.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className='px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500'>
                  <div className='flex items-center gap-2'>
                    <Plus className='h-4 w-4' />
                    {format(
                      new Date(file.createdAt),
                      'MMM yyyy'
                    )}
                  </div>

                  <div className='flex items-center gap-2'>
                    <MessageSquare className='h-4 w-4' />
                    mocked
                  </div>

                  <Button
                    onClick={() =>
                      deleteFile({ id: file.id })
                    }
                    size='sm'
                    className='w-full'
                    variant='destructive'>
                    {currentlyDeletingFile === file.id ? (
                      <Loader2 className='h-4 w-4 animate-spin' /> //when delete button is clicked, then activate this loading stage
                    ) : (
                      <Trash className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      ) : isLoading ? ( //no files yet or files is undefined...if route is loading
        <Skeleton height={100} className='my-2' count={3} /> //when you refresh page you see this while page is loading
      ) : ( //not loading and no files yet...
        <div className='mt-16 flex flex-col items-center gap-2'>
          <Ghost className='h-8 w-8 text-zinc-800' />
          <h3 className='font-semibold text-xl'>
            Pretty empty around here
          </h3>
          <p>Please upload your first PDF using the &#x201F;Upload PDF&#x201F; button above.</p>
        </div>
      )}
    </main>
  )
}

export default Dashboard
