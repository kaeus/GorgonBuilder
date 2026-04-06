interface Props {
  label: string;
  value: string;
  skills: string[];
  onChange: (v: string) => void;
  disabledValue?: string;
}

export function SkillPicker({ label, value, skills, onChange, disabledValue }: Props) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— choose —</option>
        {skills.map((s) => (
          <option key={s} value={s} disabled={s === disabledValue}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
