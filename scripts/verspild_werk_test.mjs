// Verspild werk per beeld (#1287): geen nieuwe lijst, kloon of filter per beeld als er niets te doen is.
// Bronregels (combat.js, police.js en audio.js laden in node niet zonder DOM en Web Audio); spikestrips3d draait echt.
//   node scripts/verspild_werk_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok    ' + naam); } catch (e) { fails++; console.log('FAIL  ' + naam + ' :: ' + e.message); } };

t('combat.js: de deeltjeslijst wordt alleen gefilterd als hij niet leeg is', () => {
  assert.match(bron('combat.js'), /if \(world\.particles\.length\) world\.particles = world\.particles\.filter\(/);
});
t('police.js: de zoeklichtkegel kloont geen vector per beeld', () => {
  const s = bron('police.js');
  const f = s.slice(s.indexOf('export function updatePoliceHeliMesh3D'), s.indexOf('export function updatePoliceHeliMesh3D') + 1500);
  assert.ok(!/\.clone\(\)/.test(f), 'geen clone() in updatePoliceHeliMesh3D');
  assert.match(f, /const dir = target\.sub\(origin\)/);
});
t('audio.js: de sirenelijst is één hergebruikte lijst zonder filter of concat', () => {
  const s = bron('audio.js');
  const f = s.slice(s.indexOf('function updateSiren('), s.indexOf('function updateSiren(') + 900);
  assert.ok(!/\.filter\(|\.concat\(/.test(f), 'geen filter of concat');
  assert.match(f, /const units = _sirenUnits;/);
  assert.match(s, /const _sirenUnits = \[\];/);
});

const { updateSpikeStrips3D } = await import('../game/js/spikestrips3d.js');
t('spikestrips3d: zonder spijkermat geen filter over de velden', () => {
  let gelezen = 0;
  const fields = new Proxy([], { get(doel, k) { if (k === 'filter') gelezen++; return Reflect.get(doel, k); } });
  const world = { shards: { fields }, map: { groundHeightAt: () => 0 } };
  for (let i = 0; i < 50; i++) updateSpikeStrips3D(0.016, world, null);
  assert.equal(gelezen, 0, 'filter-aanroepen: ' + gelezen);
});
t('spikestrips3d: een mat erbij en weer weg tekent en ruimt nog steeds', () => {
  const added = [], removed = [];
  const scene = { add: (m) => added.push(m), remove: (m) => removed.push(m) };
  const mat = { kind: 'spijkers', x: 1, y: 2, angle: 0 };
  const world = { shards: { fields: [mat] }, map: { groundHeightAt: () => 0 } };
  updateSpikeStrips3D(0.016, world, scene);
  assert.equal(added.length, 1, 'mat getekend');
  world.shards.fields = [];
  updateSpikeStrips3D(0.016, world, scene);
  assert.equal(removed.length, 1, 'mat opgeruimd');
});

console.log(fails ? `verspild_werk_test: ${fails} van ${n} mislukt` : `verspild_werk_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
