import { useEffect, useRef, useState } from 'react';
import type { AbilityChain } from '../domain/skills';
import { pickAbilityTier } from '../domain/tierResolver';
import { Icon } from './Icon';

interface Props {
  chains: AbilityChain[];
  value: string | null;   // selected baseInternalName
  maxLevel: number;
  onChange: (baseInternalName: string | null) => void;
}

/**
 * Custom combobox for picking an ability. Unlike a native <select>, each option renders
 * with the ability's icon, name, and description so the player can see what they're picking.
 */
export function AbilitySelect({ chains, value, maxLevel, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve each chain once against the current max level so labels/icons reflect tier selection.
  const rows = chains.map((c) => {
    const tier = pickAbilityTier(c, maxLevel);
    return { chain: c, tier };
  });
  const filtered = query.trim()
    ? rows.filter(({ chain, tier }) => {
        const q = query.toLowerCase();
        return (
          chain.name.toLowerCase().includes(q) ||
          (tier?.Description ?? '').toLowerCase().includes(q)
        );
      })
    : rows;

  const selectedRow = rows.find((r) => r.chain.baseInternalName === value);

  // Close on outside click / Escape.
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

  // Focus the search box when opening.
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const pick = (base: string | null) => {
    onChange(base);
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
          minHeight: 28,
        }}
      >
        {selectedRow?.tier ? (
          <>
            <Icon id={selectedRow.tier.IconID} size={24} />
            <span style={{ flex: 1, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedRow.chain.name}
            </span>
          </>
        ) : (
          <span className="muted" style={{ flex: 1, fontSize: 14 }}>— empty —</span>
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
            maxHeight: 360,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 320,
          }}
        >
          <div style={{ padding: 6, borderBottom: '1px solid #2a2f38' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search abilities…"
              style={{ width: '100%', padding: '4px 6px', background: '#22262e', border: '1px solid #2a2f38', color: 'inherit', borderRadius: 4 }}
            />
          </div>
          <div style={{ overflowY: 'auto' }}>
            <Row
              label="— empty —"
              desc=""
              onClick={() => pick(null)}
              selected={value === null}
            />
            {filtered.map(({ chain, tier }) => (
              <Row
                key={chain.baseInternalName}
                iconId={tier?.IconID}
                label={chain.name}
                level={tier?.Level}
                desc={tier?.Description ?? ''}
                onClick={() => pick(chain.baseInternalName)}
                selected={value === chain.baseInternalName}
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
  desc: string;
  selected: boolean;
  onClick: () => void;
}
function Row({ iconId, label, level, desc, selected, onClick }: RowProps) {
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
      {iconId ? <Icon id={iconId} size={32} /> : <div style={{ width: 32, height: 32 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {label}
          {level !== undefined && <span className="muted" style={{ fontWeight: 400 }}> · L{level}</span>}
        </div>
        {desc && (
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: 'normal' }}>
            {desc}
          </div>
        )}
      </div>
    </button>
  );
}
