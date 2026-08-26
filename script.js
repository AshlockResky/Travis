const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");

const creatorName = "Creator";

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to set a male voice
  const voices = speechSynthesis.getVoices();
  const maleVoice = voices.find(voice => 
    voice.name.toLowerCase().includes("male") || 
    voice.name.includes("David") || 
    voice.name.includes("James") ||
    voice.name.includes("Google US English")
  );
  
  if (maleVoice) {
    utterance.voice = maleVoice;
  }
  
  utterance.rate = 1;
  utterance.pitch = 0.9;
  speechSynthesis.speak(utterance);
}

async function getAIResponse(message) {
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
    return `I have set my voice to a male tone for you, ${creatorName}.`;
  }

  return `I understand, ${creatorName}. You said: "${message}". I am still learning, but I am here for you.`;
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
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };
});

window.onload = () => {
  const welcome = `Systems initialized. Hello ${creatorName}. I am LAEN, ready for your commands.`;
  addMessage(welcome, "ai");
  speak(welcome);
};
