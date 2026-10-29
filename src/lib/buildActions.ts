import type { Capacite } from './capacitesSource';
import {
  applyTargetModifier,
  defaultBuild,
  getAuraCost,
  getLevels,
  getTierInfo,
  SYSTEM_DEFAULTS,
  type BuildState,
  type Simulation,
  type StatKey,
  type SystemTab,
  type TargetModifier,
} from './simulation';

// Transitions pures du BuildState : chaque interaction de l'UI renvoie le build
// suivant (ou null quand elle est refusée, ex: aura insuffisante), ce qui permet
// l'historique (annuler / rétablir) et la sauvegarde sans logique dupliquée.

const filterByIndex = <T,>(record: Record<number, T>, keep: (index: number) => boolean): Record<number, T> => {
  const next: Record<number, T> = {};
  Object.keys(record).forEach(k => {
    const idx = Number(k);
    if (keep(idx)) next[idx] = record[idx];
  });
  return next;
};

// Vide les emplacements au-delà du nombre de copies du tier courant (ex: le niveau
// baisse, ou le déamplificateur fait chuter le tier), avec leurs modes et modificateurs.
export const normalizeBuild = (build: BuildState): BuildState => {
  const { copyLevel } = getLevels(build);
  const tierSlots = getTierInfo(copyLevel).slots;
  if (!build.slots.some((id, i) => i >= tierSlots && id)) return build;
  return {
    ...build,
    slots: build.slots.map((id, i) => (i >= tierSlots ? '' : id)),
    extraModes: filterByIndex(build.extraModes, i => i < tierSlots),
    targetModifiers: filterByIndex(build.targetModifiers, i => i < tierSlots),
  };
};

export const switchTab = (build: BuildState, tab: SystemTab): BuildState => ({
  ...build,
  tab,
  potential: SYSTEM_DEFAULTS[tab].potential,
  mastery: SYSTEM_DEFAULTS[tab].mastery,
});

export const resetBuild = (build: BuildState): BuildState => defaultBuild(build.tab);

const withTargetModifier = (
  record: Record<number, TargetModifier>,
  index: number,
  modifier: TargetModifier | undefined
) => {
  const next = { ...record };
  if (modifier) next[index] = modifier;
  else delete next[index];
  return next;
};

export const clearSlot = (build: BuildState, index: number): BuildState => ({
  ...build,
  slots: build.slots.map((id, i) => (i === index ? '' : id)),
  extraModes: filterByIndex(build.extraModes, i => i !== index),
  targetModifiers: withTargetModifier(build.targetModifiers, index, undefined),
});

export const updateSlot = (
  build: BuildState,
  sim: Simulation,
  capacites: Capacite[],
  index: number,
  value: string
): BuildState | null => {
  if (!value) return clearSlot(build, index);

  const cap = sim.findSlotCap(index, value);
  if (!cap) return null;

  const currentSlotVal = build.slots[index];
  const currentCap = currentSlotVal ? sim.findSlotCap(index, currentSlotVal) : null;
  const currentDrainInThisSlot = currentCap ? getAuraCost(currentCap.niveau) : 0;
  const projectedAuraDrain = sim.currentAuraDrain - currentDrainInThisSlot + getAuraCost(cap.niveau);
  if (projectedAuraDrain > sim.maxAura) return null;

  // Le nouveau pick "principal" peut appartenir à un autre groupe de modes (ou à
  // aucun) : on ne garde que les extras qui partagent encore sa mode_group_key, et on
  // retire le nouveau pick lui-même s'il y était déjà (cf. john_unordinary).
  const existing = build.extraModes[index] || [];
  const filtered = existing.filter(id => {
    if (id === value) return false;
    const sibling = capacites.find(c => c.id === parseInt(id));
    return sibling && sibling.mode_group_key === cap.mode_group_key;
  });
  const extraModes = filterByIndex(build.extraModes, i => i !== index);
  if (filtered.length > 0) extraModes[index] = filtered;

  return {
    ...build,
    slots: build.slots.map((id, i) => (i === index ? value : id)),
    extraModes,
  };
};

// Bascule amp / déamp de la personne copiée (exclusifs), refusée si le coût d'aura
// de la capacité modifiée dépasse la réserve.
export const toggleTargetModifier = (
  build: BuildState,
  sim: Simulation,
  capacites: Capacite[],
  index: number,
  modifier: TargetModifier
): BuildState | null => {
  const slotId = build.slots[index];
  const current = build.targetModifiers[index];
  const nextModifier = current === modifier ? undefined : modifier;
  const base = slotId ? capacites.find(c => c.id === parseInt(slotId)) : null;
  if (base && nextModifier) {
    const currentDrainInThisSlot = getAuraCost(applyTargetModifier(base, current).niveau);
    const newDrain = getAuraCost(applyTargetModifier(base, nextModifier).niveau);
    if (sim.currentAuraDrain - currentDrainInThisSlot + newDrain > sim.maxAura) return null;
  }
  return { ...build, targetModifiers: withTargetModifier(build.targetModifiers, index, nextModifier) };
};

export const toggleExtraMode = (build: BuildState, index: number, modeId: string): BuildState => {
  const existing = build.extraModes[index] || [];
  const next = existing.includes(modeId) ? existing.filter(id => id !== modeId) : [...existing, modeId];
  return { ...build, extraModes: { ...build.extraModes, [index]: next } };
};

// Passe à l'option d'amplification suivante abordable pour cette stat, ou revient à
// "aucune" après la dernière.
export const cycleBoost = (build: BuildState, sim: Simulation, key: StatKey): BuildState | null => {
  const options = sim.boostOptions[key];
  if (options.length === 0) return null;

  const currentIdx = build.boosts[key];
  let nextIdx = currentIdx + 1;

  while (nextIdx <= options.length) {
    const opt = options[nextIdx - 1];
    const oldCost = currentIdx > 0 ? options[currentIdx - 1].cost : 0;
    if (sim.auraRemaining >= opt.cost - oldCost) break;
    nextIdx++;
  }

  if (nextIdx > options.length) nextIdx = 0;

  return { ...build, boosts: { ...build.boosts, [key]: nextIdx } };
};
