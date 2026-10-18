// Hidden developer switches: ?dev (desktop --dev) opens the story dev panel,
// ?storytest (desktop --story-test) runs the automated story test.
// Dev runs keep their own storage so they never touch the player's save,
// settings or prestaties: dev mode reads and writes 'gde-dev:'-prefixed
// keys, the story test keeps everything in memory. Imported by main.js right
// after storagekeys.js, whose old-key migration must see the real storage.
import { PREFIX, DEV_PREFIX } from './storagekeys.js';

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const STORY_TEST = q.has('storytest');
// ?pixeldebug (issue #35, the odd green pixel): the post chain paints NaN/Inf
// pixels magenta and negative HDR values cyan, so a stray pixel can be
// identified by colour. Off by default.
export const PIXEL_DEBUG = q.has('pixeldebug');
// ?coop (issue #95): local two-player mini co-op, player 2 steers the companion (coop.js)
export const COOP = q.has('coop');
export const DEV = q.has('dev') || STORY_TEST;
// ?marker=vorm: the solid 3D shapes of the world marker (worldmarker3d.js); else the soft glowing glyph
export const MARKER_SOLID = q.get('marker') === 'vorm';

// Every URL switch the game reads, parsed once. Modules import FLAGS.x instead
// of reading location.search themselves. Boolean flags are on when the name is
// in the URL; value flags hold the string (or null). FLAG_DOCS lists them all
// (also in docs/ONTWIKKELEN.md). A switch is added or removed here only.
// storyflag.js (?nieuwverhaal) is the exception: storagekeys.js needs it and
// this module imports storagekeys.js, so it would be a cycle.
const has = (k) => q.has(k);
const val = (k) => (q.has(k) ? q.get(k) : null);
export const FLAGS = Object.freeze({
  dev: DEV,
  storytest: STORY_TEST,
  stil: has('stil'),
  audiograf: has('audiograf'),
  noattract: has('noattract'),
  attract: has('attract'),
  perf: has('perf'),
  spotsonly: has('spotsonly'),
  trailer: has('trailer'),
  benchmark: has('benchmark'),
  benchmarkRuns: val('benchmark'),
  shot: val('shot'),
  cut: val('cut'),
  frames: has('frames'),
  video: has('video'),
  legacymap: has('legacymap'),
  stadlaag: val('stadlaag'),
  nobatch: has('nobatch'),
  shaderdebug: has('shaderdebug'),
  noworker: has('noworker'),
  gfxadvies: has('gfxadvies'),
  gpu: val('gpu'),
  preset: val('preset'),
  touch: val('touch'),
  hitch: has('hitch'),
  zwartcheck: has('zwartcheck'),
});

export const FLAG_DOCS = Object.freeze({
  dev: 'Verhaalpaneel op F9; eigen opslag (gde-dev:), raakt de echte save niet',
  storytest: 'Geautomatiseerde verhaaltest; opslag alleen in het geheugen',
  stil: 'Geen audio en geen pauze bij verborgen tabblad (testsessies)',
  audiograf: 'Met stil: de audiograaf draait wel, maar eindigt in een gedempte uitgang',
  noattract: 'Geen aantrekkingsfilmpje op het titelscherm; door naar het menu',
  attract: 'Speel het aantrekkingsfilmpje (trailer.js)',
  perf: 'Prestatierun: titelscherm automatisch voorbij',
  spotsonly: 'Verhaaltest: alleen de plekkenronde',
  trailer: 'Trailer-opnamemodus',
  benchmark: 'Benchmarkrun; de waarde is het aantal rondes',
  shot: 'Trailer: neem alleen die shot',
  cut: 'Trailer: montagevariant (vol, kort, ...)',
  frames: 'Trailer: sla beeld voor beeld op',
  video: 'Trailer: neem video op (alleen desktop)',
  legacymap: 'Laad de oude kaart in plaats van de tegelwereld',
  stadlaag: 'Stad per laag uit de gedeelde tegelbouw (gebouwen, wegen, water, spoor, groen, meubilair, poi, objecten, namen, of alle); #90, standaard uit',
  nobatch: 'Zet het samenvoegen van meshes uit (scene3d)',
  shaderdebug: 'Laat three.js shaderfouten controleren',
  noworker: 'Geometrie op de hoofdthread in plaats van in de worker',
  gfxadvies: 'Toon het grafische advies ook als de speler al koos',
  gpu: 'Doe alsof de GPU deze renderer-tekst heeft (test van het advies)',
  preset: 'Instellingen alleen voor deze run, bv. quality:laag,drawDistance:kort',
  touch: 'Raakbediening aan (touch=1) of uit (touch=0), ook zonder touchscherm',
  hitch: 'Meet haperingen (hitchprobe)',
  zwartcheck: 'Controleer op zwarte beelden (blackframe)',
});


if (DEV && typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
  const mem = new Map();
  const proto = Storage.prototype;
  const get = proto.getItem, set = proto.setItem, remove = proto.removeItem;
  const ours = (store, k) => store === localStorage && typeof k === 'string' && k.startsWith(PREFIX) && !k.startsWith(DEV_PREFIX);
  proto.getItem = function (k) {
    if (!ours(this, k)) return get.call(this, k);
    if (STORY_TEST) return mem.has(k) ? mem.get(k) : null;
    return get.call(this, DEV_PREFIX + k);
  };
  proto.setItem = function (k, v) {
    if (!ours(this, k)) return set.call(this, k, v);
    if (STORY_TEST) { mem.set(k, String(v)); return undefined; }
    return set.call(this, DEV_PREFIX + k, v);
  };
  proto.removeItem = function (k) {
    if (!ours(this, k)) return remove.call(this, k);
    if (STORY_TEST) { mem.delete(k); return undefined; }
    return remove.call(this, DEV_PREFIX + k);
  };
}