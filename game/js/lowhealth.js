// Badly hurt (under a quarter of the health): the edges go red, the colours
// drain, the screen pulses with a heartbeat you can hear, and walking slows.
// No words. It fades out as soon as you are healed (hud_panel.js calls tick).
import { playHeartbeat, playHeavyBreath } from './audio.js';
import { cinematicAllowsDamageFx } from './cinematics.js';
import { hurtLevel, walkFactor, flashFor } from './lowhealthrules.js';

let el = null;
let k = 0;
let beat = 0;
let pulse = 0;
let lastHealth = null;
let flash = 0;      // een korte rode flits na een zware klap, ook als je nog genoeg gezondheid hebt (#436)
let breath = 0;

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
  // een zware klap geeft een rode flits die snel wegtrekt (zonder beeld van geweld: alleen een rand en geluid)
  if (lastHealth != null && allowed) flash = Math.max(flash, flashFor(lastHealth, world.health));
  // een lichte camerashake mee, tenzij een andere klap die net al gaf (scene3d.js leest world.lastImpact)
  if (allowed && lastHealth != null && flashFor(lastHealth, world.health) > 0 && (!world.lastImpact || world.time - world.lastImpact.time > 0.3)) {
    world.lastImpact = { strength: Math.min(0.5, flashFor(lastHealth, world.health)), time: world.time, x: world.player ? world.player.x : 0, y: world.player ? world.player.y : 0 };
  }
  lastHealth = world.health;
  flash = Math.max(0, flash - dt * 2.2);
  k += (target - k) * Math.min(1, dt * (target > k ? 3 : 2.5));
  if (k < 0.01 && !target && flash <= 0.01) {
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
  // zwaar ademen, langzamer dan de hartslag, vanaf het begin van de lage gezondheid
  breath -= dt;
  if (breath <= 0 && target > 0) { breath = 2.6 - 0.8 * k; playHeavyBreath(k); }
  const o = Math.min(1, 0.5 + 0.35 * k + (calm ? 0 : 0.3 * pulse * k));
  el.style.opacity = Math.max(o * Math.min(1, k * 3), flash * (calm ? 0.35 : 0.6)).toFixed(3);
  el.style.setProperty('--lh-sat', (1 - 0.55 * k).toFixed(2));
}
