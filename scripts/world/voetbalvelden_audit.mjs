// Audit van de voetbalvelden in de kaartdata (epic Voetbalcarrière, docs/VOETBAL-CARRIERE-21-11.md, hoofdstuk 3b).
// Telt de velden en sportparken waar voetbal (sport=soccer of football) wordt gespeeld, bundelt ze tot sportparken,
// koppelt elk park aan het dichtstbijzijnde dorp of de stad en meldt hoe ver de parken uit elkaar liggen.
//
//   node scripts/world/voetbalvelden_audit.mjs [--packs=data/cache/province] [--json=pad.json] [--bundel=150] [--max-dorp=3000]
//
// Leest de gecachte packs van scripts/world/extract_province.py (c<i>_<j>.json.gz, elementen met `g` [[lat, lon]]) en
// province.json.gz (plaatsen). Schrijft niets in de repo (--json alleen als je het vraagt). Geen netwerk.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const PACKS = arg('packs', 'data/cache/province');
const BUNDEL_M = Number(arg('bundel', 150));
const MAX_DORP_M = Number(arg('max-dorp', 3000));
const JSON_UIT = arg('json', '');
const ZACHT = process.argv.includes('--quiet');

if (!fs.existsSync(PACKS)) { console.error(`Geen packs in ${PACKS} (draai scripts/world/extract_province.py of geef --packs=...).`); process.exit(2); }
const lees = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));

const M_LAT = 111320, M_LON = 111320 * Math.cos(53.2 * Math.PI / 180);
const naarM = (lat, lon) => [lon * M_LON, lat * M_LAT];
const afstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const isVoetbal = (t) => /(^|;)(soccer|football)(;|$)/.test(t.sport || '');
const SOORT = (t) => (t.leisure === 'pitch' ? 'veld' : t.leisure === 'sports_centre' ? 'sportcentrum' : t.leisure === 'stadium' ? 'stadion' : null);

function oppervlakte(g) { // m2, shoelace in meters
  let s = 0;
  for (let i = 0; i < g.length - 1; i++) { const a = naarM(g[i][0], g[i][1]), b = naarM(g[i + 1][0], g[i + 1][1]); s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
}

// 1. alle voetbalvelden (dedupe op id: een way staat in elke pack die hij raakt)
const gezien = new Map();
for (const f of fs.readdirSync(PACKS).filter((x) => /^c-?\d+_-?\d+\.json\.gz$/.test(x))) {
  for (const e of lees(path.join(PACKS, f)).elements || []) {
    const t = e.tags || {};
    const soort = SOORT(t);
    if (!soort || !isVoetbal(t) || !Array.isArray(e.g) || e.g.length < 3 || gezien.has(`${e.type}${e.id}`)) continue;
    const mid = e.g.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / e.g.length);
    gezien.set(`${e.type}${e.id}`, { id: `${e.type}${e.id}`, soort, lat: mid[0], lon: mid[1], m: naarM(mid[0], mid[1]), m2: Math.round(oppervlakte(e.g)), kunst: /artificial|astroturf|rubber/.test(t.surface || ''), verlicht: t.lit === 'yes', heeftNaam: !!t.name });
  }
}
const velden = [...gezien.values()];

// 2. sportparken: velden binnen BUNDEL_M van elkaar vormen één park (union-find, ruimtelijk geraster)
const raster = new Map(), ouder = velden.map((_, i) => i);
const wortel = (i) => { while (ouder[i] !== i) { ouder[i] = ouder[ouder[i]]; i = ouder[i]; } return i; };
velden.forEach((v, i) => { const k = `${Math.floor(v.m[0] / BUNDEL_M)},${Math.floor(v.m[1] / BUNDEL_M)}`; (raster.get(k) || raster.set(k, []).get(k)).push(i); });
velden.forEach((v, i) => {
  const cx = Math.floor(v.m[0] / BUNDEL_M), cy = Math.floor(v.m[1] / BUNDEL_M);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of raster.get(`${cx + dx},${cy + dy}`) || []) if (j > i && afstand(v.m, velden[j].m) <= BUNDEL_M) ouder[wortel(j)] = wortel(i);
});
const groepen = new Map();
velden.forEach((v, i) => { const r = wortel(i); (groepen.get(r) || groepen.set(r, []).get(r)).push(v); });
const parken = [...groepen.values()].map((l, k) => {
  const m = l.reduce((s, v) => [s[0] + v.m[0], s[1] + v.m[1]], [0, 0]).map((x) => x / l.length);
  return { nr: k + 1, velden: l.length, m2: l.reduce((s, v) => s + v.m2, 0), kunst: l.filter((v) => v.kunst).length, m, lat: m[1] / M_LAT, lon: m[0] / M_LON };
});

// 3. plaatsen en koppeling dorp -> park
const prov = lees(path.join(PACKS, 'province.json.gz'));
const plaatsen = (prov.places || []).filter((p) => ['city', 'town', 'village', 'hamlet'].includes(p.kind) && p.name).map((p) => ({ ...p, m: naarM(p.lat, p.lon) }));
for (const pk of parken) {
  let best = null, bd = Infinity;
  for (const p of plaatsen) { const d = afstand(pk.m, p.m); if (d < bd) { bd = d; best = p; } }
  pk.plaats = best && bd <= MAX_DORP_M ? best.name : null; pk.plaatsKind = best && bd <= MAX_DORP_M ? best.kind : null; pk.dorpAfstand = Math.round(bd);
}
const perPlaats = new Map();
for (const pk of parken) if (pk.plaats) (perPlaats.get(pk.plaats) || perPlaats.set(pk.plaats, []).get(pk.plaats)).push(pk);
const kindTel = {};
for (const p of plaatsen) { const k = p.kind; kindTel[k] = kindTel[k] || { totaal: 0, metPark: 0 }; kindTel[k].totaal++; if (perPlaats.has(p.name)) kindTel[k].metPark++; }

// 4. afstanden tussen parken (dichtstbijzijnde buur) en de Euroborg
const buur = parken.map((a) => Math.min(...parken.filter((b) => b !== a).map((b) => afstand(a.m, b.m))));
const mediaan = (l) => { const s = l.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (l, p) => { const s = l.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const euroborg = naarM(53.2058, 6.5882);
const dichtbijEuroborg = parken.filter((p) => afstand(p.m, euroborg) <= 5000).length;

const uit = {
  velden: velden.length,
  perSoort: Object.fromEntries(['veld', 'sportcentrum', 'stadion'].map((s) => [s, velden.filter((v) => v.soort === s).length])),
  kunstgras: velden.filter((v) => v.kunst).length,
  verlicht: velden.filter((v) => v.verlicht).length,
  parken: parken.length,
  vedenPerPark: { een: parken.filter((p) => p.velden === 1).length, tweeTotVier: parken.filter((p) => p.velden >= 2 && p.velden <= 4).length, vijfPlus: parken.filter((p) => p.velden >= 5).length, max: Math.max(0, ...parken.map((p) => p.velden)) },
  plaatsenMetPark: Object.fromEntries(Object.entries(kindTel)),
  plaatsenZonderParkMaarMetNaam: plaatsen.length - perPlaats.size,
  parkenZonderPlaats: parken.filter((p) => !p.plaats).length,
  plaatsenMetMeerdereParken: [...perPlaats.entries()].filter(([, l]) => l.length > 1).length,
  dorpAfstandM: { mediaan: mediaan(parken.map((p) => p.dorpAfstand)), p90: pct(parken.map((p) => p.dorpAfstand), 0.9) },
  buurParkM: { mediaan: Math.round(mediaan(buur)), p10: Math.round(pct(buur, 0.1)), p90: Math.round(pct(buur, 0.9)) },
  parkenBinnen5kmVanEuroborg: dichtbijEuroborg,
};
if (!ZACHT) {
  console.log('Voetbalvelden in de kaartdata (geen echte clubnamen; alleen geometrie en plaatsnaam)');
  console.log(JSON.stringify(uit, null, 2));
}
if (JSON_UIT) fs.writeFileSync(JSON_UIT, JSON.stringify({ ...uit, parkenLijst: parken.map(({ m, ...r }) => r) }, null, 1));
// --bij=lat,lon: de dichtstbijzijnde parken bij een plek (bijvoorbeeld het huis van de speler in Paddepoel) en hoeveel er binnen 2, 5 en 15 km liggen.
const bij = arg('bij', '');
if (bij && !ZACHT) {
  const [la, lo] = bij.split(',').map(Number);
  const p = naarM(la, lo);
  const lijst = parken.map((k) => ({ ...k, d: Math.round(afstand(k.m, p)) })).sort((a, b) => a.d - b.d);
  console.log(`Bij ${bij}: ${lijst.filter((k) => k.d <= 2000).length} parken binnen 2 km, ${lijst.filter((k) => k.d <= 5000).length} binnen 5 km, ${lijst.filter((k) => k.d <= 15000).length} binnen 15 km`);
  for (const k of lijst.slice(0, 8)) console.log(`  ${k.d} m  ${k.velden} velden  ${k.plaats || '-'} (${k.plaatsKind || '-'})`);
}
export { uit };
