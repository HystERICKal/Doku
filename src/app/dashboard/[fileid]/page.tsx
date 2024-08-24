import ChatWrapper from '@/components/chat/ChatWrapper'
import PdfRenderer from '@/components/PdfRenderer'
import { db } from '@/db'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: {
    fileid: string //name needs to match the name of the folder i.e [fileid]
  }
}

const Page = async ({ params }: PageProps) => {
  const { fileid } = params //derstucture the file id from params

  const { getUser } = getKindeServerSession()
  const user = getUser()

  if (!user || !user.id) //if no user or they aren't logged in
    redirect(`/auth-callback?origin=dashboard/${fileid}`)

  const file = await db.file.findFirst({ //find the first file where
    where: {
      id: fileid, // id in database matches page id from url
      userId: user.id, //matches the logged in user so that one user can't see another's file
    },
  })

  if (!file) notFound() //display a 404 error page if the file is not found in the database

  const plan = await getUserSubscriptionPlan()

  return (
    <div className='flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]'>
      <div className='mx-auto w-full max-w-8xl grow lg:flex xl:px-2'>
        {/* Left sidebar & main wrapper */}
        <div className='flex-1 xl:flex'>
          <div className='px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6'>
            {/* Main area */}
            <PdfRenderer url={file.url} />
          </div>
        </div>

        {/*flex-[0.75] makes the chatwrapper smaller in width than the pdf render */}
        <div className='shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0'>
          <ChatWrapper isSubscribed={plan.isSubscribed} fileId={file.id} />
        </div>
      </div>
    </div>
  )
}

export default Page
