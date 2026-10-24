// Radio (#238): nieuwe nummers eerst, uiteindelijk gelijke kans. Simuleert een luisteraar met de echte pickTrack en de echte lengte van de
// geschiedenis: in het begin krijgen de nieuwe nummers de meeste beurten, daarna een eerlijk aandeel (voor de verlenging van de geschiedenis
// bleef de voorkeur voor altijd staan, omdat 60 afgespeelde nummers over 34 nummers minder dan 3 keer per nummer is).
import fs from 'node:fs';
import { pickTrack, pushHistory, NIEUW } from '../game/js/musicpick.js';
let n = 0; const ok = (c, m) => { n++; if (!c) { console.error('FAIL', m); process.exitCode = 1; } };
const man = JSON.parse(fs.readFileSync(new URL('../game/audio/gmusic/manifest.json', import.meta.url), 'utf8'));
const tracks = man.tracks.map((e) => ({ id: e.file, weight: e.weight || 1, time: e.time || 'any', nieuw: e.nieuw === true, stations: e.stations || ['gmusic'], artist: '' }));
const nieuw = new Set(tracks.filter((t) => t.nieuw).map((t) => t.id));
let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const history = [];
const aandeel = (van, tot) => { let a = 0; for (let i = van; i < tot; i++) { const t = pickTrack(tracks, history, { station: 'gmusic', hour: 12, rng, fresh: i === 0 }); if (nieuw.has(t.id)) a++; pushHistory(history, t.id); } return a / (tot - van); };
const eerste = aandeel(0, 60);
const gew = (t) => (t.time === 'any' ? 1 : t.time === 'night' ? 0.5 : 2); // om 12 uur: dagnummers tellen dubbel, nachtnummers half (musicpick.js)
const pool = tracks.filter((t) => t.stations.includes('gmusic'));
const eerlijkNieuw = pool.filter((t) => t.nieuw).reduce((a, t) => a + gew(t), 0) / pool.reduce((a, t) => a + gew(t), 0);
ok(eerste > eerlijkNieuw + 0.15, `het begin: nieuwe nummers vaker (${eerste.toFixed(2)} tegen eerlijk ${eerlijkNieuw.toFixed(2)})`);
aandeel(60, 1500);
const laat = aandeel(1500, 3500);
ok(Math.abs(laat - eerlijkNieuw) < 0.07, `na lang luisteren een eerlijk aandeel (${laat.toFixed(2)} tegen ${eerlijkNieuw.toFixed(2)})`);
ok(NIEUW.plays >= 1, 'NIEUW.plays bestaat');
console.log(`musicpick_nieuw_test: ok (${n} controles; begin ${eerste.toFixed(2)}, laat ${laat.toFixed(2)}, eerlijk ${eerlijkNieuw.toFixed(2)})`);
