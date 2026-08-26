type StatKey = 'power' | 'speed' | 'trick' | 'recovery' | 'defense';

// Réplique le style des fiches de stats unOrdinary : pentagone à dégradé
// blanc -> cyan, contour bleu-vert épais, labels en contour noir/blanc.
const KEYS: StatKey[] = ['power', 'speed', 'trick', 'recovery', 'defense'];
const LABELS: Record<StatKey, string> = {
  power: 'Power',
  speed: 'Speed',
  trick: 'Trick',
  recovery: 'Recovery',
  defense: 'Defense',
};

// Même échelle fixe (0-10) que le radar interactif : une capacité dont le
// Trick dépasse 10 dépasse simplement le rayon nominal, elle n'écrase pas
// les autres axes comme le ferait une mise à l'échelle auto sur le max.
const SIZE = 1200;
const CENTER = SIZE / 2;
const RADIUS = 260;
const BASE_MAX = 10;

const angleFor = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2;

function vertex(val: number, i: number) {
  const r = (val / BASE_MAX) * RADIUS;
  const angle = angleFor(i);
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle), r };
}

function drawComicText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = 'italic bold 40px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

export function exportRadarPng(stats: Record<StatKey, number>, filename = 'telemachus-radar.png') {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Pentagone de référence : toujours régulier, plafonné à 10 (le "gabarit" unOrdinary).
  const basePoints = KEYS.map((_, i) => vertex(BASE_MAX, i));
  ctx.beginPath();
  basePoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();

  const baseGradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, RADIUS);
  baseGradient.addColorStop(0, '#ffffff');
  baseGradient.addColorStop(1, '#90dee9');
  ctx.fillStyle = baseGradient;
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#1e3a3e';
  ctx.stroke();

  // Graphique réel : peut dépasser le pentagone de référence (ex: Trick > 10).
  const points = KEYS.map((k, i) => vertex(stats[k] || 1, i));
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 215, 0, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffd700';
  ctx.fill();
  ctx.stroke();

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#121212';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
  });

  KEYS.forEach((k, i) => {
    const p = points[i];
    const labelR = Math.max(RADIUS, p.r) + 70;
    const angle = angleFor(i);
    const x = CENTER + labelR * Math.cos(angle);
    const y = CENTER + labelR * Math.sin(angle);
    drawComicText(ctx, LABELS[k], x, y);
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
