import type { ModifierMap } from '../cdn/types';
import type { ModRef } from './build';

/**
 * Derive a display-friendly pool label for a stored mod slot by reading the modifier's
 * actual Skill field, not the stored `pool` value. This hardens the UI against stale/wrong
 * stored pools from older builds or imports.
 *
 * Returns one of:
 *   - the skill name ("Shield", "Archery", …) when the mod's Skill matches the build's
 *     primary or auxiliary skill,
 *   - "Generic" for AnySkill mods,
 *   - "Shamanic Infusion" for ShamanicInfusion mods,
 *   - "Endurance" for Endurance mods,
 *   - the raw Skill string as a fallback,
 *   - null if the slot is empty / the mod isn't in the data.
 */
export function effectiveModPoolLabel(
  m: ModRef | null | undefined,
  mods: ModifierMap,
  buildPrimarySkill: string,
  buildAuxSkill: string,
): string | null {
  if (!m?.powerId) return null;
  const mod = mods[m.powerId];
  if (!mod) return null;
  const skill = mod.Skill;
  if (skill === 'AnySkill') return 'Generic';
  if (skill === 'ShamanicInfusion') return 'Shamanic Infusion';
  if (skill === 'Endurance') return 'Endurance';
  // Real skill names pass through; `skill === buildPrimarySkill` / `buildAuxSkill` both
  // resolve to their own name here so no special-casing is needed.
  if (skill === buildPrimarySkill || skill === buildAuxSkill) return skill;
  return skill || null;
}
