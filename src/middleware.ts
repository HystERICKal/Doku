import { authMiddleware } from '@kinde-oss/kinde-auth-nextjs/server'

export const config = { //create a config for the auth middleware
  //protect the pages below so that only logged in users can visit them
  matcher: ['/dashboard/:path*', '/auth-callback'], //match the dashboard path and the auth-callback path
}

export default authMiddleware
