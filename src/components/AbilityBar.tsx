import { useMemo, useState } from 'react';
import type { AttributeMap, ModifierMap } from '../cdn/types';
import type { AbilityChain } from '../domain/skills';
import { pickAbilityTier } from '../domain/tierResolver';
import { AbilityTooltip } from './AbilityTooltip';
import { Icon } from './Icon';

interface Props {
  label: string;
  chains: AbilityChain[];
  selected: Array<string | null>;         // length 6, base InternalName per slot
  maxLevel: number;
  maxSkillLevel: number;
  onChange: (idx: number, baseInternalName: string | null) => void;
  mods: ModifierMap;
  attrs: AttributeMap;
  abilityModIndex: Map<string, string[]>;
  equippedCounts: Map<string, number>;
}

export function AbilityBar({
  label, chains, selected, maxLevel, maxSkillLevel, onChange, mods, attrs, abilityModIndex, equippedCounts,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const byBase = useMemo(() => new Map(chains.map((c) => [c.baseInternalName, c])), [chains]);

  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 8 }}>{label}</div>
      <div className="bar">
        {selected.map((base, i) => {
          const chain = base ? byBase.get(base) : undefined;
          const resolved = chain ? pickAbilityTier(chain, maxLevel) : undefined;
          return (
            <div key={i} style={{ position: 'relative' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <select
                value={base ?? ''}
                onChange={(e) => onChange(i, e.target.value || null)}
                style={{ width: '100%' }}
              >
                <option value="">— empty —</option>
                {chains.map((c) => (
                  <option key={c.baseInternalName} value={c.baseInternalName}>{c.name}</option>
                ))}
              </select>
              {resolved && (
                <div className="muted" style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Icon id={resolved.IconID} size={64} title={resolved.Name} />
                  <span>{resolved.Name} (L{resolved.Level ?? 0})</span>
                </div>
              )}
              {hover === i && resolved && (
                <div style={{ position: 'absolute', top: '100%', left: 0 }}>
                  <AbilityTooltip
                    ability={resolved}
                    mods={mods}
                    attrs={attrs}
                    abilityModIndex={abilityModIndex}
                    maxSkillLevel={maxSkillLevel}
                    equippedCounts={equippedCounts}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
