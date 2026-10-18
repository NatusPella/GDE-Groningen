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
