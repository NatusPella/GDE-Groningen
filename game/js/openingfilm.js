// The opening of a fresh game as FILM DATA (docs/verhaal/OPENING-FILMSCRIPT-21-11.md is the script, this is its machine form).
// Pure data plus validators (no THREE, no DOM): scripts/openingfilm_test.mjs judges the sequence against the direction rules
// (scripts/release/cutscene-regels.json, R-01..R-30), the opening protocol (a viewer with ZERO context learns two names, the theme, a first hint
// of the opponent and what they need to do first) and the plan of the staging.
//
// ROUND 2 (21-11): the film is STAGED. intromontage.js buildFilmShots() turns SEQUENCE into shots of its montage engine (new shots plus the
// proven kitchen, moving-day and swoop shots, patched with the lines and camera cuts of this film). It runs behind ?openingfilm (devflags.js),
// started by story.js playOpening; any failure falls back on the old opening (montage + the two acts of cutscenes.js).
//
// Scene ids follow the story script (docs/verhaal/nieuw/09-script-akte1.md): C00.1 cold open, C00.2 the kitchen, C00.3 moving day. The lines of C00.2
// and C00.3 are the lines of the story lead (epic-verhaal-21-11: the competition, the stand, 150 euros) in the order and with the camera of this film.
//
// SEQUENCE entry: { id, scene, make (the builder in intromontage.js), type, fov, move: { kind, dist (m) }, lines: [line ids], minDur (s), ... }
//   type: wide | medium | close | insert | beauty | card      kind: static | dolly | crane | track
// LINES entry: { id, k ('V' Rikus, 'T' Tammo, 'A' Tessa: the montage's speaker keys), text, tag (delivery for the TTS round), voice, scene, kind, emotion }

export const OPENING_ID = 'C00';
export const OPENING_RANGE = [60, 240]; // s: owner decision 21-11, "langer mag" (was 60-120 s, and the old opening was 170 s): up to 4 minutes
export const TITLE = { kicker: 'GDE Groningen', title: 'Zomer vol misdaad', tagline: 'Een zomer in Grunn. Kon minder.', sub: 'Tammo en Tessa zijn net afgestudeerd en hebben samen geld voor één patatje.' };

// Samen spelen (AGENTS.md, multiplayer bij ontwerp): the opening is LOCAL and the same for everybody: a voiced two-hander in which both of them
// are on screen, so it needs no 'who is the protagonist' fork. Every player sees it in his own game (a guest who joins a running session sees it
// when his own profile starts fresh), skipping is per player and never stops anyone else, the host has no say. Only the END differs: the swoop
// lands on the local protagonist (Tammo or Tessa, per player).
export const MULTIPLAYER = { mode: 'local', identical: true, skipPerPlayer: true, gatesOthers: false, endsOnLocalProtagonist: true };

// Accessibility: no flashes in this film (a cut is a cut, never a white frame: the montage's flash() is not used between these shots), reduced
// motion swaps the title card's zoom for a fade, subtitles are always on, skipping is a hold (cinematics.js: SPACE, 0.9 s).
export const ACCESS = { flashes: false, reducedMotionCard: 'fade', subtitlesAlways: true, skip: { key: 'SPATIE', holdS: 0.9 } };
export const skipHint = () => ({ key: ACCESS.skip.key, text: `Houd {${ACCESS.skip.key}} ingedrukt om over te slaan` });

// The grade (colour mood) and the clock per scene: the day has a rhythm, gold at dawn, soft light in the room, clear at noon.
export const GRADES = {
  'gouden-uur': { clock: [6.2, 6.5], weather: 'mist', note: 'laag gouden licht, koele schaduwen, vlak na de zonsopgang' },
  'kamer-ochtend': { clock: [7.4, 7.5], weather: 'helder', note: 'zacht daglicht, warme tafel, koele rest' },
  'dag-helder': { clock: [10.5, 10.7], weather: 'helder', note: 'heldere ochtend, harde schaduwen, kleuren vol' },
};

export const SCENES = [
  { id: 'C00.1', slug: 'EXT. DE STAD, VAN D’OLLE GRIEZE NAAR DE OOSTERPARKWIJK – ZONSOPGANG', grade: 'gouden-uur', place: 'Martinikerkhof / Oosterparkwijk', beat: 'Grunn is mooi en grappig; twee mensen op een stoep; hij heeft duiven' },
  { id: 'C00.2', slug: 'INT. ZOLDERKEUKEN, OOSTERPARKWIJK – OCHTEND', grade: 'kamer-ochtend', place: 'Oosterparkwijk, zolder', beat: 'ze zijn bang elkaar kwijt te raken en zoeken één plek samen; er loopt een Fries rond' },
  { id: 'C00.3', slug: 'EXT. PADDEPOEL, PLEIADENLAAN – MIDDAG', grade: 'dag-helder', place: 'Paddepoel, House of Groningen', beat: 'de verhuizing; wat ze eerst moeten doen; rijden, niet praten; titelkaart' },
];

// --- the lines (BEHOUDEN = a recording exists; NIEUW = text only until the TTS round) --------------------------------
const L = (id, k, text, voice, scene, extra = {}) => ({ id, k, who: k === 'V' ? 'rikus' : k === 'T' ? 'tammo' : 'anita', speaker: k === 'V' ? 'Rikus' : k === 'T' ? 'Tammo' : 'Tessa', channel: k === 'V' ? 'radio' : '', text, voice, scene, tag: '', ...extra });

export const LINES = [
  L('L00', 'V', 'Augustus. In Grunn heet dat zomer.', 'behouden', 'C00.1', { tag: 'warm, zacht, als nacht-dj in het laatste uur' }),
  L('L01', 'V', 'Er gaat niets boven Grunn. Behalve de Martinitoren.', 'behouden', 'C00.1', { tag: 'droog, met een knipoog' }),
  L('L02', 'V', 'Vandaag in Grunn: weinig nieuws. Dat komt nog.', 'nieuw', 'C00.1', { tag: 'plagend, laconiek' }),
  // the kitchen
  L('L10', 'T', 'Moi. De bank?', 'behouden', 'C00.2', { kind: 'question', emotion: 'neutral', tag: 'droog, slaperig, voorzichtig' }),
  L('L11', 'A', '"Uw plan is sympathiek." Dat betekent nee, met een strikje.', 'behouden', 'C00.2', { kind: 'punch', emotion: 'neutral', humor: true, tag: 'ad rem, cynisch, moe' }),
  L('L12', 'A', 'Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto.', 'behouden', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'zakelijk, ad rem, een beetje moedeloos' }),
  L('L13', 'T', 'Ik wel. De Escapade.', 'behouden', 'C00.2', { kind: 'line', emotion: 'joy', tag: 'droog, terloops' }),
  L('L14', 'A', 'Die rijdt nauwelijks.', 'behouden', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'droog, ongelovig' }),
  L('L15', 'T', 'Dan rijdt hij nauwelijks voor jou. Een snackwagen die nauwelijks rijdt. Dat is een concept.', 'nieuw', 'C00.2', { kind: 'line', emotion: 'tender', tag: 'warm, verlegen, droog, alsof het niks is' }),
  L('L16', 'A', 'Zonder bank blijft er één weg over: een wedstrijd. Wie wint, krijgt de enige vrije standplaats van de Stad, een plek voor een wagen.', 'nieuw', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'nuchter, helder, legt uit' }),
  L('L17', 'T', 'De prijs voor de beste eierbal.', 'nieuw', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'droog, hoopvol' }),
  L('L18', 'A', 'Wij winnen op 28 augustus, wij krijgen die standplaats, en dan zien we wel wat erop komt te staan.', 'nieuw', 'C00.2', { kind: 'line', emotion: 'joy', tag: 'zelfverzekerd, snel' }),
  L('L19', 'T', 'Is dat het plan? Een frietwagen?', 'nieuw', 'C00.2', { kind: 'question', emotion: 'neutral', tag: 'voorzichtig, vragend' }),
  L('L20', 'A', 'Het is een tekening, Tammo. Ik weet nog niet wat ik wil. Dit heb ik tot nu toe.', 'nieuw', 'C00.2', { kind: 'confession', emotion: 'sad', tag: 'zacht, eerlijk, een beetje kwetsbaar' }),
  L('L21', 'T', 'Dan rijd ik hem. Tot je het weet.', 'nieuw', 'C00.2', { kind: 'promise', emotion: 'tender', tag: 'warm, verlegen' }),
  L('L22', 'T', 'En tot die tijd? Hier past geen frietwagen.', 'nieuw', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'droog, kijkt naar het schuine dak' }),
  L('L23', 'A', 'Daarom. Paddepoel, elfde verdieping. Twee kamers en een garage, voor de Fjord.', 'behouden', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'zakelijk, snel, stiekem trots' }),
  L('L24', 'T', 'Paddepoel? Dat is buitenland.', 'behouden', 'C00.2', { kind: 'line', emotion: 'shock', tag: 'geschrokken, droog' }),
  L('L25', 'A', 'Vierentwintig, net afgestudeerd en samen nul banen. Na de studie gaat iedereen ergens anders heen. Wij niet.', 'nieuw', 'C00.2', { kind: 'promise', emotion: 'tender', tag: 'zacht, stellig, ontwijkt zijn blik' }),
  L('L26', 'A', 'Alleen kan ik de huur niet betalen. Jij ook niet. Samen net.', 'behouden', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'nuchter, ad rem' }),
  L('L27', 'T', '…Samen.', 'behouden', 'C00.2', { kind: 'confession', emotion: 'tender', tag: 'zacht, overvallen' }),
  L('L28', 'A', 'Als huisgenoten, Tammo. Teken nou maar.', 'behouden', 'C00.2', { kind: 'punch', emotion: 'neutral', humor: true, tag: 'snel, net te zakelijk, ontwijkend' }),
  L('L29', 'V', 'Het is vrijdag 14 augustus. Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is. Ik zeg niks.', 'nieuw', 'C00.2', { tag: 'warm, droog, als nacht-dj op de radio, een knipoog' }),
  L('L30', 'A', 'Kom. Werk.', 'behouden', 'C00.2', { kind: 'line', emotion: 'neutral', tag: 'kortaf, zakelijk, net te snel' }),
  // moving day
  L('L40', 'T', 'Elf hoog. Met een lift. Ik voel me rijk.', 'behouden', 'C00.3', { kind: 'line', emotion: 'joy', tag: 'droog, trots, met een verhuisdoos in zijn armen' }),
  L('L41', 'A', 'Je bent niet rijk, Tammo. Je bent huisgenoot.', 'behouden', 'C00.3', { kind: 'punch', emotion: 'neutral', humor: true, tag: 'plagend, warm, net te snel' }),
  L('L42', 'A', 'Eerst geld. Meedoen aan die wedstrijd, de Noordelijke Snackprijs, kost honderdvijftig euro, contant, uiterlijk morgen om twaalf uur.', 'nieuw', 'C00.3', { kind: 'line', emotion: 'neutral', tag: 'zakelijk, helder' }),
  L('L43', 'T', 'Honderdvijftig euro. Vandaag.', 'nieuw', 'C00.3', { kind: 'line', emotion: 'shock', tag: 'droog, geschrokken' }),
  L('L44', 'A', 'Een streamer betaalt honderdvijftig euro voor stunts. Alleen heeft de Escapade een lekke band.', 'nieuw', 'C00.3', { kind: 'line', emotion: 'neutral', tag: 'nuchter, een beetje moedeloos' }),
  L('L45', 'A', 'Dus we lenen een bakkie. Rijden, niet praten.', 'nieuw', 'C00.3', { kind: 'punch', emotion: 'neutral', humor: true, tag: 'beslist, snel' }),
];
const lineById = (id) => LINES.find((l) => l.id === id);
export const linesOf = (scene = null) => LINES.filter((l) => !scene || l.scene === scene);
// the recordings that live outside the story bank (the trailer voice): { 'Speaker|text': { src (under game/), dur (s) } }, read by intromontage.js voiceOf
export const FILM_VOICES = { 'Rikus|Augustus. In Grunn heet dat zomer.': { src: 'audio/voicelines/trailer/rikus_augustus.mp3', dur: 3.1 } };

// --- the sequence -------------------------------------------------------------------------------------------------
// make: the builder in intromontage.js buildFilmShots (new = built for this film, old = the proven shot, patched). lead/gaps: seconds before/between lines.
const S = (id, scene, make, type, fov, move, extra = {}) => ({ id, scene, make, type, fov, move, lines: [], minDur: 3, ...extra });
const ST = { kind: 'static', dist: 0 };
// Shot types and their lens (R-05): wide 46-54, medium 36-44, close 20-32. Camera height is eye level (1.55-1.65 m) unless `why` says otherwise (R-06).
const FOV_RANGE = { wide: [46, 54], beauty: [46, 54], medium: [34, 44], close: [20, 32], insert: [20, 32] };

export const SEQUENCE = [
  // --- C00.1: cold open ---
  S('c1-zwart', 'C00.1', 'black', 'card', null, ST, { lines: ['L00'], lead: 0.5, minDur: 3.4, black: true, cue: 'radio-open', note: 'zwart; meeuwen, een fietsbel, dan Rikus' }),
  S('c1-markt', 'C00.1', 'crane', 'wide', 50, { kind: 'crane', dist: 3.6 }, { lines: ['L01'], lead: 0.6, minDur: 5.2, at: 'Martinitoren', establishing: true, why: 'crane', cam: 'langzame kraan omhoog langs de toren, de zon komt door', cue: 'thema-in', clock: 'gouden-uur' }),
  S('c1-daken', 'C00.1', 'roofs', 'wide', 50, { kind: 'dolly', dist: 6 }, { minDur: 4.6, at: 'Grote Markt, boven de daken', establishing: true, why: 'high', cam: 'zijwaartse zweef boven de daken: de Martinitoren op het rechterderde, schoorstenen en dakpannen in de voorgrond, het gouden ochtendlicht schuin erover' }),
  S('c1-plein', 'C00.1', 'square', 'wide', 46, { kind: 'dolly', dist: 6 }, { minDur: 5, at: 'Grote Markt', establishing: true, why: 'low', cam: 'langzame dolly over het lege plein, laag, lange schaduwen op de klinkers; de Martinitoren op het rechterderde, de eerste fietser en een duif als voorgrond' }),
  S('c1-fietsen', 'C00.1', 'bikes', 'beauty', 46, ST, { lines: ['L02'], lead: 0.4, minDur: 4.2, at: 'Grote Markt', why: 'low', cam: 'laag naast de fietsers, de straat stroomt voorbij' }),
  S('c1-meeuw', 'C00.1', 'gull', 'beauty', 48, ST, { minDur: 2.4, at: 'Vismarkt', humor: true, cam: 'een meeuw pakt een frikandel van een terras; de duiven stuiven weg; stilte erna', sfx: 'meeuw-frikandel', cue: 'sting-meeuw' }),
  S('c1-titel', 'C00.1', 'title', 'card', null, ST, { minDur: 4.4, black: true, card: 'titel', cue: 'titel-sting', note: 'GDE Groningen: Zomer vol misdaad, met de slogan; de stad is gezien, nu de mensen' }),
  S('c1-duiven', 'C00.1', 'street', 'wide', 48, { kind: 'track', dist: 5 }, { minDur: 4.6, at: 'Oosterparkwijk, Korenbloemstraat', cam: 'zij-aanzicht: Tammo loopt met een bekertje koffie, een zwerm duiven volgt op een respectabele afstand', tag: { who: 'tammo', at: 1.0 }, sfx: 'duivenvleugels' }),
  S('c1-schouder', 'C00.1', 'shoulder', 'medium', 40, ST, { minDur: 3.2, at: 'Oosterparkwijk, Korenbloemstraat', cam: 'een duif landt op zijn schouder; hij kijkt er niet naar', sfx: 'koffie-morsen' }),
  S('c1-deur', 'C00.1', 'door', 'medium', 34, ST, { minDur: 3.4, at: 'Zolderkeuken', cam: 'de voordeur door, de kamer in: hij houdt de deur open met zijn elleboog', cue: 'thema-zacht' }),
  // --- C00.2: the kitchen ---
  S('c2-gevel', 'C00.2', 'facade', 'wide', 50, { kind: 'dolly', dist: 7 }, { minDur: 5.4, at: 'Oosterparkwijk, zolder', establishing: true, cam: 'van het zolderraam in de gevel naar de straat; een rode Escapade met een lekke band, een radio zingt zacht', clock: 'kamer-ochtend' }),
  S('c2-bank', 'C00.2', 'kitchenBank', 'medium', 36, { kind: 'dolly', dist: 1.2 }, { lines: ['L10', 'L11'], lead: 1.1, minDur: 6, at: 'Zolderkeuken', cam: 'wide van de keuken; dan over de schouder op Tessa; reactie van Tammo', tag: { who: 'tessa', at: 1.0 }, cue: 'thema-onder' }),
  S('c2-wagen', 'C00.2', 'kitchenCar', 'medium', 36, ST, { lines: ['L12', 'L13', 'L14', 'L15'], lead: 0.4, minDur: 6, at: 'Zolderkeuken', insert: true, cam: 'shot/reverse over de tafel; een insert op de tekening van de blauwe snackwagen (belettering TAM & TES, alleen hier in beeld, nooit in titel of slogan)' }),
  S('c2-plan', 'C00.2', 'kitchenPlan', 'medium', 36, ST, { lines: ['L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22'], lead: 0.4, minDur: 6, at: 'Zolderkeuken', cam: 'shot/reverse per regel; op "Het is een tekening" een close-up op Tessa; op "Dan rijd ik hem" een reactie' }),
  S('c2-thuis', 'C00.2', 'kitchenHome', 'close', 30, ST, { lines: ['L23', 'L24', 'L25'], lead: 0.4, minDur: 6, at: 'Zolderkeuken', cam: 'de belofte: langzame zoom op Tessa; dan Tammo' }),
  S('c2-huur', 'C00.2', 'kitchenRent', 'close', 30, ST, { lines: ['L26', 'L27', 'L28'], lead: 0.4, gaps: { 1: 0.7, 2: 0.8 }, minDur: 6, at: 'Zolderkeuken', insert: true, cam: 'de bekentenis: langzame zoom op Tammo, stilte; een insert op het huurcontract; reactie' }),
  S('c2-raam', 'C00.2', 'kiosk', 'wide', 46, { kind: 'dolly', dist: 3 }, { lines: ['L29'], lead: 0.6, minDur: 6, at: 'Oosterparkwijk, kiosk', cam: 'van boven, door het zolderraam: aan de overkant plakt een man in een blauw colbert, van achteren, een stikker VERKOCHT op het frietkot; een duif kijkt mee', cue: 'jelle-hint', sfx: 'stikker' }),
  S('c2-kom', 'C00.2', 'phone', 'medium', 36, ST, { lines: ['L30'], lead: 0.5, minDur: 3.2, at: 'Zolderkeuken', cam: 'haar telefoon trilt op tafel; zij pakt hem; "Kom. Werk."', sfx: 'notify' }),
  // --- C00.3: moving day ---
  S('c3-toren', 'C00.3', 'moveIn', 'wide', 50, { kind: 'dolly', dist: 6 }, { lines: ['L40', 'L41'], lead: 2.2, minDur: 6.5, at: 'Pleiadenlaan', establishing: true, cam: 'de woontoren, elf hoog; voor de deur de Escapade met een matras op het dak', clock: 'dag-helder' }),
  S('c3-geld', 'C00.3', 'moveMoney', 'medium', 40, ST, { lines: ['L42', 'L43', 'L44', 'L45'], lead: 0.4, minDur: 6, at: 'Pleiadenlaan', insert: true, cam: 'shot/reverse bij de auto; op "een lekke band" een close-up op de band; kicker "Rijden, niet praten."', sfx: 'band-sissen' }),
  S('c3-zweef', 'C00.3', 'swoop', 'wide', 50, { kind: 'crane', dist: 3.6 }, { minDur: 4.6, at: 'Paddepoel', cam: 'de zweefvlucht naar de startplek van de speler (flyShot); "Welkom in Grunn"', cue: 'thema-groot' }),
];

// Sound hooks (22-11): the film's own sound hints (SEQUENCE sfx) that fit a sound of the central map (sfx/sfxmap.js, played with sfxEvent in
// intromontage.js). Keyed by shot id. The hints without a fitting sound stay open (SFX_OPEN) until the sound round: no new audio in this round.
export const SFX_KOPPELING = { 'c1-schouder': 'npc_sigh', 'c2-raam': 'deed_stamp' };
export const SFX_OPEN = { 'c1-duiven': 'duivenvleugels (een zwerm die opstijgt)', 'c3-geld': 'band-sissen (lucht uit een lekke band)' };

// The camera setups per staged shot (the cuts inside it, intromontage.js cams): R-02 and R-03 are judged per camera segment, not per staged shot.
const CAMS = { 'c2-bank': 3, 'c2-wagen': 5, 'c2-plan': 9, 'c2-thuis': 4, 'c2-huur': 5, 'c2-kom': 2, 'c3-geld': 6 };
for (const s of SEQUENCE) s.cams = CAMS[s.id] || 1;

// Name cards (R-13): the first appearance of each person, with ONE dry line. Rikus is a voice on the radio and Jelle a silhouette: no card.
export const NAME_CARDS = {
  tammo: { name: 'TAMMO', line: 'Kent elke auto. De duiven kennen hem.', shot: 'c1-duiven' },
  tessa: { name: 'TESSA', line: 'Zegt wat ze denkt. Meestal twee keer.', shot: 'c2-bank' },
};

// Music and sound cues for a later music round: mood and timing per shot (`shot` = the SEQUENCE id whose start it follows).
export const MUSIC = [
  { shot: 'c1-zwart', cue: 'radio-open', mood: 'stilte met straatgeluid', note: 'geen muziek; meeuwen, fietsbel, Rikus' },
  { shot: 'c1-markt', cue: 'thema-in', mood: 'zonsopgang, warm, hoopvol', note: 'het thema valt in op de eerste kraanbeweging, een bar lang opbouwend' },
  { shot: 'c1-meeuw', cue: 'sting-meeuw', mood: 'komisch, korte pizzicato-stoot', note: 'ritme gaat even uit voor de grap (R-08)' },
  { shot: 'c1-titel', cue: 'titel-sting', mood: 'opening', note: 'de titel valt op de beat; een klokje; daarna de mensen' },
  { shot: 'c1-deur', cue: 'thema-zacht', mood: 'huiselijk', note: 'het thema zakt een octaaf, de kamer in' },
  { shot: 'c2-bank', cue: 'thema-onder', mood: 'gesprek', note: 'de muziek ducket onder elke stem (theme.js setThemeDuck); alleen een kamertoon-gitaar' },
  { shot: 'c2-huur', cue: 'stilte-bekentenis', mood: 'stil', note: 'één halve seconde stilte op “…Samen.” (R-08), dan zacht terug' },
  { shot: 'c2-raam', cue: 'jelle-hint', mood: 'dreigend maar luchtig', note: 'twee diepe noten (tuba) als de stikker VERKOCHT wordt geplakt; niets meer' },
  { shot: 'c3-zweef', cue: 'thema-groot', mood: 'ruim, vrolijk, vertrek', note: 'het thema volledig op de zweefvlucht' },
];

// --- helpers and validators --------------------------------------------------------------------------------------

const wordsOf = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const moveSpeed = (s) => (s.minDur > 0 ? s.move.dist / s.minDur : 0);
const r1 = (n) => Math.round(n * 10) / 10;
// the montage's own reading time (intromontage.js readDur) for a line without a recording, used here as an estimate of every line
const readDur = (text) => Math.max(1.6, String(text).length / 14);

// The estimated timeline: a shot lasts its lead, its lines (and gaps) and 0.3 s, at least minDur. The engine rounds a shot up to the next beat of the
// theme, so the real film is a little longer than this (at most one beat, 0,54 s, per shot).
export function timeline() {
  let t = 0;
  return SEQUENCE.map((s) => {
    let at = s.lead ?? 0.5;
    const lines = s.lines.map((id, i) => { const l = lineById(id); at += (s.gaps && s.gaps[i]) || 0; const row = { id, at, dur: readDur(l.text) + 0.12 }; at += row.dur + 0.06; return row; });
    const dur = Math.max(s.minDur, at + (s.lines.length ? 0.3 : 0));
    const row = { id: s.id, t: r1(t), dur: r1(dur), lines };
    t += dur;
    return row;
  });
}
export const openingDuration = () => { const tl = timeline(); const l = tl[tl.length - 1]; return l.t + l.dur; };
// The shot where the theme falls in (MUSIC cue 'thema-in'): before it the film is silent apart from street sound and Rikus.
export const themeEntryShot = () => (MUSIC.find((m) => m.cue === 'thema-in') || {}).shot || null;
export const voicedLines = () => LINES.filter((l) => l.voice === 'nieuw').map((l) => ({ speaker: l.speaker, text: l.text, who: l.who }));
// the lines of a shot as the montage engine wants them: [key, text, delivery]
export const engineLines = (id) => { const s = SEQUENCE.find((x) => x.id === id); return s ? s.lines.map((i) => { const l = lineById(i); return [l.k, l.text, l.tag]; }) : []; };

// Developer messages; empty = fine. Checks the film against the rules that can be checked on data (the rest is for the render and the panel).
export function validateOpening() {
  const out = [];
  const tl = timeline();
  const total = openingDuration();
  if (total < OPENING_RANGE[0] || total > OPENING_RANGE[1]) out.push(`de film duurt ${r1(total)} s, doel ${OPENING_RANGE[0]}-${OPENING_RANGE[1]} s`);
  const ids = new Set();
  let inserts = 0;
  for (const [i, s] of SEQUENCE.entries()) {
    const what = s.id, row = tl[i];
    if (ids.has(s.id)) out.push(`${what}: id twee keer`);
    ids.add(s.id);
    for (const id of s.lines) if (!lineById(id)) out.push(`${what}: onbekende regel ${id}`);
    if (s.type !== 'card') {
      if (!(row.dur / s.cams >= 1.2 && row.dur / s.cams <= 12)) out.push(`${what}: ${r1(row.dur / s.cams)} s per camerastand valt buiten 1,2-12 (R-02)`);
      if (row.lines.length > s.cams * 3) out.push(`${what}: ${row.lines.length} regels op ${s.cams} camerastanden (R-03: hoogstens 3 per stand)`);
      const [lo, hi] = FOV_RANGE[s.type] || [0, 0];
      if (!(s.fov >= lo && s.fov <= hi)) out.push(`${what}: lens ${s.fov} past niet bij ${s.type} (${lo}-${hi}, R-05)`);
    }
    const v = moveSpeed(s);
    if (s.move.kind === 'crane' && v > 0.8) out.push(`${what}: kraan ${r1(v)} m/s is sneller dan 0,8 (R-07)`);
    if ((s.move.kind === 'dolly' || s.move.kind === 'track') && v > 2) out.push(`${what}: dolly ${r1(v)} m/s is sneller dan 2 (R-07)`);
    if (s.insert) inserts++;
  }
  // a shot may hold at most 2 inserts per SCENE (R-09)
  for (const sc of SCENES) { const n = SEQUENCE.filter((s) => s.scene === sc.id && s.insert).length; if (n > 3) out.push(`${sc.id}: ${n} shots met een insert (R-09)`); }
  // establishing shot per scene (R-01) and the grade per scene
  for (const sc of SCENES) { if (!SEQUENCE.some((s) => s.scene === sc.id && s.establishing)) out.push(`${sc.id}: geen establishing shot (R-01)`); if (!GRADES[sc.grade]) out.push(`${sc.id}: onbekende gradering ${sc.grade}`); }
  const timed = SEQUENCE.filter((s) => s.type !== 'card');
  const avg = timed.reduce((a, s) => a + tl[SEQUENCE.indexOf(s)].dur, 0) / timed.reduce((a, s) => a + s.cams, 0);
  if (avg < 2.5 || avg > 7) out.push(`gemiddelde camerastand ${r1(avg)} s (norm 2,5-7, R-02)`);
  if (ACCESS.flashes) out.push('flitsen staan aan: de film gebruikt er geen');
  // lines: a speaker never talks more than 3 turns in a row inside a scene (the camera changes with the speaker), words per line <= 25 (CS-T02)
  const order = SEQUENCE.flatMap((s) => s.lines.map((id) => lineById(id)));
  if (order.length !== LINES.length || order.some((l, i) => l !== LINES[i])) out.push('de regels staan niet in dezelfde volgorde in de reeks en in LINES (of een regel wordt niet gespeeld)');
  let run = 1;
  for (let i = 1; i < order.length; i++) { run = order[i].k === order[i - 1].k && order[i].scene === order[i - 1].scene ? run + 1 : 1; if (run > 3 && order[i].k !== 'V') out.push(`${order[i].speaker} praat ${run} beurten achter elkaar (${order[i].id})`); }
  for (const l of LINES) if (wordsOf(l.text) > 25) out.push(`regel ${l.id}: ${wordsOf(l.text)} woorden (max 25)`);
  // humor and the confession get silence: a punch line or confession is followed by a pause (a gap) or a closing shot
  for (const s of SEQUENCE) s.lines.forEach((id, i) => {
    const l = lineById(id);
    if (l.kind === 'confession' && l.id === 'L27' && !(s.gaps && s.gaps[i + 1] >= 0.5)) out.push('de bekentenis (L27) heeft minder dan 0,5 s stilte erna (R-08)');
  });
  // name cards (R-13): the shot named exists, its person is on stage, one dry line of at most 9 words
  for (const [k, c] of Object.entries(NAME_CARDS)) {
    const s = SEQUENCE.find((x) => x.id === c.shot);
    if (!s || !s.tag || s.tag.who !== k) out.push(`naamkaart ${k}: de shot ${c.shot} noemt hem niet`);
    if (!c.name || !c.line || wordsOf(c.line) > 9) out.push(`naamkaart ${k}: een naam en één droge regel van hoogstens 9 woorden`);
    const first = SEQUENCE.findIndex((x) => x.lines.some((id) => lineById(id).who === (k === 'tessa' ? 'anita' : k) && !lineById(id).channel));
    if (first >= 0 && SEQUENCE.indexOf(s) > first) out.push(`naamkaart ${k} komt na zijn eerste regel`);
  }
  // music cues name a shot in order and a mood
  let last = -1;
  for (const m of MUSIC) { const i = SEQUENCE.findIndex((s) => s.id === m.shot); if (i < 0) out.push(`muziekcue ${m.cue}: onbekende shot ${m.shot}`); else { if (i < last) out.push(`muziekcue ${m.cue} staat niet in volgorde`); last = i; } if (!m.mood || !m.note) out.push(`muziekcue ${m.cue} mist stemming of toelichting`); }
  return out;
}

// The conversation of C00.2 for the director (cutdirector.js directDialogue): used by the cutscene path and the test, not by the montage staging.
export function kitchenDirection() {
  const tl = timeline();
  const ls = [];
  for (const [i, s] of SEQUENCE.entries()) if (s.scene === 'C00.2') for (const row of tl[i].lines) { const l = lineById(row.id); if (!l.channel) ls.push({ speaker: l.who, emotion: l.emotion || 'neutral', kind: l.kind || 'line', at: 0, dur: row.dur, text: l.text, humor: !!l.humor }); }
  let at = 0.5;
  for (const l of ls) { l.at = +at.toFixed(2); at += l.dur + 0.5; }
  return { actors: ['tammo', 'anita'], lines: ls };
}
