import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { setGlowNight } from './countryglow.js';
import { createBrickDetailTexture, createRoofTileTexture } from './pixelart3d.js';

// The facade material of the countryside's churches (countrymodels.js): a
// per-vertex part id says what a face is, so the facade is drawn in metres in
// the fragment shader: brick, window bays whose count follows the wall
// length, and at night a random share of the windows lit.

// part ids (aPart): what a face of a building piece is
export const PART = { plain: 0, wall: 1, roof: 2, ridge: 3, gable: 4, top: 5, silWall: 6, silRoof: 7, churchNave: 8, churchBrick: 11 };
// the roof colours of the part-id shader's silhouette branch
const ROOF_PAL = [0x9a3e2a, 0x3e4246, 0x8a3a28, 0x2e3236, 0xa8502e, 0x3a3e40, 0x4a5a48, 0x6a6e6c];

// the city's brick (0.5 m tile) and pan-tile (1 m) multipliers, sampled
// with metre coordinates
const U = {
  uBNight: { value: 0 },
  uBLit: { value: 0 },
  uBBrick: { value: null },
  uBTile: { value: null },
};
function textures() {
  if (U.uBBrick.value || typeof document === 'undefined') return;
  U.uBBrick.value = createBrickDetailTexture();
  U.uBTile.value = createRoofTileTexture();
}

// Stamp the part id on every vertex of a piece: fn(x, y, z, nx, ny, nz).
export function withParts(geo, fn) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const a = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) a[i] = fn(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i));
  geo.setAttribute('aPart', new THREE.BufferAttribute(a, 1));
  return geo;
}

export function setCountryNight(glow, litFrac) {
  U.uBNight.value = glow;
  U.uBLit.value = litFrac;
  setGlowNight(glow);
}

const VERT_HEAD = /* glsl */`
attribute float aPart;
varying vec3 vBLoc;
varying vec3 vBS;
varying vec3 vBNrm;
varying vec4 vBInfo;
varying float vBPart;
`;

// local metres, scale, part, and the decoded instance code
const VERT_BEGIN = /* glsl */`
vec3 bS = vec3(1.0);
float bIY = 0.0;
#ifdef USE_INSTANCING
bS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
bIY = instanceMatrix[3].y + 0.05;
#endif
float bPart = aPart;
if (bPart > 2.5 && bPart < 3.5) {
  // hip ridge end: pulled in by half the depth (equal pitch all round)
  float ins = min(0.5 * bS.z, 0.47 * bS.x);
  transformed.x = sign(transformed.x) * max(0.03, 0.5 - ins / bS.x);
  bPart = ${PART.roof}.0;
}
vBPart = bPart;
vBLoc = transformed * bS;
vBS = bS;
vBNrm = normal;
float bWallTop = bPart > 3.5 && bPart < 4.5 ? bIY : bPart > 5.5 ? bS.y * 0.55 : bS.y;
// (color_vertex runs before begin_vertex and has set vBInfo.x)
vBInfo.w = bWallTop;
vBInfo.z = 0.0;
#ifdef USE_INSTANCING
vBInfo.z = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
#endif
vBInfo.y = bIY;
`;

const VERT_COLOR = /* glsl */`
vColor = vec3(1.0);
#ifdef USE_COLOR
vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
float bCode = floor(instanceColor.r * 0.5);
vColor *= vec3(instanceColor.r - bCode * 2.0, instanceColor.gb);
vBInfo.x = bCode;
#endif
`;

const FRAG_HEAD = /* glsl */`
uniform float uBNight, uBLit;
uniform sampler2D uBBrick, uBTile;
varying vec3 vBLoc;
varying vec3 vBS;
varying vec3 vBNrm;
varying vec4 vBInfo;
varying float vBPart;
vec3 bGlow = vec3(0.0);
float bRect(vec2 p, vec2 hs, vec2 fw) {
  vec2 a = clamp((hs - abs(p)) / max(fw, vec2(1e-4)) + 0.5, 0.0, 1.0);
  return a.x * a.y;
}
float bHash(vec3 p) { return fract(sin(dot(p, vec3(41.3, 289.1, 17.7))) * 15731.743); }
`;

// after color_fragment: diffuseColor holds tint * vertex colour
const FRAG_FACADE = /* glsl */`
{
  float code = vBInfo.x;
  float style = floor(code / 16.0), door = code - style * 16.0;
  float shop = 0.0;
  if (door > 4.5 && door < 8.5 && vBPart < 6.5) { shop = door - 4.0; door = 0.0; }
  float part = vBPart;
  vec3 n = normalize(vBNrm);
  bool wallish = (part > 0.5 && part < 1.5) || (part > 3.5 && part < 4.5) || (part > 5.5 && part < 6.5);
  if (part > 7.5) {
    // church (countrymodels.js churchGeometry, unit scale): brick, and on
    // the nave's long walls a row of round-arched windows in model metres
    bool xFace = abs(n.x) > abs(n.z);
    float h = vBInfo.y + vBLoc.y;
    diffuseColor.rgb *= texture2D(uBBrick, vec2(xFace ? vBLoc.z + 0.25 : vBLoc.x, h) * 2.0).rgb * 1.1;
    if (part < 10.5) {
      // x0, step, last bay, window bottom, arch spring, half width
      vec4 A = part < 8.5 ? vec4(-5.0, 3.5, 4.0, 2.8) : part < 9.5 ? vec4(-7.0, 3.2, 2.0, 3.5) : vec4(-5.0, 3.0, 4.0, 2.2);
      float spring = part < 8.5 ? 6.4 : part < 9.5 ? 7.7 : 5.4, hw = part < 8.5 ? 0.55 : 0.5;
      vec2 lp = vBLoc.xy / max(vBS.xy, vec2(1e-3));
      float k = clamp(floor((lp.x - A.x) / A.y + 0.5), 0.0, A.z);
      vec2 d = vec2(lp.x - A.x - k * A.y, lp.y);
      vec2 fw = fwidth(lp) * 1.2;
      float body = bRect(vec2(d.x, d.y - (A.w + spring) * 0.5), vec2(hw, (spring - A.w) * 0.5), fw);
      float arch = clamp((hw - length(vec2(d.x, d.y - spring))) / max(fw.x, 1e-4) + 0.5, 0.0, 1.0) * step(spring, d.y);
      float win = max(body, arch);
      float lead = 1.0 - (1.0 - smoothstep(0.03, 0.03 + fw.x, abs(d.x))) * 0.7 * step(A.w + 0.4, d.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.03, 0.04, 0.05), vec3(0.12, 0.15, 0.18), clamp((d.y - A.w) / (spring - A.w), 0.0, 1.0)) * lead, win);
    }
  } else if (wallish && abs(n.y) < 0.5 && style > 0.5 && style < 4.5) {
    bool xFace = abs(n.x) > abs(n.z);
    float face = xFace ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
    float u = xFace ? vBLoc.z : vBLoc.x;
    float L = xFace ? vBS.z : vBS.x;
    float h = vBInfo.y + vBLoc.y;
    float top = vBInfo.w;
#ifndef FACADE_LOW
    if (style < 3.5) diffuseColor.rgb *= texture2D(uBBrick, vec2(u + (xFace ? 0.25 : 0.0), h) * 2.0).rgb * 1.1;
    else diffuseColor.rgb *= 1.0 - 0.07 * smoothstep(0.35, 0.5, abs(fract(u * 1.25) - 0.5));
#endif
    // bay width, window size, storey height, sill: per style
    vec4 S = style < 1.5 ? vec4(2.7, 1.1, 1.35, 2.75) : style < 2.5 ? vec4(3.0, 1.6, 1.45, 3.0) : style < 3.5 ? vec4(5.5, 0.9, 0.6, 99.0) : vec4(9.0, 0.0, 0.0, 99.0);
    float sill = style < 2.5 ? 0.85 : 1.9;
    float nb = max(1.0, floor(L / S.x));
    float bw = L / nb;
    float fu = (u + L * 0.5) / bw;
    float bay = clamp(floor(fu), 0.0, nb - 1.0);
    float lu = (fu - bay - 0.5) * bw;
    float fl = floor(max(h, 0.0) / S.w);
    float lv = h - fl * S.w - sill;
    vec2 fw = vec2(fwidth(u), fwidth(h)) * 1.2;
    float win = 0.0;
    if (part > 3.5 && part < 4.5) {
      // gable: one attic window on the middle bay when there is room
      float ah = top + 0.5;
      bool room = vBS.y > 2.4 && L > 4.0;
      win = room ? bRect(vec2(u, h - ah - 0.45), vec2(0.45, 0.45), fw) : 0.0;
      lv = h - ah;
      fl = 9.0;
      bay = 0.0;
    } else if (style < 3.5) {
      bool fits = fl * S.w + sill + S.z < top - 0.2;
      win = fits ? bRect(vec2(lu, lv - S.z * 0.5), vec2(S.y, S.z) * 0.5, fw) : 0.0;
    }
    // a shopfront covers the middle of the ground floor on its face
    if (face == shop && part < 1.5 && h < 3.7 && abs(u) < min(L - 0.8, 9.0) * 0.5 + 0.3) win = 0.0;
    // the door: middle bay of the street side
    float dm = 0.0;
    if (face == door && part < 1.5) {
      float mid = floor(nb * 0.5);
      float dw = style > 2.5 ? min(3.6, L * 0.3) : 1.0, dh = style > 2.5 ? min(top - 0.4, 3.4) : 2.15;
      float du = (mid + 0.5) * bw - L * 0.5 + (style < 2.5 && nb > 1.5 ? -0.6 : 0.0);
      dm = bRect(vec2(u - du, h - dh * 0.5), vec2(dw, dh) * 0.5, fw);
      if (abs(u - du) < bw * 0.5 + dw * 0.5 && h < dh + 0.3) win *= 1.0 - smoothstep(0.0, 0.5, 1.0 - abs(u - du) / (bw * 0.5 + 0.6));
      vec3 dc = style > 2.5 ? vec3(0.22, 0.23, 0.24) : mix(vec3(0.05, 0.12, 0.08), vec3(0.2, 0.06, 0.05), step(0.5, vBInfo.z));
      diffuseColor.rgb = mix(diffuseColor.rgb, dc, dm);
    }
    if (win > 0.0) {
#ifdef FACADE_LOW
      float frame = 0.0;
#else
      float frame = bRect(vec2(lu, lv - S.z * 0.5), vec2(S.y + 0.16, S.z + 0.16) * 0.5, fw) - win;
      if (part > 3.5) frame = 0.0;
#endif
      vec3 glass = mix(vec3(0.035, 0.045, 0.055), vec3(0.16, 0.2, 0.24), clamp(lv / max(S.z, 0.5), 0.0, 1.0) * 0.8);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.85, 0.8), max(frame, 0.0) * (style < 2.5 ? 1.0 : 0.4));
      diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
      if (uBNight > 0.0) {
        float r = bHash(vec3(bay + face * 37.0, fl, vBInfo.z * 113.0));
        float blur = smoothstep(0.4, 1.2, max(fw.x, fw.y));
        vec3 warm = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.78, 0.5), fract(r * 7.13));
        bGlow = warm * mix(step(r, uBLit), uBLit * 0.35, blur) * win * uBNight * 0.85;
      }
    }
  } else if (part > 1.5 && part < 2.5 && n.y > 0.05) {
    // pitched roof: pan tiles along the ridge, or a corrugated sheet
    bool endFace = abs(n.x) > abs(n.z);
    float ru = endFace ? vBLoc.z : vBLoc.x;
    float rv = (1.0 - vBLoc.y / vBS.y) * length(vec2(vBS.y, (endFace ? vBS.x : vBS.z) * 0.5));
    if (style > 6.5) diffuseColor.rgb *= 1.0 - 0.14 * smoothstep(0.3, 0.5, abs(fract(ru * 5.0) - 0.5));
#ifndef FACADE_LOW
    else diffuseColor.rgb *= texture2D(uBTile, vec2(ru, rv)).rgb * 1.08;
#endif
  } else if (part > 4.5 && part < 5.5 && n.y > 0.5) {
    // flat roof: bitumen with a lighter edge
    float e = min(vBS.x * 0.5 - abs(vBLoc.x), vBS.z * 0.5 - abs(vBLoc.z));
    diffuseColor.rgb = mix(vec3(0.42, 0.42, 0.42), vec3(0.11, 0.11, 0.12), smoothstep(0.25, 0.45, e));
  } else if (part > 6.5) {
    // silhouette roof: its colour from the palette index in the door field
    vec3 rp = door < 0.5 ? vec3(${hex(ROOF_PAL[0])}) : door < 1.5 ? vec3(${hex(ROOF_PAL[1])}) : door < 2.5 ? vec3(${hex(ROOF_PAL[2])}) : door < 3.5 ? vec3(${hex(ROOF_PAL[3])})
      : door < 4.5 ? vec3(${hex(ROOF_PAL[4])}) : door < 5.5 ? vec3(${hex(ROOF_PAL[5])}) : door < 6.5 ? vec3(${hex(ROOF_PAL[6])}) : vec3(${hex(ROOF_PAL[7])});
    diffuseColor.rgb = rp;
  }
}
`;

function hex(c) {
  const col = new THREE.Color(c);
  return `${col.r.toFixed(4)}, ${col.g.toFixed(4)}, ${col.b.toFixed(4)}`;
}

// Patches a vertex-colour material into the facade material; extra(sh) runs
// first (the skyline adds its own vertex pull and haze).
// 'laag': no brick or tile texture and no window frames (two texture reads
// and a box test less per pixel of every Ommeland building)
let facadeLow = false;
const facadeMats = [];
export function setCountryFacadeLevel(level) {
  const low = level === 'laag';
  if (low === facadeLow) return;
  facadeLow = low;
  for (const m of facadeMats) m.needsUpdate = true;
}


