import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  privateProcedure,
  publicProcedure,
  router,
} from './trpc'
import { TRPCError } from '@trpc/server'
import { db } from '@/db'
import { z } from 'zod'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
import { absoluteUrl } from '@/lib/utils'
import {
  getUserSubscriptionPlan,
  stripe,
} from '@/lib/stripe'
import { PLANS } from '@/config/stripe'

export const appRouter = router({
  //below are all the api routes in the app, built  with the help of trpc
  authCallback: publicProcedure.query(async () => { // api route for auth callback
    const { getUser } = getKindeServerSession() //get user id and email from session
    const user = getUser()

    //Below is the code for the Guard Clause
    //A Guard Clause is a technique derived from the fail-fast method whose purpose 
        // is to validate a condition and immediately stop the code execution about the result of the validation.
    if (!user.id || !user.email)
      throw new TRPCError({ code: 'UNAUTHORIZED' })

    // check if the user is in the database
    const dbUser = await db.user.findFirst({ //This dbUser is the user in the database
      where: {
        id: user.id, //this user is the logged in user
      },
    })

    if (!dbUser) { //if user doesnt exist in database
      // create user in the database
      await db.user.create({
        data: {
          id: user.id, //id is the id in the database and user.id is the id frome Kinde
          email: user.email,
        },
      })
    }

    return { success: true }
  }),
  //api endpoint
  //Pass in a userID and get back all the files a user owns
  //make it a private procedure so that not everyone can query the api endpoint
  //only logged in users should be able to call the api
  //define auth procedure in "trpc->trpc.ts" to ensure only someone who is authenticated can call this procedure 
  getUserFiles: privateProcedure.query(async ({ ctx }) => { //destructure the context
    const { userId } = ctx

    return await db.file.findMany({ 
      where: {
        userId, //find instances where this user id matches the user id above
      },
    })
  }),

  createStripeSession: privateProcedure.mutation( //create a stripe session for the user to upgrade to a premium account
    async ({ ctx }) => { //destructure the context
      const { userId } = ctx //destructure the user id from the context

      const billingUrl = absoluteUrl('/dashboard/billing') //need absolute url to redirect the user to the billing page, can't use relative urls here since this is server side

      if (!userId) //if there is no user id, throw an error
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const dbUser = await db.user.findFirst({ //find the user in the database
        where: {
          id: userId, //find the user where the id matches the user id above
        },
      })

      if (!dbUser) //if the user is not found in the database, throw an error
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const subscriptionPlan = await getUserSubscriptionPlan() //get the subscription plan for the user

      if ( //if the user is already subscribed and has a stripe customer id (are they on a pro plan or not...)
        subscriptionPlan.isSubscribed &&  //check if the user is subscribed
        dbUser.stripeCustomerId //check if the user has a stripe customer id
      ) {
        const stripeSession = //user is subscribed so create a stripe session for the user to manage their subscription
          await stripe.billingPortal.sessions.create({ //create a billing portal session for the user
            customer: dbUser.stripeCustomerId, //get the customer id from the user
            return_url: billingUrl, //return the user to the billing page
          })

        return { url: stripeSession.url } //return the url of the stripe session (returma an object that has a url property that we can sens back to the frontend to redirect the user to)
      }

      const stripeSession = //user is not subscribed so create a stripe session for the user to upgrade to a premium account
        await stripe.checkout.sessions.create({ //create a checkout session for the user
          success_url: billingUrl, //redirect the user to the billing page
          cancel_url: billingUrl, //redirect the user to the billing page
          payment_method_types: ['card', 'paypal'], //allow the user to pay with card or paypal
          mode: 'subscription', //set the mode to subscription
          billing_address_collection: 'auto', //collect the billing address automatically
          line_items: [ //set the line items for the stripe session
            {
              price: PLANS.find( //find the plan for the user
                (plan) => plan.name === 'Pro'
              )?.price.priceIds.test, //get the price id for the plan
              quantity: 1,
            },
          ],

          metadata: { //set the metadata for the stripe session
            userId: userId, //set the user id which will eventually be sent over to the webhook so that we can make sure that we update this data for the correct user so we enable their plan and everything works for them
          },
        })

      return { url: stripeSession.url } //return the url of the stripe session
    }
  ),

  getFileMessages: privateProcedure //fetch all messages that were sent to a file, user needs to be logged in for this to work
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(), //limit the number of messages that can be fetched
        cursor: z.string().nullish(), //helps to load more previous messages in the chat window as you scroll up
        fileId: z.string(), //fileId is the id of the file to know which file the messages are associated with
      })
    )
    .query(async ({ ctx, input }) => { //fetch all the messages that are to be displayed in the chat window
      const { userId } = ctx
      const { fileId, cursor } = input
      const limit = input.limit ?? INFINITE_QUERY_LIMIT //if limit is not provided, set it to the default limit which is the INFINITE_QUERY_LIMIT which is 10 messages so only the last 10 messages will be loaded

      const file = await db.file.findFirst({ //find the file in the database
        where: {
          id: fileId,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' }) //if the file is not found, return a not found response

      const messages = await db.message.findMany({ //find many messages in the database
        take: limit + 1,
        where: {
          fileId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        cursor: cursor ? { id: cursor } : undefined, //if cursor is provided, get the messages that are older than the cursor
        select: {
          id: true,
          isUserMessage: true, //if the message is from the user
          createdAt: true,
          text: true,
        },
      })

      let nextCursor: typeof cursor | undefined = undefined //initialize the next cursor
      if (messages.length > limit) { //if the number of messages is greater than the limit
        const nextItem = messages.pop() //get the last message
        nextCursor = nextItem?.id //set the next cursor to the id of the last message
      }

      return {
        messages,
        nextCursor,
      }
    }),

  getFileUploadStatus: privateProcedure //user needs to be logged in for this to work
    .input(z.object({ fileId: z.string() })) //zod -> "z" is a schema validation library to validate the input gotten from the server side
    .query(async ({ input, ctx }) => { //business logic, train this to the input, mutation changes data, query fetches data
      const file = await db.file.findFirst({ //find first file where...
        where: {
          id: input.fileId, 
          userId: ctx.userId,
        },
      })

      if (!file) return { status: 'PENDING' as const } //if file is not found in the database

      return { status: file.uploadStatus } //return the status of the file
    }),

    //api endpoint for polling the status of the file upload to check if the file is ready to be viewed and file has been successfuly uploaded
  getFile: privateProcedure //user needs to be logged in for this to work
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const file = await db.file.findFirst({ //check if file is in the database
        where: {
          key: input.key,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' }) //if file is not found in the database

      return file //return the file if it is found
    }),

  deleteFile: privateProcedure //user needs to be logged in for this to work
    .input(z.object({ id: z.string() })) //zod -> "z" is a schema validation library to validate the input gotten from the server side
    .mutation(async ({ ctx, input }) => { //business logic, train this to the input, mutation changes data, query fetches data
      const { userId } = ctx

      const file = await db.file.findFirst({ //find first file where...
        where: {
          id: input.id,
          userId, //search for files that the currently logged in user owns to make sure they don't delte someone elses file
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' }) //if there is no such file that the user owns and is trying to delete

      await db.file.delete({ //if abpveis successful and indeed user is trying to delete one of their own files then proceed...
        where: {
          id: input.id,
        },
      })

      return file
    }),
})

export type AppRouter = typeof appRouter
