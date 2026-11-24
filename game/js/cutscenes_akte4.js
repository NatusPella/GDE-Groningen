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
    { on: 'Jelle haalt vandaag in Veendam', actor: 'tessa', anim: 'point' },
    { on: 'Hoe weten we wanneer', actor: 'tammo', anim: 'shrug' },
    { on: 'Elf bruggen', actor: 'wubbo', anim: 'point' },
    { on: 'Mijn brug is op tijd', actor: 'wubbo', anim: 'hips' },
    // het zaterdag-moment is naar overgangsscène O7 (akte 3); hier alleen een blik: Tammo kijkt naar Tessa, Tessa naar het water
    { on: 'Mijn brug is op tijd', dt: 2.8, actor: 'tammo', face: 'actor:tessa' },
    { on: 'Mijn brug is op tijd', dt: 3.0, actor: 'tessa', anim: 'look' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:wubbo,tessa@1'),
};
S['M17.outro'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); het wereldlicht bij de brug, avond onder brug elf
  coverage: 'ots',
  lights: [{ on: 'Wubbo zei dat jullie kwamen', light: 'avond-buiten' }],
  cast: {
    wubbo: { key: 'wubbo', at: [3, 0.2], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips'] },
    // inspiratiepakket: Stien, de frituurhoudster onder brug elf (M17.5)
    stien: { key: 'stien', at: [4.2, -1.6], face: 185, anim: 'idle', gest: ['talk', 'point', 'hips'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:wubbo' }, { actor: 'tammo', face: 'actor:wubbo' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'wubbo', walk: [[2, 0.2]], speed: 0.8 },
    { on: 'Die brug draait niet', actor: 'wubbo', anim: 'shake' },
    // Jelle belt vanuit zijn limo aan de overkant; Wubbo antwoordt met zijn werkfilosofie
    { on: 'Mevrouw Tessa. Mijn schip', actor: 'tessa', anim: 'phone' },
    { on: 'Open of dicht. Nooit allebei', actor: 'wubbo', anim: 'hips' },
    { on: 'De mosterd is gered', actor: 'tessa', anim: 'nod' },
    { on: 'Er is een webbureau', actor: 'wubbo', anim: 'point' },
    { on: 'Om middernacht. Net als', actor: 'tammo', anim: 'point' },
    { on: 'Dat is toeval', actor: 'tessa', anim: 'shrug' },
    { on: 'Toeval heeft ook een server', actor: 'tammo', anim: 'nod' },
    { on: 'Wubbo zei dat jullie kwamen', actor: 'stien', walk: [[2.8, -0.9]], speed: 0.8 },
    { on: 'Wubbo zei dat jullie kwamen', dt: 0.2, actor: 'stien', face: 'actor:tessa' },
    { on: 'Ik kijk alleen', actor: 'tessa', anim: 'shrug' },
    { on: 'Ik kijk alleen', dt: 2.4, actor: 'stien', anim: 'point' },
    { on: 'Die komen op de geur', actor: 'stien', anim: 'talk' },
    { on: 'Nee. Maar het is een begin', actor: 'stien', anim: 'shrug' },
  ],
  shots: [],
  // #1325: de opening van opzij (het paar kijkt naar Wubbo): Tammo's eerste regel van voren, niet zijn rug
  wide: WIDE([2.5, 5.5, 3.0], [1.8, 4.0, 2.4], 'mid:wubbo,tammo@1'),
};

// --- M18 Wiebelwerk: the office on Laan Corpus den Hoorn in the Stad, a desk with a screen ---
// #955: de intake is een kantoorscène, geen praatje in de open lucht: een collega werkt
// mee op de achtergrond en de camera gaat van een over-de-schouder naar de spreker.
S['M18.intro'] = {
  set: 'kantoor',
  // R-13: de accountmanager krijgt een naamkaart (#1138)
  fx: [{ t: 1.0, fx: 'naam', text: 'Accountmanager, Wiebelwerk', dur: 2.6 }],
  cast: {
    accountmanager: { key: 'accountmanager', at: [3.4, -0.4], face: 175, anim: 'idle', gest: ['talk', 'hips', 'point', 'talk'] },
    collega: { key: 'student', at: [1.4, 2.5], face: 250, anim: 'idle', bg: true, gest: ['talk', 'phone', 'look', 'hips'] },
  },
  props: { klembord: { kind: 'klembord', at: [2.4, -0.9, 0.9] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'Wiebelwerk. Websites', actor: 'tammo', anim: 'shrug' },
    { on: 'Wie de camera', actor: 'tammo', anim: 'point' },
    { on: 'Volgens de chat van Rikus', actor: 'tessa', anim: 'shrug' },
    { on: 'We waren er wel', actor: 'tammo', anim: 'look' },
    { on: 'Staat in het logboek', actor: 'tessa', anim: 'nod' },
    { on: 'Welkom bij Wiebelwerk', actor: 'accountmanager', walk: [[3.4, -1.6], [1.5, -1.6], [1.5, -0.4]], speed: 0.9 },
    { on: 'Welkom bij Wiebelwerk', dt: 0.3, actor: 'accountmanager', face: 'actor:tessa' },
    { on: 'Een website voor een frietwagen', actor: 'tessa', anim: 'talk' },
    { on: 'Prachtig. Dan beginnen', actor: 'accountmanager', anim: 'point' },
    // de collega loopt met een map langs de wand, achter de twee langs
    { on: 'Staat in het logboek', dt: 0.6, actor: 'collega', walk: [[0.3, 2.45]], speed: 0.7 },
    { on: 'Welkom bij Wiebelwerk', dt: 0.4, actor: 'collega', anim: 'phone' },
  ],
  shots: [
    { on: 'Welkom bij Wiebelwerk', dt: 0.2, shot: 'ots', from: 'tammo', target: 'accountmanager', dist: 1.05, side: 0.5, fov: 36 },
    { on: 'Een website voor een frietwagen', dt: 0.2, shot: 'close', target: 'tessa', dist: 1.25, side: 0.2, fov: 28 },
    { on: 'Prachtig. Dan beginnen', dt: 0.2, shot: 'close', target: 'accountmanager', dist: 1.35, side: 0.25, fov: 30 },
  ],
  wide: WIDE([-5, 4, 3.2], [-3, 3, 2.4], 'mid:tammo,tessa@1'),
};
S['M18.outro'] = {
  set: 'kantoor',
  cast: {
    accountmanager: { key: 'accountmanager', at: [2.6, -0.3], face: 175, anim: 'idle', gest: ['hips', 'shrug', 'talk'] },
    collega: { key: 'student', at: [1.2, -2.5], face: 162, anim: 'idle', bg: true, gest: ['look', 'phone', 'talk'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:accountmanager' }, { actor: 'tammo', face: 'actor:accountmanager' }],
  beats: [
    { on: 'Wiebelwerk doet niets verkeerds', actor: 'accountmanager', anim: 'shrug' },
    { on: 'Een webbureau', dt: 0.5, actor: 'accountmanager', walk: [[3.4, -0.3]], speed: 0.7 },
    { on: 'Een alibi', actor: 'tammo', anim: 'point' },
    { on: 'Een webbureau', actor: 'tessa', anim: 'look' },
    { on: 'Dan is het niet Wiebelwerk', actor: 'tammo', anim: 'nod' },
    { on: 'Dan is het Jelle', actor: 'tessa', anim: 'point' },
    { on: 'Een webbureau', dt: 0.2, actor: 'collega', walk: [[2.6, -1.6]], speed: 0.7 },
    // Mem belt: Tessa draait zich een stap van Tammo weg, Tammo hoort alleen haar kant en de jas
    { on: 'Famke. Dinsdag', actor: 'tessa', anim: 'phone' },
    { on: 'Famke. Dinsdag', dt: 0.3, actor: 'tessa', walk: [[0.1, -1.5]], speed: 0.8 },
    { on: 'Mem weer', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Dat ik mijn jas', actor: 'tessa', anim: 'shrug' },
    { on: 'Het is augustus', actor: 'tammo', anim: 'shrug' },
    { on: 'Dat zei ik ook', actor: 'tessa', anim: 'hips' },
  ],
  shots: [
    { on: 'Een webbureau', dt: 0.2, shot: 'close', target: 'tessa', dist: 1.3, side: 0.2, fov: 28 },
    { on: 'Dan is het Jelle', dt: 0.2, shot: 'ots', from: 'tammo', target: 'tessa', dist: 1.05, side: 0.45, fov: 36 },
    // sleutelmoment (de speler weet wat Tessa verbergt): Mem belt, Tessa half van Tammo afgekeerd; daarna zijn blik op haar
    { on: 'Famke. Dinsdag', dt: 0.3, shot: 'close', target: 'tessa', dist: 1.3, side: 0.35, fov: 28 },
    { on: 'Mem weer', dt: 0.1, shot: 'close', target: 'tammo', dist: 1.3, side: 0.2, fov: 28 },
  ],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};

// --- M19 Stoom: the platform at Stadskanaal, the steam train waiting ---
S['M19.intro'] = {
  cast: {
    durk: { key: 'durk', at: [4, 1.6], face: 190, anim: 'idle', bg: true, gest: ['talk', 'shrug'] },
    douwe: { key: 'douwe', at: [4.4, 0.4], face: 190, anim: 'idle', bg: true, gest: ['shrug', 'look'] },
  },
  props: { koffer: { kind: 'koffer', at: [1.6, -1.6, 0] } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 'Wie de jury koopt', actor: 'tessa', anim: 'point' },
    { on: 'Wie rijdt hem dan', actor: 'tammo', anim: 'shrug' },
    { on: 'Jij.', actor: 'tessa', anim: 'point' },
    { on: 'Ik heb nog nooit', actor: 'tammo', anim: 'shake' },
    { on: 'Je hebt een fiets', actor: 'tessa', anim: 'shrug' },
    { on: 'Vergelijkbaar', actor: 'tammo', anim: 'nod' },
    { on: 'Dan rijd jij hem', actor: 'tessa', walk: [[-1.6, -2.4]], speed: 1 },
    { on: 'Douwe. Er rijdt een nieuwe machinist', actor: 'durk', face: 'actor:tammo' },
    { on: '…machinist', actor: 'douwe', anim: 'shrug' },
  ],
  // Douwe zegt zijn echo in beeld (CS-V01/C05): een eigen close-up op zijn regel
  shots: [{ on: '…machinist', dt: 0, shot: 'close', target: 'douwe', dist: 1.5, side: 0.25, fov: 30 }],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:tessa,douwe@1'),
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
    { on: 'Ik heb een trein bestuurd', actor: 'tammo', anim: 'cheer' },
    { on: 'Je hebt hem in een station', actor: 'tessa', anim: 'nod' },
    { on: 'Berend. Wie zit de jury voor', actor: 'tessa', anim: 'phone' },
    { on: 'Vier van de vijf zijn', actor: 'tammo', anim: 'shake' },
    { on: 'Daarom zit mevrouw Hoving', actor: 'tammo', anim: 'point' },
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
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de klomp in het late licht
  coverage: 'ots',
  light: 'gouden-uur',
  cast: {
    trijntje: { key: 'trijntje', at: [3.4, 1.2], face: 180, anim: 'idle', gest: ['talk', 'hips'] },
    mem: { key: 'mem', at: [3.6, -1.2], face: 175, anim: 'idle', gest: ['talk', 'shrug'] },
    berend: { key: 'berend', at: [5.2, 0], face: 180, anim: 'idle', bg: true, gest: ['nod', 'hips'] },
  },
  // #740: het briefje op de klomp ("Tige tank foar de auto. – J.") staat naast de twee, zodat de
  // eerste regel een beeld heeft; het is dezelfde klomp-prop als in de marktkraam (cutscenes_akte1.js).
  props: {
    klomp: { kind: 'klomp', at: [2.4, -1.7, 1] },
    briefje: { kind: 'briefje', at: [2.4, -1.7, 1.16], face: 20 },
  },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'trijntje', walk: [[2.2, 1.0]], speed: 0.8 },
    { on: '"Tige tank foar de auto', actor: 'tammo', face: 'prop:klomp' },
    { on: 'Wie heb je verteld', actor: 'tammo', face: 'actor:tessa' },
    { on: 'Niemand.', actor: 'tessa', anim: 'shake' },
    { on: '…Ga je dit', actor: 'tessa', anim: 'hips' },
    { on: 'Ik wist niet waar', actor: 'tessa', anim: 'talk' },
    { on: 'Wij waren jullie voor', actor: 'trijntje', face: 'actor:tammo' },
    { on: 'Wij waren jullie voor', dt: 0.4, actor: 'trijntje', anim: 'hips' },
    { on: 'Ik gebruikte jullie om Jelle', actor: 'mem', anim: 'shrug' },
    { on: 'Ik rijd jullie', actor: 'berend', anim: 'point' },
    { on: 'Ik haal jouw auto', actor: 'tessa', anim: 'shrug' },
    { on: 'Eén zin, jong', actor: 'trijntje', anim: 'point' },
    { on: 'Ik heb er geen', actor: 'tammo', anim: 'shrug' },
  ],
  // #740: een lage push-in over de klomp met het briefje, met Tammo (die de regel zegt) in beeld.
  shots: [
    { on: '"Tige tank foar de auto', dt: 0.2, shot: 'dolly', from: [0.8, -2.9, 1.0], to: [1.7, -2.2, 1.15], look: 'tammo@1.3', fov: 34 },
    // sleutelscène (de ruzie): Tammo's gezicht na "Jij zegt nooit iets!", Tessa na Berends tel, Tammo's lege handen aan het eind (R-21)
    { on: 'Jij zegt nooit iets!', dt: 1.2, shot: 'close', target: 'tammo', dist: 1.3, side: 0.2, fov: 28, offscreen: 'reaction: Tessa is te horen, Tammo is te zien' },
    { on: 'Twee keer', dt: 0.1, shot: 'close', target: 'berend', dist: 2.2, side: 0.3, fov: 32 }, // #1325: wie telt, is eerst te zien
    { on: 'Nee, dat klopt niet', dt: -0.15, shot: 'close', target: 'tessa', dist: 1.3, side: 0.2, fov: 28 }, // Tessa na Berends tel
    { on: 'Eén zin, jong', dt: 0.1, shot: 'close', target: 'trijntje', dist: 2.0, side: 0.3, fov: 32 }, // #1325: Oma zegt het in beeld
    { on: 'Ik heb er geen', dt: 0.1, shot: 'close', target: 'tammo', dist: 1.4, side: 0.2, fov: 28 },
  ],
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
    { on: 'Welkom in mijn schuur', actor: 'tinus', anim: 'wave' },
    { on: 'Ik heb een luik, een uitlaat', actor: 'henk', anim: 'point' },
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
    // CS-V01: Tinus praat in deze scène, dus hij staat er ook (bij zijn trekker, tussen Wubbo en Klaas)
    tinus: { key: 'tinus', at: [6.8, -0.2], face: 185, anim: 'idle', bg: true, gest: ['point', 'talk'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:mem' }, { actor: 'tammo', face: 'actor:mem' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'mem', walk: [[2.0, 0.6]], speed: 0.8 },
    { on: 'Famke. Trijntje en ik', actor: 'mem', anim: 'point' },
    { on: 'Jelle huurt morgen de hele Markt', actor: 'tessa', anim: 'point' },
    { on: 'Ik rij op mijn scooter', actor: 'geesje', anim: 'wave' },
    { on: 'Ik rij de bus', actor: 'wubbo', anim: 'point' },
    { on: 'Ik de trekker', actor: 'tinus', anim: 'point' },
    { on: 'Ik heb mijn rubberboot terug', actor: 'klaas', anim: 'talk' },
    { on: 'Ik achteraan', actor: 'berend', anim: 'point' },
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
    // WP6: de duivenband krijgt een grap en nooit een uitleg
    { on: 'En waarom luistert die duif', actor: 'tessa', anim: 'shrug' },
    { on: 'Geen idee', actor: 'tammo', anim: 'shake' },
    { on: 'Hij weet het niet, jong', actor: 'bert', anim: 'shrug' },
    { on: 'Ik fluit', actor: 'tammo', anim: 'point' },
  ],
  shots: [{ on: 'Hij weet het niet, jong', dt: 0.2, shot: 'close', target: 'bert', dist: 1.3, side: 0.25, fov: 28 }],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:bert,tessa@1'),
};

// --- M25 Het bod: Oma's kitchen table, the four ingredients ---
S['M25.intro'] = {
  // as-sprongen hersteld (180-gradenregel): deze shots vervangen de gegenereerde (missionScene, spec.shotFix)
  shotFix: [
    { t: 'L8', shot: 'cut', at: [0.71, 0.45, 2], look: 'mid:tammo,tessa@1.3', fov: 40 },
    { t: 'L12', shot: 'cut', at: [5.19, 1.5, 2.8], look: 'speaker', fov: 44 },
    { t: 'L13+3.38', shot: 'dolly', from: [0.97, -3.5, 2.5], to: [1.75, -1.98, 3.4], look: 'mid:trijntje,mem@1', fov: 50 },
  ],
  set: 'omakeuken',
  cast: {
    trijntje: { key: 'trijntje', at: [2.4, 0.7], face: 180, anim: 'idle', gest: ['talk', 'point', 'hips'] },
    mem: { key: 'mem', at: [3.0, -1.4], face: 170, anim: 'idle', gest: ['talk', 'hips'] },
  },
  props: { doos: { kind: 'doos', at: [1.8, 0, 0.8] } },
  open: [{ actor: 'tessa', face: 'actor:trijntje' }, { actor: 'tammo', face: 'actor:trijntje' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'mem', walk: [[2.2, -1.2]], speed: 0.8 },
    { on: 'Mosterd van Wubbo', actor: 'trijntje', anim: 'point' },
    { on: 'Oma… hoe zei opa', actor: 'tammo', anim: 'look' },
    { on: 'Niet. Hij zei', actor: 'trijntje', anim: 'talk' },
    { on: 'Ik zit hier ook, Trijntje', actor: 'mem', anim: 'hips' },
    { on: 'Dan houden wij Jelle tegen', actor: 'tessa', anim: 'nod' },
    { on: 'De notaris zit in de Oude Boteringestraat', actor: 'tessa', anim: 'phone' },
  ],
  shots: [],
  wide: WIDE([-3.9, 2.4, 2.8], [-2.4, 1.8, 2.2], 'mid:trijntje,mem@1'),
};
S['M25.outro'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); het familiediner laat op de avond
  coverage: 'ots',
  lights: [{ on: 'We waren in de buurt', light: 'avond-binnen' }],
  set: 'omakeuken',
  cast: {
    trijntje: { key: 'trijntje', at: [2.4, 0.8], face: 180, anim: 'idle', gest: ['talk', 'point'] },
    mem: { key: 'mem', at: [2.6, -1.3], face: 170, anim: 'idle', gest: ['talk', 'nod'] },
    jelle: { key: 'jelle', at: [3.9, 0], face: 180, anim: 'idle', bg: true, gest: ['talk', 'hips'] },
    // inspiratiepakket: het familiediner (M25.6); Tessa's vader is een figurant zonder tekst
    anneke: { key: 'anneke', at: [3.4, 1.4], face: 180, anim: 'idle', gest: ['talk', 'hips', 'point'] },
    lieke: { key: 'lieke', at: [2.2, 1.9], face: 185, anim: 'idle', gest: ['talk', 'shrug'] },
    vader: { key: 'boer', at: [4.2, 1.1], face: 185, anim: 'idle', bg: true, gest: ['nod'] },
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
    { on: 'We waren in de buurt', actor: 'anneke', anim: 'point' },
    { on: 'Mam. Het is half twaalf', actor: 'tessa', anim: 'hips' },
    { on: 'Ga zitten. Eet een eierbal', actor: 'trijntje', anim: 'point' },
    { on: 'Bij ons gaan eieren niet', actor: 'anneke', anim: 'hips' },
    { on: 'Bij ons gaan eieren niet', dt: 1.8, actor: 'trijntje', anim: 'shrug' },
    { on: 'Zijn jullie al samen', actor: 'lieke', anim: 'point' },
    { on: 'Wij wonen samen', dt: 1.5, actor: 'lieke', anim: 'talk' },
    { on: 'Wij wonen samen', dt: 3.6, actor: 'trijntje', anim: 'point' },
    { on: 'Ik zeg liever niks', actor: 'tammo', anim: 'shrug' },
    { on: 'Dat zag ik al', actor: 'anneke', anim: 'nod' },
  ],
  shots: [],
  wide: WIDE([-3.9, 2.4, 2.8], [-2.4, 1.8, 2.2], 'mid:trijntje,mem@1'),
};

// --- M26 Ontzet: the stage at the Vismarkt; the finale outro is the pair alone with the crowd ---
S['M26.intro'] = {
  // as-sprongen hersteld (180-gradenregel): deze shots vervangen de gegenereerde (missionScene, spec.shotFix)
  shotFix: [
    { t: 'L3', shot: 'cut', at: [4.41, -0.44, 1.55], look: 'speaker', fov: 38 },
    { t: 'L10', shot: 'cut', at: [1.24, 0.79, 1.55], look: 'speaker', fov: 38 },
    { t: 'L21', shot: 'cut', at: [4.33, 0.26, 1.55], look: 'speaker', fov: 38 },
  ],
  cast: {
    rikus: { key: 'rikus', at: [4, 2.6], face: 190, anim: 'idle', bg: true, gest: ['talk', 'point'] },
    berend: { key: 'berend', at: [3.6, -1], face: 180, anim: 'idle', gest: ['point', 'hips', 'talk', 'point'] },
    kind: { key: 'kind', at: [5, -2.6], face: 180, anim: 'idle', bg: true, gest: ['cheer', 'talk'] },
    // CS-V01: Jelle praat in M26.2 en staat daarom aan de rand van het beeld, bij zijn limo
    jelle: { key: 'jelle', at: [5.8, -1.6], face: 175, anim: 'idle', bg: true, gest: ['hips', 'shake'] },
  },
  props: {},
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }],
  beats: [
    { on: 0, dt: 0.4, actor: 'berend', walk: [[2.2, -0.8]], speed: 0.8 },
    { on: 'Moi, Grunn', actor: 'rikus', anim: 'wave' },
    { on: 'Grunn! Geef je over', actor: 'berend', anim: 'point' },
    { on: 'Nee!', actor: 'kind', anim: 'cheer' },
    { on: 'Vandaag winnen we eerlijk', actor: 'tessa', anim: 'point' },
    { on: 'Vandaag winnen we eerlijk', dt: 3, actor: 'tammo', face: 'actor:tessa' },
    { on: 'Ik bak nooit onder druk', actor: 'tammo', anim: 'shake' },
    { on: 'Je doet alles onder druk', actor: 'tessa', anim: 'shrug' },
    // M26.2: de regels in korte beurten, met Tessa en Rikus als reactie
    { on: 'Voor iedereen. De beste eierbal', actor: 'berend', anim: 'point' },
    { on: 'En de Gouden Eierbal', actor: 'tessa', anim: 'look' },
    { on: 'Die gaat terug naar het museum', actor: 'berend', anim: 'point' },
    { on: 'Mevrouw Hoving, de bewaarder', actor: 'rikus', anim: 'shrug' },
    { on: 'Ik heb nog nooit iets gewonnen', actor: 'berend', anim: 'shrug' },
    { on: 'Een notaris gaat boven', actor: 'jelle', anim: 'point' },
    { on: 'Een notaris gaat boven', dt: 4, actor: 'jelle', walk: [[9, -3]], speed: 1.2 },
    { on: 'Om drie uur schrijf ik', dt: 2.6, actor: 'jelle', face: 'actor:berend' },
  ],
  shots: [{ on: 'Vandaag winnen we eerlijk', dt: 0.4, shot: 'dolly', from: [-2.2, 2.8, 1.8], to: [-0.6, 2.2, 1.6], look: 'mid:tammo,tessa@1.3', fov: 44 }],
  wide: WIDE([-5.5, 4.5, 3.4], [-3.5, 3.2, 2.5], 'mid:berend,tessa@1'),
};
S['M26.outro'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de vijf woorden, de kus warm, Jelle 's avonds
  coverage: 'ots',
  lights: [{ on: '…Ik heb geen woorden meer', light: 'warm-intiem' }, { on: 'Moai dien, Grinzers', light: 'avond-buiten' }],
  cast: {
    rikus: { key: 'rikus', at: [4.4, 2], face: 190, anim: 'idle', bg: true, gest: ['talk', 'point'] },
    // WP6: Berend telt de kus hardop in de menigte
    berend: { key: 'berend', at: [5.8, -2.2], face: 190, anim: 'idle', bg: true, gest: ['point', 'nod'] },
  },
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
    // de kus (M26.17): Tessa stapt naar hem toe, trekt hem aan zijn jas en ze leunen in elkaar; de markt klapt pas daarna
    { on: 'Kon veel minder', dt: 1.0, actor: 'tessa', walk: [[0, 0.15]], speed: 0.9 },
    { on: 'Kon veel minder', dt: 1.2, actor: 'tammo', face: 'actor:tessa' },
    { on: 'Kon veel minder', dt: 2.0, actor: 'tessa', anim: 'lean' },
    { on: 'Kon veel minder', dt: 2.0, actor: 'tammo', anim: 'lean' },
    { on: '…Ik heb geen woorden meer', actor: 'tammo', anim: 'shake' },
    { on: 'Dat duurde elf seconden', actor: 'berend', anim: 'point' },
    { on: 'Dat duurde elf seconden', dt: 0.3, actor: 'rikus', anim: 'cheer' },
  ],
  // sleutelscène (de vijf woorden en de kus): close-ups, een reactieshot op Tessa na de zin die ertoe doet en een trage ronde om de kus
  shots: [
    // #1325: de eerste twee als strakke over-de-schouder (de ander blijft half in beeld: geen spreker buiten beeld bij de wissel)
    { on: 'Tammo. Iedereen luistert', dt: 0.2, shot: 'ots', from: 'tammo', target: 'tessa', dist: 1.5, side: -0.5, fov: 30 },
    { on: '…Woist ja wel', dt: 0.2, shot: 'ots', from: 'tessa', target: 'tammo', dist: 1.4, side: 0.5, fov: 28 },
    { on: 'Ik wil bij jou blijven', dt: 0.1, shot: 'close', target: 'tammo', dist: 1.2, side: -0.35, fov: 24 }, // de vijf woorden: een echte close-up, van voren
    { on: 'Dat bedoelde ik ook', dt: 0.15, shot: 'ots', from: 'tammo', target: 'tessa', dist: 1.3, side: -0.45, fov: 24 },
    { on: 'Kon veel minder', dt: 1.3, shot: 'dolly', from: [-3.0, 1.9, 1.4], to: [-2.0, 0.9, 1.5], look: 'mid:tammo,tessa@1.45', fov: 38 },
    { on: '…Ik heb geen woorden meer', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.4, side: -0.35, fov: 28 }, // na de kus: zijn gezicht
  ],
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
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de kruitkelder bij lamplicht
  coverage: 'ots',
  light: 'avond-binnen',
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
    { on: 'Er is geen afspraak', actor: 'mem', anim: 'shake' },
    { on: 'Gerda belde mij', actor: 'trijntje', anim: 'point' },
    { on: 'Ik reed. Nul krassen', actor: 'berend', anim: 'shrug' },
    { on: 'Jij kende Mem', actor: 'tammo', anim: 'look' },
    { on: 'Van de jas', actor: 'tessa', anim: 'shrug' },
    { on: 'Altijd bedanken', actor: 'mem', anim: 'nod' },
    { on: 'Omdat mijn kleinzoon', actor: 'mem', anim: 'shrug' },
    { on: 'In 1953 werd ik tweede', actor: 'jelle', anim: 'look' },
    { on: 'Mem. Dit is nog niet voorbij', actor: 'jelle', anim: 'point' },
    { on: 'Durk. Douwe. Haal', actor: 'jelle', walk: [[7.5, 1.5]], speed: 1.4 },
  ],
  shots: [
    { on: 'Ik reed. Nul krassen', dt: 0.1, shot: 'dolly', from: [-2.6, 3.4, 1.7], to: [-0.8, 2.4, 1.6], look: 'mid:berend,mem@1', fov: 44 },
    { on: 'Omdat mijn kleinzoon', dt: 0.1, shot: 'dolly', from: [-2.2, -2.6, 1.6], to: [-0.8, -1.4, 1.5], look: 'mid:mem,jelle@1', fov: 40 },
    // sleutelscène: reactieshot op Jelle terwijl Mem de zin uitspreekt die ertoe doet (R-21)
    { on: 'Er is geen afspraak', dt: 2.6, shot: 'close', target: 'jelle', dist: 1.3, side: 0.2, fov: 28, offscreen: 'reaction: Mem is te horen, Jelle is te zien' },
  ],
  wide: WIDE([-4.8, 4, 3.2], [-2.8, 2.9, 2.4], 'mid:mem,jelle@1'),
};

// M21.3 at the crossing: Berend counts, Henk walks up with his hatch
S['M21.3'] = {
  cast: {
    berend: { key: 'berend', at: [3.2, 0.8], face: 185, anim: 'idle', gest: ['shrug', 'point', 'hips'] },
    henk: { key: 'henk', at: [12, -6], face: 150, anim: 'idle', gest: ['talk', 'point'] },
  },
  // #740: de Escapade staat weer heel op de weg en er ligt een klomp met briefje op de bijrijdersstoel
  // ("Tige tank foar de bal. – J."), zoals de regie en de tekst zeggen.
  props: {
    escapade: { kind: 'auto', at: [4.6, 3.6, 0], face: 250 },
    klomp: { kind: 'klomp', at: [4.6, 3.6, 1.05], face: 250 },
    briefje: { kind: 'briefje', at: [4.6, 3.6, 1.36], face: 250 },
  },
  open: [{ actor: 'tessa', face: 'actor:berend' }, { actor: 'tammo', face: 'actor:berend' }, { t: 0, actor: 'henk', walk: [[3.8, -1.6]], speed: 1.4 }],
  beats: [
    { on: '"Tige tank foar de bal', actor: 'tammo', face: 'prop:escapade' },
    { on: 'Nul krassen op de auto', actor: 'berend', anim: 'shrug' },
    { on: 'Dat tel je niet', actor: 'tessa', anim: 'hips' },
    { on: 'Ik tel alles', actor: 'berend', anim: 'point' },
    { on: 'Tinus\' schuur is hier vlakbij', actor: 'henk', anim: 'point' },
  ],
  shots: [
    { on: '"Tige tank foar de bal', dt: 0.2, shot: 'dolly', from: [1.2, 1.0, 1.1], to: [2.6, 2.4, 1.3], look: 'tessa@1.2', fov: 34 },
    { on: 'Zonder wagen kunnen we niet bakken', dt: 0.2, shot: 'cut', at: [-2.6, 2.8, 1.7], look: 'tessa@1.2', fov: 40 },
  ],
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
    { on: 'Dat is een snackwagen', actor: 'tessa', anim: 'shrug' },
    { on: 'Een Escapade met een gat', actor: 'tammo', anim: 'point' },
    { on: 'Een karaktergat', actor: 'henk', anim: 'nod' },
    // WP6: de voordeur die meerijdt (zaadje van "een thuis op wielen" in M22.4)
    { on: 'Het is een voordeur', actor: 'tessa', anim: 'point' },
    { on: 'Het is een voordeur', dt: 0.8, actor: 'tammo', face: 'prop:escapade' },
    { on: 'Het is klaar', actor: 'tessa', anim: 'hips' },
    { on: 'Het bovenstuk is blauw', actor: 'tammo', anim: 'shake' },
    { on: 'Het is de kleur van de naam', actor: 'tessa', anim: 'point' },
    { on: 'Het luik is betaald', actor: 'henk', face: 'actor:sjabbe' },
    // #861: Sjabbe liep dwars door de geparkeerde trekker; hij loopt er nu bovenom.
    { on: 'Het luik is betaald', dt: 0.3, actor: 'sjabbe', walk: [[11, -2.2], [8, -1.5], [3.4, -1.8]], speed: 1.5 },
    { on: 'Tammo belde vannacht', actor: 'sjabbe', anim: 'talk' },
    { on: 'Het horloge van je opa', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Het horloge van je opa', dt: 0.6, actor: 'tammo', face: 'prop:escapade' },
    { on: 'Het liep vijf minuten voor', actor: 'tammo', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-5, 4.2, 3.2], [-3, 3, 2.4], 'mid:henk,escapade@1'),
};

// M22.4 the barn at night: the two of them apologise beside the car, Tinus walks across the yard
S['M22.4'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de schuur 's avonds; warm vanaf Tessa's bekentenis
  coverage: 'ots',
  light: 'avond-binnen',
  lights: [{ on: 'Ik moet je iets vertellen', light: 'warm-intiem' }],
  // #861: Tinus liep dwars door de geparkeerde trekker; hij start nu verder weg en loopt er met een
  // boog omheen (t 0-6,25 s zat hij in de voetafdruk van de trekker).
  cast: { tinus: { key: 'tinus', at: [11.6, 4.4], face: 200, anim: 'idle', bg: true, gest: ['look', 'nod'] } },
  props: { escapade: { kind: 'auto', at: [4.2, 0.2, 0], face: 90 }, trekker: { kind: 'trekker', at: [7.5, 3.2, 0], face: 150 } },
  open: [{ actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }, { t: 0, actor: 'tinus', walk: [[11.4, 0.0], [7.0, 0.6]], speed: 0.7 }],
  beats: [
    { on: 'We hebben een wagen', actor: 'tessa', walk: [[2.6, -0.9]], speed: 0.8 },
    { on: 'We hebben een wagen', dt: 0.5, actor: 'tammo', walk: [[2.4, 0.5]], speed: 0.8 },
    { on: 'Sorry. Dat ik nooit', actor: 'tammo', anim: 'shrug' },
    { on: 'Je zei net iets', actor: 'tessa', anim: 'nod' },
    { on: 'Jij zweeg voor een ander', actor: 'tammo', anim: 'talk' },
    { on: 'Ik moet je iets vertellen', actor: 'tessa', anim: 'lean' },
    { on: 'Zeven?', actor: 'tammo', anim: 'shake' },
    { on: 'Jij? Fries?', actor: 'tammo', anim: 'laugh' },
    { on: 'Een beetje.', actor: 'tessa', anim: 'shrug' },
    { on: 'Dat verklaart waarom', actor: 'tammo', anim: 'point' },
    { on: 'Dat deed ik één keer', actor: 'tessa', anim: 'shrug' },
    { on: 'Twee keer', actor: 'tammo', anim: 'laugh' },
    // WP6: de jas uit O4 komt terug; het enige wat elke zomer hetzelfde bleef
    { on: 'En die jas in augustus', actor: 'tammo', anim: 'point' },
    { on: 'Mem zegt elke zomer jas', actor: 'tessa', anim: 'shrug' },
    { on: 'Een wagen is het enige huis', actor: 'tessa', face: 'prop:escapade' },
    { on: 'Een wagen is het enige huis', dt: 0.3, actor: 'tessa', anim: 'point' },
    { on: 'Ik ging niet weg', actor: 'tessa', walk: [[2.2, -0.2]], speed: 0.6 },
    { on: 'Ik ging niet weg', dt: 0.4, actor: 'tessa', face: 'actor:tammo' },
    // de omhelzing: Tammo loopt naar haar toe, ze leunen in elkaar en de trekker ratelt door
    { on: 'Ik ben gebleven', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Ik ben gebleven', dt: 0.9, actor: 'tammo', walk: [[2.2, 0.38]], speed: 0.7 },
    { on: 'Ik ben gebleven', dt: 2.2, actor: 'tessa', anim: 'lean' },
    { on: 'Ik ben gebleven', dt: 2.2, actor: 'tammo', anim: 'lean' },
  ],
  // sleutelscène (R-01 e.v.): een close-up op de verontschuldiging, een reactieshot op Tammo na "Je bleef nergens" en een trage push-in op de omhelzing
  shots: [
    { on: 'Sorry. Dat ik nooit', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.3, side: 0.25, fov: 28 },
    { on: 'Ik moet je iets vertellen', dt: 0.2, shot: 'close', target: 'tessa', dist: 1.3, side: 0.2, fov: 28 },
    { on: 'Mem zegt elke zomer jas', dt: 0.3, shot: 'close', target: 'tessa', dist: 1.2, side: 0.3, fov: 26 },
    { on: 'Je bleef nergens', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.25, side: 0.2, fov: 28 },
    { on: 'Ik ben gebleven', dt: 0.3, shot: 'dolly', from: [-3.4, 1.9, 1.3], to: [-2.2, 1.0, 1.45], look: 'mid:tammo,tessa@1.4', fov: 38 },
  ],
  wide: WIDE([-4.6, 3.6, 3], [-2.6, 2.8, 2.2], 'mid:tammo,tessa@1.2'),
};

// M23.3 Aduard: the henchmen change sides and hand over Tammo's jacket
S['M23.3'] = {
  cast: {
    durk: { key: 'durk', at: [3.4, 1.4], face: 190, anim: 'idle', gest: ['point', 'talk', 'hips'] },
    douwe: { key: 'douwe', at: [3.6, -1.4], face: 170, anim: 'idle', gest: ['nod', 'shrug'], carry: 'jas' },
  },
  // #734 (F20): Tammo's jas was een kartonnen doos; een tas leest als kledingstuk met een rits en een handvat.
  props: { jas: { kind: 'jas', at: [3.6, -1.4, 1] } },
  open: [{ actor: 'tessa', face: 'actor:durk' }, { actor: 'tammo', face: 'actor:durk' }],
  beats: [
    { on: 'Douwe. Jelle is niet onze baas', actor: 'durk', anim: 'point' },
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
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); het bod: hard zijlicht
  coverage: 'ots',
  light: 'spanning',
  set: 'omakeuken',
  cast: {
    jelle: { key: 'jelle', at: [4.0, 1.6], face: 190, anim: 'idle', gest: ['nod', 'hips', 'point', 'shrug'] },
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
    { on: 'Dat iemand één keer', dt: 4.6, actor: 'tessa', face: 'actor:mem' },
    { on: 'Dat iemand één keer', dt: 0.4, actor: 'mem', face: 'actor:jelle' },
    { on: 'Dat iemand één keer', dt: 2.5, actor: 'trijntje', anim: 'nod' },
    { on: '…We bakken op het Ontzet', actor: 'jelle', walk: [[7, 2.6]], speed: 1.3 },
  ],
  shots: [],
  wide: WIDE([-3.8, 2.4, 2.6], [-2.0, 1.8, 2.1], 'mid:jelle,tessa@1'),
};

// M26.5 the Oude Boteringestraat: Jelle loses to his own permit and a warm eierbal (Tessa and Tammo), then Mem takes over
S['M26.5'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); Mem tegenover Jelle: zacht, zonder drama in het licht
  coverage: 'ots',
  light: 'bewolkt-zacht',
  cast: {
    // WP6: Mem komt pas aanlopen als Jelle de eierbal proeft: ze begint aan het eind van de straat
    mem: { key: 'mem', at: [9.4, 3.2], face: 200, anim: 'idle', gest: ['point', 'hips', 'talk'] },
    jelle: { key: 'jelle', at: [3.4, -1.0], face: 160, anim: 'idle', gest: ['shrug', 'hips', 'shake'] },
    ...PASSER('toerist', 'toerist', [7, -4.6], [-3, -5.2], 1.0, 'phone').cast,
  },
  // #734 (F20): de limo van Jelle is de trekker-limo, net als in M26.4; een gewone auto was de Escapade.
  // de vergunning in Tessa's hand (klembord) en het bakje met de eierbal in die van Tammo
  props: { limo: { kind: 'limo', at: [7.0, -8.2, 0], face: 0 }, // #1325: opzij geparkeerd, geen muur achter Jelle
     vergunning: { kind: 'klembord', at: [0.4, -0.6, 1] }, bakje: { kind: 'doos', at: [0.4, 0.6, 1] } },
  open: [{ actor: 'tessa', face: 'actor:jelle' }, { actor: 'tammo', face: 'actor:jelle' }, { actor: 'tessa', carry: 'vergunning' }, { actor: 'tammo', carry: 'bakje' }, ...PASSER('toerist', 'toerist', [7, -4.6], [-3, -5.2], 1.0, 'phone').cues],
  beats: [
    { on: 'Je eigen vergunning', actor: 'tessa', anim: 'point' },
    { on: 'Voor mijn vlag', actor: 'jelle', anim: 'shake' },
    { on: 'Op een evenement staat een kraam', actor: 'tessa', anim: 'hips' },
    { on: '…Jouw duiven hadden geen vergunning', actor: 'jelle', anim: 'point' },
    { on: 'Ik heb ze niet gevraagd', actor: 'tammo', anim: 'shrug' },
    { on: 'Eierbal? Hij is warm', actor: 'tammo', anim: 'point' },
    { on: 'Eierbal? Hij is warm', dt: 1.4, actor: 'jelle', face: 'prop:bakje' },
    { on: 'Eierbal? Hij is warm', dt: 2.2, actor: 'mem', walk: [[2.4, -0.2]], speed: 1.5 },
    { on: 'Jelle. Geef hem aan mij', actor: 'mem', anim: 'point' },
    { on: 'Mem. De notaris', actor: 'jelle', anim: 'shrug' },
    { on: 'Dat is zijn probleem', actor: 'mem', anim: 'hips' },
    { on: '…Ja, mem', actor: 'jelle', anim: 'shake' },
    { on: 'Het is drie uur geweest', actor: 'tessa', anim: 'look' },
  ],
  // sleutelscène: Jelle verliest in beeld; close-ups op de vergunning, op zijn duivenzin en op de eerste hap
  shots: [
    { on: 'Je eigen vergunning', dt: 0.2, shot: 'close', target: 'tessa', dist: 1.25, side: 0.2, fov: 28 },
    { on: '…Jouw duiven hadden geen vergunning', dt: 0.2, shot: 'close', target: 'jelle', dist: 1.35, side: 0.25, fov: 28 },
    { on: 'Ik heb ze niet gevraagd', dt: 0, shot: 'close', target: 'tammo', dist: 1.25, side: 0.2, fov: 28 },
    { on: 'Eierbal? Hij is warm', dt: 0.1, shot: 'close', target: 'tammo', dist: 1.25, side: 0.2, fov: 28 },
    { on: 'Eierbal? Hij is warm', dt: 1.6, shot: 'close', target: 'jelle', dist: 1.3, side: 0.2, fov: 26, offscreen: 'reaction: Tammo is te horen, Jelle is te zien bij de eerste hap' },
  ],
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
    { on: 'Eén verschil', dt: 0.3, actor: 'berend', face: 'actor:tessa' },
    { on: 'En de onze?', actor: 'tessa', anim: 'look' },
    { on: 'Die heeft een korrel', actor: 'berend', anim: 'point' },
    { on: 'Dat is een eierbal die ergens', actor: 'berend', anim: 'nod' },
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
  { on: 'Tam & Tes. Vijf van de vijf', actor: 'tessa', anim: 'cheer' },
  { on: 'Tam & Tes. Vijf van de vijf', actor: 'tammo', anim: 'cheer' },
  { on: 'Tam & Tes. Vijf van de vijf', actor: 'kind', anim: 'cheer' },
  { on: 'Vijf van de vijf. Mijn juristen', actor: 'jelle', anim: 'shake' },
]);
S['M26.11'] = vote([
  { on: 3, actor: 'jurylid', anim: 'shake' },
  { on: 'Tam & Tes. Vier van de vijf', actor: 'tessa', anim: 'cheer' },
  { on: 'Tam & Tes. Vier van de vijf', actor: 'tammo', anim: 'cheer' },
  { on: 'Tam & Tes. Vier van de vijf', actor: 'kind', anim: 'cheer' },
]);
S['M26.12'] = vote([
  { on: 3, actor: 'jurylid', anim: 'shake' },
  { on: 'Tam & Tes. Drie van de vijf', actor: 'tessa', anim: 'nod' },
  { on: 'Tam & Tes. Drie van de vijf', actor: 'tammo', anim: 'nod' },
  { on: 'Drie tegen twee', actor: 'jelle', anim: 'shrug' },
]);
S['M26.13'] = {
  // regieronde #1325: de sprekers van voren over de schouder van wie ze aanspreken (geen achterhoofd, geen as-sprong); de uitslag
  coverage: 'ots',
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
    { on: 'Dat is mijn kleinzoon', actor: 'mem', anim: 'nod' },
  ],
  shots: [], wide: JURY_WIDE,
};

// M21.6 the wagon choice for the ball: the scratch scene (same set as M21.3)
S['M21.6'] = { ...S['M21.3'], beats: [
  { on: 'Eén kras op de auto', actor: 'berend', anim: 'shrug' },
  { on: 'Dat is mijn schuld', actor: 'tessa', anim: 'shrug' },
  { on: 'Dat is een kras', actor: 'berend', anim: 'point' },
  { on: 'Tinus\' schuur is hier vlakbij', actor: 'henk', anim: 'point' },
] };

// --- M18 the intake in three outcomes (M18.2 passed, M18.6 one wrong answer, M18.7 two): the manager at his desk ---
// #955: ook deze drie varianten krijgen eigen camerawerk (over-de-schouder en close-ups) in
// plaats van alleen de automatische dekking, en in M18.2 werkt een collega op de achtergrond.
const MANAGER = (x) => ({ accountmanager: { key: 'accountmanager', at: [x, -0.4], face: 175, anim: 'idle', gest: ['talk', 'hips', 'shrug'] } });
const COLLEGA = { key: 'student', at: [1.2, 2.5], face: 250, anim: 'idle', bg: true, gest: ['talk', 'look', 'phone'] };
const mgrOpen = [{ actor: 'tessa', face: 'actor:accountmanager' }, { actor: 'tammo', face: 'actor:accountmanager' }];
S['M18.2'] = {
  set: 'kantoor',
  cast: { ...MANAGER(3.0), collega: COLLEGA }, props: {}, open: mgrOpen,
  beats: [
    { on: 'Warm, droog', actor: 'accountmanager', anim: 'nod' },
    { on: 'Ik maak een offerte', actor: 'accountmanager', walk: [[3.55, -0.6]], speed: 0.7 },
    { on: 'Ik maak een offerte', dt: 2.0, actor: 'accountmanager', face: 'actor:tessa' },
    { on: 'Dat ging makkelijk', actor: 'tammo', anim: 'shrug' },
    { on: 'Wacht tot we binnen zijn', actor: 'tessa', anim: 'look' },
    { on: 'Warm, droog', dt: 0.4, actor: 'collega', anim: 'talk' },
  ],
  shots: [
    { on: 'Ik maak een offerte', dt: 0.2, shot: 'close', target: 'accountmanager', dist: 1.35, side: 0.2, fov: 30 },
    { on: 'Dat ging makkelijk', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.3, side: 0.2, fov: 28 },
  ],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};
S['M18.6'] = {
  set: 'kantoor',
  cast: MANAGER(2.6), props: {}, open: mgrOpen,
  beats: [
    { on: 'Interessant', actor: 'accountmanager', anim: 'point' },
    { on: 'Wij zijn nieuw', actor: 'tessa', anim: 'shrug' },
    { on: 'Iedereen is nieuw', actor: 'accountmanager', walk: [[2.0, -0.2]], speed: 0.8 },
    { on: 'Die staat bij de serverdeur', actor: 'tammo', anim: 'point' },
  ],
  shots: [
    { on: 'Interessant', dt: 0.2, shot: 'close', target: 'accountmanager', dist: 1.3, side: 0.2, fov: 30 },
    { on: 'Die staat bij de serverdeur', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.25, side: 0.2, fov: 28 },
  ],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};
S['M18.7'] = {
  set: 'kantoor',
  cast: MANAGER(2.4), props: {}, open: mgrOpen,
  beats: [
    { on: 'Twee antwoorden', actor: 'accountmanager', anim: 'point' },
    { on: 'Is dat gratis', actor: 'tammo', anim: 'shrug' },
    { on: 'Bij Wiebelwerk is alles gratis', actor: 'accountmanager', anim: 'hips' },
    { on: 'Loop maar voor', actor: 'tessa', anim: 'point' },
  ],
  shots: [
    { on: 'Twee antwoorden', dt: 0.2, shot: 'close', target: 'accountmanager', dist: 1.35, side: 0.2, fov: 30 },
    { on: 'Loop maar voor', dt: 0.2, shot: 'close', target: 'tessa', dist: 1.25, side: 0.2, fov: 28 },
  ],
  wide: WIDE([-4.5, 4, 3], [-2.5, 2.8, 2.3], 'mid:accountmanager,tessa@1'),
};

// --- M23 who rides next to the snackwagen (M23.6 Wubbo, M23.7 Tinus, M23.8 Geesje) and M26 the streets they close (M26.14-16) ---
const FRIEND = (key, x, gest) => ({ [key]: { key, at: [x, 0.3], face: 180, anim: 'idle', gest } });
const friendOpen = (key) => [{ actor: 'tessa', face: `actor:${key}` }, { actor: 'tammo', face: `actor:${key}` }];
const friendWide = (key) => WIDE([-5, 4, 3.2], [-3, 3, 2.4], `mid:${key},tessa@1`);
S['M23.6'] = {
  cast: FRIEND('wubbo', 3.2, ['point', 'talk', 'hips']), props: {}, open: friendOpen('wubbo'),
  beats: [
    { on: 'Ik rijd naast jullie', actor: 'wubbo', anim: 'point' },
    { on: 'En de bruggen', actor: 'tessa', anim: 'look' },
    { on: 'Die open ik op afstand', actor: 'wubbo', anim: 'hips' },
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
    { on: 'En toen zaten we niet meer vast', actor: 'tessa', anim: 'nod' },
  ],
  shots: [], wide: friendWide('tinus'),
};
S['M23.8'] = {
  cast: FRIEND('geesje', 3.0, ['talk', 'hips', 'point']), props: {}, open: friendOpen('geesje'),
  beats: [
    { on: 'Ik rij naast jullie', actor: 'geesje', anim: 'talk' },
    { on: 'Een scooter tegen een limo', actor: 'tessa', anim: 'shrug' },
    { on: 'Een limo past niet', actor: 'geesje', anim: 'point' },
    { on: 'Ik rij naast jullie, op mijn scooter', actor: 'geesje', anim: 'hips' },
  ],
  shots: [], wide: friendWide('geesje'),
};
const streets = (key, x, beats) => ({
  cast: { [key]: { key, at: [x, 0.3], face: 180, anim: 'idle', bg: true, gest: ['talk', 'point', 'hips'] } },
  props: {}, open: friendOpen(key), beats, shots: [], wide: friendWide(key),
});
S['M26.14'] = streets('wubbo', 5.0, [
  { on: 'Poelestraat dicht', actor: 'wubbo', anim: 'point' },
  { on: 'Dank je, Wubbo', actor: 'tessa', anim: 'nod' },
  { on: 'Dat mag niet', actor: 'tessa', anim: 'shake' },
  { on: 'Zijn bus, zijn regels', actor: 'tammo', anim: 'shrug' },
]);
S['M26.15'] = streets('tinus', 5.0, [
  { on: 'Gelkingestraat dicht', actor: 'tinus', anim: 'point' },
  { on: 'Je trekker past er net in', actor: 'tessa', anim: 'look' },
  { on: 'Ik trek hem weg', actor: 'tinus', anim: 'hips' },
  { on: 'De trekker en de Martinitoren', actor: 'tammo', anim: 'shrug' },
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

// --- scenes that had no staging (#352) ---

// M21.1 the ride (the intro of the solo mission): Tessa next to Berend in his bakkie over the dark heath. The two voices sit in the
// cab (hidden, they move with it, so the camera finds them); Tammo is on his own mission and not in the scene (`solo`). The camera
// has to follow the car, so there is no automatic coverage: a wide shot of the bakkie pulling away, then the camera rides along.
S['M21.intro'] = {
  solo: true, manual: true, align: 'road',
  cast: { berend: { key: 'berend', at: [-34, 0], face: 0, anim: 'idle', noauto: true, road: 'bakkie' } },
  duo: { tessa: { at: [-34, 0], face: 0, anim: 'idle', road: 'bakkie' } },
  // #862: ook deze rit volgt de weg; de twee stemmen in de cab rijden mee.
  props: { bakkie: { kind: 'bakkie', at: [-34, 0, 0], face: 0, road: true } },
  open: [
    { actor: 'berend', hide: true }, { actor: 'tessa', hide: true },
    { prop: 'bakkie', path: [[-34, 0], [34, 0]], speed: 2.8 },
    { actor: 'berend', walk: [[34, 0]], speed: 2.8 }, { actor: 'tessa', walk: [[34, 0]], speed: 2.8 },
  ],
  beats: [],
  shots: [
    { on: 1, shot: 'follow', target: 'berend', dist: 5.4, side: 2.4, h: 1.5, fov: 42 },
    { on: 2, shot: 'orbit', target: 'berend', radius: 5.6, start: 100, sweep: 80, h0: 1.2, h1: 1.9, look: 'prop:bakkie@1.1', fov: 40 },
    { on: 4, shot: 'follow', target: 'tessa', dist: 6.2, side: -2.6, h: 1.2, fov: 36 },
    // #1146: een inzetshot op de cabine tussen de twee wide-shots: de stemmen zitten in de bakkie, de bakkie zelf is het beeld
    { on: 5, shot: 'insert', target: 'prop:bakkie@1.2', dist: 3.4, angle: 25, hEye: 0.2, fov: 30, offscreen: 'de stemmen zitten verborgen in de cabine van de bakkie' },
    { on: 6, shot: 'orbit', target: 'berend', radius: 8.5, start: 215, sweep: 45, h0: 3.2, h1: 3.8, look: 'prop:bakkie@1', fov: 44 },
  ],
  wide: { from: [-42, 5.6, 2.5], to: [-36, 4.6, 1.9], look: 'prop:bakkie@1.1', fov: 46, until: 1 },
};

// M26.4 lines 7-13, the blokkade (missions_akte5.js: script M26.4 from 7 to 14, a stage scene after the chase): Durk and Douwe light
// Berend's fireworks, Tessa sets the snackwagen across the street, Jelle gets out of the limo with a speech and steps back
// over a pigeon into the water. The limo nose to the hatch; Jelle's splash is a world sound, he comes back up on the far side.
S['M26.4#7-14'] = {
  cast: {
    durk: { key: 'durk', at: [-2.8, 3.2], face: 330, anim: 'idle', gest: ['point', 'hips', 'cheer'] },
    douwe: { key: 'douwe', at: [-3.0, -3.0], face: 30, anim: 'idle', gest: ['shrug', 'look', 'laugh'] },
    jelle: { key: 'jelle', at: [5.4, -0.4], face: 180, anim: 'idle', gest: ['point', 'hips', 'point', 'shrug'] },
  },
  props: {
    fjord: { kind: 'bestelbus', at: [3.4, 4.8, 0], face: 90 },
    limo: { kind: 'limo', at: [7.8, -1.6, 0], face: 195 },
    vuurwerk: { kind: 'vuurwerk', at: [-3.4, 2.4, 0] },
    duif: { kind: 'duif', at: [6.2, -0.7, 0], face: 20 },
    koffer: { kind: 'koffer', at: [5.4, -0.4, 1] },
  },
  open: [
    { actor: 'tessa', face: 'actor:durk' }, { actor: 'tammo', face: 'actor:durk' },
    { actor: 'jelle', carry: 'koffer' }, { actor: 'jelle', face: 'actor:tessa' },
  ],
  beats: [
    { on: 0, actor: 'durk', walk: [[-1.6, 2.6]], speed: 1.2 },
    { on: 'Douwe. Niet aanraken', dt: 0.2, actor: 'durk', face: 'prop:vuurwerk' },
    { on: '…Hè.', actor: 'douwe', walk: [[-2.2, -1.8]], speed: 1.0 },
    { on: '…Hè.', dt: 0.3, actor: 'douwe', face: 'prop:vuurwerk' },
    { on: 'Rook! Links', actor: 'tessa', anim: 'point' },
    { on: 'Rook! Links', dt: 0.3, actor: 'tammo', face: 'actor:durk' },
    { on: 'Rook! Links', dt: 0.4, actor: 'durk', anim: 'cheer' },
    { on: 'Rook! Links', dt: 0.4, prop: 'vuurwerk', bob: 0.06 },
    { on: 'Mevrouw. U staat', actor: 'jelle', anim: 'point' },
    // #861: Jelle liep door de limo heen; hij stapt nu eerst van de limo af en loopt er met een boog
    // omheen naar de waterkant (t 11,75-15,5 s zat hij in de voetafdruk van de limo).
    { on: 'Mevrouw. U staat', dt: 2.4, actor: 'jelle', walk: [[3.4, 0.8], [3.4, -3.8], [8.8, -4.4]], speed: 2.4 },
    { on: 'Mevrouw. U staat', dt: 2.6, prop: 'duif', path: [[6.2, -0.7], [8.4, -3.2]], speed: 1.2 },
    { on: '…Plons', actor: 'jelle', anim: 'sprong' },
    { on: '…Plons', dt: 0.5, actor: 'jelle', hide: true },
    { on: '…Plons', actor: 'douwe', anim: 'look' },
    { on: 'Hij houdt de koffer', actor: 'jelle', show: true },
    { on: 'Hij houdt de koffer', actor: 'jelle', anim: 'klim' },
    { on: 'Hij houdt de koffer', dt: 0.2, actor: 'tessa', anim: 'point' },
    { on: 'Hij is consistent', actor: 'tammo', anim: 'shrug' },
  ],
  fx: [{ on: '…Plons', dt: 0.35, fx: 'sfx', kind: 'splash' }],
  shots: [{ on: 'Mevrouw. U staat', dt: 0.6, shot: 'dolly', from: [1.4, -2.6, 1.6], to: [3.2, -1.6, 1.7], look: 'actor:jelle@1.5', fov: 36 }],
  wide: WIDE([-5.4, 0.6, 3.2], [-3.4, 1.0, 2.4], 'mid:fjord,limo@1.2'),
};

// M24.3 the flag falls (missions_akte5.js: the stage 'De vlag valt', dropFlag): Bert and the pigeon next to the pair on the Grote Markt,
// the square applauds. The first two lines are the hand-made camera that follows the flag down (missions.js playStageScene); after
// them this staging takes over. +f points at the Martinitoren.
S['M24.3'] = {
  cast: {
    bert: { key: 'bert', at: [1.8, 1.6], face: 200, anim: 'idle', gest: ['talk', 'hips', 'point'] },
    gast1: { key: 'terras', at: [5.8, 3.6], face: 190, anim: 'cheer', bg: true },
    gast2: { key: 'toerist', at: [6.4, -2.8], face: 170, anim: 'cheer', bg: true },
    gast3: { key: 'harm', at: [8.2, 0.6], face: 180, anim: 'laugh', bg: true },
  },
  props: { duif: { kind: 'duif', at: [1.8, 1.6, 1.5], face: 20 } },
  open: [
    { actor: 'bert', face: 'actor:tammo' }, { actor: 'tessa', anim: 'cheer' }, { actor: 'tammo', anim: 'look' },
    { prop: 'duif', bob: 0.03 },
  ],
  beats: [
    { on: 'Kon minder', actor: 'bert', anim: 'hips' },
    { on: 'Heel Grunn klapt', actor: 'tessa', anim: 'laugh' },
    { on: 'Heel Grunn klapt', dt: 0.3, actor: 'tammo', face: 'actor:tessa' },
    { on: 'Niet voor de duif', actor: 'tammo', anim: 'point' },
    { on: 'Niet voor de duif', dt: 1.4, prop: 'duif', path: [[1.8, 1.6, 1.5], [3.4, 0.6, 3.0], [-4, 0, 7]], speed: 3.5 },
    { on: 'Ik klapte ook', actor: 'tessa', anim: 'shrug' },
    { on: 'Ik klapte ook', dt: 0.3, actor: 'tessa', walk: [[0.5, 0.2]], speed: 0.6 },
    { on: 'Voor de grip', actor: 'tammo', anim: 'shake' },
    { on: 'Nee. Gewoon.', actor: 'tessa', face: 'actor:tammo' },
    { on: 'Nee. Gewoon.', dt: 0.4, actor: 'tessa', anim: 'shrug' },
  ],
  shots: [],
  wide: WIDE([-4.8, 4, 3.2], [-2.8, 2.9, 2.4], 'mid:bert,tessa@1.2'),
};

// M06.3 lines 0-3, the empty case (missions_nieuw.js: script M06.3 from 0 to 4, the scene stage with `reveal`): the camera is the hand-made
// push-in on the case (missions.js playStageScene, timed on heist.js REVEAL; it is the whole scene, `shotAll`), so this staging only brings
// the pair: they stand behind the case and look at it, Tessa points at the card, Tammo shakes his head at the thank-you.
S['M06.3#0-4'] = {
  duo: { tammo: { at: [-2.6, 1.0], face: 0, anim: 'look' }, tessa: { at: [-2.6, -0.8], face: 0, anim: 'look' } },
  cast: {}, props: {},
  open: [],
  beats: [
    { on: 0, dt: 0.4, actor: 'tessa', walk: [[-1.6, -0.6]], speed: 0.7 },
    { on: 'Hij bedankt', actor: 'tammo', anim: 'shake' },
    { on: 'Hij. Bedankt', actor: 'tessa', anim: 'shake' },
    { on: 'Hij. Bedankt', dt: 0.3, actor: 'tammo', face: 'actor:tessa' },
    { on: 'De vitrine is leeg', actor: 'tessa', anim: 'point' },
    { on: 'De vitrine is leeg', dt: 0.6, actor: 'tammo', walk: [[-1.4, 0.8]], speed: 0.7 },
  ],
  shots: [],
  wide: WIDE([-6, 3.4, 2.4], [-4.4, 2.6, 2.0], 'mid:tammo,tessa@1.2'),
};

// --- #743: het logboek van 12 augustus (M18.3) als eigen scène in de serverkamer ------------------
// De clue wordt gelezen, niet tijdens het sluipen verteld: Tessa leest het scherm voor, Tammo kijkt mee.
// #956: de scène speelt nu echt in de serverkamer (office3d.js buildServerRoom), met de rekken,
// de kabelbaan en het logboek op de terminal; #955: ots en close-ups op wie leest.
S['M18.3'] = {
  set: 'serverkamer',
  cast: {},
  props: { scherm: { kind: 'scherm', at: [4.6, -1.0, 1], face: 175 }, klembord: { kind: 'klembord', at: [4.1, 0.6, 0.82], face: 175 } },
  open: [{ actor: 'tessa', face: 'prop:scherm' }, { actor: 'tammo', face: 'prop:scherm' }, { t: 0.2, actor: 'tessa', walk: [[1.4, -0.5]], speed: 0.7 }],
  beats: [
    { on: 'De update. Altijd om middernacht', actor: 'tessa', anim: 'point' },
    { on: 'Behalve twaalf augustus', actor: 'tammo', anim: 'look' },
    { on: 'Jelle.', actor: 'tammo', anim: 'shake' },
    { on: 'Dus wij kraakten', actor: 'tammo', anim: 'shrug' },
    { on: 'Ik print dit', actor: 'tessa', anim: 'nod' },
  ],
  shots: [
    { on: 'De update. Altijd om middernacht', dt: 0.2, shot: 'dolly', from: [-2.2, 2.6, 1.7], to: [-0.8, 1.6, 1.55], look: 'tessa@1.3', fov: 36 },
    { on: 'En kijk', dt: 0.2, shot: 'ots', from: 'tammo', target: 'tessa', dist: 1.05, side: 0.5, fov: 36 },
    { on: 'De toegangspas', dt: 0.2, shot: 'close', target: 'tammo', dist: 1.25, side: 0.2, fov: 28 },
    { on: 'Dus wij kraakten', dt: 0.2, shot: 'cut', at: [-1.2, -2.2, 1.6], look: 'tammo@1.3', fov: 34 },
    { on: 'Ik print dit', dt: 0, shot: 'close', target: 'tessa', dist: 1.25, side: 0.2, fov: 27 },
  ],
  wide: WIDE([-4.6, 2.6, 3], [-2.6, 2.1, 2.2], 'mid:tammo,tessa@1.2'),
};

// --- #739: M21.4 (Tammo, de vrienden) als stage-outro: de vrienden zeggen nee en gaan weg -----------
// Alleen de vrienden die in beeld komen; Trijntje en Mem bellen (telefoon, niet in de kamer).
S['M21.4'] = {
  cast: {
    tinus: { key: 'tinus', at: [4.4, 2.2], face: 200, anim: 'idle', bg: true, gest: ['look', 'nod', 'hips'] },
    geesje: { key: 'geesje', at: [5.2, -0.4], face: 190, anim: 'idle', bg: true, gest: ['talk', 'shrug'] },
    klaas: { key: 'klaas', at: [6.2, 2.6], face: 195, anim: 'idle', bg: true, gest: ['talk', 'point'] },
    lammert: { key: 'lammert', at: [6.6, -2.4], face: 185, anim: 'idle', bg: true, gest: ['talk', 'shake'] },
    wubbo: { key: 'wubbo', at: [5.6, 4.2], face: 200, anim: 'idle', bg: true, gest: ['talk', 'hips'] },
    roelfien: { key: 'roelfien', at: [7.4, -0.2], face: 185, anim: 'idle', bg: true, gest: ['talk', 'look'] },
  },
  props: {},
  open: [{ actor: 'tammo', face: 'actor:tinus' }, { actor: 'tessa', face: 'actor:tammo' }, { t: 0.2, actor: 'tammo', walk: [[0.5, 0.2]], speed: 0.8 }],
  beats: [
    { on: 'Mijn kerkvoogdij', actor: 'geesje', anim: 'talk' },
    { on: 'Mij hebben ze', actor: 'klaas', anim: 'talk' },
    { on: 'Mij als eerste', actor: 'geesje', anim: 'point' },
    { on: 'Ik om half negen', actor: 'klaas', anim: 'point' },
    { on: 'Het maakt niet uit', actor: 'tammo', anim: 'shrug' },
    { on: 'Ik zeg het niet goed', actor: 'tammo', anim: 'shake' },
    { on: 'Laat ze gaan', actor: 'tinus', anim: 'shake' },
    // de vrienden lopen weg: Geesje en Klaas ruziend, de anderen met hun telefoon aan het oor
    { on: 'Laat ze gaan', dt: 1.0, actor: 'geesje', walk: [[11, -0.4]], speed: 1.1 },
    { on: 'Laat ze gaan', dt: 1.2, actor: 'klaas', walk: [[11.5, 2.6]], speed: 1.1 },
    { on: 'Laat ze gaan', dt: 1.8, actor: 'lammert', walk: [[12, -2.4]], speed: 1.0 },
    { on: 'Laat ze gaan', dt: 2.0, actor: 'wubbo', walk: [[12, 4.2]], speed: 1.0 },
    { on: 'Laat ze gaan', dt: 2.2, actor: 'roelfien', walk: [[12.5, -0.2]], speed: 1.0 },
    { on: 'Mijn schuur is leeg', actor: 'tinus', anim: 'nod' },
    { on: 'Voor ons.', actor: 'tammo', anim: 'nod' },
  ],
  shots: [
    { on: 'Mijn kerkvoogdij', dt: 0.2, shot: 'dolly', from: [-2.4, 2.4, 1.7], to: [-0.8, 1.4, 1.6], look: 'mid:geesje,klaas@1.3', fov: 50 },
    // Tammo faalt: zijn gezicht als de zin vastloopt (R-21)
    { on: 'Ik zeg het niet goed', dt: 0.3, shot: 'close', target: 'tammo', dist: 1.3, side: 0.2, fov: 28 },
    { on: 'Mijn schuur is leeg', dt: 0.2, shot: 'cut', at: [-1.2, 2.2, 1.6], look: 'tinus@1.4', fov: 40 },
  ],
  wide: WIDE([-5.2, 4.4, 3.4], [-3.2, 3.2, 2.6], 'mid:tammo,tinus@1'),
};
