// De verhaaldata van de voetbalcarrière (#1374, V0 en V1, bijbel 28-11 deel 01 en 02): puur, geen DOM en geen THREE (scripts/football_story_test.mjs).
// Wat hier staat: de verhaalclubs (de dorpsclub De Hoekers en de topclub De Noorderlichters, zonder voorvoegsel: ADR 0043), de bijfiguren, de zes rangen als data, de aanleiding (de invalbeurt)
// en de verhaalbeats per rang (stille appjes, hooguit 14 woorden). Alles is verzonnen; de namen volgen deel 01 van de bijbel (Albert Teuben, Eppo Rozema), niet de eerste opzet van deel 02.
// Samen spelen: rang, vlaggen en beats staan per speler in het eigen profiel (`flags.storyBeats`, een bitmasker); niets hier raakt een gedeelde toestand of w.player.
import { WORD_BUDGET } from './hudtext.js';
import { beatMayShow } from './voetbalbeats.js';
import { divisionOf } from './voetbalseason.js';

// ---- de verhaalclubs ----
// De dorpsclub staat in Warffum (Hogeland, bij het erf Zeldenrust): de club van die plaats heet in plaats van een sjabloonnaam De Hoekers (voetbalparken.js: localClubName).
export const STORY_PLACE_ID = 48459273;
export const STORY_PLACE = 'Warffum';
export const STORY_VILLAGE_CLUB = 'De Hoekers';
export const STORY_TOP_CLUB_ID = 'noorderlichters';        // de Kroonklasse-club in de Euroborg (voetbalclubs.js)
export const STORY_TOP_CLUB = 'De Noorderlichters';

// Het startpark: het park van de dorpsclub. Ontbreekt het (kapotte of kleine data), dan geeft dit null en blijft de start waar hij was.
export function storyHome(index) {
  const club = index && index.byPlace ? index.byPlace.get(STORY_PLACE_ID) : null;
  return club && club.park ? { x: club.park.x, y: club.park.y } : null;
}

// ---- de bijfiguren, in volgorde van opkomst (rang waarop de speler ze leert kennen) ----
export const CAST = [
  { id: 'albert', naam: 'Albert Teuben', rol: 'Voorzitter van De Hoekers', rang: 1, intro: 'Een man met een sjaal en een ledenlijst die nooit klopt.' },
  { id: 'eppo', naam: 'Eppo Rozema', rol: 'Trainer van De Hoekers', rang: 1, intro: 'Gepensioneerd onderwijzer: hij legt tactiek uit met suikerklontjes en een koekenpan.' },
  { id: 'hilbrand', naam: 'Hilbrand', rol: 'Verslaggever', rang: 2, intro: 'Schrijft de krant vol en praat het commentaar aan elkaar.' },
  { id: 'femke', naam: 'Femke van der Meer', rol: 'Keeper', rang: 2, intro: 'Gele keepersjack, een tas die altijd openstaat, en een dag te laat.' },
  { id: 'devries', naam: 'Mevrouw De Vries-Jansen', rol: 'Scout van De Stadjers', rang: 4, intro: 'Ziet alles, schrijft weinig op.' },
  { id: 'jaap', naam: 'Jaap Roorda', rol: 'Bakker en sponsor', rang: 5, intro: 'Koeken in de pauze, later ook de man van de snackwagen.' },
];
export const castById = (id) => CAST.find((p) => p.id === id) || null;

// ---- de zes rangen als data (bijbel 02, tabel bij 2b) ----
// `fase` is de bestaande fase van de carrière; `plek` een echte plaats voor het moment (alleen om de speler te laten zien waar het gebeurt).
export const RANKS = [
  { rang: 1, id: 'amateur', naam: 'Amateur', fase: 'Talentenklasse', moment: 'De invalbeurt en de trainingsavond achter het dorpshuis.', plek: STORY_PLACE, figuren: ['albert', 'eppo'] },
  { rang: 2, id: 'debuut', naam: 'Debuut', fase: 'Eerste basisplaats', moment: 'Het eerste doelpunt en de supporters van het dorp.', plek: STORY_PLACE, figuren: ['hilbrand', 'femke'] },
  { rang: 3, id: 'selectie', naam: 'Selectie', fase: 'Promotie uit de Talentenklasse', moment: 'Een heet seizoen en promotie.', plek: 'Uithuizen', figuren: ['femke'] },
  { rang: 4, id: 'doorbraak', naam: 'Doorbraak', fase: 'Terpklasse', moment: 'De eerste uitwedstrijd langs de Waddenkust en een bod van een andere club.', plek: 'Roodeschool', figuren: ['devries'] },
  { rang: 5, id: 'kapitein', naam: 'Transfers en kapitein', fase: 'Kapitein', moment: 'Naar een club in de stad en de band om de arm.', plek: 'Groningen', figuren: ['jaap'] },
  { rang: 6, id: 'manager', naam: 'Trainer en Manager', fase: 'Kroonklasse', moment: 'De sportieve en zakelijke kant: de Euroborg en de Waddenbeker.', plek: 'Euroborg', figuren: ['devries'] },
];

// De rang van een profiel (1 tot 6): de hoogste voorwaarde die haalbaar is. Alleen lezen; een profiel zonder start is rang 0.
// 2 debuut of een gespeelde wedstrijd; 3 een promotie; 4 een bod of een overstap; 5 aanvoerder; 6 Trainer, Manager of in de Kroonklasse.
export function storyRank(c) {
  if (!c || !c.started) return 0;
  const f = c.flags || {}, st = c.stats || {}, roles = c.roles || {};
  const div = c.world && c.club ? divisionOf(c.world, c.club) : null;
  let r = 1;
  if (f.debut || (st.matches | 0) >= 1) r = 2;
  if ((st.promotions | 0) >= 1) r = Math.max(r, 3);
  if (f.bid || (f.moved | 0) >= 1) r = Math.max(r, 4);
  if (f.captain) r = Math.max(r, 5);
  if (roles.trainer || roles.manager || div === 'kroon') r = 6;
  return r;
}
export const rankInfo = (n) => RANKS.find((r) => r.rang === n) || null;

// ---- de aanleiding: de invalbeurt (bijbel 02 bij 2a; de scène zelf is V2) ----
// Drie delen: de gewone trainingsavond (de speler loopt langs het veld en leert de mensen kennen), de zondag en het clubhuis erna. Elke regel heeft een spreker en een plek.
export const INVAL_PLACE = STORY_PLACE;
export const INVAL = {
  club: STORY_VILLAGE_CLUB, plaats: STORY_PLACE,
  avond: [
    { wie: 'Albert Teuben', tekst: 'Welkom bij De Hoekers. Ik ben Albert Teuben, de voorzitter. De ledenlijst klopt nooit, maar de koffie wel.' },
    { wie: 'Eppo Rozema', tekst: 'Eppo Rozema, de trainer. Kijk, dit suikerklontje is ons middenveld.' },
    { wie: 'Tammo', tekst: 'Wij zijn Tammo en Tessa. Wij liepen alleen langs het veld.' },
    { wie: 'Tessa', tekst: 'En dat klontje daar?' },
    { wie: 'Eppo Rozema', tekst: 'De linksbuiten. Die staat zondag in de basis.' },
    { wie: 'Albert Teuben', tekst: 'Het klontje is zekerder dan sommige spelers.' },
  ],
  zondag: [
    { wie: 'Eppo Rozema', tekst: 'Onze linksbuiten ligt eruit. Met een natte sok, geloof ik. We hebben nog maar tien man.' },
    { wie: 'Tammo', tekst: 'Tessa kan dit. Ze was bij elk straatpotje scheidsrechter.' },
    { wie: 'Tessa', tekst: 'Scheidsrechter, Tammo. Dat is niet hetzelfde als spelen.' },
    { wie: 'Albert Teuben', tekst: 'Kun je een bal raken, Tessa?' },
    { wie: 'Tessa', tekst: 'Een beetje. Waar zijn de schoenen?' },
    { wie: 'Tammo', tekst: 'Ik regel de schoenen en de papieren. Ik sta wel aan de lijn.' },
    { wie: 'Eppo Rozema', tekst: 'Links, Tessa. Daar gebeurt het. Het klontje blijft in de kast.' },
  ],
  clubhuis: [
    { wie: 'Albert Teuben', tekst: 'Onze linksbuiten ligt eruit. Tessa was er toevallig en ze kan het. Zo begon het.' },
    { wie: 'Albert Teuben', tekst: 'Het bord hangt hier boven de koffieautomaat. Haar naam staat erop, met potlood.' },
  ],
  // wat het bord toont: de opstelling met een doorgestreepte naam en Tessa's naam erbij, de eerste wedstrijdfoto ernaast
  bord: { doorgestreept: 'de linksbuiten', erbij: 'Tessa', foto: 'de eerste wedstrijdfoto' },
};
// De regels van de aanleiding in volgorde (voor de terugblik van een gast; de scène zelf is careerdebut_voetbal.js, met meer regels in het clubhuis); `deel` is avond, zondag of clubhuis.
export const invalLines = (deel = null) => (deel ? (INVAL[deel] || []) : [...INVAL.avond, ...INVAL.zondag, ...INVAL.clubhuis]).map((l) => ({ ...l }));
// De terugblik voor een gast die de aanleiding mist: alleen het clubhuis (Albert), nooit een eigen vlag of voortgang.
export const guestRetrospect = () => invalLines('clubhuis');

// ---- de verhaalbeats per rang ----
export const STORY_BEAT_MAX_WORDS = WORD_BUDGET.phone;       // 14 woorden per bericht
const words = (t) => String(t).trim().split(/\s+/).length;
// Per beat: een trigger op het profiel, de spreker (altijd met rol, de eerste keer dat de speler hem leest) en de tekst. De volgorde is de bit in `flags.storyBeats`.
export const STORY_BEATS = [
  { id: 'V1', naam: 'Het clubhuis', rang: 1, when: (c) => storyRank(c) >= 1, wie: 'Albert Teuben', tekst: 'Albert Teuben, voorzitter van De Hoekers: je naam staat op het bord. Met potlood.' },
  { id: 'V2', naam: 'De trainer', rang: 2, when: (c) => storyRank(c) >= 2, wie: 'Eppo Rozema', tekst: 'Eppo Rozema, de trainer: "Links is waar het gebeurt." Hij legt suikerklontjes neer.' },
  { id: 'V3', naam: 'De keeper', rang: 3, when: (c) => storyRank(c) >= 3, wie: 'Femke', tekst: 'Femke, de keeper: "Promotie! Ik kwam een dag te laat. Zoals altijd."' },
  { id: 'V4', naam: 'De scout', rang: 4, when: (c) => storyRank(c) >= 4, wie: 'De Vries-Jansen', tekst: 'Mevrouw De Vries-Jansen, scout van De Stadjers, keek mee. Ze schreef niets op.' },
  { id: 'V5', naam: 'De bakker', rang: 5, when: (c) => storyRank(c) >= 5, wie: 'Jaap Roorda', tekst: 'Bakker Jaap Roorda stuurt koeken voor de band om je arm. Gratis, zegt hij.' },
  { id: 'V6', naam: 'De manager', rang: 6, when: (c) => storyRank(c) >= 6, wie: 'Mevrouw De Vries-Jansen', tekst: 'Mevrouw De Vries-Jansen, de scout: "De Euroborg wacht. Neem je schoenen mee."' },
];
// Jelle's brief: eén per seizoen vanaf seizoen 2 (een sponsor die nooit komt en alleen formulieren stuurt); vier teksten die rondgaan.
const JELLE = [
  'Brief van Jelle (de Commissie): overschrijving in achtvoud, met een Friese stempel.',
  'Brief van Jelle (de Commissie): uw sponsorbord is nog in behandeling. Bezwaartermijn zes weken.',
  'Brief van Jelle (de Commissie): het veld is een tijdelijke wijziging. Formulier bijgevoegd.',
  'Brief van Jelle (de Commissie): uw doelpunt is genoteerd. Doorslag volgt.',
];
export const jelleLetter = (c) => (c && c.started && (c.seasonNr | 0) >= 2 && (c.seasonNr | 0) > ((c.flags && c.flags.jelleBrief) | 0)
  ? { id: `J${c.seasonNr | 0}`, naam: 'Brief van Jelle', wie: 'Jelle', tekst: JELLE[((c.seasonNr | 0) - 2) % JELLE.length], seizoen: c.seasonNr | 0, jelle: true } : null);

// De volgende verhaalbeat: de eerste die zijn trigger haalt en nog niet gedaan is, of anders Jelle's brief van dit seizoen. Dezelfde regels als voetbalbeats.js: nooit tijdens een scène of missie, hooguit één per speldag.
export function nextStoryBeat(c, ctx = {}) {
  if (!c || !c.started || !beatMayShow(c, ctx)) return null;
  const seen = (c.flags && c.flags.storyBeats) | 0;
  for (let i = 0; i < STORY_BEATS.length; i++) {
    if (seen & (1 << i)) continue;
    if (STORY_BEATS[i].when(c)) return STORY_BEATS[i];
  }
  return jelleLetter(c);
}
// Een verhaalbeat als gedaan markeren (een nieuw profiel; deelt de beat-dag met voetbalbeats.js, zodat er hooguit één beat per dag komt).
export function markStoryBeat(c, beat, day = 0) {
  if (!beat) return c;
  const flags = { ...c.flags, beatDay: (day | 0) + 1 };
  if (beat.jelle) flags.jelleBrief = beat.seizoen;
  else {
    const i = STORY_BEATS.findIndex((b) => b.id === beat.id);
    if (i < 0) return c;
    flags.storyBeats = ((c.flags && c.flags.storyBeats) | 0) | (1 << i);
  }
  return { ...c, flags };
}
export const storyBeatsDone = (c) => STORY_BEATS.filter((b, i) => ((c && c.flags && c.flags.storyBeats) | 0) & (1 << i)).map((b) => b.id);
export const storyHudLine = (beat) => `${beat.wie}: ${beat.tekst}`;
export const storyBeatWords = (beat) => words(beat.tekst);
