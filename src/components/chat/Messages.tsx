import { trpc } from '@/app/_trpc/client'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
import { Loader2, MessageSquare } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import Message from './Message'
import { useContext, useEffect, useRef } from 'react'
import { ChatContext } from './ChatContext'
import { useIntersection } from '@mantine/hooks'

interface MessagesProps {
  fileId: string
}

const Messages = ({ fileId }: MessagesProps) => { //create a component for the messages
  const { isLoading: isAiThinking } = useContext(ChatContext)

  const { data, isLoading, fetchNextPage } = //use the useInfiniteQuery hook to fetch the next page of messages
    trpc.getFileMessages.useInfiniteQuery( //fetch the messages that are to be displayed in the chat window
      {
        fileId, //fileId is the id of the file to know which file the messages are associated with
        limit: INFINITE_QUERY_LIMIT, //limit the number of messages that can be fetched
      },
      {
        getNextPageParam: (lastPage) => //get the next page of messages
          lastPage?.nextCursor, //get the next cursor
        keepPreviousData: true, //keep the previous data
      }
    )

  const messages = data?.pages.flatMap( //get the messages from the data
    (page) => page.messages
  )

  const loadingMessage = { //create a loading message to show the user that the AI is thinking
    createdAt: new Date().toISOString(), //set the created at date to the current date
    id: 'loading-message', //set the id of the message to 'loading-message'
    isUserMessage: false, //set the message to be from the assistant
    text: (
      <span className='flex h-full items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin' />
      </span>
    ),
  }

  const combinedMessages = [ //combine the messages to be displayed in the chat window with the loading message
    ...(isAiThinking ? [loadingMessage] : []), //if the AI is thinking, show the loading message else show the messages
    ...(messages ?? []), //if there are messages, show them else show an empty array
  ]

  const lastMessageRef = useRef<HTMLDivElement>(null) //create a ref for the last message in the chat window to scroll to the bottom of the chat window when a new message is added to the chat window

  const { ref, entry } = useIntersection({ //use the useIntersection hook to check if the last message is in view or not
    root: lastMessageRef.current, //set the root to the last message
    threshold: 1, //set the threshold to 1 to check if the last message is in view or not
  })

  useEffect(() => {
    if (entry?.isIntersecting) {
      fetchNextPage()
    }
  }, [entry, fetchNextPage])

  return (
    <div className='flex max-h-[calc(100vh-3.5rem-7rem)] border-zinc-200 flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'>
      {combinedMessages && combinedMessages.length > 0 ? ( //if there are messages to be displayed in the chat window show them
        combinedMessages.map((message, i) => { //map through the messages to display them in the chat window
          const isNextMessageSamePerson = //check if the next message is from the same person
            combinedMessages[i - 1]?.isUserMessage ===
            combinedMessages[i]?.isUserMessage //if the previous message is from the same person as the current message, set isNextMessageSamePerson to true

          if (i === combinedMessages.length - 1) { //if the current message is the last message
            return (
              <Message
                ref={ref}
                message={message}
                isNextMessageSamePerson={
                  isNextMessageSamePerson
                }
                key={message.id}
              />
            )
          } else
            return (
              <Message
                message={message}
                isNextMessageSamePerson={
                  isNextMessageSamePerson
                }
                key={message.id}
              />
            )
        })
      ) : isLoading ? (
        <div className='w-full flex flex-col gap-2'>
          <Skeleton className='h-16' /> {/*show the loading skeleton while the messages are loading*/}
          <Skeleton className='h-16' />
          <Skeleton className='h-16' />
          <Skeleton className='h-16' />
        </div>
      ) : (
        <div className='flex-1 flex flex-col items-center justify-center gap-2'>
          <MessageSquare className='h-8 w-8 text-blue-500' />
          <h3 className='font-semibold text-xl'>
            You&apos;re all set!
          </h3>
          <p className='text-zinc-500 text-sm'>
            Ask your first question to get started.
          </p>
        </div>
      )}
    </div>
  )
}

export default Messages
