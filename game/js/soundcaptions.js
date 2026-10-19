// Geluidsondertitels (#200): voor wie niet kan horen wat er gebeurt, staat er
// kort bij een belangrijk geluid wat het is, bijvoorbeeld "[sirene]" of
// "[knal, in de verte]". Alleen niet-gesproken geluid; gesproken regels hebben
// hun eigen ondertitel. De regels (labels, wachttijd, afstand, hoeveel er
// tegelijk staan) zijn puur en getest in scripts/soundcaptions_test.mjs;
// audio.js meldt een geluid met noteSound(), het getekende deel staat onderaan.
import { getSettings } from './settings.js';

// audio-event kind (of fx/wapen-subsoort) -> tekst
export const SOUND_LABELS = {
  bell: 'kerkklok', crossing_bell: 'overwegbel', train_horn: 'treinfluit', horn: 'claxon', shout: 'geschreeuw',
  alarm: 'alarm', whistle: 'fluitje', splash: 'plons', siren: 'sirene', explosion: 'explosie',
  shot: 'schot', swing: 'zwaai', coo: 'duif', caw: 'kraai', bell_note: 'klokkenspel', stall: 'motor slaat af',
  grind: 'versnellingsbak knarst', camera_shutter: 'camera', gore: 'vervelend geluid', bonk: 'bonk',
};

const COOLDOWN_S = 2.2;
const LIFE_S = 2.6;
const MAX_SHOWN = 3;
const FAR_M = 60;
const HEARD_M = 150;

export function labelFor(kind, sub) {
  return SOUND_LABELS[sub] || SOUND_LABELS[kind] || null;
}

// Houdt bij wat er nu staat. entries: [{ text, until }]
export function createCaptions() {
  return { entries: [], last: {} };
}

// Meld een geluid op afstand dist (m) op tijd now (s). Geeft de nieuwe tekst of null.
export function pushCaption(state, kind, { sub = '', dist = 0, now = 0 } = {}) {
  const label = labelFor(kind, sub);
  if (!label || dist > HEARD_M) return null;
  if (now - (state.last[label] ?? -1e9) < COOLDOWN_S) return null;
  state.last[label] = now;
  const text = `[${label}${dist > FAR_M ? ', in de verte' : ''}]`;
  state.entries = state.entries.filter((e) => e.until > now);
  state.entries.push({ text, until: now + LIFE_S });
  while (state.entries.length > MAX_SHOWN) state.entries.shift();
  return text;
}

export function visibleCaptions(state, now) {
  return state.entries.filter((e) => e.until > now).map((e) => e.text);
}

// --- getekend deel ---------------------------------------------------------
const st = createCaptions();
let el = null;
let timer = 0;

export function noteSound(kind, opts = {}) {
  if (typeof document === 'undefined' || !getSettings().soundCaptions) return;
  const now = performance.now() / 1000;
  if (!pushCaption(st, kind, { ...opts, now })) return;
  if (!el) {
    el = document.createElement('div');
    el.id = 'sound-captions';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  const draw = () => {
    const t = performance.now() / 1000;
    const list = visibleCaptions(st, t);
    el.textContent = '';
    for (const s of list) { const p = document.createElement('div'); p.textContent = s; el.appendChild(p); }
    clearTimeout(timer);
    if (list.length) timer = setTimeout(draw, 300);
  };
  draw();
}
