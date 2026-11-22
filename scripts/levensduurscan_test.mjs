// De levensduurscan (scripts/perf/lifecyclescan.mjs, #1065) en de plekken die hij aanwees: helirun, postgame en de duivenmodus geven hun
// per-exemplaar-resources terug. Pure test: bronteksten en fixtures, geen THREE.
//   node scripts/levensduurscan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scanSource } from './perf/lifecyclescan.mjs';

let n = 0;
const t = (naam, f) => { f(); n++; };
const lees = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const soorten = (src) => scanSource(src, 'x.js').map((x) => x.soort);

t('interval zonder clearInterval wordt gemeld, met clearInterval of unref niet', () => {
  assert.deepEqual(soorten('function a() {\n  setInterval(() => {}, 100);\n}\n'), ['interval']);
  assert.deepEqual(soorten('let h;\nfunction a() {\n  h = setInterval(() => {}, 100);\n}\nfunction b() { clearInterval(h); }\n'), []);
  assert.deepEqual(soorten('function a() {\n  const t = setInterval(() => {}, 100);\n  t.unref();\n}\n'), []);
});

t('luisteraar diep in een functie zonder removeEventListener wordt gemeld; once, signal en remove niet', () => {
  const diep = (rest) => `function a() {\n  if (x) {\n    window.addEventListener('keydown', f${rest});\n  }\n}\n`;
  assert.deepEqual(soorten(diep('')), ['luisteraar']);
  assert.deepEqual(soorten(diep(', { once: true }')), []);
  assert.deepEqual(soorten(diep('') + "function b() { window.removeEventListener('keydown', f); }\n"), []);
  assert.deepEqual(soorten("window.addEventListener('keydown', f);\n"), [], 'bovenste niveau: eenmalig');
});

t('resource alleen als het bestand dingen uit de scene haalt en nergens vrijgeeft', () => {
  const maak = "function a() {\n  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), x);\n  scene.add(m);\n}\n";
  assert.deepEqual(soorten(maak), [], 'zonder verwijderen geen verdenking (singleton)');
  assert.deepEqual(soorten(maak + 'function b(m) { scene.remove(m); }\n'), ['resource']);
  assert.deepEqual(soorten(maak + 'function b(m) { scene.remove(m); m.geometry.dispose(); }\n'), []);
});

t('een bestand mag zich vrijstellen met een reden', () => {
  assert.deepEqual(soorten('// lifecycle-ok: eenmalig bij het laden\nfunction a() {\n  setInterval(() => {}, 1);\n}\n'), []);
  assert.deepEqual(soorten('// lifecycle-ok:\nfunction a() {\n  setInterval(() => {}, 1);\n}\n'), ['interval'], 'zonder reden telt het niet');
});

t('helirun geeft de lichtzuil en de lier per run vrij, niet de gedeelde ringen', () => {
  const s = lees('game/js/helirun.js');
  assert.ok(/for \(const o of \[r\.beacon, r\.hanger\]\) if \(o\) \{ try \{ disposeObject\(o\)/.test(s));
  assert.ok(!/disposeObject\(r\.rings\)/.test(s));
});

t('postgame geeft de plekmarkers, Jelle en het laken vrij', () => {
  const s = lees('game/js/postgame.js');
  assert.ok(/disposeObject\(s\.marker\)/.test(s) && /disposeObject\(s\.jelle\)/.test(s) && /disposeObject\(sheet\)/.test(s));
});

t('duivenmodus: elk weghalen van eten, meeuw of kudde geeft de geometrieen terug', () => {
  const s = lees('game/js/pigeonmode.js');
  assert.ok(!/scene\.remove\((?:f|g|b|gull|foods?\[[^\]]*\])\.mesh\)/.test(s), 'geen kale scene.remove meer voor vogels en eten');
  assert.ok((s.match(/freeMesh\(/g) || []).length >= 8);
  assert.ok(/SHARED_GEO\.add\(dropGeo\)/.test(s) && /for \(const g of splatGeos\) SHARED_GEO\.add\(g\)/.test(s), 'de gedeelde druppel en splat blijven');
});

console.log(`levensduurscan_test ok (${n} groepen)`);
