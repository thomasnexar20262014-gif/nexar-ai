
const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

// Remember messages during this browser session.
let conversationHistory = [];

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = "message " + sender;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  const userText = chatInput.value.trim();
  if (!userText) return;

  addMessage(userText, "user");
  chatInput.value = "";
  chatInput.disabled = true;

  const sendButton = chatForm.querySelector("button");
  sendButton.disabled = true;
  sendButton.textContent = "Thinking...";

  const loadingMessage = document.createElement("div");
  loadingMessage.className = "message assistant";
  loadingMessage.textContent = "NEXAR AI is thinking...";
  chatMessages.appendChild(loadingMessage);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: conversationHistory
      })
    });

    const data = await response.json();
    loadingMessage.remove();

    if (!response.ok) {
      throw new Error(data.error || "AI service error");
    }

    addMessage(data.reply, "assistant");

    conversationHistory.push(
      { role: "user", text: userText },
      { role: "model", text: data.reply }
    );

    // Keep the most recent 20 messages.
    conversationHistory = conversationHistory.slice(-20);

  } catch (error) {
    loadingMessage.remove();
    addMessage(
      "Sorry! I couldn't connect to NEXAR AI. " + error.message,
      "assistant"
    );
  } finally {
    chatInput.disabled = false;
    sendButton.disabled = false;
    sendButton.textContent = "Send ↗";
    chatInput.focus();
  }
});
