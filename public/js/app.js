// Client-side functionality for the chat application

// Format timestamps for messages
function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Add timestamp to messages
function enhanceMessageDisplay() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        if (!message.querySelector('.message-time')) {
            const timeSpan = document.createElement('span');
            timeSpan.classList.add('message-time');
            timeSpan.textContent = formatTime();
            message.appendChild(timeSpan);
        }
    });
}

// Clear chat history
function setupClearChat() {
    const clearChatButton = document.getElementById('clearChat');
    if (clearChatButton) {
        clearChatButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat history?')) {
                const chatMessages = document.getElementById('chatMessages');
                // Keep only the welcome message
                chatMessages.innerHTML = `
                    <div class="assistant-message message">
                        Hello! I'm your AI assistant. Upload a document, enter text, or provide a website URL on the left, then ask me a question about it.
                        <span class="message-time">${formatTime()}</span>
                    </div>
                    <div class="typing-indicator" id="typingIndicator">
                        AI is thinking...
                    </div>
                `;
            }
        });
    }
}

// Add a clear chat button to the UI
function addClearChatButton() {
    const chatArea = document.querySelector('.chat-area');
    if (chatArea && !document.querySelector('.chat-header')) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Create header
        const header = document.createElement('div');
        header.classList.add('chat-header');
        header.innerHTML = `
            <h4 class="chat-title">Chat</h4>
            <span id="clearChat" class="clear-chat">Clear Chat</span>
        `;
        
        // Insert before chat messages
        chatArea.insertBefore(header, chatMessages);
        
        // Setup event listener
        setupClearChat();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add clear chat button
    addClearChatButton();
    
    // Enhance existing messages
    enhanceMessageDisplay();
    
    // Override the addMessage function to include timestamps
    const originalAddMessage = window.addMessage;
    if (originalAddMessage) {
        window.addMessage = function(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(sender + '-message');
            messageDiv.textContent = text;
            
            // Add timestamp
            const timeSpan = document.createElement('span');
            timeSpan.classList.add('message-time');
            timeSpan.textContent = formatTime();
            messageDiv.appendChild(timeSpan);
            
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
    }
});