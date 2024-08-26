import {
  ReactNode,
  createContext,
  useRef,
  useState,
} from 'react'
import { useToast } from '../ui/use-toast'
import { useMutation } from '@tanstack/react-query'
import { trpc } from '@/app/_trpc/client'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'

type StreamResponse = {
  addMessage: () => void
  message: string
  handleInputChange: ( //create a type for the handleInputChange function
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => void
  isLoading: boolean
}

export const ChatContext = createContext<StreamResponse>({ //create a context for the chat. This context will be used to pass the message, handleInputChange and isLoading to the children components
  addMessage: () => {},
  message: '',
  handleInputChange: () => {},
  isLoading: false,
})

interface Props {
  fileId: string
  children: ReactNode
}

export const ChatContextProvider = ({ //create a provider for the chat context
  fileId,
  children,
}: Props) => {
  const [message, setMessage] = useState<string>('') //initialize the message state
  const [isLoading, setIsLoading] = useState<boolean>(false) //initialize the isLoading state

  const utils = trpc.useContext() //getting access to trpc utils to enable use of optimistic updates with react query and trpc 

  const { toast } = useToast() //use the useToast hook to show a toast message to the user

  const backupMessage = useRef('') //keep track of the message in the chat input insed a ref to avoid forcing a re-render

  //This mutation allows for sending a message to an api endpoint
  //tRPC will not be used since we need to stream back a response from the api to the clientside (ChatContextProvider) and in tRPC that doesn't work, it only works for jSON responses
  const { mutate: sendMessage } = useMutation({ //use the useMutation hook to send a message
    mutationFn: async ({ //pass a mutation function that takes in a message. This must be done now since tRPC is not being used
      message,
    }: {
      message: string
    }) => {
      const response = await fetch('/api/message', { //fetch the message from the api
        method: 'POST',
        body: JSON.stringify({
          fileId,
          message,
        }),
      })

      if (!response.ok) { //if the response is not ok, throw an error
        throw new Error('Failed to send message')
      }

      return response.body 
    },

    //This is the optimistic update part of the mutation
    //This onMutate function will be called as soon as the enter key is pressed in the chat input to send the message
    onMutate: async ({ message }) => { 
      backupMessage.current = message //create a backup of the message so that if anything goes wrong, roll back the optimistic update and put the message back into the chat input
      setMessage('')

      // step 1
      await utils.getFileMessages.cancel() //cancel any outgoing refetches so that they don't overwrite the optimistic update

      // step 2
      const previousMessages =
        utils.getFileMessages.getInfiniteData() //snapshot the previous value that was there

      // step 3
      utils.getFileMessages.setInfiniteData( //optimistically insert the new value or new message into the chat window right away as user sends it
        { fileId, limit: INFINITE_QUERY_LIMIT },
        (old) => { //receive old data in the callback
          if (!old) {
            return {
              pages: [],
              pageParams: [],
            }
          }

          let newPages = [...old.pages] //clone the old pages

          let latestPage = newPages[0]! //has latest 10 pages in the chat

          latestPage.messages = [ //insert the latest message that the user just typed into the array
            {
              createdAt: new Date().toISOString(), 
              id: crypto.randomUUID(),
              text: message,
              isUserMessage: true,
            },
            ...latestPage.messages, //take the messages that were already there in the chat and move them up to accomodate space for the new message
          ]

          newPages[0] = latestPage //inject new message into the newpages as the last/first page

          return {
            ...old,
            pages: newPages,
          }
        }
      )

      setIsLoading(true) //add the loading state of the ai after adding the user message

      return {
        previousMessages: //display previous messages
          previousMessages?.pages.flatMap(
            (page) => page.messages 
          ) ?? [],
      }
    },

    //Display the ai message that is sent back as a stream in real-time
    //When a response is gotten back from the api, it will contain th ereadable stream that can be simply put into the message as it is received to get a real time feeling
    onSuccess: async (stream) => { 
      setIsLoading(false) //the loading essage from the ai should now not be there anymore

      if (!stream) {
        return toast({
          title: 'There was a problem sending this message',
          description:
            'Please refresh this page and try again',
          variant: 'destructive',
        })
      }

      const reader = stream.getReader() //read the contents of the stream
      const decoder = new TextDecoder()
      let done = false //keep track of when done

      // accumulated response
      let accResponse = ''

      while (!done) {
        const { value, done: doneReading } =
          await reader.read() //read the stream
        done = doneReading //done nreading no need to execute further code
        const chunkValue = decoder.decode(value) //actual stream that the ai gives back so we can add it to the message in real-time

        accResponse += chunkValue //append chunk value to the accumulated response

        // append chunk to the actual message
        utils.getFileMessages.setInfiniteData(
          { fileId, limit: INFINITE_QUERY_LIMIT },
          (old) => {
            if (!old) return { pages: [], pageParams: [] }

            let isAiResponseCreated = old.pages.some(
              (page) =>
                page.messages.some(
                  (message) => message.id === 'ai-response'
                )
            )

            let updatedPages = old.pages.map((page) => {
              if (page === old.pages[0]) { //if true then we are on the last page which also contains the last message
                let updatedMessages

                if (!isAiResponseCreated) { //is ai response message is not created then create it once
                  updatedMessages = [
                    {
                      createdAt: new Date().toISOString(),
                      id: 'ai-response',
                      text: accResponse,
                      isUserMessage: false,
                    },
                    ...page.messages, //append all the other messegas that were there before
                  ]
                } else {
                  updatedMessages = page.messages.map( //if there is a message already, then just add on it
                    (message) => {
                      if (message.id === 'ai-response') {
                        return {
                          ...message,
                          text: accResponse,
                        }
                      }
                      return message
                    }
                  )
                }

                return {
                  ...page,
                  messages: updatedMessages,
                }
              }

              return page
            })

            return { ...old, pages: updatedPages }
          }
        )
      }
    },

    onError: (_, __, context) => { // something went wrong, so put the text that we put in the chat window, back into the textbox input
      setMessage(backupMessage.current) //put back the text that we put in the chat window
      utils.getFileMessages.setData(
        { fileId },
        { messages: context?.previousMessages ?? [] } //roll back to the previous messages in the chat window
      )
    },
    onSettled: async () => {
      setIsLoading(false)

      await utils.getFileMessages.invalidate({ fileId }) //whether everything is successful or not, refresh the entire chat data to get the most current data
    },
  })

  const handleInputChange = ( //create a function to handle the input change event
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMessage(e.target.value)
  }

  const addMessage = () => sendMessage({ message }) //create a function to send a message

  return (
    
    <ChatContext.Provider
      value={{
        addMessage,
        message,
        handleInputChange,
        isLoading,
      }}>
      {children}
    </ChatContext.Provider>
  )
}
