import { useEffect, useMemo, useRef, useState } from 'react';
import type { AttributeMap, Modifier } from '../cdn/types';
import { renderTier } from '../domain/effectDesc';
import { pickModifierTier } from '../domain/tierResolver';
import { TierDesc } from './EffectDescText';

export interface ModOption {
  id: string;
  mod: Modifier;
  /** Canonicalized label for search (rendered tier text). */
  label: string;
}

interface Props {
  options: ModOption[];
  value: string | null;   // selected powerId
  attrs: AttributeMap;
  maxSkillLevel: number;
  placeholder?: string;
  onChange: (powerId: string | null) => void;
}

/**
 * Custom combobox for picking a modifier. Each option renders as the modifier's
 * resolved tier effect text (with inline icons), and a search box filters by
 * substring match against the rendered text.
 */
export function ModifierSelect({ options, value, attrs, maxSkillLevel, placeholder, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.id === value);
  const selectedTier = selected ? pickModifierTier(selected.mod, maxSkillLevel) : undefined;

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

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 1 }}>
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
          minHeight: 28,
        }}
      >
        {selectedTier ? (
          <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <TierDesc tier={selectedTier.tier} attrs={attrs} iconSize={20} />
          </span>
        ) : (
          <span className="muted" style={{ flex: 1, fontSize: 13 }}>{placeholder ?? '— empty —'}</span>
        )}
        <span className="muted" style={{ fontSize: 10 }}>▾</span>
      </button>

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
              placeholder="Search modifiers…"
              style={{ width: '100%', padding: '4px 6px', background: '#22262e', border: '1px solid #2a2f38', color: 'inherit', borderRadius: 4 }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <ModRow
              selected={value === null}
              onClick={() => pick(null)}
              content={<span className="muted" style={{ fontSize: 13 }}>— empty —</span>}
            />
            {filtered.map((o) => {
              const tier = pickModifierTier(o.mod, maxSkillLevel);
              return (
                <ModRow
                  key={o.id}
                  selected={value === o.id}
                  onClick={() => pick(o.id)}
                  content={
                    <span style={{ fontSize: 13 }}>
                      {tier
                        ? <TierDesc tier={tier.tier} attrs={attrs} iconSize={24} />
                        : o.mod.InternalName}
                    </span>
                  }
                />
              );
            })}
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
  selected: boolean;
  onClick: () => void;
  content: React.ReactNode;
}
function ModRow({ selected, onClick, content }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
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
      <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
    </button>
  );
}

/** Convenience: shape the raw filterModifiers output into ModOption[] with labels. */
export function toModOptions(
  list: Array<{ id: string; mod: Modifier }>,
  attrs: AttributeMap,
  maxSkillLevel: number,
): ModOption[] {
  return list.map(({ id, mod }) => {
    const picked = pickModifierTier(mod, maxSkillLevel);
    const label = picked
      ? renderTier(picked.tier, attrs).filter(Boolean).join(' · ')
      : mod.InternalName;
    return { id, mod, label: label || mod.InternalName };
  });
}
