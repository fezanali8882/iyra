import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  doc,
  setDoc,
  limit,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface ChatMessage {
  id: string;
  sender: "user" | "iyra";
  text: string;
  timestamp?: any;
}

export async function saveMessage(userId: string, sender: "user" | "iyra", text: string) {
  const path = `users/${userId}/messages`;
  try {
    await addDoc(collection(db, path), {
      sender,
      text,
      ownerId: userId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadHistory(userId: string): Promise<ChatMessage[]> {
  const path = `users/${userId}/messages`;
  try {
    const q = query(
      collection(db, path),
      where("ownerId", "==", userId),
      orderBy("timestamp", "asc"),
      limit(100)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function clearUserHistory(userId: string) {
  const path = `users/${userId}/messages`;
  try {
     const q = query(collection(db, path), where("ownerId", "==", userId));
     const querySnapshot = await getDocs(q);
     // Note: In production apps, this should be done via cloud function for large collections
     const deletePromises = querySnapshot.docs.map(d => setDoc(d.ref, { deleted: true }, { merge: true }));
     await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
