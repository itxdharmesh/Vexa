let currentUser = null;
let friendsList = [];

auth.onAuthStateChanged(function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    currentUser = user;
    loadFriendRequests();
    loadFriends();
    loadSuggestions();
});

async function loadFriendRequests() {
    var container = document.getElementById('friend-requests');
    
    try {
        var requestsSnapshot = await database.ref('friendRequests/' + currentUser.uid).once('value');
        var requests = requestsSnapshot.val() || {};
        
        var pendingRequests = Object.entries(requests).filter(function([id, req]) {
            return req.status === 'pending';
        });
        
        if (pendingRequests.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;">No pending requests</p>';
            return;
        }
        
        container.innerHTML = '';
        
        for (var [requestId, request] of pendingRequests) {
            var userSnapshot = await database.ref('users/' + request.from).once('value');
            var userData = userSnapshot.val();
            
            if (!userData) continue;
            
            var avatarText = (userData.displayName || '?').charAt(0).toUpperCase();
            
            var div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);';
            div.innerHTML = `
                <div class="avatar">${avatarText}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:14px;">${userData.displayName}</div>
                    <div style="font-size:12px;color:var(--text-muted);">@${userData.username}</div>
                </div>
                <button class="btn btn-success btn-small" onclick="acceptRequest('${request.from}')">Accept</button>
                <button class="btn btn-danger btn-small" onclick="rejectRequest('${request.from}')">Reject</button>
            `;
            container.appendChild(div);
        }
        
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

async function loadFriends() {
    var container = document.getElementById('friends-list');
    
    try {
        var friendsSnapshot = await database.ref('friends/' + currentUser.uid).once('value');
        var friends = friendsSnapshot.val() || {};
        
        friendsList = Object.keys(friends);
        
        if (friendsList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div class="empty-state-title">No friends yet</div>
                    <div class="empty-state-text">Search for people and add them!</div>
                    <a href="search.html" class="btn btn-primary btn-small">SEARCH PEOPLE</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        for (var friendId of friendsList) {
            var userSnapshot = await database.ref('users/' + friendId).once('value');
            var userData = userSnapshot.val();
            
            if (!userData) continue;
            
            var avatarText = (userData.displayName || '?').charAt(0).toUpperCase();
            
            var div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);';
            div.innerHTML = `
                <div class="avatar">${avatarText}</div>
                <div style="flex:1;" onclick="viewProfile('${friendId}')" style="cursor:pointer;">
                    <div style="font-weight:600;font-size:14px;">${userData.displayName}</div>
                    <div style="font-size:12px;color:var(--text-muted);">@${userData.username}</div>
                </div>
                <button class="btn btn-primary btn-small" onclick="messageFriend('${friendId}', '${userData.displayName}')">Message</button>
                <button class="btn btn-danger btn-small" onclick="removeFriend('${friendId}')">Remove</button>
            `;
            container.appendChild(div);
        }
        
    } catch (error) {
        console.error('Error loading friends:', error);
    }
}

async function loadSuggestions() {
    var container = document.getElementById('suggested-people');
    
    try {
        var usersSnapshot = await database.ref('users').once('value');
        var users = usersSnapshot.val() || {};
        
        var suggestions = [];
        
        Object.entries(users).forEach(function([userId, userData]) {
            if (userId === currentUser.uid) return;
            if (friendsList.includes(userId)) return;
            if (suggestions.length < 3) {
                suggestions.push({ userId, ...userData });
            }
        });
        
        if (suggestions.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;">No suggestions</p>';
            return;
        }
        
        container.innerHTML = suggestions.map(function(user) {
            var avatarText = (user.displayName || '?').charAt(0).toUpperCase();
            return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
                    <div class="avatar">${avatarText}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;">${user.displayName}</div>
                        <div style="font-size:12px;color:var(--text-muted);">@${user.username}</div>
                    </div>
                    <button class="btn btn-primary btn-small" onclick="sendRequest('${user.userId}')">Add</button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

async function acceptRequest(fromUserId) {
    try {
        await database.ref('friends/' + currentUser.uid + '/' + fromUserId).set(true);
        await database.ref('friends/' + fromUserId + '/' + currentUser.uid).set(true);
        await database.ref('friendRequests/' + currentUser.uid + '/' + fromUserId).remove();
        
        Utils.showToast('Friend added!', 'success');
        loadFriendRequests();
        loadFriends();
        loadSuggestions();
        
    } catch (error) {
        console.error('Error accepting request:', error);
    }
}

async function rejectRequest(fromUserId) {
    try {
        await database.ref('friendRequests/' + currentUser.uid + '/' + fromUserId).remove();
        Utils.showToast('Request rejected', 'info');
        loadFriendRequests();
    } catch (error) {
        console.error('Error rejecting request:', error);
    }
}

async function removeFriend(friendId) {
    if (!confirm('Remove this friend?')) return;
    
    try {
        await database.ref('friends/' + currentUser.uid + '/' + friendId).remove();
        await database.ref('friends/' + friendId + '/' + currentUser.uid).remove();
        Utils.showToast('Friend removed', 'info');
        loadFriends();
        loadSuggestions();
    } catch (error) {
        console.error('Error removing friend:', error);
    }
}

function messageFriend(friendId, displayName) {
    sessionStorage.setItem('chatUserId', friendId);
    sessionStorage.setItem('chatUserName', displayName);
    window.location.href = 'chat-window.html';
}

function viewProfile(userId) {
    window.location.href = 'user-profile.html?uid=' + userId;
}

async function sendRequest(userId) {
    try {
        await database.ref('friendRequests/' + userId + '/' + currentUser.uid).set({
            from: currentUser.uid,
            to: userId,
            status: 'pending',
            createdAt: Date.now()
        });
        Utils.showToast('Friend request sent!', 'success');
        loadSuggestions();
    } catch (error) {
        console.error('Error sending request:', error);
    }
}
