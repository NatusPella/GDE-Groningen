// Frietwagen-mijlpalen (#1136): de vlaggen volgen de stappen, een oude save krijgt ze, niets wordt hernoemd of weggehaald.
// node scripts/storymilestones_test.mjs
import fs from 'node:fs';
import { VAN_MILESTONES, VAN_FLAGS, milestoneFlagsFor, milestoneFlagsForDone, vanStage } from '../game/js/storymilestones.js';
import { STEPS, PARTS } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const idx = (id) => STEPS.findIndex((s) => s.id === id);

ok(VAN_FLAGS.join() === 'wagen:idee,wagen:menu,wagen:stek,wagen:team,wagen:naam,wagen:standplaats,wagen:keten', 'de zeven mijlpalen (alleen toevoegen, nooit hernoemen)');
ok(VAN_MILESTONES.every((m) => idx(m.step) >= 0 && PARTS[m.akte] && STEPS[idx(m.step)].part === m.akte), 'elke mijlpaal hangt aan een bestaande stap in zijn akte');
ok(VAN_MILESTONES.every((m, i) => i === 0 || idx(m.step) > idx(VAN_MILESTONES[i - 1].step)), 'de mijlpalen staan in verhaalvolgorde');
ok(VAN_MILESTONES.every((m) => m.text.length > 20 && /[.]$/.test(m.text)), 'elke mijlpaal heeft een zin');
ok(milestoneFlagsFor('M08').join() === 'wagen:menu' && milestoneFlagsFor('M09').length === 0, 'een stap geeft precies zijn vlag');
ok(milestoneFlagsForDone(new Set()).length === 0, 'een nieuw spel heeft niets');
ok(milestoneFlagsForDone(new Set(['M00', 'M01'])).join() === 'wagen:idee', 'na de opening: alleen het idee');
ok(milestoneFlagsForDone(new Set(['M10'])).join() === 'wagen:idee,wagen:menu', 'een sprong naar M10 geeft ook de eerdere mijlpalen');
ok(milestoneFlagsForDone(['M30']).length === 7, 'het einde geeft ze allemaal');
ok(vanStage(new Set(['wagen:idee', 'wagen:menu'])) === 2 && vanStage([]) === 0, 'vanStage telt');

const story = fs.readFileSync(new URL('../game/js/story.js', import.meta.url), 'utf8');
ok((story.match(/milestoneFlagsFor\(/g) || []).length >= 2 && /milestoneFlagsForDone\(state\.done\)/.test(story), 'story.js zet de vlaggen bij een stap, een devJump en bij het laden');
ok(!/flags\.delete\([^)]*wagen/.test(story), 'niets haalt een wagenvlag weg');

console.log(`storymilestones_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
