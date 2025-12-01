// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDytfwKBBo0GKAkMOCJURq62TN1KPWEWLU",
  authDomain: "rifa-con-firebase.firebaseapp.com",
  projectId: "rifa-con-firebase",
  storageBucket: "rifa-con-firebase.firebasestorage.app",
  messagingSenderId: "349264117196",
  appId: "1:349264117196:web:acca4717e4e2f7c721b169",
  measurementId: "G-RZ9YG8NGVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
