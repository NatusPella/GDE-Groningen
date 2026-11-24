// Het slot van akte 5 (verhaal-eind, #1121): de reisstappen F1 tot en met F6 als cutscript-scènes (zie
// cutscenes_akte1.js voor het formaat van een spec). De specs komen in MORE_SPECS, die missionScene() leest; story.js speelt een
// reisstap met een spec via storyfun.js playStepScene (zonder spec of zonder gelukte opbouw valt hij terug op de gewone praatscène).
// De regels komen uit het verhaal (script.json); hier staat alleen de regie. `on` is het begin van een regel; een regel die niet
// gevonden wordt (een bewerkte tekst) slaat de beat over (scripts/akte5_slot_test.mjs bewaakt dat elke beat zijn regel vindt).
// Maten zijn lokaal aan de plek van de speler: f vooruit, s links (m). Een prop met `face: 270` draait zijn rechterzijde (het luik
// van de wagen) naar de speler toe. Nog niet in beeld bekeken.
import { MORE_SPECS as S } from './cutscenes_akte1.js';

const WIDE = (from, to, look) => ({ from, to, look, fov: 50, until: 1 });
const CLOSE = (on, target, extra = {}) => ({ on, dt: 0.2, shot: 'close', target, dist: 1.2, side: 0.2, fov: 28, ...extra });

// de rij voor het luik: figuranten (bg) die naar de wagen kijken, van het luik af naar links
const QUEUE_LOOKS = ['toerist', 'terras', 'student', 'buurvrouw', 'boer', 'kind', 'toerist', 'terras'];
const queue = (n, f, s0, step = 0.75, prefix = 'rij') => Object.fromEntries(QUEUE_LOOKS.slice(0, n).map((k, i) => [`${prefix}${i + 1}`, { key: k, at: [f, s0 + step * i], face: 270, anim: 'idle', bg: true, noauto: true }]));

// --- F1 Een wagen langs de weg: de aanhanger met het luik, het bierviltje van twaalf dagen geleden ---
S.F1 = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de aanhanger niet meer als muur voor de lens (coördinator 24-11)
  coverage: 'ots',
  // #1325: Tessa staat schuin naast de aanhanger (niet ervoor): over Tammo's schouder is de aanhanger decor naast haar, geen muur
  duo: { tammo: { at: [-0.4, 1.4], face: 10, anim: 'idle' }, tessa: { at: [3.3, -2.0], face: 20, anim: 'idle' } },
  cast: {},
  props: {
    aanhanger: { kind: 'frituuraanhanger', at: [4.7, 0, 0], face: 270 },
    hek: { kind: 'hek', at: [6.1, 0, 0], face: 90 },
    escapade: { kind: 'auto', at: [-3.6, 4.2, 0], face: 290 },
    viltje: { kind: 'bierviltje', at: [3.75, 0, 1.49], hidden: true },
  },
  open: [{ actor: 'tessa', face: 'prop:aanhanger' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'Tessa. We moeten naar Tinus', actor: 'tammo', walk: [[1.2, 1.2]], speed: 1.0 },
    { on: 'Even.', actor: 'tessa', anim: 'look' },
    { on: 'Dit tekende ik', actor: 'tessa', anim: 'point' },
    { on: 'Het is een tekening met een luik', actor: 'tessa', anim: 'point' },
    { on: 'Het is een tekening met een luik', dt: 0.3, prop: 'viltje', show: true },
    { on: 'Je kijkt naar die wagen', actor: 'tammo', face: 'prop:aanhanger' },
    { on: 'Naar de motor', actor: 'tammo', anim: 'shrug' },
    { on: 'Er zit geen motor in', actor: 'tessa', anim: 'hips' },
    { on: 'Dan naar de trekhaak', dt: 0.9, actor: 'tessa', anim: 'laugh' },
    { on: 'Een snackwagen', actor: 'tessa', anim: 'point' },
    { on: 'Met deze aanhanger', actor: 'tammo', anim: 'look' },
    { on: 'Met zo', dt: 1.2, actor: 'tessa', anim: 'phone' },
  ],
  shots: [CLOSE('Dit tekende ik', 'tessa'), CLOSE('Naar de motor', 'tammo', { dist: 1.1 }), CLOSE('Een snackwagen', 'tessa', { dist: 1.15, fov: 26 })],
  // de opening van de voorkant: Tammo loopt naar haar toe en niet van de camera weg
  wide: WIDE([3.2, 4.6, 2.4], [2.6, 3.6, 2.0], 'mid:tammo,tessa@1.2'),
};

// --- F2 De eerste bak: de wagen op blokken in de loods, Tammo eronder, Tessa bij de friteuse ---
S.F2 = {
  // as-sprongen hersteld (180-gradenregel): deze shots vervangen de gegenereerde (missionScene, spec.shotFix)
  shotFix: [
    { t: 'L2', shot: 'dolly', from: [4.1, 1.46, 1.5], to: [4.26, 0.19, 1.55], look: 'speaker', fov: 34 },
    { t: 'L8+0.2', shot: 'dolly', from: [4.8, -2.6, 1.5], to: [3.6, -2, 1.55], look: 'mid:tammo,tessa@1.35', fov: 36 },
    { t: 'L13+1', shot: 'dolly', from: [3.7, 1.8, 2.3], to: [2, 1.62, 3.2], look: 'mid:tammo,tessa@1.2', fov: 50 },
  ],
  duo: { tammo: { at: [3.8, 2.3], face: 200, anim: 'idle' }, tessa: { at: [2.3, -1.4], face: 0, anim: 'idle' } },
  cast: {},
  props: {
    wagen: { kind: 'snackwagen', at: [6.4, 0.2, 0], face: 270 },
    friteuse: { kind: 'friteuse', at: [3.2, -1.5, 0], face: 270 },
    doos: { kind: 'doos', at: [3.8, 3.4, 0], face: 20 },
  },
  open: [{ actor: 'tammo', anim: 'hurken' }, { actor: 'tessa', face: 'prop:friteuse' }],
  beats: [
    { on: 'Het beslag staat', actor: 'tessa', anim: 'point' },
    { on: 'Doe de friteuse aan', actor: 'tessa', anim: 'point' },
    { on: 'Doe de friteuse aan', dt: 0.2, actor: 'tammo', anim: 'stop' },
    { on: 'Doe de friteuse aan', dt: 0.5, actor: 'tammo', walk: [[2.3, -0.4]], speed: 1.3 },
    { on: 'Is dat een knop of een gebed', actor: 'tammo', face: 'prop:friteuse' },
    { on: 'Is dat een knop of een gebed', dt: 0.3, actor: 'tammo', anim: 'shrug' },
    { on: 'Eerst een knop', actor: 'tessa', anim: 'hips' },
    { on: 'Ik bak. Jij rijdt', actor: 'tessa', anim: 'point' },
    { on: 'Ik bak. Jij rijdt', dt: 1.0, actor: 'tessa', anim: 'lean' },
    { on: 'Dat was mijn plan al', actor: 'tammo', anim: 'nod' },
  ],
  shots: [CLOSE('Is dat een knop of een gebed', 'tammo', { dist: 1.3, side: 0.6 }), { on: 'Ik bak. Jij rijdt', dt: 0.2, shot: 'dolly', from: [-0.2, -2.6, 1.5], to: [1.0, -2.0, 1.55], look: 'mid:tammo,tessa@1.35', fov: 36 }],
  wide: WIDE([-1.2, 2.6, 2.4], [0.4, 1.8, 2.0], 'mid:tammo,tessa@1.2'),
};

// --- F3 Soep en eierbal: Oma Trijntje en Beppe in een keuken (de verzoening van Groningers en Friezen) ---
S.F3 = {
  set: 'omakeuken',
  cast: {
    beppe: { key: 'beppe', at: [2.3, -0.9], face: 175, anim: 'idle', gest: ['talk', 'nod', 'point'] },
    trijntje: { key: 'trijntje', at: [2.5, 1.0], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point'] },
    mem: { key: 'mem', at: [3.2, -2.2], face: 160, anim: 'idle', gest: ['talk', 'shrug', 'nod'] },
    durk: { key: 'durk', at: [4.0, 2.7], face: 200, anim: 'idle', gest: ['talk', 'shrug'] },
    douwe: { key: 'douwe', at: [4.0, 1.9], face: 195, anim: 'idle', gest: ['talk', 'shrug'] },
  },
  props: { ketel: { kind: 'soepketel', at: [2.55, -0.45, 0.95] } },
  open: [{ actor: 'tessa', face: 'actor:beppe' }, { actor: 'tammo', face: 'actor:trijntje' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'mem', walk: [[2.8, -1.8]], speed: 0.8 },
    { on: 'Dit is mijn keuken', actor: 'trijntje', anim: 'hips' },
    { on: 'Ytst dan mar earst', actor: 'beppe', anim: 'point' },
    { on: 'Wat zegt ze', actor: 'trijntje', anim: 'shrug' },
    { on: 'Oma Trijntje, Beppe', actor: 'tammo', anim: 'point' },
    { on: 'Hij is Gronings', actor: 'tessa', anim: 'point' },
    { on: 'Ik ben het niemandsland', actor: 'tammo', anim: 'shrug' },
    { on: 'Mogen wij ook soep', actor: 'douwe', anim: 'shrug' },
    { on: 'Dan eet je in de gang', actor: 'mem', anim: 'point' },
    { on: 'It smakket', actor: 'beppe', anim: 'nod' },
    { on: 'Moi. Het is soep', actor: 'trijntje', anim: 'nod' },
    { on: 'Dat is het menu', actor: 'tessa', anim: 'laugh' },
  ],
  shots: [CLOSE('Ik ben het niemandsland', 'tammo', { dist: 1.2 }), CLOSE('It smakket', 'beppe', { dist: 1.3 })],
  wide: WIDE([-3.8, 2.4, 2.6], [-2.2, 1.6, 2.1], 'mid:beppe,trijntje@1.2'),
};

// --- F4 Foar mem, achteraan de rij: Jelle zonder limo achteraan, Mem aan zijn arm; de doorslag is zijn oma ---
S.F4 = {
  duo: { tammo: { at: [5.2, -1.3], face: 90, anim: 'idle' }, tessa: { at: [5.2, -0.1], face: 90, anim: 'idle' } },
  cast: {
    ...queue(5, 4.6, 0.7, 0.6),
    jelle: { key: 'jelle', at: [4.6, 4.0], face: 270, anim: 'idle', gest: ['hips', 'shrug', 'shake', 'talk'] },
    mem: { key: 'mem', at: [4.6, 4.7], face: 270, anim: 'idle', gest: ['hips', 'talk', 'shake'] },
    durk: { key: 'durk', at: [2.8, 2.0], face: 180, anim: 'idle', gest: ['point', 'talk'] },
    douwe: { key: 'douwe', at: [2.8, 2.8], face: 180, anim: 'idle', gest: ['shrug', 'talk'] },
  },
  props: { wagen: { kind: 'snackwagen', at: [6.7, -1.1, 0], face: 270 }, pot: { kind: 'mosterdpot', at: [5.6, -0.7, 1.12], hidden: true } },
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }],
  beats: [
    { on: 'Eén eierbal', actor: 'jelle', anim: 'point' },
    { on: 'Je staat achteraan', actor: 'tessa', anim: 'hips' },
    { on: 'Ik had een vergunning', actor: 'jelle', anim: 'shrug' },
    { on: 'Gewoon in de rij', actor: 'durk', anim: 'point' },
    { on: 'Het werkt', actor: 'douwe', anim: 'nod' },
    { on: 'Je mag hem één klap', actor: 'tessa', anim: 'point' },
    { on: 'Ik heb erover nagedacht', actor: 'tammo', anim: 'look' },
    { on: 'Dat staat niet in de vergunning', actor: 'jelle', anim: 'shake' },
    { on: 'Ik heb ook geen vergunning', actor: 'tammo', anim: 'shrug' },
    { on: 'Ik heb ook geen vergunning', dt: 0.8, actor: 'jelle', walk: [[3.7, 3.9], [3.6, 0.9]], speed: 1.6 },
    { on: 'Ik heb ook geen vergunning', dt: 0.8, actor: 'mem', walk: [[3.7, 4.6], [3.6, 1.7]], speed: 1.6 },
    { on: 'Mems mosterd', actor: 'jelle', face: 'prop:pot' },
    { on: 'Mems mosterd', dt: 0.3, prop: 'pot', show: true },
    { on: 'Ik zei niet mogen', actor: 'mem', anim: 'hips' },
    { on: 'Een euro vijftig', actor: 'tessa', anim: 'point' },
    { on: '...Ik heb nog nooit', actor: 'jelle', anim: 'shrug' },
  ],
  shots: [CLOSE('Ik heb ook geen vergunning', 'tammo', { dist: 1.3 }), CLOSE('Ik zei niet mogen', 'mem', { dist: 1.3 }), CLOSE('Een euro vijftig', 'tessa', { dist: 1.25 })],
  crowd: { shape: 'line', pts: [[12, -8], [12, 10]], count: 12, side: 3, spread: 2.5, seed: 2130, key: 'cut:slot4' },
  wide: { from: [-0.4, 1.4, 2.8], to: [1.0, 0.8, 2.4], look: 'mid:tessa,jelle@1.3', fov: 62, until: 1 },
};

// --- F5 Een avond voor twee: zoet en komisch, het lijstje in de zak van Tammo, twee kratten aan de kade, de duif draait rondjes ---
S.F5 = {
  // regieronde #1325: ze zitten naast elkaar met de rug naar de wagen; elke camera staat aan hun voorkant (de oude dekking stond tussen
  // hen en de wagen: achterhoofden en een wagen die het kader vulde). Avondlicht, warmer vanaf "Zijn we nu een stel".
  coverage: 'front', front: { f: 1.5, h: 1.15, lookH: 1.1, fov: 30 },
  light: 'avond-buiten',
  lights: [{ on: 'Zijn we nu een stel', light: 'warm-intiem' }],
  duo: { tammo: { at: [3.4, -0.3], face: 180, anim: 'idle', sit: 0.4 }, tessa: { at: [3.4, 0.6], face: 180, anim: 'idle', sit: 0.4 } },
  cast: {},
  props: {
    wagen: { kind: 'snackwagen', at: [7.4, -4.6, 0], face: 60 }, // #1325: schuin achter hen, niet als muur achter hun hoofden
    krat1: { kind: 'doos', at: [3.4, -0.3, 0], face: 0 },
    krat2: { kind: 'doos', at: [3.4, 0.6, 0], face: 0 },
    deken: { kind: 'deken', at: [3.0, 0.15, 0], face: 0 },
    duif: { kind: 'duif', at: [7.4, -4.6, 3.0], face: 0 },
  },
  open: [],
  beats: [
    { on: 'Is dit een afspraak', actor: 'tessa', anim: 'look' },
    { on: 'Het is een gelegenheid', actor: 'tammo', anim: 'shrug' },
    { on: 'Er hangt een lijstje', actor: 'tessa', anim: 'point' },
    { on: 'Eten. Wandelen', actor: 'tammo', anim: 'talk' },
    { on: 'Zeggen dat ik je leuk vind', actor: 'tammo', anim: 'shrug' },
    { on: 'Waar zet ik mijn hand', actor: 'tessa', anim: 'lean' },
    { on: 'Hier. Dat is goed', actor: 'tammo', anim: 'nod' },
    { on: 'Zijn we nu een stel', actor: 'tessa', anim: 'look' },
    { on: 'Berend telde elf seconden', actor: 'tammo', anim: 'laugh' },
    { on: 'Hier. Met jou erbij', actor: 'tammo', anim: 'nod' },
    { on: 'Vier woorden', actor: 'tessa', anim: 'laugh' },
  ],
  shots: [
    { on: 'Zijn we nu een stel', dt: 0.1, shot: 'dolly', from: [-0.6, 2.2, 1.4], to: [0.6, 1.6, 1.3], look: 'mid:tammo,tessa@0.95', fov: 34 },
    // ze zitten (kop op ca. 1,1 m): een gewone close mikt te hoog, dus eigen standpunten met een kijkhoogte
    { on: 'Hier. Met jou erbij', dt: 0.2, shot: 'cut', at: [1.6, -0.2, 1.2], look: 'mid:tammo,tessa@1.1', fov: 38 },
    { on: 'Vier woorden', dt: 0.1, shot: 'cut', at: [1.9, 1.0, 1.15], look: 'tessa@1.1', fov: 30 },
  ],
  wide: WIDE([-0.8, 0.4, 1.9], [0.4, 0.2, 1.5], 'mid:tammo,tessa@0.9'),
};

// --- F6 De kaart op het luik: eenenveertig rode stippen tegen een blauwe; de overgang naar het eindspel ---
S.F6 = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de kaart op het luik in het avondlicht
  coverage: 'ots',
  light: 'avond-buiten',
  duo: { tammo: { at: [4.3, -3.4], face: 90, anim: 'idle' }, tessa: { at: [4.3, -1.8], face: 270, anim: 'idle' } },
  cast: {},
  props: {
    wagen: { kind: 'snackwagen', at: [6.4, -2.6, 0], face: 270 },
    kaart: { kind: 'kaart', at: [5.5, -2.6, 1.15], face: 270 },
    radio: { kind: 'radio', at: [5.5, -1.6, 1.15], face: 270 },
    escapade: { kind: 'auto', at: [-3.6, -7.4, 0], face: 20 }, // #1325: verder weg, ze lopen er niet meer doorheen
  },
  open: [{ actor: 'tessa', face: 'prop:kaart' }, { actor: 'tammo', face: 'prop:kaart' }],
  beats: [
    { on: 'Eenenveertig tegen één', actor: 'tessa', anim: 'point' },
    { on: 'Eén stip. Maar wel de onze', actor: 'tammo', anim: 'shrug' },
    { on: 'Wij hebben een wagen', actor: 'tessa', anim: 'point' },
    { on: 'En een Escapade met karakter', actor: 'tammo', face: 'prop:escapade' },
    { on: 'Mevrouw Tessa', dt: 0.3, actor: 'tessa', anim: 'phone' },
    { on: 'Wedstrijd. Foar mem', actor: 'tessa', anim: 'nod' },
    { on: 'Het is half tien', actor: 'tammo', face: 'prop:radio' },
    { on: 'Alles blijft open', actor: 'tammo', anim: 'point' },
    { on: 'En de wagen. Hij rijdt', actor: 'tessa', anim: 'hips' },
    { on: 'Dan rijden we', actor: 'tammo', walk: [[-1.4, -4.4]], speed: 1.4 },
    { on: 'Dan rijden we', dt: 0.4, actor: 'tessa', walk: [[-1.9, -3.6]], speed: 1.4 },
    { on: 'Eerst de Hereweg', dt: 0.6, actor: 'tammo', face: 'prop:escapade' },
  ],
  // #1325: Tessa's eerste regel van voren (de close-up toont nu het gezicht); de rest uit de ots-dekking
  shots: [CLOSE('Eenenveertig tegen één', 'tessa', { dist: 1.6, side: 0.3, fov: 30 })],
  wide: { ...WIDE([0.2, 1.2, 2.6], [1.2, 0.2, 2.2], 'mid:tessa,tammo@1.2'), until: 0 },
};
