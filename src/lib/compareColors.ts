// Couleurs des builds comparés sur le radar, choisies pour se distinguer du jaune du
// build courant et du rouge / bleu de l'amplificateur / déamplificateur. Au-delà, la
// palette reboucle (les contours restent distincts par leur légende).
export const COMPARE_COLORS = ['#22d3ee', '#e879f9', '#a3e635', '#fb923c', '#a78bfa', '#fb7185', '#e5e5e5', '#a8a29e'];

export const compareColor = (index: number) => COMPARE_COLORS[index % COMPARE_COLORS.length];

// Mêmes teintes, assombries pour rester lisibles sur le fond clair de la fiche PNG
// exportée (le gris clair de la palette écran y serait invisible).
export const EXPORT_COMPARE_COLORS = ['#0e7490', '#c026d3', '#4d7c0f', '#ea580c', '#7c3aed', '#be123c', '#a16207', '#475569'];

// Au-delà de la palette, une teinte unique par build (angle d'or entre deux teintes
// successives), assez sombre pour le fond clair : aucune couleur ne se répète dans une
// superposition, quel que soit le nombre de builds.
export const exportCompareColor = (index: number) =>
  index < EXPORT_COMPARE_COLORS.length
    ? EXPORT_COMPARE_COLORS[index]
    : `hsl(${Math.round((index * 137.508) % 360)}, 72%, ${index % 2 ? 33 : 40}%)`;
