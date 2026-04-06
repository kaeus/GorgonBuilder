import type { Ability, AbilityMap, SkillMap } from '../cdn/types';

export interface AbilityChain {
  // Base ability (Level 0 / no Prerequisite) plus all its upgrade tiers sorted by Level asc.
  baseInternalName: string;
  name: string;       // base ability display name
  skill: string;
  tiers: Ability[];   // index 0 = lowest tier
}

/** Return the set of combat-flagged skill names (skills.json -> Combat: true). */
export function combatSkillNames(skills: SkillMap): Set<string> {
  const out = new Set<string>();
  for (const name in skills) if (skills[name]?.Combat) out.add(name);
  return out;
}

/** Group abilities by Skill, then collapse Prerequisite chains into AbilityChain[]. */
export function buildSkillIndex(abilities: AbilityMap, combatOnly?: Set<string>) {
  const bySkill = new Map<string, Ability[]>();
  for (const id in abilities) {
    const a = abilities[id];
    if (!a.Skill || a.Skill === 'Unknown') continue;
    if (combatOnly && !combatOnly.has(a.Skill)) continue;
    (bySkill.get(a.Skill) ?? bySkill.set(a.Skill, []).get(a.Skill)!).push(a);
  }

  const chainsBySkill = new Map<string, AbilityChain[]>();
  for (const [skill, list] of bySkill) {
    // Index by InternalName for prerequisite walking.
    const byName = new Map<string, Ability>();
    for (const a of list) byName.set(a.InternalName, a);

    // A base ability has no prerequisite inside the same skill.
    const chains: AbilityChain[] = [];
    const consumed = new Set<string>();

    // Walk forward from each base; collect upgrades whose Prerequisite points back.
    for (const a of list) {
      if (a.Prerequisite && byName.has(a.Prerequisite)) continue;
      if (consumed.has(a.InternalName)) continue;
      const chain: Ability[] = [a];
      consumed.add(a.InternalName);
      // BFS forward: any ability whose Prerequisite chains back to this base.
      let changed = true;
      while (changed) {
        changed = false;
        for (const b of list) {
          if (consumed.has(b.InternalName)) continue;
          if (b.Prerequisite && chain.some((c) => c.InternalName === b.Prerequisite)) {
            chain.push(b);
            consumed.add(b.InternalName);
            changed = true;
          }
        }
      }
      chain.sort((x, y) => (x.Level ?? 0) - (y.Level ?? 0));
      chains.push({
        baseInternalName: a.InternalName,
        name: a.Name,
        skill,
        tiers: chain,
      });
    }

    // Sort chains alphabetically for stable UI.
    chains.sort((x, y) => x.name.localeCompare(y.name));
    chainsBySkill.set(skill, chains);
  }

  const skillNames = [...chainsBySkill.keys()].sort();
  return { chainsBySkill, skillNames };
}
