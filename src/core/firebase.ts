// src/core/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlM1Mdw6WtGO64XFJWyvsaPbLtGi9BL9A",
  authDomain: "smartalarm-416be.firebaseapp.com",
  projectId: "smartalarm-416be",
  storageBucket: "smartalarm-416be.firebasestorage.app",
  messagingSenderId: "411033106470",
  appId: "1:411033106470:web:709ba7943068d053b1cee7"
};

// Evita inicializaciones duplicadas en Expo / React Native
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exportaciones nombradas requeridas por la aplicación
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;