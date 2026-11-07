// Akte 3 of the new story, staged: the intros and outros of M12-M16 as cutscript scenes (see cutscenes_akte1.js
// for the format of a spec). The specs are added to MORE_SPECS, which cutscenes_akte1.js missionScene() reads too,
// so act 1's own test keeps its list. The spoken lines come from the story (script.json). A beat whose line is
// not found (an edited text) is skipped. Coordinates are local to the player's spot: f forward, s left (m).
import { MORE_SPECS as S } from './cutscenes_akte1.js';

// a stack of containers (the Noorderterminal) from boxes
const stack = (id, at, face = 0) => ({ [id]: { kind: 'doos', at: [at[0], at[1], 0], face } });

// --- M12 Het staat niet in het rooster: Dijkstra lands on the platform at Lauwersoog, the case at the Eemshaven ---
S['M12.intro'] = {
  cast: { dijkstra: { key: 'dijkstra', at: [3.2, 0.4], face: 180, anim: 'hips', gest: ['hips', 'point', 'talk', 'shrug', 'point'] } },
  props: { koeltas: { kind: 'tas', at: [4.6, -1.2, 0] } },
  open: [{ actor: 'tessa', face: 'actor:dijkstra' }, { actor: 'tammo', face: 'actor:dijkstra' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'dijkstra', walk: [[1.9, 0.7]], speed: 0.8 },
    { on: 'Eerst de lunch', actor: 'dijkstra', face: 'prop:koeltas' },
    { on: 'Eerst de lunch', dt: 0.3, actor: 'dijkstra', anim: 'point' },
    { on: 'Dat is geen noodgeval', actor: 'tessa', anim: 'hips' },
    { on: 'Jij hebt nooit nachtdienst', actor: 'dijkstra', face: 'actor:tessa' },
    { on: 'Dan de ballon', dt: 0.4, actor: 'dijkstra', anim: 'point' },
    { on: 'Natuurlijk hang', actor: 'tammo', anim: 'shake' },
    { on: 'Ik vraag het', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Ik vraag het', dt: 0.5, actor: 'tessa', anim: 'nod' },
    { on: 'Ja. Dank je', actor: 'tammo', anim: 'nod' },
  ],
  shots: [],
  wide: { from: [-5, 4.2, 3.2], to: [-3, 3.0, 2.4], look: 'mid:dijkstra,tessa@1', fov: 50, until: 1 },
};

S['M12.outro'] = {
  cast: { dijkstra: { key: 'dijkstra', at: [3.4, -0.6], face: 175, anim: 'idle', gest: ['talk', 'shrug', 'hips'] } },
  props: { aktetas: { kind: 'koffer', at: [0.9, 0.2, 0] } },
  open: [{ actor: 'tessa', carry: 'aktetas' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'dijkstra', walk: [[2.0, -0.4]], speed: 0.8 },
    { on: 'Het koopboek van Jelle', actor: 'tessa', anim: 'look' },
    { on: 'Standplaatsen', actor: 'tammo', face: 'actor:tessa' },
    { on: 'En het laatste plakje', actor: 'tammo', anim: 'point' },
    { on: 'De bewaarder', actor: 'tessa', anim: 'shrug' },
    { on: 'Container 4471', actor: 'tammo', anim: 'nod' },
    { on: 'Die Fries is geland', actor: 'dijkstra', face: 'actor:tessa' },
    { on: 'Die Fries is geland', dt: 0.5, actor: 'dijkstra', anim: 'shrug' },
  ],
  shots: [],
  wide: { from: [-4.5, 4, 3], to: [-2.5, 2.8, 2.3], look: 'mid:tessa,tammo@1', fov: 48, until: 1 },
};

// --- M13 Het containerlabyrint: Lammert on the quay between containers ---
S['M13.intro'] = {
  cast: { lammert: { key: 'lammert', at: [3, 0.5], face: 180, anim: 'idle', gest: ['talk', 'point', 'shrug', 'hips'] } },
  props: { ...stack('cont1', [6.5, 4.5], 20), ...stack('cont2', [8, -3.5], -15), ...stack('cont3', [10, 1], 5) },
  open: [{ actor: 'tessa', face: 'actor:lammert' }, { actor: 'tammo', face: 'actor:lammert' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'lammert', walk: [[1.8, 0.7]], speed: 0.8 },
    { on: 'Hier zijn de papieren', actor: 'lammert', anim: 'point' },
    { on: 'Eén container tussen', actor: 'tammo', anim: 'shrug' },
    { on: 'Hij staat onder een stapel', actor: 'lammert', face: 'prop:cont3' },
    { on: 'Ze zijn bijna allemaal rood', actor: 'tammo', anim: 'shake' },
    { on: 'Dan moet je de blauwe', actor: 'lammert', anim: 'shrug' },
    { on: 'We pakken de kraan', actor: 'tessa', anim: 'point' },
  ],
  shots: [],
  wide: { from: [-5, 4, 3.2], to: [-3, 3, 2.4], look: 'mid:lammert,tessa@1', fov: 50, until: 1 },
};

S['M13.outro'] = {
  cast: { lammert: { key: 'lammert', at: [3, 0.3], face: 180, anim: 'idle', gest: ['talk', 'hips', 'shrug'] } },
  props: { ...stack('cont1', [7, 4], 15), ...stack('cont2', [8.5, -3], -10) },
  open: [{ actor: 'tessa', face: 'actor:lammert' }, { actor: 'tammo', face: 'actor:lammert' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'lammert', walk: [[1.8, 0.5]], speed: 0.8 },
    { on: 'Het schip vaart leeg weg', actor: 'lammert', anim: 'point' },
    { on: 'De voorraden blijven hier', actor: 'tessa', anim: 'cheer' },
    { on: 'Een kantoor', actor: 'tammo', anim: 'shrug' },
    { on: 'Met een bed', actor: 'lammert', anim: 'hips' },
    { on: 'Twee bedden.', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Dat gezicht betekent', actor: 'tessa', anim: 'point' },
    { on: 'Klopt', actor: 'tammo', anim: 'nod' },
  ],
  shots: [],
  wide: { from: [-4.5, 4.4, 3], to: [-2.6, 3.0, 2.3], look: 'mid:lammert,tammo@1', fov: 48, until: 1 },
};

// --- M14 De dijk: Jelle and the deurwaarder at the start, the finish at the sluis ---
S['M14.intro'] = {
  cast: {
    jelle: { key: 'jelle', at: [4.6, 1.2], face: 185, anim: 'hips', gest: ['hips', 'talk', 'point', 'shrug'] },
    deurwaarder: { key: 'deurwaarder', at: [5.4, -1.6], face: 175, anim: 'idle', noauto: true },
  },
  props: { map: { kind: 'klembord', at: [5.4, -1.6, 1] }, limo: { kind: 'trekker', at: [8, 3.4, 0], face: 200 }, escapade: { kind: 'auto', at: [-3.8, -4, 0], face: 70 } },
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }, { actor: 'deurwaarder', carry: 'map' }],
  beats: [
    { on: 'Dan raad ik u aan', actor: 'jelle', anim: 'point' },
    { on: 'Famke koopt haar eigen', actor: 'tessa', anim: 'hips' },
    { on: 'Dat neem ik je kwalijk', actor: 'tammo', anim: 'point' },
    { on: 'Dat was een hele zin', actor: 'tessa', anim: 'laugh' },
    { on: 'We rijden over de dijk', actor: 'tessa', face: 'prop:escapade' },
    { on: 'Ik rij', actor: 'tammo', face: 'prop:escapade' },
    { on: 'Ik rij', dt: 0.5, actor: 'tammo', walk: [[-1.4, 0.2]], speed: 1.4 },
    { on: 'Daar heb ik niks aan', actor: 'tammo', anim: 'shrug' },
  ],
  shots: [],
  wide: { from: [-5, 4.6, 3.2], to: [-2.8, 3.2, 2.4], look: 'mid:jelle,tessa@1', fov: 50, until: 1 },
};

S['M14.outro'] = {
  cast: {
    lammert: { key: 'lammert', at: [3, 1], face: 185, anim: 'idle', gest: ['talk', 'shrug', 'hips'] },
    deurwaarder: { key: 'deurwaarder', at: [4.4, -2.2], face: 175, anim: 'idle', gest: ['shrug', 'talk'] },
    jelle: { key: 'jelle', at: [7.5, 2.6], face: 200, anim: 'hips', gest: ['hips', 'point', 'shake'] },
  },
  props: { map: { kind: 'klembord', at: [4.4, -2.2, 1] }, limo: { kind: 'trekker', at: [9.5, 4.8, 0], face: 205 } },
  open: [{ actor: 'tessa', face: 'actor:lammert' }, { actor: 'tammo', face: 'actor:lammert' }, { actor: 'deurwaarder', carry: 'map' }],
  beats: [
    { on: 'De overdracht is getekend', actor: 'lammert', anim: 'point' },
    { on: 'Dat is een formaliteit', actor: 'deurwaarder', anim: 'shrug' },
    { on: 'Je ziet er goed uit met wind', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Je ziet er goed uit met wind', dt: 0.3, actor: 'tessa', face: 'actor:tammo' },
    { on: 'Dat zegt iedereen', actor: 'tessa', anim: 'laugh' },
    { on: 'Dat bedoelde ik niet', actor: 'tammo', anim: 'shake' },
    { on: 'Dat bedoelde ik wel', actor: 'tammo', anim: 'nod' },
    { on: 'Tammo. Je bent rood', actor: 'tessa', anim: 'point' },
    { on: 'Dat is de wind', actor: 'tammo', anim: 'shrug' },
    { on: 'Durk, Douwe', actor: 'jelle', anim: 'point' },
  ],
  shots: [],
  wide: { from: [-4.4, 4.4, 3.1], to: [-2.5, 3.0, 2.3], look: 'mid:lammert,tessa@1', fov: 48, until: 1 },
};

// --- M15 Laag over het graan: Roelfien at her strip; the jury at the kermis ---
S['M15.intro'] = {
  cast: { roelfien: { key: 'roelfien', at: [3.1, 0.5], face: 180, anim: 'hips', gest: ['talk', 'point', 'hips', 'shrug'] } },
  props: { bord: { kind: 'bord', at: [4.8, -2.2, 0], face: 160 } },
  open: [{ actor: 'tessa', face: 'actor:roelfien' }, { actor: 'tammo', face: 'actor:roelfien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'roelfien', walk: [[1.9, 0.7]], speed: 0.8 },
    { on: 'Dan laten we de hele kermis', actor: 'roelfien', anim: 'point' },
    { on: 'Vlieg laag', actor: 'roelfien', anim: 'point' },
    { on: 'Ik heb nog nooit gevlogen', actor: 'tammo', anim: 'shrug' },
    { on: 'Je hing aan een touw', actor: 'tessa', anim: 'laugh' },
    { on: 'Dat telt niet', actor: 'tammo', anim: 'shake' },
    { on: 'Tammo, jij zegt links', actor: 'tessa', anim: 'point' },
  ],
  shots: [],
  wide: { from: [-5, 4.2, 3], to: [-3, 3, 2.4], look: 'mid:roelfien,tessa@1', fov: 50, until: 1 },
};

S['M15.outro'] = {
  cast: {
    roelfien: { key: 'roelfien', at: [3, 0.2], face: 180, anim: 'idle', gest: ['talk', 'shrug', 'point', 'hips'] },
    jurylid1: { key: 'jurylid', at: [6.2, 3.2], face: 195, anim: 'idle', noauto: true },
    jurylid2: { key: 'jurylid', at: [6.6, -2.8], face: 165, anim: 'idle', noauto: true },
  },
  props: { bord: { kind: 'bord', at: [8, 0.6, 0], face: 180 } },
  open: [{ actor: 'tessa', face: 'actor:roelfien' }, { actor: 'tammo', face: 'actor:roelfien' }],
  beats: [
    { on: 'Is dit waar', actor: 'jurylid1', face: 'actor:tessa' },
    { on: 'Ik stap eruit', actor: 'jurylid1', walk: [[11, 7]], speed: 1.5 },
    { on: 'Ik ook', actor: 'jurylid2', walk: [[11, -7]], speed: 1.5 },
    { on: 'Plakje zes is voor de helft', actor: 'tessa', anim: 'shrug' },
    { on: 'De molen in Midwolda', actor: 'roelfien', anim: 'point' },
    { on: 'Oma\'s recept lust grof', actor: 'roelfien', anim: 'cheer' },
    { on: 'Dank je, Roelfien', actor: 'tammo', anim: 'nod' },
    { on: 'Vol, tenminste', actor: 'tessa', anim: 'laugh' },
  ],
  shots: [],
  wide: { from: [-4.6, 4.6, 3.1], to: [-2.6, 3.2, 2.3], look: 'mid:roelfien,tessa@1', fov: 48, until: 1 },
};

// --- M16 Nog eentje dan: Geert at the kermis tent; Durk, Douwe, the bumper cars and the kiss ---
S['M16.intro'] = {
  cast: {
    geert: { key: 'geert', at: [3, 0.6], face: 180, anim: 'hips', gest: ['talk', 'point', 'hips', 'shrug'] },
    student: { key: 'student', at: [6.5, -3.2], face: 170, anim: 'idle', bg: true },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:geert' }, { actor: 'tammo', face: 'actor:geert' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'geert', walk: [[1.9, 0.8]], speed: 0.8 },
    { on: 'Er zitten twee Friese reuzen', actor: 'geert', anim: 'point' },
    { on: 'En Tessa: mijn nieuwe barman', actor: 'geert', face: 'actor:tessa' },
    { on: 'Die barman heeft het druk', actor: 'tammo', anim: 'shake' },
    { on: 'O ja? Sinds wanneer', actor: 'tessa', anim: 'hips' },
    { on: 'Sinds nu', actor: 'tammo', anim: 'nod' },
    { on: 'Jaloers? Jij?', actor: 'tessa', anim: 'laugh' },
    { on: 'Ik drink maar één', actor: 'tammo', anim: 'shrug' },
  ],
  shots: [],
  wide: { from: [-5, 4, 3.1], to: [-3, 3, 2.3], look: 'mid:geert,tessa@1', fov: 50, until: 1 },
};

S['M16.outro'] = {
  // #737: M16.3-M16.5 spelen op de kermis; M16.6 is de dijk bij Blauwestad bij zonsondergang. De knip ligt
  // bij de dijkregel: daarna speelt 'M16.dijk' op een eigen anker (lat/lon) en met een eigen dagdeel.
  split: { at: 'Bij Berend mocht ik niet rijden', key: 'M16.dijk', lat: 53.17, lon: 6.988, facing: 1.2, clock: 20.6 },
  cast: {
    durk: { key: 'durk', at: [3.2, 1.4], face: 185, anim: 'lean', gest: ['lean', 'talk', 'shrug'] },
    douwe: { key: 'douwe', at: [3.4, -1.4], face: 175, anim: 'lean', gest: ['lean', 'shrug'] },
    kermisexploitant: { key: 'kermisexploitant', at: [-4.2, 4.8], face: 20, anim: 'hips', gest: ['point', 'talk'] },
  },
  props: { botsauto1: { kind: 'auto', at: [6.5, 4, 0], face: 215 }, botsauto2: { kind: 'auto', at: [7.4, -3.8, 0], face: 150 } },
  open: [{ actor: 'tessa', face: 'actor:durk' }, { actor: 'tammo', face: 'actor:durk' }],
  beats: [
    { on: 'Een rit. Wij tegen jullie', actor: 'tessa', anim: 'point' },
    { on: 'Welke vraag', actor: 'durk', anim: 'shrug' },
    { on: 'Waar is de bal, en waar', actor: 'tessa', anim: 'point' },
    // the ride: sparks and chaos, then the kiss
    { on: 'Links, Tessa', actor: 'tammo', anim: 'point' },
    { on: 'Dat is mijn links', actor: 'tessa', anim: 'hips' },
    { on: 'Je had vandaag drie keer', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Dat deel kan ik', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Dat deel kan ik', dt: 0.8, actor: 'tessa', walk: [[0, 0.1]], speed: 0.9 },
    { on: 'Dat deel kan ik', dt: 1.6, actor: 'tessa', anim: 'lean' },
    { on: 'Dat deel kan ik', dt: 1.6, actor: 'tammo', anim: 'lean' },
    { on: 'Eruit! Hier wordt', actor: 'kermisexploitant', walk: [[-1.2, 2.2]], speed: 2 },
    { on: 'Au.', actor: 'tammo', anim: 'shake' },
    { on: 'De bal… zit in baas', actor: 'durk', anim: 'talk' },
    { on: 'Durk. Dat was geheim', actor: 'douwe', anim: 'shrug' },
    { on: 'Hij heeft hem echt', actor: 'tessa', anim: 'shrug' },
    { on: 'Dan pakken we hem in Veendam', actor: 'tammo', anim: 'nod' },
  ],
  shots: [],
  wide: { from: [-5.2, 4.8, 3.2], to: [-3.2, 3.2, 2.4], look: 'mid:durk,tessa@1', fov: 50, until: 1 },
};

// --- #737: de dijk bij Blauwestad (M16.6): zonsondergang boven het Oldambtmeer -------------------
// Twee mensen lopen over de dijk, het water links, de kermis ver weg. Lage camera, veel lucht.
S['M16.dijk'] = {
  cast: {},
  props: {},
  open: [
    { actor: 'tammo', walk: [[2.2, 0.7]], speed: 0.9 },
    { actor: 'tessa', walk: [[2.4, -0.5]], speed: 0.9 },
  ],
  beats: [
    { on: 'Bij Berend mocht ik niet rijden', actor: 'tammo', anim: 'shrug' },
    { on: 'Bij Berend mocht ik niet rijden', dt: 0.4, actor: 'tessa', anim: 'laugh' },
    { on: 'Moi.', actor: 'tessa', anim: 'nod' },
    { on: 'Dat gezicht betekent', actor: 'tessa', anim: 'point' },
    { on: 'Klopt', actor: 'tammo', anim: 'nod' },
  ],
  shots: [
    { on: 'Bij Berend mocht ik niet rijden', dt: 0.3, shot: 'dolly', from: [-4.2, 2.6, 1.0], to: [-2.2, 1.4, 1.1], look: 'mid:tammo,tessa@1.35', fov: 50 },
    { on: 'Dat gezicht betekent', dt: 0.3, shot: 'cut', at: [-1.6, -2.4, 1.0], look: 'tessa@1.4', fov: 40 },
  ],
  wide: { from: [-6.4, 4.2, 2.6], to: [-4.2, 3.0, 2.0], look: 'mid:tammo,tessa@1.1', fov: 58, until: 1 },
};
