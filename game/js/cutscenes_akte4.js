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
    { on: 'Mijn brug is op tijd', actor: 'wubbo', anim: 'hips' },
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
    { on: 'De mosterd is gered', actor: 'tessa', anim: 'nod' },
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
    { on: 'Als daar staat', actor: 'tessa', anim: 'nod' },
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
    { on: 'Drie van de vijf staan', actor: 'tammo', anim: 'shake' },
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
    { on: 'Wij maken van de Escapade', actor: 'tessa', anim: 'point' },
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
    { on: 'Ik heb mijn boot terug', actor: 'klaas', anim: 'talk' },
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
    { on: 'Dat gaat Rikus', actor: 'tessa', anim: 'shrug' },
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
    { on: 'Dan moeten wij eerder', actor: 'tessa', anim: 'nod' },
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
    { on: 'Vandaag is het Ontzet', actor: 'tessa', anim: 'point' },
    { on: 'Vandaag is het Ontzet', dt: 3, actor: 'tammo', face: 'actor:tessa' },
    { on: 'Ik bak nooit onder druk', actor: 'tammo', anim: 'shake' },
    { on: 'Je doet alles onder druk', actor: 'tessa', anim: 'shrug' },
  ],
  shots: [{ on: 'Vandaag is het Ontzet', dt: 0.4, shot: 'dolly', from: [-2.2, 2.8, 1.8], to: [-0.6, 2.2, 1.6], look: 'mid:tammo,tessa@1.3', fov: 44 }],
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

// --- the scenes inside the missions (missions.js 'scene' stages with one script scene: the key is the scene id) ---
const PASSER = (id, look, from, to, speed = 1.1, anim = 'idle') => ({
  cast: { [id]: { key: look, at: from, face: Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI, anim, bg: true } },
  cues: [{ t: 0, actor: id, walk: [to], speed }],
});

// M20.2 the moat of Bourtange: the two henchmen are "the occupation", Tammo jumps
S['M20.2'] = {
  cast: {
    durk: { key: 'durk', at: [3.2, 1.0], face: 190, anim: 'idle', gest: ['talk', 'point', 'hips'] },
    douwe: { key: 'douwe', at: [3.2, -1.4], face: 170, anim: 'idle', gest: ['talk', 'shrug'] },
  },
  props: { bord: { kind: 'bord', at: [4.6, 3.0, 0], face: 200 } },
  open: [{ actor: 'tessa', face: 'actor:durk' }, { actor: 'tammo', face: 'actor:durk' }],
  beats: [
    { on: 'Wij zijn alleen', actor: 'durk', anim: 'point' },
    { on: 'Wat is de bezigheid', actor: 'tammo', anim: 'shrug' },
    { on: 'Durk. Dat was geheim', actor: 'douwe', anim: 'hips' },
    { on: 'Durk. Dat was geheim', dt: 0.5, actor: 'durk', anim: 'shrug' },
    { on: 'Houd even vast', actor: 'tammo', walk: [[1.6, 2.4]], speed: 1.5 },
    { on: 'Ik spring', actor: 'tammo', anim: 'lean' },
    { on: 'Ik spring', dt: 1.5, actor: 'tessa', face: 'actor:tammo' },
    { on: '…Plons', actor: 'douwe', anim: 'look' },
    { on: '…Geen plons', actor: 'douwe', anim: 'shrug' },
    { on: '…Geen plons', dt: 0.6, actor: 'tammo', anim: 'cheer' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:durk,douwe@1'),
};

// M20.3 the powder cellar: Mem takes the ball from her son
S['M20.3'] = {
  cast: {
    mem: { key: 'mem', at: [2.4, 0.6], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips', 'nod'] },
    trijntje: { key: 'trijntje', at: [2.6, -0.8], face: 180, anim: 'idle', gest: ['talk', 'point'] },
    jelle: { key: 'jelle', at: [6.2, 0.2], face: 180, anim: 'idle', gest: ['hips', 'point', 'shrug', 'talk'], carry: 'koffer' },
    berend: { key: 'berend', at: [3.6, 2.2], face: 190, anim: 'idle', gest: ['shrug', 'hips'] },
  },
  props: { koffer: { kind: 'koffer', at: [6.2, 0.2, 1] } },
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }],
  beats: [
    { on: 0, dt: 0.3, actor: 'jelle', walk: [[3.8, 0.1]], speed: 1.1 },
    { on: 'Doe open, jonge', actor: 'mem', anim: 'point' },
    { on: 'Dank je. Nu is hij van mij', actor: 'jelle', drop: 'koffer' },
    { on: 'Dank je. Nu is hij van mij', dt: 0.4, actor: 'mem', walk: [[3.0, 0.4]], speed: 1.0 },
    { on: 'Er is geen overeenkomst', actor: 'mem', anim: 'shake' },
    { on: 'Gerda belde mij', actor: 'trijntje', anim: 'point' },
    { on: 'Nul krassen. Op de heenweg', actor: 'berend', anim: 'shrug' },
    { on: 'Jij kende Mem', actor: 'tammo', anim: 'look' },
    { on: 'Dat heb ik hem geleerd', actor: 'mem', anim: 'nod' },
    { on: 'Omdat mijn zoon', actor: 'mem', anim: 'shrug' },
    { on: 'Mem. Dit is geen einde', actor: 'jelle', anim: 'point' },
    { on: 'Durk. Douwe. Haal', actor: 'jelle', walk: [[7.5, 1.5]], speed: 1.4 },
  ],
  shots: [
    { on: 'Nul krassen. Op de heenweg', dt: 0.1, shot: 'dolly', from: [-2.6, 3.4, 1.7], to: [-0.8, 2.4, 1.6], look: 'mid:berend,mem@1', fov: 44 },
    { on: 'Omdat mijn zoon', dt: 0.1, shot: 'dolly', from: [-2.2, -2.6, 1.6], to: [-0.8, -1.4, 1.5], look: 'mid:mem,jelle@1', fov: 40 },
  ],
  wide: WIDE([-4.8, 4, 3.2], [-2.8, 2.9, 2.4], 'mid:mem,jelle@1'),
};

// M21.3 at the crossing: Berend counts, Henk walks up with his hatch
S['M21.3'] = {
  cast: {
    berend: { key: 'berend', at: [3.2, 0.8], face: 185, anim: 'idle', gest: ['shrug', 'point', 'hips'] },
    henk: { key: 'henk', at: [12, -6], face: 150, anim: 'idle', gest: ['talk', 'point'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }, { t: 0, actor: 'henk', walk: [[3.8, -1.6]], speed: 1.4 }],
  beats: [
    { on: 'Nul krassen op de auto', actor: 'berend', anim: 'shrug' },
    { on: 'Dat tel je niet', actor: 'tessa', anim: 'hips' },
    { on: 'Ik tel alles', actor: 'berend', anim: 'point' },
    { on: 'Henk. Tinus', actor: 'henk', anim: 'point' },
  ],
  shots: [],
  wide: WIDE([-5, 4, 3.2], [-3, 3, 2.4], 'mid:berend,tessa@1'),
};

// M22.2 the hatch is in: Henk shows the Escapade with a hole, Sjabbe comes by with news about the watch
S['M22.2'] = {
  cast: {
    henk: { key: 'henk', at: [2.8, 1.0], face: 185, anim: 'idle', gest: ['point', 'hips', 'talk', 'nod'] },
    sjabbe: { key: 'sjabbe', at: [11, -5], face: 160, anim: 'idle', gest: ['talk', 'shrug'] },
    tinus: { key: 'tinus', at: [5.6, -3.2], face: 190, anim: 'idle', bg: true, gest: ['look', 'nod', 'hips'] },
  },
  props: { escapade: { kind: 'auto', at: [4.4, 3.4, 0], face: 250 }, trekker: { kind: 'trekker', at: [8, -4.5, 0], face: 160 } },
  open: [{ actor: 'tessa', face: 'prop:escapade' }, { actor: 'tammo', face: 'prop:escapade' }, { actor: 'henk', face: 'prop:escapade' }],
  beats: [
    { on: 'Het luik zit aan de zijkant', actor: 'henk', anim: 'point' },
    { on: 'Dat is een Fjord Frituur', actor: 'tessa', anim: 'shrug' },
    { on: 'Een Escapade met een gat', actor: 'tammo', anim: 'point' },
    { on: 'Een karaktergat', actor: 'henk', anim: 'nod' },
    { on: 'Het is klaar', actor: 'tessa', anim: 'hips' },
    { on: 'Het is blauw', actor: 'tammo', anim: 'shake' },
    { on: 'Het is de kleur van de naam', actor: 'tessa', anim: 'point' },
    { on: 'Het luik is betaald', actor: 'henk', face: 'actor:sjabbe' },
    { on: 'Het luik is betaald', dt: 0.3, actor: 'sjabbe', walk: [[3.4, -1.8]], speed: 1.5 },
    { on: 'Tessa. Sjabbe', actor: 'sjabbe', anim: 'talk' },
    { on: 'Het horloge van je opa', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Het horloge van je opa', dt: 0.6, actor: 'tammo', face: 'prop:escapade' },
    { on: 'Een horloge. Dit is een thuis', actor: 'tammo', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:henk,escapade@1'),
};

// M22.4 the barn at night: the two of them apologise beside the car, Tinus walks across the yard
S['M22.4'] = {
  cast: { tinus: { key: 'tinus', at: [9, 4], face: 200, anim: 'idle', bg: true, gest: ['look', 'nod'] } },
  props: { escapade: { kind: 'auto', at: [4.2, 0.2, 0], face: 90 }, trekker: { kind: 'trekker', at: [7.5, 3.2, 0], face: 150 } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }, { t: 0, actor: 'tinus', walk: [[5.2, 2.4], [7, 1.2]], speed: 0.7 }],
  beats: [
    { on: 'We hebben een wagen', actor: 'tessa', walk: [[2.6, -0.9]], speed: 0.8 },
    { on: 'We hebben een wagen', dt: 0.5, actor: 'tammo', walk: [[2.4, 0.5]], speed: 0.8 },
    { on: 'Sorry. Dat ik nooit', actor: 'tammo', anim: 'shrug' },
    { on: 'Je zei net iets', actor: 'tessa', anim: 'nod' },
    { on: 'Jij zweeg omdat', actor: 'tammo', anim: 'talk' },
    { on: 'Ik moet je iets vertellen', actor: 'tessa', anim: 'lean' },
    { on: 'Zeven?', actor: 'tammo', anim: 'shake' },
    { on: 'Jij? Fries?', actor: 'tammo', anim: 'laugh' },
    { on: 'Een beetje.', actor: 'tessa', anim: 'shrug' },
    { on: 'Dat verklaart waarom', actor: 'tammo', anim: 'point' },
    { on: 'Dat deed ik één keer', actor: 'tessa', anim: 'shrug' },
    { on: 'Twee keer', actor: 'tammo', anim: 'laugh' },
    { on: 'Dat is een Fjord Frituur', actor: 'tessa', face: 'prop:escapade' },
    { on: 'Dat is een Fjord Frituur', dt: 0.3, actor: 'tessa', anim: 'point' },
    { on: 'Ik ging niet weg', actor: 'tessa', walk: [[2.2, -0.2]], speed: 0.6 },
    { on: 'Ik zeg het op het Ontzet', actor: 'tammo', anim: 'nod' },
    { on: 'Dat is een belofte, Tammo', actor: 'tessa', anim: 'nod' },
  ],
  shots: [],
  wide: WIDE([-4.6, 3.6, 3], [-2.6, 2.8, 2.2], 'mid:tammo,tessa@1.2'),
};

// M23.3 Aduard: the henchmen change sides and hand over Tammo's jacket
S['M23.3'] = {
  cast: {
    durk: { key: 'durk', at: [3.4, 1.4], face: 190, anim: 'idle', gest: ['point', 'talk', 'hips'] },
    douwe: { key: 'douwe', at: [3.6, -1.4], face: 170, anim: 'idle', gest: ['nod', 'shrug'], carry: 'jas' },
  },
  props: { jas: { kind: 'doos', at: [3.6, -1.4, 1] } },
  open: [{ actor: 'tessa', face: 'actor:durk' }, { actor: 'tammo', face: 'actor:durk' }],
  beats: [
    { on: 'Douwe. Hij is niet de baas', actor: 'durk', anim: 'point' },
    { on: 'Wij zijn alleen', actor: 'durk', anim: 'talk' },
    { on: 'En nu zijn wij de bezigheid van mem', actor: 'durk', anim: 'hips' },
    { on: 'Van Jelles mem', actor: 'tammo', anim: 'shrug' },
    { on: 'Van alle mems', actor: 'durk', anim: 'point' },
    { on: 'En hier is je jas', actor: 'douwe', walk: [[1.2, 0.2]], speed: 1.1 },
    { on: 'En hier is je jas', dt: 2.4, actor: 'douwe', drop: 'jas' },
  ],
  shots: [],
  wide: WIDE([-4.8, 4, 3], [-2.8, 2.9, 2.3], 'mid:durk,douwe@1'),
};

// M25.3 Oma's kitchen: Jelle makes his offer, the answer is not money
S['M25.3'] = {
  cast: {
    jelle: { key: 'jelle', at: [6, 2], face: 190, anim: 'idle', gest: ['nod', 'hips', 'point', 'shrug'] },
    trijntje: { key: 'trijntje', at: [-2.2, 1.5], face: 10, anim: 'idle', bg: true, gest: ['nod', 'look'] },
    mem: { key: 'mem', at: [-2.4, -1.2], face: 350, anim: 'idle', bg: true, gest: ['look', 'shrug'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }, { actor: 'jelle', walk: [[3.2, 0.5]], speed: 1.2 }],
  beats: [
    { on: 'Ik ben een redelijk man', actor: 'jelle', anim: 'hips' },
    { on: 'Van Grunn.', actor: 'tammo', anim: 'point' },
    { on: 'Details. Geef me', actor: 'jelle', anim: 'point' },
    { on: 'Het is jouw droom', actor: 'tammo', anim: 'shrug' },
    { on: '…Het bod viel tegen', actor: 'tessa', anim: 'shake' },
    { on: 'Tegen? Dit is meer', actor: 'jelle', anim: 'shrug' },
    { on: 'Je biedt geld', actor: 'tessa', anim: 'point' },
    { on: 'Dat iemand één keer', actor: 'tessa', face: 'actor:mem' },
    { on: 'Dat iemand één keer', dt: 0.4, actor: 'mem', face: 'actor:jelle' },
    { on: 'Dat iemand één keer', dt: 2.5, actor: 'trijntje', anim: 'nod' },
    { on: '…We bakken op het Ontzet', actor: 'jelle', walk: [[7, 2.6]], speed: 1.3 },
  ],
  shots: [],
  wide: WIDE([-4.6, 3.8, 3], [-2.6, 2.8, 2.3], 'mid:jelle,tessa@1'),
};

// M26.5 the Oude Boteringestraat: Mem takes over from the limo's back seat
S['M26.5'] = {
  cast: {
    mem: { key: 'mem', at: [4.0, 1.8], face: 190, anim: 'idle', gest: ['point', 'hips', 'talk'] },
    jelle: { key: 'jelle', at: [3.4, -1.0], face: 160, anim: 'idle', gest: ['shrug', 'hips', 'shake'] },
    ...PASSER('toerist', 'toerist', [7, -6], [-3, -6.5], 1.0, 'phone').cast,
  },
  props: { limo: { kind: 'auto', at: [5.6, -3.4, 0], face: 80 } },
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }, ...PASSER('toerist', 'toerist', [7, -6], [-3, -6.5], 1.0, 'phone').cues],
  beats: [
    { on: 0, dt: 0.3, actor: 'mem', walk: [[2.4, -0.2]], speed: 1.0 },
    { on: 'Jelle. Geef hem aan mij', actor: 'mem', anim: 'point' },
    { on: 'Mem. De notaris', actor: 'jelle', anim: 'shrug' },
    { on: 'Dat is zijn probleem', actor: 'mem', anim: 'hips' },
    { on: '…Ja, mem', actor: 'jelle', anim: 'shake' },
    { on: 'Het is drie uur geweest', actor: 'tessa', anim: 'look' },
  ],
  shots: [],
  wide: WIDE([-4.4, 3.8, 3], [-2.4, 2.8, 2.3], 'mid:mem,jelle@1'),
};

// M26.6 the jury at the Vismarkt: Mem, Berend tastes (M26.6), the vote by baking score (M26.10 five, M26.11 four, M26.12 three), the result (M26.13)
const JURY_CAST = () => ({
  berend: { key: 'berend', at: [3.0, 1.5], face: 185, anim: 'idle', gest: ['point', 'hips', 'talk', 'shrug'] },
  mem: { key: 'mem', at: [2.2, -1.4], face: 170, anim: 'idle', gest: ['hips', 'nod', 'talk'] },
  trijntje: { key: 'trijntje', at: [1.6, -2.6], face: 160, anim: 'idle', gest: ['talk', 'shrug'] },
  jelle: { key: 'jelle', at: [3.6, -0.6], face: 180, anim: 'idle', gest: ['hips', 'shake', 'shrug'] },
  jurylid: { key: 'jurylid', at: [4.2, 1.0], face: 190, anim: 'idle', bg: true, gest: ['nod', 'talk'] },
  jury2: { key: 'jurylid', at: [4.6, 2.4], face: 190, anim: 'idle', bg: true, gest: ['nod'] },
  jury3: { key: 'jurylid', at: [4.4, -2.2], face: 170, anim: 'idle', bg: true, gest: ['nod'] },
  kind: { key: 'kind', at: [7, -3], face: 170, anim: 'idle', bg: true, gest: ['cheer'] },
  rikus: { key: 'rikus', at: [6, 4], face: 200, anim: 'idle', bg: true, gest: ['talk', 'point'] },
});
const JURY_WIDE = WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:berend,jelle@1');
const juryOpen = [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }];
S['M26.6'] = {
  cast: JURY_CAST(), props: {}, open: juryOpen,
  beats: [
    { on: 0, actor: 'mem', walk: [[2.0, -0.4]], speed: 0.8 },
    { on: 'Goud. …Valt mie', actor: 'berend', anim: 'nod' },
    { on: 'Berend zegt niks meer', actor: 'rikus', anim: 'point' },
    { on: 'Eén verschil', actor: 'berend', anim: 'point' },
  ],
  shots: [], wide: JURY_WIDE,
};
const vote = (extra) => ({
  cast: JURY_CAST(), props: {}, open: juryOpen,
  beats: [
    { on: 0, actor: 'jelle', walk: [[2.6, -0.3]], speed: 0.8 },
    { on: 0, actor: 'jurylid', anim: 'cheer' },
    { on: 1, actor: 'jury2', anim: 'cheer' },
    { on: 2, actor: 'jury3', anim: 'cheer' },
    ...extra,
  ],
  shots: [], wide: JURY_WIDE,
});
S['M26.10'] = vote([
  { on: 3, actor: 'jurylid', anim: 'cheer' },
  { on: 'Fjord Frituur. Vijf van de vijf', actor: 'tessa', anim: 'cheer' },
  { on: 'Fjord Frituur. Vijf van de vijf', actor: 'tammo', anim: 'cheer' },
  { on: 'Fjord Frituur. Vijf van de vijf', actor: 'kind', anim: 'cheer' },
  { on: 'Vijf van de vijf. Dat is geen jury', actor: 'jelle', anim: 'shake' },
]);
S['M26.11'] = vote([
  { on: 3, actor: 'jurylid', anim: 'shake' },
  { on: 'Fjord Frituur. Vier van de vijf', actor: 'tessa', anim: 'cheer' },
  { on: 'Fjord Frituur. Vier van de vijf', actor: 'tammo', anim: 'cheer' },
  { on: 'Fjord Frituur. Vier van de vijf', actor: 'kind', anim: 'cheer' },
]);
S['M26.12'] = vote([
  { on: 3, actor: 'jurylid', anim: 'shake' },
  { on: 'Fjord Frituur. Drie van de vijf', actor: 'tessa', anim: 'nod' },
  { on: 'Fjord Frituur. Drie van de vijf', actor: 'tammo', anim: 'nod' },
  { on: 'Drie tegen twee', actor: 'jelle', anim: 'shrug' },
]);
S['M26.13'] = {
  cast: JURY_CAST(), props: {}, open: juryOpen,
  beats: [
    { on: 'Gerda. Jouw eierbal', actor: 'trijntje', anim: 'point' },
    { on: 'Trijntje. Dat duurde', actor: 'mem', anim: 'laugh' },
    { on: 'Zie je?', actor: 'mem', walk: [[1.8, -2.0]], speed: 0.8 },
    { on: 'Hij praat Gronings', actor: 'tammo', anim: 'point' },
    { on: 'Dan is het ernstig', actor: 'tessa', anim: 'laugh' },
    { on: 'De standplaats op de Vismarkt', actor: 'tessa', anim: 'cheer' },
    { on: 'En na afloop', actor: 'berend', anim: 'point' },
    { on: 'De standplaatsen houd ik', actor: 'jelle', anim: 'hips' },
    { on: 'Dat is mijn zoon', actor: 'mem', anim: 'nod' },
  ],
  shots: [], wide: JURY_WIDE,
};

// M21.6 the wagon choice for the ball: the scratch scene (same set as M21.3)
S['M21.6'] = { ...S['M21.3'], beats: [
  { on: 'Eén kras op de auto', actor: 'berend', anim: 'shrug' },
  { on: 'Dat is mijn schuld', actor: 'tessa', anim: 'shrug' },
  { on: 'Dat is een kras', actor: 'berend', anim: 'point' },
  { on: 'Henk. Tinus', actor: 'henk', anim: 'point' },
] };

// --- M18 the intake in three outcomes (M18.2 passed, M18.6 one wrong answer, M18.7 two): the manager at his desk ---
const MANAGER = (x) => ({ accountmanager: { key: 'accountmanager', at: [x, -0.4], face: 175, anim: 'idle', gest: ['talk', 'hips', 'shrug'] } });
const mgrOpen = [{ actor: 'tessa', face: 'actor:accountmanager' }, { actor: 'tammo', face: 'actor:accountmanager' }];
S['M18.2'] = {
  cast: MANAGER(3.0), props: {}, open: mgrOpen,
  beats: [
    { on: 'Warm, droog', actor: 'accountmanager', anim: 'nod' },
    { on: 'Ik maak een offerte', actor: 'accountmanager', walk: [[3.8, -0.6]], speed: 0.7 },
    { on: 'Dat ging makkelijk', actor: 'tammo', anim: 'shrug' },
    { on: 'Wacht tot we binnen zijn', actor: 'tessa', anim: 'look' },
  ],
  shots: [], wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};
S['M18.6'] = {
  cast: MANAGER(2.6), props: {}, open: mgrOpen,
  beats: [
    { on: 'Interessant', actor: 'accountmanager', anim: 'point' },
    { on: 'Wij zijn nieuw', actor: 'tessa', anim: 'shrug' },
    { on: 'Iedereen is nieuw', actor: 'accountmanager', walk: [[2.0, -0.2]], speed: 0.8 },
    { on: 'Die staat bij de serverdeur', actor: 'tammo', anim: 'point' },
  ],
  shots: [], wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};
S['M18.7'] = {
  cast: MANAGER(2.4), props: {}, open: mgrOpen,
  beats: [
    { on: 'Twee antwoorden', actor: 'accountmanager', anim: 'point' },
    { on: 'Is dat gratis', actor: 'tammo', anim: 'shrug' },
    { on: 'Bij Wiebelwerk is alles gratis', actor: 'accountmanager', anim: 'hips' },
    { on: 'Loop maar voor', actor: 'tessa', anim: 'point' },
  ],
  shots: [], wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};

// --- M23 who rides next to the Fjord Frituur (M23.6 Wubbo, M23.7 Tinus, M23.8 Geesje) and M26 the streets they close (M26.14-16) ---
const FRIEND = (key, x, gest) => ({ [key]: { key, at: [x, 0.3], face: 180, anim: 'idle', gest } });
const friendOpen = (key) => [{ actor: 'tessa', face: `actor:${key}` }, { actor: 'tammo', face: `actor:${key}` }];
const friendWide = (key) => WIDE([-5, 4, 3.2], [-3, 3, 2.4], `mid:${key},tessa@1`);
S['M23.6'] = {
  cast: FRIEND('wubbo', 3.2, ['point', 'talk', 'hips']), props: {}, open: friendOpen('wubbo'),
  beats: [
    { on: 'Ik rijd naast jullie', actor: 'wubbo', anim: 'point' },
    { on: 'En de bruggen', actor: 'tessa', anim: 'look' },
    { on: 'Die draai ik zelf', actor: 'wubbo', anim: 'hips' },
    { on: 'Die komt een minuut later', actor: 'wubbo', anim: 'talk' },
  ],
  shots: [], wide: friendWide('wubbo'),
};
S['M23.7'] = {
  cast: FRIEND('tinus', 3.2, ['talk', 'point', 'hips']), props: {}, open: friendOpen('tinus'),
  beats: [
    { on: 'Ik rij naast jullie', actor: 'tinus', anim: 'talk' },
    { on: 'Ook een limo', actor: 'tessa', anim: 'look' },
    { on: 'Ook een limo. Aan de trekhaak', actor: 'tinus', anim: 'point' },
    { on: 'En elke keer klopt het', actor: 'tessa', anim: 'nod' },
  ],
  shots: [], wide: friendWide('tinus'),
};
S['M23.8'] = {
  cast: FRIEND('geesje', 3.0, ['talk', 'hips', 'point']), props: {}, open: friendOpen('geesje'),
  beats: [
    { on: 'Ik rij naast jullie', actor: 'geesje', anim: 'talk' },
    { on: 'Een scooter tegen een limo', actor: 'tessa', anim: 'shrug' },
    { on: 'Een limo past niet', actor: 'geesje', anim: 'point' },
    { on: 'Zegt de kerk ook', actor: 'geesje', anim: 'hips' },
  ],
  shots: [], wide: friendWide('geesje'),
};
const streets = (key, x, beats) => ({
  cast: { [key]: { key, at: [x, 0.3], face: 180, anim: 'idle', bg: true, gest: ['talk', 'point', 'hips'] } },
  props: {}, open: friendOpen(key), beats, shots: [], wide: friendWide(key),
});
S['M26.14'] = streets('wubbo', 5.0, [
  { on: 'Herestraat dicht', actor: 'wubbo', anim: 'point' },
  { on: 'Dank je, Wubbo', actor: 'tessa', anim: 'nod' },
  { on: 'Dat mag niet', actor: 'tessa', anim: 'shake' },
  { on: 'Het is een bus', actor: 'tammo', anim: 'shrug' },
]);
S['M26.15'] = streets('tinus', 5.0, [
  { on: 'Zuiderdiep dicht', actor: 'tinus', anim: 'point' },
  { on: 'Je trekker past er net in', actor: 'tessa', anim: 'look' },
  { on: 'Ik trek hem weg', actor: 'tinus', anim: 'hips' },
  { on: 'In de stad ziet hij', actor: 'tammo', anim: 'shrug' },
]);
S['M26.16'] = streets('geesje', 5.0, [
  { on: 'De steeg bij de notaris', actor: 'geesje', anim: 'point' },
  { on: 'Je zit te breien', actor: 'tessa', anim: 'shrug' },
  { on: 'Wie blijft staan', actor: 'geesje', anim: 'talk' },
  { on: 'Klopt', actor: 'tammo', anim: 'nod' },
]);
// everyone steps closer as the scene starts (the scene test wants something to move)
for (const [id, key, x] of [['M18.7', 'accountmanager', 2.4], ['M23.6', 'wubbo', 3.2], ['M23.7', 'tinus', 3.2], ['M23.8', 'geesje', 3.0], ['M26.14', 'wubbo', 5.0], ['M26.15', 'tinus', 5.0], ['M26.16', 'geesje', 5.0]]) {
  S[id].beats.unshift({ on: 0, dt: 0.3, actor: key, walk: [[x - 1.4, 0.2]], speed: 0.9 });
}
