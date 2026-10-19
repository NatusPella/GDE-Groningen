// Heli-missie (#166), pure HUD-logica: de ringteller en de landingshulp. Zonder
// THREE en DOM; helirun.js zet de uitkomst in het HUD. Landingsgrenzen komen
// overeen met heliflight.js (LAND_VZ 4,5 m/s zakken, LAND_H 7 m/s horizontaal).
// Tests: scripts/heligrade_test.mjs.

const LAND = { vz: 4.5, hs: 7, hoverVz: 2.5, slow: 3 };

// st: de runstaat (ring, ringsHit, ringsMissed), total: aantal ringen.
export function ringCounter(st, total) {
  const done = st.ringsHit + st.ringsMissed;
  const next = Math.min(total, done + 1);
  return { hit: st.ringsHit, missed: st.ringsMissed, total, next, finished: done >= total, text: done >= total ? `${st.ringsHit}/${total} ringen` : `ring ${next}/${total} · ${st.ringsHit} door` };
}

// v: { x, y, z, vx, vy, vz, onGround }, pad: { x, y, r, deck }
// Geeft de stand van de landing: afstand tot het midden, hoogte boven het dek,
// snelheden en één regel advies.
export function landingGuide(v, pad) {
  const dist = Math.hypot(pad.x - v.x, pad.y - v.y);
  const alt = Math.max(0, v.z - pad.deck);
  const hs = Math.hypot(v.vx || 0, v.vy || 0);
  const vs = -(v.vz || 0);
  const r = pad.r || 6;
  const inCircle = dist <= r;
  let state, text;
  if (v.onGround) { state = 'geland'; text = inCircle ? 'Geland' : 'Geland naast de H'; }
  else if (dist > r * 4) { state = 'nader'; text = 'Vlieg naar de H'; }
  else if (!inCircle) { state = 'uitlijnen'; text = hs > LAND.slow ? 'Boven de H, rustig aan' : 'Naar het midden van de H'; }
  else if (hs > LAND.hs) { state = 'te snel'; text = 'Te snel: laat W los, rem met S'; }
  else if (alt > 12) { state = 'zakken'; text = 'Zak rustig door'; }
  else if (vs > LAND.vz) { state = 'te hard'; text = 'Te hard zakken: minder dalen'; }
  else { state = 'goed'; text = 'Zo is het goed: rustig zakken'; }
  return { state, text, dist, alt, hs, vs, inCircle, ok: state === 'goed' || state === 'zakken' };
}

// kleur van de landingscirkel op de grond bij de stand van de landing
export function guideColor(state) {
  if (state === 'goed' || state === 'geland') return 0x5dff7a;
  if (state === 'te snel' || state === 'te hard') return 0xff5a3c;
  return 0xffc21a;
}
