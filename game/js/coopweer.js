// Samen spelen (#95, #364): het weer is van de gastheer. Hij meldt de staat van de weermachine (weatherstate.js) om de
// paar seconden; een gast stapt zijn eigen machine niet meer (weather.js followRegionWeather) maar zet de staat van de
// gastheer erin, zodat iedereen dezelfde bui, mist en hetzelfde onweer ziet. Pure logica, geen DOM.

import { WEATHER_KINDS, REGION_IDS, createWeatherState } from './weatherstate.js';

export const WEER_EVERY = 4; // s tussen twee meldingen
const r3 = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
const g01 = (v) => Number.isFinite(v) && v >= 0 && v <= 1;

export function weerEvent(ws) {
  if (!ws || !ws.regions) return null;
  const r = {};
  for (const id of REGION_IDS) {
    const g = ws.regions[id]; if (!g) continue;
    const k = WEATHER_KINDS.indexOf(g.kind);
    r[id] = [k < 0 ? 0 : k, r3(g.rain), r3(g.overcast), r3(g.mist)];
  }
  return { k: 'weer', f: r3(ws.front), w: r3(ws.windAngle), r };
}

// Controleert een bericht van de gastheer; geeft de schone gegevens of null.
export function leesWeerEvent(b) {
  if (!b || b.k !== 'weer' || !b.r || typeof b.r !== 'object' || !Number.isFinite(b.w) || !g01(b.f)) return null;
  const r = {};
  for (const id of REGION_IDS) {
    const a = b.r[id]; if (a === undefined) continue;
    if (!Array.isArray(a) || a.length !== 4 || !Number.isInteger(a[0]) || a[0] < 0 || a[0] >= WEATHER_KINDS.length || !a.slice(1).every(g01)) return null;
    r[id] = { kind: WEATHER_KINDS[a[0]], rain: a[1], overcast: a[2], mist: a[3] };
  }
  return { front: b.f, windAngle: b.w, regions: r };
}

// Zet de staat van de gastheer in de weermachine van de gast (die zelf niet meer stapt). Geeft de machine terug.
export function pasWeerToe(ws, w) {
  const state = ws || createWeatherState(1);
  if (!w) return state;
  state.front = w.front; state.windAngle = w.windAngle;
  for (const [id, g] of Object.entries(w.regions)) {
    const r = state.regions[id]; if (!r) continue;
    r.kind = g.kind; r.rain = g.rain; r.overcast = g.overcast; r.mist = g.mist; r.age = 0; r.duration = 1e9;
  }
  return state;
}
