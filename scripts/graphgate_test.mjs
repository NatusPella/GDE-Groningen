// Routegraaf-debounce (#804):  node scripts/graphgate_test.mjs
import { mayBuildGraph, GRAPH_QUIET_S, GRAPH_MAX_STALE_S, GRAPH_REBUILD_MIN_S } from '../game/js/graphgate.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

ok(GRAPH_QUIET_S === 1 && GRAPH_MAX_STALE_S === 4 && GRAPH_REBUILD_MIN_S === 1, 'de grenzen staan vast');
ok(!mayBuildGraph({ now: 500, builtAt: 0, staleAt: 400 }), 'binnen de cadans niet bouwen');
ok(!mayBuildGraph({ now: 2000, builtAt: 0, staleAt: 1500 }), 'de lagen zijn nog niet stil');
ok(mayBuildGraph({ now: 2500, builtAt: 0, staleAt: 1200 }), 'na een seconde stilte bouwen');
ok(!mayBuildGraph({ now: 3000, builtAt: 1000, staleAt: 2800 }), 'cadans wint van een korte stilte');
ok(mayBuildGraph({ now: 5000, builtAt: 1000, staleAt: 4800 }), 'na vier seconden bouwt hij alsnog, ook zonder stilte');
ok(!mayBuildGraph({ now: 3000, builtAt: 1000, staleAt: 2800, maxStaleS: 10 }), 'een ruimere bovengrens wacht langer');
ok(mayBuildGraph({ now: 3000, builtAt: 1000, staleAt: 1200, quietS: 0.5 }), 'een kortere stilte-eis bouwt eerder');
ok(!mayBuildGraph({ now: NaN, builtAt: 0, staleAt: 0 }), 'zonder tijd geen bouw');

console.log(fails ? `${fails} FAIL` : 'graphgate_test ok');
process.exit(fails ? 1 : 0);

