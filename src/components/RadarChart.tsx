import type { StatInfo, StatKey, Stats } from '../lib/simulation';

// --- COMPOSANT GRAPHIQUE RADAR SVG ---
export const RadarChart = ({
  stats,
  boosts,
  baseStatsInfo,
  layers = [],
  capAt10 = false,
  amplifiedStats = null,
  deamplifiedStats = null,
  compares = [],
}: {
  stats: Stats;
  boosts: Stats;
  baseStatsInfo: Record<StatKey, StatInfo>;
  layers?: { id: string; stats: Stats; modifiedStats?: Stats | null }[];
  capAt10?: boolean;
  // Amplificateur / Déamplificateur : build modifié superposé à la forme normale
  // (stats = build au niveau réel), comme dans le simulateur de John.
  amplifiedStats?: Stats | null;
  deamplifiedStats?: Stats | null;
  // Builds enregistrés à comparer : un contour pointillé coloré chacun, par-dessus le
  // build courant.
  compares?: { id: string; stats: Stats; color: string }[];
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
  // Avec des calques, l'amplificateur / déamplificateur s'applique individuellement à
  // chaque calque (cf. plus bas) et jamais à la forme fusionnée, masquée.
  const hasLayers = layers.length > 0;
  const mainStats = deamplifiedStats || stats;

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
            modeLayers dans simulateBuild), donc on ne veut pas une forme fusionnée en
            plus qui ferait doublon — exactement comme john_unordinary. */}
        {/* Amplificateur : aperçu translucide sans contour, SOUS la forme normale. */}
        {!hasLayers && amplifiedStats && (
          <polygon points={getPoints(amplifiedStats, capAt10)} fill="rgba(255, 215, 0, 0.25)" stroke="none" className="transition-all duration-500 ease-in-out" />
        )}

        {/* Déamplificateur : la forme d'origine s'efface en fantôme. */}
        {!hasLayers && deamplifiedStats && (
          <polygon points={getPoints(stats, capAt10)} fill="rgba(255, 255, 255, 0.12)" stroke="none" className="transition-all duration-500 ease-in-out" />
        )}

        {!hasLayers && (
          <polygon points={getPoints(mainStats, capAt10)} fill="rgba(255, 215, 0, 0.3)" stroke="#ffd700" strokeWidth="3" className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
        )}

        {/* Calques de modes (style Phase Shift) : chaque capacité équipée qui a des
            variantes de mode est tracée avec EXACTEMENT le même style que l'Aura Shape
            normale — même remplissage, même contour — pour rester cohérent ; c'est la
            superposition de plusieurs formes identiques qui les distingue (recouvrement
            plus dense), pas une couleur ou une opacité différente (cf. john_unordinary).
            Amplificateur / Déamplificateur appliqué individuellement à chaque calque, avec
            le même rendu que la forme principale : tous les fonds d'abord, puis les formes. */}
        {amplifiedStats && layers.map(layer => layer.modifiedStats && (
          <polygon key={`layer-amp-${layer.id}`} points={getPoints(layer.modifiedStats, capAt10)} fill="rgba(255, 215, 0, 0.25)" stroke="none" className="transition-all duration-500 ease-in-out" />
        ))}
        {deamplifiedStats && layers.map(layer => (
          <polygon key={`layer-ghost-${layer.id}`} points={getPoints(layer.stats, capAt10)} fill="rgba(255, 255, 255, 0.12)" stroke="none" className="transition-all duration-500 ease-in-out" />
        ))}
        {layers.map(layer => (
          <polygon
            key={`layer-${layer.id}`}
            points={getPoints((deamplifiedStats && layer.modifiedStats) || layer.stats, capAt10)}
            fill="rgba(255, 215, 0, 0.3)"
            stroke="#ffd700"
            strokeWidth="3"
            className="transition-all duration-500 ease-in-out drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"
          />
        ))}

        {compares.map(c => (
          <polygon
            key={`compare-${c.id}`}
            points={getPoints(c.stats, capAt10)}
            fill={c.color}
            fillOpacity={compares.length > 1 ? 0.03 : 0.06}
            stroke={c.color}
            strokeWidth="2.5"
            strokeDasharray="7 5"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-in-out"
          />
        ))}

        {/* Nodes : marquent les sommets de l'Aura Shape, donc masqués avec elle et
            plafonnés comme elle (capAt10) — seuls Aura Shape/Nodes respectent l'option. */}
        {!hasLayers && keys.map((key, i) => {
          const rawVal = mainStats[key] || 1;
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
