// Schets-render van één cutscene-shot (#1322): een kleine SVG door de echte camera van de scène, zonder Electron, zonder wereld.
// De pure bemonstering (cutscript.js sample) levert camera, personages en props; dit tekent ze in perspectief: grond met raster,
// props als blokken (voetafdruk uit cutscenemodels.js PROP_FOOT), personages als figuur met hoofd en neus (kijkrichting), de spreker
// omlijnd, de ondertitel onderin, het licht van het shot als kleurstalen. Zo is kadrering, blik, as en licht te beoordelen in CI.
//
// Coördinaten van het spel: x, y in het vlak, z omhoog. Op het scherm is rechts = omhoog x vooruit (de afbeelding naar THREE spiegelt y en z),
// dus voor een camera langs +x is +y rechts in beeld.
import { kelvinToRgb } from '../../game/js/shotlight.js';

const W = 480, H = 270;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (v) => Math.round(v * 10) / 10;
const KLEUR = { tammo: '#3b7dd8', tessa: '#e8833a', jelle: '#b8322a' };
const PALET = ['#6a9f4e', '#8e6bb8', '#c4a03a', '#4aa3a0', '#b86b8e', '#7d7d7d', '#a0522d'];
export function actorColor(id) {
  if (KLEUR[id]) return KLEUR[id];
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALET[h % PALET.length];
}
const hexOf = ({ r, g, b }) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');

// Een camera als projector: { project(p) -> { x, y, z } | null (achter de camera), focal, ok }
export function projector(camera, w = W, h = H) {
  const P = camera.position, Q = camera.lookAt;
  let fx = Q.x - P.x, fy = Q.y - P.y, fz = Q.z - P.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;
  // rechts = omhoog x vooruit (spelcoördinaten), boven = vooruit x rechts
  let rx = -fy, ry = fx, rz = 0;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  const ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
  const focal = (h / 2) / Math.tan(((camera.fov || 46) * Math.PI) / 360);
  const toCam = (p) => { const vx = p.x - P.x, vy = p.y - P.y, vz = p.z - P.z; return { x: vx * rx + vy * ry + vz * rz, y: vx * ux + vy * uy + vz * uz, z: vx * fx + vy * fy + vz * fz }; };
  const toScreen = (q) => ({ x: w / 2 + (q.x / q.z) * focal, y: h / 2 - (q.y / q.z) * focal, z: q.z });
  const project = (p, near = 0.12) => { const q = toCam(p); return q.z < near ? null : toScreen(q); };
  // een veelhoek (spelcoördinaten) geknipt op het vlak vlak voor de lens, dan geprojecteerd; [] als hij er helemaal achter ligt
  const projectPoly = (pts, near = 0.12) => {
    const cs = pts.map(toCam), out = [];
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length];
      if (a.z >= near) out.push(a);
      if ((a.z >= near) !== (b.z >= near)) { const t = (near - a.z) / (b.z - a.z); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: near }); }
    }
    return out.map(toScreen);
  };
  return { project, projectPoly, focal, w, h };
}
// rechts = (-fy, fx): voor een camera langs +x is +y rechts in beeld (THREE: vooruit +X, rechts +Z = spel-y);
// scripts/cutscene_contactvel_test.mjs houdt dat vast.

// Een lijnstuk geknipt op het vlak vlak voor de camera; null als het helemaal achter ligt.
function clipSeg(pr, a, b) {
  const pa = pr.project(a), pb = pr.project(b);
  if (pa && pb) return [pa, pb];
  if (!pa && !pb) return null;
  // zoek het punt op de lijn waar hij voor de camera komt
  let lo = 0, hi = 1;
  const inF = (t) => pr.project({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
  const goedBijA = !!pa;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (!!inF(m) === goedBijA) lo = m; else hi = m; }
  const p = inF(goedBijA ? lo : hi);
  return p ? (goedBijA ? [pa, p] : [p, pb]) : null;
}

// De kopregels van een figuur: voeten, schouder, hoofdmidden (spelcoördinaten), zoals cutscene_render.page.js projectActor.
export function figureOf(a) {
  const z0 = a.h || 0;
  const sit = a.sit || 0;
  const head = sit ? z0 + sit + 0.72 : z0 + 1.66; // mens ca. 1,78 m (MENS in scripts/lib/cutscene_lint.mjs)
  return { feet: z0 + (sit ? sit * 0.6 : 0), shoulder: head - 0.26, head, top: head + 0.13, chin: head - 0.12 };
}

// footOf(kind) -> [lengte, breedte, hoogte] of null
export function schetsSvg({ sample, camera, shot = {}, light = null, footOf = () => null, anchor = { x: 0, y: 0, z: 0 }, speakerId = null, line = null, flags = [], names = {} }) {
  const pr = projector(camera);
  const o = [];
  // lucht en grond: de horizon is de projectie van een punt ver weg in de kijkrichting op grondhoogte
  const P = camera.position, Q = camera.lookAt;
  const hd = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
  const ver = pr.project({ x: P.x + ((Q.x - P.x) / hd) * 2000, y: P.y + ((Q.y - P.y) / hd) * 2000, z: anchor.z || 0 });
  const hy = ver ? Math.max(-10, Math.min(H + 10, ver.y)) : (Q.z < P.z ? -10 : H + 10);
  const key = light && light.key && light.key.kelvin ? hexOf(kelvinToRgb(light.key.kelvin)) : '#fff3dc';
  const fill = light && light.fill && light.fill.kelvin ? hexOf(kelvinToRgb(light.fill.kelvin)) : '#cfe0f2';
  o.push(`<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}" stop-opacity="0.55"/><stop offset="1" stop-color="#e9eef3"/></linearGradient></defs>`);
  o.push(`<rect width="${W}" height="${H}" fill="#e9eef3"/><rect width="${W}" height="${r1(Math.max(0, hy))}" fill="url(#l)"/>`);
  o.push(`<rect y="${r1(Math.max(0, hy))}" width="${W}" height="${r1(Math.max(0, H - hy))}" fill="#c9d3bf"/>`);
  // raster van 2 m rond de plek
  const gz = anchor.z || 0, R = 14, st = 2;
  const grid = [];
  for (let k = -R; k <= R; k += st) {
    for (const [a, b] of [[{ x: anchor.x + k, y: anchor.y - R, z: gz }, { x: anchor.x + k, y: anchor.y + R, z: gz }], [{ x: anchor.x - R, y: anchor.y + k, z: gz }, { x: anchor.x + R, y: anchor.y + k, z: gz }]]) {
      const s = clipSeg(pr, a, b);
      if (s) grid.push(`M${r1(s[0].x)} ${r1(s[0].y)}L${r1(s[1].x)} ${r1(s[1].y)}`);
    }
  }
  if (grid.length) o.push(`<path d="${grid.join('')}" stroke="#a9b59d" stroke-width="0.6" fill="none"/>`);

  // alles wat getekend wordt, op diepte (ver eerst)
  const items = [];
  for (const [id, p] of Object.entries(sample.props || {})) {
    if (p.visible === false) continue;
    const f = footOf(p.kind);
    if (!f) continue;
    const [l, w, hgt] = f;
    const c = Math.cos(p.a || 0), s = Math.sin(p.a || 0);
    const pt = (u, v, z) => ({ x: p.x + u * c - v * s, y: p.y + u * s + v * c, z });
    const z0 = p.h || 0, z1 = z0 + Math.max(0.05, hgt);
    const hoeken = [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]];
    const faces = [hoeken.map(([u, v]) => pt(u, v, z1))];
    for (let i = 0; i < 4; i++) { const [a, b] = [hoeken[i], hoeken[(i + 1) % 4]]; faces.push([pt(a[0], a[1], z0), pt(b[0], b[1], z0), pt(b[0], b[1], z1), pt(a[0], a[1], z1)]); }
    for (const fc of faces) {
      const pp = pr.projectPoly(fc);
      if (pp.length < 3) continue;
      const d = pp.reduce((m, q) => m + q.z, 0) / pp.length;
      items.push({ d, svg: `<path d="M${pp.map((q) => `${r1(q.x)} ${r1(q.y)}`).join('L')}Z" fill="#9a8f80" fill-opacity="0.78" stroke="#5e554a" stroke-width="0.6"/>` });
    }
    const mid = pr.project(pt(0, 0, z1 + 0.15));
    if (mid) items.push({ d: mid.z - 0.01, svg: `<text x="${r1(mid.x)}" y="${r1(mid.y)}" font-size="8" fill="#4a4238" text-anchor="middle">${esc(p.kind)}</text>` });
  }
  for (const [id, a] of Object.entries(sample.actors || {})) {
    if (a.visible === false) continue;
    const fg = figureOf(a);
    const head = pr.project({ x: a.x, y: a.y, z: fg.head });
    const feet = pr.project({ x: a.x, y: a.y, z: fg.feet });
    const sh = pr.project({ x: a.x, y: a.y, z: fg.shoulder });
    if (!head && !feet) continue;
    const col = actorColor(id);
    const g = [];
    const half = (q) => (0.22 * pr.focal) / q.z;
    if (feet && sh) g.push(`<path d="M${r1(feet.x - half(feet))} ${r1(feet.y)}L${r1(sh.x - half(sh))} ${r1(sh.y)}L${r1(sh.x + half(sh))} ${r1(sh.y)}L${r1(feet.x + half(feet))} ${r1(feet.y)}Z" fill="${col}" fill-opacity="0.85"/>`);
    if (head) {
      const hr = (0.13 * pr.focal) / head.z;
      const kijk = (a.a || 0) + (a.gaze || 0);
      const neus = pr.project({ x: a.x + Math.cos(kijk) * 0.32, y: a.y + Math.sin(kijk) * 0.32, z: fg.head });
      g.push(`<circle cx="${r1(head.x)}" cy="${r1(head.y)}" r="${r1(Math.max(1.2, hr))}" fill="#f0d2b4" stroke="${id === speakerId ? '#111' : col}" stroke-width="${id === speakerId ? 2 : 1}"/>`);
      if (neus) g.push(`<path d="M${r1(head.x)} ${r1(head.y)}L${r1(neus.x)} ${r1(neus.y)}" stroke="#222" stroke-width="1.4"/>`);
      const naam = names[id] || id;
      g.push(`<text x="${r1(head.x)}" y="${r1(head.y - Math.max(hr, 3) - 3)}" font-size="9" fill="${col}" stroke="#fff" stroke-width="2.2" paint-order="stroke" text-anchor="middle" font-weight="${id === speakerId ? 700 : 400}">${esc(naam)}</text>`);
    }
    items.push({ d: (head || feet).z, svg: g.join('') });
  }
  items.sort((p, q) => q.d - p.d);
  for (const it of items) o.push(it.svg);

  // kader-informatie
  o.push(`<rect x="0" y="0" width="${W}" height="16" fill="#000" fill-opacity="0.45"/>`);
  o.push(`<text x="5" y="11.5" font-size="10" fill="#fff">#${esc(shot.n ?? '')} ${esc(shot.t != null ? shot.t.toFixed(1) + ' s' : '')} · ${esc(shot.type || '')} · lens ${Math.round(camera.fov)}</text>`);
  // licht: key, fill, rim
  const sw = [['key', light && light.key], ['fill', light && light.fill], ['rim', light && light.rim]];
  let x = W - 6;
  for (const [nm, p] of sw.reverse()) {
    const c = p && p.kelvin ? hexOf(kelvinToRgb(p.kelvin)) : nm === 'rim' ? 'none' : '#888';
    o.push(`<circle cx="${x - 4}" cy="8" r="4.5" fill="${c}" stroke="#fff" stroke-width="0.8"><title>${nm}</title></circle>`);
    x -= 12;
  }
  o.push(`<text x="${x - 2}" y="11.5" font-size="9" fill="#fff" text-anchor="end">${esc(light ? light.name : 'wereldlicht')}</text>`);
  if (key) o.push(`<rect x="0" y="16" width="3" height="${H - 16}" fill="${key}"/>`);
  // ondertitel
  if (line) {
    const tekst = `${line.speaker}: ${line.text}`;
    const regels = [];
    let cur = '';
    for (const wd of tekst.split(/\s+/)) { if ((cur + ' ' + wd).trim().length > 64) { regels.push(cur.trim()); cur = wd; } else cur += ' ' + wd; }
    if (cur.trim()) regels.push(cur.trim());
    const rs = regels.slice(0, 3);
    const y0 = H - 8 - rs.length * 12;
    o.push(`<rect x="20" y="${y0 - 3}" width="${W - 40}" height="${rs.length * 12 + 6}" rx="3" fill="#000" fill-opacity="0.55"/>`);
    rs.forEach((r, i) => o.push(`<text x="${W / 2}" y="${y0 + 9 + i * 12}" font-size="10.5" fill="#fff" text-anchor="middle">${esc(r)}</text>`));
  }
  if (flags.length) o.push(`<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#d62020" stroke-width="2.5"/><text x="6" y="30" font-size="10" fill="#d62020" font-weight="700">${esc(flags.slice(0, 2).join(' · '))}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Segoe UI, Arial, sans-serif">${o.join('')}</svg>\n`;
}
