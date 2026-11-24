import { vcMaterial } from './pixelart3d.js';
import { onSettingsChange } from './settings.js';
import { shaderTable, SHOP_KINDS } from './winkelkit.js';

import { PANE_HOME, PANE_GROUND, PANE_SHOP, PANE_OFFICE, paneUV } from './paneuv.js';

// Window glass with interior mapping: every pane shows a fake room (ray/box
// intersection in pane-local metres) behind fresnel-weighted reflections.
// The pane attribute encoding (paneUV, PANE_*) lives in paneuv.js.
export { PANE_HOME, PANE_GROUND, PANE_SHOP, PANE_OFFICE, paneUV };

// Per winkeltype wand, vloer, producten en meubilair (winkelkit.js, issue #156).
const SHOP_T = shaderTable();
const flat = (rows) => rows.flat();
const uniforms = {
  uShopWall: { value: flat(SHOP_T.wall) },
  uShopFloor: { value: flat(SHOP_T.floor) },
  uShopAccent: { value: flat(SHOP_T.accent) },
  uShopLay: { value: flat(SHOP_T.layout) },
  uShopSty: { value: flat(SHOP_T.stijl) },
  uNightGlow: { value: 0 },
  uLitFrac: { value: 0 },
  uShopFrac: { value: 0 },
  uOfficeFrac: { value: 0 },
  uStorm: { value: 0 },
  uTime: { value: 0 },
  uRoomDepth: { value: 1.0 },
};

// Het glas ligt 1 tot 1,5 cm voor de kozijnplaat erachter (models3d_buildings.js addWindow, shopUV). De kozijnplaat heeft
// polygonOffset -1/-2 (detailMaterial) en trok daardoor het glas weg zodra de dieptestap boven ~5 mm kwam: bij near 0,08 m
// (eerste persoon, cameranear.js) is dat al op ~80 m, bij 0,5 m pas op ~200 m. Het glas krijgt daarom een sterkere offset
// dan het kozijn (-1/-3): het wint van de plaat op elke afstand. Dezelfde programmasleutel (offset is toestand, geen shader).
export const GLASS_OFFSET = { factor: -1, units: -3 };
export const glassMaterial = vcMaterial({ roughness: 0.24, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: GLASS_OFFSET.factor, polygonOffsetUnits: GLASS_OFFSET.units });

let interiorOn = true;
onSettingsChange((st) => {
  const on = st.quality !== 'laag';
  if (on === interiorOn) return;
  interiorOn = on;
  glassMaterial.needsUpdate = true;
});
glassMaterial.customProgramCacheKey = () => (interiorOn ? 'glass-interior' : 'glass-plain');

export function setGlassNight(glow, litFrac, shopFrac, officeFrac = litFrac) {
  uniforms.uNightGlow.value = glow;
  uniforms.uLitFrac.value = litFrac;
  uniforms.uShopFrac.value = shopFrac;
  uniforms.uOfficeFrac.value = officeFrac;
  uniforms.uTime.value = performance.now() / 1000;
  const w = typeof window !== 'undefined' && window.__debug && window.__debug.world && window.__debug.world.weather;
  const storm = w ? Math.min(1, Math.max(0, w.intensity || 0)) : 0;
  uniforms.uStorm.value = storm;
  // modest reflections: mirror-like glass bloomed into glaring sheets of light
  glassMaterial.envMapIntensity = interiorOn ? 0.5 + storm * 0.5 : 0.55;
}


const DECODE = /* glsl */`
varying vec2 vWinUv;
varying vec3 vWPos;
varying vec3 vWNrm;
uniform float uNightGlow, uLitFrac, uShopFrac, uOfficeFrac, uStorm, uTime, uRoomDepth;
uniform vec4 uShopWall[${SHOP_KINDS.length}];
uniform vec4 uShopFloor[${SHOP_KINDS.length}];
uniform vec4 uShopAccent[${SHOP_KINDS.length}];
uniform vec4 uShopLay[${SHOP_KINDS.length}];
uniform vec4 uShopSty[${SHOP_KINDS.length}];

struct IgPane { vec2 p; vec2 size; float K; float kind; float rank; };

IgPane igDecode(vec2 w) {
  IgPane o;
  float fx = floor(w.x);
  o.p.x = (w.x - fx - 0.5) * 8.0;
  o.K = floor((fx + 0.5) / 64.0);
  o.size.x = (fx - o.K * 64.0) * 0.1;
  float fy = floor(w.y);
  o.p.y = (w.y - fy - 0.002) * 4.0;
  float M = -fy;
  o.kind = floor((M - 15.5) / 64.0);
  o.size.y = (M - 16.0 - o.kind * 64.0) * 0.1;
  o.rank = abs(o.kind - 2.0) < 0.5 ? (floor(o.K / 8.0) + 0.5) / 32.0 : (o.K + 0.5) / 256.0;
  return o;
}

vec3 igLampColor(IgPane q) {
  bool shop = abs(q.kind - 2.0) < 0.5;
  vec3 warm = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.76, 0.48), fract(q.rank * 7.13));
  if (q.kind < 1.5 && fract(q.rank * 13.7) > 0.88) warm = vec3(0.5, 0.66, 1.0);
  if (shop) warm = mix(warm, vec3(1.0, 0.92, 0.8), 0.6);
  if (q.kind > 2.5) warm = vec3(0.85, 0.92, 1.0);
  return warm;
}
`;

const INTERIOR = /* glsl */`
// the far rule (#1076): between FAR0 and FAR1 metres the room fades (alpha, not geometry) into one flat tone of the room; beyond
// FAR1 the ray is not cast at all. The perspective of a room that is a few pixels wide only shimmers.
const float IG_FAR0 = 100.0;
const float IG_FAR1 = 150.0;
float igH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

const vec3 IG_WALL[8] = vec3[8](
  vec3(0.93, 0.90, 0.84), vec3(0.90, 0.85, 0.72), vec3(0.95, 0.94, 0.90), vec3(0.64, 0.72, 0.60),
  vec3(0.62, 0.72, 0.80), vec3(0.86, 0.74, 0.68), vec3(0.32, 0.44, 0.36), vec3(0.26, 0.32, 0.44));
const vec3 IG_FABRIC[8] = vec3[8](
  vec3(0.55, 0.14, 0.12), vec3(0.30, 0.40, 0.24), vec3(0.80, 0.72, 0.58), vec3(0.20, 0.25, 0.40),
  vec3(0.78, 0.58, 0.26), vec3(0.50, 0.50, 0.52), vec3(0.62, 0.36, 0.30), vec3(0.24, 0.42, 0.42));
const vec3 IG_WOOD[4] = vec3[4](
  vec3(0.62, 0.44, 0.26), vec3(0.42, 0.28, 0.17), vec3(0.74, 0.60, 0.42), vec3(0.30, 0.20, 0.13));

float igBox(vec3 ro, vec3 ird, vec3 b0, vec3 b1, inout vec3 n) {
  vec3 t0 = (b0 - ro) * ird, t1 = (b1 - ro) * ird;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  if (a > b || a <= 0.0) return 1e9;
  n = a == tn.x ? vec3(-sign(ird.x), 0.0, 0.0) : (a == tn.y ? vec3(0.0, -sign(ird.y), 0.0) : vec3(0.0, 0.0, -sign(ird.z)));
  return a;
}

float igDisc(vec2 p, vec2 r) { return length(p / r); }

// integer hash to [0, 1): the same code as hashU/hash24 in interiorlook.js (epic Interieurs, #1150)
float igHash24(uint x) {
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return float(x >> 8u) / 16777216.0;
}

// Wat er in de ruit staat verschilt per winkeltype (winkelkit.js, STIJL.patroon): schappen,
// broden, koelvitrine, menubord, kledingrekken, fietswielen, bloemen, spiegels, tv's,
// rommel, kaarten en tijdschriften. Op afstand blijft de kleur van het type over.
vec3 igProducts(vec2 c, float detail, float style, int st) {
  vec4 acc = uShopAccent[st];
  int pat = int(uShopSty[st].x + 0.5);
  float rh = 0.3 + 0.35 * uShopWall[st].a + 0.08 * style;
  float itemW = 0.06 + 0.4 * uShopLay[st].w * (0.8 + 0.4 * style);
  vec3 col;
  if (pat == 1) {
    rh = 0.5;
    float row = floor(c.y / rh), fy = fract(c.y / rh);
    float cell = floor(c.x / 0.3 + row * 0.37);
    float h = igH(vec2(cell, row));
    vec2 l = vec2(fract(c.x / 0.3 + row * 0.37) - 0.5, fy - 0.36);
    col = vec3(0.96, 0.9, 0.76);
    if (fy < 0.1) col = vec3(0.55, 0.38, 0.2);
    else if (igDisc(l, vec2(0.44, 0.26)) < 1.0) col = mix(vec3(0.82, 0.5, 0.2), vec3(0.58, 0.32, 0.14), h) * (1.15 - 0.4 * l.y);
    if (fy > 0.1 && h > 0.8 && igDisc(l, vec2(0.44, 0.26)) < 0.7) col = mix(col, vec3(0.9, 0.35, 0.4), 0.6);
  } else if (pat == 2) {
    rh = 0.45;
    float row = floor(c.y / rh), fy = fract(c.y / rh);
    float cell = floor(c.x / 0.3 + row * 0.5);
    float h = igH(vec2(cell, row));
    col = vec3(0.78, 0.88, 0.9);
    if (fy < 0.22) col = mix(vec3(0.72, 0.22, 0.22), vec3(0.93, 0.6, 0.55), h);
    else if (fy > 0.5 && fract(c.x / 0.13 + h) < 0.4) col = vec3(0.58, 0.26, 0.2);
    else if (fy < 0.3) col = vec3(0.95);
  } else if (pat == 3) {
    float row = floor(c.y / 0.16), fy = fract(c.y / 0.16);
    float cell = floor(c.x / 1.1);
    float h = igH(vec2(cell, row));
    col = vec3(0.13, 0.1, 0.1);
    float bar = fract(c.x / 1.1);
    if (c.y > 1.15 && c.y < 1.9 && fract(c.x / 0.55) > 0.1 && fract(c.x / 0.55) < 0.9) col = mix(vec3(0.85, 0.35, 0.18), vec3(0.95, 0.75, 0.25), h);
    else if (fy > 0.25 && fy < 0.7 && bar < 0.15 + 0.6 * h) col = vec3(0.96, 0.82, 0.32);
  } else if (pat == 4) {
    // clothes on a rail: garments with shoulders, flat colours, gaps between them (not a wall of spines)
    float row = floor(c.y / 0.8), fy = fract(c.y / 0.8);
    float u = c.x / 0.26 + row * 0.43;
    float cell = floor(u), fx = fract(u) - 0.5;
    float h = igH(vec2(cell, row));
    col = vec3(0.92, 0.9, 0.94);
    if (fy > 0.9 && fy < 0.95) col = vec3(0.42);
    else if (fy > 0.12 && fy < 0.9 && h > 0.15) {
      // a T-shirt on a hanger: sleeves out at the top, a body below, a notch for the neck
      float halfw = fy > 0.64 ? 0.46 : 0.3;
      if (fy > 0.82 && abs(fx) < 0.09) halfw = 0.0;
      if (abs(fx) < halfw) {
        int pi = int(floor(h * 6.0));
        vec3 cc = pi == 0 ? vec3(0.82, 0.25, 0.3) : (pi == 1 ? vec3(0.2, 0.4, 0.75) : (pi == 2 ? vec3(0.95, 0.8, 0.25) : (pi == 3 ? vec3(0.25, 0.6, 0.4) : (pi == 4 ? vec3(0.55, 0.35, 0.7) : vec3(0.97)))));
        col = mix(cc, acc.rgb, 0.15) * (0.85 + 0.25 * fy);
      }
    }
  } else if (pat == 5) {
    float cell = floor(c.x / 1.1);
    float h = igH(vec2(cell, 4.0));
    vec2 l = vec2(fract(c.x / 1.1) * 1.1, mod(c.y, 1.2));
    col = vec3(0.86, 0.9, 0.94);
    float w1 = abs(length(l - vec2(0.28, 0.4)) - 0.27), w2 = abs(length(l - vec2(0.82, 0.4)) - 0.27);
    if (min(w1, w2) < 0.035) col = vec3(0.1);
    else if (abs(l.y - (0.4 + 0.25 * (l.x - 0.28) / 0.54)) < 0.025 && l.x > 0.28 && l.x < 0.82) col = mix(acc.rgb, vec3(0.8, 0.2, 0.2), h);
    else if (abs(l.y - 0.4) < 0.02 && l.x > 0.28 && l.x < 0.82) col = vec3(0.2);
  } else if (pat == 6) {
    rh = 0.75;
    float row = floor(c.y / rh), fy = fract(c.y / rh);
    float cell = floor(c.x / 0.42 + row * 0.5);
    float h = igH(vec2(cell, row));
    vec2 l = vec2(fract(c.x / 0.42 + row * 0.5) - 0.5, fy);
    col = vec3(0.86, 0.93, 0.82);
    if (fy < 0.3 && abs(l.x) < 0.38) col = vec3(0.55, 0.6, 0.64);
    else if (fy > 0.3 && fy < 0.55 && abs(l.x) < 0.04) col = vec3(0.2, 0.5, 0.22);
    else if (fy >= 0.55 && igDisc(vec2(l.x, fy - 0.7), vec2(0.34 + 0.08 * h, 0.2)) < 1.0) {
      vec3 fl = h < 0.25 ? vec3(0.95, 0.3, 0.5) : (h < 0.5 ? vec3(0.98, 0.85, 0.2) : (h < 0.75 ? vec3(0.95, 0.95, 0.95) : vec3(0.9, 0.2, 0.2)));
      col = fl * (0.85 + 0.3 * fract(h * 40.0));
    }
  } else if (pat == 7) {
    float cell = floor(c.x / 1.2);
    float fx = fract(c.x / 1.2);
    col = vec3(0.86, 0.93, 0.93);
    if (fx > 0.08 && fx < 0.92 && c.y > 0.55 && c.y < 2.0) {
      col = mix(vec3(0.64, 0.78, 0.86), vec3(0.93, 0.97, 1.0), clamp((c.y - 0.5) * 0.5 + 0.25 * fx, 0.0, 1.0));
      if (fx < 0.12 || fx > 0.88 || c.y < 0.6 || c.y > 1.95) col = vec3(0.12);
    } else if (c.y < 0.55 && fract(c.x / 0.2) < 0.5) col = mix(vec3(0.3, 0.6, 0.7), vec3(0.85, 0.5, 0.6), igH(vec2(cell, floor(c.x / 0.2))));
  } else if (pat == 8) {
    float row = floor(c.y / 0.5), fy = fract(c.y / 0.5);
    float cell = floor(c.x / 0.78 + row * 0.5);
    float h = igH(vec2(cell, row));
    float fx = fract(c.x / 0.78 + row * 0.5);
    col = vec3(0.14, 0.15, 0.17);
    if (fx > 0.14 && fx < 0.86 && fy > 0.16 && fy < 0.84) {
      vec3 scr = h < 0.35 ? vec3(0.22, 0.5, 0.98) : (h < 0.65 ? vec3(0.35, 0.82, 0.95) : (h < 0.9 ? vec3(0.9, 0.95, 1.0) : vec3(0.95, 0.55, 0.25)));
      col = scr * (0.75 + 0.45 * fy);
    }
  } else if (pat == 10) {
    float row = floor(c.y / 0.36), fy = fract(c.y / 0.36);
    float cell = floor(c.x / 0.2 + row * 0.41);
    float h = igH(vec2(cell, row));
    float fx = fract(c.x / 0.2 + row * 0.41);
    col = vec3(0.98, 0.95, 0.88);
    if (fx > 0.1 && fx < 0.9 && fy > 0.12 && fy < 0.88) col = 0.3 + 0.7 * vec3(fract(h * 3.7), fract(h * 5.3 + 0.2), fract(h * 9.1 + 0.5));
    if (h > 0.85) col = mix(vec3(0.95), vec3(0.2, 0.35, 0.75), step(0.5, fy));
  } else if (pat == 11) {
    float row = floor(c.y / 0.34), fy = fract(c.y / 0.34);
    float cell = floor(c.x / 0.24 + row * 0.33);
    float h = igH(vec2(cell, row));
    float fx = fract(c.x / 0.24 + row * 0.33);
    col = vec3(0.3);
    if (fx > 0.06 && fx < 0.94 && fy > 0.05) col = fy > 0.65 ? mix(acc.rgb, vec3(0.95, 0.85, 0.2), h) : 0.55 + 0.4 * vec3(fract(h * 3.7), fract(h * 5.3), fract(h * 9.1));
  } else if (pat == 12) {
    // kermiskraam: een gestreepte zeildoek-wand, een rij gloeilampjes, poffertjes (poedersuiker) en suikerspin op de planken
    col = mod(floor(c.x / 0.28), 2.0) < 0.5 ? vec3(0.86, 0.2, 0.16) : vec3(0.97, 0.93, 0.82);
    if (c.y < 1.45) {
      col = c.y < 0.1 ? vec3(0.3, 0.2, 0.12) : vec3(0.47, 0.31, 0.19);
      float row = floor((c.y - 0.1) / 0.67), fy = fract((c.y - 0.1) / 0.67);
      float u = c.x / 0.34 + row * 0.5, cell = floor(u);
      float h = igH(vec2(cell, row + 12.0));
      vec2 l = vec2(fract(u) - 0.5, fy - 0.5);
      if (c.y > 0.1 && row < 0.5 && igDisc(l, vec2(0.4, 0.3)) < 1.0) col = mix(vec3(0.62, 0.36, 0.14), vec3(0.96, 0.93, 0.88), step(0.72, fract(h * 11.0 + l.x * 4.0 + l.y * 3.0)));
      else if (c.y > 0.1 && row > 0.5) {
        if (igDisc(vec2(l.x, l.y - 0.12), vec2(0.4, 0.3)) < 1.0) col = h < 0.5 ? vec3(0.97, 0.56, 0.74) : vec3(0.56, 0.78, 0.97);
        else if (abs(l.x) < 0.035 && l.y < 0.0) col = vec3(0.9, 0.85, 0.7);
      }
    }
    if (length(vec2((fract(c.x / 0.38) - 0.5) * 0.38, c.y - 1.52)) < 0.07) col = vec3(1.0, 0.94, 0.58);
  } else if (pat == 0) {
    // supermarket: crates of fruit down below, packages on the shelves, a red offers banner on top
    if (c.y < 0.45) {
      float u = c.x / 0.5, cell = floor(u), fx = fract(u);
      float h = igH(vec2(cell, 7.0));
      int pi = int(floor(h * 4.0));
      col = vec3(0.45, 0.32, 0.2);
      if (fx > 0.05 && fx < 0.95 && c.y > 0.04) col = pi == 0 ? vec3(0.95, 0.55, 0.12) : (pi == 1 ? vec3(0.3, 0.68, 0.25) : (pi == 2 ? vec3(0.88, 0.2, 0.18) : vec3(0.97, 0.85, 0.2)));
    } else if (c.y > 1.55) {
      float u = c.x / 0.45;
      col = c.y < 1.8 ? (fract(u) < 0.5 ? vec3(0.88, 0.16, 0.14) : vec3(0.98, 0.9, 0.3)) : vec3(0.92, 0.93, 0.9);
      if (c.y < 1.62) col = vec3(0.98);
    } else {
      float row = floor((c.y - 0.45) / 0.42), fy = fract((c.y - 0.45) / 0.42);
      float u = c.x / 0.26 + row * 0.31;
      float cell = floor(u), fx = fract(u);
      float h = igH(vec2(cell, row));
      col = vec3(0.84, 0.85, 0.86);
      if (fy < 0.09) col = vec3(0.96, 0.84, 0.25);
      else if (fx > 0.07 && fx < 0.93 && fy < 0.09 + 0.8 * (0.72 + 0.28 * h)) {
        int pi = int(floor(h * 5.0));
        col = pi == 0 ? vec3(0.85, 0.22, 0.2) : (pi == 1 ? vec3(0.96, 0.8, 0.2) : (pi == 2 ? vec3(0.2, 0.55, 0.3) : (pi == 3 ? vec3(0.95, 0.95, 0.93) : vec3(0.22, 0.42, 0.8))));
        if (fy > 0.3 && fy < 0.55) col = mix(col, vec3(0.97), 0.7);   // a white label on every package
      }
    }
  } else if (pat == 9) {
    // second hand: a wall of odds and ends on shelves: framed pictures, clocks, lamps and vases
    float row = floor(c.y / 0.7), ly = c.y - row * 0.7;
    float u = c.x / 0.55 + row * 0.37, cell = floor(u);
    float lx = (fract(u) - 0.5) * 0.55;
    float h = igH(vec2(cell, row + 3.0));
    col = vec3(0.8, 0.72, 0.58);
    if (ly < 0.06) col = vec3(0.4, 0.28, 0.17);
    else {
      int ty = int(floor(h * 4.0));
      if (ty == 0) {
        if (abs(lx) < 0.2 && ly > 0.18 && ly < 0.62) col = (abs(lx) < 0.16 && ly > 0.22 && ly < 0.58) ? 0.3 + 0.6 * vec3(fract(h * 7.1), fract(h * 3.3), fract(h * 5.7)) : vec3(0.35, 0.22, 0.1);
      } else if (ty == 1) {
        float rr = length(vec2(lx, ly - 0.38));
        if (rr < 0.19) col = rr > 0.15 ? vec3(0.2, 0.15, 0.1) : vec3(0.95, 0.92, 0.8);
      } else if (ty == 2) {
        float hw = mix(0.2, 0.07, clamp((ly - 0.36) / 0.26, 0.0, 1.0));
        if (ly > 0.36 && ly < 0.62 && abs(lx) < hw) col = vec3(0.95, 0.8, 0.4);
        else if (abs(lx) < 0.016 && ly > 0.1 && ly <= 0.36) col = vec3(0.3, 0.25, 0.2);
        else if (ly > 0.06 && ly < 0.12 && abs(lx) < 0.1) col = vec3(0.3, 0.25, 0.2);
      } else {
        float e = length(vec2(lx / 0.11, (ly - 0.24) / 0.17));
        if (e < 1.0 || (abs(lx) < 0.035 && ly > 0.38 && ly < 0.5)) col = mix(vec3(0.2, 0.5, 0.55), vec3(0.75, 0.35, 0.3), step(0.5, fract(h * 9.0)));
      }
    }
  } else {
    // reserve: rijen producten in de kleur van het type
    float row = floor(c.y / rh), fy = fract(c.y / rh);
    float cell = floor(c.x / itemW + row * 0.37);
    float h = igH(vec2(cell, row));
    vec3 prod = 0.35 + 0.6 * vec3(fract(h * 3.7), fract(h * 5.3 + 0.2), fract(h * 9.1 + 0.5));
    prod = mix(prod, acc.rgb * (0.55 + 0.7 * h), acc.a);
    col = fy < 0.1 ? vec3(0.85) : (fy < 0.1 + 0.75 * (0.6 + 0.4 * h) ? prod : vec3(0.3));
  }
  // far away only the type's tone remains
  return mix(mix(vec3(0.4), acc.rgb, 0.45) * 0.9, col, detail);
}

// distance from p to the segment a-b
float igSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }

// a bicycle seen from the side, l in metres from the middle between the axles (wheels 0.6 m); linear colours
vec3 igBike(vec2 l, vec3 frame, vec3 bg) {
  vec3 col = bg;
  vec2 wa = vec2(-0.52, 0.0), wb = vec2(0.52, 0.0), bb = vec2(-0.04, 0.0), seat = vec2(-0.17, 0.43), head = vec2(0.34, 0.43);
  float da = length(l - wa), db = length(l - wb);
  if (abs(da - 0.268) < 0.009 || abs(db - 0.268) < 0.009) col = vec3(0.45);                    // velg
  else if ((da < 0.26 && abs(fract(atan(l.y - wa.y, l.x - wa.x) * 2.546) - 0.5) < 0.04) || (db < 0.26 && abs(fract(atan(l.y, l.x - wb.x) * 2.546) - 0.5) < 0.04)) col = mix(bg, vec3(0.5), 0.6); // spaken
  if (abs(da - 0.3) < 0.03 || abs(db - 0.3) < 0.03) return vec3(0.02);                            // banden
  float f = min(min(igSeg(l, wa, bb), igSeg(l, bb, seat)), min(min(igSeg(l, seat, head), igSeg(l, bb, head)), min(igSeg(l, wa, seat), igSeg(l, head, wb))));
  if (f < 0.022) col = frame;
  if (igSeg(l, vec2(-0.27, 0.51), vec2(-0.07, 0.53)) < 0.03) col = vec3(0.02);                    // zadel
  if (igSeg(l, head, vec2(0.38, 0.6)) < 0.016 || igSeg(l, vec2(0.33, 0.61), vec2(0.5, 0.58)) < 0.018) col = vec3(0.03); // stuur
  if (length(l - bb) < 0.065) col = vec3(0.12);                                                   // trapas
  return col;
}

// A shop wall in bays of 1 to 1.6 m (#1333): per bay a shelving unit, a rail, something hung on the wall, or a bare piece of wall with
// now and then a poster. The bay width, the height of the units and which bays stay bare come from the seed of the building, so every
// shop is furnished differently, and a wall is never one pattern from floor to ceiling. c: (along the wall, height above the floor) in m;
// returns linear albedo.
vec3 igShopWall(vec2 c, vec3 wallC, float detail, float seed, int st, float ceilH) {
  vec4 sty = uShopSty[st];
  int pat = int(sty.x + 0.5);
  vec3 acc = uShopAccent[st].rgb, acc2 = acc * acc;
  if (c.y < 0.1) return wallC * 0.45;                                                           // plint
  if (c.y > ceilH - 0.42 && c.y < ceilH - 0.3) return mix(wallC, acc2, 0.75);                    // fries in de kleur van de winkel
  if (pat == 12) { vec3 pr = igProducts(c, detail, seed, st); return pr * pr; }                  // de kermiskraam is zijn zeildoek
  float bw = (pat == 5 || pat == 8 ? 1.2 : 1.0) + 0.6 * fract(seed * 7.31);
  float u = c.x / bw + seed * 5.3;
  float bay = floor(u), bx = fract(u) * bw;
  float hb = igH(vec2(bay, seed * 17.0 + 3.0)), hc = fract(hb * 13.17), hk = fract(hb * 7.7);
  float edge = min(bx, bw - bx);
  vec3 col = wallC;
  vec3 wood = mix(vec3(0.36, 0.25, 0.15), vec3(0.62, 0.62, 0.6), step(0.5, fract(seed * 3.3))); wood *= wood;
  if (hb < sty.w) {
    // een kaal vak: muur, soms een ingelijste poster in de kleuren van de winkel
    vec2 pd = abs(vec2(bx - bw * 0.5, c.y - 1.55)) - vec2(0.24 + 0.1 * hc, 0.34);
    if (hb < sty.w * 0.5 && max(pd.x, pd.y) < 0.0) col = max(pd.x, pd.y) > -0.03 ? vec3(0.02) : mix(acc2, vec3(0.75, 0.72, 0.65), 0.6 * step(0.5, fract((c.y + bx * (hc - 0.5)) * 2.3)));
    return mix(wallC, col, detail);
  }
  float top = 1.5 + 0.55 * hc;                                                                   // elke kast een eigen hoogte
  if (pat == 5) {
    // fietsenwinkel: een fiets aan een haak (rechtop in een smal vak, liggend in een breed), een rail met banden of een gereedschapswand
    if (hk < 0.6) {
      vec3 fc = mix(acc, mix(vec3(0.75, 0.12, 0.1), vec3(0.1, 0.35, 0.25), step(0.5, hc)), step(0.35, fract(hb * 3.1))); fc *= fc;
      vec2 l = vec2(bx - bw * 0.5, c.y);
      if (bw < 1.55) { l = vec2(c.y - (1.28 + 0.12 * hc), -(bx - bw * 0.5)); if (abs(l.y) < 0.012 && l.x > 0.7) col = vec3(0.1); }   // haak
      else l.y -= 1.45 + 0.2 * hc;
      col = igBike(l, fc, col);
    } else if (hk < 0.8) {
      if (abs(c.y - 1.98) < 0.025 && edge > 0.06) col = vec3(0.15);                              // rail
      // banden naast elkaar aan de rail (een vak per band, geen lus: de glasshader heeft er geen)
      float sw = bw / max(1.0, floor(bw / 0.62)), ti = floor(bx / sw);
      float d = length(vec2(bx - (ti + 0.5) * sw, c.y - 1.66));
      if (abs(d - 0.28) < 0.04) col = vec3(0.03 + 0.03 * fract(ti * 0.37 + hb));
    } else {
      if (edge > 0.1 && c.y > 1.0 && c.y < 1.95) {
        col = vec3(0.55, 0.42, 0.27);
        if (length(fract(vec2(bx, c.y) / 0.06) - 0.5) < 0.14) col = vec3(0.3, 0.22, 0.14);       // gaatjes van de gaatjeswand
        // vier stuks gereedschap op een eigen hoogte en met een eigen scheefstand
        float sw = (bw - 0.2) / 4.0, ti = clamp(floor((bx - 0.1) / sw), 0.0, 3.0), tx = 0.1 + (ti + 0.5) * sw, th = igH(vec2(bay, ti + 9.0));
        if (igSeg(vec2(bx, c.y), vec2(tx, 1.25 + 0.1 * th), vec2(tx + 0.05 * (th - 0.5), 1.7 + 0.15 * th)) < 0.018 + 0.012 * th) col = th < 0.5 ? vec3(0.1) : vec3(0.7, 0.12, 0.08);
        col *= col;
      }
    }
  } else if (pat == 8) {
    // elektronica: een tv per vak aan een beugel, op een eigen hoogte
    float tw = bw - 0.24, th = min(0.8, tw * 0.56), cy = 1.5 + 0.25 * hc;
    vec2 d = abs(vec2(bx - bw * 0.5, c.y - cy)) - vec2(tw, th) * 0.5;
    if (max(d.x, d.y) < 0.0) {
      vec3 scr = hk < 0.35 ? vec3(0.22, 0.5, 0.98) : (hk < 0.65 ? vec3(0.35, 0.82, 0.95) : (hk < 0.9 ? vec3(0.9, 0.85, 0.6) : vec3(0.95, 0.55, 0.25)));
      col = max(d.x, d.y) > -0.03 ? vec3(0.01) : scr * scr * (0.55 + 0.45 * (c.y - cy + th * 0.5) / th);
    }
  } else if (pat == 7) {
    // kapper: per vak een spiegel met lijst en een plankje met flesjes
    vec2 d = abs(vec2(bx - bw * 0.5, c.y - 1.45)) - vec2(bw * 0.5 - 0.15, 0.5);
    if (max(d.x, d.y) < 0.0) col = max(d.x, d.y) > -0.035 ? vec3(0.03) : mix(vec3(0.42, 0.55, 0.6), vec3(0.85, 0.9, 0.92), clamp((c.y - 0.95) * 0.9 + 0.2 * bx, 0.0, 1.0));
    else if (abs(c.y - 0.9) < 0.02 && edge > 0.12) col = vec3(0.8);
    else if (c.y > 0.91 && c.y < 0.91 + 0.09 + 0.06 * fract(floor(bx / 0.09) * 0.37) && edge > 0.15 && fract(bx / 0.09) < 0.6) col = mix(acc2, vec3(0.8, 0.5, 0.6), step(0.5, fract(floor(bx / 0.09) * 0.71)));
  } else if (pat == 4) {
    // kleding: een stang met hangers en kleren eronder, of een kast met gevouwen stapels
    if (hk < 0.65) {
      float rail = 1.72 + 0.1 * hc;
      if (abs(c.y - rail) < 0.018 && edge > 0.05) col = vec3(0.35);
      float gu = bx / 0.17, cell = floor(gu), fx = fract(gu) - 0.5;
      float h = igH(vec2(cell + bay * 17.0, 7.0));
      float fy = (c.y - (rail - 0.85)) / 0.8;
      if (h > 0.15 && fy > 0.0 && fy < 1.0 && edge > 0.1) {
        float halfw = fy > 0.72 ? 0.46 : 0.32;
        if (fy > 0.92 && abs(fx) < 0.08) halfw = 0.0;
        if (abs(fx) < halfw) {
          int pi = int(floor(h * 6.0));
          vec3 cc = pi == 0 ? vec3(0.82, 0.25, 0.3) : (pi == 1 ? vec3(0.2, 0.4, 0.75) : (pi == 2 ? vec3(0.95, 0.8, 0.25) : (pi == 3 ? vec3(0.25, 0.6, 0.4) : (pi == 4 ? vec3(0.55, 0.35, 0.7) : vec3(0.97)))));
          cc = mix(cc, acc, 0.15) * (0.8 + 0.25 * fy);
          col = cc * cc;
        }
      }
    } else if (c.y < top) {
      if (edge < 0.035 || fract(c.y / 0.4) < 0.06) col = wood;
      else if (fract(c.y / 0.4) < 0.45 && fract(bx / 0.32) > 0.1) { float h = igH(vec2(floor(bx / 0.32) + bay * 9.0, floor(c.y / 0.4))); vec3 cc = mix(vec3(0.2, 0.3, 0.55), vec3(0.85, 0.8, 0.7), h); col = cc * cc * (0.85 + 0.15 * step(0.5, fract(c.y / 0.08))); }
    }
  } else if (pat == 3) {
    // snackbar: wandtegels tot schouderhoogte en per vak een menubord
    if (c.y < 1.35) col = (fract(bx / 0.15) < 0.04 || fract(c.y / 0.15) < 0.04) ? vec3(0.55) : vec3(0.88, 0.86, 0.8);
    vec2 d = abs(vec2(bx - bw * 0.5, c.y - 1.8)) - vec2(bw * 0.5 - 0.08, 0.3);
    if (max(d.x, d.y) < 0.0) {
      col = vec3(0.015);
      float row = floor((c.y - 1.5) / 0.1), lx = bx - 0.12;
      if (fract((c.y - 1.5) / 0.1) > 0.3 && fract((c.y - 1.5) / 0.1) < 0.7 && lx > 0.0 && lx < (bw - 0.4) * (0.5 + 0.5 * igH(vec2(bay, row)))) col = vec3(0.9, 0.7, 0.12);
      if (bx > bw - 0.42 && bx < bw - 0.14 && c.y > 1.6 && c.y < 2.0) col = vec3(0.8, 0.35, 0.1);
    }
  } else {
    // a shelving unit: uprights, a top board, the goods of the shop on the shelves, and a plinth
    if (c.y > top + 0.04) return col;
    if (c.y > top || edge < 0.035 || c.y < 0.18) col = wood * (c.y < 0.18 ? 0.6 : 1.0);
    else { vec3 pr = igProducts(c, detail, seed, st); col = pr * pr * (0.7 + 0.3 * smoothstep(0.035, 0.22, edge)); }
  }
  return mix(wallC, col, detail);
}

// The front of the furniture against the back wall (winkelkit.js STIJL.kast): a shelving unit with goods, a refrigerated counter,
// a fryer, a workbench, a dressing table or a display case; c in m from the box's left bottom corner; linear albedo.
vec3 igShopUnit(vec2 c, float kw, float kh, float detail, float seed, int st) {
  int pat = int(uShopSty[st].x + 0.5);
  vec3 acc = uShopAccent[st].rgb;
  vec3 wood = mix(vec3(0.36, 0.25, 0.15), vec3(0.62, 0.62, 0.6), step(0.5, fract(seed * 3.3))); wood *= wood;
  float bx = fract(c.x / 1.0), edge = min(bx, 1.0 - bx);
  vec3 col;
  if (pat == 2) {
    // koeltoonbank: een stalen voet, daarboven glas met het vlees erachter
    col = c.y < 0.55 ? vec3(0.72, 0.73, 0.74) : igProducts(c * vec2(1.0, 1.0) + vec2(3.0, -0.55), detail, seed, st);
    if (c.y > 0.55 && c.y < 0.6) col = vec3(0.3);
    col *= col;
  } else if (pat == 3) {
    col = vec3(0.6, 0.61, 0.62);                                                                  // frituurkast in rvs
    if (abs(fract(c.x / 0.6) - 0.5) > 0.48 || abs(c.y - kh + 0.12) < 0.02) col = vec3(0.25);
    col *= col;
  } else if (pat == 5) {
    col = c.y > kh - 0.06 ? vec3(0.55, 0.4, 0.24) : vec3(0.18, 0.2, 0.22);                       // werkbank: houten blad, ladekast
    if (c.y < kh - 0.06 && (fract(c.y / 0.21) < 0.05 || abs(fract(c.x / 0.5) - 0.5) > 0.47)) col = vec3(0.08);
    if (c.y < kh - 0.06 && abs(fract(c.y / 0.21) - 0.5) < 0.04 && abs(fract(c.x / 0.5) - 0.5) < 0.1) col = vec3(0.7);
    col *= col;
  } else if (pat == 7) {
    col = vec3(0.92, 0.92, 0.9);                                                                  // kaptafel met kastjes
    if (abs(fract(c.x / 0.45) - 0.5) > 0.47 || c.y > kh - 0.04) col = mix(acc, vec3(0.3), 0.4);
    col *= col;
  } else if (pat == 8) {
    // vitrine: donkere voet, een glazen bovenkant met telefoons erin
    col = vec3(0.1);
    if (c.y > kh - 0.4 && c.y < kh - 0.05) {
      col = vec3(0.55, 0.62, 0.66);
      vec2 p = vec2(fract(c.x / 0.22), (c.y - kh + 0.4) / 0.35);
      if (p.x > 0.3 && p.x < 0.7 && p.y > 0.25 && p.y < 0.85) col = igH(vec2(floor(c.x / 0.22), 4.0)) < 0.5 ? vec3(0.05) : vec3(0.3, 0.55, 0.9);
    }
    col *= col;
  } else {
    // schappen: staanders per meter, een bovenblad en de waar van de winkel
    if (c.y > kh - 0.04 || edge < 0.025 || c.y < 0.15) col = wood * (c.y < 0.15 ? 0.6 : 1.0);
    else { vec3 pr = igProducts(c + vec2(seed * 7.0, 0.0), detail, seed, st); col = pr * pr * (0.72 + 0.28 * smoothstep(0.025, 0.2, edge)); }
  }
  return col;
}

vec3 igInterior(IgPane q, vec3 N, vec3 V, float dist, out float fres) {
  bool ground = abs(q.kind - 1.0) < 0.5, shop = abs(q.kind - 2.0) < 0.5, office = q.kind > 2.5;
  float W = max(q.size.x, 0.05), H = max(q.size.y, 0.05);
  float s1 = igHash24(uint((q.K * 8.0 + q.kind) * 977.0 + 0.5) + uint(W * 10.0 + 0.5) * 61u + uint(H * 10.0 + 0.5)); // the palette seed: an integer hash, so interiorlook.js (the room you walk into) picks the same
  float s2 = fract(s1 * 13.37 + 0.21), s3 = fract(s1 * 71.93 + 0.47), s4 = fract(s1 * 31.17 + 0.83), s5 = fract(s1 * 5.71 + 0.13);

  // N is the outward geometry normal as the vertex gives it: the pane's x in the uv is tied to it, so the frame T must not turn
  // with the pixel's side (it did when N was flipped towards the camera: a mirrored room on a back-face pixel)
  vec3 T = length(N.xz) > 1e-3 ? normalize(vec3(N.z, 0.0, -N.x)) : vec3(1.0, 0.0, 0.0);
  float igSide = dot(N, V) > 0.0 ? -1.0 : 1.0;
  vec3 rd = vec3(dot(V, T), V.y, -dot(V, N) * igSide);
  // sign-preserving epsilon: 1/rd must stay finite (inf * 0 = NaN in the box tests)
  if (abs(rd.x) < 1e-4) rd.x = rd.x < 0.0 ? -1e-4 : 1e-4;
  if (abs(rd.y) < 1e-4) rd.y = rd.y < 0.0 ? -1e-4 : 1e-4;
  rd.z = max(rd.z, 1e-3);
  fres = 0.04 + 0.96 * pow(clamp(1.0 - rd.z, 0.0, 1.0), 5.0);
  vec3 ro = vec3(q.p, 0.0);
  vec3 ird = 1.0 / rd;

  float night = clamp(uNightGlow / 1.5, 0.0, 1.0);
  float lit = step(q.rank, shop ? uShopFrac : office ? uOfficeFrac : uLitFrac) * (shop ? mix(0.5, 1.0, night) : night);
  vec3 lampCol = igLampColor(q);
  float lampI = lit * (shop ? 1.3 : office ? 1.0 : 0.8) * mix(0.8, 1.05, fract(q.rank * 3.3));
  // TV glow: a slow, gentle drift - fast flicker read as flashing lights
  if (!shop && !office && fract(q.rank * 13.7) > 0.88) lampI *= 0.7 + 0.1 * sin(uTime * 1.7 + q.rank * 60.0) * sin(uTime * 0.6 + q.rank * 11.0);
  float dayI = pow(1.0 - night, 3.0) * (1.0 - 0.5 * uStorm);
  const vec3 DAY = vec3(1.0, 0.96, 0.9);
  float detail = smoothstep(90.0, 30.0, dist);

  int st = int(mod(floor(q.K / 8.0), ${SHOP_KINDS.length}.0));
  vec3 wallC = shop ? uShopWall[st].rgb : office ? vec3(0.88, 0.89, 0.9) : IG_WALL[int(s1 * 7.99)];
  wallC *= wallC;

  float shopStyle = igH(vec2(floor(q.K / 8.0), 3.7));
  // #1333: the furnishing seed of this building's shop (type level, pane number with a per-building start, pane size)
  float pand = fract(shopStyle * 3.17 + s1 * 0.731);
  float RW = W + (shop ? 2.4 : 1.3);
  float fY = shop ? -0.45 : ground ? -0.55 : -0.85;
  float cY = max(fY + (office ? 2.9 : 2.75), H + 0.3);
  float D = clamp((shop ? 1.7 : 1.1) * uRoomDepth * RW, 2.0, 5.5);

  // far: the tone of the room's back wall under the same light (no ray, no furniture, no pattern): the same on every pixel of a pane
  float igFar = smoothstep(IG_FAR0, IG_FAR1, dist);
  vec3 flatCol = vec3(0.0);
  if (igFar > 0.0) {
    vec3 tone = mix(vec3(0.4), uShopAccent[st].rgb, 0.45) * 0.9;
    vec3 fp = vec3(0.0, fY + 1.3, D);
    vec3 fL = vec3(0.0, cY - 0.35, D * 0.45) - fp;
    float fd2 = dot(fL, fL);
    vec3 fE = lampCol * lampI * (0.1 + 0.6 * max(fL.z * -inversesqrt(max(fd2, 1e-4)), 0.0) / (1.0 + fd2 * 0.35));
    fE += DAY * dayI * (0.12 + 0.5 * exp(-D * 0.5)) * 0.8;
    fE += vec3(0.003, 0.0035, 0.005) + vec3(0.030, 0.032, 0.045) * night * (1.0 - lit) * (0.45 + 0.55 * exp(-D * 0.6));
    flatCol = (shop ? tone * tone : wallC) * fE * 0.75 + lampCol * lampI * 0.12;
    if (igFar >= 1.0) return flatCol;
  }
  vec3 b0 = vec3(-RW * 0.5, fY, 0.0), b1 = vec3(RW * 0.5, cY, D);
  vec3 tb = (mix(b0, b1, step(0.0, rd)) - ro) * ird;
  float t = min(tb.x, min(tb.y, tb.z));
  vec3 n = t == tb.z ? vec3(0.0, 0.0, -1.0) : (t == tb.y ? vec3(0.0, -sign(rd.y), 0.0) : vec3(-sign(rd.x), 0.0, 0.0));

  // furniture: up to two boxes per room
  int ft = shop ? 10 : office ? 11 : int(s2 * 4.99);
  if (ft == 3 && ground) ft = 0;
  float cx = (s3 - 0.5) * max(0.0, RW - 2.2);
  vec3 a0 = vec3(0.0), a1 = vec3(0.0), c0 = vec3(0.0), c1 = vec3(0.0);
  vec3 k0 = vec3(0.0, cY + 5.0, 0.0), k1 = vec3(0.1, cY + 5.1, 0.1);
  if (ft == 0) { a0 = vec3(cx - 0.95, fY, D - 0.95); a1 = vec3(cx + 0.95, fY + 0.45, D); c0 = vec3(cx - 0.95, fY, D - 0.3); c1 = vec3(cx + 0.95, fY + 0.92, D); }
  else if (ft == 1) { a0 = vec3(cx - 0.6, fY, D - 0.35); a1 = vec3(cx + 0.6, fY + 2.0, D); }
  else if (ft == 2) { a0 = vec3(cx - 0.7, fY, D - 0.5); a1 = vec3(cx + 0.7, fY + 0.85, D); }
  else if (ft == 3) { float sx = s5 < 0.5 ? -1.0 : 1.0; a0 = vec3(sx * RW * 0.5 - 0.8, fY, D - 2.0); a1 = vec3(sx * RW * 0.5 + 0.8, fY + 0.5, D); c0 = vec3(sx * RW * 0.5 - 0.8, fY, D - 0.1); c1 = vec3(sx * RW * 0.5 + 0.8, fY + 1.0, D); }
  else if (ft == 10) {
    vec4 lay = uShopLay[st], sty = uShopSty[st];
    // the furniture against the back wall (#1333, winkelkit.js STIJL.kast): a part of the wall, its width and place per building
    if (sty.y > 0.05) {
      float kw = RW * (0.45 + 0.35 * fract(pand * 5.7));
      float kx = (fract(pand * 9.1) - 0.5) * (RW - kw);
      k0 = vec3(kx - kw * 0.5, fY, D - sty.z); k1 = vec3(kx + kw * 0.5, fY + sty.y, D);
    }
    float iw = min(lay.x, RW - 0.8) * 0.5;
    float iz = min(D * 0.55, D - sty.z - 1.2);
    if (iw > 0.1 && iz > 1.35) { a0 = vec3(cx - iw, fY, iz); a1 = vec3(cx + iw, fY + lay.y, iz + 0.6); }
    else { a0 = vec3(0.0, cY + 5.0, 0.0); a1 = vec3(0.1, cY + 5.1, 0.1); }
    c0 = vec3(-cx - 0.6, fY, 0.5); c1 = vec3(-cx + 0.6, fY + lay.z * 0.75, 1.2);
  }
  else if (ft == 11) { a0 = vec3(cx - 0.8, fY + 0.7, D * 0.45); a1 = vec3(cx + 0.8, fY + 0.76, D * 0.45 + 0.8); c0 = vec3(cx - 0.75, fY, D * 0.45 + 0.7); c1 = vec3(cx + 0.75, fY + 0.72, D * 0.45 + 0.8); }
  int hitF = 0;
  vec3 fn = n;
  if (ft != 4) {
    float ta = igBox(ro, ird, a0, a1, fn);
    if (ta < t) { t = ta; n = fn; hitF = 1; }
    float tc = igBox(ro, ird, c0, c1, fn);
    if (tc < t) { t = tc; n = fn; hitF = 2; }
    if (ft == 10) { float tk = igBox(ro, ird, k0, k1, fn); if (tk < t) { t = tk; n = fn; hitF = 3; } }
  }
  vec3 hp = ro + rd * t;

  vec3 alb;
  vec3 emit = vec3(0.0);
  if (hitF > 0) {
    vec3 fab = IG_FABRIC[int(s4 * 7.99)]; fab *= fab;
    vec3 wood = IG_WOOD[int(s5 * 3.99)]; wood *= wood;
    if (ft == 0) alb = fab;
    else if (ft == 1) {
      alb = wood;
      if (n.z < -0.5) {
        float fyr = fract((hp.y - fY) / 0.4);
        float bk = igH(vec2(floor(hp.x / 0.045), floor((hp.y - fY) / 0.4)));
        vec3 book = 0.2 + 0.5 * vec3(fract(bk * 3.1), fract(bk * 7.3), fract(bk * 5.7));
        alb = fyr < 0.1 ? wood : mix(vec3(0.3), book * book, detail) * step(0.25 * bk, 1.0 - fyr);
      }
    }
    else if (ft == 2) alb = wood * (n.z < -0.5 && fract((hp.y - fY) / 0.28) < 0.06 ? 0.5 : 1.0);
    else if (ft == 3) alb = hitF == 1 ? (n.y > 0.5 ? vec3(0.8, 0.8, 0.82) : fab) : wood;
    else if (ft == 10 && hitF == 3) {
      // the back-wall furniture: its front shows what the shop has, the top is a worktop or the top shelf, the sides a panel
      float kh = k1.y - k0.y;
      int kp = int(uShopSty[st].x + 0.5);
      if (n.z < -0.5) alb = igShopUnit(vec2(hp.x - k0.x, hp.y - fY), k1.x - k0.x, kh, detail, pand, st);
      else if (n.y > 0.5) {
        vec3 tp = kp == 2 || kp == 3 ? vec3(0.7, 0.71, 0.72) : (kp == 5 ? vec3(0.55, 0.4, 0.24) : (kp == 7 ? vec3(0.9) : (kp == 8 ? vec3(0.15) : igProducts(hp.xz * 2.0, detail, pand, st))));
        alb = tp * tp;
      } else alb = (kp == 5 || kp == 8 ? vec3(0.03) : vec3(0.25, 0.2, 0.15));
    }
    else if (ft == 10) alb = hitF == 1 ? (n.y > 0.5 ? mix(vec3(0.5), uShopAccent[st].rgb, 0.5) : uShopAccent[st].rgb * vec3(0.25, 0.27, 0.3)) : (n.y > 0.5 ? igProducts(hp.xz * 2.0, detail, shopStyle, st) : vec3(0.74, 0.67, 0.59));
    else if (ft == 11) alb = hitF == 1 ? vec3(0.6, 0.6, 0.62) : vec3(0.18);
    if (ft == 10 && hitF == 2 && n.y > 0.5) alb *= alb;
    alb *= n.y > 0.5 ? 1.0 : (abs(n.x) > 0.5 ? 0.75 : 0.88);
  } else if (n.z < -0.5) {
    alb = wallC;
    vec2 c = vec2(hp.x, hp.y - fY);
    if (shop) alb = igShopWall(c + vec2(10.0, 0.0), wallC, detail, pand, st, cY - fY);
    else if (!office) {
      vec2 pc = vec2((s4 - 0.5) * RW * 0.5, 1.55);
      vec2 d = abs(c - pc) - vec2(0.3 + 0.2 * s2, 0.24);
      if (max(d.x, d.y) < 0.0) {
        vec3 art = mix(IG_FABRIC[int(s3 * 7.99)], IG_WALL[int(s5 * 7.99)], smoothstep(-0.2, 0.2, c.y - pc.y + (c.x - pc.x) * (s2 - 0.5)));
        alb = max(d.x, d.y) > -0.04 ? (s5 < 0.5 ? vec3(0.03) : vec3(0.35, 0.25, 0.08)) : art * art;
      }
    } else if (abs(c.x) < 0.9 && abs(c.y - 1.5) < 0.5) alb = vec3(0.85);
  } else if (abs(n.x) > 0.5) {
    alb = wallC * 0.95;
    vec2 c = vec2(hp.z, hp.y - fY);
    if (shop) alb = igShopWall(c + vec2(hp.x > 0.0 ? 31.0 : 57.0, 0.0), wallC, detail, fract(pand + (hp.x > 0.0 ? 0.37 : 0.71)), st, cY - fY);
    else if (sign(hp.x) == (s5 < 0.5 ? 1.0 : -1.0) && abs(c.x - D * 0.62) < 0.45 && c.y < 2.05) alb = s3 < 0.5 ? vec3(0.8, 0.79, 0.76) : vec3(0.05);
  } else if (n.y > 0.5) {
    if (shop) {
      vec4 fl = uShopFloor[st];
      float ch = mod(floor(hp.x * 2.0) + floor(hp.z * 2.0), 2.0);
      float big = mod(floor(hp.x * 0.8) + floor(hp.z * 0.8), 2.0);
      alb = fl.rgb * (fl.a < 0.5 ? 0.9 : (fl.a < 1.5 ? (ch < 1.0 ? 1.0 : 0.62) : (big < 1.0 ? 1.0 : 0.85)));
    }
    else if (office) alb = vec3(0.22, 0.24, 0.26);
    else if (s3 < 0.22) alb = IG_FABRIC[int(s2 * 7.99)] * 0.8;
    else {
      vec3 wood = IG_WOOD[int(s3 * 3.99)];
      float bi = floor(hp.x / 0.16);
      float bz = floor(hp.z / 1.6 + igH(vec2(bi, 1.0)));
      float gx = fract(hp.x / 0.16);
      alb = wood * mix(1.0, (0.78 + 0.35 * igH(vec2(bi, bz))) * (gx < 0.06 ? 0.6 : 1.0), detail);
    }
    if (!shop && !office && s4 > 0.45) {
      vec2 r = abs(hp.xz - vec2(cx, D * 0.5)) - vec2(0.9, 0.7);
      if (max(r.x, r.y) < 0.0) alb = IG_FABRIC[int(s4 * 7.99)] * (max(r.x, r.y) > -0.08 ? 0.7 : 1.0);
    }
    alb *= alb;
  } else {
    alb = vec3(0.86);
    vec2 lp = hp.xz - vec2(0.0, D * 0.45);
    if (shop) emit += lampCol * lampI * 1.2 * step(fract(hp.z / 1.4), 0.14) * step(abs(hp.x), RW * 0.3);
    else if (office) emit += lampCol * lampI * 1.0 * step(abs(fract(hp.z / 1.2) - 0.5), 0.2) * step(abs(fract(hp.x / 1.2 + 0.5) - 0.5), 0.2);
    else emit += lampCol * lampI * (1.5 * smoothstep(0.17, 0.12, length(lp)) + 0.35 * exp(-dot(lp, lp) * 3.0));
  }

  vec3 lampP = vec3(0.0, cY - 0.35, D * 0.45);
  vec3 L = lampP - hp;
  float d2 = dot(L, L);
  float ndl = max(dot(n, L * inversesqrt(max(d2, 1e-4))), 0.0);
  vec3 E = lampCol * lampI * (0.1 + 0.6 * ndl / (1.0 + d2 * 0.35));
  E += DAY * dayI * (0.12 + 0.5 * exp(-hp.z * 0.5)) * (0.8 + 0.2 * n.y);
  // unlit rooms at night still catch street and moon light near the window
  E += vec3(0.003, 0.0035, 0.005) + vec3(0.030, 0.032, 0.045) * night * (1.0 - lit) * (0.45 + 0.55 * exp(-hp.z * 0.6));
  vec3 dd = min(hp - b0, b1 - hp) + abs(n) * 10.0;
  float ao = hitF > 0 ? 0.85 : 0.5 + 0.5 * smoothstep(0.0, 0.7, min(dd.x, min(dd.y, dd.z)));
  if (hitF == 0 && n.y > 0.5 && ft == 10) {
    // contact shadow on the shop floor under the furniture
    vec2 fk = max(max(k0.xz - hp.xz, hp.xz - k1.xz), 0.0), fa = max(max(a0.xz - hp.xz, hp.xz - a1.xz), 0.0), fc = max(max(c0.xz - hp.xz, hp.xz - c1.xz), 0.0);
    ao *= 0.6 + 0.4 * smoothstep(0.0, 0.3, min(length(fk), min(length(fa), length(fc))));
  }
  if (hitF == 0 && n.y > 0.5 && ft != 4 && ft < 10) {
    vec3 m0 = a0, m1 = a1;
    if (ft == 0 || ft == 3) { m0 = min(a0, c0); m1 = max(a1, c1); }
    vec2 fd = max(max(m0.xz - hp.xz, hp.xz - m1.xz), 0.0);
    ao *= 0.55 + 0.45 * smoothstep(0.0, 0.35, length(fd));
  }
  vec3 col = alb * E * ao + emit;

  if (!shop) {
    float tc = 0.06 / rd.z;
    vec2 pc = ro.xy + rd.xy * tc;
    float xn = pc.x / W + 0.5, yn = pc.y / H;
    vec3 frontLit = DAY * dayI * 0.32 + vec3(0.004);
    if (office) {
      if (s5 < 0.45 && yn > 1.0 - (0.3 + 0.6 * s3)) {
        vec3 bl = vec3(0.7, 0.72, 0.72) * (0.75 + 0.25 * step(0.3, fract(pc.y * 18.0)) * detail + 0.25 * (1.0 - detail));
        col = bl * (frontLit + lampCol * lampI * 0.35);
      }
    } else {
      float style = s5;
      float cw = style < 0.4 ? 0.1 + 0.22 * s3 : (style < 0.5 ? 0.47 : 0.0);
      if (cw > 0.0 && (xn < cw || xn > 1.0 - cw)) {
        vec3 cc = IG_FABRIC[int(fract(s2 * 5.3) * 7.99)];
        float fold = mix(0.85, 0.7 + 0.3 * sin(pc.x * 38.0), detail);
        col = cc * cc * fold * (frontLit + lampCol * lampI * 0.5);
      } else if (style >= 0.5 && style < 0.64 && yn > 1.0 - (0.2 + 0.55 * s3)) {
        vec3 bc = s4 < 0.5 ? vec3(0.82, 0.78, 0.68) : vec3(0.55, 0.58, 0.6);
        float edge = step(yn, 1.0 - (0.2 + 0.55 * s3) + 0.025);
        col = bc * bc * (1.0 - 0.7 * edge) * (frontLit + lampCol * lampI * 0.6);
      } else if (ground && s4 < 0.7) {
        float vh = (s4 < 0.3 ? 1.02 : 0.55) - 0.03 * abs(sin(xn * W * 10.0));
        if (yn < vh) {
          float lace = 0.5 + 0.5 * sin(pc.x * 95.0) * sin(pc.y * 95.0 + sin(pc.x * 20.0) * 2.0);
          float a = mix(0.72, mix(0.55, 0.9, lace), detail);
          vec3 vc = vec3(0.86, 0.84, 0.8) * (frontLit * 1.3 + lampCol * lampI * 0.55);
          col = mix(col, vc, a);
        }
      }
    }
  }
  return igFar > 0.0 ? mix(col, flatCol, igFar) : col;
}
`;

glassMaterial.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vWinUv;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWinUv = uv;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = mat3(modelMatrix) * objectNormal;');
  shader.fragmentShader = (interiorOn ? '#define INTERIOR_GLASS\n' : '') + shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${DECODE}\n#ifdef INTERIOR_GLASS\n${INTERIOR}\n#endif`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      if (vWinUv.y < -10.0) {
        IgPane q = igDecode(vWinUv);
      #ifdef INTERIOR_GLASS
        vec3 igV = vWPos - cameraPosition;
        float igDist = length(igV);
        igV /= max(igDist, 1e-4);
        // geometry normal, not pixel derivatives: those degenerate to zero at
        // edges and the resulting NaN spread through bloom into black screens
        vec3 igN = vWNrm;
        if (dot(igN, igN) < 1e-8) igN = vec3(0.0, 0.0, 1.0);
        igN = normalize(igN);
        float igF;
        vec3 igCol = igInterior(q, igN, igV, max(igDist, 1e-3), igF);
        if (any(isnan(igCol)) || any(isinf(igCol)) || isnan(igF)) { igCol = vec3(0.02); igF = 0.2; }
        igCol = clamp(igCol, 0.0, 4.0);
        igF = clamp(igF, 0.0, 1.0);
        // capped so a lit room glows instead of blooming into a white blotch
        totalEmissiveRadiance += min(igCol, vec3(1.1)) * (1.0 - igF) * 0.85 + igF * vec3(0.02, 0.026, 0.04) * clamp(uNightGlow, 0.0, 1.0);
        diffuseColor.rgb *= 0.12;
        metalnessFactor = 0.0;
        roughnessFactor = 0.22;
      #else
        if (uNightGlow > 0.0) {
          bool shop = abs(q.kind - 2.0) < 0.5;
          float on = step(q.rank, shop ? uShopFrac : (q.kind > 2.5 ? uOfficeFrac : uLitFrac));
          float v = clamp(q.p.y / max(q.size.y, 0.1), 0.0, 1.0);
          totalEmissiveRadiance += igLampColor(q) * on * uNightGlow * mix(0.7, 1.0, v) * (shop ? 1.5 : 1.0);
        }
      #endif
      }`);
};
