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

// Build enregistré superposé à la fiche (export "comparaison") : contour pointillé
// coloré, nommé dans la légende en haut à droite.
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

function vertex(val: number, i: number) {
  const r = (val / BASE_MAX) * RADIUS;
  const angle = angleFor(i);
  return { x: PENTAGON_CENTER.x + r * Math.cos(angle), y: PENTAGON_CENTER.y + r * Math.sin(angle), r };
}

function drawComicText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign = 'center'
) {
  // Noto Sans, pas Candara : Candara est réservée à la carte d'identité (cf. graph-unordinary).
  ctx.font = `italic bold ${30 * SCALE}px "Noto Sans", "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6 * SCALE;
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
  stroke: string | null
) {
  const points = KEYS.map((k, i) => vertex(capAt10 ? Math.min(stats[k] || 1, BASE_MAX) : stats[k] || 1, i));
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (!stroke) return;
  ctx.lineWidth = 2 * SCALE;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawComparePolygon(ctx: CanvasRenderingContext2D, stats: Record<string, number>, capAt10: boolean, color: string) {
  const points = KEYS.map((k, i) => vertex(capAt10 ? Math.min(stats[k] || 1, BASE_MAX) : stats[k] || 1, i));
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.setLineDash([10 * SCALE, 7 * SCALE]);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * SCALE;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.setLineDash([]);
}

// Légende de la comparaison, alignée à droite dans le coin haut droit (zone libre de la
// fiche, au-dessus du label Speed) : le build de la fiche en trait plein, puis chaque
// build comparé en pointillé de sa couleur.
function drawCompareLegend(ctx: CanvasRenderingContext2D, currentLabel: string, compares: RadarCompare[]) {
  const right = CANVAS_W - 30 * SCALE;
  const lineH = 30 * SCALE;
  const swatch = 34 * SCALE;
  ctx.font = `700 ${20 * SCALE}px "Noto Sans", "Segoe UI", sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const entries = [{ label: currentLabel, color: LAYER_STROKE, dashed: false }, ...compares.map(c => ({ ...c, dashed: true }))];
  entries.forEach((entry, i) => {
    const y = 34 * SCALE + i * lineH;
    const label = entry.label.length > 32 ? `${entry.label.slice(0, 31)}…` : entry.label;
    ctx.fillStyle = entry.color;
    ctx.fillText(label, right, y);
    const textW = ctx.measureText(label).width;
    ctx.beginPath();
    ctx.setLineDash(entry.dashed ? [7 * SCALE, 5 * SCALE] : []);
    ctx.lineWidth = 3 * SCALE;
    ctx.strokeStyle = entry.color;
    ctx.moveTo(right - textW - 12 * SCALE - swatch, y);
    ctx.lineTo(right - textW - 12 * SCALE, y);
    ctx.stroke();
    ctx.setLineDash([]);
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
  // Builds comparés superposés (export "comparaison"), avec légende ; vide sinon.
  compares?: RadarCompare[];
  // Nom du build de la fiche dans la légende de comparaison.
  currentLabel?: string;
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
}: RadarSheet): Promise<Blob | null> {
  const LABELS = frenchLabels ? LABELS_FR : LABELS_EN;
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Attendre le chargement des polices web (Noto Sans pour les labels du radar,
  // Candara auto-hébergée pour la carte d'identité) avant de dessiner — sinon le
  // premier rendu du canvas retombe sur une police système, contrairement au DOM
  // qui gère ça nativement via font-display: swap.
  const [portrait] = await Promise.all([
    loadImage(identity.portraitSrc),
    document.fonts.load(`italic bold ${30 * SCALE}px "Noto Sans"`).catch(() => null),
    document.fonts.load(`700 ${30 * SCALE}px "Candara"`).catch(() => null),
    document.fonts.load(`400 ${30 * SCALE}px "Candara"`).catch(() => null),
  ]);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawIdentityCard(
    ctx,
    identity.name,
    identity.ability,
    hideLevel ? '?.?' : level.toFixed(1),
    modifier ? (hideLevel ? '?.?' : modifier.level.toFixed(1)) : undefined,
    modifier?.kind === 'deamplified' ? DEAMPLIFIED_COLOR : AMPLIFIED_COLOR,
    portrait
  );

  // Pentagone de référence : toujours régulier, plafonné à 10 (le "gabarit" unOrdinary).
  const basePoints = KEYS.map((_, i) => vertex(BASE_MAX, i));
  ctx.beginPath();
  basePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();

  const baseGradient = ctx.createRadialGradient(
    PENTAGON_CENTER.x,
    PENTAGON_CENTER.y,
    0,
    PENTAGON_CENTER.x,
    PENTAGON_CENTER.y,
    RADIUS
  );
  baseGradient.addColorStop(0, '#ffffff');
  baseGradient.addColorStop(1, '#90dee9');
  ctx.fillStyle = baseGradient;
  ctx.fill();

  // Rayons du centre vers chaque sommet, comme les graduations d'un radar chart classique.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5 * SCALE;
  basePoints.forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(PENTAGON_CENTER.x, PENTAGON_CENTER.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });

  ctx.beginPath();
  basePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3 * SCALE;
  ctx.strokeStyle = '#1e3a3e';
  ctx.stroke();

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

  compares.forEach(c => drawComparePolygon(ctx, c.stats, capAt10, c.color));
  if (compares.length > 0) drawCompareLegend(ctx, currentLabel, compares);

  // Ajustements fins par label : recovery/trick un peu plus loin du bord du pentagone,
  // defense remontée pour ne pas déborder sur le graphique.
  const LABEL_RADIUS_EXTRA: Partial<Record<StatKey, number>> = {
    recovery: 12 * SCALE,
    trick: 12 * SCALE,
    defense: 1 * SCALE,
  };
  const LABEL_Y_EXTRA: Partial<Record<StatKey, number>> = {
    defense: 1 * SCALE,
  };

  KEYS.forEach((k, i) => {
    // Positions des labels fixes (indépendantes des valeurs), comme sur le modèle.
    const angle = angleFor(i);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Ancrage à gauche/droite du sommet (texte qui s'éloigne du pentagone) plutôt que
    // centré dessus, pour ne jamais chevaucher le cadre.
    const align: CanvasTextAlign = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
    const labelR = RADIUS + (align === 'center' ? 45 * SCALE : 18 * SCALE) + (LABEL_RADIUS_EXTRA[k] || 0);
    const x = PENTAGON_CENTER.x + labelR * cos;
    const y = PENTAGON_CENTER.y + labelR * sin + (LABEL_Y_EXTRA[k] || 0);

    const val = stats[k] || 1;
    if (val > BASE_MAX) {
      // Valeur affichée sous le label plutôt qu'à côté, pour ne pas élargir le texte.
      drawComicText(ctx, LABELS[k], x, y - 17 * SCALE, align);
      drawComicText(ctx, `(${val.toFixed(1)})`, x, y + 17 * SCALE, align);
    } else {
      drawComicText(ctx, LABELS[k], x, y, align);
    }
  });

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
