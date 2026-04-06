import type { Ability, AttributeMap, ModifierMap } from '../cdn/types';
import { getRelevantMods, getSkillWideMods } from '../domain/abilityModIndex';
import { pickModifierTier } from '../domain/tierResolver';
import { damageColor } from '../domain/damageColors';
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
      <div className="muted" style={{ marginBottom: 4 }}>
        {ability.Skill}
        {ability.DamageType && (
          <> · <span style={{ color: damageColor(ability.DamageType) ?? 'inherit', fontWeight: 600 }}>{ability.DamageType}</span></>
        )}
      </div>
      {ability.Description && <div style={{ marginBottom: 4 }}>{ability.Description}</div>}
      {ability.PvE && (
        <div className="muted" style={{ marginBottom: 4 }}>
          {ability.PvE.Damage !== undefined && (
            <>Damag <span style={{ color: damageColor(ability.DamageType) ?? 'inherit', fontWeight: 600 }}>{ability.PvE.Damage}</span> · </>
          )}
          {ability.PvE.PowerCost !== undefined && <>Power {ability.PvE.PowerCost} · </>}
          {ability.PvE.RageCost !== undefined && <>Rage {ability.PvE.RageCost} · </>}
          {ability.PvE.Range !== undefined && <>Range {ability.PvE.Range}</>}
        </div>
      )}
      {ability.PvE?.SpecialValues && ability.PvE.SpecialValues.length > 0 && (
        <ul style={{ margin: '0 0 4px 16px', padding: 0, fontSize: 12 }}>
          {ability.PvE.SpecialValues
            .filter((sv) => !(sv.SkipIfZero && (sv.Value ?? 0) === 0))
            .map((sv, i) => (
              <li key={i}>
                {sv.Label ? `${sv.Label} ` : ''}
                {sv.Value !== undefined ? <strong>{sv.Value}</strong> : null}
                {sv.Suffix ? ` ${sv.Suffix}` : ''}
              </li>
            ))}
        </ul>
      )}
      {ability.SpecialInfo && (
        <div className="muted" style={{ marginBottom: 4, fontSize: 12 }}>{ability.SpecialInfo}</div>
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
