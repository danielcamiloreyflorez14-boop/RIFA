// Importar Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDytfwKBBo0GKAkMOCJURq62TN1KPWEWLU",
  authDomain: "rifa-con-firebase.firebaseapp.com",
  projectId: "rifa-con-firebase",
  storageBucket: "rifa-con-firebase.firebasestorage.app",
  messagingSenderId: "349264117196",
  appId: "1:349264117196:web:acca4717e4e2f7c721b169",
  measurementId: "G-RZ9YG8NGVF"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
