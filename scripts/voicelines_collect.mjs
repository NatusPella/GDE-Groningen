// Collects every spoken line the game shows as a speech bubble or subtitle,
// straight from the source tables, and says which voice manifest should hold
// its recording. Shared by voice_coverage.mjs (the check) and tts_lines.py's
// line list (the generator). Node only, no game imports (three.js is a CDN
// import there), so tables are cut out of the source and evaluated.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { withEllipsisAliases } from '../game/js/voicebank.js';
import { JELLE, JELLE_LINES, INTROS, FJORD_BUBBLES, FJORD_DUO } from '../game/js/pg_lines.js';
import { CARD_LINES, COMPANION_CARDS } from '../game/js/cardlines.js';
import { STEPS, PARTS, SPEAKERS } from '../game/js/storyarc.js';
import { SMS_SAY, smsSpeaker, smsSpoken, cardSpoken } from '../game/js/smsvoice.js';
import { TOUR_WELCOME, TOUR_STOPS, TOURIST_REACT, RV_SCENES } from '../game/js/rondvaartlines.js';
import { DUO as OM_DUO, WORLD_ENDS, WORLD_END_FINAL, VILLAGES, KOE_LINES, KOE_WHO, KOE_CALL } from '../game/js/ommelandlines.js';

// The tourists on the rondvaartboot: one fixed voice each (tts_lines_list.mjs).
export const TOURISTS = {
  D: { female: true, voice: 'Erinome', who: 'Duitse toeriste op een rondvaartboot', accent: 'spoken in German, a cheerful German tourist' },
  E: { female: false, voice: 'Sadachbia', who: 'Engelse toerist op een rondvaartboot', accent: 'spoken in British English, a friendly English tourist' },
  R: { female: true, voice: 'Laomedeia', who: 'toeriste uit de Randstad op een rondvaartboot', accent: 'spoken in standard Dutch with an Amsterdam accent' },
};

export const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(REPO, 'game', 'js');
const VL = path.join(REPO, 'game', 'audio', 'voicelines');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');

// Balanced literal ([...] or {...}) starting at the first bracket after `marker`.
// A table that is no longer exported (#103) is found without its 'export '.
function literalAt(text, marker, from = 0) {
  // dead_code.mjs haalt `export` weg bij tabellen die alleen intern gebruikt worden: zoek dan zonder
  let m = text.indexOf(marker, from);
  if (m < 0 && marker.startsWith('export ')) m = text.indexOf(marker.slice(7), from);
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
export const NARRATOR = 'Rikus';

const manifests = {};
export function manifest(name) {
  if (name === 'npc') {
    const dir = path.join(REPO, 'game', 'audio', 'npc');
    return Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('_v0.wav')).map((f) => [f.slice(0, -7), true]));
  }
  if (!manifests[name]) {
    const p = path.join(VL, name, 'manifest.json');
    manifests[name] = fs.existsSync(p) ? withEllipsisAliases(JSON.parse(fs.readFileSync(p, 'utf8'))) : {};
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
    // the new story's entries (textOnly): their lines come from script.json, which voice_coverage checks itself
    if (!s || s.textOnly) return; // null: a retired mission (#187)
    // the outro (and its replay version) may have its own NPC (outroNpcKey)
    for (const kind of ['intro', 'outro', 'replay', 'fail']) for (const [k, t] of s[kind] || []) add('Missie-cutscenes', 'story', [nm(k, kind === 'outro' || kind === 'replay' ? s.outroNpcKey || s.npc : s.npc)], t, { mission: i, kind });
  });
  for (const st of DUO) for (const kind of ['intro', 'outro']) for (const [k, t] of st[kind]) add('Missie-cutscenes', 'story', [nm(k)], t, { kind: 'duo' });
  // missionstory.js falls back to the lines manifest (linevoice.storyLineVoice)
  for (const e of out) e.fallback = 'lines';

  // --- intro montage -> story manifest
  // [speaker key, text, delivery tag?]; new recordings go to the lines manifest
  const IM_WHO = { T: 'Tammo', A: 'Anita', V: NARRATOR, jelle: 'Jelle Terpstra' };
  for (const l of allLits(src('intromontage.js'), 'lines: [')) {
    for (const [k, t, tag] of l) {
      add('Intro-montage', 'story', [IM_WHO[k] || k], t, tag ? { tag } : {});
      out[out.length - 1].fallback = 'lines';
    }
  }

  // --- rondvaart chase -> story manifest
  const rc = src('rondvaartchase.js');
  const SHOUT = lit(rc, 'const SHOUT = ');
  for (const [kind, list] of Object.entries(SHOUT)) for (const t of list) add('Rondvaart-missie', 'story', ['Schipper Wiebe (megafoon)'], t, { kind });
  // the tour (rondvaartlines.js, mission and relaxed tour): Tammo at the
  // microphone, Tessa correcting him, tourists in bubbles; new recordings
  // go to the lines manifest (rondvaartchase.js looks in both)
  const TOURIST_CAST = {
    D: { persona: TOURISTS.D, tag: ['enthousiast, verrukt', 'nieuwsgierig, vrolijk'] },
    E: { persona: TOURISTS.E, tag: ['vrolijk, beleefd', 'verbaasd, geamuseerd'] },
    R: { persona: TOURISTS.R, tag: ['nieuwsgierig, een tikje bekakt', 'verbaasd, kletserig'] },
  };
  const tourLine = ([k, t]) => {
    if (TOURIST_CAST[k]) add('Rondvaart (toeristen)', 'lines', [TOURISTS[k].female ? BUBBLE.f : BUBBLE.m], t, TOURIST_CAST[k], 'any');
    else {
      add('Rondvaart (gids)', 'story', [k === 'T' ? 'Tammo (gids)' : 'Anita'], t, { tag: k === 'T' ? ['droog, vertellend door de microfoon van een rondvaartboot, stiekem trots op de stad', 'laconiek, als rondvaartgids door een bootspeaker'] : ['betweterig, plagend, verbetert hem', 'ad rem, snel, weet het beter, warm'] });
      out[out.length - 1].fallback = 'lines';
    }
  };
  for (const l of TOUR_WELCOME) tourLine(l);
  for (const stop of TOUR_STOPS) for (const l of stop.lines) tourLine(l);
  for (const list of Object.values(TOURIST_REACT)) for (const l of list) tourLine(l);
  // H13's scenes and the build-up to the kiss (rondvaartlines.js RV_SCENES)
  const RV_WHO = { W: 'Schipper Wiebe (megafoon)', G: 'Tammo (gids)', t: 'Tammo', A: 'Anita' };
  const RV_TAG = {
    why: ['verontwaardigd, schreeuwend door een megafoon', 'droog, zacht tegen haar', 'droog, plagend'],
    bonk: ['schreeuwend, dan pijnlijk kreunend', 'droog, geamuseerd', 'droog, laconiek'],
    resume: ['door de microfoon van een rondvaartboot, alsof er niks gebeurd is', 'droog, plagend'],
    glance: ['zacht, verlegen, privé', 'warm, een beetje verlegen'],
    hands: ['zacht, aarzelend, bijna fluisterend', 'verlegen, zacht'],
    later: ['zacht, warm, een beetje uitdagend', 'verlegen, zacht'],
  };
  for (const [kind, list] of Object.entries(RV_SCENES)) {
    for (const [k, t] of list) {
      add('Rondvaart-missie', 'story', [RV_WHO[k]], t, { kind, tag: RV_TAG[kind] });
      out[out.length - 1].fallback = 'lines';
    }
  }

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
  for (const [who, kinds] of Object.entries(DUO_JOB)) for (const list of Object.values(kinds)) for (const l of list) add('Bijbaantjes (Tammo/Tessa)', 'jobs', [who], l.t);

  // --- rondvaart bijbaan: the player is the tour guide -> lines manifest
  const rv = src('sidejob_rondvaart.js');
  for (const s of lit(rv, 'const SIGHTS = ')) for (const t of s.lines) add('Rondvaart-bijbaan (gids)', 'lines', ['Tammo', 'Anita'], t, { tag: ['enthousiaste rondvaartgids door een bootspeaker, speels', 'vertellend, trots op de stad', 'grappig, met een knipoog'] });

  // --- mission scenes and fallback intros in missions.js -> lines manifest
  const mi = src('missions.js');
  const npcs = lit(src('missionstory.js'), 'const NPC = ');
  const who = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k === 'V' ? NARRATOR : npcs[k] ? npcs[k].name : k);
  // stage scene lines, also when the first line starts on a new line
  for (const m of mi.matchAll(/lines: \[\s*\[/g)) for (const [k, t] of evalLit(literalAt(mi, 'lines: [', m.index).code)) add('Missie-scènes', 'lines', [who(k)], t);
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
  // an intro with a "Doel:" line is the new opening text (#93): text only, the story script plays the spoken intro
  for (const l of allLits(mi, '      intro: [')) if (!l.some((t) => /^Doel: /.test(t))) for (const t of l) add('Missie-intro (terugval)', 'lines', ['Tammo', 'Anita'], t, { tag: ['samenzweerderig, zacht', 'geamuseerd, zakelijk', 'opgewonden, fluisterend'] });

  // --- how Jelle and the twins reach them (storycontact.js), the "Eerder in GDE"
  // recaps and the handover lines (story.js) -> lines manifest
  const CONTACT = SPEAKERS;
  for (const st of STEPS) for (const c of st.contact || []) for (const [k, t, o] of c.lines) add('Verhaal-contact (telefoon)', 'lines', [CONTACT[k]], t, o && o.tag ? { tag: o.tag } : {});
  for (const P of Object.values(PARTS)) for (const [, t] of P.textOnly ? [] : P.recap || []) add('Verhaal-kaarten', 'lines', [NARRATOR], t, { tag: ['warm, vertellend, als een terugblik', 'droog, met een knipoog, samenvattend'] });
  for (const st of STEPS) if (st.why) add('Verhaal-stappen', 'lines', [st.player === 'anita' ? 'Anita' : 'Tammo'], st.why);
  // the scenes of activity steps (storyfun.js): where one is done, and Rotor Roelf at his demo heli
  for (const st of STEPS) for (const sc of [st.scene, st.meet, st.homeScene, st.dock]) for (const [k, t, o] of (sc && sc.lines) || []) add('Verhaal-scènes', 'lines', [who(k)], t, o && o.tag ? { tag: o.tag } : {});
  // r-trein's choice (storyarc.js HIDEOUTS): each option's scene
  for (const st of STEPS) for (const o of (st.goal && st.goal.options) || []) for (const [k, t, op] of (o.scene && o.scene.lines) || []) add('Verhaal-scènes', 'lines', [who(k)], t, op && op.tag ? { tag: op.tag } : {});
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
  for (const t of Object.values(lit(ci, 'const WIJK_LINES = ')).flat()) add('Wijken & landschap (verteller)', 'lines', [NARRATOR], t);
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
  // the night guards in the museum (heist.js, H6): one voice for the night shift
  const GUARD = { voice: 'Umbriel', who: 'Groningse nachtwaker in het museum, slaperig en nors', accent: 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent' };
  bubble('Museumkraak (bewakers)', Object.values(lit(src('heist.js'), 'export const GUARD_LINES = ')).flat(), { persona: GUARD, tag: ['argwanend, fel', 'slaperig, verbaasd', 'streng, roepend'] }, [BUBBLE.m]);
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
  // Tessa at a pigeon spot: the pigeons only listen to Tammo (pigeonspots.js)
  for (const t of lit(src('pigeonspots.js'), 'export const ANITA_NO_PIGEON = ')) add('Wereld (bijnamen & koeien)', 'lines', [BUBBLE.f], t, { as: 'Anita' });
  // padel opponents (padellines.js): the regulars in their own voices, Durk and Douwe as in the story
  const PADEL_CAST = {
    Hinderk: { voice: 'Enceladus', who: 'fanatieke Groningse padelspeler op leeftijd, praat Gronings', accent: 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent' },
    Grietje: { voice: 'Autonoe', who: 'fanatieke Groningse padelspeelster, ad rem, praat Gronings', accent: 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent' },
  };
  const pl = src('padellines.js');
  for (const table of ['PADEL_PAIR', 'PADEL_TWINS']) {
    for (const [name, sp] of Object.entries(lit(pl, `export const ${table} = `))) {
      for (const [k, list] of Object.entries(sp)) {
        if (!Array.isArray(list)) continue;
        const tag = k === 'score' || k === 'won' ? ['uitdagend, plagend, op de padelbaan', 'triomfantelijk, roepend over het net'] : k === 'start' ? ['joviaal, uitdagend'] : ['verontwaardigd, buiten adem', 'mopperend, sportief'];
        for (const t of list) add('Padel', 'lines', [sp.female ? BUBBLE.f : BUBBLE.m], t, PADEL_CAST[name] ? { persona: PADEL_CAST[name], tag } : { as: name });
      }
    }
  }
  // the free-roam activities (funlines.js): boer Roelf and Hilje at the carbid field and
  // kermisbaas Jan in their own voices, the other bumper-car drivers as any bubble
  const fun = src('funlines.js');
  const GRO_SPOKEN = 'spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent';
  const CTAG = { start: ['joviaal, uitnodigend', 'nuchter, droog'], early: ['spottend, droog'], late: ['ongeduldig, mopperend'], good: ['enthousiast, roepend', 'opgewonden, luid'], hit: ['juichend, trots'], miss: ['droog, laconiek'], endGood: ['stiekem onder de indruk, droog'], endPoor: ['berustend, vriendelijk'] };
  const FCAST = { ...lit(fun, 'export const CARBID_CAST = '), ...lit(fun, 'export const KERMIS_CAST = ') };
  for (const table of ['CARBID_LINES', 'KERMIS_LINES']) {
    for (const [name, kinds] of Object.entries(lit(fun, `export const ${table} = `))) {
      const c = FCAST[name];
      for (const [k, list] of Object.entries(kinds)) for (const t of list) add(table === 'CARBID_LINES' ? 'Carbid schieten' : 'Kermis', 'lines', [c.female ? BUBBLE.f : BUBBLE.m], t, { persona: { voice: c.voice, who: c.who, accent: GRO_SPOKEN }, tag: CTAG[k] || ['luid, joviaal, door een microfoon', 'roepend over de muziek heen'] });
    }
  }
  bubble('Kermis', [...lit(fun, 'export const BOTS_BUMPED = '), ...lit(fun, 'export const BOTS_HIT = ')], { tag: ['lacherig, uitgelaten, in een botsauto', 'gillend van plezier', 'uitdagend, plagend'] });
  // Durk & Douwe in the story ride (storyarc.js r-kermis), in their own voices
  const TWIN_ACCENT = 'spoken in Dutch with a heavy Frisian accent, slow';
  const TWIN_VOICE = { durk: { voice: 'Algieba', who: 'grote, trage Friese handlanger Durk, spreekt Nederlands met een zwaar Fries accent' }, douwe: { voice: 'Algenib', who: 'grote, trage Friese handlanger Douwe, tweelingbroer van Durk, spreekt Nederlands met een zwaar Fries accent' } };
  for (const [k, kinds] of Object.entries(lit(fun, 'export const KERMIS_TWINS = '))) for (const list of Object.values(kinds)) for (const t of list) add('Kermis', 'lines', [BUBBLE.m], t, { persona: { ...TWIN_VOICE[k], accent: TWIN_ACCENT }, tag: ['traag, verontwaardigd, in een botsauto', 'sloom, duizelig, in een botsauto'] });
  // Radio Proat, the talk on the radio (radio.js): Geesje; the rest it plays is recorded already
  const RADIO_HOST = fun.match(/export const RADIO_HOST = '([^']+)'/)[1];
  for (const list of Object.values(lit(fun, 'export const RADIO_GRUNN = '))) for (const t of list) add('Radio Proat', 'lines', [RADIO_HOST], t, { tag: ['warm, ontspannen, als radiopresentatrice', 'droog, met een knipoog, als radiopresentatrice', 'vlot en opgewekt, als radiopresentatrice'] });
  for (const t of lit(fl, 'export const KROLBRUG_FAULTS = ')) add('Wereld (radio & navigatie)', 'lines', ['Verkeersinformatie'], t);
  for (const t of lit(fl, 'export const RING_ZUID_GPS = ')) add('Wereld (radio & navigatie)', 'lines', ['Navigatie'], t);
  for (const t of lit(fl, 'export const NACHTSTREEK = ')) add('Wereld (radio & navigatie)', 'lines', [NARRATOR], t, { tag: ['zacht, warm, rustig, laat op de avond, als nacht-dj op de radio', 'warm, ontspannen, droog, als nacht-dj op de radio'] });
  for (const t of Object.values(lit(fl, 'export const NACHTSTREEK_STORY = '))) add('Wereld (radio & navigatie)', 'lines', [NARRATOR], t, { tag: ['zacht, warm, rustig, laat op de avond, als nacht-dj op de radio', 'warm, ontspannen, droog, als nacht-dj op de radio'] });
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

  // --- the Ommeland extras (ommelandlines.js): wereldeinden, dorpsuitjes and
  // De Koe van Ome Jan -> lines manifest; a DUO line is said by the companion
  const omWho = (who) => (who === OM_DUO ? ['Tammo', 'Anita'] : [who]);
  for (const e of [...WORLD_ENDS, WORLD_END_FINAL]) add('Ommeland (wereldeinden)', 'lines', omWho(e.who), e.text, e.tag ? { tag: e.tag } : {});
  for (const V of Object.values(VILLAGES)) {
    for (const part of [V.special, V.amenity]) {
      if (!part || !part.who || !part.lines) continue;
      for (const t of Array.isArray(part.lines) ? part.lines : Object.values(part.lines)) add('Ommeland (dorpen)', 'lines', omWho(part.who), t, part.tag ? { tag: part.tag } : {});
    }
  }
  const KOE_AREA = 'Na het verhaal (De Koe van Ome Jan)';
  for (const kind of ['intro', 'outro', 'spotted', 'untie', 'alarm', 'chase', 'close', 'ram', 'broken', 'lost']) for (const [k, t, tag] of KOE_LINES[kind]) add(KOE_AREA, 'lines', [KOE_WHO[k]], t, tag ? { tag } : {});
  for (const t of [...KOE_LINES.greet, ...KOE_LINES.thanks]) add(KOE_AREA, 'lines', [KOE_WHO.J], t, { tag: 'gemoedelijk, roepend over het hek' });
  for (const list of Object.values(KOE_LINES.duo)) for (const t of list) add(KOE_AREA, 'lines', ['Tammo', 'Anita'], t, { tag: ['gehaast, aansporend', 'opgewonden, roepend'] });
  for (const l of KOE_CALL) add('Telefoon (gesprekken)', 'lines', [l.speaker], l.text, { tag: l.speaker === 'Anita' ? 'aan de telefoon, verontwaardigd' : 'aan de telefoon, beschaamd maar charmant' });

  // --- HUD cards said out loud by whoever you play (cardlines.js) -> lines manifest
  for (const l of CARD_LINES) add('HUD-kaarten (Tammo/Tessa)', 'lines', ['Tammo', 'Anita'], l.say, { tag: ['kort, alert, tegen de ander naast je', 'droog, reagerend op wat er net gebeurde'] });
  // --- phone calls outside the story (phonefeed.js startCall) -> lines manifest
  for (const t of Object.values(lit(src('garages.js'), 'const HENK_CALL = '))) add('Telefoon (gesprekken)', 'lines', ['Henk'], t, { tag: 'gemoedelijk, aan de telefoon' });
  for (const l of lit(src('postgame.js'), 'const INVITE_CALL = ')) add('Telefoon (gesprekken)', 'lines', [typeof l.speaker === 'string' ? l.speaker : JELLE], l.text, { tag: 'aan de telefoon, uitdagend en vrolijk' });

  // --- phone messages read aloud (phonefeed.js notification cards, smsvoice.js) -> sms manifest
  const NEWS_TAG = ['als een regionale nieuwslezer, droog, licht ironisch', 'zakelijk voorlezend, met een knipoog', 'als een nieuwslezer, opgewekt en snel'];
  const APP_TAG = ['vriendelijke, gladde app-stem, kalm', 'behulpzame app-assistent, opgewekt'];
  const tagFor = (sp) => (sp === 'Kiekdoar-redactie' ? { tag: NEWS_TAG } : sp === 'Ubbo' ? { tag: APP_TAG } : {});
  const sms = (area, from, text, spoken = null) => {
    const sp = smsSpeaker(from || (/^KIEKDOAR/i.test(text) ? 'Kiekdoar' : from));
    add(area, 'sms', [sp], spoken || smsSpoken(text), tagFor(sp));
    out[out.length - 1].fallback = 'lines';
  };
  const SWHO = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k);
  // a step with `silent` (the new arc, storyarc_nieuw.js): its phone texts are never read aloud, so no recording is needed
  for (const st of STEPS.filter((q) => !q.silent)) {
    for (const f of ['lead', 'done']) if (st[f]) sms('Berichten (verhaal)', SWHO(st[f][0]), st[f][1]);
    for (const o of (st.goal && st.goal.options) || []) if (o.done) sms('Berichten (verhaal)', SWHO(o.done[0]), o.done[1]);
    if (st.goal && st.goal.lift) sms('Berichten (verhaal)', st.goal.lift[0], st.goal.lift[1]);
    for (const f of ['after', 'beat']) for (const [k, t] of st[f] || []) sms('Berichten (verhaal)', SWHO(k), t);
    for (const c of st.contact || []) for (const [k, t] of c.after || []) sms('Berichten (verhaal)', SWHO(k), t);
    if (st.voorschot) sms('Berichten (verhaal)', st.voorschot.from, st.voorschot.text);
  }
  for (const t of strings(src('story.js'), /phone\(SERIES, ('(?:[^'\\]|\\.)*')/g)) sms('Berichten (app)', 'GDE', t);
  for (const t of strings(src('postgame.js'), /from: 'GDE', text: ('(?:[^'\\]|\\.)*')/g)) sms('Berichten (app)', 'GDE', t);
  for (const { speaker, lines } of Object.values(SMS_SAY)) for (const t of lines) add(speaker === 'Kiekdoar-redactie' ? 'Berichten (Kiekdoar)' : speaker === 'Ubbo' ? 'Berichten (app)' : 'Berichten (verhaal)', 'sms', [speaker], t, tagFor(speaker));
  const fls = src('flavourlines.js');
  for (const t of strings(fls, /export const PLANTSOEN_NEWS = ('(?:[^'\\]|\\.)*')/g)) sms('Berichten (Kiekdoar)', 'Kiekdoar', t);
  for (const ev of Object.values(lit(fls, 'export const EVENT_DAYS = '))) sms('Berichten (Kiekdoar)', 'Kiekdoar', ev.announce);
  for (const t of lit(fls, 'export const KROLBRUG_FAULTS = ')) sms('Berichten (Kiekdoar)', 'Gerrit Krolbrug', t);
  sms('Berichten (Kiekdoar)', 'Kiekdoar', evalLit(src('funlines.js').match(/export const KERMIS_NEWS = ("[^"]*")/)[1]));
  for (const t of lit(src('sidejobs.js'), 'const ACCIDENT_LINES = ')) sms('Berichten (Kiekdoar)', '', t);

  // --- HUD cards that are the companion talking (hudcards.js companionSays) -> hints manifest
  const HINT_TAG = ['kort, alert, tegen de ander naast je', 'aanwijzend, gehaast', 'droog, adviserend'];
  // what the TTS reads for key names; the key stays the card text
  const spoken = (t) => t.replace(/\bW\/S\b/g, 'W en S').replace(/\bA\/D\b/g, 'A en D').replace(/\(Ctrl\)/g, '(control)').replace(/\(Esc > Spel\)/g, '');
  // a line that names one of them (or Tessa's Fjord) is only said by the other
  const hintWho = (t) => (/\bTessa\b/.test(t) ? ['Tammo'] : /\bTammo\b|mijn Fjord/.test(t) ? ['Anita'] : ['Tammo', 'Anita']);
  const hint = (t) => add('Hints (Tammo/Tessa)', 'hints', hintWho(t), cardSpoken(t), { tag: HINT_TAG, speak: spoken(cardSpoken(t)) });
  const mis = src('missions.js');
  for (const t of strings(mis, /\bsay: ('(?:[^'\\]|\\.)*')/g)) hint(t);
  for (const t of strings(mis, /\bhint\(world, ('(?:[^'\\]|\\.)*')/g)) hint(t);
  for (const t of strings(mis, /\bhint\(world, `[^`]*`, ('(?:[^'\\]|\\.)*')/g)) hint(t);
  for (const t of Object.values(lit(mis, 'const MODE_HINT = '))) hint(t);
  const gameSrc = fs.readdirSync(JS).filter((f) => f.endsWith('.js') && f !== 'cardlines.js').map(src).join('\n');
  for (const t of COMPANION_CARDS) {
    if (!gameSrc.includes(t.replace(/'/g, '\\\'')) && !gameSrc.includes(t)) throw new Error(`cardlines.js COMPANION_CARDS: not in the game any more: ${t}`);
    hint(t);
  }

  // Regels die bewust geen opname meer hebben (inclusieve taal, docs/INCLUSIEVE-TAAL.md): ze verschijnen als
  // ondertitel of tekstballon en worden niet opnieuw gegenereerd. Zie scripts/voice_stil.json.
  const stilFile = path.join(REPO, 'scripts', 'voice_stil.json');
  const stil = new Set(fs.existsSync(stilFile) ? JSON.parse(fs.readFileSync(stilFile, 'utf8')).stil.map((x) => x.text) : []);
  return stil.size ? out.filter((e) => !stil.has(e.text)) : out;
}

const hasKey = (e, s) => {
  const k = e.manifest === 'npc' ? s : s + '|' + e.text;
  return !!(manifest(e.manifest)[k] || (e.fallback && manifest(e.fallback)[k]));
};
export const isVoiced = (e) => (e.need === 'any' ? e.speakers.some((s) => hasKey(e, s)) : e.speakers.every((s) => hasKey(e, s)));
export const missingKeys = (e) => e.speakers.filter((s) => !hasKey(e, s));
