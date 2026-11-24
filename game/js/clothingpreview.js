import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { personProbe, buildPersonMesh, releasePersonGeometry, PERSON_RIG, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { dsWereld } from './worldpalette.js';
import { parsePiece, SLOT_IDS } from './clothingdata.js';
import { outfitToLook } from './clothing.js';

// The preview of ONE piece of clothing (owner 22-11: "I expect a preview of the piece itself per item, not of Tammo").
// The builders in models3d_people.js make a piece as part of one skinned body mesh. Here we build a figure that wears only this piece, read the
// builder's measurement layers (personProbe.layers: which triangles belong to which piece, the same ones the clipping audit uses) and keep only
// the layers of the piece's slot. What is left floats free (hats, shoes, jewellery) or sits on the neutral, matte display form the piece needs:
// torso and arms for a shirt or coat, hips and legs for trousers, a bust for a scarf, bag or necklace, a head for glasses or a beard, a forearm
// for a watch or gloves. A set is a neat arrangement of those separate previews (a grid), never a figure. No face, skin, hair or other piece
// of clothing of a character ends up in a preview.
// Samen spelen: a preview is local and sends nothing. Test: scripts/kledingvoorbeeld_test.mjs.
//
// Specs (vehiclepreview.js buildObject): { kind: 'piece', piece: 'jack.blauw' } | { kind: 'piece', hair: { style, hex, char } } (a hairstyle on a
// neutral head) | { kind: 'pieceset', pieces: [...] } (a set) | { kind: 'piecefig', piece | pieces, look } (shop, owner 22-11: the piece on the left and
// the character wearing it on the right, side by side; `look` is the character's appearance with the piece on).

export const MANNEQUIN = 0xb2ada3; // matte display form: warm grey, readable against every piece colour
const BASE_YAW = -1.55; // the model looks along +x; this turn faces it to the camera (PORTRAIT_ANGLE in vehiclepreview.js)
const YAW = { backpack: Math.PI, shoes: 1.35 }; // extra turn per kind: a backpack shows its back, shoes stand almost in profile
const CELL = 1.1; // distance between the cells of a set (each cell is 1 wide)
const SHOULDER_Y = PERSON_RIG.SHOULDER_Y;

const FACIAL_HAIR = 0x2e1f14; // beard and moustache take the hair colour (dark); the neutral head would swallow them otherwise
const HEAD_LIGHT = 0xd6d1c7; // the head under a beard is lighter than the rest of the form, so stubble shows
const HANDS_CLOSE = 0.12; // the two forearms of a glove pair slide this far towards each other (m), so the pair is larger in frame
const TOP_LAYERS = ['top', 'topdetail', 'collar', 'under', 'lapel', 'hoodbowl', 'hem', 'sleeve', 'cuff', 'armskin', 'hand'];
const BAND_BUCKLE = 0xb8a060; // the gold buckle of the belt under a tucked shirt (buildTorso): belongs to the trousers, not the shirt

// Per slot: which builder layers belong to the piece and which neutral form (if any) it needs. `acc`: a loose mesh (jewellery, watch, gloves).
// form: 'head' (the neutral head), 'bust' (the torso from the chest up), 'forearm' (forearm and hand; `arms` of them).
export const PLAN = {
  hat: { layers: ['hatshell', 'hattrim'] },
  glasses: { layers: ['glasses'], form: 'head' },
  face: { layers: ['facial'], form: 'head' },
  neck: { layers: ['scarf'], form: 'bust' },
  jewel: { acc: true, form: 'bust' },
  top: { layers: TOP_LAYERS },
  outer: { layers: TOP_LAYERS },
  bottom: { layers: ['torsoLow', 'leg', 'hem'] },
  shoes: { layers: ['shoe'] },
  back: { layers: ['bag'], form: 'bust' },
  wrist: { acc: true, form: 'forearm', arms: 1 },
  hands: { acc: true, form: 'forearm', arms: 2 },
  legs: { layers: ['sock'] },        // voetbalkousen (22-11): een kous los, zonder been
  guard: { layers: ['guard'] },      // scheenbeschermers: de plaat los
};
// Layers of the form, and the layers that must NEVER be part of a piece (everything of a character: skin, face, hair)
export const planFor = (item) => (item.kind === 'captain' ? { layers: ['captainband'] } : PLAN[item.slot]); // de aanvoerdersband is een laag van de arm, geen los mesh
export const FORM_LAYERS = { head: ['head'], bust: ['top', 'collar'], forearm: ['armskin', 'hand'] };
export const PERSON_LAYERS = ['head', 'neck', 'face', 'hair', 'facial', 'glasses'];

let material = null;
const mat = () => material || (material = markShared(vcMaterial({ roughness: 0.82 })));

const lin = (hex) => { const c = new THREE.Color(dsWereld(hex)); return [c.r, c.g, c.b].map((v) => Math.round(v * 255)); }; // the builder stores colours as normalised bytes
const near = (c, r, eps = 2) => Math.abs(c[0] - r[0]) < eps && Math.abs(c[1] - r[1]) < eps && Math.abs(c[2] - r[2]) < eps;

// The look this piece is built with: everything neutral except the piece itself.
export function pieceBuild(piece) {
  const x = parsePiece(piece);
  if (!x) return null;
  const slot = x.item.slot;
  const o = outfitToLook({ [slot]: piece }, {});
  const torso = slot === 'top' || slot === 'outer';
  if (slot === 'legs' || slot === 'guard') { o.look.bottom = 'shorts'; o.look.socks = slot === 'guard' ? undefined : o.look.socks; } // kousen en scheenbeschermers hangen aan een broekje (models3d_people.js buildLegs)
  const look = {
    ...o.look, age: 'adult', build: 'avg', heightScale: 1, buildScale: 1, under: MANNEQUIN, umbrella: null, tights: MANNEQUIN, bag: o.look.bag || null,
  };
  const dress = look.top === 'dress' || look.bottom === 'skirt';
  return {
    x, slot,
    shirt: torso ? o.shirt : MANNEQUIN,
    opts: {
      seed: 5.3, variant: dress ? 'female' : 'male', look, hairStyle: 'bald', hair: slot === 'face' ? FACIAL_HAIR : MANNEQUIN,
      pants: slot === 'bottom' ? o.pants : MANNEQUIN, shoes: slot === 'shoes' ? o.shoes : MANNEQUIN, ...(o.cap != null ? { cap: o.cap } : {}), ...(slot === 'top' && o.shirtBands ? { shirtBands: o.shirtBands } : {}),
    },
  };
}

// Builds the figure with measurement layers on and returns its group; the caller reads it and releases it again.
function buildProbe(shirt, opts, skin = MANNEQUIN) {
  const was = personProbe.layers;
  personProbe.layers = true;
  // procedural: true (ADR 0051: de wereld bouwt mensen nu modulair): alleen het procedurele model heeft de meetlagen (personProbe.layers) waaruit het stuk wordt gehaald; zonder deze vlag was het voorbeeld leeg
  try { return buildPersonMesh(shirt, skin, { ...opts, procedural: true }); } finally { personProbe.layers = was; }
}

// Clips a triangle (9 numbers) along the plane y = y0; above = true keeps what lies above it. Returns a list of 0, 1 or 2 triangles (9 numbers each).
function clipTri(t, y0, above) {
  const v = [0, 1, 2].map((k) => [t[k * 3], t[k * 3 + 1], t[k * 3 + 2]]);
  const inside = (q) => (above ? q[1] >= y0 : q[1] <= y0);
  const out = [];
  for (let k = 0; k < 3; k++) {
    const a = v[k], b = v[(k + 1) % 3], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const f = (y0 - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * f, y0, a[2] + (b[2] - a[2]) * f]); }
  }
  if (out.length < 3) return [];
  const tris = [[out[0], out[1], out[2]]];
  if (out.length === 4) tris.push([out[0], out[2], out[3]]);
  return tris.map((q) => q.flat());
}

// The triangles (position and colour per vertex) of the requested layers. keep(name, occurrence, y, colour) may still drop a triangle;
// clip = { above: y } or { below: y }: the edge of a form is cut cleanly instead of ragged.
function takeLayers(geo, names, keep = null, clip = null) {
  const pos = geo.attributes.position.array, col = geo.attributes.color.array, ranges = geo.userData.layers || [];
  const want = new Set(names);
  const seen = {};
  const P = [], C = [];
  for (let i = 0; i < ranges.length - 1; i++) {
    const [a, name] = ranges[i], b = ranges[i + 1][0];
    const occ = seen[name] = (seen[name] === undefined ? 0 : seen[name] + 1);
    if (!want.has(name) || b <= a) continue;
    for (let t = a; t < b; t++) { // the measurement layers count triangles (p.length / 9)
      const o = t * 9, c = [col[o], col[o + 1], col[o + 2]];
      const y = (pos[o + 1] + pos[o + 4] + pos[o + 7]) / 3;
      if (keep && !keep(name, occ, y, c)) continue;
      if (clip) {
        const lo = Math.min(pos[o + 1], pos[o + 4], pos[o + 7]), hi = Math.max(pos[o + 1], pos[o + 4], pos[o + 7]);
        const above = clip.above !== undefined, y0 = above ? clip.above : clip.below;
        if (above ? hi < y0 : lo > y0) continue;
        if (above ? lo < y0 : hi > y0) {
          for (const q of clipTri(Array.from(pos.subarray(o, o + 9)), y0, above)) { for (const k of q) P.push(k); for (let k = 0; k < 3; k++) C.push(c[0], c[1], c[2]); }
          continue;
        }
      }
      for (let k = 0; k < 9; k++) { P.push(pos[o + k]); C.push(col[o + k]); }
    }
  }
  return { P, C };
}

// The loose meshes (necklace, watch, gloves) in model space in the rest pose (as the clipping audit does): group unscaled and all bones straight.
function accessoryTris(group) {
  group.scale.set(1, 1, 1);
  group.traverse((o) => { if (o.isBone) o.rotation.set(0, 0, 0); });
  group.userData.elbowL.rotation.set(0, 0, 0); group.userData.elbowR.rotation.set(0, 0, 0);
  group.updateMatrixWorld(true);
  const P = [], C = [], v = new THREE.Vector3();
  for (const m of group.userData.clothingMeshes || []) {
    const g = m.geometry, p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); P.push(v.x, v.y, v.z); C.push(Math.round(c.getX(i) * 255), Math.round(c.getY(i) * 255), Math.round(c.getZ(i) * 255)); }
  }
  return { P, C };
}

function geometryOf(tris) {
  if (!tris || !tris.P.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.P, 3));
  g.setAttribute('color', new THREE.BufferAttribute(Uint8Array.from(tris.C), 3, true));
  g.computeVertexNormals();
  return g;
}

// The parts of a piece's preview: { garment, form } as triangle lists (form may be null); null for an unknown piece. Only the builder plus filters.
export function pieceParts(piece) {
  const b = pieceBuild(piece);
  if (!b) return null;
  // de aanvoerdersband zit om de bovenarm (een laag van de arm, geen los mesh): hij laat zich los zien als een ring
  const plan = planFor(b.x.item);
  const group = buildProbe(b.shirt, b.opts, b.slot === 'face' ? HEAD_LIGHT : MANNEQUIN);
  try {
    const geo = group.userData.body.geometry;
    const M = lin(MANNEQUIN), gold = lin(BAND_BUCKLE);
    const kind = b.x.item.kind;
    let garment;
    if (plan.acc) garment = accessoryTris(group);
    else {
      const names = [...plan.layers];
      if (b.slot === 'bottom' && kind === 'skirt') names.splice(names.indexOf('leg'), 1); // a skirt stands on its own: no legs under it
      if (b.slot === 'top' && kind === 'dress') names.push('torsoLow');
      // shorts leave the lower legs bare (skin colour of the form): those belong to the leg, not to the trousers
      if (b.slot === 'bottom') garment = takeLayers(geo, names, (n, o, y, c) => !(n === 'leg' && near(c, M)));
      else garment = takeLayers(geo, names, (n, o, y, c) => !near(c, gold));
    }
    // het patroon van een voetbalshirt (strepen, helften, hoepels, kruis) is een eigen laag op de romp (models3d_people.js attachShirtBands): mee in het stuk
    if (b.slot === 'top' && b.opts.shirtBands) {
      group.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      for (const m of group.userData.chest.children) {
        if (!m.userData.kit) continue;
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, p = g.attributes.position, c = lin(m.material.color.getHex());
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); garment.P.push(v.x, v.y, v.z); garment.C.push(c[0], c[1], c[2]); }
      }
    }
    let form = null;
    if (plan.form === 'head') form = takeLayers(geo, FORM_LAYERS.head);
    else if (plan.form === 'bust') form = takeLayers(geo, FORM_LAYERS.bust, null, { above: b.slot === 'back' ? 0.9 : 1.04 });
    else if (plan.form === 'forearm') form = takeLayers(geo, FORM_LAYERS.forearm, (n, o) => o < plan.arms, { below: SHOULDER_Y - 0.43 });
    if (b.slot === 'hands') for (const part of [garment, form]) for (let i = 2; i < part.P.length; i += 3) part.P[i] -= Math.sign(part.P[i]) * Math.min(HANDS_CLOSE, Math.abs(part.P[i]));
    const close = b.slot === 'face' ? { f: 1.5, min: 0.1 } : b.slot === 'jewel' ? { f: 1.3, min: 0.15 } : b.slot === 'wrist' ? { f: 1.35, min: 0.09 } : null;
    return { piece, slot: b.slot, yaw: YAW[kind] ?? (b.slot === 'shoes' ? YAW.shoes : 0), close, garment, form, formLayers: plan.form ? FORM_LAYERS[plan.form] : [], pieceLayers: plan.layers || [] };
  } finally { releasePersonGeometry(group); }
}

// A hairstyle on a neutral head: the head (no face) and the hair layers, in the colour of the style.
export function hairParts(h) {
  const app = h.char === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const look = { ...(app.look || {}), hat: null, hoodUp: false, glasses: false, shades: false, facial: 'none', scarf: false, bag: null, acc: null, age: 'adult', build: 'avg', top: 'tee', bottom: 'jeans', under: MANNEQUIN };
  const group = buildProbe(MANNEQUIN, { ...app, hairStyle: h.style, hair: h.hex != null ? h.hex : app.hair, look });
  try {
    const geo = group.userData.body.geometry;
    return { piece: null, slot: 'hair', garment: takeLayers(geo, ['hair']), form: takeLayers(geo, ['head']), formLayers: ['head'], pieceLayers: ['hair'], close: null };
  } finally { releasePersonGeometry(group); }
}

// A group (turned towards the camera) for one piece: the garment and its form, one mesh per part (userData.role 'garment' or 'form').
function groupOf(parts) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.y = BASE_YAW + (parts.yaw || 0);
  g.add(inner);
  for (const role of ['form', 'garment']) {
    const geo = geometryOf(parts[role]);
    if (!geo) continue;
    const m = new THREE.Mesh(geo, mat());
    m.userData.role = role;
    m.frustumCulled = false;
    inner.add(m);
  }
  return g;
}

// The frame of a preview: the middle of the bounding box and the radius the camera frames. The piece turns about its own middle axis, so its width
// counts as the largest distance to that axis (round) and its height as half the height plus what the camera angle from above adds; that way a long
// piece (trousers) fills the frame in height instead of shrinking to its bounding sphere. Assumes a view at most 1.15 times as wide as high.
export function framing(obj, only = null) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((m) => { if (m.isMesh && (!only || only(m))) box.expandByObject(m); });
  const c = box.getCenter(new THREE.Vector3());
  let rho = 0;
  const v = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isMesh || !m.geometry.attributes.position || (only && !only(m))) return;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); rho = Math.max(rho, Math.hypot(v.x - c.x, v.z - c.z)); }
  });
  const halfH = (box.max.y - box.min.y) / 2;
  return { cx: c.x, cy: c.y, cz: c.z, rho, halfH, r: Math.max(0.03, Math.max((halfH + 0.25 * rho) * 1.04, rho / 1.15)) };
}

// { mesh, body, fit } for vehiclepreview.js buildObject, or null.
export function buildClothingPreview(spec) {
  if (!spec) return null;
  if (spec.kind === 'piece') {
    const parts = spec.hair ? hairParts(spec.hair) : pieceParts(spec.piece);
    if (!parts) return null;
    const body = groupOf(parts);
    const mesh = new THREE.Group();
    mesh.add(body);
    // a small piece on a head (beard, moustache), a necklace or a watch gets a close-up: the garment itself sets the frame, the form runs on past the edges
    const f = parts.close ? framing(body, (m) => m.userData.role === 'garment') : framing(body);
    if (parts.close) f.r = Math.max(parts.close.min, f.r * parts.close.f);
    body.position.set(-f.cx, 0, -f.cz);
    return { mesh, body, fit: { c: new THREE.Vector3(0, f.cy, 0), r: f.r } };
  }
  if (spec.kind === 'pieceset') {
    const list = [...(spec.pieces || [])].filter((p) => parsePiece(p)).sort((a, b) => SLOT_IDS.indexOf(parsePiece(a).item.slot) - SLOT_IDS.indexOf(parsePiece(b).item.slot));
    if (!list.length) return null;
    const n = list.length, cols = n === 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const mesh = new THREE.Group();
    const cells = [];
    list.forEach((p, i) => {
      const parts = pieceParts(p);
      if (!parts) return;
      const body = groupOf(parts);
      // each piece fits a cell of 1 by 1; the position counts after the scale, so the middle lands on the origin of the cell
      const f = framing(body), k = Math.min(0.56 / f.r, 0.5 / Math.max(0.02, f.rho));
      body.scale.setScalar(k);
      body.position.set(-f.cx * k, -f.cy * k, -f.cz * k);
      const cell = new THREE.Group();
      cell.add(body);
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - (rows - 1) * cols : cols, c = i % cols;
      cell.position.set((c - (inRow - 1) / 2) * CELL, ((rows - 1) / 2 - r) * CELL, 0);
      mesh.add(cell);
      cells.push(cell);
    });
    mesh.userData.cells = cells;
    const halfW = ((cols - 1) * CELL) / 2 + 0.56, halfH = ((rows - 1) * CELL) / 2 + 0.56;
    return { mesh, body: null, fit: { c: new THREE.Vector3(0, 0, 0), r: Math.max(halfW, halfH) * 1.02 } };
  }
  if (spec.kind === 'piecefig') return buildPieceAndFigure(spec);
  return null;
}

// The piece (or set) on the left, the character wearing it on the right (owner 22-11). Both turn with the drag. The figure keeps its own size
// (about 1.8 m); the piece is scaled into a cell about as tall as the torso, at the height of the figure's middle, so the two read as a pair.
const FIG_MID = 0.95; // the middle of a figure (vehiclepreview.js uses the same for a person)
const FIG_DX = 0.72;  // distance of each of the two middles to the centre line
const PIECE_CELL = 0.62; // half the size of the cell of the piece
function buildPieceAndFigure(spec) {
  const left = buildClothingPreview(spec.pieces ? { kind: 'pieceset', pieces: spec.pieces } : { kind: 'piece', piece: spec.piece });
  if (!left || !spec.look) return null;
  const person = buildPersonMesh(spec.look.shirt, spec.look.skin, spec.look);
  if (!person) return null;
  const hs = person.scale.y || 1;
  const mesh = new THREE.Group();
  const k = PIECE_CELL / Math.max(0.05, left.fit.r);
  const wrap = new THREE.Group(); // the piece, scaled and set at the height of the figure's middle
  wrap.scale.setScalar(k);
  wrap.position.set(-FIG_DX, FIG_MID * hs - left.fit.c.y * k, 0);
  wrap.add(left.mesh);
  const right = new THREE.Group();
  right.position.set(FIG_DX, 0, 0);
  const inner = new THREE.Group();
  inner.rotation.y = BASE_YAW;
  inner.add(person);
  right.add(inner);
  mesh.add(wrap, right);
  mesh.userData.turn = (angle) => { turnPreview(left.mesh, angle); right.rotation.y = angle; };
  return { mesh, body: person, fit: { c: new THREE.Vector3(0, FIG_MID * hs, 0), r: 1.12 * hs } };
}

// Turns a preview: one piece turns as a whole, a set turns each piece about its own axis (the grid stays put), a piece next to a figure turns both.
export function turnPreview(mesh, angle) {
  if (mesh.userData && mesh.userData.turn) { mesh.userData.turn(angle); return; }
  const cells = mesh.userData && mesh.userData.cells;
  if (cells) { for (const c of cells) c.rotation.y = angle; mesh.rotation.y = 0; } else mesh.rotation.y = angle;
}
