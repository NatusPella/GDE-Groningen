// De pure kant van de weer-, dag- en nachtcontrole (scripts/qa/weernachtlogic.mjs) zonder Electron:
//   node scripts/weernacht_test.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'scripts', 'qa', 'weernachtlogic.mjs')).href);
const { decodePng } = await import(pathToFileURL(path.join(root, 'scripts', 'bot', 'analysis.mjs')).href);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

const img = (w, h, px) => { const data = Buffer.alloc(w * h * 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = px(x, y); const i = (y * w + x) * 3; data[i] = r; data[i + 1] = g; data[i + 2] = b; } return { w, h, bpp: 3, data }; };

// matrix: helder op alle tijdstippen, elk ander weer op middag, avond en nacht
{
  const m = L.matrix();
  ok(m.length === L.TIJDEN.length + (L.WEER.length - 1) * 3, 'aantal combinaties');
  ok(m.filter((c) => c.weer === 'helder').length === L.TIJDEN.length, 'helder op alle tijdstippen');
  ok(m.every((c) => c.weer === 'helder' || ['middag', 'avond', 'nacht'].includes(c.tijd)), 'ander weer alleen op de vaste tijdstippen');
  ok(new Set(m.map((c) => L.shotName('x', c))).size === m.length, 'unieke bestandsnamen');
  ok(L.WEER.every((w) => ['helder', 'bewolkt', 'mist', 'motregen', 'regenbui', 'onweer'].includes(w.kind)), 'alleen weersoorten uit weatherstate.js');
  ok(L.TIJDEN.every((t) => t.hour >= 0 && t.hour < 24), 'uren in 0..24');
}
// belichting en oordeel
{
  const zwart = img(40, 40, () => [0, 0, 0]);
  ok(L.exposure(zwart).blackFrac === 1, 'zwart beeld gemeten');
  const mz = L.measure(zwart);
  ok(L.judge({ tijd: 'middag', weer: 'helder' }, mz).includes('zwart beeld'), 'zwart beeld wordt gevlagd');
  const wit = img(40, 40, () => [255, 255, 255]);
  ok(L.judge({ tijd: 'middag', weer: 'helder' }, L.measure(wit)).includes('overbelicht'), 'overbelicht wordt gevlagd');
  const dag = img(60, 40, (x, y) => [120 + y, 150 + y, 200 + ((x * 7 + y * 3) % 20)]);
  ok(L.judge({ tijd: 'middag', weer: 'helder' }, L.measure(dag), null, 'stad').length === 0, 'een gewone dag krijgt geen vlag');
  ok(L.judge({ tijd: 'nacht', weer: 'helder' }, L.measure(dag), null, 'stad').some((f) => /te licht/.test(f)), 'te licht voor de nacht');
}
// banding: trappen van 10 pixels met sprongen van 3 niveaus tegen een vloeiend verloop
{
  const trap = img(70, 100, (x, y) => { const v = 40 + Math.floor(y / 10) * 3; return [v, v, v]; });
  const glad = img(70, 100, (x, y) => { const v = 40 + y * 0.3; return [v, v, v]; });
  ok(L.skyBanding(trap).bands > 0, 'banding in een trapverloop');
  ok(L.skyBanding(glad).bands === 0, 'geen banding in een vloeiend verloop');
}
// ruis, warme lichten, sterren
{
  const rustig = img(60, 60, () => [90, 90, 90]);
  const ruis = img(60, 60, (x, y) => { const v = (x * 31 + y * 17) % 2 ? 40 : 160; return [v, v, v]; });
  ok(L.highFreq(ruis) > L.highFreq(rustig) * 5 + 10, 'hoogfrequente ruis wordt gemeten');
  const droog = L.measure(rustig), nat = L.measure(ruis);
  ok(L.judge({ tijd: 'middag', weer: 'regenbui' }, nat, droog, 'stad').some((f) => /z-fighting/.test(f)), 'natte weg met veel ruis wordt gevlagd');
  const lampen = img(60, 60, (x, y) => (y > 35 && x % 10 < 2 ? [255, 200, 90] : [10, 12, 30]));
  ok(L.warmLights(lampen) > 0.1 && L.warmLights(rustig) === 0, 'warme lichten worden herkend');
  ok(L.judge({ tijd: 'nacht', weer: 'helder' }, L.measure(img(60, 60, () => [10, 12, 30])), null, 'stad').some((f) => /geen verlichting/.test(f)), 'een donkere stadsnacht zonder lichten wordt gevlagd');
  const sterren = img(80, 80, (x, y) => ((x * 13 + y * 7) % 41 === 0 && y > 3 && y < 20 ? [255, 255, 255] : [8, 10, 24]));
  ok(L.skyObjects(sterren).stars >= 5, 'sterren worden geteld');
  ok(L.judge({ tijd: 'diepe-nacht', weer: 'helder' }, L.measure(img(80, 80, () => [8, 10, 24])), null, 'land').some((f) => /geen sterren/.test(f)), 'heldere nacht zonder sterren wordt gevlagd');
}
// flikker
ok(L.flicker([100, 101, 99]) === 2 && L.flicker([100, 130]) === 30 && L.flicker([100]) === 0, 'flikker is de grootste sprong');
// kleurband
ok(L.bandColor(img(10, 10, () => [10, 20, 30]), 0, 0.5).join() === '10,20,30', 'kleur van een band');
// PNG heen en terug via het contactblad
{
  const a = img(20, 12, (x, y) => [x * 12, y * 20, 100]);
  const cell = L.downscale(a, 10, 6);
  ok(cell.length === 10 * 6 * 3, 'verkleind beeld heeft de juiste maat');
  const sheet = L.contactSheet([[cell, cell], [cell, null]], 10, 6, 2);
  const d = decodePng(sheet);
  ok(d.w === 2 * 12 + 2 && d.h === 2 * 8 + 2, 'maat van het contactblad');
  ok(d.data[((2) * d.w + 2) * 3 + 2] === 100, 'een pixel van het eerste vakje staat op zijn plek');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
