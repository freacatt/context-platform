import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyApg083XFoxlffCA_ivKy12BH8aD2kgFwc",
  authDomain: "product-platform-c9bb9.firebaseapp.com",
  projectId: "product-platform-c9bb9",
  storageBucket: "product-platform-c9bb9.firebasestorage.app",
  messagingSenderId: "258380714726",
  appId: "1:258380714726:web:cc44b2afef98422305a127"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
