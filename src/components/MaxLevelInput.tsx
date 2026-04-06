interface Props {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max?: number;
}
export function MaxLevelInput({ label, value, onChange, max = 125 }: Props) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="muted">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        style={{ width: 80 }}
      />
    </label>
  );
}
