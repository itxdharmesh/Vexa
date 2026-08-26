// VEXA Flash Screen Logic

class FlashScreen {
    constructor() {
        this.loadingProgress = 0;
        this.loadingInterval = null;
        this.minimumDisplayTime = 3000; // 3 seconds
        this.startTime = Date.now();
        this.isAuthenticated = false;
    }

    init() {
        this.startLoading();
        this.checkAuthState();
    }

    startLoading() {
        const loadingTexts = [
            'INITIALIZING...',
            'LOADING ASSETS...',
            'CONNECTING...',
            'SYNCING DATA...',
            'PREPARING EXPERIENCE...'
        ];
        
        let textIndex = 0;
        
        this.loadingInterval = setInterval(() => {
            this.loadingProgress += Math.random() * 15 + 5;
            
            if (this.loadingProgress >= 100) {
                this.loadingProgress = 100;
                clearInterval(this.loadingInterval);
                setTimeout(() => this.navigateToApp(), 500);
            }
            
            document.getElementById('loading-progress').style.width = `${this.loadingProgress}%`;
            
            // Update loading text
            textIndex = Math.floor(this.loadingProgress / 20);
            if (textIndex < loadingTexts.length) {
                document.getElementById('loading-text').textContent = loadingTexts[textIndex];
            }
        }, 300);
    }

    checkAuthState() {
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged((user) => {
                this.isAuthenticated = !!user;
            });
        }
    }

    navigateToApp() {
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = Math.max(0, this.minimumDisplayTime - elapsedTime);
        
        setTimeout(() => {
            // Fade out flash screen
            const flashScreen = document.getElementById('flash-screen');
            flashScreen.style.transition = 'opacity 0.5s ease';
            flashScreen.style.opacity = '0';
            
            setTimeout(() => {
                if (this.isAuthenticated) {
                    window.location.href = 'home.html';
                } else {
                    window.location.href = 'login.html';
                }
            }, 500);
        }, remainingTime);
    }
}

// Initialize flash screen
const flashScreen = new FlashScreen();
document.addEventListener('DOMContentLoaded', () => flashScreen.init());
