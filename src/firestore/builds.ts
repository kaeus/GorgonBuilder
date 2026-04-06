import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Build } from '../domain/build';
import { buildSearchSkills } from '../domain/build';

const COL = 'builds';

/** Firestore rejects any field whose value is `undefined`. Strip them recursively. */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as unknown as T;
  }
  return value;
}

export async function createBuild(ownerUid: string, build: Build): Promise<string> {
  const { id: _ignored, ...rest } = build;
  const payload = stripUndefined({
    ...rest,
    ownerUid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    searchSkills: buildSearchSkills(build),
  });
  const ref = await addDoc(collection(db, COL), payload as unknown as Record<string, unknown>);
  return ref.id;
}

export async function updateBuild(id: string, build: Build): Promise<void> {
  const { id: _ignored, ...rest } = build;
  const payload = stripUndefined({
    ...rest,
    updatedAt: Date.now(),
    searchSkills: buildSearchSkills(build),
  });
  await updateDoc(doc(db, COL, id), payload as unknown as Record<string, unknown>);
}

export async function deleteBuild(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function fetchBuild(id: string): Promise<Build | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Build) };
}

// We intentionally avoid Firestore orderBy on these multi-where queries so no
// composite index is required. Sorting is done client-side on `updatedAt`.
const byUpdatedDesc = (a: Build, b: Build) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);

/** Search public builds by one or two skills. */
export async function searchBuilds(skills: string[]): Promise<Build[]> {
  const filters = [where('isPublic', '==', true)];
  if (skills.length >= 1) filters.push(where('searchSkills', 'array-contains', skills[0]));
  const q = query(collection(db, COL), ...filters, limit(100));
  const snap = await getDocs(q);
  let results: Build[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Build) }));
  // Second-skill filter must be client-side (Firestore only allows one array-contains).
  if (skills.length >= 2) {
    results = results.filter((b) => (b.searchSkills ?? []).includes(skills[1]));
  }
  return results.sort(byUpdatedDesc);
}

/** List the signed-in user's own builds. */
export async function listUserBuilds(ownerUid: string): Promise<Build[]> {
  const q = query(collection(db, COL), where('ownerUid', '==', ownerUid), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Build) })).sort(byUpdatedDesc);
}
