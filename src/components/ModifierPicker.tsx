import { useMemo, useState } from 'react';
import type { AttributeMap, EquipmentSlot, ModifierMap } from '../cdn/types';
import { allowedPoolForModIndex, filterModifiers, PoolKind } from '../domain/modifierPools';
import { pickModifierTier } from '../domain/tierResolver';
import { renderTier } from '../domain/effectDesc';
import type { ModRef } from '../domain/build';
import { TierDesc } from './EffectDescText';

interface Props {
  slot: EquipmentSlot;
  index: number;
  value: ModRef | null;
  /** Slot-resolved skills (used for the 3 primary + 2 auxiliary indices). */
  primarySkill: string;
  auxSkill: string;
  /** Build-level skills. The flex slot always pulls from these, ignoring per-slot overrides. */
  buildPrimarySkill: string;
  buildAuxSkill: string;
  maxSkillLevel: number;
  mods: ModifierMap;
  attrs: AttributeMap;
  onChange: (mod: ModRef | null) => void;
}

export function ModifierPicker({
  slot, index, value, primarySkill, auxSkill, buildPrimarySkill, buildAuxSkill,
  maxSkillLevel, mods, attrs, onChange,
}: Props) {
  // Flex slot (index 5) mirrors the two build-level skill choices, not the per-slot overrides.
  const effectivePrimary = index >= 5 ? buildPrimarySkill : primarySkill;
  const effectiveAux = index >= 5 ? buildAuxSkill : auxSkill;
  const pools = allowedPoolForModIndex(index);
  const activePool: PoolKind = value?.pool ?? pools[0];
  // When a mod is selected we collapse the dropdowns; "Edit" reopens them.
  const [editing, setEditing] = useState(false);
  const isSelected = !!value?.powerId;
  const showPicker = editing || !isSelected;

  const options = useMemo(() => {
    if (!effectivePrimary && activePool === 'primary') return [];
    if (!effectiveAux && activePool === 'auxiliary') return [];
    const list = filterModifiers(mods, slot, activePool, {
      primarySkill: effectivePrimary,
      auxSkill: effectiveAux,
    });
    // Label each option by its highest-allowed tier's EffectDescs (cleaned).
    return list.map(({ id, mod }) => {
      const picked = pickModifierTier(mod, maxSkillLevel);
      const label = picked
        ? renderTier(picked.tier, attrs).filter(Boolean).join(' · ')
        : mod.InternalName;
      return { id, mod, label: label || mod.InternalName };
    });
  }, [mods, slot, activePool, effectivePrimary, effectiveAux, attrs, maxSkillLevel]);

  const current = value ? mods[value.powerId] : undefined;
  const resolved = current ? pickModifierTier(current, maxSkillLevel) : undefined;

  return (
    <div style={{ border: '1px solid #2a2f38', borderRadius: 4, padding: 6 }}>
      {showPicker && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {pools.length > 1 && (
            <select
              value={activePool}
              onChange={(e) => onChange({ powerId: '', pool: e.target.value as PoolKind })}
            >
              {pools.map((p) => {
                const label =
                  p === 'primary'   ? (effectivePrimary || 'primary') :
                  p === 'auxiliary' ? (effectiveAux || 'auxiliary') :
                  p === 'generic'   ? 'Generic' :
                  /* shamanic */     'Shamanic';
                return <option key={p} value={p}>{label}</option>;
              })}
            </select>
          )}
          <select
            value={value?.powerId ?? ''}
            onChange={(e) => {
              onChange(e.target.value ? { powerId: e.target.value, pool: activePool } : null);
              if (e.target.value) setEditing(false);
            }}
            style={{ flex: 1 }}
          >
            <option value="">— empty ({
              activePool === 'primary'   ? (effectivePrimary || 'primary') :
              activePool === 'auxiliary' ? (effectiveAux || 'auxiliary') :
              activePool === 'generic'   ? 'Generic' :
              'Shamanic'
            }) —</option>
            {options.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          {isSelected && editing && (
            <button onClick={() => setEditing(false)}>Done</button>
          )}
        </div>
      )}
      {resolved && !showPicker && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="muted" style={{ fontSize: 11, flex: 1 }}>
            <TierDesc tier={resolved.tier} attrs={attrs} iconSize={32} />
          </div>
          <button onClick={() => setEditing(true)}>Edit</button>
          <button onClick={() => onChange(null)}>×</button>
        </div>
      )}
    </div>
  );
}
