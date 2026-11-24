// De palen van Bezit in de wereld (epic #1095, #1100): een paal met een bord (naam en stand, zeefdrukstijl) op het binnenpunt van je percelen en een bord met "Van jou" op je
// panden; een medespeler krijgt zijn kleur en naam. Alles MeshBasic, geen licht en geen nieuwe shader; de borden delen hun materialen per tekst, en wat wegvalt wordt netjes
// opgeruimd (geometrie en materiaal vrijgegeven). De planning (bezitmarker.js) is puur; dit bestand is alleen de THREE-kant en wordt elke 0,5 s getikt, niet elk beeld.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { plainBack } from './canvastex.js';
import { getScene } from './scene3d.js';
import { getBezit, getIndexNow, parcelOffer } from './bezitlive.js';
import { planMarkers, diffMarkers, applyDiff, needsReplan, bezitVersion, planOutlines, outlineSegments } from './bezitmarker.js';
import { hoofdspeler } from './players.js';
import { INK } from './mapstyle.js';

const POST = new THREE.CylinderGeometry(0.07, 0.09, 3.0, 5);
const POST_MAT = new THREE.MeshBasicMaterial({ color: 0x3a2f22 });
const BOARD = new THREE.PlaneGeometry(2.6, 1.05);
const texCache = new Map();
const matCache = new Map();
const TEX_MAX = 120;

const hex = (c) => (typeof c === 'string' ? c : '#3fc97a');
// Het bord als canvas: donkere plaat, rand in de kleur van de stand, naam en stand in crème. Per tekst één keer gemaakt en gedeeld.
function boardMaterial(m) {
  const key = `${m.label}|${m.sub}|${m.state}|${m.color || ''}`;
  let mat = matCache.get(key);
  if (mat) return mat;
  if (typeof document === 'undefined') return new THREE.MeshBasicMaterial({ color: 0x14301f });
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 104;
  const g = cv.getContext('2d');
  const edge = m.state === 'claimed' ? hex(m.color || INK.amber) : INK.greenLight;
  g.fillStyle = INK.dark; g.fillRect(0, 0, 256, 104);
  g.lineWidth = 6; g.strokeStyle = edge; g.setLineDash(m.state === 'claimed' ? [14, 8] : []); g.strokeRect(5, 5, 246, 94);
  g.setLineDash([]); g.fillStyle = INK.cream; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 22px system-ui, sans-serif'; g.fillText(String(m.label).slice(0, 22), 128, 38);
  g.font = '500 18px system-ui, sans-serif'; g.fillStyle = edge; g.fillText(String(m.sub).slice(0, 26), 128, 72);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  mat = plainBack(new THREE.MeshBasicMaterial({ map: tex })); // hertest 24-11: de achterkant is een effen bordrug, geen spiegelschrift (canvastex.js plainBack)
  if (matCache.size >= TEX_MAX) { const old = matCache.keys().next().value; const o = matCache.get(old); if (o.map) o.map.dispose(); o.dispose(); matCache.delete(old); }
  matCache.set(key, mat);
  return mat;
}

const S = { groups: new Map(), sig: new Map(), last: null, t: 0, lines: new Map(), lsig: new Map() };
const LINE_MATS = new Map();   // één materiaal per kleur: de lijnen delen het (de geometrie is per lijn en gaat bij het weghalen weg)
const lineMat = (o) => {
  const key = o.state === 'claimed' ? hex(o.color || INK.amber) : 'own';
  let m = LINE_MATS.get(key);
  if (!m) { m = new THREE.LineBasicMaterial({ color: new THREE.Color(key === 'own' ? 0x3fc97a : key) }); LINE_MATS.set(key, m); }
  return m;
};
const ground = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);

function build(w, m) {
  const g = new THREE.Group();
  g.name = 'bezitmarker';
  const post = new THREE.Mesh(POST, POST_MAT); post.position.set(0, 1.5, 0);
  const board = new THREE.Mesh(BOARD, boardMaterial(m)); board.position.set(0, m.kind === 'building' ? 3.4 : 2.9, 0.06);
  g.add(post, board);
  g.position.set(m.x, ground(w, m.x, m.y) + 0.05, m.y);
  return g;
}
function drop(g) { if (g && g.parent) g.parent.remove(g); }   // geometrie en materialen zijn gedeeld: alleen loskoppelen
// De grenslijn van een eigen of geclaimd perceel (de omtrek van de vorm zelf; PERCEELRANDEN is een kaartrand, dit een eigendomsmarkering): dunne MeshBasic-lijn op grondhoogte, zonder botsing.
function buildOutline(w, o) {
  const seg = outlineSegments(o.pts, (x, y) => ground(w, x, y));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3));
  const l = new THREE.LineSegments(geo, lineMat(o));
  l.name = 'bezitgrens'; l.frustumCulled = false;
  return l;
}
function dropLine(l) { if (!l) return; if (l.parent) l.parent.remove(l); if (l.geometry) l.geometry.dispose(); }

// Elke 0,5 s aangeroepen (main.js): plant, vergelijkt en bouwt alleen wat nieuw is.
export function updateBezitMarkers(w, dt) {
  if (!w || !w.map || !(dt > 0) || w.coopRole === 'client') return;
  S.t += dt;
  if (S.t < 0.5) return;
  S.t = 0;
  const sc = getScene(), pl = hoofdspeler(w);
  if (!sc || !pl) return;
  const bezit = getBezit();
  const claims = (w.bezitClaims && w.bezitClaims()) || [];
  const ix = getIndexNow();
  const version = bezitVersion(bezit, claims) + (ix && ix.parcels.hasShapes && ix.parcels.hasShapes() ? 7919 : 0);   // de omtrekken komen lui: bij het laden opnieuw plannen
  const now = { x: pl.x, y: pl.y };
  if (!needsReplan(S.last, now, version)) return;
  S.last = { ...now, version };
  const next = planMarkers({ player: now, bezit, index: getIndexNow(), claims, labelOf: (id) => { const o = parcelOffer(id); return o ? { name: o.name, sub: 'Van jou' } : null; } });
  const d = diffMarkers(S.sig, next);
  for (const k of d.remove) { drop(S.groups.get(k)); S.groups.delete(k); }
  for (const m of [...d.update, ...d.add]) { drop(S.groups.get(m.key)); const g = build(w, m); S.groups.set(m.key, g); sc.add(g); }
  applyDiff(S.sig, d);
  const lines = planOutlines({ player: now, bezit, index: ix, claims });
  const ld = diffMarkers(S.lsig, lines);
  for (const k of ld.remove) { dropLine(S.lines.get(k)); S.lines.delete(k); }
  for (const o of [...ld.update, ...ld.add]) { dropLine(S.lines.get(o.key)); const l = buildOutline(w, o); S.lines.set(o.key, l); sc.add(l); }
  applyDiff(S.lsig, ld);
}
export function clearBezitMarkers() { for (const g of S.groups.values()) drop(g); S.groups.clear(); S.sig.clear(); for (const l of S.lines.values()) dropLine(l); S.lines.clear(); S.lsig.clear(); S.last = null; }
export const bezitOutlineCount = () => S.lines.size;
export const bezitMarkerCount = () => S.groups.size;
