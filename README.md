# Doku - A SaaS platform designed to analyze PDF documents using AI

This project is a Software as a Service (SaaS) platform designed to analyze PDF documents using AI. Users can upload a PDF file, and the platform will allow them to query the document to extract information or answer specific questions using AI-powered responses. The service will be available in two tiers: a free plan with a 4MB file upload limit and a Pro plan with a 16MB limit. The platform will feature a modern, responsive UI, secure authentication, and real-time data processing.

## Technologies Used

- Frontend: TypeScript, shadcn-ui
- Backend: tRPC, Zod, Prisma
- AI Integration: LangChain for AI memory, Streaming API for real-time responses
- Data Storage: Pinecone for vector storage
- Authentication: Kinde
- Payment Integration: Stripe
- PDF Handling: A highly functional PDF viewer with drag-and-drop uploads

## Project Features

- Complete SaaS Platform: Built entirely from scratch.
- Modern UI: Clean, responsive design using shadcn-ui.
- PDF Document Analysis: Query uploaded PDF documents using AI.
- User Authentication: Secure sign-in options via Kinde or Google OAuth.
- Free & Pro Plans: Managed using Stripe, with file size upload limits.
- Real-Time AI Responses: Streaming API for fast, real-time answers.
- Efficient Data Fetching: Using tRPC and Zod for performance.
- Infinite AI Memory: LangChain integration.
- Optimistic UI Updates: For smooth user interaction.
- PDF Viewer: Intuitive drag-and-drop uploads with instant loading states.


## Getting started

To get started with this project, run

```bash
  git clone https://github.com/HystERICKal/Doku.git
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
