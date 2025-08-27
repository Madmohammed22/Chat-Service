

/** @type {HTMLUListElement} */
const chatLog = document.getElementById('messages');
/** @type {HTMLInputElement} */
const messageInput = document.getElementById('input');
/** @type {HTMLFormElement} */
const sendForm = document.getElementById('form');

const ws = new WebSocket(`ws://${window.location.host}`);

/** @type {string} */
const currentUser = 'User_' + Math.random().toString(36).slice(2, 11);
console.log('Current user ID:', currentUser);

ws.addEventListener('open', () => {
  console.log('Connected to WebSocket server');
  updateOnlineStatus(true);
});

ws.addEventListener('close', () => {
  console.log('Disconnected from WebSocket server');
  updateOnlineStatus(false);
});

ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
  updateOnlineStatus(false);
});

ws.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'history':
        chatLog.innerHTML = '';
        data.messages.forEach(({ sender, message, id, reactions }) => {
          displayMessage(sender, message, id, reactions);
        });
        break;
      case 'chat':
        displayMessage(data.sender, data.message, data.id, []);
        break;
      case 'reaction':
        updateReactions(data.messageId, data.reactions);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  } catch {
    // Non-JSON or invalid message fallback
    displayMessage('Unknown', event.data);
  }
});

sendForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (!message || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    type: 'chat',
    sender: currentUser,
    message,
  }));

  messageInput.value = '';
  messageInput.focus();
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendForm.requestSubmit();
  }
});

/**
 * Send a reaction emoji for a message
 * @param {string|number} messageId
 * @param {string} emoji
 */
function sendReaction(messageId, emoji) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'reaction',
    messageId,
    emoji,
    user: currentUser,
  }));
}

/**
 * Create reaction emoji buttons and append to message element
 * @param {HTMLElement} messageElement 
 * @param {string|number} messageId 
 */
function createReactionButtons(messageElement, messageId) {
  const container = document.createElement('div');
  container.className = 'reaction-buttons';
  const emojis = ['👍', '👎', '😂', '😢', '😤'];
  emojis.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reaction-button';
    btn.textContent = emoji;
    btn.setAttribute('aria-label', `React with ${emoji}`);
    btn.addEventListener('click', () => sendReaction(messageId, emoji));
    container.appendChild(btn);
  });
  messageElement.appendChild(container);
}

/**
 * Update reactions display on a message element
 * @param {string|number} messageId
 * @param {{emoji:string, count:number}[]} reactions
 */
function updateReactions(messageId, reactions) {
  const messageElement = chatLog.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  let reactionDisplay = messageElement.querySelector('.reactions');
  if (!reactionDisplay) {
    reactionDisplay = document.createElement('div');
    reactionDisplay.className = 'reactions';
    messageElement.appendChild(reactionDisplay);
  }
  reactionDisplay.innerHTML = reactions
    .map(r => `<span aria-label="${r.emoji} has ${r.count} reactions">${r.emoji} ${r.count}</span>`)
    .join(' ');
}

/**
 * Render a chat message in the UI
 * @param {string} sender 
 * @param {string} message 
 * @param {string|number} messageId 
 * @param {{emoji:string, count:number}[]} reactions 
 */
function displayMessage(sender, message, messageId, reactions) {
  const messageElement = document.createElement('li');
  messageElement.className = sender === currentUser ? 'message outgoing' : 'message incoming';
  messageElement.setAttribute('role', 'article');
  messageElement.setAttribute('aria-live', 'polite');

  if (messageId) {
    messageElement.dataset.messageId = messageId.toString();
  }

  // Message content container for styling and structure
  const content = document.createElement('div');
  content.className = 'message-content';

  if (sender !== currentUser) {
    const senderLabel = document.createElement('span');
    senderLabel.className = 'sender-label';
    senderLabel.textContent = `${sender}: `;
    content.appendChild(senderLabel);
  }

  const messageText = document.createElement('span');
  messageText.textContent = message;
  content.appendChild(messageText);
  messageElement.appendChild(content);

  if (messageId) {
    createReactionButtons(messageElement, messageId);
    if (reactions?.length) updateReactions(messageId, reactions);
  }

  chatLog.appendChild(messageElement);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * Update the online/offline status UI
 * @param {boolean} online
 */
function updateOnlineStatus(online) {
  const statusElem = document.querySelector('.online-status');
  if (!statusElem) return;
  statusElem.textContent = online ? '🟢 Connected' : '🔴 Disconnected';
}
