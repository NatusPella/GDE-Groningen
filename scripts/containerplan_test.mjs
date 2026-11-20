// Het containerlabyrint (M13) ligt op de plek waar de containers staan (#928):
// de missie stuurde je naar container 4471, maar die stond 260 m van de kade in
// het weiland. containerplan.js is de ene bron voor de missiestappen en de
// rekwisieten (containerterminal.js); deze test houdt die twee bij elkaar.
//   node scripts/containerplan_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wgsToWorld } from '../game/js/rdnew.js';
import { M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT, CONTAINER_STACKS, CABLE_REELS } from '../game/js/containerplan.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

t('de container staat op de plek uit de missie, niet verder het land in', () => {
  const [bx, by] = wgsToWorld(53.4440, 6.8560);
  assert.ok(Math.abs(M13_QUAY.x - bx) < 1e-9 && Math.abs(M13_QUAY.y - by) < 1e-9, 'de kade is het startpunt');
  assert.equal(M13_CONTAINER.x, bx + 260);
  assert.equal(M13_CONTAINER.y, by + 40);
  assert.equal(M13_CRANE.x, bx + 120);
  assert.equal(M13_CRANE.y, by - 55);
  assert.equal(M13_LAMMERT.x, bx + 10);
  assert.equal(M13_LAMMERT.y, by + 5);
});

t('er staat een blauwe en een rode container om 4471 te herkennen', () => {
  assert.ok(CONTAINER_STACKS.length >= 4);
  const blauw = CONTAINER_STACKS.filter((c) => c.kleur === '#2d6a86');
  const rood = CONTAINER_STACKS.filter((c) => c.kleur === '#d55e00');
  assert.equal(blauw.length, 1);
  assert.ok(rood.length >= 1, 'de blauwe staat naast de rode');
  assert.ok(blauw[0].lengte >= 12, 'een echte zeecontainer is 12 m');
  for (const c of CONTAINER_STACKS) {
    assert.ok(Math.hypot(c.x - M13_CONTAINER.x, c.y - M13_CONTAINER.y) < 20, 'de stapel staat bij het doel');
    assert.ok(c.stapel >= 0 && c.stapel <= 1);
  }
  assert.ok(CABLE_REELS.length >= 2, 'de kabelrollen staan bij de kraan');
});

t('de missie gebruikt dezelfde plekken als de rekwisieten', () => {
  const missie = lees('missions_nieuw.js');
  assert.match(missie, /import \{ M13_QUAY, M13_CRANE, M13_CONTAINER, M13_LAMMERT \} from '\.\/containerplan\.js'/);
  assert.match(missie, /start: \{ \.\.\.M13_QUAY \}/);
  assert.match(missie, /target: \{ \.\.\.M13_CRANE, label: 'De kraan aan de kade' \}/);
  assert.match(missie, /target: \{ \.\.\.M13_CONTAINER, label: 'Container 4471' \}/);
  assert.match(missie, /target: \{ \.\.\.M13_LAMMERT, label: 'Lammert, aan de kade' \}/);
  assert.ok(!/spotAt\(53\.4440, 6\.8560, 260, 40\)/.test(missie), 'geen losse offset meer');
});

t('de rekwisieten bouwen de stapel, de kraan en de rollen op die plekken', () => {
  const bron = lees('containerterminal.js');
  assert.match(bron, /import \{ M13_CRANE, M13_CONTAINER, CONTAINER_STACKS, CABLE_REELS \} from '\.\/containerplan\.js'/);
  assert.match(bron, /for \(const c of CONTAINER_STACKS\) stapel\(root, c\)/);
  assert.match(bron, /kraan\(root\)/);
  assert.match(bron, /addStaticCollider\('container', c\.x, c\.y/);
  assert.match(lees('heist.js'), /placeContainerTerminal\(world, THREE\)/, 'de bare-missie zet de rekwisieten neer');
});

t('de kabelrol krijgt zijn straal, niet het hele rolobject (NaN-geometrie bij de start van M13, #955)', () => {
  const bron = lees('containerterminal.js');
  assert.match(bron, /new T.CylinderGeometry(r.r, r.r, 2.2, 14)/);
  assert.doesNotMatch(bron, /new T.CylinderGeometry(r, r,/);
});

console.log(`containerplan_test: ${n}/${n} ok`);
