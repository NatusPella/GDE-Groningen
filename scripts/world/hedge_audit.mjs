// Heggen op de weg? (#324) De heggen van grass.js (heginstanties per cel van 10 m) tegen de rijbanen van de stadstegels:
// per cel rond een plek de echte generateCell, dan elke heginstantie (de plek staat in de matrix) tegen de band van elke weg
// binnen 30 m. Een heg binnen de halve breedte van een weg (rijbaan, fiets- of voetpad) is een fout.
//   node scripts/world/hedge_audit.mjs [--r=90] [--spots=Prinsentuin,Martinikerkhof,...] [--max=0] [--verbose]
//   node scripts/world/hedge_audit.mjs --stad [--max=0]      alle cellen van elke groenvlak van de stadstegels (park, tuin, begraafplaats, gras, ...)
// Heeft game/world (GAME_WORLD) met de stadstegels nodig; zonder dat SKIP.
import '../node3d.mjs';
const { heeftWereld, laadStadTegels } = await import('../lib/stadtegels.mjs');
if (!heeftWereld()) { console.log('SKIP hedge_audit: geen game/world'); process.exit(0); }
const G = await import('../../game/js/grass.js');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const R = Number(arg('r', 90)), MAX = Number(arg('max', 0)), verbose = process.argv.includes('--verbose');
const SPOTS = {
  Prinsentuin: [261.5, -210.9], Martinikerkhof: [258.6, 23.5], Noorderplantsoen: [168, -707], Vismarkt: [150, 60], Oosterpark: [1698, -673],
};
const want = arg('spots', 'Prinsentuin,Martinikerkhof').split(',');
const city = (await laadStadTegels()).world;
const Q = G.QUALITY.hoog, CELL = G.CELL;
const SIDEWALK = new Set(['major', 'normal', 'minor']);
const clear = (r) => r.width / 2 + (SIDEWALK.has(r.cat) ? 1.8 : 0);
const dseg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y); };
let bad = 0, total = 0, onderBrug = 0;
function audit(name, cellList) {
  const bads = [];
  let n = 0, minEdge = Infinity;
  for (const [ci, cj] of cellList) {
    const out = G.generateCell(city, ci, cj, Q, true);
    const m = out.hedge.m;
    for (let k = 0; k + 15 < m.length; k += 16) {
      const x = m[k + 12], y = m[k + 14]; n++;
      for (const r of city.roadsNear(x, y, 30)) {
        if (!['major', 'normal', 'minor', 'service', 'cycle', 'foot'].includes(r.cat)) continue;
        let d = Infinity;
        for (let i = 0; i < r.pts.length - 1; i++) d = Math.min(d, dseg(x, y, r.pts[i], r.pts[i + 1]));
        const hw = clear(r);
        if (r.bridge) { if (d < r.width / 2 - 0.05) onderBrug++; continue; } // het dek hangt boven de heg
        if (['major', 'normal', 'minor', 'service'].includes(r.cat)) minEdge = Math.min(minEdge, d - r.width / 2);
        if (d < r.width / 2 - 0.05) bads.push({ x: +x.toFixed(1), y: +y.toFixed(1), weg: (r.name || r.type) + (r.bridge ? ' (brug)' : ''), breed: r.width, d: +d.toFixed(2), hw });
      }
    }
  }
  console.log(`${name}: ${cellList.length} cellen, ${n} heginstanties, op een rijbaan: ${bads.length}, kleinste afstand tot de rand van een rijbaan ${minEdge.toFixed(2)} m`);
  if (verbose || bads.length) for (const b of bads.slice(0, 25)) console.log('  ', JSON.stringify(b));
  bad += bads.length; total += n;
}
if (process.argv.includes('--stad')) {
  // de cellen waar grass.js heggen zet: de randen van de groenvlakken (K.hedge > 0), met een cel marge
  const cells = new Set();
  for (const g of city.green) {
    if (!g.bounds) continue;
    for (let ci = Math.floor((g.bounds[0] - CELL) / CELL); ci <= Math.floor((g.bounds[2] + CELL) / CELL); ci++) for (let cj = Math.floor((g.bounds[1] - CELL) / CELL); cj <= Math.floor((g.bounds[3] + CELL) / CELL); cj++) cells.add(ci + ',' + cj);
  }
  audit('stad', [...cells].map((s) => s.split(',').map(Number)));
} else {
  for (const name of want) {
    const [cx, cy] = SPOTS[name] || [];
    if (cx === undefined) { console.log('onbekende plek', name); continue; }
    const list = [];
    for (let ci = Math.floor((cx - R) / CELL); ci <= Math.floor((cx + R) / CELL); ci++) for (let cj = Math.floor((cy - R) / CELL); cj <= Math.floor((cy + R) / CELL); cj++) list.push([ci, cj]);
    audit(name, list);
  }
}
console.log(`hedge_audit: ${bad} heggen op een rijbaan van ${total} (${onderBrug} liggen onder het dek van een brug, dat telt niet)`);
process.exit(bad > MAX ? 1 : 0);
