import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA1jIMxkcA1TOCaiN55-ZLjbO7MK73kHKg",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bondly-9ec57.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bondly-9ec57",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bondly-9ec57.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "417480213097",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:417480213097:web:30be76a0a9fef3ac7598f8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
