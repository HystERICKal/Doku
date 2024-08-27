import { db } from '@/db'
import { openai } from '@/lib/openai'
import { getPineconeClient } from '@/lib/pinecone'
import { SendMessageValidator } from '@/lib/validators/SendMessageValidator'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { NextRequest } from 'next/server'

import { OpenAIStream, StreamingTextResponse } from 'ai'

export const POST = async (req: NextRequest) => {
  // endpoint for asking a question to a pdf file using the chat

  const body = await req.json() //parse the request body to get access to the post request body

  const { getUser } = getKindeServerSession() //get user id and email from session
  const user = getUser()

  const { id: userId } = user //destructure the user id from the user

  if (!userId)
    return new Response('Unauthorized', { status: 401 }) //if the user is not logged in, return an unauthorized response

  const { fileId, message } =
    SendMessageValidator.parse(body) //parse the request body to get the fileId and message

  const file = await db.file.findFirst({ //find the file in the database
    where: {
      id: fileId,
      userId,
    },
  })

  if (!file)
    return new Response('Not found', { status: 404 }) //if the file is not found, return a not found response

  //If there is a file that the user owns and they want to add a message to it, create a message in the database
  await db.message.create({ 
    data: {
      text: message, //question the user asked the pdf
      isUserMessage: true,
      userId,
      fileId,
    },
  })

  //To answer the question above a large language model will be used
  //Here, its possible to see which page of the pdfis most relevant to the question that the user is asking , then retrieve that page for context and send it to the large language model
  // 1: vectorize message
  const embeddings = new OpenAIEmbeddings({ //create a new instance of the OpenAIEmbeddings class
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  const pinecone = await getPineconeClient()
  const pineconeIndex = pinecone.Index('doku')

  const vectorStore = await PineconeStore.fromExistingIndex( //search vector store for the most similar/relevant pages to the user's question
    embeddings, //embeddings object created above
    {
      pineconeIndex,
      namespace: file.id,
    }
  )

  const results = await vectorStore.similaritySearch( //get the results of the similarity search from the vector store from pinecone
    message, //the user's question
    4 //number of results (pdf pages) to return (get back the top 4 most relevant pages)...for pro users, more pages can be returned
  )

  const prevMessages = await db.message.findMany({ //if there is a chat history, get the previous messages of the user
    where: {
      fileId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 6, //get the last 6 messages
  })

  const formattedPrevMessages = prevMessages.map((msg) => ({ //format the previous messages to be used in the chat
    role: msg.isUserMessage //if the message is from the user, set the role to 'user', else set it to 'assistant'
      ? ('user' as const)
      : ('assistant' as const),
    content: msg.text, //get the text of the message
  }))
  //the above formatted messages will be used as context for the large language model (they are ready to be sent to openAI for the response)

  const response = await openai.chat.completions.create({ //send the user's question and the context to the large language model (openAI) to get a response to the user's question
    model: 'gpt-3.5-turbo', //use the gpt-3.5-turbo model
    temperature: 0, //set the temperature to 0 to get the most accurate response
    stream: true, //set the stream to true to get a streaming response from the model (the response will be streamed back to the user) -> response will be streamed to the frontend in real time
    messages: [ //get the previous messages that were exchanged in the chat with the bot, like attach all the previously exchanged messages. SO that if the user will ask a question that references the previous ,messages, the bot will have the context of the previous messages and they also need to be in a very specific format
      {
        role: 'system',
        content:
          'Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.',
      },
      {
        role: 'user',
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.
        
  \n----------------\n
  
  PREVIOUS CONVERSATION:
  ${formattedPrevMessages.map((message) => { //format the previous messages to be used in the chat
    if (message.role === 'user') //if the message is from the user, return the message with the user role
      return `User: ${message.content}\n` //return the user message
    return `Assistant: ${message.content}\n` //return the ai message
  })}
  
  \n----------------\n
  
  CONTEXT:
  ${
    results.map((r) => r.pageContent).join('\n\n') //pdf pages that are most relevant (that the ai will use) to answer the user's question
  } 
  
  USER INPUT: ${message}`, //the user's question
      },
    ],
  })

  const stream = OpenAIStream(response, { //return the answer to the user's question as a real time stream back to the client
    async onCompletion(completion) { //when the stream is completed, create a message in the database
      await db.message.create({ //create a message in the database
        data: {
          text: completion, //the response to the user's question
          isUserMessage: false, //the message is from the ai
          fileId,
          userId,
        },
      })
    },
  })

  return new StreamingTextResponse(stream) //return the response as a streaming text response to the client in real time
}
