// Regie-sjablonen voor cutscenes (#955 #956): benoemde cameravoorstellen op de shotgrammatica van
// cutscript.js (ots, push, insert, cut), zodat een scène schakelt tussen tweeshot, shot-reverse-shot,
// close-up op gezicht of handen, track-in, laag perspectief, insert op een prop, schokkende nadering bij
// schrik, langzame zoom bij emotie en wachten op een reactie. Puur (geen THREE): elke functie geeft een lijst
// shots met een relatieve tijd `dt` in seconden, die de aanroeper op een regel of tijd legt.
//
//   expandTemplate('schrikNadering', { target: 'tessa' })  ->  [{ dt: 0, shot: 'push', ... }]
//   placeTemplate(shots, 'L3+0.2')                          ->  de shots met een echte `t` (cutscript-tijd)
//
// Alle sjablonen volgen de figuren zelf (ots en push lezen hun positie en richting uit de scène), dus ze
// werken op elke plek en voor elke scène zonder maten. De camera blijft 1,5 m van elk figuur (cutscript.js
// CAM_CLEAR): close-ups komen dus van een lange lens (kleine fov), niet van dichtbij.
//
// Samen spelen: alleen data in de scènedefinitie; de gast speelt dezelfde shots met dezelfde scènetijd.

const r2 = (n) => Math.round(n * 100) / 100;
const need = (p, k, name) => { if (!p || typeof p[k] !== 'string') throw new Error(`sjabloon ${name}: ${k} ontbreekt`); return p[k]; };

export const SHOT_TEMPLATES = {
  // twee mensen samen, iets van achteren, heel langzaam dichterbij
  tweeshot: (p) => [{ dt: 0, shot: 'push', target: `mid:${need(p, 'a', 'tweeshot')},${need(p, 'b', 'tweeshot')}@1.3`, face: p.face ?? 180, angle: p.angle ?? 0, d0: p.d0 ?? 3.6, d1: p.d1 ?? 3.1, h0: 1.45, h1: 1.45, fov0: 42, fov1: 40, ease: 'lin' }],
  // schouder-tegenschouder: wie praat is voor de lens, de luisteraar half in beeld ervoor
  shotReverse: (p) => {
    const a = need(p, 'a', 'shotReverse'), b = need(p, 'b', 'shotReverse');
    const beats = Array.isArray(p.beats) && p.beats.length ? p.beats : [0, 2.4, 4.6];
    return beats.map((dt, i) => (i % 2 === 0
      ? { dt, shot: 'ots', from: b, target: a, dist: p.dist ?? 1.7, side: p.side ?? 0.55, fov: 34 }
      : { dt, shot: 'ots', from: a, target: b, dist: p.dist ?? 1.7, side: -(p.side ?? 0.55), fov: 34 }));
  },
  // gezicht vanaf een lange lens, een beetje van opzij, ademt langzaam in
  closeGezicht: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'closeGezicht')}@1.5`, angle: p.angle ?? 45, d0: p.d0 ?? 2.4, d1: p.d1 ?? 2.0, h0: 1.55, h1: 1.52, fov0: p.fov0 ?? 26, fov1: p.fov1 ?? 21, ease: 'lin' }],
  // de handen: laag en nauw, van opzij
  closeHanden: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'closeHanden')}@1.05`, angle: p.angle ?? 35, d0: p.d0 ?? 2.0, d1: p.d1 ?? 1.8, h0: 1.35, h1: 1.3, lookH: 1.05, fov0: 20, fov1: 18, ease: 'lin' }],
  // een voorwerp, strak
  insertProp: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'insertProp')}@0.35`, face: p.face ?? 180, angle: p.angle ?? 25, d0: p.d0 ?? 2.0, d1: p.d1 ?? 1.7, h0: 1.1, h1: 0.95, lookH: p.lookH ?? 0.45, fov0: 24, fov1: 22, ease: 'out' }],
  // langzaam naar iemand toe bij een gevoelig moment
  trackIn: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'trackIn')}@1.4`, angle: p.angle ?? 40, d0: p.d0 ?? 4.6, d1: p.d1 ?? 2.3, h0: 1.55, h1: 1.5, fov0: 38, fov1: 30, ease: 'smooth' }],
  // laag perspectief: iemand groeit boven de camera uit
  lageHoek: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'lageHoek')}@1.35`, angle: p.angle ?? 40, d0: p.d0 ?? 3.2, d1: p.d1 ?? 2.8, h0: 0.35, h1: 0.4, lookH: 1.45, fov0: 40, fov1: 38, ease: 'lin' }],
  // schrik: de camera schiet naar voren (kwadratisch, dus eerst traag en dan hard) met een trilling
  schrikNadering: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'schrikNadering')}@1.5`, angle: p.angle ?? 30, d0: p.d0 ?? 5.0, d1: p.d1 ?? 2.0, h0: 1.5, h1: 1.5, fov0: 44, fov1: 28, ease: 'in', shake: 0.02 }],
  // emotie: de afstand blijft, de lens loopt langzaam dicht
  langzameZoom: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'langzameZoom')}@1.5`, angle: p.angle ?? 50, d0: p.d0 ?? 3.4, d1: p.d1 ?? 3.4, h0: 1.5, h1: 1.5, fov0: p.fov0 ?? 34, fov1: p.fov1 ?? 17, ease: 'lin' }],
  // wachten op een reactie: de luisteraar blijft in beeld, strak en stil, tot hij iets doet
  wachtOpReactie: (p) => [{ dt: 0, shot: 'push', target: `${need(p, 'target', 'wachtOpReactie')}@1.5`, angle: p.angle ?? 45, d0: 3.0, d1: 2.7, h0: 1.5, h1: 1.5, fov0: 26, fov1: 22, ease: 'lin' }],
};
export const TEMPLATE_NAMES = Object.keys(SHOT_TEMPLATES);

export function expandTemplate(name, params = {}) {
  const f = SHOT_TEMPLATES[name];
  if (!f) throw new Error(`onbekend regiesjabloon ${name}`);
  return f(params).map((s) => ({ ...s, dt: r2(s.dt || 0) }));
}

// Een cutscript-tijd plus een verschuiving: 3 -> 3.5, 'L2' -> 'L2+0.5', 'L2+0.4' -> 'L2+0.9'
export function shiftTime(t, dt) {
  const d = r2(dt || 0);
  if (!d) return t;
  if (typeof t === 'number') return r2(t + d);
  const m = /^L(\d+)(?:([+-])(\d+(?:\.\d+)?))?$/.exec(t);
  if (!m) return t;
  const v = r2((m[2] === '-' ? -1 : 1) * (m[3] ? parseFloat(m[3]) : 0) + d);
  return v ? `L${m[1]}${v > 0 ? '+' : '-'}${Math.abs(v)}` : `L${m[1]}`;
}

// De shots van een sjabloon op een tijd gelegd: [{ t, shot, ... }] (zonder dt)
export function placeTemplate(name, params, t) {
  return expandTemplate(name, params).map(({ dt, ...rest }) => ({ t: shiftTime(t, dt), ...rest }));
}
