import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, Zap, Swords, Brain, Heart, ChevronDown, Layers, Lock, Battery, ChevronsUp, Sparkles, Target, Download, RefreshCw, X } from 'lucide-react';
import { useCapacites } from './lib/useCapacites';
import type { Capacite } from './lib/capacitesSource';
import { exportRadarPng, type RadarIdentity } from './lib/exportRadarPng';
import tpPortrait from './assets/tp-pp.png';
import telemachusHighTierPortrait from './assets/telemachus.jpg';
import arlequinPortrait from './assets/arlequin.webp';
import arlequinePortrait from './assets/Arlequine.jpeg';

// Niveau à partir duquel le portrait de Telemachus sur la fiche exportée passe à sa
// forme éveillée (telemachus.jpg) au lieu du portrait de base (tp-pp.png).
const TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL = 6.0;

// Identités exportables sur la fiche radar : mêmes stats/mécaniques, juste le nom,
// l'ability affichée et le portrait qui changent selon le masque choisi. Le portrait de
// Telemachus dépend du niveau actuel (cf. TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL).
const buildRadarIdentities = (level: number): RadarIdentity[] => [
  {
    name: 'Telemachus',
    ability: 'Aura Deity',
    portraitSrc: level >= TELEMACHUS_HIGH_TIER_PORTRAIT_LEVEL ? telemachusHighTierPortrait : tpPortrait,
  },
  { name: 'Arlequin', ability: 'Aura Deity', portraitSrc: arlequinPortrait },
  { name: 'Arlequin', ability: 'Aura Deity', portraitSrc: arlequinePortrait },
];

// --- TYPESCRIPT INTERFACES ---
type StatKey = 'power' | 'speed' | 'trick' | 'recovery' | 'defense';

type BoostOption = {
  mult: number;
  cost: number;
  label: string;
};

type StatInfo = {
  val: number;
  sourceLevel: number;
  isAutoBoosted: boolean;
  autoBoostMult?: number;
};

const statConfig: { key: StatKey, label: string, Icon: React.ElementType, color: string }[] = [
  { key: 'power', label: 'Power', Icon: Swords, color: 'text-red-500' },
  { key: 'speed', label: 'Speed', Icon: Zap, color: 'text-blue-400' },
  { key: 'trick', label: 'Trick', Icon: Brain, color: 'text-purple-500' },
  { key: 'recovery', label: 'Recovery', Icon: Heart, color: 'text-green-400' },
  { key: 'defense', label: 'Defense', Icon: Shield, color: 'text-yellow-600' }
];

// --- LOGIQUE DE TIER ET DE SLOTS DE TELEMACHUS ---
const getTierInfo = (level: number) => {
  if (level < 2.0) return { name: "Low-Tier", slots: 1, color: "text-neutral-400", badge: "text-neutral-400 bg-neutral-400/10 border-neutral-400/30" };
  if (level < 4.0) return { name: "Mid-Tier", slots: 2, color: "text-green-400", badge: "text-green-400 bg-green-400/10 border-green-400/30" };
  if (level < 5.0) return { name: "Elite-Tier", slots: 2, color: "text-blue-400", badge: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  if (level < 6.0) return { name: "High-Tier", slots: 3, color: "text-purple-400", badge: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
  return { name: "God-Tier", slots: 4, color: "text-yellow-400", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
};

// --- LOGIQUE DE DRAIN D'AURA DE BASE ---
const getAuraCost = (niveau: number) => {
  return parseFloat((niveau * (niveau / 1.5)).toFixed(1));
};

// --- MOTEUR DE FUSION ET IDENTIFICATION DES STATS FORTES/FAIBLES (AVEC POOL DE REPARTITION) ---
// Extrait de baseStatsInfo pour être réutilisé tel quel à la fois pour le build
// équipé complet (tous les slots) et pour isoler UNE capacité seule (cf.
// modeLayers dans App : contribution d'un mode de type Phase Shift affiché
// comme calque sur le radar, indépendamment des autres capacités équipées).
const computeMergedStatsInfo = (
  equippedCaps: Capacite[],
  level: number,
  activeTab: string
): Record<StatKey, StatInfo> => {
  let stats: Record<StatKey, StatInfo> = {
    power: { val: 1, sourceLevel: level, isAutoBoosted: false },
    speed: { val: 1, sourceLevel: level, isAutoBoosted: false },
    trick: { val: level * 2.414, sourceLevel: level, isAutoBoosted: false },
    recovery: { val: 1, sourceLevel: level, isAutoBoosted: false },
    defense: { val: 1, sourceLevel: level, isAutoBoosted: false }
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
  const abilityBoostMap = new Map<number, string>();
  if (activeTab === 'alternative') {
    const pool: { id: number, stat: string, val: number }[] = [];
    equippedCaps.forEach(cap => {
      ['power', 'speed', 'recovery', 'defense'].forEach(stat => {
        pool.push({ id: cap.id, stat, val: (cap.stats_de_base as any)[stat] });
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
    let keyToBoost: string | null = null;

    if (activeTab === 'alternative') {
      currentAutoBoostMult = multMap.get(cap.id) || 1.5;
      keyToBoost = abilityBoostMap.get(cap.id) || null;
    } else {
      // Boost réduit à x1.2 quand la capacité copiée est de plus d'un niveau
      // plus faible que Telemachus (au lieu du x1.5 par défaut).
      currentAutoBoostMult = (level - cap.niveau > 1) ? 1.2 : 1.5;
      keyToBoost = cap.stat_principale;
    }

    const alreadyAutoBoostedStats = new Set<string>();
    if (keyToBoost) {
      alreadyAutoBoostedStats.add(keyToBoost);
    }

    // Les 2 stats (hors trick) les plus hautes de la capacité d'origine sont
    // remontées au niveau de Telemachus quand elle est plus faible/égale ;
    // les 2 autres restent brutes.
    const nonTrickKeys: StatKey[] = ['power', 'speed', 'recovery', 'defense'];
    const topTwoNonTrick = new Set(
      [...nonTrickKeys]
        .sort((a, b) => (cap.stats_de_base as any)[b] - (cap.stats_de_base as any)[a])
        .slice(0, 2)
    );

    for (let key in cap.stats_de_base) {
      const baseKey = key as StatKey;

      // RÈGLE DE COPIE :
      // - Capacité plus forte que Telemachus (isTelemachusWeaker) = ramenée à son niveau
      //   (ratios * niveau), sans pénalité, sur toutes les stats.
      // - Capacité plus faible/égale = Trick et les 2 stats les plus hautes remontées au niveau de
      //   Telemachus (ratios * niveau) ; les 2 autres stats restent brutes.
      const isTelemachusWeaker = level < cap.niveau;
      let valeurCopiee: number;
      if (isTelemachusWeaker) {
        valeurCopiee = (cap.ratios_stats as any)[baseKey] * level;
      } else if (baseKey === 'trick' || topTwoNonTrick.has(baseKey)) {
        valeurCopiee = (cap.ratios_stats as any)[baseKey] * level;
      } else {
        valeurCopiee = (cap.stats_de_base as any)[baseKey];
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

// --- COMPOSANT GRAPHIQUE RADAR SVG ---
const RadarChart = ({
  stats,
  boosts,
  baseStatsInfo,
  layers = [],
  capAt10 = false,
}: {
  stats: Record<StatKey, number>;
  boosts: Record<string, number>;
  baseStatsInfo: Record<StatKey, StatInfo>;
  layers?: { id: string; stats: Record<StatKey, number> }[];
  capAt10?: boolean;
}) => {
  const maxStat = 10;
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 130; 
  const keys: StatKey[] = ['power', 'speed', 'trick', 'recovery', 'defense'];
  const labels = ['Power', 'Speed', 'Trick', 'Recovery', 'Defense'];

  const getPoints = (statObj: Record<string, number>, clamp: boolean = false) => {
    return keys.map((key, i) => {
      const val = clamp ? Math.min(statObj[key] || 1, maxStat) : (statObj[key] || 1);
      const r = (val / maxStat) * radius;
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  };

  const levels = [2, 4, 6, 8, 10];
  const hasLayers = layers.length > 0;

  return (
    <div className="relative w-full aspect-square max-w-[450px] mx-auto bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-neutral-950 rounded-full p-4 shadow-2xl border border-neutral-800">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {levels.map(l => (
          <polygon key={l} points={getPoints({power:l, speed:l, trick:l, recovery:l, defense:l}, true)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
        ))}
        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          return (
            <line key={`axis-${key}`} x1={cx} y1={cy} x2={cx + radius * Math.cos(angle)} y2={cy + radius * Math.sin(angle)} stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
          )
        })}
        
        {/* Aura Shape : masquée dès qu'un calque est actif (voir hasLayers) — chaque
            calque EST déjà un build complet (toutes les capacités équipées, cf.
            modeLayers dans App), donc on ne veut pas une forme fusionnée en plus qui
            ferait doublon — exactement comme john_unordinary. */}
        {!hasLayers && (
          <polygon points={getPoints(stats, capAt10)} fill="rgba(255, 215, 0, 0.3)" stroke="#ffd700" strokeWidth="3" className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        )}

        {/* Calques de modes (style Phase Shift) : chaque capacité équipée qui a des
            variantes de mode est tracée avec EXACTEMENT le même style que l'Aura Shape
            normale — même remplissage, même contour — pour rester cohérent ; c'est la
            superposition de plusieurs formes identiques qui les distingue (recouvrement
            plus dense), pas une couleur ou une opacité différente (cf. john_unordinary). */}
        {layers.map(layer => (
          <polygon
            key={`layer-${layer.id}`}
            points={getPoints(layer.stats, capAt10)}
            fill="rgba(255, 215, 0, 0.3)"
            stroke="#ffd700"
            strokeWidth="3"
            className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"
          />
        ))}

        {/* Nodes : marquent les sommets de l'Aura Shape, donc masqués avec elle et
            plafonnés comme elle (capAt10) — seuls Aura Shape/Nodes respectent l'option. */}
        {!hasLayers && keys.map((key, i) => {
          const rawVal = stats[key] || 1;
          const val = capAt10 ? Math.min(rawVal, maxStat) : rawVal;
          const r = (val / maxStat) * radius;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const isBoosted = boosts[key] > 0 || baseStatsInfo[key].isAutoBoosted;

          return (
            <circle
              key={`pt-${key}`}
              cx={cx + r * Math.cos(angle)}
              cy={cy + r * Math.sin(angle)}
              r={isBoosted ? "7" : "5"}
              fill={isBoosted ? "#ffd700" : "#121212"}
              stroke="#ffd700"
              strokeWidth="2.5"
              className="transition-all duration-500 ease-in-out"
            />
          )
        })}

        {/* Labels : positions toujours normales (bord du pentagone), jamais plafonnées
            ni poussées vers l'extérieur — seule la forme du graphique (Aura Shape/Nodes)
            respecte l'option capAt10. Les valeurs réelles restent visibles dans la grille
            de stats en dessous, indépendamment de cette option. */}
        {keys.map((key, i) => {
          const val = stats[key] || 1;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const currentRadius = (val / maxStat) * radius;
          const rText = Math.max(radius, currentRadius) + 35;
          const isBoosted = boosts[key] > 0 || baseStatsInfo[key].isAutoBoosted;
          
          return (
            <text 
              key={`lbl-${key}`} 
              x={cx + rText * Math.cos(angle)} 
              y={cy + rText * Math.sin(angle)} 
              fill={isBoosted ? "#ffffff" : "#ffd700"} 
              fontSize="14" 
              fontWeight="bold" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className={`tracking-wider uppercase opacity-90 transition-all duration-500 ease-in-out ${isBoosted ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : ''}`}
            >
              {labels[i]} {isBoosted && '↑'}
            </text>
          )
        })}
      </svg>
    </div>
  );
};

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const { capacites: capacitesData, loading: capacitesLoading, error: capacitesError, retry: retryCapacites } = useCapacites();
  const [activeTab, setActiveTab] = useState('classic');
  const [potential, setPotential] = useState(9.3);
  const [mastery, setMastery] = useState(6.5);
  const [slots, setSlots] = useState<string[]>(["", "", "", ""]);
  const [radarIdentityIndex, setRadarIdentityIndex] = useState(0);
  // Plafonne la FORME du graphique radar à 10 (les valeurs réelles restent affichées
  // normalement dans la grille de stats en dessous et dans les labels du radar).
  const [capStatsAt10, setCapStatsAt10] = useState(false);
  // Emplacement dont le panneau "Modes" (variantes style Phase Shift) est ouvert.
  const [activeModeDrawer, setActiveModeDrawer] = useState<number | null>(null);
  // Modes additionnels choisis par emplacement, pour les capacités qui partagent une
  // mode_group_key (ex: Phase Shift (Def)/(Off) chez Zeke) — le mode choisi dans le
  // <select> du slot reste le mode "principal", extraIds ajoute d'autres modes du même
  // groupe qui restent actifs EN MÊME TEMPS (fusionnés dans le build + calques sur le
  // radar), exactement comme john_unordinary.
  const [slotExtraModes, setSlotExtraModes] = useState<Record<number, string[]>>({});

  const level = useMemo(() => parseFloat(((potential * mastery) / 10).toFixed(1)), [potential, mastery]);
  const radarIdentities = useMemo(() => buildRadarIdentities(level), [level]);
  const [boostState, setBoostState] = useState<Record<string, number>>({ power: 0, speed: 0, trick: 0, recovery: 0, defense: 0 });

  const tierInfo = useMemo(() => getTierInfo(level), [level]);
  const slotsUsed = useMemo(() => slots.filter(s => s !== "").length, [slots]);
  
  const activeBoostsCount = useMemo(() => Object.values(boostState).filter(v => v > 0).length, [boostState]);

  // Capacités actuellement équipées : le pick "principal" de chaque emplacement, plus
  // ses éventuels modes additionnels (slotExtraModes) — tous actifs en même temps.
  const equippedCaps = useMemo(() => {
    const list: Capacite[] = [];
    slots.forEach((id, index) => {
      if (index >= tierInfo.slots || !id) return;
      const principal = capacitesData.find(c => c.id === parseInt(id));
      if (!principal) return;
      list.push(principal);
      (slotExtraModes[index] || []).forEach(extraId => {
        const extra = capacitesData.find(c => c.id === parseInt(extraId));
        if (extra) list.push(extra);
      });
    });
    return list;
  }, [slots, slotExtraModes, tierInfo, capacitesData]);

  // --- MOTEUR DE FUSION ET IDENTIFICATION DES STATS FORTES/FAIBLES (AVEC POOL DE REPARTITION) ---
  const baseStatsInfo = useMemo(
    () => computeMergedStatsInfo(equippedCaps, level, activeTab),
    [equippedCaps, level, activeTab]
  );

  // --- CALQUES DE MODES (style Phase Shift) ---
  // On fusionne au maximum : un emplacement avec un SEUL mode actif (pas d'extra
  // coché) est une capacité normale comme une autre — elle n'a rien à comparer,
  // donc pas de calque dédié, juste sa contribution normale dans le build fusionné
  // (equippedCaps/baseStatsInfo). Les calques n'apparaissent QUE pour un emplacement
  // qui a au moins 2 modes actifs EN MÊME TEMPS (principal + au moins un extra coché) :
  // pour chaque mode actif de CET emplacement, simule le build COMPLET (toutes les
  // capacités équipées, TOUS les autres emplacements et leurs modes gardant leur
  // contribution normale) en substituant UNIQUEMENT ce mode à la contribution de cet
  // emplacement — les calques se comparent EN CONTEXTE avec le reste du build, jamais
  // isolés sur les stats de repos de Telemachus (cf. john_unordinary :
  // mergeSlotsIntoStats avec overrideSlotIndex/overrideId). Tracé À LA PLACE de l'Aura
  // Shape fusionnée normale dès qu'au moins un calque existe (cf. RadarChart >
  // hasLayers). N'affecte jamais baseStatsInfo/statsFinales eux-mêmes, qui restent la
  // fusion de TOUS les modes actifs de TOUS les emplacements (le "vrai" build).
  const modeLayers = useMemo(() => {
    const layers: { id: string; label: string; nomCapacite: string; stats: Record<StatKey, number> }[] = [];

    slots.forEach((slotId, index) => {
      if (index >= tierInfo.slots || !slotId) return;
      const principal = capacitesData.find(c => c.id === parseInt(slotId));
      if (!principal) return;

      const activeIds = [slotId, ...(slotExtraModes[index] || [])];
      if (activeIds.length <= 1) return;

      activeIds.forEach(id => {
        const cap = capacitesData.find(c => c.id === parseInt(id));
        if (!cap) return;

        const overrideCaps: Capacite[] = [];
        slots.forEach((sid, i) => {
          if (i >= tierInfo.slots || !sid) return;
          if (i === index) {
            overrideCaps.push(cap);
            return;
          }
          const p = capacitesData.find(c => c.id === parseInt(sid));
          if (p) overrideCaps.push(p);
          (slotExtraModes[i] || []).forEach(extraId => {
            const extra = capacitesData.find(c => c.id === parseInt(extraId));
            if (extra) overrideCaps.push(extra);
          });
        });

        const isolated = computeMergedStatsInfo(overrideCaps, level, activeTab);
        layers.push({
          id: `${index}-${cap.id}`,
          label: cap.mode_label || cap.nom_capacite,
          nomCapacite: cap.nom_capacite_base,
          stats: {
            power: isolated.power.val,
            speed: isolated.speed.val,
            trick: isolated.trick.val,
            recovery: isolated.recovery.val,
            defense: isolated.defense.val,
          },
        });
      });
    });

    return layers;
  }, [slots, slotExtraModes, tierInfo, capacitesData, level, activeTab]);

  // --- LOGIQUE DES OPTIONS D'AMPLIFICATION ---
  const getBoostOptions = useCallback((statKey: StatKey): BoostOption[] => {
    const sourceLevel = baseStatsInfo[statKey].sourceLevel;
    const isTelemachusStrong = sourceLevel <= level; 

    let options: BoostOption[] = [];
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
  }, [baseStatsInfo, level, mastery]);

  // --- LOGIQUE DE RÉSERVE D'AURA ---
  const maxAura = useMemo(() => {
    if (level >= 7.5) return level * 25;
    if (level >= 7.0) return level * 20;
    if (level >= 6.0) return level * 15;
    return level * 10;
  }, [level]);
  
  const currentAuraDrain = useMemo(() => {
    let drain = slots.reduce((total, slotId) => {
      if (!slotId) return total;
      const cap = capacitesData.find(c => c.id === parseInt(slotId));
      return total + (cap ? getAuraCost(cap.niveau) : 0);
    }, 0);
    
    Object.keys(boostState).forEach(key => {
      const idx = boostState[key];
      if (idx > 0) {
        const options = getBoostOptions(key as StatKey);
        if (options[idx - 1]) drain += options[idx - 1].cost;
      }
    });

    return parseFloat(drain.toFixed(1));
  }, [slots, boostState, getBoostOptions]);

  const auraRemaining = parseFloat((maxAura - currentAuraDrain).toFixed(1));
  const auraPercentage = Math.min(100, (currentAuraDrain / maxAura) * 100);

  // --- STATS FINALES APRÈS BOOST ---
  const statsFinales = useMemo(() => {
    let finalStats: Record<StatKey, number> = { power: 1, speed: 1, trick: 1, recovery: 1, defense: 1 };
    
    for (let key in baseStatsInfo) {
      const typedKey = key as StatKey;
      let val = baseStatsInfo[typedKey].val;
      const idx = boostState[typedKey];
      if (idx > 0) {
        const options = getBoostOptions(typedKey);
        if (options[idx - 1]) val *= options[idx - 1].mult;
      }
      finalStats[typedKey] = val; 
    }
    return finalStats;
  }, [baseStatsInfo, boostState, getBoostOptions]);

  // --- ALGORITHME DU NIVEAU EFFECTIF ESTIMÉ (Moyenne Extra + Bridage par Tiers) ---
  const estimatedEffectiveLevel = useMemo(() => {
    const { power, speed, trick, recovery, defense } = statsFinales;

    // 1. Dérivation des Extra Stats (Formules combinées)
    const attackSpeed = power * speed / level;
    const attackCharge = power * recovery / level;
    
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
    let finalLevel = Math.min(maxLvl, Math.max(minLvl, rawLevel));

    return finalLevel.toFixed(1);
  }, [statsFinales]);


  // --- INTERACTIONS ---
  const clearSlotExtraModes = (index: number) => {
    setSlotExtraModes(prev => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateSlot = (index: number, value: string) => {
    if (!value) {
      const newSlots = [...slots];
      newSlots[index] = "";
      setSlots(newSlots);
      clearSlotExtraModes(index);
      if (activeModeDrawer === index) setActiveModeDrawer(null);
      return;
    }

    const cap = capacitesData.find(c => c.id === parseInt(value));
    if (!cap) return;

    const currentSlotVal = slots[index];
    const currentCap = currentSlotVal ? capacitesData.find(c => c.id === parseInt(currentSlotVal)) : null;

    const currentDrainInThisSlot = currentCap ? getAuraCost(currentCap.niveau) : 0;
    const newDrain = getAuraCost(cap.niveau);

    const projectedAuraDrain = currentAuraDrain - currentDrainInThisSlot + newDrain;

    if (projectedAuraDrain > maxAura) return;

    const newSlots = [...slots];
    newSlots[index] = value;
    setSlots(newSlots);

    // Le nouveau pick "principal" peut appartenir à un autre groupe de modes (ou à
    // aucun) : on ne garde que les extras qui partagent encore sa mode_group_key, et on
    // retire le nouveau pick lui-même s'il y était déjà (cf. john_unordinary).
    setSlotExtraModes(prev => {
      const existing = prev[index];
      if (!existing) return prev;
      const filtered = existing.filter(id => {
        if (id === value) return false;
        const sibling = capacitesData.find(c => c.id === parseInt(id));
        return sibling && sibling.mode_group_key === cap.mode_group_key;
      });
      if (filtered.length === 0) {
        const next = { ...prev };
        delete next[index];
        return next;
      }
      return { ...prev, [index]: filtered };
    });
  };

  const toggleSlotModeExtra = (index: number, modeId: string) => {
    setSlotExtraModes(prev => {
      const existing = prev[index] || [];
      const next = existing.includes(modeId)
        ? existing.filter(id => id !== modeId)
        : [...existing, modeId];
      return { ...prev, [index]: next };
    });
  };

  const handleBoostClick = (key: string) => {
    const typedKey = key as StatKey;
    const options = getBoostOptions(typedKey);
    if (options.length === 0) return;

    const currentIdx = boostState[typedKey];
    let nextIdx = currentIdx + 1;

    while (nextIdx <= options.length) {
      const opt = options[nextIdx - 1];
      const oldCost = currentIdx > 0 ? options[currentIdx - 1].cost : 0;
      const netCost = opt.cost - oldCost;

      if (auraRemaining >= netCost) {
        break;
      }
      nextIdx++;
    }

    if (nextIdx > options.length) {
      nextIdx = 0; 
    }

    setBoostState(prev => ({ ...prev, [typedKey]: nextIdx }));
  };

  // Réinitialisation lors du changement de niveau/slots
  useEffect(() => {
    const currentTier = getTierInfo(level);
    if (slotsUsed > currentTier.slots) {
      const newSlots = [...slots];
      for (let i = currentTier.slots; i < 4; i++) {
        newSlots[i] = "";
      }
      setSlots(newSlots);
      setSlotExtraModes(prev => {
        const next: Record<number, string[]> = {};
        Object.keys(prev).forEach(k => {
          const idx = Number(k);
          if (idx < currentTier.slots) next[idx] = prev[idx];
        });
        return next;
      });
    }
    if (activeModeDrawer !== null && activeModeDrawer >= currentTier.slots) {
      setActiveModeDrawer(null);
    }
  }, [level, slotsUsed, activeTab]);

  // --- PANNEAU "MODES" (variantes style Phase Shift) ---
  const drawerCap = (activeModeDrawer !== null && slots[activeModeDrawer])
    ? capacitesData.find(c => c.id === parseInt(slots[activeModeDrawer]))
    : null;
  const drawerSiblings = drawerCap
    ? capacitesData.filter(c => c.mode_group_key === drawerCap.mode_group_key && c.copiable)
    : [];
  const drawerExtraIds = (activeModeDrawer !== null && slotExtraModes[activeModeDrawer]) || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-yellow-500/30 pb-20">
      
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
        <div className="inline-flex bg-neutral-900 border border-neutral-800 p-1 rounded-full shadow-lg">
          <button
            onClick={() => setActiveTab('classic')}
            className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'classic' ? 'bg-yellow-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Système Classique
          </button>
          <button
            onClick={() => setActiveTab('alternative')}
            className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wide transition-all ${activeTab === 'alternative' ? 'bg-yellow-500 text-neutral-950 shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Système Shine-City
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* PANNEAU GAUCHE : CONTRÔLES */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl border-l-4 border-l-yellow-500">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">
                  Niveau Actuel
                </label>
                <div className="text-3xl font-black text-yellow-500 leading-none">
                  {level.toFixed(1)}
                </div>
                <span className={`mt-2 w-fit text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierInfo.badge}`}>
                  {tierInfo.name}
                </span>
              </div>

              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">Potentiel</label>
                <input
                  type="number"
                  value={potential}
                  onChange={(e) => setPotential(parseFloat(e.target.value) || 1)}
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  className="w-full bg-neutral-950 text-neutral-200 text-lg font-bold py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1 block">Maîtrise</label>
                <input
                  type="number"
                  value={mastery}
                  onChange={(e) => setMastery(parseFloat(e.target.value) || 1)}
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  className="w-full bg-neutral-950 text-neutral-200 text-lg font-bold py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="text-neutral-200 font-bold text-lg flex items-center gap-2">
                  <Battery size={20} className={auraPercentage > 90 ? "text-red-500" : "text-yellow-500"} /> 
                  Réserves d'Aura
                </h2>
                <p className="text-xs text-neutral-500 mt-1">L'amplification et la copie drainent l'aura.</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-yellow-500">{Math.ceil(auraRemaining)}</span>
                <span className="text-neutral-500 text-sm ml-1">/ {Math.ceil(maxAura)}</span>
              </div>
            </div>
            
            <div className="h-4 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 relative">
              <div 
                className={`h-full transition-all duration-500 ease-out ${auraPercentage > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-yellow-600 to-yellow-400'}`}
                style={{ width: `${auraPercentage}%` }}
              ></div>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ChevronsUp size={16} className="text-yellow-500" />
                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">Amplifications Actives</span>
              </div>
              <span className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                {activeBoostsCount} Stat{activeBoostsCount > 1 ? 's' : ''} Boostée{activeBoostsCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-neutral-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} />
              Auras Copiées ({slotsUsed}/{tierInfo.slots})
            </h2>
            
            {[0, 1, 2, 3].map((index) => {
              const isLocked = index >= tierInfo.slots;
              const slotValue = slots[index];
              const currentCap = slotValue ? capacitesData.find(c => c.id === parseInt(slotValue)) : null;
              const currentSlotDrain = currentCap ? getAuraCost(currentCap.niveau) : 0;
              const levelDiff = currentCap ? (level - currentCap.niveau) : 0;
              const siblingModes = currentCap
                ? capacitesData.filter(c => c.mode_group_key === currentCap.mode_group_key && c.copiable)
                : [];
              const activeExtraCount = (slotExtraModes[index] || []).length;
              // Une capacité déjà active ailleurs (comme pick principal OU comme mode
              // additionnel d'un autre emplacement) ne peut pas être re-choisie ici.
              const usedElsewhereIds = new Set<string>();
              slots.forEach((sid, i) => {
                if (i === index || !sid) return;
                usedElsewhereIds.add(sid);
                (slotExtraModes[i] || []).forEach(id => usedElsewhereIds.add(id));
              });

              return (
                <div key={index} className="relative group">
                  <select
                    value={slotValue}
                    onChange={(e) => updateSlot(index, e.target.value)}
                    disabled={isLocked}
                    className={`w-full appearance-none bg-neutral-950 border py-3 pl-4 pr-32 md:pr-40 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all font-medium
                      ${isLocked
                        ? 'border-neutral-800 text-neutral-600 cursor-not-allowed bg-neutral-950/50'
                        : 'border-neutral-700 text-neutral-200 cursor-pointer focus:border-yellow-500 hover:border-neutral-600'}`}
                  >
                    <option value="">-- Emplacement Vide --</option>
                    {!isLocked && capacitesData.filter(cap => cap.copiable).map(cap => {
                      const cost = getAuraCost(cap.niveau);
                      const isSelf = slotValue === cap.id.toString();
                      const alreadyEquipped = usedElsewhereIds.has(cap.id.toString()) && !isSelf;
                      const isTooExpensive = (currentAuraDrain - currentSlotDrain + cost) > maxAura && !isSelf;
                      const reason = alreadyEquipped
                        ? "(Déjà équipé)"
                        : isTooExpensive
                          ? "[Aura Insuffisante]"
                          : "";
                      return (
                        <option key={cap.id} value={cap.id} disabled={alreadyEquipped || isTooExpensive}>
                          {cap.nom_capacite} ({cap.nom_personnage}) - Niv {cap.niveau} {reason}
                        </option>
                      )
                    })}
                  </select>

                  {!isLocked && siblingModes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveModeDrawer(index)}
                      title="Choisir les modes actifs de cette capacité"
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-yellow-500 transition-colors"
                    >
                      <Layers size={12} />
                      Modes
                      {activeExtraCount > 0 && (
                        <span className="px-1.5 rounded-full bg-yellow-500/20 text-yellow-400">
                          {1 + activeExtraCount}
                        </span>
                      )}
                    </button>
                  )}

                  {slotValue && currentCap && !isLocked && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1.5 md:gap-2">
                      <div className={`text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-1 rounded-md border ${
                        levelDiff >= 0 
                          ? 'text-green-400 bg-green-400/10 border-green-400/20' 
                          : 'text-red-400 bg-red-400/10 border-red-400/20'
                      }`} title="Différence de niveau (Telemachus vs Capacité)">
                        {levelDiff > 0 ? '+' : ''}{levelDiff.toFixed(1)} Niv
                      </div>
                      <div className="text-[10px] md:text-xs font-bold text-yellow-500/70 bg-yellow-500/10 px-1.5 md:px-2 py-1 rounded-md border border-yellow-500/20" title="Coût en Aura">
                        -{getAuraCost(currentCap.niveau)}
                      </div>
                    </div>
                  )}
                  
                  {isLocked ? (
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-700 pointer-events-none" size={18} />
                  ) : (
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" size={20} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PANNEAU DROIT : VISUALISATION */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative">
          
          <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Aura Jaune</span>
            </div>
            
            {activeTab === 'alternative' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg shadow-sm w-fit">
                <Sparkles size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Boost Passif Actif</span>
              </div>
            )}

            <button
              onClick={() => setCapStatsAt10(!capStatsAt10)}
              className={`w-fit px-2 py-0.5 text-xs font-bold rounded-full border transition-colors flex items-center gap-1 ${
                capStatsAt10
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
              }`}
              title="Plafonner la forme du radar à 10 (les valeurs réelles restent affichées telles quelles)"
            >
              Cap à 10
            </button>
          </div>

          <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
            <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 shadow-sm">
              {radarIdentities.map((identity, index) => (
                <button
                  key={identity.name}
                  onClick={() => setRadarIdentityIndex(index)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    radarIdentityIndex === index
                      ? 'bg-yellow-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={`Fiche pour ${identity.name}`}
                >
                  {identity.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => exportRadarPng(
                statsFinales,
                level,
                radarIdentities[radarIdentityIndex],
                capStatsAt10,
                modeLayers.map(l => ({ label: `${l.nomCapacite} · ${l.label}`, stats: l.stats })),
                activeTab === 'alternative'
              )}
              className="flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm hover:border-yellow-500/50 hover:text-yellow-500 text-neutral-400 transition-colors"
              title="Exporter le graphique en PNG"
            >
              <Download size={14} />
              <span className="text-xs font-bold uppercase tracking-wide">Exporter PNG</span>
            </button>
          </div>

          <div className="w-full mb-2 mt-12 md:mt-6">
            <RadarChart stats={statsFinales} boosts={boostState} baseStatsInfo={baseStatsInfo} layers={modeLayers} capAt10={capStatsAt10} />
          </div>

          {/* Légende des calques de modes actifs (style Phase Shift) : toutes les formes
              partagent la même couleur (l'Aura Shape est masquée pendant ce temps) —
              seule leur silhouette les distingue en se superposant, donc pas de pastille
              de couleur ici non plus. */}
          {modeLayers.length > 0 && (
            <div className="w-full flex flex-wrap justify-center gap-2 mb-3">
              {modeLayers.map(layer => (
                <span
                  key={layer.id}
                  className="text-[11px] font-semibold text-neutral-300 bg-neutral-950 border border-neutral-800 rounded-full px-2 py-0.5"
                >
                  {layer.nomCapacite} · {layer.label}
                </span>
              ))}
            </div>
          )}

          {/* AJOUT : LIGNE DU NIVEAU EFFECTIF ESTIMÉ */}
          <div className="w-full flex justify-end mb-3 pr-2">
            <div className="flex items-center gap-2 text-[13px] text-neutral-400 font-medium">
              <Target size={14} className="opacity-70" />
              <span>Estimated Effective Level :</span>
              <span className="font-black text-yellow-500 ml-1">{estimatedEffectiveLevel}</span>
            </div>
          </div>

          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3">
            {statConfig.map(({ key, label, Icon, color }) => {
              const currentIdx = boostState[key];
              const isBoosted = currentIdx > 0;
              const isAutoBoosted = baseStatsInfo[key].isAutoBoosted;
              const autoBoostMult = baseStatsInfo[key].autoBoostMult;
              
              const options = getBoostOptions(key);
              const isUnboostable = options.length === 0;
              const cannotAffordInitial = !isBoosted && (auraRemaining < (options[0]?.cost || 999));

              return (
                <div key={key} className={`bg-neutral-950 border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group transition-colors duration-300
                  ${isBoosted || isAutoBoosted ? 'border-yellow-500 bg-yellow-500/10' : 'border-neutral-800'}`}>
                  
                  {isAutoBoosted && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 text-yellow-400/80 bg-yellow-500/10 px-1.5 py-0.5 rounded-bl-lg" title={`Boost passif x${autoBoostMult} sur la stat forte`}>
                      <span className="text-[10px] font-bold">x{autoBoostMult}</span>
                      <Sparkles size={12} />
                    </div>
                  )}
                  
                  <Icon size={20} className={`mb-2 mt-1 ${isBoosted || isAutoBoosted ? 'text-yellow-500' : color} opacity-80`} />
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1">{label}</span>
                  <span className={`text-xl font-black ${isBoosted || isAutoBoosted ? 'text-yellow-400' : 'text-neutral-100'}`}>
                    {statsFinales[key].toFixed(1)}
                  </span>

                  <button 
                    onClick={() => handleBoostClick(key)}
                    disabled={isUnboostable || cannotAffordInitial}
                    className={`mt-3 w-full py-2 px-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center transition-all leading-tight
                      ${isBoosted 
                        ? 'bg-yellow-500 text-neutral-950 hover:bg-yellow-400' 
                        : isUnboostable || cannotAffordInitial
                          ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800' 
                          : 'bg-neutral-900 text-neutral-400 hover:text-yellow-500 border border-neutral-700 hover:border-yellow-500/50'
                      }`}
                  >
                    <div className="flex items-center gap-1">
                      <ChevronsUp size={12} />
                      {isBoosted 
                        ? options[currentIdx - 1].label.split(' ')[0] 
                        : isUnboostable 
                          ? 'Non Dispo' 
                          : 'Amplifier'
                      }
                    </div>
                    {isBoosted && (
                      <span className="opacity-80 mt-0.5 text-[8px]">
                        {options[currentIdx - 1].label.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Panneau "Modes" (variantes style Phase Shift), ouvert depuis le bouton
          "Modes" d'un emplacement — plusieurs modes d'une même capacité peuvent être
          actifs en même temps (fusionnés dans le build + calques sur le radar),
          exactement comme john_unordinary. Le pick du <select> reste le mode
          "principal" (toujours actif, décoché impossible depuis ce panneau) ; les
          autres modes du groupe se cochent/décochent librement via slotExtraModes. */}
      {activeModeDrawer !== null && drawerCap && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setActiveModeDrawer(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-neutral-900 border-l border-neutral-800 z-50 shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Layers size={18} className="text-yellow-500" />
                  Modes
                </h3>
                <p className="text-xs text-neutral-500 mt-1">Choisissez les modes à inclure — plusieurs peuvent être actifs à la fois.</p>
              </div>
              <button
                onClick={() => setActiveModeDrawer(null)}
                className="text-neutral-500 hover:text-neutral-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-semibold text-yellow-500 mt-4 mb-3">
              {drawerCap.nom_capacite_base} — {drawerCap.nom_personnage} (Niv {drawerCap.niveau})
            </p>

            <div className="space-y-2">
              {drawerSiblings.map((sib) => {
                const isPrimary = sib.id === drawerCap.id;
                const isChecked = isPrimary || drawerExtraIds.includes(String(sib.id));
                return (
                  <label
                    key={sib.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      isChecked ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-neutral-800'
                    } ${
                      isPrimary ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-neutral-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isPrimary}
                      onChange={() => toggleSlotModeExtra(activeModeDrawer, String(sib.id))}
                      className="accent-yellow-500"
                    />
                    <span className="text-sm text-neutral-200 flex-1">
                      {sib.mode_label || sib.nom_capacite}
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] font-bold uppercase text-yellow-500">Actif</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
