type StatKey = 'power' | 'speed' | 'trick' | 'recovery' | 'defense';

export interface RadarIdentity {
  name: string;
  ability: string;
  portraitSrc: string;
}

// Un calque = la contribution isolée d'une capacité qui a des variantes de mode
// (style Phase Shift, ex: "Phase Shift (Def)"), tracée à la PLACE de la forme
// fusionnée normale dès qu'au moins un calque est actif (cf. layers.length plus
// bas) — exactement comme john_unordinary. Cf. RadarChart > layers dans App.tsx
// pour l'équivalent SVG.
export interface RadarLayer {
  label: string;
  // Calque au niveau réel ; modifiedStats = même calque au niveau amplifié /
  // déamplifié (cf. RadarModifier), absent sans modificateur.
  stats: Record<string, number>;
  modifiedStats?: Record<string, number> | null;
}

// Graphique noir à l'export (le radar du site reste jaune).
const LAYER_FILL = 'rgba(0, 0, 0, 0.4)';
const LAYER_STROKE = '#000000';

// Amplificateur / Déamplificateur (cf. graph-unordinary) : stats et niveau du build
// modifié, superposés à la forme normale (calculée au niveau réel) plutôt que de la
// remplacer.
export interface RadarModifier {
  kind: 'amplified' | 'deamplified';
  stats: Record<StatKey, number>;
  level: number;
}

// Build enregistré comparé (export "comparaison") : contour pointillé coloré. Deux mises
// en page : "overlay" (tous les builds superposés sur la fiche, légende en colonne à
// droite) ou "grid" (planche de petits radars, un par build, chacun superposé au build
// de la fiche).
export interface RadarCompare {
  label: string;
  stats: Record<StatKey, number>;
  color: string;
}

// Réplique la fiche de stats unOrdinary (cf. template_graph.jpg à la racine du repo) :
// case portrait + bloc Name/Ability/Level à gauche, pentagone de stats à droite.
const KEYS: StatKey[] = ['power', 'speed', 'trick', 'recovery', 'defense'];
const LABELS_EN: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  trick: 'Trick',
  recovery: 'Recovery',
  defense: 'Defense',
};
// Labels en français utilisés uniquement sur l'export du Système Shine-City (cf.
// exportRadarPng > frenchLabels) — le reste de l'app garde les noms de stats anglais
// d'origine unOrdinary partout ailleurs.
const LABELS_FR: Record<StatKey, string> = {
  power: 'Puissance',
  speed: 'Vitesse',
  trick: 'Ruse',
  recovery: 'Récupération',
  defense: 'Défense',
};

// Mesures prises directement sur template_graph.jpg (1200x640), mises à l'échelle.
const SCALE = 1.5;
const CANVAS_W = 1280 * SCALE;
const CANVAS_H = 640 * SCALE;

const PORTRAIT_BOX = { x: 83 * SCALE, y: 67 * SCALE, w: (501 - 83) * SCALE, h: (435 - 67) * SCALE };
const LABEL_BOX = { x: 110 * SCALE, y: 434 * SCALE, w: (477 - 110) * SCALE, h: (594 - 434) * SCALE };

const PENTAGON_CENTER = { x: 880 * SCALE, y: 334 * SCALE };
const RADIUS = 230 * SCALE;
const BASE_MAX = 10;

const angleFor = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2;

// Position et taille d'un pentagone : celui de la fiche (MAIN_GEO) ou un petit radar
// de la planche de comparaison. `k` met à l'échelle épaisseurs et décalages.
interface Geo {
  cx: number;
  cy: number;
  r: number;
}
const MAIN_GEO: Geo = { cx: PENTAGON_CENTER.x, cy: PENTAGON_CENTER.y, r: RADIUS };
const geoScale = (geo: Geo) => geo.r / RADIUS;

function vertex(val: number, i: number, geo: Geo = MAIN_GEO) {
  const r = (val / BASE_MAX) * geo.r;
  const angle = angleFor(i);
  return { x: geo.cx + r * Math.cos(angle), y: geo.cy + r * Math.sin(angle), r };
}

const shapePoints = (stats: Record<string, number>, capAt10: boolean, geo: Geo) =>
  KEYS.map((k, i) => vertex(capAt10 ? Math.min(stats[k] || 1, BASE_MAX) : stats[k] || 1, i, geo));

function tracePath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

function drawComicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center',
  size = 30 * SCALE
) {
  // Noto Sans, pas Candara : Candara est réservée à la carte d'identité (cf. graph-unordinary).
  ctx.font = `italic bold ${size}px "Noto Sans", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 5;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

function drawPortrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const boxRatio = PORTRAIT_BOX.w / PORTRAIT_BOX.h;
  const imgRatio = img.width / img.height;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    // image plus large que la case : on rogne les côtés
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    // image plus haute que la case : on rogne haut/bas
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, PORTRAIT_BOX.x, PORTRAIT_BOX.y, PORTRAIT_BOX.w, PORTRAIT_BOX.h);
}

// Candara est une police Microsoft propriétaire, présente seulement sous Windows/Office —
// ailleurs fontconfig la substitue silencieusement (vérifié : le gras devenait Noto Sans
// Black, pas Bold). "Noto Sans" est chargée via Google Fonts, donc c'est elle qui s'affiche
// presque partout ; Candara reste en premier pour qu'une machine qui l'a vraiment l'utilise.
const CANDARA_STACK = `'Candara', 'Noto Sans', sans-serif`;

function drawIdentityLine(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number) {
  const fontSize = 30 * SCALE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${fontSize}px ${CANDARA_STACK}`;
  ctx.fillText(label, x, y);
  const labelWidth = ctx.measureText(label).width;
  ctx.font = `400 ${fontSize}px ${CANDARA_STACK}`;
  ctx.fillText(` ${value}`, x + labelWidth, y);
}

// Ligne du niveau uniquement : le niveau modifié est ajouté entre parenthèses, en rouge
// (amplifié) ou en bleu (déamplifié), ex: "Level: 5.6 (8.4)" — comme dans graph-unordinary.
const AMPLIFIED_COLOR = '#dc2626';
const DEAMPLIFIED_COLOR = '#2563eb';
function drawLevelLine(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  modifiedValue: string | undefined,
  modifiedColor: string,
  x: number,
  y: number
) {
  drawIdentityLine(ctx, label, value, x, y);
  if (!modifiedValue) return;
  const fontSize = 30 * SCALE;
  ctx.font = `700 ${fontSize}px ${CANDARA_STACK}`;
  const labelWidth = ctx.measureText(label).width;
  ctx.font = `400 ${fontSize}px ${CANDARA_STACK}`;
  const valueWidth = ctx.measureText(` ${value}`).width;
  ctx.fillStyle = modifiedColor;
  ctx.font = `700 ${fontSize}px ${CANDARA_STACK}`;
  ctx.fillText(` (${modifiedValue})`, x + labelWidth + valueWidth, y);
}

function drawStatsPolygon(
  ctx: CanvasRenderingContext2D,
  stats: Record<string, number>,
  capAt10: boolean,
  fill: string,
  stroke: string | null,
  geo: Geo = MAIN_GEO
) {
  tracePath(ctx, shapePoints(stats, capAt10, geo));
  ctx.fillStyle = fill;
  ctx.fill();
  if (!stroke) return;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2 * SCALE * Math.max(geoScale(geo), 0.75);
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

// Motif de pointillés par groupe de 8 builds (tirets, points, tiret-point) : avec
// beaucoup de builds superposés, couleur ET motif les distinguent.
const DASH_PATTERNS = [[10, 6], [2.5, 5], [14, 5, 3, 5]];
const compareDash = (index: number) => DASH_PATTERNS[Math.floor(index / 8) % DASH_PATTERNS.length];

function drawComparePolygon(
  ctx: CanvasRenderingContext2D,
  stats: Record<string, number>,
  capAt10: boolean,
  color: string,
  geo: Geo = MAIN_GEO,
  fillAlpha = 0.1,
  dash: number[] = DASH_PATTERNS[0]
) {
  const k = Math.max(geoScale(geo), 0.75);
  tracePath(ctx, shapePoints(stats, capAt10, geo));
  if (fillAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  ctx.setLineDash(dash.map(d => d * SCALE * k));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5 * SCALE * k;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

// Pentagone de référence : toujours régulier, plafonné à 10 (le "gabarit" unOrdinary).
function drawBasePentagon(ctx: CanvasRenderingContext2D, geo: Geo = MAIN_GEO) {
  const k = geoScale(geo);
  const basePoints = KEYS.map((_, i) => vertex(BASE_MAX, i, geo));
  tracePath(ctx, basePoints);
  const baseGradient = ctx.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, geo.r);
  baseGradient.addColorStop(0, '#ffffff');
  baseGradient.addColorStop(1, '#90dee9');
  ctx.fillStyle = baseGradient;
  ctx.fill();

  // Rayons du centre vers chaque sommet, comme les graduations d'un radar chart classique.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5 * SCALE * k;
  basePoints.forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(geo.cx, geo.cy);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  tracePath(ctx, basePoints);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * SCALE * Math.max(k, 0.6);
  ctx.strokeStyle = '#1e3a3e';
  ctx.stroke();
}

// Labels des stats autour du pentagone. Sur la fiche, une valeur > 10 est annotée sous
// son label (la forme peut être plafonnée par "Cap à 10") ; les petits radars de la
// planche affichent leurs valeurs dans leur propre tableau, donc pas d'annotation.
function drawStatLabels(
  ctx: CanvasRenderingContext2D,
  labels: Record<StatKey, string>,
  geo: Geo = MAIN_GEO,
  annotateStats: Record<string, number> | null = null
) {
  const k = geoScale(geo);
  const size = geo === MAIN_GEO ? 30 * SCALE : Math.max(30 * SCALE * k, 15 * SCALE);
  // Ajustements fins par label : recovery/trick un peu plus loin du bord du pentagone,
  // defense remontée pour ne pas déborder sur le graphique.
  const LABEL_RADIUS_EXTRA: Partial<Record<StatKey, number>> = {
    recovery: 12 * SCALE * k,
    trick: 12 * SCALE * k,
    defense: 1 * SCALE * k,
  };
  const LABEL_Y_EXTRA: Partial<Record<StatKey, number>> = {
    defense: 1 * SCALE * k,
  };

  KEYS.forEach((key, i) => {
    // Positions des labels fixes (indépendantes des valeurs), comme sur le modèle.
    const angle = angleFor(i);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Ancrage à gauche/droite du sommet (texte qui s'éloigne du pentagone) plutôt que
    // centré dessus, pour ne jamais chevaucher le cadre.
    const align: CanvasTextAlign = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
    const labelR = geo.r + (align === 'center' ? size * 1.5 : size * 0.6) + (LABEL_RADIUS_EXTRA[key] || 0);
    const x = geo.cx + labelR * cos;
    const y = geo.cy + labelR * sin + (LABEL_Y_EXTRA[key] || 0);

    const val = annotateStats ? annotateStats[key] || 1 : 0;
    if (val > BASE_MAX) {
      // Valeur affichée sous le label plutôt qu'à côté, pour ne pas élargir le texte.
      drawComicText(ctx, labels[key], x, y - size * 0.57, align, size);
      drawComicText(ctx, `(${val.toFixed(1)})`, x, y + size * 0.57, align, size);
    } else {
      drawComicText(ctx, labels[key], x, y, align, size);
    }
  });
}

const UI_FONT = `"Noto Sans", "Segoe UI", sans-serif`;

// Coupe un texte en au plus `maxLines` lignes de largeur `maxWidth`, la dernière
// tronquée par une ellipse si besoin (mesuré avec la police courante du contexte).
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let w = 0; w < words.length; w++) {
    const candidate = line ? `${line} ${words[w]}` : words[w];
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = words[w];
    if (lines.length === maxLines - 1) {
      line = words.slice(w).join(' ');
      break;
    }
  }
  if (line) lines.push(line);
  const last = lines.length - 1;
  if (ctx.measureText(lines[last]).width > maxWidth) {
    let cut = lines[last];
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    lines[last] = `${cut.trimEnd()}…`;
  }
  return lines;
}

const STAT_SHORT_EN: Record<StatKey, string> = { power: 'PWR', speed: 'SPD', trick: 'TRK', recovery: 'REC', defense: 'DEF' };
const STAT_SHORT_FR: Record<StatKey, string> = { power: 'PUI', speed: 'VIT', trick: 'RUS', recovery: 'RÉC', defense: 'DÉF' };

// Petit tableau des 5 stats (abréviation, valeur, écart avec le build de référence).
function drawStatRow(
  ctx: CanvasRenderingContext2D,
  stats: Record<StatKey, number>,
  reference: Record<StatKey, number> | null,
  short: Record<StatKey, string>,
  x: number,
  y: number,
  width: number,
  size: number
) {
  const colW = width / KEYS.length;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  KEYS.forEach((key, i) => {
    const cx = x + colW * (i + 0.5);
    ctx.font = `700 ${size * 0.7}px ${UI_FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(short[key], cx, y);
    ctx.font = `800 ${size}px ${UI_FONT}`;
    ctx.fillStyle = '#111827';
    ctx.fillText(stats[key].toFixed(1), cx, y + size * 1.05);
    if (!reference) return;
    const delta = stats[key] - reference[key];
    ctx.font = `700 ${size * 0.72}px ${UI_FONT}`;
    ctx.fillStyle = Math.abs(delta) < 0.05 ? '#9ca3af' : delta > 0 ? '#15803d' : '#dc2626';
    ctx.fillText(Math.abs(delta) < 0.05 ? '=' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`, cx, y + size * 1.95);
  });
}

// `dash` null = trait plein (build de la fiche).
function drawLegendSwatch(ctx: CanvasRenderingContext2D, color: string, dash: number[] | null, x: number, y: number, w: number) {
  ctx.beginPath();
  ctx.setLineDash(dash ? dash.map(d => d * SCALE * 0.9) : []);
  ctx.lineWidth = 4 * SCALE;
  ctx.lineCap = dash ? 'round' : 'butt';
  ctx.strokeStyle = color;
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Légende de la superposition, en colonne(s) à droite de la fiche. Détaillée (nom + 5
// stats avec écarts) jusqu'à LEGEND_DETAILED_MAX builds ; au-delà, compacte (trait +
// nom) et répartie sur autant de colonnes que nécessaire pour ne jamais déborder — les
// stats détaillées de chaque build sont dans l'export "grille".
const LEGEND_W = 560 * SCALE;
const LEGEND_PAD = 28 * SCALE;
const LEGEND_NAME = 19 * SCALE;
const LEGEND_STAT = 16 * SCALE;
const LEGEND_SWATCH = 46 * SCALE;
const LEGEND_DETAILED_MAX = 6;
const LEGEND_MAX_COLUMNS = 4;

interface LegendEntry {
  label: string;
  color: string;
  dash: number[] | null;
  stats: Record<StatKey, number>;
}

function layoutLegend(ctx: CanvasRenderingContext2D, entries: LegendEntry[]) {
  const detailed = entries.length - 1 <= LEGEND_DETAILED_MAX;
  ctx.font = `700 ${LEGEND_NAME}px ${UI_FONT}`;
  const nameW = LEGEND_W - LEGEND_PAD * 2 - LEGEND_SWATCH - 14 * SCALE;
  const blocks = entries.map(entry => {
    const lines = wrapText(ctx, entry.label, nameW, 2);
    const h = lines.length * LEGEND_NAME * 1.25 + (detailed ? LEGEND_STAT * 3.1 + 16 * SCALE : 12 * SCALE);
    return { entry, lines, h };
  });
  const total = blocks.reduce((n, b) => n + b.h, 0);
  const available = CANVAS_H - LEGEND_PAD * 2;

  // Le moins de colonnes possible sans dépasser la hauteur de la fiche (de 15 % au
  // plus) ; au-delà de LEGEND_MAX_COLUMNS, l'image s'allonge.
  let count = 1;
  while (count < LEGEND_MAX_COLUMNS && total / count > available * 1.15) count++;
  const target = Math.max(available, total / count);
  const columns: (typeof blocks)[] = [[]];
  let used = 0;
  blocks.forEach(block => {
    if (used + block.h > target && columns[columns.length - 1].length > 0) {
      columns.push([]);
      used = 0;
    }
    columns[columns.length - 1].push(block);
    used += block.h;
  });
  const heights = columns.map(col => col.reduce((n, b) => n + b.h, 0));
  return { detailed, columns, heights, width: columns.length * LEGEND_W, height: Math.max(...heights) + LEGEND_PAD * 2 };
}

function drawCompareLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  height: number,
  layout: ReturnType<typeof layoutLegend>,
  reference: Record<StatKey, number>,
  short: Record<StatKey, string>
) {
  const innerW = LEGEND_W - LEGEND_PAD * 2;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x, 0, layout.width, height);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x, 0, 2 * SCALE, height);

  // Toutes les colonnes partent du même haut, centrées sur la plus haute.
  const top = Math.max(LEGEND_PAD, (height - Math.max(...layout.heights)) / 2);
  layout.columns.forEach((column, c) => {
    const colX = x + c * LEGEND_W;
    let y = top;
    column.forEach(({ entry, lines, h }) => {
      const nameY = y + LEGEND_NAME * 0.6;
      drawLegendSwatch(ctx, entry.color, entry.dash, colX + LEGEND_PAD, nameY, LEGEND_SWATCH);
      ctx.font = `700 ${LEGEND_NAME}px ${UI_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = entry.dash ? entry.color : '#000000';
      lines.forEach((line, i) => ctx.fillText(line, colX + LEGEND_PAD + LEGEND_SWATCH + 14 * SCALE, nameY + i * LEGEND_NAME * 1.25));
      if (layout.detailed) {
        const statsY = y + lines.length * LEGEND_NAME * 1.25 + LEGEND_STAT * 0.6;
        drawStatRow(ctx, entry.stats, entry.dash ? reference : null, short, colX + LEGEND_PAD, statsY, innerW, LEGEND_STAT);
      }
      y += h;
    });
  });
}

function drawIdentityCard(
  ctx: CanvasRenderingContext2D,
  name: string,
  ability: string,
  level: string,
  modifiedLevel: string | undefined,
  modifiedColor: string,
  portrait: HTMLImageElement | null
) {
  ctx.lineWidth = 3 * SCALE;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(PORTRAIT_BOX.x, PORTRAIT_BOX.y, PORTRAIT_BOX.w, PORTRAIT_BOX.h);
  if (portrait) drawPortrait(ctx, portrait);
  ctx.strokeRect(PORTRAIT_BOX.x, PORTRAIT_BOX.y, PORTRAIT_BOX.w, PORTRAIT_BOX.h);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(LABEL_BOX.x, LABEL_BOX.y, LABEL_BOX.w, LABEL_BOX.h);
  ctx.strokeRect(LABEL_BOX.x, LABEL_BOX.y, LABEL_BOX.w, LABEL_BOX.h);

  const textX = LABEL_BOX.x + 20 * SCALE;
  const lineHeight = LABEL_BOX.h / 3.6;
  const firstBaseline = LABEL_BOX.y + lineHeight * 0.95;
  drawIdentityLine(ctx, 'Name:', name, textX, firstBaseline);
  drawIdentityLine(ctx, 'Ability:', ability, textX, firstBaseline + lineHeight);
  drawLevelLine(ctx, 'Level:', level, modifiedLevel, modifiedColor, textX, firstBaseline + lineHeight * 2);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const loadUiFonts = () =>
  Promise.all(
    ['700', '800'].map(weight => document.fonts.load(`${weight} ${20 * SCALE}px "Noto Sans"`).catch(() => null))
  );

// --- PLANCHE DE COMPARAISON (mise en page "grid") ---
// Une carte par build : petit radar où le build de la fiche (noir) et le build comparé
// (pointillés colorés) sont superposés, nom complet et tableau des 5 stats avec écarts.
// La première carte montre le build de la fiche seul. Les formes sont plafonnées à 10
// pour rester dans leur carte : les valeurs exactes sont dans le tableau.
const GRID_CELL_W = 420 * SCALE;
const GRID_CELL_H = 430 * SCALE;
const GRID_GAP = 16 * SCALE;
const GRID_MARGIN = 30 * SCALE;
const GRID_HEADER_H = 110 * SCALE;
const GRID_RADIUS = 120 * SCALE;

async function renderCompareGrid({
  level,
  identity,
  frenchLabels = false,
  hideLevel = false,
  compares = [],
  currentLabel = 'Build actuel',
  stats,
  compareBaseStats,
}: RadarSheet): Promise<Blob | null> {
  await Promise.all([document.fonts.load(`italic bold ${16 * SCALE}px "Noto Sans"`).catch(() => null), loadUiFonts()]);
  const LABELS = frenchLabels ? LABELS_FR : LABELS_EN;
  const short = frenchLabels ? STAT_SHORT_FR : STAT_SHORT_EN;
  const reference = compareBaseStats ?? stats;
  const cards = [
    { label: currentLabel, color: LAYER_STROKE, stats: reference, isReference: true },
    ...compares.map(c => ({ ...c, isReference: false })),
  ];
  const cols = cards.length <= 8 ? 4 : 5;
  const rows = Math.ceil(cards.length / cols);

  const canvas = document.createElement('canvas');
  canvas.width = GRID_MARGIN * 2 + cols * GRID_CELL_W + (cols - 1) * GRID_GAP;
  canvas.height = GRID_MARGIN * 2 + GRID_HEADER_H + rows * GRID_CELL_H + (rows - 1) * GRID_GAP;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // En-tête : qui, à quel niveau, et comment lire les cartes.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f172a';
  ctx.font = `800 ${30 * SCALE}px ${UI_FONT}`;
  const title = `Comparaison — ${identity.name} (${identity.ability}) · Niveau ${hideLevel ? '?.?' : level.toFixed(1)}`;
  ctx.fillText(title, GRID_MARGIN, GRID_MARGIN + 28 * SCALE);
  const keyY = GRID_MARGIN + 74 * SCALE;
  ctx.font = `600 ${16 * SCALE}px ${UI_FONT}`;
  drawLegendSwatch(ctx, LAYER_STROKE, null, GRID_MARGIN, keyY, 40 * SCALE);
  ctx.fillStyle = '#334155';
  ctx.fillText(currentLabel, GRID_MARGIN + 52 * SCALE, keyY);
  let keyX = GRID_MARGIN + 52 * SCALE + ctx.measureText(currentLabel).width + 34 * SCALE;
  drawLegendSwatch(ctx, '#64748b', DASH_PATTERNS[0], keyX, keyY, 40 * SCALE);
  keyX += 52 * SCALE;
  const keyText = `Build comparé (couleur de sa carte) · ${compares.length} builds au même niveau · écarts par rapport à « ${currentLabel} »`;
  ctx.fillText(keyText, keyX, keyY);

  cards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = GRID_MARGIN + col * (GRID_CELL_W + GRID_GAP);
    const y = GRID_MARGIN + GRID_HEADER_H + row * (GRID_CELL_H + GRID_GAP);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5 * SCALE;
    ctx.beginPath();
    ctx.roundRect(x, y, GRID_CELL_W, GRID_CELL_H, 12 * SCALE);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = card.color;
    ctx.beginPath();
    ctx.roundRect(x, y, GRID_CELL_W, 6 * SCALE, [12 * SCALE, 12 * SCALE, 0, 0]);
    ctx.fill();

    ctx.font = `800 ${19 * SCALE}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = card.isReference ? '#000000' : card.color;
    wrapText(ctx, card.label, GRID_CELL_W - 36 * SCALE, 2).forEach((line, i) =>
      ctx.fillText(line, x + GRID_CELL_W / 2, y + 30 * SCALE + i * 24 * SCALE)
    );

    const geo: Geo = { cx: x + GRID_CELL_W / 2, cy: y + 234 * SCALE, r: GRID_RADIUS };
    drawBasePentagon(ctx, geo);
    drawStatsPolygon(ctx, reference, true, card.isReference ? LAYER_FILL : 'rgba(0, 0, 0, 0.22)', LAYER_STROKE, geo);
    if (!card.isReference) drawComparePolygon(ctx, card.stats, true, card.color, geo, 0.15, compareDash(index - 1));
    drawStatLabels(ctx, LABELS, geo);

    drawStatRow(
      ctx,
      card.stats,
      card.isReference ? null : reference,
      short,
      x + 20 * SCALE,
      y + 376 * SCALE,
      GRID_CELL_W - 40 * SCALE,
      16 * SCALE
    );
  });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// Tout ce qui définit une fiche radar exportée.
export interface RadarSheet {
  stats: Record<StatKey, number>;
  level: number;
  identity: RadarIdentity;
  capAt10?: boolean;
  layers?: RadarLayer[];
  // Système Shine-City : labels du pentagone en français (cf. LABELS_FR) au lieu des
  // noms de stats anglais d'origine unOrdinary utilisés partout ailleurs dans l'app.
  frenchLabels?: boolean;
  modifier?: RadarModifier | null;
  // Masque le niveau sur la fiche exportée (affiché "?.?", y compris le niveau modifié).
  hideLevel?: boolean;
  // Builds comparés (export "comparaison") ; vide sinon. Cf. RadarCompare.
  compares?: RadarCompare[];
  // Nom du build de la fiche dans la légende de comparaison.
  currentLabel?: string;
  // Stats du build de la fiche auxquelles les builds comparés sont confrontés (écarts,
  // forme noire de la planche) : ses stats finales, amplificateur compris, comme dans
  // le tableau de comparaison de l'app. Par défaut `stats`.
  compareBaseStats?: Record<StatKey, number>;
  // Mise en page des builds comparés (cf. RadarCompare).
  compareLayout?: 'overlay' | 'grid';
}

// Dessine la fiche et renvoie le PNG (null si le canvas est indisponible).
export async function renderRadarPng({
  stats,
  level,
  identity,
  capAt10 = false,
  layers = [],
  frenchLabels = false,
  modifier = null,
  hideLevel = false,
  compares = [],
  currentLabel = 'Build actuel',
  compareBaseStats,
  compareLayout = 'overlay',
}: RadarSheet): Promise<Blob | null> {
  if (compares.length > 0 && compareLayout === 'grid') {
    return renderCompareGrid({ stats, level, identity, capAt10, frenchLabels, hideLevel, compares, currentLabel, compareBaseStats });
  }
  const LABELS = frenchLabels ? LABELS_FR : LABELS_EN;
  const reference = compareBaseStats ?? stats;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Attendre le chargement des polices web (Noto Sans pour les labels du radar,
  // Candara auto-hébergée pour la carte d'identité) avant de dessiner — sinon le
  // premier rendu du canvas retombe sur une police système, contrairement au DOM
  // qui gère ça nativement via font-display: swap.
  const [portrait] = await Promise.all([
    loadImage(identity.portraitSrc),
    document.fonts.load(`italic bold ${30 * SCALE}px "Noto Sans"`).catch(() => null),
    loadUiFonts(),
    document.fonts.load(`700 ${30 * SCALE}px "Candara"`).catch(() => null),
    document.fonts.load(`400 ${30 * SCALE}px "Candara"`).catch(() => null),
  ]);

  // Superposition : légende en colonne(s) à droite ; si elle est plus haute que la
  // fiche, le canvas s'allonge et la fiche est centrée verticalement.
  const legendLayout =
    compares.length > 0
      ? layoutLegend(ctx, [
          { label: currentLabel, color: LAYER_STROKE, dash: null, stats: reference },
          ...compares.map((c, i) => ({ label: c.label, color: c.color, dash: compareDash(i), stats: c.stats })),
        ])
      : null;
  canvas.width = CANVAS_W + (legendLayout ? legendLayout.width : 0);
  canvas.height = legendLayout ? Math.max(CANVAS_H, Math.ceil(legendLayout.height)) : CANVAS_H;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (legendLayout) {
    drawCompareLegend(ctx, CANVAS_W, canvas.height, legendLayout, reference, frenchLabels ? STAT_SHORT_FR : STAT_SHORT_EN);
  }
  ctx.save();
  ctx.translate(0, (canvas.height - CANVAS_H) / 2);

  drawIdentityCard(
    ctx,
    identity.name,
    identity.ability,
    hideLevel ? '?.?' : level.toFixed(1),
    modifier ? (hideLevel ? '?.?' : modifier.level.toFixed(1)) : undefined,
    modifier?.kind === 'deamplified' ? DEAMPLIFIED_COLOR : AMPLIFIED_COLOR,
    portrait
  );

  drawBasePentagon(ctx);

  // Graphique réel : peut dépasser le pentagone de référence (ex: Trick > 10), sauf si
  // l'option "Cap à 10" est active — la forme est alors plafonnée, mais la valeur réelle
  // reste annotée sous le label (voir plus bas) exactement comme dans le radar interactif.
  // Masqué dès qu'un calque est actif (voir layers.length) — chaque calque EST déjà
  // un build complet, donc on ne veut pas une forme fusionnée en plus qui ferait
  // doublon — exactement comme john_unordinary.
  // Amplifié : forme translucide sans contour, tracée SOUS la forme normale (elle-même
  // translucide), donc le recouvrement ressort simplement plus foncé.
  // Déamplifié : la forme normale devient un fantôme noir translucide et la forme
  // déamplifiée prend le rendu normal (remplissage + contour) — cf. graph-unordinary.
  if (layers.length === 0) {
    if (modifier?.kind === 'deamplified') {
      drawStatsPolygon(ctx, stats, capAt10, 'rgba(0, 0, 0, 0.2)', null);
      drawStatsPolygon(ctx, modifier.stats, capAt10, LAYER_FILL, LAYER_STROKE);
    } else {
      if (modifier?.kind === 'amplified') drawStatsPolygon(ctx, modifier.stats, capAt10, LAYER_FILL, null);
      drawStatsPolygon(ctx, stats, capAt10, LAYER_FILL, LAYER_STROKE);
    }
  }

  // Calques de modes (style Phase Shift) : chaque capacité équipée qui a des
  // variantes de mode est tracée avec EXACTEMENT le même style que la forme
  // normale — même remplissage, même contour — pour rester cohérent ; c'est la
  // superposition de plusieurs formes identiques qui les distingue (recouvrement
  // plus dense), pas une couleur ou une opacité différente (cf. john_unordinary).
  // Amplificateur / Déamplificateur appliqué INDIVIDUELLEMENT à chaque calque, avec le
  // même rendu que la forme principale ci-dessus. Tous les fonds (aperçus amplifiés /
  // fantômes déamplifiés) d'abord, puis les formes avec contour par-dessus.
  if (modifier?.kind === 'deamplified') {
    layers.forEach((layer) => drawStatsPolygon(ctx, layer.stats, capAt10, 'rgba(0, 0, 0, 0.2)', null));
    layers.forEach((layer) =>
      drawStatsPolygon(ctx, layer.modifiedStats || layer.stats, capAt10, LAYER_FILL, LAYER_STROKE)
    );
  } else {
    if (modifier?.kind === 'amplified') {
      layers.forEach((layer) => layer.modifiedStats && drawStatsPolygon(ctx, layer.modifiedStats, capAt10, LAYER_FILL, null));
    }
    layers.forEach((layer) => drawStatsPolygon(ctx, layer.stats, capAt10, LAYER_FILL, LAYER_STROKE));
  }

  // Superposition : sans remplissage dès 3 builds, sinon les aplats se mélangent.
  compares.forEach((c, i) =>
    drawComparePolygon(ctx, c.stats, capAt10, c.color, MAIN_GEO, compares.length > 2 ? 0 : 0.1, compareDash(i))
  );

  drawStatLabels(ctx, LABELS, MAIN_GEO, stats);
  ctx.restore();

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Révocation différée : certains navigateurs lisent encore l'URL juste après le clic.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportRadarPng(sheet: RadarSheet, filename = `${sheet.identity.name.toLowerCase()}-radar.png`) {
  const blob = await renderRadarPng(sheet);
  if (blob) downloadBlob(blob, filename);
}
