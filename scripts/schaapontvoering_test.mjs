// Schaapontvoering (#333): de toestandsmachine (schaapontvoering.js) en de koppeling aan de wereld
// (schaapontvoeringrt.js, met een eigen THREE-scene): de schotel is zichtbaar, de straal loopt van de schotel naar het
// schaap en eindigt bij het ruimteschip, het schaap gaat omhoog, verdwijnt, en de schotel gaat weg.
//   node scripts/schaapontvoering_test.mjs
import './node3d.mjs';
import * as S from '../game/js/schaapontvoering.js';

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
const sheep = (x = 100, y = 50, o = {}) => ({ kind: 'sheep', x, y, angle: 0, speed: 0.4, ...o });

// --- de nacht en de keuze ---
ok(S.isNacht(23) && S.isNacht(0) && S.isNacht(3.9) && S.isNacht(22.5) && !S.isNacht(4.6) && !S.isNacht(12) && !S.isNacht(21.9), 'de nacht: 22:00 tot 04:30');
ok(S.isNacht(24 * 3 + 1) && !S.isNacht(24 * 3 + 13), 'ook na veel dagen (de klok loopt door)');
ok(S.nachtNr(23.5) === S.nachtNr(24 + 1) && S.nachtNr(23.5) !== S.nachtNr(24 + 13), '23:30 en 01:00 zijn één nacht');
const player = { x: 0, y: 0 };
ok(S.geschikt(sheep(80, 0), player) && !S.geschikt(sheep(10, 0), player) && !S.geschikt(sheep(400, 0), player), 'een schaap op 35 tot 150 m');
ok(!S.geschikt({ kind: 'cow', x: 80, y: 0 }, player) && !S.geschikt(sheep(80, 0, { dead: true }), player) && !S.geschikt(sheep(80, 0, { gone: true }), player) && !S.geschikt(sheep(80, 0, { ontvoerd: true }), player), 'geen koe, geen dood of al ontvoerd schaap');
ok(S.kiesSchaap([sheep(10, 0), { kind: 'cow', x: 60, y: 0 }], player, 0.5) === null, 'geen geschikt schaap: niets');
const lijst = [sheep(60, 0), sheep(90, 0), sheep(120, 0)];
ok(S.kiesSchaap(lijst, player, 0) === lijst[0] && S.kiesSchaap(lijst, player, 0.99) === lijst[2], 'de worp kiest');

// --- de toestandsmachine ---
function speel(st, dt = 0.05) {
  const log = [], gezien = new Set();
  for (let i = 0; i < 20000 && !st.klaar; i++) {
    S.stap(st, dt);
    gezien.add(st.fase);
    log.push({ fase: st.fase, t: st.t, ufo: { ...st.ufo }, lift: st.lift, straal: S.straalVan(st), weg: st.schaapWeg });
  }
  return { log, gezien };
}
{
  const a = sheep(100, 50);
  const st = S.begin(a, 0.7, 3);
  ok(st.fase === 'aanvlucht' && !st.klaar && st.ufo.z === S.AANVLUCHT_Z && Math.abs(Math.hypot(st.ufo.x - a.x, st.ufo.y - a.y) - S.AANVLUCHT_M) < 1e-9, 'begin: de schotel komt van ver en hoog');
  const { log, gezien } = speel(st);
  ok(st.klaar, 'de gebeurtenis loopt af');
  ok(S.FASEN.every((f) => gezien.has(f)), 'alle vier de fasen komen langs');
  const volgorde = []; for (const r of log) if (volgorde[volgorde.length - 1] !== r.fase) volgorde.push(r.fase);
  ok(volgorde.join() === S.FASEN.join(), 'in de juiste volgorde', volgorde.join());
  const totaal = log.length * 0.05, som = Object.values(S.TIJD).reduce((x, y) => x + y, 0);
  ok(Math.abs(totaal - som) < 0.5, 'de duur is de som van de fasen', `${totaal.toFixed(1)} vs ${som}`);
  ok(log.every((r) => Number.isFinite(r.ufo.x) && Number.isFinite(r.ufo.y) && Number.isFinite(r.ufo.z) && Number.isFinite(r.lift)), 'geen NaN');
  // de schotel komt boven het schaap en blijft er hangen tijdens straal en optillen
  const hangen = log.filter((r) => r.fase === 'straal' || r.fase === 'optillen');
  ok(hangen.every((r) => Math.abs(r.ufo.x - a.x) < 1e-6 && Math.abs(r.ufo.y - a.y) < 1e-6 && Math.abs(r.ufo.z - S.HOOGTE) < 1e-6), 'de schotel hangt boven het schaap');
  // de straal: aan in straal en optillen, uit in de aanvlucht, en hij eindigt bij de schotel
  ok(log.filter((r) => r.fase === 'aanvlucht').every((r) => r.straal === null), 'geen straal in de aanvlucht');
  const stralen = log.filter((r) => r.straal);
  ok(stralen.length > 100, 'er is een straal');
  ok(stralen.every((r) => Math.abs(r.straal.x - r.ufo.x) < 1e-6 && Math.abs(r.straal.y - r.ufo.y) < 1e-6 && Math.abs(r.straal.top - (r.ufo.z - 0.9)) < 1e-6), 'de straal begint onder de schotel (en eindigt dus bij het ruimteschip)');
  ok(stralen.every((r) => r.straal.top > r.straal.bodem && r.straal.lengte > 0 && r.straal.rBodem > r.straal.rTop), 'de straal is een trechter van de schotel omlaag');
  const opt = log.filter((r) => r.fase === 'optillen');
  ok(opt.every((r, i) => i === 0 || r.lift >= opt[i - 1].lift - 1e-9), 'het schaap gaat alleen omhoog');
  ok(opt[opt.length - 1].lift > S.HOOGTE - 3 && opt[opt.length - 1].lift < S.HOOGTE, 'het schaap eindigt vlak onder de schotel');
  const laatsteOpt = opt[opt.length - 1];
  ok(Math.abs(laatsteOpt.straal.bodem - (laatsteOpt.lift - 0.3)) < 1e-6, 'de straal eindigt bij het schaap');
  ok(!log.filter((r) => r.fase !== 'weg').some((r) => r.weg), 'het schaap blijft tot de laatste fase');
  ok(log.filter((r) => r.fase === 'weg').every((r) => r.weg), 'in de laatste fase is het schaap weg');
  const last = log[log.length - 1];
  ok(last.ufo.z > S.HOOGTE + 200 && Math.hypot(last.ufo.x - a.x, last.ufo.y - a.y) > S.AANVLUCHT_M * 0.9, 'de schotel is weg: hoog en ver');
  ok(last.straal === null, 'de straal is uit');
  // een tweede keer spelen met dezelfde invoer geeft hetzelfde
  const st2 = S.begin(a, 0.7, 3); speel(st2);
  ok(JSON.stringify(st2) === JSON.stringify(st), 'deterministisch');
}
// grote en kleine stappen komen op dezelfde plek uit
{
  const a = sheep(0, 0);
  const x = S.begin(a, 1), y = S.begin(a, 1);
  const tot = (st, dt) => { let m = 0; for (let i = 0; i < 20000 && !st.klaar; i++) { S.stap(st, dt); m = Math.max(m, st.lift); } return m; };
  const mx = tot(x, 0.25), my = tot(y, 1 / 30);
  ok(x.klaar && y.klaar && Math.abs(mx - my) < 1.5 && Math.abs(x.ufo.z - y.ufo.z) < 60, 'stapgrootte beinvloedt de uitkomst nauwelijks', `${mx} ${my}`);
}

// --- de koppeling aan de wereld (met een eigen scene, zonder het spel) ---
const THREE = await import('three');
const RT = await import('../game/js/schaapontvoeringrt.js');
{
  const scene = new THREE.Scene();
  const a = sheep(80, 30), b = sheep(500, 500);
  RT.zetScene(scene);
  const msgs = [];
  const world = { clock: 23.2, time: 0, player: { x: 0, y: 0 }, wildlife: [a, b, { kind: 'cow', x: 70, y: 0 }], addMessage: (t) => msgs.push(t), flavour: { night: 1 } };
  ok(RT.startOntvoering(world, a, 0.3) === true && a.ontvoerd === true, 'start: het schaap is van de schotel');
  ok(RT.startOntvoering(world, b) === false, 'maar een tegelijk');
  RT.tickSchaapontvoering(0.016, world, scene);
  const ufoGroup = scene.children.find((c) => c.isGroup);
  const straal = scene.children.find((c) => c.isMesh && c.material && c.material.blending === THREE.AdditiveBlending);
  ok(!!ufoGroup && ufoGroup.visible, 'de schotel staat in de scene en is zichtbaar');
  ok(!!straal, 'de straal staat in de scene');
  let bijSchotel = true, liftMax = 0, stappen = 0, straalGezien = 0;
  for (let i = 0; i < 4000; i++) {
    world.time += 0.05;
    RT.tickSchaapontvoering(0.05, world, scene);
    stappen++;
    liftMax = Math.max(liftMax, a.lift || 0);
    if (straal.visible) {
      straalGezien++;
      // de bovenkant van de straal ligt precies onder de schotel
      const topY = straal.position.y, ufoY = ufoGroup.position.y;
      if (Math.abs(topY - (ufoY - 0.9)) > 1.2 || Math.hypot(straal.position.x - ufoGroup.position.x, straal.position.z - ufoGroup.position.z) > 1.2) bijSchotel = false;
    }
    if (!ufoGroup.visible) break;
  }
  ok(straalGezien > 100, 'de straal is te zien', String(straalGezien));
  ok(liftMax > S.HOOGTE - 3, 'het schaap is omhoog gegaan', String(liftMax));
  ok(bijSchotel, 'de straal hangt aan de schotel');
  ok(!world.wildlife.includes(a), 'het schaap is uit de wereld');
  ok(world.wildlife.includes(b) && world.wildlife.length === 2, 'de andere dieren blijven');
  ok(!ufoGroup.visible && !straal.visible, 'schotel en straal zijn weer weg');
  ok(msgs.length === 1 && S.REGELS.includes(msgs[0]), 'een regel op het scherm, in het Nederlands', JSON.stringify(msgs));
  ok(a.ontvoerd === false && !a.lift, 'het schaap is losgelaten');
  ok(stappen * 0.05 < Object.values(S.TIJD).reduce((x, y) => x + y, 0) + 2, 'het duurt niet langer dan de fasen');
  ok(RT.startOntvoering(world, b, 0) === true, 'daarna kan het weer (met een ander schaap)');
  // de speler rijdt weg: het schaap wordt door wildlife.js weggehaald; de schotel gaat er alleen vandoor
  world.wildlife.splice(world.wildlife.indexOf(b), 1);
  for (let i = 0; i < 1000 && ufoGroup.visible; i++) { world.time += 0.05; RT.tickSchaapontvoering(0.05, world, scene); }
  ok(!ufoGroup.visible, 'zonder schaap gaat de schotel er vandoor, zonder vast te lopen');
}

// de natuurlijke start: alleen 's nachts, met een schaap in zicht, en hoogstens een keer per nacht
{
  const scene = new THREE.Scene();
  RT.zetScene(scene);
  const echt = Math.random;
  Math.random = () => 0.1;
  const mk = (clock) => ({ clock, time: 0, player: { x: 0, y: 0 }, wildlife: [sheep(90, 10)], addMessage() {}, flavour: { night: 1 } });
  const loop = (w, sec) => { for (let t = 0; t < sec; t += 0.5) RT.tickSchaapontvoering(0.5, w); };
  const dag = mk(13); loop(dag, 60);
  ok(!dag.wildlife[0].ontvoerd, 'overdag gebeurt er niets');
  const nacht = mk(24 * 5 + 1.0); loop(nacht, 14);
  ok(nacht.wildlife[0].ontvoerd === true, "'s nachts met een schaap in zicht begint het", JSON.stringify(window.__ontvoering.nacht()));
  loop(nacht, 60);
  ok(nacht.wildlife.length === 0, 'het schaap is weg');
  const zelfdeNacht = mk(24 * 5 + 2.0); loop(zelfdeNacht, 60);
  ok(!zelfdeNacht.wildlife[0].ontvoerd, 'dezelfde nacht niet nog een keer');
  const volgende = mk(24 * 6 + 1.0); loop(volgende, 14);
  ok(volgende.wildlife[0].ontvoerd === true, 'de volgende nacht kan het weer');
  Math.random = () => 0.99;
  const geenKans = mk(24 * 9 + 1.0); loop(geenKans, 60);
  ok(!geenKans.wildlife[0].ontvoerd, 'een nacht zonder kans: niets');
  Math.random = echt;
}
// wildlife.js en scene3d.js kennen het ontvoerde schaap
{
  const fs = await import('node:fs');
  const rd = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  ok(/if \(a\.ontvoerd\) continue;/.test(rd('wildlife.js')), 'wildlife.js laat een ontvoerd schaap staan');
  ok(/a\.lift/.test(rd('scene3d.js')) && /a\.draai/.test(rd('scene3d.js')), 'scene3d.js tekent lift en draai');
  ok(/tickSchaapontvoering\(dt, world\)/.test(rd('main.js')), 'main.js laat het gebeuren tikken');
}
// teksten: Nederlands
for (const t of [...S.REGELS, S.NIEUWS]) ok(/[a-z]/.test(t) && !/\b(the|and|sheep|alien|ufo)\b/i.test(t), 'tekst in het Nederlands', t);

console.log(`schaapontvoering_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
