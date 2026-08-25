/**
 * Régénère src/capacites.json (le fallback hors-ligne utilisé par useCapacites
 * tant que le fetch runtime n'a pas abouti) directement depuis le gsheet
 * "unodex-meta". Réutilise exactement la même logique de parsing/tri/filtrage
 * que le runtime (src/lib/capacitesSource.ts) pour garantir qu'il n'y a jamais
 * de dérive entre le fallback et les données live.
 *
 * Usage: npx tsx scripts/sync-capacites.ts
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCapacites } from '../src/lib/capacitesSource';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'capacites.json');

async function main() {
  const capacites = await fetchCapacites();
  writeFileSync(OUTPUT_PATH, JSON.stringify(capacites, null, 2) + '\n', 'utf-8');
  console.log(`${OUTPUT_PATH}: ${capacites.length} capacités synchronisées depuis le gsheet.`);
}

main().catch((err) => {
  console.error('Échec de la synchronisation avec le gsheet:', err);
  process.exitCode = 1;
});
