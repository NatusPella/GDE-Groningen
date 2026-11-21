// Zomervariatie per kalenderdag (game/js/summerday.js, 21-11): determinisme, variatie, constitution 3 (altijd zomer) en het beeldbudget.
// node scripts/summerday_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import * as S from '../game/js/sunrules.js';
import * as Z from '../game/js/summerday.js';
import { gradeParams } from '../game/js/worldgrade.js';
import { WEATHER_KINDS } from '../game/js/weatherstate.js';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const lees = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
S.setSunDeclination(15);

// -- determinisme: dezelfde dag en klok geven bij iedereen hetzelfde (Samen spelen zonder netwerkverkeer) --------------------
let gelijk = true;
for (let dag = 1; dag <= 60; dag++) for (let uur = 0; uur < 24; uur += 0.5) {
  if (JSON.stringify(Z.summerLayer(dag, uur, {})) !== JSON.stringify(Z.summerLayer(dag, uur))) gelijk = false;
}
ok(gelijk, 'summerLayer(dag, uur) is deterministisch');
const out = {}; Z.summerLayer(5, 14, out); const k1 = JSON.stringify(out); Z.summerLayer(9, 3, out); Z.summerLayer(5, 14, out);
ok(JSON.stringify(out) === k1, 'hergebruik van het out-object laat geen rest achter');

// -- variatie: alle soorten komen voor, geen lange reeks gelijke dagen -------------------------------------------------------
const teller = {}; let langste = 1, reeks = 1;
for (let d = 1; d <= 366; d++) {
  const s = Z.summerKind(d); teller[s] = (teller[s] || 0) + 1;
  if (d > 1 && s === Z.summerKind(d - 1)) { reeks++; langste = Math.max(langste, reeks); } else reeks = 1;
}
for (const s of Z.SUMMER_KINDS) ok((teller[s] || 0) >= 15, `soort ${s} komt voor (${teller[s] || 0} van 366)`);
ok(langste <= 6, `geen reeks van meer dan 6 gelijke dagen (${langste})`);
let regenboogDagen = 0, mistDagen = 0, onweerDagen = 0, vliegDagen = 0;
for (let d = 1; d <= 366; d++) {
  let rb = 0, mi = 0, th = 0, vl = 0;
  for (let u = 0; u < 24; u += 0.25) { const l = Z.summerLayer(d, u); rb = Math.max(rb, l.rainbow); mi = Math.max(mi, l.mist); th = Math.max(th, l.thunder ? 1 : 0); vl = Math.max(vl, l.flies); }
  if (rb > 0.05) regenboogDagen++; if (mi > 0.1) mistDagen++; if (th) onweerDagen++; if (vl > 0.2) vliegDagen++;
}
ok(regenboogDagen >= 3 && mistDagen >= 20 && onweerDagen >= 3 && vliegDagen >= 50, 'regenboog, mist, onweer en vliegjes komen voor', `${regenboogDagen}/${mistDagen}/${onweerDagen}/${vliegDagen}`);

// -- verloop binnen een dag --------------------------------------------------------------------------------------------------
let buiDag = 0; while (Z.summerKind(buiDag) !== 'bui') buiDag++;
const bd = Z.summerDay(buiDag);
ok(Z.summerLayer(buiDag, bd.showerStart + bd.showerLen / 2).rain > 0.4, 'midden in de bui regent het');
ok(Z.summerLayer(buiDag, 8).rain === 0 && Z.summerLayer(buiDag, bd.showerStart + bd.showerLen + 2).rain === 0, 'voor en lang na de bui is het droog');
let rbOk = true;
for (let d = 0; d < 366; d++) {
  if (Z.summerKind(d) !== 'bui') continue;
  const b = Z.summerDay(d);
  for (let u = 0; u < 24; u += 0.05) { const l = Z.summerLayer(d, u); if (l.rainbow > 0.01 && (l.rain > 0.05 || u < b.showerStart + b.showerLen)) rbOk = false; }
}
ok(rbOk, 'regenboog alleen ná de bui, nooit tijdens de regen');
let geenBui = 0; while (Z.summerKind(geenBui) === 'bui') geenBui++;
ok(Z.summerLayer(geenBui, 15).rainbow === 0, 'zonder bui geen regenboog');
let mistOk = true;
for (let d = 1; d <= 100; d++) for (let u = 12; u < 24; u += 0.5) if (Z.summerLayer(d, u).mist > 0) mistOk = false;
ok(mistOk, 'ochtendmist alleen voor de middag');
let hitteDag = 0; while (Z.summerKind(hitteDag) !== 'hitte') hitteDag++;
ok(Z.summerLayer(hitteDag, 15).heat > 0.7 && Z.summerLayer(hitteDag, 3).heat === 0, 'hitte piekt in de middag en is er niet in de nacht');
ok(Z.summerLayer(hitteDag, 15).tempC >= 30, 'een hitte-dag is 30 graden of meer');

// -- constitution 3: altijd zomer, nooit winters, in alle waarden --------------------------------------------------------------
let slecht = '';
const kinds = new Set(WEATHER_KINDS);
for (let d = 0; d <= 400 && !slecht; d++) for (let u = 0; u < 24; u += 0.25) {
  const l = Z.summerLayer(d, u);
  if (!(l.tempC >= Z.SUMMER_LIMITS.minTempC && l.tempC <= 36)) slecht = `temp ${l.tempC} dag ${d} uur ${u}`;
  for (const k of ['heat', 'overcast', 'rain', 'mist', 'rainbow', 'wind', 'glow', 'flies', 'sunglasses', 'umbrella', 'shelter']) if (!(l[k] >= 0 && l[k] <= 1)) slecht = `${k}=${l[k]} dag ${d} uur ${u}`;
  if (l.rain > Z.SUMMER_LIMITS.maxRain) slecht = `regen ${l.rain}`;
  if (!Z.SUMMER_KINDS.includes(l.kind)) slecht = `soort ${l.kind}`;
  const c = Z.combineSummer({ kind: 'helder', rain: 0.3, overcast: 0.4, mist: 0.1, thunder: false, windAngle: 1 }, l, 'noord', {});
  if (!kinds.has(c.kind) || c.rain > 0.85 || c.windStrength > 1) slecht = `combineer ${JSON.stringify(c)}`;
  if (slecht) break;
}
ok(slecht === '', 'alle waarden binnen de zomergrenzen (nooit onder 14 graden, regen hoogstens 0,85, alleen bekende weersoorten)', slecht);
const bron = lees('../game/js/summerday.js') + lees('../game/js/summerflies3d.js');
const verboden = bron.match(/\b(sneeuw\w*|ijs|vorst|winter\w*|hagel|vriez\w*|snow|ice|frost|blizzard)\b/gi);
ok(!verboden, 'geen winterwoorden in de zomerbron', verboden ? verboden.join(',') : '');
ok(!/Math\.random/.test(bron), 'geen Math.random in de zomerbron');
// de wereldkleur blijft werken in elke stand; hitte en gloed warmen alleen, "uit" blijft neutraal
for (const stand of ['uit', 'subtiel', 'drukwerk']) {
  const p = gradeParams({ stand, niveau: 'hoog', elevation: 40, hour: 14, hitte: 1, gloed: 1 }, {});
  if (stand === 'uit') ok(!p.actief && p.satMul === 1 && p.lichtMul.every((v) => v === 1), 'Wereldkleur Uit: hitte en gloed veranderen niets');
  else ok(p.actief && p.lichtMul.every(Number.isFinite) && p.satMul <= 1 && p.satMul >= 0.85, `Wereldkleur ${stand}: hitte geeft geldige parameters`);
}

// -- beeldbudget: vaste limiet aan extra draw calls ------------------------------------------------------------------------------
const v = lees('../game/js/summerflies3d.js');
const objecten = (v.match(/new THREE\.(Points|Mesh|Line|LineSegments|Sprite|InstancedMesh)\b/g) || []).length;
ok(objecten === 1 && /new THREE\.Points\b/.test(v), 'de vliegjes zijn één Points-object (één draw call)');
ok(objecten <= Z.SUMMER_LIMITS.extraDrawCalls, `extra draw calls (${objecten}) binnen de limiet ${Z.SUMMER_LIMITS.extraDrawCalls}`);
ok(Z.SUMMER_LIMITS.maxFlies <= 150, 'hoogstens 150 vliegjes');
ok(/uRainbow/.test(lees('../game/js/weather.js')), 'de regenboog gebruikt de bestaande uniform van de lucht (0 extra draw calls)');
const tmp = {}; const t0 = performance.now();
for (let i = 0; i < 20000; i++) Z.summerLayer(7 + (i % 40), (i % 96) / 4, tmp);
const us = (performance.now() - t0) / 20;
ok(us < 40, 'summerLayer kost minder dan 40 microseconden per beeld', `${us.toFixed(1)} us`);
console.log(fails ? `${fails} van ${n} mislukt` : `summerday_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
