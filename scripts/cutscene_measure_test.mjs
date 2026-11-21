// Test van de beeldmetingen van laag 3 zonder Electron: projectie, rechthoeken, pixelstatistiek en het oordeel over records,
// plus de headless simulatie op echte cutscenes (de meetcode draait dus ook in de lichte fase).
//   node scripts/cutscene_measure_test.mjs
import { projectPoint, actorRect, coverage, onScreenShare, lumaStats, lumaIn, isBlack, isEmpty, analyseRecords, simulateRecords, MEET } from './lib/cutscene_measure.mjs';
import { loadUnits } from './lib/cutscene_data.mjs';
import { RULES } from './lib/cutscene_lint.mjs';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };
const heeft = (v, regel, ernst) => v.some((x) => x.regel === regel && (!ernst || x.ernst === ernst));
const W = 1600, H = 900;
const cam = (px, py, pz, lx, ly, lz, fov = 40) => ({ position: { x: px, y: py, z: pz }, lookAt: { x: lx, y: ly, z: lz }, fov });

// ---- projectie ----------------------------------------------------------------------------------------------------------------
{
  const c = cam(0, 0, 1.6, 10, 0, 1.6);
  const mid = projectPoint(c, { x: 5, y: 0, z: 1.6 }, W, H);
  ok(Math.abs(mid.x - W / 2) < 1 && Math.abs(mid.y - H / 2) < 1 && mid.inFront, 'een punt in de kijkrichting valt in het midden van het scherm');
  ok(projectPoint(c, { x: -5, y: 0, z: 1.6 }, W, H).inFront === false, 'een punt achter de camera is niet in beeld');
  const links = projectPoint(c, { x: 5, y: 2, z: 1.6 }, W, H); // y+ is links van de kijkrichting +x (z omhoog, rechtshandig)
  ok(links.x < W / 2 && links.onScreen, 'een punt links van de kijkrichting valt links op het scherm', JSON.stringify(links));
  ok(!projectPoint(c, { x: 5, y: 40, z: 1.6 }, W, H).onScreen, 'een punt ver naast de lens valt buiten het scherm');
  const omhoog = projectPoint(c, { x: 5, y: 0, z: 3.5 }, W, H);
  ok(omhoog.y < H / 2, 'een punt boven de kijklijn valt boven het midden');
  const recht = projectPoint(cam(0, 0, 5, 0, 0, 0), { x: 0, y: 1, z: 0 }, W, H);
  ok(Number.isFinite(recht.x) || recht.inFront === false, 'een camera die recht omlaag kijkt geeft geen NaN-explosie');
  // een lens met kleinere fov maakt de figuur groter op het scherm
  const a = { x: 6, y: 0, h: 0 };
  const ruim = actorRect(cam(0, 0, 1.6, 6, 0, 1.2, 60), a, W, H), strak = actorRect(cam(0, 0, 1.6, 6, 0, 1.2, 25), a, W, H);
  ok(strak.h > ruim.h * 1.8, 'een lange lens maakt de figuur groter', `${ruim.h} ${strak.h}`);
  ok(actorRect(cam(0, 0, 1.6, 10, 0, 1.6), { x: -4, y: 0, h: 0 }, W, H) === null, 'een figuur achter de camera heeft geen rechthoek');
}

// ---- rechthoeken ----------------------------------------------------------------------------------------------------------------
{
  ok(coverage({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 0, w: 100, h: 100 }) === 0.5, 'coverage: de helft bedekt');
  ok(coverage({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 10, h: 10 }) === 0, 'coverage: geen overlap');
  ok(onScreenShare({ x: -50, y: 0, w: 100, h: 100 }, W, H) === 0.5, 'onScreenShare: een half buiten beeld');
}

// ---- pixels --------------------------------------------------------------------------------------------------------------------
{
  const buf = (waarde, w = 64, h = 36) => { const b = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) { b[i * 4] = b[i * 4 + 1] = b[i * 4 + 2] = waarde; b[i * 4 + 3] = 255; } return b; };
  ok(isBlack(lumaStats(buf(0), 64, 36, 1)), 'een zwart beeld wordt herkend');
  ok(!isBlack(lumaStats(buf(120), 64, 36, 1)) && isEmpty(lumaStats(buf(120), 64, 36, 1)), 'een effen grijs beeld is leeg maar niet zwart');
  const ruis = buf(100); for (let i = 0; i < 64 * 36; i += 3) ruis[i * 4] = 220;
  ok(!isEmpty(lumaStats(ruis, 64, 36, 1)) && !isBlack(lumaStats(ruis, 64, 36, 1)), 'een beeld met inhoud is niet leeg');
  ok(Math.abs(lumaIn(buf(80), 64, 36, { x: 0, y: 0, w: 10, h: 10 }, 1) - 80) < 1, 'lumaIn meet een gebied');
}

// ---- het oordeel over records -------------------------------------------------------------------------------------------------
{
  const rec = (o) => ({ cutscene: 't', shot: 0, phase: 'm', t: 2, camera: cam(0, 0, 1.6, 6, 0, 1.4), speaker: null, subtitle: null, hud: [], near: null, clip: null, pixels: { mean: 90, std: 40, dark: 0, bright: 0 }, ...o });
  ok(analyseRecords('t', [rec({})]).length === 0, 'een gezond record geeft geen vondst');
  ok(heeft(analyseRecords('t', [rec({ pixels: { mean: 1, std: 1, dark: 1, bright: 0 } })]), 'CS-R01', 'blokkerend'), 'R01: zwart beeld is blokkerend');
  ok(heeft(analyseRecords('t', [rec({ pixels: { mean: 130, std: 1, dark: 0, bright: 0 } })]), 'CS-R01', 'belangrijk'), 'R01: een effen vlak is belangrijk');
  ok(heeft(analyseRecords('t', [rec({ clip: true })]), 'CS-R02', 'blokkerend'), 'R02: camera in een gebouw is blokkerend');
  ok(heeft(analyseRecords('t', [rec({ near: { hits: 12, minD: 0.4 } })]), 'CS-R02', 'belangrijk'), 'R02: een lens vol kijkstralen is belangrijk');
  ok(heeft(analyseRecords('t', [rec({ camera: cam(NaN, 0, 1.6, 6, 0, 1.4) })]), 'CS-R06', 'blokkerend'), 'R06: een NaN-camera is blokkerend');
  ok(heeft(analyseRecords('t', [rec({ speaker: { id: 'tammo', name: 'Tammo', rect: { x: -400, y: 100, w: 100, h: 400 }, inFront: true } })]), 'CS-R03', 'blokkerend'), 'R03: een spreker buiten beeld in het midden van het shot is blokkerend');
  ok(heeft(analyseRecords('t', [rec({ speaker: { id: 'tammo', name: 'Tammo', rect: { x: 700, y: 200, w: 200, h: 500 }, inFront: false } })]), 'CS-R03', 'blokkerend'), 'R03: een spreker achter de camera is blokkerend');
  ok(!heeft(analyseRecords('t', [rec({ speaker: { id: 'tammo', name: 'Tammo', rect: { x: 700, y: 200, w: 200, h: 500 }, inFront: true } })]), 'CS-R03'), 'R03: een spreker in beeld is goed');
  ok(heeft(analyseRecords('t', [rec({ speaker: { id: 'tammo', name: 'Tammo', rect: { x: 700, y: 650, w: 200, h: 220 }, inFront: true }, subtitle: { rect: { x: 200, y: 720, w: 1200, h: 130 }, text: 'x' } })]), 'CS-R04'), 'R04: een ondertitel over de spreker wordt gemeld');
  ok(heeft(analyseRecords('t', [rec({ subtitle: { rect: { x: 200, y: 720, w: 1200, h: 130 }, text: 'x' }, hud: [{ x: 300, y: 700, w: 300, h: 100 }] })]), 'CS-R04'), 'R04: een ondertitel over de HUD wordt gemeld');
  const donker = rec({ shot: 0, phase: 'e', t: 5, pixels: { mean: 30, std: 20 } }), licht = rec({ shot: 1, phase: 'b', t: 5.1, pixels: { mean: 110, std: 30 } });
  ok(heeft(analyseRecords('t', [donker, licht]), 'CS-R05', 'belangrijk'), 'R05: een luminantiesprong tussen shots wordt gemeld');
  ok(!heeft(analyseRecords('t', [donker, { ...licht, pixels: { mean: 50, std: 30 } }]), 'CS-R05'), 'R05: een kleine overgang is goed');
  const vast = [rec({ phase: 'b', t: 2 }), rec({ phase: 'e', t: 9 })];
  ok(heeft(analyseRecords('t', vast), 'CS-R06', 'belangrijk'), 'R06: een camera die 7 s niet beweegt (en niets verandert) is bevroren');
  const beweegt = [rec({ phase: 'b', t: 2 }), rec({ phase: 'e', t: 9, camera: cam(0.5, 0, 1.6, 6, 0, 1.4), pixels: { mean: 95, std: 41, dark: 0, bright: 0 } })];
  ok(!heeft(analyseRecords('t', beweegt), 'CS-R06'), 'R06: een bewegende camera is goed');
  ok(Object.keys(RULES).filter((k) => /^CS-R/.test(k)).every((k) => RULES[k].laag === 'render'), 'de R-regels staan in de regeltabel als gerenderde laag');
  ok(MEET.sprong.belangrijk < MEET.sprong.blokkerend, 'de drempels lopen op');
}

// ---- de headless simulatie op echte cutscenes ---------------------------------------------------------------------------------
{
  const { units } = await loadUnits();
  const u = units.find((x) => x.id === 'M01.intro');
  const recs = simulateRecords(u);
  ok(recs.length >= 9 && recs.every((r) => ['b', 'm', 'e'].includes(r.phase)), 'de simulatie geeft per shot begin, midden en eind', String(recs.length));
  ok(recs.some((r) => r.speaker && r.speaker.rect), 'de simulatie projecteert de spreker naar het scherm');
  ok(recs.some((r) => r.subtitle), 'de simulatie legt de ondertitelrechthoek vast');
  const vondsten = analyseRecords(u.id, recs);
  ok(Array.isArray(vondsten), 'de meetcode draait op de gesimuleerde records zonder fout');
  const alle = units.filter((x) => x.scene);
  let totaal = 0, nan = 0;
  for (const x of alle) { const r = simulateRecords(x); totaal += r.length; nan += analyseRecords(x.id, r).filter((v) => v.regel === 'CS-R06').length; }
  ok(totaal > 1000 && nan === 0, 'alle geregisseerde cutscenes simuleren zonder NaN', `${totaal} records, ${nan} nan`);
}

console.log(fails ? `${fails} van ${n} cutscene_measure-controles falen` : `cutscene_measure_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
