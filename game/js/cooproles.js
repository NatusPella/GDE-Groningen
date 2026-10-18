// Coöp fase 2 (#95): verhaal en cutscenes met twee spelers. Pure logica:
// rollen per verhaalstap, wie praat en beslist, gedeelde missiestatus,
// falen en slagen, cutscene-regie en de NPC-metgezel bij alleen spelen.
// Leest STEPS uit storyarc.js als data; verandert niets aan het solospel.

import { CHARS, other } from './coopstate.js';

// aanwezigheid in een stap: 'beide' (beiden nodig), 'dichtstbij' (wie het
// dichtst bij het doel is telt, de ander mag meekomen), 'een' (solo-stap).
export const PRESENCE = ['beide', 'dichtstbij', 'een'];

// Per stap-id afwijkende regels (de rest volgt coopRule). needsTwo: de missie
// vraagt een tweede persoon; met één mens neemt de NPC-metgezel die plek.
export const OVERRIDES = {
  H6: { presence: 'beide', needsTwo: true },   // de inbraak: een zekeringkast, twee handen
  H16: { presence: 'een' },                      // solo: de ander kijkt mee
};

// slot van een personage-id (tammo = 0, anita/Tessa = 1)
export const slotOfChar = (id) => CHARS.indexOf(id);

// De regel van één stap voor 'humans' (1 of 2) spelers.
export function coopRule(step, humans = 2) {
  const o = (step && OVERRIDES[step.id]) || {};
  let presence = o.presence || (step && step.solo ? 'een' : step && step.kind === 'mission' ? 'beide' : 'dichtstbij');
  const active = slotOfChar(step && step.player);
  const needsTwo = !!o.needsTwo || presence === 'beide';
  const r = {
    id: step && step.id, presence, needsTwo,
    // in coöp ligt de rol vast: geen bestuurswissel (step.player / playHandover)
    swapControl: false,
    activeSlot: presence === 'een' ? (active >= 0 ? active : 0) : null,
    spectators: [],
    companionSlots: [], // slots die de NPC-metgezel bestuurt
  };
  if (presence === 'een') r.spectators = [other(r.activeSlot)];
  if (humans < 2) r.companionSlots = presence === 'een' ? [] : [1];
  return r;
}

// Alle stappen auditen: elke stap moet een geldige regel hebben.
export function auditSteps(steps) {
  const bad = [];
  for (const s of steps) {
    const r = coopRule(s, 2);
    if (!PRESENCE.includes(r.presence)) bad.push(`${s.id}: presence`);
    if (r.presence === 'een' && !(r.activeSlot >= 0)) bad.push(`${s.id}: geen actieve speler`);
  }
  return bad;
}

// Wie praat: een regel van speaker-id; hoort die bij een speler, dan spreekt
// diens slot (voor camera en lipsync), anders is het een NPC.
export function speakerSlot(speakerId) {
  const s = slotOfChar(speakerId);
  return s >= 0 ? s : null;
}

// Wie beslist bij een keuze in een gesprek: de actieve speler van de stap;
// bij 'beide' de speler die het gesprek startte. Valt die weg, dan de ander.
export function decider(rule, starter, alive = [true, true]) {
  const pick = rule.activeSlot != null ? rule.activeSlot : starter;
  return alive[pick] ? pick : other(pick);
}

// Missiestatus: de host is leidend; clients krijgen dit object als geheel.
export function createMission(id, humans = 2) {
  return { id, stage: 0, state: 'run', present: [true, true], humans, kills: [0, 0], score: 0, medal: null };
}
export function advance(m, stage) { if (m.state === 'run' && stage > m.stage) m.stage = stage; return m.stage; }
export function addKill(m, slot) { m.kills[slot]++; m.score += 1; }

// Beiden dood = missie faalt voor beiden. Eén dood: de missie loopt door.
export function checkFail(m, st) {
  if (m.state !== 'run') return m.state;
  if (st.teamDown) m.state = 'fail';
  return m.state;
}
export function pass(m, thresholds = { gold: 20, silver: 10 }) {
  if (m.state !== 'run') return m.state;
  m.state = 'pass';
  const k = m.kills[0] + m.kills[1];
  m.medal = k >= thresholds.gold ? 'goud' : k >= thresholds.silver ? 'zilver' : 'brons'; // teamresultaat
  return m.state;
}

// Aanwezigheid: mag de stap vooruit? 'beide' vraagt beide levende spelers
// binnen de straal van het doel; 'dichtstbij' en 'een' vragen één.
export function mayProceed(rule, dists, alive = [true, true], radius = 12) {
  const near = dists.map((d, i) => alive[i] && d <= radius);
  if (rule.presence === 'beide') return alive.every((a, i) => !a || near[i]) && near.some(Boolean);
  if (rule.presence === 'een') return !!near[rule.activeSlot];
  return near.some(Boolean);
}

// Cutscene-regie: de host start, elke peer speelt lokaal met beide personages.
// ready: slot -> bool (klaar met laden). Overslaan = beide houden O.
export function createCutscene(id, rule) {
  return { id, rule, ready: [false, false], skip: [false, false], started: false, t: 0, timeout: 8, done: false };
}
export function markReady(cs, slot) { cs.ready[slot] = true; return cs.ready.every(Boolean); }
// Start zodra beiden klaar zijn of de time-out (laadwachttijd) om is.
export function tickCutscene(cs, dt, humans = 2) {
  if (cs.done) return cs;
  if (!cs.started) {
    cs.t += dt;
    if (cs.ready.slice(0, humans).every(Boolean) || cs.t >= cs.timeout) { cs.started = true; cs.t = 0; }
  } else cs.t += dt;
  return cs;
}
export function holdSkip(cs, slot, down, humans = 2) {
  cs.skip[slot] = !!down;
  const need = humans < 2 ? [0] : [0, 1];
  if (need.every((s) => cs.skip[s])) cs.done = true;
  return cs.done;
}
// Waar de personages in de scène staan: elke mens zijn eigen personage,
// de NPC-metgezel de rest. Geeft per slot 'mens' of 'npc'.
export function cutsceneCast(humans, rule) {
  return [0, 1].map((s) => (s < humans && !rule.companionSlots.includes(s) ? 'mens' : 'npc'));
}

// NPC-metgezel bij alleen spelen: volgt, tenzij de stap solo is (dan wacht
// hij, zoals companionHold in missions.js).
export function companionMode(rule, humans) {
  if (humans >= 2) return 'mens';
  return rule.presence === 'een' ? 'wacht' : 'volg';
}
