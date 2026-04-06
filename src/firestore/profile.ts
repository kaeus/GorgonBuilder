import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface UserProfile {
  uid: string;
  username: string;
  updatedAt: number;
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, 'uid'>) };
}

export async function setUsername(uid: string, username: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { username: username.trim(), updatedAt: Date.now() },
    { merge: true },
  );
}
