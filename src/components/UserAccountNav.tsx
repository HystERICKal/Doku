import { getUserSubscriptionPlan } from '@/lib/stripe'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import { Avatar, AvatarFallback } from './ui/avatar'
import Image from 'next/image'
import { Icons } from './Icons'
import Link from 'next/link'
import { Gem } from 'lucide-react'
import { LogoutLink } from '@kinde-oss/kinde-auth-nextjs/server'

interface UserAccountNavProps { //create an interface for the user account nav
  email: string | undefined
  name: string
  imageUrl: string
}

const UserAccountNav = async ({ //create a function for the user account nav
  email,
  imageUrl,
  name,
}: UserAccountNavProps) => { //get the email, image url, and name of the user
  const subscriptionPlan = await getUserSubscriptionPlan() //get the subscription plan the user is on

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className='overflow-visible'>
        <Button className='rounded-full h-8 w-8 aspect-square bg-slate-400'>
          <Avatar className='relative w-8 h-8'>
            {imageUrl ? ( //if there is an image url, display the image
              <div className='relative aspect-square h-full w-full'>
                {/* <Image
                  fill
                  src={imageUrl}
                  alt='profile picture'
                  referrerPolicy='no-referrer'
                /> */}
              </div>
            ) : (
              <AvatarFallback>
                <span className='sr-only'>{name}</span>
                <Icons.user className='h-4 w-4 text-zinc-900' />
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='bg-white' align='end'>
        <div className='flex items-center justify-start gap-2 p-2'>
          <div className='flex flex-col space-y-0.5 leading-none'>
            {name && ( //if there is a name, display the name
              <p className='font-medium text-sm text-black'>
                {name}
              </p>
            )}
            {email && ( //if there is an email, display the email
              <p className='w-[200px] truncate text-xs text-zinc-700'>
                {email}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator /> {/* create a separator for the dropdown menu */}

        <DropdownMenuItem asChild>
          <Link href='/dashboard'>Dashboard</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          {subscriptionPlan?.isSubscribed ? ( //if the user is subscribed, show the text 'Manage Subscription' else show the text 'Upgrade'
            <Link href='/dashboard/billing'>
              Manage Subscription
            </Link>
          ) : (
            <Link href='/pricing'>
              Upgrade{' '}
              <Gem className='text-blue-600 h-4 w-4 ml-1.5' />
            </Link>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className='cursor-pointer'>
            <LogoutLink>Log out</LogoutLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserAccountNav
