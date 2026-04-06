import type { Ability, AttributeMap, ModifierMap } from '../cdn/types';
import { getRelevantMods, getSkillWideMods } from '../domain/abilityModIndex';
import { pickModifierTier } from '../domain/tierResolver';
import { Icon } from './Icon';
import { EffectDescText } from './EffectDescText';
import { stripInlineTags } from '../domain/effectDesc';

interface Props {
  ability: Ability;
  mods: ModifierMap;
  attrs: AttributeMap;
  abilityModIndex: Map<string, string[]>;
  maxSkillLevel: number;
  equippedCounts: Map<string, number>;
}

export function AbilityTooltip({ ability, mods, attrs, abilityModIndex, maxSkillLevel, equippedCounts }: Props) {
  const directAll = getRelevantMods(ability, abilityModIndex, mods);
  const skillWideAll = getSkillWideMods(ability.Skill, mods);
  // Show only equipped mods, duplicated per equipped instance.
  const expand = <T extends { id: string }>(arr: T[]) =>
    arr.flatMap((x) => {
      const n = equippedCounts.get(x.id) ?? 0;
      return Array.from({ length: n }, () => x);
    });
  const direct = expand(directAll);
  const skillWide = expand(skillWideAll);

  return (
    <div className="tooltip">
      <div style={{ fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Icon id={ability.IconID} size={64} />
        <span>{ability.Name} <span className="muted">· L{ability.Level}</span></span>
      </div>
      <div className="muted" style={{ marginBottom: 4 }}>{ability.Skill} · {ability.DamageType ?? ''}</div>
      {ability.Description && <div style={{ marginBottom: 4 }}>{ability.Description}</div>}
      {ability.PvE && (
        <div className="muted" style={{ marginBottom: 4 }}>
          {ability.PvE.Damage !== undefined && <>Dmg {ability.PvE.Damage} · </>}
          {ability.PvE.PowerCost !== undefined && <>Pow {ability.PvE.PowerCost} · </>}
          {ability.PvE.RageCost !== undefined && <>Rage {ability.PvE.RageCost} · </>}
          {ability.PvE.Range !== undefined && <>Rng {ability.PvE.Range}</>}
        </div>
      )}
      {(ability.Keywords ?? []).map((k) => <span key={k} className="tag">{k}</span>)}

      {direct.length > 0 && (
        <>
          <div style={{ marginTop: 6, fontWeight: 600 }}>Equipped direct modifiers</div>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {direct.map(({ id, mod }, i) => {
              const picked = pickModifierTier(mod, maxSkillLevel);
              const descs = (picked?.tier.EffectDescs ?? []).map(stripInlineTags);
              return (
                <li key={`${id}-${i}`} className="muted" style={{ fontSize: 11 }}>
                  <EffectDescText descs={descs} attrs={attrs} iconSize={0} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      {skillWide.length > 0 && (
        <>
          <div style={{ marginTop: 6, fontWeight: 600 }}>Equipped skill-wide modifiers</div>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {skillWide.map(({ id, mod }, i) => {
              const picked = pickModifierTier(mod, maxSkillLevel);
              const descs = (picked?.tier.EffectDescs ?? []).map(stripInlineTags);
              return (
                <li key={`${id}-${i}`} className="muted" style={{ fontSize: 11 }}>
                  <EffectDescText descs={descs} attrs={attrs} iconSize={0} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
