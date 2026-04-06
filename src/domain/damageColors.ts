// Canonical color per PG damage type.
// Keep in sync with any new types added to the game.
export const DAMAGE_COLORS: Record<string, string> = {
  Slashing:    '#c9a37a', // tan
  Piercing:    '#b0b0b0', // silver
  Crushing:    '#cf6e4f', // orange-brown
  Fire:        '#ff7a3c', // orange
  Cold:        '#74c7ff', // ice blue
  Electricity: '#eed84a', // yellow
  Trauma:      '#ff5a5a', // red
  Poison:      '#7cd24a', // green
  Psychic:     '#c98bff', // purple
  Acid:        '#9cff6b', // lime
  Nature:      '#4fb36a', // deep green
  Darkness:    '#a96bd6', // violet
};

/** Case-insensitive lookup; returns undefined for unknown types. */
export function damageColor(type?: string | null): string | undefined {
  if (!type) return undefined;
  const key = Object.keys(DAMAGE_COLORS).find(
    (k) => k.toLowerCase() === type.toLowerCase(),
  );
  return key ? DAMAGE_COLORS[key] : undefined;
}
