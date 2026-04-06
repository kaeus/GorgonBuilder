import { EQUIPMENT_SLOTS, type AttributeMap, type EquipmentSlot, type ItemMap, type ModifierMap } from '../cdn/types';
import type { Build, ModRef } from '../domain/build';
import { EquipmentSlotEditor } from './EquipmentSlotEditor';

interface Props {
  build: Build;
  mods: ModifierMap;
  attrs: AttributeMap;
  items: ItemMap;
  onModChange: (slot: EquipmentSlot, idx: number, mod: ModRef | null) => void;
  onSideChange: (slot: EquipmentSlot, side: 'primary' | 'auxiliary', skill: string) => void;
  onItemChange: (slot: EquipmentSlot, internalName: string | null) => void;
}

export function EquipmentGrid({ build, mods, attrs, items, onModChange, onSideChange, onItemChange }: Props) {
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
          items={items}
          onModChange={(idx, mod) => onModChange(slot, idx, mod)}
          onSideChange={(side, skill) => onSideChange(slot, side, skill)}
          onItemChange={(name) => onItemChange(slot, name)}
        />
      ))}
    </div>
  );
}
