// De strook "Nu te doen" van Land en bedrijf: klussen met een dringendheid (nu, vandaag, later), uit de aandachtspunten van holdingsmodel.js plus de
// vergunning van de snackwagen. Puur (scripts/bezitklussen_test.mjs). Hoogstens drie in de strook; "+n meer" opent de lijst met alle klussen.
// Samen spelen: de klussen horen bij het eigen bezit van de speler (#429).

export const URGENTIE = { nu: 0, vandaag: 1, later: 2 };
export const URGENTIE_NAAM = { nu: 'NU', vandaag: 'VANDAAG', later: 'LATER' };
export const MAX_STROOK = 3;

// Welke dringendheid hoort bij een aandachtspunt van holdingsmodel.attentionPoints: schade is nu, wat kan en iets oplevert vandaag, de rest later.
const PUNT = {
  'zieke-kudde': { urg: 'nu', tab: 'boerderij', icoon: 'waarschuwing', sub: 'Bel de dierenarts' },
  rijp: { urg: 'vandaag', tab: 'boerderij', icoon: 'oogst', sub: 'Oogst het vandaag' },
  schuur: { urg: 'vandaag', tab: 'boerderij', icoon: 'pakket', sub: 'Lever de oogst af' },
  braak: { urg: 'vandaag', tab: 'boerderij', icoon: 'veld_braak', sub: 'Zaai een gewas' },
  wacht: { urg: 'vandaag', tab: 'boerderij', icoon: 'spelers', sub: 'Personeel is onderweg' },
  'geen-personeel': { urg: 'vandaag', tab: 'boerderij', icoon: 'spelers', sub: 'Neem iemand aan' },
  capaciteit: { urg: 'later', tab: 'boerderij', icoon: 'spelers', sub: 'Neem meer personeel aan' },
  'grond-moe': { urg: 'later', tab: 'boerderij', icoon: 'gewas', sub: 'Wissel van gewas' },
};

export function klusUitPunt(p) {
  const d = PUNT[p.code];
  if (!d) return null;
  return { code: p.code, urg: d.urg, tab: d.tab, icoon: d.icoon, kop: p.tekst, sub: d.sub, count: p.count || 1 };
}

// Een vergunning van de snackwagen die bijna afloopt: binnen 1 dag is het nu, binnen 5 dagen vandaag. dagen null = geen vergunning.
export function klusVergunning(v) {
  if (!v || !Number.isFinite(v.dagen) || v.dagen > 5) return null;
  const kosten = Number.isFinite(v.kosten) ? ` · verlengen €${Math.round(v.kosten).toLocaleString('nl-NL')}` : '';
  return { code: 'vergunning', urg: v.dagen <= 1 ? 'nu' : 'vandaag', tab: 'snack', icoon: 'plek', kop: `Vergunning ${v.plek || 'standplaats'}`, sub: `Nog ${v.dagen} ${v.dagen === 1 ? 'dag' : 'dagen'}${kosten}`, count: 1 };
}

// De lijst, belangrijkste eerst: dringendheid, dan de volgorde van de aandachtspunten (prio), dan de code.
export function klussen({ punten = [], vergunning = null } = {}) {
  const lijst = punten.map((p) => ({ k: klusUitPunt(p), prio: Number.isFinite(p.prio) ? p.prio : 9 })).filter((x) => x.k);
  const v = klusVergunning(vergunning);
  if (v) lijst.push({ k: v, prio: 1 });
  return lijst.sort((a, b) => URGENTIE[a.k.urg] - URGENTIE[b.k.urg] || a.prio - b.prio || (a.k.code < b.k.code ? -1 : 1)).map((x) => x.k);
}

export const strook = (alle) => ({ items: alle.slice(0, MAX_STROOK), meer: Math.max(0, alle.length - MAX_STROOK) });
export const tabAandacht = (alle, tab) => alle.some((k) => k.tab === tab && k.urg !== 'later');
