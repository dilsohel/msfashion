import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, 
  getDocs, onSnapshot, getDocFromServer, writeBatch 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Operation types for standard error handling
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Initialize Firebase App first
let app;
let auth;
let db;
let googleProvider;
let initError = null;

try {
  if (!firebaseConfig || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is missing or invalid.');
  }

  const existingApps = getApps();
  app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);

  // 2. Initialize Firebase Auth
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // 3. Initialize Firestore with specific provisioned databaseId
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  initError = error;
  console.error('Firebase initialization failed:', error);
}

export { app, auth, db, googleProvider };

export async function loginWithGoogle() {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

// Test initial connection as required by skill
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Create the complete Firebase instance object
const firebaseInstance = {
  app,
  db,
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  loginWithGoogle,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  OperationType,
  handleFirestoreError,
  testConnection,
  ready: !initError && !!db,
  error: initError
};

// 4. Attach window.FIREBASE and window.__FIREBASE__ before any module accesses it
window.FIREBASE = firebaseInstance;
window.__FIREBASE__ = firebaseInstance;

// Dispatch event for any asynchronous listeners
window.dispatchEvent(new CustomEvent('firebase:ready', { detail: firebaseInstance }));

