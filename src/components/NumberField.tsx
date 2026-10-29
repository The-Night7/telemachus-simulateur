import { useEffect, useState } from 'react';

// Champ numérique qui laisse taper librement (champ vide, "9." en cours de saisie…)
// et ne transmet que des valeurs valides, bornées à [min, max]. À la sortie du champ,
// le texte est recalé sur la valeur retenue.
export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (parseFloat(text.replace(',', '.')) !== value) setText(String(value));
    // Seule une valeur venue de l'extérieur (annuler, changement de système…) doit
    // réécrire le texte, pas chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div>
      <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        step={step}
        min={min}
        max={max}
        onChange={e => {
          setText(e.target.value);
          const n = parseFloat(e.target.value.replace(',', '.'));
          if (Number.isFinite(n) && n >= min && n <= max) onChange(clamp(n));
        }}
        onBlur={() => {
          const n = parseFloat(text.replace(',', '.'));
          const next = Number.isFinite(n) ? clamp(n) : value;
          setText(String(next));
          if (next !== value) onChange(next);
        }}
        className="w-full bg-neutral-950 text-neutral-200 text-lg font-bold py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
      />
    </div>
  );
}
