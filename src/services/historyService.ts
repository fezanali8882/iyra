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
  limit
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
      orderBy("timestamp", "asc"),
      limit(100) // Load last 100 messages for context
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
  // Firestore doesn't support easy bulk delete on client, 
  // but we can just stop showing them or delete them one by one if needed.
  // For now, let's just use the current way which is resetting the UI, 
  // and maybe later implement a "hidden" flag if we want soft delete.
  // Actually, standard is to let them clear.
  const path = `users/${userId}/messages`;
  try {
     const q = query(collection(db, path));
     const querySnapshot = await getDocs(q);
     // Note: In production apps, this should be done via cloud function for large collections
     const deletePromises = querySnapshot.docs.map(d => setDoc(d.ref, { deleted: true }, { merge: true }));
     await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
