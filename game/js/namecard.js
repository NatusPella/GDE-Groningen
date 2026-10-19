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
#name-card { position: fixed; left: max(6vw, calc(340px * var(--ui, 1) + 24px)); bottom: calc(11vh + 9vh); z-index: 17; pointer-events: none; color: #f0ede4;
  opacity: 0; transform: translateX(-28px); transition: opacity .35s, transform .6s cubic-bezier(.2,.7,.2,1); text-shadow: 0 2px 12px rgba(0,0,0,.85); }
#name-card.on { opacity: 1; transform: none; }
#name-card .nc-name { font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: clamp(44px, 7vw, 96px); line-height: .9; letter-spacing: 1px; text-transform: uppercase; }
#name-card .nc-name::after { content: ''; display: block; width: 120px; height: 4px; margin-top: 8px; background: linear-gradient(90deg, #1e9e56, #3fc97a); box-shadow: 0 0 14px rgba(63,201,122,.45); }
#name-card .nc-line { font-family: 'Arial Narrow', Arial, sans-serif; font-size: clamp(16px, 1.6vw, 22px); margin-top: 6px; max-width: 36ch; color: rgba(240,237,228,.92); }
`;
  document.head.appendChild(st);
  el = document.createElement('div');
  el.id = 'name-card';
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
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    clearTimeout(hideT);
    hideT = setTimeout(() => el.classList.remove('on'), SHOW_S * 1000);
  };
  const tryShow = (left) => {
    if (left > 0 && isOverlayHeld('naamkaart')) { waitT = setTimeout(() => tryShow(left - 1), 300); return; }
    display();
  };
  clearTimeout(waitT);
  tryShow(Math.round(WAIT_MAX / 0.3));
  return true;
}

