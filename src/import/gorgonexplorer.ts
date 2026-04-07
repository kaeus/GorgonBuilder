// Import builds from https://gorgonexplorer.com/build-planner/<id>.
//
// Their public API at /api/build/<id> returns a JSON envelope whose `json` field is
// a string-encoded JSON blob with the actual build contents. We parse that, then
// translate effect-text strings back into our modifier powerIds via a reverse lookup
// built from the CDN data.

import type { AbilityMap, AttributeMap, CdnBundle, EquipmentSlot, ModifierMap } from '../cdn/types';
import { EQUIPMENT_SLOTS } from '../cdn/types';
import { renderEffectDesc } from '../domain/effectDesc';
import { buildSkillIndex } from '../domain/skills';
import { newBuild, type Build, type ModRef } from '../domain/build';

// ---------------------------------------------------------------------------
// Remote envelope shape
// ---------------------------------------------------------------------------
interface GESlotMods { [slot: string]: string[] }
interface GEPoolMods { header?: string; mods: GESlotMods }
interface GEBuildJson {
  selectedMods: {
    firstSkillMods: GEPoolMods;
    secondSkillMods: GEPoolMods;
    genericMods: GEPoolMods;
    shamanicInfusionMods?: GEPoolMods;
    enduranceMods?: GEPoolMods; // unsupported pool — ignored with a warning.
  };
  currentlySelectedAbilities: {
    hotbar1: Array<{ name: string; skill?: string }>;
    hotbar2: Array<{ name: string; skill?: string }>;
  };
}

// Current API shape: buildContent is a parsed object (was a stringified `json` field).
// `legacyBuildId` is present for builds migrated from the old numeric scheme.
interface GEEnvelope {
  buildId: string;
  legacyBuildId?: number;
  name?: string;
  username?: string;
  /** Legacy field — older payloads used `createdBy` instead of `username`. */
  createdBy?: string;
  description?: string;
  firstSkill?: string;
  secondSkill?: string;
  buildContent?: GEBuildJson;
  /** Legacy field — older API returned a stringified blob here. */
  json?: string;
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------
// allorigins.win wraps the response in { contents: "<body>" } — we unwrap below.
const ALLORIGINS = 'https://api.allorigins.win/get?url=';

export function extractBuildId(input: string): string | null {
  const trimmed = input.trim();
  // Bare id (legacy numeric or new short id like "x6XWmlmdRigrjNX32XhEX").
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  const m =
    trimmed.match(/\/build(?:-planner)?\/([A-Za-z0-9_-]+)/) ||
    trimmed.match(/\/api\/builds?\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export async function fetchGorgonExplorerBuild(idOrUrl: string): Promise<GEEnvelope> {
  const id = extractBuildId(idOrUrl);
  if (!id) throw new Error('Could not find a build ID in the input.');
  const devUrl = `/ge-api/builds/${id}`;
  const directUrl = `https://api.gorgonexplorer.com/api/builds/${id}`;

  const tryDirect = async (url: string) => {
    const r = await fetch(url, {
      headers: { Accept: 'application/json, text/plain, */*' },
      credentials: 'omit',
    });
    if (!r.ok) {
      // Upstream (GorgonExplorer) errors are NOT retryable — e.g. a 403 means the build
      // is private, a 404 means it doesn't exist. Short-circuit by throwing a marker.
      if (r.status >= 400 && r.status < 500) {
        const err = new Error(
          r.status === 403
            ? `GorgonExplorer build is private or not accessible (403).`
            : r.status === 404
            ? `GorgonExplorer build not found (404).`
            : `GorgonExplorer returned ${r.status}.`,
        );
        (err as Error & { upstreamStatus?: number }).upstreamStatus = r.status;
        throw err;
      }
      throw new Error(`${r.status} ${url}`);
    }
    return r.json() as Promise<GEEnvelope>;
  };

  const tryAllOrigins = async () => {
    const r = await fetch(ALLORIGINS + encodeURIComponent(directUrl));
    if (!r.ok) throw new Error(`${r.status} allorigins`);
    const wrapped = (await r.json()) as { contents?: string; status?: { http_code?: number } };
    if (wrapped.status?.http_code && wrapped.status.http_code >= 400) {
      throw new Error(`upstream ${wrapped.status.http_code}`);
    }
    if (!wrapped.contents) throw new Error('allorigins: empty contents');
    return JSON.parse(wrapped.contents) as GEEnvelope;
  };

  // Build an ordered list of strategies. If VITE_GE_PROXY is set (Cloudflare Worker),
  // we prefer it — it's reliable, fast, and under our control. Otherwise we fall back
  // to the dev Vite proxy / direct fetch / allorigins chain.
  const workerBase = import.meta.env.VITE_GE_PROXY?.replace(/\/+$/, '');
  const strategies: Array<() => Promise<GEEnvelope>> = [];
  if (workerBase) {
    strategies.push(() => tryDirect(`${workerBase}/?id=${id}`));
  }
  if (import.meta.env.DEV) {
    strategies.push(() => tryDirect(devUrl));
  } else {
    strategies.push(() => tryDirect(directUrl));
  }
  strategies.push(tryAllOrigins);

  let lastErr: unknown;
  for (const fn of strategies) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn('GE import strategy failed:', e);
    }
  }
  throw lastErr ?? new Error('All fetch strategies failed');
}

// ---------------------------------------------------------------------------
// Text → powerId reverse lookup
// ---------------------------------------------------------------------------
/**
 * Canonicalize effect text for tier-agnostic comparison between our rendered
 * form and GorgonExplorer's rendered form. We strip:
 *   - inline <icon=N> tags
 *   - all numeric values (+26, -10, 1.55, etc.) — replaced with 'N'
 *   - punctuation (colons GE omits, dots/commas, middot separators, apostrophes)
 *   - case
 *   - whitespace collapse
 * `%` is preserved so `"+21"` and `"+21%"` aren't conflated.
 */
function canonicalize(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')                         // strip inline tags
    .replace(/[+\-]?\d+(?:\.\d+)?/g, 'N')            // numbers → N
    .replace(/[^\w%\s]/g, ' ')                       // drop punctuation, keep word chars, %, space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeText(s: string): string {
  return canonicalize(s);
}

export function buildModTextLookup(mods: ModifierMap, attrs: AttributeMap): Map<string, string> {
  const out = new Map<string, string>();
  const put = (text: string, id: string) => {
    const key = canonicalize(text);
    if (key && !out.has(key)) out.set(key, id);
  };
  for (const id in mods) {
    const m = mods[id];
    if (!m.Tiers) continue;
    // Index one representative tier per modifier — canonicalize strips the tier-specific numbers,
    // so every tier produces the same key. We still walk all tiers as a fallback in case some
    // tiers use different EffectDescs shapes.
    for (const tid in m.Tiers) {
      const descs = m.Tiers[tid].EffectDescs ?? [];
      // Full joined rendering (both ' · ' separator as rendered, and ', ' as GE writes it).
      const rendered = descs.map((d) => renderEffectDesc(d, attrs));
      if (rendered.length > 0) {
        put(rendered.join(' · '), id);
        put(rendered.join(', '), id);
      }
      // Per-entry rendering so a single-effect tier matches directly.
      for (const r of rendered) put(r, id);
      // Also index the raw EffectDescs (with inline tags) in case GE is passing them through
      // without re-rendering attribute tokens.
      for (const d of descs) put(d, id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ability name → base InternalName lookup (per skill)
// ---------------------------------------------------------------------------
function stripTrailingNumber(name: string): string {
  return name.replace(/\s+\d+$/, '').trim();
}

/** Skill name normalizer: strips whitespace + apostrophes + lowercases.
 *  "Animal Handling" → "animalhandling", matches CDN key "AnimalHandling". */
function normSkill(s: string): string {
  return s.replace(/[\s']+/g, '').toLowerCase();
}

/** Ability name normalizer: strips trailing tier number, collapses whitespace/apostrophes, lowercases. */
function normAbility(s: string): string {
  return stripTrailingNumber(s).replace(/[\s']+/g, '').toLowerCase();
}

/**
 * Build a two-level lookup so we can resolve a GE ability entry
 * (`{skill: "Animal Handling", name: "Sic 'Em 5"}`) back to our base ability InternalName.
 *
 * Returns a Map keyed by `<normSkill>::<normAbility>`.
 */
export function buildAbilityNameLookup(abilities: AbilityMap): Map<string, string> {
  const { chainsBySkill } = buildSkillIndex(abilities);
  const out = new Map<string, string>();
  for (const [skill, chains] of chainsBySkill) {
    const nSkill = normSkill(skill);
    for (const c of chains) {
      out.set(`${nSkill}::${normAbility(c.name)}`, c.baseInternalName);
    }
  }
  return out;
}

/** Resolve a GE skill label ("Animal Handling") to our canonical skill name ("AnimalHandling"). */
function resolveSkillName(geSkill: string | undefined, abilities: AbilityMap): string {
  if (!geSkill) return '';
  const { chainsBySkill } = buildSkillIndex(abilities);
  const target = normSkill(geSkill);
  for (const skill of chainsBySkill.keys()) {
    if (normSkill(skill) === target) return skill;
  }
  return geSkill; // last resort — leave as-is, user can fix manually
}

// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------
export interface ImportResult {
  build: Build;
  warnings: string[];
}

/**
 * Convert a GorgonExplorer envelope into our Build shape. Best-effort: any mods or
 * abilities that can't be matched are reported in `warnings` and left empty.
 */
export function convertGEBuild(env: GEEnvelope, cdn: CdnBundle, ownerUid?: string): ImportResult {
  const warnings: string[] = [];
  // Current API embeds the build as a parsed object; older API stringified it.
  const data: GEBuildJson = env.buildContent
    ?? (env.json ? (JSON.parse(env.json) as GEBuildJson) : (() => {
      throw new Error('Build payload is missing both buildContent and json fields.');
    })());

  const build = newBuild(ownerUid);
  build.name = env.name?.trim() || 'Imported build';
  const author = env.username ?? env.createdBy;
  build.notes = [
    env.description?.trim(),
    author
      ? `Imported from gorgonexplorer.com/build-planner/${env.buildId} (by ${author})`
      : `Imported from gorgonexplorer.com/build-planner/${env.buildId}`,
  ].filter(Boolean).join('\n\n');
  build.primarySkill = resolveSkillName(env.firstSkill, cdn.abilities);
  build.auxSkill = resolveSkillName(env.secondSkill, cdn.abilities);

  // --- Abilities -----------------------------------------------------------
  const nameLookup = buildAbilityNameLookup(cdn.abilities);
  const resolveAbility = (name: string, skill: string): string | null => {
    const hit = nameLookup.get(`${normSkill(skill)}::${normAbility(name)}`);
    return hit ?? null;
  };

  const fillBar = (bar: Array<{ name: string; skill?: string }>, skill: string, target: Array<string | null>) => {
    for (let i = 0; i < Math.min(6, bar.length); i++) {
      const entry = bar[i];
      const id = resolveAbility(entry.name, entry.skill ?? skill);
      if (id) target[i] = id;
      else warnings.push(`Ability not found: "${entry.name}" (${entry.skill ?? skill})`);
    }
  };
  fillBar(data.currentlySelectedAbilities?.hotbar1 ?? [], build.primarySkill, build.primaryAbilities);
  fillBar(data.currentlySelectedAbilities?.hotbar2 ?? [], build.auxSkill, build.auxAbilities);

  // --- Equipment mods ------------------------------------------------------
  const modLookup = buildModTextLookup(cdn.modifiers, cdn.attributes);
  const resolveMod = (text: string): string | null => modLookup.get(normalizeText(text)) ?? null;

  const sel = data.selectedMods ?? ({} as GEBuildJson['selectedMods']);
  if (sel.enduranceMods && Object.values(sel.enduranceMods.mods ?? {}).some((arr) => arr?.length)) {
    warnings.push('Endurance mods are not supported and were skipped.');
  }

  // Collect each slot's resolved mods, bucketed by which GE pool they came from.
  // We then decide per-slot whether firstSkill or secondSkill gets the "primary side"
  // based on which has more mods in that slot.
  type Resolved = { powerId: string; text: string };
  for (const slot of EQUIPMENT_SLOTS) {
    const collect = (bucket?: GEPoolMods): Resolved[] => {
      const texts = bucket?.mods?.[slot as EquipmentSlot] ?? [];
      const out: Resolved[] = [];
      for (const text of texts) {
        const id = resolveMod(text);
        if (!id) {
          warnings.push(`[${slot}] Unknown mod text: "${text}"`);
          continue;
        }
        out.push({ powerId: id, text });
      }
      return out;
    };

    const firstMods  = collect(sel.firstSkillMods);
    const secondMods = collect(sel.secondSkillMods);
    const generic    = collect(sel.genericMods);
    const shamanic   = collect(sel.shamanicInfusionMods);

    // Decide which side is "primary" for this slot:
    //   - more mods → that side is primary (gets 3 slots).
    //   - tie (0/0, 1/1, 2/2, 3/3) → keep build default (first is primary).
    const firstIsPrimary = firstMods.length >= secondMods.length;
    const primaryMods = firstIsPrimary ? firstMods.slice() : secondMods.slice();
    const auxMods     = firstIsPrimary ? secondMods.slice() : firstMods.slice();
    const primarySkillName = firstIsPrimary ? build.primarySkill : build.auxSkill;
    const auxSkillName     = firstIsPrimary ? build.auxSkill : build.primarySkill;

    const assigned: Array<ModRef | null> = [null, null, null, null, null, null];
    const putPrimary = (m: Resolved, i: number) => { assigned[i] = { powerId: m.powerId, pool: 'primary' }; };
    const putAux     = (m: Resolved, i: number) => { assigned[i] = { powerId: m.powerId, pool: 'auxiliary' }; };

    // Indices 0..2 = primary side, 3..4 = aux side, 5 = flex.
    for (let i = 0; i <= 2 && primaryMods.length > 0; i++) putPrimary(primaryMods.shift()!, i);
    for (let i = 3; i <= 4 && auxMods.length     > 0; i++) putAux(auxMods.shift()!, i);

    // Flex slot priority:
    //   1. A generic mod (most common case).
    //   2. A shamanic mod.
    //   3. Overflow from the primary side (e.g. 4 firstSkill mods).
    //   4. Overflow from the aux side.
    //   5. Nothing (leave empty).
    if (generic.length > 0) {
      const m = generic.shift()!;
      assigned[5] = { powerId: m.powerId, pool: 'generic' };
    } else if (shamanic.length > 0) {
      const m = shamanic.shift()!;
      assigned[5] = { powerId: m.powerId, pool: 'shamanic' };
    } else if (primaryMods.length > 0) {
      const m = primaryMods.shift()!;
      assigned[5] = { powerId: m.powerId, pool: 'primary' };
    } else if (auxMods.length > 0) {
      const m = auxMods.shift()!;
      assigned[5] = { powerId: m.powerId, pool: 'auxiliary' };
    }

    // Overflow: any leftover mods → first empty slot (violates the 3/2/1 rule, but captures data).
    const overflow: Array<{ m: Resolved; pool: ModRef['pool'] }> = [
      ...primaryMods.map((m) => ({ m, pool: 'primary' as const })),
      ...auxMods.map((m)     => ({ m, pool: 'auxiliary' as const })),
      ...generic.map((m)     => ({ m, pool: 'generic' as const })),
      ...shamanic.map((m)    => ({ m, pool: 'shamanic' as const })),
    ];
    for (const { m, pool } of overflow) {
      const empty = assigned.findIndex((x) => x === null);
      if (empty < 0) {
        warnings.push(`[${slot}] No room for extra mod ("${m.text.slice(0, 60)}…")`);
        break;
      }
      assigned[empty] = { powerId: m.powerId, pool };
    }

    build.equipment[slot as EquipmentSlot] = {
      primarySkill: primarySkillName,
      auxSkill: auxSkillName,
      mods: assigned,
    };
  }

  return { build, warnings };
}
