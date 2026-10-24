// Live bussen (#395), de bedrading: de stand van de echte bussen bijhouden, de uitzetter uit
// Instellingen respecteren en de opvraag doen (in Electron via het main-proces, anders direct).
// De regels zelf (protobuf lezen, de opvraag, koppelen aan een lijn) staan in livebussen.js; dit
// bestand voegt alleen het ritme, de stand en de keuze van de fetch toe. Geen THREE en geen DOM,
// zodat de tests met een nep-fetch en een nep-omgeving kunnen draaien (scripts/livebussen_test.mjs).
//
// Alles faalt zacht: bij een fout, time-out, te groot of ongeldig bestand, een lege feed, een bron
// die weg is of de instelling uit, rijden de bussen hun eigen dienst (vehicle.js laat liveId vallen).

import { wgsToWorld } from './rdnew.js';
import { pointAt } from './busroutes.js';
import { LIVE_BRON, MAX_LIVE_NABIJ, haalLiveBussen, koppelAanLijn, peilNaarHoek, brugAlsFetch } from './livebussen.js';

// De opvraag: in Electron doet het main-proces hem (een renderer op gde:// mag zonder CORS-koppen
// niet lezen); in de webversie direct. Zonder brug en zonder fetch is er geen bron en blijft het
// spel bij de eigen dienst. Alleen de vaste url uit livebussen.js gaat mee, nooit iets van de speler.
export function kiesFetch(omgeving = globalThis) {
  const brug = omgeving && omgeving.gdeDesktop && omgeving.gdeDesktop.liveBussen;
  if (typeof brug === 'function') return brugAlsFetch(brug);
  const fetchFn = omgeving && omgeving.fetch;
  if (typeof fetchFn === 'function') return (url, opties) => fetchFn.call(omgeving, url, opties);
  return null;
}

// De stand van de echte bussen: per id de lijn, richting en de laatste twee posities op de lijn.
// fetchFn komt van buiten (de brug, window.fetch of een nep in de test); nu is de klok.
export function maakLiveBussen({ fetchFn, nu = () => Date.now(), opts = {} } = {}) {
  const cfg = { ...LIVE_BRON, ...opts };
  const bussen = new Map();      // id -> { id, line, dir, prev: {s, t}, cur: {s, t}, speed }
  const st = { aan: false, bezig: false, volgendeOp: 0, fouten: 0, reden: null, laatsteOk: 0, opgevraagd: 0, onbekend: 0 };

  function wis() { bussen.clear(); }

  function verwerk(res, t, lines) {
    if (!res.ok) {
      st.reden = res.reden;
      if (res.reden === 'leeg') { st.fouten = 0; st.volgendeOp = t + cfg.interval; return; }   // een lege feed is geen fout, de bussen blijven eigen
      st.fouten++;
      st.volgendeOp = t + Math.min(cfg.maxInterval, cfg.interval * 2 ** Math.min(st.fouten, 6));
      return;
    }
    st.fouten = 0; st.reden = null; st.laatsteOk = t; st.volgendeOp = t + cfg.interval;
    const gezien = new Set();
    st.onbekend = 0;
    for (const v of res.voertuigen) {
      const [x, y] = wgsToWorld(v.lat, v.lon);
      const hoek = v.bearing != null && v.bearing >= 0 && v.bearing <= 360 && (v.speed == null || v.speed > 0.5) ? peilNaarHoek(v.bearing) : null;
      const k = koppelAanLijn(lines, x, y, hoek);
      if (!k) { st.onbekend++; continue; }
      const id = String(v.id || `${v.route}:${Math.round(x / 50)}:${Math.round(y / 50)}`);
      gezien.add(id);
      const o = bussen.get(id);
      let dir = k.dir;
      if (!dir && o && o.line === k.line) dir = o.dir;
      if (!dir && o && o.line === k.line && o.cur.s !== k.s) dir = k.s > o.cur.s ? 1 : -1;
      if (!dir) continue;                          // staat stil zonder bekende richting: nog niet bruikbaar
      if (o && o.line === k.line && o.dir === dir && t > o.cur.t) {
        const dt = (t - o.cur.t) / 1000;
        const ds = (k.s - o.cur.s) * dir;
        o.prev = o.cur; o.cur = { s: k.s, t };
        o.speed = ds >= 0 && dt > 0 ? Math.min(25, ds / dt) : 0;
      } else {
        bussen.set(id, { id, line: k.line, dir, prev: { s: k.s, t }, cur: { s: k.s, t }, speed: v.speed != null ? Math.min(25, Math.max(0, v.speed)) : 0 });
      }
    }
    for (const id of [...bussen.keys()]) if (!gezien.has(id)) bussen.delete(id);
  }

  // Aanroepen per beeld (of vaker): vraagt zo nodig op. Geeft de belofte terug (voor tests), anders null.
  function tick(aan, lines, t = nu()) {
    if (!aan || !lines || !lines.length) { if (st.aan) { st.aan = false; wis(); } return null; }
    st.aan = true;
    if (st.bezig || t < st.volgendeOp) return null;
    st.bezig = true; st.opgevraagd++;
    st.volgendeOp = t + cfg.interval;
    return haalLiveBussen({ fetchFn, url: cfg.url, timeout: cfg.timeout, maxBytes: cfg.maxBytes, maxVoertuigen: cfg.maxVoertuigen }).then((res) => {
      if (st.aan) verwerk(res, nu(), lines);
      st.bezig = false;
      return res;
    });
  }

  // De stand van een live bus nu: gladgestreken tussen de laatste twee posities (een opvraag vertraagd, dus altijd
  // een eindig stuk achter de echte bus), daarna met de laatste snelheid een stukje door. null: geen live bus.
  function positie(id, t = nu()) {
    const b = bussen.get(id);
    if (!st.aan || !b || t - b.cur.t > cfg.verouderd) return null;
    const span = Math.max(1, b.cur.t - b.prev.t);
    const f = (t - b.cur.t) / (b.cur.t === b.prev.t ? cfg.interval : span);
    let s;
    if (b.cur.t === b.prev.t) s = b.cur.s + b.dir * Math.min(1, f) * b.speed * Math.min(cfg.interval, t - b.cur.t) / 1000;
    else if (f <= 1) s = b.prev.s + (b.cur.s - b.prev.s) * Math.max(0, f);
    else s = b.cur.s + b.dir * Math.min(10, (t - b.cur.t - span) / 1000) * b.speed;
    s = Math.max(0, Math.min(b.line.length, s));
    const p = pointAt(b.line, s);
    return { id: b.id, line: b.line, dir: b.dir, s, x: p.x, y: p.y, angle: b.dir > 0 ? p.heading : p.heading + Math.PI, speed: b.speed };
  }

  // Live bussen in de ring [min, max] om de speler, dichtstbij eerst, begrensd.
  function kandidaten(px, py, min, max, limiet = MAX_LIVE_NABIJ, t = nu()) {
    const uit = [];
    for (const id of bussen.keys()) {
      const p = positie(id, t);
      if (!p) continue;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d >= min && d <= max) uit.push({ ...p, d });
    }
    return uit.sort((a, b) => a.d - b.d).slice(0, limiet);
  }

  return { tick, positie, kandidaten, stand: () => ({ ...st, aantal: bussen.size }), _wis: wis };
}

// De bron zoals main.js hem gebruikt: de stand hierboven plus de uitzetter (Instellingen) en de
// grens voor test- en devruns. tick() bepaalt zelf of er opgevraagd mag worden; uit betekent dat de
// bussen weer hun eigen dienst rijden. zetBron is vehicle.js setLiveBussen (buiten dit bestand, zodat
// de tests geen THREE nodig hebben).
export function maakBusLive({ fetchFn = kiesFetch(), instellingen = () => ({}), toegestaan = () => true, zetBron = () => {}, nu, opts } = {}) {
  const bron = maakLiveBussen({ fetchFn, nu, opts });
  zetBron(bron);
  return {
    bron,
    // Per beeld aanroepen met de lijnen van het spel; true = de speler heeft de optie aan.
    tick(lines, t) {
      const aan = !!fetchFn && !!toegestaan() && instellingen().liveBussen !== false;
      return bron.tick(aan, lines, t);
    },
    stand: () => bron.stand(),
    // Terug naar de eigen dienst (bijvoorbeeld bij het verlaten van het spel).
    stop() { zetBron(null); },
  };
}
