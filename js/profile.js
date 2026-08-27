auth.onAuthStateChanged(async function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    
    try {
        var userSnapshot = await database.ref('users/' + user.uid).once('value');
        var userData = userSnapshot.val() || {};
        
        var progressSnapshot = await database.ref('progress/' + user.uid).once('value');
        var progressData = progressSnapshot.val() || { coins: 0, xp: 0, level: 1 };
        
        var streakSnapshot = await database.ref('streaks/' + user.uid).once('value');
        var streakData = streakSnapshot.val() || { currentStreak: 0 };
        
        var friendsSnapshot = await database.ref('friends/' + user.uid).once('value');
        var friendsCount = friendsSnapshot.val() ? Object.keys(friendsSnapshot.val()).length : 0;
        
        var followersSnapshot = await database.ref('followers/' + user.uid).once('value');
        var followersCount = followersSnapshot.val() ? Object.keys(followersSnapshot.val()).length : 0;
        
        var followingSnapshot = await database.ref('following/' + user.uid).once('value');
        var followingCount = followingSnapshot.val() ? Object.keys(followingSnapshot.val()).length : 0;
        
        var gameStatsSnapshot = await database.ref('gameStats/' + user.uid).once('value');
        var gameStats = gameStatsSnapshot.val() || {};
        var totalGames = Object.values(gameStats).reduce(function(sum, game) {
            return sum + (game.gamesPlayed || 0);
        }, 0);
        
        var levelInfo = Utils.calculateLevel(progressData.xp);
        
        var avatarText = (userData.displayName || '?').charAt(0).toUpperCase();
        var avatarHTML = userData.avatarURL ? 
            '<img src="' + userData.avatarURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : 
            avatarText;
        
        document.getElementById('profile-avatar').innerHTML = avatarHTML;
        document.getElementById('profile-name').textContent = userData.displayName || 'User';
        document.getElementById('profile-username').textContent = '@' + (userData.username || 'user');
        document.getElementById('profile-bio').textContent = userData.bio || 'No bio yet';
        
        document.getElementById('profile-friends').textContent = friendsCount;
        document.getElementById('profile-followers').textContent = followersCount;
        document.getElementById('profile-following').textContent = followingCount;
        document.getElementById('profile-level').textContent = levelInfo.level;
        document.getElementById('profile-streak').textContent = streakData.currentStreak;
        document.getElementById('profile-games').textContent = totalGames;
        
        loadAchievements(user.uid);
        loadGameStats(user.uid);
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
});

async function loadAchievements(userId) {
    var container = document.getElementById('achievements-list');
    
    try {
        var achievementsSnapshot = await database.ref('achievements/' + userId).once('value');
        var achievements = achievementsSnapshot.val() || {};
        
        var keys = Object.keys(achievements);
        
        if (keys.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;">No achievements yet. Play games to earn them!</p>';
            return;
        }
        
        container.innerHTML = keys.map(function(achievementId) {
            var achievement = achievements[achievementId];
            var unlocked = achievement.unlocked ? '✅' : '🔒';
            return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="font-size:24px;">${unlocked}</span>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:13px;">${achievementId.replace(/_/g, ' ')}</div>
                        <div style="font-size:11px;color:var(--text-muted);">Progress: ${achievement.progress || 0}</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

async function loadGameStats(userId) {
    var container = document.getElementById('game-stats');
    
    try {
        var statsSnapshot = await database.ref('gameStats/' + userId).once('value');
        var stats = statsSnapshot.val() || {};
        
        var gameIds = Object.keys(stats);
        
        if (gameIds.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;">No games played yet</p>';
            return;
        }
        
        container.innerHTML = gameIds.map(function(gameId) {
            var game = stats[gameId];
            return `
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
                    <span style="font-weight:600;font-size:13px;">${gameId.replace(/-/g, ' ')}</span>
                    <span style="font-size:13px;color:var(--accent-blue);">High Score: ${game.highScore || 0}</span>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading game stats:', error);
    }
}
