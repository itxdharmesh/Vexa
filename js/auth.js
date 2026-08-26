// Authentication handling for VEXA

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
    }

    init() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.authStateListeners.forEach(listener => listener(user));
            
            if (user) {
                this.updateUserPresence(true);
            }
        });
    }

    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
    }

    async signUp(username, displayName, email, password) {
        try {
            // Check username uniqueness
            const usernameRef = database.ref(`usernames/${username.toLowerCase()}`);
            const snapshot = await usernameRef.once('value');
            
            if (snapshot.exists()) {
                throw new Error('Username already taken');
            }
            
            // Create user account
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update display name
            await user.updateProfile({ displayName });
            
            // Store user data
            await database.ref(`users/${user.uid}`).set({
                username,
                displayName,
                email,
                createdAt: Date.now(),
                avatarColor: this.generateAvatarColor()
            });
            
            // Reserve username
            await usernameRef.set(user.uid);
            
            // Initialize user progress
            await database.ref(`usersProgress/${user.uid}`).set({
                totalXP: 0,
                level: 1,
                coins: 100, // Starting bonus
                createdAt: Date.now()
            });
            
            // Initialize streak
            await database.ref(`streaks/${user.uid}`).set({
                currentStreak: 1,
                bestStreak: 1,
                lastActiveAt: Date.now()
            });
            
            return user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw this.handleAuthError(error);
        }
    }

    async login(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            throw this.handleAuthError(error);
        }
    }

    async loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            // Check if user exists in database
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            
            if (!userSnapshot.exists()) {
                const username = this.generateUsernameFromEmail(user.email);
                await database.ref(`users/${user.uid}`).set({
                    username,
                    displayName: user.displayName,
                    email: user.email,
                    createdAt: Date.now(),
                    avatarColor: this.generateAvatarColor()
                });
                
                await database.ref(`usernames/${username.toLowerCase()}`).set(user.uid);
                await database.ref(`usersProgress/${user.uid}`).set({
                    totalXP: 0,
                    level: 1,
                    coins: 100,
                    createdAt: Date.now()
                });
                
                await database.ref(`streaks/${user.uid}`).set({
                    currentStreak: 1,
                    bestStreak: 1,
                    lastActiveAt: Date.now()
                });
            }
            
            return user;
        } catch (error) {
            console.error('Google login error:', error);
            throw this.handleAuthError(error);
        }
    }

    async logout() {
        try {
            if (this.currentUser) {
                await this.updateUserPresence(false);
            }
            await auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.handleAuthError(error);
        }
    }

    async updateUserPresence(online) {
        if (!this.currentUser) return;
        
        const presenceRef = database.ref(`presence/${this.currentUser.uid}`);
        
        if (online) {
            await presenceRef.set({
                online: true,
                lastSeen: Date.now()
            });
            
            presenceRef.onDisconnect().set({
                online: false,
                lastSeen: Date.now()
            });
        } else {
            await presenceRef.set({
                online: false,
                lastSeen: Date.now()
            });
        }
    }

    generateAvatarColor() {
        const colors = [
            'linear-gradient(135deg, #6C3CE1, #00D4FF)',
            'linear-gradient(135deg, #f59e0b, #ef4444)',
            'linear-gradient(135deg, #10b981, #00D4FF)',
            'linear-gradient(135deg, #ec4899, #6C3CE1)',
            'linear-gradient(135deg, #06b6d4, #00D4FF)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    generateUsernameFromEmail(email) {
        const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        return base + Math.floor(Math.random() * 1000);
    }

    handleAuthError(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/weak-password': 'Password is too weak',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/popup-closed-by-user': 'Sign-in popup was closed'
        };
        
        return new Error(errorMessages[error.code] || 'Authentication failed. Please try again.');
    }

    requireAuth() {
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
}

const authManager = new AuthManager();
window.authManager = authManager;
