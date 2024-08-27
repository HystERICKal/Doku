'use client'

//this is a client component since some interactivity is expected like clicking on button and a model opening
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'

import Dropzone from 'react-dropzone'
import { Cloud, File, Loader2 } from 'lucide-react'
import { Progress } from './ui/progress'
import { useUploadThing } from '@/lib/uploadthing'
import { useToast } from './ui/use-toast'
import { trpc } from '@/app/_trpc/client'
import { useRouter } from 'next/navigation'

const UploadDropzone = ({ //create a function for the upload dropzone
  isSubscribed, //get the subscription plan the user is on
}: {
  isSubscribed: boolean
}) => {
  const router = useRouter()

  const [isUploading, setIsUploading] = useState<boolean>(false) //create a state to track if the file is uploading
  const [uploadProgress, setUploadProgress] = useState<number>(0) //create a state to track the upload progress
  const { toast } = useToast() //destructuring the toast function from the useToast hook

  const { startUpload } = useUploadThing( //destructuring the startUpload function from the useUploadThing hook
    isSubscribed ? 'proPlanUploader' : 'freePlanUploader'
  )

  //handle polling the server to check if the file is processed and ready to be viewed and that the database is synchronized with uploadthing servers
  const { mutate: startPolling } = trpc.getFile.useMutation( //this has to be triggered to run, won't run on render...mutate function has to be explicitly called to make this start polling
    {
      onSuccess: (file) => { //if the file is found in the database
        router.push(`/dashboard/${file.id}`) //push the file into the url and redirect the user to the page where they can view the file
      },
      retry: true, //retry the polling if it fails...keep polling until the file is found in the database
      retryDelay: 500, //retry every 500ms
    }
  )

  const startSimulatedProgress = () => { //this function simulates the progress of the file upload and it should start immediately a user drops in a file for upload
    setUploadProgress(0) //reset upload progress incase there was a previous progress bar simulation that happened before this

    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => { //when setting a state you can get access to the previous value in the callback function as the first parameter
        if (prevProgress >= 95) {
          clearInterval(interval)// don't update the progress past 95 when i'm not sure if file is uploaded successfully(invalidate the whole process)
          return prevProgress //prevProgress at this stage == 95%
        }
        return prevProgress + 5 //increment by 5% every 500ms
      })
    }, 500)//500ms

    return interval
  }

  return (
    <Dropzone
      multiple={false}
      onDrop={async (acceptedFile) => {
        setIsUploading(true)

        const progressInterval = startSimulatedProgress() //start the progress bar simulation

        // handle file uploading here

        // await new Promise((resolve) => setTimeout(resolve, 2000)) //simulate a 2 seconds delay to upload the file

        const res = await startUpload(acceptedFile) //start the file upload

        if (!res) { //if the file upload fails
          return toast({
            title: 'Something went wrong',
            description: 'Please try again later',
            variant: 'destructive',
          })
        }

        const [fileResponse] = res //get the file response from the server...take the first array element of the response since responce is of type array

        const key = fileResponse?.key //get the key from the file response

        if (!key) { //if the key is not found
          return toast({
            title: 'Something went wrong',
            description: 'Please try again later',
            variant: 'destructive',
          })
        }

        clearInterval(progressInterval) //stop the progress bar simulation
        setUploadProgress(100) //set the progress bar to 100% once the file is uploaded to inform the user that the file is uploaded successfully

        startPolling({ key }) //start polling the server to check if the file is processed and ready to be viewed meaning that it was uploaded successfully
      }}>
      {({ getRootProps, getInputProps, acceptedFiles }) => (
        <div
          {...getRootProps()}
          className='border h-64 m-4 border-dashed border-gray-300 rounded-lg'>
          <div className='flex items-center justify-center h-full w-full'>
            <label
              htmlFor='dropzone-file'
              className='flex flex-col items-center justify-center w-full h-full rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'>
              <div className='flex flex-col items-center justify-center pt-5 pb-6'>
                <Cloud className='h-6 w-6 text-zinc-500 mb-2' />
                <p className='mb-2 text-sm text-zinc-700'>
                  <span className='font-semibold'>
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className='text-xs text-zinc-500'>
                  PDF (up to {isSubscribed ? "16" : "4"}MB)
                </p>
              </div>

              {/*Once you drag and drop a pdf file... */}
              {acceptedFiles && acceptedFiles[0] ? ( //validates to true once you drag in a file
                <div className='max-w-xs bg-white flex items-center rounded-md overflow-hidden outline outline-[1px] outline-zinc-200 divide-x divide-zinc-200'>
                  <div className='px-3 py-2 h-full grid place-items-center'>
                    <File className='h-4 w-4 text-blue-500' />
                  </div>
                  <div className='px-3 py-2 h-full text-sm truncate'>
                    {acceptedFiles[0].name}
                  </div>
                </div>
              ) : null}

              {isUploading ? (
                <div className='w-full mt-4 max-w-xs mx-auto'>
                  <Progress
                    indicatorColor={ //changing color of the progress bar
                      uploadProgress === 100 //if the file is uploaded successfully
                        ? 'bg-green-500'
                        : ''
                    }
                    value={uploadProgress}
                    className='h-1 w-full bg-zinc-200'
                  />
                  {uploadProgress === 100 ? ( //if the file is uploaded successfully
                    <div className='flex gap-1 items-center justify-center text-sm text-zinc-700 text-center pt-2'>
                      <Loader2 className='h-3 w-3 animate-spin' /> {/*loader spinner icon*/}
                      Redirecting...
                    </div>
                  ) : null}
                </div>
              ) : null}

              <input //invisible input element for file upload
                {...getInputProps()}
                type='file'
                id='dropzone-file'
                className='hidden'
              />
            </label>
          </div>
        </div>
      )}
    </Dropzone>
  )
}

const UploadButton = ({
  isSubscribed,
}: {
  isSubscribed: boolean
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    //dialog box from shadcn ui
    <Dialog 
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setIsOpen(v)
        }
      }}>
      <DialogTrigger
        onClick={() => setIsOpen(true)}
        asChild> 
        <Button>Upload PDF</Button>
      </DialogTrigger>

      <DialogContent>
        <UploadDropzone isSubscribed={isSubscribed} />
      </DialogContent>
    </Dialog>
  )
}

export default UploadButton
