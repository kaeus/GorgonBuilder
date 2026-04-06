import type { Ability, AbilityMap, Modifier, ModifierMap } from '../cdn/types';
import { parseEffectDesc, splitPlainEffectDesc } from './effectDesc';

/**
 * Reverse index: ability InternalName -> modifier ids whose EffectDescs reference that ability.
 * Heuristic: we look for attribute tokens that contain the ability's InternalName (upper-cased),
 * which catches patterns like BOOST_ABILITY_FRONTKICK, MOD_ABILITY_FRONTKICK, etc.
 *
 * Skill-wide boosts (BOOST_SKILL_<SKILL>) aren't included here — the tooltip handles those
 * as a separate "skill-wide" bucket since they affect every ability in the skill.
 */
export function buildAbilityModIndex(mods: ModifierMap, abilities?: AbilityMap): Map<string, string[]> {
  const map = new Map<string, Set<string>>();

  // Build IconID -> ability InternalName(s) lookup (one icon can belong to multiple tiers of the same base).
  // We only need one representative InternalName per icon for the "same ability family" match.
  const iconToAbilityKey = new Map<number, Set<string>>();
  if (abilities) {
    for (const aid in abilities) {
      const a = abilities[aid];
      if (!a.IconID || !a.InternalName) continue;
      const key = a.InternalName.toUpperCase();
      const set = iconToAbilityKey.get(a.IconID) ?? new Set<string>();
      set.add(key);
      iconToAbilityKey.set(a.IconID, set);
    }
  }

  const add = (abilityKey: string, modId: string) => {
    const s = map.get(abilityKey) ?? new Set<string>();
    s.add(modId);
    map.set(abilityKey, s);
  };

  for (const id in mods) {
    const m = mods[id];
    if (!m.Tiers) continue;

    for (const tid in m.Tiers) {
      for (const desc of m.Tiers[tid].EffectDescs ?? []) {
        // 1) Token-based: attribute names like BOOST_ABILITY_FRONTKICK
        for (const seg of parseEffectDesc(desc)) {
          const upper = seg.token.toUpperCase();
          if (upper.includes('ABILITY_')) {
            const tail = upper.split('ABILITY_').pop()!;
            if (tail) add(tail, id);
          }
        }
        // 2) Plain-text <icon=N> tags in the desc → look up ability by icon id.
        for (const seg of splitPlainEffectDesc(desc)) {
          if (seg.kind !== 'icon') continue;
          const keys = iconToAbilityKey.get(seg.id);
          if (!keys) continue;
          for (const k of keys) add(k, id);
        }
      }
    }
  }

  const out = new Map<string, string[]>();
  for (const [k, v] of map) out.set(k, [...v]);
  return out;
}

/** Find mods relevant to a given ability. Matches by InternalName (case-insensitive). */
export function getRelevantMods(
  ability: Ability,
  index: Map<string, string[]>,
  mods: ModifierMap,
): Array<{ id: string; mod: Modifier }> {
  const key = ability.InternalName?.toUpperCase() ?? '';
  const ids = index.get(key) ?? [];
  return ids.map((id) => ({ id, mod: mods[id] })).filter((x) => x.mod);
}

/** Mods that boost the entire skill (e.g. BOOST_SKILL_ARCHERY) — affects every ability in that skill. */
export function getSkillWideMods(skill: string, mods: ModifierMap): Array<{ id: string; mod: Modifier }> {
  const out: Array<{ id: string; mod: Modifier }> = [];
  const needle = `SKILL_${skill.toUpperCase()}`;
  for (const id in mods) {
    const m = mods[id];
    if (m.Skill !== skill && m.Skill !== 'AnySkill') continue;
    if (!m.Tiers) continue;
    let hit = false;
    outer: for (const tid in m.Tiers) {
      for (const desc of m.Tiers[tid].EffectDescs ?? []) {
        for (const seg of parseEffectDesc(desc)) {
          if (seg.token.toUpperCase().includes(needle)) { hit = true; break outer; }
        }
      }
    }
    if (hit) out.push({ id, mod: m });
  }
  return out;
}
