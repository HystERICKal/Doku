import { type ClassValue, clsx } from 'clsx'
import { Metadata } from 'next'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  //classValue needs clsx package to be installed
  //tailwind-merge (px-2 py-2 helps to merge it to => p-2)
  return twMerge(clsx(inputs)) //twMerge needs tailwind-merge package to be installed
}

export function absoluteUrl(path: string) { //function to get the absolute url of the path
  if (typeof window !== 'undefined') return path //if the window type is defined, return the relative path since we are not on the client side
  if (process.env.VERCEL_URL) //if there is a process.env.VERCEL_URL, return the absolute path since we are on server side and the app has been deployed on vercel
    return `https://${process.env.VERCEL_URL}${path}` //return the absolute path
  return `http://localhost:${process.env.PORT ?? 3000}${path}` //if the app is running on localhost, return the localhost path
}

export function constructMetadata({ //function to construct metadata for the app
  title = "Doku - the SaaS for students",
  description = "Doku is an open-source software to make chatting to your PDF files easy.",
  image = "/thumbnail.png",
  icons = "/favicon.ico",
  noIndex = false
}: { //pass in the title, description, image, icons and noIndex
  title?: string
  description?: string
  image?: string
  icons?: string
  noIndex?: boolean
} = {}): Metadata {
  return { //return the metadata for the app
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image
        }
      ]
    },
    twitter: { //metadata for twitter
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@erick_nyoro"
    },
    icons,
    metadataBase: new URL('https://doku-three.vercel.app/'),
    themeColor: '#FFF',
    ...(noIndex && {
      robots: {
        index: false,
        follow: false
      }
    })
  }
}