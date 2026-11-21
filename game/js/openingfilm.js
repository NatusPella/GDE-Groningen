// The opening of a fresh game as FILM DATA (docs/verhaal/OPENING-FILMSCRIPT-21-11.md is the script, this is its machine form).
// Pure data plus validators (no THREE, no DOM): scripts/openingfilm_test.mjs judges the shot list against the direction rules
// (scripts/release/cutscene-regels.json, R-01..R-30) and the opening protocol (a viewer with ZERO context: two names, one theme,
// one hint of the opponent, 60-120 s). intromontage.js reads the title card and the cue lists from here; the staging of the shots
// themselves stays in intromontage.js until the coordinator has seen the film (docs/OPENING-TRAILER-BENCHMARK-VERIFICATIE-21-11.md).
//
// Scene ids follow the story script (docs/verhaal/nieuw/09-script-akte1.md): C00.1 cold open, C00.2 the kitchen, C00.3 moving day.
// A shot: { id, t (s from the start of the film), dur, type, fov, move: { kind, dist (m) }, at (place), cam (why this camera), ... }
//   type: wide | medium | close | insert | beauty | card (card = title or black)   kind: static | dolly | crane | orbit | track
// Lines: { id, who (speaker key as in speakers.js), text, at (s), dur, channel?, voice: 'behouden'|'nieuw', kind, emotion, humor? }.

export const OPENING_ID = 'C00';
export const OPENING_RANGE = [60, 120]; // s: the opening sets the pair, the tone and the theme in a minute to two
export const TITLE = { kicker: 'GDE Groningen', title: 'Zomer vol misdaad', tagline: 'Ontdek jezelf in Grunn.', sub: 'Twee afgestudeerden. Eén zomer. Nog geen plan.' };

// Samen spelen (AGENTS.md, multiplayer bij ontwerp): the opening is LOCAL and the same for everybody: a voiced two-hander in which
// both of them are on screen, so it needs no 'who is the protagonist' fork. Every player sees it in his own game (a guest who joins a
// running session sees it when his own profile starts fresh), skipping is per player and never stops anyone else, the host has no
// say (nothing is gated on it). Only the END differs: the swoop lands on the local protagonist (Tammo or Tessa, per player).
export const MULTIPLAYER = { mode: 'local', identical: true, skipPerPlayer: true, gatesOthers: false, endsOnLocalProtagonist: true };

// Accessibility (AGENTS.md, DESIGN_SYSTEM): no flashes (a cut is a cut, never a white frame), reduced motion swaps the title card's
// zoom and letter-spacing for a plain fade, subtitles are always on in the opening (the film must work muted), skipping is a hold.
export const ACCESS = { flashes: false, reducedMotionCard: 'fade', subtitlesAlways: true, skip: { key: 'SPATIE', holdS: 0.9 } };

export const skipHint = () => ({ key: ACCESS.skip.key, text: `Houd {${ACCESS.skip.key}} ingedrukt om over te slaan` });

// The grade (colour mood) and the clock per scene: the day has a rhythm, gold at dawn, soft light in the room, clear at noon.
export const GRADES = {
  'gouden-uur': { clock: [6.2, 6.5], weather: 'mist', note: 'laag gouden licht, koele schaduwen, vlak na de zonsopgang' },
  'kamer-ochtend': { clock: [7.4, 7.5], weather: 'helder', note: 'zacht daglicht door het zolderraam, warme tafel, koele rest' },
  'dag-helder': { clock: [13.6, 14.2], weather: 'helder', note: 'heldere middag, harde schaduwen, kleuren vol' },
};

export const SCENES = [
  { id: 'C00.1', slug: 'EXT. GRUNN, VAN D’OLLE GRIEZE NAAR DE OOSTERPARKWIJK – ZONSOPGANG', grade: 'gouden-uur', place: 'Martinikerkhof / Oosterparkwijk', beat: 'Grunn is mooi en grappig; twee mensen op een stoep; hij heeft duiven' },
  { id: 'C00.2', slug: 'INT. ZOLDERKEUKEN, OOSTERPARKWIJK – OCHTEND', grade: 'kamer-ochtend', place: 'Oosterparkwijk, zolder', beat: 'ze zijn bang elkaar kwijt te raken en zoeken één plek samen; er loopt een Fries rond' },
  { id: 'C00.3', slug: 'EXT. PADDEPOEL, PLEIADENLAAN – MIDDAG', grade: 'dag-helder', place: 'Paddepoel, House of Groningen', beat: 'de verhuizing; rijden, niet praten; titelkaart' },
];

const S = (id, scene, t, dur, type, fov, move, extra = {}) => ({ id, scene, t, dur, type, fov, move, ...extra });
const ST = { kind: 'static', dist: 0 };

// Shot types and their lens (R-05): wide 46-54, medium 36-44, close 20-32. Camera height is eye level (1.55-1.65 m) unless `why` says otherwise (R-06).
export const FOV_RANGE = { wide: [46, 54], beauty: [46, 54], medium: [36, 44], close: [20, 32], insert: [20, 32] };

// 1 000 shots of one rhythm would bore: the cold open is short and varied (4-5 s beauty, a 2 s joke), the kitchen is a conversation (the
// director, game/js/cutdirector.js, cuts shot/reverse-shot and close-ups from the line list below; its output is checked in the test),
// moving day is a slow breath and a swoop. Times are seconds from the start of the film.
export const SHOTS = [
  // --- C00.1: cold open (0 - 24.8 s) ---------------------------------------------------------------
  S('c1-zwart', 'C00.1', 0, 3.0, 'card', null, ST, { black: true, cue: 'radio-open', note: 'zwart; meeuwen, een fietsbel, dan Rikus' }),
  S('c1-markt', 'C00.1', 3.0, 5.0, 'wide', 50, { kind: 'crane', dist: 3.5 }, { at: 'Martinitoren', establishing: true, cam: 'langzame kraan omhoog langs de toren, de zon komt door', cue: 'thema-in' }),
  S('c1-fietsen', 'C00.1', 8.0, 4.0, 'beauty', 46, { kind: 'track', dist: 6 }, { at: 'Grote Markt', why: 'low', cam: 'laag naast de fietsers, de straat stroomt voorbij' }),
  S('c1-meeuw', 'C00.1', 12.0, 2.2, 'beauty', 48, ST, { at: 'Grote Markt', humor: true, cam: 'een meeuw pakt een frikandel van een terras; stilte erna', sfx: 'meeuw-frikandel' }),
  S('c1-duiven', 'C00.1', 14.2, 4.2, 'wide', 48, { kind: 'track', dist: 5 }, { at: 'Oosterparkwijk, Korenbloemstraat', cam: 'zij-aanzicht: Tammo loopt met twee bekers koffie, een zwerm duiven volgt op een respectabele afstand', card: 'name:tammo', sfx: 'duivenvleugels' }),
  S('c1-schouder', 'C00.1', 18.4, 3.0, 'medium', 40, ST, { at: 'Oosterparkwijk, Korenbloemstraat', cam: 'een duif landt op zijn schouder; hij kijkt er niet naar, de koffie wel', sfx: 'koffie-morsen' }),
  S('c1-deur', 'C00.1', 21.4, 3.4, 'medium', 38, { kind: 'dolly', dist: 3 }, { at: 'Oosterparkwijk, voordeur', cam: 'achter hem aan het trappenhuis in, omhoog naar het zolderraam', cue: 'thema-zacht' }),
  // --- C00.2: the kitchen (24.8 - 77.8 s) ----------------------------------------------------------
  S('c2-gevel', 'C00.2', 24.8, 3.2, 'wide', 50, { kind: 'crane', dist: 2 }, { at: 'Oosterparkwijk, zolder', establishing: true, cam: 'van de gevel naar het zolderraam, binnen zit iemand' }),
  S('c2-twee', 'C00.2', 28.0, 4.2, 'medium', 40, { kind: 'dolly', dist: 1.5 }, { at: 'Zolderkeuken', cam: 'tweeshot: Tessa aan tafel, Tammo komt binnen', card: 'name:tessa', cue: 'thema-onder' }),
  // 32.2 - 70.0: the conversation, directed from DIALOGUE (game/js/cutdirector.js): shot/reverse-shot, close-up on the confession, a reaction after the punch line
  S('c2-contract', 'C00.2', 62.4, 2.0, 'insert', 28, ST, { at: 'Zolderkeuken', prop: 'huurcontract', insert: true, cam: 'insert: het huurcontract schuift over de tafel' }),
  S('c2-raam', 'C00.2', 66.0, 5.0, 'wide', 46, { kind: 'dolly', dist: 3 }, { at: 'Oosterparkwijk, kiosk', insert: false, cam: 'door het raam: aan de overkant plakt een man in een blauw colbert, van achteren, een stikker VERKOCHT op het frietkot; een duif op de vensterbank kijkt mee', cue: 'jelle-hint', sfx: 'stikker' }),
  // --- C00.3: moving day and the title (77.8 - 101.4 s) --------------------------------------------
  S('c3-toren', 'C00.3', 71.0, 4.0, 'wide', 50, { kind: 'dolly', dist: 6 }, { at: 'Pleiadenlaan', establishing: true, cam: 'de woontoren, voor de deur een Escapade met een matras op het dak' }),
  S('c3-twee', 'C00.3', 75.0, 6.2, 'medium', 40, ST, { at: 'Pleiadenlaan', cam: 'tweeshot bij de auto; ze praten tegen elkaar, niet tegen de camera' }),
  S('c3-band', 'C00.3', 81.2, 2.2, 'close', 28, ST, { at: 'Pleiadenlaan', cam: 'close: de lekke band, een zucht lucht', sfx: 'band-sissen' }),
  S('c3-zweef', 'C00.3', 83.4, 4.6, 'wide', 50, { kind: 'crane', dist: 3.6 }, { at: 'Paddepoel', cam: 'de zweefvlucht naar de spawn van de speler (flyShot)', cue: 'thema-groot', lower: 'Welkom in Grunn' }),
  S('c3-titel', 'C00.3', 88.0, 4.4, 'card', null, ST, { black: true, card: 'titel', cue: 'titel-sting' }),
];

// The conversation of C00.2: the director gets these lines (emotion, kind) and decides the shots. `voice: 'behouden'` = a recording exists
// (scripts/voice_wacht.json is for the rest). `humor` only gives the line room and the label humor-review; the text is never touched.
export const LINES = [
  { id: 'L00', who: 'rikus', speaker: 'Rikus', channel: 'radio', text: 'Augustus. In Grunn heet dat zomer.', at: 0.9, dur: 3.1, voice: 'behouden', scene: 'C00.1' },
  { id: 'L01', who: 'tammo', speaker: 'Tammo', text: 'Moi. De bank?', at: 33.6, dur: 1.4, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'question' },
  { id: 'L02', who: 'anita', speaker: 'Tessa', text: '“Uw plan is sympathiek.” Dat betekent nee, met een strikje.', at: 35.6, dur: 3.6, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'punch', humor: true },
  { id: 'L03', who: 'anita', speaker: 'Tessa', text: 'Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto.', at: 40.0, dur: 4.4, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'line' },
  { id: 'L04', who: 'tammo', speaker: 'Tammo', text: 'Ik wel. De Escapade.', at: 45.2, dur: 1.6, voice: 'behouden', scene: 'C00.2', emotion: 'joy', kind: 'line' },
  { id: 'L05', who: 'anita', speaker: 'Tessa', text: 'Die rijdt nauwelijks.', at: 47.6, dur: 1.4, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'line' },
  { id: 'L06', who: 'tammo', speaker: 'Tammo', text: 'Dan rijdt hij nauwelijks voor jou.', at: 49.4, dur: 2.0, voice: 'nieuw', scene: 'C00.2', emotion: 'tender', kind: 'line' },
  { id: 'L07', who: 'anita', speaker: 'Tessa', text: 'Vierentwintig, afgestudeerd, samen nul banen.', at: 52.0, dur: 2.8, voice: 'nieuw', scene: 'C00.2', emotion: 'neutral', kind: 'line' },
  { id: 'L08', who: 'anita', speaker: 'Tessa', text: 'Na de studie gaat iedereen ergens anders heen. Wij niet.', at: 55.4, dur: 3.4, voice: 'nieuw', scene: 'C00.2', emotion: 'tender', kind: 'promise' },
  { id: 'L09', who: 'anita', speaker: 'Tessa', text: 'Alleen kan ik de huur niet betalen. Jij ook niet. Samen net.', at: 59.2, dur: 3.6, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'line' },
  { id: 'L10', who: 'tammo', speaker: 'Tammo', text: '…Samen.', at: 63.4, dur: 1.4, voice: 'behouden', scene: 'C00.2', emotion: 'tender', kind: 'confession' },
  { id: 'L11', who: 'anita', speaker: 'Tessa', text: 'Als huisgenoten, Tammo. Teken nou maar.', at: 65.6, dur: 2.6, voice: 'behouden', scene: 'C00.2', emotion: 'neutral', kind: 'punch', humor: true },
  { id: 'L12', who: 'rikus', speaker: 'Rikus', channel: 'radio', text: 'Een luisteraar meldt een Fries in een blauw colbert die Grunn aan het opkopen is. Ik zeg niks.', at: 69.0, dur: 5.0, voice: 'nieuw', scene: 'C00.2' },
  { id: 'L13', who: 'tammo', speaker: 'Tammo', text: 'Elf hoog. Met een lift. Ik voel me rijk.', at: 75.4, dur: 2.8, voice: 'behouden', scene: 'C00.3', emotion: 'joy', kind: 'line' },
  { id: 'L14', who: 'anita', speaker: 'Tessa', text: 'Je bent niet rijk, Tammo. Je bent huisgenoot.', at: 78.4, dur: 2.6, voice: 'behouden', scene: 'C00.3', emotion: 'neutral', kind: 'punch', humor: true },
  { id: 'L15', who: 'anita', speaker: 'Tessa', text: 'Rijden, niet praten.', at: 81.8, dur: 1.4, voice: 'behouden', scene: 'C00.3', emotion: 'neutral', kind: 'line' },
];

// Name cards (R-13): the first appearance of each person, with ONE dry line. Rikus is a voice on the radio and Jelle a silhouette: no card.
export const NAME_CARDS = {
  tammo: { name: 'TAMMO', line: 'Kent elke auto. De duiven kennen hem.', at: 15.0, dur: 3.0 },
  tessa: { name: 'TESSA', line: 'Zegt wat ze denkt. Meestal twee keer.', at: 28.8, dur: 3.0 },
};

// Music and sound cues for a later music round: mood and timing per shot. The existing theme (theme.js, 111 bpm) carries it until then.
export const MUSIC = [
  { at: 0, cue: 'radio-open', mood: 'stilte met straatgeluid', note: 'geen muziek; meeuwen, fietsbel, Rikus' },
  { at: 3.0, cue: 'thema-in', mood: 'zonsopgang, warm, hoopvol', note: 'het thema valt in op de eerste kraanbeweging, een bar lang opbouwend' },
  { at: 12.0, cue: 'sting-meeuw', mood: 'komisch, korte pizzicato-stoot', note: 'ritme gaat even uit voor de grap (R-08)' },
  { at: 21.4, cue: 'thema-zacht', mood: 'huiselijk', note: 'het thema zakt een octaaf, het trappenhuis in' },
  { at: 28.0, cue: 'thema-onder', mood: 'gesprek', note: 'de muziek ducket onder elke stem (theme.js setThemeDuck); alleen een kamertoon-gitaar' },
  { at: 63.4, cue: 'stilte-bekentenis', mood: 'stil', note: 'één halve seconde stilte op “…Samen.” (R-08), dan een zachte duif op het raam' },
  { at: 66.0, cue: 'jelle-hint', mood: 'dreigend maar luchtig', note: 'twee diepe noten (tuba) als de stikker VERKOCHT wordt geplakt; niets meer' },
  { at: 83.4, cue: 'thema-groot', mood: 'ruim, vrolijk, vertrek', note: 'het thema volledig op de zweefvlucht' },
  { at: 88.0, cue: 'titel-sting', mood: 'afsluiter', note: 'de titel valt op de beat; een klokje' },
];

export const END_AT = 92.4; // s: the title card is gone, the game starts
export const DUR = END_AT;

// --- helpers and validators --------------------------------------------------------------------------

export const openingDuration = () => DUR;
export const linesOf = (scene = null) => LINES.filter((l) => !scene || l.scene === scene);
export const voicedLines = () => LINES.filter((l) => l.voice === 'nieuw').map((l) => ({ speaker: l.speaker, text: l.text, who: l.who }));
export const wordsOf = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
export const moveSpeed = (s) => (s.dur > 0 ? s.move.dist / s.dur : 0);
const r1 = (n) => Math.round(n * 10) / 10;

// Developer messages; empty = fine. Checks the film against the rules that can be checked on data (the rest is for the render and the panel).
export function validateOpening() {
  const out = [];
  const near = (a, b) => Math.abs(a - b) < 0.06;
  // continuity: shots do not overlap except where the dialogue is directed (62.4-71 is inserts + the window; 32.2-62.4 belongs to the director)
  const sorted = SHOTS.slice().sort((a, b) => a.t - b.t);
  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const end = sorted[i - 1].t + sorted[i - 1].dur;
    if (sorted[i].t - end > 0.06) gaps.push([r1(end), r1(sorted[i].t)]);
    else if (end - sorted[i].t > 0.06) out.push(`${sorted[i - 1].id} loopt ${r1(end - sorted[i].t)} s in ${sorted[i].id}`);
  }
  // the only legal gaps are the directed stretches
  for (const [a, b] of gaps) if (!(near(a, 32.2) && near(b, 62.4)) && !(near(a, 64.4) && near(b, 66.0))) out.push(`gat in de film van ${a} tot ${b} s zonder regie`);
  const total = sorted[sorted.length - 1].t + sorted[sorted.length - 1].dur;
  if (total < OPENING_RANGE[0] || total > OPENING_RANGE[1]) out.push(`de film duurt ${r1(total)} s, doel ${OPENING_RANGE[0]}-${OPENING_RANGE[1]} s`);
  if (!near(total, END_AT) && total - END_AT > 0.06) out.push(`END_AT ${END_AT} komt niet overeen met de laatste shot (${r1(total)})`);
  let inserts = 0;
  for (const s of SHOTS) {
    const what = `${s.id}`;
    if (s.type !== 'card' && !(s.dur >= 1 && s.dur <= 15)) out.push(`${what}: ${s.dur} s valt buiten 1-15 (R-02)`);
    if (s.type !== 'card') {
      const [lo, hi] = FOV_RANGE[s.type] || [0, 0];
      if (!(s.fov >= lo && s.fov <= hi)) out.push(`${what}: lens ${s.fov} past niet bij ${s.type} (${lo}-${hi}, R-05)`);
    }
    const v = moveSpeed(s);
    if (s.move.kind === 'crane' && v > 0.8) out.push(`${what}: kraan ${r1(v)} m/s is sneller dan 0,8 (R-07)`);
    if ((s.move.kind === 'dolly' || s.move.kind === 'track') && v > 2) out.push(`${what}: dolly ${r1(v)} m/s is sneller dan 2 (R-07)`);
    if (s.insert) { inserts++; if (!(s.dur >= 1 && s.dur <= 3)) out.push(`${what}: een insert duurt 1-3 s (R-09)`); }
  }
  if (inserts > 2) out.push(`${inserts} inserts in de scène (max 2, R-09)`);
  // establishing shot per scene (R-01)
  for (const sc of SCENES) if (!SHOTS.some((s) => s.scene === sc.id && s.establishing)) out.push(`${sc.id}: geen establishing shot (R-01)`);
  for (const sc of SCENES) if (!GRADES[sc.grade]) out.push(`${sc.id}: onbekende gradering ${sc.grade}`);
  // average shot length of the shot-driven parts: 2-7 s (R-02), and no flashes
  const timed = SHOTS.filter((s) => s.type !== 'card');
  const avg = timed.reduce((a, s) => a + s.dur, 0) / timed.length;
  if (avg < 2.5 || avg > 7) out.push(`gemiddelde shot ${r1(avg)} s (norm 2,5-7)`);
  if (ACCESS.flashes) out.push('flitsen staan aan: de opening gebruikt er geen');
  // lines: inside the film, never overlapping in time, subtitles readable (R-11: <= 18 words a line; the reading speed is judged by the linter's checkText in the test)
  for (let i = 0; i < LINES.length; i++) {
    const l = LINES[i];
    const what = `regel ${l.id}`;
    if (l.at < 0 || l.at + l.dur > total + 0.01) out.push(`${what}: valt buiten de film`);
    if (wordsOf(l.text) > 18) out.push(`${what}: ${wordsOf(l.text)} woorden (max 18, R-11)`);
    if (i > 0 && l.at < LINES[i - 1].at + LINES[i - 1].dur - 0.05) out.push(`${what}: begint voor ${LINES[i - 1].id} klaar is`);
    if (l.humor || l.kind === 'punch') {
      const next = LINES[i + 1];
      if (next && next.at - (l.at + l.dur) < 0.2 && next.scene === l.scene && next.speaker !== l.speaker) out.push(`${what}: geen stilte na de grap (R-08)`);
    }
  }
  // the confession gets silence and a reaction: L10 is followed by >= 0.5 s
  const conf = LINES.find((l) => l.kind === 'confession');
  const after = conf && LINES[LINES.indexOf(conf) + 1];
  if (conf && after && after.at - (conf.at + conf.dur) < 0.5) out.push('de bekentenis heeft minder dan 0,5 s stilte (R-08)');
  // name cards (R-13): everyone who is seen speaking has one before the first line, with one dry line
  for (const [k, c] of Object.entries(NAME_CARDS)) {
    if (!c.name || !c.line || wordsOf(c.line) > 9) out.push(`naamkaart ${k}: een naam en één droge regel van hoogstens 9 woorden`);
    const first = LINES.find((l) => l.who === (k === 'tessa' ? 'anita' : k) && !l.channel);
    if (first && c.at > first.at) out.push(`naamkaart ${k} komt na zijn eerste regel`);
  }
  // music cues rise in time and name a mood
  for (let i = 1; i < MUSIC.length; i++) if (MUSIC[i].at <= MUSIC[i - 1].at) out.push(`muziekcue ${MUSIC[i].cue} staat niet na ${MUSIC[i - 1].cue}`);
  for (const m of MUSIC) if (!m.mood || !m.note) out.push(`muziekcue ${m.cue} mist stemming of toelichting`);
  return out;
}

// The conversation for the director (cutdirector.js directDialogue): the kitchen lines with their emotion and kind.
export function kitchenDirection() {
  return { actors: ['tammo', 'anita'], lines: LINES.filter((l) => l.scene === 'C00.2' && !l.channel).map((l) => ({ speaker: l.who, emotion: l.emotion, kind: l.kind, at: +(l.at - 32.2).toFixed(2), dur: l.dur, text: l.text, humor: !!l.humor })) };
}
