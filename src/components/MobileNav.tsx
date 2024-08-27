'use client'

import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const MobileNav = ({ isAuth }: { isAuth: boolean }) => {
  const [isOpen, setOpen] = useState<boolean>(false) //create a state for the mobile nav to track if it is open

  const toggleOpen = () => setOpen((prev) => !prev) //create a function to toggle the mobile nav

  const pathname = usePathname()  //get the current pathname

  useEffect(() => { //when the pathname changes, close the mobile nav
    if (isOpen) toggleOpen() //close the mobile nav
  }, [pathname]) //useeffect dependency array

  const closeOnCurrent = (href: string) => { //create a function to close the mobile nav if the current page is the same as the href
    if (pathname === href) { //if the current page is the same as the href, close the mobile nav
      toggleOpen() //close the mobile nav
    }
  }

  return (
    <div className='sm:hidden'>
      <Menu
        onClick={toggleOpen} //when the menu is clicked, toggle the mobile nav
        className='relative z-50 h-5 w-5 text-zinc-700'
      />

      {isOpen ? ( //if the mobile nav is open, show the mobile nav
        <div className='fixed animate-in slide-in-from-top-5 fade-in-20 inset-0 z-0 w-full'>
          <ul className='absolute bg-white border-b border-zinc-200 shadow-xl grid w-full gap-3 px-10 pt-20 pb-8'>
            {!isAuth ? ( //if the user is not logged in, show the get started, sign in, and pricing buttons
              <>
                <li>
                  <Link
                    onClick={() => 
                      closeOnCurrent('/sign-up') //close the mobile nav if the current page is the same as the href
                    }
                    className='flex items-center w-full font-semibold text-green-600'
                    href='/sign-up'>
                    Get started
                    <ArrowRight className='ml-2 h-5 w-5' />
                  </Link>
                </li>
                <li className='my-3 h-px w-full bg-gray-300' />
                <li>
                  <Link
                    onClick={() =>
                      closeOnCurrent('/sign-in') //close the mobile nav if the current page is the same as the href
                    }
                    className='flex items-center w-full font-semibold'
                    href='/sign-in'>
                    Sign in
                  </Link>
                </li>
                <li className='my-3 h-px w-full bg-gray-300' />
                <li>
                  <Link
                    onClick={() =>
                      closeOnCurrent('/pricing') //close the mobile nav if the current page is the same as the href
                    }
                    className='flex items-center w-full font-semibold'
                    href='/pricing'>
                    Pricing
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link
                    onClick={() =>
                      closeOnCurrent('/dashboard') //close the mobile nav if the current page is the same as the href
                    }
                    className='flex items-center w-full font-semibold'
                    href='/dashboard'>
                    Dashboard
                  </Link>
                </li>
                <li className='my-3 h-px w-full bg-gray-300' />
                <li>
                  <Link
                    className='flex items-center w-full font-semibold'
                    href='/sign-out'>
                    Sign out
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default MobileNav
