// De competitie van de voetbalsim in de Euroborg (#981): puur, geen DOM en geen THREE (scripts/voetbal_test.mjs). Een seizoen is een halve competitie met zes verzonnen clubs (De Stadjers zijn
// van jou): vijf speelrondes van drie duels. Jouw duel speel je zelf (elf tegen elf), de andere duels worden uitgerekend met een kleine, deterministische simulatie op de sterkte van de clubs.
// Drie punten voor winst, één voor gelijkspel. De stand staat in dezelfde opslagsleutel als de voorkeur (KEYS.voetbal, alleen dit apparaat, nooit in een savegame). Geen echte clubs of competities.
import { TEAMS } from './voetbalrules.js';
import { makeRng } from './minigamekit.js';

export const MIJN_CLUB = 'stadjers';
export const COMP_CLUBS = TEAMS.map((t) => t.id);          // zes
const POINTS = { winst: 3, gelijk: 1 };
// De sterkte van de computerclubs (jouw club speelt zelf): hoger is beter. Alleen voor de duels waar jij niet bij bent.
const STERKTE = { stadjers: 1.0, hunebedders: 1.15, wadlopers: 1.0, ommelanders: 0.9, veenpiraten: 1.1, kleibijters: 0.85 };
export const clubName = (id) => (TEAMS.find((t) => t.id === id) || { naam: id }).naam;

// Het speelschema (de cirkelmethode): n clubs geven n - 1 rondes van n / 2 duels, ieder speelt ieder één keer.
export function speelschema(ids = COMP_CLUBS) {
  const l = ids.slice();
  const rondes = [];
  for (let r = 0; r < l.length - 1; r++) {
    const duels = [];
    for (let i = 0; i < l.length / 2; i++) duels.push(r % 2 ? [l[l.length - 1 - i], l[i]] : [l[i], l[l.length - 1 - i]]);
    rondes.push(duels);
    l.splice(1, 0, l.pop());
  }
  return rondes;
}

const leegRij = () => ({ g: 0, w: 0, gl: 0, v: 0, vv: 0, tg: 0 });
export function newCompetition(seed = 1) {
  const ranking = {};
  for (const id of COMP_CLUBS) ranking[id] = leegRij();
  return { v: 1, seed: (seed >>> 0) || 1, ronde: 0, rondes: speelschema(), stand: ranking, uitslagen: [], klaar: false, kampioen: null };
}
const points = (r) => r.w * POINTS.winst + r.gl * POINTS.gelijk;
// De stand, de beste eerst: punten, doelsaldo, doelpunten voor, dan de volgorde van de clubs.
export function tabel(comp) {
  const rijen = COMP_CLUBS.map((id, i) => ({ id, naam: clubName(id), ...comp.stand[id], p: points(comp.stand[id]), saldo: comp.stand[id].vv - comp.stand[id].tg, i }));
  rijen.sort((a, b) => b.p - a.p || b.saldo - a.saldo || b.vv - a.vv || a.i - b.i);
  rijen.forEach((r, k) => { r.plek = k + 1; });
  return rijen;
}
export const yourRank = (comp) => (tabel(comp).find((r) => r.id === MIJN_CLUB) || {}).plek || 0;
// Wie jouw tegenstander is in de volgende ronde (of null als het seizoen klaar is).
export function nextOpponent(comp) {
  if (!comp || comp.klaar || comp.ronde >= comp.rondes.length) return null;
  const d = comp.rondes[comp.ronde].find((x) => x.includes(MIJN_CLUB));
  return d ? d.find((x) => x !== MIJN_CLUB) : null;
}
// Poisson met een eigen toevalsgetal (voor de uitslagen van de andere duels).
function poisson(l, rng) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 12); return k - 1; }
export function simuleerDuel(a, b, rng) {
  const sa = STERKTE[a] || 1, sb = STERKTE[b] || 1;
  return [poisson(1.35 * sa / sb, rng), poisson(1.35 * sb / sa, rng)];
}
function bookResult(ranking, id, vv, tg) {
  const r = ranking[id];
  r.g++; r.vv += vv; r.tg += tg;
  if (vv > tg) r.w++; else if (vv < tg) r.v++; else r.gl++;
}
// Jouw uitslag (gf voor, ga tegen) van de huidige ronde wordt geboekt en de andere duels van die ronde worden uitgerekend. Geeft een nieuwe competitie terug (de oude blijft ongemoeid).
export function applyRound(comp, gf, ga) {
  if (!comp || comp.klaar) return comp;
  const c = JSON.parse(JSON.stringify(comp));
  const rng = makeRng(c.seed * 977 + c.ronde * 31 + 7);
  const uit = [];
  for (const [a, b] of c.rondes[c.ronde]) {
    let s;
    if (a === MIJN_CLUB) s = [gf | 0, ga | 0]; else if (b === MIJN_CLUB) s = [ga | 0, gf | 0]; else s = simuleerDuel(a, b, rng);
    bookResult(c.stand, a, s[0], s[1]); bookResult(c.stand, b, s[1], s[0]);
    uit.push([a, b, s[0], s[1]]);
  }
  c.uitslagen.push(uit);
  c.ronde++;
  if (c.ronde >= c.rondes.length) { c.klaar = true; c.kampioen = tabel(c)[0].id; }
  return c;
}
// Een veilige lezer voor de opslag: alles wat niet klopt geeft null (dan begint er een nieuw seizoen).
export function leesCompetitie(d) {
  if (!d || typeof d !== 'object' || d.v !== 1 || !Number.isInteger(d.ronde) || d.ronde < 0 || d.ronde > 5 || !d.stand || typeof d.stand !== 'object') return null;
  for (const id of COMP_CLUBS) { const r = d.stand[id]; if (!r || !['g', 'w', 'gl', 'v', 'vv', 'tg'].every((k) => Number.isInteger(r[k]) && r[k] >= 0 && r[k] < 1000)) return null; }
  const schema = speelschema();
  return { v: 1, seed: Number.isInteger(d.seed) ? d.seed >>> 0 : 1, ronde: d.ronde, rondes: schema, stand: Object.fromEntries(COMP_CLUBS.map((id) => [id, { ...d.stand[id] }])), uitslagen: Array.isArray(d.uitslagen) ? d.uitslagen.slice(0, 5) : [], klaar: d.ronde >= schema.length, kampioen: d.ronde >= schema.length ? tabel({ stand: d.stand })[0].id : null };
}
export const isKampioen = (comp) => !!comp && comp.klaar && comp.kampioen === MIJN_CLUB;
export const KAMPIOEN_BONUS = 120; // een klein bedrag voor een seizoen als kampioen
