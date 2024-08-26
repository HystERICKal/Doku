'use client'

import { getUserSubscriptionPlan } from '@/lib/stripe'
import { useToast } from './ui/use-toast'
import { trpc } from '@/app/_trpc/client'
import MaxWidthWrapper from './MaxWidthWrapper'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface BillingFormProps { //create an interface for the billing form
  //This goes ahead to check what the getUserSubscriptionPlan function returns (that's the meaning of <typeof...), and then because that's a promise, and because it asynchronous, we await it to get the result of the awaited promise (operation), which is nothing else but the output of that function we can simply use as a prop in here.
  subscriptionPlan: Awaited<
    ReturnType<typeof getUserSubscriptionPlan> //get the subscription plan the user is on
  >
}

const BillingForm = ({ //create a function for the billing form
  subscriptionPlan, //get the subscription plan the user is on
}: BillingFormProps) => {
  const { toast } = useToast() //destructuring the toast function from the useToast hook

  //this is the alternative page to the pricing page, where the user can upgrade to a PRO plan
  const { mutate: createStripeSession, isLoading } =  //destructuring the createStripeSession mutation and isLoading from the trpc.createStripeSession.useMutation hook
    trpc.createStripeSession.useMutation({ //create a mutation to create a stripe session
      onSuccess: ({ url }) => { //if the mutation is successful, redirect the user to the url
        if (url) window.location.href = url //redirect the user to the url
        if (!url) { //if there is no url, show a toast message
          toast({
            title: 'There was a problem...',
            description: 'Please try again in a moment',
            variant: 'destructive',
          })
        }
      },
    })

  return (
    <MaxWidthWrapper className='max-w-5xl'>
      <form //create a form for the billing form
        className='mt-12'
        onSubmit={(e) => { //when the form is submitted, prevent the default action and create a stripe session
          e.preventDefault()
          createStripeSession()
        }}>
        <Card> 
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>
              You are currently on the{' '}
              <strong>{subscriptionPlan.name}</strong> plan. { /*display the subscription plan the user is on*/}
            </CardDescription>
          </CardHeader>

          <CardFooter className='flex flex-col items-start space-y-2 md:flex-row md:justify-between md:space-x-0'>
            <Button type='submit'>
              {isLoading ? ( //if the page is loading, show a loader icon else show the text
                <Loader2 className='mr-4 h-4 w-4 animate-spin' />
              ) : null}
              {subscriptionPlan.isSubscribed //if the user is subscribed, show the text 'Manage Subscription' else show the text 'Upgrade to PRO'
                ? 'Manage Subscription'
                : 'Upgrade to PRO'}
            </Button>

            {subscriptionPlan.isSubscribed ? ( //if the user is subscribed...
              <p className='rounded-full text-xs font-medium'>
                {subscriptionPlan.isCanceled //if the user has canceled the subscription, show the text 'Your plan will be canceled on' else show the text 'Your plan renews on'
                  ? 'Your plan will be canceled on '
                  : 'Your plan renews on'}
                {format(
                  subscriptionPlan.stripeCurrentPeriodEnd!, //get the current period end date
                  'dd.MM.yyyy'
                )}
                .
              </p>
            ) : null //if the user is not subscribed, do nothing
            }
          </CardFooter>
        </Card>
      </form>
    </MaxWidthWrapper>
  )
}

export default BillingForm
