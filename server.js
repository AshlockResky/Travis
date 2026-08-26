// server.js
// Simple Express server that proxies requests to OpenAI Chat Completions API.
// Usage:
// 1. Install dependencies: npm install express
// 2. Run: OPENAI_API_KEY=sk-... SERVER_API_KEY=your_server_key node server.js
// 3. From the frontend, POST to /api/chat with JSON: { messages: [ {role, content}, ... ] }
//    Include header: X-API-KEY: your_server_key (if SERVER_API_KEY is set on the server)

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SERVER_API_KEY = process.env.SERVER_API_KEY; // API key required by clients to use this proxy

if (!OPENAI_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. The /api/chat endpoint will return an error.');
}
if (!SERVER_API_KEY) {
  console.warn('WARNING: SERVER_API_KEY not set. Requests to /api/chat will NOT require an X-API-KEY header.');
} else {
  console.log('SERVER_API_KEY is set: /api/chat will require a matching X-API-KEY header');
}

// Simple middleware to require the X-API-KEY header when SERVER_API_KEY is configured
app.use((req, res, next) => {
  if (req.path === '/api/chat') {
    if (SERVER_API_KEY) {
      const key = req.header('x-api-key') || req.header('X-API-KEY');
      if (!key || key !== SERVER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Missing or invalid X-API-KEY header.' });
      }
    }
  }
  next();
});

app.post('/api/chat', async (req, res) => {
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });

  const body = req.body;
  if (!body || !Array.isArray(body.messages)) return res.status(400).json({ error: 'Invalid request, expected { messages: [...] }' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: body.messages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error('OpenAI error', response.status, txt);
      return res.status(502).json({ error: 'Upstream OpenAI error', details: txt });
    }

    const data = await response.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    return res.json({ reply });
  } catch (err) {
    console.error('Error calling OpenAI', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}. POST /api/chat`));
