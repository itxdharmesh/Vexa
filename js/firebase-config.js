// Firebase configuration for VEXA
const firebaseConfig = {
  apiKey: "AIzaSyBl2r-zrWw9QQ356gQtTRsKpyFim-L4-9o",
  authDomain: "vexa-d1f6f.firebaseapp.com",
  projectId: "vexa-d1f6f",
  storageBucket: "vexa-d1f6f.firebasestorage.app",
  messagingSenderId: "370839637614",
  appId: "1:370839637614:web:aaec258d27d7899bfbe07f",
  measurementId: "G-ZLE30PTXWH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Export for use
window.auth = auth;
window.database = database;
window.storage = storage;
