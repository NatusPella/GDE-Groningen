// Akte 4 and 5 of the new story, staged (#136, #147): the intros and outros of M17-M20 and M22-M26 as
// cutscript scenes (see cutscenes_akte1.js for the format of a spec). The specs are added to MORE_SPECS,
// which cutscenes_akte1.js missionScene() reads too. The spoken lines come from the story (script.json);
// no recordings, no text is changed here. A beat whose line is not found (an edited text) is skipped.
// Coordinates are local to the player's spot: f forward, s left (m). M21 is a solo scene (Anita and Berend
// in the car) and stays as it was.
import { MORE_SPECS as S } from './cutscenes_akte1.js';

const WIDE = (from, to, look) => ({ from, to, look, fov: 50, until: 1 });

// --- M17 Open, dicht: Wubbo at the bridge, the fanfare tempo ---
S['M17.intro'] = {
  cast: { wubbo: { key: 'wubbo', at: [3.2, 0.3], face: 180, anim: 'idle', gest: ['point', 'talk', 'hips', 'point'] } },
  props: { bord: { kind: 'bord', at: [3.8, 2.4, 0], face: 160 } },
  open: [{ actor: 'tessa', face: 'actor:wubbo' }, { actor: 'tammo', face: 'actor:wubbo' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'wubbo', walk: [[2, 0.4]], speed: 0.8 },
    { on: 'Durk zei dat Jelle', actor: 'tessa', anim: 'point' },
    { on: 'Hoe weten we wanneer', actor: 'tammo', anim: 'shrug' },
    { on: 'Elf bruggen', actor: 'wubbo', anim: 'point' },
    { on: 'De brug draait op tijd', actor: 'wubbo', anim: 'hips' },
    { on: 'Welke zaterdag', actor: 'tessa', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:wubbo,tessa@1'),
};
S['M17.outro'] = {
  cast: { wubbo: { key: 'wubbo', at: [3, 0.2], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:wubbo' }, { actor: 'tammo', face: 'actor:wubbo' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'wubbo', walk: [[2, 0.2]], speed: 0.8 },
    { on: 'Die brug draait niet', actor: 'wubbo', anim: 'shake' },
    { on: 'Dat is plakje zeven', actor: 'tessa', anim: 'nod' },
    { on: 'Er is een webbureau', actor: 'wubbo', anim: 'point' },
    { on: 'Om middernacht. Net als', actor: 'tammo', anim: 'point' },
    { on: 'Dat is toeval', actor: 'tessa', anim: 'shrug' },
    { on: 'Dat moeten we weten', actor: 'tammo', anim: 'nod' },
  ],
  shots: [],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:wubbo,tammo@1'),
};

// --- M18 Wiebelwerk: the glass office in Veendam, a desk with a screen ---
S['M18.intro'] = {
  cast: { accountmanager: { key: 'accountmanager', at: [3.4, -0.4], face: 175, anim: 'idle', gest: ['talk', 'hips', 'point', 'talk'] } },
  props: { klembord: { kind: 'klembord', at: [2.4, -0.9, 0.9] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'Dat is toch geen misdaad', actor: 'tessa', anim: 'shrug' },
    { on: 'Wie de camera', actor: 'tammo', anim: 'point' },
    { on: 'Dan kijken we in het logboek', actor: 'tessa', anim: 'nod' },
    { on: 'Welkom bij Wiebelwerk', actor: 'accountmanager', walk: [[2.2, -0.2]], speed: 0.9 },
    { on: 'Welkom bij Wiebelwerk', dt: 0.3, actor: 'accountmanager', face: 'actor:tessa' },
    { on: 'Een website voor een frietwagen', actor: 'tessa', anim: 'talk' },
    { on: 'Prachtig. Dan beginnen', actor: 'accountmanager', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-5, 4, 3.2], [-3, 3, 2.4], 'mid:tammo,tessa@1'),
};
S['M18.outro'] = {
  cast: { accountmanager: { key: 'accountmanager', at: [2.6, -0.3], face: 175, anim: 'idle', gest: ['hips', 'shrug', 'talk'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:accountmanager' }, { actor: 'tammo', face: 'actor:accountmanager' }],
  beats: [
    { on: 'Wiebelwerk stelt niks', actor: 'accountmanager', anim: 'shrug' },
    { on: 'Een webbureau', dt: 0.5, actor: 'accountmanager', walk: [[3.4, -0.3]], speed: 0.7 },
    { on: 'Een alibi', actor: 'tammo', anim: 'point' },
    { on: 'Een webbureau', actor: 'tessa', anim: 'look' },
    { on: 'Dan is het niet Wiebelwerk', actor: 'tammo', anim: 'nod' },
    { on: 'Dan is het Jelle', actor: 'tessa', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};

// --- M19 Stoom: the platform at Stadskanaal, the steam train waiting ---
S['M19.intro'] = {
  cast: { durk: { key: 'durk', at: [4, 1.6], face: 190, anim: 'idle', bg: true, gest: ['talk', 'shrug'] } },
  props: { koffer: { kind: 'koffer', at: [1.6, -1.6, 0] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'Wie rijdt hem dan', actor: 'tammo', anim: 'shrug' },
    { on: 'Jij.', actor: 'tessa', anim: 'point' },
    { on: 'Ik heb nog nooit', actor: 'tammo', anim: 'shake' },
    { on: 'Je hebt een fiets', actor: 'tessa', anim: 'shrug' },
    { on: 'Vergelijkbaar', actor: 'tammo', anim: 'nod' },
    { on: 'Dan rijd jij hem', actor: 'tessa', walk: [[-1.6, -2.4]], speed: 1 },
    { on: 'Douwe. Het is de baas', actor: 'durk', face: 'actor:tammo' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:tammo,tessa@1'),
};
S['M19.outro'] = {
  cast: {
    jurylid: { key: 'jurylid', at: [3, 0.9], face: 190, anim: 'idle', gest: ['shake', 'talk', 'hips'] },
    bewaarder: { key: 'bewaarder', at: [3.6, -1.3], face: 170, anim: 'idle', gest: ['shrug', 'hips', 'talk'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:jurylid' }, { actor: 'tammo', face: 'actor:jurylid' }],
  beats: [
    { on: 'Ik stap hier uit', actor: 'jurylid', anim: 'shake' },
    { on: 'Ik stap hier uit', dt: 0.4, actor: 'jurylid', walk: [[2.2, 0.9]], speed: 0.8 },
    { on: 'Ik niet. Ik heb een contract', actor: 'jurylid', face: 'actor:bewaarder' },
    { on: 'Ik stap niet uit', actor: 'bewaarder', anim: 'hips' },
    { on: 'Eén jurylid gered', actor: 'tessa', anim: 'shrug' },
    { on: 'Eén van vijf', actor: 'tammo', anim: 'shake' },
    { on: 'Ik heb een trein bestuurd', actor: 'tammo', anim: 'cheer' },
    { on: 'Je hebt hem in een station', actor: 'tessa', anim: 'nod' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:jurylid,bewaarder@1'),
};

// --- M20 Het beleg van Bourtange: the ramparts, the cardboard horse ---
S['M20.intro'] = {
  cast: {
    berend: { key: 'berend', at: [3.2, 0.5], face: 180, anim: 'idle', gest: ['point', 'hips', 'talk', 'point'] },
    durk: { key: 'durk', at: [6.5, -3.2], face: 200, anim: 'idle', bg: true, gest: ['talk', 'shrug'] },
    douwe: { key: 'douwe', at: [7.3, -2.6], face: 200, anim: 'idle', bg: true, gest: ['shrug'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'berend', walk: [[2, 0.5]], speed: 0.8 },
    { on: 'Wie valt aan', actor: 'tammo', anim: 'shrug' },
    { on: 'Ik, met veertig man', actor: 'berend', anim: 'point' },
    { on: 'En Jelle', actor: 'tessa', anim: 'look' },
    { on: 'Jelle is geen bisschop', actor: 'berend', anim: 'shake' },
    { on: 'Tammo. Wij dagen je uit', actor: 'durk', walk: [[4.4, -1.6]], speed: 1 },
    { on: 'Tammo. Wij dagen je uit', actor: 'tammo', face: 'actor:durk' },
    { on: 'Net fertelle', actor: 'durk', anim: 'laugh' },
  ],
  shots: [],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:berend,tessa@1'),
};
S['M20.outro'] = {
  cast: {
    trijntje: { key: 'trijntje', at: [3.4, 1.2], face: 180, anim: 'idle', gest: ['talk', 'hips'] },
    mem: { key: 'mem', at: [3.6, -1.2], face: 175, anim: 'idle', gest: ['talk', 'shrug'] },
    berend: { key: 'berend', at: [5.2, 0], face: 180, anim: 'idle', bg: true, gest: ['nod', 'hips'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'trijntje', walk: [[2.2, 1.0]], speed: 0.8 },
    { on: 'Wie heb je verteld', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Niemand.', actor: 'tessa', anim: 'shake' },
    { on: '…Ga je dit', actor: 'tessa', anim: 'hips' },
    { on: 'Ik wist niet waar', actor: 'tessa', anim: 'talk' },
    { on: 'Wij waren jullie voor', actor: 'trijntje', face: 'actor:tammo' },
    { on: 'Wij waren jullie voor', dt: 0.4, actor: 'trijntje', anim: 'hips' },
    { on: 'Ik wilde Jelle stoppen', actor: 'mem', anim: 'shrug' },
    { on: 'Ik rijd jullie', actor: 'berend', anim: 'point' },
    { on: 'Ik haal jouw auto', actor: 'tessa', anim: 'shrug' },
    { on: 'Eén zin, jong', actor: 'trijntje', anim: 'point' },
    { on: 'Ik heb er geen', actor: 'tammo', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:tammo,tessa@1'),
};

// --- M22 Een luik erin: Tinus' barn, Henk with his one biscuit ---
S['M22.intro'] = {
  cast: {
    tinus: { key: 'tinus', at: [3.4, 1.4], face: 185, anim: 'idle', gest: ['talk', 'hips', 'point'] },
    henk: { key: 'henk', at: [3.2, -1.2], face: 175, anim: 'idle', gest: ['point', 'hips', 'talk', 'shrug'] },
  },
  props: { doos: { kind: 'doos', at: [4.4, 0, 0] } },
  open: [{ actor: 'tessa', face: 'actor:henk' }, { actor: 'tammo', face: 'actor:tinus' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'henk', walk: [[2.2, -1.0]], speed: 0.8 },
    { on: 'Tinus, trekkertrekker', actor: 'tinus', anim: 'wave' },
    { on: 'Henk, Garage Knalpot', actor: 'henk', anim: 'point' },
    { on: 'De bal is weer weg', actor: 'tessa', anim: 'point' },
    { on: 'De Escapade is van mij', actor: 'tammo', anim: 'hips' },
    { on: 'Hij is van ons, Tammo', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Jullie praten niet', actor: 'henk', anim: 'shake' },
    { on: 'Elke deuk is', actor: 'henk', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:henk,tinus@1'),
};

// --- M23 De colonne: everyone who is coming, one by one ---
S['M23.intro'] = {
  cast: {
    mem: { key: 'mem', at: [3, 0.6], face: 180, anim: 'idle', gest: ['talk', 'point'] },
    geesje: { key: 'geesje', at: [5.5, 2.4], face: 190, anim: 'idle', bg: true, gest: ['wave', 'talk'] },
    wubbo: { key: 'wubbo', at: [6.2, -2.2], face: 185, anim: 'idle', bg: true, gest: ['point', 'talk'] },
    klaas: { key: 'klaas', at: [7.4, 1], face: 185, anim: 'idle', bg: true, gest: ['talk', 'shrug'] },
    berend: { key: 'berend', at: [8.6, -1], face: 180, anim: 'idle', bg: true, gest: ['hips', 'point'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:mem' }, { actor: 'tammo', face: 'actor:mem' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'mem', walk: [[2.0, 0.6]], speed: 0.8 },
    { on: 'Famke. Trijntje en ik', actor: 'mem', anim: 'point' },
    { on: 'Dit is de colonne', actor: 'tessa', anim: 'point' },
    { on: 'Ik rij op mijn scooter', actor: 'geesje', anim: 'wave' },
    { on: 'Ik heb de bus', actor: 'wubbo', anim: 'point' },
    { on: 'Ik ben mijn boot', actor: 'klaas', anim: 'talk' },
    { on: 'Ik rij achteraan', actor: 'berend', anim: 'point' },
    { on: 'Rijden. Niet praten', actor: 'tessa', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.4, 2.6], 'mid:mem,geesje@1'),
};
S['M23.outro'] = {
  cast: {
    rikus: { key: 'rikus', at: [3.4, 1], face: 185, anim: 'idle', gest: ['talk', 'point'] },
    jelle: { key: 'jelle', at: [4.6, -1.8], face: 170, anim: 'idle', gest: ['talk', 'hips', 'point'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'We zijn er. Allemaal', actor: 'tessa', anim: 'cheer' },
    { on: 'De grootste stoet', actor: 'tammo', anim: 'cheer' },
    { on: 'Dat zeg je altijd', actor: 'tessa', anim: 'shrug' },
    { on: 'De colonne is aangekomen', actor: 'rikus', anim: 'point' },
    { on: 'Mevrouw. De colonne', actor: 'jelle', walk: [[3.2, -0.4]], speed: 0.9 },
    { on: 'Mevrouw. De colonne', dt: 0.3, actor: 'jelle', face: 'actor:tessa' },
  ],
  shots: [],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:tessa,tammo@1'),
};

// --- M24 De vlag: Bert and the pigeon below the tower ---
S['M24.intro'] = {
  cast: { bert: { key: 'bert', at: [3.2, 0.4], face: 180, anim: 'idle', gest: ['point', 'talk', 'hips'] } },
  props: { duif: { kind: 'duif', at: [3.6, 0.9, 1.1] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'bert', walk: [[2, 0.4]], speed: 0.8 },
    { on: 'Die Fries noemde', actor: 'bert', anim: 'point' },
    { on: '"Foar mem', actor: 'tessa', anim: 'look' },
    { on: 'Hij hangt een vlag', actor: 'tammo', anim: 'shrug' },
    { on: 'Dat is eigenlijk best lief', actor: 'tessa', anim: 'shrug' },
    { on: 'Het is vandalisme', actor: 'tammo', anim: 'hips' },
    { on: 'Vijf touwen', actor: 'bert', anim: 'point' },
    { on: 'Ik fluit', actor: 'tammo', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:bert,tessa@1'),
};

// --- M25 Het bod: Oma's kitchen table, the four ingredients ---
S['M25.intro'] = {
  cast: {
    trijntje: { key: 'trijntje', at: [3, 0.7], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips'] },
    mem: { key: 'mem', at: [3.2, -1.4], face: 170, anim: 'idle', gest: ['talk', 'hips'] },
  },
  props: { doos: { kind: 'doos', at: [2.2, 0, 0.8] } },
  open: [{ actor: 'tessa', face: 'actor:trijntje' }, { actor: 'tammo', face: 'actor:trijntje' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'mem', walk: [[2.2, -1.2]], speed: 0.8 },
    { on: 'Mosterd, eieren, zout', actor: 'trijntje', anim: 'point' },
    { on: 'Oma… hoe zei opa', actor: 'tammo', anim: 'look' },
    { on: 'Niet. Hij zei', actor: 'trijntje', anim: 'talk' },
    { on: 'Ik zit hier ook, Trijntje', actor: 'mem', anim: 'hips' },
    { on: 'Plakje acht', actor: 'tessa', anim: 'nod' },
    { on: 'Tessa. Sjabbe. Morgen', actor: 'tessa', anim: 'phone' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:trijntje,mem@1'),
};
S['M25.outro'] = {
  cast: {
    trijntje: { key: 'trijntje', at: [3, 0.8], face: 180, anim: 'idle', gest: ['talk', 'point'] },
    mem: { key: 'mem', at: [3.2, -1.3], face: 170, anim: 'idle', gest: ['talk', 'nod'] },
    jelle: { key: 'jelle', at: [5.4, 0], face: 180, anim: 'idle', bg: true, gest: ['talk', 'hips'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:trijntje' }, { actor: 'tammo', face: 'actor:trijntje' }],
  beats: [
    { on: 'Eieren heel', actor: 'trijntje', anim: 'point' },
    { on: 'En bel Gerda', actor: 'trijntje', anim: 'wave' },
    { on: 'Ik ben tweeënnegentig', actor: 'trijntje', anim: 'shrug' },
    { on: 'Dan hoef ik niet te bellen', actor: 'trijntje', anim: 'nod' },
    { on: 'Mem. Kom je morgen', actor: 'jelle', walk: [[4, -0.6]], speed: 0.9 },
    { on: 'Mem. Kom je morgen', dt: 0.2, actor: 'jelle', face: 'actor:mem' },
    { on: 'Ik kom, jonge', actor: 'mem', anim: 'nod' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:trijntje,mem@1'),
};

// --- M26 Ontzet: the stage at the Vismarkt; the finale outro is the pair alone with the crowd ---
S['M26.intro'] = {
  cast: {
    rikus: { key: 'rikus', at: [4, 2.6], face: 190, anim: 'idle', bg: true, gest: ['talk', 'point'] },
    berend: { key: 'berend', at: [3.6, -1], face: 180, anim: 'idle', gest: ['point', 'hips', 'talk', 'point'] },
    kind: { key: 'kind', at: [5, -2.6], face: 180, anim: 'idle', bg: true, gest: ['cheer', 'talk'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'berend', walk: [[2.2, -0.8]], speed: 0.8 },
    { on: 'Moi, Grunn', actor: 'rikus', anim: 'wave' },
    { on: 'Grunn! Geef je over', actor: 'berend', anim: 'point' },
    { on: 'Nee!', actor: 'kind', anim: 'cheer' },
    { on: 'Tammo bakt', actor: 'tessa', anim: 'point' },
    { on: 'Ik bak nooit onder druk', actor: 'tammo', anim: 'shake' },
    { on: 'Je doet alles onder druk', actor: 'tessa', anim: 'shrug' },
  ],
  shots: [{ on: 'Vandaag is het Ontzet', dt: 4.5, shot: 'follow', target: 'tessa', dist: 2.8, side: -0.8, h: 1.6, fov: 40 }, { on: 'Ik bak nooit onder druk', dt: 0.3, shot: 'follow', target: 'tammo', dist: 2.6, side: 0.8, h: 1.6, fov: 38 }],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:berend,tessa@1'),
};
S['M26.outro'] = {
  cast: { rikus: { key: 'rikus', at: [4.4, 2], face: 190, anim: 'idle', bg: true, gest: ['talk', 'point'] } },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'rikus', walk: [[3.2, 1.6]], speed: 0.8 },
    { on: 'We schakelen over', actor: 'rikus', anim: 'point' },
    { on: 'Tammo. Iedereen luistert', actor: 'tessa', anim: 'nod' },
    { on: '…Woist ja wel', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Dat telt', actor: 'tessa', anim: 'nod' },
    { on: 'Ik wil bij jou blijven', actor: 'tammo', anim: 'nod' },
    { on: 'Vijf woorden', actor: 'tessa', anim: 'laugh' },
    { on: 'Mien jong', actor: 'tessa', anim: 'hips' },
    { on: 'Kon veel minder', actor: 'tessa', anim: 'laugh' },
  ],
  shots: [],
  wide: WIDE([-4.8, 3.4, 2.8], [-2.8, 2.6, 2.1], 'mid:tammo,tessa@1'),
};
