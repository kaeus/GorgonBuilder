import type { AttributeMap, EquipmentSlot, ItemMap, ModifierMap } from '../cdn/types';
import type { EquipEntry, ModRef } from '../domain/build';
import { GENERIC_SIDE, resolveSideSkill } from '../domain/build';
import { ModifierPicker } from './ModifierPicker';
import { ItemSelect } from './ItemSelect';
import { ModSection } from './ModSection';

interface Props {
  slot: EquipmentSlot;
  entry: EquipEntry;
  buildPrimarySkill: string;
  buildAuxSkill: string;
  maxSkillLevel: number;
  mods: ModifierMap;
  attrs: AttributeMap;
  items: ItemMap;
  onModChange: (idx: number, mod: ModRef | null) => void;
  onSideChange: (side: 'primary' | 'auxiliary', skill: string) => void;
  onItemChange: (internalName: string | null) => void;
}

export function EquipmentSlotEditor({
  slot, entry, buildPrimarySkill, buildAuxSkill, maxSkillLevel, mods, attrs, items,
  onModChange, onSideChange, onItemChange,
}: Props) {
  // Set of powerIds currently chosen in this equipment piece — used to exclude duplicates.
  const alreadyChosen = new Set(entry.mods.map((m) => m?.powerId).filter((x): x is string => !!x));
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
      <div style={{ marginBottom: 8 }}>
        <div className="muted" style={{ fontSize: 11, marginBottom: 2 }}>Base item</div>
        <ItemSelect
          items={items}
          slot={slot}
          value={entry.itemInternalName ?? null}
          attrs={attrs}
          onChange={onItemChange}
        />
      </div>
      {(() => {
        // Group pickers: 0-2 primary, 3-4 auxiliary, 5 flex.
        const picker = (i: number) => (
          <ModifierPicker
            key={i}
            slot={slot}
            index={i}
            value={entry.mods[i]}
            primarySkill={primary}
            auxSkill={aux}
            buildPrimarySkill={buildPrimarySkill}
            buildAuxSkill={buildAuxSkill}
            maxSkillLevel={maxSkillLevel}
            mods={mods}
            attrs={attrs}
            excludePowerIds={alreadyChosen}
            onChange={(next) => onModChange(i, next)}
          />
        );
        // Flex label: show the actual pool picked when one is set; otherwise "Flex".
        const flex = entry.mods[5];
        const flexLabel =
          flex?.pool === 'generic'   ? 'Generic' :
          flex?.pool === 'shamanic'  ? 'Shamanic Infusion' :
          flex?.pool === 'endurance' ? 'Endurance' :
          flex?.pool === 'primary'   ? primary :
          flex?.pool === 'auxiliary' ? aux :
          'Flex';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ModSection label={primary || 'Primary'}>
              {picker(0)}{picker(1)}{picker(2)}
            </ModSection>
            <ModSection label={aux || 'Auxiliary'}>
              {picker(3)}{picker(4)}
            </ModSection>
            <ModSection label={flexLabel}>
              {picker(5)}
            </ModSection>
          </div>
        );
      })()}
    </div>
  );
}

