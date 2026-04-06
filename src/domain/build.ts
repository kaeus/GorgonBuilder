import type { EquipmentSlot } from '../cdn/types';
import { EQUIPMENT_SLOTS } from '../cdn/types';
import type { PoolKind } from './modifierPools';
import { allowedPoolForModIndex } from './modifierPools';

export interface ModRef {
  powerId: string;    // "power_XXXXX"
  pool: PoolKind;
}

/**
 * Per-equipment-slot skill override. Defaults copy the build's primary/aux skills,
 * but the user can swap them or set either side to "Generic" (the AnySkill pool).
 * Empty string means "inherit build default" — the editor resolves that before filtering.
 */
export interface EquipEntry {
  primarySkill: string;  // "" | "<skill>" | "Generic"
  auxSkill: string;      // "" | "<skill>" | "Generic"
  /** Base item template InternalName (from items.json), if chosen. */
  itemInternalName?: string | null;
  // 6 mod slots: indices 0..2 primary side, 3..4 auxiliary side, 5 flex.
  mods: Array<ModRef | null>;
}

export const GENERIC_SIDE = 'Generic';
/** Resolve slot-side label to the Skill string used in ModifierMap. */
export function resolveSideSkill(side: string, fallback: string): string {
  if (!side) return fallback;
  if (side === GENERIC_SIDE) return 'AnySkill';
  return side;
}

export interface Build {
  id?: string;
  ownerUid?: string;
  ownerUsername?: string;
  name: string;
  notes: string;
  maxLevel: number;       // single cap used for both ability tier and modifier tier resolution
  primarySkill: string;
  auxSkill: string;
  primaryAbilities: Array<string | null>; // length 6: base ability InternalName per slot
  auxAbilities: Array<string | null>;     // length 6
  equipment: Record<EquipmentSlot, EquipEntry>;
  isPublic: boolean;
  createdAt?: number;
  updatedAt?: number;
  searchSkills?: string[];
}

export function emptyEquipEntry(): EquipEntry {
  return { primarySkill: '', auxSkill: '', itemInternalName: null, mods: [null, null, null, null, null, null] };
}

export function newBuild(ownerUid?: string): Build {
  const equipment = {} as Record<EquipmentSlot, EquipEntry>;
  for (const s of EQUIPMENT_SLOTS) equipment[s] = emptyEquipEntry();
  return {
    ownerUid,
    name: 'New Build',
    notes: '',
    maxLevel: 125,
    primarySkill: '',
    auxSkill: '',
    primaryAbilities: [null, null, null, null, null, null],
    auxAbilities: [null, null, null, null, null, null],
    equipment,
    isPublic: false,
  };
}

export function validateModPlacement(index: number, pool: PoolKind): boolean {
  return allowedPoolForModIndex(index).includes(pool);
}

export function buildSearchSkills(b: Build): string[] {
  return [b.primarySkill, b.auxSkill].filter(Boolean);
}

/** Count equipped instances per modifier powerId across all 9 slots. */
export function equippedPowerIdCounts(b: Build): Map<string, number> {
  const out = new Map<string, number>();
  for (const slot in b.equipment) {
    for (const m of b.equipment[slot as keyof typeof b.equipment].mods) {
      if (m?.powerId) out.set(m.powerId, (out.get(m.powerId) ?? 0) + 1);
    }
  }
  return out;
}
