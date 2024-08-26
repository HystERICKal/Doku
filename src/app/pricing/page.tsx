import MaxWidthWrapper from '@/components/MaxWidthWrapper'
import UpgradeButton from '@/components/UpgradeButton'
import { buttonVariants } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PLANS } from '@/config/stripe'
import { cn } from '@/lib/utils'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  ArrowRight,
  Check,
  HelpCircle,
  Minus,
} from 'lucide-react'
import Link from 'next/link'

const Page = () => { //create a page for the pricing
  const { getUser } = getKindeServerSession() //get the user from the session
  const user = getUser()

  const pricingItems = [ //create an array of pricing items
    {
      plan: 'Free',
      tagline: 'For small side projects.',
      quota: 10,
      features: [
        {
          text: '5 pages per PDF',
          footnote:
            'The maximum amount of pages per PDF-file.',
        },
        {
          text: '4MB file size limit',
          footnote:
            'The maximum file size of a single PDF file.',
        },
        {
          text: 'Mobile-friendly interface',
        },
        {
          text: 'Higher-quality responses',
          footnote:
            'Better algorithmic responses for enhanced content quality',
          negative: true,
        },
        {
          text: 'Priority support',
          negative: true,
        },
      ],
    },
    {
      plan: 'Pro',
      tagline: 'For larger projects with higher needs.',
      quota: PLANS.find((p) => p.slug === 'pro')!.quota,
      features: [
        {
          text: '25 pages per PDF',
          footnote:
            'The maximum amount of pages per PDF-file.',
        },
        {
          text: '16MB file size limit',
          footnote:
            'The maximum file size of a single PDF file.',
        },
        {
          text: 'Mobile-friendly interface',
        },
        {
          text: 'Higher-quality responses',
          footnote:
            'Better algorithmic responses for enhanced content quality',
        },
        {
          text: 'Priority support',
        },
      ],
    },
  ]

  return (
    <>
      <MaxWidthWrapper className='mb-8 mt-24 text-center max-w-5xl'>
        <div className='mx-auto mb-10 sm:max-w-lg'>
          <h1 className='text-6xl font-bold sm:text-7xl'>
            Pricing
          </h1>
          <p className='mt-5 text-gray-600 sm:text-lg'>
            Whether you&apos;re just trying out our service
            or need more, we&apos;ve got you covered.
          </p>
        </div>

        <div className='pt-12 grid grid-cols-1 gap-10 lg:grid-cols-2'>
          <TooltipProvider> {/*use the TooltipProvider to provide tooltips (like explainer tips) for the pricing items*/}
            {pricingItems.map( //map through the pricing items to display them
              ({ plan, tagline, quota, features }) => { //destructure the plan, tagline, quota, and features from the pricing items
                const price =  PLANS.find((p) => p.slug === plan.toLowerCase())?.price.amount || 0 //set the price of the plan to the amount of the plan in the PLANS array or 0 if the plan is not found
                return (
                  <div
                    key={plan}
                    className={cn( //dynamic classname with the cn helper function
                      'relative rounded-2xl bg-white shadow-lg', //set the classname to a rounded-2xl white background with a shadow
                      {
                        'border-2 border-blue-600 shadow-blue-200': //if the plan is Pro, set the border to blue-600 and the shadow to blue-200
                          plan === 'Pro',
                        'border border-gray-200': //if the plan is not Pro, set the border to gray-200
                          plan !== 'Pro',
                      }
                    )}>
                    {plan === 'Pro' && ( //if the plan is Pro, show the upgrade now button
                      <div className='absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-sm font-medium text-white'>
                        Upgrade now
                      </div>
                    )}

                    <div className='p-5'> {/*show the plan, tagline, price, and quota*/}
                      <h3 className='my-3 text-center font-display text-3xl font-bold'>
                        {plan}
                      </h3>
                      <p className='text-gray-500'>
                        {tagline}
                      </p>
                      <p className='my-5 font-display text-6xl font-semibold'>
                        ZAR{price}
                      </p>
                      <p className='text-gray-500'>
                        per month
                      </p>
                    </div>

                    <div className='flex h-20 items-center justify-center border-b border-t border-gray-200 bg-gray-50'>
                      <div className='flex items-center space-x-1'>
                        <p>
                          {quota.toLocaleString()} PDFs/mo included
                        </p>

                        <Tooltip delayDuration={300}> {/*show a tooltip with a delay duration of 300ms*/}
                          <TooltipTrigger className='cursor-default ml-1.5'> {/*show a tooltip trigger with a cursor-default and margin-left of 1.5*/}
                            <HelpCircle className='h-4 w-4 text-zinc-500' /> {/*show a help circle icon with a height and width of 4 and a text-zinc-500 color*/}
                          </TooltipTrigger>
                          <TooltipContent className='w-80 p-2'> {/*show a tooltip content with a width of 80 and padding of 2*/}
                            How many PDFs you can upload per
                            month.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <ul className='my-10 space-y-5 px-8'>
                      {features.map( //map through the features to display them
                        ({ text, footnote, negative }) => ( //destructure the text, footnote, and negative from the features
                          <li
                            key={text} //set the key to the text
                            className='flex space-x-5'>
                            <div className='flex-shrink-0'>
                              {negative ? ( //if the feature is negative, show a minus icon, else show a check icon
                                <Minus className='h-6 w-6 text-gray-300' />
                              ) : (
                                <Check className='h-6 w-6 text-blue-500' />
                              )}
                            </div>
                            {footnote ? ( //if there is a footnote, show the text and footnote with a space-x-1 flex items-center
                              <div className='flex items-center space-x-1'>
                                <p
                                  className={cn( //dynamic classname with the cn helper function
                                    'text-gray-600',
                                    {
                                      'text-gray-400':
                                        negative, //if the feature is negative, set the text to gray-400
                                    }
                                  )}>
                                  {text} {/*show the text*/}
                                </p>
                                <Tooltip
                                  delayDuration={300}> {/*show a tooltip with a delay duration of 300ms*/}
                                  <TooltipTrigger className='cursor-default ml-1.5'>
                                    <HelpCircle className='h-4 w-4 text-zinc-500' />
                                  </TooltipTrigger>
                                  <TooltipContent className='w-80 p-2'>
                                    {footnote}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <p
                                className={cn( //dynamic classname with the cn helper function
                                  'text-gray-600',
                                  {
                                    'text-gray-400':
                                      negative, //if the feature is negative, set the text to gray-400
                                  }
                                )}>
                                {text}
                              </p>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                    <div className='border-t border-gray-200' />
                    <div className='p-5'>
                      {plan === 'Free' ? ( //if the plan is Free, show the upgrade now button
                        <Link //link to the dashboard if the user is logged in, else link to the sign-in page
                          href={
                            user ? '/dashboard' : '/sign-in'
                          }
                          className={buttonVariants({ //use the buttonVariants function to set the button variant
                            className: 'w-full',
                            variant: 'secondary',
                          })}>
                          {user ? 'Upgrade now' : 'Sign up'} {/*if the user is logged in, show Upgrade now, else show Sign up*/}
                          <ArrowRight className='h-5 w-5 ml-1.5' />
                        </Link>
                      ) : user ? ( //if the user is logged in, show the upgrade button
                        <UpgradeButton /> //show the upgrade button
                      ) : (
                        <Link //link to the sign-in page
                          href='/sign-in'
                          className={buttonVariants({ //use the buttonVariants function to set the button variant
                            className: 'w-full',
                          })}>
                          {user ? 'Upgrade now' : 'Sign up'} {/*if the user is logged in, show Upgrade now, else show Sign up*/}
                          <ArrowRight className='h-5 w-5 ml-1.5' />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </TooltipProvider>
        </div>
      </MaxWidthWrapper>
    </>
  )
}

export default Page
