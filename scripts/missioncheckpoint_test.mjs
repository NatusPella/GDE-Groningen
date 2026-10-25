// Checkpoints, grace en Opnieuw-aanbod (game/js/missioncheckpoint.js, #213 en #214), plus de
// bedrading in missions.js en storytravel.js. Pure regels, geen Electron.
import fs from 'node:fs';
import {
  CHECKPOINT_KINDS, isCheckpointStage, makeCheckpoint, applyCheckpointProgress, recordCheckpoint,
  GRACE_S, createGrace, stepGrace, createRetryOffer, retryOfferLive, RETRY_OFFER_S, RETRY_KEYS,
} from '../game/js/missioncheckpoint.js';
import { placeParty, applyTravel } from '../game/js/storytravel.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// --- welke stages een checkpoint zijn
const def = { stages: [{ kind: 'goto' }, { kind: 'scene' }, { kind: 'goto' }, { kind: 'hold' }, { kind: 'goto' }, { kind: 'board' }, { kind: 'bake' }, { kind: 'goto' }, { kind: 'plan' }] };
ok(!isCheckpointStage(def, 0), 'stage 0 is geen checkpoint');
ok(isCheckpointStage(def, 2) && isCheckpointStage(def, 4) && isCheckpointStage(def, 6) && isCheckpointStage(def, 7), 'na scene, hold, board en bake');
ok(!isCheckpointStage(def, 1) && !isCheckpointStage(def, 3) && !isCheckpointStage(def, 5), 'niet na een goto');
ok(!isCheckpointStage(def, 8) && !isCheckpointStage(def, 99) && !isCheckpointStage(null, 1) && !isCheckpointStage({}, 1), 'plan, buiten bereik en leeg');
ok(CHECKPOINT_KINDS.includes('scene') && CHECKPOINT_KINDS.includes('hold') && CHECKPOINT_KINDS.includes('board'), 'standaardsoorten');
const d2 = { stages: [{ kind: 'goto' }, { kind: 'goto', checkpoint: true }, { kind: 'scene' }, { kind: 'goto', checkpoint: false }, { kind: 'choice' }] };
ok(isCheckpointStage(d2, 1), 'checkpoint: true forceert');
ok(!isCheckpointStage(d2, 3), 'checkpoint: false verbiedt');
ok(!isCheckpointStage(d2, 4), 'een keuze-stage nooit');
ok(!isCheckpointStage({ ...def, checkpoints: false }, 2), 'def.checkpoints=false zet het uit');
const heist = { heist: {}, stages: [{ kind: 'goto' }, { kind: 'scene' }, { kind: 'getaway', checkpoint: true }, { kind: 'goto' }] };
ok(isCheckpointStage(heist, 2) && !isCheckpointStage(heist, 3), 'inbraak: alleen op verzoek');
ok(!isCheckpointStage({ heist: {}, stages: [{ kind: 'goto' }, { kind: 'scene' }, { kind: 'goto' }] }, 2), 'inbraak: niet automatisch');

// --- momentopname en voortgang
const chain = { eggs: 80, eggWarn: 80, clockRate: 1.5, windowT: 12, hijacked: false, stopIndex: 2, rommel: 'x', timeLeft: 300 };
const cp = makeCheckpoint({ missionIndex: 8, stageIndex: 3, timeLeft: 300, chain, player: { x: 1, y: 2, angle: 0.5 }, vehicle: { x: 3, y: 4, angle: 1, inside: true } });
ok(cp.progress.eggs === 80 && cp.progress.clockRate === 1.5 && cp.progress.rommel === undefined, 'alleen bekende velden mee');
ok(cp.vehicle.inside && cp.player.x === 1 && cp.stageIndex === 3, 'plek en stage');
const nieuw = { timeLeft: 20, eggs: 100 };
applyCheckpointProgress(cp, nieuw);
ok(nieuw.eggs === 80 && nieuw.clockRate === 1.5 && nieuw.timeLeft === 300, 'voortgang en tijd terug');
const kort = { timeLeft: 5 };
applyCheckpointProgress(makeCheckpoint({ missionIndex: 1, stageIndex: 1, timeLeft: 7, chain: {} }), kort);
ok(kort.timeLeft === 45, 'minstens 45 s over');
const zonderKlok = { timeLeft: Infinity };
applyCheckpointProgress(makeCheckpoint({ missionIndex: 1, stageIndex: 1, timeLeft: Infinity, chain: {} }), zonderKlok);
ok(zonderKlok.timeLeft === Infinity, 'zonder tijdslimiet blijft oneindig');
ok(makeCheckpoint({ missionIndex: 1, stageIndex: 1, timeLeft: NaN, chain: {} }).timeLeft === null, 'NaN wordt null');
ok(makeCheckpoint({ missionIndex: 1, stageIndex: 1, timeLeft: 9, chain: {} }).vehicle === null, 'geen voertuig');

// --- opslag: nooit terug naar een eerdere stage
const store = new Map();
ok(recordCheckpoint(store, { missionIndex: 5, stageIndex: 2 }), 'eerste bewaard');
ok(recordCheckpoint(store, { missionIndex: 5, stageIndex: 4 }) && store.get(5).stageIndex === 4, 'verder is nieuwer');
ok(!recordCheckpoint(store, { missionIndex: 5, stageIndex: 3 }) && store.get(5).stageIndex === 4, 'eerder wordt genegeerd');
ok(recordCheckpoint(store, { missionIndex: 6, stageIndex: 1 }) && store.size === 2, 'per missie een');

// --- grace
const g = createGrace();
ok(stepGrace(g, 1, 'near').state === 'ok', 'dichtbij is ok');
let r = stepGrace(g, 5, 'away');
ok(r.state === 'grace' && r.left === GRACE_S - 5 && g.active, 'weg: grace loopt');
r = stepGrace(g, 5, 'near');
ok(r.state === 'ok' && g.left === GRACE_S && !g.active, 'terug: grace vol');
for (let t = 0; t < GRACE_S - 1; t++) r = stepGrace(g, 1, 'away');
ok(r.state === 'grace', 'bijna op');
r = stepGrace(g, 1.5, 'away');
ok(r.state === 'fail' && r.left === 0, 'op: mislukt');
ok(stepGrace(createGrace(), 0, 'gone').state === 'fail', 'kapot of weg: direct');
ok(GRACE_S >= 20 && GRACE_S <= 30, 'grace 20 tot 30 s');
const g3 = createGrace();
stepGrace(g3, 10, 'away'); stepGrace(g3, 0, 'near');
ok(stepGrace(g3, 24, 'away').state === 'grace', 'na terugkeer begint de klok opnieuw');

// --- Opnieuw-aanbod
const o = createRetryOffer(7, 100);
ok(retryOfferLive(o, 100) && retryOfferLive(o, 100 + RETRY_OFFER_S - 1) && !retryOfferLive(o, 100 + RETRY_OFFER_S), 'aanbod verloopt');
o.done = true;
ok(!retryOfferLive(o, 101) && !retryOfferLive(null, 0), 'klaar of leeg');
ok(RETRY_KEYS.includes('enter') && RETRY_KEYS.includes('e'), 'Enter en E (pad en touch sturen E)');

// --- party naar de startplek (hergebruik van storytravel)
const w = { player: { x: 0, y: 0, vx: 3, vy: 3, inVehicle: { x: 0, y: 0, speed: 20 } }, companion: { state: 'ok', x: 9, y: 9, vx: 1, vy: 1 } };
placeParty(w, { x: 100, y: 50 });
ok(w.player.x === 100 && w.player.vx === 0 && w.player.inVehicle.x === 100 && w.player.inVehicle.speed === 0, 'speler en voertuig');
ok(w.companion.x === 101.5 && w.companion.y === 50, 'metgezel ernaast');
const w2 = { player: { x: 0, y: 0, vx: 0, vy: 0 }, companion: { state: 'dead', x: 9, y: 9 } };
placeParty(w2, { x: 5, y: 5 });
ok(w2.companion.x === 9, 'dode metgezel blijft');
ok(typeof applyTravel === 'function', 'applyTravel blijft bestaan');

// --- bedrading
const read = (p) => fs.readFileSync(new URL(`../game/js/${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const m = read('missions.js');
ok(/from '\.\/missioncheckpoint\.js'/.test(m), 'missions.js importeert missioncheckpoint');
ok(/saveCheckpoint\(world, def, k\);\n\}/.test(m), 'checkpoint wordt aan het eind van enterStage bewaard');
ok(/if \(chain\.resume\) resumeFromCheckpoint\(world, def\);\n\s+else enterStage\(world, def, 0\);/.test(m), 'hervatten bij het starten van de stages');
ok(/chain\.checkpoints\.delete\(i\)/.test(m), 'succes wist het checkpoint');
ok(/chain\.checkpoints\.clear\(\)/.test(m), 'laden wist de checkpoints');
ok(/chain\.retry = chain\.defs\[chain\.index\][^\n]*createRetryOffer/.test(m), 'falen biedt Opnieuw aan');
ok(/updateRetry\(dt, world, def\);\n\n\s+if \(chain\.phase === 'cooldown'\)/.test(m), 'Opnieuw wordt elke frame bijgehouden');
ok(/stepGrace\(g, dt, far \? 'away' : 'near'\)/.test(m), 'verlaten voertuig geeft grace');
ok(/if \(mee\) chain\.completed\.add\(chain\.index\)/.test(m), 'opdracht van een gast: alleen met J van de gastheer telt hij als geklaard (#452)');
ok(/sluitGastStart\(world, mee\)/.test(m), 'en zijn eigen keten blijft staan als hij toekeek (#452)');
ok(/wrecked \|\| v\.disabled\) return vf\.wrecked/.test(m), 'kapot blijft direct falen');
ok(/placeParty\(world, def\.start\)/.test(m), 'Opnieuw zet de groep op de startplek');
ok(/kind: 'getaway', checkpoint: true/.test(m), 'M06: checkpoint bij de vlucht na de lege vitrine');
const saves = read('savegame.js') + read('savemigrate.js');
ok(!/checkpoints/.test(saves), 'checkpoints staan niet in de save (tijdelijk, save/laad breekt niets)');

console.log(`${n - fails}/${n} missioncheckpoint_test`);
process.exit(fails ? 1 : 0);
