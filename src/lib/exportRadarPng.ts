type StatKey = 'power' | 'speed' | 'trick' | 'recovery' | 'defense';

export interface RadarIdentity {
  name: string;
  ability: string;
  portraitSrc: string;
}

// Réplique la fiche de stats unOrdinary (cf. template_graph.jpg à la racine du repo) :
// case portrait + bloc Name/Ability/Level à gauche, pentagone de stats à droite.
const KEYS: StatKey[] = ['power', 'speed', 'trick', 'recovery', 'defense'];
const LABELS: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  trick: 'Trick',
  recovery: 'Recovery',
  defense: 'Defense',
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

function drawIdentityCard(
  ctx: CanvasRenderingContext2D,
  name: string,
  ability: string,
  level: string,
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
  drawIdentityLine(ctx, 'Level:', level, textX, firstBaseline + lineHeight * 2);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportRadarPng(
  stats: Record<StatKey, number>,
  level: number,
  identity: RadarIdentity,
  filename = `${identity.name.toLowerCase()}-radar.png`
) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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

  drawIdentityCard(ctx, identity.name, identity.ability, level.toFixed(1), portrait);

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

  // Graphique réel : peut dépasser le pentagone de référence (ex: Trick > 10).
  const points = KEYS.map((k, i) => vertex(stats[k] || 1, i));
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.45)';
  ctx.lineWidth = 4 * SCALE;
  ctx.strokeStyle = '#ffd700';
  ctx.fill();
  ctx.stroke();

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

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
