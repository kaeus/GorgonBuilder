import { EQUIPMENT_SLOTS, type AttributeMap, type EquipmentSlot, type ModifierMap } from '../cdn/types';
import type { Build, ModRef } from '../domain/build';
import { EquipmentSlotEditor } from './EquipmentSlotEditor';

interface Props {
  build: Build;
  mods: ModifierMap;
  attrs: AttributeMap;
  onModChange: (slot: EquipmentSlot, idx: number, mod: ModRef | null) => void;
  onSideChange: (slot: EquipmentSlot, side: 'primary' | 'auxiliary', skill: string) => void;
}

export function EquipmentGrid({ build, mods, attrs, onModChange, onSideChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {EQUIPMENT_SLOTS.map((slot) => (
        <EquipmentSlotEditor
          key={slot}
          slot={slot}
          entry={build.equipment[slot]}
          buildPrimarySkill={build.primarySkill}
          buildAuxSkill={build.auxSkill}
          maxSkillLevel={build.maxLevel}
          mods={mods}
          attrs={attrs}
          onModChange={(idx, mod) => onModChange(slot, idx, mod)}
          onSideChange={(side, skill) => onSideChange(slot, side, skill)}
        />
      ))}
    </div>
  );
}
