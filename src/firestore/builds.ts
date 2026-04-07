import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, limit,
  orderBy, startAfter, type QueryDocumentSnapshot, type DocumentData,
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

const byUpdatedDesc = (a: Build, b: Build) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);

export const PAGE_SIZE = 20;

export interface BuildPage {
  builds: Build[];
  /** Cursor for the next page; pass to `searchBuilds({ after })`. Null when there's no next page. */
  nextCursor: QueryDocumentSnapshot<DocumentData> | null;
}

interface SearchOptions {
  skills?: string[];
  pageSize?: number;
  after?: QueryDocumentSnapshot<DocumentData> | null;
}

/**
 * Paginated public-build search, ordered by `updatedAt` desc.
 *
 * Firestore composite indexes you'll need to create on first run (Firebase will surface
 * a "missing index" error with a one-click create URL):
 *   - builds: isPublic ASC + updatedAt DESC
 *   - builds: isPublic ASC + searchSkills ARRAY + updatedAt DESC
 *
 * When two skills are provided, Firestore can only filter on the first one (it allows a
 * single array-contains per query); the second is applied client-side after the page is
 * fetched. That can cause some pages to come back smaller than `pageSize`. Acceptable for
 * now; if it ever matters we can swap to two separate queries and merge.
 */
export async function searchBuilds(opts: SearchOptions = {}): Promise<BuildPage> {
  const skills = opts.skills ?? [];
  const pageSize = opts.pageSize ?? PAGE_SIZE;

  const filters = [where('isPublic', '==', true)];
  if (skills.length >= 1) filters.push(where('searchSkills', 'array-contains', skills[0]));

  const constraints = [
    ...filters,
    orderBy('updatedAt', 'desc'),
    ...(opts.after ? [startAfter(opts.after)] : []),
    // Fetch one extra so we can detect "is there a next page".
    limit(pageSize + 1),
  ];
  const q = query(collection(db, COL), ...constraints);
  const snap = await getDocs(q);

  // Map docs and remember the last QueryDocumentSnapshot for cursor pagination.
  let docs = snap.docs;
  const hasNext = docs.length > pageSize;
  if (hasNext) docs = docs.slice(0, pageSize);

  let builds: Build[] = docs.map((d) => ({ id: d.id, ...(d.data() as Build) }));
  if (skills.length >= 2) {
    // Second-skill filter is client-side (Firestore only allows one array-contains).
    builds = builds.filter((b) => (b.searchSkills ?? []).includes(skills[1]));
  }

  return {
    builds,
    nextCursor: hasNext ? docs[docs.length - 1] : null,
  };
}

/** List the signed-in user's own builds. */
export async function listUserBuilds(ownerUid: string): Promise<Build[]> {
  const q = query(collection(db, COL), where('ownerUid', '==', ownerUid), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Build) })).sort(byUpdatedDesc);
}
