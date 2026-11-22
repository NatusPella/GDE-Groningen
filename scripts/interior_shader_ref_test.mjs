// De CPU-referentie van het nepinterieur (scripts/lib/interior_shader_ref.mjs) tegen een onafhankelijke ray/box-oplossing in de
// wereld, en de glasshader (game/js/interiorglass.js) tegen de referentie (#1076). Geen GL, geen Electron.
//   node scripts/interior_shader_ref_test.mjs [--tabel]     (--tabel print de foutentabel van docs/NEPINTERIEUR-22-11.md)
import fs from 'node:fs';
import {
  igDecode, roomOf, shaderHit, shaderRay, analyticHit, paneToWorld, paneFrame, uvAt, int8Normal, farMix, smoothstep,
  dot, len, norm, UP,
} from './lib/interior_shader_ref.mjs';
import { paneUV } from '../game/js/paneuv.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } };
const TABEL = process.argv.includes('--tabel');
const src = fs.readFileSync(new URL('../game/js/interiorglass.js', import.meta.url), 'utf8');
const bld = fs.readFileSync(new URL('../game/js/models3d_buildings.js', import.meta.url), 'utf8');
const glsl = src.slice(src.indexOf('const INTERIOR = '), src.indexOf('glassMaterial.onBeforeCompile'));
const frag = src.slice(src.indexOf('glassMaterial.onBeforeCompile'));

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const f32 = (a) => a.map(Math.fround);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const deg = (r) => r * 180 / Math.PI;

// --- 1. paneUV <-> igDecode: elke K, soort en maat komt er heel uit ---------------------------------------------------------------
{
  let bad = 0, n = 0, maxX32 = 0, maxY32 = 0;
  for (const kind of [0, 1, 2, 3]) for (let K = 0; K < 256; K += 5) for (const w of [0.4, 0.9, 1.35, 2.2, 4.7, 6.3]) for (const h of [0.5, 1.2, 2.05, 3.9]) {
    const rank = kind === 2 ? (K >> 3) / 32 + 0.001 : K / 256 + 0.001;
    const c = paneUV(rank, kind, w, h, 1, 0, 0, 1, 3);
    for (const [x, y, ux, uy] of [[-w / 2, 0, c[0], c[1]], [w / 2, 0, c[2], c[3]], [w / 2, h, c[4], c[5]]]) {
      const q = igDecode(ux, uy);
      n++;
      if (q.kind !== kind || Math.abs(q.size[0] - Math.round(w * 10) / 10) > 1e-9 || Math.abs(q.size[1] - Math.round(h * 10) / 10) > 1e-9 || Math.abs(Math.abs(q.p[0]) - w / 2) > 1e-9) bad++;
      const q32 = igDecode(Math.fround(ux), Math.fround(uy));
      maxX32 = Math.max(maxX32, Math.abs(q32.p[0] - q.p[0]));
      maxY32 = Math.max(maxY32, Math.abs(q32.p[1] - q.p[1]));
      if (q32.kind !== kind || q32.K !== q.K) bad++;
    }
  }
  ok(bad === 0, `paneUV -> igDecode geeft soort, maat en positie terug (${bad} fouten van ${n})`);
  ok(maxX32 < 0.01 && maxY32 < 0.002, `de uv als 32-bit varying kost hooguit ${(maxX32 * 1000).toFixed(1)} mm in x en ${(maxY32 * 1000).toFixed(2)} mm in y`);
  // de bekende grens: boven 3,99 m hoogte klemt p.y (paneUV kapt y af); de ruiten in de gevel blijven daaronder
  const c = paneUV(0.5, 0, 1, 5, 1, 0, 0, 1);
  ok(Math.abs(igDecode(c[4], c[5]).p[1] - 3.99) < 1e-6, 'een ruit hoger dan 3,99 m klemt p.y op 3,99 (bekende grens van de codering)');
  const tops = [...bld.matchAll(/const top = ([^;]+);/g)].map((m) => m[1]);
  ok(tops.length > 0, 'de bovenkant van de winkelruit (top) is in de bron te vinden');
}

// --- 2. de shader tegen de onafhankelijke oplossing: de testmatrix ----------------------------------------------------------------
const DISTS = [2, 5, 20, 50, 100, 300];
const FOVS = [60, 75, 90];
const stat = {}; // sleutel -> { n, max, sum }
const rec = (key, e) => { const s = stat[key] || (stat[key] = { n: 0, max: 0, sum: 0, over: 0 }); s.n++; s.max = Math.max(s.max, e); s.sum += e; };
const fixedMax = { exact64: 0, exact32: 0, int8: 0, int8Ang: 0, zero: 0, oldFlipErr: 0 };
let samples = 0, onPane = 0;
const grazeMin = { v: 1e9 };

function trial(r, dist, fov, aspect, person, psiMaxDeg) {
  const phi = r() * 2 * Math.PI;
  const w = 0.4 + r() * 5.6, h = 0.5 + r() * 3.4;
  const kind = Math.floor(r() * 4), rank = r(), bay = Math.floor(r() * 8);
  const O = [r() * 30000, r() * 15, r() * 30000];
  const f = paneFrame(phi);
  const psi = (r() * 2 - 1) * psiMaxDeg * Math.PI / 180;
  const camH = person === 1 ? 1.7 : 1.7 + r() * 8;
  const horiz = Math.max(dist * Math.cos(Math.asin(Math.min(0.99, (camH - O[1]) / dist))), 0.5);
  const cam = [O[0] + f.n[0] * horiz * Math.cos(psi) + f.T[0] * horiz * Math.sin(psi), camH, O[2] + f.n[2] * horiz * Math.cos(psi) + f.T[2] * horiz * Math.sin(psi)];
  const center = paneToWorld(O, phi, 0, h / 2);
  // camera met willekeurige draaiing om het ruitmidden, een pixel (NDC) -> straal -> snijpunt met het ruitvlak
  const fwd0 = norm(sub(center, cam));
  const rt0 = norm(cross(fwd0, UP)), up0 = cross(rt0, fwd0);
  const tanH = Math.tan(fov * Math.PI / 360);
  const jy = (r() * 2 - 1) * tanH * 0.5, jp = (r() * 2 - 1) * tanH * 0.5;
  const fwd = norm([fwd0[0] + rt0[0] * jy + up0[0] * jp, fwd0[1] + rt0[1] * jy + up0[1] * jp, fwd0[2] + rt0[2] * jy + up0[2] * jp]);
  const rt = norm(cross(fwd, UP)), up = cross(rt, fwd);
  const x = (r() * 2 - 1) * w / 2, y = r() * h;
  const target = paneToWorld(O, phi, x, y);
  const d = sub(target, cam), z = dot(d, fwd);
  if (z <= 0) return;
  const ndc = [dot(d, rt) / (z * tanH * aspect), dot(d, up) / (z * tanH)];
  samples++;
  if (Math.abs(ndc[0]) > 1 || Math.abs(ndc[1]) > 1) return; // buiten beeld
  const dir = [0, 1, 2].map((i) => fwd[i] + rt[i] * ndc[0] * tanH * aspect + up[i] * ndc[1] * tanH);
  const t = dot(sub(O, cam), f.n) / dot(dir, f.n);
  if (!(t > 0)) return;
  const P = [0, 1, 2].map((i) => cam[i] + dir[i] * t);
  onPane++;
  const room = roomOf(igDecode(...uvAt(rank, kind, w, h, phi, bay, x, y)));
  const an = analyticHit({ cam, O, phi, room, P });
  const inc = Math.acos(Math.abs(dot(norm(sub(P, cam)), f.n)));
  grazeMin.v = Math.min(grazeMin.v, Math.PI / 2 - inc);
  const cls = dist <= 5 ? 'dichtbij' : dist <= 50 ? 'midden' : 'ver';
  const incCls = deg(inc) < 60 ? 'inval<60' : deg(inc) < 80 ? 'inval60-80' : 'inval>80';
  const err = (hit) => Math.hypot(hit.p[0] - an.hit[0], hit.p[1] - an.hit[1], hit.p[2] - an.hit[2]);
  const yEff = Math.min(y, 3.99);

  // (a) exacte normaal, 64-bit: moet de onafhankelijke oplossing op de millimeter volgen
  const uv = uvAt(rank, kind, w, h, phi, bay, x, y);
  const s64 = shaderHit({ cam, P, uv, N: f.n });
  const e64 = err(s64);
  fixedMax.exact64 = Math.max(fixedMax.exact64, e64);
  ok(e64 < 2e-3 || yEff !== y, `64-bit shader = analytisch (fout ${e64.toExponential(2)} m; dist ${dist}, inval ${deg(inc).toFixed(1)}°)`);
  ok(Math.abs(s64.q.p[0] - x) < 1e-6 && Math.abs(s64.q.p[1] - yEff) < 1e-6, 'de uv geeft de ruitplek (x, y) terug');

  // (b) 32-bit varyings en uniformen (camera, ruitpunt, uv, normaal): de precisie van de GPU
  const uv32 = f32(uvAt(rank, kind, w, h, phi, bay, x, y, true));
  const s32 = shaderHit({ cam: f32(cam), P: f32(P), uv: uv32, N: f32(f.n) });
  const e32 = err(s32);
  fixedMax.exact32 = Math.max(fixedMax.exact32, e32);
  rec(`f32 ${cls} ${incCls}`, e32);

  // (c) de Int8-normaal van GeoBuilder (127 niveaus), zoals de gebatchte glasgeometrie hem nu bewaart
  const sI = shaderHit({ cam, P, uv, N: int8Normal(f.n) });
  const eI = err(sI);
  const nq = int8Normal(f.n);
  fixedMax.int8 = Math.max(fixedMax.int8, eI);
  fixedMax.int8Ang = Math.max(fixedMax.int8Ang, Math.acos(Math.min(1, dot(norm(nq), f.n))));
  rec(`int8 ${cls} ${incCls}`, eI);

  // (d) de oude batchtoestand: een nulnormaal (afgekapte Int8) -> de shader viel terug op +z
  const sZ = shaderHit({ cam, P, uv, N: [0, 0, 0] });
  const eZ = err(sZ);
  fixedMax.zero = Math.max(fixedMax.zero, eZ);
  rec(`nulnormaal ${cls} ${incCls}`, eZ);
}

const r = rng(1076);
for (const dist of DISTS) for (const fov of FOVS) for (const aspect of [16 / 9, 4 / 3, 21 / 9]) for (const person of [1, 3]) for (const psi of [30, 60, 85]) for (let i = 0; i < 60; i++) trial(r, dist, fov, aspect, person, psi);
ok(onPane > 6000, `genoeg monsters op de ruit (${onPane} van ${samples} binnen beeld)`);
ok(grazeMin.v > 1e-3, `het grazendste monster blijft boven de klem van rd.z (hoek met het vlak ${deg(grazeMin.v).toFixed(2)}°)`);

// de eisen aan de gerepareerde toestand
ok(fixedMax.exact64 < 2e-3, `exacte normaal, 64 bit: de shader volgt de onafhankelijke oplossing (max ${fixedMax.exact64.toExponential(2)} m)`);
ok(deg(fixedMax.int8Ang) < 0.35, `de Int8-normaal wijkt hooguit ${deg(fixedMax.int8Ang).toFixed(3)}° af van de gevel (127 niveaus)`);
// Een Int8-normaal verdraait het hele kamerframe met die hoek: de fout in het kamerpunt is dus begrensd door de afstand tot de wand
// (hooguit ~5,5 m diep) maal de hoek bij een normale inval; bij grazing groeit ze (1/cos), de plaats van het raam verschuift hooguit
// een paar decimeter. Dat is een rigide zwenking van de hele kamer, geen vervorming.
for (const [k, s] of Object.entries(stat)) if (k.startsWith('int8') && k.endsWith('inval<60')) ok(s.max < 0.25, `${k}: Int8-normaal, kamerpunt wijkt ${s.max.toFixed(3)} m af (< 0,25 m)`);
for (const [k, s] of Object.entries(stat)) if (k.startsWith('f32 dichtbij')) ok(s.max < 0.6, `${k}: 32-bit precisie op 2-5 m, kamerpunt wijkt ${s.max.toFixed(3)} m af (< 0,6 m)`);
for (const [k, s] of Object.entries(stat)) if (k.startsWith('f32') && !k.startsWith('f32 dichtbij') && k.endsWith('inval<60')) ok(s.max < 0.05, `${k}: 32-bit precisie, kamerpunt wijkt ${s.max.toFixed(3)} m af (< 0,05 m)`);
// de oude toestand moet aantoonbaar fout zijn (zo vonden we de oorzaak)
ok(fixedMax.zero > 3, `de oude nulnormaal gaf een kamerpunt tot ${fixedMax.zero.toFixed(1)} m ernaast (de oorzaak, afgekapte Int8-normalen in de batcher)`);

// --- 3. gedraaide gevels, niet alleen 0 en 90 graden: de nulnormaal klopt alleen op de wereldas ---------------------------------
{
  const rr = rng(22);
  const worst = (phiDeg) => {
    let m = 0;
    for (let i = 0; i < 200; i++) {
      const phi = phiDeg * Math.PI / 180;
      const O = [1000, 3, 2000], w = 1.2, h = 1.4, x = (rr() * 2 - 1) * w / 2, y = rr() * h;
      const f = paneFrame(phi);
      const cam = [O[0] + f.n[0] * 12 + f.T[0] * (rr() * 10 - 5), 1.7, O[2] + f.n[2] * 12 + f.T[2] * (rr() * 10 - 5)];
      const P = paneToWorld(O, phi, x, y);
      const uv = uvAt(0.4, 0, w, h, phi, 0, x, y);
      const room = roomOf(igDecode(...uv));
      const an = analyticHit({ cam, O, phi, room, P });
      const sz = shaderHit({ cam, P, uv, N: [0, 0, 0] });
      m = Math.max(m, Math.hypot(sz.p[0] - an.hit[0], sz.p[1] - an.hit[1], sz.p[2] - an.hit[2]));
    }
    return m;
  };
  ok(worst(37) > 1.5 && worst(123) > 1.5 && worst(251) > 1.5, 'een gedraaide gevel (37, 123, 251 graden): de nulnormaal geeft meer dan 1,5 m fout');
}

// --- 4. het frame bij een achterkant-pixel: T draait niet met de kant mee --------------------------------------------------------
{
  const rr = rng(5);
  let flipDiff = 0, fixedSame = 0, n = 0;
  for (let i = 0; i < 500; i++) {
    const phi = rr() * 2 * Math.PI, f = paneFrame(phi);
    const V = norm([rr() - 0.5, (rr() - 0.5) * 0.3, rr() - 0.5]);
    const back = dot(f.n, V) > 0;
    if (!back) continue;
    n++;
    const oud = shaderRay(V, f.n, { fixed: false }), nieuw = shaderRay(V, f.n, { fixed: true });
    if (Math.abs(oud.rd[0] + nieuw.rd[0]) < 1e-9 && Math.abs(nieuw.rd[0]) > 1e-3) flipDiff++;
    if (nieuw.T.every((v, k) => Math.abs(v - f.T[k]) < 1e-9)) fixedSame++;
    ok(nieuw.rd[2] > 0, 'rd.z blijft positief bij een achterkant-pixel');
  }
  ok(n > 50 && flipDiff === n, `de oude toestand spiegelt x bij een achterkant-pixel (${flipDiff}/${n}); de nieuwe niet`);
  ok(fixedSame === n, 'het frame T komt altijd uit de ongedraaide normaal');
}

// --- 5. de gladde afstandsregel (alfa, geen geometrie) -----------------------------------------------------------------------------
{
  const m = glsl.match(/const float IG_FAR0 = ([\d.]+);\s*const float IG_FAR1 = ([\d.]+);/);
  ok(!!m, 'IG_FAR0 en IG_FAR1 staan in de shader');
  const f0 = Number(m[1]), f1 = Number(m[2]);
  ok(f0 >= 60 && f1 > f0 && f1 <= 170, `de band ligt binnen de tekenring (${f0}..${f1} m)`);
  ok(farMix(f0 - 1, f0, f1) === 0 && farMix(f1 + 1, f0, f1) === 1, 'de band is 0 vlak ervoor en 1 vlak erna');
  let prev = 0, mono = true;
  for (let d = f0 - 10; d < f1 + 10; d += 0.5) { const v = farMix(d, f0, f1); if (v < prev - 1e-12) mono = false; prev = v; }
  ok(mono, 'de afstandsalfa stijgt monotoon (geen sprong)');
  // geometrie blijft hetzelfde: het kamerpunt hangt niet van de band af, alleen de menging
  ok(/smoothstep\(IG_FAR0, IG_FAR1, dist\)/.test(glsl) && /if \(igFar >= 1\.0\) return flatCol;/.test(glsl) && /return igFar > 0\.0 \? mix\(col, flatCol, igFar\) : col;/.test(glsl), 'de shader mengt de kamer op alfa met een vlakke toon en werpt voorbij FAR1 geen straal');
  ok(!/igFar[^;]*\b(rd|ro|ird)\b/.test(glsl.replace(/flatCol[^;]*;/g, '')), 'de afstandsregel stuurt de straal (rd, ro, ird) niet');
}

// --- 6. de GLSL blijft synchroon met de referentie en binnen het budget ---------------------------------------------------------
{
  for (const s of [
    'float RW = W + (shop ? 2.4 : 1.3);',
    'float fY = shop ? -0.45 : ground ? -0.55 : -0.85;',
    'float cY = max(fY + (office ? 2.9 : 2.75), H + 0.3);',
    'float D = clamp((shop ? 1.7 : 1.1) * uRoomDepth * RW, 2.0, 5.5);',
    'vec3 T = length(N.xz) > 1e-3 ? normalize(vec3(N.z, 0.0, -N.x)) : vec3(1.0, 0.0, 0.0);',
    'vec3 rd = vec3(dot(V, T), V.y, -dot(V, N) * igSide);',
    'if (abs(rd.x) < 1e-4) rd.x = rd.x < 0.0 ? -1e-4 : 1e-4;',
    'if (abs(rd.y) < 1e-4) rd.y = rd.y < 0.0 ? -1e-4 : 1e-4;',
    'rd.z = max(rd.z, 1e-3);',
    'fres = 0.04 + 0.96 * pow(clamp(1.0 - rd.z, 0.0, 1.0), 5.0);',
    'vec3 ro = vec3(q.p, 0.0);',
    'vec3 b0 = vec3(-RW * 0.5, fY, 0.0), b1 = vec3(RW * 0.5, cY, D);',
    'vec3 tb = (mix(b0, b1, step(0.0, rd)) - ro) * ird;',
    'float t = min(tb.x, min(tb.y, tb.z));',
    'o.p.x = (w.x - fx - 0.5) * 8.0;', 'o.p.y = (w.y - fy - 0.002) * 4.0;',
    'float s1 = igHash24(uint((q.K * 8.0 + q.kind) * 977.0 + 0.5) + uint(W * 10.0 + 0.5) * 61u + uint(H * 10.0 + 0.5));',
  ]) ok(src.includes(s), `de shader bevat nog: ${s.slice(0, 60)}`);
  // een JS-port van de kamers moet dezelfde kamer kiezen als interiorlook.js (de kamer waar je in loopt)
  const rm = roomOf(igDecode(...uvAt(0.37, 0, 1.2, 1.4, 0.5, 0, 0, 0)));
  ok(Math.abs(rm.RW - 2.5) < 1e-9 && rm.fY === -0.85 && Math.abs(rm.cY - 1.9) < 1e-9 && Math.abs(rm.D - 2.75) < 1e-9, 'roomOf geeft de kamermaten van de shader (RW, fY, D)');
  // geen extra textuurlookups, geen dynamische lussen in de glasshader
  ok(!/texture2D|texture\(|textureLod|texelFetch/.test(glsl), 'de nepinterieurshader leest geen texturen (geen mipmap- of anisotropie-effect)');
  ok(!/\b(for|while)\s*\(/.test(glsl), 'de nepinterieurshader heeft geen lussen');
  // geen frame-afhankelijkheid van de normaal omdraaien
  ok(!/igN = -igN/.test(frag), 'de normaal wordt niet meer naar de camera gedraaid (T bleef dan meedraaien)');
  // de glasmeshes staan in wereldcoordinaten: alleen een verschuiving, geen (ongelijke of negatieve) schaal op de gebouwgroep
  ok(!/group\.scale\./.test(bld) && /group\.position\.(x|y|z) \+= /.test(bld), 'de gebouwgroep krijgt alleen een positie (nudge), geen schaal of spiegeling');
}

// --- 7. translatie-invariantie: ruiten in rijen op verschillende hoogte ----------------------------------------------------------
{
  const rr = rng(7);
  let m = 0;
  for (let i = 0; i < 300; i++) {
    const phi = rr() * 2 * Math.PI, w = 0.5 + rr() * 3, h = 0.6 + rr() * 2.5, x = (rr() - 0.5) * w * 0.9, y = rr() * h;
    const f = paneFrame(phi);
    const O1 = [500, 0, 500], O2 = [500, 3.2 * Math.floor(rr() * 5), 500];
    const camRel = [f.n[0] * 15 + f.T[0] * 4, 1.5, f.n[2] * 15 + f.T[2] * 4];
    const dy = O2[1] - O1[1];
    const a = shaderHit({ cam: [O1[0] + camRel[0], camRel[1], O1[2] + camRel[2]], P: paneToWorld(O1, phi, x, y), uv: uvAt(0.2, 0, w, h, phi, 0, x, y), N: f.n });
    const b = shaderHit({ cam: [O2[0] + camRel[0], camRel[1] + dy, O2[2] + camRel[2]], P: paneToWorld(O2, phi, x, y), uv: uvAt(0.2, 0, w, h, phi, 0, x, y), N: f.n });
    m = Math.max(m, Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]));
  }
  ok(m < 1e-9, `een rij ruiten op andere hoogte met dezelfde relatieve camera geeft hetzelfde kamerpunt (${m.toExponential(1)})`);
}

if (TABEL) {
  console.log('\nsleutel | n | max (m) | gemiddeld (m)');
  for (const [k, s] of Object.entries(stat).sort()) console.log(`${k} | ${s.n} | ${s.max.toFixed(3)} | ${(s.sum / s.n).toFixed(3)}`);
  console.log(`max Int8-hoek ${deg(fixedMax.int8Ang).toFixed(3)} graden; exact64 ${fixedMax.exact64.toExponential(2)} m; nulnormaal tot ${fixedMax.zero.toFixed(1)} m`);
}
console.log(fails ? `${fails} FOUT(EN)` : `OK interior_shader_ref_test (${onPane} monsters)`);
process.exit(fails ? 1 : 0);
