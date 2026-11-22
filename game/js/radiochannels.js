// De radiozenders (21-11, ADR 0046), in de code "channels": wie draait wat, wanneer een zender er is en wat hij nooit twee keer kort na
// elkaar draait. ("station" is al de naam van een pool in musicpick.js en van G-Music zelf; een zender is hier een channel.)
// Puur en node-veilig (geen DOM, geen opslag, geen audio): audio/radio.js speelt de nummers, radio.js (de glue) bewaart de keuze,
// pausemenu.js toont de lijst en scripts/radiochannels_test.mjs loopt alles in node.
//
// Een zender is data: een naam, een DJ, een ident (een korte tekstjingle, gesproken met de zachte mompelstem; geen nieuwe opname),
// een pool nummers uit game/audio/gmusic/manifest.json en een programma (hoe vaak er gepraat wordt, waarover). De pool komt uit het
// manifest zelf: `manifest` pakt wat het manifest bij die zender zet (stations), `styles` pakt nummers op hun stijl (STYLES hieronder:
// de stijl staat bij de bestandsnaam, het manifest en de bestanden blijven zoals ze zijn). Een zender met minder dan `minPool` nummers
// is er nog niet: status 'soon' (Binnenkort in de lijst), nooit in de rotatie. Een geheime zender is er pas als de speler hem heeft
// gevonden (`unlock`): status 'hidden'. Alles is verzonnen: geen echte zenders, merken of personen.
import { programmeAt, MIN_POOL } from './musicpick.js';

// Stijl per nummer (bestandsnaam zonder .mp3). Bron: de stijlprompts in docs/verhaal/MUZIEK-LYRICS-21-11.md en docs/MUZIEK.md, de
// act en de titel. Een nummer mag meer stijlen hebben; een nieuw nummer zonder regel hier hoort alleen bij G-Music.
export const STYLES = {
  Onder_de_Martinitoren: ['hiphop'],
  Hart_van_Beton: ['hiphop'],
  Ivoren_Toren_in_Helpman: ['hiphop'],
  Staal_op_staal: ['hiphop'],
  Vismarkt_Sprint: ['hiphop'],
  Trouw_aan_het_blok: ['hiphop'],
  Perfectie_kent_geen_grens: ['hiphop'],
  Goudgeld_op_de_oprit: ['hiphop'],
  Kapsalon_Kees_en_de_Vismarkt: ['hiphop'],
  Geen_stoplicht_houdt_ons_tegen: ['dance'],
  Rood_Licht_Is_Een_Mening: ['dance'],
  Hatchback_op_de_Ring: ['pop'],
  Zomerse_droom_in_de_Stad: ['pop'],
  Fietsend_door_de_Ochtend: ['pop'],
  Zonlicht_in_het_Noorderplantsoen: ['pop'],
  Zunne_op_de_Ring: ['pop'],
  Staal_en_suiker: ['volks'],
  Wie_stoan_nait_stil: ['volks'],
  Trots_op_mien_grond: ['volks'],
  Zilverweide_Groen: ['volks'],
  Zomeravond_in_Dalsum: ['volks'],
  Op_de_Fietse_noar_Klompenoord: ['volks'],
  Zon_en_tractor_goud: ['volks'],
  Langs_het_Grunneger_Land: ['volks'],
  Klompendans_bij_de_Sloot: ['volks'],
  Grunn_is_nooit_klaar: ['volks'],
  Kroket_in_de_zon: ['dance'],
  Net_te_dichtbij: ['ballad'],
  Laagwater_om_middernacht: ['ballad', 'kust'],
  Zunneschien_op_t_wad: ['volks', 'kust'],
  Letste_bus_noar_nargens: ['ballad', 'volks'],
  Suikerbuiken_in_de_nacht: ['ballad'],
  Oosterpark_is_m_n_droom: ['ballad'],
  Kleur_in_de_Wind: ['ballad'],
  Goud_in_de_Nacht: ['ballad'],
  Zilverglans_op_het_Asfalt: ['ballad'],
  De_Geest_Van_Oosterpark: ['ballad', 'spook'],
  Koplampen_in_de_Mist: ['ballad', 'spook'],
  Kasseien_bij_Middernacht: ['ballad', 'spook'],
  Schaduwen_bij_de_steiger: ['ballad', 'spook'],
  De_Zwaan_sluut: ['ballad', 'spook'],
  Hooge_Lucht: ['ballad', 'spook', 'kust'],
};

// De zenders. `schedule`: volgt het dagprogramma van G-Music (musicpick.js PROGRAMMES); anders heeft de zender één eigen `programme`.
// `talk`: de praatsoorten in volgorde (radio.js segment); 'dj' is een regel van de eigen DJ uit `lines`, de rest zijn de bestaande
// praatjes. `minMinutes` is de minutenregel van de anti-herhaling (zie recentIds); het geheugen van N nummers zit in pickTrack.
export const CHANNELS = [
  {
    id: 'gmusic', name: 'G-Music', dj: 'Geesje', frequency: '98,3', sub: 'De hits van Grunn, met nieuws en verkeer',
    ident: 'G-Music, de soundtrack van Grunn.', schedule: true,
    pool: { manifest: 'gmusic' }, minPool: MIN_POOL, minMinutes: 12,
  },
  {
    id: 'nachtstreek', name: 'Nachtstreek', dj: 'Rikus', frequency: '101,6', sub: 'Rustige streekmuziek, ook overdag een avond',
    ident: 'Rikus draait door: Nachtstreek, zachtjes aan.',
    pool: { styles: ['ballad'] }, minPool: MIN_POOL, minMinutes: 15,
    programme: { id: 'nachtzender', every: 2, jingles: false, talk: ['rikus', 'rikus', 'clip'], music: 'nachtstreek' },
  },
  {
    id: 'wierde', name: 'Wierde Radio', dj: 'Boer Harm', frequency: '93,1', sub: 'Streekmuziek vanaf de terp',
    ident: 'Wierde Radio: de terp op, het volume omhoog.',
    pool: { styles: ['volks'] }, minPool: MIN_POOL, minMinutes: 15,
    programme: { id: 'wierde', every: 3, jingles: false, talk: ['dj', 'weather', 'dj', 'cows', 'clip'], music: 'gmusic' },
    lines: [
      'Dit is Wierde Radio, vanaf de terp. Boer Harm achter de knoppen, de laarzen nog aan.',
      'De koeien staan droog, de zon staat hoog. Beter wordt het niet, dus zet de ramen open.',
      'Een groet aan iedereen op het erf. De koffie staat klaar, de trekker staat te wachten.',
      'Wie nu een dijk op rijdt, zwaait terug naar het vee. Dat is hier de wet.',
      'Nog een plaat, dan gaan we naar de weerpraat. Het blijft zomer, hoor.',
    ],
  },
  {
    id: 'ruis', name: 'Ruisradio 108,7', dj: 'Meneer Ruis', frequency: '108,7', sub: 'Een zender die er niet hoort te zijn',
    ident: 'Krrr... dit is geen zender. Toch luister je.',
    pool: { styles: ['spook'] }, minPool: MIN_POOL, minMinutes: 20,
    programme: { id: 'ruis', every: 2, jingles: false, talk: ['dj', 'dj', 'clip'], music: 'nachtstreek' },
    // pas te vinden na het geheimpje van de lichtjes boven Stad (geheimen.js, 'ufo')
    unlock: { secret: 'ufo', hint: 'Soms zoemt er iets in de ruis, als de lucht boven Stad vreemd is.' },
    lines: [
      'Krrr... u luistert naar niemand in het bijzonder. Blijf vooral hangen.',
      'Dit is Meneer Ruis. Ik ben er niet. De volgende plaat ook niet.',
      'Een groet aan wie dit hoort. Geen zorgen: niemand heeft het over u gehad.',
      'De frequentie schuift. Ik schuif mee. Het is nog steeds zomer.',
    ],
  },
  {
    id: 'noordkust', name: 'Radio Noordkust', dj: 'Wadwind Wil', frequency: '104,2', sub: 'Kustpop en wadwind',
    ident: 'Radio Noordkust: zand tussen de tenen.',
    pool: { styles: ['kust'] }, minPool: MIN_POOL, minMinutes: 15,
    programme: { id: 'noordkust', every: 3, jingles: false, talk: ['dj', 'weather'], music: 'gmusic' },
    lines: ['Radio Noordkust, met de wind mee. Binnenkort meer platen.'],
  },
];

export const channelById = (id) => CHANNELS.find((c) => c.id === id) || null;
export const DEFAULT_CHANNEL = 'gmusic';

// De nummers van een zender uit de manifestlijst (genormaliseerde tracks, musicpick.js normalizeTrack): wat het manifest bij de zender
// zet, plus wat de stijl erbij haalt. Geen leningen: een te kleine pool wordt 'soon' en niet aangevuld.
export function channelTracks(channel, tracks) {
  const p = (channel && channel.pool) || {};
  return tracks.filter((t) => (p.manifest && t.stations.includes(p.manifest)) || (p.styles && (STYLES[t.id] || []).some((s) => p.styles.includes(s))));
}

// Staat een geheime zender open? `found`: de geheimpjes van de speler (een Set of een lijst), `dev` opent alles.
export function isUnlocked(channel, { found = [], dev = false } = {}) {
  if (!channel || !channel.unlock || dev) return true;
  const set = found instanceof Set ? found : new Set(found);
  return set.has(channel.unlock.secret);
}

// De stand van elke zender voor de lijst: 'open' (te kiezen), 'soon' (te weinig nummers: staat in de lijst, niet te kiezen),
// 'hidden' (geheim en nog niet gevonden: staat nergens in de lijst). `tracks`: de genormaliseerde manifestnummers.
export function channelStatus(tracks, ctx = {}) {
  return CHANNELS.map((c) => {
    const n = channelTracks(c, tracks).length;
    const status = !isUnlocked(c, ctx) ? 'hidden' : n >= c.minPool ? 'open' : 'soon';
    return { id: c.id, name: c.name, sub: c.sub, dj: c.dj, tracks: n, status };
  });
}
export const openChannels = (tracks, ctx) => channelStatus(tracks, ctx).filter((s) => s.status === 'open').map((s) => s.id);
export const listChannels = (tracks, ctx) => channelStatus(tracks, ctx).filter((s) => s.status !== 'hidden');

// De volgende (dir 1) of vorige (dir -1) zender uit de te kiezen zenders, met omslag. Een onbekende of dichte huidige zender
// begint vooraan. Is er maar één keuze, dan blijft het die.
export function nextChannel(current, open, dir = 1) {
  if (!open.length) return DEFAULT_CHANNEL;
  const i = open.indexOf(current);
  if (i < 0) return open[0];
  return open[(i + (dir < 0 ? -1 : 1) + open.length) % open.length];
}

// Een bewaarde keuze die niet (meer) te kiezen is, wordt G-Music: een save of een kapotte waarde breekt nooit.
export const validChannel = (v, open) => (typeof v === 'string' && open.includes(v) ? v : DEFAULT_CHANNEL);

// Het programma dat de radio nu draait: G-Music volgt de dag (musicpick.js), elke andere zender heeft zijn eigen.
export function programmeFor(channel, hour) {
  if (!channel || channel.schedule) return { ...programmeAt(hour), channel: 'gmusic', stationName: 'G-Music' };
  const p = channel.programme;
  return { id: p.id, name: channel.name, sub: channel.sub, music: p.music, jingles: !!p.jingles, every: p.every, talk: p.talk, channel: channel.id, stationName: channel.name };
}

// --- anti-herhaling --------------------------------------------------------------------------------------------------------------
// Het log is { id, at } (at in minuten, nieuwste laatst). Een nummer dat in de laatste `minMinutes` minuten speelde, komt niet
// terug zolang er iets anders is; het geheugen van N nummers zit in pickTrack (venster van 60% van de pool, nooit de hele pool).
export function recentIds(log, nowMin, minMinutes) {
  const s = new Set();
  for (const e of log) if (nowMin - e.at < minMinutes) s.add(e.id);
  return s;
}
export function pushLog(log, id, nowMin, max = 60) {
  log.push({ id, at: nowMin });
  if (log.length > max) log.splice(0, log.length - max);
  return log;
}
// Hoeveel nummers de pool onthoudt (hetzelfde venster als pickTrack gebruikt), voor de lijst en de test.
export const memorySize = (n) => (n <= 1 ? 0 : Math.max(1, Math.min(n - 1, Math.floor(n * 0.6))));

// --- Samen spelen: de zender in een gedeeld voertuig ----------------------------------------------------------------------------
// De zender is lokaal per speler (er gaat niets over het net behalve de keuze in het voertuig). In een gedeeld voertuig kiest de
// bestuurder; een passagier volgt hem (standaard) of kiest voor zichzelf (`own`), en kan stemmen op een zender als suggestie.
// De bestuurder beslist: een stem is nooit een bevel. Puur: de aanroeper geeft de stand mee.
export function channelForPlayer({ driverChannel, follows = true, own = null }) {
  return follows || !own ? driverChannel : own;
}
// votes: { playerId: channelId }. Geeft de zender met de meeste stemmen (gelijk = geen suggestie) en de telling.
export function tallyVotes(votes, open) {
  const tally = {};
  for (const c of Object.values(votes || {})) if (open.includes(c)) tally[c] = (tally[c] || 0) + 1;
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const suggestion = rows.length && (rows.length === 1 || rows[0][1] > rows[1][1]) ? rows[0][0] : null;
  return { tally, suggestion };
}
// Een passagier stemt (of trekt zijn stem in met null); de bestuurder kan niet stemmen, hij kiest.
export function voteForChannel(votes, { player, driver, channel: id }, open) {
  if (!player || player === driver) return votes;
  const next = { ...votes };
  if (id && open.includes(id)) next[player] = id; else delete next[player];
  return next;
}
// Een speler stapt uit of valt weg: zijn stem gaat mee, het voertuig houdt zijn zender.
export function dropVote(votes, player) {
  const next = { ...votes };
  delete next[player];
  return next;
}
