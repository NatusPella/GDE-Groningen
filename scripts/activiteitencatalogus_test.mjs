// #677: "Te doen" is de enige catalogus van alles wat er te doen is. Deze test bewaakt dat elke
// activiteit uit activities.js erin staat: een activiteit levert zelf een todo-regel of krijgt de
// standaardregel uit game/js/activitytodo.js, en de samen-status komt uit coopstatus.js.
//   node scripts/activiteitencatalogus_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const T = await import(new URL('../game/js/activitytodo.js', import.meta.url).href);
const ACT = lees('game/js/activities.js');

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };

// De 26 activiteiten uit activities.js (zonder de module te laden: die haalt THREE en de DOM).
const imports = {};
for (const m of ACT.matchAll(/import \{ ([^}]+) \} from '\.\/([^']+)\.js';/g)) for (const naam of m[1].split(',').map((x) => x.trim().split(' as ')[0])) imports[naam] = m[2];
const lijst = ACT.match(/const LIST = \[([^\]]+)\]/)[1].split(',').map((x) => x.trim());
const moduleBronnen = lijst.map((naam) => (imports[naam] ? lees(`game/js/${imports[naam]}.js`) : ACT));
const ids = ['carbid', 'kermis', 'hoogvlieger', 'geheimen', 'drift', 'discgolf', 'pitchputt', 'skatepark', 'kartbaan',
  'zwembad', 'klimtoren', 'waterski', 'carillon', 'pannenkoek', 'hengelen', 'boeren', 'wandeling', 'snackketen',
  'evenementen', 'regatta', 'ringrace', 'vliegschool', 'safehuis', 'pvparena', 'vluchtdienst', 'vaardienst'];

t('activities.js heeft 26 activiteiten en een id-bron', () => {
  assert.equal(lijst.length, 26);
  assert.match(ACT, /export const ACTIVITEIT_IDS = LIST\.map/);
  for (const id of ids) assert.ok(moduleBronnen.some((bron) => new RegExp(`id: '${id}'`).test(bron)), `${id} bestaat als activiteit`);
});

t('de standaardregel is compleet en bruikbaar als catalogusregel', () => {
  const a = { id: 'vluchtdienst', label: 'Vluchtdienst', legend: { kind: 'act-vluchtdienst', label: 'Vluchtdienst', note: 'een vlucht van veld naar veld' } };
  const rij = T.standaardTodo(a, { x: 10, y: 20, name: 'Eelde' });
  for (const k of ['key', 'group', 'title', 'meta', 'x', 'y', 'goal', 'detail']) assert.ok(k in rij, `regel heeft ${k}`);
  assert.equal(rij.key, 'act:vluchtdienst');
  assert.equal(rij.group, 'minigames');
  assert.equal(rij.title, 'Vluchtdienst');
  assert.equal(rij.x, 10); assert.equal(rij.y, 20);
  assert.match(rij.meta, /Eelde/);
  assert.equal(rij.goal.kind, 'place');
  assert.equal(rij.goal.id, 'vluchtdienst');
  assert.ok(Array.isArray(rij.detail.rows) && rij.detail.rows.length >= 2, 'de detailrijen staan erbij');
  assert.equal(JSON.stringify(rij), JSON.stringify(T.standaardTodo(a, { x: 10, y: 20, name: 'Eelde' })), 'deterministisch');
});

t('elke activiteit kan een catalogusregel krijgen', () => {
  for (const id of ids) {
    const rij = T.standaardTodo({ id, label: id }, { x: 1, y: 2, name: 'De plek' });
    assert.ok(rij && rij.key === `act:${id}`, `${id} krijgt een regel`);
    assert.ok(rij.title && rij.title.length > 1, `${id} heeft een titel`);
  }
  assert.equal(T.standaardTodo(null, { x: 1, y: 2 }), null);
  assert.equal(T.standaardTodo({ id: 'x' }, null), null);
  assert.equal(T.standaardTodo({}, { x: 1, y: 2 }), null);
});

t('activities.js gebruikt de standaardregel voor alles zonder eigen todo', () => {
  assert.match(ACT, /import \{ standaardTodo \} from '\.\/activitytodo\.js'/);
  assert.match(ACT, /const t = typeof a\.todo === 'function' \? a\.todo\(world\) : a\.todo/, 'een todo mag een functie zijn');
  assert.match(ACT, /if \(!t \|\| !t\.key\) \{[\s\S]{0,200}standaardTodo\(a, s\)/, 'zonder eigen regel komt de standaardregel');
  assert.doesNotMatch(ACT, /const t = a\.todo;\n\s+const s = t && a\.spots\(\)\[0\];/, 'de oude skip is weg: geen activiteit valt buiten de lijst');
  assert.match(ACT, /samenStatus\('activiteit', a\.id\)/, 'de samen-status staat op elke regel');
  assert.match(ACT, /samen, samenId: a\.id/, 'de regel wijst naar de activiteit voor het detail');
});

t('de catalogus gebruikt dezelfde bron als de kaart', () => {
  // activityMapIcons en activityTodoItems lussen allebei over LIST: één lijst, geen tweede waarheid.
  assert.match(ACT, /export function activityTodoItems\(world\) \{\n  const out = \[\];\n  for \(const a of LIST\)/);
  assert.match(ACT, /export function activityMapIcons\(w\) \{[\s\S]{0,300}for \(const a of LIST\)/);
  assert.match(ACT, /startkaartRegel\(a\.id\)/, 'de kaart-hover leest de startkaartregel (#678)');
});

console.log(`activiteitencatalogus_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
