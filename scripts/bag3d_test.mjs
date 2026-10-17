// 3D BAG for the province: the matcher (scripts/world/bag3d.mjs) and the
// height chain through the world builder (game/js/worldbuilder.js fromOsm).
import { bagMatcher, loadProvinceBag } from './world/bag3d.mjs';
import * as WB from '../game/js/worldbuilder.js';

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL ' + m); };

const recs = [
  { id: '14100000012345', c: [105, 105], a: 100, hmax: 9.4, hg: 0.4, h50: 7.9, roof: 'slanted' },
  { id: '14100000099999', c: [305, 305], a: 100, hmax: 5, hg: 0 },
];
const m = bagMatcher(recs);
const sq = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
if (m(sq(500, 500, 10), { 'ref:bag': '0014100000012345' }) !== recs[0]) fail('ref:bag with leading zeros');
if (m(sq(100, 100, 10), {}) !== recs[0]) fail('centre inside the footprint, area within 25 %');
if (m(sq(300, 300, 30), {}) !== null) fail('an area of nine times: no match');
if (m(sq(700, 700, 10), {}) !== null) fail('nothing near');
if (m.stats.id !== 1 || m.stats.centre !== 1 || m.stats.none !== 2) fail(`stats ${JSON.stringify(m.stats)}`);

const ll = (la, lo) => ({ lat: la, lon: lo });
const el = { type: 'way', id: 1, tags: { building: 'house' }, geometry: [ll(53.2, 6.5), ll(53.2, 6.5001), ll(53.2001, 6.5001), ll(53.2001, 6.5), ll(53.2, 6.5)] };
const plain = WB.fromOsm(el, {})[0].row;
if (plain.hsrc !== 'default') fail(`without 3D BAG: ${plain.hsrc}`);
const withBag = WB.fromOsm(el, { bag3d: () => ({ hmax: 10.4, hg: 0.4, h50: 8.9, roof: 'slanted' }) })[0].row;
if (withBag.hsrc !== '3dbag' || Math.abs(withBag.hm - 10) > 0.01 || !(withBag.h > 0)) fail(`with 3D BAG: ${JSON.stringify(withBag)}`);

const all = loadProvinceBag();
if (all.length && (!all[0].id || all[0].c.length !== 2 || !Number.isFinite(all[0].hmax) || !Number.isFinite(all[0].hg))) fail('province file rows');

console.log(fails ? `${fails} failure(s)` : `bag3d: ok (${all.length} province buildings)`);
process.exit(fails ? 1 : 0);
