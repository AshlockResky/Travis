# Travis - LAEN Express Server

Express server + static frontend for deployment with OpenAI API integration.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
SERVER_API_KEY=your-optional-server-key
PORT=3000
```

**Required:**
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys

**Optional:**
- `SERVER_API_KEY` - If set, all `/api/*` requests require `X-API-KEY` header
- `PORT` - Defaults to 3000

### 3. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on the configured PORT and serve:
- Static frontend from `/public`
- API proxy at `/api/chat`

## Deployment

For **Render**, **Heroku**, or similar platforms:

1. Add environment variables in your platform's dashboard:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `SERVER_API_KEY` = (optional) your server API key

2. Set build command: `npm install`
3. Set start command: `npm start`

## API Endpoints

### POST /api/chat
Proxy to OpenAI's chat completion API.

**Headers:**
- `Content-Type: application/json`
- `X-API-KEY: your-server-key` (if SERVER_API_KEY is configured)

**Request Body:**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response:**
```json
{
  "reply": "Hi! How can I help?"
}
```

## Troubleshooting

If you see warnings about missing API keys:
- Check that `.env` file exists and has correct values
- Verify `OPENAI_API_KEY` is valid at https://platform.openai.com/api-keys
- On deployed platforms, verify environment variables are set in the platform dashboard

---

Created with Node.js and Express
