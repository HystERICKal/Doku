"use client"

import { ArrowRight } from 'lucide-react'
import { Button } from './ui/button'
import { trpc } from '@/app/_trpc/client'

const UpgradeButton = () => { //create a component for the upgrade button

  const {mutate: createStripeSession} = trpc.createStripeSession.useMutation({ //use the useMutation hook (api route) to create a stripe session
    onSuccess: ({url}) => { //if the session is created successfully, redirect the user to the billing page
      window.location.href = url ?? "/dashboard/billing" //redirect the user to the stripe url if the url is present else redirect the user to the billing page
    }
  })

  return (
    <Button onClick={() => createStripeSession()} className='w-full'>
      Upgrade now <ArrowRight className='h-5 w-5 ml-1.5' />
    </Button>
  )
}

export default UpgradeButton
