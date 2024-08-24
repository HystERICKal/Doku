"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { trpc } from '../_trpc/client'
import { Loader2 } from 'lucide-react'

const Page = () => { //The purpose of this page is to sync the user with the database
  const router = useRouter() //hook (means we should declare this file as a client component)

  const searchParams = useSearchParams() //hook (means we should declare this file as a client component)
  const origin = searchParams.get('origin')

  trpc.authCallback.useQuery(undefined, { //query runs on page load...this is a client side library...will execute client side
    onSuccess: ({ success }) => {
      if (success) {
        // user is synced to database
        router.push(origin ? `/${origin}` : '/dashboard') //that dollar sign thing is a template literal
      }
    },
    onError: (err) => { //handle error thrown from src->trpc->index.ts
      if (err.data?.code === 'UNAUTHORIZED') { //if the error is UNAUTHORIZED it means they arent authenticated
        router.push('/sign-in') //force them to authenticate
      }
    },
    retry: true, //send request again until the route returns something successful
    retryDelay: 500, //every half a sec check if user is synced to the db
  })

  return (
    <div className='w-full mt-24 flex justify-center'>
      <div className='flex flex-col items-center gap-2'>
        <Loader2 className='h-8 w-8 animate-spin text-zinc-800' /> {/* beautiful loading spinner */}
        <h3 className='font-semibold text-xl'>
          Setting up your account...
        </h3>
        <p>You will be redirected automatically.</p>
      </div>
    </div>
  )
}

export default Page
