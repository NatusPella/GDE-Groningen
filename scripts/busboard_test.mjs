import assert from 'node:assert';
import { prepareLine } from '../game/js/busroutes.js';
import { boardText, busLineOf, takeOverOffer, ledText, placeOf, lineColor, nextStopInfo, stopAnnouncement, lineEnds, stopLabel, roundDist, BOARD_COLS, LINE_COLORS } from '../game/js/busboard.js';

const raw = { id: 1, ref: '75', from: 'Groningen, Hoofdstation', to: 'Winsum, Busstation', pts: [[0, 0], [2000, 0]], stops: [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 1300, y: 0 }, { x: 2000, y: 0 }] };
const line = prepareLine(raw);
assert.strictEqual(placeOf('Winsum, Busstation'), 'Winsum');
assert.strictEqual(placeOf('', 'X'), 'X');
assert.strictEqual(ledText('Hoogkerk-Noord Ommelanden Zuid'), 'HOOGKERK-NOORD.');
assert.ok(ledText('Café Ünïcode').length <= BOARD_COLS && ledText('Café') === 'CAFE');
const f = boardText(line, 1), b = boardText(line, -1);
assert.deepStrictEqual([f.ref, f.dest], ['75', 'WINSUM']);
assert.strictEqual(b.dest, 'GRONINGEN');
assert.notStrictEqual(f.key, b.key);
assert.strictEqual(lineColor('75'), lineColor('75'));
assert.ok(LINE_COLORS.includes(f.color));
assert.deepStrictEqual(lineEnds(line, -1), { from: 'Winsum', to: 'Groningen' });
assert.strictEqual(stopLabel(line, 0), 'Groningen');

let n = nextStopInfo(line, 1, 100);
assert.strictEqual(n.index, 1); assert.ok(Math.abs(n.dist - 500) < 1e-6 && !n.last);
assert.strictEqual(stopAnnouncement(n), `Volgende halte: ${n.name}`);
n = nextStopInfo(line, 1, 520);
assert.ok(stopAnnouncement(n).startsWith('Straks'));
n = nextStopInfo(line, 1, 1500);
assert.ok(n.last && n.name === 'Winsum');
assert.ok(stopAnnouncement(n).includes('(eindhalte)'));
n = nextStopInfo(line, 1, 1900);
assert.ok(stopAnnouncement(n).startsWith('Eindhalte'));
// terug
n = nextStopInfo(line, -1, 1000);
assert.strictEqual(n.index, 1);
n = nextStopInfo(line, -1, 300);
assert.ok(n.last && n.name === 'Groningen');

// ronde lijn: wrap-around
const ring = prepareLine({ id: 2, ref: '3', pts: [[0, 0], [1000, 0], [1000, 600], [50, 600], [0, 100]], stops: [{ x: 0, y: 0 }, { x: 1000, y: 300 }, { x: 400, y: 600 }] });
assert.ok(ring.loop);
const tail = nextStopInfo(ring, 1, ring.length - 30);
assert.ok(tail.wrapped && !tail.last && tail.index === 0 && tail.dist > 30 - 1e-6 && tail.dist < 80);
assert.strictEqual(roundDist(340), '340 m');
assert.strictEqual(roundDist(1500), '1,5 km');
// de bus van de bijbaan (#386): bord en HUD-kaartje volgen de rit (rideLine), niet de dichtstbijzijnde lijn; de lijnspawner (busRun) blijft voorgaan
const andere = prepareLine({ id: 3, ref: '312', from: 'Groningen, Hoofdstation', to: 'Eemshaven', pts: [[0, 0], [2000, 0]], stops: [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 2000, y: 0 }] });
assert.strictEqual(busLineOf(null), null);
assert.strictEqual(busLineOf({}), null);
assert.strictEqual(busLineOf({ rideLine: { line: andere, dir: 0 } }), null);
const rit = busLineOf({ rideLine: { line: andere, dir: -1 } });
assert.strictEqual(rit.line, andere);
assert.strictEqual(rit.dir, -1);
assert.strictEqual(boardText(rit.line, rit.dir).ref, '312');
assert.strictEqual(nextStopInfo(rit.line, rit.dir, 1500).index, 1);
assert.strictEqual(busLineOf({ busRun: { line, dir: 1 }, rideLine: { line: andere, dir: -1 } }).line, line);
// de dienst overnemen (#396): alleen in een lijnbus die nog niet bij een bijbaan hoort, zonder lopende dienst
assert.strictEqual(takeOverOffer({ isBus: true, line, dir: 1 }), true);
assert.strictEqual(takeOverOffer({ isBus: true, line, dir: -1 }), true);
assert.strictEqual(takeOverOffer({ isBus: false, line, dir: 1 }), false);
assert.strictEqual(takeOverOffer({ isBus: true, line, dir: 0 }), false);
assert.strictEqual(takeOverOffer({ isBus: true, line: null, dir: 1 }), false);
assert.strictEqual(takeOverOffer({ isBus: true, jobVehicle: true, line, dir: 1 }), false);
assert.strictEqual(takeOverOffer({ isBus: true, shiftActive: true, line, dir: 1 }), false);
assert.strictEqual(takeOverOffer(), false);
console.log('busboard_test ok');
import { lineDirection } from '../game/js/busboard.js';
assert.strictEqual(lineDirection(line, 500, 3, 0), 1);
assert.strictEqual(lineDirection(line, 500, 3, Math.PI), -1);
assert.strictEqual(lineDirection(line, 500, 300, 0), 0);
console.log('busboard direction ok');
