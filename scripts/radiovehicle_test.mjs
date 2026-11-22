// De radio in een voertuig (22-11, #988): de tabel voertuigsoort -> zender, de terugval, de instap- en uitstaplogica (wereldradio hersteld,
// per soort onthouden), de melding en de Samen-regel. Alles in node, zonder audio en zonder beeld; de glue (radio.js, hud_panel.js,
// settings.js, main.js) staat als bronchecks onderaan.
//   node scripts/radiovehicle_test.mjs
import fs from 'node:fs';
import { normalizeTrack, MIN_POOL } from '../game/js/musicpick.js';
import { CHANNELS, channelById, channelStatus, openChannels, channelTracks, channelForPlayer, DEFAULT_CHANNEL } from '../game/js/radiochannels.js';
import {
  RADIO_KINDS, RADIO_KIND_IDS, radioKindOf, vehicleChannel, outsideState, enterVehicle, exitVehicle, rememberChoice, cleanRemembered,
  radioNotice, hudName, clip, NOTICE_MAX,
} from '../game/js/radiovehicle.js';

let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error('FAIL', m); process.exitCode = 1; } };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const man = JSON.parse(read('game/audio/gmusic/manifest.json'));
const tracks = man.tracks.map(normalizeTrack).filter(Boolean);
const open0 = openChannels(tracks, { found: [] });          // zonder het geheimpje
const openUfo = openChannels(tracks, { found: ['ufo'] });   // met het geheimpje
const status0 = channelStatus(tracks, { found: [] });

// 1. de tabel
for (const id of RADIO_KIND_IDS) {
  const k = RADIO_KINDS[id];
  ok(k.label && Array.isArray(k.prefs), `${id}: label en voorkeurslijst`);
  ok(k.follow ? k.prefs.length === 0 : k.prefs.length >= 1, `${id}: een soort met een eigen zender heeft voorkeuren, een soort die de wereldradio laat staan niet`);
  for (const c of k.prefs) ok(channelById(c), `${id}: voorkeur ${c} is een bestaande zender`);
}

// 2. de nieuwe zenders: een eigen pool van genoeg nummers, verzonnen namen
for (const id of ['nachtjazz', 'tokkie']) {
  const c = channelById(id);
  ok(c, `zender ${id} bestaat`);
  const st = status0.find((s) => s.id === id);
  ok(st.status === 'open' && channelTracks(c, tracks).length >= MIN_POOL, `${id}: open met ${channelTracks(c, tracks).length} nummers (minimaal ${MIN_POOL})`);
  ok(c.programme && c.programme.talk.includes('dj') && c.lines.length >= 3, `${id}: een DJ met regels`);
  const text = [c.name, c.dj, c.ident, c.sub, ...c.lines].join(' ');
  ok(!/\b(winter|sneeuw|ijs)\b/i.test(text) && !/de Grunn\b/.test(text), `${id}: altijd zomer, Grunn`);
  ok(!/\b(NPO|Qmusic|Radio ?538|Sublime|Spotify|BNR|Skyradio|RTV Noord|Omrop|Jazz FM|Concertzender)\b/i.test(text), `${id}: geen echt merk of echte zender`);
}
ok(channelById('tokkie').dj !== channelById('nachtjazz').dj, 'elke zender heeft zijn eigen DJ');

// 3. elke voertuigsoort uit de catalogus heeft een besluit en een terugval
// De catalogus: de modelnamen van vehiclenames.js (voertuigen), de bootsoorten en wat vehicle.js er verder aan heeft.
const names = read('game/js/vehiclenames.js');
const keysOf = (blok) => [...(names.match(new RegExp(`const ${blok} = \\{([\\s\\S]*?)\\n\\};`)) || [, ''])[1].matchAll(/^\s{2}'?([A-Za-z_]+)'?:/gm)].map((m) => m[1]);
const modelNames = keysOf('NAMES');
const boatKinds = keysOf('BOATS');
ok(modelNames.length >= 15 && boatKinds.length >= 8, `de catalogus is gelezen (${modelNames.length} modellen, ${boatKinds.length} bootsoorten)`);
const FLAGS = { scooter: { isScooter: true }, boat: { isBoat: true }, heli: { isHeli: true }, plane: { isPlane: true }, police: { isPolice: true }, ambulance: { isAmbulance: true }, bus: { isBus: true }, midibus: { isBus: true }, bike: { isBike: true } };
const catalog = [
  ...modelNames.map((m) => ({ id: m, v: { model: { name: m }, ...(FLAGS[m] || {}) } })),
  ...boatKinds.map((b) => ({ id: 'boot:' + b, v: { isBoat: true, model: { name: 'boat', kind: b } } })),
  { id: 'fatbike', v: { isBike: true, model: { name: 'bike', fat: true } } },
  { id: 'tokkie-auto', v: { model: { name: 'hatch', tokkie: true } } },
  { id: 'brommer', v: { isScooter: true, model: { name: 'scooter', moped: true } } },
  { id: 'trekker', v: { model: { name: 'tractor' } } },
  { id: 'quad', v: { model: { name: 'quad' } } },
  { id: 'maaidorser', v: { model: { name: 'maaidorser' } } },
  { id: 'laadmachine', v: { model: { name: 'laadmachine' } } },
  { id: 'trekkerlimo', v: { model: { name: 'trekkerlimo' } } },
  { id: 'politiepaard', v: { _mount: 'horse', model: { name: 'bike' } } },
  { id: 'heldenauto', v: { isHeroCar: true, model: { name: 'escort' } } },
  { id: 'gokart', v: { model: { name: 'gokart' } } },
  { id: 'trein', v: { model: { name: 'trein' } } },
  { id: 'onbekend', v: { model: { name: 'iets-nieuws' } } },
];
const stands = { alles: openUfo, zonderGeheim: open0, alleenGMusic: ['gmusic'], zonderGMusic: ['nachtstreek'] };
for (const { id, v } of catalog) {
  const kind = radioKindOf(v);
  ok(RADIO_KINDS[kind], `${id}: een geldige soort (${kind})`);
  for (const [naam, open] of Object.entries(stands)) {
    const d = vehicleChannel(kind, open, {});
    ok(d.channel === null ? (RADIO_KINDS[kind].follow || RADIO_KINDS[kind].soft) : open.includes(d.channel), `${id} (${naam}): een zender die te kiezen is, of de wereldradio blijft`);
  }
}
ok(radioKindOf(null) === null, 'geen voertuig, geen soort');

// 4. de tabel zelf, zoals de eigenaar hem wilde
const pick = (id, open = open0, mem = {}) => vehicleChannel(radioKindOf(catalog.find((c) => c.id === id).v), open, mem).channel;
ok(['trekker', 'maaidorser', 'quad', 'laadmachine'].every((id) => pick(id) === 'wierde'), 'trekker en landbouwmachine: Wierde Radio');
ok(['sport', 'suv', 'taxi'].every((id) => pick(id) === 'nachtjazz'), 'sportwagen, suv en taxi: Nachtjazz Radio');
ok(['fatbike', 'scooter', 'brommer', 'motor', 'tokkie-auto', 'gokart'].every((id) => pick(id) === 'tokkie'), 'fatbike, step, brommer, motor en opgevoerde auto: Tokkie Beats');
ok(['bus', 'midibus', 'trein'].every((id) => pick(id) === 'gmusic'), 'bus en trein: G-Music');
ok(['heli', 'plane'].every((id) => pick(id) === 'gmusic'), 'helikopter en vliegtuig: G-Music');
ok(['police', 'ambulance', 'politiepaard'].every((id) => pick(id) === null), 'politie en ambulance: de wereldradio blijft (de bestaande regels)');
ok(['hatch', 'sedan', 'heldenauto', 'onbekend'].every((id) => pick(id) === null), 'een gewone auto: de wereldradio blijft');
// Veenvuur FM (22-11): vrachtwagen, bestelbus en kluiswagen kiezen hem zodra hij open is, en laten de wereldradio staan zolang hij Binnenkort is
ok(['van', 'truck', 'cashvan'].every((id) => radioKindOf({ model: { name: id } }) === 'zwaar'), 'vrachtwagen, bestelbus en kluiswagen: soort zwaar');
ok(['van', 'truck', 'cashvan'].every((id) => pick(id, open0) === null || open0.includes('veenvuur')), 'zwaar: zolang Veenvuur FM Binnenkort is blijft de wereldradio staan (geen G-Music als terugval)');
ok(['van', 'truck', 'cashvan'].every((id) => pick(id, [...open0, 'veenvuur']) === 'veenvuur'), 'zwaar: Veenvuur FM zodra hij open is');
ok(vehicleChannel('zwaar', ['gmusic'], { zwaar: 'gmusic' }).channel === 'gmusic', 'zwaar: een eigen keuze wint');
ok(vehicleChannel('zwaar', ['gmusic'], { zwaar: 'veenvuur' }).channel === null, 'zwaar: een onthouden zender die niet open is, telt niet');
ok(pick('boot:rondvaart') === 'nachtstreek' && pick('boot:kano') === 'nachtstreek', 'boten: Nachtstreek zolang Radio Noordkust op Binnenkort staat');
ok(status0.find((s) => s.id === 'noordkust').status === 'soon', 'Radio Noordkust staat nog op Binnenkort');
const withKust = [...open0, 'noordkust'];
ok(pick('boot:rondvaart', withKust) === 'noordkust', 'boten: Radio Noordkust zodra hij open is');
ok(pick('trekker', ['gmusic', 'ruis']) === 'ruis' && pick('trekker', ['gmusic']) === 'gmusic', 'trekker: de geheime zender alleen als Wierde Radio ontbreekt en hij ontgrendeld is; anders G-Music');
ok(pick('sport', ['gmusic', 'nachtstreek']) === 'nachtstreek', 'luxe: zonder Nachtjazz Nachtstreek als terugval');
ok(vehicleChannel('luxe', ['gmusic'], {}).source === 'terugval' || vehicleChannel('luxe', ['gmusic'], {}).channel === 'gmusic', 'luxe: zonder iets anders G-Music');

// 5. nooit een verborgen of 'binnenkort'-zender, ook niet als de speler hem onthouden had
for (const id of RADIO_KIND_IDS) {
  for (const open of [open0, openUfo]) {
    const d = vehicleChannel(id, open, { [id]: 'ruis' });
    ok(d.channel === null || open.includes(d.channel), `${id}: een onthouden zender die niet open is, wordt niet gekozen`);
    const d2 = vehicleChannel(id, open, { [id]: 'noordkust' });
    ok(d2.channel !== 'noordkust', `${id}: een Binnenkort-zender wordt nooit gekozen`);
  }
}
ok(!open0.includes('ruis') && openUfo.includes('ruis'), 'de geheime zender is pas na het geheimpje te kiezen');
// geen zender onder de minimale pool: wat de tabel kiest heeft genoeg nummers
for (const { id, v } of catalog) {
  const c = vehicleChannel(radioKindOf(v), open0, {}).channel;
  if (c) ok(channelTracks(channelById(c), tracks).length >= channelById(c).minPool, `${id}: ${c} heeft genoeg nummers`);
}

// 6. instappen en uitstappen
const trekker = { id: 7, model: { name: 'tractor' } };
const sport = { id: 8, model: { name: 'sport' } };
const hatch = { id: 9, model: { name: 'hatch' } };
let st = outsideState();
let world = 'nachtstreek'; // de laatste keuze in de wereld
let r = enterVehicle(st, trekker, open0, {});
ok(r.channel === 'wierde' && r.state.kind === 'boer' && r.state.vehicle === 7, 'instappen in een trekker: Wierde Radio');
st = r.state;
r = exitVehicle(st, world, open0);
ok(r.channel === 'nachtstreek' && r.state.kind === null, 'uitstappen: de wereldradio komt terug (Nachtstreek)');
ok(exitVehicle(st, 'ruis', open0).channel === DEFAULT_CHANNEL, 'een wereldzender die niet meer open is, wordt G-Music');
ok(exitVehicle(st, null, open0).channel === DEFAULT_CHANNEL, 'zonder wereldkeuze: G-Music');
// een gewone auto laat de wereldradio staan
r = enterVehicle(outsideState(), hatch, open0, {});
ok(r.channel === null && r.state.kind === 'auto', 'een gewone auto: geen wisseling');
// onthouden per soort
let mem = {};
st = enterVehicle(outsideState(), trekker, open0, mem).state;
mem = rememberChoice(mem, st, 'gmusic', open0);
ok(mem.boer === 'gmusic', 'in de trekker zelf G-Music kiezen wordt voor trekkers onthouden');
ok(enterVehicle(outsideState(), trekker, open0, mem).channel === 'gmusic', 'de volgende trekker: de eigen keuze wint van de tabel');
ok(enterVehicle(outsideState(), sport, open0, mem).channel === 'nachtjazz', 'een andere soort houdt zijn eigen zender');
ok(rememberChoice(mem, outsideState(), 'wierde', open0) === mem, 'buiten een voertuig wordt niets per soort onthouden');
ok(rememberChoice(mem, st, 'ruis', open0) === mem && rememberChoice(mem, st, 'noordkust', open0) === mem, 'een zender die niet open is wordt niet onthouden');
ok(rememberChoice(mem, st, 'gmusic', open0) === mem, 'dezelfde keuze maakt geen nieuw object');
const memAuto = rememberChoice({}, enterVehicle(outsideState(), hatch, open0, {}).state, 'tokkie', open0);
ok(enterVehicle(outsideState(), hatch, open0, memAuto).channel === 'tokkie', 'ook een gewone auto onthoudt zijn keuze');
// de onthouden keuze van een geheime zender: weg als het geheimpje er niet is
ok(enterVehicle(outsideState(), trekker, open0, { boer: 'ruis' }).channel === 'wierde', 'een onthouden geheime zender zonder geheimpje valt terug op de tabel');
ok(enterVehicle(outsideState(), trekker, openUfo, { boer: 'ruis' }).channel === 'ruis', 'met het geheimpje geldt de onthouden geheime zender');
// de bewaarde instelling
ok(JSON.stringify(cleanRemembered({ boer: 'wierde', luxe: 5, nep: 'x', tokkie: 'tokkie' })) === '{"boer":"wierde","tokkie":"tokkie"}', 'de instelling houdt alleen bekende soorten met een tekst');
ok(JSON.stringify(cleanRemembered(null)) === '{}' && JSON.stringify(cleanRemembered([1, 2])) === '{}' && JSON.stringify(cleanRemembered('x')) === '{}' && JSON.stringify(cleanRemembered(undefined)) === '{}', 'een kapotte of ontbrekende instelling wordt leeg (migratie van oude bestanden)');
ok(cleanRemembered({ boer: 'x'.repeat(40) }).boer === undefined, 'een veel te lange waarde valt weg');

// 7. de melding
for (const c of CHANNELS) {
  const a = radioNotice(c, null);
  ok(a.station === `${c.name} · ${c.dj}`.slice(0, NOTICE_MAX.header) || a.station.endsWith('…'), `${c.id}: 'zender · DJ' bovenaan`);
  ok(a.station.length <= NOTICE_MAX.header && a.title.length <= NOTICE_MAX.title && a.artist.length <= NOTICE_MAX.artist, `${c.id}: de melding blijft kort`);
  ok(a.title === clip(c.sub, NOTICE_MAX.title) && a.artist === '' && a.kind === 'zender', `${c.id}: zonder titel de ondertitel van de zender`);
  ok(hudName(c).length <= 18, `${c.id}: de naam in de HUD is kort`);
}
const nt = radioNotice(channelById('wierde'), { title: 'Zon en tractor goud', artist: 'Boer Harm en de Terpkapel' });
ok(nt.title === 'Zon en tractor goud' && nt.artist === 'Boer Harm en de Terpkapel', 'met een bekend nummer: titel en artiest eronder');
const lang = radioNotice(channelById('wierde'), { title: 'T'.repeat(80), artist: 'A'.repeat(80) });
ok(lang.title.length === NOTICE_MAX.title && lang.title.endsWith('…') && lang.artist.length === NOTICE_MAX.artist, 'een te lange titel of artiest wordt afgekapt met een beletselteken');
ok(radioNotice(null) === null && clip(null, 5) === '' && clip('kort', 10) === 'kort', 'geen zender, geen melding; een korte tekst blijft zoals hij is');
const allText = CHANNELS.map((c) => radioNotice(c).station + ' ' + radioNotice(c).title).join(' ');
ok(!/[A-Za-z]+ing\b.*\b(the|and)\b/.test(allText) && !/\b(winter|sneeuw|ijs)\b/i.test(allText), 'de meldingstekst is Nederlands en zomers');
// een "Binnenkort"-zender komt nooit in de melding terecht: de melding wordt alleen voor de huidige (open) zender gemaakt
ok(!/Binnenkort/.test(allText.replace(/Binnenkort meer platen/g, '')), 'geen Binnenkort in een melding');

// 8. Samen spelen: de bestuurder bepaalt, een passagier volgt
ok(channelForPlayer({ driverChannel: 'wierde', follows: true }) === 'wierde', 'een passagier volgt de bestuurder');
ok(channelForPlayer({ driverChannel: 'wierde', follows: false, own: 'gmusic' }) === 'gmusic', 'een passagier die voor zichzelf kiest, houdt zijn eigen zender');
ok(channelForPlayer({ driverChannel: null, follows: true, start: 'tokkie' }) === 'tokkie', 'voertuigstart: zolang de bestuurder niets draait, geldt de zender van het voertuig');
ok(channelForPlayer({ driverChannel: 'gmusic', follows: true, start: 'tokkie' }) === 'gmusic', 'voertuigstart: de zender van de bestuurder gaat voor de start');
ok(channelForPlayer({ driverChannel: 'wierde', follows: true, own: 'ruis' }) === 'wierde', 'een passagier met een eigen keuze die niet volgt, volgt wel als hij dat zo heeft staan');
{
  // de bestuurder stapt in een trekker (zijn eigen onthouden keuze telt), een passagier stapt in en volgt de voertuigstart
  const bestuurder = enterVehicle(outsideState(), trekker, open0, { boer: 'gmusic' });
  ok(bestuurder.channel === 'gmusic', 'bestuurder: zijn eigen keuze voor trekkers');
  const passagier = channelForPlayer({ driverChannel: bestuurder.channel, follows: true, start: vehicleChannel('boer', open0, {}).channel });
  ok(passagier === 'gmusic', 'passagier: volgt de zender van de bestuurder, niet zijn eigen tabel');
}

// 9. de bronnen: de glue, de instelling, de HUD en de melding
const radioSrc = read('game/js/radio.js');
ok(/export function updateRadioVehicle\(w\)/.test(radioSrc) && /enterVehicle\(vehState, v, open, remembered\(\)\)/.test(radioSrc), 'radio.js: instappen kiest de zender van het voertuig');
ok(/exitVehicle\(vehState, wanted, open\)/.test(radioSrc), 'radio.js: uitstappen herstelt de laatste wereldkeuze (wanted)');
ok(/if \(!auto && !groep\) \{.*\s*if \(vehState\.kind\) rememberVehicle\(id\);\s*else \{ wanted = id; saveChannel\(\); \}/.test(radioSrc), 'radio.js: een zender van het voertuig wordt nooit als wereldkeuze bewaard; een eigen keuze in het voertuig wordt per soort onthouden');
ok(/!vehState\.kind && channelId === DEFAULT_CHANNEL && wanted !== DEFAULT_CHANNEL/.test(radioSrc), 'radio.js: het herstel van de bewaarde zender bij het starten werkt niet in een voertuig');
ok(/if \(!on && !auto && !groep\) setRadio\(true/.test(radioSrc), 'radio.js: een radio die uit stond blijft uit bij het instappen');
ok(/setSetting\('radioVehicle'/.test(radioSrc), 'radio.js: de keuze per soort gaat naar de instellingen (gde-settings), niet naar de save');
ok(!/radioVehicle/.test(read('game/js/savegame.js')), 'savegame.js: de keuze per soort staat niet in de save');
const settingsSrc = read('game/js/settings.js');
ok(/radioVehicle: \{\}/.test(settingsSrc) && /out\.radioVehicle = cleanRemembered\(raw\.radioVehicle\)/.test(settingsSrc), 'settings.js: een standaard en een schoonmaakstap voor oude of kapotte bestanden');
ok(/updateRadioVehicle\(world\)/.test(read('game/js/main.js')), 'main.js: de voertuigradio loopt elk beeld mee');
const hudSrc = read('game/js/hud_panel.js');
ok(/class="sp-zender"/.test(hudSrc) && /function updateChannelChip/.test(hudSrc) && /noticeBar\(els\.nowPlaying/.test(hudSrc), 'hud_panel.js: de zender bij de snelheidsmeter en het balkje op de radiokaart');
const cssSrc = read('game/js/hud_panel.css');
ok(/#hud \.sp-zender \{[^}]*var\(--ds-m-max\)/.test(cssSrc), 'hud_panel.css: het oplichten duurt hooguit 250 ms (--ds-m-max)');
ok(/radioNowTrack/.test(read('game/js/audio.js')) && /kind === 'zender'/.test(read('game/js/audio/radio.js')), 'audio: de lopende titel komt in de melding en de volgende plaat houdt de zenderregel');

console.log(`radiovehicle_test: ${process.exitCode ? 'MISLUKT' : 'ok'} (${n} controles)`);
