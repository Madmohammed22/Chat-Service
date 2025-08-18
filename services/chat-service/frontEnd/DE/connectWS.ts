// Type definitions
interface Reaction {
    emoji: string;
    count: number;
}

interface ChatMessage {
    id: number;
    sender: string;
    message: string;
    reactions?: Reaction[];
}

interface HistoryData {
    type: 'history';
    messages: ChatMessage[];
}

interface ChatData {
    type: 'chat';
    sender: string;
    message: string;
}

interface ReactionData {
    type: 'reaction';
    messageId: number;
    reactions: Reaction[];
}

interface OutgoingChatMessage {
    type: 'chat';
    sender: string;
    message: string;
}

interface OutgoingReactionMessage {
    type: 'reaction';
    messageId: number;
    emoji: string;
    user: string;
}

type WebSocketMessage = HistoryData | ChatData | ReactionData;
type OutgoingMessage = OutgoingChatMessage | OutgoingReactionMessage;

// DOM element references with proper typing
const chatLog = document.getElementById('messages') as HTMLElement;
const messageInput = document.getElementById('input') as HTMLInputElement;
const sendButton = document.getElementById('form') as HTMLFormElement;

// Function to send a reaction
function sendReaction(messageId: number, emoji: string): void {
    if (ws.readyState === WebSocket.OPEN) {
        const reactionMessage: OutgoingReactionMessage = {
            type: 'reaction',
            messageId,
            emoji,
            user: currentUser
        };
        ws.send(JSON.stringify(reactionMessage));
    }
}

// WebSocket connection
const ws = new WebSocket(`ws://${window.location.host}`);

ws.onopen = (): void => {
    console.log('Connected to WebSocket server');
};

ws.onmessage = (event: MessageEvent): void => {
    try {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.type === 'history') {
            // Clear existing messages before displaying history
            chatLog.innerHTML = '';
            // Display the message history
            data.messages.forEach((message: ChatMessage) => {
                displayMessage(message.sender, message.message, message.id, message.reactions);
            });
        } else if (data.type === 'chat') {
            // Display a new chat message
            displayMessage(data.sender, data.message);
        } else if (data.type === 'reaction') {
            // Update reactions for a message
            updateReactions(data.messageId, data.reactions);
        }
    } catch (error) {
        console.error("Error processing message:", error);
        // Fallback for non-JSON messages
        displayMessage('Unknown', event.data);
    }
};

ws.onclose = (): void => {
    console.log('Disconnected from WebSocket server');
};

ws.onerror = (error: Event): void => {
    console.error('WebSocket error:', error);
};

// Generate a unique user ID for this session
const currentUser: string = 'User_' + Math.random().toString(36).substr(2, 9);
console.log('Current user ID:', currentUser);

// Handle form submission properly
sendButton.addEventListener('submit', (e: SubmitEvent): void => {
    e.preventDefault(); // Prevent form from refreshing the page
    
    const message: string = messageInput.value.trim();
    if (message && ws.readyState === WebSocket.OPEN) {
        const outgoingMessage: OutgoingMessage = { 
            type: 'chat', 
            sender: currentUser, 
            message: message 
        };
        ws.send(JSON.stringify(outgoingMessage));
        messageInput.value = '';
    }
});

// Also handle Enter key press
messageInput.addEventListener('keypress', (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendButton.dispatchEvent(new Event('submit'));
    }
});

function createReactionButton(messageElement: HTMLElement, messageId: number): void {
    const reactionButton = document.createElement('button');
    reactionButton.textContent = '👍'; // Default reaction emoji
    reactionButton.classList.add('reaction-button');
    reactionButton.onclick = () => sendReaction(messageId, '👍');
    messageElement.appendChild(reactionButton);
}

function updateReactions(messageId: number, reactions: Reaction[]): void {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        const reactionDisplay = messageElement.querySelector('.reactions') || document.createElement('div');
        reactionDisplay.className = 'reactions';
        reactionDisplay.innerHTML = reactions.map(r => `${r.emoji}: ${r.count}`).join(' ');
        if (!reactionDisplay.parentElement) {
            messageElement.appendChild(reactionDisplay);
        }
    }
}

function displayMessage(sender: string, message: string, messageId?: number, reactions?: Reaction[]): void {
    const messageElement: HTMLLIElement = document.createElement('li');
    
    // Check if this message is from the current user
    const isCurrentUser: boolean = sender === currentUser;
    
    // Add appropriate CSS class - Your messages on RIGHT, others on LEFT
    messageElement.className = isCurrentUser ? 'message outgoing' : 'message incoming';
    
    // Set message ID for reaction handling
    if (messageId) {
        messageElement.setAttribute('data-message-id', messageId.toString());
    }
    
    // Format the message content
    if (isCurrentUser) {
        messageElement.textContent = message; // Just the message for current user
    } else {
        messageElement.textContent = `${sender}: ${message}`; // Show sender name for others
    }
    
    // Add reaction button and current reactions if message ID is available
    if (messageId) {
        createReactionButton(messageElement, messageId);
        
        if (reactions && reactions.length > 0) {
            const reactionDisplay = document.createElement('div');
            reactionDisplay.className = 'reactions';
            reactionDisplay.innerHTML = reactions.map(r => `${r.emoji}: ${r.count}`).join(' ');
            messageElement.appendChild(reactionDisplay);
        }
    }
    
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight; // Scroll to bottom
}