import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import type { Capacite } from '../lib/capacitesSource';
import {
  applyTargetModifier,
  getAuraCost,
  SLOT_COUNT,
  type BuildState,
  type Simulation,
  type TargetModifier,
} from '../lib/simulation';
import { AbilityPicker } from './AbilityPicker';

// Emplacements de copie : sélecteur de capacité, modificateur de la cible (A/D) et
// accès au panneau "Modes" quand la capacité a des variantes.
export function SlotsCard({
  build,
  sim,
  capacites,
  onUpdateSlot,
  onToggleTargetModifier,
  onOpenModes,
}: {
  build: BuildState;
  sim: Simulation;
  capacites: Capacite[];
  onUpdateSlot: (index: number, value: string) => void;
  onToggleTargetModifier: (index: number, modifier: TargetModifier) => void;
  onOpenModes: (index: number) => void;
}) {
  const { slots, extraModes, targetModifiers } = build;
  const { tierInfo, copyLevel } = sim;
  const copiables = useMemo(() => capacites.filter(cap => cap.copiable), [capacites]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
      <h2 className="text-neutral-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
        <Layers size={18} />
        Auras Copiées ({sim.slotsUsed}/{tierInfo.slots})
      </h2>

      {Array.from({ length: SLOT_COUNT }, (_, index) => {
        const isLocked = index >= tierInfo.slots;
        const slotValue = slots[index];
        const targetModifier = targetModifiers[index];
        const currentCap = slotValue ? sim.findSlotCap(index, slotValue) : null;
        const currentSlotDrain = currentCap ? getAuraCost(currentCap.niveau) : 0;
        const levelDiff = currentCap ? (copyLevel - currentCap.niveau) : 0;
        const siblingModes = currentCap
          ? capacites.filter(c => c.mode_group_key === currentCap.mode_group_key && c.copiable)
          : [];
        const activeExtraCount = (extraModes[index] || []).length;
        // Une capacité déjà active ailleurs (comme pick principal OU comme mode
        // additionnel d'un autre emplacement) ne peut pas être re-choisie ici.
        const usedElsewhereIds = new Set<string>();
        slots.forEach((sid, i) => {
          if (i === index || !sid) return;
          usedElsewhereIds.add(sid);
          (extraModes[i] || []).forEach(id => usedElsewhereIds.add(id));
        });

        const getOptionState = (cap: Capacite) => {
          const cost = getAuraCost(applyTargetModifier(cap, targetModifier).niveau);
          const isSelf = slotValue === cap.id.toString();
          const alreadyEquipped = usedElsewhereIds.has(cap.id.toString()) && !isSelf;
          const isTooExpensive = (sim.currentAuraDrain - currentSlotDrain + cost) > sim.maxAura && !isSelf;
          return {
            cost,
            disabledReason: alreadyEquipped ? 'Déjà équipé' : isTooExpensive ? 'Aura insuffisante' : undefined,
          };
        };

        return (
          <div key={index}>
            <div className="flex items-center gap-2">
              <AbilityPicker
                value={slotValue}
                options={copiables}
                locked={isLocked}
                getOptionState={getOptionState}
                onChange={value => onUpdateSlot(index, value)}
                badges={currentCap && (
                  <span className="shrink-0 flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                    <span
                      className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md border tabular-nums ${
                        levelDiff >= 0
                          ? 'text-green-400 bg-green-400/10 border-green-400/20'
                          : 'text-red-400 bg-red-400/10 border-red-400/20'
                      }`}
                      title="Différence de niveau (Telemachus vs Capacité)"
                    >
                      {levelDiff > 0 ? '+' : ''}{levelDiff.toFixed(1)} Niv
                    </span>
                    <span
                      className="text-[10px] md:text-xs font-bold text-yellow-500/70 bg-yellow-500/10 px-1.5 py-0.5 rounded-md border border-yellow-500/20 tabular-nums"
                      title="Coût en Aura"
                    >
                      -{getAuraCost(currentCap.niveau)}
                    </span>
                  </span>
                )}
              />

              {!isLocked && (
                <div className="flex flex-col shrink-0 self-center -ml-1">
                  <button
                    type="button"
                    onClick={() => onToggleTargetModifier(index, 'amp')}
                    className={`px-0.5 text-[9px] font-bold leading-none transition-colors ${
                      targetModifier === 'amp' ? 'text-red-500' : 'text-neutral-700 hover:text-red-400'
                    }`}
                    title="La personne copiée est amplifiée : copie depuis le niveau d'origine"
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTargetModifier(index, 'deamp')}
                    className={`px-0.5 text-[9px] font-bold leading-none transition-colors ${
                      targetModifier === 'deamp' ? 'text-blue-500' : 'text-neutral-700 hover:text-blue-400'
                    }`}
                    title="La personne copiée est déamplifiée : copie de ses stats déamp (niveau et stats ÷2)"
                  >
                    D
                  </button>
                </div>
              )}
            </div>

            {!isLocked && siblingModes.length > 1 && (
              <button
                type="button"
                onClick={() => onOpenModes(index)}
                title="Choisir les modes actifs de cette capacité"
                className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-yellow-500 transition-colors"
              >
                <Layers size={12} />
                Modes
                {activeExtraCount > 0 && (
                  <span className="px-1.5 rounded-full bg-yellow-500/20 text-yellow-400">
                    {1 + activeExtraCount}
                  </span>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
