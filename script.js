const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const voiceBtn = document.getElementById("voice-btn");

// Change this to your name if you want
const creatorName = "Creator";

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function getAIResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes("who are you") || lower.includes("what are you")) {
    return `I am LAEN, your personal AI companion. You are my ${creatorName}. I exist to assist you.`;
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return `Hello ${creatorName}. Systems online. How may I assist you today?`;
  }
  if (lower.includes("time")) {
    return `Current time is ${new Date().toLocaleTimeString()}.`;
  }
  if (lower.includes("date")) {
    return `Today is ${new Date().toLocaleDateString()}.`;
  }

  return `Understood, ${creatorName}. I'm processing your request: "${message}". Full advanced capabilities will be added in the next upgrade.`;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  const reply = await getAIResponse(text);
  addMessage(reply, "ai");

  // Voice reply
  const utterance = new SpeechSynthesisUtterance(reply);
  speechSynthesis.speak(utterance);
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
  addMessage(`Systems initialized. Hello ${creatorName}. I am LAEN, ready for your commands.`, "ai");
};
