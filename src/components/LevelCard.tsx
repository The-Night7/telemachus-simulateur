import type { BuildState, Simulation } from '../lib/simulation';
import { NumberField } from './NumberField';

// Carte niveau : potentiel / maîtrise, tier, amplificateur / déamplificateur de
// Telemachus et taux personnalisé.
export function LevelCard({
  build,
  sim,
  commit,
}: {
  build: BuildState;
  sim: Simulation;
  commit: (next: BuildState, coalesce?: string) => void;
}) {
  const { level, copyLevel, ampOn, deampOn, tierInfo } = sim;
  const { amplified, deamplified, customRateOn, customRateMode, customRate } = build;

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 rounded-2xl shadow-xl border-l-4 border-l-yellow-500">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">
            Niveau Actuel
          </label>
          <div className="text-3xl font-black text-yellow-500 leading-none">
            {level.toFixed(1)}
            {(ampOn || deampOn) && (
              <span className={`ml-1.5 text-lg ${deampOn ? 'text-blue-500' : 'text-red-500'}`}>({copyLevel.toFixed(1)})</span>
            )}
          </div>
          <span className={`mt-2 w-fit text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierInfo.badge}`}>
            {tierInfo.name}
          </span>
        </div>

        <NumberField
          label="Potentiel"
          value={build.potential}
          onChange={potential => commit({ ...build, potential }, 'potential')}
          step={0.1}
          min={1}
          max={10}
        />
        <NumberField
          label="Maîtrise"
          value={build.mastery}
          onChange={mastery => commit({ ...build, mastery }, 'mastery')}
          step={0.1}
          min={1}
          max={10}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-neutral-800">
        <button
          onClick={() => commit({ ...build, amplified: !amplified, deamplified: false })}
          disabled={customRateOn}
          className={`w-fit px-2 py-0.5 text-xs font-bold rounded-full border transition-colors ${
            amplified
              ? 'bg-red-500 text-neutral-950 border-red-500'
              : 'bg-neutral-950 text-red-400 border-neutral-800 hover:border-red-500/50'
          } ${customRateOn ? 'opacity-40 pointer-events-none' : ''}`}
          title="Niveau de Telemachus x1.5 avant la copie"
        >
          Amplificateur ×1.5
        </button>
        <button
          onClick={() => commit({ ...build, deamplified: !deamplified, amplified: false })}
          disabled={customRateOn}
          className={`w-fit px-2 py-0.5 text-xs font-bold rounded-full border transition-colors ${
            deamplified
              ? 'bg-blue-500 text-neutral-950 border-blue-500'
              : 'bg-neutral-950 text-blue-400 border-neutral-800 hover:border-blue-500/50'
          } ${customRateOn ? 'opacity-40 pointer-events-none' : ''}`}
          title="Niveau de Telemachus ÷2 avant la copie"
        >
          Déamplificateur ÷2
        </button>
        <button
          onClick={() => commit({ ...build, customRateOn: !customRateOn })}
          className={`w-fit px-2 py-0.5 text-xs font-bold rounded-full border transition-colors ${
            customRateOn
              ? 'bg-violet-500 text-neutral-950 border-violet-500'
              : 'bg-neutral-950 text-violet-400 border-neutral-800 hover:border-violet-500/50'
          }`}
          title="Amplifie (×(1 + taux)) ou déamplifie (×(1 − taux)) le niveau de Telemachus d'un taux choisi au curseur — remplace l'amplificateur et le déamplificateur fixes tant qu'il est actif."
        >
          Taux personnalisé
        </button>
        {customRateOn && (
          <div className="flex items-center gap-2 rounded-full border border-violet-500/40 bg-neutral-950 pl-1 pr-3 py-0.5">
            <select
              value={customRateMode}
              onChange={(e) => commit({ ...build, customRateMode: e.target.value as 'amp' | 'deamp' })}
              className={`rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-bold focus:outline-none ${
                customRateMode === 'amp' ? 'text-red-400' : 'text-blue-400'
              }`}
            >
              <option value="amp">Amp</option>
              <option value="deamp">Déamp</option>
            </select>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={customRate}
              onChange={(e) => commit({ ...build, customRate: Number(e.target.value) }, 'customRate')}
              className="w-24 accent-violet-500"
            />
            <span className="text-xs font-bold text-violet-400 tabular-nums whitespace-nowrap">
              {Math.round(customRate * 100)} % · ×{(customRateMode === 'amp' ? 1 + customRate : 1 - customRate).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
