// Samen spelen (#443): races en minigames TEGEN elkaar. Pure logica, zonder three.js en zonder DOM (scripts/coopwedstrijd_test.mjs).
// Alleen deze wedstrijden zijn spelers tegen spelers; verder spelen de spelers samen tegen de wereld.
//
// Opzet voor de race (kartbaan, Karten in Ulrum), host-autoritair:
//  1. Wie het spel opende drukt E bij de kassa: elke verbonden speler krijgt "Meedoen?" (J of N, 10 seconden). Wie niet antwoordt doet niet mee.
//  2. Wie ja zei krijgt een plek op de grid; AI-rijders vullen de lege plekken tot vier karts. Iedereen rijdt dezelfde kart op dezelfde baan.
//  3. De host rekent de hele race uit (tikRace, dezelfde regels als de solorace in kartrace.js) met de invoer van elke gast (stick en handrem,
//     dezelfde bytes als bij het besturen van een voertuig, coopbestuur.js); ongeveer 12 keer per seconde gaat een compacte momentopname naar
//     de gasten, die hem vloeiend tekenen (maakSpiegel). Op de wereld van de host gebeurt buiten de baan niets: de baan is een vrije zone.
//  4. Een eindstand met een beloning per plek in ieders eigen geld en loopbaan, en een rematch (J) voor wie nog een keer wil.
//  5. Valt een gast weg of stopt hij, dan rijdt zijn kart door onder de AI en krijgt hij niets; de race loopt gewoon door voor de anderen.
// De berichten zijn gewone JSON-gebeurtenissen (k 'wed' van de host, k 'wedgast' van een gast): PROTO en CODEC_VERSION blijven 2.
import { createKart, stepKart, updateProgress, collideKarts, aiInput, rankKarts, bestLap } from './kartrace.js';
import { KART_RIVALS } from './minigamelines.js';
import { angDiff, clamp } from './minigamekit.js';
import { KARTBAAN_TRACK, KARTBAAN_FRAME } from './kartbaanspoor.js';
import { invoerVan, lichaamVan } from './coopbestuur.js';
import { charInfo } from './coopplayers.js';

export const MAX_RIJDERS = 4;       // karts op de grid: mensen en AI samen
export const UITNODIGING_S = 10;    // seconden om J of N te zeggen
export const LIGHTS_AT = [1.2, 2.2, 3.2], GO_AT = 4.2; // het aftellen 3-2-1 en de start (zoals kartbaan.js)
export const NA_EERSTE_S = 20;      // de anderen krijgen zoveel tijd nadat de eerste mens finisht
export const RACE_CAP = 260;        // de tijdslimiet van de race (s)
export const OUTRO = 4.5;
export const STAND_HZ = 12;         // momentopnamen per seconde naar elke gast
export const VERTRAGING = 0.2;      // s: de gast tekent een beetje in het verleden, dan loopt het vloeiend
export const PRIJZEN = [0, 120, 80, 50, 25]; // geld per plek (index = plek), in de eigen portemonnee van wie finisht
export const WEG_SKILL = 0.9;       // een kart zonder speler rijdt als een AI-rijder
const NEUTRAAL = Object.freeze({ throttle: 0, steer: 0, drift: false });
const q = (x, d = 2) => { const m = 10 ** d; return Math.round((Number(x) || 0) * m) / m; };
const fin = (x) => Number.isFinite(x);
const tekst = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : '');

// ---------------------------------------------------------------- de baan en wie meedoet

// Wat een gast voor de kart van zijn stick en knoppen maakt: vooruit (my < 0) is gas, achteruit is rem, mx stuurt, bit 1 is de handrem (drift).
export function invoerNaarKart(r) {
  const mx = r && fin(r.mx) ? r.mx : 0, my = r && fin(r.my) ? r.my : 0;
  return { throttle: clamp(-my, -1, 1), steer: clamp(mx, -1, 1), drift: !!(((r && r.buttons) | 0) & 2) };
}

// deelnemers: [{ slot, naam, char }] in volgorde (de host eerst); draai verschuift de grid bij een rematch (iedereen eens op pole).
export function maakRace(deelnemers, { track = KARTBAAN_TRACK, draai = 0 } = {}) {
  const mensen = deelnemers.slice(0, MAX_RIJDERS);
  const karts = [];
  for (let j = 0; j < MAX_RIJDERS; j++) {
    const m = mensen[j], ai = j - mensen.length;
    const rival = m ? null : KART_RIVALS[ai % KART_RIVALS.length];
    const k = createKart(track, (j + (draai | 0)) % MAX_RIJDERS, { skill: m ? 1 : [0.93, 0.97, 1.01][ai % 3], name: m ? m.naam : rival.name });
    k.slot = m ? m.slot : null; k.mens = !!m; k.char = m ? m.char : null; k.weg = false; k.bron = j;
    if (rival) { k.shirt = rival.shirt; k.variant = rival.variant; k.age = rival.age; }
    karts.push(k);
  }
  return { track, t: 0, phase: 'grid', raceT: 0, lights: 0, karts, hits: 0, finishAt: null, outro: 0, result: null, draai: draai | 0, eersteMens: null };
}

// Een speler valt weg (verbinding kwijt of gestopt): zijn kart rijdt door onder de AI en hij krijgt geen beloning.
export function verlaat(r, slot) {
  const k = r.karts.find((x) => x.mens && x.slot === slot);
  if (!k || k.weg) return false;
  k.weg = true;
  return true;
}
export const mensen = (r) => r.karts.filter((k) => k.mens);
const actief = (r) => r.karts.filter((k) => k.mens && !k.weg && !k.finished);

// Een stap van de race. invoer(slot) geeft { throttle, steer, drift } van een mens. Geeft de gebeurtenissen van deze stap terug:
// lights, go, lap, finish, wall, boost, drift, hit, outro, klaar.
export function tikRace(r, dt, invoer) {
  const ev = [], T = r.track, ks = r.karts;
  r.t += dt;
  if (r.phase === 'grid') {
    const n = LIGHTS_AT.filter((a) => r.t >= a).length;
    if (n !== r.lights) { r.lights = n; ev.push({ type: 'lights', n }); }
    if (r.t >= GO_AT) { r.phase = 'race'; r.raceT = 0; r.lights = 4; for (const k of ks) k.lapStart = 0; ev.push({ type: 'go' }); }
  } else if (r.phase === 'race' || r.phase === 'finish') r.raceT += dt;
  const racing = r.phase === 'race' || r.phase === 'finish';
  const mee = actief(r);
  const ref = mee.length ? mee.reduce((a, k) => a + k.prog, 0) / mee.length : 0; // de AI blijft bij de groep mensen in de buurt
  const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    ks.forEach((k, j) => {
      let inp = NEUTRAAL;
      if (racing) {
        if (k.mens && !k.weg && !k.finished) inp = (invoer && invoer(k.slot)) || NEUTRAAL;
        else if (k.finished) inp = aiInput(k, T, { skill: 0.55, others: ks, dt: h });
        else {
          const gap = k.prog - ref;
          inp = aiInput(k, T, { band: gap > 45 ? 0.96 : gap < -45 ? 1.04 : 1, others: ks, dt: h, ...(k.mens ? { skill: WEG_SKILL } : null) });
        }
      }
      for (const e of stepKart(k, inp, h, T)) ev.push({ ...e, i: j });
      if (racing) {
        const lap = updateProgress(k, T, r.raceT);
        if (lap) {
          ev.push({ type: 'lap', i: j, lap: lap.lap, time: lap.time });
          if (k.finished) { ev.push({ type: 'finish', i: j }); if (k.mens && r.eersteMens == null) { r.eersteMens = j; r.finishAt = r.raceT; } }
        }
      }
    });
    const hits = collideKarts(ks);
    if (hits) { r.hits += hits; ev.push({ type: 'hit', n: hits }); }
  }
  const naarOutro = (sec) => { r.phase = 'outro'; r.outro = sec; r.result = rankKarts(ks); ev.push({ type: 'outro' }); };
  if (r.phase === 'race' && r.eersteMens != null) r.phase = 'finish';
  if (r.phase === 'finish') {
    if (!actief(r).length || r.raceT - r.finishAt > NA_EERSTE_S || r.raceT > RACE_CAP) naarOutro(OUTRO);
  } else if (r.phase === 'race') {
    if (r.raceT > RACE_CAP) naarOutro(2);
    else if (!actief(r).length) naarOutro(1); // niemand rijdt nog mee (iedereen is weg)
  } else if (r.phase === 'outro') {
    r.outro -= dt;
    if (r.outro <= 0) { r.phase = 'klaar'; ev.push({ type: 'klaar' }); }
  }
  return ev;
}

// ---------------------------------------------------------------- eindstand en beloning

// De stand aan het eind, de beste eerst: één regel per kart.
export function eindstand(r) {
  const rank = r.result || rankKarts(r.karts);
  return rank.map((k, i) => ({ plek: i + 1, naam: k.name, slot: k.mens ? k.slot : null, ai: !k.mens, weg: !!k.weg, fin: !!k.finished, tijd: k.finished ? q(k.finishT) : null, beste: bestLap(k) != null ? q(bestLap(k)) : null }));
}
// Wat één mens krijgt: wie finisht het bedrag van zijn plek en punten voor de loopbaan; wie het niet haalt alleen een paar punten; wie wegviel niets.
export function beloning(rij) {
  if (!rij || rij.ai || rij.weg) return { geld: 0, xp: 0 };
  if (!rij.fin) return { geld: 0, xp: 6 };
  return { geld: PRIJZEN[rij.plek] | 0, xp: Math.max(4, 16 - rij.plek * 2) };
}

// ---------------------------------------------------------------- berichten

export const FASEN = ['grid', 'race', 'finish', 'outro', 'klaar'];
const kartRij = (k) => [q(k.u), q(k.v), q(k.a, 3), q(k.f, 1), q(k.l, 1), q(k.yaw), q(k.prog, 1), k.lap | 0,
  (k.drift ? 1 : 0) | (k.boostT > 0 ? 2 : 0) | (k.bump > 0.1 ? 4 : 0) | (k.finished ? 8 : 0) | (k.weg ? 16 : 0), q(k.finishT), q(k.driftT)];
// Een compacte momentopname van de race (de karts in de volgorde van r.karts, de host eerst).
export function momentopname(r, n) {
  return { k: 'wed', f: 'st', n: n | 0, ph: Math.max(0, FASEN.indexOf(r.phase)), t: q(r.t), rt: q(r.raceT), l: r.lights | 0, s: r.karts.map(kartRij) };
}
export function uitEvent(u) { return { k: 'wed', f: 'uit', id: u.id, label: u.label, sec: Math.ceil(u.sec) }; }
export function startEvent(id, deeln, draai) { return { k: 'wed', f: 'start', id, draai: draai | 0, deeln: deeln.map((d) => [d.slot, d.naam, d.char || '']) }; }
export function eindEvent(rijen, jij = null, gestopt = false) {
  return { k: 'wed', f: 'eind', ...(gestopt ? { gestopt: true } : { rijen: rijen.map((x) => [x.plek, x.naam, x.slot == null ? -1 : x.slot, x.fin ? 1 : 0, x.tijd, x.beste, x.weg ? 1 : 0]) }), ...(jij ? { jij } : null) };
}

// Wat een gast leest: alles wordt gecontroleerd, onbekende soorten geven null.
export function leesWed(b) {
  if (!b || b.k !== 'wed' || typeof b.f !== 'string') return null;
  if (b.f === 'uit') return typeof b.id === 'string' && typeof b.label === 'string' ? { f: 'uit', id: tekst(b.id, 20), label: tekst(b.label, 60), sec: fin(b.sec) ? clamp(b.sec, 1, 30) : UITNODIGING_S } : null;
  if (b.f === 'af') return { f: 'af' };
  if (b.f === 'start') {
    if (typeof b.id !== 'string' || !Array.isArray(b.deeln) || b.deeln.length < 1 || b.deeln.length > MAX_RIJDERS) return null;
    const deeln = b.deeln.map((d) => (Array.isArray(d) && Number.isInteger(d[0]) && d[0] >= 0 ? { slot: d[0], naam: tekst(d[1], 24) || 'Speler', char: tekst(d[2], 12) || null } : null));
    if (deeln.some((d) => !d) || new Set(deeln.map((d) => d.slot)).size !== deeln.length) return null;
    return { f: 'start', id: tekst(b.id, 20), draai: Number.isInteger(b.draai) ? ((b.draai % MAX_RIJDERS) + MAX_RIJDERS) % MAX_RIJDERS : 0, deeln };
  }
  if (b.f === 'st') {
    if (!Number.isInteger(b.n) || !Array.isArray(b.s) || b.s.length < 1 || b.s.length > MAX_RIJDERS || !fin(b.t) || !fin(b.rt)) return null;
    const s = b.s.map((x) => (Array.isArray(x) && x.length === 11 && x.every(fin) ? x.slice() : null));
    if (s.some((x) => !x)) return null;
    return { f: 'st', n: b.n, ph: clamp(b.ph | 0, 0, FASEN.length - 1), t: b.t, rt: b.rt, l: clamp(b.l | 0, 0, 4), s };
  }
  if (b.f === 'eind') {
    const jij = b.jij && fin(b.jij.plek) ? { plek: b.jij.plek | 0, geld: Math.max(0, b.jij.geld | 0), xp: Math.max(0, b.jij.xp | 0), fin: !!b.jij.fin, weg: !!b.jij.weg } : null;
    if (b.gestopt) return { f: 'eind', gestopt: true, rijen: [], jij: null };
    if (!Array.isArray(b.rijen) || b.rijen.length > MAX_RIJDERS) return null;
    const rijen = b.rijen.map((x) => (Array.isArray(x) && x.length === 7 ? { plek: x[0] | 0, naam: tekst(x[1], 24), slot: x[2] >= 0 ? x[2] | 0 : null, ai: !(x[2] >= 0), fin: !!x[3], tijd: fin(x[4]) ? x[4] : null, beste: fin(x[5]) ? x[5] : null, weg: !!x[6] } : null));
    return rijen.some((x) => !x) ? null : { f: 'eind', gestopt: false, rijen, jij };
  }
  return null;
}
// Wat de host van een gast leest.
export function leesGast(b) {
  if (!b || b.k !== 'wedgast' || !['ja', 'nee', 'weg', 'nogmaals'].includes(b.a)) return null;
  return { a: b.a };
}

// ---------------------------------------------------------------- de uitnodiging: Meedoen? (J of N, 10 seconden)

export function maakUitnodiging(id, label, slots, sec = UITNODIGING_S) {
  return { id, label, sec, rest: sec, keuze: Object.fromEntries(slots.map((s) => [s, 'wacht'])) };
}
export function antwoord(u, slot, ja) {
  if (!u || u.keuze[slot] !== 'wacht') return false;
  u.keuze[slot] = ja ? 'ja' : 'nee';
  return true;
}
// Wie niet antwoordt doet niet mee: de kart blijft niet staan wachten.
export function tikUitnodiging(u, dt) {
  if (!u) return false;
  u.rest -= dt;
  if (u.rest <= 0) { u.rest = 0; for (const s of Object.keys(u.keuze)) if (u.keuze[s] === 'wacht') u.keuze[s] = 'nee'; }
  return klaarMetUitnodiging(u);
}
export const klaarMetUitnodiging = (u) => !!u && Object.values(u.keuze).every((k) => k !== 'wacht');
export const jaSlots = (u) => Object.keys(u.keuze).map(Number).filter((s) => u.keuze[s] === 'ja').sort((a, b) => a - b);

// De gast zelf: wat hij van de uitnodiging toont.
export const uitnodigingTekst = (u, naam = 'De ander') => `${naam} nodigt je uit voor ${u.label}. Meedoen? J = ja, N = nee (zonder antwoord kijk je mee). Nog ${Math.ceil(u.rest)} seconden.`;

// ---------------------------------------------------------------- de gast: de race die de host rekent, vloeiend getekend

// start: wat leesWed van een 'start' gaf. De karts staan in de volgorde van de host; de eigen kart komt vooraan (de camera en het scherm kijken naar karts[0]).
export function maakSpiegel(start, mijnSlot, track = KARTBAAN_TRACK) {
  const r = maakRace(start.deeln, { track, draai: start.draai });
  const mijn = Math.max(0, r.karts.findIndex((k) => k.mens && k.slot === mijnSlot));
  r.bron = r.karts.slice(); // in de volgorde van de momentopnamen
  r.karts = [r.bron[mijn], ...r.bron.filter((_, i) => i !== mijn)];
  r.karts[0].player = true;
  r.klok = 0; r.buf = []; r.laatste = -1; r.mijnSlot = mijnSlot; r.lapT0 = 0;
  return r;
}
// Een momentopname van de host (leesWed) komt binnen; een oudere dan de laatste wordt genegeerd.
export function voerIn(r, st) {
  if (!st || st.n <= r.laatste || st.s.length !== r.bron.length) return false;
  r.laatste = st.n;
  r.buf.push({ tl: r.klok, st });
  if (r.buf.length > 12) r.buf.shift();
  return true;
}
const lerp = (a, b, f) => a + (b - a) * f;
// Een stap op het scherm van de gast: zet de karts op de plek van een fractie in het verleden. Geeft gebeurtenissen: lights, go, lap, finish.
export function tikSpiegel(r, dt) {
  r.klok += dt;
  const ev = [];
  const n = r.buf.length;
  if (!n) return ev;
  const last = r.buf[n - 1];
  const nu = last.st.t + (r.klok - last.tl) - VERTRAGING; // de tijd van de host die nu getekend wordt
  const doel = Math.min(nu, last.st.t);
  let a = r.buf[0], b = r.buf[0];
  for (let i = 0; i < n; i++) { if (r.buf[i].st.t <= doel) a = r.buf[i]; if (r.buf[i].st.t >= doel) { b = r.buf[i]; break; } b = r.buf[i]; }
  const span = b.st.t - a.st.t, f = span > 1e-6 ? clamp((doel - a.st.t) / span, 0, 1) : 1;
  const was = { fase: r.phase, lights: r.lights };
  r.phase = FASEN[a.st.ph]; r.lights = a.st.l; r.t = lerp(a.st.t, b.st.t, f); r.raceT = lerp(a.st.rt, b.st.rt, f);
  r.karts.forEach((k) => {
    const A = a.st.s[k.bron], B = b.st.s[k.bron];
    const vorigeRonde = k.lap, wasFin = k.finished;
    k.u = lerp(A[0], B[0], f); k.v = lerp(A[1], B[1], f); k.a = A[2] + angDiff(B[2], A[2]) * f;
    k.f = lerp(A[3], B[3], f); k.l = lerp(A[4], B[4], f); k.yaw = lerp(A[5], B[5], f); k.prog = lerp(A[6], B[6], f);
    const vlag = B[8] | 0;
    k.lap = B[7] | 0; k.drift = vlag & 1 ? 1 : 0; k.boostT = vlag & 2 ? 0.5 : 0; k.bump = vlag & 4 ? 0.2 : 0; k.finished = !!(vlag & 8); k.weg = !!(vlag & 16);
    k.finishT = B[9]; k.driftT = B[10];
    if (k.lap > vorigeRonde && k.lap >= 1) { const tijd = r.raceT - (k.lapStart || 0); k.lapTimes.push(tijd); k.lapStart = r.raceT; if (k === r.karts[0]) ev.push({ type: 'lap', i: 0, lap: k.lap, time: tijd }); }
    if (k.finished && !wasFin && k === r.karts[0]) ev.push({ type: 'finish', i: 0 });
  });
  if (r.lights !== was.lights && r.phase === 'grid') ev.push({ type: 'lights', n: r.lights });
  if (was.fase === 'grid' && r.phase !== 'grid') { for (const k of r.karts) k.lapStart = 0; ev.push({ type: 'go' }); }
  return ev;
}

// ---------------------------------------------------------------- de host: uitnodigen, starten, bijhouden, uitbetalen

// Haak die coopnet.js zet: betaalGast(world, slot, geld, { vak, xp }) (payGuest)
const haken = { betaalGast: null };
export function zetWedHaken(h) { Object.assign(haken, h || {}); }
// Soorten wedstrijd: id -> { naam, start(world, race) -> true als het scherm en de baan klaarstaan, solo(world) }
export const WEDSTRIJDEN = new Map();
export function registreerWedstrijd(id, regel) { WEDSTRIJDEN.set(id, regel); }

export const wedStaat = (n) => n.wed || (n.wed = { u: null, r: null, id: null, deeln: [], nSt: 0, tSt: 0, opnieuw: {}, laatste: null, draai: 0, uitslag: null, nu: false });
const rosterVan = (world) => { const n = world.coopNet; return n && n.hub && n.hub.roster ? n.hub.roster.spelers : []; };
export const spelerNaam = (p) => (p && (p.naam || (charInfo(p.char) || {}).naam)) || 'Speler';
export const verbondenGasten = (world) => rosterVan(world).filter((s) => s.slot !== 0 && s.verbinding !== 'lost');
const naamVan = (world, slot) => spelerNaam(rosterVan(world).find((s) => s.slot === slot));
const meld = (world, slot, t) => { if (slot === 0) { if (world.addMessage) world.addMessage(t, 4); } else if (world.coopMeld) world.coopMeld(slot, t); };

// De host start een wedstrijd: elke verbonden gast krijgt Meedoen?. Geeft { ok, reden }; zonder gasten ok: false (dan is het een gewone solo-start).
export function wedNodigUit(world, id) {
  const n = world.coopNet, regel = WEDSTRIJDEN.get(id);
  if (!n || n.role !== 'host' || !n.hub || !regel) return { ok: false, reden: 'solo' };
  const W = wedStaat(n);
  if (W.r) return { ok: false, reden: 'bezig' };
  if (W.u) return { ok: true, reden: 'wacht' }; // de uitnodiging loopt al
  const gasten = verbondenGasten(world);
  if (!gasten.length) return { ok: false, reden: 'solo' };
  W.uitslag = null; W.nu = false;
  W.u = maakUitnodiging(id, regel.naam, gasten.map((s) => s.slot));
  for (const s of gasten) n.hub.announce(uitEvent(W.u), s.slot);
  meld(world, 0, `Uitnodiging voor ${regel.naam} verstuurd. Over ${UITNODIGING_S} seconden begint de race, of druk nog eens op E om nu te starten.`);
  return { ok: true, reden: 'uitgenodigd' };
}
// De host wil nu starten, zonder te wachten op de rest.
export function wedNuStarten(world) { const n = world.coopNet; if (!n || !n.wed || !n.wed.u) return false; n.wed.nu = true; return true; }

function begin(world, n, W) {
  const u = W.u; W.u = null; W.nu = false;
  const regel = WEDSTRIJDEN.get(u.id);
  const hostRij = rosterVan(world).find((s) => s.slot === 0);
  const gasten = jaSlots(u).filter((s) => verbondenGasten(world).some((g) => g.slot === s)).slice(0, MAX_RIJDERS - 1);
  const deeln = [{ slot: 0, naam: spelerNaam(hostRij) || 'Speler', char: (hostRij && hostRij.char) || 'tammo' }, ...gasten.map((s) => ({ slot: s, naam: naamVan(world, s), char: (rosterVan(world).find((x) => x.slot === s) || {}).char || null }))];
  for (const s of Object.keys(u.keuze)) if (!gasten.includes(+s)) n.hub.announce({ k: 'wed', f: 'af' }, +s); // wie nee zei, niet antwoordde of geen plek had
  if (deeln.length < 2) { meld(world, 0, 'Niemand doet mee: je rijdt alleen tegen de AI.'); return regel && regel.solo ? regel.solo(world) : false; }
  W.draai = W.laatste && W.laatste.id === u.id ? (W.draai + 1) % MAX_RIJDERS : 0; // een rematch: een andere pole
  W.deeln = deeln;
  const r = maakRace(deeln, { draai: W.draai });
  if (!regel || !regel.start(world, r)) { for (const g of gasten) n.hub.announce({ k: 'wed', f: 'af' }, g); return false; }
  W.r = r; W.id = u.id; W.nSt = 0; W.tSt = 1 / STAND_HZ;
  for (const g of gasten) {
    n.hub.announce(startEvent(u.id, deeln, W.draai), g);
    const l = lichaamVan(world, g); if (l) l.coopWedstrijd = true; // zijn lichaam staat stil: hij rijdt (coopglue.js en stepFigures)
  }
  return true;
}

// Elke frame bij de host (coopnet.js tickCoopNet): de uitnodiging telt af en de race begint.
export function wedHostTik(world, dt) {
  const n = world.coopNet; if (!n || n.role !== 'host' || !n.wed) return false;
  const W = n.wed;
  if (W.u) {
    for (const s of Object.keys(W.u.keuze)) if (!verbondenGasten(world).some((g) => g.slot === +s) && W.u.keuze[s] === 'wacht') W.u.keuze[s] = 'nee'; // weggevallen
    if (tikUitnodiging(W.u, dt) || W.nu) begin(world, n, W);
  }
  return true;
}

// Elke frame van de race bij de host: wie wegviel rijdt door als AI, de race wordt uitgerekend, de gasten krijgen hun momentopname.
export function wedRaceTik(world, r, dt) {
  const n = world.coopNet, W = n && n.wed;
  const verbonden = new Set(verbondenGasten(world).map((s) => s.slot));
  for (const k of r.karts) if (k.mens && k.slot > 0 && !k.weg && !verbonden.has(k.slot)) { verlaat(r, k.slot); const l = lichaamVan(world, k.slot); if (l) l.coopWedstrijd = false; }
  const ev = tikRace(r, dt, (slot) => invoerNaarKart(invoerVan(world, slot)));
  for (const k of r.karts) { // het lichaam van een gast rijdt mee, zodat de band en de tegels bij de baan blijven
    if (!k.mens || k.slot === 0) continue;
    const l = lichaamVan(world, k.slot); if (!l) continue;
    const p = KARTBAAN_FRAME.toW(k.u, k.v); l.x = p.x; l.y = p.y; l.angle = k.a; l.vx = 0; l.vy = 0;
  }
  if (n && W && W.r === r) {
    W.tSt += dt;
    if (W.tSt >= 1 / STAND_HZ) {
      W.tSt = 0;
      const m = momentopname(r, ++W.nSt);
      for (const k of r.karts) if (k.mens && k.slot > 0 && !k.weg) n.hub.announce(m, k.slot);
    }
  }
  return ev;
}

// De race is voorbij (of de host stopte): de gasten krijgen de uitslag en hun beloning. Geeft { rijen, jij } voor de host zelf (null bij stoppen).
export function wedHostEind(world, r, { gestopt = false } = {}) {
  const n = world.coopNet, W = n && n.wed;
  for (const k of r.karts) if (k.mens && k.slot > 0) { const l = lichaamVan(world, k.slot); if (l) l.coopWedstrijd = false; }
  if (!n || !W || W.r !== r) return null;
  W.r = null;
  if (gestopt) { for (const k of r.karts) if (k.mens && k.slot > 0 && !k.weg) n.hub.announce(eindEvent([], null, true), k.slot); return null; }
  const rijen = eindstand(r);
  W.laatste = { id: W.id, slots: r.karts.filter((k) => k.mens).map((k) => k.slot) };
  W.opnieuw = {};
  let jij = null;
  for (const rij of rijen) {
    if (rij.ai) continue;
    const b = beloning(rij), mijn = { plek: rij.plek, geld: b.geld, xp: b.xp, fin: rij.fin ? 1 : 0, weg: rij.weg ? 1 : 0 };
    if (rij.slot === 0) { jij = mijn; continue; }
    if (rij.weg) continue; // wie wegviel is er niet meer
    n.hub.announce(eindEvent(rijen, mijn), rij.slot);
    if ((b.geld > 0 || b.xp > 0) && haken.betaalGast) haken.betaalGast(world, rij.slot, b.geld, { vak: 'race', xp: b.xp });
  }
  W.uitslag = { rijen, jij };
  return { rijen, jij };
}

// Een bericht van een gast bij de host.
export function wedHandleGast(world, body, van) {
  const n = world.coopNet, b = leesGast(body);
  if (!n || n.role !== 'host' || !b || !(van >= 1)) return false;
  const W = wedStaat(n);
  if (b.a === 'ja' || b.a === 'nee') return !!W.u && antwoord(W.u, van, b.a === 'ja');
  if (b.a === 'weg') { if (!W.r || !verlaat(W.r, van)) return false; const l = lichaamVan(world, van); if (l) l.coopWedstrijd = false; meld(world, 0, `${naamVan(world, van)} rijdt niet meer mee.`); return true; }
  if (b.a === 'nogmaals') { if (!W.laatste || W.r || W.u || !W.laatste.slots.includes(van)) return false; W.opnieuw[van] = true; meld(world, 0, `${naamVan(world, van)} wil nog een keer.`); return true; }
  return false;
}
// De host start een rematch met dezelfde soort wedstrijd (J op de uitslag).
export function wedOpnieuw(world) {
  const n = world.coopNet, W = n && n.wed;
  if (!W || !W.laatste || W.r || W.u) return { ok: false };
  return wedNodigUit(world, W.laatste.id);
}
export const willenOpnieuw = (world) => { const n = world.coopNet; return n && n.wed ? Object.keys(n.wed.opnieuw).map(Number) : []; };

// ---------------------------------------------------------------- de gast: berichten van de host

export const gastStaat = (world) => world.coopWedGast || (world.coopWedGast = { uitn: null, spiegel: null, uitslag: null, nogmaals: false });
// Haken van het scherm van de gast (kartbaan.js): gastStart(world, start, spiegel) -> bool, gastEind(world, uitslag), gastTik
const gastHaken = { start: null, eind: null };
export function zetWedGastHaken(h) { Object.assign(gastHaken, h || {}); }

export function wedHandleHost(world, body) {
  const n = world.coopNet, b = leesWed(body);
  if (!n || n.role !== 'client' || !b) return false;
  const G = gastStaat(world);
  if (b.f === 'uit') { G.uitn = { id: b.id, label: b.label, rest: b.sec }; G.uitslag = null; return true; }
  if (b.f === 'af') { G.uitn = null; return true; }
  if (b.f === 'start') {
    G.uitn = null; G.uitslag = null; G.nogmaals = false;
    const mijn = n.session ? n.session.slot : -1;
    if (!b.deeln.some((d) => d.slot === mijn) || !gastHaken.start) return false;
    const sp = maakSpiegel(b, mijn);
    if (!gastHaken.start(world, b, sp)) return false;
    G.spiegel = sp; world.coopWedstrijd = true;
    return true;
  }
  if (b.f === 'st') return !!G.spiegel && voerIn(G.spiegel, b);
  if (b.f === 'eind') {
    const sp = G.spiegel; G.spiegel = null; world.coopWedstrijd = false;
    if (gastHaken.eind) gastHaken.eind(world, b, sp);
    G.uitslag = b.gestopt ? null : b; G.nogmaals = false;
    return true;
  }
  return false;
}
// De gast antwoordt op de uitnodiging, stopt met de race of wil nog een keer: een bericht naar de host.
export function wedGastStuur(world, a) {
  const n = world.coopNet, G = gastStaat(world);
  if (!n || n.role !== 'client' || !n.session || !leesGast({ k: 'wedgast', a })) return false;
  if (a === 'ja' || a === 'nee') { if (!G.uitn) return false; G.uitn = null; }
  if (a === 'nogmaals') { if (!G.uitslag || G.nogmaals) return false; G.nogmaals = true; }
  return n.session.sendEvent({ k: 'wedgast', a });
}
// Het scherm van de gast ruimt op (de verbinding is weg of de host stopte): geen spiegel meer, het lichaam beweegt weer.
export function wedGastReset(world) {
  const G = world.coopWedGast; world.coopWedstrijd = false;
  if (G) { G.uitn = null; G.uitslag = null; if (G.spiegel) { G.spiegel = null; if (gastHaken.eind) gastHaken.eind(world, { f: 'eind', gestopt: true, rijen: [], jij: null }, null); } }
}
