import React, { useState, useMemo, useEffect } from 'react';
import { Shield, Zap, Swords, Brain, Heart, ChevronDown, Layers, Lock, Battery, BatteryWarning, ChevronsUp } from 'lucide-react';
import capacitesData from './capacites.json';

const statConfig = [
  { key: 'power', label: 'Power', Icon: Swords, color: 'text-red-500' },
  { key: 'speed', label: 'Speed', Icon: Zap, color: 'text-blue-400' },
  { key: 'trick', label: 'Trick', Icon: Brain, color: 'text-purple-500' },
  { key: 'recovery', label: 'Recovery', Icon: Heart, color: 'text-green-400' },
  { key: 'defense', label: 'Defense', Icon: Shield, color: 'text-yellow-600' }
];

// --- LOGIQUE DE TIER ET DE SLOTS DE TELEMACHUS ---
const getTierInfo = (level) => {
  if (level < 2.0) return { name: "Low-Tier", slots: 1, color: "text-neutral-400" };
  if (level < 4.0) return { name: "Mid-Tier", slots: 2, color: "text-green-400" };
  if (level < 5.0) return { name: "Elite-Tier", slots: 2, color: "text-blue-400" };
  if (level < 6.0) return { name: "High-Tier", slots: 3, color: "text-purple-400" };
  return { name: "God-Tier", slots: 4, color: "text-yellow-400" };
};

// --- LOGIQUE DE DRAIN D'AURA ---
const getAuraCost = (niveau) => {
  return parseFloat((niveau * (niveau / 1.5)).toFixed(1));
};

const BOOST_AURA_COST = 5.0; // Coût fixe en aura par statistique amplifiée

// --- NOUVELLES RÈGLES DE BOOST (FORT/FAIBLE) ---
const getBoostRules = (level) => {
  if (level >= 10) return { weak: 1.75, strong: 1.30, maxBoosts: 3 };
  if (level >= 9.5) return { weak: 1.75, strong: 1.25, maxBoosts: 3 };
  if (level >= 8.5) return { weak: 1.75, strong: 1.25, maxBoosts: 2 };
  if (level >= 7.5) return { weak: 1.75, strong: 1.25, maxBoosts: 1 };
  if (level >= 6.0) return { weak: 1.75, strong: 1.05, maxBoosts: 1 };
  if (level >= 4.0) return { weak: 1.75, strong: 1.0, maxBoosts: 1 };
  if (level >= 2.5) return { weak: 1.5, strong: 1.0, maxBoosts: 1 };
  if (level >= 1.6) return { weak: 1.25, strong: 1.0, maxBoosts: 1 };
  return { weak: 1.0, strong: 1.0, maxBoosts: 0 };
};

// --- 2. COMPOSANT GRAPHIQUE RADAR SVG SUR-MESURE ---
const RadarChart = ({ stats, boosts }) => {
  const maxStat = 10;
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 130; 
  const keys = ['power', 'speed', 'trick', 'recovery', 'defense'];
  const labels = ['Power', 'Speed', 'Trick', 'Recovery', 'Defense'];

  const getPoints = (statObj, clamp = false) => {
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
          const isBoosted = boosts[key];
          
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
          const isBoosted = boosts[key];
          
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

// --- 3. APPLICATION PRINCIPALE ---
export default function App() {
  const [level, setLevel] = useState(5.8);
  const [slots, setSlots] = useState(["", "", "", ""]);
  
  // NOUVEAU : État des amplifications
  const [boosts, setBoosts] = useState({ power: false, speed: false, trick: false, recovery: false, defense: false });

  const tierInfo = useMemo(() => getTierInfo(level), [level]);
  const slotsUsed = useMemo(() => slots.filter(s => s !== "").length, [slots]);
  
  const boostRules = useMemo(() => getBoostRules(level), [level]);
  const activeBoostsCount = useMemo(() => Object.values(boosts).filter(Boolean).length, [boosts]);
  const maxBoostsAllowed = boostRules.maxBoosts;

  // --- LOGIQUE DE RÉSERVE D'AURA ---
  const maxAura = useMemo(() => level * 10, [level]);
  
  const currentAuraDrain = useMemo(() => {
    let drain = slots.reduce((total, slotId) => {
      if (!slotId) return total;
      const cap = capacitesData.find(c => c.id === parseInt(slotId));
      return total + (cap ? getAuraCost(cap.niveau) : 0);
    }, 0);
    
    // Ajout du coût des boosts actifs
    drain += activeBoostsCount * BOOST_AURA_COST;
    return parseFloat(drain.toFixed(1));
  }, [slots, activeBoostsCount]);

  const auraRemaining = parseFloat((maxAura - currentAuraDrain).toFixed(1));
  const auraPercentage = Math.min(100, (currentAuraDrain / maxAura) * 100);

  // --- MOTEUR DE FUSION TELEMACHUS ---
  const baseStats = useMemo(() => {
    let stats = { 
      power: 1, 
      speed: 1, 
      trick: level * 2.414, 
      recovery: 1, 
      defense: 1 
    };
    
    slots.forEach((slotId, index) => {
      if (!slotId || index >= tierInfo.slots) return;
      
      const cap = capacitesData.find(c => c.id === parseInt(slotId));
      if (!cap) return;
      
      const ratio = level / cap.niveau;

      for (let key in cap.stats_de_base) {
        let valeurCopiee = cap.stats_de_base[key] * ratio;
        stats[key] = Math.max(stats[key], valeurCopiee);
      }
    });

    return stats;
  }, [level, slots, tierInfo]);

  // Déterminer la statistique la plus élevée pour identifier les stats "fortes" et "faibles"
  const maxStatValue = useMemo(() => Math.max(...Object.values(baseStats)), [baseStats]);

  const statsFinales = useMemo(() => {
    let finalStats = { ...baseStats };
    
    // Application des amplifications manuelles
    for (let key of Object.keys(finalStats)) {
      if (boosts[key]) {
        // Une stat est considérée "forte" si elle est égale à la stat maximum de base
        const isStrong = baseStats[key] >= maxStatValue - 0.01;
        const multiplier = isStrong ? boostRules.strong : boostRules.weak;
        finalStats[key] = finalStats[key] * multiplier;
      }
    }

    return finalStats;
  }, [baseStats, boosts, boostRules, maxStatValue]);

  // Gestion de la modification d'un slot
  const updateSlot = (index, value) => {
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

    if (projectedAuraDrain > maxAura) {
      return; // Pas assez d'aura
    }

    const newSlots = [...slots];
    newSlots[index] = value;
    setSlots(newSlots);
  };

  // Gestion du toggle pour amplifier une stat
  const toggleBoost = (statKey) => {
    setBoosts(prev => {
      const isCurrentlyBoosted = prev[statKey];
      if (isCurrentlyBoosted) {
        return { ...prev, [statKey]: false };
      } else {
        const isStrong = baseStats[statKey] >= maxStatValue - 0.01;
        const multiplier = isStrong ? boostRules.strong : boostRules.weak;
        
        if (multiplier <= 1.0) return prev; // Cette stat ne peut pas être amplifiée à ce niveau
        if (activeBoostsCount >= maxBoostsAllowed) return prev; 
        if (auraRemaining < BOOST_AURA_COST) return prev; 
        return { ...prev, [statKey]: true };
      }
    });
  };

  // Réinitialisation de sécurité si le niveau baisse trop
  useEffect(() => {
    const currentTier = getTierInfo(level);
    if (slotsUsed > currentTier.slots) {
      const newSlots = [...slots];
      for (let i = currentTier.slots; i < 4; i++) {
        newSlots[i] = "";
      }
      setSlots(newSlots);
    }
    
    // Annuler les boosts en cas de baisse de niveau réduisant le nombre max
    setBoosts({ power: false, speed: false, trick: false, recovery: false, defense: false });
  }, [level]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-4 md:p-8 selection:bg-yellow-500/30">
      
      {/* En-tête */}
      <div className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 tracking-tight mb-2">
          TELEMACHUS PAWN
        </h1>
        <p className="text-neutral-400 font-medium uppercase tracking-widest text-sm md:text-base">
          Aura Deity - Simulateur de Capacité
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* PANNEAU GAUCHE : CONTRÔLES */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Niveau de Telemachus */}
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl flex items-center justify-between border-l-4 border-l-yellow-500">
            <div>
              <label className="text-lg font-bold text-neutral-200 block">
                Niveau Actuel
              </label>
              <span className={`text-sm font-bold uppercase tracking-wider ${tierInfo.color}`}>
                {tierInfo.name}
              </span>
            </div>
            <input 
              type="number" 
              value={level}
              onChange={(e) => setLevel(parseFloat(e.target.value) || 1)}
              step="0.1" 
              min="1.0" 
              max="10.0"
              className="w-24 bg-neutral-950 text-yellow-500 text-xl font-black text-center py-2 px-3 rounded-lg border border-neutral-700 focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          {/* RESERVES D'AURA */}
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

            {/* Section Info Amplifications */}
            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ChevronsUp size={16} className="text-yellow-500" />
                <span className="text-sm text-neutral-400 font-semibold uppercase tracking-wider">Amplifications</span>
              </div>
              <span className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/30">
                {activeBoostsCount} / {maxBoostsAllowed} Max
              </span>
            </div>
          </div>

          {/* Emplacements de copie */}
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

              return (
                <div key={index} className="relative group">
                  <select
                    value={slotValue}
                    onChange={(e) => updateSlot(index, e.target.value)}
                    disabled={isLocked}
                    className={`w-full appearance-none bg-neutral-950 border py-3 pl-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all font-medium
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
                  
                  {/* Indicateur de coût d'aura */}
                  {slotValue && currentCap && !isLocked && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-xs font-bold text-yellow-500/70 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20">
                      -{getAuraCost(currentCap.niveau)}
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
          
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Aura Jaune</span>
          </div>

          <div className="w-full mb-8 mt-6">
            <RadarChart stats={statsFinales} boosts={boosts} />
          </div>

          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3">
            {statConfig.map(({ key, label, Icon, color }) => {
              const isBoosted = boosts[key];
              const isStrong = baseStats[key] >= maxStatValue - 0.01;
              const currentMultiplier = isStrong ? boostRules.strong : boostRules.weak;
              
              const isUnboostable = !isBoosted && currentMultiplier <= 1.0;
              const isDisabled = !isBoosted && (activeBoostsCount >= maxBoostsAllowed || auraRemaining < BOOST_AURA_COST || isUnboostable);

              return (
                <div key={key} className={`bg-neutral-950 border rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden group transition-colors duration-300
                  ${isBoosted ? 'border-yellow-500 bg-yellow-500/10' : 'border-neutral-800'}`}>
                  
                  <Icon size={20} className={`mb-2 ${isBoosted ? 'text-yellow-500' : color} opacity-80`} />
                  <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold mb-1">{label}</span>
                  <span className={`text-xl font-black ${isBoosted ? 'text-yellow-400' : 'text-neutral-100'}`}>
                    {statsFinales[key].toFixed(1)}
                  </span>

                  {/* Bouton d'amplification */}
                  <button 
                    onClick={() => toggleBoost(key)}
                    disabled={isDisabled}
                    className={`mt-3 w-full py-1.5 px-1 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all
                      ${isBoosted 
                        ? 'bg-yellow-500 text-neutral-950 hover:bg-yellow-400' 
                        : isDisabled 
                          ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800' 
                          : 'bg-neutral-900 text-neutral-400 hover:text-yellow-500 border border-neutral-700 hover:border-yellow-500/50'
                      }`}
                  >
                    <ChevronsUp size={14} />
                    {isBoosted 
                      ? `x${currentMultiplier}` 
                      : isUnboostable 
                        ? 'Max Atteint' 
                        : `Boost x${currentMultiplier}`
                    }
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