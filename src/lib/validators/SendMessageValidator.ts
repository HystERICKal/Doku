import {z} from "zod"

export const SendMessageValidator = z.object({ //define a schema for how the data received should always be structured
    //the properties that I always want to be present in the data received
    //When this api endpoint is called in the post request body I want to make sure that the fileId and message are always present
    fileId: z.string(),
    message: z.string()
})