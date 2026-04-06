import type { AttributeMap, ModifierTier } from '../cdn/types';
import { parseEffectDesc, splitPlainEffectDesc } from '../domain/effectDesc';
import { Icon } from './Icon';

function formatValue(v: number, displayType?: string): string {
  switch (displayType) {
    case 'AsInt':
      return Math.round(v).toString();
    case 'AsDoubleTimes100':
      return `${Math.round(v * 100)}%`;
    case 'AsBuffDelta':
      return (v >= 0 ? '+' : '') + v;
    case 'AsBuffMod': {
      // In EffectDescs, the value is stored as a delta from the default (1.0).
      // e.g. 0.07 → "+7%", -0.1 → "-10%".
      const pct = Math.round(v * 100);
      return `${pct >= 0 ? '+' : ''}${pct}%`;
    }
    case 'AsDebuffMod': {
      // Same delta-from-default convention, but negative means damage reduction.
      const pct = Math.round(v * 100);
      return `${pct >= 0 ? '+' : ''}${pct}%`;
    }
    default:
      // Fallback heuristic: values strictly between 0 and 1 are almost always fractional percentages.
      if (v > 0 && v < 1) return `${Math.round(v * 100)}%`;
      return String(v);
  }
}

interface Props {
  descs: string[] | undefined;
  attrs: AttributeMap;
  iconSize?: number;
}

/** Render a list of EffectDesc strings as JSX, inlining <icon=NNN> tags as <img>. */
export function EffectDescText({ descs, attrs, iconSize = 64 }: Props) {
  const showIcons = iconSize > 0;
  if (!descs || descs.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minWidth: 0 }}>
      {descs.map((desc, i) => {
        // Token-based desc like "{BOOST_SKILL_ARCHERY}{5}" → label + formatted value.
        const tokens = parseEffectDesc(desc);
        if (tokens.length > 0) {
          return (
            <span key={i} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
              {tokens.map((t, j) => {
                const a = attrs[t.token];
                const label = a?.Label ?? t.token;
                const iconId = a?.IconIds?.[0];
                return (
                  <span key={j} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                    {showIcons && iconId && <Icon id={iconId} size={iconSize} />}
                    <span>{label}{t.value !== undefined ? `: ${formatValue(t.value, a?.DisplayType)}` : ''}</span>
                  </span>
                );
              })}
              {i < descs.length - 1 && <span className="muted"> · </span>}
            </span>
          );
        }
        // Plain-text desc with inline <icon=NNN> tags.
        const segs = splitPlainEffectDesc(desc);
        return (
          <span key={i} style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            {segs.map((s, j) =>
              s.kind === 'icon'
                ? (showIcons ? <Icon key={j} id={s.id} size={iconSize} /> : null)
                : <span key={j}>{s.text}</span>,
            )}
            {i < descs.length - 1 && <span className="muted"> · </span>}
          </span>
        );
      })}
    </span>
  );
}

/** Convenience wrapper for a modifier tier object. */
export function TierDesc({ tier, attrs, iconSize }: { tier: ModifierTier; attrs: AttributeMap; iconSize?: number }) {
  return <EffectDescText descs={tier.EffectDescs} attrs={attrs} iconSize={iconSize} />;
}
