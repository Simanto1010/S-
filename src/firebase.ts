import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, updateProfile, Auth
} from 'firebase/auth';
import { 
  initializeFirestore, doc, getDoc, setDoc, collection, query, where, 
  onSnapshot, serverTimestamp, getDocFromServer, updateDoc,
  deleteDoc, addDoc, getDocs, orderBy, limit, Firestore
} from 'firebase/firestore';
import { toast } from 'sonner';
import firebaseConfig from '../firebase-applet-config.json';

console.log('[Firebase] Initializing Core Services...');

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let missingFields: string[] = [];

try {
  // Validate Firebase configuration
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
  missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

  if (missingFields.length > 0) {
    console.warn(`[Firebase] Configuration incomplete: ${missingFields.join(', ')}`);
  }

  app = initializeApp(firebaseConfig);
  
  // Configure Firestore with long polling to prevent idle stream timeouts in the iframe environment
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  }, firebaseConfig.firestoreDatabaseId);

  auth = getAuth(app);
  console.log('[Firebase] Core Services Initialized');
} catch (error) {
  console.error('[Firebase] Initialization Failed:', error);
  // Provide dummy objects to prevent top-level crashes
  // These will fail when used, but won't stop the app from mounting
  app = {} as any;
  db = {} as any;
  auth = {
    onAuthStateChanged: (cb: any) => {
      console.warn('[Firebase] Auth in Safe Mode - No user session available');
      return () => {};
    }
  } as any;
}

export { app, db, auth };
export const googleProvider = new GoogleAuthProvider();

// Fallback for development/testing if auth fails or is not configured
export const isAuthConfigured = missingFields.length === 0;

export { 
  doc, getDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp, 
  signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, updateProfile, updateDoc, deleteDoc, addDoc, getDocs, orderBy, limit
};

// Connection test
async function testConnection() {
  if (!isAuthConfigured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection Verified');
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("[Firebase] Connection Error: Client is offline or config invalid");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
