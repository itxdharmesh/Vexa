// Games Hub logic for VEXA

class GamesManager {
    constructor() {
        this.currentUser = null;
        this.gamesData = [];
    }

    async init() {
        authManager.init();
        
        authManager.onAuthStateChange(async (user) => {
            if (!user) {
                window.location.href = 'login.html';
                return;
            }
            
            this.currentUser = user;
            await this.loadGames();
            this.renderGames();
        });
    }

    async loadGames() {
        try {
            const response = await fetch('data/games.json');
            this.gamesData = await response.json();
        } catch (error) {
            console.error('Error loading games:', error);
            ChronoUtils.showToast('Failed to load games', 'error');
        }
    }

    renderGames() {
        const container = document.getElementById('games-grid');
        
        container.innerHTML = this.gamesData.map(game => `
            <a href="games/${game.id}.html" class="game-card">
                <div class="game-icon">${game.icon}</div>
                <div class="game-name">${game.name}</div>
                <div class="game-category">${game.category}</div>
                <div class="high-score" id="score-${game.id}">High Score: --</div>
                <button class="play-btn">PLAY</button>
            </a>
        `).join('');
        
        this.gamesData.forEach(game => {
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

function showMultiplayerComingSoon() {
    ChronoUtils.showToast('🚧 Multiplayer Coming Soon! Realtime battles under development.', 'info');
}

const gamesManager = new GamesManager();
window.gamesManager = gamesManager;
document.addEventListener('DOMContentLoaded', () => gamesManager.init());
