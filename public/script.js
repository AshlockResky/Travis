const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");

const creatorName = "Creator";
const SYSTEM_PROMPT = `You are LAEN, a helpful and concise AI assistant. Be friendly and keep responses safe.`;
const HISTORY_KEY = 'laen_history';
const MAX_HISTORY = 10; // number of previous messages to send as context

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  // Select a preferred voice if available
  const voices = speechSynthesis.getVoices();
  const preferred = voices.find(v => /david|mark|john|en-US|google us english/i.test(v.name) );
  if (preferred) utterance.voice = preferred;
  utterance.rate = 1;
  utterance.pitch = 0.9;
  speechSynthesis.speak(utterance);
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
}

async function fallbackLocalAI(message) {
  const lower = message.toLowerCase();

  if (lower.includes("who are you") || lower.includes("what are you")) {
    return `I am LAEN, your personal artificial intelligence. You created me. I am here to assist you in every way I can.`;
  }
  if (lower.includes("who created you") || lower.includes("who made you")) {
    return `You did, ${creatorName}. You are my creator.`;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello ${creatorName}. All systems are online and ready. How can I help you?`;
  }
  if (lower.includes("time")) {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  }
  if (lower.includes("date")) {
    return `Today is ${new Date().toLocaleDateString()}.`;
  }
  if (lower.includes("thank")) {
    return `You're welcome, ${creatorName}.`;
  }
  if (lower.includes("male voice") || lower.includes("change voice")) {
    return `I have set my voice preference for you, ${creatorName}.`;
  }

  return `I understand, ${creatorName}. You said: "${message}". I am still learning, but I am here for you.`;
}

async function getAIResponse(message) {
  // Build message history to send as context
  const history = loadHistory();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ];

  try {
    // include optional server key from sessionStorage or input
    const serverKey = sessionStorage.getItem('server_key') || (document.getElementById('server-key') && document.getElementById('server-key').value.trim());

    const headers = { 'Content-Type': 'application/json' };
    if (serverKey) headers['X-API-KEY'] = serverKey;

    // Send to your server-side proxy at /api/chat
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages })
    });

    if (!res.ok) {
      throw new Error(`server returned ${res.status}`);
    }

    const data = await res.json();
    if (data && data.reply) {
      // Save to local history
      const newHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: data.reply }];
      saveHistory(newHistory);
      return data.reply;
    }

    // Fallback if unexpected response
    return await fallbackLocalAI(message);
  } catch (err) {
    console.error('AI request failed, using fallback:', err);
    // If server or network fails, use the local rule-based fallback
    return await fallbackLocalAI(message);
  }
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  const reply = await getAIResponse(text);
  addMessage(reply, "ai");
  speak(reply);
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

voiceBtn.addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return alert('Speech recognition not supported in this browser.');

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };

  recognition.onerror = (e) => console.error('Speech recognition error', e);
});

window.onload = () => {
  const welcome = `Systems initialized. Hello ${creatorName}. I am LAEN, ready for your commands.`;
  addMessage(welcome, "ai");
  speak(welcome);
};
