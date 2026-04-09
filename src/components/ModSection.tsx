import type { ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

/** Small fieldset-style section used to group modifier rows by pool. */
export function ModSection({ label, children }: Props) {
  return (
    <fieldset
      style={{
        border: '1px solid #2a2f38',
        borderRadius: 6,
        padding: '6px 8px 8px',
        margin: 0,
      }}
    >
      <legend
        className="muted"
        style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 4px' }}
      >
        {label}
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </fieldset>
  );
}
