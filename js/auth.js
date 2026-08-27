// Updated Authentication handling for VEXA

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

    // Username validation function
    validateUsername(username) {
        // Check if username is empty
        if (!username || username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }
        
        // Check if username is too long
        if (username.length > 20) {
            throw new Error('Username must be less than 20 characters');
        }
        
        // Check if username contains only allowed characters
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            throw new Error('Username can only contain letters, numbers, dots, and underscores');
        }
        
        // Check if username starts or ends with dot/underscore
        if (username.startsWith('.') || username.startsWith('_') || 
            username.endsWith('.') || username.endsWith('_')) {
            throw new Error('Username cannot start or end with dot or underscore');
        }
        
        // Check for consecutive dots/underscores
        if (username.includes('..') || username.includes('__') || 
            username.includes('._') || username.includes('_.')) {
            throw new Error('Username cannot have consecutive dots or underscores');
        }
        
        return true;
    }

    async signUp(username, displayName, email, password) {
        try {
            // Validate username
            this.validateUsername(username);
            
            // Check username uniqueness
            const usernameRef = database.ref(`usernames/${username.toLowerCase()}`);
            const snapshot = await usernameRef.once('value');
            
            if (snapshot.exists()) {
                throw new Error('Username already taken');
            }
            
            // Create user account
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Send email verification
            await user.sendEmailVerification();
            
            // Update display name
            await user.updateProfile({ displayName });
            
            // Store user data
            await database.ref(`users/${user.uid}`).set({
                username: username.toLowerCase(),
                displayName,
                email,
                emailVerified: false,
                createdAt: Date.now(),
                avatarColor: this.generateAvatarColor()
            });
            
            // Reserve username
            await usernameRef.set(user.uid);
            
            // Initialize user progress
            await database.ref(`usersProgress/${user.uid}`).set({
                totalXP: 0,
                level: 1,
                coins: 100,
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
            const user = userCredential.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                throw new Error('Please verify your email before logging in');
            }
            
            return user;
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
                    emailVerified: true,
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

    async resendVerificationEmail() {
        try {
            if (this.currentUser) {
                await this.currentUser.sendEmailVerification();
                return true;
            }
            throw new Error('No user logged in');
        } catch (error) {
            console.error('Resend verification error:', error);
            throw error;
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
        const base = email.split('@')[0].replace(/[^a-zA-Z0-9._]/g, '');
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
        
        return new Error(errorMessages[error.code] || error.message || 'Authentication failed. Please try again.');
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
window.authManager = authManager;2
