import type { Modifier, ModifierMap, EquipmentSlot } from '../cdn/types';

export type PoolKind = 'primary' | 'auxiliary' | 'generic' | 'shamanic';

export const GENERIC_SKILL = 'AnySkill';
export const SHAMANIC_SKILL = 'ShamanicInfusion';

export interface PoolContext {
  primarySkill: string;
  auxSkill: string;
}

function skillForPool(pool: PoolKind, ctx: PoolContext): string {
  switch (pool) {
    case 'primary':   return ctx.primarySkill;
    case 'auxiliary': return ctx.auxSkill;
    case 'generic':   return GENERIC_SKILL;
    case 'shamanic':  return SHAMANIC_SKILL;
  }
}

export function filterModifiers(
  mods: ModifierMap,
  slot: EquipmentSlot,
  pool: PoolKind,
  ctx: PoolContext,
): Array<{ id: string; mod: Modifier }> {
  const skill = skillForPool(pool, ctx);
  const out: Array<{ id: string; mod: Modifier }> = [];
  for (const id in mods) {
    const m = mods[id];
    if (m.Skill !== skill) continue;
    if (!m.Slots || !m.Slots.includes(slot)) continue;
    out.push({ id, mod: m });
  }
  out.sort((a, b) => a.mod.InternalName.localeCompare(b.mod.InternalName));
  return out;
}

/**
 * Slot rule: 6 modifier slots per equipment piece.
 * Indices 0..2 => primary pool, 3..4 => auxiliary pool, 5 => flex (primary|auxiliary|generic|shamanic).
 */
export function allowedPoolForModIndex(idx: number): PoolKind[] {
  if (idx <= 2) return ['primary'];
  if (idx <= 4) return ['auxiliary'];
  return ['primary', 'auxiliary', 'generic', 'shamanic'];
}
