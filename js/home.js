// Home page logic for VEXA

class HomeManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.userProgress = null;
        this.streakData = null;
        this.dailyRewardData = null;
        this.gamesData = [];
    }

    async init() {
        authManager.init();
        
        authManager.onAuthStateChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            // Check email verification
            if (!user.emailVerified) {
                ChronoUtils.showToast('Please verify your email to continue', 'warning');
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = user;
            await this.loadUserData();
            await this.loadGames();
            await this.updateStreak();
            await this.loadAchievementCount();
            this.renderHome();
        });
    }

    async loadUserData() {
        try {
            const userSnapshot = await database.ref(`users/${this.currentUser.uid}`).once('value');
            this.userData = userSnapshot.val();
            
            const progressSnapshot = await database.ref(`usersProgress/${this.currentUser.uid}`).once('value');
            this.userProgress = progressSnapshot.val();
            
            const streakSnapshot = await database.ref(`streaks/${this.currentUser.uid}`).once('value');
            this.streakData = streakSnapshot.val();
            
            const dailySnapshot = await database.ref(`dailyRewards/${this.currentUser.uid}`).once('value');
            this.dailyRewardData = dailySnapshot.val();
            
            // Update avatar
            const avatar = document.getElementById('user-avatar');
            avatar.textContent = this.userData.displayName ? this.userData.displayName[0].toUpperCase() : 'V';
            if (this.userData.avatarColor) {
                avatar.style.background = this.userData.avatarColor;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            ChronoUtils.showToast('Failed to load user data', 'error');
        }
    }

    async loadGames() {
        try {
            const response = await fetch('data/games.json');
            this.gamesData = await response.json();
        } catch (error) {
            console.error('Error loading games:', error);
        }
    }

    async updateStreak() {
        if (!this.streakData) return;
        
        const lastActive = this.streakData.lastActiveAt;
        const now = Date.now();
        const hoursSinceLastActive = (now - lastActive) / (1000 * 60 * 60);
        
        if (hoursSinceLastActive >= 24 && hoursSinceLastActive < 48) {
            this.streakData.currentStreak++;
            this.streakData.lastActiveAt = now;
            
            if (this.streakData.currentStreak > this.streakData.bestStreak) {
                this.streakData.bestStreak = this.streakData.currentStreak;
            }
            
            await database.ref(`streaks/${this.currentUser.uid}`).update({
                currentStreak: this.streakData.currentStreak,
                bestStreak: this.streakData.bestStreak,
                lastActiveAt: now
            });
            
            // Check streak achievement
            if (this.streakData.currentStreak === 7) {
                ChronoUtils.showToast('🔥 7 Day Streak Achieved!', 'success');
            }
        } else if (hoursSinceLastActive >= 48) {
            this.streakData.currentStreak = 1;
            this.streakData.lastActiveAt = now;
            
            await database.ref(`streaks/${this.currentUser.uid}`).update({
                currentStreak: 1,
                lastActiveAt: now
            });
        }
    }

    async loadAchievementCount() {
        try {
            const achievementsSnapshot = await database.ref(`achievements/${this.currentUser.uid}`).once('value');
            const achievements = achievementsSnapshot.val() || {};
            const unlockedCount = Object.values(achievements).filter(a => a.progress >= 1).length;
            document.getElementById('achievement-count').textContent = unlockedCount;
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    renderHome() {
        document.getElementById('welcome-text').textContent = `Welcome back, @${this.userData.username} 👋`;
        
        const levelInfo = ChronoUtils.calculateLevel(this.userProgress.totalXP);
        document.getElementById('level-info').textContent = `Level ${levelInfo.level} • 🔥 ${this.streakData.currentStreak} day streak`;
        
        document.getElementById('coin-balance').textContent = ChronoUtils.formatNumber(this.userProgress.coins);
        document.getElementById('xp-balance').textContent = ChronoUtils.formatNumber(this.userProgress.totalXP);
        document.getElementById('streak-count').textContent = this.streakData.currentStreak;
        
        document.getElementById('xp-progress').style.width = `${levelInfo.progress}%`;
        document.getElementById('xp-progress-text').textContent = `${levelInfo.currentLevelXP} / ${levelInfo.xpNeededForNext} XP`;
        
        this.renderDailyReward();
        this.renderFeaturedGames();
    }

    renderDailyReward() {
        const content = document.getElementById('daily-reward-content');
        const now = Date.now();
        
        if (this.dailyRewardData && this.dailyRewardData.lastClaimAt) {
            const hoursSinceClaim = (now - this.dailyRewardData.lastClaimAt) / (1000 * 60 * 60);
            
            if (hoursSinceClaim < 24) {
                content.innerHTML = `
                    <p style="color: var(--success); font-size: 18px;">✓ Reward claimed</p>
                    <p style="color: var(--text-muted);">Come back tomorrow.</p>
                `;
                return;
            }
        }
        
        const rewardDay = this.dailyRewardData ? this.dailyRewardData.rewardDay : 1;
        const rewards = [100, 150, 200, 250, 300, 400, 500];
        const rewardAmount = rewards[(rewardDay - 1) % rewards.length];
        
        content.innerHTML = `
            <p>Day ${rewardDay}</p>
            <p style="font-size: 24px; font-weight: bold;" class="vexa-title">+${rewardAmount} 🪙</p>
            <button class="btn btn-primary vexa-btn vexa-btn-primary" onclick="homeManager.claimDailyReward()">CLAIM</button>
        `;
    }

    async claimDailyReward() {
        const now = Date.now();
        const rewardDay = this.dailyRewardData ? this.dailyRewardData.rewardDay : 1;
        const rewards = [100, 150, 200, 250, 300, 400, 500];
        const rewardAmount = rewards[(rewardDay - 1) % rewards.length];
        
        try {
            await database.ref(`dailyRewards/${this.currentUser.uid}`).set({
                rewardDay: rewardDay + 1,
                lastClaimAt: now
            });
            
            await database.ref(`usersProgress/${this.currentUser.uid}`).update({
                coins: this.userProgress.coins + rewardAmount
            });
            
            this.userProgress.coins += rewardAmount;
            this.dailyRewardData = { rewardDay: rewardDay + 1, lastClaimAt: now };
            
            this.renderHome();
            ChronoUtils.showToast(`Claimed ${rewardAmount} coins! 🎉`, 'success');
        } catch (error) {
            console.error('Error claiming reward:', error);
            ChronoUtils.showToast('Failed to claim reward', 'error');
        }
    }

    renderFeaturedGames() {
        const container = document.getElementById('featured-games');
        const featured = this.gamesData.slice(0, 4);
        
        container.innerHTML = featured.map(game => `
            <a href="games/${game.id}.html" class="game-card vexa-card" style="text-align: center; padding: 16px; text-decoration: none; color: var(--text-primary);">
                <div class="game-icon" style="font-size: 40px;">${game.icon}</div>
                <div class="game-name vexa-heading" style="margin: 8px 0;">${game.name}</div>
                <div class="high-score" id="score-${game.id}" style="font-size: 12px; color: var(--accent-blue);">High Score: --</div>
            </a>
        `).join('');
        
        featured.forEach(game => {
            this.loadHighScore(game.id);
        });
    }

    async loadHighScore(gameId) {
        try {
            const scoreSnapshot = await database.ref(`gameStats/${this.currentUser.uid}/${gameId}/highScore`).once('value');
            const score = scoreSnapshot.val() || 0;
            const element = document.getElementById(`score-${gameId}`);
            if (element) {
                element.textContent = `High Score: ${score}`;
            }
        } catch (error) {
            console.error(`Error loading high score for ${gameId}:`, error);
        }
    }
}

function openNotifications() {
    ChronoUtils.showToast('Notifications coming soon!', 'info');
}

const homeManager = new HomeManager();
window.homeManager = homeManager;
document.addEventListener('DOMContentLoaded', () => homeManager.init());
