let currentUser = null;
let currentTab = 'users';
let searchTimeout = null;

auth.onAuthStateChanged(function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    currentUser = user;
});

document.getElementById('search-input').addEventListener('input', Utils.debounce(function(e) {
    var query = e.target.value.trim();
    
    if (query.length > 0) {
        document.getElementById('clear-btn').style.display = 'block';
        document.getElementById('initial-state').style.display = 'none';
        performSearch(query);
    } else {
        document.getElementById('clear-btn').style.display = 'none';
        document.getElementById('search-results').innerHTML = '';
        document.getElementById('no-results').style.display = 'none';
        document.getElementById('initial-state').style.display = 'block';
    }
}, 500));

function switchTab(tab) {
    currentTab = tab;
    
    if (tab === 'users') {
        document.getElementById('tab-users').className = 'btn btn-primary btn-small';
        document.getElementById('tab-games').className = 'btn btn-secondary btn-small';
    } else {
        document.getElementById('tab-users').className = 'btn btn-secondary btn-small';
        document.getElementById('tab-games').className = 'btn btn-primary btn-small';
    }
    
    var query = document.getElementById('search-input').value.trim();
    if (query.length > 0) {
        performSearch(query);
    }
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('clear-btn').style.display = 'none';
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('no-results').style.display = 'none';
    document.getElementById('initial-state').style.display = 'block';
}

async function performSearch(query) {
    var loading = document.getElementById('loading-state');
    var results = document.getElementById('search-results');
    var noResults = document.getElementById('no-results');
    
    loading.style.display = 'block';
    results.innerHTML = '';
    noResults.style.display = 'none';
    
    query = query.toLowerCase();
    
    try {
        if (currentTab === 'users') {
            await searchUsers(query, results, noResults);
        } else {
            await searchGames(query, results, noResults);
        }
    } catch (error) {
        console.error('Search error:', error);
        results.innerHTML = '<div class="empty-state"><p style="color:var(--danger);">Search failed. Try again.</p></div>';
    }
    
    loading.style.display = 'none';
}

async function searchUsers(query, results, noResults) {
    var usersSnapshot = await database.ref('users').once('value');
    var users = usersSnapshot.val() || {};
    
    var matches = [];
    
    Object.entries(users).forEach(function([userId, userData]) {
        if (userId === currentUser.uid) return;
        
        var username = (userData.username || '').toLowerCase();
        var displayName = (userData.displayName || '').toLowerCase();
        
        if (username.includes(query) || displayName.includes(query)) {
            matches.push({ userId, ...userData });
        }
    });
    
    if (matches.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    results.innerHTML = matches.map(function(user) {
        var avatarText = (user.displayName || user.username || '?').charAt(0).toUpperCase();
        var avatarStyle = user.avatarURL ? 
            `<img src="${user.avatarURL}" style="width:100%;height:100%;object-fit:cover;">` : 
            avatarText;
        
        return `
            <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;" onclick="openUserProfile('${user.userId}')">
                <div class="avatar">${avatarStyle}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:14px;">${user.displayName || 'Unknown'}</div>
                    <div style="font-size:12px;color:var(--text-muted);">@${user.username || 'user'}</div>
                </div>
                <button class="btn btn-primary btn-small" onclick="event.stopPropagation();sendFriendRequest('${user.userId}')">ADD</button>
            </div>
        `;
    }).join('');
}

async function searchGames(query, results, noResults) {
    try {
        var response = await fetch('data/games.json');
        var games = await response.json();
        
        var matches = games.filter(function(game) {
            return game.name.toLowerCase().includes(query) || 
                   game.category.toLowerCase().includes(query);
        });
        
        if (matches.length === 0) {
            noResults.style.display = 'block';
            return;
        }
        
        results.innerHTML = matches.map(function(game) {
            var buttonText = game.type === 'luck' ? 'PLAY (' + game.entryCost + ' 🪙)' : 'PLAY FREE';
            
            return `
                <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;" onclick="openGame('${game.id}')">
                    <div style="font-size:32px;">${game.icon}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;">${game.name}</div>
                        <div style="font-size:12px;color:var(--text-muted);">${game.category}</div>
                    </div>
                    <button class="btn btn-primary btn-small">${buttonText}</button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading games:', error);
    }
}

function openUserProfile(userId) {
    window.location.href = 'user-profile.html?uid=' + userId;
}

function openGame(gameId) {
    window.location.href = 'games/' + gameId + '.html';
}

async function sendFriendRequest(userId) {
    if (!currentUser) return;
    
    try {
        var existingSnapshot = await database.ref('friendRequests/' + userId + '/' + currentUser.uid).once('value');
        if (existingSnapshot.exists()) {
            Utils.showToast('Friend request already sent', 'info');
            return;
        }
        
        await database.ref('friendRequests/' + userId + '/' + currentUser.uid).set({
            from: currentUser.uid,
            to: userId,
            status: 'pending',
            createdAt: Date.now()
        });
        
        Utils.showToast('Friend request sent!', 'success');
        
    } catch (error) {
        console.error('Friend request error:', error);
        Utils.showToast('Failed to send request', 'error');
    }
}
