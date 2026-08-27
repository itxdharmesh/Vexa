let currentUser = null;
let conversations = [];

auth.onAuthStateChanged(function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    currentUser = user;
    loadConversations();
});

async function loadConversations() {
    var list = document.getElementById('conversation-list');
    var emptyState = document.getElementById('empty-chat');
    
    try {
        // Get all chats where current user is participant
        var chatsSnapshot = await database.ref('chats').once('value');
        var chats = chatsSnapshot.val() || {};
        
        conversations = [];
        
        for (var chatId in chats) {
            var chat = chats[chatId];
            if (chat.participants && chat.participants[currentUser.uid]) {
                var otherUserId = null;
                for (var uid in chat.participants) {
                    if (uid !== currentUser.uid) {
                        otherUserId = uid;
                        break;
                    }
                }
                
                if (otherUserId) {
                    var userSnapshot = await database.ref('users/' + otherUserId).once('value');
                    var userData = userSnapshot.val();
                    
                    // Get last message
                    var lastMessage = null;
                    if (chat.messages) {
                        var messageKeys = Object.keys(chat.messages);
                        if (messageKeys.length > 0) {
                            var lastKey = messageKeys[messageKeys.length - 1];
                            lastMessage = chat.messages[lastKey];
                        }
                    }
                    
                    conversations.push({
                        chatId: chatId,
                        userId: otherUserId,
                        userData: userData,
                        lastMessage: lastMessage
                    });
                }
            }
        }
        
        if (conversations.length === 0) {
            list.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        renderConversations();
        
    } catch (error) {
        console.error('Error loading conversations:', error);
        list.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Failed to load chats</p>';
    }
}

function renderConversations() {
    var list = document.getElementById('conversation-list');
    
    list.innerHTML = conversations.map(function(conv) {
        var avatarText = (conv.userData.displayName || conv.userData.username || '?').charAt(0).toUpperCase();
        var lastText = conv.lastMessage ? conv.lastMessage.text : 'No messages yet';
        var lastTime = conv.lastMessage ? Utils.timeAgo(conv.lastMessage.createdAt) : '';
        
        return `
            <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;" onclick="openChat('${conv.userId}', '${conv.userData.displayName}')">
                <div class="avatar">${avatarText}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:600;font-size:14px;">${conv.userData.displayName || 'Unknown'}</span>
                        <span style="font-size:11px;color:var(--text-muted);">${lastTime}</span>
                    </div>
                    <div style="font-size:13px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lastText}</div>
                </div>
            </div>
        `;
    }).join('');
}

document.getElementById('chat-search').addEventListener('input', function(e) {
    var query = e.target.value.toLowerCase();
    var filtered = conversations.filter(function(conv) {
        var name = (conv.userData.displayName || '').toLowerCase();
        var username = (conv.userData.username || '').toLowerCase();
        return name.includes(query) || username.includes(query);
    });
    
    renderFilteredConversations(filtered);
});

function renderFilteredConversations(filtered) {
    var list = document.getElementById('conversation-list');
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-title">No conversations found</div></div>';
        return;
    }
    
    list.innerHTML = filtered.map(function(conv) {
        var avatarText = (conv.userData.displayName || '?').charAt(0).toUpperCase();
        var lastText = conv.lastMessage ? conv.lastMessage.text : 'No messages yet';
        var lastTime = conv.lastMessage ? Utils.timeAgo(conv.lastMessage.createdAt) : '';
        
        return `
            <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;" onclick="openChat('${conv.userId}', '${conv.userData.displayName}')">
                <div class="avatar">${avatarText}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;">
                        <span style="font-weight:600;font-size:14px;">${conv.userData.displayName}</span>
                        <span style="font-size:11px;color:var(--text-muted);">${lastTime}</span>
                    </div>
                    <div style="font-size:13px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lastText}</div>
                </div>
            </div>
        `;
    }).join('');
}

function openChat(userId, displayName) {
    sessionStorage.setItem('chatUserId', userId);
    sessionStorage.setItem('chatUserName', displayName);
    window.location.href = 'chat-window.html';
}a
