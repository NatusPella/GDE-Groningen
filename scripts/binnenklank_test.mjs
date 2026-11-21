// Binnengeluid en kaartlaag Betreedbaar (epic Interieurs, #1164): de kamertoon per soort pand en per variant, het muziekfilter binnen,
// de koppeling met ambience.js, audio.js en interiors.js, en de kaartlaag (welke voorzieningen een deurbadge krijgen).
// Puur, geen audio-context. Draai: node scripts/binnenklank_test.mjs
import fs from 'node:fs';
import { ROOM_TONES, roomTone, roomMusicHz, ambienceOf, OUTDOOR_MUSIC_HZ } from '../game/js/sfx/binnenklank.js';
import { KINDS, KIND_IDS, PUBLIEK_VARIANTS, labelOf, kindOfFacility } from '../game/js/interiorkinds.js';
import { enterablePlaces, markNotEnterable, resetEnterableMap, drawDoorBadge } from '../game/js/interiormap.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// --- elke soort pand heeft een toon, en elke toon hoort bij een soort ---
const ids = new Set(KIND_IDS.map((k) => ambienceOf(k)));
for (const k of KIND_IDS) ok(ROOM_TONES[KINDS[k].ambience], `soort ${k}: de ambience '${KINDS[k].ambience}' heeft een kamertoon`);
for (const id of Object.keys(ROOM_TONES)) ok(ids.has(id), `de toon '${id}' hoort bij een soort`);
for (const [id, t] of Object.entries(ROOM_TONES)) {
  ok(t.crowd >= 0 && t.crowd <= 0.5 && t.room >= 0 && t.room <= 0.5 && t.machine >= 0 && t.machine <= 0.3, `toon ${id}: niveaus in bereik`, JSON.stringify(t));
  ok(t.musicHz >= 500 && t.musicHz < OUTDOOR_MUSIC_HZ, `toon ${id}: de muziek is binnen gedempt maar hoorbaar`, String(t.musicHz));
}

// --- wat je hoort verschilt per soort ---
ok(roomTone('horeca').crowd > roomTone('kerk').crowd && roomTone('station').crowd > roomTone('bibliotheek').crowd, 'een café en een stationshal hebben menigte, een kerk en een bibliotheek niet');
ok(roomTone('kerk').room < roomTone('woning').room, 'een kerk is stiller dan een woning');
ok(roomTone('garage').machine > 0 && roomTone('woning').machine === 0, 'een garage bromt, een woning niet');
ok(roomMusicHz('kerk') < roomMusicHz('horeca') && roomMusicHz('horeca') < roomMusicHz('woning'), 'de muziek klinkt dofst in een kerk en het minst in een woning');
ok(roomMusicHz(null) === OUTDOOR_MUSIC_HZ && roomMusicHz(undefined) === OUTDOOR_MUSIC_HZ, 'buiten is de muziek open');
const nope = roomTone('bestaatniet');
ok(nope.crowd === 0 && nope.machine === 0 && nope.musicHz === OUTDOOR_MUSIC_HZ, 'een onbekende soort krijgt de neutrale toon');

// --- varianten ---
for (const v of PUBLIEK_VARIANTS) { const t = roomTone('publiek', v); ok(Number.isFinite(t.crowd) && Number.isFinite(t.room) && t.musicHz >= 500, `publiek/${v}: toon is geldig`); }
ok(roomTone('publiek', 'school').crowd > roomTone('publiek', 'museum').crowd, 'een school is drukker dan een museum');
ok(roomTone('publiek', 'bioscoop').musicHz < roomTone('publiek', 'gemeente').musicHz, 'een bioscoop dempt de muziek meer dan een gemeentehuis');
ok(roomTone('kerk', 'kapel').musicHz < roomTone('kerk').musicHz, 'een kapel is dofer dan een kerk');
ok(roomTone('garage', 'magazijn').machine > roomTone('garage', 'werkplaats').machine, 'een magazijn bromt harder dan een werkplaats');
ok(roomTone('winkel', 'bakker') === roomTone('winkel'), 'een winkelvariant zonder eigen toon klinkt als de soort');

// --- de koppeling in de bronnen ---
const amb = read('game/js/sfx/ambience.js'), aud = read('game/js/audio.js'), ints = read('game/js/interiors.js');
ok(/roomTone\(world\.insideKind, world\.insideSub\)/.test(amb) && amb.includes("from './binnenklank.js'"), 'ambience.js leest de kamertoon uit binnenklank.js');
ok(/roomMusicHz\(world\.insideKind, world\.insideSub\)/.test(aud), 'audio.js dempt de muziek via roomMusicHz');
ok(/w\.insideSub = /.test(ints) && /w\.insideKind = /.test(ints), 'interiors.js zet insideKind en insideSub');

// --- de kaartlaag Betreedbaar ---
resetEnterableMap();
const rows = [
  { x: 10, y: 10, kind: 'horeca', wk: 'cafe', name: 'Café Zomer' },
  { x: 20, y: 20, kind: 'police', name: 'Bureau' },
  { x: 30, y: 30, kind: 'busstation', name: 'Halte' },
  { x: 40, y: 40, kind: 'museum', name: 'Museum Verzonnen' },
  { x: 50, y: 50, kind: 'cinema', name: 'Bios' },
  { x: 60, y: 60, kind: 'parking' },
  { x: NaN, y: 1, kind: 'police' },
];
const list = enterablePlaces(rows);
ok(list.length === 4, 'de laag telt de betreedbare voorzieningen (geen bushalte, geen parkeerplaats, geen kapotte rij)', String(list.length));
ok(!list.some((e) => e.kind === 'station') && !list.some((e) => !Number.isFinite(e.x)), 'geen bushalte en geen rij zonder plek');
ok(list.some((e) => e.sub === 'museum' && e.label === 'Museum') && list.some((e) => e.sub === 'bioscoop' && e.label === 'Bioscoop'), 'museum en bioscoop staan op de kaart met hun naam');
ok(labelOf('publiek', 'ziekenhuis') === 'Ziekenhuis' && labelOf('publiek', 'school') === 'School' && labelOf('kerk', 'kapel') === 'Kapel' && labelOf('kerk', null) === 'Kerk', 'labels per variant');
markNotEnterable(10.2, 9.8);
ok(!enterablePlaces(rows).some((e) => e.name === 'Café Zomer'), 'een pand dat te klein bleek valt van de kaart');
ok(kindOfFacility({ kind: 'museum' }).sub === 'museum' && kindOfFacility({ kind: 'cinema' }).sub === 'bioscoop', 'kindOfFacility kent museum en bioscoop');
// de badge tekent zonder fout op een nepcontext
const calls = [];
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); }), set: (t, k, v) => { t[k] = v; return true; } });
let threw = false;
try { drawDoorBadge(ctx, 5, 5, 1, true); drawDoorBadge(ctx, 5, 5, 1.2, false); } catch (e) { threw = true; console.error(e); }
ok(!threw && calls.includes('roundRect') && calls.includes('fill'), 'drawDoorBadge tekent een afgeronde badge');
resetEnterableMap();

console.log(bad ? `binnenklank_test: ${bad} van ${n} mislukt` : `binnenklank_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
