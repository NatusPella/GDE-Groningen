// Posebronnen en de opruimronde (review 22-11 P2): een bron van een interieur-NPC (persistent) overleeft prunePoseSources, een bron van een
// verdwenen voetganger niet; interiors.js zet de vlag en geeft de bronnen bij het droppen van een pand terug.
//   node scripts/pose_prune_test.mjs   (vraagt de gevendorde three.js)
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { buildPersonMesh, animatePersonWalk, registerPoseSource, unregisterPoseSource, prunePoseSources } = await import('../game/js/models3d_people.js');

const maak = (seed) => buildPersonMesh(0x3355aa, 0xd9b48f, { seed });
const stap = (m) => { animatePersonWalk(m, 0, 1 / 60); return m.userData.posed === true; };

// de reproductie uit het rapport: een zittende klant van een interieur
const bron = { state: 'alive', pose: 'sit', persistent: true };
registerPoseSource(4242, bron);
const klant = maak(4242);
assert.equal(stap(klant), true, 'de klant zit');
prunePoseSources(new Set());
assert.equal(stap(klant), true, 'na de opruimronde zit de klant nog (persistent)');

// een gewone bron (voetganger) die niet meer leeft, gaat nog steeds weg
const ped = { state: 'alive', pose: 'sit' };
registerPoseSource(4243, ped);
const burger = maak(4243);
assert.equal(stap(burger), true);
prunePoseSources(new Set());
assert.equal(stap(burger), false, 'een verdwenen voetganger verliest zijn bron');
// een levende voetganger blijft
const levend = { state: 'alive', pose: 'sit' };
registerPoseSource(4244, levend);
const l = maak(4244);
prunePoseSources(new Set([levend]));
assert.equal(stap(l), true, 'een levende voetganger houdt zijn pose');

// expliciet vrijgeven werkt ook voor een persistente bron
unregisterPoseSource(4242);
assert.equal(stap(klant), false, 'na unregisterPoseSource staat de klant op');
unregisterPoseSource(4244);

// interiors.js: vlag bij het bouwen, vrijgeven bij drop
const src = fs.readFileSync(new URL('../game/js/interiors.js', import.meta.url), 'utf8');
assert.match(src, /const src = \{ state: 'alive', pose: [^}]*persistent: true \}/, 'addNpcs zet persistent op de bron');
assert.match(src, /function drop\([^)]*\) \{[\s\S]*?for \(const o of ls\.npcs\) unregisterPoseSource\(o\.seed\)[\s\S]*?ls\.npcs\.length = 0/, 'drop geeft de posebronnen van de NPC\'s terug');
console.log('pose_prune_test ok');
