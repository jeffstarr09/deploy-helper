import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAzZC1pfuzhz4UukgHpdaRn9FDQ121sTWw",
  authDomain: "deploy-jstarr.firebaseapp.com",
  projectId: "deploy-jstarr",
  storageBucket: "deploy-jstarr.firebasestorage.app",
  messagingSenderId: "18328278841",
  appId: "1:18328278841:web:3cbe4c8d2cb9fd792fbae8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;