// Gouden beelden van de proefspeler: per missie-stap een referentiebeeld bewaren (standaard .scr/goud/<missie>/<stap>-<reden>-<n>.png) en bij
// een volgende run het pixelverschil boven een tolerantie markeren. Hergebruikt het criterium van scripts/perf/pngdiff.mjs (grootste
// kanaalverschil > 8 telt als verschillend), nu als functie. Verkeer en voetgangers bewegen: de standaardtolerantie is ruim (12%) en een
// verschil is een aanwijzing voor een mens of vision-agent, geen bewijs.
//   goudSleutel(oog, n)                  de bestandsnaam van een oogmoment: <stap>-<reden>-<n> (n telt per stap en reden)
//   pixelVerschil(A, B, { kanaal })      { fractie, gem, box } tussen twee decodePng-beelden
//   goudBewaar(map, events, root, opt)   zet de oogbeelden van een run neer als referentie (bestaande blijven staan tenzij vernieuw)
//   goudVergelijk(map, events, root, o)  geeft bevindingen { type: 'goud-verschil' | 'goud-formaat' } per beeld dat te veel afwijkt
import fs from 'node:fs';
import path from 'node:path';
import { decodePng } from '../lib/pngcheck.mjs';

export const GOUD = { tolerantie: 0.12, kanaal: 8, root: '.scr/goud' };

export function pixelVerschil(A, B, { kanaal = GOUD.kanaal } = {}) {
  if (!A || !B || A.w !== B.w || A.h !== B.h) return null;
  let n = 0, som = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    let m = 0; const i = (y * A.w + x) * 4;
    for (let c = 0; c < 3; c++) { const d = Math.abs(A.rgba[i + c] - B.rgba[i + c]); som += d; if (d > m) m = d; }
    if (m > kanaal) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { fractie: Math.round((n / (A.w * A.h)) * 10000) / 10000, gem: Math.round((som / (A.w * A.h * 3)) * 100) / 100, box: n ? [x0, y0, x1, y1] : null };
}

// De oogmomenten van een run met hun goud-sleutel: <stap>-<reden>-<n>. n telt per (stap, reden) in volgorde van de run.
export function goudSleutels(events) {
  const tel = {}, uit = [];
  for (const o of events.filter((e) => e.type === 'oog' && e.shot)) {
    const k = `${o.stap || 'x'}-${o.reden}`;
    tel[k] = (tel[k] || 0) + 1;
    uit.push({ oog: o, sleutel: `${k}-${tel[k]}`, stap: o.stap || 'x' });
  }
  return uit;
}
export const goudSleutel = (o, n = 1) => `${o.stap || 'x'}-${o.reden}-${n}`;

const bron = (map, shot) => [path.join(map, `shots-${shot}.png`), path.join(map, `${shot}.png`)].find((p) => fs.existsSync(p));

// Bewaart de beelden van een run als goud. Standaard alleen waar nog geen goud is; `vernieuw` overschrijft.
export function goudBewaar(map, events, root = GOUD.root, { missie = '', vernieuw = false } = {}) {
  let n = 0;
  for (const { oog, sleutel, stap } of goudSleutels(events)) {
    const p = bron(map, oog.shot); if (!p) continue;
    const doel = path.join(root, missie || stap.replace(/\d+$/, '') || 'x', `${sleutel}.png`);
    if (fs.existsSync(doel) && !vernieuw) continue;
    fs.mkdirSync(path.dirname(doel), { recursive: true }); fs.copyFileSync(p, doel); n++;
  }
  return n;
}

// Vergelijkt de oogbeelden met het goud. Geen goud voor een beeld = niets te zeggen (dat is geen bevinding).
export function goudVergelijk(map, events, root = GOUD.root, { missie = '', tolerantie = GOUD.tolerantie, kanaal = GOUD.kanaal, lees = (p) => decodePng(fs.readFileSync(p)) } = {}) {
  const uit = [];
  for (const { oog, sleutel, stap } of goudSleutels(events)) {
    const p = bron(map, oog.shot);
    const g = path.join(root, missie || stap.replace(/\d+$/, '') || 'x', `${sleutel}.png`);
    if (!p || !fs.existsSync(g)) continue;
    let r = null, formaat = false;
    try { const a = lees(g), b = lees(p); r = pixelVerschil(a, b, { kanaal }); formaat = r == null; } catch (e) { continue; }
    const basis = { soort: 'goud', stap: oog.stap || '', plek: oog.plek || null, t: oog.t ?? oog.tijd, tekst: oog.doelTekst || '', shot: oog.shot };
    if (formaat) uit.push({ ...basis, type: 'goud-formaat', ernst: 'cosmetisch', bewijs: { sleutel, uitleg: 'het beeld heeft een andere grootte dan het goud (ander scherm?)' } });
    else if (r.fractie > tolerantie) uit.push({ ...basis, type: 'goud-verschil', ernst: 'cosmetisch', bewijs: { sleutel, ...r, tolerantie, goud: g } });
  }
  return uit;
}
