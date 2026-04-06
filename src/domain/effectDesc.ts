import type { AttributeMap, ModifierTier } from '../cdn/types';

// EffectDescs come in as strings like "{BOOST_SKILL_ARCHERY}{5}" — sometimes the
// token alone, sometimes token+value pair, sometimes multiple per string.
// We normalize each string into an array of { token, value? } segments.
export interface EffectSegment {
  token: string;
  value?: number;
}

const TOKEN_RE = /\{([A-Z0-9_]+)\}(?:\{(-?\d+(?:\.\d+)?)\})?/g;

export function parseEffectDesc(desc: string): EffectSegment[] {
  const out: EffectSegment[] = [];
  for (const m of desc.matchAll(TOKEN_RE)) {
    out.push({ token: m[1], value: m[2] !== undefined ? Number(m[2]) : undefined });
  }
  return out;
}

/** Strip in-line HTML-ish tags PG uses inside plain-text EffectDescs (e.g. <icon=108>). */
export function stripInlineTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

/**
 * Split a plain-text effectdesc into segments of { text } and { icon } pieces,
 * recognizing <icon=NNN> tags. Other <...> tags are dropped.
 */
export type PlainSegment = { kind: 'text'; text: string } | { kind: 'icon'; id: number };
export function splitPlainEffectDesc(desc: string): PlainSegment[] {
  const out: PlainSegment[] = [];
  const re = /<([^>]+)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(desc)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: desc.slice(last, m.index) });
    const iconMatch = /^icon=(\d+)$/i.exec(m[1]);
    if (iconMatch) out.push({ kind: 'icon', id: Number(iconMatch[1]) });
    // else: unknown tag — drop it.
    last = m.index + m[0].length;
  }
  if (last < desc.length) out.push({ kind: 'text', text: desc.slice(last) });
  return out;
}

function formatValue(v: number, displayType?: string): string {
  switch (displayType) {
    case 'AsInt':
      return Math.round(v).toString();
    case 'AsDoubleTimes100':
      return `${Math.round(v * 100)}%`;
    case 'AsBuffDelta':
      return (v >= 0 ? '+' : '') + v;
    case 'AsBuffMod':
    case 'AsDebuffMod': {
      const pct = Math.round(v * 100);
      return `${pct >= 0 ? '+' : ''}${pct}%`;
    }
    default:
      if (v > 0 && v < 1) return `${Math.round(v * 100)}%`;
      return String(v);
  }
}

/** Render an EffectDesc string into a human-readable label using attributes.json. */
export function renderEffectDesc(desc: string, attrs: AttributeMap): string {
  const segs = parseEffectDesc(desc);
  // Plain-text descs (no {TOKEN}) just need their inline tags stripped.
  if (segs.length === 0) return stripInlineTags(desc);
  return segs
    .map((s) => {
      const a = attrs[s.token];
      const label = a?.Label ?? s.token;
      if (s.value === undefined) return label;
      return `${label}: ${formatValue(s.value, a?.DisplayType)}`;
    })
    .join(' · ');
}

export function renderTier(tier: ModifierTier, attrs: AttributeMap): string[] {
  return (tier.EffectDescs ?? []).map((d) => renderEffectDesc(d, attrs));
}
