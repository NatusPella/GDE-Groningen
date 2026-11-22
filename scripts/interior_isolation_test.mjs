// Binnenruimte-isolatie (eigenaar 22-11: wereldobjecten die door een interieur heen komen): de pure kern (interiorvolume.js, interiorcutshader.js)
// en de lijm (interiorisolation.js) zonder spel. Wat de test keurt:
//   1. de zone van een plan is de hal (met muurrand); binnen, op de rand en erbuiten; de hoogte telt mee;
//   2. wat er in een zone staat wordt er recht uit geduwd en staat daarna buiten;
//   3. de shadersnede doet in JS en in de shader hetzelfde (packVolumes + insideVolumes): een headless meting op een proefstraat:
//      van honderden props rond een pand die de wereld zou tekenen valt er NUL in het volume, en alles daarbuiten blijft staan;
//   4. de shaderpatch past alleen op standaardmaterialen en laat een eigen shader ongemoeid;
//   5. de lijm: een voetganger in de hal wordt eruit gezet, een scènefiguur, de auto van de speler en een bootje niet; isInsideBuilding
//      (waar de spawners naar vragen) ziet de hal; bij weggooien is alles weer vrij;
//   6. de rest van het spel blijft bij: de binnenset en Beppe's huis melden een volume aan en melden het af.
// Draai: node scripts/interior_isolation_test.mjs
import './node3d.mjs';
import { planInterior } from '../game/js/interiorrules.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';
import fs from 'node:fs';

const Z = await import('../game/js/interiorvolume.js');
const SH = await import('../game/js/interiorcutshader.js');
const ISO = await import('../game/js/interiorisolation.js');
const { isInsideBuilding } = await import('../game/js/pedgeom.js');

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const rnd = mulberry32(22);

// een plan met zijn frame gedraaid en verschoven (een pand ergens op de kaart)
function planAt(kind, sub, w, d, ang, ox, oy) {
  const { b, spot } = building(kind, sub, w, d, rnd);
  const c = Math.cos(ang), s = Math.sin(ang);
  b.pts = b.pts.map(([x, y]) => [ox + x * c - y * s, oy + x * s + y * c]);
  const e = b.entrance;
  const [ax, ay] = [ox, oy];
  b.entrance = { ...e, ax, ay, tx: c, ty: s, nx: s, ny: -c };
  return planInterior(b, { spot });
}

// --- 1. de zone van een plan --------------------------------------------------------------------------
Z.clearInteriorVolumes();
const kinds = [['winkel', 'supermarkt'], ['horeca', 'cafe'], ['kantoor', null], ['woning', null], ['kerk', null], ['publiek', 'gemeente']];
const plans = [];
for (const [i, [kind, sub]] of kinds.entries()) {
  const p = planAt(kind, sub, 9 + rnd() * 5, 12 + rnd() * 5, rnd() * Math.PI * 2, 400 + i * 80, -300 + i * 31);
  ok(p.ok, `${kind}: planbaar`);
  if (!p.ok) continue;
  plans.push(p);
  const zn = Z.volumeOfPlan(p, 2);
  Z.addInteriorVolume(`t${i}`, zn);
  const H = p.hall, f = p.frame;
  const W = (u, v) => [f.ox + f.tx * u - f.nx * v, f.oy + f.ty * u - f.ny * v];
  const mid = W((H.u0 + H.u1) / 2, (H.v0 + H.v1) / 2);
  ok(!!Z.interiorVolumeAt(mid[0], mid[1], 0, 3), `${kind}: het midden van de hal is binnen`);
  const hoek = W(H.u0 + 0.1, H.v1 - 0.1);
  ok(!!Z.interiorVolumeAt(hoek[0], hoek[1], 0, 3), `${kind}: de hoek van de hal is binnen`);
  const buiten = W((H.u0 + H.u1) / 2, H.v1 + 2.5);
  ok(!Z.interiorVolumeAt(buiten[0], buiten[1], 0, 3), `${kind}: 2,5 m achter de achterwand is buiten`);
  const rand = W((H.u0 + H.u1) / 2, H.v1 + 0.2);
  ok(!!Z.interiorVolumeAt(rand[0], rand[1], 0, 3), `${kind}: 0,2 m achter de wand telt nog (de muurrand)`);
  ok(!Z.interiorVolumeAt(rand[0], rand[1], 0, 3 + 40), `${kind}: ver erboven (een vliegtuig) is niet binnen`);
  ok(!Z.interiorVolumeAt(mid[0], mid[1], 0, -5), `${kind}: ver eronder (een tunnel) is niet binnen`);
  ok(!!Z.interiorVolumeAt(buiten[0], buiten[1], 2.6, 3), `${kind}: een groot ding (voetafdruk 2,6 m) dat er tegenaan staat telt wel`);
}
ok(Z.interiorVolumes().length === plans.length, 'het register houdt elke zone');

// --- 2. eruit duwen ----------------------------------------------------------------------------------
{
  let fout = 0, geprobeerd = 0;
  for (const zn of Z.interiorVolumes()) {
    for (let k = 0; k < 200; k++) {
      const x = zn.bounds[0] - 1 + rnd() * (zn.bounds[2] - zn.bounds[0] + 2), y = zn.bounds[1] - 1 + rnd() * (zn.bounds[3] - zn.bounds[1] + 2);
      const r = rnd() * 0.6;
      if (!Z.interiorVolumeAt(x, y, r)) continue;
      geprobeerd++;
      const o = Z.pushOutOfInteriorVolume(x, y, r);
      if (Z.interiorVolumeAt(o.x, o.y, r)) fout++;
    }
  }
  ok(geprobeerd > 300, 'genoeg punten in de zones geprobeerd', String(geprobeerd));
  ok(fout === 0, 'een duw eruit brengt elk punt buiten alle zones', String(fout));
  const ver = Z.pushOutOfInteriorVolume(-9999, -9999);
  ok(ver.x === -9999 && ver.y === -9999, 'een punt dat al buiten is blijft staan');
}

// --- 3. de snede: JS en shader gelijk, en de meting op een proefstraat ---------------------------------------
{
  const A = [], B = [];
  const nVol = SH.packVolumes(Z.interiorVolumes(), A, B);
  ok(nVol === plans.length && nVol <= SH.MAX_VOLUMES, 'alle zones gaan in de uniforms', `${nVol}`);
  let verschil = 0, binnenJs = 0, buitenJs = 0, props = 0, doorgelaten = 0, weggelaten = 0;
  for (const zn of Z.interiorVolumes()) {
    const rc = zn.rect;
    for (let k = 0; k < 400; k++) {
      // een prop rond het pand (een prop is een punt in de snede, een voetafdruk van 0 m)
      const x = rc.cx + (rnd() - 0.5) * 2 * (rc.hu + 3), y = rc.cy + (rnd() - 0.5) * 2 * (rc.hu + 3), h = zn.z0 + rnd() * (zn.z1 - zn.z0 + 2);
      props++;
      const shader = SH.insideVolumes(nVol, A, B, x, h, y);
      // dezelfde vraag op het register zonder muurrand: de eigen rechthoek van de hal
      const dx = x - rc.cx, dy = y - rc.cy, u = dx * rc.ux + dy * rc.uy, v = -dx * rc.uy + dy * rc.ux;
      const js = Math.abs(u) < rc.hu && Math.abs(v) < rc.hv && h > zn.z0 && h < zn.z1;
      if (shader !== js) verschil++;
      if (js) binnenJs++; else buitenJs++;
      // wat de speler zou zien: de snede laat niets binnen het volume door
      if (shader) weggelaten++; else if (!js) doorgelaten++;
    }
  }
  ok(verschil === 0, 'de snede in JS en de shaderformule geven hetzelfde antwoord', String(verschil));
  ok(binnenJs > 200 && buitenJs > 200, 'de proefstraat heeft props binnen en buiten', `${binnenJs}/${buitenJs}`);
  ok(weggelaten === binnenJs, 'meting: elke prop binnen een hal wordt weggelaten (0 doorgelaten)', `${binnenJs - weggelaten} door`);
  ok(doorgelaten === buitenJs, 'meting: wat buiten de hal staat blijft', `${buitenJs - doorgelaten} weg`);
  // te veel zones: de dichtstbijzijnde gaan voor
  const veel = []; for (let i = 0; i < 10; i++) veel.push({ rect: { cx: i * 100, cy: 0, ux: 1, uy: 0, hu: 3, hv: 3 }, z0: 0, z1: 3 });
  const A2 = [], B2 = [];
  const n2 = SH.packVolumes(veel, A2, B2, { x: 900, y: 0 });
  ok(n2 === SH.MAX_VOLUMES && A2[0][0] === 900, 'bij meer dan zes volumes gaan de dichtstbijzijnde voor', `${n2} ${A2[0] && A2[0][0]}`);
}

// --- 4. de shaderpatch ---------------------------------------------------------------------------------
{
  const std = { vertexShader: 'a\n#include <common>\nvoid main() {\n#include <begin_vertex>\n}', fragmentShader: 'b\n#include <common>\nvoid main() {\n#include <clipping_planes_fragment>\n}' };
  const toegepast = SH.patchInteriorShader(std);
  ok(toegepast === true, 'een standaardshader wordt aangepast');
  ok(std.fragmentShader.includes('discard') && std.fragmentShader.includes('uIntA') && std.vertexShader.includes('vIntW') && std.vertexShader.includes('USE_INSTANCING'), 'de patch heeft de snede, de uniforms en de instancing');
  ok(std.fragmentShader.includes('#include <clipping_planes_fragment>') && std.vertexShader.includes('#include <begin_vertex>'), 'de oorspronkelijke haken blijven staan (andere patches blijven werken)');
  const eigen = { vertexShader: 'void main() { gl_Position = vec4(0.0); }', fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }' };
  const kopie = { ...eigen };
  ok(SH.patchInteriorShader(eigen) === false && eigen.vertexShader === kopie.vertexShader && eigen.fragmentShader === kopie.fragmentShader, 'een eigen shader zonder de standaardhaken blijft ongemoeid');
}

// --- 5. de lijm: veegronde en spawners ------------------------------------------------------------------
{
  Z.clearInteriorVolumes();
  const p = planAt('winkel', 'supermarkt', 10, 14, 0.6, 100, 100);
  ok(p.ok, 'proefwinkel planbaar');
  const H = p.hall, f = p.frame;
  const W = (u, v) => ({ x: f.ox + f.tx * u - f.nx * v, y: f.oy + f.ty * u - f.ny * v });
  const mid = W((H.u0 + H.u1) / 2, (H.v0 + H.v1) / 2);
  const ver = W(0, H.v1 + 8);
  const mk = (id, pos, extra = {}) => ({ id, x: pos.x, y: pos.y, ...extra });
  const wereld = {
    paused: false, time: 0,
    player: mk('p', ver, { x: ver.x, y: ver.y }),
    pedestrians: [mk('bewoner', mid), mk('scene', mid, { scene: true }), mk('script', mid, { scripted: true }), mk('buiten', ver)],
    vehicles: [mk('auto', mid, { halfLen: 2 }), mk('spelersauto', mid, { driver: 'player' }), mk('boot', mid, { isBoat: true }), mk('opdrijf', ver, { halfLen: 2 })],
  };
  wereld.players = [wereld.player];
  const spelersAuto = wereld.vehicles[1];
  wereld.player.inVehicle = spelersAuto;
  const v0 = ISO.interiorVolumeVersion();
  ISO.openInteriorVolume('proef', Z.volumeOfPlan(p, 0));
  ok(ISO.interiorVolumeVersion() > v0, 'aanmelden verhoogt het versienummer (lagen die een lijst bewaren bouwen opnieuw)');
  ok(isInsideBuilding({ buildingsNear: () => [] }, mid.x, mid.y) === true, 'isInsideBuilding (de vraag van de spawners) ziet de hal');
  ok(isInsideBuilding({ buildingsNear: () => [] }, ver.x, ver.y) === false, '... en niet wat erbuiten ligt');
  ISO.updateInteriorIsolation(0.6, wereld);
  const peds = Object.fromEntries(wereld.pedestrians.map((q) => [q.id, q]));
  ok(!Z.interiorVolumeAt(peds.bewoner.x, peds.bewoner.y, 0.25), 'een voetganger in de hal wordt eruit gezet');
  ok(Math.abs(peds.scene.x - mid.x) < 1e-9 && Math.abs(peds.script.x - mid.x) < 1e-9, 'een scènefiguur en een scriptfiguur blijven staan');
  ok(Math.abs(peds.buiten.x - ver.x) < 1e-9, 'een voetganger buiten blijft staan');
  const ids = wereld.vehicles.map((q) => q.id);
  ok(!ids.includes('auto'), 'een rijdende auto in de hal gaat uit de wereld');
  ok(ids.includes('spelersauto') && ids.includes('boot') && ids.includes('opdrijf'), 'de auto van de speler, een boot en een auto buiten blijven');
  ISO.closeInteriorVolume('proef');
  ok(Z.interiorVolumes().length === 0 && isInsideBuilding({ buildingsNear: () => [] }, mid.x, mid.y) === false, 'bij weggooien is de hal weer vrij (herstel bij naar buiten gaan)');
  ISO.resetInteriorIsolation();
}

// --- 6. de aanmelders staan op hun plek --------------------------------------------------------------
{
  const src = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
  ok(/openInteriorVolume\(ls.volumeId, volumeOfPlan/.test(src('interiors.js')) && /closeInteriorVolume\(ls.volumeId\)/.test(src('interiors.js')), 'interiors.js meldt elke levende hal aan en weer af');
  ok(/openInteriorVolume\('binnenset'/.test(src('stagesets.js')) && /closeInteriorVolume\('binnenset'\)/.test(src('stagesets.js')), 'stagesets.js meldt de binnenset aan en af');
  ok(/openInteriorVolume\('beppe-huis'/.test(src('beppe_binnen.js')) && /closeInteriorVolume\('beppe-huis'\)/.test(src('beppe_binnen.js')), "beppe_binnen.js meldt Beppe's kamer aan en af");
  ok(/updateInteriorIsolation\(dt, world\)/.test(src('main.js')), 'main.js draait de veegronde elke frame');
  for (const [f, re] of [['scene3d.js', /applyInteriorCut\(m\)/], ['streetfurniture3d.js', /applyInteriorCut\(new THREE\.MeshStandardMaterial/], ['cityprops.js', /applyInteriorCut\(vcMaterial/], ['nightlights3d.js', /applyInteriorCut\(new THREE\.MeshStandardMaterial/]]) ok(re.test(src(f)), `${f}: de vaste laag snijdt zich weg uit een binnenruimte`);
}

console.log(`${n} checks, ${bad} mislukt`);
process.exit(bad ? 1 : 0);
