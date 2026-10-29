import { Layers } from 'lucide-react';
import type { Capacite } from '../lib/capacitesSource';
import { SideDrawer } from './SideDrawer';

// Panneau "Modes" (variantes style Phase Shift), ouvert depuis le bouton "Modes" d'un
// emplacement — plusieurs modes d'une même capacité peuvent être actifs en même temps
// (fusionnés dans le build + calques sur le radar), exactement comme john_unordinary.
// Le pick du sélecteur reste le mode "principal" (toujours actif, décoché impossible
// depuis ce panneau) ; les autres modes du groupe se cochent/décochent librement.
export function ModesDrawer({
  primary,
  siblings,
  extraIds,
  onToggle,
  onClose,
}: {
  primary: Capacite;
  siblings: Capacite[];
  extraIds: string[];
  onToggle: (modeId: string) => void;
  onClose: () => void;
}) {
  return (
    <SideDrawer
      title="Modes"
      subtitle="Choisissez les modes à inclure — plusieurs peuvent être actifs à la fois."
      icon={<Layers size={18} className="text-yellow-500" />}
      onClose={onClose}
    >
      <p className="text-sm font-semibold text-yellow-500 mt-4 mb-3">
        {primary.nom_capacite_base} — {primary.nom_personnage} (Niv {primary.niveau})
      </p>

      <div className="space-y-2">
        {siblings.map((sib) => {
          const isPrimary = sib.id === primary.id;
          const isChecked = isPrimary || extraIds.includes(String(sib.id));
          return (
            <label
              key={sib.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                isChecked ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-neutral-800'
              } ${
                isPrimary ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-neutral-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isPrimary}
                onChange={() => onToggle(String(sib.id))}
                className="accent-yellow-500"
              />
              <span className="text-sm text-neutral-200 flex-1">
                {sib.mode_label || sib.nom_capacite}
              </span>
              {isPrimary && (
                <span className="text-[10px] font-bold uppercase text-yellow-500">Actif</span>
              )}
            </label>
          );
        })}
      </div>
    </SideDrawer>
  );
}
