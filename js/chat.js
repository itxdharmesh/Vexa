// Chat system logic for VEXA

class ChatManager {
    constructor() {
        this.currentUser = null;
        this.activeChat = null;
        this.messageListeners = {};
        this.chatListeners = {};
    }

    async init() {
        authManager.init();
        
        authManager.onAuthStateChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = user;
            this.loadChatList();
        });
    }

    async loadChatList() {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val();
        
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        
        Object.entries(users).forEach(([userId, userData]) => {
            if (userId === this.currentUser.uid) return;
            
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-list-item';
            chatItem.innerHTML = `
                <div class="avatar">${userData.displayName ? userData.displayName[0].toUpperCase() : '?'}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-family: 'Rajdhani', sans-serif;">${userData.displayName || userData.username}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">@${userData.username}</div>
                </div>
                <div id="presence-${userId}">
                    <span class="online-indicator offline"></span>
                </div>
            `;
            chatItem.onclick = () => this.openChat(userId, userData);
            chatList.appendChild(chatItem);
            
            this.loadPresence(userId);
        });
    }

    async loadPresence(userId) {
        const presenceRef = database.ref(`presence/${userId}`);
        presenceRef.on('value', (snapshot) => {
            const presence = snapshot.val();
            const presenceElement = document.getElementById(`presence-${userId}`);
            if (presenceElement) {
                const indicator = presenceElement.querySelector('.online-indicator');
                if (presence && presence.online) {
                    indicator.className = 'online-indicator online';
                } else {
                    indicator.className = 'online-indicator offline';
                }
            }
        });
    }

    async openChat(userId, userData) {
        this.activeChat = userId;
        
        document.getElementById('chat-list').style.display = 'none';
        document.getElementById('chat-window').style.display = 'flex';
        
        document.getElementById('chat-header').innerHTML = `
            <div class="avatar">${userData.displayName ? userData.displayName[0].toUpperCase() : '?'}</div>
            <div>
                <div style="font-weight: 600; font-family: 'Rajdhani', sans-serif;">${userData.displayName || userData.username}</div>
                <div style="font-size: 12px;">
                    <span class="online-indicator" id="chat-online-indicator"></span>
                    <span style="color: var(--text-muted);">@${userData.username}</span>
                </div>
            </div>
        `;
        
        this.listenToMessages(userId);
        this.listenToPresence(userId);
    }

    listenToMessages(userId) {
        const chatId = this.getChatId(userId);
        const messagesRef = database.ref(`chats/${chatId}/messages`);
        
        messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            this.displayMessage(message);
            
            // Save to IndexedDB
            ChronoUtils.writeToIndexedDB('chats', snapshot.key, message);
        });
        
        messagesRef.on('child_removed', (snapshot) => {
            // Remove from UI
            const messageElement = document.getElementById(`message-${snapshot.key}`);
            if (messageElement) {
                messageElement.remove();
            }
        });
        
        this.messageListeners[userId] = messagesRef;
    }

    listenToPresence(userId) {
        const presenceRef = database.ref(`presence/${userId}`);
        presenceRef.on('value', (snapshot) => {
            const presence = snapshot.val();
            const indicator = document.getElementById('chat-online-indicator');
            if (indicator) {
                if (presence && presence.online) {
                    indicator.className = 'online-indicator online';
                } else {
                    indicator.className = 'online-indicator offline';
                }
            }
        });
    }

    getChatId(userId) {
        const participants = [this.currentUser.uid, userId].sort();
        return participants.join('_');
    }

    displayMessage(message) {
        const messagesArea = document.getElementById('messages-area');
        const messageElement = document.createElement('div');
        messageElement.id = `message-${message.id}`;
        messageElement.className = `message ${message.senderId === this.currentUser.uid ? 'message-sent' : 'message-received'}`;
        
        messageElement.innerHTML = `
            ${message.text}
            <span class="message-time">${ChronoUtils.formatTime(message.createdAt)}</span>
        `;
        
        messagesArea.appendChild(messageElement);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text || !this.activeChat) return;
        
        const chatId = this.getChatId(this.activeChat);
        const messageRef = database.ref(`chats/${chatId}/messages`).push();
        
        const message = {
            id: messageRef.key,
            senderId: this.currentUser.uid,
            text: text,
            createdAt: Date.now(),
            expiresAt: Date.now() + 86400000 // 24 hours
        };
        
        await messageRef.set(message);
        
        // Save to IndexedDB
        ChronoUtils.writeToIndexedDB('chats', messageRef.key, message);
        
        input.value = '';
    }

    handleKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    closeChat() {
        this.activeChat = null;
        document.getElementById('chat-list').style.display = 'flex';
        document.getElementById('chat-window').style.display = 'none';
        
        // Remove listeners
        Object.values(this.messageListeners).forEach(listener => listener.off());
        this.messageListeners = {};
        
        document.getElementById('messages-area').innerHTML = '';
    }
}

const chatManager = new ChatManager();
window.chatManager = chatManager;
document.addEventListener('DOMContentLoaded', () => chatManager.init());
