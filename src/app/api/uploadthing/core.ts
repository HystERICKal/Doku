import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  createUploadthing,
  type FileRouter,
} from 'uploadthing/next'

import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { getPineconeClient } from '@/lib/pinecone'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { PLANS } from '@/config/stripe'

const f = createUploadthing()

const middleware = async () => {
  const { getUser } = getKindeServerSession() //make sure user is authenticated and logged in
  const user = getUser()

  if (!user || !user.id) throw new Error('Unauthorized') //if user is not logged in or authenticated, throw an error so user can't upload the file if not authenticated

  const subscriptionPlan = await getUserSubscriptionPlan()

  return { subscriptionPlan, userId: user.id }
}

// This function is called after the file has been uploaded
//handles logic for processing the file and storing it in the database
const onUploadComplete = async ({ 
  metadata, //metadata is the object returned from the middleware function
  file, //file is the file that was uploaded
}: {
  metadata: Awaited<ReturnType<typeof middleware>> //get the metadata from the middleware function
  file: {
    key: string
    name: string
    url: string
  }
}) => {
  const isFileExist = await db.file.findFirst({ //check if the file already exists in the database
    where: {
      key: file.key, //find the file by the key
    },
  })

  if (isFileExist) return //if the file already exists in the database, return

  const createdFile = await db.file.create({ //create a new file in the database using prisma
    data: {
      key: file.key,
      name: file.name,
      userId: metadata.userId,
      url: `https://utfs.io/f/${file.key}`, //url of the file...could have done (file.url) but that one times out sometimes, so directly get the image from the s3 bucket (aws s3)
      uploadStatus: 'PROCESSING',
    },
  })

  try { 
    const response = await fetch( //fetch the file from the s3 bucket
      `https://utfs.io/f/${file.key}`
    )

    const blob = await response.blob() //get the file as a blob

    const loader = new PDFLoader(blob) //load the file as a pdf into memory

    const pageLevelDocs = await loader.load() //extract page level text from the pdf

    const pagesAmt = pageLevelDocs.length //get the number of pages in the pdf...each element in the array is a page

    const { subscriptionPlan } = metadata //destructure the subscription plan from the metadata
    const { isSubscribed } = subscriptionPlan //destructure the isSubscribed property from the subscription plan

    const isProExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Pro')!.pagesPerPdf //check if the number of pages in the pdf is greater than the number of pages allowed in the Pro plan
    const isFreeExceeded = pagesAmt > PLANS.find((plan) => plan.name === 'Free')!.pagesPerPdf //check if the number of pages in the pdf is greater than the number of pages allowed in the Free plan

    if ( //if the user is subscribed and the number of pages in the pdf is greater than the number of pages allowed in the Pro plan or the user is not subscribed and the number of pages in the pdf is greater than the number of pages allowed in the Free plan
      (isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded) //are they on the pro plan and exceed the pro limit or are they on the free plan and exceed the free limit
    ) {
      await db.file.update({ //update the file in the database
        data: {
          uploadStatus: 'FAILED', //set the upload status to failed
        },
        where: {
          id: createdFile.id, //find the file by the id so it can be updated
        },
      });
      return;
    }

    // vectorize and index entire document [check Langchain js documentation for better understanding]
    const pinecone = await getPineconeClient() //get the pinecone client from the pinecone library (pinecone is a vector store)
    const pineconeIndex = pinecone.Index('doku') //create a new index in the pinecone client

    const embeddings = new OpenAIEmbeddings({ //create a new embeddings object using the openai api key
      openAIApiKey: process.env.OPENAI_API_KEY,
    })

    await PineconeStore.fromDocuments( //create a new pinecone store from the documents in the pdf
      pageLevelDocs,
      embeddings, //tell langchain how to genarate the vectors from the text using these openAI models as the embeddings
      {
        pineconeIndex, //the index in the pinecone client
        namespace: createdFile.id,
      }
    )

    await db.file.update({ //update the file in the database
      data: {
        uploadStatus: 'SUCCESS',
      },
      where: {
        id: createdFile.id,
      },
    })
  } catch (err) {
    await db.file.update({ //if there is an error, update the file in the database
      data: {
        uploadStatus: 'FAILED',
      },
      where: {
        id: createdFile.id,
      },
    })
  }
}

// This is the file router that will be used in the API route
export const ourFileRouter = {
  freePlanUploader: f({ pdf: { maxFileSize: '32MB' } }) //create a new file uploader for the free plan
    //runs before the file is uploaded
    .middleware(middleware) //middleware is a function that returns an object with the subscription plan and the user id. It runs when a user has requested to upload a file from the client side
    //runs after the file is uploaded
    .onUploadComplete(onUploadComplete),
  proPlanUploader: f({ pdf: { maxFileSize: '16MB' } }) //create a new file uploader for the pro plan
    .middleware(middleware)
    .onUploadComplete(onUploadComplete),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
