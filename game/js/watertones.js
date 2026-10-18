// The one source for how the water looks (#87, #181): water3d.js (the polygons'
// mesh near the player, city canals and the tiles' water alike) and the terrain
// shader's far water (countryfield.js, beyond the near mesh) both read their
// tones and timing from here, so the province's water cannot drift away from
// the city's. Pure data, no THREE.

export const WATER_TONES = {
  deep: 0x0b2420,       // the middle of wide water
  shallow: 0x2c4a38,    // by the bank
  duckweed: 0x5d7f2c,   // kroos
  foam: 0xb9c2b0,       // the line at the bank
  opacity: 0.88,        // of the mesh; the fresnel adds up to 0.1
  wave: 0.12,           // swell height (m), rain adds waveRain
  waveRain: 0.08,
  flowRate: 0.05,       // phase speed of the drifting normal map (1/s)
  sheen: [0.21, -0.17], // drift (m/s) of the slow sheen across the surface
  deepFrom: 0.3, deepTo: 9.0, // shore distance (m) over which shallow turns deep
};

// 0xRRGGBB to [r, g, b] in 0..255
export const rgb255 = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

// A tone as the terrain shader's `cLin(r, g, b)` call (sRGB bytes to linear)
export const glslTone = (hex) => `cLin(${rgb255(hex).map((v) => v.toFixed(1)).join(', ')})`;

// The water's surface maths in GLSL, included by the mesh's fragment shader
// (water3d.js) and the terrain shader's far water (countryfield.js), so a
// drifting ripple, the depth and the foam line are the same code in both. The
// quality profile is the WATER_Q define (0 flat, 1 waves and foam, 2 more).
const f3 = (v) => v.toFixed(3);
export const WATER_SHARED_GLSL = `
#ifndef WATER_Q
#define WATER_Q 2
#endif
float wtrHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float wtrNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wtrHash(i), wtrHash(i + vec2(1.0, 0.0)), u.x),
             mix(wtrHash(i + vec2(0.0, 1.0)), wtrHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 wtrRipple(vec2 p, float t, float speed) {
  vec2 cell = floor(p), f = fract(p) - 0.5;
  float h = wtrHash(cell);
  float ti = fract(t * speed + h);
  vec2 d = f - (vec2(wtrHash(cell + 1.7), wtrHash(cell + 5.3)) - 0.5) * 0.5;
  float r = length(d);
  float ring = sin((r - ti * 0.5) * 55.0) * smoothstep(0.12, 0.0, abs(r - ti * 0.5)) * (1.0 - ti);
  return d / max(r, 1e-3) * ring;
}
// shallow to deep by the distance (m) to the bank
float wtrDeep(float edge) { return smoothstep(${f3(WATER_TONES.deepFrom)}, ${f3(WATER_TONES.deepTo)}, edge); }

struct WtrFlow { vec2 drift0; vec2 drift1; float fw; float rq; };
// The surface normal n (up for flat water) with the slow drifting ripples and
// the rain rings; f carries the drift phases on for the foam and the weed.
vec3 wtrNormal(vec3 n, vec2 p, vec2 flow, float t, float rain, out WtrFlow f) {
#if WATER_Q > 0
  float ph0 = fract(t * ${f3(WATER_TONES.flowRate)}), ph1 = fract(t * ${f3(WATER_TONES.flowRate)} + 0.5);
  f.fw = abs(ph0 * 2.0 - 1.0);
  f.drift0 = flow * ph0 * 6.0; f.drift1 = flow * ph1 * 6.0;
  float r0 = wtrNoise((p - f.drift0) * 0.9), r1 = wtrNoise((p - f.drift1) * 0.9 + 17.0);
  f.rq = mix(r0, r1, f.fw);
  float rq2 = wtrNoise((p + vec2(t * 0.21, -t * 0.17)) * 2.3);
  n = normalize(n + vec3(f.rq - 0.5, 0.0, rq2 - 0.5) * 0.035);
  if (rain > 0.01) {
    vec2 rip = wtrRipple(p * 1.4, t, 0.9) + wtrRipple(p * 2.1 + 7.0, t, 1.1);
    n = normalize(n + vec3(rip.x, 0.0, rip.y) * 0.35 * rain);
  }
#else
  n = vec3(0.0, 1.0, 0.0);
  f.fw = 0.0; f.rq = 0.5; f.drift0 = vec2(0.0); f.drift1 = vec2(0.0);
#endif
  return n;
}
// the foam line along the bank (0..1)
float wtrFoam(vec2 p, float edge, WtrFlow f, float t) {
#if WATER_Q > 0
  float fn = wtrNoise(p * 1.1 - f.drift0 * 0.5 + t * 0.15);
  return (1.0 - smoothstep(0.0, 0.45 + 0.5 * fn, edge)) * (0.25 + 0.2 * fn);
#else
  return 0.0;
#endif
}
`;
