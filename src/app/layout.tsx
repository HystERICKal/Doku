//This component wraps the entire application and provides a consistent layout across all pages.

import Navbar from '@/components/Navbar'
// import Providers from '@/components/Providers'
import { cn, constructMetadata } from '@/lib/utils'
import { Inter } from 'next/font/google'
import './globals.css'

// import 'react-loading-skeleton/dist/skeleton.css'
// import 'simplebar-react/dist/simplebar.min.css'

import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

// export const metadata = constructMetadata()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' className='light'>
      {/* <Providers> */}
        <body 
          className={cn(
            'min-h-screen font-sans antialiased grainy', // grainy is a custom css class mapped out in globals.css
            inter.className
          )}>
          {/* <Toaster /> */}
          <Navbar />
          {children} {/*All the pages inside the app i.e. landing page e.t.c*/}
        </body>
      {/* </Providers> */}
    </html>
  )
}
