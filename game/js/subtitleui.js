// Eén ondertitelcomponent (23-11, DS3): elke ondertitel in het spel (film, verhaalgesprek, rondvaart, postgame,
// autopraat, radio, intro, trailer) is een `.ds-sub` met dezelfde DOM, stijl en plek (subtitle.css). Een drager maakt
// hem hier, nooit zelf met inline stijl. Wie een nieuw ondertitelpunt toevoegt, gebruikt createSubtitle of
// subtitleMarkup; scripts/subtitleui_test.mjs keurt een eigen ondertitel-DOM af.
// Het id blijft bestaan: subtitlegate.js/overlayhold.js (één tegelijk, verborgen bij een menu of het laadscherm),
// a11y.js en de tests vinden de ondertitel erop. Zichtbaar = style.opacity '1' (of de klasse `on`/`has-sub` bij de films).
import { paintSpeaker } from './speakers.js';
import { setDualText } from './subtitles.js';
import { SUB_CLASS, SUB_SPEAKER_CLASS, SUB_LINE_CLASS } from './subtitlegate.js';

let cssLinked = false;
// Het stylesheet laadt bij de eerste ondertitel (zoals hud_panel.css en a11y.css via hun module).
export function ensureSubtitleCss() {
  if (cssLinked || typeof document === 'undefined') return;
  cssLinked = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./subtitle.css', import.meta.url).href;
  document.head.appendChild(link);
}

// De ene DOM-vorm: sprekerlabel en tekstregel. De oude klassen (st-, bt-, rv-, rs-) blijven als extra klasse
// voor wie ze opzoekt (coopscene, playerapi, tests).
export function subtitleMarkup({ speaker = '', line = '' } = {}) {
  ensureSubtitleCss();
  return `<span class="${SUB_SPEAKER_CLASS} ${speaker}"></span><span class="${SUB_LINE_CLASS} ${line}"></span>`;
}

// Een ondertitel in een eigen element (op de body): { el, set, show, hide, visible }.
export function createSubtitle({ id, speaker = '', line = '', extra = '', parent = null } = {}) {
  if (typeof document === 'undefined') return null;
  const el = document.createElement('div');
  el.id = id;
  el.className = `${SUB_CLASS} ${extra}`.trim();
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = subtitleMarkup({ speaker, line });
  (parent || document.body).appendChild(el);
  const speakerEl = el.querySelector('.' + SUB_SPEAKER_CLASS);
  const lineEl = el.querySelector('.' + SUB_LINE_CLASS);
  return {
    el, speakerEl, lineEl,
    // Zet de regel (sprekerkleur en Fries/Gronings met Nederlandse regel eronder via paintSpeaker en setDualText).
    set(name, text, opts) { paintSpeaker(speakerEl, name); setDualText(lineEl, text, opts); },
    visible(on) { el.style.opacity = on ? '1' : '0'; },
    show(name, text, opts) { this.set(name, text, opts); this.visible(true); },
    hide() { this.visible(false); },
  };
}
