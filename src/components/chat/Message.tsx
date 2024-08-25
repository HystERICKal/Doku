import { cn } from '@/lib/utils'
import { ExtendedMessage } from '@/types/message'
import { Icons } from '../Icons'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { forwardRef } from 'react'

interface MessageProps { //create a message interface
  message: ExtendedMessage //the message is an extended message
  isNextMessageSamePerson: boolean  //check if the next message is from the same person
}

const Message = forwardRef<HTMLDivElement, MessageProps>( //create a component for the message
  ({ message, isNextMessageSamePerson }, ref) => { //pass the message and isNextMessageSamePerson as props to the component
    return (
      <div
        ref={ref} //set the ref to the div
        className={cn('flex items-end', {
          'justify-end': message.isUserMessage, //if the message is from the user, justify the message to the end
        })}>
        <div
          className={cn(
            'relative flex h-6 w-6 aspect-square items-center justify-center',
            {
              'order-2 bg-blue-600 rounded-sm':
                message.isUserMessage, //if the message is from the user, set the background color to blue
              'order-1 bg-zinc-800 rounded-sm':
                !message.isUserMessage, //if the message is from the assistant, set the background color to zinc
              invisible: isNextMessageSamePerson, //if the next message is from the same person, set the message icon to invisible
            }
          )}>
          {message.isUserMessage ? ( //if the message is from the user, show the user icon else show the assistant (ai) icon
            <Icons.user className='fill-zinc-200 text-zinc-200 h-3/4 w-3/4' />
          ) : (
            <Icons.logo className='fill-zinc-300 h-3/4 w-3/4' />
          )}
        </div>

        <div
          className={cn(
            'flex flex-col space-y-2 text-base max-w-md mx-2',
            {
              'order-1 items-end': message.isUserMessage, //if the message is from the user, justify the message to the end
              'order-2 items-start': !message.isUserMessage, //if the message is from the assistant, justify the message to the start
            }
          )}>
          <div
            className={cn(
              'px-4 py-2 rounded-lg inline-block',
              {
                'bg-blue-600 text-white':
                  message.isUserMessage, //if the message is from the user, set the background color to blue and the text color to white
                'bg-gray-200 text-gray-900':
                  !message.isUserMessage, //if the message is from the assistant, set the background color to gray and the text color to gray
                'rounded-br-none':
                  !isNextMessageSamePerson && //if the next message is not from the same person and the message is from the assistant, set the rounded bottom right to none
                  message.isUserMessage,
                'rounded-bl-none':
                  !isNextMessageSamePerson && //if the next message is not from the same person and the message is from the user, set the rounded bottom left to none
                  !message.isUserMessage,
              }
            )}>
            {typeof message.text === 'string' ? ( //if the message is a string, show the message as a string else show the message as markdown
              <ReactMarkdown
                className={cn('prose', {
                  'text-zinc-50': message.isUserMessage, //if the message is from the user, set the text color to zinc
                })}>
                {message.text} 
              </ReactMarkdown>
            ) : (
              message.text
            )}
            {message.id !== 'loading-message' ? ( //if the message id is not loading-message, show the message timestamp
              <div
                className={cn(
                  'text-xs select-none mt-2 w-full text-right',
                  {
                    'text-zinc-500': !message.isUserMessage, //if the message is from the assistant, set the text color to zinc
                    'text-blue-300': message.isUserMessage, //if the message is from the user, set the text color to blue
                  }
                )}>
                {format(
                  new Date(message.createdAt), //format the message created at date
                  'HH:mm'
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }
)

Message.displayName = 'Message'

export default Message
