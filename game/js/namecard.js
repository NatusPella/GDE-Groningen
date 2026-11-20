// Trailer-style name cards: the first time someone turns up, their name in big
// Bebas letters with one dry line under it (storyarc.js CHARACTERS), bottom
// left, above the subtitles. Cutscene lines (missionstory.js, a line's
// `card`) and radio fragments (storycontact.js) show them; story.js hears
// about every meeting through onMeet and keeps it in the save.

import { CHARACTERS } from './storyarc.js';
import { isOverlayHeld } from './overlayhold.js';

const SHOW_S = 3.4;
const WAIT_MAX = 12;
let waitT = 0;
let el = null;
let hideT = 0;
let meetHook = null;

export function setMeetHook(fn) {
  meetHook = fn;
}

function ensure() {
  if (el || typeof document === 'undefined') return el;
  const st = document.createElement('style');
  st.textContent = `
#name-card { position: fixed; left: max(6vw, calc(340px * var(--ui, 1) + 24px)); bottom: calc(11vh + 24vh); z-index: 17; pointer-events: none; color: var(--ds-c-ink-inkt);
  padding: 10px 22px 14px; background: var(--ds-c-ink-papier); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: 8px; box-shadow: var(--ds-schaduw-hard);
  opacity: 0; --ds-mi-x: -8px; } /* ds-motion.css (.ds-mi-in) */
#name-card.on { opacity: 1; }
#name-card .nc-name { font-family: var(--ds-font-kop-v3); font-weight: 800; color: var(--ds-c-ink-bord); text-shadow: var(--ds-misdruk); font-size: clamp(44px, 7vw, 96px); line-height: .9; letter-spacing: 1px; text-transform: uppercase; }
#name-card .nc-name::after { content: ''; display: block; width: 120px; height: 4px; margin-top: 8px; background: var(--ds-c-ink-geel); border: 2px solid var(--ds-c-ink-inkt); box-sizing: border-box; }
#name-card .nc-line { font-family: var(--ds-font-tekst-v3); font-size: clamp(16px, 1.6vw, 22px); margin-top: 6px; max-width: 36ch; color: var(--ds-c-ink-inkt); }
/* #870: op een smalle telefoon schoof de kaart met zijn vaste 340px-reserve
   buiten beeld; hij houdt daar de breedte tussen de randen en een kleinere titel. */
@media (max-width: 700px) {
  #name-card { left: 16px; right: 16px; max-width: calc(100vw - 32px); }
  #name-card .nc-name { font-size: clamp(34px, 10vw, 56px); }
  #name-card .nc-line { font-size: 14px; max-width: none; }
}
`;
  document.head.appendChild(st);
  el = document.createElement('div');
  el.id = 'name-card';
  el.className = 'ds-mi-in';
  el.innerHTML = '<div class="nc-name"></div><div class="nc-line"></div>';
  document.body.appendChild(el);
  return el;
}

// key: a CHARACTERS key. Reports the meeting; the card shows the first time
// (meetHook returns false for someone already met) unless `quiet`, or always with `force`.
export function showNameCard(key, { quiet = false, force = false } = {}) {
  const c = CHARACTERS[key];
  if (!c) return false;
  const fresh = meetHook ? meetHook(key) !== false : true;
  if (quiet || (!fresh && !force) || !ensure()) return true;
  // onder de resultaatkaart of een keuzepaneel wacht de naamkaart (#239), hooguit WAIT_MAX seconden
  const display = () => {
    el.querySelector('.nc-name').textContent = c.name;
    el.querySelector('.nc-line').textContent = c.card;
    el.style.transition = 'none';
    el.classList.remove('on', 'out');
    void el.offsetWidth;
    el.style.transition = '';
    el.classList.add('on');
    clearTimeout(hideT);
    hideT = setTimeout(() => { el.classList.remove('on'); el.classList.add('out'); }, SHOW_S * 1000);
  };
  const tryShow = (left) => {
    if (left > 0 && isOverlayHeld('naamkaart')) { waitT = setTimeout(() => tryShow(left - 1), 300); return; }
    display();
  };
  clearTimeout(waitT);
  tryShow(Math.round(WAIT_MAX / 0.3));
  return true;
}

