import { create } from 'zustand';
import type { Build, ModRef } from '../domain/build';
import type { EquipmentSlot } from '../cdn/types';
import { newBuild, validateModPlacement } from '../domain/build';

interface BuildStore {
  build: Build;
  reset: (b?: Build) => void;
  set: (patch: Partial<Build>) => void;
  setPrimaryAbility: (i: number, base: string | null) => void;
  setAuxAbility: (i: number, base: string | null) => void;
  setMod: (slot: EquipmentSlot, idx: number, mod: ModRef | null) => void;
  setSlotSide: (slot: EquipmentSlot, side: 'primary' | 'auxiliary', skill: string) => void;
  setSlotItem: (slot: EquipmentSlot, internalName: string | null) => void;
}

export const useBuildStore = create<BuildStore>((set) => ({
  build: newBuild(),
  reset: (b) => set({ build: b ?? newBuild() }),
  set: (patch) => set((s) => ({ build: { ...s.build, ...patch } })),
  setPrimaryAbility: (i, base) =>
    set((s) => {
      const next = [...s.build.primaryAbilities];
      next[i] = base;
      return { build: { ...s.build, primaryAbilities: next } };
    }),
  setAuxAbility: (i, base) =>
    set((s) => {
      const next = [...s.build.auxAbilities];
      next[i] = base;
      return { build: { ...s.build, auxAbilities: next } };
    }),
  setMod: (slot, idx, mod) =>
    set((s) => {
      if (mod && !validateModPlacement(idx, mod.pool)) return s;
      const entry = s.build.equipment[slot];
      const nextMods = [...entry.mods];
      nextMods[idx] = mod;
      return {
        build: {
          ...s.build,
          equipment: { ...s.build.equipment, [slot]: { ...entry, mods: nextMods } },
        },
      };
    }),
  setSlotSide: (slot, side, skill) =>
    set((s) => {
      const entry = s.build.equipment[slot];
      const key = side === 'primary' ? 'primarySkill' : 'auxSkill';
      return {
        build: {
          ...s.build,
          equipment: { ...s.build.equipment, [slot]: { ...entry, [key]: skill } },
        },
      };
    }),
  setSlotItem: (slot, internalName) =>
    set((s) => {
      const entry = s.build.equipment[slot];
      return {
        build: {
          ...s.build,
          equipment: { ...s.build.equipment, [slot]: { ...entry, itemInternalName: internalName } },
        },
      };
    }),
}));
