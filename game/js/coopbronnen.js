// Samen spelen (#452): wat de host een gast laat zien aan tijdelijke rekwisieten en doelen. Alleen aanmeldingen bij coopextra.js
// (registreerRekwisieten, registreerDoelen); de modules zelf (heist, throwables, weapondrops, spikestrips, verhaalvlag) blijven zoals ze zijn.
import { registreerRekwisieten, registreerDoelen } from './coopextra.js';
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

// De doelen van de lopende opdracht: het doel zelf en de controlepunten die nog te gaan zijn
export function doelenVan(m) {
  if (!m || m.phase !== 'active' || !m.marker) return [];
  const uit = [];
  if (Number.isFinite(m.marker.x) && Number.isFinite(m.marker.y)) uit.push({ id: 0, soort: m.type === 'heist' ? 'inbraak' : 'doel', x: m.marker.x, y: m.marker.y, label: m.label || 'Opdracht' });
  (m.remainingWaypoints || []).slice(0, 10).forEach((w, i) => { if (w && Number.isFinite(w.x) && Number.isFinite(w.y)) uit.push({ id: i + 1, soort: 'controle', x: w.x, y: w.y, label: 'Controlepunt' }); });
  return uit;
}
