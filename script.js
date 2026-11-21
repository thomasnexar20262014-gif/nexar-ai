
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

const demoReplies = [
  "Welcome to NEXAR AI! I'm your demo assistant.",
  "That's an interesting question! A real AI connection is coming soon.",
  "Let's turn your idea into something amazing with NEXAR AI.",
  "NEXAR AI is being built to help with creativity, learning and productivity.",
  "Think beyond limits. What else would you like to explore?"
];

let replyIndex = 0;

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = "message " + sender;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", function(event) {
  event.preventDefault();

  const userText = chatInput.value.trim();

  if (!userText) {
    return;
  }

  addMessage(userText, "user");
  chatInput.value = "";

  setTimeout(function() {
    const reply = demoReplies[replyIndex];
    addMessage(reply, "assistant");

    replyIndex = (replyIndex + 1) % demoReplies.length;
  }, 600);
});
