// Badly hurt (under a quarter of the health): the edges go red, the colours
// drain, the screen pulses with a heartbeat you can hear, and walking slows.
// No words. It fades out as soon as you are healed (hud_panel.js calls tick).
import { playHeartbeat } from './audio.js';
import { cinematicAllowsDamageFx } from './cinematics.js';

const LOW_HEALTH = 25;
// the share of the normal walking pace left at the very lowest health
const SLOWEST = 0.7;

let el = null;
let k = 0;
let beat = 0;
let pulse = 0;

// 0 at the threshold and above, 1 at (almost) dead
function hurtLevel(health) {
  if (!(health > 0) || health >= LOW_HEALTH) return 0;
  return Math.min(1, 1 - health / LOW_HEALTH);
}

function walkFactor(health) {
  return 1 - (1 - SLOWEST) * hurtLevel(health);
}

function ensure() {
  if (el || typeof document === 'undefined') return el;
  const st = document.createElement('style');
  st.textContent = `
#low-health { position: fixed; inset: 0; z-index: 9; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse at center, rgba(120, 0, 0, 0) 38%, rgba(120, 0, 0, 0.55) 78%, rgba(70, 0, 0, 0.85) 100%);
  -webkit-backdrop-filter: saturate(var(--lh-sat, 1)); backdrop-filter: saturate(var(--lh-sat, 1)); }
`;
  document.head.appendChild(st);
  el = document.createElement('div');
  el.id = 'low-health';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

// player.js reads world.hurtWalk
export function tickLowHealth(dt, world) {
  const allowed = cinematicAllowsDamageFx() && !world.uiPaused && !document.body.classList.contains('intro-montage');
  const target = allowed ? hurtLevel(world.health) : 0;
  world.hurtWalk = walkFactor(world.health);
  k += (target - k) * Math.min(1, dt * (target > k ? 3 : 2.5));
  if (k < 0.01 && !target) {
    k = 0;
    if (el && el.style.opacity !== '0') el.style.opacity = '0';
    beat = 0;
    return;
  }
  if (!ensure()) return;
  const calm = document.documentElement.classList.contains('reduce-motion');
  // the closer to death, the faster the heart
  const period = 1 - 0.45 * k;
  beat -= dt;
  if (beat <= 0 && target > 0) {
    beat = period;
    pulse = 1;
    playHeartbeat(k);
  }
  pulse = Math.max(0, pulse - dt * 3);
  const o = Math.min(1, 0.5 + 0.35 * k + (calm ? 0 : 0.3 * pulse * k));
  el.style.opacity = (o * Math.min(1, k * 3)).toFixed(3);
  el.style.setProperty('--lh-sat', (1 - 0.55 * k).toFixed(2));
}
