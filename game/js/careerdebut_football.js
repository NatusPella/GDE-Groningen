// De invalbeurt (#1374, taak V2, bijbel 28-11 deel 02 bij 2a): de aanleiding van de voetbalcarrière als scène. Een trainingsavond bij De Hoekers, de zondag waarop de
// linksbuiten eruit ligt en Tessa invalt, en het clubhuis met het bord en de eerste wedstrijdfoto. Daarna loopt de bestaande eerste training (careerdebut.js) door.
//
// Puur (geen THREE, geen DOM, geen wereld): de regels, de regie als spec voor missionScene, de voorwaarde en de terugblik voor een gast. De regels staan ook als
// docs/verhaal/nieuw/09-script-voetbal.md (scènes V1.1 tot V1.3; scripts/careerdebut_football_test.mjs bewaakt dat code en script gelijk blijven). Het afspelen
// staat in careerdebutrun.js (playSpecScene); de tijdlijn en het clubtenue komen uit careerdebut.js.
//
// Wanneer: de carrière is net begonnen (zelfde regel als footballDue) en de eigen club is De Hoekers, de dorpsclub van het verhaal (footballstory.js). Een carrière
// met een andere startclub (een oude save, een proefpark zonder Warffum) krijgt alleen de eerste training. Eenmaal per speler: de vlag staat in de verhaalvlaggen
// (per speler, #429) en gaat erin zodra de scène begint, dus overslaan telt als gezien.
//
// Samen spelen: de scène is van wie de carrière start. Een gastheer stuurt hem als geregisseerde scène (data) naar de gasten, die hem lokaal nakijken (coopcut.js);
// een gast die zelf een carrière start speelt hem voor zichzelf. Wie niet speelt schrijft geen vlag en krijgt geen voortgang; een gast die de aanleiding mist
// krijgt de terugblik van Albert (footballstory.js guestRetrospect). Niets in de scène is geld of voortgang.
import { STORY_VILLAGE_CLUB } from './footballstory.js';
import { debutTimeline, footballDue } from './careerdebut.js';

export const INVAL_FLAG = 'carriere:voetbal-invalbeurt';
export const INVAL_ID = 'carriere-voetbal-invalbeurt';
export const INVAL_TITLE = 'De invalbeurt';
export const INVAL_KICKER = STORY_VILLAGE_CLUB;

// Sprekersleutels: 'T' Tammo, 'A' Tessa (intern anita), 'trainer' Eppo (missionstory.js NPC), 'albert' Albert Teuben (idem).
export const INVAL_SPEAKER_NAME = { T: 'Tammo', A: 'Anita', trainer: 'Trainer Eppo', albert: 'Albert Teuben' };

// De drie delen als [wie, tekst, { ov }]; dezelfde regels als scènes V1.1 (avond), V1.2 (zondag) en V1.3 (clubhuis) van 09-script-voetbal.md.
export const INVAL_PARTS = {
  avond: [
    ['albert', 'Welkom bij De Hoekers. Ik ben Albert Teuben, de voorzitter. De ledenlijst klopt nooit, maar de koffie wel.'],
    ['trainer', 'Eppo Rozema, de trainer. Kijk, dit suikerklontje is ons middenveld.'],
    ['T', 'Wij zijn Tammo en Tessa. Wij liepen alleen langs het veld.'],
    ['A', 'En dat klontje daar?'],
    ['trainer', 'De linksbuiten. Die staat zondag in de basis.'],
    ['albert', 'Het klontje is zekerder dan sommige spelers.'],
  ],
  zondag: [
    ['trainer', 'Onze linksbuiten ligt eruit. Met een natte sok, geloof ik. We hebben nog maar tien man.'],
    ['T', 'Tessa kan dit. Ze was bij elk straatpotje scheidsrechter.'],
    ['A', 'Scheidsrechter, Tammo. Dat is niet hetzelfde als spelen.', { ov: 0.3 }],
    ['albert', 'Kun je een bal raken, Tessa?'],
    ['A', 'Een beetje. Waar zijn de schoenen?'],
    ['T', 'Ik regel de schoenen en de papieren. Ik sta wel aan de lijn.'],
    ['trainer', 'Links, Tessa. Daar gebeurt het. Het klontje blijft in de kast.'],
  ],
  clubhuis: [
    ['albert', 'Onze linksbuiten ligt eruit. Tessa was er toevallig en ze kan het. Zo begon het.'],
    ['albert', 'Het bord hangt hier boven de koffieautomaat. Haar naam staat erop, met potlood.'],
    ['A', 'Waarom potlood?'],
    ['albert', 'Tot de papieren er zijn. Dan gaat er inkt overheen.'],
    ['T', 'De papieren regel ik. Ik heb een map.', { ov: 0.3 }],
    ['albert', 'De foto hangt ernaast. De eerste wedstrijdfoto.'],
    ['A', 'Ik kijk naar de bal.'],
    ['albert', 'Je kijkt naar Tammo. Bij het hek, met je tas.'],
    ['T', 'Ik hield de tas vast. En je handschoen zit nog in mijn jaszak.'],
    ['A', 'Hou hem maar.'],
    ['albert', 'Volgende week weer, Tessa?'],
    ['A', 'Volgende week weer.'],
  ],
};
export const INVAL_LINES = [...INVAL_PARTS.avond, ...INVAL_PARTS.zondag, ...INVAL_PARTS.clubhuis];
export const INVAL_SCENE = { lines: INVAL_LINES, titel: INVAL_TITLE, kicker: INVAL_KICKER };

// De tijdlijn met de namen die de regie nodig heeft (de spreker van een cast-acteur is zijn naam uit de NPC-tabel, niet zijn sleutel).
export function invalTimeline(lines = INVAL_LINES) {
  const tl = debutTimeline(lines);
  return { ...tl, lines: tl.lines.map((l) => ({ ...l, speaker: INVAL_SPEAKER_NAME[l.who] || l.speaker })) };
}

// --- de regie -------------------------------------------------------------------------------------------------------------

const CLOSE = (on, target, extra = {}) => ({ on, dt: 0.2, shot: 'close', target, dist: 1.2, side: 0.2, fov: 28, ...extra });

// Het veld van De Hoekers (maten lokaal aan het anker: f vooruit, s links): Albert wacht bij het hek, Eppo komt van ver met zijn klontjes, drie ploeggenoten warmen op.
// Het licht loopt mee: avond bij het kennismaken, dag op de zondag, gouden uur in het clubhuis. Tessa draagt hier haar eigen kleren: het clubtenue komt pas in de eerste training.
export function invalSpec() {
  return {
    fit: { radii: [4, 7, 11] },
    light: 'avond-buiten',
    lights: [
      { on: 'Onze linksbuiten ligt eruit. Met', dt: 0, light: 'dag' },
      { on: 'Onze linksbuiten ligt eruit. Tessa', dt: 0, light: 'gouden-uur' },
    ],
    duo: {
      tammo: { at: [-0.3, 0.95], face: 15, anim: 'idle' },
      tessa: { at: [0.1, -0.75], face: 0, anim: 'idle' },
    },
    cast: {
      albert: { key: 'albert', at: [4.6, -2.4], face: 190, anim: 'idle', gest: ['talk', 'point', 'shrug', 'hips', 'talk'] },
      eppo: { key: 'trainer', at: [12.5, 1.2], face: 180, anim: 'idle', gest: ['point', 'talk', 'shrug', 'hips', 'talk'], carry: 'klembord' },
      ploeg1: { key: 'ploeg1', at: [9.2, -5.6], face: 200, anim: 'idle', bg: true, noauto: true },
      ploeg2: { key: 'ploeg2', at: [10.4, -4.4], face: 190, anim: 'idle', bg: true, noauto: true },
      ploeg3: { key: 'ploeg3', at: [8.1, -4.0], face: 215, anim: 'idle', bg: true, noauto: true },
    },
    props: {
      bal: { kind: 'bal', at: [3.2, 1.4, 0] },
      klembord: { kind: 'klembord', at: [12.5, 1.2, 1.0] },
      mapje: { kind: 'map', at: [-0.3, 0.95, 1.0] },
      tas: { kind: 'tas', at: [-0.9, 1.6, 0] },
      hek: { kind: 'hek', at: [-1.5, 3.4, 0], face: 0 },
      hek2: { kind: 'hek', at: [1.0, 3.4, 0], face: 0 },
      hesjes: { kind: 'hesjes', at: [-1.2, -2.8, 0], face: 20 },
      bord: { kind: 'bord', at: [-3.4, -2.2, 0], face: 20 },
      automaat: { kind: 'automaat', at: [-3.6, 0.2, 0], face: 0 },
    },
    open: [{ actor: 'tammo', carry: 'mapje' }, { actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
    beats: [
      // de avond: Albert groet, Eppo loopt het veld over met zijn klontjes
      { on: 'Welkom bij De Hoekers', actor: 'albert', anim: 'wave' },
      { on: 'Welkom bij De Hoekers', dt: 1.8, actor: 'eppo', walk: [[5.0, 1.8]], speed: 1.7 },
      { on: 'Eppo Rozema, de trainer', actor: 'eppo', anim: 'point' },
      { on: 'Wij zijn Tammo en Tessa', actor: 'tammo', anim: 'wave' },
      { on: 'En dat klontje daar', actor: 'tessa', anim: 'look' },
      { on: 'De linksbuiten. Die staat', actor: 'eppo', anim: 'point' },
      { on: 'Het klontje is zekerder', actor: 'tessa', anim: 'laugh' },
      // de zondag
      { on: 'Onze linksbuiten ligt eruit. Met', actor: 'eppo', anim: 'shrug' },
      { on: 'Tessa kan dit', actor: 'tammo', anim: 'point' },
      { on: 'Scheidsrechter, Tammo', actor: 'tessa', anim: 'hips' },
      { on: 'Kun je een bal raken', actor: 'albert', face: 'actor:tessa' },
      { on: 'Een beetje', actor: 'tessa', anim: 'shrug' },
      { on: 'Ik regel de schoenen', actor: 'tammo', anim: 'nod' },
      { on: 'Links, Tessa', actor: 'eppo', anim: 'point' },
      // het clubhuis
      { on: 'Onze linksbuiten ligt eruit. Tessa', actor: 'albert', anim: 'talk' },
      { on: 'Het bord hangt hier', actor: 'albert', anim: 'point' },
      { on: 'Waarom potlood', actor: 'tessa', anim: 'look' },
      { on: 'De papieren regel ik', actor: 'tammo', anim: 'point' },
      { on: 'Ik kijk naar de bal', actor: 'tessa', anim: 'shrug' },
      { on: 'Je kijkt naar Tammo', actor: 'albert', anim: 'point' },
      { on: 'Ik hield de tas vast', actor: 'tammo', anim: 'shrug' },
      { on: 'Hou hem maar', actor: 'tessa', anim: 'lean' },
      { on: 'Volgende week weer, Tessa', actor: 'albert', anim: 'wave' },
    ],
    shots: [
      CLOSE('Kun je een bal raken', 'tessa', { dist: 1.25 }),
      CLOSE('Ik regel de schoenen', 'tammo', { dist: 1.25 }),
      CLOSE('Waarom potlood', 'tessa', { dist: 1.2 }),
      CLOSE('Ik hield de tas vast', 'tammo', { dist: 1.15 }),
      CLOSE('Hou hem maar', 'tessa', { dist: 1.1 }),
    ],
    wide: { from: [-3.0, 3.8, 2.4], to: [-1.0, 2.6, 2.0], look: 'mid:tammo,tessa@1.2', fov: 50, until: 1 },
  };
}

// --- wanneer is de scène aan de beurt -----------------------------------------------------------------------------------

// De carrière is net begonnen (dezelfde regel als de eerste training), de speler begon bij De Hoekers en heeft de aanleiding nog niet gezien.
// `villageClubId`: het id van de club van Warffum in de parkindex (index.byPlace.get(STORY_PLACE_ID).id); zonder dat id (kapotte data) geen scène.
export function invallerDue(career, flags, villageClubId) {
  if (!villageClubId || !career || career.club !== villageClubId) return false;
  if (!flags || flags.has(INVAL_FLAG)) return false;
  return footballDue(career, new Set());
}

// De terugblik voor een gast die de aanleiding mist: alleen het clubhuis (Albert), zonder vlag of voortgang. Zie footballstory.js.
export { guestRetrospect } from './footballstory.js';
