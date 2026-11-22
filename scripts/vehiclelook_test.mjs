// Uiterlijk-tuning (game/js/vehiclelook.js en vehiclelookstore.js, epic Autotuning #1155): catalogus,
// code, opschonen, prijzen, generator en opslag. Pure test, geen THREE.
import {
  OPTIONS, LOOK_FIELDS, ENUM_FIELDS, CATEGORIES, KIND_FIELDS, BODY_COLORS, ACCENT_COLORS, GLOW_COLORS, PALETTES, STYLES, PRESETS_PER_VEHICLE,
  lookKind, fieldsFor, categoriesFor, sanitizeLook, looksEqual, changedFields, fieldPrice, lookPrice, lookValue, flashiness,
  lookCode, parseLook, generateLook, seedOf, withField, cleanPlate, cleanBuildName, cleanColor, isStock,
} from '../game/js/vehiclelook.js';
import { loadLooks, saveLooks, withLook, withBuild, withoutBuild, lookOf, buildsOf, attachStoredLook, LOOK_STORE_VERSION } from '../game/js/vehiclelookstore.js';
import { BASE_KEYS } from '../game/js/storagekeys.js';
import { readFileSync } from 'node:fs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

ok(BASE_KEYS.tuningLook === 'gde-tuninglook-v1', 'sleutel geregistreerd');

// catalogus: standaard eerst en gratis, unieke id's, geen merken of winter, prijzen redelijk
const BRANDS = /\b(bmw|audi|shimano|bosch|pirelli|michelin|yamaha|honda|vespa|ferrari|porsche|nissan|toyota|volkswagen|mercedes|tesla|opel|ford)\b|sneeuw|winter|vorst/i;
for (const [f, list] of Object.entries(OPTIONS)) {
  ok(list.length >= 2 && list[0].price === 0, 'standaard eerst en gratis', f);
  ok(new Set(list.map((o) => o.id)).size === list.length, 'unieke id\'s', f);
  for (const o of list) {
    ok(o.price >= 0 && o.price <= 120, 'prijs in bereik', `${f} ${o.id}`);
    ok(!BRANDS.test(o.label + ' ' + o.desc) && !/de Grunn/i.test(o.label + ' ' + o.desc), 'geen merk, winter of "de Grunn"', `${f} ${o.id}`);
  }
}
ok(LOOK_FIELDS.length === new Set(LOOK_FIELDS).size, 'unieke velden');
for (const c of CATEGORIES) for (const f of c.fields) ok(LOOK_FIELDS.includes(f), 'categorieveld bestaat', f);
ok(LOOK_FIELDS.every((f) => CATEGORIES.some((c) => c.fields.includes(f))), 'elk veld in een categorie');
for (const [k, fs] of Object.entries(KIND_FIELDS)) ok(fs.every((f) => LOOK_FIELDS.includes(f)), 'soortvelden bestaan', k);
ok(fieldsFor('auto').length === LOOK_FIELDS.length - 5 && fieldsFor('snackwagen').length > fieldsFor('boot').length && fieldsFor('boot').length < fieldsFor('auto').length, 'auto kan alles, boot alleen cosmetisch');
ok(categoriesFor('boot').every((c) => c.fields.length) && categoriesFor('boot').length < CATEGORIES.length, 'boot heeft minder categorieën');
for (const p of Object.values(PALETTES)) for (const c of p) ok(/^#[0-9a-f]{6}$/i.test(c.color) && c.label, 'palet geldig', c.id);
ok(BODY_COLORS.length >= 8 && ACCENT_COLORS.length >= 8 && GLOW_COLORS.length >= 4, 'paletten gevuld');

// soorten
ok(lookKind({ model: { name: 'sedan' } }) === 'auto', 'sedan is auto');
ok(lookKind({ model: { name: 'foodtruck' } }) === 'snackwagen' && lookKind({ model: { name: 'snackwagen' } }) === 'snackwagen' && lookKind({ isSnackwagen: true, model: { name: 'van' } }) === 'snackwagen', 'foodtruck en snackwagen zijn snackwagen');
{
  const snack = sanitizeLook({ awning: 'zon', display: 'tafel', beacon: 'bak', air: 'bijtjes', snackName: 'tammo', spoiler: 'wing' }, 'snackwagen');
  ok(snack.awning === 'zon' && snack.display === 'tafel' && snack.beacon === 'bak' && snack.air === 'bijtjes' && snack.snackName === 'tammo' && !snack.spoiler, 'snackwagen-velden blijven, spoiler niet');
  ok(Object.keys(sanitizeLook({ awning: 'zon', beacon: 'bak' }, 'auto')).length === 0, 'een gewone auto krijgt geen luifel of bakkenlicht');
  ok(looksEqual(parseLook(lookCode(snack, 'snackwagen'), 'snackwagen'), snack), 'snackwagen-code rondje');
  const g = generateLook(9, { kind: 'snackwagen' }).look;
  ok(g.snackName && !g.spoiler && !g.kit, 'generator voor de snackwagen');
  ok(categoriesFor('snackwagen').some((c) => c.id === 'snack') && !categoriesFor('auto').some((c) => c.id === 'snack'), 'snack-categorie alleen voor de snackwagen');
  ok(lookPrice({}, snack) > 150, 'snackwagen-pakket kost iets', String(lookPrice({}, snack)));
}
ok(lookKind({ isBike: true, model: {} }) === 'tweewieler' && lookKind({ isScooter: true, model: {} }) === 'tweewieler', 'tweewieler');
ok(lookKind({ isBoat: true, model: {} }) === 'boot', 'boot');
ok(lookKind({ isBus: true, model: {} }) === null, 'NPC-bus niet');
ok(lookKind({ isBus: true, driver: 'player', model: {} }) === 'bus', 'bus van de speler wel');
ok(lookKind({ isPolice: true, model: {} }) === null && lookKind({ wrecked: true, model: {} }) === null && lookKind({ isAmbulance: true, model: {} }) === null, 'politie, wrak en ambulance niet');
ok(lookKind({ model: { name: 'tractor' } }) === null && lookKind(null) === null, 'trekker en null niet');

// opschonen
const messy = { finish: 'metallic', stripe: 'bestaat-niet', spoiler: 'gt', glow: '#6FD3E0', color2: 'rood', plate: 'ZOMER 21', evil: 1, rimStyle: 'stock', tint: 2 };
const clean = sanitizeLook(messy);
ok(clean.finish === 'metallic' && clean.spoiler === 'gt' && clean.glow === '#6fd3e0' && clean.tint === '2' && clean.plate === 'ZOMER 21', 'geldige velden blijven');
ok(!('stripe' in clean) && !('color2' in clean) && !('evil' in clean) && !('rimStyle' in clean), 'onzin en standaard vallen weg');
ok(sanitizeLook(null) && Object.keys(sanitizeLook('x')).length === 0 && isStock(sanitizeLook(undefined)), 'rommel geeft een lege look');
const boot = sanitizeLook(messy, 'boot');
ok(!('spoiler' in boot) && !('glow' in boot) && boot.finish === 'metallic', 'een boot krijgt geen spoiler en geen underglow');
ok(!('exhaust' in sanitizeLook({ exhaust: 'twin' }, 'tweewieler')), 'tweewieler geen uitlaatstijl');

// nummerbord: verzonnen, nooit een echt kenteken of een scheldwoord of merk
ok(cleanPlate('zomer-21') === 'ZOMER-21' && cleanPlate('  a  b ') === 'A B', 'plate hoofdletters en spaties');
ok(cleanPlate('GD-12-AB') === '' && cleanPlate('12-AB-34') === '', 'echt kentekenformaat geweigerd');
ok(cleanPlate('KUTAUTO') === '' && cleanPlate('mijn audi') === '' && cleanPlate('') === '' && cleanPlate(5) === '', 'scheldwoord, merk en leeg geweigerd');
ok(cleanPlate('ABCDEFGHIJKLMNOP').length === 8, 'plate hoogstens 8 tekens');
ok(cleanPlate('NAZI88') === '', 'verboden woord');
ok(cleanBuildName('  Mijn  *bak* ') === 'Mijn bak' && cleanBuildName('') === 'Mijn build' && cleanBuildName('x'.repeat(40)).length === 16, 'buildnaam');
ok(cleanColor('#ABCDEF') === '#abcdef' && cleanColor('rood') === null && cleanColor('#abc') === null && cleanColor(null) === null, 'kleur');

// code: rondje, kort, tolerant
const sample = { finish: 'pearl', color2: '#f9c80e', stripe: 'racing', decal: 'grunn', rimStyle: 'star', rimColor: '#1d1b17', rimSize: 'l', tire: 'lowprofile', spoiler: 'wing', kit: 'sport', diffuser: 'on', roof: 'rack', lamps: 'halo', lampColor: '#4fb3ff', glow: '#ff7ab8', tint: '3', exhaust: 'twin', hanger: 'dice', plate: 'ZOMER 21' };
const code = lookCode(sample);
ok(code.startsWith('L1') && code.length < 96, 'code kort genoeg', String(code.length));
ok(looksEqual(parseLook(code), sample), 'code rondje', JSON.stringify(parseLook(code)));
ok(lookCode({}) === '' && lookCode(null) === '', 'kale look is geen code');
ok(parseLook('') === null && parseLook('L9xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') === null && parseLook(42) === null && parseLook('L1' + '0'.repeat(ENUM_FIELDS.length) + 'zzzzzz---') === null, 'onzincode');
ok(parseLook('L1' + 'z'.repeat(ENUM_FIELDS.length) + '----') !== null && isStock(parseLook('L1' + 'z'.repeat(ENUM_FIELDS.length) + '----')), 'onbekende index valt terug op standaard');
ok(parseLook('L1' + '0'.repeat(200)) === null, 'te lange code geweigerd');
ok(Object.keys(parseLook(code, 'boot')).every((f) => fieldsFor('boot').includes(f)), 'parse voor boot beperkt velden');
for (let i = 0; i < 200; i++) { const g = generateLook(i).look; ok(looksEqual(parseLook(lookCode(g)), g), 'generator-code rondje', String(i)); if (fails) break; }

// prijzen
ok(lookPrice({}, {}) === 0, 'niets veranderd kost niets');
ok(lookPrice({}, { spoiler: 'wing' }) === 60, 'spoiler kost zijn prijs');
ok(lookPrice({ spoiler: 'wing' }, {}) === 0, 'terugdraaien is gratis');
ok(lookPrice({ spoiler: 'gt' }, { spoiler: 'wing' }) === 60 - 42, 'inruil: helft van de oude', String(lookPrice({ spoiler: 'gt' }, { spoiler: 'wing' })));
ok(lookPrice({}, { glow: '#6fd3e0', color2: '#ffffff' }) === 55 + 18, 'kleurvelden hebben een vaste prijs');
ok(lookPrice({}, sample) === lookValue(sample), 'bouwen vanaf kaal = waarde');
ok(fieldPrice('plate', 'X') === 30 && fieldPrice('finish', 'gloss') === 0 && fieldPrice('finish', null) === 0, 'veldprijzen');
ok(changedFields({ a: 1 }, {}).length === 0 && changedFields({}, { spoiler: 'lip', stripe: 'flank' }).join() === 'stripe,spoiler', 'veranderde velden in codevolgorde');
ok(lookValue(sample) < 1200 && lookValue(sample) > 500, 'een complete build kost een flinke som maar blijft binnen bereik', String(lookValue(sample)));

// flashiness
ok(flashiness({}) === 0 && flashiness(sample) > 0.5 && flashiness(sample) <= 1, 'opvallendheid');

// withField
ok(withField({}, 'spoiler', 'wing').spoiler === 'wing', 'withField zet');
ok(!('spoiler' in withField({ spoiler: 'wing' }, 'spoiler', 'none')), 'withField none haalt weg');
ok(withField({}, 'spoiler', 'gt', 'boot') === null, 'veld past niet op boot');
ok(withField({}, 'spoiler', 'bestaat-niet') === null && withField({}, 'nepveld', 'x') === null, 'onzinwaarde of onzinveld');
ok(withField({ glow: '#ffffff' }, 'glow', null).glow === undefined, 'kleur wissen met null');

// generator: deterministisch en binnen budget
const g1 = generateLook(12345, {}), g2 = generateLook(12345, {});
ok(JSON.stringify(g1) === JSON.stringify(g2), 'zelfde zaad, zelfde look');
ok(JSON.stringify(generateLook(1).look) !== JSON.stringify(generateLook(2).look) || generateLook(1).bodyColor !== generateLook(2).bodyColor, 'andere zaad, andere look');
ok(seedOf('a', 1) === seedOf('a', 1) && seedOf('a', 1) !== seedOf('a', 2), 'seedOf stabiel');
const styles = new Set(); let glowN = 0, depthSum = 0;
for (let i = 0; i < 400; i++) { const g = generateLook(seedOf('t', i)); styles.add(g.style); if (g.look.glow) glowN++; depthSum += Object.keys(g.look).length; ok(!isStock(g.look) && /^#[0-9a-f]{6}$/.test(g.bodyColor), 'generator geeft een look en lak', String(i)); if (fails) break; }
ok(styles.size === STYLES.length, 'alle stijlen komen voor');
ok(glowN > 40 && glowN < 240, 'underglow komt voor maar niet bij iedereen', String(glowN));
ok(depthSum / 400 > 6, 'een gepimpte auto is echt gepimpt');
ok(!generateLook(5, { noGlow: true }).look.glow && generateLook(5, { style: 'race' }).style === 'race', 'noGlow en vaste stijl');
ok(generateLook(5, { kind: 'boot' }).look.spoiler === undefined, 'generator volgt het soort');
const rallies = Array.from({ length: 60 }, (_, i) => generateLook(i, { style: 'rally' }));
ok(rallies.every((g) => !g.look.spoiler) && rallies.some((g) => g.look.roof), 'rally: geen spoiler, wel dakdrager');

// opslag
const store = memStore(), KEY = BASE_KEYS.tuningLook;
ok(Object.keys(loadLooks(store, KEY)).length === 0 && Object.keys(loadLooks(null, KEY)).length === 0, 'leeg geeft leeg');
let all = withLook({}, 'hero', sample);
ok(lookOf(all, 'hero').spoiler === 'wing', 'look erin en eruit');
ok(saveLooks(store, KEY, all) === true, 'bewaren');
const back = loadLooks(store, KEY);
ok(looksEqual(lookOf(back, 'hero'), sample), 'rondje door de opslag');
ok(JSON.parse(store.m.get(KEY)).versie === LOOK_STORE_VERSION, 'versie in de opslag');
ok(Object.keys(withLook(all, 'hero', {})).length === 0, 'kale look zonder builds wist het record');
store.setItem(KEY, '{kapot');
ok(Object.keys(loadLooks(store, KEY)).length === 0, 'kapotte JSON geeft leeg');
store.setItem(KEY, JSON.stringify({ versie: 99, voertuigen: { a: { code, builds: [] } } }));
ok(Object.keys(loadLooks(store, KEY)).length === 0, 'andere versie geeft leeg');
store.setItem(KEY, JSON.stringify({ versie: 1, voertuigen: { a: { code: 'L1kapot', builds: [{ naam: 5, code: code }, { naam: 'x', code: 'nep' }] }, b: 7, c: null } }));
const rough = loadLooks(store, KEY);
ok(Object.keys(rough).join() === 'a' && rough.a.builds.length === 1 && rough.a.code === '', 'rommel wordt opgeschoond', JSON.stringify(rough));
ok(saveLooks({ setItem() { throw new Error('vol'); } }, KEY, all) === false && saveLooks(null, KEY, all) === false, 'opslagfout geeft false');
const manyVehicles = {};
for (let i = 0; i < 100; i++) manyVehicles['v' + i] = { code, builds: [] };
saveLooks(store, KEY, manyVehicles);
ok(Object.keys(loadLooks(store, KEY)).length === 64, 'hoogstens 64 voertuigen');

// builds
let b = withBuild({}, 'hero', 0, 'Race', sample);
ok(b && buildsOf(b, 'hero')[0].naam === 'Race' && looksEqual(parseLook(buildsOf(b, 'hero')[0].code), sample), 'build bewaard');
ok(withBuild({}, 'hero', 0, 'Leeg', {}) === null && withBuild({}, 'hero', 9, 'X', sample) === null, 'kale look of foute plek geen build');
for (let s = 1; s < PRESETS_PER_VEHICLE; s++) b = withBuild(b, 'hero', s, 'B' + s, { spoiler: 'lip' });
ok(buildsOf(b, 'hero').length === PRESETS_PER_VEHICLE, 'drie plekken vol');
ok(buildsOf(withBuild(b, 'hero', 1, 'Nieuw', { stripe: 'flank' }), 'hero')[1].naam === 'Nieuw', 'plek overschrijven');
ok(buildsOf(withoutBuild(b, 'hero', 0), 'hero').length === 2, 'build verwijderen');
ok(Object.keys(withoutBuild(withBuild({}, 'hero', 0, 'X', sample), 'hero', 0)).length === 0, 'laatste build weg wist het record');
ok(buildsOf(b, 'nep').length === 0, 'geen builds voor onbekend voertuig');
const keep = withLook(b, 'hero', {});
ok(buildsOf(keep, 'hero').length === PRESETS_PER_VEHICLE && isStock(lookOf(keep, 'hero')), 'kale look houdt de builds');

// aan een voertuig hangen
const st2 = memStore();
saveLooks(st2, KEY, withLook({}, 'hero', { spoiler: 'wing', glow: '#6fd3e0' }));
const veh = {};
ok(attachStoredLook(veh, 'hero', KEY, st2) && veh.look.spoiler === 'wing', 'look aan voertuig gehangen');
ok(!attachStoredLook({}, 'andere', KEY, st2) && !attachStoredLook({}, null, KEY, st2) && !attachStoredLook({}, 'hero', KEY, null), 'niets bij onbekend bezit of zonder opslag');
const bike = {};
attachStoredLook(bike, 'hero', KEY, st2, 'tweewieler');
ok(bike.look && !bike.look.spoiler && bike.look.glow, 'soortfilter bij het aanhangen');

// de DS-kleuren in het palet bestaan echt in de tokens
const tokens = readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8').toLowerCase();
for (const c of ACCENT_COLORS.concat(GLOW_COLORS)) ok(tokens.includes(c.color) || /^#(f3ead3|b9b7ad|d93f3f|3fc97a)$/.test(c.color), 'accent uit de tokens', c.color);

// ronde 5 (22-11): nieuwe opties staan achteraan in hun lijst, dus oude codes en oude opslag blijven kloppen (de code is positioneel)
{
  const NIEUW = { stripe: 'checker', rimStyle: 'twist', spoiler: 'duck', kit: 'rally', roof: 'bike', lamps: 'angry', exhaust: 'stack', hanger: 'fries' };
  for (const [f, id] of Object.entries(NIEUW)) {
    const list = OPTIONS[f];
    ok(list[list.length - 1].price > 0 || list.some((o) => o.id === id), 'nieuwe optie bestaat', f);
    const back = parseLook(lookCode({ [f]: id }, 'auto'), 'auto');
    ok(back && back[f] === id, 'nieuwe optie overleeft de code', `${f}=${id}`);
  }
  const all = parseLook(lookCode(NIEUW, 'auto'), 'auto');
  ok(Object.entries(NIEUW).every(([f, id]) => all[f] === id), 'alle nieuwe opties samen in één code');
  ok(lookCode(NIEUW, 'auto').length < 96, 'code blijft onder de netwerkgrens');
  ok(OPTIONS.hanger.some((o) => o.id === 'duck') && OPTIONS.roof.some((o) => o.id === 'surf') && OPTIONS.rimStyle.some((o) => o.id === 'dish'), 'badeendje, surfplank en schotelvelg');
  // een oude code (zonder de nieuwe opties) geeft hetzelfde als vroeger: vlag 'flank' zat op plek 2 en blijft daar
  ok(parseLook(lookCode({ stripe: 'flank', spoiler: 'wing' }, 'auto'), 'auto').stripe === 'flank', 'bestaande indexen verschuiven niet');
  ok(OPTIONS.stripe[2].id === 'flank' && OPTIONS.spoiler[2].id === 'wing' && OPTIONS.kit[2].id === 'wide' && OPTIONS.roof[2].id === 'box' && OPTIONS.hanger[3].id === 'flag', 'volgorde van bestaande opties ongewijzigd');
  // een tweewieler of boot krijgt de nieuwe auto-onderdelen niet
  ok(!sanitizeLook({ roof: 'bike', kit: 'rally', hanger: 'duck' }, 'boot').roof, 'boot kan geen fietsendrager');
}

console.log(`vehiclelook_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
