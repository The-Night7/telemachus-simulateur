import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, EyeOff, FolderOpen, Redo2, RefreshCw, RotateCcw, Share2, Sparkles, Target, Undo2, X } from 'lucide-react';
import { useCapacites } from './lib/useCapacites';
import { useBuild } from './lib/useBuild';
import { downloadBlob, exportRadarPng, renderRadarPng, type RadarIdentity, type RadarSheet } from './lib/exportRadarPng';
import { createZip, uniqueFileNames, type ZipEntry } from './lib/zip';
import { simulateBuild, STAT_KEYS, type BuildState, type Simulation, type StatKey, type SystemTab, type TargetModifier } from './lib/simulation';
import { cycleBoost, normalizeBuild, resetBuild, switchTab, toggleExtraMode, toggleTargetModifier, updateSlot } from './lib/buildActions';
import {
  buildShareUrl,
  fromPortable,
  loadPrefs,
  loadSavedBuilds,
  newSavedBuildId,
  parseImportedBuilds,
  serializeSavedBuilds,
  storePrefs,
  storeSavedBuilds,
  toPortable,
  type PortableBuild,
  type Prefs,
  type SavedBuild,
} from './lib/buildStorage';
import { RadarChart } from './components/RadarChart';
import { LevelCard } from './components/LevelCard';
import { AuraCard } from './components/AuraCard';
import { SlotsCard } from './components/SlotsCard';
import { StatGrid } from './components/StatGrid';
import { ModesDrawer } from './components/ModesDrawer';
import { BuildsDrawer } from './components/BuildsDrawer';
import { DescriptionsPanel } from './components/DescriptionsPanel';
import { CompareTable, type CompareRow } from './components/CompareTable';
import { compareColor, exportCompareColor } from './lib/compareColors';
import tpPortrait from './assets/tp-pp.png';
import telemachusHighTierPortrait from './assets/telemachus.jpg';
import arlequinPortrait from './assets/arlequin.webp';
import arlequinePortrait from './assets/Arlequine.jpeg';

// Niveau à partir duquel le portrait de Telemachus sur la fiche exportée passe à sa
// forme éveillée (telemachus.jpg) au lieu du portrait de base (tp-pp.png).
const TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL = 6.0;

// Identités exportables sur la fiche radar : mêmes stats/mécaniques, juste le nom,
// l'ability affichée et le portrait qui changent selon le masque choisi. Le portrait de
// Telemachus dépend du niveau actuel (cf. TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL) ; le nom
// de la capacité dépend du système actif ("Aura Master" en Shine-City, "Aura Deity" sinon).
const buildRadarIdentities = (level: number, isShineCity: boolean): RadarIdentity[] => {
  const ability = isShineCity ? 'Aura Master' : 'Aura Deity';
  return [
    {
      name: 'Telemachus',
      ability,
      portraitSrc: level >= TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL ? telemachusHighTierPortrait : tpPortrait,
    },
    { name: 'Arlequin', ability, portraitSrc: arlequinPortrait },
    { name: 'Arlequin', ability, portraitSrc: arlequinePortrait },
  ];
};

type Toast = { message: string; link?: string };

const toolbarButton =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-30 disabled:pointer-events-none';

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const { capacites, loading: capacitesLoading, error: capacitesError, retry: retryCapacites } = useCapacites();
  const { build, commit, undo, redo, canUndo, canRedo, hydration } = useBuild(capacites);
  const sim = useMemo(() => simulateBuild(build, capacites), [build, capacites]);

  // Préférences d'affichage (hors build, jamais partagées par lien).
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  useEffect(() => storePrefs(prefs), [prefs]);
  const updatePrefs = (patch: Partial<Prefs>) => setPrefs(p => ({ ...p, ...patch }));

  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>(loadSavedBuilds);
  useEffect(() => storeSavedBuilds(savedBuilds), [savedBuilds]);
  // Builds enregistrés comparés, dans l'ordre de sélection (qui fixe leur couleur).
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const removeCompare = useCallback((id: string) => setCompareIds(prev => prev.filter(x => x !== id)), []);

  // Emplacement dont le panneau "Modes" (variantes style Phase Shift) est ouvert.
  const [activeModeDrawer, setActiveModeDrawer] = useState<number | null>(null);
  // Volet gauche des descriptions : replié par défaut.
  const [descPanelOpen, setDescPanelOpen] = useState(false);
  const [buildsOpen, setBuildsOpen] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast || toast.link) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const addSavedBuild = useCallback((name: string, portable: PortableBuild) => {
    setSavedBuilds(prev => [{ id: newSavedBuildId(), name, savedAt: Date.now(), build: portable }, ...prev]);
  }, []);

  // Build ouvert depuis un lien partagé : le build local qu'il remplace est gardé dans
  // les builds enregistrés plutôt que perdu.
  useEffect(() => {
    if (hydration.source !== 'share') return;
    if (hydration.displaced) {
      addSavedBuild('Mon build (avant le lien partagé)', hydration.displaced);
      setToast({ message: 'Build du lien chargé — ton build précédent est dans « Builds ».' });
    } else {
      setToast({ message: 'Build chargé depuis le lien partagé.' });
    }
  }, [hydration, addSavedBuild]);

  const radarIdentities = useMemo(
    () => buildRadarIdentities(sim.level, build.tab === 'alternative'),
    [sim.level, build.tab]
  );
  const identityIndex = Math.min(prefs.identityIndex, radarIdentities.length - 1);

  // Un build enregistré est toujours chargé / comparé au niveau AFFICHÉ (Potentiel /
  // Maîtrise actuels) : seuls ses capacités, modes, modificateurs et boosts sont repris,
  // pour comparer des loadouts à niveau égal. Le niveau enregistré est ignoré.
  const restoreAtDisplayedLevel = useCallback(
    (saved: SavedBuild): BuildState | null => {
      const restored = fromPortable(saved.build, capacites);
      return restored && { ...restored, potential: build.potential, mastery: build.mastery };
    },
    [capacites, build.potential, build.mastery]
  );

  // --- BUILDS COMPARÉS ---
  const compared = useMemo((): CompareRow[] => {
    if (capacites.length === 0) return [];
    return compareIds.flatMap((id, index) => {
      const saved = savedBuilds.find(b => b.id === id);
      const restored = saved && restoreAtDisplayedLevel(saved);
      if (!saved || !restored) return [];
      return [{ id, name: saved.name, color: compareColor(index), sim: simulateBuild(normalizeBuild(restored), capacites) }];
    });
  }, [compareIds, savedBuilds, capacites, restoreAtDisplayedLevel]);

  const activeBoostsCount = STAT_KEYS.filter(k => build.boosts[k] > 0 && sim.boostOptions[k][build.boosts[k] - 1]).length;

  // --- INTERACTIONS ---
  const refuse = (message: string) => setToast({ message });

  const handleUpdateSlot = (index: number, value: string) => {
    const next = updateSlot(build, sim, capacites, index, value);
    if (!next) return refuse('Aura insuffisante pour cette capacité.');
    commit(next);
    if (!value && activeModeDrawer === index) setActiveModeDrawer(null);
  };

  const handleToggleTargetModifier = (index: number, modifier: TargetModifier) => {
    const next = toggleTargetModifier(build, sim, capacites, index, modifier);
    if (!next) return refuse('Aura insuffisante pour ce modificateur.');
    commit(next);
  };

  const handleBoost = (key: StatKey) => commit(cycleBoost(build, sim, key));

  const handleTab = (tab: SystemTab) => {
    if (tab !== build.tab) commit(switchTab(build, tab));
  };

  const copyLink = async (portable: PortableBuild) => {
    const link = buildShareUrl(portable);
    try {
      await navigator.clipboard.writeText(link);
      setToast({ message: 'Lien du build copié dans le presse-papiers.' });
    } catch {
      // Presse-papiers refusé (contexte non sécurisé, permission…) : on affiche le lien.
      setToast({ message: 'Copie ce lien :', link });
    }
  };

  const handleLoadSaved = (id: string) => {
    const saved = savedBuilds.find(b => b.id === id);
    const restored = saved && restoreAtDisplayedLevel(saved);
    if (!restored) return;
    commit(restored);
    removeCompare(id);
    setBuildsOpen(false);
    // À ce niveau, le tier peut avoir moins d'emplacements ou la réserve d'aura être
    // plus petite que pour le build d'origine : on le signale plutôt que de le taire.
    const check = simulateBuild(normalizeBuild(restored), capacites);
    const lostSlots = restored.slots.filter(Boolean).length - check.slotsUsed;
    const warnings = [
      lostSlots > 0 && `${lostSlots} capacité${lostSlots > 1 ? 's' : ''} retirée${lostSlots > 1 ? 's' : ''} (tier trop bas)`,
      check.currentAuraDrain > check.maxAura && "réserve d'aura dépassée",
    ].filter(Boolean);
    setToast({
      message: `« ${saved.name} » chargé au niveau ${check.level.toFixed(1)}${warnings.length ? ` — ${warnings.join(', ')}` : ''}. Ctrl+Z pour annuler.`,
    });
  };

  // --- EXPORTS PNG (fiche radar) ---
  // Fiche d'un build simulé : identité choisie (portrait selon SON niveau, nom de la
  // capacité selon SON système), calques de modes et amplificateur compris.
  const sheetFor = (s: Simulation, tab: SystemTab, extra: Partial<RadarSheet> = {}): RadarSheet => ({
    stats: s.unmodifiedStats,
    level: s.level,
    identity: buildRadarIdentities(s.level, tab === 'alternative')[identityIndex],
    capAt10: prefs.capAt10,
    layers: s.modeLayers.map(l => ({ label: `${l.nomCapacite} · ${l.label}`, stats: l.stats, modifiedStats: l.modifiedStats })),
    frenchLabels: tab === 'alternative',
    modifier: s.ampOn || s.deampOn
      ? { kind: s.ampOn ? 'amplified' : 'deamplified', stats: s.statsFinales, level: s.copyLevel }
      : null,
    hideLevel: prefs.hideExportLevel,
    ...extra,
  });

  const today = () => new Date().toISOString().slice(0, 10);
  const [pngBusy, setPngBusy] = useState(false);

  // Un zip contenant la fiche de chaque build enregistré, au niveau affiché.
  const handleExportAllPng = async () => {
    if (pngBusy || savedBuilds.length === 0) return;
    setPngBusy(true);
    setToast({ message: `Génération de ${savedBuilds.length} graphique${savedBuilds.length > 1 ? 's' : ''}…` });
    try {
      const restored = savedBuilds.flatMap(saved => {
        const b = restoreAtDisplayedLevel(saved);
        return b ? [{ saved, build: normalizeBuild(b) }] : [];
      });
      const names = uniqueFileNames(restored.map(r => r.saved.name), 'png');
      const entries: ZipEntry[] = [];
      for (const [i, { build: b }] of restored.entries()) {
        const blob = await renderRadarPng(sheetFor(simulateBuild(b, capacites), b.tab));
        if (blob) entries.push({ name: names[i], data: new Uint8Array(await blob.arrayBuffer()) });
      }
      downloadBlob(createZip(entries), `telemachus-graphs-${today()}.zip`);
      setToast({ message: `${entries.length} graphique${entries.length > 1 ? 's' : ''} exporté${entries.length > 1 ? 's' : ''} dans le zip.` });
    } finally {
      setPngBusy(false);
    }
  };

  // Comparaison en PNG : "overlay" = une fiche avec tous les builds comparés superposés
  // en pointillés ; "grid" = une planche avec un petit radar par build.
  const handleExportComparePng = (layout: 'overlay' | 'grid') => {
    if (compared.length === 0) return;
    const identity = radarIdentities[identityIndex];
    exportRadarPng(
      sheetFor(sim, build.tab, {
        compares: compared.map((c, i) => ({ label: c.name, stats: c.sim.statsFinales, color: exportCompareColor(i) })),
        currentLabel: 'Build actuel',
        compareBaseStats: sim.statsFinales,
        compareLayout: layout,
      }),
      `${identity.name.toLowerCase()}-${layout === 'grid' ? 'grille' : 'comparaison'}-${today()}.png`
    );
  };

  const handleExportBuilds = () => {
    const blob = new Blob([serializeSavedBuilds(savedBuilds)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemachus-builds-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBuilds = async (file: File) => {
    const imported = parseImportedBuilds(await file.text());
    if (!imported) return setToast({ message: "Fichier illisible : ce n'est pas un export de builds." });
    // Un build identique (même nom, même contenu) déjà présent n'est pas dupliqué.
    const signature = (b: SavedBuild) => `${b.name}\u0000${JSON.stringify(b.build)}`;
    const existing = new Set(savedBuilds.map(signature));
    const fresh = imported.filter(b => !existing.has(signature(b)));
    setSavedBuilds(prev => [...fresh, ...prev]);
    const skipped = imported.length - fresh.length;
    setToast({
      message: `${fresh.length} build${fresh.length > 1 ? 's' : ''} importé${fresh.length > 1 ? 's' : ''}${skipped ? ` (${skipped} déjà présent${skipped > 1 ? 's' : ''})` : ''}.`,
    });
  };

  // Raccourcis : Ctrl/⌘+Z annuler, Ctrl/⌘+Maj+Z ou Ctrl+Y rétablir — sauf dans un
  // champ de saisie, où le navigateur gère sa propre annulation.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  // --- PANNEAU "MODES" (variantes style Phase Shift) ---
  const drawerCap =
    activeModeDrawer !== null && activeModeDrawer < sim.tierInfo.slots && build.slots[activeModeDrawer]
      ? capacites.find(c => c.id === parseInt(build.slots[activeModeDrawer]))
      : null;
  const closeModes = useCallback(() => setActiveModeDrawer(null), []);
  const closeBuilds = useCallback(() => setBuildsOpen(false), []);

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 font-sans px-3 py-4 sm:p-4 md:p-8 selection:bg-yellow-500/30 pb-20 transition-[padding] duration-300 ${descPanelOpen ? 'lg:pl-[22rem] xl:pl-[26rem]' : ''}`}>

      <DescriptionsPanel open={descPanelOpen} onOpenChange={setDescPanelOpen} caps={sim.equippedCaps} />

      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 tracking-tight mb-2">
          TELEMACHUS PAWN
        </h1>
        <p className="text-neutral-400 font-medium uppercase tracking-widest text-sm md:text-base mb-2">
          Aura Deity - Simulateur de Capacité
        </p>

        {capacitesLoading && (
          <p className="text-xs text-neutral-500 mb-4 flex items-center justify-center gap-1.5">
            <RefreshCw size={12} className="animate-spin" />
            Chargement de la liste des capacités depuis le gsheet…
          </p>
        )}
        {!capacitesLoading && capacitesError && (
          <p className="text-xs text-red-400/80 mb-4" title={capacitesError}>
            Échec du chargement du gsheet — aucune capacité disponible.{' '}
            <button onClick={retryCapacites} className="underline hover:text-red-300">Réessayer</button>
          </p>
        )}
        {!capacitesLoading && !capacitesError && (
          <p className="text-xs text-green-500/60 mb-4 flex items-center justify-center gap-1.5">
            Liste des capacités synchronisée avec le gsheet.
            <button
              onClick={retryCapacites}
              title="Resynchroniser avec le gsheet"
              aria-label="Resynchroniser avec le gsheet"
              className="text-neutral-600 hover:text-green-400 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </p>
        )}

        {/* ONGLETS */}
        <div className="inline-flex max-w-full bg-neutral-900 border border-neutral-800 p-1 rounded-full shadow-lg">
          {([['classic', 'Système Classique'], ['alternative', 'Système Shine-City']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => handleTab(tab)}
              className={`px-3 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wide transition-all ${build.tab === tab ? 'bg-yellow-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* BARRE D'OUTILS DU BUILD */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler" className={`${toolbarButton} text-neutral-400 hover:text-neutral-100`}>
              <Undo2 size={14} />
            </button>
            <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir" className={`${toolbarButton} text-neutral-400 hover:text-neutral-100`}>
              <Redo2 size={14} />
            </button>
            <button
              onClick={() => commit(resetBuild(build))}
              title="Repartir d'un build vide (annulable)"
              className={`${toolbarButton} text-neutral-400 hover:text-red-400`}
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Réinitialiser</span>
            </button>
          </div>
          <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button onClick={() => setBuildsOpen(true)} title="Builds enregistrés et comparaison" className={`${toolbarButton} text-neutral-400 hover:text-yellow-400`}>
              <FolderOpen size={14} />
              Builds
              {savedBuilds.length > 0 && (
                <span className="px-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px]">{savedBuilds.length}</span>
              )}
            </button>
            <button
              onClick={() => copyLink(toPortable(build, capacites))}
              disabled={capacites.length === 0}
              title="Copier un lien qui ouvre ce build"
              className={`${toolbarButton} text-neutral-400 hover:text-yellow-400`}
            >
              <Share2 size={14} />
              Partager
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

        {/* PANNEAU GAUCHE : CONTRÔLES */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <LevelCard build={build} sim={sim} commit={commit} />
          <AuraCard sim={sim} activeBoostsCount={activeBoostsCount} />
          <SlotsCard
            build={build}
            sim={sim}
            capacites={capacites}
            onUpdateSlot={handleUpdateSlot}
            onToggleTargetModifier={handleToggleTargetModifier}
            onOpenModes={setActiveModeDrawer}
          />
        </div>

        {/* PANNEAU DROIT : VISUALISATION */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-2xl p-3 sm:p-6 shadow-xl relative">

          <div className="w-full flex flex-wrap items-center gap-2 mb-2 md:mb-0 md:w-auto md:absolute md:top-6 md:left-6 md:flex-col md:items-start z-10">
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Aura Jaune</span>
            </div>

            {build.tab === 'alternative' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg shadow-sm w-fit">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Boost Passif Actif</span>
              </div>
            )}

            <button
              onClick={() => updatePrefs({ capAt10: !prefs.capAt10 })}
              className={`w-fit px-2 py-0.5 text-xs font-bold rounded-full border transition-colors flex items-center gap-1 ${
                prefs.capAt10
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
              title="Plafonner la forme du radar à 10 (les valeurs réelles restent affichées telles quelles)"
            >
              Cap à 10
            </button>
          </div>

          <div className="w-full flex flex-wrap items-center justify-between gap-2 md:w-auto md:justify-start md:absolute md:top-6 md:right-6 z-10">
            <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 shadow-sm">
              {radarIdentities.map((identity, index) => (
                <button
                  key={index}
                  onClick={() => updatePrefs({ identityIndex: index })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    identityIndex === index
                      ? 'bg-yellow-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={`Fiche pour ${identity.name}`}
                >
                  {identity.name}
                </button>
              ))}
            </div>
            <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm">
              <button
                onClick={() => exportRadarPng(sheetFor(sim, build.tab))}
                className="flex items-center gap-2 px-3 py-1 rounded-l-lg hover:text-yellow-500 text-neutral-400 transition-colors"
                title="Exporter le graphique en PNG"
              >
                <Download size={14} />
                <span className="text-xs font-bold uppercase tracking-wide">Exporter PNG</span>
              </button>
              <button
                onClick={() => updatePrefs({ hideExportLevel: !prefs.hideExportLevel })}
                className={`px-2 border-l border-neutral-800 rounded-r-lg transition-colors ${
                  prefs.hideExportLevel ? 'text-yellow-400' : 'text-neutral-500 hover:text-neutral-200'
                }`}
                title={prefs.hideExportLevel ? 'Niveau masqué sur le PNG (?.?)' : 'Niveau visible sur le PNG'}
              >
                {prefs.hideExportLevel ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="w-full mb-2 mt-2 md:mt-6">
            <RadarChart
              stats={sim.unmodifiedStats}
              boosts={build.boosts}
              baseStatsInfo={sim.baseStatsInfo}
              layers={sim.modeLayers}
              capAt10={prefs.capAt10}
              amplifiedStats={sim.ampOn ? sim.statsFinales : null}
              deamplifiedStats={sim.deampOn ? sim.statsFinales : null}
              compares={compared.map(c => ({ id: c.id, stats: c.sim.statsFinales, color: c.color }))}
            />
          </div>

          {/* Légende des calques de modes actifs (style Phase Shift) : toutes les formes
              partagent la même couleur (l'Aura Shape est masquée pendant ce temps) —
              seule leur silhouette les distingue en se superposant, donc pas de pastille
              de couleur ici non plus. */}
          {sim.modeLayers.length > 0 && (
            <div className="w-full flex flex-wrap justify-center gap-2 mb-3">
              {sim.modeLayers.map(layer => (
                <span
                  key={layer.id}
                  className="text-[11px] font-semibold text-neutral-300 bg-neutral-950 border border-neutral-800 rounded-full px-2 py-0.5"
                >
                  {layer.nomCapacite} · {layer.label}
                </span>
              ))}
            </div>
          )}

          <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-2 mb-3 sm:px-2">
            {compared.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 min-w-0">
                {compared.map(c => (
                  <span
                    key={c.id}
                    className="flex items-center gap-1.5 text-[12px] rounded-full pl-2.5 pr-1 py-0.5 max-w-full border"
                    style={{ color: c.color, borderColor: `${c.color}66`, backgroundColor: `${c.color}14` }}
                  >
                    <span className="shrink-0 w-3 border-t-2 border-dashed" style={{ borderColor: c.color }} />
                    <span className="truncate max-w-[10rem] font-bold">{c.name}</span>
                    {compared.length === 1 && <span className="shrink-0 opacity-80">· Niv eff. {c.sim.effectiveLevel}</span>}
                    <button onClick={() => removeCompare(c.id)} aria-label={`Retirer ${c.name} de la comparaison`} className="p-0.5 rounded-full hover:bg-white/10">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2 text-[13px] text-neutral-400 font-medium">
              <Target size={14} className="opacity-70" />
              <span>Estimated Effective Level :</span>
              <span className="font-black text-yellow-500 ml-1">{sim.effectiveLevel}</span>
            </div>
          </div>

          <StatGrid
            build={build}
            sim={sim}
            onBoost={handleBoost}
            compareStats={compared.length === 1 ? compared[0].sim.statsFinales : null}
          />
        </div>
      </div>

      {compared.length > 0 && (
        <div className="max-w-6xl mx-auto mt-6 lg:mt-10">
          <CompareTable
            current={{ id: '__current__', name: 'Build actuel', color: '#ffd700', sim }}
            rows={compared}
            onRemove={removeCompare}
            onClear={() => setCompareIds([])}
            onExportPng={handleExportComparePng}
          />
        </div>
      )}

      {activeModeDrawer !== null && drawerCap && (
        <ModesDrawer
          primary={drawerCap}
          siblings={capacites.filter(c => c.mode_group_key === drawerCap.mode_group_key && c.copiable)}
          extraIds={build.extraModes[activeModeDrawer] || []}
          onToggle={modeId => commit(toggleExtraMode(build, activeModeDrawer, modeId))}
          onClose={closeModes}
        />
      )}

      {buildsOpen && (
        <BuildsDrawer
          builds={savedBuilds}
          compareIds={compareIds}
          onSave={name => {
            addSavedBuild(name, toPortable(build, capacites));
            setToast({ message: `« ${name} » enregistré.` });
          }}
          onLoad={handleLoadSaved}
          onToggleCompare={id => setCompareIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))}
          onCompareAll={() => setCompareIds(prev => [...prev, ...savedBuilds.map(b => b.id).filter(id => !prev.includes(id))])}
          onClearCompare={() => setCompareIds([])}
          onShare={id => {
            const saved = savedBuilds.find(b => b.id === id);
            if (saved) copyLink(saved.build);
          }}
          onRename={(id, name) => setSavedBuilds(prev => prev.map(b => (b.id === id ? { ...b, name } : b)))}
          onDelete={id => {
            setSavedBuilds(prev => prev.filter(b => b.id !== id));
            removeCompare(id);
          }}
          onExport={handleExportBuilds}
          onExportAllPng={handleExportAllPng}
          onExportComparePng={handleExportComparePng}
          pngBusy={pngBusy}
          onImport={handleImportBuilds}
          onClose={closeBuilds}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p>{toast.message}</p>
            {toast.link && (
              <input
                readOnly
                value={toast.link}
                onFocus={e => e.target.select()}
                autoFocus
                className="mt-2 w-full bg-neutral-950 text-xs text-neutral-300 px-2 py-1.5 rounded border border-neutral-700 focus:outline-none focus:border-yellow-500"
              />
            )}
          </div>
          <button onClick={() => setToast(null)} aria-label="Fermer" className="text-neutral-500 hover:text-neutral-200">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
