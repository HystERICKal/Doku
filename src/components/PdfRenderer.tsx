'use client'

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Search,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useToast } from './ui/use-toast'

import { useResizeDetector } from 'react-resize-detector'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useState } from 'react'

import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

import SimpleBar from 'simplebar-react'
import PdfFullscreen from './PdfFullscreen'

// this is the worker that is needed to render the pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`

interface PdfRendererProps {
  url: string
}

const PdfRenderer = ({ url }: PdfRendererProps) => {
  const { toast } = useToast()

  const [numPages, setNumPages] = useState<number>() //check number of pages in the pdf
  const [currPage, setCurrPage] = useState<number>(1) //track current page being viewed
  const [scale, setScale] = useState<number>(1) //track the scale size of the pdf
  const [rotation, setRotation] = useState<number>(0) //track the rotation of the pdf
  const [renderedScale, setRenderedScale] = useState<number | null>(null) //keep track of the scale of the page that has been rendered already

  const isLoading = renderedScale !== scale //if the rendered scale is not equal to the current scale, the pdf is still loading 

  const CustomPageValidator = z.object({ //validates the page number input
    page: z // z is a shorthand for zod which is a schema validation library that helps validate data
      .string() //page number must be a string
      .refine( //refine is a method that helps you add custom validation to the schema
        (num) => Number(num) > 0 && Number(num) <= numPages! //page number must be greater than 0 and less than or equal to the number of pages
      ),
  })

  //turns the CustomPageValidator into a regular typscript type
  type TCustomPageValidator = z.infer< //type for the page number input
    typeof CustomPageValidator //gets the type of the CustomPageValidator
  >

  const { //react hook form
    register, 
    handleSubmit,
    formState: { errors },
    setValue, //syncronizes the input field with the current page property
  } = useForm<TCustomPageValidator>({
    defaultValues: {
      page: '1',
    },
    resolver: zodResolver(CustomPageValidator), //link the CustomPageValidator logic for the input field to the form
  })

  console.log(errors)

  const { width, ref } = useResizeDetector()

  const handlePageSubmit = ({ //function to handle the page number input submission
    page,
  }: TCustomPageValidator) => {
    setCurrPage(Number(page)) //set the current page to the page number input
    setValue('page', String(page))
  }

  return (
    <div className='w-full bg-white rounded-md shadow flex flex-col items-center'>
      <div className='h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2'> {/*pdf options */}
        <div className='flex items-center gap-1.5'>
          {/* button to navigate the page down */}
          <Button 
            disabled={currPage <= 1} //if current page is less than or equal to 1, disable the button
            onClick={() => {
              setCurrPage((prev) =>
                prev - 1 > 1 ? prev - 1 : 1 //if current page is greater than 1, go to previous page, else stay on page 1
              )
              setValue('page', String(currPage - 1)) //syncronize the input field with the current page property so when you navigate to like page 2 for example the input field at the top reads "2"
            }}
            variant='ghost'
            aria-label='previous page'>
            <ChevronDown className='h-4 w-4' />
          </Button>

          <div className='flex items-center gap-1.5'>
            {/* input field that you can insert page number to navigate to that page */}
            <Input
              {...register('page')}
              className={cn(
                'w-12 h-8',
                errors.page && 'focus-visible:ring-red-500' //if there is an error in the page number input, highlight the input field with red
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(handlePageSubmit)() //when enter key is pressed, submit the page number
                }
              }}
            />
            <p className='text-zinc-700 text-sm space-x-1'>
              <span>/</span>
              <span>{numPages ?? 'x'}</span> {/* number of pages gotten once pdf is rendered*/}
            </p>
          </div>

          {/* button to navigate the page up */}
          <Button
            disabled={ //if current page is greater than or equal to number of pages, disable the button
              numPages === undefined || currPage === numPages
            }
            onClick={() => {
              setCurrPage((prev) =>
                prev + 1 > numPages! ? numPages! : prev + 1 //if current page is less than number of pages, go to next page, else stay on last page...exclamation mark is used to tell typescript that numPages is not undefined but incase it is, it should be handled by the previous condition up there
              )
              setValue('page', String(currPage + 1))
            }}
            variant='ghost'
            aria-label='next page'>
            <ChevronUp className='h-4 w-4' />
          </Button>
        </div>

        {/* Handle zooming of the pdf*/}
        <div className='space-x-2'>
          <DropdownMenu> {/* Handle zooming states...100%...75%...*/}
            <DropdownMenuTrigger asChild>
              <Button
                className='gap-1.5'
                aria-label='zoom'
                variant='ghost'>
                <Search className='h-4 w-4' />
                {scale * 100}%
                <ChevronDown className='h-3 w-3 opacity-50' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => setScale(1)}> {/*set the scale to 1*/}
                100%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(1.5)}> {/*set the scale to 1.5*/}
                150%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(2)}> {/*set the scale to 2*/}
                200%
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setScale(2.5)}> {/*set the scale to 2.5*/}
                250%
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

            {/* button to rotate the pdf */}
          <Button
            onClick={() => setRotation((prev) => prev + 90)} //rotate the pdf 90 degrees
            variant='ghost'
            aria-label='rotate 90 degrees'>
            <RotateCw className='h-4 w-4' />
          </Button>

          <PdfFullscreen fileUrl={url} /> {/*button to view pdf in fullscreen*/}
        </div>
      </div>
      
      {/*pdf viewer */}
      <div className='flex-1 w-full max-h-screen'>
        <SimpleBar
          autoHide={false}
          className='max-h-[calc(100vh-10rem)]'>
          <div ref={ref}>
            {/*this is what displays the pdf */}
            <Document
              loading={ //loading spinner for ui purposes
                <div className='flex justify-center'>
                  <Loader2 className='my-24 h-6 w-6 animate-spin' />
                </div>
              }
              onLoadError={() => {
                toast({
                  title: 'Error loading PDF',
                  description: 'Please try again later',
                  variant: 'destructive',
                })
              }}
              //gets the number of pages in the pdf
              onLoadSuccess={({ numPages }) =>
                setNumPages(numPages)
              }
              file={url}
              className='max-h-full'>
              {isLoading && renderedScale ? ( //if the pdf is still loading and the rendered scale is not null, show the pdf. This helps so that the pdf does not flicker when the scale is changed and users with slower machines don't just see a white screen when the pdf is loading to a bigger size
                <Page
                  width={width ? width : 1} //width of the pdf -> helps pdf fit the screen when page is resized
                  pageNumber={currPage}
                  scale={scale}
                  rotate={rotation}
                  key={'@' + renderedScale} //key to help react know that the pdf has changed and should re-render
                />
              ) : null}

              <Page
                className={cn(isLoading ? 'hidden' : '')}
                width={width ? width : 1}
                pageNumber={currPage}
                scale={scale}
                rotate={rotation}
                key={'@' + scale} //key to help react know that the pdf has changed and should re-render
                loading={
                  <div className='flex justify-center'>
                    <Loader2 className='my-24 h-6 w-6 animate-spin' />
                  </div>
                }
                onRenderSuccess={() =>
                  setRenderedScale(scale) //set the rendered scale to the current scale to indicate that the pdf has been rendered and hence has finished loading
                }
              />
            </Document>
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}

export default PdfRenderer
