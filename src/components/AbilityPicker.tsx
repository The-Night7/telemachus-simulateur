import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Lock, Search, X } from 'lucide-react';
import type { Capacite } from '../lib/capacitesSource';

export interface PickerOptionState {
  cost: number;
  // Raison pour laquelle la capacité ne peut pas être choisie (déjà équipée, aura
  // insuffisante…), absente si elle est disponible.
  disabledReason?: string;
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Sélecteur de capacité avec recherche (nom, personnage, type, niveau), remplaçant le
// <select> natif devenu illisible avec plusieurs centaines de capacités. Navigation
// clavier : ↑/↓ pour parcourir, Entrée pour choisir, Échap pour fermer.
export function AbilityPicker({
  value,
  options,
  locked,
  getOptionState,
  onChange,
  badges,
}: {
  value: string;
  options: Capacite[];
  locked: boolean;
  getOptionState: (cap: Capacite) => PickerOptionState;
  onChange: (id: string) => void;
  badges?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = value ? options.find(c => String(c.id) === value) : undefined;

  const searchIndex = useMemo(
    () =>
      options.map(cap => ({
        cap,
        haystack: normalize(`${cap.nom_capacite} ${cap.nom_personnage} ${cap.type} ${cap.nature} niv ${cap.niveau}`),
      })),
    [options]
  );

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? searchIndex.filter(({ haystack }) => terms.every(t => haystack.includes(t))).map(e => e.cap)
    : options;
  const rows = filtered.map(cap => ({ cap, state: getOptionState(cap) }));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const openPicker = () => {
    if (locked) return;
    setQuery('');
    const selectedIndex = selected ? options.indexOf(selected) : -1;
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (id: string) => {
    onChange(id);
    close();
  };

  const moveActive = (delta: number) => {
    if (rows.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < rows.length; step++) {
      next = (next + delta + rows.length) % rows.length;
      if (!rows[next].state.disabledReason) break;
    }
    setActiveIndex(next);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row && !row.state.disabledReason) choose(String(row.cap.id));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : openPicker())}
        disabled={locked}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center gap-2 bg-neutral-950 border py-2.5 pl-3 sm:pl-4 pr-3 rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${
          locked
            ? 'border-neutral-800 text-neutral-600 cursor-not-allowed bg-neutral-950/50'
            : open
              ? 'border-yellow-500 text-neutral-200'
              : 'border-neutral-700 text-neutral-200 hover:border-neutral-600'
        }`}
      >
        <span className="flex-1 min-w-0">
          {selected ? (
            <>
              <span className="block truncate font-medium text-sm">{selected.nom_capacite}</span>
              <span className="block truncate text-[11px] text-neutral-500">
                {selected.nom_personnage} · Niv {selected.niveau}
              </span>
            </>
          ) : (
            <span className={`block py-1.5 text-sm ${locked ? '' : 'text-neutral-500'}`}>
              {locked ? 'Emplacement verrouillé' : 'Emplacement vide'}
            </span>
          )}
        </span>
        {selected && badges}
        {locked ? (
          <Lock className="shrink-0 text-neutral-700" size={18} />
        ) : (
          <ChevronDown className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} size={18} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 border-b border-neutral-800">
            <Search size={14} className="text-neutral-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Capacité, personnage, type, niveau…"
              className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              role="combobox"
              aria-expanded
              aria-controls={listId}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche" className="text-neutral-500 hover:text-neutral-200">
                <X size={14} />
              </button>
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => choose('')}
              className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-400/80 hover:bg-red-500/10 border-b border-neutral-800"
            >
              Vider l'emplacement
            </button>
          )}

          <ul id={listId} ref={listRef} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {rows.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-neutral-500">Aucune capacité ne correspond.</li>
            )}
            {rows.map(({ cap, state }, i) => {
              const isSelected = String(cap.id) === value;
              const isActive = i === activeIndex;
              const isDisabled = !!state.disabledReason;
              return (
                <li
                  key={cap.id}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isDisabled}
                  onPointerEnter={() => !isDisabled && setActiveIndex(i)}
                  onClick={() => !isDisabled && choose(String(cap.id))}
                  className={`flex items-center gap-3 px-3 py-1.5 ${
                    isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  } ${isActive && !isDisabled ? 'bg-yellow-500/10' : ''} ${isSelected ? 'border-l-2 border-yellow-500' : 'border-l-2 border-transparent'}`}
                >
                  <span className="flex-1 min-w-0">
                    <span className={`block truncate text-sm ${isSelected ? 'text-yellow-400 font-bold' : 'text-neutral-200'}`}>
                      {cap.nom_capacite}
                    </span>
                    <span className="block truncate text-[11px] text-neutral-500">
                      {cap.nom_personnage}
                      {cap.type ? ` · ${cap.type}` : ''}
                      {state.disabledReason ? ` · ${state.disabledReason}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-bold text-neutral-300 tabular-nums">Niv {cap.niveau}</span>
                    <span className="block text-[11px] text-yellow-500/70 tabular-nums">-{state.cost}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
