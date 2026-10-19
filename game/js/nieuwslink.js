// Koppelt de nieuwsticker (nieuwsticker.js, #202) aan wat de speler doet: een
// beroving (w.muggerChase), een achtervolging (sterren, wantedstate.js), een
// brug die opengaat en een evenement of kermis dat net begint (w.eventsNow). Elke
// overgang geeft één melding; de ticker zelf bepaalt of die door mag
// (pauze, plafond, cooldown). Puur: geen DOM, geen klok. De aanroeper (
// regiolevenrt.js) toont het resultaat als tekstkaart. Test: scripts/nieuwslink_test.mjs.
import { createTicker, meld, tikTicker, tickerTekst, BRON } from './nieuwsticker.js';
import { wantedPhase } from './wantedstate.js';

export function createNieuwsLink(seed = 7) {
  return { ticker: createTicker(seed), was: { chase: false, mug: false, bridges: new WeakMap(), events: new Set(), primed: false } };
}

// Wat is er sinds de vorige tik gebeurd? -> [{ soort, plaats }]
export function nieuwsFeiten(link, w, env = {}) {
  const was = link.was, out = [];
  const chase = wantedPhase(w) === 'achtervolging';
  if (chase && !was.chase) out.push({ soort: 'achtervolging' });
  was.chase = chase;
  const mug = !!w.muggerChase;
  if (mug && !was.mug) out.push({ soort: 'overval' });
  was.mug = mug;
  for (const b of (env.bridges ? env.bridges() : [])) {
    const prev = was.bridges.get(b);
    was.bridges.set(b, b.state);
    if (prev !== undefined && prev !== b.state && b.state === 'opening') out.push({ soort: 'brug', plaats: b.name });
  }
  const ids = new Set((w.eventsNow || []).map((e) => e.id));
  if (was.primed) for (const e of w.eventsNow || []) if (!was.events.has(e.id)) out.push({ soort: e.kind === 'kermis' ? 'kermis' : 'evenement', plaats: e.plaats || e.name });
  was.events = ids;
  was.primed = true;
  return out;
}

// Eén tik: nieuwe feiten melden en de regel teruggeven die nu in beeld hoort
// te komen ({ item, tekst }) of null. `plek` = { regio, plaats } van de speler.
export function tikNieuws(link, w, now, plek = {}, env = {}) {
  const before = link.ticker.current;
  for (const f of nieuwsFeiten(link, w, env)) meld(link.ticker, f.soort, { regio: plek.regio, plaats: f.plaats || plek.plaats }, now);
  const cur = tikTicker(link.ticker, now);
  if (cur && cur !== before) return { item: cur, tekst: tickerTekst(cur), bron: BRON };
  return null;
}
