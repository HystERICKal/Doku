import { AppRouter } from '@/trpc'
import { inferRouterOutputs } from '@trpc/server'

type RouterOutput = inferRouterOutputs<AppRouter> //infer the output of the router from the AppRouter 

type Messages = RouterOutput['getFileMessages']['messages'] //get the messages from the output of the router

type OmitText = Omit<Messages[number], 'text'> //omit the text from the messages

type ExtendedText = { //extend the text of the messages
  text: string | JSX.Element //the text can be a string or a JSX element
}

export type ExtendedMessage = OmitText & ExtendedText //combine the messages with the extended text to create an extended message
