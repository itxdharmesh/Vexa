// Profile page logic for VEXA

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.userProgress = null;
        this.streakData = null;
        this.achievementsData = [];
        this.userAchievements = {};
        this.gameStats = {};
    }

    async init() {
        authManager.init();
        
        authManager.onAuthStateChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = user;
            await this.loadUserData();
            await this.loadAchievements();
            await this.loadGameStats();
            this.renderProfile();
        });
    }

    async loadUserData() {
        const userSnapshot = await database.ref(`users/${this.currentUser.uid}`).once('value');
        this.userData = userSnapshot.val();
        
        const progressSnapshot = await database.ref(`usersProgress/${this.currentUser.uid}`).once('value');
        this.userProgress = progressSnapshot.val();
        
        const streakSnapshot = await database.ref(`streaks/${this.currentUser.uid}`).once('value');
        this.streakData = streakSnapshot.val();
    }

    async loadAchievements() {
        const response = await fetch('data/achievements.json');
        this.achievementsData = await response.json();
        
        const achievementsSnapshot = await database.ref(`achievements/${this.currentUser.uid}`).once('value');
        this.userAchievements = achievementsSnapshot.val() || {};
    }

    async loadGameStats() {
        const statsSnapshot = await database.ref(`gameStats/${this.currentUser.uid}`).once('value');
        this.gameStats = statsSnapshot.val() || {};
    }

    renderProfile() {
        const levelInfo = ChronoUtils.calculateLevel(this.userProgress.totalXP);
        
        document.getElementById('profile-avatar').textContent = this.userData.displayName ? this.userData.displayName[0].toUpperCase() : 'V';
        document.getElementById('profile-avatar').style.background = this.userData.avatarColor || 'linear-gradient(135deg, #6C3CE1, #00D4FF)';
        
        document.getElementById('profile-name').textContent = this.userData.displayName;
        document.getElementById('profile-username').textContent = `@${this.userData.username}`;
        document.getElementById('profile-bio').textContent = this.userData.bio || 'No bio yet';
        
        document.getElementById('profile-level').textContent = levelInfo.level;
        document.getElementById('profile-xp').textContent = ChronoUtils.formatNumber(this.userProgress.totalXP);
        document.getElementById('profile-coins').textContent = ChronoUtils.formatNumber(this.userProgress.coins);
        document.getElementById('profile-streak').textContent = this.streakData.currentStreak;
        
        this.renderAchievements();
        this.renderGameStats();
    }

    renderAchievements() {
        const grid = document.getElementById('achievements-grid');
        
        grid.innerHTML = this.achievementsData.map(achievement => {
            const userProgress = this.userAchievements[achievement.id];
            const progress = userProgress ? userProgress.progress : 0;
            const unlocked = progress >= achievement.target;
            
            return `
                <div class="achievement-item ${unlocked ? 'unlocked' : ''}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-progress">${progress}/${achievement.target}</div>
                </div>
            `;
        }).join('');
    }

    renderGameStats() {
        const list = document.getElementById('game-stats-list');
        
        if (Object.keys(this.gameStats).length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No games played yet</p>';
            return;
        }
        
        list.innerHTML = Object.entries(this.gameStats).map(([gameId, stats]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--vexa-glass-border);">
                <div>
                    <div style="font-weight: 600; font-family: 'Rajdhani', sans-serif;">${this.formatGameName(gameId)}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${stats.gamesPlayed || 0} games played</div>
                </div>
                <div style="text-align: right;">
                    <div style="color: var(--vexa-secondary); font-weight: 700;">High Score: ${stats.highScore || 0}</div>
                </div>
            </div>
        `).join('');
    }

    formatGameName(gameId) {
        return gameId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
}

const profileManager = new ProfileManager();
window.profileManager = profileManager;
document.addEventListener('DOMContentLoaded', () => profileManager.init());2
