import { useMemo, useState } from 'react';
import type { AttributeMap, ModifierMap } from '../cdn/types';
import type { AbilityChain } from '../domain/skills';
import { pickAbilityTier } from '../domain/tierResolver';
import { Icon } from './Icon';
import { AbilitySelect } from './AbilitySelect';
import { AbilityTooltip } from './AbilityTooltip';

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
  label, chains, selected, maxLevel, maxSkillLevel, onChange,
  mods, attrs, abilityModIndex, equippedCounts,
}: Props) {
  const byBase = useMemo(() => new Map(chains.map((c) => [c.baseInternalName, c])), [chains]);
  const [hoverIcon, setHoverIcon] = useState<number | null>(null);

  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 8 }}>{label}</div>
      <div className="bar">
        {selected.map((base, i) => {
          const chain = base ? byBase.get(base) : undefined;
          const resolved = chain ? pickAbilityTier(chain, maxLevel) : undefined;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <AbilitySelect
                chains={chains}
                value={base}
                maxLevel={maxLevel}
                onChange={(b) => onChange(i, b)}
              />
              {resolved && (
                <div
                  className="muted"
                  style={{ fontSize: 13, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}
                  onMouseEnter={() => setHoverIcon(i)}
                  onMouseLeave={() => setHoverIcon(null)}
                >
                  <Icon id={resolved.IconID} size={64} title={resolved.Name} />
                  <span>{resolved.Name} (L{resolved.Level ?? 0})</span>
                  {hoverIcon === i && (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
