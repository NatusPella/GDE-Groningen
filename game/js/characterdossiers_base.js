// Character dossiers (casting cards), the base: schema, helpers and the pure rules.
// The data lives in characterdossiers_leads.js, _story.js, _minor.js and _bible.js, the
// relations in characterdossiers_relations.js; characterdossiers.js joins them.
// Pure data and pure functions (no DOM, no three.js), so Node tests import it directly.
//
// One dossier per character, in the manner of a film production's casting
// card: who they are, where they live, what they want and need, what hurts,
// how they speak, what they wear in which act, who they know, when they
// are on screen. Every field is filled; where it does not apply it says
// 'n.v.t.' (not applicable), so the card is never empty.
//
// Provenance per field: `canon` lists the fields that come straight from a
// source in the repo (docs, code, script). Everything else that is filled in
// is a PROPOSAL (voorstel) by the dossier author and can be overridden by the
// story lead or the owner. Fields that say 'n.v.t.' are neither.
//
// Fields (keys English, values Dutch):
//   id, speakerKey   id = characters.js id where one exists; speakerKey = key in game/storydata/script.json speakers
//   status           'canon' (in the game or docs) | 'candidate' (inspiration list, not decided)
//   tier             'lead' | 'supporting' | 'minor' | 'cameo' | 'mentioned' | 'group'
//   name, nick       full invented name, nickname
//   age, pronoun     number (or n.v.t.), 'hij' | 'zij' | 'neutraal' | 'n.v.t.'; only canon decides 'hij'/'zij'
//   homePlace, homeAddress, household   where they live, in words (no real addresses), with whom
//   homeByAct        where they sleep per act/period ({ 1..6, E }): the home changes with the story (flat, Beppe, the van, a barn); or n.v.t.
//   origin, education, work, employer, hobbies
//   traits (3-5), tagline, want, need, fear (wound), habits (tics, running gags)
//   dialect, rhythm, phrases   speech; Fries and Gronings with care
//   voice, voiceTag            TTS voice (scripts/tts_lines_list.mjs CAST) and its tag
//   look, outfitRole, outfitByAct   appearance; clothing role pool (epic-kleding) and costume per act
//   arc              character arc per act ({ 1..6 }, 6 = Deel 4) or 'n.v.t.'
//   firstStep, lastStep, introducedBy, storyRole, needsFromDuo   when and how on screen
//   mapLink, minigames   place on the map, where they turn up outside the story
//   canonNotes, sensitive
//   aliases          optional (not a card field): other ways the game text names them (scripts/story_names_test.mjs)
//   reveal           { field: 'met' | stepId }: when the in-game card may show a field (default 'met')
//   canon            field names that are canon (the rest is proposal)
export const NA = 'n.v.t.';
export const STORY_YEAR = 2026; // the calendar of the game (docs/verhaal/KALENDER.md)

export const TIERS = ['lead', 'supporting', 'minor', 'cameo', 'mentioned', 'group'];
export const STATUSES = ['canon', 'candidate'];
export const PRONOUNS = ['hij', 'zij', 'neutraal', NA];
// Acts: 1 to 5 and 6 = Deel 4 (Nazomer); the epilogue belongs to act 5 (homeByAct has its own key E).
export const ACTS = { 1: 'Akte 1: Moi, Grunn', 2: 'Akte 2: Het Noorden is groot', 3: 'Akte 3: Aan de Eems', 4: 'Akte 4: Zuidwaarts', 5: 'Akte 5: Ontzet', 6: 'Deel 4: Nazomer' };
// Clothing role pools of epic-kleding (clothingdata.js ROLE_POOLS); NA when the look is fixed by hand
export const OUTFIT_ROLES = ['voetganger', 'student', 'toerist', 'bouwvakker', 'boer', 'kok', 'bakker', 'winkelier', 'zakenman', 'sporter', 'feestganger', NA];
// the story outfit sets of epic-kleding (clothingdata.js SETS); used when clothingdata.js is not in the build yet
export const KNOWN_OUTFIT_SETS = [
  'tammo:stadjer', 'tammo:groenwit', 'tammo:boer', 'tammo:keuning', 'tammo:corps', 'tammo:incognito',
  'anita:classic', 'anita:groenwit', 'anita:noorderzon', 'anita:pastel', 'anita:wadloper', 'anita:incognito',
];

export const SCALAR_FIELDS = ['id', 'speakerKey', 'status', 'tier', 'name', 'nick', 'pronoun', 'homePlace', 'homeAddress', 'household',
  'origin', 'education', 'work', 'employer', 'tagline', 'want', 'need', 'fear', 'dialect', 'rhythm', 'voice', 'voiceTag', 'look',
  'outfitRole', 'firstStep', 'lastStep', 'introducedBy', 'storyRole', 'needsFromDuo', 'mapLink', 'canonNotes', 'sensitive'];
export const LIST_FIELDS = ['hobbies', 'traits', 'habits', 'phrases', 'minigames'];
// every key a finished dossier has (age is a number or NA; arc and outfitByAct are objects or NA)
export const ALL_FIELDS = [...SCALAR_FIELDS, ...LIST_FIELDS, 'age', 'arc', 'outfitByAct', 'homeByAct'];
// fields that never count as "filled in" evidence (identity and bookkeeping)
export const BOOKKEEPING = ['id', 'speakerKey', 'status', 'tier'];

// Build a dossier from a spec: every missing field becomes NA ([NA] for lists), so a
// card can never be empty by accident. `reveal` and `canon` default to empty.
export function card(spec) {
  const out = { ...spec };
  for (const k of SCALAR_FIELDS) if (out[k] === undefined) out[k] = NA;
  for (const k of LIST_FIELDS) if (out[k] === undefined) out[k] = [NA];
  if (out.age === undefined) out.age = NA;
  if (out.arc === undefined) out.arc = NA;
  if (out.outfitByAct === undefined) out.outfitByAct = NA;
  if (out.homeByAct === undefined) out.homeByAct = NA;
  out.reveal = out.reveal || {};
  // a canon list may be shared by a group of cards; a field that stays n.v.t. on this card is not canon
  out.canon = (out.canon || []).filter((k) => !isNA(out[k]));
  return out;
}

// A relation between two characters is declared ONCE as an edge; the view of each
// side is derived (relationsOf), so A to B and B to A can never disagree.
//   a, b            dossier ids
//   type            family | friends | colleagues | rivals | neighbours | romantic | mentor | work | acquaintance
//   aIs, bIs        what a is to b, and what b is to a ("oma", "kleinzoon")
//   since, tone     since when, and the tone between them
//   aKnows, bKnows  what each of them knows about the other
//   shared          a shared little story
//   from            when the in-game card may show it ('met' or a step id); canon = true when a source says so
export const RELATION_TYPES = ['family', 'friends', 'colleagues', 'rivals', 'neighbours', 'romantic', 'mentor', 'work', 'acquaintance'];
export const EDGE_FIELDS = ['a', 'b', 'type', 'aIs', 'bIs', 'since', 'tone', 'aKnows', 'bKnows', 'shared'];

export const edge = (e) => ({ from: 'met', canon: false, ...e });

// Both sides of every edge for one character: [{ to, kind, is, theyAre, since, tone, knows, theyKnow, shared, from, canon }]
export function relationsOf(edges, id) {
  const out = [];
  for (const e of edges) {
    if (e.a === id) out.push({ to: e.b, type: e.type, is: e.aIs, theyAre: e.bIs, since: e.since, tone: e.tone, knows: e.aKnows, theyKnow: e.bKnows, shared: e.shared, from: e.from, canon: e.canon });
    else if (e.b === id) out.push({ to: e.a, type: e.type, is: e.bIs, theyAre: e.aIs, since: e.since, tone: e.tone, knows: e.bKnows, theyKnow: e.aKnows, shared: e.shared, from: e.from, canon: e.canon });
  }
  return out;
}

// Birth years derived from the age and the calendar of the game: two candidates (birthday not
// known). Never shown to the player: the canon writes no birth years out (VERHAALCANON-21-11).
export function birthYears(d) {
  return typeof d.age === 'number' ? [STORY_YEAR - d.age - 1, STORY_YEAR - d.age] : null;
}
// age in a given year, from the same derivation (a range): Trijntje in 1953
export function ageIn(d, year) {
  return typeof d.age === 'number' ? [year - (STORY_YEAR - d.age), year - (STORY_YEAR - d.age - 1)] : null;
}

export const isNA = (v) => v === NA || (Array.isArray(v) && v.length === 1 && v[0] === NA) || v == null || v === '';

// How many of the content fields are really filled in (not NA), and how many of those are canon.
export function fillStats(d) {
  const fields = ALL_FIELDS.filter((k) => !BOOKKEEPING.includes(k));
  const filled = fields.filter((k) => {
    const v = d[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) return Object.keys(v).length > 0;
    return !isNA(v);
  });
  const canon = filled.filter((k) => d.canon.includes(k));
  return { total: fields.length, filled: filled.length, canon: canon.length, proposal: filled.length - canon.length };
}

// What the in-game card may show for this player right now (spoiler-free): each fact has a
// `from` ('met' = as soon as you met them, or a story step that must be done). `ctx` is
// { met: boolean, done: Set<stepId> }. Pure, so the UI test checks the same rule.
const unlocked = (from, ctx) => (from === 'met' ? !!ctx.met : !!ctx.met && ctx.done.has(from));
const short = (v) => (isNA(v) ? '' : String(v));

export function visibleFacts(d, edges, byId, ctx) {
  const facts = [];
  const add = (label, text, from) => { if (text && unlocked(from || 'met', ctx)) facts.push({ label, text }); };
  const rev = (k) => d.reveal[k] || 'met';
  if (typeof d.age === 'number') add('Leeftijd', `${d.age}`, rev('age'));
  add('Woont', short(d.homePlace), rev('homePlace'));
  add('Werk', short(d.work), rev('work'));
  add('Komt uit', short(d.origin), rev('origin'));
  for (const who of ['tammo', 'anita']) {
    if (who === d.id) continue;
    const rel = relationsOf(edges, d.id).find((r) => r.to === who);
    if (rel && rel.is) add(who === 'tammo' ? 'Voor Tammo' : 'Voor Tessa', `${rel.is}`, rel.from);
  }
  return facts;
}
