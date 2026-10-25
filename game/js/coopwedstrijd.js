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
//  6. Iedereen kan een wedstrijd starten (#452): een gast drukt E bij het startpunt, dat is een verzoek ({ k 'wedgast', a 'start', id }) aan de host.
//     De host start hem als hij kan (geen opdracht, bijbaan of filmpje, geen politie), alle anderen krijgen Meedoen? (J of N, geen antwoord is nee,
//     geen late instap) en de starter doet mee. De host is alleen de plek waar de wereld draait: ook hij krijgt Meedoen? en mag N zeggen. Dan loopt de
//     wedstrijd op de achtergrond mee zonder kart of figuur van de host (de AI vult op), ook als de host een menu of de kaart open heeft.
//     Valt de starter weg, dan loopt de wedstrijd door voor de anderen; een verzoek dat niet kan krijgt een duidelijke melding bij de gast.
// De berichten zijn gewone JSON-gebeurtenissen (k 'wed' van de host, k 'wedgast' van een gast): PROTO en CODEC_VERSION blijven 2.
import { playerBusy } from './busy.js';
import { createKart, stepKart, updateProgress, collideKarts, aiInput, rankKarts, bestLap, LAPS } from './kartrace.js';
import { KART_RIVALS } from './minigamelines.js';
import { angDiff, clamp } from './minigamekit.js';
import { KARTBAAN_TRACK, KARTBAAN_FRAME } from './kartbaanspoor.js';
import { invoerVan, lichaamVan } from './coopbestuur.js';
import { charInfo } from './coopplayers.js';
import { maakScore, meldBaan, verlaatScore, tikScore, uitslagScore, beloningScore, standScore, standEvent, leesStand, winnaars } from './coopwedstrijdscore.js';
import { maakTijd, meldTijd, verlaatTijd, tikTijd, uitslagTijd, beloningTijd, standTijd, standEventTijd, volgordeTijd } from './coopwedstrijdtijd.js';
import { maakPunt, meldPunt, verlaatPunt, tikPunt, uitslagPunt, beloningPunt, standPunt, standEventPunt, volgordePunt, MAX_BEURTEN_PUNT, MAX_PUNT } from './coopwedstrijdpunt.js';
import { maakBaan, meldBaan as meldBaanVoortgang, verlaatBaan, tikBaan, uitslagBaan, beloningBaan, standBaan, standEventBaan, volgordeBaan, MAX_CP_BAAN } from './coopwedstrijdbaan.js';

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
// Een score-wedstrijd is een golfronde (slagen per baan, coopwedstrijdscore.js), een poging op tijd (klimtoren, coopwedstrijdtijd.js),
// punten met beurten (skatepark, hengelen, coopwedstrijdpunt.js) of een baanwedstrijd (bruggenrace, regatta, coopwedstrijdbaan.js):
// zelfde berichten, andere regels.
const SCORE = { verlaat: verlaatScore, tik: tikScore, event: standEvent, uitslag: uitslagScore, beloning: beloningScore, rijen: standScore };
const TIJD = { verlaat: verlaatTijd, tik: tikTijd, event: standEventTijd, uitslag: uitslagTijd, beloning: beloningTijd, rijen: standTijd };
const PUNT = { verlaat: verlaatPunt, tik: tikPunt, event: standEventPunt, uitslag: uitslagPunt, beloning: beloningPunt, rijen: standPunt };
const BAAN = { verlaat: verlaatBaan, tik: tikBaan, event: standEventBaan, uitslag: uitslagBaan, beloning: beloningBaan, rijen: standBaan };
const soortVan = (sc) => (sc.baan ? BAAN : sc.tijd ? TIJD : sc.punt ? PUNT : SCORE);
const NEUTRAAL = Object.freeze({ throttle: 0, steer: 0, drift: false });
const q = (x, d = 2) => { const m = 10 ** d; return Math.round((Number(x) || 0) * m) / m; };
const fin = (x) => Number.isFinite(x);
const tekst = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f<>]/g, '').slice(0, n) : '');

// De meldingen bij een verzoek van een gast (#452)
export const WED_TEKST = {
  bezig: 'Er loopt al een wedstrijd. Wacht of doe mee.',
  uitnodiging: 'Er loopt al een uitnodiging. Wacht of doe mee.',
  opdracht: 'Er loopt al een opdracht. Wacht of doe mee.',
  bijbaan: 'Er loopt al een bijbaan. Wacht of doe mee.',
  activiteit: 'Er loopt al een activiteit. Wacht of doe mee.',
  filmpje: 'Er loopt een filmpje. Probeer het zo nog eens.',
  politie: 'Er is politie achter jullie aan. Eerst die kwijt.',
  wacht: 'Het spel is even bezig. Probeer het zo nog eens.',
  onbekend: 'Deze wedstrijd doe je alleen in je eigen spel.',
  plek: 'Ga bij het startpunt staan en druk op E.',
  vraagt: (label) => `Je vraagt ${label} te starten.`,
  hostMee: (naam, label) => `${naam} start ${label}. Doe je mee? J = ja, N = nee.`,
  hostNee: 'Je doet niet mee: de wedstrijd loopt zonder jou door.',
  weg: (naam) => `${naam} is weg: de wedstrijd gaat niet door.`,
  vol: 'De wedstrijd zit vol. Je doet de volgende keer mee.',
  tekort: (label, min) => `${label} heeft minstens ${min} spelers nodig: de wedstrijd gaat niet door.`,
};
// Waarom de host een verzoek van een gast nu niet kan uitvoeren, of null. Puur: alleen wat de wereld van de host weet (busy.js).
export function verzoekBlok(world) {
  if (!world) return WED_TEKST.wacht;
  if (world.wanted > 0) return WED_TEKST.politie;
  if (playerBusy(world, ['cinematic']).busy) return WED_TEKST.filmpje;
  if (playerBusy(world, ['mission', 'activeRace', 'missionPhase', 'race']).busy) return WED_TEKST.opdracht;
  if (playerBusy(world, ['sideJob']).busy) return WED_TEKST.bijbaan;
  if (playerBusy(world, ['challenge', 'padel', 'activityGame', 'activity', 'heliRun', 'pigeon', 'train']).busy) return WED_TEKST.activiteit;
  if (playerBusy(world, ['respawn']).busy) return WED_TEKST.wacht;
  return null;
}

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
export function verlaat(r, slot) { // r.uit (optioneel): waar het lichaam van wie wegvalt of klaar is weer staat (kartbaan.js: bij de kassa)
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

// De tussenstand voor het bord, de beste eerst: één regel per kart, met zijn ronde en (als hij klaar is) zijn finishtijd.
// Dezelfde volgorde als de uitslag (rankKarts), zodat het bord tijdens de race en de eindstand hetzelfde lezen. Puur (kartbaan.js, #443).
export function raceStand(r) {
  return rankKarts(r.karts).map((k, i) => ({
    plek: i + 1, naam: k.name, ai: !k.mens, eigen: !!k.player, weg: !!k.weg, klaar: !!k.finished,
    ronde: k.finished ? LAPS : clamp(Math.floor((k.prog || 0) / r.track.length) + 1, 1, LAPS),
    tijd: k.finished && fin(k.finishT) ? q(k.finishT) : null,
    beste: bestLap(k) != null ? q(bestLap(k)) : null,
  }));
}

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
export function uitEvent(u) { return { k: 'wed', f: 'uit', id: u.id, label: u.label, sec: Math.ceil(u.sec), ...(u.wie ? { wie: tekst(u.wie, 24) } : null) }; }
// extra (een score-wedstrijd): { banen: [par], v: de plek waar het gespeeld wordt }
export function startEvent(id, deeln, draai, extra = null) { return { k: 'wed', f: 'start', id, draai: draai | 0, deeln: deeln.map((d) => [d.slot, d.naam, d.char || '']), ...(extra || null) }; }
export function eindEvent(rijen, jij = null, gestopt = false) {
  return { k: 'wed', f: 'eind', ...(gestopt ? { gestopt: true } : { rijen: rijen.map((x) => [x.plek, x.naam, x.slot == null ? -1 : x.slot, x.fin ? 1 : 0, x.tijd, x.beste, x.weg ? 1 : 0, ...(x.tekst ? [String(x.tekst).slice(0, 40)] : [])]) }), ...(jij ? { jij } : null) };
}

// Wat een gast leest: alles wordt gecontroleerd, onbekende soorten geven null.
export function leesWed(b) {
  if (!b || b.k !== 'wed' || typeof b.f !== 'string') return null;
  if (b.f === 'uit') return typeof b.id === 'string' && typeof b.label === 'string' ? { f: 'uit', id: tekst(b.id, 20), label: tekst(b.label, 60), sec: fin(b.sec) ? clamp(b.sec, 1, 30) : UITNODIGING_S, wie: tekst(b.wie, 24) } : null;
  if (b.f === 'af') return { f: 'af' };
  if (b.f === 'start') {
    if (typeof b.id !== 'string' || !Array.isArray(b.deeln) || b.deeln.length < 1 || b.deeln.length > MAX_RIJDERS) return null;
    const deeln = b.deeln.map((d) => (Array.isArray(d) && Number.isInteger(d[0]) && d[0] >= 0 ? { slot: d[0], naam: tekst(d[1], 24) || 'Speler', char: tekst(d[2], 12) || null } : null));
    if (deeln.some((d) => !d) || new Set(deeln.map((d) => d.slot)).size !== deeln.length) return null;
    const banen = Array.isArray(b.banen) && b.banen.length >= 1 && b.banen.length <= 18 && b.banen.every((p) => Number.isInteger(p) && p >= 2 && p <= 6) ? b.banen.slice() : null;
    return { f: 'start', id: tekst(b.id, 20), draai: Number.isInteger(b.draai) ? ((b.draai % MAX_RIJDERS) + MAX_RIJDERS) % MAX_RIJDERS : 0, deeln, ...(banen ? { banen, v: tekst(b.v, 40) || null } : b.live === 1 || b.live === true ? { live: true, v: tekst(b.v, 40) || null } : b.tijd === 1 || b.tijd === true ? { tijd: true, v: tekst(b.v, 40) || null } : b.punt === 1 || b.punt === true ? { punt: true, beurten: clamp(Number.isInteger(b.beurten) ? b.beurten : 1, 1, MAX_BEURTEN_PUNT), v: tekst(b.v, 40) || null } : b.baan === 1 || b.baan === true ? { baan: true, cps: clamp(Number.isInteger(b.cps) ? b.cps : 11, 1, MAX_CP_BAAN), v: tekst(b.v, 40) || null } : null) };
  }
  if (b.f === 'st') {
    if (!Number.isInteger(b.n) || !Array.isArray(b.s) || b.s.length < 1 || b.s.length > MAX_RIJDERS || !fin(b.t) || !fin(b.rt)) return null;
    const s = b.s.map((x) => (Array.isArray(x) && x.length === 11 && x.every(fin) ? x.slice() : null));
    if (s.some((x) => !x)) return null;
    return { f: 'st', n: b.n, ph: clamp(b.ph | 0, 0, FASEN.length - 1), t: b.t, rt: b.rt, l: clamp(b.l | 0, 0, 4), s };
  }
  if (b.f === 'lv') return Number.isInteger(b.n) && Array.isArray(b.d) && b.d.length <= 64 && b.d.every(fin) ? { f: 'lv', n: b.n, d: b.d.slice(), x: tekst(b.x, 60) } : null;
  if (b.f === 'sc') return leesStand(b);
  if (b.f === 'eind') {
    const jij = b.jij && fin(b.jij.plek) ? { plek: b.jij.plek | 0, geld: Math.max(0, b.jij.geld | 0), xp: Math.max(0, b.jij.xp | 0), fin: !!b.jij.fin, weg: !!b.jij.weg } : null;
    if (b.gestopt) return { f: 'eind', gestopt: true, rijen: [], jij: null };
    if (!Array.isArray(b.rijen) || b.rijen.length > MAX_RIJDERS) return null;
    const rijen = b.rijen.map((x) => (Array.isArray(x) && (x.length === 7 || x.length === 8) ? { plek: x[0] | 0, naam: tekst(x[1], 24), slot: x[2] >= 0 ? x[2] | 0 : null, ai: !(x[2] >= 0), fin: !!x[3], tijd: fin(x[4]) ? x[4] : null, beste: fin(x[5]) ? x[5] : null, weg: !!x[6], ...(x.length === 8 ? { tekst: tekst(x[7], 40) } : null) } : null));
    return rijen.some((x) => !x) ? null : { f: 'eind', gestopt: false, rijen, jij };
  }
  return null;
}
// Wat de host van een gast leest.
export function leesGast(b) {
  if (!b || b.k !== 'wedgast' || !['ja', 'nee', 'weg', 'nogmaals', 'score', 'tijd', 'punt', 'start'].includes(b.a)) return null;
  if (b.a === 'start') return typeof b.id === 'string' && b.id.length >= 1 && b.id.length <= 20 ? { a: 'start', id: b.id } : null;
  if (b.a === 'tijd') return fin(b.t) && b.t >= 0 && b.t < 3600 && fin(b.h) && b.h >= 0 && b.h < 100 ? { a: 'tijd', tijd: b.t, hoogte: b.h, boven: !!b.o } : null;
  if (b.a === 'score') return Number.isInteger(b.b) && b.b >= 0 && b.b < 18 && Number.isInteger(b.s) && b.s >= 1 && b.s <= 12 ? { a: 'score', baan: b.b, slagen: b.s } : null;
  if (b.a === 'punt') return Number.isInteger(b.b) && b.b >= 0 && b.b < MAX_BEURTEN_PUNT && Number.isInteger(b.p) && b.p >= 0 && b.p <= MAX_PUNT ? { a: 'punt', beurt: b.b, punten: b.p } : null;
  return { a: b.a };
}

// ---------------------------------------------------------------- de uitnodiging: Meedoen? (J of N, 10 seconden)

// opties (een verzoek van een gast, #452): starter = de gast die erom vroeg (doet mee, hoeft niet te antwoorden), wie = zijn naam,
// minimaal = zoveel seconden blijft de uitnodiging minstens staan (de host moet het kunnen lezen).
export function maakUitnodiging(id, label, slots, sec = UITNODIGING_S, { starter = null, wie = '', minimaal = 0 } = {}) {
  const keuze = Object.fromEntries(slots.map((s) => [s, s === starter ? 'ja' : 'wacht']));
  return { id, label, sec, rest: sec, keuze, starter, wie: tekst(wie, 24), minimaal, verstreken: 0 };
}
export function antwoord(u, slot, ja) {
  if (!u || u.keuze[slot] !== 'wacht') return false;
  u.keuze[slot] = ja ? 'ja' : 'nee';
  return true;
}
// Wie niet antwoordt doet niet mee: de kart blijft niet staan wachten.
export function tikUitnodiging(u, dt) {
  if (!u) return false;
  u.rest -= dt; u.verstreken = (u.verstreken || 0) + dt;
  if (u.rest <= 0) { u.rest = 0; for (const s of Object.keys(u.keuze)) if (u.keuze[s] === 'wacht') u.keuze[s] = 'nee'; }
  return klaarMetUitnodiging(u) && (u.rest <= 0 || (u.verstreken || 0) >= (u.minimaal || 0));
}
export const klaarMetUitnodiging = (u) => !!u && Object.values(u.keuze).every((k) => k !== 'wacht');
export const jaSlots = (u) => Object.keys(u.keuze).map(Number).filter((s) => u.keuze[s] === 'ja').sort((a, b) => a - b);

// De gast zelf: wat hij van de uitnodiging toont.
export const uitnodigingTekst = (u, naam = 'De ander') => `${u.wie || naam} nodigt je uit voor ${u.label}. Meedoen? J = ja, N = nee (zonder antwoord kijk je mee). Nog ${Math.ceil(u.rest)} seconden.`;

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
export const VOORSPEL_GAIN = 5;   // per seconde: hoe snel de eigen kart naar de stand van de host schuift
export const VOORSPEL_LEAD = 0.1; // s: de host staat zoveel voor op zijn laatste momentopname (zijn stuurtijd en het pad terug)
export const VOORSPEL_SNAP = 8;   // m: verder weg dan dit (een botsing, een sprong) springt de eigen kart naar de host
const KOPIE = ['u', 'v', 'a', 'f', 'l', 'yaw', 'drift', 'driftT', 'boostT', 'bump', 'grass', 'off', 'idx'];
// Een stap op het scherm van de gast: zet de karts op de plek van een fractie in het verleden. Geeft gebeurtenissen: lights, go, lap, finish.
// invoerEigen() (optioneel): de eigen toetsen, { throttle, steer, drift }. Met die invoer rijdt de eigen kart meteen mee op het scherm (dezelfde
// regels als bij de host, stepKart) en schuift zacht naar de stand die de host rekent: zo voelt het sturen direct, ook bij een trage verbinding.
export function tikSpiegel(r, dt, invoerEigen = null) {
  r.klok += dt;
  const ev = [];
  const n = r.buf.length;
  if (!n) return ev;
  const last = r.buf[n - 1];
  const nu = last.st.t + (r.klok - last.tl) - VERTRAGING; // de tijd van de host die nu getekend wordt, naar de laatste momentopname geschat
  // de weergavetijd loopt gelijkmatig door en schuift zacht naar die schatting: een late momentopname (jitter) zet de karts nooit even terug
  if (r.weergave == null || Math.abs(nu - r.weergave) > 1) r.weergave = nu;
  else { r.weergave += dt; r.weergave += (nu - r.weergave) * Math.min(1, dt * 3); }
  const doel = Math.min(r.weergave, last.st.t);
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
  const me = r.karts[0];
  if (invoerEigen && r.phase === 'race' && !me.finished && !me.weg) {
    const A = last.st.s[me.bron];
    if (!r.sim) { r.sim = createKart(r.track, 0, { name: me.name }); for (const p of KOPIE) r.sim[p] = me[p]; } // de eerste keer: begin bij wat de host laat zien
    const sim = r.sim;
    for (const e of stepKart(sim, invoerEigen() || NEUTRAAL, dt, r.track)) if (e.type === 'wall' || e.type === 'boost') ev.push({ ...e, i: 0 });
    const lead = Math.min(0.5, r.klok - last.tl + VOORSPEL_LEAD), // hooguit een halve seconde vooruit: staat de host stil (pauze), dan rijdt de eigen kart niet weg
       ca = Math.cos(A[2]), sa = Math.sin(A[2]);
    const doelU = A[0] + (ca * A[3] - sa * A[4]) * lead, doelV = A[1] + (sa * A[3] + ca * A[4]) * lead;
    if (Math.hypot(doelU - sim.u, doelV - sim.v) > VOORSPEL_SNAP) { sim.u = doelU; sim.v = doelV; sim.a = A[2] + A[5] * lead; sim.f = A[3]; sim.l = A[4]; sim.yaw = A[5]; }
    else {
      const g = 1 - Math.exp(-dt * VOORSPEL_GAIN);
      sim.u += (doelU - sim.u) * g; sim.v += (doelV - sim.v) * g; sim.a += angDiff(A[2] + A[5] * lead, sim.a) * g;
      sim.f += (A[3] - sim.f) * g; sim.l += (A[4] - sim.l) * g; sim.yaw += (A[5] - sim.yaw) * g;
    }
    for (const p of KOPIE) me[p] = sim[p];
  } else r.sim = null; // de host rijdt deze kart (nog niet gestart, gefinisht of weggevallen): terug naar de weergave van de host
  if (r.lights !== was.lights && r.phase === 'grid') ev.push({ type: 'lights', n: r.lights });
  if (was.fase === 'grid' && r.phase !== 'grid') { for (const k of r.karts) k.lapStart = 0; ev.push({ type: 'go' }); }
  return ev;
}

// ---------------------------------------------------------------- de host: uitnodigen, starten, bijhouden, uitbetalen

// Haak die coopnet.js zet: betaalGast(world, slot, geld, { vak, xp }) (payGuest)
const haken = { betaalGast: null };
export function zetWedHaken(h) { Object.assign(haken, h || {}); }
// Soorten wedstrijd: id -> regel.
//  Een race (de standaard): { naam, start(world, race) -> bool, solo(world) }; de host rekent hem uit en tekent hem voor de gasten.
//  Een score-wedstrijd (soort 'score', golf): { naam, soort: 'score', banen(world) -> [{ par }], start(world, score) -> bool, plek(world) -> { x, y },
//  extra(world) -> { v }, eind(world, uitslag | null), solo(world) }; iedereen speelt zijn eigen ronde op zijn eigen scherm en meldt zijn slagen.
//  Een poging op tijd (soort 'tijd', klimtoren): { naam, soort: 'tijd', vak, opties(world) -> { naEerste, cap }, start(world, score) -> bool, plek(world), extra(world), eind(world, uitslag | null), solo(world) };
//  iedereen doet zijn eigen poging op zijn eigen scherm en meldt tijd, hoogte en of hij boven kwam.
//  Punten met beurten (soort 'punt', skatepark en hengelen): { naam, soort: 'punt', vak, opties(world) -> { beurten, naEerste, cap, format },
//  start(world, score) -> bool, plek(world), extra(world), eind(world, uitslag | null), solo(world) }; iedereen speelt zijn eigen beurt(en)
//  op zijn eigen scherm en meldt de punten; de hoogste som wint.
//  Een live wedstrijd (soort 'live', padel): { naam, soort: 'live', live: { tik, snap, verlaat, meedoen, uitslag, beloning, vak }, maak(deeln) -> sim,
//  start(world, sim) -> bool, plek(world), extra(world) -> { v }, eind(world, uitslag | null), solo(world) }; de host rekent alles uit met de invoer van
//  elke speler (wedLiveTik) en stuurt momentopnamen (k 'wed', f 'lv'); een gast tekent een spiegel (haak spiegel en voerIn) en stuurt alleen zijn invoer.
//  Een baanwedstrijd (soort 'baan', bruggenrace en regatta, #443): { naam, soort: 'baan', vak, opties(world) -> { cps, cpNaam, cap }, start(world, sc) -> bool,
//  plek(world), extra(world) -> { v }, weg(world, sc, slot), eind(world, uitslag | null), solo(world) }; iedereen vaart of rijdt tegelijk op zijn eigen
//  voertuig in de wereld van de host over dezelfde baan; de host meldt per deelnemer de voortgang (wedHostBaan) en de gast rijdt gewoon mee.
export const WEDSTRIJDEN = new Map();
export function registreerWedstrijd(id, regel) { WEDSTRIJDEN.set(id, regel); }

export const wedStaat = (n) => n.wed || (n.wed = { u: null, r: null, sc: null, lv: null, id: null, deeln: [], nSt: 0, tSt: 0, opnieuw: {}, laatste: null, draai: 0, uitslag: null, nu: false });
const rosterVan = (world) => { const n = world.coopNet; return n && n.hub && n.hub.roster ? n.hub.roster.spelers : []; };
export const spelerNaam = (p) => (p && (p.naam || (charInfo(p.char) || {}).naam)) || 'Speler';
export const verbondenGasten = (world) => rosterVan(world).filter((s) => s.slot !== 0 && s.verbinding !== 'lost');
const naamVan = (world, slot) => spelerNaam(rosterVan(world).find((s) => s.slot === slot));
const meld = (world, slot, t) => { if (slot === 0) { if (world.addMessage) world.addMessage(t, 4); } else if (world.coopMeld) world.coopMeld(slot, t); };

// De host start een wedstrijd: elke verbonden gast krijgt Meedoen?. Geeft { ok, reden }; zonder gasten ok: false (dan is het een gewone solo-start).
// opties.starter (#452): de gast die erom vroeg. Hij doet mee; alle anderen, ook de host, krijgen Meedoen?.
export function wedNodigUit(world, id, { starter = null } = {}) {
  const n = world.coopNet, regel = WEDSTRIJDEN.get(id);
  if (!n || n.role !== 'host' || !n.hub || !regel) return { ok: false, reden: 'solo' };
  const W = wedStaat(n);
  if (W.r || W.sc || W.lv) return { ok: false, reden: 'bezig' };
  if (W.u) return { ok: true, reden: 'wacht' }; // de uitnodiging loopt al
  const gasten = verbondenGasten(world);
  if (!gasten.length) return { ok: false, reden: 'solo' };
  W.uitslag = null; W.nu = false;
  if (starter != null) {
    if (!gasten.some((s) => s.slot === starter)) return { ok: false, reden: 'weg' };
    const wie = naamVan(world, starter);
    W.u = maakUitnodiging(id, regel.naam, [0, ...gasten.map((s) => s.slot)], UITNODIGING_S, { starter, wie });
    for (const s of gasten) if (s.slot !== starter) n.hub.announce(uitEvent(W.u), s.slot);
    meld(world, 0, WED_TEKST.hostMee(wie, regel.naam));
    return { ok: true, reden: 'uitgenodigd' };
  }
  W.u = maakUitnodiging(id, regel.naam, gasten.map((s) => s.slot));
  for (const s of gasten) n.hub.announce(uitEvent(W.u), s.slot);
  meld(world, 0, `Uitnodiging voor ${regel.naam} verstuurd. Over ${UITNODIGING_S} seconden begint het, of druk nog eens op E om nu te starten.`);
  return { ok: true, reden: 'uitgenodigd' };
}
// De host wil nu starten, zonder te wachten op de rest.
export function wedNuStarten(world) {
  const n = world.coopNet; if (!n || !n.wed || !n.wed.u) return false;
  if (n.wed.u.keuze[0] === 'wacht') n.wed.u.keuze[0] = 'ja'; // E bij het startpunt is zelf meedoen
  n.wed.nu = true; return true;
}
// De host antwoordt op Meedoen? bij het verzoek van een gast (J of N). Geen antwoord is nee: dan loopt de wedstrijd zonder de host.
export function wedHostAntwoord(world, ja) {
  const n = world.coopNet, u = n && n.role === 'host' && n.wed && n.wed.u;
  if (!u || u.keuze[0] !== 'wacht' || !antwoord(u, 0, ja)) return false;
  if (!ja) meld(world, 0, WED_TEKST.hostNee);
  return true;
}
// Een gast vraagt de host een wedstrijd te starten (E bij het startpunt). Geeft { ok, reden }; bij een weigering krijgt de gast een melding.
export function wedVraagStart(world, van, id, { plekControle = true } = {}) {
  const n = world.coopNet, regel = WEDSTRIJDEN.get(id);
  if (!n || n.role !== 'host' || !n.hub || !(van >= 1)) return { ok: false, reden: 'geen sessie' };
  const nee = (t) => { meld(world, van, t); return { ok: false, reden: t }; };
  if (!regel) return nee(WED_TEKST.onbekend);
  if (!verbondenGasten(world).some((s) => s.slot === van)) return { ok: false, reden: 'weg' };
  const W = wedStaat(n);
  if (W.r || W.sc || W.lv) return nee(WED_TEKST.bezig);
  if (W.u) return nee(WED_TEKST.uitnodiging);
  if (n.bijbaan && n.bijbaan.id) return nee(WED_TEKST.bijbaan);
  const blok = verzoekBlok(world);
  if (blok) return nee(blok);
  if (plekControle && regel.gastPlek) { const l = lichaamVan(world, van); if (!l || !regel.gastPlek(world, l.x, l.y)) return nee(WED_TEKST.plek); }
  const blok2 = regel.blok ? regel.blok(world) : null; // de regel van de wedstrijd zelf (padel: de baan is nog bezet), na de plek van de gast
  if (blok2) return nee(blok2);
  return wedNodigUit(world, id, { starter: van });
}

function begin(world, n, W) {
  const u = W.u; W.u = null; W.nu = false;
  const regel = WEDSTRIJDEN.get(u.id);
  const hostRij = rosterVan(world).find((s) => s.slot === 0);
  const hostMee = u.keuze[0] === undefined || u.keuze[0] === 'ja'; // een wedstrijd zonder de host (#452): de wereld draait er alleen
  const hostloos = !hostMee;
  const gasten = jaSlots(u).filter((s) => s > 0 && verbondenGasten(world).some((g) => g.slot === s)).slice(0, hostMee ? MAX_RIJDERS - 1 : MAX_RIJDERS);
  const deeln = [...(hostMee ? [{ slot: 0, naam: spelerNaam(hostRij) || 'Speler', char: (hostRij && hostRij.char) || 'tammo' }] : []), ...gasten.map((s) => ({ slot: s, naam: naamVan(world, s), char: (rosterVan(world).find((x) => x.slot === s) || {}).char || null }))];
  const af = () => { for (const g of gasten) n.hub.announce({ k: 'wed', f: 'af' }, g); return false; };
  // wie ja zei maar geen plek had (de grid is vol): hij hoort waarom hij niet meedoet (#443)
  for (const s of Object.keys(u.keuze)) if (+s > 0 && !gasten.includes(+s)) { n.hub.announce({ k: 'wed', f: 'af' }, +s); if (u.keuze[s] === 'ja') meld(world, +s, WED_TEKST.vol); } // wie nee zei, niet antwoordde of geen plek had
  if (u.starter != null && deeln.length < (hostMee ? 2 : 1)) { af(); meld(world, 0, WED_TEKST.weg(u.wie || 'De starter')); return false; } // de starter viel weg voor het begin
  if (u.starter != null && regel && deeln.length < (regel.minSpelers || 1)) { af(); meld(world, u.starter, WED_TEKST.tekort(u.label, regel.minSpelers)); meld(world, 0, WED_TEKST.tekort(u.label, regel.minSpelers)); return false; } // padel met één speler is geen wedstrijd
  if (deeln.length < 2 && hostMee) { meld(world, 0, 'Niemand doet mee: je speelt alleen.'); return regel && regel.solo ? regel.solo(world) : false; }
  W.deeln = deeln; W.id = u.id; W.hostloos = hostloos; W.achtergrond = hostloos;
  if (hostloos) meld(world, 0, 'De wedstrijd loopt zonder jou door.');
  if (regel && (regel.soort === 'score' || regel.soort === 'tijd' || regel.soort === 'punt')) {
    const tijd = regel.soort === 'tijd', punt = regel.soort === 'punt';
    const banen = tijd || punt ? [{ par: 2 }] : regel.banen ? regel.banen(world) : [];
    const sc = banen.length ? (tijd ? maakTijd(u.id, deeln, regel.opties ? regel.opties(world) : {}) : punt ? maakPunt(u.id, deeln, regel.opties ? regel.opties(world) : {}) : maakScore(u.id, deeln, banen)) : null;
    if (!sc || !(hostloos || regel.start(world, sc))) return af();
    sc.uit = regel.plek ? regel.plek(world) : null; sc.achtergrond = hostloos;
    W.sc = sc; W.nSt = -1; W.tSt = 0;
    const extra = regel.extra ? regel.extra(world) : null;
    for (const g of gasten) {
      n.hub.announce(startEvent(u.id, deeln, 0, { ...(tijd ? { tijd: 1 } : punt ? { punt: 1, beurten: sc.beurten } : { banen: banen.map((b) => b.par) }), ...(extra || null) }), g);
      const l = lichaamVan(world, g); if (l) { l.coopWedstrijd = true; zetBijUitgang(l, sc, g); } // zijn lichaam staat stil bij de eerste tee: hij speelt op zijn eigen scherm
    }
    return true;
  }
  if (regel && regel.soort === 'live' && regel.live) {
    const sim = regel.maak(deeln);
    if (!sim || !(hostloos || regel.start(world, sim))) return af();
    sim.uit = regel.plek ? regel.plek(world) : null;
    W.lv = sim; W.nSt = 0; W.tSt = 0;
    const extra = regel.extra ? regel.extra(world) : null;
    for (const g of gasten) {
      n.hub.announce(startEvent(u.id, deeln, 0, { live: 1, ...(extra || null) }), g);
      const l = lichaamVan(world, g); if (l) { l.coopWedstrijd = true; zetBijUitgang(l, sim, g); } // zijn lichaam staat stil bij de baan: hij speelt op zijn eigen scherm
    }
    return true;
  }
  if (regel && regel.soort === 'baan') {
    // een baanwedstrijd (#443): iedereen vaart of rijdt tegelijk op zijn eigen voertuig in deze wereld over dezelfde baan;
    // de gasten doen gewoon mee met hun eigen besturing, dus hun lichaam staat niet stil
    const sc = maakBaan(u.id, deeln, regel.opties ? regel.opties(world) : {});
    if (!sc || !regel.start(world, sc)) return af(); // ook zonder de host: de wereld moet de boten neerzetten en de baan bijhouden
    sc.uit = regel.plek ? regel.plek(world) : null; sc.achtergrond = hostloos;
    W.sc = sc; W.nSt = -1; W.tSt = 0;
    const extra = regel.extra ? regel.extra(world) : null;
    for (const g of gasten) n.hub.announce(startEvent(u.id, deeln, 0, { baan: 1, cps: sc.cps, ...(extra || null) }), g);
    return true;
  }
  W.draai = W.laatste && W.laatste.id === u.id ? (W.draai + 1) % MAX_RIJDERS : 0; // een rematch: een andere pole
  const r = maakRace(deeln, { draai: W.draai });
  if (!regel || !(hostloos || regel.start(world, r))) return af();
  if (hostloos) r.uit = regel.plek ? regel.plek(world) : null; // waar een gast die klaar is weer staat (bij de host zet start dat zelf)
  W.r = r; W.nSt = 0; W.tSt = 1 / STAND_HZ;
  for (const g of gasten) {
    n.hub.announce(startEvent(u.id, deeln, W.draai), g);
    const l = lichaamVan(world, g); if (l) l.coopWedstrijd = true; // zijn lichaam staat stil: hij rijdt (coopglue.js en stepFigures)
  }
  return true;
}

// Elke frame bij de host (coopnet.js tickCoopNet): de uitnodiging telt af en de wedstrijd begint; bij een score-wedstrijd loopt de klok en gaat de stand rond.
export function wedHostTik(world, dt) {
  const n = world.coopNet; if (!n || n.role !== 'host' || !n.wed) return false;
  const W = n.wed;
  if (W.u) {
    for (const s of Object.keys(W.u.keuze)) if (+s > 0 && !verbondenGasten(world).some((g) => g.slot === +s) && W.u.keuze[s] === 'wacht') W.u.keuze[s] = 'nee'; // weggevallen
    if (tikUitnodiging(W.u, dt) || W.nu) begin(world, n, W);
  }
  if (W.sc) scoreTik(world, n, W, dt);
  if (W.achtergrond) achtergrondTik(world, n, W, dt);
  return true;
}
// Een wedstrijd zonder de host (#452): de host rekent op de achtergrond mee. Dit loopt met de echte tijd van tickCoopNet, dus ook als de host
// een menu, de kaart of een filmpje open heeft: de wereld pauzeert niet voor een speler die niet meedoet. (Een score-wedstrijd loopt via scoreTik.)
function achtergrondTik(world, n, W, dt) {
  if (W.r) {
    const r = W.r;
    if (wedRaceTik(world, r, dt, null).some((e) => e.type === 'klaar')) { wedHostEind(world, r); W.achtergrond = false; }
  } else if (W.lv) {
    const sim = W.lv, regel = WEDSTRIJDEN.get(W.id), L = regel && regel.live;
    if (!L) { W.lv = null; W.achtergrond = false; return; }
    const ev = wedLiveTik(world, sim, dt, null);
    if (ev.some((e) => e.type === 'klaar')) { wedHostLiveEind(world, sim); W.achtergrond = false; }
    else if (!W.deeln.some((d) => d.slot > 0 && L.meedoen(sim, d.slot))) { wedHostLiveEind(world, sim, { gestopt: true }); W.achtergrond = false; } // niemand speelt nog
  } else if (!W.sc) W.achtergrond = false;
}

// Het lichaam van een gast staat na de race (of als hij stopt) bij de uitgang van de baan, naast de anderen.
function zetBijUitgang(l, r, slot) { if (r.uit && fin(r.uit.x) && fin(r.uit.y)) { l.x = r.uit.x + Math.cos(slot * 1.7) * 2.2; l.y = r.uit.y + Math.sin(slot * 1.7) * 2.2; l.vx = 0; l.vy = 0; } }

// Elke frame van de race bij de host: wie wegviel rijdt door als AI, de race wordt uitgerekend, de gasten krijgen hun momentopname.
// hostInvoer(): de eigen toetsen van wie het spel opende, { throttle, steer, drift } (kartbaan.js playerInput).
export function wedRaceTik(world, r, dt, hostInvoer = null) {
  const n = world.coopNet, W = n && n.wed;
  const verbonden = new Set(verbondenGasten(world).map((s) => s.slot));
  for (const k of r.karts) if (k.mens && k.slot > 0 && !k.weg && !verbonden.has(k.slot)) { verlaat(r, k.slot); const l = lichaamVan(world, k.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, r, k.slot); } }
  const ev = tikRace(r, dt, (slot) => (slot === 0 ? (hostInvoer ? hostInvoer() : null) : invoerNaarKart(invoerVan(world, slot))));
  for (const k of r.karts) { // het lichaam van een gast rijdt mee, zodat de band en de tegels bij de baan blijven
    if (!k.mens || k.slot === 0 || k.weg) continue;
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
  for (const k of r.karts) if (k.mens && k.slot > 0) { const l = lichaamVan(world, k.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, r, k.slot); } }
  if (!n || !W || W.r !== r) return null;
  W.r = null;
  if (gestopt) { for (const k of r.karts) if (k.mens && k.slot > 0 && !k.weg) n.hub.announce(eindEvent([], null, true), k.slot); return null; }
  const rijen = eindstand(r);
  W.laatste = { id: W.id, slots: r.karts.filter((k) => k.mens).map((k) => k.slot), hostloos: !!W.hostloos };
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

// ---- een score-wedstrijd (golf): de host controleert de slagen, houdt de stand bij en betaalt per plek
// ---- en een baanwedstrijd (bruggenrace, regatta): de host meldt per deelnemer de voortgang (wedHostBaan), de regels staan in coopwedstrijdbaan.js.
// Bij een baanwedstrijd vaart de gast zelf mee, dus zijn lichaam staat niet stil en wordt hier niet verplaatst.
function scoreTik(world, n, W, dt) {
  const sc = W.sc, K = soortVan(sc);
  const verbonden = new Set(verbondenGasten(world).map((s) => s.slot));
  for (const d of sc.deeln) if (d.slot > 0 && !sc.weg[d.slot] && !verbonden.has(d.slot)) {
    K.verlaat(sc, d.slot);
    if (sc.baan) { const regel = WEDSTRIJDEN.get(sc.id); if (regel && regel.weg) { try { regel.weg(world, sc, d.slot); } catch (e) { /* de baan is al weg */ } } } // zijn boot laten wegdrijven
    else { const l = lichaamVan(world, d.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, sc, d.slot); } }
  }
  const ev = K.tik(sc, dt);
  W.tSt += dt;
  if (W.tSt >= 0.5 && W.nSt !== sc.n) { W.tSt = 0; W.nSt = sc.n; const m = K.event(sc); for (const d of sc.deeln) if (d.slot > 0 && !sc.weg[d.slot]) n.hub.announce(m, d.slot); } // de stand voor wie nog meedoet
  if (ev.some((e) => e.type === 'klaar')) scoreEind(world, n, W, false);
}
function scoreEind(world, n, W, gestopt) {
  const sc = W.sc; W.sc = null;
  const K = soortVan(sc);
  const regel = WEDSTRIJDEN.get(sc.id);
  for (const d of sc.deeln) if (d.slot > 0 && !sc.baan) { const l = lichaamVan(world, d.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, sc, d.slot); } }
  if (gestopt) { for (const d of sc.deeln) if (d.slot > 0 && !sc.weg[d.slot]) n.hub.announce(eindEvent([], null, true), d.slot); if (regel && regel.eind && (!sc.achtergrond || sc.baan)) regel.eind(world, null); return null; }
  const rijen = K.uitslag(sc).map((r) => ({ tijd: null, beste: null, ...r }));
  W.laatste = { id: sc.id, slots: sc.deeln.map((d) => d.slot), hostloos: !!W.hostloos };
  W.opnieuw = {};
  let jij = null;
  for (const rij of rijen) {
    const b = K.beloning(rij), mijn = { plek: rij.plek, geld: b.geld, xp: b.xp, fin: rij.fin ? 1 : 0, weg: rij.weg ? 1 : 0 };
    if (rij.slot === 0) { jij = mijn; continue; }
    if (rij.weg) continue;
    n.hub.announce(eindEvent(rijen, mijn), rij.slot);
    if ((b.geld > 0 || b.xp > 0) && haken.betaalGast) haken.betaalGast(world, rij.slot, b.geld, { vak: (regel && regel.vak) || 'golf', xp: b.xp });
  }
  W.uitslag = { rijen, jij };
  const res = { rijen, jij, winnaars: winnaars(rijen) };
  if (regel && regel.eind && (!sc.achtergrond || sc.baan)) regel.eind(world, res);
  return res;
}
// ---- een live wedstrijd (padel): de host rekent alles uit, de gasten sturen hun invoer en tekenen de momentopnamen
// Elke frame bij de host: wie wegviel wordt door de AI vervangen, de stap wordt uitgerekend met de invoer van elke speler, de gasten krijgen hun momentopname.
// hostInvoer(): de eigen toetsen van wie het spel opende, { mx, my, buttons } (my < 0 is vooruit, bit 1 is Spatie). Geeft de gebeurtenissen van deze stap.
export function wedLiveTik(world, sim, dt, hostInvoer = null) {
  const n = world.coopNet, W = n && n.wed, regel = W && WEDSTRIJDEN.get(W.id), L = regel && regel.live;
  if (!L || !W || W.lv !== sim) return [];
  const verbonden = new Set(verbondenGasten(world).map((s) => s.slot));
  for (const d of W.deeln) if (d.slot > 0 && !verbonden.has(d.slot) && L.verlaat(sim, d.slot)) { const l = lichaamVan(world, d.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, sim, d.slot); } }
  const ev = L.tik(sim, dt, (slot) => (slot === 0 ? (hostInvoer ? hostInvoer() : null) : invoerVan(world, slot)));
  W.tSt += dt;
  if (W.tSt >= 1 / STAND_HZ) {
    W.tSt = 0;
    const m = L.snap(sim, ++W.nSt);
    for (const d of W.deeln) if (d.slot > 0 && verbonden.has(d.slot) && L.meedoen(sim, d.slot)) n.hub.announce(m, d.slot);
  }
  return ev;
}
// De wedstrijd is voorbij (of de host stopte): de gasten krijgen de uitslag en hun beloning. Geeft { rijen, jij, winnaars } voor de host zelf (null bij stoppen).
export function wedHostLiveEind(world, sim, { gestopt = false } = {}) {
  const n = world.coopNet, W = n && n.wed, regel = W && WEDSTRIJDEN.get(W.id), L = regel && regel.live;
  if (W) for (const d of W.deeln) if (d.slot > 0) { const l = lichaamVan(world, d.slot); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, sim, d.slot); } }
  if (!n || !W || !L || W.lv !== sim) return null;
  W.lv = null;
  if (gestopt) { for (const d of W.deeln) if (d.slot > 0 && L.meedoen(sim, d.slot)) n.hub.announce(eindEvent([], null, true), d.slot); return null; }
  const rijen = L.uitslag(sim);
  W.laatste = { id: W.id, slots: W.deeln.map((d) => d.slot), hostloos: !!W.hostloos };
  W.opnieuw = {};
  let jij = null;
  for (const rij of rijen) {
    const b = L.beloning(rij), mijn = { plek: rij.plek, geld: b.geld, xp: b.xp, fin: rij.fin ? 1 : 0, weg: rij.weg ? 1 : 0 };
    if (rij.slot === 0) { jij = mijn; continue; }
    if (rij.weg) continue; // wie wegviel is er niet meer
    n.hub.announce(eindEvent(rijen, mijn), rij.slot);
    if ((b.geld > 0 || b.xp > 0) && haken.betaalGast) haken.betaalGast(world, rij.slot, b.geld, { vak: L.vak || 'wedstrijd', xp: b.xp });
  }
  W.uitslag = { rijen, jij };
  return { rijen, jij, winnaars: winnaars(rijen) };
}

// De host zelf meldt de slagen van zijn volgende baan.
export function wedHostScore(world, baan, slagen) { const n = world.coopNet, W = n && n.wed; return !!W && !!W.sc && meldBaan(W.sc, 0, baan, slagen); }
// De host meldt de voortgang van een deelnemer in een baanwedstrijd (#443): cp = gepasseerde punten, s = meters op de baan,
// klaar met zijn finishtijd. De baan zelf (pg_bruggenrace.js, regatta.js) kent de route en roept dit elke frame aan.
export function wedHostBaan(world, slot, voortgang) { const n = world.coopNet, W = n && n.wed; return !!W && !!W.sc && !!W.sc.baan && meldBaanVoortgang(W.sc, slot, voortgang); }
// De stand van een baanwedstrijd bij de host, voor het bord en de HUD: [{ slot, naam, plek, cp, s, klaar, tijd, weg }].
export function wedBaanStand(world) { const n = world.coopNet, W = n && n.wed; return W && W.sc && W.sc.baan ? standBaan(W.sc) : []; }
// De host zelf meldt zijn poging op tijd (klimtoren): { tijd, hoogte, boven }.
export function wedHostTijd(world, res) { const n = world.coopNet, W = n && n.wed; return !!W && !!W.sc && !!W.sc.tijd && meldTijd(W.sc, 0, res); }
// De host zelf meldt de punten van zijn volgende beurt (skatepark, hengelen).
export function wedHostPunt(world, beurt, punten) { const n = world.coopNet, W = n && n.wed; return !!W && !!W.sc && !!W.sc.punt && meldPunt(W.sc, 0, beurt, punten); }
// De host stopt de ronde (Backspace): iedereen hoort dat en niemand krijgt een beloning.
export function wedScoreStop(world) { const n = world.coopNet, W = n && n.wed; if (!n || !W || !W.sc) return false; scoreEind(world, n, W, true); return true; }
// De stand voor het bord, voor wie de ronde speelt: [{ slot, naam, banen, slagen, rel, weg }] van de beste naar de slechtste.
export function wedScoreRijen(world) {
  const n = world.coopNet;
  if (n && n.role === 'host' && n.wed && n.wed.sc) {
    const sc = n.wed.sc;
    return soortVan(sc).rijen(sc).map((r) => ({ slot: r.slot, naam: r.naam, banen: r.banen, slagen: r.slagen, rel: r.rel, weg: r.weg }));
  }
  const G = world.coopWedGast;
  if (G && G.baan) { // een baanwedstrijd: de stand van de host, de eerste eerst
    const deeln = G.baan.deeln;
    const sorteer = (r) => ({ weg: r.weg, klaar: !!r.slagen, tijd: r.slagen ? r.slagen / 100 : null, cp: r.banen, s: r.rel });
    return (G.baan.stand || []).slice().sort((a, b) => volgordeBaan(sorteer(a), sorteer(b))).map((r) => ({ slot: r.slot, naam: (deeln.find((d) => d.slot === r.slot) || {}).naam || 'Speler', banen: r.banen, slagen: r.slagen, rel: r.rel, weg: r.weg }));
  }
  const sc = G && G.score;
  if (!sc) return [];
  const naam = (slot) => (sc.deeln.find((d) => d.slot === slot) || {}).naam || 'Speler';
  const rijen = sc.deeln.map((d) => { const s = sc.stand.find((x) => x.slot === d.slot); return { slot: d.slot, naam: d.naam, banen: s ? s.banen : 0, slagen: s ? s.slagen : 0, rel: s ? s.rel : 0, weg: s ? s.weg : false }; });
  return rijen.sort(sc.tijd ? volgordeTijd : sc.punt ? volgordePunt : (a, b) => (a.weg - b.weg) || (a.rel - b.rel) || (b.banen - a.banen)).map((r) => ({ ...r, naam: naam(r.slot) }));
}

// Een bericht van een gast bij de host.
export function wedHandleGast(world, body, van) {
  const n = world.coopNet, b = leesGast(body);
  if (!n || n.role !== 'host' || !b || !(van >= 1)) return false;
  const W = wedStaat(n);
  if (b.a === 'ja' || b.a === 'nee') return !!W.u && antwoord(W.u, van, b.a === 'ja');
  if (b.a === 'start') return wedVraagStart(world, van, b.id).ok; // een gast drukt E bij het startpunt (#452)
  if (b.a === 'score') return !!W.sc && !W.sc.tijd && !W.sc.punt && meldBaan(W.sc, van, b.baan, b.slagen);
  if (b.a === 'tijd') return !!W.sc && !!W.sc.tijd && meldTijd(W.sc, van, b);
  if (b.a === 'punt') return !!W.sc && !!W.sc.punt && meldPunt(W.sc, van, b.beurt, b.punten);
  if (b.a === 'weg') {
    const regelLv = W.lv && WEDSTRIJDEN.get(W.id), ok = W.r ? verlaat(W.r, van) : W.sc ? soortVan(W.sc).verlaat(W.sc, van) : regelLv && regelLv.live ? regelLv.live.verlaat(W.lv, van) : false;
    if (!ok) return false;
    const l = lichaamVan(world, van); if (l) { l.coopWedstrijd = false; zetBijUitgang(l, W.r || W.sc || W.lv, van); }
    meld(world, 0, `${naamVan(world, van)} speelt niet meer mee.`);
    return true;
  }
  if (b.a === 'nogmaals') { if (!W.laatste || W.r || W.sc || W.lv || W.u || !W.laatste.slots.includes(van)) return false; W.opnieuw[van] = true; meld(world, 0, `${naamVan(world, van)} wil nog een keer.`); if (W.laatste.hostloos) wedVraagStart(world, van, W.laatste.id, { plekControle: false }); return true; } // zonder de host kan niemand J drukken: een gast start de rematch zelf (#452)
  return false;
}
// De host start een rematch met dezelfde soort wedstrijd (J op de uitslag).
export function wedOpnieuw(world) {
  const n = world.coopNet, W = n && n.wed;
  if (!W || !W.laatste || W.r || W.sc || W.lv || W.u) return { ok: false };
  return wedNodigUit(world, W.laatste.id);
}
export const willenOpnieuw = (world) => { const n = world.coopNet; return n && n.wed ? Object.keys(n.wed.opnieuw).map(Number) : []; };

// ---------------------------------------------------------------- de gast: berichten van de host

export const gastStaat = (world) => world.coopWedGast || (world.coopWedGast = { uitn: null, spiegel: null, score: null, baan: null, id: null, uitslag: null, nogmaals: false, vraagT: -99 });
// Haken van het scherm van de gast per soort wedstrijd (kartbaan.js, pitchputt.js): dichtbij(world) -> bool (staat hij bij het startpunt, #452), start(world, start, spiegel) -> bool, eind(world, uitslag, spiegel),
// tik(world, dt, spiegel) -> true zolang het scherm van de wedstrijd is
const gastHaken = new Map();
export function zetWedGastHaken(id, h) { gastHaken.set(id, h || {}); }
const haakVan = (id) => gastHaken.get(id) || {};

// Elke frame bij een gast (coopgastlokaal.js): doet hij mee, dan draait het scherm van de wedstrijd; geeft true zolang de invoer van de wedstrijd is.
export function wedGastTik(world, dt) {
  const G = world.coopWedGast;
  if (!G || !(G.spiegel || G.score)) return false;
  const h = haakVan(G.id);
  return h.tik ? !!h.tik(world, dt, G.spiegel) : false;
}
// Een gast in een baanwedstrijd (#443) vaart zelf mee in de wereld van de host: geen eigen scherm, alleen de stand. Backspace
// stopt voor hem (de rest vaart door). Geeft true als de toets van de wedstrijd was, zodat de aanroeper hem verbruikt.
export function wedGastBaanTik(world, dt) {
  const G = world.coopWedGast;
  if (!G || !G.baan) return false;
  G.baan.t = (G.baan.t || 0) + dt;
  const inp = world.input;
  if (inp && inp.wasPressed && !world.paused && inp.wasPressed('backspace')) { inp.consume && inp.consume('backspace'); wedGastVerlaat(world); if (world.addMessage) world.addMessage('Je stopt: de rest vaart door.', 3); return true; }
  return false;
}

export function wedHandleHost(world, body) {
  const n = world.coopNet, b = leesWed(body);
  if (!n || n.role !== 'client' || !b) return false;
  const G = gastStaat(world);
  if (b.f === 'uit') { G.uitn = { id: b.id, label: b.label, rest: b.sec, wie: b.wie || '' }; G.uitslag = null; return true; }
  if (b.f === 'af') { G.uitn = null; return true; }
  if (b.f === 'start') {
    G.uitn = null; G.uitslag = null; G.nogmaals = false;
    const mijn = n.session ? n.session.slot : -1, haak = haakVan(b.id);
    if (!b.deeln.some((d) => d.slot === mijn)) return false;
    if (b.baan) { // een baanwedstrijd: hij vaart zelf mee in de wereld van de host; alleen de stand en de uitslag komen hier binnen
      G.baan = { id: b.id, deeln: b.deeln, cps: b.cps, v: b.v || null, stand: [], t: 0 }; G.id = b.id;
      if (world.addMessage) world.addMessage('Je doet mee: bij het aftellen gaat iedereen samen weg.', 4);
      return true;
    }
    if (!haak.start) return false;
    if (b.live) { // een live wedstrijd: de host rekent, deze gast tekent een spiegel van de momentopnamen en stuurt zijn invoer
      const sp = haak.spiegel ? haak.spiegel(b, mijn) : null;
      if (!sp || !haak.start(world, b, sp)) { wedGastStuur(world, 'weg'); return false; } // hij kan niet meespelen (de baan is hier niet geladen): de AI neemt zijn stoel
      G.spiegel = sp; G.id = b.id; world.coopWedstrijd = true;
      return true;
    }
    if (b.banen || b.tijd || b.punt) { // een score-wedstrijd: iedereen speelt op zijn eigen scherm, de stand komt van de host
      G.score = { id: b.id, deeln: b.deeln, banen: b.banen || [], tijd: !!b.tijd, punt: !!b.punt, beurten: b.beurten || 1, stand: [], v: b.v || null }; G.id = b.id;
      if (!haak.start(world, b, null)) { G.score = null; return false; }
      world.coopWedstrijd = true;
      return true;
    }
    const sp = maakSpiegel(b, mijn);
    if (!haak.start(world, b, sp)) return false;
    G.spiegel = sp; G.id = b.id; world.coopWedstrijd = true;
    return true;
  }
  if (b.f === 'st') return !!G.spiegel && voerIn(G.spiegel, b);
  if (b.f === 'lv') { const h = haakVan(G.id); return !!G.spiegel && !!h.voerIn && !!h.voerIn(G.spiegel, b); }
  if (b.f === 'sc') { if (G.baan) { G.baan.stand = b.rijen; G.baan.t = b.t || 0; return true; } if (!G.score) return false; G.score.stand = b.rijen; return true; }
  if (b.f === 'eind') {
    const sp = G.spiegel, id = G.id, was = !!(G.spiegel || G.score || G.baan); G.spiegel = null; G.score = null; G.baan = null; world.coopWedstrijd = false;
    const h = haakVan(id);
    if (was && h.eind) h.eind(world, b, sp);
    G.uitslag = b.gestopt ? null : b; G.nogmaals = false;
    return true;
  }
  return false;
}
// De gast antwoordt op de uitnodiging, stopt met de wedstrijd of wil nog een keer: een bericht naar de host.
export function wedGastStuur(world, a) {
  const n = world.coopNet, G = gastStaat(world);
  if (!n || n.role !== 'client' || !n.session || !leesGast({ k: 'wedgast', a })) return false;
  if (a === 'ja' || a === 'nee') { if (!G.uitn) return false; G.uitn = null; }
  if (a === 'nogmaals') { if (!G.uitslag || G.nogmaals) return false; G.nogmaals = true; }
  return n.session.sendEvent({ k: 'wedgast', a });
}
// E bij een gast (coopgastlokaal.js): staat hij bij het startpunt van een wedstrijd (haak dichtbij van die wedstrijd), dan vraagt hij de host hem te starten (#452).
// Geeft true als E hiervoor was. Een tweede druk binnen twee seconden doet niets (geen dubbel verzoek).
export const VRAAG_WACHT_S = 2;
export function wedGastE(world) {
  const n = world.coopNet;
  if (!n || n.role !== 'client' || !n.joined || !n.session || world.paused) return false;
  let id = null;
  for (const [k, h] of gastHaken) {
    if (!h.dichtbij || !WEDSTRIJDEN.has(k)) continue;
    let d = false;
    try { d = !!h.dichtbij(world); } catch (e) { d = false; }
    if (d) { id = k; break; }
  }
  if (!id) return false;
  const G = gastStaat(world), say = (t) => { if (world.addMessage) world.addMessage(t, 3); };
  if (G.uitn || G.spiegel || G.score) { say(WED_TEKST.bezig); return true; }
  const nu = Number.isFinite(world.time) ? world.time : Date.now() / 1000;
  if (nu - G.vraagT < VRAAG_WACHT_S) return true;
  G.vraagT = nu;
  say(WED_TEKST.vraagt(WEDSTRIJDEN.get(id).naam));
  n.session.sendEvent({ k: 'wedgast', a: 'start', id });
  return true;
}
// De gast meldt de slagen van zijn volgende baan (golf).
export function wedGastScore(world, baan, slagen) {
  const n = world.coopNet, G = world.coopWedGast;
  if (!n || n.role !== 'client' || !n.session || !G || !G.score) return false;
  return n.session.sendEvent({ k: 'wedgast', a: 'score', b: baan | 0, s: slagen | 0 });
}
// De gast stopt zelf met de wedstrijd (Backspace): de host laat zijn kart onder de AI doorrijden (of telt zijn ronde niet meer mee), zijn lichaam beweegt weer.
// De gast meldt zijn poging op tijd (klimtoren): de tijd in seconden, de hoogste greep in meters en of hij boven kwam.
export function wedGastTijd(world, tijd, hoogte, boven) {
  const n = world.coopNet, G = world.coopWedGast;
  if (!n || n.role !== 'client' || !n.session || !G || !G.score || !G.score.tijd) return false;
  return n.session.sendEvent({ k: 'wedgast', a: 'tijd', t: Math.round(tijd * 100) / 100, h: Math.round(hoogte * 10) / 10, o: boven ? 1 : 0 });
}
// De gast meldt de punten van zijn volgende beurt (skatepark, hengelen).
export function wedGastPunt(world, beurt, punten) {
  const n = world.coopNet, G = world.coopWedGast;
  if (!n || n.role !== 'client' || !n.session || !G || !G.score || !G.score.punt) return false;
  return n.session.sendEvent({ k: 'wedgast', a: 'punt', b: beurt | 0, p: Math.round(punten) });
}
export function wedGastVerlaat(world) {
  const G = world.coopWedGast;
  if (!G || !(G.spiegel || G.score || G.baan)) return false;
  wedGastStuur(world, 'weg');
  G.spiegel = null; G.score = null; G.baan = null; world.coopWedstrijd = false;
  return true;
}
// Het scherm van de gast ruimt op (de verbinding is weg of de host stopte): geen spiegel meer, het lichaam beweegt weer.
export function wedGastReset(world) {
  const G = world.coopWedGast; world.coopWedstrijd = false;
  if (G) {
    G.uitn = null; G.uitslag = null;
    if (G.spiegel || G.score) { const sp = G.spiegel, h = haakVan(G.id); G.spiegel = null; G.score = null; if (h.eind) h.eind(world, { f: 'eind', gestopt: true, rijen: [], jij: null }, sp); }
    G.baan = null;
  }
}
