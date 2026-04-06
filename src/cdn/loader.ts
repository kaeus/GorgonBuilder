import { get, set, del, keys } from 'idb-keyval';
import type { AbilityMap, AttributeMap, CdnBundle, ItemMap, ModifierMap, SkillMap } from './types';

const CDN_BASE = 'https://cdn.projectgorgon.com';
// Version file lives on client.projectgorgon.com, which does NOT send CORS headers.
// Dev: go through Vite proxy (/pgversion). Prod: try direct, then a public CORS proxy.
const VERSION_URL_DIRECT = 'https://client.projectgorgon.com/fileversion.txt';
const VERSION_URL_DEV = '/pgversion';
const CORS_PROXY = 'https://corsproxy.io/?';

export const ICON_URL = (version: string, iconId: number) =>
  `${CDN_BASE}/v${version}/icons/icon_${iconId}.png`;
const cacheKey = (v: string, f: string) => `cdn:${v}:${f}`;

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

async function fetchVersionRaw(): Promise<string> {
  // Allow build-time override (useful if CORS breaks or for pinning).
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  const pinned = env.VITE_CDN_VERSION;
  if (pinned) return pinned;

  // Preferred: Cloudflare Worker proxy — adds CORS headers and avoids third-party dependencies.
  const workerBase = env.VITE_GE_PROXY?.replace(/\/+$/, '');
  if (workerBase) {
    try {
      return await fetchText(`${workerBase}/fileversion`);
    } catch (e) {
      console.warn('Worker /fileversion failed, trying fallbacks:', e);
    }
  }

  // Dev: Vite proxy handles CORS when no worker is configured.
  if (import.meta.env.DEV) return fetchText(VERSION_URL_DEV);

  // Prod fallback: try direct, then a public CORS proxy.
  try {
    return await fetchText(VERSION_URL_DIRECT);
  } catch {
    return fetchText(CORS_PROXY + encodeURIComponent(VERSION_URL_DIRECT));
  }
}

export async function getCdnVersion(): Promise<string> {
  const txt = (await fetchVersionRaw()).trim();
  // Per PG docs: "a consecutive sequence of ascii letters and numbers" — e.g. "466" or a codename.
  const m = txt.match(/^[A-Za-z0-9]+/);
  return m ? m[0] : txt;
}

async function loadOrFetch<T>(version: string, file: string): Promise<T> {
  const key = cacheKey(version, file);
  const cached = await get<T>(key);
  if (cached) return cached;
  const data = await fetchJson<T>(`${CDN_BASE}/v${version}/data/${file}.json`);
  await set(key, data);
  return data;
}

async function pruneOldVersions(currentVersion: string) {
  const all = (await keys()) as string[];
  for (const k of all) {
    if (typeof k === 'string' && k.startsWith('cdn:') && !k.startsWith(`cdn:${currentVersion}:`)) {
      await del(k);
    }
  }
}

export async function loadCdnBundle(): Promise<CdnBundle> {
  const version = await getCdnVersion();
  const [abilities, modifiers, attributes, skills, items] = await Promise.all([
    loadOrFetch<AbilityMap>(version, 'abilities'),
    loadOrFetch<ModifierMap>(version, 'tsysclientinfo'),
    loadOrFetch<AttributeMap>(version, 'attributes'),
    loadOrFetch<SkillMap>(version, 'skills'),
    loadOrFetch<ItemMap>(version, 'items'),
  ]);
  // Fire and forget.
  pruneOldVersions(version).catch(() => {});
  return { version, abilities, modifiers, attributes, skills, items };
}
