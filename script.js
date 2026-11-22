
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
let isSending = false;

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

// AUTHENTICATION

function openAuth(mode = "login") {
  if (!authModal) return;

  authMode = mode;
  if (authError) authError.textContent = "";

  $("auth-title").textContent =
    mode === "signup" ? "Create your account." : "Welcome back.";

  $("auth-description").textContent =
    mode === "signup"
      ? "Start your journey with NEXAR AI."
      : "Enter your details to continue.";

  $("auth-submit").textContent =
    mode === "signup" ? "Create account →" : "Continue →";

  $("name-label").style.display = mode === "signup" ? "block" : "none";
  authName.style.display = mode === "signup" ? "block" : "none";
  authName.required = mode === "signup";

  $("auth-switch").innerHTML =
    mode === "signup"
      ? 'Already have an account? <button type="button" data-open-auth="login">Log in</button>'
      : 'New here? <button type="button" data-open-auth="signup">Create an account</button>';

  authModal.classList.remove("hidden");
}

function closeAuth() {
  if (!authModal) return;
  authModal.classList.add("hidden");
  if (authError) authError.textContent = "";
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-open-auth]");
  if (button) openAuth(button.dataset.openAuth || "login");
});

$("close-auth")?.addEventListener("click", closeAuth);

authModal?.addEventListener("click", event => {
  if (event.target === authModal) closeAuth();
});

authForm?.addEventListener("submit", event => {
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

  const user = {
    name: authMode === "signup" ? name : (name || email.split("@")[0]),
    email
  };

  localStorage.setItem("nexar_demo_user", JSON.stringify(user));
  showDashboard(user);
});

function showDashboard(user) {
  if (landingPage) landingPage.style.display = "none";
  closeAuth();

  if (appPage) {
    appPage.style.display = "";
    appPage.classList.remove("hidden");
  }

  $("user-name").textContent = user.name || "NEXAR User";
  $("user-email").textContent = user.email || "Welcome";

  const initial = (user.name || "N").charAt(0).toUpperCase();

  if ($("user-avatar")) $("user-avatar").textContent = initial;
  if ($("topbar-avatar")) $("topbar-avatar").textContent = initial;

  createNewChat();
  renderHistory();
}

function logout() {
  if (!confirm("Are you sure you want to log out?")) return;

  localStorage.removeItem("nexar_demo_user");
  conversationHistory = [];
  currentChatId = null;

  if (appPage) {
    appPage.classList.add("hidden");
    appPage.style.display = "none";
  }

  if (landingPage) landingPage.style.display = "";

  closeAuth();
}

$("logout-button")?.addEventListener("click", logout);

// CHAT DISPLAY

function addMessage(content, sender) {
  const element = document.createElement("div");
  element.className = "message " + sender;

  if (sender === "assistant" && typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
    element.innerHTML = DOMPurify.sanitize(
      marked.parse(content || "")
    );
  } else {
    element.textContent = content;
  }

  chatMessages.appendChild(element);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return element;
}

function showWelcome() {
  if (welcomeScreen) welcomeScreen.classList.remove("hidden");
  if (chatMessages) chatMessages.innerHTML = "";
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

  if (welcomeScreen) welcomeScreen.classList.add("hidden");
  chatMessages.innerHTML = "";

  conversationHistory.forEach(item => {
    addMessage(item.text, item.role === "user" ? "user" : "assistant");
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

// CLEAR HISTORY

function clearChatHistory() {
  if (!confirm("Delete all saved NEXAR AI conversations? This cannot be undone.")) {
    return;
  }

  chats = [];
  conversationHistory = [];
  currentChatId = null;

  localStorage.removeItem("nexar_chats");
  renderHistory();
  showWelcome();
}

const historyHeading = document.querySelector(".history-heading");

if (historyHeading && !$("clear-history")) {
  const clearButton = document.createElement("button");
  clearButton.id = "clear-history";
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  clearButton.className = "history-clear-button";
  clearButton.title = "Clear all conversations";
  clearButton.addEventListener("click", clearChatHistory);
  historyHeading.appendChild(clearButton);
}

$("clear-history")?.addEventListener("click", clearChatHistory);
$("new-chat")?.addEventListener("click", createNewChat);

// REAL AI STREAMING

async function sendMessage(userText) {
  const text = userText.trim();

  if (!text || !chatInput || !chatMessages || isSending) return;

  isSending = true;

  if (welcomeScreen) welcomeScreen.classList.add("hidden");

  addMessage(text, "user");

  chatInput.value = "";
  chatInput.disabled = true;

  const sendButton = $("send-button");
  if (sendButton) sendButton.disabled = true;

  const output = addMessage("", "assistant");
  output.textContent = "NEXAR AI is thinking...";

  const previousHistory = conversationHistory.slice(-16).map(item => ({
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
        errorData.error || "Server error: " + response.status
      );
    }

    if (!response.body) {
      throw new Error("Streaming is not supported by this response.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let reply = "";
    let firstToken = true;
    let finished = false;

    output.textContent = "";

    while (!finished) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();

          if (payload === "[DONE]") {
            finished = true;
            break;
          }

          try {
            const chunk = JSON.parse(payload);
            const content = chunk.choices?.[0]?.delta?.content;

            if (typeof content === "string" && content) {
              if (firstToken) {
                output.textContent = "";
                firstToken = false;
              }

              reply += content;
              output.textContent = reply;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch {
            // Ignore incomplete or non-JSON SSE events.
          }
        }

        if (finished) break;
      }
    }

  if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
  output.innerHTML = DOMPurify.sanitize(
    marked.parse(reply)
  );
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
    isSending = false;
    chatInput.disabled = false;

    if (sendButton) sendButton.disabled = false;

    chatInput.focus();
  }
}

chatForm?.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

// SUGGESTED PROMPTS

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    const prompt = button.dataset.prompt;
    if (prompt) sendMessage(prompt);
  });
});

// INITIAL SETUP

renderHistory();

if (chatMessages) showWelcome();

try {
  const savedUser = JSON.parse(
    localStorage.getItem("nexar_demo_user") || "null"
  );

  if (savedUser) showDashboard(savedUser);
} catch {
  localStorage.removeItem("nexar_demo_user");
}
