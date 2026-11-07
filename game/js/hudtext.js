// How much text the HUD may show (#92). Pure logic, no DOM, no storage:
//   - wordCount / trimWords: the budget per HUD element, checked by
//     scripts/hud_text_audit.mjs and hud_test.mjs;
//   - the 'seen' counter: an explanation shows the first few times only
//     (the counts live in one object the caller keeps under KEYS.hudSeen).
// The HUD shows icons, meters and short labels (1-2 words); the nice
// messages at the top stay, but get their explanation only at first sight.

// Words allowed per element. 'label' = a short label, 'line' = one line of a
// message card, 'explain' = the first-time explanation (shown N times only).
export const WORD_BUDGET = {
  label: 2,
  hint: 3, // an interaction hint next to its key
  objective: 6, // the goal card: title
  objectiveSub: 3, // the goal card: progress
  subtitle: 18, // one spoken line
  cardTitle: 4,
  cardBody: 14,
  phone: 14, // a phone message card
  prompt: 8, // the travel prompt, the bridge hint
  explain: 16,
};

// How many times an explanation shows before it is gone for good.
export const EXPLAIN_TIMES = 2;

const WORD = /[^\s·|/–—-]+/g;

// Words in a text; a {KEY} token or a number counts as one.
export function wordCount(text) {
  if (text == null) return 0;
  const m = String(text).replace(/<[^>]*>/g, ' ').match(WORD);
  return m ? m.length : 0;
}

// De eerste `max` woorden van een tekst; adds nothing, so it is safe in a label.
export function trimWords(text, max) {
  const s = String(text ?? '').trim();
  if (wordCount(s) <= max) return s;
  const parts = s.split(/\s+/);
  const out = [];
  let n = 0;
  for (const p of parts) {
    if (wordCount(p)) n++;
    if (n > max) break;
    out.push(p);
  }
  return out.join(' ').replace(/[,;:.]+$/, '');
}

export const overBudget = (text, kind) => wordCount(text) > (WORD_BUDGET[kind] ?? WORD_BUDGET.label);

// #645: runtime-inkorting voor dynamische kaarten en ondertitels (namen, bedragen
// en missietitels maken een tekst pas op het laatste moment lang). De aanroeper
// beslist waar hij dit toepast; de ratel hierboven blijft de bron van de maten.
export const fitCard = (text) => trimWords(text, WORD_BUDGET.cardBody);
export const fitSubtitle = (text) => trimWords(text, WORD_BUDGET.subtitle);

// #643: één telefoonkaart van hooguit WORD_BUDGET.phone woorden (kop + body samen). De titel is een
// kop, de body wordt op het budget afgekapt; `over` zegt of dat nodig was, zodat de audit een te
// lange (ook dynamische) melding kan markeren in plaats van hem stil te laten groeien.
export function phoneCard(title, body) {
  const t = String(title ?? '').trim();
  const b = String(body ?? '').trim();
  const woorden = wordCount(t) + wordCount(b);
  const titel = trimWords(t, 8);
  const rest = trimWords(b, Math.max(0, WORD_BUDGET.phone - wordCount(titel)));
  return { title: titel, body: rest, words: woorden, over: woorden > WORD_BUDGET.phone };
}

// --- the 'seen' counter --------------------------------------------------------

export const emptySeen = () => ({});
export const seenCount = (seen, id) => (seen && Number.isFinite(seen[id]) ? seen[id] : 0);

// Should the explanation for `id` still show?
export const wantsExplain = (seen, id, times = EXPLAIN_TIMES) => seenCount(seen, id) < times;

// A new object with the count of `id` one higher (capped, so storage stays small).
export function markSeen(seen, id, cap = 9) {
  const out = { ...(seen && typeof seen === 'object' ? seen : {}) };
  out[id] = Math.min(cap, seenCount(out, id) + 1);
  return out;
}

// Reads a stored value safely: anything but an object of small whole numbers is dropped.
export function parseSeen(raw) {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    const out = {};
    for (const [k, v] of Object.entries(o)) if (Number.isInteger(v) && v > 0 && v < 100) out[k] = v;
    return out;
  } catch (e) { return {}; }
}

// Text with its first-time explanation: the short form always, the long form
// only while the explanation is still wanted.
export function withExplain(short, long, seen, id) {
  return wantsExplain(seen, id) && long ? long : short;
}

// --- interaction hints (prompts.js) -------------------------------------------

export const SUB_FREE = 3; // a sub of this many words or fewer is a label, not an explanation

// Which sub-line shows under a hint's label. `c`: { label, sub, learn, dim }.
// A blocked hint (dim) keeps its reason, cut to 3 words ('Te weinig geld'); a
// learning hint keeps its text; a short sub (a name, a count) always shows;
// a long explanation shows the first EXPLAIN_TIMES times per label only.
export function promptSub(c, seen) {
  const sub = c && c.sub ? String(c.sub) : '';
  if (!sub) return '';
  if (c.dim) return trimWords(sub, WORD_BUDGET.hint);
  if (c.learn || wordCount(sub) <= SUB_FREE) return sub;
  return wantsExplain(seen, 'hint:' + (c.label || '')) ? sub : '';
}

// Does showing this hint use up one of its explanations?
export const explains = (c, seen) => !!(c && c.sub && !c.dim && !c.learn && wordCount(c.sub) > SUB_FREE && wantsExplain(seen, 'hint:' + (c.label || '')));
export const explainId = (c) => 'hint:' + (c.label || '');
