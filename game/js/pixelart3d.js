import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Shared building blocks for the "Habbo Hotel" visual language: flat,
// vibrant, near-unshaded colors, bold black outlines around every major
// shape, and genuine small-canvas pixel-art textures where a surface
// benefits from one (brick, wood grain, roof tile, window glass) - not
// just "chunky low-poly", actual pixelated bitmap art. Every model file
// (buildings/vehicles/people/wildlife) should build its materials/outlines
// through this file so the whole world reads as one consistent style.
// UI/HUD/menus are explicitly NOT part of this - those stay on the
// GTA-poster look in DESIGN_SYSTEM.md.

// --- palette --------------------------------------------------------------
// Real Habbo-style palette: warm wood/furniture browns, bright saturated
// primaries/secondaries, soft pastel accents - flat, no gradients. Every
// world-content file should pull from this instead of inventing new hexes,
// same discipline DESIGN_SYSTEM.md already asks for on the UI side.
export const HABBO_PALETTE = {
  woodDark: 0x8a5a2e,
  woodMid: 0xc9873f,
  woodLight: 0xe0b168,
  brickRed: 0xc9453a,
  brickOrange: 0xe8823a,
  roofGreen: 0x3fa34d,
  roofBlue: 0x3f7fd1,
  wallCream: 0xf0e0b8,
  wallPink: 0xe89ab0,
  wallMint: 0x8fd9c4,
  wallYellow: 0xf0d23f,
  skyBlue: 0x5fc2e8,
  grassGreen: 0x6fc23f,
  stoneGrey: 0xb0aa9a,
  glassBlue: 0x8fd4e8,
  metalGrey: 0x9a9a9a,
  black: 0x1a1a1a,
  white: 0xf5f0e0,
};
export const HABBO_PALETTE_KEYS = Object.keys(HABBO_PALETTE);

export function randomHabboColor(rng = Math.random) {
  return HABBO_PALETTE[HABBO_PALETTE_KEYS[Math.floor(rng() * HABBO_PALETTE_KEYS.length)]];
}

// --- flat/toon shading ------------------------------------------------------
// A 2-step gradient map gives MeshToonMaterial a hard light/shadow split
// instead of a smooth gradient - "minimal/no shading" per the real Habbo
// look, while still reading direction-of-light for depth in a moving 3D
// scene (a fully unlit MeshBasicMaterial reads as flatter but loses that
// cue entirely - use it only for genuinely flat surfaces like signage).
let sharedGradientMap = null;
function getToonGradientMap() {
  if (sharedGradientMap) return sharedGradientMap;
  const data = new Uint8Array([80, 80, 80, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  sharedGradientMap = tex;
  return sharedGradientMap;
}

// The one material factory every model file should use for ordinary flat-
// colored parts (walls, panels, limbs, fur, ...). `color` should usually
// come from HABBO_PALETTE. Never add roughness/metalness-style PBR params
// here - flat toon shading is the whole point.
export function habboMaterial(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getToonGradientMap(),
    ...opts,
  });
}

// Fully flat/unlit variant for things that should never look "lit" at all
// (a painted sign, a flat sticker-like detail).
export function habboFlatMaterial(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

// --- bold black outlines ---------------------------------------------------
// Classic cheap "inverted hull" outline: a slightly-scaled-up duplicate of
// the same geometry, rendered back-face-only in flat black, sitting just
// outside the real mesh so only a thin black rim shows past its silhouette.
// Works on ANY geometry with no shader/post-processing needed - exactly the
// "bold, clear black outlines around major elements" trait real Habbo art
// has. Call this once per mesh/geometry you build (not per frame) and add
// the returned outline mesh as a SIBLING of the real mesh (same parent,
// same transform) - it inherits position/rotation/scale from there on.
// Exported (in addition to buildOutline/habboMesh below) so callers whose
// geometry is NOT centered on its own local origin - e.g. models3d_buildings.js's
// building extrusions, which bake absolute OSM world coordinates directly into
// their vertex positions - can build their own correctly-pivoted outline
// wrapper (scale-from-footprint-center instead of scale-from-world-origin)
// while still sharing this exact one material/singleton, so there is still
// only ever ONE black outline material for the whole game.
export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
export function buildOutline(geometry, thickness = 0.02) {
  const mesh = new THREE.Mesh(geometry, OUTLINE_MAT);
  mesh.scale.setScalar(1 + thickness);
  return mesh;
}

// Convenience: build a real mesh + its outline together and return a Group
// with both, so callers that don't need fine control over the outline can
// just call this once instead of remembering the buildOutline() pairing.
export function habboMesh(geometry, color, opts = {}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, habboMaterial(color, opts));
  group.add(mesh);
  group.add(buildOutline(geometry, opts.outlineThickness ?? 0.02));
  group.userData.mainMesh = mesh;
  return group;
}

// --- genuine pixel-art canvas textures --------------------------------------
// Draws a small, deliberately low-res grid of colors onto an offscreen
// canvas (no anti-aliasing, no smoothing) and returns a THREE.CanvasTexture
// with NearestFilter so it stays crisp/blocky when magnified - REAL pixel
// art, not a blurry scaled-up image. `grid` is a 2D array of palette keys
// (strings from HABBO_PALETTE) or hex numbers; null/undefined cells stay
// transparent. `pixelSize` is how many screen pixels each art-pixel gets
// in the source canvas before Three.js stretches it over the UV - keep
// this small (4-8) since the texture itself is the "pixel", not this.
export function createPixelTexture(grid, opts = {}) {
  const pixelSize = opts.pixelSize ?? 4;
  const rows = grid.length, cols = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * pixelSize;
  canvas.height = rows * pixelSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === null || cell === undefined) continue;
      const hex = typeof cell === 'string' ? HABBO_PALETTE[cell] : cell;
      ctx.fillStyle = '#' + (hex ?? 0).toString(16).padStart(6, '0');
      ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A ready-made small brick-pattern grid generator - common enough (building
// walls) to provide directly rather than every model file rolling its own.
export function createBrickTexture(brickColorKey = 'brickRed', mortarColorKey = 'stoneGrey') {
  const brick = HABBO_PALETTE[brickColorKey];
  const mortar = HABBO_PALETTE[mortarColorKey];
  const rows = 8, cols = 8;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    const offset = (r % 2) * 2;
    for (let c = 0; c < cols; c++) {
      row.push((c + offset) % 4 === 0 ? mortar : brick);
    }
    grid.push(row);
  }
  return createPixelTexture(grid, { pixelSize: 6 });
}

// A simple 2x2 window-pane pixel pattern (dark glass, light frame cross) -
// common enough to share rather than every file re-deriving the pattern.
export function createWindowTexture(glassColorKey = 'glassBlue', frameColorKey = 'white') {
  const glass = HABBO_PALETTE[glassColorKey];
  const frame = HABBO_PALETTE[frameColorKey];
  const grid = [
    [frame, frame, frame, frame, frame, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, frame, frame, frame, frame, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, glass, glass, glass, glass, frame],
    [frame, frame, frame, frame, frame, frame],
  ];
  return createPixelTexture(grid, { pixelSize: 5 });
}
