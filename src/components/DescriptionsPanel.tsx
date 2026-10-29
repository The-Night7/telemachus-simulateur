import { Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { Capacite } from '../lib/capacitesSource';

// VOLET GAUCHE : descriptions (colonne "Ability Description" du gsheet) des capacités
// copiées, modes additionnels compris. Repliable ; sur grand écran le contenu se
// recentre dans l'espace restant (cf. padding de App), sur mobile le volet le recouvre.
export function DescriptionsPanel({
  open,
  onOpenChange,
  caps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caps: Capacite[];
}) {
  return (
    <>
      {!open && (
        <button
          onClick={() => onOpenChange(true)}
          title="Afficher les descriptions"
          aria-label="Afficher les descriptions"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 bg-neutral-900 border border-l-0 border-neutral-800 rounded-r-xl px-1.5 py-3 text-neutral-400 hover:text-yellow-500 shadow-xl transition-colors"
        >
          <PanelLeftOpen size={18} />
          <span className="text-[10px] font-bold uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">Descriptions</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => onOpenChange(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-full max-w-xs lg:w-80 xl:w-96 lg:max-w-none z-40 bg-neutral-900 border-r border-neutral-800 shadow-2xl p-4 sm:p-5 overflow-y-auto transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-neutral-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Layers size={18} />
            Descriptions
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            title="Replier"
            aria-label="Replier les descriptions"
            className="-m-2 p-2 text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        {caps.length === 0 ? (
          <p className="text-xs text-neutral-500">Aucune capacité copiée.</p>
        ) : (
          <div className="space-y-4">
            {caps.map((cap) => (
              <div key={cap.id} className="border-l-2 border-yellow-500/60 pl-3">
                <p className="text-sm font-bold text-yellow-500">{cap.nom_capacite}</p>
                <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
                  {cap.nom_personnage} — Niv {cap.niveau}{cap.type ? ` — ${cap.type}` : ''}
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line">
                  {cap.description || <span className="italic text-neutral-600">Pas de description.</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
