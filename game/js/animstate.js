// Eén animatie-state-machine voor elke mens (ADR 0051): speler, voorbijgangers, cutscene-acteurs en medespelers in Samen spelen.
// Pure data en logica, zonder three.js en zonder allocaties per beeld. De machine kiest de toestand (state) uit parameters
// (snelheid, grond, water, voertuig, cutscene), mengt bij elke wissel over een vaste duur per overgang, legt vast welke lagen
// (bovenlijf, ademhaling, blik, lipsync, knipperen) en welke IK per toestand aan staan, en past in een paar getallen voor het netwerk.
// De animatie zelf (clips van het pack of procedurele houdingen) leest het resultaat: state, vorige state, mengfactor, genormaliseerde
// tijd en de gewichten van de loopruimte (blend space).
//
// Samen spelen: alleen state-id, snelheid, richting en genormaliseerde tijd gaan over het netwerk (encodeAnimState, 4 bytes); de rest
// leidt elke speler lokaal af (zie docs/COOP-GAST.md).

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fin = (v, d = 0) => (Number.isFinite(v) ? v : d);

// ---- toestanden ------------------------------------------------------------------------------------
// loop: de clip herhaalt; ik: welke IK als nabewerking aan staat (feet = voeten op de grond, hands = handen aan stuur of stang,
// seat = heup op de zitting); layers: welke lagen in deze toestand mogen (upper = bovenlijf met masker, breath/look/lips/blink additief).
const ALL = { breath: true, look: true, lips: true, blink: true };
export const STATES = {
  idle: { loop: true, ik: { feet: true }, layers: { upper: true, ...ALL } },
  locomotion: { loop: true, ik: { feet: true }, layers: { upper: true, ...ALL }, blend: 'speed' },
  sprint: { loop: true, ik: { feet: true }, layers: { look: true, blink: true, breath: true } },
  start: { loop: false, dur: 0.35, ik: { feet: true }, layers: { upper: true, ...ALL } },
  stop: { loop: false, dur: 0.4, ik: { feet: true }, layers: { upper: true, ...ALL } },
  turn: { loop: false, dur: 0.5, ik: { feet: true }, layers: { upper: true, ...ALL } },
  jump: { loop: false, dur: 0.3, ik: {}, layers: { blink: true } },
  fall: { loop: true, ik: {}, layers: { blink: true } },
  land: { loop: false, dur: 0.3, ik: { feet: true }, layers: { blink: true, breath: true } },
  swim: { loop: true, ik: {}, layers: { look: true, blink: true, breath: true } },
  climb: { loop: true, ik: {}, layers: { blink: true } },
  sit: { loop: true, ik: { seat: true }, layers: { upper: true, ...ALL } },
  drive: { loop: true, ik: { hands: 'wheel', seat: true }, layers: { ...ALL } },
  ride: { loop: true, ik: { hands: 'bars', feet: 'pedals' }, layers: { look: true, blink: true, breath: true, lips: true } },
  enter: { loop: false, dur: 0.8, ik: {}, layers: { blink: true, breath: true } },
  exit: { loop: false, dur: 0.8, ik: { feet: true }, layers: { blink: true, breath: true } },
  knockdown: { loop: false, dur: 2.4, ik: {}, layers: {} },   // de val (UAL Death01, zonder bloed; besluit eigenaar 23-11)
  getup: { loop: false, dur: 1.2, ik: { feet: true }, layers: { blink: true, breath: true } },
  emote: { loop: false, dur: 1.8, ik: { feet: true }, layers: { ...ALL } },
  cutscene: { loop: true, ik: { feet: true }, layers: { upper: true, ...ALL } },
};
export const STATE_IDS = Object.keys(STATES);            // volgorde = netwerk-id; alleen achteraan toevoegen
// Bovenlijflagen (met een botmasker: borst, armen, nek en hoofd; benen en heup blijven van de basislaag).
export const UPPER = ['none', 'carry', 'phone', 'talk', 'gesture', 'wave'];
export const UPPER_MASK = ['Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR'];

// ---- overgangen ------------------------------------------------------------------------------------
// Van boven naar beneden: de eerste die past wint. from '*' = vanuit elke toestand (behalve to zelf). fade = mengduur in seconden; 0 mag
// alleen voor een harde knip (cutscene, of een toestand die zelf een beweging is die op 0 begint). done = de vorige niet-lus-toestand is klaar.
const T = (from, to, when, fade) => ({ from, to, when, fade });
export const TRANSITIONS = [
  T('*', 'cutscene', (p) => p.cutscene, 0),
  T('cutscene', 'idle', (p) => !p.cutscene, 0.3),
  T('*', 'knockdown', (p) => p.knocked && !p.down, 0.12),
  T('knockdown', 'getup', (p, s) => s.done && !p.knocked, 0.3),   // wie uitgeschakeld blijft (dood, opgepakt) blijft liggen
  T('getup', 'idle', (p, s) => s.done, 0.3),
  T('*', 'enter', (p, s) => p.vehicle && !s.inVehicle && !p.seated, 0.2),
  T('enter', 'drive', (p, s) => s.done && p.vehicle === 'car', 0.25),
  T('enter', 'ride', (p, s) => s.done && p.vehicle === 'bike', 0.25),
  T('drive', 'exit', (p) => !p.vehicle, 0.2),
  T('ride', 'exit', (p) => !p.vehicle, 0.2),
  T('exit', 'idle', (p, s) => s.done, 0.3),
  T('*', 'swim', (p) => p.water && !p.vehicle, 0.35),
  T('swim', 'climb', (p) => p.climbing, 0.25),
  T('swim', 'idle', (p) => !p.water, 0.35),
  T('*', 'climb', (p) => p.climbing && !p.water, 0.25),
  T('climb', 'idle', (p) => !p.climbing, 0.3),
  T('*', 'sit', (p) => p.seated && !p.vehicle, 0.5),
  T('sit', 'idle', (p) => !p.seated, 0.5),
  T('*', 'jump', (p) => p.jump && p.grounded, 0.08),
  T('jump', 'fall', (p, s) => s.done, 0.15),
  T('*', 'fall', (p) => !p.grounded && p.vy < -2.5, 0.2),
  T('fall', 'land', (p) => p.grounded, 0.06),
  T('land', 'locomotion', (p, s) => s.done && p.speed > 0.3, 0.2),
  T('land', 'idle', (p, s) => s.done, 0.2),
  T('*', 'emote', (p) => !!p.emote && p.speed < 0.3, 0.25),
  T('emote', 'idle', (p, s) => s.done, 0.3),
  T('locomotion', 'sprint', (p) => p.speed > 6.5, 0.25),
  T('sprint', 'locomotion', (p) => p.speed < 6.0, 0.3),
  T('idle', 'start', (p) => p.speed > 0.3, 0.12),
  T('start', 'locomotion', (p, s) => s.done || p.speed > 2, 0.18),
  T('start', 'idle', (p) => p.speed < 0.1, 0.2),
  T('locomotion', 'stop', (p) => p.speed < 0.15, 0.15),
  T('stop', 'idle', (p, s) => s.done, 0.25),
  T('stop', 'locomotion', (p) => p.speed > 0.4, 0.2),
  T('idle', 'turn', (p) => Math.abs(p.turn) > 1.2 && p.speed < 0.3, 0.15),
  T('turn', 'idle', (p, s) => s.done, 0.2),
  T('turn', 'start', (p) => p.speed > 0.3, 0.15),
];
// Toestanden die een harde knip mogen krijgen (fade 0): een cutscene neemt het beeld over.
const CUT_OK = new Set(['cutscene']);

// Gecompileerd per bron-state (indices), zodat stepAnimState geen strings vergelijkt en niets aanmaakt.
const IDX = Object.fromEntries(STATE_IDS.map((s, i) => [s, i]));
const BY_FROM = STATE_IDS.map((s) => TRANSITIONS.filter((t) => (t.from === '*' ? t.to !== s : t.from === s)).map((t) => ({ to: IDX[t.to], when: t.when, fade: t.fade })));

// Controle op de tabel (voor de test): bestaande toestanden, geen knip zonder reden, elke toestand bereikbaar en weer te verlaten.
export function validateTransitions() {
  const errors = [];
  for (const t of TRANSITIONS) {
    if (t.from !== '*' && !(t.from in STATES)) errors.push(`onbekende bron ${t.from}`);
    if (!(t.to in STATES)) errors.push(`onbekend doel ${t.to}`);
    if (!(t.fade > 0) && !CUT_OK.has(t.to)) errors.push(`overgang ${t.from} -> ${t.to} zonder menging`);
  }
  for (const s of STATE_IDS) {
    if (s !== 'idle' && !TRANSITIONS.some((t) => t.to === s)) errors.push(`${s} is onbereikbaar`);
    if (!BY_FROM[IDX[s]].length) errors.push(`${s} heeft geen uitweg`);
  }
  return errors;
}

// ---- runtime ---------------------------------------------------------------------------------------
export function createAnimState(state = 'idle') {
  return {
    s: IDX[state] ?? 0, prev: IDX[state] ?? 0, k: 1, fade: 0,   // k: 0..1 van vorige naar huidige
    t: 0, nt: 0, done: false,                                    // seconden in de state, genormaliseerde tijd (0..1)
    inVehicle: false, upper: 0, upperW: 0, upperPrev: 0,
    speed: 0, dir: 0, tier: 0, acc: 0, skip: 0,
    blend: { idle: 1, walk: 0, run: 0, sprint: 0 },
  };
}
export const stateName = (sm) => STATE_IDS[sm.s];

// Loopruimte (1D blend space op snelheid, m/s): idle, walk, run en sprint, samen 1, lineair tussen de ankers.
export const BLEND_ANCHORS = [0, 1.4, 4.5, 7.5];
export function speedBlend(speed, out) {
  const v = Math.max(0, fin(speed));
  out.idle = 0; out.walk = 0; out.run = 0; out.sprint = 0;
  const a = BLEND_ANCHORS;
  if (v <= a[1]) { const k = v / a[1]; out.idle = 1 - k; out.walk = k; }
  else if (v <= a[2]) { const k = (v - a[1]) / (a[2] - a[1]); out.walk = 1 - k; out.run = k; }
  else if (v <= a[3]) { const k = (v - a[2]) / (a[3] - a[2]); out.run = 1 - k; out.sprint = k; }
  else out.sprint = 1;
  return out;
}

// Eén stap. p = parameters van deze mens nu: { speed, dir, turn, grounded, vy, jump, water, climbing, seated, vehicle ('car'|'bike'|null),
// cutscene, knocked, emote }. Geeft true als de state wisselde. Afstandstrap sm.tier (0 dichtbij, 1 middel, 2 ver): ver telt de
// machine maar elke 4e aanroep (de tijd loopt door), zonder lagen; de beller zet de tier.
export function stepAnimState(sm, p, dt) {
  const step = clamp(fin(dt), 0, 0.25);
  if (sm.tier >= 2) { sm.acc += step; if (++sm.skip % 4) return false; }
  const d = sm.tier >= 2 ? sm.acc : step;
  sm.acc = 0;
  sm.speed = fin(p.speed); sm.dir = fin(p.dir);
  sm.t += d;
  const st = STATES[STATE_IDS[sm.s]];
  sm.nt = st.loop ? (st.dur ? (sm.t / st.dur) % 1 : sm.nt) : Math.min(1, sm.t / (st.dur || 1));
  sm.done = !st.loop && sm.t >= (st.dur || 1);
  if (sm.fade > 0) sm.k = Math.min(1, sm.k + d / sm.fade); else sm.k = 1;
  speedBlend(sm.speed, sm.blend);
  // het bovenlijf mengt met zijn eigen duur (0,25 s)
  sm.upperW = Math.min(1, sm.upperW + d / 0.25);
  const list = BY_FROM[sm.s];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (!t.when(p, sm)) continue;
    sm.prev = sm.s; sm.s = t.to; sm.fade = t.fade; sm.k = t.fade > 0 ? 0 : 1;
    sm.t = 0; sm.nt = 0; sm.done = false;
    if (t.to === IDX.drive || t.to === IDX.ride) sm.inVehicle = true;
    else if (t.to === IDX.exit || t.to === IDX.idle || t.to === IDX.knockdown || t.to === IDX.swim) sm.inVehicle = false;
    return true;
  }
  return false;
}

// Bovenlijflaag: carry, phone, talk, gesture of wave (of 'none'); mengt in 0,25 s. Alleen waar de huidige state het toestaat.
export function setUpperLayer(sm, name) {
  const i = Math.max(0, UPPER.indexOf(name));
  if (i === sm.upper) return;
  sm.upperPrev = sm.upper; sm.upper = i; sm.upperW = 0;
}

// Gewichten van de lagen nu (out: { upper, breath, look, lips, blink }): 0 als de state de laag niet toestaat, ver weg (tier 2) alles 0.
export function layerWeights(sm, out) {
  const st = STATES[STATE_IDS[sm.s]], L = st.layers, far = sm.tier >= 2;
  const up = sm.upper ? sm.upperW : 1 - sm.upperW;
  out.upper = far || !L.upper || !sm.upper ? (sm.upperPrev && L.upper && !far ? 1 - sm.upperW : 0) : up;
  out.breath = !far && L.breath ? 1 : 0;
  out.look = !far && sm.tier < 2 && L.look ? 1 : 0;
  out.lips = !far && sm.tier === 0 && L.lips ? 1 : 0;
  out.blink = !far && L.blink ? 1 : 0;
  return out;
}

// Welke IK als nabewerking: alleen dichtbij (tier 0) en zoals de state het vastlegt. Tijdens een wissel telt de nieuwe state.
export function ikFor(sm, out) {
  const ik = STATES[STATE_IDS[sm.s]].ik, near = sm.tier === 0;
  out.feet = near && !!ik.feet; out.feetMode = near && ik.feet ? (ik.feet === true ? 'ground' : ik.feet) : null;
  out.hands = near && ik.hands ? ik.hands : null;
  out.seat = near && !!ik.seat;
  return out;
}

// ---- netwerk ---------------------------------------------------------------------------------------
// Vier bytes: state-id, snelheid (0..12,75 m/s in stappen van 0,05), richting (-pi..pi in 256 stappen) en genormaliseerde tijd (0..1 in 256).
export function encodeAnimState(sm) {
  return [sm.s & 255, clamp(Math.round(fin(sm.speed) * 20), 0, 255), clamp(Math.round(((fin(sm.dir) + Math.PI) / (2 * Math.PI)) * 255), 0, 255), clamp(Math.round(fin(sm.nt) * 255), 0, 255)];
}
// Zet een ontvangen toestand op een lokale machine: een nieuwe state-id mengt met de duur van die overgang (of 0,2 s als er geen is),
// zodat een gast nooit een sprong ziet; de tijd springt alleen als hij meer dan een kwart cyclus afwijkt.
export function applyRemoteAnimState(sm, bytes) {
  if (!bytes || bytes.length < 4) return false;
  const s = bytes[0] < STATE_IDS.length ? bytes[0] : 0;
  sm.speed = bytes[1] / 20;
  sm.dir = (bytes[2] / 255) * 2 * Math.PI - Math.PI;
  const nt = bytes[3] / 255;
  speedBlend(sm.speed, sm.blend);
  if (s !== sm.s) {
    const tr = TRANSITIONS.find((t) => t.to === STATE_IDS[s] && (t.from === '*' || t.from === STATE_IDS[sm.s]));
    sm.prev = sm.s; sm.s = s; sm.fade = tr ? tr.fade : 0.2; sm.k = sm.fade > 0 ? 0 : 1; sm.t = 0;
  }
  const diff = Math.abs(nt - sm.nt);
  if (Math.min(diff, 1 - diff) > 0.25) sm.nt = nt;
  return true;
}
