import { useCallback, useEffect, useRef, useState } from 'react';
import type { Capacite } from './capacitesSource';
import { normalizeBuild } from './buildActions';
import {
  clearSharedBuildFromUrl,
  fromPortable,
  loadCurrentBuild,
  readSharedBuild,
  saveCurrentBuild,
  toPortable,
  type PortableBuild,
} from './buildStorage';
import { defaultBuild, type BuildState } from './simulation';

const HISTORY_LIMIT = 100;

interface History {
  past: BuildState[];
  present: BuildState;
  future: BuildState[];
}

export type HydrationSource = 'share' | 'local' | null;

// État du build courant avec historique (annuler / rétablir) et persistance :
// - au démarrage, un lien partagé (#b=…) a priorité sur le build sauvegardé localement ;
// - les capacités n'étant connues qu'après le fetch du gsheet, les emplacements ne
//   sont résolus qu'une fois la liste chargée (pendant ce temps, rien n'est sauvegardé
//   pour ne pas écraser le build stocké par un build vide) ;
// - ensuite chaque changement est sauvegardé localement.
export function useBuild(capacites: Capacite[]) {
  const pending = useRef<{ raw: unknown; source: HydrationSource; displaced: unknown } | null>(null);
  const [history, setHistory] = useState<History>(() => {
    const shared = readSharedBuild();
    const local = loadCurrentBuild();
    const raw = shared ?? local;
    if (raw) {
      pending.current = { raw, source: shared ? 'share' : 'local', displaced: shared ? local : null };
    }
    // Pré-hydratation sans capacités : système, niveau, modificateurs… sont déjà
    // justes pendant le chargement du gsheet ; seuls les emplacements restent vides.
    const initial = raw ? fromPortable(raw, []) : null;
    return { past: [], present: initial ?? defaultBuild(), future: [] };
  });
  const [hydration, setHydration] = useState<{ source: HydrationSource; displaced: PortableBuild | null }>({
    source: null,
    displaced: null,
  });

  // Resynchronisation du gsheet : les ids des capacités peuvent avoir bougé, on
  // repasse le build (et son historique) par le format portable pour les remapper.
  const previousCapacites = useRef<Capacite[]>([]);
  useEffect(() => {
    const previous = previousCapacites.current;
    if (capacites.length === 0) return;
    previousCapacites.current = capacites;
    if (previous.length === 0 || previous === capacites) return;
    const remap = (b: BuildState) => fromPortable(toPortable(b, previous), capacites) ?? b;
    setHistory(h => ({ past: h.past.map(remap), present: remap(h.present), future: h.future.map(remap) }));
  }, [capacites]);

  useEffect(() => {
    if (capacites.length === 0 || !pending.current) return;
    const { raw, source, displaced } = pending.current;
    pending.current = null;
    const build = fromPortable(raw, capacites);
    if (build) setHistory({ past: [], present: normalizeBuild(build), future: [] });
    if (source === 'share') clearSharedBuildFromUrl();
    // Build local remplacé par un lien partagé : remonté à l'appelant pour qu'il le
    // garde dans les builds enregistrés plutôt que de le perdre.
    const displacedBuild = displaced ? fromPortable(displaced, capacites) : null;
    const displacedPortable =
      displacedBuild && displacedBuild.slots.some(Boolean) ? toPortable(displacedBuild, capacites) : null;
    const isSameBuild =
      !!build && !!displacedPortable && JSON.stringify(toPortable(build, capacites)) === JSON.stringify(displacedPortable);
    setHydration({ source, displaced: isSameBuild ? null : displacedPortable });
  }, [capacites]);

  useEffect(() => {
    if (capacites.length === 0 || pending.current) return;
    saveCurrentBuild(toPortable(history.present, capacites));
  }, [history.present, capacites]);

  // Applique un nouveau build (null = interaction refusée, rien ne change). Les
  // changements successifs d'un même contrôle (`coalesce`, ex: glisser un curseur,
  // taper un niveau) à moins d'une seconde d'écart ne forment qu'une entrée
  // d'historique, pour qu'"Annuler" ne revienne pas en arrière cran par cran.
  const lastCoalesce = useRef<{ key: string; at: number } | null>(null);
  const commit = useCallback((next: BuildState | null, coalesce?: string) => {
    if (!next) return;
    const now = Date.now();
    const merge = !!coalesce && lastCoalesce.current?.key === coalesce && now - lastCoalesce.current.at < 1000;
    lastCoalesce.current = coalesce ? { key: coalesce, at: now } : null;
    setHistory(h => {
      if (next === h.present) return h;
      const present = normalizeBuild(next);
      if (merge && h.past.length > 0) return { ...h, present, future: [] };
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h =>
      h.past.length === 0
        ? h
        : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
    );
  }, []);

  const redo = useCallback(() => {
    setHistory(h =>
      h.future.length === 0 ? h : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    );
  }, []);

  return {
    build: history.present,
    commit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    hydration,
  };
}
