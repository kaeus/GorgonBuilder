interface Props {
  rarity?: string;
}

// Only surface the non-default rarities — Uncommon/Common are the baseline and
// cluttering every row with "Uncommon" isn't useful.
const COLORS: Record<string, string> = {
  Rare: '#7cc4ff',
  Exceptional: '#ffb347',
  Epic: '#c98bff',
  Legendary: '#ffd54a',
};

export function RarityBadge({ rarity }: Props) {
  if (!rarity) return null;
  if (rarity === 'Uncommon' || rarity === 'Common') return null;
  const color = COLORS[rarity] ?? '#e6eaf0';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        color,
        border: `1px solid ${color}`,
        whiteSpace: 'nowrap',
      }}
      title={`Requires ${rarity}+ gear`}
    >
      {rarity}+
    </span>
  );
}
