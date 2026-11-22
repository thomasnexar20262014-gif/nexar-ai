
const API_URL = "https://nexar-ai-backend.thomasnexar2026-2014.workers.dev/";

const $ = id => document.getElementById(id);

const landingPage = $("landing-page");
const appPage = $("app-page");
const authModal = $("auth-modal");
const authForm = $("auth-form");
const authName = $("auth-name");
const authEmail = $("auth-email");
const authPassword = $("auth-password");
const authError = $("auth-error");
const chatForm = $("chat-form");
const chatInput = $("chat-input");
const chatMessages = $("chat-messages");
const welcomeScreen = $("welcome-screen");
const historyList = $("history-list");

let chats = loadChats();
let conversationHistory = [];
let currentChatId = null;
let authMode = "login";

function loadChats() {
  try {
    const data = JSON.parse(localStorage.getItem("nexar_chats") || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveChats() {
  localStorage.setItem("nexar_chats", JSON.stringify(chats));
}

// ---------------- AUTHENTICATION ----------------

function openAuth(mode = "login") {
  authMode = mode;
  authError.textContent = "";

  $("auth-title").textContent =
    mode === "signup" ? "Create your account." : "Welcome back.";

  $("auth-description").textContent =
    mode === "signup"
      ? "Start your journey with NEXAR AI."
      : "Enter your details to continue.";

  $("auth-submit").textContent =
    mode === "signup" ? "Create account →" : "Continue →";

  $("name-label").style.display =
    mode === "signup" ? "block" : "none";

  authName.style.display =
    mode === "signup" ? "block" : "none";

  authName.required = mode === "signup";

  $("auth-switch").innerHTML =
    mode === "signup"
      ? 'Already have an account? <button type="button" data-open-auth="login">Log in</button>'
      : 'New here? <button type="button" data-open-auth="signup">Create an account</button>';

  authModal.classList.remove("hidden");
}

function closeAuth() {
  authModal.classList.add("hidden");
  authError.textContent = "";
}

function showDashboard(user) {
  landingPage.style.display = "none";
  authModal.classList.add("hidden");
  appPage.classList.remove("hidden");

  $("user-name").textContent = user.name || "NEXAR User";
  $("user-email").textContent = user.email || "Welcome";

  const initial = (user.name || "N").charAt(0).toUpperCase();
  $("user-avatar").textContent = initial;
  $("topbar-avatar").textContent = initial;

  createNewChat();
  renderHistory();
}

function logout() {
  if (!confirm("Are you sure you want to log out?")) return;

  localStorage.removeItem("nexar_demo_user");

  conversationHistory = [];
  currentChatId = null;

  appPage.classList.add("hidden");
  landingPage.style.display = "";
  closeAuth();

  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-open-auth]").forEach(button => {
  button.addEventListener("click", () => {
    openAuth(button.dataset.openAuth);
  });
});

$("close-auth").addEventListener("click", closeAuth);

authModal.addEventListener("click", event => {
  if (event.target === authModal) closeAuth();
});

authForm.addEventListener("submit", event => {
  event.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const name = authName.value.trim();

  if (!email || !password) {
    authError.textContent = "Please complete all required fields.";
    return;
  }

  if (authMode === "signup" && !name) {
    authError.textContent = "Please enter your name.";
    return;
  }

  // Demo login only. This is not secure real authentication.
  const user = {
    name: authMode === "signup"
      ? name
      : (name || email.split("@")[0]),
    email
  };

  localStorage.setItem("nexar_demo_user", JSON.stringify(user));

  showDashboard(user);
});

$("logout-button").addEventListener("click", logout);

// ---------------- CHAT DISPLAY ----------------

function addMessage(text, sender) {
  const element = document.createElement("div");
  element.className = "message " + sender;
  element.textContent = text;

  chatMessages.appendChild(element);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return element;
}

function showWelcome() {
  chatMessages.innerHTML = "";
  welcomeScreen.classList.remove("hidden");
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
  conversationHistory = Array.isArray(chat.messages)
    ? chat.messages
    : [];

  welcomeScreen.classList.add("hidden");
  chatMessages.innerHTML = "";

  conversationHistory.forEach(item => {
    addMessage(
      item.text,
      item.role === "user" ? "user" : "assistant"
    );
  });
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

function saveCurrentChat() {
  if (!conversationHistory.length) return;

  if (!currentChatId) {
    currentChatId = Date.now().toString();
  }

  let chat = chats.find(item => item.id === currentChatId);

  if (!chat) {
    const first = conversationHistory.find(
      item => item.role === "user"
    );

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

// ---------------- CLEAR HISTORY ----------------

function clearChatHistory() {
  if (!confirm("Delete ALL saved conversations? This cannot be undone.")) {
    return;
  }

  chats = [];
  conversationHistory = [];
  currentChatId = null;

  localStorage.removeItem("nexar_chats");

  renderHistory();
  showWelcome();
}

// Add a Clear History button to the existing sidebar.
const historyHeading = document.querySelector(".history-heading");

if (historyHeading) {
  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  clearButton.className = "history-clear-button";
  clearButton.title = "Clear all conversations";
  clearButton.addEventListener("click", clearChatHistory);
  historyHeading.appendChild(clearButton);
}

$("new-chat").addEventListener("click", createNewChat);

// ---------------- AI RESPONSE STREAMING ----------------

// Supports real SSE streaming when the Worker is upgraded.
// Also supports the current JSON response from your Worker.
async function readAIResponse(response, outputElement) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const dataText = line.slice(5).trim();
        if (!dataText || dataText === "[DONE]") continue;

        try {
          const data = JSON.parse(dataText);
          const piece = data.choices?.[0]?.delta?.content || "";

          if (piece) {
            fullReply += piece;
            outputElement.textContent = fullReply;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch {
          // Ignore incomplete event data.
        }
      }
    }

    return fullReply;
  }

  const data = await response.json();
  return data.reply || data.response || "";
}

// ---------------- SEND MESSAGE ----------------

async function sendMessage(text) {
  text = text.trim();

  if (!text || !chatInput || !chatMessages) return;

  welcomeScreen.classList.add("hidden");

  addMessage(text, "user");
  chatInput.value = "";
  chatInput.disabled = true;

  const sendButton = $("send-button");
  sendButton.disabled = true;

  const output = addMessage("NEXAR AI is thinking...", "assistant");

  const previousHistory = conversationHistory.slice(-20).map(item => ({
    role: item.role === "assistant" ? "model" : "user",
    text: item.text
  }));

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || errorData.message ||
        "Server error: " + response.status
      );
    }

    output.textContent = "";

    const reply = await readAIResponse(response, output);

    if (!reply.trim()) {
      throw new Error("The AI returned an empty response.");
    }

    conversationHistory.push(
      { role: "user", text },
      { role: "assistant", text: reply }
    );

    conversationHistory = conversationHistory.slice(-20);
    saveCurrentChat();

  } catch (error) {
    console.error("NEXAR AI error:", error);
    output.textContent =
      "Sorry! I couldn't connect to NEXAR AI. " + error.message;
  } finally {
    chatInput.disabled = false;
    sendButton.disabled = false;
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

// ---------------- SUGGESTED PROMPTS ----------------

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// ---------------- INITIAL SETUP ----------------

renderHistory();
showWelcome();
