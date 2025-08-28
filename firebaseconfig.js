// firebase.js
import { initializeApp } from 'firebase/app';
import {
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 🔐 Replace this with your actual Firebase config object from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyArPyKUXu3wG83VRIl75-SKta4izehraJY",
  authDomain: "slawn-shinto.firebaseapp.com",
  projectId: "slawn-shinto",
  storageBucket: "slawn-shinto.appspot.com", // ❗ corrected: must be .appspot.com
  messagingSenderId: "835954209782",
  appId: "1:835954209782:web:7951b83c5832f39d0a8dd7"
};

// ✅ Initialize Firebase app
const app = initializeApp(firebaseConfig);

// ✅ Initialize Auth with persistent storage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// ✅ Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Export services
export { auth, db, storage };
