import { useEffect, useRef, useState } from 'react';
import { Check, Download, FolderOpen, GitCompare, Link2, Pencil, Save, Trash2, Upload } from 'lucide-react';
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
  compareId,
  onSave,
  onLoad,
  onCompare,
  onShare,
  onRename,
  onDelete,
  onExport,
  onImport,
  onClose,
}: {
  builds: SavedBuild[];
  compareId: string | null;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onCompare: (id: string | null) => void;
  onShare: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
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
          Exporter tout
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${actionClass} flex-1 justify-center py-1.5 border-neutral-700 text-neutral-300 hover:border-yellow-500/60 hover:text-yellow-400`}
          title="Ajouter les builds d'un fichier JSON exporté (les builds existants sont conservés)"
        >
          <Upload size={12} />
          Importer
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

      <div className="mt-5 space-y-3">
        {builds.length === 0 && (
          <p className="text-xs text-neutral-500">
            Aucun build enregistré. Enregistrez le build actuel pour pouvoir y revenir ou le comparer plus tard.
          </p>
        )}
        {builds.map(saved => {
          const summary = summarize(saved);
          const isComparing = compareId === saved.id;
          const isEditing = editingId === saved.id;
          return (
            <div
              key={saved.id}
              className={`rounded-xl border p-3 transition-colors ${
                isComparing ? 'border-cyan-400/60 bg-cyan-400/5' : 'border-neutral-800 bg-neutral-950'
              }`}
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
                  onClick={() => onCompare(isComparing ? null : saved.id)}
                  className={`${actionClass} ${
                    isComparing
                      ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                      : 'border-neutral-700 text-neutral-300 hover:border-cyan-400/60 hover:text-cyan-300'
                  }`}
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
