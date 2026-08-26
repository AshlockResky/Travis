// server.js
// Deployable Express server that serves the static frontend from /public and proxies to OpenAI.
// Usage:
// 1. Install: npm install
// 2. Set env vars: OPENAI_API_KEY and optionally SERVER_API_KEY
// 3. Start: npm start

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Rate limiter for the API to prevent abuse
const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 }); // 20 requests per minute
app.use('/api/', limiter);

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SERVER_API_KEY = process.env.SERVER_API_KEY; // optional

if (!OPENAI_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. The /api/chat endpoint will return an error.');
}
if (!SERVER_API_KEY) {
  console.warn('Note: SERVER_API_KEY not set. /api/chat will NOT require X-API-KEY header.');
} else {
  console.log('SERVER_API_KEY is set; /api/chat requires a matching X-API-KEY header');
}

// Require X-API-KEY when SERVER_API_KEY is configured
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    if (SERVER_API_KEY) {
      const key = req.header('x-api-key') || req.header('X-API-KEY');
      if (!key || key !== SERVER_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized. Missing or invalid X-API-KEY header.' });
      }
    }
  }
  next();
});

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

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

// Fallback: serve index.html for all other routes (single page app support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}. POST /api/chat`));
