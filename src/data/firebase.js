// Replace ALL values below with your Firebase project config
// Firebase Console → Project Settings → Your apps → Web app
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'
const firebaseConfig = {
  apiKey: "AIzaSyBko0SxVvrbAzaPURckRI--ptrsLuhAK10",
  authDomain: "yef-website-f45b2.firebaseapp.com",
  projectId: "yef-website-f45b2",
  storageBucket: "yef-website-f45b2.firebasestorage.app",
  messagingSenderId: "917119434377",
  appId: "1:917119434377:web:b110f78777b44c86069058"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'us-central1')

export default app