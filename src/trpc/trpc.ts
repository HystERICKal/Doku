import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { TRPCError, initTRPC } from '@trpc/server'

const t = initTRPC.create()
const middleware = t.middleware

const isAuth = middleware(async (opts) => { //auth procedure...make sure user is authenticated
  const { getUser } = getKindeServerSession()
  const user = getUser() //will have user object or null

  if (!user || !user.id) { //Guard Clause
    throw new TRPCError({ code: 'UNAUTHORIZED' }) //user won't be able to call the api endpoint if they aren't logged in
  }

  return opts.next({
    ctx: { //context that allows the passing of any value from this middleware directly into the api route that uses this private procedure (api route in trpc->index.ts)
      userId: user.id,
      user,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const privateProcedure = t.procedure.use(isAuth) //if privateProcedure is called from anywhere, then it runs through the above middleware before hand to ensure the business logic in the middleware is run before the api endpoint (getUserFiles in "trpc->index.ts") is called
