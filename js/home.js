let currentUser = null;
let userData = null;
let progressData = null;
let streakData = null;
let dailyRewardData = null;

auth.onAuthStateChanged(async function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    currentUser = user;
    document.getElementById('user-email').textContent = user.email;
    
    await loadAllData();
    renderHome();
});

async function loadAllData() {
    try {
        var userSnapshot = await database.ref('users/' + currentUser.uid).once('value');
        userData = userSnapshot.val() || {};
        
        var progressSnapshot = await database.ref('progress/' + currentUser.uid).once('value');
        progressData = progressSnapshot.val() || { coins: 0, xp: 0, level: 1 };
        
        var streakSnapshot = await database.ref('streaks/' + currentUser.uid).once('value');
        streakData = streakSnapshot.val() || { currentStreak: 0, bestStreak: 0 };
        
        var rewardSnapshot = await database.ref('dailyRewards/' + currentUser.uid).once('value');
        dailyRewardData = rewardSnapshot.val() || null;
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderHome() {
    document.getElementById('welcome-text').textContent = 'Welcome back, @' + (userData.username || 'user') + ' 👋';
    
    document.getElementById('home-coins').textContent = Utils.formatNumber(progressData.coins);
    document.getElementById('home-xp').textContent = Utils.formatNumber(progressData.xp);
    
    var levelInfo = Utils.calculateLevel(progressData.xp);
    document.getElementById('home-level').textContent = levelInfo.level;
    document.getElementById('home-streak').textContent = streakData.currentStreak;
    
    renderDailyReward();
    renderFeaturedGames();
}

function renderDailyReward() {
    var content = document.getElementById('daily-reward-content');
    var now = Date.now();
    
    if (dailyRewardData && dailyRewardData.lastClaimAt) {
        var hoursSinceClaim = (now - dailyRewardData.lastClaimAt) / (1000 * 60 * 60);
        if (hoursSinceClaim < 24) {
            content.innerHTML = '<p style="color:var(--success);">✓ Claimed today</p><p style="color:var(--text-muted);font-size:13px;">Come back tomorrow!</p>';
            return;
        }
    }
    
    var rewardDay = dailyRewardData ? dailyRewardData.rewardDay : 1;
    var rewards = [100, 150, 200, 250, 300, 400, 500];
    var rewardAmount = rewards[(rewardDay - 1) % rewards.length];
    
    content.innerHTML = `
        <p style="font-size:14px;color:var(--text-secondary);">DAY ${rewardDay}</p>
        <p style="font-size:24px;font-weight:700;color:var(--accent-blue);margin:8px 0;">+${rewardAmount} 🪙</p>
        <button class="btn btn-primary" onclick="claimDailyReward()">CLAIM REWARD</button>
    `;
}

async function claimDailyReward() {
    if (!currentUser) return;
    
    var rewardDay = dailyRewardData ? dailyRewardData.rewardDay : 1;
    var rewards = [100, 150, 200, 250, 300, 400, 500];
    var rewardAmount = rewards[(rewardDay - 1) % rewards.length];
    
    try {
        await database.ref('dailyRewards/' + currentUser.uid).set({
            rewardDay: rewardDay + 1,
            lastClaimAt: Date.now()
        });
        
        await database.ref('progress/' + currentUser.uid).update({
            coins: (progressData.coins || 0) + rewardAmount
        });
        
        progressData.coins += rewardAmount;
        dailyRewardData = { rewardDay: rewardDay + 1, lastClaimAt: Date.now() };
        
        renderHome();
        Utils.showToast('Claimed ' + rewardAmount + ' coins! 🎉', 'success');
        
    } catch (error) {
        console.error('Claim error:', error);
        Utils.showToast('Failed to claim reward', 'error');
    }
}

async function renderFeaturedGames() {
    var container = document.getElementById('featured-games');
    
    try {
        var response = await fetch('data/games.json');
        var games = await response.json();
        var freeGames = games.filter(function(g) { return g.type === 'free'; });
        var featured = freeGames.slice(0, 4);
        
        container.innerHTML = featured.map(function(game) {
            return `
                <a href="games/${game.id}.html" style="text-decoration:none;color:inherit;">
                    <div class="stat-card" style="text-align:center;padding:16px;">
                        <div style="font-size:32px;margin-bottom:8px;">${game.icon}</div>
                        <div style="font-weight:600;font-size:13px;">${game.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin:4px 0;">${game.category}</div>
                        <button class="btn btn-primary btn-small" style="width:100%;margin-top:8px;">PLAY</button>
                    </div>
                </a>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading games:', error);
        container.innerHTML = '<p style="color:var(--text-muted);">Failed to load games</p>';
    }
}
