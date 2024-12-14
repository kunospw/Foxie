// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDUP5l-8g8i0L1zdrC1rILzYHPaF8s9HKs",
  authDomain: "foxie-d3d87.firebaseapp.com",
  projectId: "foxie-d3d87",
  storageBucket: "foxie-d3d87.firebasestorage.app",
  messagingSenderId: "421967066776",
  appId: "1:421967066776:web:e30488b9979eaf84f302ed",
  measurementId: "G-Q6JCTBX2NB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const firestore = getFirestore(app);
