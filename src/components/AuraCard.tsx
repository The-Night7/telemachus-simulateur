import { Battery, ChevronsUp } from 'lucide-react';
import type { Simulation } from '../lib/simulation';

export function AuraCard({ sim, activeBoostsCount }: { sim: Simulation; activeBoostsCount: number }) {
  const { auraPercentage, auraRemaining, maxAura } = sim;
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 rounded-2xl shadow-xl">
      <div className="flex justify-between items-end gap-3 mb-3">
        <div>
          <h2 className="text-neutral-200 font-bold text-lg flex items-center gap-2">
            <Battery size={20} className={auraPercentage > 90 ? "text-red-500" : "text-yellow-500"} />
            Réserves d'Aura
          </h2>
          <p className="text-xs text-neutral-500 mt-1">L'amplification et la copie drainent l'aura.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-yellow-500">{Math.ceil(auraRemaining)}</span>
          <span className="text-neutral-500 text-sm ml-1">/ {Math.ceil(maxAura)}</span>
        </div>
      </div>

      <div className="h-4 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 relative">
        <div
          className={`h-full transition-all duration-500 ease-out ${auraPercentage > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'}`}
          style={{ width: `${auraPercentage}%` }}
        ></div>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ChevronsUp size={16} className="text-yellow-500" />
          <span className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wider">Amplifications Actives</span>
        </div>
        <span className="shrink-0 text-xs sm:text-sm font-bold text-yellow-500 bg-yellow-500/10 px-2.5 sm:px-3 py-1 rounded-full border border-yellow-500/30">
          {activeBoostsCount} Stat{activeBoostsCount > 1 ? 's' : ''} Boostée{activeBoostsCount > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
