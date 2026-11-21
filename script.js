
const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat");

let conversationHistory = [];
let chats = JSON.parse(localStorage.getItem("nexar_chats") || "[]");
let currentChatId = null;

function saveChats() {
  localStorage.setItem("nexar_chats", JSON.stringify(chats));
}

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = "message " + sender;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showWelcome() {
  chatMessages.innerHTML = "";
  addMessage(
    "Hello! Welcome to NEXAR AI. What would you like to explore?",
    "assistant"
  );
}

function renderHistory() {
  historyList.innerHTML = "";

  chats.slice().reverse().forEach(chat => {
    const button = document.createElement("button");
    button.textContent = chat.title;
    button.className = "history-item";
    button.style.display = "block";
    button.style.width = "100%";
    button.style.marginTop = "8px";
    button.style.padding = "10px";
    button.style.textAlign = "left";
    button.style.cursor = "pointer";

    button.addEventListener("click", () => openChat(chat.id));
    historyList.appendChild(button);
  });
}

function createNewChat() {
  currentChatId = null;
  conversationHistory = [];
  showWelcome();
}

function openChat(id) {
  const chat = chats.find(item => item.id === id);
  if (!chat) return;

  currentChatId = id;
  conversationHistory = [...chat.messages];

  chatMessages.innerHTML = "";

  if (conversationHistory.length === 0) {
    showWelcome();
    return;
  }

  conversationHistory.forEach(message => {
    addMessage(
      message.text,
      message.role === "user" ? "user" : "assistant"
    );
  });
}

function saveCurrentChat() {
  if (conversationHistory.length === 0) return;

  if (!currentChatId) {
    currentChatId = Date.now().toString();
  }

  let chat = chats.find(item => item.id === currentChatId);

  if (!chat) {
    const firstUserMessage = conversationHistory.find(
      message => message.role === "user"
    );

    chat = {
      id: currentChatId,
      title: firstUserMessage
        ? firstUserMessage.text.slice(0, 35)
        : "New Chat",
      messages: []
    };

    chats.push(chat);
  }

  chat.messages = [...conversationHistory];
  saveChats();
  renderHistory();
}

newChatButton.addEventListener("click", createNewChat);

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
        history: conversationHistory.slice(-20)
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

    conversationHistory = conversationHistory.slice(-20);
    saveCurrentChat();

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

renderHistory();
