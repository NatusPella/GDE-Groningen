// Story recap per milestone (#1363) and the anchor sentence for a scene that is reached too early (#1393).
// Pure: no DOM, no world, no imports, no save. Everything comes in as plain data, so scripts/storyrecap_test.mjs runs it
// in node with the real story data and with small made-up data.
//
// What it makes, from the story state of ONE player (the set of finished step ids):
//   buildRecap(...)    who is who (only characters the player has met), where the story stands, what is next
//   diaryEntries(...)  the diary: one paragraph per finished step, in Tammo's or Tessa's words (the lead of the step)
//   earlyArrival(...)  a scene whose step is not the next one: one anchor sentence (who and why), without a spoiler
//
// The no-spoiler rule (bible 01 section 3.1 A3 and C): a character appears in a recap or anchor only when the step that
// introduces it (dossier.firstStep) is done by this player. A name in a text that is not introduced yet makes that text fall back
// to a neutral sentence; it is never shown.
//
// Samen spelen: the input is the story state of the player who looks at it, never the host's. A guest who joins later
// passes his own done set and gets a recap that fits him; nothing is sent over the network and nothing is saved (the
// recap is derived every time, so it can never contradict the progress). See the coupling note in docs/STORYRECAP.md.

export const RECAP_WHO_MAX = 5;      // at most this many "wie is wie" lines on one card
export const DIARY_NO_DATE = true;   // never a date in the recap or the diary (#1396)

const FIRST_NAME_MIN = 4;
// First names that are too common or too short to recognise a character by on their own.
const GENERIC = new Set(['mam', 'pa', 'opa', 'oma', 'mem', 'tante', 'ome', 'boer', 'boerin', 'koe', 'meneer', 'mevrouw', 'dokter', 'kapitein', 'schipper']);

const asSet = (d) => (d instanceof Set ? d : new Set(d || []));
const noSpeaker = (t) => String(t || '').replace(/^\s*(Tammo|Anita|Tessa)\s*:\s*/, '').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The words by which the player knows a character: first name, and the nickname before any ";" or "(".
export function nameTokens(d) {
  const out = new Set();
  const add = (t) => {
    const w = String(t || '').trim();
    if (w.length >= FIRST_NAME_MIN && !GENERIC.has(w.toLowerCase())) out.add(w);
  };
  add(String(d.name || '').split(/\s+/)[0]);
  const nick = String(d.nick || '').split(/[;(]/)[0].trim();
  if (nick && !/^(onbenoemd|n\.v\.t\.)$/i.test(nick)) {
    add(nick);
    const parts = nick.split(/\s+/);
    if (parts.length > 1) add(parts[parts.length - 1]);
  }
  return [...out];
}

// Dossiers that can be named at all: the supporting cast with a first step that is a real step.
function namedCast(dossiers, stepIds) {
  return (dossiers || []).filter((d) => (d.tier === 'supporting') && d.firstStep && stepIds.has(d.firstStep));
}

// Characters this player has met: their first step is done.
export function introducedIds(dossiers, steps, done) {
  const dn = asSet(done);
  const ids = new Set(steps.map((s) => s.id));
  return new Set(namedCast(dossiers, ids).filter((d) => dn.has(d.firstStep)).map((d) => d.id));
}

// Names in `text` that belong to a character this player has NOT met (and that this step does not introduce itself).
export function unknownNames(text, { dossiers, steps, done, stepId = null }) {
  const known = introducedIds(dossiers, steps, done);
  const ids = new Set(steps.map((s) => s.id));
  const found = [];
  for (const d of namedCast(dossiers, ids)) {
    if (known.has(d.id) || (stepId && d.firstStep === stepId)) continue;
    for (const tok of nameTokens(d)) {
      if (new RegExp(`(^|[^\\p{L}])${esc(tok)}s?([^\\p{L}]|$)`, 'u').test(String(text || ''))) { found.push(d.id); break; }
    }
  }
  return found;
}

// The step the player is on: the first step in story order that is not done.
export function currentStepOf(steps, done) {
  const dn = asSet(done);
  return steps.find((s) => !dn.has(s.id)) || null;
}

const leadText = (s) => (s && s.lead ? noSpeaker(Array.isArray(s.lead) ? s.lead[1] : s.lead) : '');
const firstSentence = (t) => { const m = String(t || '').match(/^.*?[.!?](?=\s|$)/); return (m ? m[0] : String(t || '')).trim(); };

// The recap. `input`: { steps, done, dossiers, parts: { id: { title } }, why: { part: text }, partName?: fn }
// Returns null when the story is over or there is no step to name. Shape:
//   { stepId, part, deel, why, vorige: [title, title], nu, wie: [{ id, naam, regel }], rows: [[label, text]] }
export function buildRecap(input) {
  const { steps, dossiers, why = {}, parts = {} } = input;
  const done = asSet(input.done);
  const cur = input.current || currentStepOf(steps, done);
  if (!cur) return null;
  const doneSteps = steps.filter((s) => done.has(s.id) && s.title);
  const vorige = doneSteps.slice(-2).map((s) => s.title);
  const nowRaw = leadText(cur);
  // The goal line must not name a character the player has not met; then the part's own line has to carry it.
  const leak = unknownNames(nowRaw, { dossiers, steps, done, stepId: cur.id });
  const nu = nowRaw && !leak.length ? nowRaw : '';
  const whyText = String(why[cur.part] || '');
  const whyLeak = unknownNames(whyText, { dossiers, steps, done, stepId: cur.id });
  const deelTitle = parts[cur.part] ? String(parts[cur.part].title).replace(/^(?:Akte|Deel)\s+\d+\s*:\s*/i, '') : '';

  const known = introducedIds(dossiers, steps, done);
  const order = new Map(steps.map((s, i) => [s.id, i]));
  const curIdx = order.get(cur.id);
  const wie = (dossiers || [])
    .filter((d) => known.has(d.id))
    // still part of the story from here on, or at least recently met: lastStep before the current step drops out
    .filter((d) => !(d.lastStep && order.has(d.lastStep) && order.get(d.lastStep) < curIdx - 6))
    .sort((a, b) => order.get(b.firstStep) - order.get(a.firstStep))
    .slice(0, input.maxWho || RECAP_WHO_MAX)
    .map((d) => ({ id: d.id, naam: String(d.name || ''), regel: String(d.tagline || d.storyRole || '') }))
    .filter((w) => w.naam && w.regel);

  const rows = [];
  if (deelTitle || (whyText && !whyLeak.length)) rows.push(['Waar staan we', [deelTitle, whyLeak.length ? '' : whyText].filter(Boolean).join(': ')]);
  if (vorige.length) rows.push(['Laatst gedaan', vorige.join('; ')]);
  rows.push(['Nu', nu || 'Kijk rond en volg je kaart: het verhaal pakt de draad zelf weer op.']);
  if (wie.length) rows.push(['Wie is wie', wie.map((w) => `${w.naam}: ${w.regel}`).join(' ')]);
  return {
    stepId: cur.id, part: cur.part, deel: deelTitle, why: whyLeak.length ? '' : whyText,
    vorige, nu, wie, rows,
  };
}

// The diary: one entry per finished step that has a lead, in story order, in the words of whoever spoke the lead.
// `speakers` maps the lead code ('T', 'A') to the shown name ('Tammo', 'Tessa'). No date in an entry.
export function diaryEntries({ steps, done, speakers = { T: 'Tammo', A: 'Tessa' } }) {
  const dn = asSet(done);
  return steps
    .filter((s) => dn.has(s.id) && s.lead)
    .map((s) => ({
      stepId: s.id, part: s.part, titel: String(s.title || ''),
      door: speakers[Array.isArray(s.lead) ? s.lead[0] : ''] || '',
      tekst: leadText(s),
    }))
    .filter((e) => e.tekst);
}

// A scene whose place is reached before its step. Early = an earlier step is not done yet. The anchor is one sentence
// that says who and why: the first sentence of the step's lead when it names no stranger, else the part's line when
// that is clean, else a neutral line. Never blocks anything; the scene plays either way.
export function earlyArrival({ step, steps, done, dossiers, why = {} }) {
  const dn = asSet(done);
  const idx = steps.findIndex((s) => s.id === step.id);
  const early = idx > 0 && steps.slice(0, idx).some((s) => !dn.has(s.id));
  const clean = (t) => t && !unknownNames(t, { dossiers, steps, done: dn, stepId: step.id }).length;
  const candidates = [firstSentence(leadText(step)), firstSentence(why[step.part]), ''];
  const own = candidates.find((t) => clean(t)) ?? '';
  const anchor = own || 'Je bent hier vroeg: kijk rond, de rest van het verhaal komt vanzelf.';
  return { early, anchor };
}
