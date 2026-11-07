// #720: één standaard voor activiteitenscènes. De kleine set pieces die geen
// eigen regie hadden, krijgen een korte onthulling (3-5 s) met dezelfde
// vlaggen, skip-ervaring en opruiming als de dorpsuitjes (dorpsuitjes.js
// `scene()`). Geen nieuwe scènetaal: dit is playCinematic met één standaard.
import { playCinematic } from './cinematics.js';

// Bouwt de standaard-cinematic. `lines` is [{ speaker, text }] of [who, text].
export function uitjeScene(w, {
  id, title, kicker = '', lines = [], duration = 4, shot, hide = false,
  priority = 2, cardFor = 2.2, onStart = null, onEnd = null,
} = {}) {
  if (!w || typeof shot !== 'function') return false;
  const L = (lines || []).map((l) => (Array.isArray(l) ? { speaker: l[0], text: l[1] } : l)).filter((l) => l && l.text);
  return playCinematic({
    id, priority, duration, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker, title, cardFor, lines: L, shot,
    onStart() {
      if (hide) { w.cinematicHidePlayers = true; w.cinematicHideNav = true; }
      if (onStart) onStart();
    },
    onEnd(skipped, replaced) {
      if (hide) { w.cinematicHidePlayers = false; w.cinematicHideNav = false; }
      w.cameraOverride = null;
      if (onEnd) onEnd(skipped, replaced);
    },
  });
}

// Een korte onthulling van een activiteit: één rustige orbit om het hart van
// de plek, met dezelfde titel/kaart als het activiteitenbord.
export function onthullingScene(w, {
  id, title, kicker, x, y, height = 8, radius = 24, duration = 3.6,
  lines = [], onEnd = null,
} = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const a0 = Math.PI * 0.75;
  const shot = (u) => {
    const a = a0 + u * Math.PI * 0.8;
    return {
      position: { x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius, z: height + u * 2 },
      lookAt: { x, y, z: 2.2 },
      fov: 50,
    };
  };
  return uitjeScene(w, { id, title, kicker, lines, duration, shot, hide: true, onEnd });
}
