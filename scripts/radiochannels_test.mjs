// Radiozenders (21-11, ADR 0046): de zenderdefinities, de pools uit het manifest, 'binnenkort' bij te weinig nummers, de geheime zender,
// de anti-herhaling (geheugen van de laatste N en de minutenregel) en de Samen-regel voor een gedeeld voertuig. Alles in node, zonder
// audio en zonder beeld; de speelkant (audio/radio.js) en het menu staan als bronchecks onderaan.
//   node scripts/radiochannels_test.mjs
import fs from 'node:fs';
import { normalizeTrack, pickTrack, pushHistory, MIN_POOL } from '../game/js/musicpick.js';
import {
  CHANNELS, STYLES, DEFAULT_CHANNEL, channelById, channelTracks, isUnlocked, channelStatus, openChannels, listChannels, nextChannel, validChannel,
  programmeFor, recentIds, pushLog, memorySize, channelForPlayer, tallyVotes, voteForChannel, dropVote,
} from '../game/js/radiochannels.js';
import { channelPickerHtml } from '../game/js/radiokeuze.js';
import { controleerToetsInKnop } from './lib/ds3_regels.mjs';

let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error('FAIL', m); process.exitCode = 1; } };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const man = JSON.parse(read('game/audio/gmusic/manifest.json'));
const tracks = man.tracks.map(normalizeTrack).filter(Boolean);
ok(tracks.length >= 30, `het manifest heeft nummers (${tracks.length})`);

// 1. de definities
ok(new Set(CHANNELS.map((c) => c.id)).size === CHANNELS.length, 'elke zender heeft een eigen id');
ok(channelById(DEFAULT_CHANNEL) && channelById(DEFAULT_CHANNEL).schedule, 'G-Music is de standaard en volgt het dagprogramma');
for (const c of CHANNELS) {
  ok(c.name && c.dj && c.ident && c.sub && c.frequency, `${c.id}: naam, DJ, ident, subtitel en frequentie`);
  ok(c.minPool >= MIN_POOL && c.minMinutes > 0, `${c.id}: minimale pool en minutenregel`);
  ok(c.schedule || (c.programme && c.programme.talk.length && c.programme.every >= 1), `${c.id}: een eigen programma met praatsoorten`);
  ok(c.schedule || !c.programme.talk.includes('dj') || (c.lines && c.lines.length), `${c.id}: een programma met DJ-regels heeft ook regels`);
  const text = [c.name, c.dj, c.ident, c.sub, ...(c.lines || [])].join(' ');
  ok(!/\b(winter|sneeuw|ijs)\b/i.test(text), `${c.id}: altijd zomer`);
  ok(!/de Grunn\b/.test(text), `${c.id}: Grunn, nooit de Grunn`);
  // verzonnen namen: geen echte zender, merk of artiest (de lijst is klein en bewust streng)
  ok(!/\b(NPO|Qmusic|Radio ?538|Sublime|Spotify|BNR|Skyradio|RTV Noord|Omrop)\b/i.test(text), `${c.id}: geen echt merk of echte zender`);
}
// elke stijl wijst naar een nummer uit het manifest, en elke stijl van een zender komt voor
const ids = new Set(tracks.map((t) => t.id));
for (const id of Object.keys(STYLES)) ok(ids.has(id), `stijlregel ${id} staat in het manifest`);
const styles = new Set(Object.values(STYLES).flat());
for (const c of CHANNELS) for (const s of (c.pool.styles || [])) ok(styles.has(s), `${c.id}: stijl ${s} komt voor`);

// 2. de pools en de standen
const status0 = channelStatus(tracks, { found: [] });
const of = (id, st = status0) => st.find((s) => s.id === id);
ok(of('gmusic').status === 'open' && of('gmusic').tracks === tracks.length, 'G-Music draait alle nummers');
ok(of('nachtstreek').status === 'open' && of('nachtstreek').tracks >= MIN_POOL, `Nachtstreek (rustig): ${of('nachtstreek').tracks} nummers`);
ok(of('wierde').status === 'open' && of('wierde').tracks >= MIN_POOL, `Wierde Radio (streek): ${of('wierde').tracks} nummers`);
ok(of('ruis').status === 'hidden', 'de geheime zender is verborgen zolang hij niet gevonden is');
ok(of('noordkust').status === 'soon' && of('noordkust').tracks < MIN_POOL, `Radio Noordkust blijft 'binnenkort' (${of('noordkust').tracks} nummers)`);
const open0 = openChannels(tracks, { found: [] });
ok(!open0.includes('noordkust') && !open0.includes('ruis'), 'binnenkort en verborgen zijn niet te kiezen');
ok(listChannels(tracks, { found: [] }).some((s) => s.id === 'noordkust') && !listChannels(tracks, { found: [] }).some((s) => s.id === 'ruis'), 'de lijst toont binnenkort, nooit een geheime zender die nog niet gevonden is');
// stijl bepaalt de pool: volks naar de streekzender, hiphop niet; ballad naar de avond
const poolWierde = new Set(channelTracks(channelById('wierde'), tracks).map((t) => t.id));
ok(poolWierde.has('Klompendans_bij_de_Sloot') && poolWierde.has('Zon_en_tractor_goud') && !poolWierde.has('Hart_van_Beton') && !poolWierde.has('Kasseien_bij_Middernacht'), 'volksnummers staan op Wierde Radio, hiphop en ballads niet');
const poolNight = new Set(channelTracks(channelById('nachtstreek'), tracks).map((t) => t.id));
ok(poolNight.has('Kleur_in_de_Wind') && poolNight.has('Goud_in_de_Nacht') && !poolNight.has('Vismarkt_Sprint'), 'ballads staan op Nachtstreek, hiphop niet');
// een zender zonder genoeg nummers wordt nooit aangevuld met leningen
ok(channelStatus(tracks.slice(0, 3), { found: ['ufo'] }).filter((s) => s.id !== 'gmusic').every((s) => s.status === 'soon'), 'met te weinig nummers is een zender binnenkort, niet aangevuld');
ok(channelStatus([], {}).every((s) => s.status !== 'open'), 'een leeg manifest heeft geen te kiezen zender');

// 3. ontgrendelen
const ruis = channelById('ruis');
ok(ruis.unlock && ruis.unlock.secret === 'ufo' && /found\('ufo'\)/.test(read('game/js/geheimen.js')), 'de geheime zender hangt aan een echt geheimpje (ufo in geheimen.js)');
ok(!isUnlocked(ruis, { found: [] }) && !isUnlocked(ruis, { found: ['kamer', 'bankje'] }), 'andere geheimpjes openen hem niet');
ok(isUnlocked(ruis, { found: ['ufo'] }) && isUnlocked(ruis, { found: new Set(['ufo']) }), 'het ufo-geheimpje opent hem (lijst en Set)');
ok(isUnlocked(ruis, { dev: true }), 'dev opent alles');
const status1 = channelStatus(tracks, { found: ['ufo'] });
ok(of('ruis', status1).status === 'open' && of('ruis', status1).tracks >= MIN_POOL, `na het vinden is Ruisradio open (${of('ruis', status1).tracks} nummers)`);
ok(isUnlocked(channelById('gmusic'), {}), 'een gewone zender heeft geen ontgrendeling nodig');

// 4. wisselen
ok(nextChannel('gmusic', open0) === open0[1] && nextChannel(open0[open0.length - 1], open0) === open0[0], 'volgende zender, met omslag');
ok(nextChannel(open0[0], open0, -1) === open0[open0.length - 1], 'vorige zender, met omslag');
ok(nextChannel('ruis', open0) === open0[0], 'een gesloten huidige zender begint vooraan');
ok(nextChannel('gmusic', ['gmusic']) === 'gmusic' && nextChannel('x', []) === DEFAULT_CHANNEL, 'één keuze blijft, geen keuze is G-Music');
ok(validChannel('ruis', open0) === DEFAULT_CHANNEL && validChannel(null, open0) === DEFAULT_CHANNEL && validChannel('wierde', open0) === 'wierde', 'een bewaarde zender die niet open is wordt G-Music');
ok(programmeFor(channelById('gmusic'), 7).id === 'ochtend' && programmeFor(channelById('gmusic'), 23).music === 'nachtstreek', 'G-Music volgt het dagprogramma');
ok(programmeFor(channelById('wierde'), 7).id === 'wierde' && programmeFor(channelById('wierde'), 23).id === 'wierde' && programmeFor(channelById('wierde'), 7).stationName === 'Wierde Radio', 'een eigen zender heeft één eigen programma, dag en nacht');

// 5. anti-herhaling: de echte pickTrack met het geheugen van N nummers en de minutenregel, 3 minuten per nummer
let seed = 11; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const TRACK_MIN = 3;
for (const id of ['gmusic', 'nachtstreek', 'wierde', 'ruis']) {
  const c = channelById(id);
  const pool = id === 'gmusic' ? null : channelTracks(c, tracks);
  const size = (pool || tracks).length;
  const history = []; const log = []; const played = [];
  let againMemory = 0, againMinutes = 0;
  for (let i = 0; i < 600; i++) {
    const now = i * TRACK_MIN;
    const t = pickTrack(tracks, history, { station: 'gmusic', hour: 12, rng, pool, avoid: recentIds(log, now, c.minMinutes) });
    if (history.slice(-memorySize(size)).includes(t.id)) againMemory++;
    // de minutenregel geldt zolang de pool groter is dan wat erin past
    if (size > Math.ceil(c.minMinutes / TRACK_MIN) + 1 && log.some((e) => e.id === t.id && now - e.at < c.minMinutes)) againMinutes++;
    played.push(t.id);
    pushLog(log, t.id, now); pushHistory(history, t.id);
  }
  ok(againMemory === 0, `${id}: nooit een van de laatste ${memorySize(size)} nummers opnieuw (${againMemory} keer)`);
  ok(againMinutes === 0, `${id}: nooit binnen ${c.minMinutes} minuten opnieuw zolang de pool het toelaat (${againMinutes} keer)`);
  ok(new Set(played).size === size, `${id}: elk nummer van de pool komt aan de beurt (${new Set(played).size} van ${size})`);
  ok(played.every((x, i) => i === 0 || x !== played[i - 1]), `${id}: nooit twee keer hetzelfde nummer achter elkaar`);
}
// de geschiedenis is voor alle zenders gedeeld: wisselen van zender draait niet het nummer dat net speelde
{
  let again = 0;
  const history = []; const log = [];
  for (let i = 0; i < 400; i++) {
    const c = channelById(['gmusic', 'nachtstreek', 'wierde'][i % 3]);
    const pool = c.schedule ? null : channelTracks(c, tracks);
    const t = pickTrack(tracks, history, { station: 'gmusic', hour: 12, rng, pool, avoid: recentIds(log, i * TRACK_MIN, c.minMinutes) });
    if (history.length && history[history.length - 1] === t.id) again++;
    pushLog(log, t.id, i * TRACK_MIN); pushHistory(history, t.id);
  }
  ok(again === 0, `wisselen tussen zenders geeft nooit hetzelfde nummer meteen opnieuw (${again} keer)`);
}
// de minutenregel mag de pool nooit leegmaken: een kleine pool met een lange regel draait gewoon door
{
  const small = tracks.slice(0, 6);
  const history = []; const log = [];
  let done = true;
  for (let i = 0; i < 50; i++) {
    const t = pickTrack(small, history, { rng, pool: small, avoid: recentIds(log, i * TRACK_MIN, 120) });
    if (!t) done = false;
    pushLog(log, t.id, i * TRACK_MIN); pushHistory(history, t.id);
  }
  ok(done, 'een lange minutenregel op een kleine pool blijft nummers geven');
}
ok(recentIds([{ id: 'a', at: 0 }, { id: 'b', at: 10 }], 12, 5).has('b') && !recentIds([{ id: 'a', at: 0 }, { id: 'b', at: 10 }], 12, 5).has('a'), 'recentIds telt alleen de laatste minuten');
ok(memorySize(1) === 0 && memorySize(2) === 1 && memorySize(6) === 3 && memorySize(39) === 23, 'het geheugen is 60% van de pool, nooit de hele pool');

// 6. Samen spelen: de zender in een gedeeld voertuig
ok(channelForPlayer({ driverChannel: 'wierde', follows: true, own: 'nachtstreek' }) === 'wierde', 'een passagier die volgt hoort de zender van de bestuurder');
ok(channelForPlayer({ driverChannel: 'wierde', follows: false, own: 'nachtstreek' }) === 'nachtstreek', 'een passagier die zelf kiest hoort zijn eigen zender');
ok(channelForPlayer({ driverChannel: 'wierde', follows: false, own: null }) === 'wierde', 'zonder eigen keuze volgt hij toch');
let votes = {};
votes = voteForChannel(votes, { player: 'p1', driver: 'p0', channel: 'nachtstreek' }, open0);
votes = voteForChannel(votes, { player: 'p2', driver: 'p0', channel: 'nachtstreek' }, open0);
votes = voteForChannel(votes, { player: 'p3', driver: 'p0', channel: 'wierde' }, open0);
ok(tallyVotes(votes, open0).suggestion === 'nachtstreek' && tallyVotes(votes, open0).tally.nachtstreek === 2, 'de meeste stemmen geven een suggestie');
ok(voteForChannel(votes, { player: 'p0', driver: 'p0', channel: 'wierde' }, open0) === votes, 'de bestuurder stemt niet: hij kiest');
ok(tallyVotes(voteForChannel({}, { player: 'p1', driver: 'p0', channel: 'ruis' }, open0), open0).suggestion === null, 'een zender die niet open is krijgt geen stem');
ok(tallyVotes({ p1: 'wierde', p2: 'nachtstreek' }, open0).suggestion === null, 'gelijk aantal stemmen is geen suggestie');
ok(tallyVotes(dropVote(votes, 'p1'), open0).tally.nachtstreek === 1 && !('p1' in dropVote(votes, 'p1')), 'een passagier die uitstapt of wegvalt neemt zijn stem mee');
ok(!('p3' in voteForChannel(votes, { player: 'p3', driver: 'p0', channel: null }, open0)), 'een stem intrekken kan');

// 7. het menu: de rijen en de knop in het designsysteem, de toets in de knop
const rows = listChannels(tracks, { found: [] }).map((s, i) => ({ ...s, active: i === 0 }));
const html = channelPickerHtml(rows);
ok((html.match(/data-channel="/g) || []).length === rows.length, 'elke zender in de lijst heeft een rij');
ok(controleerToetsInKnop(html).length === 0, 'de knop Volgende zender heeft zijn toets in de knop');
ok(/data-key="N"/.test(html) && (html.match(/data-gk="/g) || []).length >= 2, 'de knop toont Shift en N als glyphs');
ok(/aria-disabled="true"/.test(html) && /Binnenkort/.test(html), "een zender met te weinig nummers staat als 'Binnenkort' in de lijst");
ok(!/ruis/.test(html), 'de geheime zender staat nog niet in de lijst');

// 8. de bronnen: het spel gebruikt dit echt
const radio = read('game/js/radio.js'); const audioRadio = read('game/js/audio/radio.js'); const pm = read('game/js/pausemenu.js');
ok(/nk === 'next'\) stepChannel\(1\)/.test(radio) && /shift: w\.input\.isDown\('shift'\)/.test(radio), 'Shift+N kiest de volgende zender (radiocontrol.js createNKey)');
ok(/radioChannel: 'gde-radio-zender'/.test(read('game/js/storagekeys.js')), 'de keuze heeft een eigen opslagsleutel');
ok(/channelTracks\(z, tracks\)/.test(audioRadio) && /recentIds\(gmusicLog/.test(audioRadio), 'audio/radio.js draait uit de pool van de zender met de minutenregel');
ok(/data-channels-wrap/.test(pm) && /selectChannel\(chRow\.dataset\.channel/.test(pm), 'Instellingen > Geluid toont de zenderkeuze');
ok(/Shift ingedrukt/.test(read('game/js/controls.js')), 'de toetsenlijst noemt Shift+N');

console.log(`radiochannels_test: ${process.exitCode ? 'MISLUKT' : 'ok'} (${n} controles)`);
