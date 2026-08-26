# Making LAEN smarter using OpenAI

This repository update adds a simple server proxy and updates the frontend to use OpenAI Chat Completions, giving LAEN much more capable conversational intelligence.

Files added/updated:
- `server.js` - an Express server that forwards conversation messages to the OpenAI Chat Completions API. It expects the `OPENAI_API_KEY` environment variable to be set.
- `script.js` - updated frontend that sends conversation history to `/api/chat`, stores a short local history, and falls back to a lightweight rule-based responder when the server isn't available.

Important notes and steps to run locally:

1) Install dependencies for the server

```bash
npm init -y
npm install express dotenv
```

2) Set your OpenAI API key and start the server (do NOT commit your key to the repository)

```bash
export OPENAI_API_KEY="sk-..."
node server.js
```

On Windows (PowerShell):

```powershell
$env:OPENAI_API_KEY = "sk-..."
node server.js
```

3) Serve your frontend (if it's just static files, you can use a simple static server) and ensure script.js is loaded by your page. The frontend will POST to `/api/chat` on the same origin.

Security & deployment:
- Never put your OpenAI API key in frontend code — always call OpenAI from a server-side component.
- For production, host the Express server behind HTTPS and add rate-limiting / authentication if the service is public.

If you want, I can also:
- Add streaming responses (server-sent events) so the assistant appears to type while responding.
- Add a simple UI for conversation clearing and temperature control.
- Create a deployable template (e.g., for Vercel/Render) that includes environment variable setup.
