import type { Item } from '../cdn/types';

/**
 * InternalName prefixes of items that should never appear in the item picker.
 * These are placeholder / unused / debug templates that leak into items.json but
 * aren't real in-game gear. Add new prefixes here as they're discovered.
 */
export const HIDDEN_ITEM_PREFIXES: string[] = [
  'DarkElfPlate',
];

/** True if this item should be hidden from equipment pickers. */
export function isHiddenItem(item: Item): boolean {
  const name = item.InternalName ?? '';
  return HIDDEN_ITEM_PREFIXES.some((prefix) => name.startsWith(prefix));
}
