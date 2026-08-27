let currentUser = null;
let dailyRewardData = null;
let gamesData = [];

// Initialize with auth check
auth.onAuthStateChanged(async function(user) {
    if (!user) {
        window.location.replace('login.html');
        return;
    }
    
    currentUser = user;
    
    // Subscribe to state changes
    appState.subscribe(function(state) {
        if (state.user) {
            renderStats(state);
        }
    });
    
    // Initialize state
    await appState.init();
    
    // Load other data
    await loadDailyReward();
    await loadGames();
    
    // Render
    renderStats(appState);
    renderDailyReward();
    renderFeaturedGames();
    
    // Set up real-time progress listener
    database.ref('progress/' + user.uid).on('value', function(snapshot) {
        appState.progress = snapshot.val() || { coins: 0, xp: 0, level: 1 };
        renderStats(appState);
    });
});

function renderStats(state) {
    var progress = state.progress || { coins: 0, xp: 0, level: 1 };
    var streak = state.streak || { currentStreak: 0 };
    var levelInfo = Utils.calculateLevel(progress.xp || 0);
    
    document.getElementById('home-coins').textContent = Utils.formatNumber(progress.coins || 0);
    document.getElementById('home-xp').textContent = Utils.formatNumber(progress.xp || 0);
    document.getElementById('home-level').textContent = levelInfo.level;
    document.getElementById('home-streak').textContent = streak.currentStreak || 0;
}

async function loadDailyReward() {
    try {
        var snapshot = await database.ref('dailyRewards/' + currentUser.uid).once('value');
        dailyRewardData = snapshot.val() || null;
        renderDailyReward();
    } catch (error) {
        console.error('Daily reward load error:', error);
        document.getElementById('daily-reward-content').innerHTML = `
            <p style="color:var(--danger);font-size:13px;">Couldn't load reward</p>
            <button class="btn btn-secondary btn-small" onclick="loadDailyReward()" style="margin-top:8px;">RETRY</button>
        `;
    }
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
        <p style="font-size:13px;color:var(--text-secondary);">DAY ${rewardDay}</p>
        <p style="font-size:24px;font-weight:700;color:var(--accent-blue);margin:8px 0;">+${rewardAmount} 🪙</p>
        <button class="btn btn-primary btn-small" onclick="claimDailyReward(${rewardDay}, ${rewardAmount})">CLAIM REWARD</button>
    `;
}

async function claimDailyReward(rewardDay, rewardAmount) {
    try {
        await database.ref('dailyRewards/' + currentUser.uid).set({
            rewardDay: rewardDay + 1,
            lastClaimAt: Date.now()
        });
        
        await appState.addCoins(rewardAmount);
        dailyRewardData = { rewardDay: rewardDay + 1, lastClaimAt: Date.now() };
        renderDailyReward();
        
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
                <div class="stat-card" style="text-align:center;padding:16px;">
                    <div style="font-size:32px;margin-bottom:8px;">${game.icon}</div>
                    <div style="font-weight:600;font-size:13px;">${game.name}</div>
                    <button class="btn btn-primary btn-small" style="width:100%;margin-top:8px;">PLAY</button>
                </div>
            </a>
        `;
    }).join('');
}

function playRound() {
    // Open a random free game
    if (!gamesData.length) {
        window.location.href = 'games.html';
        return;
    }
    
    var freeGames = gamesData.filter(function(g) { return g.type === 'free'; });
    var randomGame = freeGames[Math.floor(Math.random() * freeGames.length)];
    window.location.href = 'games/' + randomGame.id + '.html';
}
