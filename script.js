
const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const historyList = document.getElementById("history-list");
const newChatButton = document.getElementById("new-chat");

let chats = loadChats();
let conversationHistory = [];
let currentChatId = null;

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem("nexar_chats") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem("nexar_chats", JSON.stringify(chats));
}

function addMessage(content, sender) {
  const element = document.createElement("div");
  element.className = "message " + sender;
  element.textContent = content;
  chatMessages.appendChild(element);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return element;
}

function showWelcome() {
  chatMessages.innerHTML = "";
  addMessage("Hello! I'm NEXAR AI. What can I help you with today?", "assistant");
}

function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";

  chats.slice().reverse().forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";
    button.textContent = chat.title || "New Chat";
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
  conversationHistory = Array.isArray(chat.messages) ? chat.messages : [];
  chatMessages.innerHTML = "";

  conversationHistory.forEach(item => {
    addMessage(item.text, item.role === "user" ? "user" : "assistant");
  });
}

function saveCurrentChat() {
  if (!conversationHistory.length) return;

  if (!currentChatId) currentChatId = Date.now().toString();

  let chat = chats.find(item => item.id === currentChatId);

  if (!chat) {
    const first = conversationHistory.find(item => item.role === "user");
    chat = {
      id: currentChatId,
      title: first ? first.text.slice(0, 35) : "New Chat",
      messages: []
    };
    chats.push(chat);
  }

  chat.messages = [...conversationHistory];
  saveChats();
  renderHistory();
}

function clearChatHistory() {
  if (!confirm("Delete all saved NEXAR AI conversations? This cannot be undone.")) return;

  chats = [];
  conversationHistory = [];
  currentChatId = null;

  localStorage.removeItem("nexar_chats");

  renderHistory();
  showWelcome();
}

function logout() {
  if (!confirm("Are you sure you want to log out?")) return;

  localStorage.removeItem("nexar_demo_user");
  conversationHistory = [];
  currentChatId = null;

  const appPage = document.getElementById("app-page");
  const landingPage = document.getElementById("landing-page");

  if (appPage) appPage.style.display = "none";
  if (landingPage) landingPage.style.display = "block";

  window.scrollTo(0, 0);
}

async function sendMessage(userText) {
  const text = userText.trim();
  if (!text || !chatInput || !chatMessages) return;

  addMessage(text, "user");
  chatInput.value = "";
  chatInput.disabled = true;

  const sendButton = chatForm?.querySelector('button[type="submit"]')
    || chatForm?.querySelector("button");

  if (sendButton) sendButton.disabled = true;

  const responseElement = addMessage("", "assistant");
  responseElement.textContent = "NEXAR AI is thinking...";

  const previousHistory = conversationHistory.slice(-20).map(item => ({
    role: item.role === "assistant" ? "model" : item.role,
    text: item.text
  }));

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: previousHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || "Server error: " + response.status
      );
    }

    const data = await response.json();
    const reply = data.reply || data.response;

    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("The AI returned an empty response.");
    }

    responseElement.textContent = "";

    // Progressive display (visual streaming).
    // The backend still returns the completed answer in one response.
    for (let i = 0; i < reply.length; i++) {
      responseElement.textContent += reply[i];

      if (i % 5 === 0) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 8));
      }
    }

    conversationHistory.push(
      { role: "user", text },
      { role: "assistant", text: reply }
    );

    conversationHistory = conversationHistory.slice(-20);
    saveCurrentChat();

  } catch (error) {
    console.error("NEXAR AI error:", error);
    responseElement.textContent =
      "Sorry! I couldn't connect to NEXAR AI. " + error.message;
  } finally {
    chatInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    chatInput.focus();
  }
}

if (chatForm) {
  chatForm.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(chatInput.value);
  });
}

if (newChatButton) {
  newChatButton.addEventListener("click", createNewChat);
}

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.getAttribute("data-prompt");
    if (prompt) sendMessage(prompt);
  });
});

// Connect Clear History and Logout controls by ID.
document.getElementById("clear-history")?.addEventListener("click", clearChatHistory);
document.getElementById("logout-button")?.addEventListener("click", logout);

renderHistory();
showWelcome();
