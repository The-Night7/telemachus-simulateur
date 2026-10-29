// Couleurs des builds comparés sur le radar, choisies pour se distinguer du jaune du
// build courant et du rouge / bleu de l'amplificateur / déamplificateur. Au-delà, la
// palette reboucle (les contours restent distincts par leur légende).
export const COMPARE_COLORS = ['#22d3ee', '#e879f9', '#a3e635', '#fb923c', '#a78bfa', '#2dd4bf', '#fb7185', '#e5e5e5'];

export const compareColor = (index: number) => COMPARE_COLORS[index % COMPARE_COLORS.length];

// Mêmes teintes, assombries pour rester lisibles sur le fond clair de la fiche PNG
// exportée (le gris clair de la palette écran y serait invisible).
export const EXPORT_COMPARE_COLORS = ['#0e7490', '#c026d3', '#4d7c0f', '#ea580c', '#7c3aed', '#0f766e', '#e11d48', '#525252'];

export const exportCompareColor = (index: number) => EXPORT_COMPARE_COLORS[index % EXPORT_COMPARE_COLORS.length];
