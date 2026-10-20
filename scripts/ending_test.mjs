// When the credits roll (game/js/ending.js): only after the finale, every
// story mission passed and every post-game challenge done, and only once.
//   node scripts/ending_test.mjs
import { endingProgress, creditsDue, endingLeftText } from '../game/js/ending.js';
import { STEPS, stepAvailable } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const codes = STEPS.filter((s) => s.kind === 'mission' && s.mission && stepAvailable(s)).map((s) => s.id);
ok(codes.length > 0, 'the story has built missions', String(codes.length));
const missions = (open = []) => codes.map((code) => ({ code, title: code, passed: !open.includes(code) }));
const CH = [['bruggen', true], ['fierljep', true], ['skutsje', true], ['fjord', false], ['koe', false]];
const challenges = (left = []) => CH.map(([id, jelle]) => ({ id, name: id, jelle, cleared: !left.includes(id) }));

const all = endingProgress({ finale: true, missions: missions() }, challenges());
ok(all.done && all.count === 0, 'everything done');
ok(creditsDue(all), 'credits roll when everything is done');
ok(!creditsDue(all, { seen: true }), 'credits roll only once');
ok(!creditsDue(all, { busy: true }), 'credits wait while something else runs');
ok(endingLeftText(all) === '', 'nothing left to say');

const noFinale = endingProgress({ finale: false, missions: missions() }, challenges());
ok(!noFinale.done && !creditsDue(noFinale), 'no credits before the finale has played');

const lastOne = endingProgress({ finale: true, missions: missions() }, challenges(['koe']));
ok(!lastOne.done && lastOne.count === 1 && !creditsDue(lastOne), 'one challenge left: no credits yet');
ok(endingLeftText(lastOne) === '1 uitdaging', 'one challenge left: text', endingLeftText(lastOne));

const skipped = endingProgress({ finale: true, missions: missions([codes[0], codes[codes.length - 1]]) }, challenges());
ok(!skipped.done && skipped.missions.length === 2, 'skipped missions keep the credits back');
ok(endingLeftText(skipped) === '2 missies', 'missions text', endingLeftText(skipped));

const mixed = endingProgress({ finale: true, missions: missions([codes[0]]) }, challenges(['bruggen', 'skutsje', 'fjord']));
ok(mixed.count === 4, 'mixed count', String(mixed.count));
ok(endingLeftText(mixed) === '2 uitdagingen van Jelle, 1 andere uitdaging en 1 missie', 'mixed text', endingLeftText(mixed));

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
