// ?stadlaag=<laag>[,<laag>] (Node: STAD_LAAG=...): de stad per laag uit de
// gedeelde tegelbouw in plaats van uit citymap.json (issue #90,
// docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md, fase B). Standaard uit: zonder de
// vlag is er niets veranderd. De waarde 'alle' zet elke laag aan.
export const STAD_LAGEN = Object.freeze(['gebouwen', 'wegen', 'water', 'spoor', 'groen', 'meubilair', 'poi', 'objecten', 'namen']);

// raw (string of null) -> Set met geldige lagen; onbekende namen worden genegeerd
export function parseStadLagen(raw) {
  const out = new Set();
  if (!raw) return out;
  for (const w of String(raw).split(/[,\s]+/)) {
    const n = w.trim().toLowerCase();
    if (n === 'alle') STAD_LAGEN.forEach((l) => out.add(l));
    else if (STAD_LAGEN.includes(n)) out.add(n);
  }
  return out;
}

// De lagen die in deze run uit de tegelbouw komen (browser: ?stadlaag, Node: STAD_LAAG)
export function stadLagen(search = typeof location !== 'undefined' ? location.search : '', env = typeof process !== 'undefined' ? process.env : {}) {
  const q = new URLSearchParams(search || '');
  return parseStadLagen(q.has('stadlaag') ? q.get('stadlaag') : (env && env.STAD_LAAG) || null);
}

export const stadLaagAan = (laag, lagen = stadLagen()) => lagen.has(laag);
