import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Helper for Sign In with Google
export async function signIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      throw error;
    }
    console.error("Error signing in with Google", error);
    throw error;
  }
}

// Helper for Email/Password Sign Up
export async function signUpWithEmail(email: string, pass: string, name: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(result.user, { displayName: name });
    // Initialize user profile in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      displayName: name,
      email: email,
      ownerId: result.user.uid,
      createdAt: new Date().toISOString()
    });
    return result.user;
  } catch (error) {
    console.error("Error signing up with email", error);
    throw error;
  }
}

// Helper for Email/Password Sign In
export async function signInWithEmail(email: string, pass: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Error signing in with email", error);
    throw error;
  }
}

// Helper for Sign Out
export async function signOutUser() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out", error);
  }
}

export type { User };
