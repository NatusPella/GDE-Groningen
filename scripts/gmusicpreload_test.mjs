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

// #761: het venster wordt ook gedisarmd. Alleen armeren liet een element dat de wachtrij
// verliet op 'auto' staan, zodat na ±11 wissels de hele cyclus weer stond te bufferen.
// Deze simulatie loopt een lange radiosessie na: na elke wissel hoort de rest op 'none' te staan.
const { createGmusicPreloadWindow } = await import('../game/js/audio/gmusicpreload.js');
const fakeEl = (id) => ({ id, preload: 'none', loads: 0, load() { this.loads++; } });
const tracks = Array.from({ length: 34 }, (_, i) => fakeEl(i));
const venster = createGmusicPreloadWindow();
let p = 0;
let current = tracks[p];
let queue = [tracks[(p + 1) % 34], tracks[(p + 2) % 34]];
venster.arm([current, ...queue]);
for (let step = 0; step < 34; step++) {
  p++;
  current = queue.shift();
  queue.push(tracks[(p + 2) % 34]);
  venster.arm([current, ...queue]);
}
const opAuto = tracks.filter((el) => el.preload === 'auto');
ok(opAuto.length === 3, '#761: na 34 wissels staan exact 3 elementen op preload auto', opAuto.length);
ok(opAuto.map((el) => el.id).join() === [current.id, ...queue.map((el) => el.id)].join(), '#761: en dat is het speelvenster (huidige + 2 wachtenden)', opAuto.map((el) => el.id).join());
ok(tracks.filter((el) => el.preload === 'none').length === 31, '#761: de andere 31 elementen zijn gedisarmd');
ok(opAuto.every((el) => el.loads >= 1), '#761: een element wordt pas belast als het in het venster komt');
console.log(`${n - fails}/${n} gmusicpreload`);
process.exit(fails ? 1 : 0);
