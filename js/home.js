let currentUser = null;
let userData = null;
let progressData = null;
let streakData = null;
let dailyRewardData = null;
let gamesData = [];

auth.onAuthStateChanged(async function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    
    currentUser = user;
    
    try {
        // Load all data in parallel
        var [userSnapshot, progressSnapshot, streakSnapshot, rewardSnapshot] = await Promise.all([
            database.ref('users/' + user.uid).once('value'),
            database.ref('progress/' + user.uid).once('value'),
            database.ref('streaks/' + user.uid).once('value'),
            database.ref('dailyRewards/' + user.uid).once('value')
        ]);
        
        userData = userSnapshot.val() || {};
        progressData = progressSnapshot.val() || { coins: 0, xp: 0, level: 1 };
        streakData = streakSnapshot.val() || { currentStreak: 0, bestStreak: 0 };
        dailyRewardData = rewardSnapshot.val() || null;
        
        renderUserInfo();
        renderStats();
        renderDailyReward();
        loadGames();
        
        // Real-time progress updates
        database.ref('progress/' + user.uid).on('value', function(snapshot) {
            progressData = snapshot.val() || { coins: 0, xp: 0, level: 1 };
            renderStats();
        });
        
        // Real-time streak updates
        database.ref('streaks/' + user.uid).on('value', function(snapshot) {
            streakData = snapshot.val() || { currentStreak: 0, bestStreak: 0 };
            renderStats();
        });
        
    } catch (error) {
        console.error('Home load error:', error);
        document.getElementById('home-display-name').textContent = 'Error loading';
        document.getElementById('home-username').textContent = '@error';
        document.getElementById('home-coins').textContent = '--';
        document.getElementById('home-xp').textContent = '--';
        document.getElementById('home-level').textContent = '--';
        document.getElementById('home-streak').textContent = '--';
        
        document.getElementById('daily-reward-content').innerHTML = `
            <p style="color:var(--danger);font-size:13px;">Couldn't load data</p>
            <button class="btn btn-secondary btn-small" onclick="location.reload()">RETRY</button>
        `;
    }
});

function renderUserInfo() {
    var avatarText = (userData.displayName || '?').charAt(0).toUpperCase();
    var avatarHTML = userData.avatarURL ? 
        '<img src="' + userData.avatarURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : 
        avatarText;
    
    document.getElementById('home-avatar').innerHTML = avatarHTML;
    document.getElementById('home-display-name').textContent = userData.displayName || 'User';
    document.getElementById('home-username').textContent = '@' + (userData.username || 'user');
}

function renderStats() {
    var levelInfo = Utils.calculateLevel(progressData.xp || 0);
    
    document.getElementById('home-coins').textContent = Utils.formatNumber(progressData.coins || 0);
    document.getElementById('home-xp').textContent = Utils.formatNumber(progressData.xp || 0);
    document.getElementById('home-level').textContent = levelInfo.level;
    document.getElementById('home-streak').textContent = streakData.currentStreak || 0;
}

function renderDailyReward() {
    var content = document.getElementById('daily-reward-content');
    if (!content) return;
    
    var now = Date.now();
    
    if (dailyRewardData && dailyRewardData.lastClaimAt) {
        var hoursSinceClaim = (now - dailyRewardData.lastClaimAt) / (1000 * 60 * 60);
        if (hoursSinceClaim < 24) {
            content.innerHTML = `
                <p style="color:var(--success);font-size:14px;">✓ Claimed today</p>
                <p style="color:var(--text-muted);font-size:12px;">Come back tomorrow!</p>
            `;
            return;
        }
    }
    
    var rewardDay = dailyRewardData ? dailyRewardData.rewardDay : 1;
    var rewards = [100, 150, 200, 250, 300, 400, 500];
    var rewardAmount = rewards[(rewardDay - 1) % rewards.length];
    
    content.innerHTML = `
        <p style="font-size:14px;color:var(--text-secondary);">DAY ${rewardDay}</p>
        <p style="font-size:24px;font-weight:700;color:var(--accent-blue);margin:8px 0;">+${rewardAmount} 🪙</p>
        <button class="btn btn-primary" onclick="claimDailyReward(${rewardDay}, ${rewardAmount})" style="width:100%;">CLAIM REWARD</button>
    `;
}

async function claimDailyReward(rewardDay, rewardAmount) {
    try {
        await database.ref('dailyRewards/' + currentUser.uid).set({
            rewardDay: rewardDay + 1,
            lastClaimAt: Date.now()
        });
        
        var newCoins = (progressData.coins || 0) + rewardAmount;
        await database.ref('progress/' + currentUser.uid).update({ coins: newCoins });
        
        dailyRewardData = { rewardDay: rewardDay + 1, lastClaimAt: Date.now() };
        progressData.coins = newCoins;
        
        renderDailyReward();
        renderStats();
        
        Utils.showToast('Claimed ' + rewardAmount + ' coins! 🎉', 'success');
    } catch (error) {
        console.error('Claim error:', error);
        Utils.showToast('Failed to claim reward', 'error');
    }
}

async function loadGames() {
    try {
        var response = await fetch('data/games.json');
        gamesData = await response.json();
        renderFeaturedGames();
    } catch (error) {
        console.error('Games load error:', error);
    }
}

function renderFeaturedGames() {
    var container = document.getElementById('featured-games');
    if (!container || !gamesData.length) return;
    
    var freeGames = gamesData.filter(function(g) { return g.type === 'free'; });
    var featured = freeGames.slice(0, 4);
    
    container.innerHTML = featured.map(function(game) {
        return `
            <a href="games/${game.id}.html" style="text-decoration:none;color:inherit;">
                <div class="stat-card" style="text-align:center;padding:16px;cursor:pointer;">
                    <div style="font-size:36px;">${game.icon}</div>
                    <div style="font-weight:600;font-size:13px;margin-top:8px;">${game.name}</div>
                    <button class="btn btn-primary btn-small" style="width:100%;margin-top:8px;">PLAY</button>
                </div>
            </a>
        `;
    }).join('');
}

function playRandomGame() {
    if (!gamesData.length) {
        window.location.href = 'games.html';
        return;
    }
    
    var freeGames = gamesData.filter(function(g) { return g.type === 'free'; });
    if (freeGames.length === 0) {
        window.location.href = 'games.html';
        return;
    }
    
    var randomGame = freeGames[Math.floor(Math.random() * freeGames.length)];
    window.location.href = 'games/' + randomGame.id + '.html';
}

function goToProfile() {
    window.location.href = 'profile.html';
}
