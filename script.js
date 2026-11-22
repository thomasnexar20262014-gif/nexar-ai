
const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

// NEXAR AI page elements
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat");

// Safely load saved chats
function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem("nexar_chats") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let chats = loadChats();
let conversationHistory = [];
let currentChatId = null;

function saveChats() {
  localStorage.setItem("nexar_chats", JSON.stringify(chats));
}

// Display a message
function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = "message " + sender;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

// Welcome screen
function showWelcome() {
  chatMessages.innerHTML = "";
  addMessage(
    "Hello! Welcome to NEXAR AI. What would you like to explore?",
    "assistant"
  );
}

// Normalize old saved messages
function normalizeHistory(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(item =>
      item &&
      typeof item.text === "string" &&
      item.text.trim() !== ""
    )
    .map(item => ({
      role:
        item.role === "assistant" || item.role === "model"
          ? "model"
          : "user",
      text: item.text
    }));
}

// Recent chat list
function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";

  chats.slice().reverse().forEach(chat => {
    const button = document.createElement("button");

    button.textContent = chat.title || "New Chat";
    button.className = "history-item";
    button.type = "button";

    button.addEventListener("click", () => openChat(chat.id));

    historyList.appendChild(button);
  });
}

// Start a new conversation
function createNewChat() {
  currentChatId = null;
  conversationHistory = [];
  showWelcome();
}

// Open an existing conversation
function openChat(id) {
  const chat = chats.find(item => item.id === id);
  if (!chat) return;

  currentChatId = id;
  conversationHistory = normalizeHistory(chat.messages);

  chatMessages.innerHTML = "";

  if (conversationHistory.length === 0) {
    showWelcome();
    return;
  }

  conversationHistory.forEach(item => {
    addMessage(
      item.text,
      item.role === "user" ? "user" : "assistant"
    );
  });
}

// Save the current conversation
function saveCurrentChat() {
  if (conversationHistory.length === 0) return;

  if (!currentChatId) {
    currentChatId = Date.now().toString();
  }

  let chat = chats.find(item => item.id === currentChatId);

  if (!chat) {
    const firstMessage = conversationHistory.find(
      item => item.role === "user"
    );

    chat = {
      id: currentChatId,
      title: firstMessage
        ? firstMessage.text.slice(0, 35)
        : "New Chat",
      messages: []
    };

    chats.push(chat);
  }

  chat.messages = [...conversationHistory];

  saveChats();
  renderHistory();
}

// Send a message to NEXAR AI
async function sendMessage(userText) {
  const text = userText.trim();

  if (!text || !chatForm || !chatInput || !chatMessages) return;

  addMessage(text, "user");
  chatInput.value = "";
  chatInput.disabled = true;

  const sendButton = chatForm.querySelector('button[type="submit"]')
    || chatForm.querySelector("button");

  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = "Thinking...";
  }

  const loadingMessage = addMessage(
    "NEXAR AI is thinking...",
    "assistant"
  );

  // Keep previous messages separate from the latest message
  const previousHistory = normalizeHistory(conversationHistory)
    .slice(-20);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: previousHistory
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const details =
        data.error ||
        data.message ||
        data.reply ||
        "The server rejected the request.";

      throw new Error(
        "Server error " + response.status + ": " + details
      );
    }

    const reply = data.reply || data.response;

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("The AI server returned an empty response.");
    }

    loadingMessage.remove();

    conversationHistory.push(
      { role: "user", text: text },
      { role: "model", text: reply }
    );

    conversationHistory = conversationHistory.slice(-20);

    addMessage(reply, "assistant");
    saveCurrentChat();

  } catch (error) {
    loadingMessage.remove();

    console.error("NEXAR AI error:", error);

    addMessage(
      "Sorry! I couldn't connect to NEXAR AI. " + error.message,
      "assistant"
    );

  } finally {
    chatInput.disabled = false;

    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = "Send ↗";
    }

    chatInput.focus();
  }
}

// Form submission
if (chatForm) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(chatInput.value);
  });
}

// New chat button
if (newChatButton) {
  newChatButton.addEventListener("click", createNewChat);
}

// Suggested prompt buttons
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.getAttribute("data-prompt");
    if (prompt) sendMessage(prompt);
  });
});

// Initial setup
renderHistory();
showWelcome();
