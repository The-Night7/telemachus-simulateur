import type { Capacite } from './capacitesSource';
import { defaultBuild, SLOT_COUNT, STAT_KEYS, type BuildState, type SystemTab, type TargetModifier } from './simulation';

// Format "portable" d'un build, utilisé pour la sauvegarde locale, les builds
// enregistrés et les liens de partage. Les capacités y sont référencées par
// personnage|capacité|niveau et jamais par leur id : l'id n'est que la position de
// la ligne dans le gsheet trié, il change dès qu'une ligne y est ajoutée.
export interface PortableBuild {
  v: 1;
  tab: SystemTab;
  p: number;
  m: number;
  s: string[];
  x?: Record<string, string[]>;
  t?: Record<string, TargetModifier>;
  a?: 1;
  d?: 1;
  cr?: { mode: 'amp' | 'deamp'; rate: number; on: boolean };
  b?: Partial<Record<(typeof STAT_KEYS)[number], number>>;
}

export interface SavedBuild {
  id: string;
  name: string;
  savedAt: number;
  build: PortableBuild;
}

const capKey = (cap: Capacite) => `${cap.nom_personnage}|${cap.nom_capacite}|${cap.niveau}`;

// Le gsheet contient des lignes identiques (même personnage, capacité et niveau, ex:
// canon + RP fusionnés) : la clé portable porte alors un suffixe #n (n-ième occurrence
// dans l'ordre du gsheet) pour que deux doublons équipés restent deux lignes distinctes.
const buildKeyMaps = (capacites: Capacite[]) => {
  const idToKey = new Map<string, string>();
  const keyToId = new Map<string, string>();
  const seen = new Map<string, number>();
  capacites.forEach(c => {
    const base = capKey(c);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const key = n === 0 ? base : `${base}#${n}`;
    idToKey.set(String(c.id), key);
    keyToId.set(key, String(c.id));
  });
  return { idToKey, keyToId };
};

export const toPortable = (build: BuildState, capacites: Capacite[]): PortableBuild => {
  const { idToKey } = buildKeyMaps(capacites);
  const keyOf = (id: string) => idToKey.get(id) ?? '';

  const portable: PortableBuild = {
    v: 1,
    tab: build.tab,
    p: build.potential,
    m: build.mastery,
    s: build.slots.map(id => (id ? keyOf(id) : '')),
  };

  const x: Record<string, string[]> = {};
  Object.entries(build.extraModes).forEach(([i, ids]) => {
    const keys = ids.map(keyOf).filter(Boolean);
    if (keys.length) x[i] = keys;
  });
  if (Object.keys(x).length) portable.x = x;
  if (Object.keys(build.targetModifiers).length) portable.t = { ...build.targetModifiers };
  if (build.amplified) portable.a = 1;
  if (build.deamplified) portable.d = 1;
  if (build.customRateOn || build.customRate !== 0.5 || build.customRateMode !== 'amp') {
    portable.cr = { mode: build.customRateMode, rate: build.customRate, on: build.customRateOn };
  }
  const b: PortableBuild['b'] = {};
  STAT_KEYS.forEach(k => {
    if (build.boosts[k]) b[k] = build.boosts[k];
  });
  if (Object.keys(b).length) portable.b = b;
  return portable;
};

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

// Reconstruit un BuildState à partir d'un build portable (venant du stockage local ou
// d'un lien, donc non fiable) : toute valeur invalide retombe sur la valeur par défaut,
// toute capacité introuvable dans le gsheet actuel laisse son emplacement vide.
export const fromPortable = (raw: unknown, capacites: Capacite[]): BuildState | null => {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<PortableBuild>;
  const tab: SystemTab = p.tab === 'alternative' ? 'alternative' : 'classic';
  const base = defaultBuild(tab);

  const { keyToId } = buildKeyMaps(capacites);
  const idOf = (key: unknown) => (typeof key === 'string' && keyToId.get(key)) || '';

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => idOf(Array.isArray(p.s) ? p.s[i] : ''));

  const extraModes: BuildState['extraModes'] = {};
  if (p.x && typeof p.x === 'object') {
    Object.entries(p.x).forEach(([i, keys]) => {
      const idx = Number(i);
      if (!slots[idx] || !Array.isArray(keys)) return;
      const ids = keys.map(idOf).filter(Boolean);
      if (ids.length) extraModes[idx] = ids;
    });
  }

  const targetModifiers: BuildState['targetModifiers'] = {};
  if (p.t && typeof p.t === 'object') {
    Object.entries(p.t).forEach(([i, mod]) => {
      const idx = Number(i);
      if (slots[idx] && (mod === 'amp' || mod === 'deamp')) targetModifiers[idx] = mod;
    });
  }

  const boosts = { ...base.boosts };
  if (p.b && typeof p.b === 'object') {
    STAT_KEYS.forEach(k => {
      boosts[k] = Math.round(num(p.b?.[k], 0, 0, 3));
    });
  }

  return {
    ...base,
    potential: num(p.p, base.potential, 1, 10),
    mastery: num(p.m, base.mastery, 1, 10),
    slots,
    extraModes,
    targetModifiers,
    amplified: p.a === 1 && p.d !== 1,
    deamplified: p.d === 1 && p.a !== 1,
    customRateOn: !!p.cr?.on,
    customRateMode: p.cr?.mode === 'deamp' ? 'deamp' : 'amp',
    customRate: num(p.cr?.rate, base.customRate, 0, 1),
    boosts,
  };
};

// --- Lien de partage : le build portable encodé en base64url dans le hash (#b=…),
// jamais envoyé au serveur. ---
const SHARE_PARAM = 'b';

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (encoded: string) => {
  const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const buildShareUrl = (portable: PortableBuild) => {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${SHARE_PARAM}=${toBase64Url(JSON.stringify(portable))}`;
};

export const readSharedBuild = (): unknown | null => {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return null;
  try {
    return JSON.parse(fromBase64Url(encoded));
  } catch {
    return null;
  }
};

export const clearSharedBuildFromUrl = () => {
  const { pathname, search } = window.location;
  window.history.replaceState(null, '', `${pathname}${search}`);
};

// --- Stockage local (navigateur) : build en cours, builds enregistrés, préférences
// d'affichage. Chaque accès est protégé : navigation privée ou stockage bloqué ne
// doivent jamais casser l'app. ---
const KEYS = {
  current: 'telemachus.currentBuild.v1',
  saved: 'telemachus.savedBuilds.v1',
  prefs: 'telemachus.prefs.v1',
};

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : la sauvegarde est simplement ignorée.
  }
};

export const loadCurrentBuild = () => readJson(KEYS.current);
export const saveCurrentBuild = (portable: PortableBuild) => writeJson(KEYS.current, portable);

export const loadSavedBuilds = (): SavedBuild[] => {
  const raw = readJson(KEYS.saved);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is SavedBuild =>
      b && typeof b.id === 'string' && typeof b.name === 'string' && typeof b.savedAt === 'number' && !!b.build
  );
};
export const storeSavedBuilds = (builds: SavedBuild[]) => writeJson(KEYS.saved, builds);

export interface Prefs {
  capAt10: boolean;
  identityIndex: number;
  hideExportLevel: boolean;
}

export const defaultPrefs: Prefs = { capAt10: false, identityIndex: 0, hideExportLevel: false };

export const loadPrefs = (): Prefs => {
  const raw = readJson(KEYS.prefs) as Partial<Prefs> | null;
  return {
    capAt10: !!raw?.capAt10,
    identityIndex: typeof raw?.identityIndex === 'number' ? raw.identityIndex : 0,
    hideExportLevel: !!raw?.hideExportLevel,
  };
};
export const storePrefs = (prefs: Prefs) => writeJson(KEYS.prefs, prefs);

export const newSavedBuildId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
