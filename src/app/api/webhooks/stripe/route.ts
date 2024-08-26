import { db } from '@/db'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

export async function POST(request: Request) { //create a POST request for the webhook
  const body = await request.text() //get the body of the request
  const signature = headers().get('Stripe-Signature') ?? '' //get the signature of the request

  let event: Stripe.Event //create an event for the webhook

  try {
    //this event comes from stripe...no user should be able to invoke this endpoint
    event = stripe.webhooks.constructEvent( //construct the event for the webhook using the body, signature, and the stripe webhook secret
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || '' //stripe is going to send a stripe webhook secret with every request that we can then check against, if that is in the request to determine whether the user has actually paid for the service
    )
  } catch (err) { //if there is an error, return a response with the error message
    return new Response(
      `Webhook Error: ${
        err instanceof Error ? err.message : 'Unknown Error'
      }`,
      { status: 400 }
    )
  }

  const session = event.data
    .object as Stripe.Checkout.Session //get the session object from the event

  if (!session?.metadata?.userId) { //if there is no userId in the session, return a response with a status of 200
    return new Response(null, {
      status: 200,
    })
  }

  if (event.type === 'checkout.session.completed') { //if the checkout session is completed, if the user buys for the first time
    const subscription =
      await stripe.subscriptions.retrieve( //retrieve the subscription details from stripe
        session.subscription as string  //get the subscription id from the session
      )

    await db.user.update({  //update the user in the database
      where: {
        id: session.metadata.userId,  
      },
      data: { //update the user with the stripe subscription id, stripe customer id, stripe price id, and stripe current period end
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      },
    })
  }

  //When user monthly plan is renewed...
  if (event.type === 'invoice.payment_succeeded') { //if the invoice payment is successful
    // Retrieve the subscription details from Stripe.
    const subscription = 
      await stripe.subscriptions.retrieve( //retrieve the subscription details from stripe
        session.subscription as string  //get the subscription id from the session
      )

    await db.user.update({  //update the user in the database
      where: {
        stripeSubscriptionId: subscription.id,  //get the subscription id from stripe
      },
      data: { //update the user with the stripe subscription id, stripe customer id, stripe price id, and stripe current period end
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
      },
    })
  }

  return new Response(null, { status: 200 })  //return a response with a status of 200
}
