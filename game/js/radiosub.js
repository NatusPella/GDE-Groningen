// De ondertitel van de radioreclames (#409): een regel onderin beeld in het gedeelde ondertitelcomponent
// (subtitleui.js, subtitle.css), met de firma vooraan. Ondertitelgrootte, vlak en contrast volgen a11y.js via .ds-sub.
import { createSubtitle } from './subtitleui.js';

let sub = null;
function subtitle() {
  if (!sub) sub = createSubtitle({ id: 'radio-sub', speaker: 'rs-firma bt-speaker', line: 'rs-line' });
  return sub;
}

export function showRadioSub(firma, text) {
  if (typeof document === 'undefined') return;
  subtitle().show(firma, text);
}

export function hideRadioSub() {
  if (sub) sub.hide();
}
