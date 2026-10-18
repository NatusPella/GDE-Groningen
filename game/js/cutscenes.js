// Cutscenes as data (#136), played by cutscenehost.js through cutscript.js.
// Only staging lives here: the spoken lines come from the story (script.json)
// and are referenced by number (L0 = first line, 'L5+0.4' = 0.4 s after it
// starts). Coordinates are local to the player: f forward, s left, h up (m).

const BUURVROUW = { shirt: 0x7a3f8f, skin: 0xc9a27a, variant: 'female', hairStyle: 'curly', seed: 198 };
const FIETSER_A = { shirt: 0xe07b1f, skin: 0xd9b48f, variant: 'male', seed: 137 };
const FIETSER_B = { shirt: 0x2e7d4f, skin: 0xc9a27a, variant: 'female', seed: 164 };

// M00, the opening of the new story (C00.1-C00.3, regie in script.json): the
// trailer parody with cyclists and a gull, then moving day in the street in
// front of the new home: Tessa with the drawing of the Fjord Frituur beside
// the radio and the Escapade with its flat tyre, Tammo arriving with a box,
// a neighbour passing by, and the matras going on the roof for Paddepoel.
export const OPENING = {
  id: 'story-opening',
  actors: {
    tammo: { look: 'tammo', at: [-9, 7], face: 300, anim: 'phone', speaker: 'Tammo', gaze: 'speaker' },
    tessa: { look: 'anita', at: [1.6, -1.4], face: 70, anim: 'look', speaker: ['Anita', 'Tessa'], gaze: 'speaker' },
    buurvrouw: { look: BUURVROUW, at: [-14, -6], face: 20, anim: 'phone' },
    fietser: { look: FIETSER_A, at: [-30, -4.2], face: 0, anim: 'idle' },
    fietsster: { look: FIETSER_B, at: [-34, -3.4], face: 0, anim: 'idle' },
  },
  props: {
    radio: { kind: 'radio', at: [2.6, -2.6, 0.45], face: 200 },
    tekening: { kind: 'bord', at: [1.9, -1.7, 0], face: 160 },
    escapade: { kind: 'auto', at: [8, 4.5, 0], face: 80 },
    doos: { kind: 'doos', at: [-9, 7, 1] },
    koffer: { kind: 'koffer', at: [5.5, -3, 0] },
    matras: { kind: 'matras', at: [8, 4.5, 1.45], face: 80, hidden: true },
    fiets1: { kind: 'fiets', at: [-30, -4.2, 0], face: 0 },
    fiets2: { kind: 'fiets', at: [-34, -3.4, 0], face: 0 },
    duif: { kind: 'duif', at: [-20, 8, 8], face: 0 },
  },
  cues: [
    // the trailer: two cyclists and a gull cross the street
    { t: 0, prop: 'fiets1', path: [[-30, -4.2], [900, -4.2]], speed: 5 },
    { t: 0, prop: 'fiets2', path: [[-34, -3.4], [900, -3.4]], speed: 5 },
    { t: 0, actor: 'fietser', walk: [[900, -4.2]], speed: 5, ride: true },
    { t: 0, actor: 'fietsster', walk: [[900, -3.4]], speed: 5, ride: true },
    { t: 0.5, prop: 'duif', path: [[-20, 8, 8], [-4, 3, 5.5], [6, -2, 3.2], [30, -9, 14]], speed: 6 },
    { t: 0, prop: 'tekening', bob: 0.02 },
    { t: 'L3', prop: 'radio', bob: 0.01 },
    { t: 'L5', prop: 'radio', bob: 0 },
    { t: 'L0', actor: 'tessa', carry: 'tekening' },
    // Tammo arrives with a box
    { t: 'L3', actor: 'tammo', carry: 'doos' },
    { t: 'L3', actor: 'tammo', walk: [[-3, 4], [0.6, 1.1]], speed: 1.5 },
    { t: 'L5+0.3', actor: 'tammo', face: 'actor:tessa' },
    { t: 'L6', actor: 'tammo', drop: 'doos' },
    { t: 'L6', actor: 'tammo', anim: 'shrug' },
    { t: 'L7', actor: 'tammo', anim: 'idle' },
    { t: 'L8', actor: 'tessa', anim: 'shrug' },
    // "een frietwagen is een auto met een luik": she points at the Escapade
    { t: 'L9', actor: 'tessa', face: 'prop:escapade' },
    { t: 'L9+0.4', actor: 'tessa', anim: 'point' },
    { t: 'L10', actor: 'tammo', walk: [[4.5, 2.6]], speed: 1.7 },
    { t: 'L10+2.4', actor: 'tammo', face: 'prop:escapade' },
    { t: 'L10+2.4', actor: 'tammo', anim: 'hips' },
    { t: 'L11', actor: 'tessa', face: 'actor:tammo' },
    { t: 'L11', actor: 'tessa', anim: 'hips' },
    { t: 'L12', actor: 'tammo', face: 'prop:tekening' },
    { t: 'L12', actor: 'tammo', anim: 'point' },
    // the neighbour walks by and waves
    { t: 'L8', actor: 'buurvrouw', walk: [[-3, -6], [6, -5.2], [40, -5.2]], speed: 1.2 },
        { t: 'L13', actor: 'tessa', face: 'actor:tammo' },
    { t: 'L13', actor: 'tessa', anim: 'look' },
    { t: 'L14', actor: 'tessa', anim: 'talk' },
    { t: 'L16', actor: 'tessa', face: 'prop:tekening' },
    { t: 'L16', actor: 'tessa', anim: 'point' },
    { t: 'L17', actor: 'tammo', anim: 'nod' },
    { t: 'L19', actor: 'tammo', anim: 'shrug' },
    { t: 'L19', actor: 'tessa', face: 'actor:tammo' },
    { t: 'L20', actor: 'tessa', anim: 'point' },
    { t: 'L21', actor: 'tammo', anim: 'shake' },
    { t: 'L22', actor: 'tessa', anim: 'shrug' },
    { t: 'L23', actor: 'tammo', anim: 'nod' },
    { t: 'L24', actor: 'tessa', anim: 'talk' },
    // "Kom. Werk.": the matras goes on the roof, Tammo takes the suitcase
    { t: 'L25', actor: 'tessa', drop: 'tekening' },
    { t: 'L25', actor: 'tessa', walk: [[5, 1.2]], speed: 1.8 },
    { t: 'L25+1', actor: 'tammo', walk: [[5.2, -2.3]], speed: 1.7 },
    { t: 'L26', prop: 'matras', show: true },
    { t: 'L26', actor: 'tessa', face: 'prop:escapade' },
    { t: 'L26', actor: 'tessa', anim: 'cheer' },
    { t: 'L26+0.6', actor: 'tammo', carry: 'koffer' },
    { t: 'L27', actor: 'tessa', anim: 'hips' },
    { t: 'L27', actor: 'tammo', anim: 'carry' },
    { t: 'L28', actor: 'tessa', anim: 'talk' },
    { t: 'L29', actor: 'tammo', anim: 'nod' },
    { t: 'L30', actor: 'tessa', walk: [[12, -1]], speed: 1.8 },
    { t: 'L30', actor: 'tammo', walk: [[11, -3]], speed: 1.7 },
  ],
  shots: [
    // trailer: a crane over the street, then a low cut onto the bikes
    { t: 0, shot: 'orbit', target: 'mid:tessa,escapade', radius: 15, start: 200, sweep: 70, h0: 9, h1: 3.4, fov: 40, look: 'tessa' },
    { t: 'L1', shot: 'dolly', from: [-7, -7.5, 0.55], to: [6, -7, 0.9], look: 'fiets1@0.9', fov: 34 },
    { t: 'L2', shot: 'cut', at: [6, 3, 7], look: 'duif', fov: 38, shake: 0.03 },
    // the radio, then Tammo coming in
    { t: 'L3', shot: 'dolly', from: [4.4, -4.4, 0.7], to: [3.4, -3.8, 0.85], look: 'radio@0.45', fov: 42 },
    { t: 'L4', shot: 'follow', target: 'tammo', dist: 3.4, side: 0.9, h: 1.5, fov: 44 },
    // the talk: a two-shot, then closer on whoever speaks, a wide for the street life
    { t: 'L5+0.2', shot: 'cut', at: [-2.2, -1.8, 1.55], look: 'mid:tammo,tessa@1.3', fov: 42 },
    { t: 'L7', shot: 'cut', at: [3.4, -1.4, 1.6], look: 'speaker', fov: 30 },
    { t: 'L8', shot: 'cut', at: [-1.5, 0.4, 1.5], look: 'speaker', fov: 30 },
    { t: 'L9', shot: 'dolly', from: [-3, -5, 1.4], to: [0, -6.4, 1.8], look: 'escapade@1', fov: 40 },
    { t: 'L11', shot: 'cut', at: [7.6, 0.2, 1.4], look: 'speaker', fov: 32 },
    { t: 'L13', shot: 'cut', at: [-2.4, 3.2, 1.5], look: 'speaker', fov: 28 },
    { t: 'L14', shot: 'orbit', target: 'mid:tammo,tessa', radius: 5.5, start: 60, sweep: -50, h0: 1.7, h1: 2.4, look: 'speaker', fov: 38 },
    { t: 'L17', shot: 'dolly', from: [3.4, -1.4, 1.6], to: [2.7, -0.9, 1.5], look: 'speaker', fov: 30 },
    { t: 'L19', shot: 'dolly', from: [-1.6, 0.4, 1.5], to: [-0.9, 0.2, 1.45], look: 'speaker', fov: 30 },
    { t: 'L21', shot: 'dolly', from: [-4, 2, 1.3], to: [-1, 1.6, 1.5], look: 'mid:tammo,tessa@1.3', fov: 36 },
    { t: 'L24', shot: 'dolly', from: [3.6, -1.6, 1.6], to: [2.8, -1.1, 1.55], look: 'speaker', fov: 30 },
    // moving day: out to the car, then away down the street
    { t: 'L25', shot: 'follow', target: 'tessa', dist: 3.6, side: -0.8, h: 1.6, fov: 44 },
    { t: 'L26', shot: 'orbit', target: 'escapade', radius: 7.5, start: 250, sweep: -70, h0: 1.3, h1: 3.4, fov: 42 },
    { t: 'L28', shot: 'dolly', from: [3.4, -5.8, 1.5], to: [4.6, -4.6, 1.6], look: 'speaker', fov: 32 },
    { t: 'L30', shot: 'dolly', from: [4, 2, 1.6], to: [10, 4.5, 4.6], look: 'tessa', fov: 42 },
  ],
};

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

export const CUTSCENES = { OPENING, END_CARD };
