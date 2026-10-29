import { Download, GitCompare, X } from 'lucide-react';
import { STAT_KEYS, type Simulation, type StatKey } from '../lib/simulation';

export interface CompareRow {
  id: string;
  name: string;
  color: string;
  sim: Simulation;
}

const STAT_LABELS: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  trick: 'Trick',
  recovery: 'Recovery',
  defense: 'Defense',
};

// Tableau "tout contre tout" : le build actuel et chaque build comparé, tous simulés au
// niveau affiché. La meilleure valeur de chaque colonne est mise en avant, et chaque
// stat d'un build comparé indique son écart avec le build actuel.
export function CompareTable({
  current,
  rows,
  onRemove,
  onClear,
  onExportPng,
}: {
  current: CompareRow;
  rows: CompareRow[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onExportPng: () => void;
}) {
  const all = [current, ...rows];
  const best = (value: (row: CompareRow) => number) => Math.max(...all.map(value));
  const bestStat = Object.fromEntries(STAT_KEYS.map(k => [k, best(r => r.sim.statsFinales[k])])) as Record<StatKey, number>;
  const bestEffective = best(r => parseFloat(r.sim.effectiveLevel));
  const bestAura = best(r => r.sim.auraRemaining);
  const isBest = (value: number, max: number) => all.length > 1 && Math.abs(value - max) < 0.05;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-neutral-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
          <GitCompare size={18} />
          Comparaison ({all.length} builds)
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onExportPng}
            title="Exporter le graphique de la comparaison en PNG"
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-yellow-400 transition-colors"
          >
            <Download size={12} />
            PNG
          </button>
          <button
            onClick={onClear}
            className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            Tout retirer
          </button>
        </div>
      </div>
      <p className="text-[11px] text-neutral-500 mb-3">
        Tous les builds sont simulés au niveau affiché ({current.sim.level.toFixed(1)}). En gras : la meilleure valeur de chaque colonne.
      </p>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] text-sm tabular-nums">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-800">
              <th className="text-left font-semibold py-2 pr-3">Build</th>
              {STAT_KEYS.map(k => (
                <th key={k} className="text-right font-semibold py-2 px-2">{STAT_LABELS[k]}</th>
              ))}
              <th className="text-right font-semibold py-2 px-2">Niv eff.</th>
              <th className="text-right font-semibold py-2 px-2">Aura rest.</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {all.map(row => {
              const isCurrent = row.id === current.id;
              const effective = parseFloat(row.sim.effectiveLevel);
              return (
                <tr key={row.id} className="border-b border-neutral-800/60 last:border-0">
                  <td className="py-2 pr-3 max-w-[14rem]">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 w-4 h-0 border-t-2 ${isCurrent ? '' : 'border-dashed'}`}
                        style={{ borderColor: row.color }}
                      />
                      <span className={`truncate ${isCurrent ? 'font-bold text-yellow-400' : 'text-neutral-200'}`} title={row.name}>
                        {row.name}
                      </span>
                    </span>
                    <span className="block pl-6 text-[10px] text-neutral-600 truncate">
                      {row.sim.equippedCaps.length === 0
                        ? 'Aucune capacité'
                        : row.sim.equippedCaps.map(c => c.nom_capacite).join(' · ')}
                    </span>
                  </td>
                  {STAT_KEYS.map(k => {
                    const value = row.sim.statsFinales[k];
                    const delta = value - current.sim.statsFinales[k];
                    return (
                      <td key={k} className="py-2 px-2 text-right align-top">
                        <span className={isBest(value, bestStat[k]) ? 'font-black text-neutral-50' : 'text-neutral-400'}>
                          {value.toFixed(1)}
                        </span>
                        {!isCurrent && Math.abs(delta) >= 0.05 && (
                          <span className={`block text-[10px] font-bold ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-right align-top">
                    <span className={isBest(effective, bestEffective) ? 'font-black text-yellow-400' : 'text-neutral-400'}>
                      {row.sim.effectiveLevel}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right align-top">
                    <span
                      className={
                        row.sim.auraRemaining < 0
                          ? 'text-red-400'
                          : isBest(row.sim.auraRemaining, bestAura)
                            ? 'font-black text-neutral-50'
                            : 'text-neutral-400'
                      }
                      title={row.sim.auraRemaining < 0 ? "Réserve d'aura dépassée à ce niveau" : undefined}
                    >
                      {Math.ceil(row.sim.auraRemaining)}
                    </span>
                    <span className="text-neutral-600 text-[11px]">/{Math.ceil(row.sim.maxAura)}</span>
                  </td>
                  <td className="py-2 text-right align-top">
                    {!isCurrent && (
                      <button
                        onClick={() => onRemove(row.id)}
                        aria-label={`Retirer ${row.name} de la comparaison`}
                        className="p-0.5 text-neutral-600 hover:text-neutral-200"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
