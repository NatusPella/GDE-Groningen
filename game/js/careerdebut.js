// De begincutscenes van twee carrières (22-11, docs/CARRIERESCENES-22-11.md): het begin van de voetbalcarrière (de eerste training bij de club van
// de Talentenklasse: Tessa in het clubtenue, Tammo als zaakwaarnemer, een scherpe trainer) en het begin van de landbouwcarrière (Bezit: het eerste
// perceel, de akte en de sleutel, een buurman die verstand van grond heeft en een trekker). Elk ca. 60 tot 90 seconden, droog en warm.
//
// Dit is het zuivere deel (geen THREE, geen DOM, geen wereld): de regels, de regie als spec voor missionScene (cutscenes_akte1.js), de tijdlijn,
// de blokkades en de vraag wanneer een scène aan de beurt is. Het afspelen staat in careerdebutrun.js (missionstory.js playSpecScene),
// scripts/careerdebut_test.mjs loopt het in node. De regels zijn data: voicelines_collect.mjs leest DEBUT_LINES, zodat een opname
// in de TTS-ronde meekomt (tot die er is, volgt de tekst met leestijd als ondertitel).
//
// Een regel is [wie, tekst, { ov }]: wie is 'T' (Tammo), 'A' (Tessa, intern anita) of een NPC-sleutel uit missionstory.js ('trainer', 'buurman');
// ov (dialoogvorm.js) laat de volgende regel zoveel seconden vóór het einde beginnen, een reactie die er doorheen valt.
// Canon: Tammo 24, Tessa, vijf jaar vrienden; de romantiek is een kleine beat (een blik, een woord), nooit een keuze of een kus, zodat de scène
// bij elke stand van hun relatie klopt. Beppe komt voor als warme herinnering, zonder leed. Alles verzonnen: de trainer, de buurman, de club.
//
// Samen spelen: de scène is van wie de carrière start of het perceel koopt. Dat is een geregisseerde scène (playScript), dus een gastheer
// stuurt hem als data naar de gasten, die hem lokaal nakijken (coopcut.js); wie niet speelt schrijft geen vlag en krijgt geen voortgang.
import { missionScene } from './cutscenes_akte1.js';
import { actorLook } from './footballkit.js';
import { levelOfDivision } from './clothingkit.js';

export const FOOTBALL_FLAG = 'carriere:voetbal-start';
export const FARM_FLAG = 'carriere:bezit-start';
export const FOOTBALL_ID = 'carriere-voetbal-start';
export const FARM_ID = 'carriere-bezit-start';

// Het uiterlijk bij een spreker, voor de stem (voicelines_collect.mjs) en de ondertitel.
export const SPEAKER_NAME = { T: 'Tammo', A: 'Anita', trainer: 'Trainer Eppo', buurman: 'Buurman Aldert' };

// --- de regels -------------------------------------------------------------------------------------------------------

export const FOOTBALL_LINES = [
  ['A', 'Tammo, ik heb een lijstje gemaakt. Wat als ik de bal niet raak?'],
  ['T', 'Dan rolt hij door. Ballen kunnen dat zelf.'],
  ['A', 'Dat is geen troost.'],
  ['T', 'Het is een feit. Troost komt na afloop, met een eierbal.'],
  ['trainer', 'Jij bent de nieuwe. Je staat op mijn lijst, onderaan, in potlood.'],
  ['A', 'Potlood is een begin.', { ov: 0.3 }],
  ['trainer', 'Potlood gaat weg met een gum. Welkom in de Talentenklasse.'],
  ['T', 'Ik ben haar zaakwaarnemer. Ik regel de zaken.'],
  ['trainer', 'Sinds wanneer?', { ov: 0.3 }],
  ['T', 'Sinds vanochtend. Half negen.'],
  ['A', 'Hij heeft een map.', { ov: 0.3 }],
  ['trainer', 'Zit er ook een bal in?'],
  ['T', 'Er zit een contract in. Voor als de club je wil.'],
  ['trainer', 'De club wil iemand die een bal kan stoppen. Hier.'],
  ['A', 'Gestopt. Binnen de lijn.'],
  ['trainer', 'Mijn vorige linksbuiten stopte hem ook. Met zijn gezicht.'],
  ['T', 'Is dat een compliment?', { ov: 0.3 }],
  ['trainer', 'Het is een trainer. Vijf rondjes, jullie allebei.'],
  ['T', 'Ik ben de zaakwaarnemer.'],
  ['trainer', 'Dan loopt de zaakwaarnemer mee. Zaken regel je onderweg.'],
  ['A', 'Tammo.'],
  ['T', 'Ja.', { ov: 0.2 }],
  ['A', 'Je hoeft niet mee te rennen.'],
  ['T', 'Ik sta bij het hek. Waar jij het kunt zien.'],
  ['A', 'Dat is niet slecht, voor een zaakwaarnemer.'],
  ['T', 'Ik heb ook een map.'],
  ['trainer', 'Rennen, zaakwaarnemer. De map blijft bij het hek.'],
];

export const FARM_LINES = [
  ['A', 'Hier. De akte. Met stempel en al.'],
  ['T', 'Hij is zwaar.'],
  ['A', 'Het is papier, Tammo.'],
  ['T', 'Het is een perceel. Dat weegt mee.'],
  ['buurman', 'Moi! Aldert. Ik woon aan de overkant, vier hekken verderop.'],
  ['A', 'Tessa. En dit is Tammo. Hij heeft de akte gedragen.'],
  ['buurman', 'Dat is het zwaarste werk van het jaar.'],
  ['buurman', 'Mooie grond. Klei, die houdt het water vast. Goed voor bieten, en voor koeien als je ze hebt.'],
  ['T', 'Ik heb geen verstand van koeien.'],
  ['buurman', 'Een koe merkt dat meteen.', { ov: 0.3 }],
  ['A', 'Beppe had koeien. Jij zat er elke zomer bij.'],
  ['T', 'Ik zat erbij. Dat is niet hetzelfde.'],
  ['A', 'Ze zou hier een bankje neergezet hebben.'],
  ['T', 'Met soep.'],
  ['buurman', 'Hier, de sleutel van de schuur. Hij klemt. Til hem op en draai.'],
  ['T', 'Ik til.'],
  ['buurman', 'Mijn trekker staat daar. Die mogen jullie lenen.'],
  ['T', 'Is er een handleiding?'],
  ['buurman', 'Er is een knop. Links.'],
  ['T', 'Welke knop?', { ov: 0.2 }],
  ['buurman', 'Die doet het.'],
  ['A', 'Tammo. We hebben een plekje.'],
  ['T', 'Een plekje.'],
  ['A', 'Ik ben blij dat we dit samen doen.'],
  ['T', 'Klopt.'],
  ['A', 'Is dat je hele antwoord?'],
  ['T', 'Het is een goed woord.'],
  ['buurman', 'Ik ga koffie halen. Tot morgen, zes uur.'],
  ['T', 'Zes uur waarvoor?'],
  ['buurman', 'Opstaan. Een perceel heeft geen vakantie.'],
  ['T', 'Het is zomer.'],
  ['buurman', 'Daarom.', { ov: 0.2 }],
];

export const SCENES = { [FOOTBALL_ID]: { lines: FOOTBALL_LINES, titel: 'De eerste training', kicker: 'Talentenklasse' }, [FARM_ID]: { lines: FARM_LINES, titel: 'Het eerste perceel', kicker: 'Land en bedrijf' } };

// Alle regels plat, voor de stemlijst (voicelines_collect.mjs) en de tests: { scene, who, speaker, text }.
export const DEBUT_LINES = Object.entries(SCENES).flatMap(([scene, s]) => s.lines.map(([who, text]) => ({ scene, who, speaker: SPEAKER_NAME[who], text })));

// --- de tijdlijn (zonder opname: leestijd; zoals timeline() in missionstory.js, met ov) -------------------------------

export const readSeconds = (text) => Math.max(2.2, Math.min(8, 1.3 + String(text || '').length * 0.058));
export function debutTimeline(lines, { lead = 0.8, gap = 0.1, durOf = readSeconds } = {}) {
  let t = lead;
  const out = lines.map(([who, text, o]) => {
    const dur = durOf(text);
    const l = { who, speaker: SPEAKER_NAME[who] || who, text, at: Math.round(t * 100) / 100, dur: Math.round(dur * 100) / 100 };
    t += dur + gap - (o && Number.isFinite(o.ov) ? Math.max(0, Math.min(1.2, o.ov, dur - 0.5)) : 0);
    return l;
  });
  return { lines: out, total: Math.round((t + 0.3) * 100) / 100 };
}

// --- de regie --------------------------------------------------------------------------------------------------------

const WIDE = (from, to, look, fov = 50) => ({ from, to, look, fov, until: 1 });
const CLOSE = (on, target, extra = {}) => ({ on, dt: 0.2, shot: 'close', target, dist: 1.2, side: 0.2, fov: 28, ...extra });

// Het veld (maten lokaal aan het anker: f vooruit, s links): het midden van het park, de trainer komt van ver, de ploeg warmt op.
export function footballSpec({ tessaLook = null } = {}) {
  return {
    fit: { radii: [4, 7, 11] },
    duo: {
      tammo: { at: [-0.3, 0.95], face: 15, anim: 'idle' },
      tessa: { at: [0.1, -0.75], face: 0, anim: 'idle', ...(tessaLook ? { look: tessaLook } : {}) },
    },
    cast: {
      eppo: { key: 'trainer', at: [12.5, 0.6], face: 180, anim: 'idle', gest: ['point', 'hips', 'talk', 'shrug', 'talk'], carry: 'klembord' },
      ploeg1: { key: 'ploeg1', at: [9.2, -5.6], face: 200, anim: 'idle', bg: true, noauto: true },
      ploeg2: { key: 'ploeg2', at: [10.4, -4.4], face: 190, anim: 'idle', bg: true, noauto: true },
      ploeg3: { key: 'ploeg3', at: [8.1, -4.0], face: 215, anim: 'idle', bg: true, noauto: true },
    },
    props: {
      bal: { kind: 'bal', at: [4.1, 0.7, 0] },
      mapje: { kind: 'map', at: [-0.3, 0.95, 1.0] },
      klembord: { kind: 'klembord', at: [12.5, 0.6, 1.0] },
      hek: { kind: 'hek', at: [-1.5, 3.4, 0], face: 0 },
      hek2: { kind: 'hek', at: [1.0, 3.4, 0], face: 0 },
      hesjes: { kind: 'hesjes', at: [-1.2, -2.8, 0], face: 20 },
    },
    open: [{ actor: 'tammo', carry: 'mapje' }, { actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
    beats: [
      { on: 'Dat is geen troost', actor: 'eppo', walk: [[3.5, 0.3]], speed: 1.7 },
      { on: 'Het is een feit', actor: 'tammo', anim: 'shrug' },
      { on: 'Jij bent de nieuwe', actor: 'eppo', anim: 'point' },
      { on: 'Potlood is een begin', actor: 'tessa', anim: 'nod' },
      { on: 'Potlood gaat weg', actor: 'eppo', anim: 'hips' },
      { on: 'Ik ben haar zaakwaarnemer', actor: 'tammo', anim: 'point' },
      { on: 'Ik ben haar zaakwaarnemer', dt: 2.6, actor: 'eppo', anim: 'look' },
      { on: 'Sinds vanochtend', actor: 'tammo', anim: 'nod' },
      { on: 'Hij heeft een map', actor: 'tessa', anim: 'point' },
      { on: 'De club wil iemand', dt: 2.3, prop: 'bal', path: [[4.1, 0.7], [0.8, -0.5]], speed: 4.2 },
      { on: 'Gestopt', actor: 'tessa', anim: 'hips' },
      { on: 'Mijn vorige linksbuiten', actor: 'eppo', anim: 'shrug' },
      { on: 'Is dat een compliment', actor: 'tammo', anim: 'look' },
      { on: 'Het is een trainer', actor: 'eppo', anim: 'point' },
      { on: 'Dan loopt de zaakwaarnemer', dt: 1.2, actor: 'eppo', walk: [[8.6, 1.8]], speed: 1.6 },
      { on: 'Tammo.', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Je hoeft niet mee', actor: 'tessa', anim: 'lean' },
      { on: 'Ik sta bij het hek', actor: 'tammo', walk: [[-1.6, 2.5]], speed: 1.0 },
      { on: 'Ik sta bij het hek', dt: 1.2, actor: 'tessa', face: 'actor:tammo' },
      { on: 'Ik heb ook een map', actor: 'tammo', anim: 'shrug' },
      { on: 'Rennen, zaakwaarnemer', dt: 0.7, actor: 'tammo', walk: [[6.5, -1.4]], speed: 2.6 },
      { on: 'Rennen, zaakwaarnemer', dt: 1.0, actor: 'tessa', walk: [[7.6, -2.2]], speed: 2.8 },
    ],
    shots: [
      { on: 'Jij bent de nieuwe', dt: 0.1, shot: 'dolly', from: [0.8, -3.2, 1.5], to: [1.6, -2.2, 1.55], look: 'mid:eppo,tessa@1.3', fov: 36 },
      CLOSE('Ik ben haar zaakwaarnemer', 'tammo', { dist: 1.25 }),
      CLOSE('Sinds vanochtend', 'tammo', { dist: 1.15 }),
      CLOSE('Gestopt', 'tessa', { dist: 1.2 }),
      CLOSE('Ik sta bij het hek', 'tammo', { dist: 1.3 }),
      { on: 'Dat is niet slecht', dt: 0, shot: 'cut', at: [-1.0, 0.4, 1.35], look: 'tessa@1.55', fov: 30 },
      { on: 'Rennen, zaakwaarnemer', dt: 0, shot: 'dolly', from: [-2.2, -1.5, 1.7], to: [-0.9, -1.1, 1.8], look: 'mid:tessa,eppo@1.3', fov: 42 },
    ],
    wide: WIDE([-3.2, 4.2, 2.4], [-1.4, 2.6, 2.0], 'mid:tammo,tessa@1.2'),
  };
}

// Het perceel (het toegangspunt aan de weg is het anker, het veld ligt vooruit): de buurman komt van zijn trekker, de koeien van de overkant kijken mee.
export function farmSpec() {
  return {
    fit: { radii: [4, 7, 11] },
    duo: {
      tammo: { at: [-0.2, 0.8], face: 10, anim: 'idle' },
      tessa: { at: [0.0, -0.7], face: 0, anim: 'idle' },
    },
    cast: {
      aldert: { key: 'buurman', at: [11.5, 4.5], face: 200, anim: 'idle', gest: ['talk', 'point', 'shrug', 'hips', 'talk'] },
    },
    props: {
      trekker: { kind: 'trekker', at: [10.5, 7.2, 0], face: 250 },
      akte: { kind: 'map', at: [0.0, -0.7, 1.0] },
      hek: { kind: 'hek', at: [-3.2, -1.6, 0], face: 90 },
      hek2: { kind: 'hek', at: [-3.2, 1.0, 0], face: 90 },
      koe1: { kind: 'koe', at: [16, -6, 0], face: 90 },
      koe2: { kind: 'koe', at: [18, -4.4, 0], face: 80 },
    },
    open: [{ actor: 'tessa', carry: 'akte' }, { actor: 'tessa', face: 'actor:tammo' }, { actor: 'tammo', face: 'actor:tessa' }],
    beats: [
      { on: 'Het is papier', actor: 'aldert', walk: [[3.3, 0.7]], speed: 1.5 },
      { on: 'Hij is zwaar', actor: 'tammo', anim: 'shrug' },
      { on: 'Moi! Aldert', actor: 'aldert', anim: 'wave' },
      { on: 'Tessa. En dit is Tammo', actor: 'tessa', anim: 'point' },
      { on: 'Mooie grond', actor: 'aldert', anim: 'point' },
      { on: 'Ik heb geen verstand', actor: 'tammo', anim: 'shrug' },
      { on: 'Beppe had koeien', actor: 'tessa', anim: 'lean' },
      { on: 'Met soep', actor: 'tessa', anim: 'laugh' },
      { on: 'Hier, de sleutel', actor: 'aldert', anim: 'point' },
      { on: 'Ik til', actor: 'tammo', anim: 'nod' },
      { on: 'Mijn trekker staat daar', dt: 0.3, actor: 'aldert', anim: 'point' },
      { on: 'Is er een handleiding', actor: 'tammo', face: 'prop:trekker' },
      { on: 'Er is een knop', actor: 'aldert', anim: 'point' },
      { on: 'Die doet het', actor: 'tessa', anim: 'laugh' },
      { on: 'Tammo. We hebben een plekje', actor: 'tessa', face: 'actor:tammo' },
      { on: 'Een plekje', actor: 'tammo', face: 'actor:tessa' },
      { on: 'Ik ben blij dat we dit', actor: 'tessa', anim: 'lean' },
      { on: 'Klopt', actor: 'tammo', anim: 'nod' },
      // koffie halen bij de trekker: naast de wagen (10,4 / 5,9 lag in de trekker)
      { on: 'Ik ga koffie halen', dt: 2.2, actor: 'aldert', walk: [[8.8, 5.0]], speed: 1.4 },
      { on: 'Het is zomer', actor: 'tammo', anim: 'shrug' },
    ],
    shots: [
      CLOSE('Ik heb geen verstand', 'tammo', { dist: 1.25 }),
      CLOSE('Beppe had koeien', 'tessa', { dist: 1.2 }),
      { on: 'Tammo. We hebben een plekje', dt: 0.1, shot: 'dolly', from: [-0.8, -1.6, 0.7], to: [0.2, -1.2, 0.9], look: 'mid:tammo,tessa@1.9', fov: 55 },
      CLOSE('Klopt', 'tammo', { dist: 1.1 }),
      CLOSE('Is dat je hele antwoord', 'tessa', { dist: 1.2 }),
    ],
    wide: WIDE([-3.0, 3.6, 2.4], [-1.2, 2.4, 2.0], 'mid:tammo,tessa@1.2'),
    // as-sprongen hersteld (180-gradenregel): vervangt de gegenereerde shots met dezelfde t (missionScene, shotFix)
    shotFix: [
      { t: 'L5', shot: 'dolly', from: [3.3, 0.84, 1.6], to: [2.6, 0.41, 1.62], look: 'speaker', fov: 25 },
      { t: 'L10+0.2', shot: 'cut', at: [1.59, 2.25, 1.55], look: 'speaker', fov: 28 },
      { t: 'L17', shot: 'dolly', from: [3.41, 0.79, 1.6], to: [2.62, 1.04, 1.62], look: 'speaker', fov: 25 },
      { t: 'L20', shot: 'cut', at: [1.59, 2.25, 1.55], look: 'speaker', fov: 38 },
      { t: 'L21+0.1', shot: 'dolly', from: [1.01, -1.36, 0.7], to: [-0.06, -1.23, 0.9], look: 'mid:tammo,tessa@1.9', fov: 55 },
      { t: 'L28', shot: 'cut', at: [2.16, 2.91, 1.55], look: 'speaker', fov: 38 },
      { t: 'L30', shot: 'dolly', from: [1.89, 3.74, 1.6], to: [1.23, 3.24, 1.62], look: 'speaker', fov: 25 },
    ],
  };
}

// --- het tenue (de club van de speler, niveau van de Talentenklasse) ----------------------------------------------------

// Het uiterlijk van een figuur in het clubtenue, zoals voetbal.js het voor een speler in de wedstrijd bouwt (footballkit.js actorLook).
// base: het uiterlijk van de figuur (ANITA_APPEARANCE, of huid en soort van een teamgenoot); human: { hair, body } van de eigen outfit.
export function clubLook(club, { base = {}, number = 10, seed = 9811, human = null, level = null } = {}) {
  const lvl = level || levelOfDivision('talent');
  const al = actorLook(club || {}, { level: lvl, role: 'veld', number, seed, clubId: (club && club.id) || '', name: true, ...(human ? { human } : {}) });
  return {
    ...base, shirt: al.shirt, pants: al.pants, shoes: al.shoes, shirtBands: al.shirtBands,
    ...(al.body ? { body: al.body } : {}), ...(al.hairStyle ? { hairStyle: al.hairStyle } : {}), ...(al.hair != null ? { hair: al.hair } : {}),
    look: { ...al.look, age: 'adult', umbrella: null },
  };
}
// De ploeggenoten (drie, in hetzelfde tenue met eigen nummers en seeds): { ploeg1, ploeg2, ploeg3 }.
export function teamLooks(club, skin = 0xd9b48f) {
  const out = {};
  [[1, 'male', 4, 9831], [2, 'female', 7, 9844], [3, 'male', 9, 9857]].forEach(([n, variant, number, seed]) => {
    out['ploeg' + n] = { name: 'Teamgenoot', ...clubLook(club, { base: { skin, variant, seed }, number, seed }) };
  });
  return out;
}

// --- wanneer is een scène aan de beurt -----------------------------------------------------------------------------------

// De voetbalcarrière is net begonnen: gestart, nog geen wedstrijd gespeeld of berekend, seizoen 1, en de scène is nog niet gezien (de vlag staat in
// de verhaalvlaggen van de speler, dus ook na een nieuwe carrière niet nog eens).
export function footballDue(career, flags) {
  if (!career || !career.started || !flags || flags.has(FOOTBALL_FLAG)) return false;
  const st = career.stats || {};
  return (career.seasonNr | 0) === 1 && !(st.matches | 0) && !(st.simulated | 0);
}

// Het eerste perceel: het vroegst gekochte perceel dat geen startperceel is (a: het toegangspunt aan de weg, c: het binnenpunt van het veld). Een bezit met
// meer dan twee aankopen is een oude save (hij heeft de scène nooit gezien en krijgt hem ook niet meer: te laat om een begin te zijn).
export const MAX_BOUGHT = 2;
export function firstParcel(b) {
  if (!b || !b.parcels) return null;
  let best = null;
  for (const [id, p] of Object.entries(b.parcels)) {
    if (!p || p.lg || !Array.isArray(p.a) || !Array.isArray(p.c)) continue;
    if (!best || (p.t | 0) < (best.t | 0)) best = { id, t: p.t | 0, ax: p.a[0], ay: p.a[1], cx: p.c[0], cy: p.c[1], ha: p.ha };
  }
  return best;
}
export function farmDue(b, flags) {
  if (!b || !flags || flags.has(FARM_FLAG)) return null;
  const bought = (b.totals && b.totals.bought) | 0;
  if (bought < 1 || bought > MAX_BOUGHT) return null;
  return firstParcel(b);
}

// Elke reden waarom hij nu niet speelt (leeg = hij mag). `s` is een platte snapshot (zie careerdebutrun.js). `held`: de namen die de meldingenpoort
// vasthoudt (notifyqueue.js: laadscherm, opstart, film, schermvullende kaart, gesprek, missie): daar komt de scène nooit overheen, en ook niet over een melding.
export function debutBlockers(s) {
  const out = [];
  if (!s.started) out.push('spel nog niet gestart');
  if (s.loading) out.push('laadscherm staat nog');
  for (const h of s.held || []) out.push('poort: ' + h);
  if (s.noticeShown) out.push('melding in beeld');
  if (s.openingDue) out.push('de opening komt nog');
  if (s.missionActive) out.push('missie actief');
  if (s.cinematicActive) out.push('film bezig');
  if (s.sinceCinematicS != null && s.sinceCinematicS <= 2.5) out.push('film net afgelopen');
  if (s.pigeon) out.push('duifstand');
  if (s.activity) out.push('activiteit of minigame bezig');
  if (s.respawn) out.push('terugzetten loopt');
  if (s.wanted > 0) out.push('politie op je hielen');
  if (s.sinceDeathS != null && s.sinceDeathS < 20) out.push('vlak na de dood');
  if (s.menuOpen) out.push('menu open');
  if (s.recapOpen) out.push('recapkaart open');
  if (!s.dataReady) out.push('verhaaldata nog niet geladen');
  return out;
}
export const DEBUT_CALM_S = 2.5;
export const debutDecide = ({ blockers, calmS }) => (blockers && blockers.length ? 'wacht' : calmS < DEBUT_CALM_S ? 'wacht' : 'speel');

// --- de catalogus (cutpreview.js en de linter): de scènes als eenheden, zonder wereld ---------------------------------------

export const stubLooks = (looks = {}) => ({ ...looks, ploeg1: { name: 'Teamgenoot', shirt: 0xc13a2e, skin: 0xd9b48f, variant: 'male', seed: 9831 }, ploeg2: { name: 'Teamgenoot', shirt: 0xc13a2e, skin: 0xd9b48f, variant: 'female', seed: 9844 }, ploeg3: { name: 'Teamgenoot', shirt: 0xc13a2e, skin: 0xd9b48f, variant: 'male', seed: 9857 } });
export function debutCatalog(looks = {}) {
  const L = stubLooks(looks);
  const rows = [[FOOTBALL_ID, footballSpec()], [FARM_ID, farmSpec()]];
  return rows.map(([id, spec]) => {
    const s = SCENES[id];
    const tl = debutTimeline(s.lines);
    const missing = [];
    for (const c of Object.values(spec.cast || {})) if (!L[c.key]) missing.push(c.key);
    const def = missing.length ? null : missionScene(null, tl.lines, { looks: L, spec });
    return { id, title: s.titel, kicker: s.kicker, def, lines: tl.lines, duration: tl.total, missing: missing.length ? missing : null };
  });
}
