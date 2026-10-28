import { ReactNode, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return (
    <section className="sec">
      <button className="sec-h" onClick={() => setO(!o)} aria-expanded={o}>
        <span>{title}</span><ChevronDown size={16} className={o ? '' : 'rot'} />
      </button>
      {o && <div className="sec-b">{children}</div>}
    </section>
  );
}

interface NumProps { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (n: number) => void; disabled?: boolean; hint?: string }
// Typed value is only applied when valid; invalid input shows a message and is never silently altered.
export function NumField({ label, value, min, max, step = 1, unit, onChange, disabled, hint }: NumProps) {
  const [t, setT] = useState(String(value));
  const [bad, setBad] = useState<string | null>(null);
  useEffect(() => { setT(p => (Number(p) === value ? p : String(value))); if (Number(t) !== value) setBad(null); }, [value]);
  const commit = (s: string) => {
    setT(s); const n = Number(s);
    if (s.trim() === '' || !Number.isFinite(n)) return setBad('Enter a number');
    if (n < min || n > max) return setBad(`Allowed range: ${min} to ${max} ${unit}`);
    setBad(null); onChange(n);
  };
  return (
    <div className={'nf' + (disabled ? ' off' : '')}>
      <div className="nf-top">
        <label>{label}</label>
        <div className={'nf-in' + (bad ? ' err' : '')}>
          <input type="number" inputMode="decimal" value={t} min={min} max={max} step={step} disabled={disabled}
            onChange={e => commit(e.target.value)} onBlur={() => { setT(String(value)); setBad(null); }} />
          <span>{unit}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} />
      {bad ? <div className="bad">{bad}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
