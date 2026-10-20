// Hidden developer switches: ?dev (desktop --dev) opens the story dev panel,
// ?storytest (desktop --story-test) runs the automated story test.
// Dev runs keep their own storage so they never touch the player's save,
// settings or prestaties: dev mode reads and writes 'gde-dev:'-prefixed
// keys, the story test keeps everything in memory. Imported by main.js right
// after storagekeys.js, whose old-key migration must see the real storage.
import { PREFIX, DEV_PREFIX } from './storagekeys.js';
import { seededRandom } from './botlogic.js';

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const STORY_TEST = q.has('storytest');
// ?autoplay[=seed] (Spelbot, #186): playerapi.js opens window.__bot; storage stays in memory, Math.random is seeded
export const AUTOPLAY = q.has('autoplay');
if (AUTOPLAY) Math.random = seededRandom(Number(q.get('autoplay')) || 1);
// ?testmenu (testmenu.js) leans on the dev storage too: flipping switches and
// jumping around must never reach the real save.
export const DEV = q.has('dev') || q.has('testmenu') || STORY_TEST || AUTOPLAY;
// The raw query, for testmenulogic.js (the only other reader; it takes it as a string).
export const SEARCH = typeof location !== 'undefined' ? location.search : '';

// Every URL switch the game reads, parsed once. Modules import FLAGS.x instead
// of reading location.search themselves. Boolean flags are on when the name is
// in the URL; value flags hold the string (or null). FLAG_DOCS lists them all
// (also in docs/ONTWIKKELEN.md). A switch is added or removed here only.
const has = (k) => q.has(k);
const val = (k) => (q.has(k) ? q.get(k) : null);
export const FLAGS = Object.freeze({
  dev: DEV,
  storytest: STORY_TEST,
  autoplay: AUTOPLAY,
  stil: has('stil'),
  audiograf: has('audiograf'),
  noattract: has('noattract'),
  attract: has('attract'),
  perf: has('perf'),
  spotsonly: has('spotsonly'),
  trailer: has('trailer'),
  preview: has('preview'),
  benchmark: has('benchmark'),
  benchmarkRuns: val('benchmark'),
  shot: val('shot'),
  cut: val('cut'),
  frames: has('frames'),
  video: has('video'),
  terrain: has('terrain'),
  viaducten: has('viaducten'),
  stadlaag: val('stadlaag'),
  nobatch: has('nobatch'),
  shaderdebug: has('shaderdebug'),
  noworker: has('noworker'),
  simworker: !has('zonderworker'),
  gfxadvies: has('gfxadvies'),
  gpu: val('gpu'),
  preset: val('preset'),
  touch: val('touch'),
  pixeldebug: has('pixeldebug'),
  coop: has('coop'),
  marker: val('marker'),
  hitch: has('hitch'),
  simlagen: !has('zonderlagen'),
  simauto: has('simauto'),
  zwartcheck: has('zwartcheck'),
  // on by default (#219); off in the automated tests, which cannot answer the prompt, and with ?zonderreizen
  reizen: has('reizen') || !(has('zonderreizen') || STORY_TEST || AUTOPLAY),
  zonderreizen: has('zonderreizen'),
  testmenu: has('testmenu'),
  brugbotsing: has('brugbotsing'),
  sfxtest: has('sfxtest'),
  perfoff: val('perfoff'),
});

// Prestatiestappen die voor een A/B-meting uit kunnen: ?perfoff=schaduw+actoren (scripts/perf/ab.mjs). Alles staat standaard aan.
const PERF_OFF = new Set((FLAGS.perfoff || '').split(/[+ ]/).filter(Boolean));
// window.__perfOffDyn (a Set, scripts/perf/routes.js route ab) switches steps within one run: the A and B windows of a measurement then feel the same load
export const perfOff = (name) => PERF_OFF.has(name) || (typeof window !== 'undefined' && window.__perfOffDyn !== undefined && window.__perfOffDyn.has(name));

export const FLAG_DOCS = Object.freeze({
  dev: 'Verhaalpaneel op F9; eigen opslag (gde-dev:), raakt je echte savegame niet',
  storytest: 'Geautomatiseerde verhaaltest; opslag alleen in het geheugen',
  autoplay: 'Spelbot (#186): window.__bot (playerapi.js) levert de spelstatus en neemt acties aan; vaste seed (autoplay=seed), opslag alleen in het geheugen',
  stil: 'Geen audio en geen pauze bij verborgen tabblad (testsessies)',
  audiograf: 'Met stil: de audiograaf draait wel, maar eindigt in een gedempte uitgang',
  noattract: 'Geen aantrekkingsfilmpje op het titelscherm; door naar het menu',
  attract: 'Speel het aantrekkingsfilmpje (trailer.js)',
  perf: 'Prestatierun: titelscherm automatisch voorbij',
  spotsonly: 'Verhaaltest: alleen de plekkenronde',
  trailer: 'Trailer-opnamemodus',
  preview: 'Trailer-voorbeeld in echte tijd met geluid (cut=teaser of hoofd); houd Spatie ingedrukt om over te slaan',
  benchmark: 'Benchmarkrun; de waarde is het aantal rondes',
  shot: 'Trailer: neem alleen die shot',
  cut: 'Trailer: montagevariant (vol, kort, verhaal, gameplay, teaser, hoofd)',
  frames: 'Trailer: sla beeld voor beeld op',
  video: 'Trailer: neem video op (alleen desktop)',
  viaducten: 'Hoogteprofielen van provinciebruggen en viaducten uit de tegels (alleen als gebouwd met --viaducts; het hoogtemodel volgt nog)',
  terrain: 'Hoogtes volgen het AHN-terrein (dijken, wierden; het terrein wordt nog niet getekend)',
  stadlaag: 'Stad per laag uit de gedeelde tegelbouw (gebouwen, wegen, water, spoor, groen, meubilair, poi, objecten, namen, of alle); #90, standaard uit',
  nobatch: 'Zet het samenvoegen van meshes uit (scene3d)',
  shaderdebug: 'Laat three.js shaderfouten controleren',
  noworker: 'Geometrie op de hoofdthread in plaats van in de worker',
  simworker: 'Standaard aan; ?zonderworker zet uit. Simulatie-worker (simhost.js, #58) voor ambient voetgangers; zonder Worker draait dezelfde kern op de hoofdthread. Voertuigen en de echte AI blijven op de hoofdthread',
  gfxadvies: 'Toon het grafische advies ook als de speler al koos',
  gpu: 'Doe alsof de GPU deze renderer-tekst heeft (test van het advies)',
  preset: 'Instellingen alleen voor deze sessie, bv. quality:laag,drawDistance:kort',
  pixeldebug: 'Nabewerking verft NaN/Inf-pixels magenta en negatieve HDR-waarden cyaan (issue #35)',
  coop: 'Lokaal samen spelen met twee spelers: speler 2 stuurt de metgezel (coop.js, issue #95)',
  marker: 'marker=vorm: de vaste 3D-vormen van de wereldmarker in plaats van het zachte glyph',
  stadlaag: 'Welke stadslagen uit de tegelbouw komen (lagen gescheiden door komma, of alle)',
  touch: 'Raakbediening aan (touch=1) of uit (touch=0), ook zonder touchscherm',
  hitch: 'Meet haperingen (hitchprobe)',
  simauto: "Ook gewone auto's ver van de speler door de simulatieworker laten rijden (simbridge.js, #58); alleen met de worker aan; nog niet standaard tot de meting winst laat zien",
  simlagen: 'Standaard aan; ?zonderlagen zet uit. Verkeer en voetgangers volgens simulatielagen per streek en afstand (simlagen.js)',
  zwartcheck: 'Controleer op zwarte beelden (blackframe)',
  testmenu: 'Testmenu op F10 met alle schakelaars en snelkoppelingen; eigen opslag (gde-dev:), raakt je echte savegame niet',
  sfxtest: 'Geluidstest: paneel met alle effecten, een afstandsschuif en een afspeelknop per effect; F8 verbergt het (#173)',
  brugbotsing: 'Stuurt na een paar seconden een binnenvaartschip tegen de dichtstbijzijnde brug (#9)',
  reizen: 'Reisbeats in het nieuwe verhaal: keuze Meerijden, Zelf rijden of Overslaan bij een sprong (#97); staat standaard aan, uit met zonderreizen en in de testmodi',
  zonderreizen: 'Zet de reisbeats uit (zie reizen)',
  perfoff: 'A/B-meting: zet prestatiestappen uit, namen gescheiden door +, bv. perfoff=schaduw+actoren (devflags.js, scripts/perf/ab.mjs)',
});


if (DEV && typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
  const mem = new Map();
  const MEM = STORY_TEST || AUTOPLAY;
  const proto = Storage.prototype;
  const get = proto.getItem, set = proto.setItem, remove = proto.removeItem;
  const ours = (store, k) => store === localStorage && typeof k === 'string' && k.startsWith(PREFIX) && !k.startsWith(DEV_PREFIX);
  proto.getItem = function (k) {
    if (!ours(this, k)) return get.call(this, k);
    if (MEM) return mem.has(k) ? mem.get(k) : null;
    return get.call(this, DEV_PREFIX + k);
  };
  proto.setItem = function (k, v) {
    if (!ours(this, k)) return set.call(this, k, v);
    if (MEM) { mem.set(k, String(v)); return undefined; }
    return set.call(this, DEV_PREFIX + k, v);
  };
  proto.removeItem = function (k) {
    if (!ours(this, k)) return remove.call(this, k);
    if (MEM) { mem.delete(k); return undefined; }
    return remove.call(this, DEV_PREFIX + k);
  };
}