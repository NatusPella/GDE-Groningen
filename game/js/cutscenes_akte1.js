// Akte 1 of the new story, staged (#147): the intros and outros of the missions
// as cutscript scenes (cutscript.js, played by cutscenehost.js) instead of two
// people and an NPC standing still while subtitles run.
//
// Only staging lives here; the spoken lines come from the story (script.json,
// missionstory.js timeline()). A scene is a SPEC:
//   cast    { <id>: { key: <NPC key>, at: [f, s], face: deg, anim, gest: [...], walk... } }  people besides Tammo and Tessa
//   props   as in cutscript (kind, at, face, hidden)
//   duo     { tammo | tessa: { at, face, anim } }   override the default places of the pair
//   open    cues at t = 0 (cutscript cue objects without t)
//   beats   [{ on: <line index | start of the line's text | 'end'>, dt, ...cue }]   story actions on a line
//   shots   [{ on, ...shot }]   hand-made camera shots on a line (the rest is covered automatically)
//   wide    a first establishing shot { from, to, look, fov, until: <line index> }
// A beat whose line is not found (an edited text) is skipped, so a text edit never breaks a scene.
// Coordinates are local to the player's spot: f forward, s left, h up (m). The pair stands at f 0,
// Tammo on the left (s +0.6), Tessa on the right (s -0.6).
//
// missionScene(key, lines, { looks }) -> a cutscript scene def, or null when the key has no spec.
// looks: the NPC table of missionstory.js ({ name, shirt, skin, ... } per key).

import { SPECS_AKTE2 } from './cutscenes_akte2.js';

const DUO = {
  tammo: { look: 'tammo', at: [0, 0.6], face: 0, anim: 'idle', speaker: 'Tammo', gaze: 'speaker' },
  tessa: { look: 'anita', at: [0, -0.6], face: 0, anim: 'idle', speaker: ['Anita', 'Tessa'], gaze: 'speaker' },
};
const DUO_GEST = { tammo: ['talk', 'shrug', 'hips', 'talk', 'point'], tessa: ['talk', 'point', 'hips', 'talk', 'shrug'] };
const NPC_GEST = ['talk', 'point', 'shrug', 'talk', 'hips'];

// street life that crosses behind the scene (a cyclist, someone with a phone)
const cyclist = (id, look, from, to, t = 0, speed = 4.5) => ({
  cast: { [id]: { key: look, at: [from[0], from[1]], face: Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI, anim: 'ride', bg: true } },
  props: { [id + 'f']: { kind: 'fiets', at: [from[0], from[1], 0], face: Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI } },
  cues: [
    { t, actor: id, walk: [to], speed, ride: true },
    { t, prop: id + 'f', path: [from, to], speed },
  ],
});
const passer = (id, look, from, to, t = 0, speed = 1.2, anim = 'idle') => ({
  cast: { [id]: { key: look, at: from, face: Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI, anim, bg: true } },
  cues: [{ t, actor: id, walk: [to], speed }],
});
const merge = (...parts) => ({
  cast: Object.assign({}, ...parts.map((p) => p.cast || {})),
  props: Object.assign({}, ...parts.map((p) => p.props || {})),
  cues: parts.flatMap((p) => p.cues || []),
});

export const SPECS = {};
// more stagings (cutscenes_akte3.js ...): read by missionScene as well, so act 1's own test keeps its list
export const MORE_SPECS = {};
// act 2 (M08-M11) is staged in its own file
Object.assign(SPECS, SPECS_AKTE2);

// --- M01 Nul krassen: Berend and his pickup at the Martinikerkhof ---------------------------
{
  const life = merge(cyclist('fietser', 'harm', [-14, -6.5], [40, -6.5], 0.5), passer('toerist', 'toerist', [6, -7], [-6, -7.5], 2, 1.1, 'phone'));
  SPECS['M01.intro'] = {
    cast: {
      berend: { key: 'berend', at: [2.5, 0.5], face: 180, anim: 'idle', gest: ['hips', 'talk', 'point', 'shake', 'hips'], carry: 'kladblok' },
      ...life.cast,
    },
    props: {
      kladblok: { kind: 'klembord', at: [2.5, 0.5, 1] },
      bakkie: { kind: 'bakkie', at: [5.4, 2.6, 0], face: 215 },
      escapade: { kind: 'auto', at: [-3.8, -4.2, 0], face: 70 },
      ...life.props,
    },
    open: [{ actor: 'berend', carry: 'kladblok' }, { actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }, ...life.cues],
    beats: [
      // he checks the paintwork while they walk up
      { on: 0, actor: 'berend', walk: [[2.5, 1.3], [2.5, 0.5]], speed: 0.9 },
      { on: 'Ik heb gisteren', dt: 0.6, actor: 'berend', face: 'prop:bakkie' },
      { on: 'Ik heb gisteren', dt: 0.8, actor: 'berend', anim: 'point' },
      { on: 'Jij bent toch', actor: 'berend', face: 'actor:tammo' },
      { on: 'Niet zo hard', actor: 'berend', anim: 'shake' },
      { on: 'Niet zo hard', dt: 2.4, actor: 'berend', anim: 'shrug' },
      { on: 'Wij brengen hem', dt: 0.3, actor: 'tessa', face: 'prop:bakkie' },
      { on: 'Wij brengen hem', dt: 0.8, actor: 'tessa', anim: 'point' },
      { on: 'Nul krassen. Of ik tel', actor: 'berend', face: 'prop:bakkie' },
      { on: 'Nul krassen. Of ik tel', dt: 0.4, actor: 'berend', walk: [[4.0, 1.9]], speed: 1.3 },
      { on: 'Nul krassen. Of ik tel', dt: 0.4, actor: 'berend', drop: 'kladblok' },
      { on: 'Jij rijdt als', actor: 'tessa', anim: 'laugh' },
      { on: 'En jij als', actor: 'tessa', face: 'actor:berend' },
      { on: 'En jij als', dt: 0.5, actor: 'tessa', anim: 'point' },
      { on: 'En jij als', dt: 1.2, actor: 'berend', anim: 'shrug' },
      { on: 'Vijftig euro', actor: 'tessa', walk: [[3.2, 1.4]], speed: 1.8 },
      { on: 'Vijftig euro', dt: 0.3, actor: 'tammo', walk: [[1.8, 1.6]], speed: 1.6 },
      { on: 'Vijftig euro', dt: 1.0, actor: 'tessa', anim: 'cheer' },
    ],
    shots: [],
    wide: { from: [-5.5, 4.5, 3.4], to: [-3.2, 3.3, 2.6], look: 'mid:berend,bakkie@1', fov: 48, until: 1 },
  };

  SPECS['M01.outro'] = {
    cast: {
      berend: { key: 'berend', at: [2.8, -0.3], face: 190, anim: 'hips', gest: ['hips', 'talk', 'point', 'shrug'] },
      ...cyclist('fietser', 'harm', [-20, -7], [40, -7], 0.2, 4).cast,
    },
    props: {
      bakkie: { kind: 'bakkie', at: [4.8, 3.2, 0], face: 160 },
      ...cyclist('fietser', 'harm', [-20, -7], [40, -7]).props,
    },
    open: [{ actor: 'berend', face: 'prop:bakkie' }, { actor: 'tessa', anim: 'cheer' }, ...cyclist('fietser', 'harm', [-20, -7], [40, -7], 0.2, 4).cues],
    beats: [
      // he walks round the pickup, inspecting it, and comes back to them
      { on: 0, dt: 0.4, actor: 'berend', walk: [[4.6, 1.2], [6.6, 3.0], [4.8, 4.9], [3.0, 2.6], [2.6, 0.2]], speed: 1.3 },
      { on: 0, dt: 0.4, actor: 'berend', gaze: 'prop:bakkie' },
      { on: '…Goud.', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Trede twee', actor: 'tessa', anim: 'point' },
      { on: 'Trede twee', dt: 0.1, actor: 'berend', gaze: 'actor:tessa' },
      { on: 'Overdrijf niet', actor: 'berend', face: 'actor:tammo' },
      { on: 'Overdrijf niet', dt: 3.5, actor: 'berend', anim: 'shrug' },
      { on: 'Wat moet een Fries', actor: 'tammo', anim: 'shrug' },
      { on: 'Wat moet een Fries met ons', dt: 2.0, actor: 'berend', anim: 'point' },
      // "Hier, vijftig euro. …Moi." and he goes inside
      { on: 'Wat moet een Fries met ons', dt: 3.4, actor: 'berend', walk: [[8.5, 4.5]], speed: 1.2 },
      { on: 'Hij zei moi', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Hij zei moi', dt: 0.2, actor: 'tammo', anim: 'shake' },
      { on: 'Tegen mij', actor: 'tessa', anim: 'hips' },
      { on: 'Vijftig euro. Dat', actor: 'tessa', anim: 'cheer' },
      { on: 'Dan hebben we', actor: 'tammo', anim: 'nod' },
    ],
    shots: [{ on: 'Wat moet een Fries met ons', dt: 2.6, shot: 'follow', target: 'berend', dist: 3.2, side: 0.8, h: 1.55, fov: 42 }],
    wide: { from: [-4.5, 5, 3.2], to: [-2.5, 3.6, 2.5], look: 'mid:berend,bakkie@1', fov: 50, until: 1 },
  };
}

// --- M02 Even pinnen: the tractor takes the machine, the trailer snaps loose -------------------
{
  const life = merge(passer('student', 'student', [-2, -9], [14, -9], 1.5, 1.2, 'phone'));
  SPECS['M02.intro'] = {
    duo: { tammo: { at: [-7.5, 2.4], face: 0, anim: 'idle' }, tessa: { at: [0.4, -0.2], face: 60, anim: 'shake' } },
    cast: {
      // Durk and Douwe sit in the cab (hidden, but they move with it, so the camera finds the voices)
      durk: { key: 'durk', at: [8.4, 3.4], face: 0, anim: 'idle', hidden: true, noauto: true },
      douwe: { key: 'douwe', at: [8.4, 3.4], face: 0, anim: 'idle', hidden: true, noauto: true },
      ...life.cast,
    },
    props: {
      trekker: { kind: 'trekker', at: [8.4, 3.4, 0], face: 0 },
      automaat: { kind: 'automaat', at: [5.2, 3.4, 0], face: 270 },
      paal: { kind: 'bord', at: [5.9, 2.2, 0], face: 0 },
      escapade: { kind: 'auto', at: [-3.2, -4.4, 0], face: 80 },
      politie: { kind: 'politie', at: [-60, -6, 0], face: 0 },
      ...life.props,
    },
    open: [
      { actor: 'durk', hide: true }, { actor: 'douwe', hide: true },
      // the tractor pulls away, the machine stays behind at the post
      { t: 'L1+0.2', prop: 'trekker', path: [[8.4, 3.4], [90, 3.4]], speed: 3.2 },
      { t: 'L1+0.2', actor: 'durk', walk: [[90, 3.4]], speed: 3.2 },
      { t: 'L1+0.2', actor: 'douwe', walk: [[90, 3.4]], speed: 3.2 },
      ...life.cues,
    ],
    beats: [
      { on: 0, dt: 0.1, actor: 'tessa', walk: [[2.4, 0.8]], speed: 2.4 },
      { on: 'Douwe. Hij is los', actor: 'tessa', face: 'prop:automaat' },
      { on: 'Moi. Wat is er', dt: -0.6, actor: 'tammo', walk: [[0.2, 1.0]], speed: 3 },
      { on: 'Moi. Wat is er', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Mijn pas zit', actor: 'tessa', anim: 'point' },
      { on: 'Mijn pas zit', dt: 0.4, actor: 'tessa', face: 'prop:automaat' },
      { on: 'Twee reuzen met', actor: 'tessa', face: 'prop:automaat' },
      { on: 'In die pas', actor: 'tessa', face: 'actor:tammo' },
      { on: 'In die pas', dt: 0.2, actor: 'tessa', anim: 'hips' },
      { on: 'Dus we pinnen', actor: 'tammo', face: 'prop:automaat' },
      { on: 'Dus we pinnen', dt: 0.4, actor: 'tammo', walk: [[4.2, 1.9]], speed: 1.6 },
      { on: 'Sjabbe van', actor: 'tessa', walk: [[3.4, 0.6]], speed: 1.6 },
      { on: 'Sjabbe van', dt: 1.5, actor: 'tessa', anim: 'point' },
      // the police car comes round the corner: get in
      { on: 'Er komt een politie', dt: -1.4, prop: 'politie', path: [[-60, -6], [-3, -6], [-3, -6]], speed: 11 },
      { on: 'Er komt een politie', actor: 'tammo', face: 'prop:politie' },
      { on: 'Er komt een politie', dt: 0.3, actor: 'tammo', anim: 'point' },
      { on: 'Ik rij', actor: 'tammo', walk: [[-3.0, -3.0]], speed: 3.2 },
      { on: 'Ik rij', dt: 0.1, actor: 'tessa', walk: [[-3.6, -3.4]], speed: 3 },
      { on: 'Ik rij', dt: 1.6, actor: 'tammo', hide: true },
      { on: 'Ik rij', dt: 1.7, actor: 'tessa', hide: true },
    ],
    shots: [
      { on: 'Douwe. Hij is los', shot: 'follow', target: 'durk', dist: 3.6, side: 1.2, h: 1.9, fov: 42 },
      { on: 'In die pas', dt: 0.1, shot: 'dolly', from: [-2.2, -2.2, 1.6], to: [-0.6, -1.0, 1.55], look: 'automaat@1', fov: 38 },
      { on: 'Sjabbe van', dt: 0.1, shot: 'dolly', from: [-3.4, 4.6, 2.2], to: [-1.2, 3.4, 1.9], look: 'mid:tessa,tammo@1', fov: 44 },
    ],
    wide: { from: [-6, 6, 3.4], to: [-3, 4.4, 2.6], look: 'mid:tessa,automaat@1', fov: 50, until: 1 },
  };

  SPECS['M02.outro'] = {
    cast: {
      sjabbe: { key: 'sjabbe', at: [2.4, 0.2], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] },
    },
    props: {
      automaat: { kind: 'automaat', at: [4.2, 2.2, 0], face: 270 },
      pinpas: { kind: 'klembord', at: [2.4, 0.2, 1.1] },
    },
    open: [{ actor: 'sjabbe', face: 'actor:tessa' }, { actor: 'sjabbe', carry: 'pinpas' }, { actor: 'tessa', anim: 'idle' }],
    beats: [
      // he pries the hatch open and hands her the card, she checks the balance at the machine next door
      { on: 0, actor: 'sjabbe', drop: 'pinpas' },
      { on: 0, actor: 'sjabbe', anim: 'shrug' },
      { on: 'Daar koop je', actor: 'tessa', anim: 'hips' },
      { on: 'Dan moet je groter', actor: 'sjabbe', anim: 'point' },
      { on: 'Dan moet je groter', dt: 1.6, actor: 'sjabbe', face: 'actor:tammo' },
      { on: 'Het museum', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Het museum', dt: 0.3, actor: 'tessa', anim: 'look' },
      { on: 'Achttien karaat', actor: 'sjabbe', anim: 'hips' },
      { on: 'Achttien karaat', dt: 1.2, actor: 'sjabbe', anim: 'shrug' },
      { on: 'Contant. Het Loket', actor: 'tessa', walk: [[3.2, -1.2]], speed: 1.5 },
      { on: 'Contant. Het Loket', dt: 1.5, actor: 'tessa', anim: 'cheer' },
    ],
    shots: [],
    wide: { from: [-3.5, 4, 3], to: [-2, 3, 2.4], look: 'mid:sjabbe,automaat@1', fov: 48, until: 1 },
  };
}

// --- M03 Het Loket: a waiting room, the number screen, a clerk ---------------------------------
{
  const queue = (id, look, at, face, anim) => ({ cast: { [id]: { key: look, at, face, anim, bg: true } } });
  const q = merge(queue('wachter1', 'femke', [3.8, -3.1], 200, 'phone'), queue('wachter2', 'harm', [4.9, -1.6], 190, 'lean'), queue('wachter3', 'geert', [4.4, 3.4], 170, 'idle'));
  SPECS['M03.intro'] = {
    cast: {
      loketbediende: { key: 'loketbediende', at: [6.4, 0.2], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips', 'talk'] },
      ...q.cast,
    },
    props: {
      zuil: { kind: 'zuil', at: [1.8, 2.4, 0], face: 270 },
      scherm: { kind: 'bord', at: [6.8, -0.4, 0], face: 180 },
      bord: { kind: 'bord', at: [4.6, 2.2, 0], face: 200 },
    },
    open: [{ actor: 'wachter1', gaze: 'actor:tammo' }, { actor: 'wachter3', gaze: 'actor:loketbediende' }, { actor: 'loketbediende', gaze: 'actor:wachter2' }, { prop: 'scherm', bob: 0.005 }],
    beats: [
      // Tessa explains the plan, Tammo stares at the sign, then they split up
      { on: 0, actor: 'tessa', anim: 'point' },
      { on: 0, dt: 0.1, actor: 'tessa', face: 'prop:scherm' },
      { on: 'We staan bij', actor: 'tammo', face: 'prop:scherm' },
      { on: 'We staan bij', dt: 0.2, actor: 'tammo', anim: 'shake' },
      { on: 'Nummer 4117', actor: 'wachter2', anim: 'shrug' },
      { on: 'Vierentwintig mensen', actor: 'tammo', face: 'prop:zuil' },
      { on: 'Vierentwintig mensen', dt: 0.3, actor: 'tammo', walk: [[1.9, 1.6]], speed: 1.5 },
      { on: 'Ik haal het formulier', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Ik haal het formulier', dt: 0.3, actor: 'tessa', anim: 'hips' },
      { on: 'Formulier 7B', actor: 'tessa', face: 'actor:loketbediende' },
      { on: 'Wie vouwt', actor: 'tammo', anim: 'shrug' },
      { on: 'Wie vouwt', dt: 0.1, actor: 'tammo', face: 'actor:tessa' },
      { on: 'Iedereen, Tammo', actor: 'tessa', anim: 'laugh' },
      { on: 'Loket C is vandaag', actor: 'tammo', face: 'prop:bord' },
      { on: 'Loket C is vandaag', dt: 0.3, actor: 'tammo', anim: 'point' },
      { on: 'Dat gezicht', actor: 'tessa', anim: 'look' },
      { on: 'Klopt.', actor: 'tammo', anim: 'shrug' },
      // Sjabbe rings: Tessa takes the call
      { on: 'Tessa. Sjabbe', dt: -0.5, actor: 'tessa', anim: 'phone' },
      { on: 'Tessa. Sjabbe', actor: 'tammo', face: 'actor:tessa' },
    ],
    shots: [{ on: 'Nummer 4117', shot: 'cut', at: [1.0, -1.8, 1.7], look: 'scherm@1.7', fov: 34 }],
    wide: { from: [-4, 4.6, 3.6], to: [-1.8, 3.2, 2.9], look: 'mid:tessa,loketbediende@1.2', fov: 52, until: 1 },
  };

  SPECS['M03.outro'] = {
    cast: {
      loketbediende: { key: 'loketbediende', at: [3.4, 0], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips'] },
      ...q.cast,
    },
    props: { bord: { kind: 'bord', at: [4.6, 2.4, 0], face: 200 }, stempelblad: { kind: 'klembord', at: [3.2, 0, 1.0] } },
    open: [{ actor: 'loketbediende', carry: 'stempelblad' }, { actor: 'tessa', anim: 'cheer' }],
    beats: [
      { on: 0, dt: 1.5, actor: 'loketbediende', drop: 'stempelblad' },
      { on: 'Wij zijn ingeschreven', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Wij zijn ingeschreven', dt: 0.4, actor: 'tessa', anim: 'cheer' },
      { on: 'Plakje één is', actor: 'tessa', anim: 'point' },
      { on: 'Plakje één is', dt: 0.1, actor: 'tammo', anim: 'shake' },
      { on: 'Jelle vroeg waar', actor: 'tessa', anim: 'talk' },
      { on: 'Dan wint Jelle', actor: 'tammo', anim: 'hips' },
      { on: 'Tenzij iemand', actor: 'tessa', anim: 'point' },
      { on: 'Als iemand die bal', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Als iemand die bal', dt: 0.3, actor: 'tessa', anim: 'talk' },
      { on: 'Wij stelen de', actor: 'tammo', anim: 'look' },
      { on: 'Wij bewaken hem', actor: 'tessa', anim: 'hips' },
      { on: 'Mijn opa', actor: 'tammo', anim: 'talk' },
      { on: 'Dat was verlies', actor: 'tammo', anim: 'shrug' },
      { on: '…Je mag nee', actor: 'tessa', walk: [[-1.4, -1.4]], speed: 1.2 },
      { on: 'Ik zeg niks', actor: 'tammo', anim: 'nod' },
      { on: 'Tammo. Bert', dt: -0.4, actor: 'tammo', anim: 'phone' },
      { on: 'Tammo. Bert', actor: 'tessa', face: 'actor:tammo' },
    ],
    shots: [],
    wide: { from: [-3.4, 4, 3.2], to: [-1.8, 3, 2.6], look: 'mid:loketbediende,tessa@1.3', fov: 50, until: 1 },
  };
}

// --- M04 Kieken van boven: Bert's loft at the station ----------------------------------------------
{
  const life = merge(passer('reiziger', 'student', [8, -7], [-6, -6], 0.5, 1.5, 'carry'), passer('reiziger2', 'boer', [-8, 7], [10, 6], 3, 1.3));
  SPECS['M04.intro'] = {
    cast: {
      bert: { key: 'bert', at: [2.6, 0.4], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips', 'shrug', 'talk'] },
      ...life.cast,
    },
    props: {
      duiventil: { kind: 'duiventil', at: [4.6, 2.6, 0], face: 200 },
      duif: { kind: 'duif', at: [4.4, 2.6, 2.3], face: 200 },
      ...life.props,
    },
    open: [{ prop: 'duif', bob: 0.03 }, ...life.cues],
    beats: [
      { on: 0, actor: 'bert', face: 'prop:duiventil' },
      { on: 0, dt: 0.3, actor: 'bert', walk: [[3.4, 1.5]], speed: 0.9 },
      { on: 'Niemand kijkt', dt: 0.2, actor: 'bert', face: 'actor:tammo' },
      { on: 'Hoe stuur je', actor: 'tammo', anim: 'shrug' },
      { on: 'Diep in de ogen', actor: 'bert', anim: 'point' },
      { on: 'Kiek. Hij', actor: 'bert', face: 'prop:duif' },
      { on: 'Kiek. Hij', dt: 0.3, actor: 'bert', anim: 'point' },
      { on: 'Kiek. Hij', dt: 0.4, prop: 'duif', path: [[4.4, 2.6, 2.3], [3.2, 0.9, 1.9], [0.5, 0.6, 1.55]], speed: 2.2 },
      { on: 'Duiven luisteren', actor: 'tammo', anim: 'shake' },
      { on: 'Mijn vriend', actor: 'tessa', anim: 'laugh' },
      { on: 'Vriend.', actor: 'tammo', anim: 'shrug' },
      { on: 'Wat?', actor: 'tessa', anim: 'hips' },
      { on: 'Ow.', actor: 'tammo', anim: 'look' },
      { on: 'Dit is het plan', actor: 'tessa', anim: 'point' },
      { on: 'En wat Jelle', actor: 'tammo', anim: 'nod' },
      // "Tammo fluit. Een duif landt op zijn pet." (the pigeon is back on his shoulder)
      { on: 'En wat Jelle', dt: 1.4, actor: 'tammo', anim: 'wave' },
    ],
    shots: [{ on: 'Kiek. Hij', dt: 0.3, shot: 'follow', target: 'bert', dist: 2.2, side: -0.9, h: 1.7, fov: 36 }],
    wide: { from: [-4.4, 4.8, 3.4], to: [-2.2, 3.4, 2.7], look: 'mid:bert,duiventil@1.5', fov: 50, until: 1 },
  };

  SPECS['M04.outro'] = {
    cast: {
      bert: { key: 'bert', at: [3.8, 0.9], face: 190, anim: 'idle', gest: ['hips', 'talk'] },
      ...life.cast,
    },
    props: { duiventil: { kind: 'duiventil', at: [5.4, 3.0, 0], face: 200 }, duif: { kind: 'duif', at: [0.4, 0.6, 1.7], face: 20 }, ...life.props },
    open: [{ prop: 'duif', bob: 0.02 }, { actor: 'bert', gaze: 'prop:duif' }, ...life.cues],
    beats: [
      { on: 0, dt: 0.5, prop: 'duif', path: [[0.4, 0.6, 1.7], [2.6, 1.8, 2.4], [5.2, 3.0, 2.3]], speed: 2.6 },
      { on: 'Drie camera', actor: 'tessa', anim: 'point' },
      { on: 'En die trekker-limo', actor: 'tammo', anim: 'talk' },
      { on: 'Pompeblêden', actor: 'tessa', anim: 'hips' },
      { on: 'Hoe weet jij', actor: 'tammo', anim: 'shrug' },
      { on: 'Dat weet je', actor: 'tessa', anim: 'shrug' },
      { on: 'Dat weet niemand', actor: 'tammo', anim: 'point' },
      { on: 'Dat weet niemand', dt: 1.4, actor: 'bert', anim: 'laugh' },
      { on: 'Bewaker twee is', actor: 'tessa', anim: 'point' },
      { on: 'En de camera', actor: 'tammo', anim: 'look' },
      { on: 'Daar hebben we', actor: 'tessa', anim: 'hips' },
      { on: 'Sjoerd, van', actor: 'tammo', anim: 'talk' },
      { on: 'Dan winnen wij', actor: 'tessa', anim: 'cheer' },
    ],
    shots: [],
    wide: { from: [-3.6, 4.2, 3.2], to: [-2, 3.2, 2.6], look: 'mid:tessa,duiventil@1.5', fov: 50, until: 1 },
  };
}

// --- M05 Wind tegen: the Academiegebouw steps, a clipboard and a row of freshers --------------------
{
  const freshers = merge(
    { cast: { eerstejaar1: { key: 'student', at: [3.6, -2.6], face: 175, anim: 'phone', bg: true }, eerstejaar2: { key: 'femke', at: [4.2, 3.0], face: 185, anim: 'idle', bg: true }, eerstejaar3: { key: 'harm', at: [5.2, 1.4], face: 180, anim: 'lean', bg: true } } },
    cyclist('fietser', 'geert', [-18, -8], [40, -8], 0.4, 3.6),
  );
  SPECS['M05.intro'] = {
    cast: {
      sjoerd: { key: 'sjoerd', at: [2.5, 0.2], face: 180, anim: 'idle', gest: ['point', 'talk', 'hips', 'talk'], carry: 'klembord' },
      ...freshers.cast,
    },
    props: { klembord: { kind: 'klembord', at: [2.5, 0.2, 1] }, fiets1: { kind: 'fiets', at: [-2.8, -2.8, 0], face: 20 }, fiets2: { kind: 'fiets', at: [-2.8, 2.6, 0], face: 340 }, ...freshers.props },
    open: [{ actor: 'sjoerd', carry: 'klembord' }, { actor: 'eerstejaar1', gaze: 'actor:sjoerd' }, { actor: 'eerstejaar2', gaze: 'actor:sjoerd' }, ...freshers.cues],
    beats: [
      { on: 0, actor: 'eerstejaar3', anim: 'shrug' },
      { on: 'Altijd tegenwind', actor: 'sjoerd', anim: 'point' },
      { on: 'Altijd tegenwind', dt: 0.2, actor: 'sjoerd', face: 'prop:fiets1' },
      { on: 'Op de kruispunten', actor: 'sjoerd', face: 'actor:tessa' },
      { on: 'Op de kruispunten', dt: 0.8, actor: 'sjoerd', anim: 'hips' },
      { on: 'Maak oogcontact', actor: 'sjoerd', walk: [[1.6, 0.2]], speed: 1.0 },
      { on: 'Maak oogcontact', dt: 0.4, actor: 'sjoerd', anim: 'look' },
      { on: 'Tammo heeft hier', actor: 'tessa', anim: 'laugh' },
      { on: 'Drie. De derde', actor: 'tammo', anim: 'shrug' },
      { on: 'Van het studeren', actor: 'tessa', anim: 'look' },
      { on: 'Van de mensa', actor: 'tammo', anim: 'hips' },
      { on: 'Van de mensa', dt: 0.6, actor: 'eerstejaar2', anim: 'laugh' },
      { on: 'Wij willen weten', actor: 'tessa', face: 'actor:sjoerd' },
      { on: 'Wij willen weten', dt: 0.3, actor: 'tessa', anim: 'point' },
      { on: 'Regels zijn regels', actor: 'sjoerd', anim: 'shrug' },
      { on: 'Dat is een ja', actor: 'tammo', anim: 'nod' },
      { on: 'Dat is een ja', dt: 0.8, actor: 'tessa', walk: [[-2.4, -2.4]], speed: 2.0 },
      { on: 'Dat is een ja', dt: 1.0, actor: 'tammo', walk: [[-2.4, 2.0]], speed: 2.0 },
    ],
    shots: [],
    wide: { from: [-4.6, 5.2, 3.6], to: [-2.2, 3.6, 2.8], look: 'mid:sjoerd,eerstejaar2@1.2', fov: 52, until: 1 },
  };

  const cafe = merge(
    { cast: { gast1: { key: 'terras', at: [4.8, -3.0], face: 200, anim: 'idle', bg: true }, gast2: { key: 'geert', at: [5.4, 2.8], face: 160, anim: 'laugh', bg: true } } },
    passer('ober', 'snackbar', [6, -6], [-3, -5.5], 1, 1.2, 'carry'),
  );
  SPECS['M05.outro'] = {
    cast: { sjoerd: { key: 'sjoerd', at: [2.3, 0.3], face: 185, anim: 'cheer', gest: ['talk', 'hips', 'point', 'cheer'] }, ...cafe.cast },
    props: { bierviltje: { kind: 'klembord', at: [1.6, -0.1, 0.95] } },
    open: [{ actor: 'gast1', gaze: 'actor:sjoerd' }, ...cafe.cues],
    beats: [
      { on: 'Record.', actor: 'sjoerd', anim: 'cheer' },
      { on: 'Je neef werkt', actor: 'tessa', anim: 'point' },
      { on: 'Om twaalf uur', actor: 'sjoerd', anim: 'point' },
      { on: 'Om twaalf uur', dt: 2.2, actor: 'sjoerd', anim: 'shrug' },
      { on: 'Je zei het ook niet', actor: 'tammo', anim: 'hips' },
      { on: 'Precies. Proost', actor: 'sjoerd', anim: 'cheer' },
      { on: 'Precies. Proost', dt: 0.3, actor: 'tessa', anim: 'cheer' },
      { on: 'Drie minuten.', actor: 'tessa', anim: 'look' },
      { on: 'Ik heb in drie', actor: 'tammo', anim: 'shrug' },
      { on: 'Dan wordt het tijd', actor: 'tessa', anim: 'hips' },
      { on: 'Dus vannacht', actor: 'tessa', anim: 'point' },
      { on: 'Eerst wachten', actor: 'tammo', anim: 'shrug' },
    ],
    shots: [],
    wide: { from: [-3.6, 4.4, 3.2], to: [-2, 3.2, 2.5], look: 'mid:sjoerd,tessa@1.3', fov: 50, until: 1 },
  };
}

// --- M06 Het museum: the quay at night, the plan, a held hand -------------------------------------
{
  SPECS['M06.intro'] = {
    cast: {},
    props: { radio: { kind: 'radio', at: [-2.4, -2.6, 0.5], face: 40 }, escapade: { kind: 'auto', at: [-4.4, -4.8, 0], face: 80 } },
    open: [{ prop: 'radio', bob: 0.01 }, { actor: 'tammo', anim: 'look' }, { actor: 'tessa', anim: 'idle' }],
    beats: [
      { on: 0, actor: 'tammo', face: 'actor:tessa' },
      { on: 'Het plan.', actor: 'tessa', anim: 'point' },
      { on: 'Het plan.', dt: 0.3, actor: 'tessa', face: 'prop:radio' },
      { on: 'En daarna brengen', actor: 'tammo', anim: 'nod' },
      { on: 'Na het Ontzet', actor: 'tessa', anim: 'hips' },
      { on: 'Wat?', actor: 'tammo', anim: 'look' },
      { on: 'Geef me je hand', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Geef me je hand', dt: 0.3, actor: 'tessa', anim: 'point' },
      { on: 'Voor de grip', actor: 'tammo', anim: 'shrug' },
      { on: 'Voor de grip', dt: 1.4, actor: 'tessa', walk: [[0.7, -0.1]], speed: 0.6 },
      { on: 'Voor de grip', dt: 1.4, actor: 'tammo', walk: [[0.7, 0.2]], speed: 0.6 },
    ],
    shots: [],
    wide: { from: [-5.2, 4.2, 3.8], to: [-3.4, 3.0, 3.0], look: 'mid:tammo,tessa@1.2', fov: 52, until: 1 },
  };
}

// --- stage scenes in the missions (missions.js 'scene' stages, played by playCastScene) ---------------------

{
  // M01.3: the Grote Markt on a summer evening, Jelmer films himself on the terrace
  const terras = merge(
    { cast: { gast1: { key: 'terras', at: [4.6, 3.8], face: 200, anim: 'laugh', bg: true }, gast2: { key: 'toerist', at: [5.8, -3.6], face: 170, anim: 'phone', bg: true }, gast3: { key: 'geert', at: [6.4, 0.8], face: 180, anim: 'idle', bg: true } } },
    passer('ober', 'snackbar', [8, 6], [1, 5], 1, 1.2, 'carry'),
    cyclist('fietser', 'harm', [-16, 9], [40, 9], 0.3, 3.8),
  );
  SPECS['M01.3'] = {
    cast: { jelmer: { key: 'jelmer', at: [3.4, 1.2], face: 195, anim: 'phone', gest: ['cheer', 'point', 'talk', 'wave'] }, ...terras.cast },
    props: { statief: { kind: 'bord', at: [2.4, 0.2, 0], face: 180 }, ...terras.props },
    open: [{ actor: 'jelmer', gaze: 'camera' }, ...terras.cues],
    beats: [
      { on: 0, actor: 'jelmer', anim: 'wave' },
      { on: 'Ik ben geen content', actor: 'jelmer', gaze: 'actor:tammo' },
      { on: 'Spreek voor jezelf', actor: 'tessa', anim: 'hips' },
      { on: 'En die terrassen', actor: 'tammo', anim: 'point' },
      { on: 'En die terrassen', dt: 0.2, actor: 'tammo', face: 'actor:gast1' },
      { on: 'Die zijn het publiek', actor: 'jelmer', anim: 'point' },
      { on: 'Die zijn het publiek', dt: 0.1, actor: 'jelmer', face: 'actor:gast1' },
      { on: 'Die zijn het publiek', dt: 2.0, actor: 'jelmer', anim: 'cheer' },
      { on: 'Tammo. Torenwachter', actor: 'tammo', anim: 'phone' },
      { on: 'Tammo. Torenwachter', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Het is de Grote Markt', actor: 'tammo', face: 'actor:gast1' },
      { on: 'Ik meld alleen', actor: 'tammo', anim: 'shrug' },
    ],
    shots: [{ on: 'Die zijn het publiek', dt: 0.3, shot: 'cut', at: [1.0, 3.4, 2.1], look: 'mid:jelmer,gast1@1.3', fov: 46 }],
    wide: { from: [-4.6, 5.6, 3.8], to: [-2.6, 4.0, 3.0], look: 'mid:tessa,jelmer@1.4', fov: 50, until: 1 },
  };

  // M01.5: the stunt is over, the terrace applauds
  const applaus = { cast: { gast1: { key: 'terras', at: [4.4, 3.8], face: 200, anim: 'cheer', bg: true }, gast2: { key: 'toerist', at: [5.6, -3.4], face: 170, anim: 'cheer', bg: true }, gast3: { key: 'geert', at: [6.6, 0.6], face: 180, anim: 'laugh', bg: true } } };
  SPECS['M01.5'] = {
    cast: { jelmer: { key: 'jelmer', at: [3.4, 1.2], face: 195, anim: 'cheer', gest: ['cheer', 'point', 'talk', 'wave'] }, terras: { key: 'terras', at: [4.8, -1.4], face: 185, anim: 'cheer', gest: ['cheer', 'laugh'] }, ...applaus.cast },
    props: {},
    open: [{ actor: 'jelmer', gaze: 'camera' }, { actor: 'tessa', anim: 'shake' }, { actor: 'tammo', anim: 'shake' }],
    beats: [
      { on: 'Tienduizend', actor: 'jelmer', anim: 'cheer' },
      { on: 'Dat is Fries', actor: 'tessa', anim: 'hips' },
      { on: 'En dat famke', actor: 'jelmer', anim: 'point' },
      { on: 'Wie is die man', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Wie is die man', dt: 0.3, actor: 'tammo', anim: 'look' },
      { on: 'Is dat een vraag', actor: 'tessa', anim: 'point' },
      { on: 'Nee.', actor: 'tammo', anim: 'shrug' },
      { on: 'Tienduizend', dt: 1.0, actor: 'jelmer', walk: [[3.0, 2.0]], speed: 0.8 },
      { on: 'Is dat een vraag', dt: 0.2, actor: 'tessa', walk: [[1.2, -0.2]], speed: 1.2 },
      { on: 'Honderdvijftig euro', actor: 'jelmer', anim: 'wave' },
      { on: 'Op mijn pas', actor: 'tessa', anim: 'phone' },
    ],
    shots: [],
    wide: { from: [-4.6, 5.6, 3.8], to: [-2.6, 4.0, 3.0], look: 'mid:jelmer,terras@1.4', fov: 50, until: 1 },
  };

  // M03.2: Jelle buys the queue, the Bewaarder stamps
  SPECS['M03.2'] = {
    cast: {
      jelle: { key: 'jelle', at: [3.0, 0.6], face: 190, anim: 'idle', gest: ['talk', 'point', 'hips'] },
      bewaarder: { key: 'bewaarder', at: [5.6, -1.6], face: 190, anim: 'idle', gest: ['talk', 'point', 'hips'] },
      loketbediende: { key: 'loketbediende', at: [6.8, 0.2], face: 180, anim: 'idle', gest: ['point', 'talk'] },
      wachter1: { key: 'femke', at: [4.2, -3.4], face: 200, anim: 'phone', bg: true },
      wachter2: { key: 'harm', at: [5.4, 3.4], face: 170, anim: 'lean', bg: true },
    },
    props: { klomp: { kind: 'tas', at: [3.0, 0.6, 1] }, scherm: { kind: 'bord', at: [7.2, -0.4, 0], face: 180 }, stempel: { kind: 'klembord', at: [5.6, -1.6, 1] } },
    open: [{ actor: 'jelle', carry: 'klomp' }, { actor: 'bewaarder', carry: 'stempel' }],
    beats: [
      { on: 'Goedemorgen', actor: 'jelle', anim: 'hips' },
      { on: 'Jelle Terpstra. Meneer', actor: 'tessa', anim: 'point' },
      { on: 'Nee. Die win', actor: 'jelle', anim: 'shrug' },
      { on: 'Ik heb de rij gekocht', actor: 'jelle', anim: 'point' },
      { on: 'Ik heb de rij gekocht', dt: 2.4, prop: 'scherm', bob: 0.04 },
      { on: 'Hij kocht onze plek', actor: 'tammo', anim: 'shake' },
      { on: 'Tevens koop ik', actor: 'jelle', anim: 'talk' },
      { on: 'Artikel 9', actor: 'loketbediende', anim: 'point' },
      { on: 'Salamitactiek', actor: 'tessa', anim: 'hips' },
      { on: 'Dat noemen wij', actor: 'jelle', anim: 'shrug' },
      { on: 'Dat noemen wij', dt: 1.2, actor: 'jelle', walk: [[5.6, 3.0], [8.6, 3.4]], speed: 1.3 },
      { on: 'Foar mem', actor: 'jelle', anim: 'look' },
      { on: 'Wat zei hij', actor: 'tammo', face: 'actor:jelle' },
      { on: 'Wat zei hij', dt: 0.2, actor: 'tammo', anim: 'shrug' },
      { on: 'Mevrouw Tuinstra', actor: 'bewaarder', walk: [[3.0, -0.6]], speed: 1.0 },
      { on: 'Mevrouw Tuinstra', dt: 0.1, actor: 'bewaarder', face: 'actor:tessa' },
      { on: 'Meneer Terpstra', actor: 'bewaarder', anim: 'point' },
      { on: 'En wie let', actor: 'tessa', anim: 'shake' },
      { on: 'Het museum', actor: 'bewaarder', anim: 'hips' },
    ],
    shots: [{ on: 'Foar mem', shot: 'follow', target: 'jelle', dist: 2.6, side: 0.8, h: 1.6, fov: 38 }],
    wide: { from: [-3.2, 4.6, 3.4], to: [-1.2, 3.2, 2.7], look: 'mid:jelle,bewaarder@1.2', fov: 52, until: 1 },
  };
}

// ------------------------------------------------------------------------------------------------
// the director

function resolveOn(on, lines) {
  if (on === 'end') return null;
  if (typeof on === 'number') return lines[on] ? on : -1;
  if (typeof on === 'string') return lines.findIndex((l) => l.text.startsWith(on));
  return -1;
}
const tspec = (i, dt = 0) => {
  const d = Math.round(dt * 100) / 100;
  if (i === 0 && d < 0) return 0;
  return d ? `L${i}${d > 0 ? '+' : '-'}${Math.abs(d)}` : `L${i}`;
};

const CAMS = {
  // behind the pair, looking at the NPC (or the pair's own speaker from the front)
  cut: (side, toward) => ({ shot: 'cut', at: toward ? [3.9, side * 0.9, 1.6] : [-1.7, side * 0.8, 1.55], look: 'speaker', fov: 30 }),
  dolly: (side, toward) => ({ shot: 'dolly', from: toward ? [3.0, side * 1.9, 1.5] : [-0.8, side * 2.4, 1.5], to: toward ? [2.0, side * 1.1, 1.55] : [0.4, side * 1.5, 1.55], look: 'speaker', fov: 34 }),
  orbit: (side, toward, start) => ({ shot: 'orbit', target: 'speaker', radius: 2.6, start, sweep: 38 * -side, h0: 1.5, h1: 1.8, look: 'speaker', fov: 38 }),
};

export function missionScene(key, lines, { looks = {} } = {}) {
  const spec = SPECS[key] || MORE_SPECS[key];
  if (!spec || !lines || !lines.length) return null;
  const actors = {};
  for (const id of ['tammo', 'tessa']) actors[id] = { ...DUO[id], ...((spec.duo || {})[id] || {}) };
  const meta = { tammo: { gest: DUO_GEST.tammo }, tessa: { gest: DUO_GEST.tessa } };
  for (const [id, c] of Object.entries(spec.cast || {})) {
    const look = looks[c.key];
    if (!look) return null;
    actors[id] = { look, at: c.at, face: c.face ?? 180, anim: c.anim || 'idle', speaker: c.key === 'jelmer' ? [look.name, 'Streamer'] : [look.name], gaze: 'speaker' };
    meta[id] = { gest: c.gest || NPC_GEST, bg: !!c.bg, noauto: !!c.noauto };
  }
  const props = spec.props || {};
  const cues = [];
  for (const o of spec.open || []) cues.push({ t: 0, ...o });
  for (const [id, c] of Object.entries(spec.cast || {})) if (c.carry) cues.push({ t: 0, actor: id, carry: c.carry });

  const speakerActor = (name) => {
    for (const [id, a] of Object.entries(actors)) if ([].concat(a.speaker || []).includes(name)) return id;
    return null;
  };
  const primary = Object.keys(actors).filter((id) => !meta[id].bg && !meta[id].noauto);
  const gi = {};
  const beats = (spec.beats || []).map((b) => ({ ...b, idx: resolveOn(b.on, lines) })).filter((b) => b.idx !== -1);
  const shotAt = new Map();
  for (const s of spec.shots || []) { const i = resolveOn(s.on, lines); if (i != null && i >= 0) shotAt.set(i, s); }

  // gestures and reactions, line by line
  lines.forEach((l, i) => {
    const me = speakerActor(l.speaker);
    if (!me || meta[me].noauto) return;
    const g = meta[me].gest;
    gi[me] = gi[me] || 0;
    let anim = g[gi[me]++ % g.length];
    if (l.text.length < 22 && anim !== 'talk') anim = 'talk';
    cues.push({ t: tspec(i), actor: me, anim });
    for (const o of primary) {
      if (o === me) continue;
      cues.push({ t: tspec(i), actor: o, face: 'actor:' + me });
      cues.push({ t: tspec(i, 0.15), actor: o, anim: i % 2 ? 'nod' : 'idle' });
    }
  });
  for (const b of beats) {
    const { on, dt, idx, ...cue } = b;
    cues.push({ t: idx == null ? 'end' : tspec(idx, dt || 0), ...cue });
  }

  // bystanders are never statues: now and then a glance, a shrug, a nod
  const endT = lines[lines.length - 1].at + lines[lines.length - 1].dur;
  const BG = ['look', 'shrug', 'nod', 'hips', 'idle', 'look'];
  Object.keys(actors).filter((id) => meta[id].bg).forEach((id, k) => {
    for (let t = 2.5 + k * 1.7, j = k; t < endT; t += 5.5 + (j++ % 3)) cues.push({ t: Math.round(t * 10) / 10, actor: id, anim: BG[j % BG.length] });
  });

  // camera: an establishing shot over the set, then coverage that follows the speaker
  const shots = [];
  const w = spec.wide;
  const first = w ? Math.min(w.until ?? 1, lines.length - 1) : 0;
  if (w) shots.push({ t: 0, shot: 'dolly', from: w.from, to: w.to, look: w.look, fov: w.fov || 48 });
  else shots.push({ t: 0, shot: 'orbit', target: 'mid:tammo,tessa@1.2', radius: 6.5, start: 200, sweep: 50, h0: 3, h1: 2.2, look: 'mid:tammo,tessa@1.2', fov: 46 });
  let lastT = -9, lastSpeaker = null, variant = 0, lastIdx = -1;
  lines.forEach((l, i) => {
    if (i < first && !shotAt.has(i)) return;
    const me = speakerActor(l.speaker);
    const forced = shotAt.get(i);
    if (!forced && i === first && w && first === 0) return;
    // short exchanges stay in the shot; a new speaker or a long speech gets a new frame
    const same = me === lastSpeaker && me != null;
    if (!forced && l.at - lastT < (me != null && me !== lastSpeaker ? 1.0 : 2.0) && i > 0) return; // a new speaker gets a frame at once (cutscenes_audit)
    if (!forced && same && l.dur < 4.5 && i - lastIdx < 3) return;
    const duoSide = me === 'tammo' ? 1 : me === 'tessa' ? -1 : (i % 2 ? 1 : -1);
    let shot;
    if (forced) { const { on, dt, ...rest } = forced; shot = { ...rest }; if (dt) shot.dt = dt; }
    else if (me == null) shot = { shot: 'cut', at: [-2.4, 0.6, 1.7], look: 'mid:tammo,tessa@1.3', fov: 40 };
    else {
      const k = variant++ % 3;
      const farSide = me === 'tammo' || me === 'tessa';
      shot = k === 0 ? CAMS.cut(duoSide, farSide) : k === 1 ? CAMS.dolly(duoSide, farSide) : CAMS.orbit(duoSide, farSide, farSide ? 160 + i * 20 : 20 + i * 25);
    }
    const dt = shot.dt || 0;
    delete shot.dt;
    const t = tspec(i, dt);
    shots.push({ t, ...shot });
    lastT = l.at + dt; lastSpeaker = me; lastIdx = i;
  });
  // the closing frame: back out to the street
  const wend = spec.wide ? { shot: 'dolly', from: [spec.wide.to[0] + 0.5, spec.wide.to[1], spec.wide.to[2] + 0.3], to: [spec.wide.to[0] + 2.2, spec.wide.to[1] * 0.9, spec.wide.to[2] + 1.2], look: spec.wide.look, fov: spec.wide.fov || 48 } : null;
  const lastLine = lines[lines.length - 1];
  if (wend && lastLine.dur > 1.6) shots.push({ t: tspec(lines.length - 1, Math.max(0.6, lastLine.dur - 1.4)), ...wend });
  drift(shots, lines, endT + 1);
  return { id: 'story-' + key, actors, props, cues, shots };
}

// Rhythm rule (#136): a camera never holds still longer than ~6 s. A fixed cut that runs long gets a slow push-in
// (0.4 m toward the middle and a touch lower), so the shot keeps its frame but is never a still photo.
const DRIFT_AFTER = 6;
function drift(shots, lines, total) {
  const at = (t) => {
    if (typeof t === 'number') return t;
    const m = /^L(\d+)(?:([+-])([\d.]+))?$/.exec(t);
    if (!m || !lines[+m[1]]) return null;
    return lines[+m[1]].at + (m[2] ? (m[2] === '-' ? -1 : 1) * parseFloat(m[3]) : 0);
  };
  shots.forEach((s, i) => {
    if (s.shot !== 'cut' || !Array.isArray(s.at) || s.at.length !== 3) return;
    const a = at(s.t), b = i + 1 < shots.length ? at(shots[i + 1].t) : total;
    if (a == null || b == null || b - a <= DRIFT_AFTER) return;
    const [f, l, h] = s.at;
    const k = 0.4 / Math.max(0.5, Math.hypot(f, l));
    const { at: _at, ...rest } = s;
    shots[i] = { ...rest, shot: 'dolly', from: [f, l, h], to: [f - f * k, l - l * k, h - 0.08] };
  });
}
