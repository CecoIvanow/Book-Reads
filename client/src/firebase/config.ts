import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
// This API is made public in order for the firebase image upload to function properly
// It will be regenerated and hidden after Softuni's React.js project defence 

const firebaseConfig = {
    apiKey: "AIzaSyCfbfqmTZJnc9SMyYgx02j9l-i9c2KkQ3E",
    authDomain: "bookreads-58b80.firebaseapp.com",
    projectId: "bookreads-58b80",
    storageBucket: "bookreads-58b80.firebasestorage.app",
    messagingSenderId: "404148481452",
    appId: "1:404148481452:web:d395e5b1ffba05586a1e09"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);