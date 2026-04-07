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

/** Strip trailing tier number from a display name: "Rotskin 6" → "Rotskin". */
function stripTierSuffix(name: string): string {
  return name.replace(/\s+\d+$/, '').trim();
}

/**
 * Group abilities by Skill, then by their display Name family. Each unique stripped name
 * becomes one chain — this keeps variants like Rotflesh (which uses Rotskin's prerequisite
 * tree but is a different ability) in their own picker entry.
 */
export function buildSkillIndex(abilities: AbilityMap, combatOnly?: Set<string>) {
  const bySkill = new Map<string, Ability[]>();
  for (const id in abilities) {
    const a = abilities[id];
    if (!a.Skill || a.Skill === 'Unknown') continue;
    if (combatOnly && !combatOnly.has(a.Skill)) continue;
    // Internal/hidden abilities that exist only to drive triggered effects — not slottable.
    if (a.Keywords?.includes('Lint_NotLearnable')) continue;
    if (a.Name && /internal/i.test(a.Name)) continue;
    (bySkill.get(a.Skill) ?? bySkill.set(a.Skill, []).get(a.Skill)!).push(a);
  }

  const chainsBySkill = new Map<string, AbilityChain[]>();
  for (const [skill, list] of bySkill) {
    // Group by Name family (stripped of trailing tier number).
    const byFamily = new Map<string, Ability[]>();
    for (const a of list) {
      const family = stripTierSuffix(a.Name ?? a.InternalName);
      (byFamily.get(family) ?? byFamily.set(family, []).get(family)!).push(a);
    }

    const chains: AbilityChain[] = [];
    for (const [family, members] of byFamily) {
      // Sort tiers ascending by Level so picker lookups are stable.
      members.sort((x, y) => (x.Level ?? 0) - (y.Level ?? 0));
      // Use the lowest-tier ability as the chain identity. This is what build storage keys on,
      // so changes in higher tiers won't break previously-saved selections.
      const base = members[0];
      chains.push({
        baseInternalName: base.InternalName,
        name: family,
        skill,
        tiers: members,
      });
    }

    chains.sort((x, y) => x.name.localeCompare(y.name));
    chainsBySkill.set(skill, chains);
  }

  const skillNames = [...chainsBySkill.keys()].sort();
  return { chainsBySkill, skillNames };
}
