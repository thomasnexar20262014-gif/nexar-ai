
// NEXAR AI — Frontend application

const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

const $ = (id) => document.getElementById(id);

// App elements
const landingPage = $("landing-page");
const appPage = $("app-page");
const authModal = $("auth-modal");
const authForm = $("auth-form");
const authError = $("auth-error");
const chatForm = $("chat-form");
const chatInput = $("chat-input");
const chatMessages = $("chat-messages");
const historyList = $("history-list");
const welcomeScreen = $("welcome-screen");
const sendButton = $("send-button");

let authMode = "login";
let currentUser = null;
let currentChatId = null;
let conversationHistory = [];
let chats = JSON.parse(localStorage.getItem("nexar_chats") || "[]");

// Save chat history in this browser
function saveChats() {
  localStorage.setItem("nexar_chats", JSON.stringify(chats));
}

function saveSession() {
  if (currentUser) {
    localStorage.setItem("nexar_demo_user", JSON.stringify(currentUser));
  }
}

function showLanding() {
  landingPage.classList.remove("hidden");
  appPage.classList.add("hidden");
  authModal.classList.add("hidden");
}

function showDashboard() {
  landingPage.classList.add("hidden");
  authModal.classList.add("hidden");
  appPage.classList.remove("hidden");

  $("user-name").textContent = currentUser.name;
  $("user-email").textContent = currentUser.email;
  $("user-avatar").textContent = currentUser.name.charAt(0).toUpperCase();

  renderHistory();

  if (chats.length) {
    openChat(chats[0].id);
  } else {
    createNewChat();
  }
}

// Login / signup modal
function openAuth(mode) {
  authMode = mode;
  authModal.classList.remove("hidden");
  authError.textContent = "";

  const signup = mode === "signup";

  $("auth-title").textContent = signup ? "Create your account" : "Welcome back";
  $("auth-description").textContent = signup
    ? "Start your NEXAR AI journey."
    : "Sign in to enter your AI workspace.";

  $("name-label").classList.toggle("hidden", !signup);
  $("auth-name").classList.toggle("hidden", !signup);
  $("auth-name").required = signup;
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-submit").textContent = signup ? "Create account" : "Log in";

  $("auth-switch").innerHTML = signup
    ? 'Already have an account? <button type="button" data-open-auth="login">Log in</button>'
    : 'New here? <button type="button" data-open-auth="signup">Create an account</button>';
}

document.addEventListener("click", (event) => {
  const authButton = event.target.closest("[data-open-auth]");

  if (authButton) {
    openAuth(authButton.dataset.openAuth);
  }
});

$("close-auth").addEventListener("click", () => {
  authModal.classList.add("hidden");
});

authModal.addEventListener("click", (event) => {
  if (event.target === authModal) authModal.classList.add("hidden");
});

// DEMO ONLY: This is not secure account authentication.
// Do not use this local browser-only login for a public launch.
authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("auth-email").value.trim().toLowerCase();
  const password = $("auth-password").value;
  const name = $("auth-name").value.trim();

  if (!email || !password) {
    authError.textContent = "Please complete the required fields.";
    return;
  }

  if (authMode === "signup" && !name) {
    authError.textContent = "Please enter your name.";
    return;
  }

  currentUser = {
    name: authMode === "signup"
      ? name
      : (email.split("@")[0] || "NEXAR User"),
    email
  };

  saveSession();
  authForm.reset();
  showDashboard();
});

// Chat management
function createNewChat() {
  currentChatId = Date.now().toString();
  conversationHistory = [];

  const chat = {
    id: currentChatId,
    title: "New chat",
    messages: []
  };

  chats.unshift(chat);
  saveChats();

  chatMessages.replaceChildren();
  welcomeScreen.classList.remove("hidden");
  chatInput.value = "";
  renderHistory();
  chatInput.focus();
}

function getCurrentChat() {
  return chats.find((chat) => chat.id === currentChatId);
}

function openChat(id) {
  const chat = chats.find((item) => item.id === id);
  if (!chat) return;

  currentChatId = id;
  conversationHistory = [...chat.messages];

  chatMessages.replaceChildren();
  welcomeScreen.classList.toggle("hidden", chat.messages.length > 0);

  chat.messages.forEach((message) => {
    addMessage(message.role, message.content);
  });

  renderHistory();
  chatInput.focus();
}

function renderHistory() {
  historyList.replaceChildren();

  chats.forEach((chat) => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = chat.title;
    button.title = chat.title;

    if (chat.id === currentChatId) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => openChat(chat.id));
    historyList.appendChild(button);
  });
}

function addMessage(role, content) {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "assistant" ? "∞" : "U";

  const text = document.createElement("div");
  text.className = "message-content";
  text.textContent = content;

  if (role === "user") {
    message.append(text, avatar);
  } else {
    message.append(avatar, text);
  }

  chatMessages.appendChild(message);
  message.scrollIntoView({ behavior: "smooth", block: "end" });
}

function saveCurrentChat() {
  const chat = getCurrentChat();
  if (!chat) return;

  chat.messages = [...conversationHistory];

  if (chat.title === "New chat" && conversationHistory.length) {
    chat.title = conversationHistory[0].content.slice(0, 35);
  }

  saveChats();
  renderHistory();
}

// Send message to NEXAR AI backend
async function sendMessage(message) {
  const chat = getCurrentChat();
  if (!chat) return;

  welcomeScreen.classList.add("hidden");

  conversationHistory.push({
    role: "user",
    content: message
  });

  addMessage("user", message);

  if (chat.title === "New chat") {
    chat.title = message.slice(0, 35);
    renderHistory();
  }

  saveCurrentChat();

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "NEXAR AI is thinking...";
  chatMessages.appendChild(typing);

  sendButton.disabled = true;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
     body: JSON.stringify({
  message: message,
  history: conversationHistory
    .slice(0, -1)
    .slice(-20)
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      text: item.content
    }))
})
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    // Supports the standard OpenAI-compatible response format.
    const reply =
      data.choices?.[0]?.message?.content ||
      data.reply ||
      data.response;

    if (!reply) {
      throw new Error("The AI returned an empty response.");
    }

    conversationHistory.push({
      role: "assistant",
      content: reply
    });

    typing.remove();
    addMessage("assistant", reply);
    saveCurrentChat();

  } catch (error) {
    typing.remove();

    addMessage(
      "assistant",
      "Sorry! I couldn't connect to NEXAR AI. Please try again. Error: " + error.message
    );

  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message || sendButton.disabled) return;

  chatInput.value = "";
  chatInput.style.height = "auto";

  await sendMessage(message);
});

// Enter to send; Shift + Enter for a new line
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

// Auto-grow message box
chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + "px";
});

// Suggestion prompts
document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.prompt;
    chatForm.requestSubmit();
  });
});

// Sidebar controls
$("new-chat").addEventListener("click", createNewChat);
$("open-sidebar").addEventListener("click", () => {
  $("sidebar").classList.add("open");
});
$("close-sidebar").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
});

// Close sidebar after selecting a chat on mobile
historyList.addEventListener("click", () => {
  $("sidebar").classList.remove("open");
});

// Demo logout
$("logout-button").addEventListener("click", () => {
  localStorage.removeItem("nexar_demo_user");
  currentUser = null;
  currentChatId = null;
  showLanding();
});

// Restore demo session
try {
  const savedUser = JSON.parse(localStorage.getItem("nexar_demo_user") || "null");

  if (savedUser && savedUser.email && savedUser.name) {
    currentUser = savedUser;
    showDashboard();
  } else {
    showLanding();
  }
} catch {
  showLanding();
}
