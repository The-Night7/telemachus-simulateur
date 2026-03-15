import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shield, Zap, Swords, Brain, Heart, ChevronDown, Layers, Lock, Battery, ChevronsUp, Sparkles, Target } from 'lucide-react';

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

// IMPORTANT: Décommentez cette ligne dans votre projet pour utiliser votre propre JSON.
import capacitesData from './capacites.json'; 

const statConfig: { key: StatKey, label: string, Icon: React.ElementType, color: string }[] = [
  { key: 'power', label: 'Power', Icon: Swords, color: 'text-red-500' },
  { key: 'speed', label: 'Speed', Icon: Zap, color: 'text-blue-400' },
  { key: 'trick', label: 'Trick', Icon: Brain, color: 'text-purple-500' },
  { key: 'recovery', label: 'Recovery', Icon: Heart, color: 'text-green-400' },
  { key: 'defense', label: 'Defense', Icon: Shield, color: 'text-yellow-600' }
];

// --- LOGIQUE DE TIER ET DE SLOTS DE TELEMACHUS ---
const getTierInfo = (level: number) => {
  if (level < 2.0) return { name: "Low-Tier", slots: 1, color: "text-neutral-400" };
  if (level < 4.0) return { name: "Mid-Tier", slots: 2, color: "text-green-400" };
  if (level < 5.0) return { name: "Elite-Tier", slots: 2, color: "text-blue-400" };
  if (level < 6.0) return { name: "High-Tier", slots: 3, color: "text-purple-400" };
  return { name: "God-Tier", slots: 4, color: "text-yellow-400" };
};

// --- LOGIQUE DE DRAIN D'AURA DE BASE ---
const getAuraCost = (niveau: number) => {
  return parseFloat((niveau * (niveau / 1.5)).toFixed(1));
};

// --- COMPOSANT GRAPHIQUE RADAR SVG ---
const RadarChart = ({ stats, boosts }: { stats: Record<StatKey, number>, boosts: Record<string, number> }) => {
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
        
        {/* Aura Shape */}
        <polygon points={getPoints(stats, false)} fill="rgba(255, 215, 0, 0.3)" stroke="#ffd700" strokeWidth="3" className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        
        {/* Nodes */}
        {keys.map((key, i) => {
          const val = stats[key] || 1;
          const r = (val / maxStat) * radius;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const isBoosted = boosts[key] > 0;
          
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
        
        {/* Labels */}
        {keys.map((key, i) => {
          const val = stats[key] || 1;
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const currentRadius = (val / maxStat) * radius;
          const rText = Math.max(radius, currentRadius) + 35; 
          const isBoosted = boosts[key] > 0;
          
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
  const [activeTab, setActiveTab] = useState('classic');
  const [potential, setPotential] = useState(9.0);
  const [mastery, setMastery] = useState(6.9);
  const [slots, setSlots] = useState<string[]>(["", "", "", ""]);
  
  const level = useMemo(() => parseFloat(((potential * mastery) / 10).toFixed(1)), [potential, mastery]);
  const [boostState, setBoostState] = useState<Record<string, number>>({ power: 0, speed: 0, trick: 0, recovery: 0, defense: 0 });

  const tierInfo = useMemo(() => getTierInfo(level), [level]);
  const slotsUsed = useMemo(() => slots.filter(s => s !== "").length, [slots]);
  
  const activeBoostsCount = useMemo(() => Object.values(boostState).filter(v => v > 0).length, [boostState]);

  // --- MOTEUR DE FUSION ET IDENTIFICATION DES STATS FORTES/FAIBLES ---
  const baseStatsInfo = useMemo(() => {
    let stats: Record<StatKey, StatInfo> = { 
      power: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      speed: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      trick: { val: level * 2.414, sourceLevel: level, isAutoBoosted: false }, 
      recovery: { val: 1, sourceLevel: level, isAutoBoosted: false }, 
      defense: { val: 1, sourceLevel: level, isAutoBoosted: false } 
    };
    
    const alreadyAutoBoostedStats = new Set<string>();
    
    slots.forEach((slotId, index) => {
      if (!slotId || index >= tierInfo.slots) return;
      
      const cap = capacitesData.find(c => c.id === parseInt(slotId));
      if (!cap) return;

      const isWeaker = level < cap.niveau; // Telemachus est d'un niveau inférieur à la capacité
      
      // RÉADAPTATION : Si la capacité est trop élevée, on applique la pénalité "un niveau de moins"
      const effectiveLevelForCopy = isWeaker ? Math.max(1.0, level - 1.0) : level;

      const diff = level - cap.niveau;
      const isSignificantlyWeaker = diff < -2.0; // Vraiment plus faible que la capacité
      const isSignificantlyStronger = diff > 1.0; // Vraiment plus fort que la capacité

      const currentAutoBoostMult = isSignificantlyStronger ? 1.25 : isSignificantlyWeaker ? 1.75 : 1.5;

      let keyToBoost: string | null = null;
      
      if (activeTab === 'alternative') {
        const sortedStats = Object.entries(cap.stats_de_base)
          .filter(([key]) => key !== 'trick')
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

        const bestUnboosted = sortedStats.find(([key]) => !alreadyAutoBoostedStats.has(key));

        if (bestUnboosted) {
          keyToBoost = bestUnboosted[0];
        } else if (sortedStats.length > 0) {
          keyToBoost = sortedStats[0][0]; 
        }

        if (keyToBoost) {
          alreadyAutoBoostedStats.add(keyToBoost);
        }
      }

      for (let key in cap.stats_de_base) {
        const baseKey = key as StatKey;
        
        let valeurCopiee;
        if (isWeaker) {
          // Capacité trop forte : utilisation des ratios avec le niveau pénalisé (niveau - 1)
          valeurCopiee = (cap.ratios_stats as any)[baseKey] * effectiveLevelForCopy;
        } else {
          // Capacité plus faible ou égale : on copie simplement les stats de base
          valeurCopiee = (cap.stats_de_base as any)[baseKey];
        }

        const isBoostedInAlternative = activeTab === 'alternative' && baseKey === keyToBoost;
        if (isBoostedInAlternative) {
          valeurCopiee *= currentAutoBoostMult;
        }

        if (valeurCopiee > stats[baseKey].val) {
          stats[baseKey] = { 
            val: valeurCopiee, 
            sourceLevel: cap.niveau, 
            isAutoBoosted: isBoostedInAlternative,
            autoBoostMult: isBoostedInAlternative ? currentAutoBoostMult : undefined
          };
        }
      }
    });

    return stats;
  }, [level, slots, tierInfo, activeTab]);

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
  const maxAura = useMemo(() => level * 10, [level]);
  
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
    const attackSpeed = power * speed;
    const attackCharge = power * recovery;
    
    // 2. Somme totale incluant les 5 stats + les 2 extras
    const totalSum = power + speed + trick + recovery + defense + attackSpeed + attackCharge;
    
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
  const updateSlot = (index: number, value: string) => {
    if (!value) {
      const newSlots = [...slots];
      newSlots[index] = "";
      setSlots(newSlots);
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
    }
  }, [level, slotsUsed, activeTab]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-yellow-500/30 pb-20">
      
      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 tracking-tight mb-2">
          TELEMACHUS PAWN
        </h1>
        <p className="text-neutral-400 font-medium uppercase tracking-widest text-sm md:text-base mb-6">
          Aura Deity - Simulateur de Capacité
        </p>
        
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
          
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl flex flex-col gap-4 border-l-4 border-l-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-lg font-bold text-neutral-200 block">
                  Niveau Actuel
                </label>
                <span className={`text-sm font-bold uppercase tracking-wider ${tierInfo.color}`}>
                  {tierInfo.name}
                </span>
              </div>
              <div className="text-3xl font-black text-yellow-500">
                {level.toFixed(1)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-neutral-800">
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
                <span className="text-2xl font-black text-yellow-500">{auraRemaining}</span>
                <span className="text-neutral-500 text-sm ml-1">/ {maxAura}</span>
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
                    {!isLocked && capacitesData.map(cap => {
                      const cost = getAuraCost(cap.niveau);
                      const isTooExpensive = (currentAuraDrain - currentSlotDrain + cost) > maxAura;
                      return (
                        <option key={cap.id} value={cap.id} disabled={(slots.includes(cap.id.toString()) && slotValue !== cap.id.toString()) || (isTooExpensive && slotValue !== cap.id.toString())}>
                          {cap.nom_capacite} - Niv {cap.niveau} {slots.includes(cap.id.toString()) && slotValue !== cap.id.toString() ? "(Déjà équipé)" : isTooExpensive && slotValue !== cap.id.toString() ? "[Aura Insuffisante]" : ""}
                        </option>
                      )
                    })}
                  </select>
                  
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
          </div>

          <div className="w-full mb-2 mt-12 md:mt-6">
            <RadarChart stats={statsFinales} boosts={boostState} />
          </div>

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
                  ${isBoosted ? 'border-yellow-500 bg-yellow-500/10' : 'border-neutral-800'}`}>
                  
                  {isAutoBoosted && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 text-yellow-400/80 bg-yellow-500/10 px-1.5 py-0.5 rounded-bl-lg" title={`Boost passif x${autoBoostMult} sur la stat forte`}>
                      <span className="text-[10px] font-bold">x{autoBoostMult}</span>
                      <Sparkles size={12} />
                    </div>
                  )}
                  
                  <Icon size={20} className={`mb-2 mt-1 ${isBoosted ? 'text-yellow-500' : color} opacity-80`} />
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
    </div>
  );
}