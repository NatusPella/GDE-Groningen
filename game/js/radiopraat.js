// De praatblokken van de radio (radio.js) onthouden wat er al gezegd is (#985). De poelen van Geesje zijn klein
// (een regel voor het verkeer, twee voor het nieuws) en een nieuwe regel heeft een opname nodig; daarom kiest de
// radio geen regel die net voorbij kwam zolang er een andere is, en bewaart hij zijn rotatie en de gespeelde
// reclames tussen twee sessies, zoals de muziekgeschiedenis (musicpick.js) al deed. Pure logica, geen opslag zelf.

export const PRAAT_RECENT_MAX = 60; // zoveel gekozen regels bewaren
const PRAAT_VERS = 3;        // zoveel laatste regels van dezelfde poel komen niet meteen terug (hoogstens poel - 1)

// Kies een regel uit `pool` die niet tot de laatste regels van die poel hoort; `recent` (lijst met sleutels, oudste
// eerst) wordt bijgewerkt. Een poel van één regel geeft die regel: er is niets anders.
export function kiesVers(pool, recent, rng = Math.random) {
  if (!Array.isArray(pool) || !pool.length) return undefined;
  const sleutel = (x) => String(x);
  const inPoel = new Set(pool.map(sleutel));
  const vermijd = new Set();
  const max = Math.min(PRAAT_VERS, pool.length - 1);
  for (let i = recent.length - 1; i >= 0 && vermijd.size < max; i--) if (inPoel.has(recent[i])) vermijd.add(recent[i]);
  const kandidaten = pool.filter((x) => !vermijd.has(sleutel(x)));
  const keus = kandidaten[Math.floor(rng() * kandidaten.length) % kandidaten.length];
  const k = sleutel(keus);
  const eerder = recent.indexOf(k);
  if (eerder >= 0) recent.splice(eerder, 1);
  recent.push(k);
  while (recent.length > PRAAT_RECENT_MAX) recent.shift();
  return keus;
}

// Wat bewaard blijft: de rotatie per programma, de recente regels en de reclamegeschiedenis. Alles wat niet klopt
// valt weg; een kapotte of onbekende waarde geeft een lege, geldige staat.
export function leesPraatStaat(tekst) {
  const leeg = { rot: {}, recent: [], ads: { history: [], blocks: 0 } };
  let o = null;
  try { o = typeof tekst === 'string' ? JSON.parse(tekst) : tekst; } catch (e) { return leeg; }
  if (!o || typeof o !== 'object') return leeg;
  const rot = {};
  if (o.rot && typeof o.rot === 'object') for (const [k, v] of Object.entries(o.rot)) if (/^[a-z]{1,16}$/.test(k) && Number.isFinite(v) && v >= 0) rot[k] = Math.min(Math.floor(v), 1e6);
  const lijst = (a, max) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.length <= 200).slice(-max) : []);
  const ads = o.ads && typeof o.ads === 'object' ? o.ads : {};
  return { rot, recent: lijst(o.recent, PRAAT_RECENT_MAX), ads: { history: lijst(ads.history, 10).filter((x) => x.length <= 40), blocks: Number.isFinite(ads.blocks) && ads.blocks > 0 ? Math.min(Math.floor(ads.blocks), 1e6) : 0 } };
}

export const schrijfPraatStaat = ({ rot, recent, ads }) => JSON.stringify({ rot, recent, ads: { history: ads.history, blocks: ads.blocks } });
