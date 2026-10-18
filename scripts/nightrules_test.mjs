// Nachtregels (#195). Draai: node scripts/nightrules_test.mjs
import { litFraction, windowKind, twilight, moonPhase, moonLit, starCount, LIT_CURVES } from '../game/js/nightrules.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
ok(litFraction('kantoor', 11) > litFraction('kantoor', 23), 'kantoren overdag verlicht, laat in de nacht niet');
ok(litFraction('wonen', 21) > litFraction('wonen', 4), 'huizen avond > nacht');
ok(litFraction('horeca', 21) > litFraction('winkel', 21) - 0.0 && litFraction('winkel', 3) < 0.1, 'horeca laat open, winkels dicht');
ok(Math.abs(litFraction('wonen', 0) - litFraction('wonen', 24)) < 1e-9, 'rond om middernacht');
ok(litFraction('onbekend', 20) === litFraction('wonen', 20), 'val terug op wonen');
for (const [k, c] of Object.entries(LIT_CURVES)) ok(c.every(([h, v], i) => v >= 0 && v <= 1 && (!i || h > c[i - 1][0])), 'curve ' + k);
ok(windowKind('retail') === 'winkel' && windowKind('office') === 'kantoor' && windowKind('pub') === 'horeca' && windowKind('house') === 'wonen' && windowKind() === 'wonen', 'gebouwsoort');
ok(twilight(30) === 0 && twilight(-30) === 1, 'schemering randen');
ok(twilight(-3) > twilight(0) && twilight(0) > twilight(3), 'schemering monotoon');
ok(moonLit(0) < 0.01 && moonLit(0.5) > 0.99, 'nieuwe en volle maan');
for (let d = -40; d < 100; d++) { const p = moonPhase(d); ok(p >= 0 && p < 1, 'fase binnen bereik ' + d); }
ok(starCount('laag', 1400) < starCount('middel', 1400) && starCount('middel', 1400) < starCount('hoog', 1400) && starCount('x', 1400) === 1400, 'sterren per profiel');
console.log(fails ? `${fails} mislukt` : 'nachtregels ok');
process.exit(fails ? 1 : 0);
