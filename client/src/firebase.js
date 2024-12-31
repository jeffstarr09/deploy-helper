import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAzZC1pfuzhz4UukgHpdaRn9FDQ121sTWw",
  authDomain: "deploy-jstarr.firebaseapp.com",
  databaseURL: "https://deploy-jstarr-default-rtdb.firebaseio.com",
  projectId: "deploy-jstarr",
  storageBucket: "deploy-jstarr.appspot.com",
  messagingSenderId: "18328278841",
  appId: "1:18328278841:web:3cbe4c8d2cb9fd792fbae8"
};

// Initialize Firebase - export named AND default
const firebaseApp = initializeApp(firebaseConfig);

export const app = firebaseApp;
export const database = getDatabase(firebaseApp);
export const functions = getFunctions(firebaseApp);

export default firebaseApp;