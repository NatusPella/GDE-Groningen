// Cutscenes as data (#136), played by cutscenehost.js through cutscript.js.
// Only staging lives here: the spoken lines come from the story (script.json)
// and are referenced by number (L0 = first line, 'L5+0.4' = 0.4 s after it
// starts). Coordinates are local to the player: f forward, s left, h up (m).

const BUURVROUW = { shirt: 0x7a3f8f, skin: 0xc9a27a, variant: 'female', hairStyle: 'curly', seed: 198 };
const FIETSER_A = { shirt: 0xe07b1f, skin: 0xd9b48f, variant: 'male', seed: 137 };
const FIETSER_B = { shirt: 0x2e7d4f, skin: 0xc9a27a, variant: 'female', seed: 164 };

// M00, the opening of the new story (C00.1-C00.3, regie in script.json), in three acts that story.js
// plays one after the other (openingActs): 1. the trailer parody in the street (cyclists, a gull, a
// postman) that cranes up towards the attic window; 2. the kitchen of the Oosterparkwijk at dawn
// (the set of introkitchen3d.js): Rikus on the radio, Tessa over the loan papers, Tammo with the coffee,
// the cat on the bank letter, the plan said out loud, the phone that buzzes; 3. moving day: the
// Escapade with its mattress, "Rijden, niet praten", and the car limps off down the street.
// Line numbers are local to the act (L0 = first line of the act).
const POSTBODE = { shirt: 0xd9742a, skin: 0xd9b48f, variant: 'male', seed: 211 };

const STREET_LIFE = {
  actors: {
    fietser: { look: FIETSER_A, at: [-30, -4.2], face: 0, anim: 'idle' },
    fietsster: { look: FIETSER_B, at: [-34, -3.4], face: 0, anim: 'idle' },
    buurvrouw: { look: BUURVROUW, at: [-14, -6], face: 20, anim: 'phone' },
  },
  props: {
    fiets1: { kind: 'fiets', at: [-30, -4.2, 0], face: 0 },
    fiets2: { kind: 'fiets', at: [-34, -3.4, 0], face: 0 },
  },
  cues: [
    { t: 0, prop: 'fiets1', path: [[-30, -4.2], [900, -4.2]], speed: 5 },
    { t: 0, prop: 'fiets2', path: [[-34, -3.4], [900, -3.4]], speed: 5 },
    { t: 0, actor: 'fietser', walk: [[900, -4.2]], speed: 5, ride: true },
    { t: 0, actor: 'fietsster', walk: [[900, -3.4]], speed: 5, ride: true },
    { t: 0, actor: 'buurvrouw', walk: [[-3, -6], [6, -5.2], [40, -5.2]], speed: 1.2 },
  ],
};

// act 1: the trailer in the street (C00.1: three lines of Rikus on the radio)
const ACT_TRAILER = {
  id: 'story-opening-trailer',
  actors: {
    ...STREET_LIFE.actors,
    postbode: { look: POSTBODE, at: [-8, 7], face: 10, anim: 'idle' },
  },
  props: {
    ...STREET_LIFE.props,
    escapade: { kind: 'auto', at: [8, 4.5], face: 80 },
    matras: { kind: 'matras', at: [8, 4.5, 1.45], face: 80 },
    tas: { kind: 'tas', at: [-8, 7, 1] },
    duif: { kind: 'duif', at: [-20, 8, 8], face: 0 },
  },
  cues: [
    ...STREET_LIFE.cues,
    { t: 0.5, prop: 'duif', path: [[-20, 8, 8], [-4, 3, 5.5], [6, -2, 3.2], [30, -9, 14]], speed: 6 },
    // the postman walks the street with his bag, waves at the neighbour and goes on
    { t: 0, actor: 'postbode', carry: 'tas' },
    { t: 0.2, actor: 'postbode', walk: [[-2, 7.2], [3, 7.6]], speed: 1.3 },
    { t: 'L1', actor: 'postbode', face: 'actor:buurvrouw' },
    { t: 'L1+0.3', actor: 'postbode', anim: 'wave' },
    { t: 'L2', actor: 'postbode', walk: [[14, 7.8]], speed: 1.4 },
  ],
  fx: [
    { t: 1.2, fx: 'sfx', kind: 'bell' },
    { t: 'L1+0.2', fx: 'sfx', kind: 'caw' },
  ],
  shots: [
    // a crane over the street, a low cut onto the bikes, the gull, the postman, then up the facade
    { t: 0, shot: 'orbit', target: 'mid:postbode,escapade', radius: 17, start: 200, sweep: 55, h0: 10, h1: 4, fov: 42, look: 'escapade' },
    { t: 'L0+1.8', shot: 'dolly', from: [-7, -7.5, 0.5], to: [6, -7, 0.85], look: 'fiets1@0.9', fov: 32 },
    { t: 'L1', shot: 'cut', at: [6, 3, 7], look: 'duif', fov: 38, shake: 0.03 },
    { t: 'L1+2.2', shot: 'dolly', from: [-1, 3.6, 1.2], to: [3.5, 4.4, 1.55], look: 'postbode@1.3', fov: 36 },
    { t: 'L2', shot: 'dolly', from: [-3, -6.4, 1.2], to: [0, -7.2, 1.9], look: 'escapade@1.1', fov: 38 },
    { t: 'L2+1.0', shot: 'dolly', from: [-3, -7.2, 1.6], to: [-3, -7.2, 18], look: [8, 4.5, 24], fov: 46 },
  ],
};

// act 2: the kitchen (C00.2: two lines of Rikus, then Tessa and Tammo; line 13 states the goal)
const ACT_KEUKEN = {
  id: 'story-opening-keuken',
  set: 'keuken',
  actors: {
    tessa: { look: 'anita', at: [-0.82, 0], face: 0, anim: 'look', sit: 0.46, speaker: ['Anita', 'Tessa'], gaze: [-0.3, 0.06, 0.8] },
    tammo: { look: 'tammo', at: [1.3, 2.1], face: -90, anim: 'idle', speaker: 'Tammo', gaze: 'speaker' },
  },
  props: {
    kat: { kind: 'kat', at: [-2.0, -0.55, 1.05], face: 0 },
  },
  fx: [
    { t: 0, fx: 'pulse', dur: 12 },
    { t: 0.8, fx: 'naam', text: 'Tessa', dur: 2.6 },
    { t: 'L2-3.0', fx: 'naam', text: 'Tammo', dur: 2.6 },
    { t: 'L2-3.6', fx: 'sfx', kind: 'door_open' },
    { t: 'L2-3.6', fx: 'door', open: 1, dur: 0.9 },
    { t: 'L2-3.6', fx: 'cups', actor: 'tammo', on: true },
    { t: 'L2-0.2', fx: 'cups', actor: 'tammo', on: false },
    { t: 'L2-0.2', fx: 'tablecups', on: true },
    { t: 'L20+0.6', fx: 'buzz', dur: 3.2 },
    { t: 'L22+1.9', fx: 'sfx', kind: 'door_open' },
  ],
  cues: [
    // Tessa studies her papers; the radio murmurs
    { t: 'L1+1', actor: 'tessa', anim: 'lean' },
    // Tammo comes in from the hall with two coffees and sits down
    { t: 'L2-3.2', actor: 'tammo', walk: [[1.3, 1.3], [1.0, 0.5], [0.82, 0.02]], speed: 1.3 },
    { t: 'L2-0.4', actor: 'tammo', face: 180 },
    { t: 'L2+0.9', actor: 'tammo', sit: true },
    { t: 'L2-1.2', actor: 'tessa', gaze: 'actor:tammo' },
    { t: 'L2+0.1', actor: 'tessa', anim: 'idle' },
    { t: 'L3', actor: 'tessa', anim: 'shrug' },
    { t: 'L4', actor: 'tammo', anim: 'shrug' },
    // the cat crosses the table and sits on the bank letter
    { t: 'L5-0.3', prop: 'kat', path: [[-2.0, -0.55, 1.05], [-1.3, -0.55, 0.95], [-0.75, -0.5, 0.77], [-0.42, -0.22, 0.775]], speed: 2.4 },
    { t: 'L5', actor: 'tessa', face: 'prop:kat' },
    { t: 'L5', actor: 'tessa', anim: 'point' },
    { t: 'L5+2.4', actor: 'tessa', face: 0 },
    { t: 'L5+2.4', actor: 'tessa', anim: 'shake' },
    { t: 'L6', actor: 'tessa', anim: 'lean' },
    { t: 'L7', actor: 'tammo', anim: 'nod' },
    { t: 'L8', actor: 'tessa', anim: 'look' },
    { t: 'L9', actor: 'tammo', anim: 'lean' },
    { t: 'L10', actor: 'tessa', anim: 'idle' },
    { t: 'L10+2.0', actor: 'tessa', gaze: [-2.2, 0, 1.6] },
    { t: 'L10+2.0', actor: 'tessa', anim: 'look' },
    { t: 'L11', actor: 'tessa', gaze: 'actor:tammo' },
    { t: 'L11', actor: 'tessa', anim: 'lean' },
    { t: 'L12', actor: 'tammo', anim: 'nod' },
    // the goal said out loud
    { t: 'L13', actor: 'tessa', anim: 'point' },
    { t: 'L13+3', actor: 'tessa', anim: 'talk' },
    { t: 'L14', actor: 'tammo', anim: 'look' },
    { t: 'L15', actor: 'tessa', anim: 'laugh' },
    { t: 'L16', actor: 'tammo', anim: 'shrug' },
    { t: 'L17', actor: 'tessa', anim: 'point' },
    { t: 'L18', actor: 'tammo', anim: 'shake' },
    { t: 'L19', actor: 'tessa', anim: 'lean' },
    { t: 'L20', actor: 'tammo', anim: 'nod' },
    // the phone buzzes: a glance, then "Kom. Werk." and out through the door
    { t: 'L20+0.9', actor: 'tessa', anim: 'phone' },
    { t: 'L21+1.6', actor: 'tessa', anim: 'idle' },
    { t: 'L22+0.2', actor: 'tessa', sit: false },
    { t: 'L22+0.3', actor: 'tessa', walk: [[-0.9, 0.9], [0.9, 1.3], [1.3, 2.3]], speed: 1.8 },
    { t: 'L22+0.8', actor: 'tammo', sit: false },
    { t: 'L22+0.9', actor: 'tammo', walk: [[1.0, 0.9], [1.3, 1.5], [1.3, 2.5]], speed: 1.7 },
  ],
  shots: [
    // the dawn through the window, past Tessa; the radio; Tessa at her papers
    { t: 0, shot: 'dolly', from: [1.9, 1.2, 1.7], to: [1.0, 0.9, 1.5], look: [-2.1, 0.1, 1.5], fov: 50 },
    { t: 'L0+2.0', shot: 'dolly', from: [-1.4, -0.6, 1.25], to: [-1.65, 0.1, 1.2], look: [-2.06, 0.62, 1.15], fov: 30 },
    { t: 'L0+4.0', shot: 'dolly', from: [0.2, -0.9, 1.6], to: [-0.1, -0.7, 1.45], look: [-0.5, 0, 0.85], fov: 36 },
    { t: 'L1', shot: 'cut', at: [-0.6, -1.2, 1.3], look: 'kat@0.15', fov: 28 },
    { t: 'L2-3.8', shot: 'dolly', from: [-0.8, -1.2, 1.7], to: [-0.2, -1.0, 1.6], look: [1.3, 1.7, 1.2], fov: 44 },
    { t: 'L2-1.6', shot: 'dolly', from: [-0.6, -0.8, 1.55], to: [-0.2, -0.5, 1.4], look: 'tammo@1.3', fov: 40 },
    { t: 'L2+0.9', shot: 'cut', at: [-0.3, -1.1, 1.5], look: 'mid:tammo,tessa@1.2', fov: 38 },
    // the talk: closer on whoever speaks, the cat on the letter, the drawing
    { t: 'L3', shot: 'cut', at: [0.3, 0.5, 1.4], look: 'tessa@1.15', fov: 28 },
    { t: 'L4', shot: 'cut', at: [-0.35, -0.6, 1.4], look: 'tammo@1.2', fov: 28 },
    { t: 'L5', shot: 'dolly', from: [-0.9, -1.2, 1.35], to: [-0.7, -0.9, 1.2], look: 'kat@0.15', fov: 30 },
    { t: 'L5+2.4', shot: 'cut', at: [0.4, 0.2, 1.35], look: 'mid:tessa,kat@1.0', fov: 34 },
    { t: 'L6', shot: 'dolly', from: [-0.9, -0.6, 1.5], to: [-0.45, -0.1, 1.15], look: [-0.28, 0.06, 0.78], fov: 34 },
    { t: 'L7', shot: 'cut', at: [-0.4, 0.7, 1.4], look: 'tammo@1.2', fov: 28 },
    { t: 'L8', shot: 'cut', at: [0.6, -0.8, 1.45], look: 'tessa@1.15', fov: 26 },
    { t: 'L9', shot: 'dolly', from: [-0.5, 0.5, 1.35], to: [-0.1, 0.3, 1.3], look: 'tammo@1.2', fov: 30 },
    { t: 'L10', shot: 'dolly', from: [0.7, -0.6, 1.35], to: [0.3, -0.4, 1.3], look: 'tessa@1.15', fov: 24 },
    { t: 'L11', shot: 'orbit', target: 'mid:tammo,tessa@1.2', radius: 1.7, start: 90, sweep: -50, h0: 1.5, h1: 1.6, fov: 44 },
    // the beat: the plan, close on the drawing, then on Tessa
    { t: 'L13', shot: 'dolly', from: [-0.85, -0.1, 1.1], to: [-0.55, 0.15, 1.0], look: [-0.28, 0.06, 0.78], fov: 26 },
    { t: 'L13+2.8', shot: 'cut', at: [0.5, 0.3, 1.35], look: 'tessa@1.15', fov: 24 },
    { t: 'L13+6.0', shot: 'dolly', from: [0.5, 0.3, 1.35], to: [0.3, 0.2, 1.3], look: 'tessa@1.15', fov: 22 },
    { t: 'L14', shot: 'dolly', from: [-0.5, 0.5, 1.3], to: [-0.3, 0.4, 1.28], look: 'tammo@1.2', fov: 24 },
    { t: 'L15', shot: 'cut', at: [0.6, -0.5, 1.3], look: 'tessa@1.15', fov: 26 },
    { t: 'L16', shot: 'cut', at: [0.0, -1.45, 1.4], look: 'mid:tammo,tessa@1.1', fov: 46 },
    { t: 'L17', shot: 'dolly', from: [0.6, -0.6, 1.4], to: [0.35, -0.4, 1.32], look: 'tessa@1.15', fov: 26 },
    { t: 'L18', shot: 'cut', at: [-0.4, 0.55, 1.35], look: 'tammo@1.2', fov: 30 },
    { t: 'L19', shot: 'cut', at: [0.5, 0.2, 1.4], look: 'tessa@1.15', fov: 26 },
    { t: 'L20', shot: 'dolly', from: [-0.5, 0.6, 1.3], to: [-0.2, 0.45, 1.27], look: 'tammo@1.2', fov: 22 },
    { t: 'L20+0.6', shot: 'cut', at: [-0.1, -0.7, 1.25], look: [-0.46, -0.3, 0.78], fov: 24 },
    { t: 'L21', shot: 'dolly', from: [0.5, -0.4, 1.4], to: [0.2, -0.3, 1.3], look: 'tessa@1.15', fov: 24 },
    { t: 'L22', shot: 'cut', at: [1.7, -1.2, 1.7], look: 'mid:tammo,tessa@1.0', fov: 52 },
    { t: 'L22+1.3', shot: 'follow', target: 'tessa', dist: 2.4, side: -0.6, h: 1.55, fov: 44 },
    { t: 'L22+2.6', shot: 'dolly', from: [-1.0, -0.8, 1.4], to: [-1.0, -0.8, 1.6], look: [1.3, 1.7, 1.2], fov: 42 },
  ],
};

// act 3: moving day (C00.3: five lines); the first goal is plain: money for the entry, a job
const ACT_VERHUISDAG = {
  id: 'story-opening-verhuisdag',
  actors: {
    tammo: { look: 'tammo', at: [-4, -5.5], face: 20, anim: 'carry', speaker: 'Tammo', gaze: 'speaker' },
    tessa: { look: 'anita', at: [6.2, 1.9], face: -30, anim: 'idle', speaker: ['Anita', 'Tessa'], gaze: 'speaker' },
    buurvrouw: STREET_LIFE.actors.buurvrouw,
    fietser: { look: FIETSER_A, at: [-60, -4.2], face: 0, anim: 'ride' },
  },
  props: {
    escapade: { kind: 'auto', at: [8, 4.5], face: 80 },
    matras: { kind: 'matras', at: [8, 4.5, 1.45], face: 80 },
    koffer: { kind: 'koffer', at: [-4, -5.5, 0] },
    plan: { kind: 'klembord', at: [6.2, 1.9, 1] },
    fiets1: { kind: 'fiets', at: [-60, -4.2, 0], face: 0 },
  },
  fx: [
    { t: 'L2+3.0', fx: 'sfx', kind: 'bell' },
    { t: 'L4+2.4', fx: 'sfx', kind: 'horn' },
  ],
  cues: [
    { t: 0, prop: 'fiets1', path: [[-60, -4.2], [900, -4.2]], speed: 5 },
    { t: 0, actor: 'fietser', walk: [[900, -4.2]], speed: 5, ride: true },
    { t: 0, actor: 'buurvrouw', walk: [[-3, -6], [6, -5.2], [40, -5.2]], speed: 1.2 },
    { t: 0, prop: 'escapade', bob: 0.008 },
    { t: 0, actor: 'tessa', carry: 'plan' },
    { t: 0, actor: 'tammo', carry: 'koffer' },
    // Tammo drags the suitcase up the street, stops by the car with empty pockets
    { t: 0, actor: 'tammo', walk: [[1.5, -3.5], [5.3, -1.0]], speed: 1.8 },
    { t: 'L0+2.6', actor: 'tammo', face: 'actor:tessa' },
    { t: 'L0+2.8', actor: 'tammo', anim: 'hips' },
    { t: 'L1', actor: 'tessa', face: 'actor:tammo' },
    { t: 'L1', actor: 'tessa', anim: 'shake' },
    { t: 'L1+1.3', actor: 'tessa', anim: 'talk' },
    { t: 'L2', actor: 'tessa', anim: 'point' },
    { t: 'L2+4', actor: 'tessa', anim: 'talk' },
    { t: 'L3', actor: 'tammo', anim: 'shrug' },
    { t: 'L3+0.9', actor: 'tammo', drop: 'koffer' },
    { t: 'L4', actor: 'tessa', anim: 'hips' },
    { t: 'L4+0.7', actor: 'tessa', anim: 'point' },
    { t: 'L4+0.8', actor: 'tammo', anim: 'nod' },
    // "Rijden, niet praten": in, and the Escapade limps off on its flat tyre
    { t: 'L4+1.6', prop: 'escapade', bob: 0.05 },
    { t: 'L4+1.9', actor: 'tessa', hide: true },
    { t: 'L4+2.0', actor: 'tammo', hide: true },
    { t: 'L4+2.6', prop: 'escapade', path: [[8, 4.5, 0], [9.2, 10, 0], [13, 26, 0], [22, 62, 0]], speed: 4.5 },
  ],
  shots: [
    // who and where: the street, the Escapade with the mattress on the roof
    { t: 0, shot: 'dolly', from: [-6, -9, 7], to: [-1, -6.5, 2.4], look: 'escapade@1.2', fov: 44 },
    { t: 'L0+0.4', shot: 'follow', target: 'tammo', dist: 3.0, side: 0.9, h: 1.6, fov: 42 },
    { t: 'L1', shot: 'cut', at: [3.4, -3.8, 1.5], look: 'mid:tammo,tessa@1.3', fov: 42 },
    { t: 'L2', shot: 'dolly', from: [4.5, -0.2, 1.7], to: [5.8, 1.2, 1.35], look: 'tessa@1.2', fov: 30 },
    { t: 'L2+3.5', shot: 'cut', at: [5.0, 0.4, 1.5], look: 'plan@0', fov: 24 },
    { t: 'L3', shot: 'cut', at: [7.2, -2.8, 1.5], look: 'tammo@1.2', fov: 26 },
    { t: 'L4', shot: 'cut', at: [3.9, 3.6, 1.5], look: 'tessa@1.2', fov: 28 },
    { t: 'L4+2.0', shot: 'dolly', from: [-1, 6.5, 3.0], to: [2, 5.5, 2.6], look: 'escapade@1.0', fov: 40 },
    { t: 'L4+3.4', shot: 'dolly', from: [3, 9, 2.0], to: [5, 17, 3.4], look: 'escapade@1.0', fov: 36 },
  ],
};

export const OPENING_ACTS = [ACT_TRAILER, ACT_KEUKEN, ACT_VERHUISDAG];
// the story line each act starts at (C00.1: 0-2, C00.2: 3-25, C00.3: 26-30) and the silence around it
const ACT_SPLIT = [0, 3, 26, Infinity];
const ACT_LEAD = [1.2, 1.0, 1.0];
const ACT_TAIL = [2.6, 4.2, 4.6];

// The opening lines (story.js timing) cut into the acts, each rebased to start at its own zero.
export function openingActs(lines) {
  return OPENING_ACTS.map((def, i) => {
    const part = lines.slice(ACT_SPLIT[i], ACT_SPLIT[i + 1]);
    if (!part.length) return null;
    const shift = ACT_LEAD[i] - part[0].at;
    const rebased = part.map((l) => ({ ...l, at: l.at + shift }));
    const last = rebased[rebased.length - 1];
    return { def, lines: rebased, duration: last.at + last.dur + ACT_TAIL[i] };
  }).filter(Boolean);
}

// End card of a part ("Wordt vervolgd…", story.js playEndCard): Tammo and Tessa
// watch a van drive off with the sun low, the gull on the lamp post.
export const END_CARD = {
  id: 'story-card',
  actors: {
    tammo: { look: 'tammo', at: [1.2, 0.9], face: 0, anim: 'look', gaze: 'camera' },
    tessa: { look: 'anita', at: [1.2, -0.7], face: 0, anim: 'hips' },
  },
  props: {
    bus: { kind: 'bestelbus', at: [8, -2.2, 0], face: 0 },
    duif: { kind: 'duif', at: [6, 6, 7], face: 200 },
  },
  cues: [
    { t: 0.4, prop: 'bus', path: [[8, -2.2], [60, -2.2]], speed: 4.5 },
    { t: 1.5, prop: 'duif', path: [[6, 6, 7], [28, 11, 12]], speed: 5 },
    { t: 1.6, actor: 'tammo', anim: 'wave' },
    { t: 3.4, actor: 'tessa', anim: 'shrug' },
    { t: 4.6, actor: 'tammo', anim: 'nod' },
  ],
  shots: [
    { t: 0, shot: 'dolly', from: [-5, 3.4, 1.2], to: [-3, 2.4, 1.5], look: 'mid:tammo,tessa@1.4', fov: 40 },
    { t: 2.4, shot: 'orbit', target: 'mid:tammo,tessa', radius: 6, start: 150, sweep: -60, h0: 1.5, h1: 2.6, look: 'mid:tammo,tessa@1.4', fov: 36 },
  ],
};



// --- evenings at home (the flat) ---------------------------------------------
// story.js story-wait and storyeikea.js story-eikea used to be two people
// standing in the flat while subtitles ran. The number of lines differs per
// step, so the staging is generated from the lines: every line gets a gesture
// for its speaker and a reaction for the other, now and then someone crosses the
// room, and the camera changes shot with every line.

const FLAT_VARIANTS = {
  // assembling the furniture: boxes, a manual, a shelf going up
  eikea: {
    props: { doos1: { kind: 'doos', at: [2.4, -2.2, 0] }, doos2: { kind: 'doos', at: [2.9, -1.6, 0] }, handleiding: { kind: 'bord', at: [0.6, -1.9, 0], face: 200 }, matras: { kind: 'matras', at: [-1.8, 2.2, 0.25], face: 90, hidden: true } },
    open: [{ actor: 'tessa', carry: 'handleiding' }, { actor: 'tammo', carry: 'doos1' }],
    spots: { tammo: [[1.4, 1.2], [2.6, -0.4], [0.4, 2.0]], tessa: [[1.0, -1.1], [0.2, -2.2], [1.6, 0.2]] },
    gestures: { tammo: ['carry', 'shrug', 'talk', 'hips'], tessa: ['point', 'talk', 'hips', 'look'] },
    finale: [{ prop: 'matras', show: true }],
  },
  // waiting for midnight: pacing, the radio on low, a phone
  wachten: {
    props: { radio: { kind: 'radio', at: [-2.6, 2.4, 0.5], face: 330 }, koffer: { kind: 'koffer', at: [2.8, -2.6, 0], face: 40 } },
    open: [{ actor: 'tessa', anim: 'phone' }, { prop: 'radio', bob: 0.01 }],
    spots: { tammo: [[1.6, 1.4], [0.2, 2.6], [2.4, 0.4]], tessa: [[0.8, -1.4], [1.8, -2.4], [-0.6, -0.8]] },
    gestures: { tammo: ['hips', 'talk', 'shrug', 'look'], tessa: ['phone', 'talk', 'lean', 'look'] },
    finale: [],
  },
  // a quiet evening: the radio, a ball from the freezer, bedtime
  avond: {
    props: { radio: { kind: 'radio', at: [-2.4, 2.6, 0.5], face: 330 }, bal: { kind: 'bal', at: [1.4, -2.4, 0.9] } },
    open: [{ actor: 'tessa', carry: 'bal' }, { prop: 'radio', bob: 0.01 }],
    spots: { tammo: [[1.6, 1.2], [0.4, 2.2], [2.2, 0.2]], tessa: [[1.0, -1.2], [2.0, -2.2], [-0.4, -2.4]] },
    gestures: { tammo: ['talk', 'shrug', 'look', 'hips'], tessa: ['talk', 'laugh', 'lean', 'point'] },
    finale: [],
  },
};

const WHO_ACTOR = { Tammo: 'tammo', Anita: 'tessa', Tessa: 'tessa' };

export function flatScene(variant, lines) {
  const V = FLAT_VARIANTS[variant] || FLAT_VARIANTS.wachten;
  const n = lines.length;
  const sp = V.spots;
  const actors = {
    tammo: { look: 'tammo', at: sp.tammo[0], face: 200, anim: V.gestures.tammo[3], speaker: 'Tammo', gaze: 'speaker' },
    tessa: { look: 'anita', at: sp.tessa[0], face: 160, anim: 'look', speaker: ['Anita', 'Tessa'], gaze: 'speaker' },
  };
  const cues = [], shots = [];
  for (const o of V.open) cues.push({ t: 0, ...o });
  const at = { tammo: 0, tessa: 0 };
  const gi = { tammo: 0, tessa: 0 };
  lines.forEach((l, i) => {
    const me = WHO_ACTOR[l.speaker], other = me === 'tessa' ? 'tammo' : 'tessa';
    const t = `L${i}`;
    if (me) {
      cues.push({ t, actor: me, anim: V.gestures[me][gi[me]++ % V.gestures[me].length] });
      cues.push({ t, actor: other, anim: i % 2 ? 'nod' : 'look' });
      cues.push({ t, actor: other, face: 'actor:' + me });
    } else if (l.speaker && l.speaker !== 'Rikus') {
      // a voice on the phone (Henk, Sjabbe, Bert, the Torenwachter): Tessa holds it, Tammo leans in to listen
      cues.push({ t, actor: 'tessa', anim: 'phone' });
      cues.push({ t, actor: 'tammo', face: 'actor:tessa' });
      cues.push({ t: `${t}+0.5`, actor: 'tammo', anim: i % 2 ? 'look' : 'nod' });
    }
    // every fourth line someone crosses the room, and looks back at the other
    if (i % 4 === 3) {
      const who = i % 8 === 3 ? 'tessa' : 'tammo';
      const next = ++at[who] % sp[who].length;
      cues.push({ t: `${t}+0.4`, actor: who, walk: [sp[who][next]], speed: 1.3 });
      cues.push({ t: `${t}+0.4`, actor: who === 'tessa' ? 'tammo' : 'tessa', face: 'actor:' + who });
    }
  });
  if (n) for (const f of V.finale) cues.push({ t: `L${n - 1}`, ...f });
  // establishing shot, then a different frame with every line
  shots.push({ t: 0, shot: 'orbit', target: 'mid:tammo,tessa@1.2', radius: 5, start: 120, sweep: 50, h0: 2.2, h1: 1.8, look: 'mid:tammo,tessa@1.2', fov: 46 });
  lines.forEach((l, i) => {
    const t = `L${i}`;
    switch (i % 4) {
      case 0: shots.push({ t, shot: 'cut', at: [-1.2, 0.2, 1.7], look: WHO_ACTOR[l.speaker] ? 'mid:tammo,tessa@1.2' : 'tessa@1.5', fov: WHO_ACTOR[l.speaker] ? 50 : 34 }); break;
      case 1: shots.push({ t, shot: 'dolly', from: [3.3, -0.4, 1.5], to: [2.6, -0.3, 1.5], look: 'speaker', fov: 32 }); break;
      case 2: shots.push({ t, shot: 'orbit', target: 'mid:tammo,tessa@1.2', radius: 4.2, start: 250, sweep: -40, h0: 1.5, h1: 1.9, look: 'speaker', fov: 40 }); break;
      default: shots.push({ t, shot: 'cut', at: [-1.4, 1.8, 1.45], look: 'speaker', fov: 30 });
    }
  });
  return { id: 'story-' + variant, actors, props: V.props, cues, shots };
}

