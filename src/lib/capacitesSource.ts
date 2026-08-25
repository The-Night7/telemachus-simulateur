import Papa from 'papaparse';
import overridesRaw from '../data/stat_principale_overrides.json';

// Onglet "unodex-meta" : fusion canon + RP déjà triée par niveau, tenue à jour
// par l'utilisateur comme unique source de vérité pour la liste de capacités.
const SHEET_ID = '1APDJ55nkI1Be6pC_bazGjsDRYzLF67AzHOL6M302GNs';
const SHEET_GID = '38554490';
export const CAPACITES_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

const STAT_KEYS = ['power', 'speed', 'trick', 'recovery', 'defense'] as const;
type StatKey = (typeof STAT_KEYS)[number];

// Cf. scripts/generate_capacites.py: stat auto-boostée par défaut à partir de
// la colonne "Nature" quand aucun override n'est renseigné.
const NATURE_TO_STAT: Record<string, StatKey> = {
  'Vivacité': 'speed',
  'Defense': 'defense',
  'Attaque': 'power',
  'Support': 'recovery',
  'Stratege': 'power',
};

export interface Capacite {
  id: number;
  nom_personnage: string;
  nom_capacite: string;
  niveau: number;
  type: string;
  copiable: boolean;
  stat_principale: StatKey;
  stats_de_base: Record<StatKey, number>;
  ratios_stats: Record<StatKey, number>;
  tier: string;
  nature: string;
  description: string;
}

type OverrideEntry = { nom_personnage: string; nom_capacite: string; niveau: number; stat_principale: StatKey };

const overridesMap = new Map<string, StatKey>(
  (overridesRaw as OverrideEntry[]).map((o) => [`${o.nom_personnage}|${o.nom_capacite}|${o.niveau}`, o.stat_principale])
);

const statColumn: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  trick: 'Trick',
  recovery: 'Recovery',
  defense: 'Defense',
};

// Les cases vides du gsheet sont traitées comme 0 plutôt que d'exclure la ligne.
const parseFrNumber = (raw: string | undefined): number => {
  if (!raw || raw.trim() === '') return 0;
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

const trunc3 = (x: number) => Math.trunc(x * 1000) / 1000;

export function parseCapacitesCsv(csvText: string): Capacite[] {
  const { data: rows } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const entries: Omit<Capacite, 'id'>[] = [];

  for (const row of rows) {
    const ability = (row['Ability'] || '').trim();
    if (!ability || ability === 'Aucune') continue;

    const niveau = parseFloat((row['Level'] || '').replace(',', '.'));
    if (Number.isNaN(niveau)) continue;

    const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, parseFrNumber(row[statColumn[k]])])) as Record<
      StatKey,
      number
    >;

    const name = row['Name'] || '';
    const overrideKey = `${name}|${ability}|${niveau}`;
    let statPrincipale = overridesMap.get(overrideKey);
    if (!statPrincipale) {
      const nature = row['Nature'] || '';
      statPrincipale = NATURE_TO_STAT[nature];
      if (!statPrincipale) {
        // "trick" scale automatiquement avec le niveau : jamais un choix pertinent par défaut.
        const nonTrick = STAT_KEYS.filter((k) => k !== 'trick');
        statPrincipale = nonTrick.reduce((best, k) => (stats[k] > stats[best] ? k : best), nonTrick[0]);
      }
    }

    const ratios = Object.fromEntries(
      STAT_KEYS.map((k) => [k, niveau > 0 ? trunc3(stats[k] / niveau) : 0])
    ) as Record<StatKey, number>;

    const type = row['Type'] || '';

    entries.push({
      nom_personnage: name,
      nom_capacite: ability,
      niveau,
      type,
      copiable: type !== 'Mental',
      stat_principale: statPrincipale,
      stats_de_base: stats,
      ratios_stats: ratios,
      tier: row['Tier'] || '',
      nature: row['Nature'] || '',
      description: row['Ability Description'] || '',
    });
  }

  // Le gsheet n'est pas toujours trié par niveau (blocs RP ajoutés en fin de
  // section sans tri) : on impose l'ordre croissant pour un menu lisible.
  entries.sort((a, b) => a.niveau - b.niveau);

  return entries.map((entry, index) => ({ id: index + 1, ...entry }));
}

export async function fetchCapacites(): Promise<Capacite[]> {
  const res = await fetch(CAPACITES_CSV_URL);
  if (!res.ok) {
    throw new Error(`Échec du chargement du gsheet (HTTP ${res.status})`);
  }
  const csvText = await res.text();
  const entries = parseCapacitesCsv(csvText);
  if (entries.length === 0) {
    throw new Error('Le gsheet a répondu mais aucune capacité valide n\'a pu en être extraite.');
  }
  return entries;
}
