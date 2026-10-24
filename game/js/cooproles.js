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
  M06: { presence: 'beide', needsTwo: true },   // de inbraak: een zekeringkast, twee handen
  // (M21 is solo: step.solo, de ander kijkt mee)
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

// Een opdracht faalt voor iedereen pas als alle meespelers uitgeschakeld zijn (#452). alive: per meespeler of hij nog staat
// (de gastheer als hij net is neergegaan of opgepakt: false). Zonder meespelers is niemand over: dan faalt de opdracht zoals altijd.
export const teamDown = (alive) => !(Array.isArray(alive) && alive.some(Boolean));

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
// Alleen de hoofdpersonen (plek 0 en 1) houden een scène op; extra spelers lopen in de open wereld en wachten nergens op.
export function markReady(cs, slot) { if (slot <= 1) cs.ready[slot] = true; return cs.ready.every(Boolean); }
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
  if (slot > 1) return cs.done; // extra spelers kunnen een scène niet overslaan
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

// ---- rollen per speler (#455)
// De rol hoort bij de speler, niet bij de plek. Iedereen is lokaal de hoofdpersoon
// van zijn eigen verhaal (Tammo of Tessa, wat de stap vraagt); anderen ziet hij als
// hun online-avatar. De tweede verhaalrol is in het eigen beeld een computerfiguur.
export const STORY_ROLES = ['tammo', 'anita']; // 'anita' is het id van Tessa in storyarc
export const isVerhaalrol = (id) => STORY_ROLES.includes(id);
export const andereVerhaalrol = (id) => (id === 'tammo' ? 'anita' : 'tammo');

// De eigen verhaalrol uit het profiel (de eigen save): 'tammo' als er niets bekend is.
export function eigenVerhaalrol(profiel = {}) {
  const r = profiel && (profiel.verhaalrol || profiel.rol || profiel.character);
  return isVerhaalrol(r) ? r : 'tammo';
}

// De rol die deze speler in deze stap lokaal speelt: de stap vraagt een rol
// (step.player). Wijkt die af van zijn eigen verhaal, dan speelt hij hem tijdelijk
// (model, stem, geluiden, ondertiteling en HUD-naam) en daarna weer zijn eigen rol.
export function rolVoorSpeler(step, profiel = {}) {
  const eigen = eigenVerhaalrol(profiel);
  const vraag = step && step.player;
  const rol = isVerhaalrol(vraag) ? vraag : eigen;
  return { rol, eigen, tijdelijk: rol !== eigen };
}

// De metgezel in het eigen beeld: de andere verhaalrol, en alleen bij een stap die
// twee mensen vraagt (een opdracht of scène). In de open wereld is hij er niet.
export function metgezelVoorSpeler(step, profiel = {}, regel = null) {
  const { rol } = rolVoorSpeler(step, profiel);
  const r = regel || (step ? coopRule(step, 2) : null);
  const nodig = !r || r.presence === 'beide' || r.needsTwo;
  return nodig ? andereVerhaalrol(rol) : null;
}

// Cutscene-cast per speler: de lokale speler staat op de gescripte plek van de
// hoofdrol, de andere verhaalrol is de metgezel. Online-avatars van medespelers
// staan niet in de scène (coopfigures3d verbergt ze), dus de metgezel staat er één keer.
export function cutsceneRol(step, profiel = {}, regel = null) {
  const r = rolVoorSpeler(step, profiel);
  return { ...r, metgezel: metgezelVoorSpeler(step, profiel, regel), avatarsZichtbaar: false, metgezelEenmalig: true };
}

// ---------------------------------------------------------------- uitbreidbaar
// Elke nieuwe scène, missie, minigame of voertuig registreert zijn coöp-regel
// hier; de netcode kent alleen deze regel en hoeft nooit aangepast te worden.
// Wat niet geregistreerd is krijgt een veilige standaard: één speelt, de ander
// kijkt mee (scène/minigame), of twee stoelen (voertuig). De regel is data:
//   { spelers: 'een' | 'twee', rollen?: {...}, wacht?: bool, stoelen?: n }
export const REGISTRY = { scene: new Map(), minigame: new Map(), voertuig: new Map(), activiteit: new Map() };
const DEFAULTS = {
  scene: { spelers: 'een', wacht: false },
  minigame: { spelers: 'een', wacht: false },
  voertuig: { stoelen: 2 },
  activiteit: { spelers: 'twee', beloning: 0 },
};

export function registerCoop(soort, id, regel) {
  if (!REGISTRY[soort]) throw new Error('onbekende soort: ' + soort);
  if (typeof id !== 'string' || !id) throw new Error('id ontbreekt');
  if (!regel || typeof regel !== 'object') throw new Error('regel ontbreekt');
  if (soort !== 'voertuig' && !['een', 'twee'].includes(regel.spelers)) throw new Error('spelers moet een of twee zijn');
  for (const k of ['min', 'max']) if (regel[k] !== undefined && !(Number.isInteger(regel[k]) && regel[k] >= 1 && regel[k] <= 8)) throw new Error(k + ' moet 1 tot 8 zijn');
  if (regel.min !== undefined && regel.max !== undefined && regel.min > regel.max) throw new Error('min mag niet groter zijn dan max');
  if (soort === 'activiteit' && !(Number.isFinite(regel.beloning) && regel.beloning >= 0)) throw new Error('beloning moet een getal van 0 of meer zijn');
  if (soort === 'voertuig' && !(Number.isInteger(regel.stoelen) && regel.stoelen >= 1 && regel.stoelen <= 8)) throw new Error('stoelen moet 1 tot 8 zijn');
  REGISTRY[soort].set(id, Object.freeze({ ...regel }));
}
export function coopRegel(soort, id) {
  return (REGISTRY[soort] && REGISTRY[soort].get(id)) || DEFAULTS[soort] || null;
}
export const isGeregistreerd = (soort, id) => !!(REGISTRY[soort] && REGISTRY[soort].has(id));

// Wie speelt een minigame mee? Twee-spelersspellen met twee mensen: beiden; anders de starter, de ander kijkt.
// aanwezig: aantal mensen (2 = plekken 0 en 1) of de lijst met aanwezige plekken (N spelers).
// Een spel voor twee of meer spreekt zijn max af (standaard 2); wie niet meespeelt kijkt.
export function minigameSpelers(id, starter, aanwezig = 2) {
  const r = coopRegel('minigame', id);
  const slots = Array.isArray(aanwezig) ? [...aanwezig].sort((a, b) => a - b) : (aanwezig | 0) <= 1 ? [starter] : Array.from({ length: aanwezig | 0 }, (_, i) => i);
  if (r.spelers === 'twee' && slots.length >= 2) {
    const max = r.max || 2;
    const spelers = [starter, ...slots.filter((x) => x !== starter)].slice(0, max).sort((a, b) => a - b);
    return { spelers, kijkers: slots.filter((x) => !spelers.includes(x)) };
  }
  return { spelers: [starter], kijkers: slots.filter((x) => x !== starter) };
}

// Rol van een plek bij een verhaalstap: de hoofdpersonen volgen de regel; extra spelers doen
// in het hoofdverhaal niet mee en lopen gewoon in de open wereld (ze houden de stap niet op).
export function rolVoorSlot(rule, slot) {
  if (slot >= 2) return { rol: 'wereld', speelt: false, houdtOp: false };
  if (rule.presence === 'een') return { rol: rule.activeSlot === slot ? 'speelt' : 'kijkt', speelt: rule.activeSlot === slot, houdtOp: rule.activeSlot === slot };
  return { rol: 'speelt', speelt: true, houdtOp: rule.presence === 'beide' };
}

// Bekende minigames (alle voor twee waar dat kan: een tweede speler als tegenstander of teamgenoot),
// en voertuigen met hun stoelen. Nieuwe functies voegen hier of in hun eigen module een regel toe.
registerCoop('minigame', 'padel', { spelers: 'twee', max: 4 });             // dubbelspel
registerCoop('minigame', 'kartrace', { spelers: 'twee', max: 8 });
registerCoop('minigame', 'racers', { spelers: 'twee', max: 8 });
registerCoop('minigame', 'pg_bruggenrace', { spelers: 'twee', max: 4 });
for (const id of ['carbid', 'kermis', 'pg_fierljep', 'pg_foodtruck', 'pg_koe', 'pg_skutsje']) registerCoop('minigame', id, { spelers: 'een' });
for (const [id, stoelen] of Object.entries({ auto: 2, bakkie: 2, bus: 2, vrachtwagen: 2, trekker: 2, politie: 2, taxi: 2, motor: 2, scooter: 2, boot: 2, skutsje: 2, heli: 2, fiets: 1, step: 1, trein: 1 })) registerCoop('voertuig', id, { stoelen });
