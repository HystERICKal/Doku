import { PLANS } from '@/config/stripe'
import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { //create a new instance of the stripe object
  apiVersion: '2023-08-16',
  typescript: true,
})

export async function getUserSubscriptionPlan() { //function to get the user subscription plan
  const { getUser } = getKindeServerSession() //get the user from the session
  const user = getUser()  //get the user from the session

  if (!user.id) { //if the user id is not present, return the default plan
    return { //return null for all valuesto indicate that the user is not subscribed
      ...PLANS[0],
      isSubscribed: false,
      isCanceled: false,
      stripeCurrentPeriodEnd: null,
    }
  }

  const dbUser = await db.user.findFirst({ //find the user in the database using the user id
    where: {
      id: user.id, //find the user with the user id
    },
  })

  if (!dbUser) { //if the user is not found in the database, return the default plan
    return {
      ...PLANS[0],
      isSubscribed: false,
      isCanceled: false,
      stripeCurrentPeriodEnd: null,
    }
  }

  const isSubscribed = Boolean( //check if the user is subscribed
    dbUser.stripePriceId && //check if the user has a stripe price id
      dbUser.stripeCurrentPeriodEnd && // 86400000 = 1 day
      dbUser.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now() //check if the current period end date is greater than the current date
  )

  const plan = isSubscribed //get the plan for the user
    ? PLANS.find((plan) => plan.price.priceIds.test === dbUser.stripePriceId) //if the user is subscribed, get the plan for the user
    : null //if the user is not subscribed, return null

  let isCanceled = false //set the isCanceled flag to false
  if (isSubscribed && dbUser.stripeSubscriptionId) { //if the user is subscribed and has a stripe subscription id
    const stripePlan = await stripe.subscriptions.retrieve( //retrieve the subscription from stripe
      dbUser.stripeSubscriptionId //get the subscription id from the user
    )
    isCanceled = stripePlan.cancel_at_period_end //check if the subscription is canceled
  }

  return { //return the plan for the user
    ...plan,
    stripeSubscriptionId: dbUser.stripeSubscriptionId,
    stripeCurrentPeriodEnd: dbUser.stripeCurrentPeriodEnd,
    stripeCustomerId: dbUser.stripeCustomerId,
    isSubscribed,
    isCanceled,
  }
}