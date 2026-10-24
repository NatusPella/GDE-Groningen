// Samen spelen (#452): wat de host een gast laat zien aan tijdelijke rekwisieten en doelen. Alleen aanmeldingen bij coopextra.js
// (registreerRekwisieten, registreerDoelen); de modules zelf (heist, throwables, weapondrops, spikestrips, verhaalvlag) blijven zoals ze zijn.
import { registreerRekwisieten, registreerDoelen, doelenVan } from './coopextra.js';
import { heistRekwisieten } from './heist.js';
import { throwablesRekwisieten } from './throwables.js';
import { vlagRekwisieten } from './storyprops3d.js';

export function registreerHostBronnen(world) {
  registreerRekwisieten('heist', () => heistRekwisieten(world.time || 0));
  registreerRekwisieten('wegwerp', () => throwablesRekwisieten());
  registreerRekwisieten('verhaal', () => vlagRekwisieten());
  registreerRekwisieten('wapendrop', () => (world.weaponDrops || []).map((d) => ({ soort: 'wapendrop', id: d.id, x: d.x, y: d.y, z: d.gz || 0 })));
  registreerRekwisieten('spijkermat', () => ((world.shards && world.shards.fields) || []).map((f, i) => ({ f, i })).filter(({ f }) => f.kind === 'spijkers' && !f.hit).map(({ f, i }) => ({ soort: 'spijkermat', id: i, x: f.x, y: f.y, hoek: f.angle || 0 })));
  registreerDoelen('opdracht', () => doelenVan(world.mission));
}
