import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBuild } from '../firestore/builds';
import { useAuth } from '../firebase/auth';
import { useCdnData } from '../cdn/queries';
import { EQUIPMENT_SLOTS } from '../cdn/types';
import { buildSkillIndex, combatSkillNames, type AbilityChain } from '../domain/skills';
import { buildAbilityModIndex } from '../domain/abilityModIndex';
import { equippedPowerIdCounts } from '../domain/build';
import { pickAbilityTier, pickModifierTier } from '../domain/tierResolver';
import { Icon } from '../components/Icon';
import { AbilityTooltip } from '../components/AbilityTooltip';
import { EffectDescText } from '../components/EffectDescText';

export default function BuildViewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const cdn = useCdnData();
  const q = useQuery({ queryKey: ['build', id], queryFn: () => fetchBuild(id!), enabled: !!id });

  const { chainsBySkill } = useMemo(
    () => cdn.data
      ? buildSkillIndex(cdn.data.abilities, combatSkillNames(cdn.data.skills))
      : { chainsBySkill: new Map<string, AbilityChain[]>(), skillNames: [] as string[] },
    [cdn.data],
  );
  const abilityModIndex = useMemo(
    () => cdn.data ? buildAbilityModIndex(cdn.data.modifiers, cdn.data.abilities) : new Map<string, string[]>(),
    [cdn.data],
  );
  const equipped = useMemo(() => q.data ? equippedPowerIdCounts(q.data) : new Map<string, number>(), [q.data]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  if (q.isLoading || cdn.isLoading) return <div>Loading…</div>;
  if (!q.data || !cdn.data) return <div>Not found.</div>;

  const b = q.data;
  const mine = user?.uid === b.ownerUid;
  const { modifiers, attributes, items } = cdn.data;
  // Lookup by InternalName so we can show the base item in each slot.
  const itemByName = new Map<string, typeof items[string]>();
  for (const k in items) itemByName.set(items[k].InternalName, items[k]);
  const primaryChains = chainsBySkill.get(b.primarySkill) ?? [];
  const auxChains = chainsBySkill.get(b.auxSkill) ?? [];

  const renderAbilityRow = (label: string, bases: Array<string | null>, chains: typeof primaryChains, rowKey: string) => {
    const byBase = new Map(chains.map((c) => [c.baseInternalName, c]));
    return (
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="muted" style={{ marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
          {bases.map((base, i) => {
            const chain = base ? byBase.get(base) : undefined;
            const resolved = chain ? pickAbilityTier(chain, b.maxLevel) : undefined;
            const key = `${rowKey}-${i}`;
            return (
              <div
                key={key}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHoverKey(key)}
                onMouseLeave={() => setHoverKey(null)}
              >
                {resolved ? (
                  <Icon id={resolved.IconID} size={64} title={resolved.Name} />
                ) : (
                  <div className="slot" style={{ width: 64, height: 64 }}>—</div>
                )}
                {hoverKey === key && resolved && (
                  <div style={{ position: 'absolute', top: '100%', left: 0 }}>
                    <AbilityTooltip
                      ability={resolved}
                      mods={modifiers}
                      attrs={attributes}
                      abilityModIndex={abilityModIndex}
                      maxSkillLevel={b.maxLevel}
                      equippedCounts={equipped}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2>{b.name}</h2>
      <div className="muted">
        {b.primarySkill} / {b.auxSkill} · L{b.maxLevel}
        {b.ownerUsername && <> · by {b.ownerUsername}</>}
      </div>
      {mine && <Link to={`/builds/${id}/edit`}>Edit</Link>}

      <h3>Abilities</h3>
      {renderAbilityRow(b.primarySkill || 'Primary', b.primaryAbilities, primaryChains, 'p')}
      {renderAbilityRow(b.auxSkill || 'Auxiliary', b.auxAbilities, auxChains, 'a')}

      <h3>Equipment</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-12px' }}>
        {EQUIPMENT_SLOTS.map((slot) => {
          const entry = b.equipment[slot];
          const baseItem = entry.itemInternalName ? itemByName.get(entry.itemInternalName) : undefined;
          return (
            <div
              key={slot}
              className="card"
              style={{ flex: '1 1 calc(50% - 24px)', margin: 12, minWidth: 0, boxSizing: 'border-box' }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{slot}</div>
              {baseItem && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <Icon id={baseItem.IconId} size={28} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{baseItem.Name}</div>
                  </div>
                  {baseItem.EffectDescs && baseItem.EffectDescs.length > 0 && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      <EffectDescText descs={baseItem.EffectDescs} attrs={attributes} iconSize={16} stacked />
                    </div>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid #2a2f38', margin: '8px 0 0' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entry.mods.map((m, i) => {
                  if (!m) return <div key={i} className="muted" style={{ fontSize: 11 }}>—</div>;
                  const mod = modifiers[m.powerId];
                  if (!mod) return <div key={i} className="muted" style={{ fontSize: 11 }}>[unknown mod]</div>;
                  const picked = pickModifierTier(mod, b.maxLevel);
                  // Keep inline <icon=N> tags so the effect text renders its own icons (matches editor).
                  const descs = picked?.tier.EffectDescs ?? [];
                  return (
                    <div
                      key={i}
                      className="muted"
                      style={{ fontSize: 13, display: 'flex', alignItems: 'center', minHeight: 36 }}
                    >
                      <EffectDescText descs={descs} attrs={attributes} iconSize={32} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {b.notes && <><h3>Notes</h3><p style={{ whiteSpace: 'pre-wrap' }}>{b.notes}</p></>}
    </div>
  );
}
