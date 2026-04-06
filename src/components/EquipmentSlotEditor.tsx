import type { AttributeMap, EquipmentSlot, ModifierMap } from '../cdn/types';
import type { EquipEntry, ModRef } from '../domain/build';
import { GENERIC_SIDE, resolveSideSkill } from '../domain/build';
import { ModifierPicker } from './ModifierPicker';

interface Props {
  slot: EquipmentSlot;
  entry: EquipEntry;
  buildPrimarySkill: string;
  buildAuxSkill: string;
  maxSkillLevel: number;
  mods: ModifierMap;
  attrs: AttributeMap;
  onModChange: (idx: number, mod: ModRef | null) => void;
  onSideChange: (side: 'primary' | 'auxiliary', skill: string) => void;
}

export function EquipmentSlotEditor({
  slot, entry, buildPrimarySkill, buildAuxSkill, maxSkillLevel, mods, attrs,
  onModChange, onSideChange,
}: Props) {
  // Per-slot resolved skills — falls back to build-level choice if empty.
  const primary = resolveSideSkill(entry.primarySkill, buildPrimarySkill);
  const aux = resolveSideSkill(entry.auxSkill, buildAuxSkill);

  const sideOptions = [
    buildPrimarySkill && { value: buildPrimarySkill, label: buildPrimarySkill },
    buildAuxSkill && { value: buildAuxSkill, label: buildAuxSkill },
    { value: GENERIC_SIDE, label: 'Generic' },
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  const renderSide = (
    which: 'primary' | 'auxiliary',
    currentStored: string,
    currentResolved: string,
  ) => (
    <select
      value={currentStored || currentResolved}
      onChange={(e) => onSideChange(which, e.target.value)}
      style={{ flex: 1 }}
    >
      {sideOptions.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <div className="card" style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600, minWidth: 90 }}>{slot}</div>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="muted" style={{ fontSize: 11 }}>Primary side</span>
          {renderSide('primary', entry.primarySkill, primary)}
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="muted" style={{ fontSize: 11 }}>Auxiliary side</span>
          {renderSide('auxiliary', entry.auxSkill, aux)}
        </label>
        <div className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
          3 primary · 2 auxiliary · 1 flex
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entry.mods.map((m, i) => (
          <ModifierPicker
            key={i}
            slot={slot}
            index={i}
            value={m}
            primarySkill={primary}
            auxSkill={aux}
            buildPrimarySkill={buildPrimarySkill}
            buildAuxSkill={buildAuxSkill}
            maxSkillLevel={maxSkillLevel}
            mods={mods}
            attrs={attrs}
            onChange={(next) => onModChange(i, next)}
          />
        ))}
      </div>
    </div>
  );
}
