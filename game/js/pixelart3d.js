import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Shared materials/palette for every procedural model, styled to match the
// real Martinitoren GLB (game/models/): architectural low-poly, faceted PBR,
// earthy Groningen colours, no outlines. The HABBO_* names are kept only so
// existing model files don't all need renaming; the Habbo look is retired.

// --- palette --------------------------------------------------------------
// Real Habbo-style palette: warm wood/furniture browns, bright saturated
// primaries/secondaries, soft pastel accents - flat, no gradients. Every
// world-content file should pull from this instead of inventing new hexes,
// same discipline DESIGN_SYSTEM.md already asks for on the UI side.
export const HABBO_PALETTE = {
  woodDark: 0x5a3d26,
  woodMid: 0x8a6440,
  woodLight: 0xb8956a,
  brickRed: 0x8f4634,     // Groningen red-brown brick
  brickOrange: 0xa9623f,
  roofGreen: 0x5b3a2e,    // dark terracotta roof tiles
  roofBlue: 0x3e4449,     // anthracite roof tiles
  wallCream: 0xd6cab0,
  wallPink: 0xc2a293,
  wallMint: 0xa3b2a0,
  wallYellow: 0xcfb46c,
  skyBlue: 0x8a9ea8,
  grassGreen: 0x5f7d45,
  stoneGrey: 0x9a958a,
  glassBlue: 0x51666f,
  metalGrey: 0x7b7e82,
  black: 0x232323,
  white: 0xe6e1d6,
};
export const HABBO_PALETTE_KEYS = Object.keys(HABBO_PALETTE);

export function randomHabboColor(rng = Math.random) {
  return HABBO_PALETTE[HABBO_PALETTE_KEYS[Math.floor(rng() * HABBO_PALETTE_KEYS.length)]];
}

// --- materials --------------------------------------------------------------
// Faceted, matte PBR like the Martinitoren model. Callers may still pass
// emissive/transparent/side options.
export function habboMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0,
    flatShading: true,
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
// Outlines belonged to the retired Habbo look. Kept switchable; while off,
// callers get an empty node so no duplicate hull mesh is drawn at all.
export const OUTLINES_ENABLED = false;
export function buildOutline(geometry, thickness = 0.02) {
  if (!OUTLINES_ENABLED) return new THREE.Object3D();
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
