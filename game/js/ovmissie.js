// OV-missies per halte en per station (#985, eigenaarsfeedback 20-11): bij elke bushalte kan de speler een
// busdienst starten en bij elk station met perron een treindienst. Puur: geen THREE, geen wereld, geen DOM
// (ADR 0005). De lijndata komt als argument binnen (busroutes.js prepareLine: { stops: [{ s, x, y }] };
// railway.js routes: { name, stops: [{ name, s, offmap }] }). Schaalt per zoekvraag: een raster over de haltes
// van alle lijnen, een vraag geeft alleen wat dichtbij ligt. Tests: scripts/ovmissie_test.mjs.

import { stopName } from './busservice.js';
import { VERVOERDER, spoor as spoorVan } from './dienstregeling.js';

export const HALTE_PROMPT_R = 9;   // m: zo dichtbij de paal staat de E-prompt
export const HALTE_ZIEN_R = 220;   // m: haltepalen binnen deze afstand staan in beeld
export const HALTE_SAMEN = 14;     // m: haltes van verschillende lijnen die zo dicht liggen zijn één halte
const CEL = 400;                   // m: rastercel van de haltes

const naam = (line, i) => stopName(line, i);

// --- bushaltes ---------------------------------------------------------------------------------------

const rasters = new WeakMap();

function raster(lines) {
  let g = rasters.get(lines);
  if (g) return g;
  g = new Map();
  for (const line of lines || []) {
    (line.stops || []).forEach((st, index) => {
      if (!Number.isFinite(st.x) || !Number.isFinite(st.y)) return;
      const k = Math.floor(st.x / CEL) * 100003 + Math.floor(st.y / CEL);
      let a = g.get(k);
      if (!a) g.set(k, a = []);
      a.push({ line, index, x: st.x, y: st.y });
    });
  }
  rasters.set(lines, g);
  return g;
}

// Alle halte-ingangen (lijn, volgnummer, plek) binnen r van (x, y).
function ingangenNabij(lines, x, y, r) {
  const g = raster(lines), out = [];
  const x0 = Math.floor((x - r) / CEL), x1 = Math.floor((x + r) / CEL), y0 = Math.floor((y - r) / CEL), y1 = Math.floor((y + r) / CEL);
  for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
    const a = g.get(i * 100003 + j);
    if (!a) continue;
    for (const e of a) if (Math.hypot(e.x - x, e.y - y) <= r) out.push(e);
  }
  return out;
}

// De haltes binnen r van (x, y): ingangen van verschillende lijnen die binnen HALTE_SAMEN liggen zijn één halte
// met meerdere lijnen. Stabiele id (eerste lijn en volgnummer) en een verzonnen naam (busservice.stopName).
export function haltesNabij(lines, x, y, r = HALTE_ZIEN_R) {
  const ing = ingangenNabij(lines, x, y, r + HALTE_SAMEN)
    .sort((a, b) => (String(a.line.id) < String(b.line.id) ? -1 : String(a.line.id) > String(b.line.id) ? 1 : a.index - b.index));
  const haltes = [];
  for (const e of ing) {
    let h = haltes.find((q) => Math.hypot(q.x - e.x, q.y - e.y) <= HALTE_SAMEN);
    if (!h) { h = { id: `${e.line.id}:${e.index}`, x: e.x, y: e.y, naam: naam(e.line, e.index), ingangen: [] }; haltes.push(h); }
    if (!h.ingangen.some((q) => q.line === e.line)) h.ingangen.push(e);
  }
  return haltes.filter((h) => Math.hypot(h.x - x, h.y - y) <= r);
}

export function dichtsteHalte(lines, x, y, r = HALTE_PROMPT_R) {
  let best = null, bd = Infinity;
  for (const h of haltesNabij(lines, x, y, r)) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}

// De diensten die vanaf een halte kunnen beginnen: per lijn elke richting met minstens één halte verder.
// Geeft { line, dir, index (volgnummer op de lijn), eerst (index voor planRide/makeRide), bestemming, volgende, haltes }.
export function halteOpties(halte) {
  const out = [];
  for (const e of halte ? halte.ingangen : []) {
    const n = e.line.stops.length;
    for (const dir of [1, -1]) {
      const rest = dir > 0 ? n - 1 - e.index : e.index;
      if (rest < 1) continue;
      const nextI = e.index + dir, lastI = dir > 0 ? n - 1 : 0;
      out.push({
        key: `${e.line.id}:${dir}`, line: e.line, dir, index: e.index, eerst: dir > 0 ? e.index : n - 1 - e.index,
        ref: e.line.ref || '', bestemming: naam(e.line, lastI), volgende: naam(e.line, nextI), haltes: rest,
        tekst: `${e.line.name} naar ${naam(e.line, lastI)}`,
      });
    }
  }
  return out.sort((a, b) => b.haltes - a.haltes || (a.key < b.key ? -1 : 1));
}

// De E-prompt bij een halte (de vorm van prompts.js); why = reden waarom het nu niet kan, of null.
export function haltePrompt(halte, why = null) {
  if (!halte) return null;
  const opties = halteOpties(halte);
  if (!opties.length) return null;
  return { id: 'halte-' + halte.id, x: halte.x, y: halte.y, h: 2.9, key: 'E', label: `Halte ${halte.naam}`, sub: why || (opties.length > 1 ? 'Een busdienst starten: kies je lijn' : `Busdienst starten: ${opties[0].tekst}`), ring: true, dim: !!why };
}

// De regelkaart bij het starten van een busdienst vanaf een halte: dezelfde vorm als bijbaan_aaa.js.
export function halteKaart(optie) {
  return {
    doel: optie ? `Rij ${optie.tekst}` : 'Rij de lijn volgens de dienstregeling',
    afloop: 'op tijd aankomen, niet te vroeg vertrekken',
    regels: [{ type: 'stappen', inv: { label: 'De dienst', klaar: 0, stappen: [{ icoon: 'pijl', label: 'Volgende halte' }, { icoon: 'klok', label: 'Op de tijd wachten' }, { icoon: 'hart', label: 'Soepel rijden' }] }, na: 6, duur: 9 }],
  };
}

// --- stations ----------------------------------------------------------------------------------------

const STATION_MAX = 6; // namen in de reisweg op de kaart

// De treindiensten die vanaf een station kunnen beginnen: per lijn die er stopt elke richting met een halte
// verder (buiten de kaart telt niet). station.stops: [{ route, idx, s }] (stationtravel.js stopsFor).
// Geeft { key, route, dir, idx, s, bestemming, volgende, namen (de haltes onderweg), spoor, tekst }.
export function stationOpties(station) {
  const out = [];
  for (const st of station ? station.stops || [] : []) {
    const stops = st.route.stops;
    for (const dir of [1, -1]) {
      const namen = [];
      for (let i = st.idx + dir; i >= 0 && i < stops.length; i += dir) if (!stops[i].offmap) namen.push(stops[i].name);
      if (!namen.length) continue;
      out.push({
        key: `${st.route.name}:${dir}`, route: st.route, trein: st.train || null, dir, idx: st.idx, s: st.s, namen: namen.slice(0, STATION_MAX), haltes: namen.length,
        bestemming: namen[namen.length - 1], volgende: namen[0], spoor: spoorVan(station.name, st.route, dir),
        tekst: `${VERVOERDER} naar ${namen[namen.length - 1]}`,
      });
    }
  }
  return out.sort((a, b) => b.haltes - a.haltes || (a.key < b.key ? -1 : 1));
}

// Waar de trein van een dienst op het station komt te staan: het hart van de trein op de halte, zoals een trein die
// er halteert (railway.js, c = stop.s), met de cabine aan de kant van de rijrichting. Puur, voor de test.
export function treinPlek(optie) {
  return { c: optie.s, cab: optie.dir };
}

// De regelkaart bij het starten van een treindienst vanaf een station.
export function stationKaart(optie) {
  return {
    doel: optie ? `Rij ${optie.tekst}` : 'Rij de treindienst',
    afloop: 'stoppen bij elk perron, deuren open met O, niet te vroeg weg',
    regels: [{ type: 'stappen', inv: { label: 'De dienst', klaar: 0, stappen: [{ icoon: 'pijl', label: 'Stoppen bij het perron' }, { icoon: 'klok', label: 'Op de tijd wachten' }, { icoon: 'hart', label: 'Zacht remmen' }] }, na: 6, duur: 9 }],
  };
}

// Een regel voor het menu: waar de dienst heen gaat en welke haltes erop volgen.
export function stationRegel(optie) {
  return `${optie.tekst} · ${optie.spoor ? 'spoor ' + optie.spoor + ' · ' : ''}${optie.namen.slice(0, 3).join(', ')}${optie.haltes > 3 ? ', ...' : ''}`;
}
