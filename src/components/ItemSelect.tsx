import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttributeMap, EquipmentSlot, Item, ItemMap } from '../cdn/types';
import { isHiddenItem } from '../domain/itemFilters';
import { Icon } from './Icon';
import { EffectDescText } from './EffectDescText';

interface Props {
  items: ItemMap;
  slot: EquipmentSlot;
  value: string | null;   // selected Item.InternalName
  attrs: AttributeMap;
  onChange: (internalName: string | null) => void;
}

/**
 * Combobox for picking a base item template for an equipment slot. Filters items.json by
 * `EquipSlot === slot` (and also accepts OffHandShield when slot === OffHand). Searches
 * by item Name only.
 */
export function ItemSelect({ items, slot, value, attrs, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const id in items) {
      const it = items[id];
      if (!it.EquipSlot) continue;
      if (isHiddenItem(it)) continue;
      if (it.EquipSlot === slot) out.push(it);
      else if (slot === 'OffHand' && it.EquipSlot === 'OffHandShield') out.push(it);
    }
    out.sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''));
    return out;
  }, [items, slot]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((it) => (it.Name ?? '').toLowerCase().includes(q));
  }, [options, query]);

  const selected = useMemo(() => {
    if (!value) return undefined;
    // value is InternalName — find the matching item.
    for (const id in items) {
      if (items[id].InternalName === value) return items[id];
    }
    return undefined;
  }, [items, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const pick = (name: string | null) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '4px 6px',
          background: '#22262e',
          border: '1px solid #2a2f38',
          borderRadius: 4,
          color: 'inherit',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 32,
        }}
      >
        {selected ? (
          <>
            <Icon id={selected.IconId} size={24} />
            <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.Name}
              {selected.CraftingTargetLevel !== undefined && (
                <span className="muted" style={{ fontWeight: 400 }}> · L{selected.CraftingTargetLevel}</span>
              )}
            </span>
          </>
        ) : (
          <span className="muted" style={{ flex: 1, fontSize: 14 }}>— no base item —</span>
        )}
        <span className="muted" style={{ fontSize: 10 }}>▾</span>
      </button>

      {selected?.EffectDescs && selected.EffectDescs.length > 0 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4, paddingLeft: 6 }}>
          <EffectDescText descs={selected.EffectDescs} attrs={attrs} iconSize={16} />
        </div>
      )}

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 2,
            background: '#0f1115',
            border: '1px solid #3a414c',
            borderRadius: 6,
            zIndex: 40,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 360,
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid #2a2f38' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${slot} items…`}
              style={{ width: '100%', padding: '4px 6px', background: '#22262e', border: '1px solid #2a2f38', color: 'inherit', borderRadius: 4 }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <Row selected={value === null} onClick={() => pick(null)} label="— no base item —" />
            {filtered.map((it) => (
              <Row
                key={it.InternalName}
                iconId={it.IconId}
                label={it.Name}
                level={it.CraftingTargetLevel}
                selected={value === it.InternalName}
                onClick={() => pick(it.InternalName)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="muted" style={{ padding: 8, fontSize: 12 }}>No matches.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  iconId?: number;
  label: string;
  level?: number;
  selected: boolean;
  onClick: () => void;
}
function Row({ iconId, label, level, selected, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 8px',
        background: selected ? '#2a3340' : 'transparent',
        border: 'none',
        borderBottom: '1px solid #1e2228',
        color: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = '#1a1f27'; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {iconId ? <Icon id={iconId} size={28} /> : <div style={{ width: 28, height: 28 }} />}
      <span style={{ fontSize: 13, flex: 1 }}>
        {label}
        {level !== undefined && <span className="muted" style={{ marginLeft: 6 }}>· L{level}</span>}
      </span>
    </button>
  );
}
