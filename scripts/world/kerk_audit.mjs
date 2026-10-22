// Kerken zonder kerkvorm (#406): welke kerkgebouwen van de tegels krijgen GEEN kerkkit (landmarkkit.js) en worden dus als gewoon gebouw
// getekend (models3d_buildings.js addChurchDetail: een doos met een doostoren)? En welke kit-kerken laten hun tegelgebouw staan
// (de kit dekt de voetafdruk niet: twee kerken op elkaar)?
//   node scripts/world/kerk_audit.mjs [wereldmap] [--list] [--json=<bestand>]
// Vereist een gebouwde provinciewereld (cd desktop && npm run stage, of een staged game/world).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leesTegelRijen, heeftTegels } from '../lib/tegelrijen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'game', 'world'));
const jsonOut = (args.find((a) => a.startsWith('--json=')) || '').slice(7);
if (!heeftTegels(dir)) { console.log(`geen tegels in ${dir}`); process.exit(0); }
const K = await import('../../game/js/landmarkkit.js');
const kits = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'landmarkkits.json'), 'utf8')).items.filter((i) => i.k === 'church' || i.k === 'chapel');
const { buildings } = await leesTegelRijen(dir);
const cent = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const area = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const q = pts[(i + 1) % pts.length]; a += pts[i][0] * q[1] - q[0] * pts[i][1]; } return Math.abs(a / 2); };
// de kerken van de tegels: type church of chapel (building=church / chapel / cathedral), of een naam die op een kerk wijst
const NAAM = /kerk|kapel|abdij|dom\b|synagoge|basiliek|cathedr/i;
const kerken = buildings.filter((b) => b.pts && b.pts.length >= 3 && (b.type === 'church' || b.type === 'cathedral' || b.type === 'chapel' || (b.name && NAAM.test(b.name) && b.type === 'yes')));
// een rooster van de kitpunten voor het zoeken binnen 80 m
const cel = 200, rooster = new Map();
const sleutel = (x, y) => `${Math.floor(x / cel)}_${Math.floor(y / cel)}`;
for (const k of kits) { const s = sleutel(k.x, k.y); if (!rooster.has(s)) rooster.set(s, []); rooster.get(s).push(k); }
const dichtbij = (x, y, r) => {
  const out = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const k of rooster.get(sleutel(x + i * cel, y + j * cel)) || []) if (Math.hypot(k.x - x, k.y - y) <= r) out.push(k);
  return out;
};
const rij = [];
let gedekt = 0, zonder = 0, nietGedekt = 0, metEigenKit = 0;
for (const b of kerken) {
  const [x, y] = cent(b.pts);
  const a = area(b.pts);
  const nabij = dichtbij(x, y, 80);
  let dekt = false;
  for (const k of nabij) {
    // de kit op zijn eigen omtrek, of anders op de box van het tegelgebouw (zoals ommelandlandmarks.js churchBox)
    const p = K.landmarkParams(k, k.o ? null : { x, y, len: Math.sqrt(a * 2), wid: Math.sqrt(a / 2), angle: 0 });
    if (p && K.kitCoversBuilding(p, b)) { dekt = true; break; }
  }
  if (dekt) gedekt++;
  else if (nabij.length) { nietGedekt++; rij.push({ soort: 'kit-niet-gedekt', naam: b.name || '', type: b.type, x: Math.round(x), y: Math.round(y), area: Math.round(a), hm: b.hm || 0, h: b.h || 0, kits: nabij.map((k) => k.n || '-').join(',') }); }
  else { zonder++; const eigen = K.kitItemFromBuilding(b); if (eigen && (eigen.k === 'church' || eigen.k === 'chapel')) metEigenKit++; rij.push({ soort: 'zonder-kit', eigenKit: eigen ? eigen.k : null, naam: b.name || '', type: b.type, x: Math.round(x), y: Math.round(y), area: Math.round(a), hm: b.hm || 0, h: b.h || 0 }); }
}
console.log(`kerken in de tegels: ${kerken.length}; gedekt door een kit: ${gedekt}; zonder kit in landmarkkits.json: ${zonder} (daarvan nu een eigen kerkkit uit de naam, #406: ${metEigenKit}; de rest blijft een gewoon gebouw); kit in de buurt maar tegelgebouw niet gedekt: ${nietGedekt}`);
const perType = {};
for (const r of rij) perType[`${r.soort}:${r.type}`] = (perType[`${r.soort}:${r.type}`] || 0) + 1;
console.log(JSON.stringify(perType));
if (args.includes('--list')) for (const r of rij.slice(0, 80)) console.log(JSON.stringify(r));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ totaal: kerken.length, gedekt, zonder, nietGedekt, rij }, null, 1));
