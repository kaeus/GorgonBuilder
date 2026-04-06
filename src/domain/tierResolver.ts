import type { Ability, Modifier, ModifierTier } from '../cdn/types';
import type { AbilityChain } from './skills';

/** Pick the highest ability tier in the chain whose Level <= maxLevel. */
export function pickAbilityTier(chain: AbilityChain, maxLevel: number): Ability | undefined {
  let best: Ability | undefined;
  for (const a of chain.tiers) {
    if ((a.Level ?? 0) <= maxLevel) {
      if (!best || (a.Level ?? 0) > (best.Level ?? 0)) best = a;
    }
  }
  return best ?? chain.tiers[0];
}

/** Pick the highest modifier tier whose SkillLevelPrereq <= maxSkillLevel. */
export function pickModifierTier(mod: Modifier, maxSkillLevel: number): { id: string; tier: ModifierTier } | undefined {
  if (!mod.Tiers) return undefined;
  let best: { id: string; tier: ModifierTier } | undefined;
  for (const id in mod.Tiers) {
    const t = mod.Tiers[id];
    const req = t.SkillLevelPrereq ?? 0;
    if (req <= maxSkillLevel) {
      if (!best || req >= (best.tier.SkillLevelPrereq ?? 0)) best = { id, tier: t };
    }
  }
  return best;
}
