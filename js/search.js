async function searchUsers(query, results, noResults) {
    var searchTerm = query.toLowerCase().replace('@', ''); // Remove @ for searching
    
    try {
        var usersSnapshot = await database.ref('users').once('value');
        var users = usersSnapshot.val() || {};
        
        var matches = [];
        
        Object.entries(users).forEach(function([userId, userData]) {
            if (userId === currentUser.uid) return;
            
            var username = (userData.username || '').toLowerCase();
            var displayName = (userData.displayName || '').toLowerCase();
            
            // Search by username (without @) or display name
            if (username.includes(searchTerm) || displayName.includes(searchTerm)) {
                matches.push({ userId: userId, ...userData });
            }
        });
        
        if (matches.length === 0) {
            noResults.style.display = 'block';
            noResults.innerHTML = '<div class="empty-state-title">No users found</div><div class="empty-state-text">Try a different search</div>';
            return;
        }
        
        results.innerHTML = matches.map(function(user) {
            var avatarText = (user.displayName || user.username || '?').charAt(0).toUpperCase();
            var avatarHTML = user.avatarURL ? 
                '<img src="' + user.avatarURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : 
                avatarText;
            
            return `
                <div class="card" style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:14px;" onclick="openUserProfile('${user.userId}')">
                    <div class="avatar">${avatarHTML}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;">${user.displayName || 'Unknown'}</div>
                        <div style="font-size:12px;color:var(--text-muted);">@${user.username || 'user'}</div>
                    </div>
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation();sendFriendRequest('${user.userId}')">ADD</button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('User search error:', error);
        results.innerHTML = '<p style="color:var(--danger);text-align:center;">Search failed. Try again.</p>';
    }
}
