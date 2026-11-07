// #660: G-Music buffert niet meer alle 34 nummers (~128 MB) bij de start.
// node scripts/gmusicpreload_test.mjs
import fs from 'node:fs';
import { gmusicPreloadCount, GMUSIC_PRELOAD_AHEAD } from '../game/js/audio/gmusicpreload.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(GMUSIC_PRELOAD_AHEAD === 2, 'twee nummers vooruit bufferen', GMUSIC_PRELOAD_AHEAD);
ok(gmusicPreloadCount(34) === 3, '34 nummers: 3 met preload-auto', gmusicPreloadCount(34));
ok(gmusicPreloadCount(34, 0) === 1, 'zonder vooruit: alleen het huidige');
ok(gmusicPreloadCount(0) === 0 && gmusicPreloadCount(1) === 1 && gmusicPreloadCount(2) === 2, 'randgevallen');
console.log(`#660 meting: 34 tracks -> ${gmusicPreloadCount(34)} bufferen (was 34), ~${((34 - gmusicPreloadCount(34)) * 3.8).toFixed(0)} MB minder`);

// de bedrading: onbelast aanmaken, alleen het speelvenster armeren
const radio = fs.readFileSync(new URL('../game/js/audio/radio.js', import.meta.url), 'utf8');
ok(/el\.preload = 'none';/.test(radio), 'elementen worden onbelast aangemaakt');
ok(/function armGmusicQueue\(\)/.test(radio) && /armGmusicQueue\(\);/.test(radio), 'het speelvenster wordt gearmd');
const manifest = radio.slice(radio.indexOf('export async function loadGMusicManifest'), radio.indexOf('// Station-style playback'));
ok(manifest.length > 0 && !/el\.preload = 'auto'/.test(manifest), 'de manifestlus zet niet alles op auto');
ok(/armGmusicQueue\(\);/.test(radio.slice(radio.indexOf('function startGmusicRandomly'), radio.indexOf('function advanceGmusicQueue'))), 'start armet het venster');
console.log(`${n - fails}/${n} gmusicpreload`);
process.exit(fails ? 1 : 0);
