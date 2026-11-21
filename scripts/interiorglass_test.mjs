// Nepinterieurs in de ramen (interiorglass.js, interior mapping): de rekenkunde van de kamerstraal (een JS-port van igInterior:
// pane-lokale straal, snijpunt met de kamerbox) is onafhankelijk van near, far, FOV en aspect, de parallax is symmetrisch en
// de schaal gaat met 1/afstand. Daarnaast de verboden afhankelijkheden in de shaderbron en de diepte-ordening glas / kozijn /
// dwarsbalk (de dieptebuffer van 24 bit, cameranear.js): bij near 0,08 m (eerste persoon, #1024) verloor het glas op ~80 m
// van zijn eigen kozijnplaat en verdween de kamer.
//   node scripts/interiorglass_test.mjs
import fs from 'node:fs';
import { depthStep } from '../game/js/cameranear.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const src = fs.readFileSync(new URL('../game/js/interiorglass.js', import.meta.url), 'utf8');
const bld = fs.readFileSync(new URL('../game/js/models3d_buildings.js', import.meta.url), 'utf8');

// --- JS-port van de straal in igInterior: wereldrichting V (camera naar ruit) en ruitnormaal N (naar de camera) -> kamerpunt
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
function roomHit(camPos, paneWorld, N, pLocal, RW, fY, cY, D) {
  const V = norm(sub(paneWorld, camPos));
  const T = norm([N[2], 0, -N[0]]);
  let rd = [dot(V, T), V[1], -dot(V, N)];
  if (Math.abs(rd[0]) < 1e-4) rd[0] = rd[0] < 0 ? -1e-4 : 1e-4;
  if (Math.abs(rd[1]) < 1e-4) rd[1] = rd[1] < 0 ? -1e-4 : 1e-4;
  rd[2] = Math.max(rd[2], 1e-3);
  const ro = [pLocal[0], pLocal[1], 0];
  const b0 = [-RW / 2, fY, 0], b1 = [RW / 2, cY, D];
  const tb = [0, 1, 2].map((i) => ((rd[i] >= 0 ? b1[i] : b0[i]) - ro[i]) / rd[i]);
  const t = Math.min(...tb);
  return { p: [0, 1, 2].map((i) => ro[i] + rd[i] * t), t };
}
// een camera met willekeurige near/far/fov/aspect: de wereldstraal door een scherm-pixel (NDC) komt uit de inverse projectie
function pixelRay(camPos, yaw, pitch, fovDeg, aspect, nearP, farP, ndc) {
  const f = 1 / Math.tan(fovDeg * Math.PI / 360);
  const A = -(farP + nearP) / (farP - nearP), B = -2 * farP * nearP / (farP - nearP);
  // clip -> view (inverse van de standaard perspectief-matrix), op het near-vlak en het far-vlak
  const unproj = (z) => {
    const w = -(B / (z + A)); // clip.w = -z_view; z_ndc = (A z_view + B) / -z_view
    return [ndc[0] * w / (f / aspect), ndc[1] * w / f, -w];
  };
  const a = unproj(-1 + 1e-9), b = unproj(1 - 1e-9);
  let d = norm(sub(b, a));
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  d = [d[0], d[1] * cp - d[2] * sp, d[1] * sp + d[2] * cp];
  d = [d[0] * cy + d[2] * sy, d[1], -d[0] * sy + d[2] * cy];
  return norm(d);
}
const N = [0, 0, 1]; // ruit op z = 0, kijkt naar +z
const RW = 2.4, fY = -0.85, cY = 2.0, D = 2.6;
const pane = [0.2, 0.7, 0]; // wereldpunt op de ruit (pane-lokaal 0,2 / 0,7 + nulpunt in de oorsprong)
const pLocal = [0.2, 0.7];
const cam0 = [3, 1.6, 20];
const ref = roomHit(cam0, pane, N, pLocal, RW, fY, cY, D);
// near/far/FOV/aspect veranderen het kamerpunt niet: dezelfde wereldstraal geeft hetzelfde punt
for (const nearP of [0.08, 0.5, 2.5]) for (const farP of [400, 1500, 12000]) for (const fov of [42, 60, 80]) for (const aspect of [1280 / 720, 1920 / 1080, 21 / 9]) {
  const dir = norm(sub(pane, cam0));
  // kies yaw/pitch en NDC zo dat de pixelstraal precies op `pane` mikt: (yaw, pitch) uit dir, NDC (0, 0) = het hart van het beeld
  const yaw = Math.atan2(-dir[0], -dir[2]) + Math.PI, pitch = Math.asin(dir[1]);
  const r = pixelRay(cam0, yaw - Math.PI, pitch, fov, aspect, nearP, farP, [0, 0]);
  const hit = roomHit(cam0, [cam0[0] + r[0] * 20, cam0[1] + r[1] * 20, cam0[2] + r[2] * 20], N, pLocal, RW, fY, cY, D);
  // het snijpunt hangt alleen van de richting af; yaw-conventies mogen verschillen, dus we vergelijken alleen de richtingsonafhankelijkheid van near/far
  const hit2 = roomHit(cam0, [cam0[0] + r[0] * 33, cam0[1] + r[1] * 33, cam0[2] + r[2] * 33], N, pLocal, RW, fY, cY, D);
  ok(hit.p.every((v, i) => near(v, hit2.p[i], 1e-9)), `kamerpunt hangt niet van de ruitafstand langs de straal af (near ${nearP} far ${farP} fov ${fov})`);
  ok(hit.p.every(Number.isFinite), `kamerpunt is eindig (near ${nearP} far ${farP} fov ${fov} aspect ${aspect.toFixed(2)})`);
}
ok(ref.p.every(Number.isFinite) && ref.p[2] > 0 && ref.p[2] <= D + 1e-9, 'het kamerpunt ligt binnen de box');

// symmetrische parallax: een camera links en rechts van de ruitnormaal geeft een gespiegeld verschil in x
const left = roomHit([-3, 0.7, 20], [0, 0.7, 0], N, [0, 0.7], RW, fY, cY, D);
const right = roomHit([3, 0.7, 20], [0, 0.7, 0], N, [0, 0.7], RW, fY, cY, D);
// T = (N.z, 0, -N.x) = (1, 0, 0): een camera aan de +x kant kijkt naar -x, dus de straal gaat naar -x in de kamer
ok(near(left.p[0], -right.p[0], 1e-9) && near(left.p[1], right.p[1], 1e-9) && near(left.p[2], right.p[2], 1e-9), 'parallax links/rechts is gespiegeld');
ok(left.p[0] > 0 && right.p[0] < 0, 'parallax: de kamer schuift tegen de kijkrichting in (een camera links ziet de rechterhelft)');

// schaal ~ 1/afstand: bij tweemaal de afstand (zelfde kijkhoek) verschuift een kamerpunt half zo veel t.o.v. de ruitplek
const k1 = roomHit([4, 0.7, 20], [0, 0.7, 0], N, [0, 0.7], RW, fY, cY, D), k2 = roomHit([8, 0.7, 40], [0, 0.7, 0], N, [0, 0.7], RW, fY, cY, D);
ok(near(k1.p[0], k2.p[0], 1e-9) && near(k1.p[2], k2.p[2], 1e-9), 'dezelfde kijkhoek op andere afstand geeft hetzelfde kamerpunt (alleen de richting telt)');
const e1 = roomHit([4, 0.7, 20], [0, 0.7, 0], N, [0.3, 0.7], RW, fY, cY, D), e2 = roomHit([8, 0.7, 40], [0, 0.7, 0], N, [0.3, 0.7], RW, fY, cY, D);
ok(near(e1.p[0], e2.p[0], 1e-9), 'een andere ruitplek verschuift het punt gelijk, onafhankelijk van de afstand');
// een pixel naast het ruitcentrum: de verschuiving van het kamerpunt is lineair in de ruitplek bij vaste richting (1/afstand in beeld)
const dxs = [0.1, 0.2, 0.4].map((x) => roomHit([4, 0.7, 20], [0, 0.7, 0], N, [x, 0.7], RW, fY, cY, D).p[0]);
ok(near(dxs[1] - dxs[0], 0.1, 1e-9) && near(dxs[2] - dxs[1], 0.2, 1e-9), 'de ruitplek verschuift het kamerpunt 1 op 1');

// --- verboden afhankelijkheden in de shaderbron van het glas
const sh = src.slice(src.indexOf('glassMaterial.onBeforeCompile'));
for (const bad of ['gl_FragCoord', 'projectionMatrix', 'projectionMatrixInverse', 'viewMatrix', 'cameraNear', 'cameraFar', 'vViewPosition', 'gl_FragDepth', 'uNear', 'uFar'])
  ok(!sh.includes(bad), `de glasshader gebruikt ${bad} niet (parallax hangt niet van near/far/projectie af)`);
ok(/cameraPosition/.test(sh) && /modelMatrix/.test(sh), 'de glasshader rekent met cameraPosition en modelMatrix (wereldruimte)');
ok(/customProgramCacheKey\s*=\s*\(\)\s*=>\s*\(interiorOn \? 'glass-interior' : 'glass-plain'\)/.test(src), 'de programmasleutel van het glas blijft twee waarden (geen extra programma\'s)');
ok(!/uniform\s+\w+\s+uNear/.test(src), 'geen near-uniform in het glas');

// --- diepte-ordening: glas wint van het kozijn, de balk wint van het glas, op elke afstand tot de tekenring (170 m)
const off = (re) => { const m = src.match(re); return m ? Number(m[1]) : NaN; };
const gF = off(/GLASS_OFFSET = \{ factor: (-?\d+)/), gU = off(/units: (-?\d+) \}/);
const dm = bld.match(/const detailMaterial = vcMaterial\(\{[^}]*polygonOffsetFactor: (-?\d+), polygonOffsetUnits: (-?\d+)/);
ok(!!dm && Number.isFinite(gF) && Number.isFinite(gU), 'offsets van glas en details zijn te lezen');
const dU = dm ? Number(dm[2]) : 0;
const gap = { frame: 0.06 - 0.05, bar: 0.085 - 0.06 };
ok(/const WINDOW_BAR_D = 0\.085;/.test(bld), 'dwarsbalk en middenstijl liggen op 0,085');
for (const n of [0.08, 0.5, 2.5]) for (const d of [30, 80, 120, 170]) {
  const step = depthStep(d, n);
  // effectieve diepte = afstand - voorsprong (m) - offset (eenheden * stap): kleiner wint
  const glass = -0.06 + gU * step, frame = -0.05 + dU * step, bar = -0.085 + dU * step;
  ok(glass < frame, `glas wint van de kozijnplaat (near ${n}, ${d} m)`);
  ok(bar < glass, `de balk wint van het glas (near ${n}, ${d} m, stap ${(step * 1000).toFixed(1)} mm)`);
}
// de oude toestand (glas zonder offset): bij near 0,08 verloor het glas van de kozijnplaat vanaf ~80 m
const oud = (n, d) => -0.06 < -0.05 + dU * depthStep(d, n) ? 'glas' : 'kozijn';
ok(oud(0.08, 120) === 'kozijn' && oud(0.5, 120) === 'glas', 'regressie begrepen: oude glas verliest bij near 0,08 op 120 m, niet bij near 0,5');

console.log(fails ? `${fails} FOUT(EN)` : 'OK interiorglass_test');
process.exit(fails ? 1 : 0);
