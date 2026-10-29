import type React from 'react';
import { Brain, ChevronsUp, Heart, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import type { BuildState, Simulation, StatKey, Stats } from '../lib/simulation';

const statConfig: { key: StatKey, label: string, Icon: React.ElementType, color: string }[] = [
  { key: 'power', label: 'Power', Icon: Swords, color: 'text-red-500' },
  { key: 'speed', label: 'Speed', Icon: Zap, color: 'text-blue-400' },
  { key: 'trick', label: 'Trick', Icon: Brain, color: 'text-purple-500' },
  { key: 'recovery', label: 'Recovery', Icon: Heart, color: 'text-green-400' },
  { key: 'defense', label: 'Defense', Icon: Shield, color: 'text-yellow-600' }
];

// Grille des 5 stats finales avec leur bouton d'amplification. Avec un build comparé,
// chaque stat affiche l'écart (build actuel − build comparé).
export function StatGrid({
  build,
  sim,
  onBoost,
  compareStats,
}: {
  build: BuildState;
  sim: Simulation;
  onBoost: (key: StatKey) => void;
  compareStats: Stats | null;
}) {
  const { baseStatsInfo, boostOptions, statsFinales, auraRemaining } = sim;

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
      {statConfig.map(({ key, label, Icon, color }) => {
        const currentIdx = build.boosts[key];
        const options = boostOptions[key];
        // Index hérité d'un contexte où plus d'options étaient disponibles : traité
        // comme "pas de boost", comme dans le calcul des stats.
        const isBoosted = currentIdx > 0 && !!options[currentIdx - 1];
        const isAutoBoosted = baseStatsInfo[key].isAutoBoosted;
        const autoBoostMult = baseStatsInfo[key].autoBoostMult;

        const isUnboostable = options.length === 0;
        const cannotAffordInitial = !isBoosted && (auraRemaining < (options[0]?.cost || 999));
        const delta = compareStats ? statsFinales[key] - compareStats[key] : 0;

        return (
          <div key={key} className={`bg-neutral-950 border rounded-xl p-3 flex last:col-span-2 md:last:col-span-1 flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group transition-colors duration-300
            ${isBoosted || isAutoBoosted ? 'border-yellow-500 bg-yellow-500/10' : 'border-neutral-800'}`}>

            {isAutoBoosted && (
              <div className="absolute top-1 right-1 flex items-center gap-1 text-yellow-400/80 bg-yellow-500/10 px-1.5 py-0.5 rounded-bl-lg" title={`Boost passif x${autoBoostMult} sur la stat forte`}>
                <span className="text-[10px] font-bold">x{autoBoostMult}</span>
                <Sparkles size={12} />
              </div>
            )}

            <Icon size={20} className={`mb-2 mt-1 ${isBoosted || isAutoBoosted ? 'text-yellow-500' : color} opacity-80`} />
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1">{label}</span>
            <span className={`text-xl font-black ${isBoosted || isAutoBoosted ? 'text-yellow-400' : 'text-neutral-100'}`}>
              {statsFinales[key].toFixed(1)}
            </span>
            {compareStats && (
              <span
                className={`text-[11px] font-bold tabular-nums ${
                  Math.abs(delta) < 0.05 ? 'text-neutral-500' : delta > 0 ? 'text-green-400' : 'text-red-400'
                }`}
                title={`Build comparé : ${compareStats[key].toFixed(1)}`}
              >
                {Math.abs(delta) < 0.05 ? '=' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
              </span>
            )}

            <button
              onClick={() => onBoost(key)}
              disabled={isUnboostable || cannotAffordInitial}
              className={`mt-3 w-full py-2 px-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center transition-all leading-tight
                ${isBoosted
                  ? 'bg-yellow-500 text-neutral-950 hover:bg-yellow-400'
                  : isUnboostable || cannotAffordInitial
                    ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                    : 'bg-neutral-900 text-neutral-400 hover:text-yellow-500 border border-neutral-700 hover:border-yellow-500/50'
                }`}
            >
              <div className="flex items-center gap-1">
                <ChevronsUp size={12} />
                {isBoosted
                  ? options[currentIdx - 1].label.split(' ')[0]
                  : isUnboostable
                    ? 'Non Dispo'
                    : 'Amplifier'
                }
              </div>
              {isBoosted && (
                <span className="opacity-80 mt-0.5 text-[8px]">
                  {options[currentIdx - 1].label.split(' ').slice(1).join(' ')}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
