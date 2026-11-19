// Geluidsondertitels: labels, wachttijd en afstand (#200).  node scripts/soundcaptions_test.mjs
import { SOUND_LABELS, labelFor, createCaptions, pushCaption, visibleCaptions } from '../game/js/soundcaptions.js';
let fails = 0;
const ok = (c, n, x) => { if (!c) { fails++; console.log('FAIL', n, x !== undefined ? JSON.stringify(x) : ''); } };
ok(labelFor('weapon', 'shot') === 'schot' && labelFor('horn') === 'claxon', 'labels via soort en subsoort');
ok(labelFor('door_open') === 'deur gaat open', 'een deur krijgt een ondertitel (#985)');
ok(labelFor('sample', 'trein_deur_piep') === 'treindeur piept' && labelFor('fx', 'bridge_clunk') === 'brug klinkt' && labelFor('fx', 'kermis_ding') === 'kermisbel', 'trein, brug en kermis via de opname- en fx-naam (#985)');
ok(labelFor('train_clack') === 'treinwielen ratelen' && labelFor('step') === 'voetstappen' && labelFor('engine_start') === 'motor start' && labelFor('fx', 'tyre_screech') === 'banden gieren', 'wielen, voetstappen en voertuiggeluiden (#985)');
ok(labelFor('sample', 'onbekend') === null && labelFor('prop_hit') === null, 'wat geen label heeft blijft stil');
for (const [k, v] of Object.entries(SOUND_LABELS)) ok(/^[a-zà-ÿ' ]+$/.test(v), 'label in kleine letters, Nederlands: ' + k);
const s = createCaptions();
ok(pushCaption(s, 'horn', { now: 0 }) === '[claxon]', 'eerste claxon');
ok(pushCaption(s, 'horn', { now: 1 }) === null, 'zelfde geluid binnen de wachttijd telt niet dubbel');
ok(pushCaption(s, 'horn', { now: 3 }) === '[claxon]', 'na de wachttijd weer');
ok(pushCaption(s, 'alarm', { dist: 100, now: 3 }) === '[alarm, in de verte]', 'ver weg');
ok(pushCaption(s, 'alarm', { dist: 400, now: 9 }) === null, 'te ver om te horen');
const t = createCaptions();
for (const [i, k] of ['horn', 'alarm', 'bell', 'splash', 'shout'].entries()) pushCaption(t, k, { now: i * 0.1 });
ok(visibleCaptions(t, 0.5).length === 3, 'hooguit drie tegelijk', visibleCaptions(t, 0.5));
ok(visibleCaptions(t, 10).length === 0, 'verdwijnt vanzelf');
if (fails) { console.log(fails + ' mislukt'); process.exit(1); }
console.log('soundcaptions_test: ok');
