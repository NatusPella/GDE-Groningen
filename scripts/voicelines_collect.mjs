// Collects every spoken line the game shows as a speech bubble or subtitle,
// straight from the source tables, and says which voice manifest should hold
// its recording. Shared by voice_coverage.mjs (the check) and tts_lines.py's
// line list (the generator). Node only, no game imports (three.js is a CDN
// import there), so tables are cut out of the source and evaluated.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JELLE, JELLE_LINES, INTROS, FJORD_BUBBLES, FJORD_DUO } from '../game/js/pg_lines.js';
import { STEPS, PARTS } from '../game/js/storyarc.js';

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(REPO, 'game', 'js');
const VL = path.join(REPO, 'game', 'audio', 'voicelines');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');

// Balanced literal ([...] or {...}) starting at the first bracket after `marker`.
function literalAt(text, marker, from = 0) {
  const m = text.indexOf(marker, from);
  if (m < 0) throw new Error(`marker not found: ${marker}`);
  let i = m;
  while (text[i] !== '[' && text[i] !== '{') i++;
  const start = i;
  let depth = 0, q = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') q = c;
    else if (c === '/' && text[i + 1] === '/') i = text.indexOf('\n', i);
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { if (--depth === 0) return { code: text.slice(start, i + 1), end: i + 1 }; }
  }
  throw new Error(`unbalanced literal after ${marker}`);
}
// Identifiers the tables reference (colour constants, helpers) evaluate to an
// inert stand-in; only the strings matter here.
const dummy = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : dummy), apply: () => dummy });
const scope = new Proxy({}, { has: (t, k) => !(k in globalThis), get: (t, k) => (k === Symbol.unscopables ? undefined : dummy) });
const evalLit = (code) => new Function('scope', `with (scope) { return (${code}); }`)(scope);
const lit = (text, marker) => evalLit(literalAt(text, marker).code);
const allLits = (text, marker) => {
  const out = [];
  for (let at = text.indexOf(marker); at >= 0; at = text.indexOf(marker, at + 1)) out.push(evalLit(literalAt(text, marker, at).code));
  return out;
};
const strings = (text, re) => [...text.matchAll(re)].map((m) => evalLit(m[1]));

// Bubble lines are recorded per voice sex; the runtime picks the one that
// matches the speaker's model. `~m|` / `~f|` keys live in the lines manifest.
export const BUBBLE = { m: '~m', f: '~f' };
export const NARRATOR = 'Verteller';

const manifests = {};
export function manifest(name) {
  if (name === 'npc') {
    const dir = path.join(REPO, 'game', 'audio', 'npc');
    return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('_v0.wav')).map((f) => [f.slice(0, -7), true]));
  }
  if (!manifests[name]) {
    const p = path.join(VL, name, 'manifest.json');
    manifests[name] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  }
  return manifests[name];
}

// Every entry: { area, manifest, speakers: [keys that may voice it], text,
// cast } - voiced when ANY of `need` keys is present (need defaults to all
// speakers). cast = casting hint for the generator.
export function collect() {
  const out = [];
  const add = (area, man, speakers, text, cast = {}, need = 'all') => out.push({ area, manifest: man, speakers, text, cast, need });

  // --- story cutscenes (missionstory.js) -> story manifest
  const ms = src('missionstory.js');
  const NPC = lit(ms, 'const NPC = ');
  const STORY = lit(ms, 'const STORY = ');
  const DUO = lit(ms, 'const DUO_BY_STAGE = ');
  // N = the mission's NPC; V = the narrator; another NPC key speaks off camera
  const nm = (k, npc) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k === 'V' ? NARRATOR : k !== 'N' && NPC[k] ? NPC[k].name : NPC[npc].name);
  STORY.forEach((s, i) => {
    for (const kind of ['intro', 'outro', 'fail']) for (const [k, t] of s[kind] || []) add('Missie-cutscenes', 'story', [nm(k, s.npc)], t, { mission: i, kind });
  });
  for (const st of DUO) for (const kind of ['intro', 'outro']) for (const [k, t] of st[kind]) add('Missie-cutscenes', 'story', [nm(k)], t, { kind: 'duo' });
  // missionstory.js falls back to the lines manifest (linevoice.storyLineVoice)
  for (const e of out) e.fallback = 'lines';

  // --- intro montage -> story manifest
  for (const l of allLits(src('intromontage.js'), 'lines: [[')) for (const [, , who, t] of l) add('Intro-montage', 'story', [who], t);

  // --- rondvaart chase -> story manifest
  const rc = src('rondvaartchase.js');
  const SHOUT = lit(rc, 'const SHOUT = ');
  for (const [kind, list] of Object.entries(SHOUT)) for (const t of list) add('Rondvaart-missie', 'story', ['Schipper Wiebe (megafoon)'], t, { kind });
  const rcGuide = [...lit(rc, 'const SIGHTS = ').map((s) => s.line), ...strings(rc, /const WELCOME = ('(?:[^'\\]|\\.)*')/g)];
  for (const t of rcGuide) add('Rondvaart-missie', 'story', ['Tammo (gids)', 'Anita (gids)'], t, { kind: 'guide' });

  // --- bijbaantjes: intros + boss/duo lines -> jobs manifest
  const sv = src('sidejobvoice.js');
  const JOB_LINES = lit(sv, 'export const JOB_LINES = ');
  const DUO_JOB = lit(sv, 'export const DUO_JOB_LINES = ');
  for (const id of ['bezorger', 'taxi', 'bus', 'rondvaart', 'fietsdepot', 'verhuizing']) {
    const s = src(`sidejob_${id}.js`);
    const boss = s.match(/boss: '([^']+)'/)[1];
    for (const t of lit(s, 'intro: ')) add('Bijbaantjes (baas)', 'jobs', [boss], t);
    for (const list of Object.values(JOB_LINES[id])) for (const l of list) add('Bijbaantjes (baas)', 'jobs', [boss], l.t);
  }
  for (const [who, kinds] of Object.entries(DUO_JOB)) for (const list of Object.values(kinds)) for (const l of list) add('Bijbaantjes (Tammo/Anita)', 'jobs', [who], l.t);

  // --- rondvaart bijbaan: the player is the tour guide -> lines manifest
  const rv = src('sidejob_rondvaart.js');
  for (const s of lit(rv, 'const SIGHTS = ')) for (const t of s.lines) add('Rondvaart-bijbaan (gids)', 'lines', ['Tammo', 'Anita'], t, { tag: ['enthousiaste rondvaartgids door een bootspeaker, speels', 'vertellend, trots op de stad', 'grappig, met een knipoog'] });

  // --- mission scenes and fallback intros in missions.js -> lines manifest
  const mi = src('missions.js');
  const npcs = lit(src('missionstory.js'), 'const NPC = ');
  const who = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : npcs[k] ? npcs[k].name : k);
  for (const l of allLits(mi, 'lines: [[')) for (const [k, t] of l) add('Missie-scènes', 'lines', [who(k)], t);
  // Jelle's line as he lands a fierljep (missionstory.js playVaultScene)
  for (const t of strings(mi, /landing: ('(?:[^'\\]|\\.)*')/g)) add('Missie-scènes', 'lines', ['Jelle Terpstra'], t);

  // --- story arc (storyarc.js): the "Wordt vervolgd" cards and what the companion
  // says out loud when an activity step starts (a bubble, in their own voice)
  const sa = src('storyarc.js');
  for (const card of allLits(sa, 'card: [[')) for (const [sp, t] of card) add('Verhaal-kaarten', 'lines', [sp], t);
  for (const m of sa.matchAll(/say: \['([TA])', ('(?:[^'\\]|\\.)*')\]/g)) {
    const anita = m[1] === 'A';
    add('Verhaal-stappen', 'lines', [anita ? BUBBLE.f : BUBBLE.m], evalLit(m[2]), { as: anita ? 'Anita' : 'Tammo' });
  }
  for (const l of allLits(mi, '      intro: [')) for (const t of l) add('Missie-intro (terugval)', 'lines', ['Tammo', 'Anita'], t, { tag: ['samenzweerderig, zacht', 'geamuseerd, zakelijk', 'opgewonden, fluisterend'] });

  // --- how Jelle and the twins reach them (storycontact.js), the "Eerder in GTE VI"
  // recaps and the handover lines (story.js) -> lines manifest
  const CONTACT = { jelle: 'Jelle Terpstra', durk: 'Durk', douwe: 'Douwe', T: 'Tammo', A: 'Anita' };
  for (const st of STEPS) for (const c of st.contact || []) for (const [k, t, o] of c.lines) add('Verhaal-contact (telefoon)', 'lines', [CONTACT[k]], t, o && o.tag ? { tag: o.tag } : {});
  for (const P of Object.values(PARTS)) for (const [, t] of P.recap || []) add('Verhaal-kaarten', 'lines', [NARRATOR], t, { tag: ['warm, vertellend, als een terugblik', 'droog, met een knipoog, samenvattend'] });
  for (const st of STEPS) if (st.why) add('Verhaal-stappen', 'lines', [st.player === 'anita' ? 'Anita' : 'Tammo'], st.why);
  // the trekker-limo pulling up at the museum (missionstory.js playLimoReveal)
  for (const [k, t] of lit(src('missionstory.js'), 'export const LIMO_LINES = ')) add('Missie-cutscenes', 'lines', [nm(k)], t);
  // Jelle on the phone (phone.js jelleTalk)
  const ph = src('phone.js');
  const jt = ph.slice(ph.indexOf('function jelleTalk'), ph.indexOf('function mamTalk'));
  for (const l of allLits(jt, 'line: pick(')) for (const t of l) add('Telefoon (Jelle)', 'lines', ['Jelle Terpstra'], t, { tag: ['charmant, opschepperig, aan de telefoon', 'plagend, aan de telefoon'] });

  // --- other cutscene subtitles (story.js, cinematics.js) -> lines manifest
  for (const m of src('story.js').matchAll(/\{ speaker: '([^']+)', text: ('(?:[^'\\]|\\.)*')/g)) add('Verhaal-kaarten', 'lines', [m[1]], evalLit(m[2]));
  const ci = src('cinematics.js');
  for (const m of ci.matchAll(/lines: \[\{ speaker: '', text: ('(?:[^'\\]|\\.)*')/g)) add('Wijken & landschap (verteller)', 'lines', [NARRATOR], evalLit(m[1]));
  for (const t of Object.values(lit(ci, 'const WIJK_LINES = '))) add('Wijken & landschap (verteller)', 'lines', [NARRATOR], t);
  for (const t of lit(ci, 'const WIJK_GENERIC = ')) add('Wijken & landschap (verteller)', 'lines', [NARRATOR], t);

  // --- speech bubbles -> lines manifest (~m / ~f), npc phrases have their own audio
  const both = [BUBBLE.m, BUBBLE.f];
  const bubble = (area, list, cast, speakers = both) => { for (const t of new Set(list)) add(area, 'lines', speakers, t, cast, 'any'); };
  const pe = src('pedestrians.js');
  // the ambient Gronings phrases play game/audio/npc/phrase_<i>_v*.wav (audio.js)
  lit(pe, 'const GRONINGS_PHRASES = ').forEach((t, i) => add('Voetgangers (praatjes)', 'npc', [`phrase_${i}`], t));
  bubble('Voetgangers', lit(pe, 'const SCREAMS = '), { tag: ['in paniek, gillend', 'doodsbang, schreeuwend'] });
  bubble('Voetgangers', lit(pe, 'const HURT_LINES = '), { tag: ['die pijn heeft en boos is', 'kermend, woedend'] });
  bubble('Voetgangers', [...lit(pe, 'const BUMP_LINES = '), ...lit(pe, 'const CAR_BUMP_LINES = ')], { tag: ['die boos is, snauwend', 'geïrriteerd, mopperend', 'verontwaardigd, luid'] });
  bubble('Voetgangers', [...lit(pe, 'const THEFT_LINES = '), ...lit(pe, 'const BIKE_THEFT_LINES = ')], { tag: ['woedend, schreeuwend', 'verontwaardigd, achter iemand aan roepend'] });
  bubble('Voetgangers', lit(pe, 'const FILM_LINES = '), { tag: ['lacherig, opgewonden', 'giechelend, filmend met de telefoon'] });
  bubble('Voetgangers', Object.values(lit(pe, 'const CALL_LINES = ')), { tag: ['aan de telefoon, buiten adem en bang', 'gehaast, fluisterend in de telefoon'] });
  bubble('Voetgangers', ['Ze komen der aan!'], { tag: 'opgelucht, wijzend' });
  bubble('Voetgangers', lit(pe, 'const GREET_LINES = '), { tag: ['vrolijk, zwaaiend', 'hartelijk, roepend over het water'] });
  bubble('Politie', lit(pe, 'const COP_LINES = '), { who: 'agent', tag: ['streng, bevelend, schreeuwend', 'gehaast, autoritair'] }, [BUBBLE.m]);
  const mm = src('missions.js');
  bubble('Missie-figuranten', lit(mm, 'const DRUNK_LINES = '), { tag: ['dronken, lallend en vrolijk', 'aangeschoten, zingerig', 'dronken, sentimenteel'] });
  bubble('Missie-figuranten', lit(mm, 'const CHARGE_LINES = '), { tag: ['dronken, overenthousiast, schreeuwend', 'lallend, uitgelaten'] });
  const cp = src('cityprops.js');
  bubble('Straatfiguren', lit(cp, 'const VENDOR_LINES = '), { who: 'marktkoopman', tag: ['luid roepend, joviaal', 'opgewekt, aanprijzend'] });
  bubble('Straatfiguren', ['Alweer n fiets uut t Diep, joh!'], { tag: 'vermoeid, zuchtend' });
  const se = src('seating3d.js');
  bubble('Water (boten & zwemmers)', lit(se, 'const GREET_LINES = '), { tag: ['vrolijk, roepend over het water', 'lacherig, zwaaiend'] });
  bubble('Water (boten & zwemmers)', lit(se, 'const GREET_FAST = '), { tag: ['die boos is, roepend over het water', 'geschrokken, mopperend'] });
  const sw = src('swimmers3d.js');
  bubble('Water (boten & zwemmers)', lit(sw, 'const HELLO = '), { tag: ['vrolijk, spetterend in het water', 'uitgelaten, lacherig'] });
  bubble('Water (boten & zwemmers)', lit(sw, 'const CAREFUL = '), { tag: ['geschrokken, boos', 'proestend, geïrriteerd'] });
  const pm = src('pigeonmode.js');
  bubble('Duivenmodus', lit(pm, 'const PED_LINES = '), { tag: ['vol walging, verontwaardigd', 'geschrokken, jammerend', 'berustend, droog'] });
  bubble('Duivenmodus', lit(pm, 'const COP_LINES = '), { who: 'agent', tag: ['beledigd, verontwaardigd', 'woedend, pompeus'] }, [BUBBLE.m]);
  bubble('Duivenmodus', lit(pm, 'const FOOD_LINES = '), { tag: ['woedend, schreeuwend', 'die boos is, jammerend'] });
  bubble('Duivenmodus', lit(pm, 'const COO_LINES = '), { tag: ['geamuseerd, koerend', 'lacherig, vertederd'] });
  const tx = src('sidejob_taxi.js');
  bubble('Bijbaantjes (klanten)', strings(tx, /hail: ('(?:[^'\\]|\\.)*')/g), { tag: ['zwaaiend naar een taxi, luid roepend', 'gehaast, roepend'] });
  bubble('Bijbaantjes (klanten)', strings(tx, /done: ('(?:[^'\\]|\\.)*')/g), { tag: ['dankbaar, kletserig', 'lacherig, tevreden'] });
  const fd = src('sidejob_fietsdepot.js');
  bubble('Bijbaantjes (klanten)', lit(fd, 'const PROTEST_LINES = '), { who: 'student', tag: ['protesterend, overstuur', 'verontwaardigd, smekend'] });
  bubble('Bijbaantjes (klanten)', [...lit(fd, 'const WIN_LINES = '), 'En blijf van mijn fiets af, hè!'], { who: 'student', tag: ['triomfantelijk, brutaal', 'lacherig, uitdagend'] });
  const vh = src('sidejob_verhuizing.js');
  bubble('Bijbaantjes (klanten)', lit(vh, 'const STUDENTS = ').map((s) => s.hello), { who: 'student', tag: ['enthousiast, kletserig', 'opgewonden, snel pratend'] });
  bubble('Bijbaantjes (klanten)', lit(vh, 'const THANKS = '), { who: 'student', tag: ['blij, dankbaar', 'lacherig, opgelucht'] });
  bubble('Bijbaantjes (klanten)', lit(vh, 'const BROKEN = '), { who: 'student', tag: ['ongemakkelijk, nerveus lachend', 'schuldbewust, zacht'] });
  bubble('Bijbaantjes (klanten)', ['Daar is mijn busje! Voorzichtig, hè!', 'Ik fiets er wel achteraan!'], { who: 'student', tag: ['opgewekt, roepend', 'vrolijk, gehaast'] });
  const bz = src('sidejob_bezorger.js');
  bubble('Bijbaantjes (klanten)', lit(bz, 'const COOK_LINES = '), { who: 'snackbarkok', tag: ['gehaast, zakelijk', 'druk, mopperend'] });
  bubble('Bijbaantjes (klanten)', lit(bz, 'const WARM_LINES = '), { tag: ['tevreden, vrolijk', 'lacherig, blij'] });
  bubble('Bijbaantjes (klanten)', lit(bz, 'const LUKE_LINES = '), { tag: ['teleurgesteld, mopperend', 'zuchtend, berustend'] });
  const bs = src('sidejob_bus.js');
  for (const l of allLits(bs, 'say(world, ped, pick(')) bubble('Bijbaantjes (klanten)', l, { tag: l.includes('Mijn koffie!') ? ['klagend, chagrijnig', 'die boos is, mopperend'] : ['vriendelijk, dankbaar', 'opgewekt'] });

  // --- world flavour (flavourlines.js): barks as bubbles, radio/GPS/cows as lines
  const fl = src('flavourlines.js');
  for (const list of Object.values(lit(fl, 'export const NICKNAME_BARKS = '))) bubble('Wereld (bijnamen & koeien)', list, { tag: ['droog, trots op de stad', 'laconiek, wijzend', 'vertellend, met een knipoog'] });
  for (const t of lit(fl, 'export const BIJNA_THUIS = ')) {
    add('Wereld (bijnamen & koeien)', 'lines', [BUBBLE.m], t, { as: 'Tammo' });
    add('Wereld (bijnamen & koeien)', 'lines', [BUBBLE.f], t, { as: 'Anita' });
  }
  for (const t of lit(fl, 'export const KROLBRUG_FAULTS = ')) add('Wereld (radio & navigatie)', 'lines', ['Verkeersinformatie'], t);
  for (const t of lit(fl, 'export const RING_ZUID_GPS = ')) add('Wereld (radio & navigatie)', 'lines', ['Navigatie'], t);
  for (const t of lit(fl, 'export const NACHTSTREEK = ')) add('Wereld (radio & navigatie)', 'lines', ['Radio Nachtstreek'], t);
  for (const list of Object.values(lit(fl, 'export const COW_FEED = '))) for (const [cow, t] of list) add('Wereld (bijnamen & koeien)', 'lines', ['Koe ' + cow], t);
  bubble('Wereld (straat)', lit(fl, 'export const KON_MINDER = '), { tag: ['droog, stiekem onder de indruk', 'laconiek, knikkend'] });
  for (const ev of Object.values(lit(fl, 'export const EVENT_DAYS = '))) bubble('Wereld (straat)', ev.barks, { tag: ['vrolijk, kletserig', 'opgewekt, lacherig', 'stellig, vertellend'] });
  bubble('Wereld (straat)', lit(fl, 'export const PLANTSOEN_BARKS = '), { tag: ['vrolijk, zonnig', 'lacherig, uitgelaten'] });
  bubble('Wereld (straat)', lit(fl, 'export const PEERD_BARKS = '), { tag: ['verbaasd, fronsend', 'droog, argwanend'] });
  bubble('Wereld (straat)', lit(fl, 'export const SUPPORTER_CHANTS = '), { tag: ['zingend, spreekkoor op de tribune', 'scanderend, luid en trots'] });
  // --- post-game (postgame.js, pg_lines.js): Jelle's challenges and the Fjord Frituur -> lines manifest
  const JTAG = {
    greet: 'joviaal, uitdagend', go: 'luid roepend, als een startschot', lead: 'opschepperig, plagend', behind: 'verbaasd, licht in paniek',
    win: 'sportief, een beetje beschaamd', lose: 'triomfantelijk, jolig', jump: 'strijdlustig, roepend', splash: 'proestend, verontwaardigd',
    mark: 'zelfvoldaan, grinnikend', good: 'onder de indruk, verbaasd', wet: 'lachend, plagend',
  };
  for (const t of JELLE_LINES.greet) add('Na het verhaal (Jelle)', 'lines', [JELLE], t, { tag: JTAG.greet });
  for (const [id, kinds] of Object.entries(JELLE_LINES)) {
    if (id === 'greet') continue;
    for (const [kind, list] of Object.entries(kinds)) for (const t of list) add('Na het verhaal (Jelle)', 'lines', [JELLE], t, { tag: JTAG[kind] });
  }
  const pgWho = { J: JELLE, T: 'Tammo', A: 'Anita' };
  for (const lines of Object.values(INTROS)) for (const [k, t] of lines) add('Na het verhaal (intro)', 'lines', [pgWho[k]], t, k === 'J' ? { tag: 'uitdagend, charmant' } : {});
  const DTAG = { open: 'enthousiast, druk', rush: 'gehaast, opgewonden', good: 'tevreden, trots', bad: 'zuchtend, berustend' };
  for (const [kind, by] of Object.entries(FJORD_DUO)) for (const [k, list] of Object.entries(by)) for (const t of list) add('Na het verhaal (Fjord Frituur)', 'lines', [pgWho[k]], t, { tag: DTAG[kind] });
  const BTAG = { greet: ['hongerig, vrolijk', 'ongeduldig, joviaal'], happy: ['tevreden, blij', 'smakkend, vrolijk'], wrong: ['verontwaardigd, mopperend', 'die boos is, klagend'], leave: ['chagrijnig, zuchtend', 'ongeduldig, mopperend'] };
  for (const [kind, list] of Object.entries(FJORD_BUBBLES)) bubble('Na het verhaal (Fjord-klanten)', list, { tag: BTAG[kind] });

  return out;
}

const hasKey = (e, s) => {
  const k = e.manifest === 'npc' ? s : s + '|' + e.text;
  return !!(manifest(e.manifest)[k] || (e.fallback && manifest(e.fallback)[k]));
};
export const isVoiced = (e) => (e.need === 'any' ? e.speakers.some((s) => hasKey(e, s)) : e.speakers.every((s) => hasKey(e, s)));
export const missingKeys = (e) => e.speakers.filter((s) => !hasKey(e, s));
