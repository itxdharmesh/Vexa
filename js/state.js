// Central state management for VEXA
class AppState {
    constructor() {
        this.user = null;
        this.userData = null;
        this.progress = null;
        this.streak = null;
        this.listeners = [];
        this.initialized = false;
    }

    init() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(async (user) => {
                this.user = user;
                if (user) {
                    await this.loadUserData();
                    this.initialized = true;
                    this.notifyListeners();
                }
                resolve(user);
            });
        });
    }

    async loadUserData() {
        try {
            const [userSnapshot, progressSnapshot, streakSnapshot] = await Promise.all([
                database.ref('users/' + this.user.uid).once('value'),
                database.ref('progress/' + this.user.uid).once('value'),
                database.ref('streaks/' + this.user.uid).once('value')
            ]);

            this.userData = userSnapshot.val() || {};
            this.progress = progressSnapshot.val() || { coins: 0, xp: 0, level: 1 };
            this.streak = streakSnapshot.val() || { currentStreak: 0, bestStreak: 0 };
        } catch (error) {
            console.error('State load error:', error);
            this.userData = {};
            this.progress = { coins: 0, xp: 0, level: 1 };
            this.streak = { currentStreak: 0, bestStreak: 0 };
        }
    }

    async refreshProgress() {
        if (!this.user) return;
        try {
            const snapshot = await database.ref('progress/' + this.user.uid).once('value');
            this.progress = snapshot.val() || { coins: 0, xp: 0, level: 1 };
            this.notifyListeners();
        } catch (error) {
            console.error('Progress refresh error:', error);
        }
    }

    async updateProgress(updates) {
        if (!this.user) return;
        try {
            await database.ref('progress/' + this.user.uid).update(updates);
            await this.refreshProgress();
        } catch (error) {
            console.error('Progress update error:', error);
        }
    }

    async addCoins(amount) {
        if (!this.user) return;
        const newCoins = (this.progress.coins || 0) + amount;
        await this.updateProgress({ coins: newCoins });
    }

    async addXP(amount) {
        if (!this.user) return;
        const newXP = (this.progress.xp || 0) + amount;
        await this.updateProgress({ xp: newXP });
    }

    getLevelInfo() {
        return Utils.calculateLevel(this.progress.xp || 0);
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener(this));
    }
}

window.AppState = AppState;
window.appState = new AppState();
