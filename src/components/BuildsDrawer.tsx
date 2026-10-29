import { useEffect, useRef, useState } from 'react';
import { Check, Download, FolderOpen, GitCompare, Image, Images, Link2, Pencil, Save, Trash2, Upload, X } from 'lucide-react';
import { compareColor } from '../lib/compareColors';
import type { SavedBuild } from '../lib/buildStorage';
import { computeLevel } from '../lib/simulation';
import { SideDrawer } from './SideDrawer';

const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Résumé lisible d'un build portable, sans avoir besoin de la liste des capacités :
// les emplacements y sont déjà stockés sous la forme personnage|capacité|niveau.
const summarize = (saved: SavedBuild) => {
  const { build } = saved;
  const abilities = (build.s || []).filter(Boolean).map(key => {
    const [perso, capacite] = key.replace(/#\d+$/, '').split('|');
    return `${capacite} (${perso})`;
  });
  const modifier = build.cr?.on
    ? `${build.cr.mode === 'amp' ? 'Amp' : 'Déamp'} ${Math.round(build.cr.rate * 100)} %`
    : build.a
      ? 'Amp ×1.5'
      : build.d
        ? 'Déamp ÷2'
        : null;
  return {
    savedLevel: computeLevel(build.p, build.m).toFixed(1),
    system: build.tab === 'alternative' ? 'Shine-City' : 'Classique',
    modifier,
    abilities,
  };
};

const actionClass =
  'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors';

// Builds enregistrés dans le navigateur : sauvegarder le build courant, recharger,
// comparer (contour pointillé sur le radar), partager par lien, renommer, supprimer,
// exporter / importer en masse. Charger et comparer se font au niveau affiché (cf. App).
export function BuildsDrawer({
  builds,
  compareIds,
  onSave,
  onLoad,
  onToggleCompare,
  onCompareAll,
  onClearCompare,
  onShare,
  onRename,
  onDelete,
  onExport,
  onExportAllPng,
  onExportComparePng,
  pngBusy,
  onImport,
  onClose,
}: {
  builds: SavedBuild[];
  // Builds comparés, dans l'ordre de sélection (qui fixe leur couleur, cf. compareColor).
  compareIds: string[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onCompareAll: () => void;
  onClearCompare: () => void;
  onShare: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onExportAllPng: () => void;
  onExportComparePng: () => void;
  pngBusy: boolean;
  onImport: (file: File) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // La confirmation de suppression expire d'elle-même (pas de boîte de dialogue).
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  const save = () => {
    onSave(name.trim() || `Build ${builds.length + 1}`);
    setName('');
  };

  const commitRename = () => {
    if (editingId && editingName.trim()) onRename(editingId, editingName.trim());
    setEditingId(null);
  };

  return (
    <SideDrawer
      title="Builds"
      subtitle="Enregistrés dans ce navigateur. Charger et comparer se font au niveau affiché (Potentiel / Maîtrise actuels)."
      icon={<FolderOpen size={18} className="text-yellow-500" />}
      onClose={onClose}
    >
      <form
        className="mt-4 flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={`Build ${builds.length + 1}`}
          maxLength={60}
          className="flex-1 min-w-0 bg-neutral-950 text-sm text-neutral-200 py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500"
        />
        <button
          type="submit"
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500 text-neutral-950 text-xs font-bold uppercase tracking-wide hover:bg-yellow-400 transition-colors"
        >
          <Save size={14} />
          Enregistrer
        </button>
      </form>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={builds.length === 0}
          className={`${actionClass} flex-1 justify-center py-1.5 border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400 disabled:opacity-30 disabled:pointer-events-none`}
          title="Télécharger tous les builds enregistrés dans un fichier JSON"
        >
          <Download size={12} />
          Exporter (.json)
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${actionClass} flex-1 justify-center py-1.5 border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400`}
          title="Ajouter les builds d'un fichier JSON exporté (les builds existants sont conservés)"
        >
          <Upload size={12} />
          Importer (.json)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.target.value = '';
          }}
        />
      </div>

      <p className="mt-4 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Graphiques PNG</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExportAllPng}
          disabled={builds.length === 0 || pngBusy}
          className={`${actionClass} justify-center whitespace-nowrap py-1.5 border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400 disabled:opacity-30 disabled:pointer-events-none`}
          title="Un zip avec la fiche radar de chaque build enregistré, au niveau affiché"
        >
          <Images size={12} />
          {pngBusy ? 'Génération…' : 'Tout (.zip)'}
        </button>
        <button
          type="button"
          onClick={onExportComparePng}
          disabled={compareIds.length === 0}
          className={`${actionClass} justify-center whitespace-nowrap py-1.5 border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400 disabled:opacity-30 disabled:pointer-events-none`}
          title={
            compareIds.length === 0
              ? 'Cochez « Comparer » sur des builds pour exporter leur superposition'
              : 'Une fiche radar : le build actuel et les builds comparés superposés'
          }
        >
          <Image size={12} />
          Comparaison{compareIds.length > 0 ? ` (${compareIds.length})` : ''}
        </button>
      </div>

      {builds.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-neutral-800 px-3 py-2">
          <span className="text-[11px] text-neutral-400">
            {compareIds.length === 0
              ? 'Aucun build comparé'
              : `${compareIds.length} build${compareIds.length > 1 ? 's' : ''} comparé${compareIds.length > 1 ? 's' : ''}`}
          </span>
          {compareIds.length < builds.length ? (
            <button
              type="button"
              onClick={onCompareAll}
              className={`${actionClass} border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100`}
            >
              <GitCompare size={12} />
              Tout comparer
            </button>
          ) : (
            <button
              type="button"
              onClick={onClearCompare}
              className={`${actionClass} border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100`}
            >
              <X size={12} />
              Tout retirer
            </button>
          )}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {builds.length === 0 && (
          <p className="text-xs text-neutral-500">
            Aucun build enregistré. Enregistrez le build actuel pour pouvoir y revenir ou le comparer plus tard.
          </p>
        )}
        {builds.map(saved => {
          const summary = summarize(saved);
          const compareIndex = compareIds.indexOf(saved.id);
          const isComparing = compareIndex >= 0;
          const color = isComparing ? compareColor(compareIndex) : undefined;
          const isEditing = editingId === saved.id;
          return (
            <div
              key={saved.id}
              className="rounded-xl border p-3 transition-colors border-neutral-800 bg-neutral-950"
              style={color ? { borderColor: color, boxShadow: `inset 3px 0 0 ${color}` } : undefined}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      maxLength={60}
                      className="w-full bg-neutral-900 text-sm font-bold text-neutral-100 px-2 py-0.5 rounded border border-yellow-500 focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(saved.id);
                        setEditingName(saved.name);
                      }}
                      className="group flex items-center gap-1.5 text-left text-sm font-bold text-neutral-100 hover:text-yellow-400 max-w-full"
                      title="Renommer"
                    >
                      <span className="truncate">{saved.name}</span>
                      <Pencil size={11} className="shrink-0 opacity-0 group-hover:opacity-60" />
                    </button>
                  )}
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Enregistré niv {summary.savedLevel} · {summary.system}
                    {summary.modifier ? ` · ${summary.modifier}` : ''} · {formatDate(saved.savedAt)}
                  </p>
                </div>
              </div>

              <ul className="mt-2 space-y-0.5">
                {summary.abilities.length === 0 ? (
                  <li className="text-[11px] italic text-neutral-600">Aucune capacité copiée</li>
                ) : (
                  summary.abilities.map((a, i) => (
                    <li key={i} className="text-[11px] text-neutral-300 truncate">· {a}</li>
                  ))
                )}
              </ul>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onLoad(saved.id)}
                  className={`${actionClass} border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400`}
                >
                  <FolderOpen size={12} />
                  Charger
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCompare(saved.id)}
                  className={`${actionClass} ${
                    isComparing ? '' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100'
                  }`}
                  style={color ? { borderColor: color, color, backgroundColor: `${color}22` } : undefined}
                >
                  {isComparing ? <Check size={12} /> : <GitCompare size={12} />}
                  {isComparing ? 'Comparé' : 'Comparer'}
                </button>
                <button
                  type="button"
                  onClick={() => onShare(saved.id)}
                  className={`${actionClass} border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100`}
                >
                  <Link2 size={12} />
                  Lien
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDeleteId === saved.id) {
                      onDelete(saved.id);
                      setConfirmDeleteId(null);
                    } else {
                      setConfirmDeleteId(saved.id);
                    }
                  }}
                  className={`${actionClass} ml-auto ${
                    confirmDeleteId === saved.id
                      ? 'border-red-500 bg-red-500/15 text-red-400'
                      : 'border-neutral-800 text-neutral-500 hover:border-red-500/50 hover:text-red-400'
                  }`}
                  title="Supprimer"
                >
                  <Trash2 size={12} />
                  {confirmDeleteId === saved.id && 'Confirmer ?'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SideDrawer>
  );
}
