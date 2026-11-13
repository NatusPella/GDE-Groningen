// #836: één toets voor het waypoint (5), met een eigen doel en zonder een missieroute te breken.
// Broncheck plus de pure toetsregistratie; de wereld zelf heeft een DOM en three nodig.
//   node scripts/snelwaypoint_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KEY_ACTIONS } from '../game/js/controls.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de toets staat in de bestuurbare acties', () => {
  const actie = KEY_ACTIONS.find(([k]) => k === '5');
  assert.ok(actie, 'key 5 is een actie');
  assert.match(actie[1], /waypoint/i);
});

t('T blijft de trekkerhef en de treinwachttijd', () => {
  assert.ok(!KEY_ACTIONS.some(([k]) => k === 't'), 'T is niet opnieuw bezet');
});

t('de sneltoets zet of wist een eigen waypoint en laat missies met rust', () => {
  const src = lees('snelwaypoint.js');
  assert.match(src, /wasPressed\('5'\)/);
  assert.match(src, /getUserWaypoint\(\)/);
  assert.match(src, /clearUserWaypoint\(\)/);
  assert.match(src, /setUserWaypoint\(g\.x, g\.y, g\.name\)/);
  assert.match(src, /g\.kind === 'mission'/, 'een missiedoel wordt niet overgenomen');
  assert.match(src, /playerBusy\(world, \['missionPhase', 'cinematic'\]\)/, 'niet tijdens een missie of filmpje');
});

console.log(`snelwaypoint_test: ${n}/${n} ok`);
