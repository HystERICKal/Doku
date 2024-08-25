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

  createStripeSession: privateProcedure.mutation(
    async ({ ctx }) => {
      const { userId } = ctx

      const billingUrl = absoluteUrl('/dashboard/billing')

      if (!userId)
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const dbUser = await db.user.findFirst({
        where: {
          id: userId,
        },
      })

      if (!dbUser)
        throw new TRPCError({ code: 'UNAUTHORIZED' })

      const subscriptionPlan =
        await getUserSubscriptionPlan()

      if (
        subscriptionPlan.isSubscribed &&
        dbUser.stripeCustomerId
      ) {
        const stripeSession =
          await stripe.billingPortal.sessions.create({
            customer: dbUser.stripeCustomerId,
            return_url: billingUrl,
          })

        return { url: stripeSession.url }
      }

      const stripeSession =
        await stripe.checkout.sessions.create({
          success_url: billingUrl,
          cancel_url: billingUrl,
          payment_method_types: ['card', 'paypal'],
          mode: 'subscription',
          billing_address_collection: 'auto',
          line_items: [
            {
              price: PLANS.find(
                (plan) => plan.name === 'Pro'
              )?.price.priceIds.test,
              quantity: 1,
            },
          ],
          metadata: {
            userId: userId,
          },
        })

      return { url: stripeSession.url }
    }
  ),

  getFileMessages: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).nullish(),
        cursor: z.string().nullish(),
        fileId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx
      const { fileId, cursor } = input
      const limit = input.limit ?? INFINITE_QUERY_LIMIT

      const file = await db.file.findFirst({
        where: {
          id: fileId,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

      const messages = await db.message.findMany({
        take: limit + 1,
        where: {
          fileId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          isUserMessage: true,
          createdAt: true,
          text: true,
        },
      })

      let nextCursor: typeof cursor | undefined = undefined
      if (messages.length > limit) {
        const nextItem = messages.pop()
        nextCursor = nextItem?.id
      }

      return {
        messages,
        nextCursor,
      }
    }),

  getFileUploadStatus: privateProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ input, ctx }) => {
      const file = await db.file.findFirst({
        where: {
          id: input.fileId,
          userId: ctx.userId,
        },
      })

      if (!file) return { status: 'PENDING' as const }

      return { status: file.uploadStatus }
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
