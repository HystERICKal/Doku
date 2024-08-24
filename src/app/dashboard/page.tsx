//This is a server side rendered page that will be rendered on the server side and then sent to the client side
import Dashboard from '@/components/Dashboard'
import { db } from '@/db'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { redirect } from 'next/navigation'

const Page = async () => {
  const { getUser } = getKindeServerSession() //get current login session of the user
  const user = getUser() //get all current user's properties available

  if (!user || !user.id) redirect('/auth-callback?origin=dashboard') //if user is not logged in, redirect to auth-callback page

  const dbUser = await db.user.findFirst({ //find user in the database and sync it with the current user
    where: {
      id: user.id
    }
  })

  if(!dbUser) redirect('/auth-callback?origin=dashboard') //if not synced to database yet send them back to auth-callback to make the syn happen

  const subscriptionPlan = await getUserSubscriptionPlan()

  return <Dashboard subscriptionPlan={subscriptionPlan} />
}

export default Page
