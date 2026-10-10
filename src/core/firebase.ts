// src/core/firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Persistence } from "firebase/auth";
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
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// Exportaciones nombradas requeridas por la aplicación
export const db = getFirestore(app);

/**
 * `getReactNativePersistence` only ships in the React Native build of the SDK
 * (the `react-native` export condition of `@firebase/auth`), so TypeScript — which
 * resolves the web typings — cannot see it. It is read off the namespace instead.
 */
const getReactNativePersistence = (FirebaseAuth as unknown as {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
}).getReactNativePersistence;

/**
 * `getAuth` defaults to in-memory persistence on React Native, so the session
 * is lost on every reload and the user is bounced back to the login screen.
 * `initializeAuth` with AsyncStorage keeps the user signed in between restarts.
 *
 * It throws when auth was already initialized (e.g. a Fast Refresh), hence the
 * guard that falls back to the default instance.
 */
function createAuth() {
  if (!isFirstInit || !getReactNativePersistence) return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

export default app;
