import { bonusStatsAtLevel, STAT_KEYS, type Capacite, type StatKey } from './capacitesSource';

export { STAT_KEYS, type StatKey };

// Moteur de simulation pur : à partir d'un BuildState et de la liste de capacités,
// calcule tout ce que l'UI affiche. Aucune dépendance à React, ce qui permet de
// simuler n'importe quel build (le build courant comme un build sauvegardé à
// comparer) avec exactement les mêmes règles.

export type Stats = Record<StatKey, number>;
export type SystemTab = 'classic' | 'alternative';

export type StatInfo = {
  val: number;
  sourceLevel: number;
  isAutoBoosted: boolean;
  autoBoostMult?: number;
};

export type BoostOption = {
  mult: number;
  cost: number;
  label: string;
};

// Cible copiée amplifiée / déamplifiée, à choisir avant la copie. Amp ne change rien : la
// copie se fait depuis le niveau d'origine. Déamp : on copie les stats déamp, soit le
// niveau ET les stats de base de la capacité ÷2 (les ratios stat/niveau restent
// identiques). Tout ce qui dépend du niveau de la capacité suit donc (règle de copie,
// autoboost, coût d'aura, écart de niveau).
export type TargetModifier = 'amp' | 'deamp';

export interface BuildState {
  tab: SystemTab;
  potential: number;
  mastery: number;
  // Id (stringifié) de la capacité principale de chaque emplacement, "" si vide.
  slots: string[];
  // Modes additionnels choisis par emplacement, pour les capacités qui partagent une
  // mode_group_key (ex: Phase Shift (Def)/(Off) chez Zeke) — le mode choisi dans le
  // slot reste le mode "principal", extraModes ajoute d'autres modes du même groupe
  // qui restent actifs EN MÊME TEMPS (fusionnés dans le build + calques sur le radar),
  // exactement comme john_unordinary.
  extraModes: Record<number, string[]>;
  // Amplificateur / déamplificateur de la personne copiée, par emplacement (s'applique
  // au pick principal et à ses modes additionnels).
  targetModifiers: Record<number, TargetModifier>;
  // Exclusifs l'un de l'autre : cocher l'un décoche l'autre.
  amplified: boolean;
  deamplified: boolean;
  // Taux personnalisé (cf. graph-unordinary) : remplace les facteurs fixes tant qu'il est
  // actif — amp ×(1 + taux), désamp ×(1 − taux).
  customRateOn: boolean;
  customRateMode: 'amp' | 'deamp';
  customRate: number;
  // Index (1-based, 0 = aucun) de l'option d'amplification choisie pour chaque stat.
  boosts: Stats;
}

// Potentiel/Mastery par défaut à l'ouverture de chaque système. Le Système Classique
// garde ses valeurs historiques ; le Système Shine-City a les siennes propres.
export const SYSTEM_DEFAULTS: Record<SystemTab, { potential: number; mastery: number }> = {
  classic: { potential: 9.5, mastery: 6.6 },
  alternative: { potential: 8.0, mastery: 7.1 },
};

export const SLOT_COUNT = 4;

export const zeroStats = (): Stats => ({ power: 0, speed: 0, trick: 0, recovery: 0, defense: 0 });

export const defaultBuild = (tab: SystemTab = 'classic'): BuildState => ({
  tab,
  potential: SYSTEM_DEFAULTS[tab].potential,
  mastery: SYSTEM_DEFAULTS[tab].mastery,
  slots: Array(SLOT_COUNT).fill(''),
  extraModes: {},
  targetModifiers: {},
  amplified: false,
  deamplified: false,
  customRateOn: false,
  customRateMode: 'amp',
  customRate: 0.5,
  boosts: zeroStats(),
});

// --- LOGIQUE DE TIER ET DE SLOTS DE TELEMACHUS ---
// Amplificateur / Déamplificateur (mêmes facteurs que graph-unordinary) : appliqués
// au niveau de Telemachus AVANT la copie, donc tout le moteur de fusion travaille
// avec ce niveau modifié, y compris le tier (nombre de copies) et la réserve d'aura.
export const AMPLIFIER_FACTOR = 1.5;
export const DEAMPLIFIER_FACTOR = 0.5;

export const applyTargetModifier = (cap: Capacite, modifier: TargetModifier | undefined): Capacite => {
  if (modifier !== 'deamp') return cap;
  const stats_de_base = {} as Stats;
  STAT_KEYS.forEach(key => {
    stats_de_base[key] = cap.stats_de_base[key] * DEAMPLIFIER_FACTOR;
  });
  return { ...cap, niveau: cap.niveau * DEAMPLIFIER_FACTOR, stats_de_base };
};

export type TierInfo = { name: string; slots: number; color: string; badge: string };

export const getTierInfo = (level: number): TierInfo => {
  if (level < 2.0) return { name: "Low-Tier", slots: 1, color: "text-neutral-400", badge: "text-neutral-400 bg-neutral-400/10 border-neutral-400/30" };
  if (level < 4.0) return { name: "Mid-Tier", slots: 2, color: "text-green-400", badge: "text-green-400 bg-green-400/10 border-green-400/30" };
  if (level < 5.0) return { name: "Elite-Tier", slots: 2, color: "text-blue-400", badge: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  if (level < 6.0) return { name: "High-Tier", slots: 3, color: "text-purple-400", badge: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  return { name: "God-Tier", slots: 4, color: "text-yellow-400", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
};

// --- LOGIQUE DE DRAIN D'AURA DE BASE ---
export const getAuraCost = (niveau: number) => {
  return parseFloat((niveau * (niveau / 1.5)).toFixed(1));
};

// --- LOGIQUE DE RÉSERVE D'AURA ---
export const getMaxAura = (copyLevel: number) => {
  if (copyLevel >= 7.5) return copyLevel * 25;
  if (copyLevel >= 7.0) return copyLevel * 20;
  if (copyLevel >= 6.0) return copyLevel * 15;
  return copyLevel * 10;
};

export const computeLevel = (potential: number, mastery: number) =>
  parseFloat(((potential * mastery) / 10).toFixed(1));

// Niveau de copie (après amplificateur / déamplificateur) d'un build.
export const getLevels = (build: BuildState) => {
  const level = computeLevel(build.potential, build.mastery);
  const ampOn = build.customRateOn ? build.customRateMode === 'amp' : build.amplified;
  const deampOn = build.customRateOn ? build.customRateMode === 'deamp' : build.deamplified;
  const ampFactor = build.customRateOn ? 1 + build.customRate : AMPLIFIER_FACTOR;
  const deampFactor = build.customRateOn ? 1 - build.customRate : DEAMPLIFIER_FACTOR;
  const copyLevel = level * (ampOn ? ampFactor : deampOn ? deampFactor : 1);
  return { level, copyLevel, ampOn, deampOn };
};

// --- MOTEUR DE FUSION ET IDENTIFICATION DES STATS FORTES/FAIBLES (AVEC POOL DE REPARTITION) ---
// Réutilisé tel quel à la fois pour le build équipé complet (tous les slots) et pour
// les calques de modes (cf. simulateBuild > modeLayers).
export const computeMergedStatsInfo = (
  equippedCaps: Capacite[],
  level: number,
  activeTab: SystemTab,
  // Bonus du gsheet propres à Telemachus (cf. telemachusBonus dans simulateBuild),
  // ajoutés à ses stats de base uniquement — jamais aux capacités copiées.
  telemachusBonus: Stats
): Record<StatKey, StatInfo> => {
  const stats: Record<StatKey, StatInfo> = {
    power: { val: 1 + telemachusBonus.power, sourceLevel: level, isAutoBoosted: false },
    speed: { val: 1 + telemachusBonus.speed, sourceLevel: level, isAutoBoosted: false },
    trick: { val: level * 2.414 + telemachusBonus.trick, sourceLevel: level, isAutoBoosted: false },
    recovery: { val: 1 + telemachusBonus.recovery, sourceLevel: level, isAutoBoosted: false },
    defense: { val: 1 + telemachusBonus.defense, sourceLevel: level, isAutoBoosted: false }
  };

  // 2. CALCUL DES MULTIPLICATEURS (Shine-City)
  const multMap = new Map<number, number>();
  if (activeTab === 'alternative') {
    // Capacités plus faibles ou égales
    const weakerCaps = equippedCaps.filter(cap => cap.niveau <= level).sort((a, b) => a.niveau - b.niveau);
    weakerCaps.forEach((cap, idx) => {
      const diff = level - cap.niveau;
      // Si la capacité est bien plus faible (>= 2 niveaux d'écart) ET c'est la plus faible -> 1.75
      if (idx === 0 && diff >= 2.0) {
        multMap.set(cap.id, 1.75);
      } else if (idx === 0 && diff <= -1.0) {
        multMap.set(cap.id, 1.25);
      } else {
        multMap.set(cap.id, 1.5);
      }
    });

    // Capacités trop complexes (plus fortes que lui)
    const strongerCaps = equippedCaps.filter(cap => cap.niveau > level);
    strongerCaps.forEach(cap => {
      const diff = cap.niveau - level;
      // Si la capacité est bien trop puissante (>= 1 niveau d'écart) -> 1.25
      if (diff >= 1.0) {
        multMap.set(cap.id, 1.25);
      } else {
        multMap.set(cap.id, 1.5);
      }
    });
  }

  // 3. RÉPARTITION GLOBALE DES STATS À BOOSTER (Shine-City)
  const abilityBoostMap = new Map<number, StatKey>();
  if (activeTab === 'alternative') {
    const pool: { id: number, stat: StatKey, val: number }[] = [];
    equippedCaps.forEach(cap => {
      (['power', 'speed', 'recovery', 'defense'] as const).forEach(stat => {
        pool.push({ id: cap.id, stat, val: cap.stats_de_base[stat] });
      });
    });

    pool.sort((a, b) => {
      if (b.val !== a.val) return b.val - a.val;
      const capA = equippedCaps.find(c => c.id === a.id);
      const capB = equippedCaps.find(c => c.id === b.id);
      return (capB?.niveau || 0) - (capA?.niveau || 0);
    });

    const assignedStats = new Set<string>();

    for (const item of pool) {
      if (!abilityBoostMap.has(item.id) && !assignedStats.has(item.stat)) {
        abilityBoostMap.set(item.id, item.stat);
        assignedStats.add(item.stat);
      }
    }
  }

  // 4. FUSION DES STATS FINALES
  equippedCaps.forEach(cap => {
    let currentAutoBoostMult = 1.5;
    let keyToBoost: StatKey | null = null;

    if (activeTab === 'alternative') {
      currentAutoBoostMult = multMap.get(cap.id) || 1.5;
      keyToBoost = abilityBoostMap.get(cap.id) || null;
    } else {
      // Boost réduit à x1.2 quand la capacité copiée est de plus d'un niveau
      // plus faible que Telemachus (au lieu du x1.5 par défaut).
      currentAutoBoostMult = (level - cap.niveau > 1) ? 1.2 : 1.5;
      keyToBoost = cap.stat_principale;
    }

    // Les 2 stats (hors trick) les plus hautes de la capacité d'origine sont
    // remontées au niveau de Telemachus quand elle est plus faible/égale ;
    // les 2 autres restent brutes.
    const nonTrickKeys: StatKey[] = ['power', 'speed', 'recovery', 'defense'];
    const topTwoNonTrick = new Set(
      [...nonTrickKeys]
        .sort((a, b) => cap.stats_de_base[b] - cap.stats_de_base[a])
        .slice(0, 2)
    );

    for (const baseKey of Object.keys(cap.stats_de_base) as StatKey[]) {
      // RÈGLE DE COPIE :
      // - Capacité plus forte que Telemachus (isTelemachusWeaker) = ramenée à son niveau
      //   (ratios * niveau), sans pénalité, sur toutes les stats.
      // - Capacité plus faible/égale = Trick et les 2 stats les plus hautes remontées au niveau de
      //   Telemachus (ratios * niveau) ; les 2 autres stats restent brutes.
      const isTelemachusWeaker = level < cap.niveau;
      let valeurCopiee: number;
      if (isTelemachusWeaker) {
        valeurCopiee = cap.ratios_stats[baseKey] * level;
      } else if (baseKey === 'trick' || topTwoNonTrick.has(baseKey)) {
        valeurCopiee = cap.ratios_stats[baseKey] * level;
      } else {
        valeurCopiee = cap.stats_de_base[baseKey];
      }

      // L'autoboost ne s'applique qu'aux capacités plus faibles/égales (celles remontées
      // au niveau de Telemachus) — jamais à une capacité plus forte que lui.
      const isBoostedThisStat = !isTelemachusWeaker && baseKey === keyToBoost;
      if (isBoostedThisStat) {
        valeurCopiee *= currentAutoBoostMult;
      }

      // Pénalité d'inefficacité de copie : s'applique après tout le reste (branche +
      // autoboost éventuel), sur toutes les stats copiées.
      valeurCopiee *= 0.75;

      // On met à jour la statistique de Telemachus si la valeur est supérieure
      if (valeurCopiee > stats[baseKey].val) {
        stats[baseKey] = {
          val: valeurCopiee,
          sourceLevel: cap.niveau,
          isAutoBoosted: isBoostedThisStat,
          autoBoostMult: isBoostedThisStat ? currentAutoBoostMult : undefined
        };
      } else if (valeurCopiee === stats[baseKey].val && isBoostedThisStat) {
        stats[baseKey].isAutoBoosted = true;
        stats[baseKey].autoBoostMult = currentAutoBoostMult;
      }
    }
  });

  return stats;
};

// --- LOGIQUE DES OPTIONS D'AMPLIFICATION ---
export const getBoostOptions = (sourceLevel: number, copyLevel: number, mastery: number): BoostOption[] => {
  const isTelemachusStrong = sourceLevel <= copyLevel;

  const options: BoostOption[] = [];
  if (isTelemachusStrong) {
    if (mastery >= 1.6) options.push({ mult: mastery >= 10 ? 1.3 : 1.25, cost: 1.5, label: mastery >= 10 ? 'x1.3 (Très Faible)' : 'x1.25 (Très Faible)' });
    if (mastery >= 2.5) options.push({ mult: 1.5, cost: 2.5, label: 'x1.5 (Faible)' });
    if (mastery >= 4.0) options.push({ mult: 1.75, cost: 5.0, label: 'x1.75 (Standard)' });
  } else {
    if (mastery >= 6.0) options.push({ mult: 1.05, cost: 2.5, label: 'x1.05 (Faible)' });
    if (mastery >= 7.5) options.push({ mult: mastery >= 10 ? 1.3 : 1.25, cost: 5.0, label: mastery >= 10 ? 'x1.3 (Standard)' : 'x1.25 (Standard)' });
    if (mastery >= 8.5) options.push({ mult: 1.5, cost: 7.5, label: 'x1.5 (Élevé)' });
  }
  return options;
};

// --- ALGORITHME DU NIVEAU EFFECTIF ESTIMÉ (Moyenne Extra + Bridage par Tiers) ---
export const estimateEffectiveLevel = (statsFinales: Stats, copyLevel: number): string => {
  const { power, speed, recovery, defense } = statsFinales;

  // 1. Dérivation des Extra Stats (Formules combinées)
  const attackSpeed = power * speed / copyLevel;
  const attackCharge = power * recovery / copyLevel;

  // 2. Somme totale incluant les 5 stats + les 2 extras
  const totalSum = power + speed + recovery + defense + attackSpeed + attackCharge;

  // 3. Calcul de la moyenne brute en divisant par 5 (pour matcher la progression)
  let rawLevel = totalSum / 5;

  // Lissage pour les hauts niveaux afin d'éviter une explosion de la valeur
  if (rawLevel > 7.0) {
    rawLevel = 7.0 + (rawLevel - 7.0) * 0.4;
  }

  // 4. Règles strictes de Tiers (basées sur la stat max, sans inclure le 'trick')
  const baseStats = [power, speed, recovery, defense];
  const maxBaseStat = Math.max(...baseStats);
  const statsOver10 = baseStats.filter(s => s >= 10).length;

  let minLvl = 1.0;
  let maxLvl = 10.0;

  if (maxBaseStat <= 2.0) {
    maxLvl = 1.9; // Low tier
  } else if (maxBaseStat <= 4.0) {
    minLvl = 2.0;
    maxLvl = 3.0; // Mid tier (jusqu'au niveau 3)
  } else if (maxBaseStat <= 5.0) {
    minLvl = 3.1;
    maxLvl = 3.9; // Mid tier (passé niveau 3)
  } else if (maxBaseStat <= 7.0) {
    minLvl = 4.0;
    maxLvl = 4.9; // Elite tier
  } else if (maxBaseStat <= 9.9) {
    minLvl = 5.0;
    maxLvl = 6.9; // High tier & God tier initial (jusqu'à 7.0)
  } else {
    // maxBaseStat >= 10.0 (God tier supérieur)
    if (statsOver10 <= 1) {
      minLvl = 7.0;
      maxLvl = 7.4;
    } else if (statsOver10 === 2) {
      minLvl = 7.5;
      maxLvl = 8.9; // Niveau 7.5+ avec 2 stats dépassant 10
    } else {
      minLvl = 9.0;
      maxLvl = 10.0; // 3 stats ou + dépassant 10
    }
  }

  // 5. Bridage de la moyenne brute avec les limites dictées par les règles du Tier
  const finalLevel = Math.min(maxLvl, Math.max(minLvl, rawLevel));

  return finalLevel.toFixed(1);
};

export interface ModeLayer {
  id: string;
  label: string;
  nomCapacite: string;
  stats: Stats;
  modifiedStats: Stats | null;
}

export interface Simulation {
  level: number;
  copyLevel: number;
  ampOn: boolean;
  deampOn: boolean;
  tierInfo: TierInfo;
  slotsUsed: number;
  equippedCaps: Capacite[];
  baseStatsInfo: Record<StatKey, StatInfo>;
  boostOptions: Record<StatKey, BoostOption[]>;
  modeLayers: ModeLayer[];
  maxAura: number;
  currentAuraDrain: number;
  auraRemaining: number;
  auraPercentage: number;
  statsFinales: Stats;
  unmodifiedStats: Stats;
  effectiveLevel: string;
  // Capacité d'un emplacement, modificateur de cible appliqué.
  findSlotCap: (index: number, id: string) => Capacite | undefined;
}

const toStats = (info: Record<StatKey, StatInfo>): Stats => ({
  power: info.power.val,
  speed: info.speed.val,
  trick: info.trick.val,
  recovery: info.recovery.val,
  defense: info.defense.val,
});

export const simulateBuild = (build: BuildState, capacites: Capacite[]): Simulation => {
  const { tab, slots, extraModes, targetModifiers, mastery } = build;
  const { level, copyLevel, ampOn, deampOn } = getLevels(build);
  const tierInfo = getTierInfo(copyLevel);

  const capById = new Map(capacites.map(c => [c.id, c]));
  const findSlotCap = (index: number, id: string): Capacite | undefined => {
    const cap = capById.get(parseInt(id));
    return cap && applyTargetModifier(cap, targetModifiers[index]);
  };

  // Capacités actuellement équipées : le pick "principal" de chaque emplacement, plus
  // ses éventuels modes additionnels (extraModes) — tous actifs en même temps.
  const equippedCaps: Capacite[] = [];
  slots.forEach((id, index) => {
    if (index >= tierInfo.slots || !id) return;
    const principal = findSlotCap(index, id);
    if (!principal) return;
    equippedCaps.push(principal);
    (extraModes[index] || []).forEach(extraId => {
      const extra = findSlotCap(index, extraId);
      if (extra) equippedCaps.push(extra);
    });
  });

  // Bonus en vigueur au niveau, d'après les lignes "Telemachus" du gsheet.
  // Version classique uniquement : Shine-City n'a pas de bonus.
  const telemachusRows = capacites.filter(c => c.nom_personnage === 'Telemachus');
  const bonusAt = (lvl: number) => (tab === 'classic' ? bonusStatsAtLevel(telemachusRows, lvl) : zeroStats());
  const telemachusBonus = bonusAt(copyLevel);
  const realTelemachusBonus = copyLevel === level ? telemachusBonus : bonusAt(level);

  const baseStatsInfo = computeMergedStatsInfo(equippedCaps, copyLevel, tab, telemachusBonus);

  // --- CALQUES DE MODES (style Phase Shift) ---
  // On fusionne au maximum : un emplacement avec un SEUL mode actif (pas d'extra
  // coché) est une capacité normale comme une autre — elle n'a rien à comparer,
  // donc pas de calque dédié, juste sa contribution normale dans le build fusionné.
  // Les calques n'apparaissent QUE pour un emplacement qui a au moins 2 modes actifs
  // EN MÊME TEMPS (principal + au moins un extra coché) : pour chaque mode actif de CET
  // emplacement, simule le build COMPLET (tous les autres emplacements et leurs modes
  // gardant leur contribution normale) en substituant UNIQUEMENT ce mode à la
  // contribution de cet emplacement — les calques se comparent EN CONTEXTE avec le reste
  // du build, jamais isolés sur les stats de repos de Telemachus (cf. john_unordinary :
  // mergeSlotsIntoStats avec overrideSlotIndex/overrideId). Tracé À LA PLACE de l'Aura
  // Shape fusionnée normale dès qu'au moins un calque existe (cf. RadarChart >
  // hasLayers). N'affecte jamais baseStatsInfo/statsFinales eux-mêmes, qui restent la
  // fusion de TOUS les modes actifs de TOUS les emplacements (le "vrai" build).
  // Avec amplificateur / déamplificateur, chaque calque est calculé deux fois : au
  // niveau réel (stats, forme normale) et au niveau de copie (modifiedStats), pour lui
  // appliquer individuellement le même rendu amp/désamp que la forme principale.
  const modeLayers: ModeLayer[] = [];
  slots.forEach((slotId, index) => {
    if (index >= tierInfo.slots || !slotId) return;
    if (!capById.has(parseInt(slotId))) return;

    const activeIds = [slotId, ...(extraModes[index] || [])];
    if (activeIds.length <= 1) return;

    activeIds.forEach(id => {
      const cap = findSlotCap(index, id);
      if (!cap) return;

      const overrideCaps: Capacite[] = [];
      slots.forEach((sid, i) => {
        if (i >= tierInfo.slots || !sid) return;
        if (i === index) {
          overrideCaps.push(cap);
          return;
        }
        const p = findSlotCap(i, sid);
        if (p) overrideCaps.push(p);
        (extraModes[i] || []).forEach(extraId => {
          const extra = findSlotCap(i, extraId);
          if (extra) overrideCaps.push(extra);
        });
      });

      modeLayers.push({
        id: `${index}-${cap.id}`,
        label: cap.mode_label || cap.nom_capacite,
        nomCapacite: cap.nom_capacite_base,
        stats: toStats(computeMergedStatsInfo(overrideCaps, level, tab, realTelemachusBonus)),
        modifiedStats:
          copyLevel === level
            ? null
            : toStats(computeMergedStatsInfo(overrideCaps, copyLevel, tab, telemachusBonus)),
      });
    });
  });

  const boostOptions = {} as Record<StatKey, BoostOption[]>;
  STAT_KEYS.forEach(key => {
    boostOptions[key] = getBoostOptions(baseStatsInfo[key].sourceLevel, copyLevel, mastery);
  });

  const maxAura = getMaxAura(copyLevel);

  let drain = slots.reduce((total, slotId, index) => {
    if (!slotId) return total;
    const cap = findSlotCap(index, slotId);
    return total + (cap ? getAuraCost(cap.niveau) : 0);
  }, 0);
  STAT_KEYS.forEach(key => {
    const idx = build.boosts[key];
    if (idx > 0 && boostOptions[key][idx - 1]) drain += boostOptions[key][idx - 1].cost;
  });
  const currentAuraDrain = parseFloat(drain.toFixed(1));

  // --- STATS FINALES APRÈS BOOST ---
  const statsFinales = zeroStats();
  STAT_KEYS.forEach(key => {
    let val = baseStatsInfo[key].val;
    const idx = build.boosts[key];
    if (idx > 0 && boostOptions[key][idx - 1]) val *= boostOptions[key][idx - 1].mult;
    statsFinales[key] = val;
  });

  // Même build calculé au niveau RÉEL (sans amplificateur/déamplificateur) : c'est la
  // forme normale du radar et de l'export PNG, sur laquelle le build modifié
  // (statsFinales) est superposé — comme dans graph-unordinary. Les boosts d'aura
  // choisis gardent le même multiplicateur que sur le build modifié.
  let unmodifiedStats = statsFinales;
  if (copyLevel !== level) {
    const info = computeMergedStatsInfo(equippedCaps, level, tab, realTelemachusBonus);
    unmodifiedStats = zeroStats();
    STAT_KEYS.forEach(key => {
      unmodifiedStats[key] = info[key].val * (statsFinales[key] / baseStatsInfo[key].val);
    });
  }

  return {
    level,
    copyLevel,
    ampOn,
    deampOn,
    tierInfo,
    slotsUsed: slots.filter(s => s !== '').length,
    equippedCaps,
    baseStatsInfo,
    boostOptions,
    modeLayers,
    maxAura,
    currentAuraDrain,
    auraRemaining: parseFloat((maxAura - currentAuraDrain).toFixed(1)),
    auraPercentage: Math.min(100, (currentAuraDrain / maxAura) * 100),
    statsFinales,
    unmodifiedStats,
    effectiveLevel: estimateEffectiveLevel(statsFinales, copyLevel),
    findSlotCap,
  };
};
