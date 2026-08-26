# Making LAEN smarter using OpenAI

This repository update adds a simple server proxy and updates the frontend to use OpenAI Chat Completions, giving LAEN much more capable conversational intelligence.

Files added/updated:
- `server.js` - an Express server that forwards conversation messages to the OpenAI Chat Completions API. It expects the `OPENAI_API_KEY` environment variable to be set. Optionally, you can set `SERVER_API_KEY` to require an `X-API-KEY` header on requests to `/api/chat`.
- `script.js` - updated frontend that sends conversation history to `/api/chat`, stores a short local history, and falls back to a lightweight rule-based responder when the server isn't available.

Important notes and steps to run locally:

1) Install dependencies for the server

```bash
npm init -y
npm install express dotenv
```

2) Set your OpenAI API key and a server API key and start the server (do NOT commit your keys to the repository)

macOS / Linux:

```bash
export OPENAI_API_KEY="sk-..."
export SERVER_API_KEY="your_server_key"
node server.js
```

On Windows (PowerShell):

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:SERVER_API_KEY = "your_server_key"
node server.js
```

3) From the frontend, include the X-API-KEY header in requests to /api/chat when SERVER_API_KEY is set:

```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': 'your_server_key'
  },
  body: JSON.stringify({ messages })
});
```

4) Serve your frontend (if it's just static files, you can use a simple static server) and ensure script.js is loaded by your page. The frontend will POST to `/api/chat` on the same origin. If the frontend is on a different origin, enable CORS in server.js or host them together.

Security & deployment:
- Never put your OpenAI API key in frontend code — always call OpenAI from a server-side component.
- Set `SERVER_API_KEY` to a strong random value and send it only from trusted clients. If you need per-user authentication, replace this mechanism with proper user auth.
- For production, host the Express server behind HTTPS and add rate-limiting / authentication and logging to prevent abuse and runaway cost.

If you want, I can also:
- Add streaming responses (server-sent events) so the assistant appears to type while responding.
- Add a simple UI for conversation clearing and temperature control.
- Create a deployable template (e.g., for Vercel/Render) that includes environment variable setup.
