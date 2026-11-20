// "Echt binnen" voor de binnensets van missiestappen (#956, ontwerp: docs/BINNENSETS-21-11.md). Puur en zonder three,
// zodat scripts/binnenset_test.mjs het zonder spel kan keuren. Eén mechanisme voor alle kamers van stagesets.js
// (kantoor, serverkamer, loket, omakeuken en de kamers van roomspec.js: kroeg, woonkamer, garage, kruitkelder):
//   1. de maten van de kamer (SET_DIMS) en zijn voetafdruk;
//   2. de wereld blijft erbuiten: een clearzone (clearzone.js) om voetafdruk + 2 m jaagt voetgangers, verkeer en losse props weg;
//   3. de camera blijft erbinnen: een vaste kamercamera (cameraOverride) onder het plafond, nooit buiten de wanden, met een
//      lichte inzoom en geen pan (de eigenaar: te veel pannende shots, soms het dak in beeld);
//   4. de plek 'binnen' wordt onthouden (chain.binnen) en hersteld na laden, herstart of een checkpoint.
import { ROOMS, ROOM_KINDS } from './roomspec.js';

// Maten (m) van de handgebouwde kamers; de tests houden ze gelijk aan office3d.js, loket3d.js en omakeuken3d.js.
const HAND = {
  kantoor: { w: 7.8, d: 5.6, h: 2.9 },
  serverkamer: { w: 11, d: 6.4, h: 2.9 },
  loket: { w: 12, d: 7.4, h: 3.0 },
  omakeuken: { w: 8.4, d: 6.0, h: 2.8 },
};
export const SET_DIMS = { ...HAND, ...Object.fromEntries(ROOM_KINDS.map((k) => [k, { w: ROOMS[k].w, d: ROOMS[k].d, h: ROOMS[k].h }])) };

export const WALL_MARGIN = 0.45;       // m: de camera blijft zo ver van een wand
export const CEIL_MARGIN = 0.3;        // m: en zo ver onder het plafond (nooit het dak in beeld)
export const PROP_MARGIN = 2;          // m: rond de voetafdruk blijft de wereld leeg
export const CAM_BACK = 3.2;           // m: de kamercamera staat zo ver achter de speler (minder als de wand dichterbij is)
export const CAM_HEIGHT = 1.75;        // m boven de vloer
export const CAM_FOV_FROM = 64;
export const CAM_FOV_TO = 56;          // een lichte inzoom
export const CAM_ZOOM_S = 40;          // s waarover hij inzoomt

const num = (n) => typeof n === 'number' && Number.isFinite(n);
export const isSetKind = (kind) => !!SET_DIMS[kind];

// Voetafdruk van de kamer: het midden is layout.x/y (waar stagesets.js hem neerzet).
export function setFootprint(kind, layout) {
  const d = SET_DIMS[kind];
  if (!d || !layout || !num(layout.x) || !num(layout.y)) return null;
  return { cx: layout.x, cy: layout.y, hw: d.w / 2, hd: d.d / 2, h: d.h, r: Math.hypot(d.w / 2, d.d / 2) };
}

// Ligt (x, y) binnen de voetafdruk plus `margin`?
export function inFootprint(fp, x, y, margin = 0) {
  return !!fp && Math.abs(x - fp.cx) <= fp.hw + margin && Math.abs(y - fp.cy) <= fp.hd + margin;
}

// De clearzone van een set: een cirkel om het midden die de hele voetafdruk plus PROP_MARGIN dekt (clearzone.js kent punten met
// een straal; twee gelijke punten geven een zone van één punt).
export function setClearZone(kind, layout) {
  const fp = setFootprint(kind, layout);
  if (!fp) return null;
  return { id: 'binnenset', pts: [[fp.cx, fp.cy], [fp.cx, fp.cy]], r: fp.r + PROP_MARGIN, closed: false };
}

// Welke kamers dit gesloten krijgen: allemaal. Een serverkamer-stap zonder hold laat de speler vrij lopen; de kamercamera
// hoort alleen bij een stap waarin de speler op zijn plek blijft (hold), anders staat hij buiten beeld.
export const hasRoomCamera = (kind, layout) => isSetKind(kind) && !!(layout && layout.hold);

// De kamercamera op tijd t (s sinds de set bestaat): achter de speler, onder het plafond, kijkend naar het voorste deel van de
// kamer (+u: het bureau, de balie, het fornuis). `base` is de vloerhoogte. Altijd binnen de wanden (WALL_MARGIN) en onder het
// plafond (CEIL_MARGIN). Een harde snee (cut): geen pan.
export function roomCameraPose(kind, layout, base = 0, t = 0) {
  const fp = setFootprint(kind, layout);
  if (!fp || !layout.hold || !num(base)) return null;
  const hx = layout.hold.x, hy = layout.hold.y;
  const minX = fp.cx - fp.hw + WALL_MARGIN, maxX = fp.cx + fp.hw - WALL_MARGIN;
  const minY = fp.cy - fp.hd + WALL_MARGIN, maxY = fp.cy + fp.hd - WALL_MARGIN;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // een schouder opzij: de speler staat niet midden in beeld, en de blik loopt langs hem de kamer in
  const px = clamp(hx - CAM_BACK, minX, maxX);
  const py = clamp(hy + 0.7, minY, maxY);
  const pz = Math.min(base + CAM_HEIGHT, base + fp.h - CEIL_MARGIN);
  const lx = clamp(hx + 3, minX, maxX), ly = clamp(hy - 0.2, minY, maxY), lz = base + 1.25;
  const k = Math.min(1, Math.max(0, t / CAM_ZOOM_S));
  return {
    position: { x: px, y: py, z: pz }, lookAt: { x: lx, y: ly, z: lz },
    fov: CAM_FOV_FROM + (CAM_FOV_TO - CAM_FOV_FROM) * k, cut: true, bron: 'binnenset',
  };
}

// Staat de camera binnen de kamer (voor de tests en voor elke shot die een kamer ankert)?
export function cameraInside(kind, layout, base, pos) {
  const fp = setFootprint(kind, layout);
  if (!fp || !pos) return false;
  return Math.abs(pos.x - fp.cx) <= fp.hw - WALL_MARGIN + 1e-9 && Math.abs(pos.y - fp.cy) <= fp.hd - WALL_MARGIN + 1e-9
    && pos.z >= base + 0.3 - 1e-9 && pos.z <= base + fp.h - CEIL_MARGIN + 1e-9;
}

// De clamp voor een filmcamera in de kamer (cutscript env.clamp): binnen de wanden en onder het plafond, voor elke kamer gelijk.
export function setCameraClamp(kind, at) {
  const d = SET_DIMS[kind];
  if (!d || !at) return null;
  const base = at.z || 0;
  return (x, y, z, soort) => (soort === 'camera' ? {
    x: Math.max(at.x - (d.w / 2 - WALL_MARGIN), Math.min(at.x + (d.w / 2 - WALL_MARGIN), x)),
    y: Math.max(at.y - (d.d / 2 - WALL_MARGIN), Math.min(at.y + (d.d / 2 - WALL_MARGIN), y)),
    z: Math.max(base + 0.3, Math.min(base + d.h - CEIL_MARGIN, z)),
  } : null);
}

// De plek voor een set: eerst de plek van de speler, past de kamer daar niet (gebouw, water, onbekende grond), dan op ringen
// eromheen (6 tot 48 m). `fits(x, y)` zegt of de kamer daar past. De speler wordt daarheen gezet (de hold van de set houdt hem
// er) zodat een stap die binnen hoort nooit buiten blijft spelen. null als er niets past.
export const SPOT_RINGS = [0, 6, 12, 20, 32, 48];
export function findSetSpot(x, y, fits) {
  if (!num(x) || !num(y) || typeof fits !== 'function') return null;
  for (const r of SPOT_RINGS) {
    const n = r === 0 ? 1 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (fits(px, py)) return { x: px, y: py, moved: r };
    }
  }
  return null;
}

// De plek 'binnen' voor missiestaat en save: de kamer en waar de speler stond (JSON-veilig, alleen getallen en tekst).
export function binnenStaat(kind, variant, layout) {
  if (!isSetKind(kind) || !layout || !layout.hold || !num(layout.hold.x) || !num(layout.hold.y)) return null;
  return { kind, variant: variant || null, x: layout.hold.x, y: layout.hold.y };
}

// Na laden, herstart of een checkpoint: staat de speler niet meer in de kamer van deze stap, dan komt hij terug op de binnenplek.
// Geeft de plek om naartoe te zetten, of null als hij er al is (of er geen binnenplek bekend is voor deze kamer).
export function binnenHerstel(binnen, kind, player) {
  if (!binnen || binnen.kind !== kind || !player || !num(player.x) || !num(player.y)) return null;
  if (!num(binnen.x) || !num(binnen.y)) return null;
  const d = SET_DIMS[kind];
  const buiten = Math.abs(player.x - binnen.x) > d.w / 2 || Math.abs(player.y - binnen.y) > d.d / 2;
  return buiten ? { x: binnen.x, y: binnen.y } : null;
}
