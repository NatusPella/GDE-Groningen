// Deel 4 "Nazomer" of the new story, staged (#361, #136): the intros and outros of M27-M30 and the scenes inside the missions
// as cutscript scenes (see cutscenes_akte1.js for the format of a spec). The specs are added to MORE_SPECS, which
// cutscenes_akte1.js missionScene() reads too. The spoken lines come from the story (script.json, 09-script-akte6.md);
// no recordings, no text is changed here. A beat whose line is not found (an edited text) is skipped.
// Coordinates are local to the player's spot: f forward, s left (m). Not yet looked at in the game.
import { MORE_SPECS as S } from './cutscenes_akte1.js';

const WIDE = (from, to, look) => ({ from, to, look, fov: 50, until: 1 });

// --- M27 Inpakken: Willemien's house in Loppersum, empty boxes in the hall ---
S['M27.intro'] = {
  cast: { willemien: { key: 'willemien', at: [3.2, 0.4], face: 180, anim: 'idle', gest: ['talk', 'hips', 'point', 'shrug'] } },
  props: { doos: { kind: 'doos', at: [4.6, -1.6, 0] }, doos2: { kind: 'doos', at: [4.9, 1.8, 0] } },
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.4]], speed: 0.8 },
    { on: 'Hoe lang', actor: 'tessa', anim: 'shrug' },
    { on: 'Een paar weken, zeggen ze', actor: 'willemien', anim: 'shake' },
    { on: 'Graag', actor: 'tammo', anim: 'nod' },
    // WP7: Willemien is vaste klant van de snackwagen
    { on: 'Ik ken jullie van het luik', actor: 'willemien', anim: 'point' },
    { on: 'De aannemer zet', actor: 'willemien', anim: 'point' },
    { on: 'Oma zei: gewoon dozen', actor: 'tessa', anim: 'nod' },
    { on: 'Dat zegt Trijntje', actor: 'willemien', anim: 'hips' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tessa@1'),
};
S['M27.2'] = {
  cast: { willemien: { key: 'willemien', at: [2.6, 0.8], face: 185, anim: 'idle', gest: ['talk', 'shrug', 'point'] } },
  props: { kat: { kind: 'kat', at: [3.6, -1.2, 0], face: 160 }, doos: { kind: 'doos', at: [4.4, 1.6, 0] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'prop:kat' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[1.8, 0.8]], speed: 0.8 },
    { on: 'De kat wil niet', actor: 'tammo', anim: 'shrug' },
    { on: 'Hij wil nergens in', actor: 'willemien', anim: 'shake' },
    { on: 'Willemien. Een foto', actor: 'tessa', anim: 'point' },
    { on: 'Mijn oma. En Trijntje', actor: 'willemien', anim: 'look' },
    { on: 'Dat is een eind', actor: 'tammo', anim: 'nod' },
    { on: 'Tegen de wind in', actor: 'willemien', anim: 'hips' },
    // the cat (poseclips.js): it sits and refuses, Tammo kneels to it, it grooms and then rubs against his legs and purrs
    { on: 0, dt: 0.1, prop: 'kat', anim: 'kat-zitten' },
    { on: 0, dt: 0.2, actor: 'tammo', walk: [[2.3, -0.4]], speed: 1.5 },
    { on: 0, dt: 2.0, actor: 'tammo', anim: 'hurken' },
    { on: 'Hij wil nergens in', dt: 0.3, prop: 'kat', anim: 'kat-poetsen', dur: 3.5 },
    { on: 'Willemien. Een foto', dt: 0.1, actor: 'tammo', anim: 'stop' },
    { on: 'Willemien. Een foto', dt: 0.4, prop: 'kat', anim: 'kat-kopje', dur: 5 },
    { on: 'Tegen de wind in', dt: 0.3, prop: 'kat', anim: 'kat-spinnen', dur: 5 },
  ],
  shots: [],
  wide: WIDE([-4.6, 3.8, 3], [-3, 2.8, 2.3], 'mid:willemien,tessa@1'),
};
S['M27.outro'] = {
  cast: { willemien: { key: 'willemien', at: [3, 0.2], face: 180, anim: 'idle', gest: ['talk', 'hips', 'nod'] } },
  props: { doos: { kind: 'doos', at: [4.8, -1.8, 0] }, bus: { kind: 'bestelbus', at: [8, -3.4, 0], face: 100 } },
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.2]], speed: 0.8 },
    { on: 'Het is een huis', actor: 'willemien', anim: 'hips' },
    { on: 'Het blijft staan', actor: 'tessa', anim: 'nod' },
    { on: 'Dat zeggen ze', actor: 'willemien', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tessa@1'),
};

// --- M28 De wisselwoning: the removal van, the temporary homes ---
S['M28.intro'] = {
  cast: { willemien: { key: 'willemien', at: [2.8, -0.8], face: 175, anim: 'idle', gest: ['talk', 'hips', 'shrug'] } },
  props: { bus: { kind: 'bestelbus', at: [6.4, 2.4, 0], face: 80 }, kat: { kind: 'kat', at: [2.6, -1.6, 0], face: 200 } },
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[1.8, -0.8]], speed: 0.8 },
    { on: 'Rustig rijden', actor: 'willemien', anim: 'point' },
    { on: 'Ik rij altijd rustig', actor: 'tammo', anim: 'nod' },
    { on: 'Dat zei Trijntje al', actor: 'willemien', anim: 'hips' },
    { on: 0, dt: 0.1, prop: 'kat', anim: 'kat-kijken' },
    { on: 'Ik rij altijd rustig', dt: 0.4, prop: 'kat', anim: 'kat-zitten' },
    { on: 'Dat zei Trijntje al', dt: 0.6, prop: 'kat', anim: 'kat-poetsen', dur: 4 },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tammo@1'),
};
S['M28.outro'] = {
  cast: { willemien: { key: 'willemien', at: [3.2, 0.6], face: 180, anim: 'idle', gest: ['talk', 'shrug', 'hips'] } },
  props: { kat: { kind: 'kat', at: [4.4, -1.2, 0], face: 200 }, doos: { kind: 'doos', at: [5.2, 1.6, 0] } },
  open: [{ actor: 'tessa', face: 'prop:kat' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.6]], speed: 0.8 },
    { on: 'Hij vindt het niks', actor: 'willemien', anim: 'shrug' },
    { on: 'Hij went wel', actor: 'tammo', anim: 'nod' },
    { on: 'Hij niet. Ik wel', actor: 'willemien', anim: 'nod' },
    { on: 'Dat weet ze', actor: 'tammo', anim: 'nod' },
    { on: 0, dt: 0.1, prop: 'kat', anim: 'kat-kijken' },
    { on: 'Hij went wel', dt: 0.3, prop: 'kat', anim: 'kat-poetsen', dur: 3 },
    { on: 'Hij niet. Ik wel', dt: 2.4, actor: 'willemien', anim: 'handenschudden', dur: 2 },
    { on: 'Hij niet. Ik wel', dt: 2.4, actor: 'tammo', anim: 'handenschudden', dur: 2, mirror: false },
    { on: 'Dat weet ze', dt: 0.4, prop: 'kat', anim: 'kat-spinnen', dur: 4 },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tammo@1'),
};

// --- M29 Terug: the yard, the party, the photo in the hall ---
S['M29.intro'] = {
  cast: { willemien: { key: 'willemien', at: [3.2, 0.4], face: 180, anim: 'idle', gest: ['talk', 'hips', 'nod'] } },
  props: { kat: { kind: 'kat', at: [2.4, -2.2, 0], face: 140 }, doos: { kind: 'doos', at: [5.2, 2.0, 0] } },
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.4]], speed: 0.8 },
    { on: 'En hij staat goed', actor: 'tessa', anim: 'nod' },
    { on: 'De kat was eerder terug', actor: 'willemien', anim: 'point' },
    { on: 'Die wist de weg', actor: 'tammo', anim: 'shrug' },
    { on: 'Die wist het al die tijd', actor: 'willemien', anim: 'hips' },
    // the cat came home first: it rubs against Tessa, who kneels to it, and ends asleep on the doorstep
    { on: 'En hij staat goed', dt: 0.4, actor: 'tessa', walk: [[1.5, -1.5]], speed: 1.4 },
    { on: 'En hij staat goed', dt: 0.4, prop: 'kat', anim: 'kat-kijken' },
    { on: 'De kat was eerder terug', dt: 0.6, actor: 'tessa', anim: 'hurken' },
    { on: 'De kat was eerder terug', dt: 0.8, prop: 'kat', anim: 'kat-kopje', dur: 6 },
    { on: 'Die wist de weg', dt: 2.0, actor: 'tessa', anim: 'stop' },
    { on: 'Die wist het al die tijd', dt: 0.8, prop: 'kat', anim: 'kat-slapen' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tessa@1'),
};
S['M29.2'] = {
  // as-sprongen hersteld (180-gradenregel): deze shots vervangen de gegenereerde (missionScene, spec.shotFix)
  shotFix: [
    { t: 'L5', shot: 'dolly', from: [2.53, 1.97, 1.6], to: [2.01, 1.33, 1.62], look: 'speaker', fov: 25 },
    { t: 'L11+0.6', shot: 'dolly', from: [3.6, 2.2, 1.5], to: [2.4, 1.2, 1.6], look: 'mid:tammo,tessa@1.4', fov: 38 },
    { t: 'L11+1.6', shot: 'dolly', from: [2.9, 3.2, 2.8], to: [1.2, 2.88, 3.7], look: 'mid:willemien,tammo@1', fov: 50 },
  ],
  cast: {
    willemien: { key: 'willemien', at: [3.2, 0.8], face: 185, anim: 'idle', gest: ['talk', 'hips', 'nod'] },
    buurvrouw: { key: 'buurvrouw', at: [4.6, -2.2], face: 170, anim: 'idle', gest: ['talk', 'point', 'shrug'] },
    boer: { key: 'boer', at: [5.6, 2.8], face: 195, anim: 'idle', gest: ['shrug', 'point'] },
    rikus: { key: 'rikus', at: [7.4, -0.4], face: 180, anim: 'idle', bg: true, gest: ['wave', 'talk'] },
  },
  props: { radio: { kind: 'radio', at: [6.8, 0.6, 0] }, bord: { kind: 'bord', at: [3.8, 3.8, 0], face: 200 } },
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.8]], speed: 0.8 },
    { on: 'Nachtstreek, op tournee', actor: 'rikus', anim: 'wave' },
    { on: 'Ik ben de buurvrouw', actor: 'buurvrouw', anim: 'point' },
    { on: 'Ik heb de tafels gebracht', actor: 'boer', anim: 'shrug' },
    { on: 'Waar hangt de foto', actor: 'tessa', anim: 'look' },
    { on: 'In de gang', actor: 'willemien', anim: 'nod' },
    // WP7: Willemien bakt Oma's recept na, en Tammo geeft Oma's antwoord uit M25.2 terug
    { on: 'En de eierballen', actor: 'tessa', anim: 'point' },
    { on: 'Trijntjes recept', actor: 'willemien', anim: 'shrug' },
    { on: 'Een eierbal. Dat is anders', actor: 'tammo', anim: 'point' },
    { on: 'Dansen', actor: 'tessa', anim: 'wave' },
    { on: 'Nee.', actor: 'tammo', anim: 'shake' },
    { on: '…Voor de grip', actor: 'tammo', anim: 'shrug' },
    // ze zijn een stel: Tessa pakt zijn hand en ze dansen tussen de tafels
    { on: '…Voor de grip', dt: 0.8, actor: 'tessa', anim: 'cheer' },
    { on: '…Voor de grip', dt: 1.0, actor: 'tessa', walk: [[0, 0.2]], speed: 0.8 },
    { on: '…Voor de grip', dt: 1.7, actor: 'tessa', anim: 'lean' },
    { on: '…Voor de grip', dt: 1.7, actor: 'tammo', anim: 'lean' },
  ],
  shots: [{ on: '…Voor de grip', dt: 0.6, shot: 'dolly', from: [-3.6, 2.2, 1.5], to: [-2.4, 1.2, 1.6], look: 'mid:tammo,tessa@1.4', fov: 38 }],
  wide: WIDE([-5.4, 4.4, 3.4], [-3.4, 3.2, 2.5], 'mid:willemien,buurvrouw@1'),
};
S['M29.outro'] = {
  cast: { willemien: { key: 'willemien', at: [3, 0.2], face: 180, anim: 'idle', gest: ['talk', 'nod', 'hips'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:willemien' }, { actor: 'tammo', face: 'actor:willemien' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'willemien', walk: [[2.2, 0.2]], speed: 0.8 },
    { on: 'Zeg tegen Trijntje', actor: 'willemien', anim: 'nod' },
    { on: 'Ik zal het zeggen', actor: 'tammo', anim: 'nod' },
    { on: 'Eén keer is genoeg', actor: 'willemien', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:willemien,tessa@1'),
};

// --- M30 Het proefbeleg: the haystack, the moat, the bridge, the gate, the snackwagen ---
S['M30.intro'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); het krijgsberaad in de ochtend
  coverage: 'ots',
  light: 'ochtend',
  cast: {
    berend: { key: 'berend', at: [3.4, 0.4], face: 180, anim: 'idle', gest: ['point', 'hips', 'talk', 'point'] },
    lammert: { key: 'lammert', at: [4.4, -2.4], face: 165, anim: 'idle', gest: ['talk', 'nod'] },
    klaas: { key: 'klaas', at: [4.8, 2.6], face: 195, anim: 'idle', gest: ['talk', 'point'] },
    roelfien: { key: 'roelfien', at: [3.4, -3.8], face: 160, anim: 'idle', gest: ['talk', 'point'] },
    wubbo: { key: 'wubbo', at: [3.6, 3.8], face: 200, anim: 'idle', gest: ['talk', 'hips'] },
    tinus: { key: 'tinus', at: [6.2, -0.8], face: 180, anim: 'idle', bg: true, gest: ['talk', 'point'] },
    geesje: { key: 'geesje', at: [5.8, 1.4], face: 185, anim: 'idle', bg: true, gest: ['talk', 'hips'] },
    bert: { key: 'bert', at: [6.0, -3.2], face: 170, anim: 'idle', bg: true, gest: ['talk', 'nod'] },
    durk: { key: 'durk', at: [7.2, 2.4], face: 190, anim: 'idle', bg: true, gest: ['talk', 'shrug'] },
    douwe: { key: 'douwe', at: [7.6, 1.6], face: 190, anim: 'idle', bg: true, gest: ['shrug'] },
  },
  props: { bord: { kind: 'bord', at: [4.2, 0, 0], face: 180 } },
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'berend', walk: [[2.4, 0.4]], speed: 0.8 },
    { on: 'Vier fronten', actor: 'tessa', anim: 'point' },
    { on: 'Ik heb de sleutel', actor: 'lammert', anim: 'nod' },
    { on: 'Een gracht is ook water', actor: 'klaas', anim: 'point' },
    { on: 'Ik vlieg boven', actor: 'roelfien', anim: 'point' },
    { on: 'Ik doe de lier', actor: 'wubbo', anim: 'hips' },
    { on: 'De trekker trekt de toren', actor: 'tinus', anim: 'point' },
    { on: 'Ik zie alles vanaf', actor: 'geesje', anim: 'hips' },
    { on: 'Veertig duiven', actor: 'bert', anim: 'nod' },
    { on: 'Veertig duiven', dt: 1.6, actor: 'tammo', face: 'actor:bert' },
    { on: 'Wij zijn de stormram', actor: 'durk', anim: 'shrug' },
    { on: '…tegen', actor: 'douwe', anim: 'shrug' },
    { on: 'Zeven mensen', actor: 'tessa', anim: 'look' },
    { on: 'Zeg: aanvallen', actor: 'berend', anim: 'point' },
    { on: 'Aanvallen.', actor: 'tessa', anim: 'cheer' },
    // the finale (poseclips.js): when Tessa says it, the whole company answers; the content and the lines stay as they were
    { on: 'Aanvallen.', dt: 0.3, actor: 'tessa', anim: 'juichen', dur: 2.6 },
    { on: 'Aanvallen.', dt: 0.5, actor: 'lammert', anim: 'juichen', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.7, actor: 'klaas', anim: 'juichen', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.6, actor: 'roelfien', anim: 'juichen', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.9, actor: 'wubbo', anim: 'juichen', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.8, actor: 'berend', anim: 'applaus', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.7, actor: 'tinus', anim: 'applaus', dur: 2.4 },
    { on: 'Aanvallen.', dt: 1.0, actor: 'geesje', anim: 'applaus', dur: 2.4 },
    { on: 'Aanvallen.', dt: 0.9, actor: 'bert', anim: 'juichen', dur: 2.4 },
    { on: 'Aanvallen.', dt: 1.1, actor: 'durk', anim: 'applaus', dur: 2.4 },
    { on: 'Aanvallen.', dt: 1.2, actor: 'douwe', anim: 'applaus', dur: 2.4 },
  ],
  // a slow zoom on Tessa while she says she does not know what to say
  cuts: [{ on: 'Zeven mensen', tpl: 'langzameZoom', target: 'tessa', angle: -50, hold: 4 }],
  shots: [],
  wide: WIDE([-5.5, 4.6, 3.6], [-3.5, 3.4, 2.6], 'mid:berend,tessa@1'),
};
S['M30.2'] = {
  cast: { jelle: { key: 'jelle', at: [3.8, -1.4], face: 170, anim: 'idle', gest: ['point', 'hips', 'talk'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }],
  beats: [
    { on: 'Ik spring. Altijd', actor: 'jelle', anim: 'cheer' },
    { on: 'Jelle. Je zou niet meedoen', actor: 'tessa', anim: 'hips' },
    { on: 'Ik doe niet mee', actor: 'jelle', anim: 'shrug' },
    { on: 'Dat is meedoen', actor: 'tammo', anim: 'shake' },
    { on: 'Oant sjen', actor: 'jelle', anim: 'wave' },
    { on: 'Oant sjen', dt: 0.8, actor: 'jelle', walk: [[6.4, -1.4]], speed: 4 },
    { on: 'Jelle ligt in de gracht', actor: 'tessa', anim: 'laugh' },
    { on: 'Hij ligt er elke keer in', actor: 'tammo', anim: 'nod' },
  ],
  fx: [{ on: 'Oant sjen', dt: 1.4, fx: 'sfx', kind: 'splash' }],
  shots: [],
  wide: WIDE([-4.6, 3.8, 3], [-3, 2.8, 2.3], 'mid:jelle,tessa@1'),
};
S['M30.3'] = {
  cast: {
    wubbo: { key: 'wubbo', at: [3, 1], face: 185, anim: 'idle', gest: ['point', 'hips', 'talk'] },
    berend: { key: 'berend', at: [3.8, -1.8], face: 175, anim: 'idle', gest: ['point', 'hips'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:wubbo' }, { actor: 'tammo', face: 'actor:wubbo' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'wubbo', walk: [[2.0, 1]], speed: 0.8 },
    { on: 'Lier. Nu', actor: 'wubbo', anim: 'point' },
    { on: 'Hij is open', actor: 'tessa', anim: 'look' },
    { on: 'Te vroeg. Dat is ook', actor: 'wubbo', anim: 'hips' },
    { on: 'Voor Münster', actor: 'berend', anim: 'cheer' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:wubbo,berend@1'),
};
S['M30.5'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de poort
  coverage: 'ots',
  light: 'spanning',
  cast: {
    berend: { key: 'berend', at: [3.2, 1.0], face: 185, anim: 'idle', gest: ['talk', 'hips', 'shake', 'nod'] },
    jelle: { key: 'jelle', at: [5.6, -3], face: 170, anim: 'idle', bg: true, gest: ['wave', 'shrug'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'berend', walk: [[2.2, 1.0]], speed: 0.8 },
    { on: 'Het is open', actor: 'berend', anim: 'look' },
    { on: 'Het is open, Berend', actor: 'tessa', anim: 'nod' },
    { on: 'Ik heb gewonnen', actor: 'berend', anim: 'shake' },
    { on: 'U heeft gewonnen', actor: 'tammo', anim: 'nod' },
    { on: 'Dit is verkeerd', actor: 'berend', anim: 'shake' },
    { on: 'Dat is winnen', actor: 'tessa', anim: 'laugh' },
    { on: 'Dan is winnen verkeerd', actor: 'berend', anim: 'hips' },
    { on: 'Volgend jaar verlies ik', actor: 'berend', anim: 'nod' },
    { on: 'Is hij blij', actor: 'tessa', anim: 'phone' },
    { on: 'Dan is hij blij', actor: 'tessa', anim: 'laugh' },
  ],
  shots: [],
  wide: WIDE([-5.4, 4.4, 3.4], [-3.4, 3.2, 2.5], 'mid:berend,tessa@1'),
};
S['M30.outro'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de kar: het slot in het late licht
  coverage: 'ots',
  light: 'gouden-uur',
  cast: {
    tinus: { key: 'tinus', at: [6.4, -2.2], face: 175, anim: 'idle', bg: true, gest: ['nod', 'talk'] },
    geesje: { key: 'geesje', at: [6.8, 2.4], face: 190, anim: 'idle', gest: ['hips', 'talk'] },
    // WP7: de uitnodiging naar de open wereld komt van Berend, Geesje en Jelle (natgeregend in een deken)
    berend: { key: 'berend', at: [5.4, -3.2], face: 170, anim: 'idle', gest: ['point', 'nod'] },
    jelle: { key: 'jelle', at: [6.7, 1.5], face: 190, anim: 'idle', gest: ['shrug', 'hips'] },
  },
  // #1325: de kar staat naast de groep in beeld, niet meer tussen het paar en de anderen (hij blokkeerde het zicht en vulde het kader)
  props: { bus: { kind: 'snackwagen', at: [3.4, 5.2, 0], face: 20 } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    // hij loopt naar de kant van het paar (de kar staat nu opzij: geen omweg meer)
    { on: 0, dt: 0.4, actor: 'tinus', walk: [[3.3, -1.7]], speed: 0.9 },
    { on: 'De bieten staan', actor: 'geesje', anim: 'point' },
    { on: 'In Veendam zoeken ze', actor: 'berend', anim: 'point' },
    { on: 'Dat pand ken ik', actor: 'jelle', anim: 'shrug' },
    { on: 'Elke zomer één ronde', actor: 'tessa', anim: 'talk' },
    { on: 'Thuis is waar de kar staat', actor: 'tammo', anim: 'hips' },
    { on: 'Zes.', actor: 'tessa', anim: 'laugh' },
    { on: 'Kon minder.', actor: 'tammo', anim: 'shrug' },
    { on: 'Kon veel minder', actor: 'tessa', anim: 'cheer' },
  ],
  // het slot: Geesje opent van voren; de laatste beurten van het paar komen uit de ots-dekking (van voren, over de schouder van de ander)
  shots: [{ on: 'De bieten staan', shot: 'close', target: 'geesje', dist: 2.6, side: 0.5, fov: 34 }],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:tammo,tessa@1'),
};
