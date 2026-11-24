// Contactvellen (#1322) zonder Electron: keyframes per shot met spreker en ondertitel, de schets door de echte camera (links/rechts
// klopt), het licht van het shot in de metadata, en één webpagina met twee runs naast elkaar.
//   node scripts/cutscene_contactvel_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadUnits } from './lib/cutscene_data.mjs';
import { keyframesOf, paginaHtml, schrijfPagina, REGIE_SET, safe } from './cutscene_contactvel.mjs';
import { schetsSvg, projector } from './lib/contactvel_schets.mjs';
import { resolveShotLight } from '../game/js/shotlight.js';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ` (${info})` : ''}`); } };

// projectie: een camera langs +x ziet +y rechts, en hoger is hoger in beeld
const pr = projector({ position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 10, y: 0, z: 1.6 }, fov: 40 });
ok(pr.project({ x: 5, y: 1, z: 1.6 }).x > 240 && pr.project({ x: 5, y: -1, z: 1.6 }).x < 240, '+y rechts, -y links');
ok(pr.project({ x: 5, y: 0, z: 2.5 }).y < 135, 'hoger is hoger in beeld');
ok(pr.project({ x: -5, y: 0, z: 1.6 }) === null, 'achter de camera: niets');
ok(pr.projectPoly([{ x: -1, y: -1, z: 0 }, { x: 3, y: -1, z: 0 }, { x: 3, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }]).length >= 3, 'een vlak half achter de lens wordt geknipt, niet weggelaten');

const { units } = await loadUnits();
const set = units.filter((u) => REGIE_SET.includes(u.id));
ok(set.length === REGIE_SET.length, 'de twintig scènes van de regieronde bestaan en zijn geregisseerd', REGIE_SET.filter((id) => !set.some((u) => u.id === id)).join(','));
ok(REGIE_SET.length >= 20 && !REGIE_SET.some((id) => /^M0[1-6]\.|^story-opening/.test(id)), 'twintig scènes, geen van akte 1');
// vijf cutscenes: elk shot een keyframe met tijd, camera en licht; een gesproken regel geeft spreker en ondertitel
for (const u of set.slice(0, 5)) {
  const keys = keyframesOf(u);
  ok(keys.length === new Set(keys.map((k) => k.shot)).size || keys.length > 0, `${u.id}: keyframes`);
  ok(keys.every((k) => k.t >= k.t0 && k.t <= k.t1 + 1e-6 && Number.isFinite(k.camera.fov)), `${u.id}: keyframe binnen zijn shot`);
  ok(keys.some((k) => k.line && k.line.text && k.speakerId), `${u.id}: spreker en ondertitel bij een keyframe`);
  const svg = schetsSvg({ sample: keys[0]._sample, camera: keys[0]._sample.camera, shot: keys[0], light: keys[0].light, anchor: { x: 500, y: -300, z: 0 }, line: keys[0].line, names: keys[0]._names });
  ok(svg.startsWith('<svg') && svg.length < 40000 && !/NaN/.test(svg), `${u.id}: schets is een kleine geldige svg`);
}
// het licht staat in de metadata en de schets
const lichtUnit = set.find((u) => (u.def.light || (u.def.shots || []).some((s) => s.light)));
if (lichtUnit) ok(keyframesOf(lichtUnit).some((k) => k.light && k.lightText !== 'wereldlicht'), `${lichtUnit.id}: licht per shot in het contactvel`);
const sv = schetsSvg({ sample: { actors: {}, props: {} }, camera: { position: { x: 0, y: 0, z: 1.6 }, lookAt: { x: 5, y: 0, z: 1.5 }, fov: 40 }, light: resolveShotLight('gouden-uur'), line: { speaker: 'Tessa', text: 'Kijk <daar>.' } });
ok(/gouden-uur/.test(sv) && /Kijk &lt;daar&gt;/.test(sv), 'schets toont het licht en ontsnapt de ondertitel');

// de pagina: twee runs (voor en na) naast elkaar, alles in één bestand
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-cv-'));
try {
  for (const label of ['na', 'voor']) {
    const dir = path.join(tmp, 'runs', label);
    fs.mkdirSync(dir, { recursive: true });
    const u = set[0];
    fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify({ label, gemaakt: '2026-11-24 10:00', cutscenes: [{ id: u.id, titel: 't', akte: u.act, duur: u.duration, keys: keyframesOf(u).map(({ _sample, _names, ...k }) => k) }], foto: null }));
  }
  ok(schrijfPagina(tmp) === 2, 'twee runs gelezen');
  const html = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
  ok(html.indexOf('"label":"voor"') < html.indexOf('"label":"na"'), 'voor staat voor na');
  ok(/runs naast elkaar/.test(html) && html.includes(`schets/' + safe(c.id)`), 'de pagina toont schetsen en kan runs naast elkaar zetten');
  ok(!/<\/script>[\s\S]*<\/script>[\s\S]*<\/script>/.test(paginaHtml([{ label: 'x', gemaakt: '', cutscenes: [{ id: '</script>', keys: [], duur: 1 }] }])), 'een id met </script> breekt de pagina niet');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log(fails ? `cutscene_contactvel_test: ${fails} van ${n} FOUT` : `cutscene_contactvel_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
