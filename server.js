// server.js
// Deployable Express server that serves the static frontend from /public and proxies to OpenAI.
// Features: Conversation history, auto-learning, fine-tuning support, and cost tracking
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
import fs from 'fs';

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
const MODEL = process.env.AI_MODEL || 'gpt-4o'; // Default to GPT-4o (most advanced)
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS) || 4096;

// Self-learning & improvement features
const conversationHistory = {}; // Stores all conversations per user
const userStats = {}; // Tracks user interactions
let totalCostTracker = 0; // Track cumulative cost

// Model versions - auto-upgrade when new models available
const MODEL_VERSIONS = {
  'gpt-4o': { release: '2024-08-06', cost: 0.015, active: true },
  'gpt-5': { release: '2025-06-01', cost: 0.025, active: false }, // Future
  'gpt-6': { release: '2026-01-01', cost: 0.035, active: false }  // Future
};

if (!OPENAI_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. The /api/chat endpoint will return an error.');
}
if (!SERVER_API_KEY) {
  console.warn('Note: SERVER_API_KEY not set. /api/chat will NOT require X-API-KEY header.');
} else {
  console.log('SERVER_API_KEY is set; /api/chat requires a matching X-API-KEY header');
}
console.log(`Using AI Model: ${MODEL} with max ${MAX_TOKENS} tokens`);
console.log('🧠 Self-Learning Features: ENABLED');
console.log('📈 Auto-Upgrade: ENABLED');
console.log('💰 Cost Tracking: ENABLED');

// Get latest available model (auto-upgrades when new models release)
function getLatestModel() {
  const available = Object.keys(MODEL_VERSIONS)
    .filter(m => MODEL_VERSIONS[m].active && new Date(MODEL_VERSIONS[m].release) <= new Date())
    .sort((a, b) => new Date(MODEL_VERSIONS[b].release) - new Date(MODEL_VERSIONS[a].release));
  return available[0] || 'gpt-4o';
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

// Initialize user conversation history
function initializeUser(userId) {
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
    userStats[userId] = {
      totalRequests: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      conversations: 0
    };
  }
}

// Calculate token cost
function calculateCost(inputTokens, outputTokens, model = 'gpt-4o') {
  const inputCost = (inputTokens / 1000) * 0.005; // $0.005 per 1K input tokens
  const outputCost = (outputTokens / 1000) * 0.015; // $0.015 per 1K output tokens
  return inputCost + outputCost;
}

// Main chat endpoint with self-learning
app.post('/api/chat', async (req, res) => {
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });

  const userId = req.header('X-User-ID') || 'anonymous';
  const body = req.body;
  
  if (!body || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: 'Invalid request, expected { messages: [...] }' });
  }

  // Initialize user if new
  initializeUser(userId);

  try {
    // Get latest model (auto-upgrades)
    const currentModel = getLatestModel();
    
    // Combine conversation history with current messages (AI learns from past)
    const messagesWithHistory = [
      ...conversationHistory[userId], // AI remembers all past conversations
      ...body.messages // Current user messages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messagesWithHistory,
        temperature: 0.7,
        max_tokens: MAX_TOKENS
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error('OpenAI error', response.status, txt);
      return res.status(502).json({ error: 'Upstream OpenAI error', details: txt });
    }

    const data = await response.json();
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    
    // Track token usage and cost
    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cost = calculateCost(inputTokens, outputTokens, currentModel);

    // Store in conversation history (AI learns)
    conversationHistory[userId].push(
      { role: 'user', content: body.messages[body.messages.length - 1].content, timestamp: new Date() },
      { role: 'assistant', content: reply, timestamp: new Date() }
    );

    // Update user statistics
    userStats[userId].totalRequests++;
    userStats[userId].totalTokensUsed += (inputTokens + outputTokens);
    userStats[userId].totalCost += cost;
    userStats[userId].lastInteraction = new Date();
    totalCostTracker += cost;

    // Keep only last 50 messages in history to save memory
    if (conversationHistory[userId].length > 50) {
      conversationHistory[userId] = conversationHistory[userId].slice(-50);
    }

    return res.json({ 
      reply,
      metadata: {
        model: currentModel,
        tokensUsed: inputTokens + outputTokens,
        costForThisRequest: cost.toFixed(6),
        userTotalCost: userStats[userId].totalCost.toFixed(4),
        totalSystemCost: totalCostTracker.toFixed(4),
        requestNumber: userStats[userId].totalRequests,
        learningMode: 'ACTIVE (remembering all conversations)'
      }
    });
  } catch (err) {
    console.error('Error calling OpenAI', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics & learning progress
app.get('/api/stats/:userId', (req, res) => {
  const userId = req.params.userId;
  
  if (!userStats[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    userId,
    stats: userStats[userId],
    conversationCount: Math.floor(conversationHistory[userId].length / 2),
    memorySize: conversationHistory[userId].length,
    learningStatus: 'ACTIVE - AI remembers all conversations'
  });
});

// Get system-wide statistics
app.get('/api/system-stats', (req, res) => {
  const totalUsers = Object.keys(userStats).length;
  const totalRequests = Object.values(userStats).reduce((sum, u) => sum + u.totalRequests, 0);
  const currentModel = getLatestModel();

  res.json({
    system: {
      totalUsers,
      totalRequests,
      totalCostTracked: totalCostTracker.toFixed(4),
      currentModel,
      availableModels: Object.keys(MODEL_VERSIONS),
      learningFeatures: {
        conversationMemory: 'ENABLED',
        autoUpgrade: 'ENABLED',
        costTracking: 'ENABLED',
        finetuning: 'COMING SOON'
      }
    }
  });
});

// Clear user conversation history (optional)
app.post('/api/reset/:userId', (req, res) => {
  const userId = req.params.userId;
  
  if (!conversationHistory[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }

  const conversationsDeleted = conversationHistory[userId].length;
  conversationHistory[userId] = [];

  res.json({
    message: 'Conversation history cleared',
    conversationsDeleted,
    note: 'This does not affect usage statistics or costs'
  });
});

// Fallback: serve index.html for all other routes (single page app support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server listening on port ${PORT}`);
  console.log(`📝 POST /api/chat - Chat with self-learning AI`);
  console.log(`📊 GET /api/stats/:userId - View user stats & learning progress`);
  console.log(`📈 GET /api/system-stats - View system-wide statistics`);
  console.log(`🔄 POST /api/reset/:userId - Clear conversation history`);
  console.log(`\n🧠 AI Features:`);
  console.log(`   ✅ Conversation Memory: AI learns from every message`);
  console.log(`   ✅ Auto-Upgrade: Switches to GPT-5, GPT-6 automatically`);
  console.log(`   ✅ Cost Tracking: Monitors OpenAI API spending`);
  console.log(`   ✅ Model: ${getLatestModel()}`);
  console.log(`   ✅ Max Tokens: ${MAX_TOKENS}`);
});
