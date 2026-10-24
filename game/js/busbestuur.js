// Bediening van een lijnbus (#444, #396): deuren open en dicht (toets O), kneel (toets K), de halteknop van een
// reiziger (een verzoek om uit te stappen) en de tevredenheid van de passagiers (rustig optrekken en remmen,
// geen bumperklever, geen open deuren onderweg). Puur: geen THREE, geen DOM; busbestuurhud.js is de lijm met het
// spel. De ritlogica staat in busride.js. Tests: scripts/busbestuur_test.mjs.

export const DEUR_TIJD = 0.6;           // s van dicht naar open (en terug)
export const DEUR_STAND_MAX = 0.8;      // m/s: sneller dan dit gaan de deuren niet open
export const DEUR_SLAG = 3;             // m/s: sneller dan dit slaan open deuren dicht
export const KNEEL_TIJD = 1.1;          // s van rijhoogte naar gekneld
export const KNEEL_DIEPTE = 0.1;        // m dat de bak zakt (alleen beeld)
export const KNEEL_OPSTAAN = 2;         // m/s: de bus komt vanzelf omhoog
export const START_TEVREDEN = 82;       // 0..100
export const ACC_OK = 2.0;              // m/s^2 optrekken zonder dat iemand het merkt
export const REM_OK = 3.0;              // m/s^2 remmen zonder dat iemand het merkt
export const KLEVER_TIJD = 0.7;         // s: dichter op de voorganger dan dit is kleven

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export function makeBediening() {
  return { doorWant: false, doorOpen: 0, kneelWant: false, kneelAmt: 0, slag: false };
}

// Toets O: deuren open of dicht. Open alleen bij stilstand.
export function toggleDeuren(b, speed = 0) {
  if (b.doorWant) { b.doorWant = false; return { ok: true, open: false }; }
  if (Math.abs(speed) > DEUR_STAND_MAX) return { ok: false, why: 'rijdt' };
  b.doorWant = true;
  return { ok: true, open: true };
}

// Toets K: de bus laten knielen (lage instap) of weer omhoog. Alleen bij stilstand.
export function toggleKneel(b, speed = 0) {
  if (b.kneelWant) { b.kneelWant = false; return { ok: true, kneel: false }; }
  if (Math.abs(speed) > DEUR_STAND_MAX) return { ok: false, why: 'rijdt' };
  b.kneelWant = true;
  return { ok: true, kneel: true };
}

// Eén stap. Geeft gebeurtenissen: { type: 'deurslag' } als open deuren onderweg dichtslaan.
export function stepBediening(b, dt, speed = 0) {
  const ev = [];
  const sp = Math.abs(speed);
  if (b.doorWant && sp > DEUR_SLAG) {
    b.doorWant = false;
    if (b.doorOpen > 0.15) ev.push({ type: 'deurslag' });
  }
  if (b.kneelWant && sp > KNEEL_OPSTAAN) b.kneelWant = false;
  const k = dt / DEUR_TIJD;
  b.doorOpen = clamp(b.doorOpen + (b.doorWant ? k : -k * (sp > DEUR_SLAG ? 3 : 1)), 0, 1);
  b.kneelAmt = clamp(b.kneelAmt + (b.kneelWant ? 1 : -1) * dt / KNEEL_TIJD, 0, 1);
  return ev;
}

// Staan de deuren zo ver open dat reizigers kunnen in- en uitstappen?
export const deurenOpen = (b) => !!b && b.doorOpen > 0.5;
export const deurenDicht = (b) => !b || b.doorOpen < 0.05;
export const kneeldiepte = (b) => (b ? b.kneelAmt * KNEEL_DIEPTE : 0);

// De dichtstbijzijnde voorganger op de eigen rijbaan: { gap, speed } of null. bus = { x, y, angle, speed,
// model: { len } }; others = voertuigen { x, y, speed, model: { len } } (de bus zelf mag erbij zitten).
// gap is de ruimte tussen de bumpers in meters.
export function voorligger(bus, others, maxD = 40) {
  const c = Math.cos(bus.angle || 0), s = Math.sin(bus.angle || 0);
  const hl = ((bus.model && bus.model.len) || 11) / 2;
  let best = null;
  for (const o of others) {
    if (o === bus) continue;
    const dx = o.x - bus.x, dy = o.y - bus.y;
    if (Math.abs(dx) > maxD + 10 || Math.abs(dy) > maxD + 10) continue;
    const fwd = dx * c + dy * s, lat = -dx * s + dy * c;
    const ohl = ((o.model && o.model.len) || 4.5) / 2;
    const gap = fwd - hl - ohl;
    if (fwd <= 0 || gap > maxD || Math.abs(lat) > 1.8) continue;
    if (!best || gap < best.gap) best = { gap: Math.max(0, gap), speed: (o.speed || 0) };
  }
  return best;
}

// Kleeft de bus? Alleen bij echte vaart: tijdsafstand tot de voorganger onder KLEVER_TIJD.
export function kleeft(speed, voor) {
  const sp = Math.abs(speed);
  return !!voor && sp > 5 && voor.gap < sp * KLEVER_TIJD;
}

// Tevredenheid van de reizigers, 0..100. st = { sat, kleef, prev }; input per stap: speed, dt, tailgate, onBoard.
// Optrekken en remmen boven de drempel kost punten, kleven ook; rustig rijden herstelt langzaam.
export function makeTevredenheid(start = START_TEVREDEN) {
  return { sat: start, kleef: 0, prev: null, meldKlever: false };
}

export function stepTevredenheid(t, { speed = 0, dt = 0, tailgate = false, onBoard = 1 } = {}) {
  const ev = [];
  const sp = Math.abs(speed);
  if (dt <= 0) return ev;
  const acc = t.prev == null ? 0 : (sp - t.prev) / dt;
  t.prev = sp;
  if (onBoard <= 0) { t.sat = Math.min(100, t.sat + 0.2 * dt); return ev; }
  let loss = 0;
  if (acc > ACC_OK) loss += (acc - ACC_OK) * 1.2 * dt;
  if (acc < -REM_OK) loss += (-acc - REM_OK) * 1.0 * dt;
  if (tailgate) {
    t.kleef += dt;
    if (t.kleef > 1.5) loss += 2 * dt;
    if (t.kleef > 1.5 && !t.meldKlever) { t.meldKlever = true; ev.push({ type: 'klever' }); }
  } else { t.kleef = 0; t.meldKlever = false; }
  if (loss > 0) t.sat = Math.max(0, t.sat - loss);
  else if (sp > 2) t.sat = Math.min(100, t.sat + 0.4 * dt);
  return ev;
}

// Directe straf of beloning (gemiste halte, deurslag, een knielende bus): bonus > 0 of straf < 0.
export function stoot(t, delta) { t.sat = clamp(t.sat + delta, 0, 100); }

export function waardering(sat) { return clamp(Math.round(1 + 4 * sat / 100), 1, 5); }

export function tevredenWoord(sat) {
  return sat >= 85 ? 'Zeer tevreden' : sat >= 65 ? 'Tevreden' : sat >= 40 ? 'Gemiddeld' : 'Ontevreden';
}

// HUD-gegevens voor de volgende halte: afstand, verwachte aankomst in seconden en de vertraging t.o.v. de
// dienstregeling (s, > 0 is te laat; null zonder dienstregeling). dist in m; ride mag null zijn.
export function haltePrognose({ dist = 0, speed = 0, ride = null } = {}) {
  const sp = Math.max(Math.abs(speed), 4);
  const eta = Math.max(0, dist / Math.min(sp, 14));
  let vertraging = null;
  if (ride && ride.phase === 'drive') {
    const row = ride.table[ride.next];
    if (row) vertraging = Math.round(ride.t + eta - row.arrive);
  }
  return { eta: Math.round(eta), vertraging };
}

export function vertragingTekst(v) {
  if (v == null) return '';
  if (Math.abs(v) <= 10) return 'op tijd';
  return v > 0 ? `${v} s te laat` : `${-v} s te vroeg`;
}

// Loopbaanpunten voor een rit (#381, vak bus): op tijd en tevreden levert meer op.
export function ritPunten({ share = 1, sat = 80, haltes = 0 } = {}) {
  return Math.max(0, Math.round(haltes * 0.5 + share * 3 + sat / 25));
}
