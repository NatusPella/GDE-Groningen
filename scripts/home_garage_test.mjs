// De privégarage thuis (#1335): de Escapade moet uit zijn vak rechtdoor de poort uit kunnen, en wie te voet van de straat komt de
// garage in. Gedrag op de echte plattegrond van home.js (muren, poort, vakken): een rechthoek ter grootte van de auto wordt langs
// de as van het vak naar buiten geschoven en mag geen muurstuk raken. node scripts/home_garage_test.mjs
import './node3d.mjs';
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const H = await import('../game/js/home.js');
const stub = { buildingsNear: () => [], roadsNear: () => [], treesNear: () => [], dropRoad() {}, groundHeightAt: () => 0, roadGrid: {}, buildingGrid: {} };
try { H.prepareHomeMap(stub); } catch (e) { /* de rest van prepareHomeMap hoeft niet te lukken: de plattegrond staat er al */ }
const home = H.getHome();

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
ok(!!home, 'de plattegrond bestaat');
const g = home.garage, d = g.door;

// afstand van een punt tot een lijnstuk
const segDist = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
};
const WALL_R = 0.18; // de botsmaat van een muurstuk (initHome)
// een auto (len x wid) met zijn midden op (x, y), kijkrichting a: raakt hij een muur? (hoekpunten en randen bemonsterd)
function hits(x, y, a, len, wid) {
  const fx = Math.cos(a), fy = Math.sin(a), sx = -fy, sy = fx;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) {
    const lx = (i / 8 - 0.5) * len, ly = (j / 4 - 0.5) * wid;
    const px = x + fx * lx + sx * ly, py = y + fy * lx + sy * ly;
    for (const w of g.walls) if (segDist(px, py, w) < WALL_R) return true;
  }
  return false;
}
// de Escapade (4,0 x 1,65 m, model van vehicle.js) rijdt uit zijn vak recht naar buiten (de neus wijst al naar de poort)
const hero = g.bays.find((b) => b.hero);
const fwd = [g.V[0], g.V[1]];
ok(Math.abs(Math.cos(hero.angle) - fwd[0]) < 1e-6 && Math.abs(Math.sin(hero.angle) - fwd[1]) < 1e-6, 'de neus van de Escapade wijst naar de poort');
let hitAt = null;
for (let s = 0; s <= 24 && hitAt === null; s += 0.1) if (hits(hero.x + fwd[0] * s, hero.y + fwd[1] * s, hero.angle, 4.0, 1.65)) hitAt = s;
ok(hitAt === null, 'de Escapade rijdt rechtdoor uit zijn vak de poort uit', hitAt === null ? '' : `raakt een muur na ${hitAt.toFixed(1)} m`);
// ook met een ruimere marge (een stuurfout van een speler): 30 cm aan elke kant
let hitWide = null;
for (let s = 0; s <= 24 && hitWide === null; s += 0.1) if (hits(hero.x + fwd[0] * s, hero.y + fwd[1] * s, hero.angle, 4.0, 1.65 + 0.6)) hitWide = s;
ok(hitWide === null, 'met 30 cm speling aan elke kant raakt hij de poort ook niet', hitWide === null ? '' : `na ${hitWide.toFixed(1)} m`);
// een langere bestelwagen (6 m) in de middenbaan van de poort
let hitVan = null;
for (let s = -8; s <= 14 && hitVan === null; s += 0.1) if (hits(d.cx - fwd[0] * 4 + fwd[0] * s, d.cy - fwd[1] * 4 + fwd[1] * s, hero.angle, 6.0, 2.2)) hitVan = s;
ok(hitVan === null, 'een lange wagen rijdt door het midden van de poort', hitVan === null ? '' : `na ${hitVan}`);
// de poort zelf is breed genoeg voor twee auto's naast elkaar of een auto met speling
ok(Math.hypot(d.x2 - d.x1, d.y2 - d.y1) >= 5.5, 'de poort is minstens 5,5 m breed', Math.hypot(d.x2 - d.x1, d.y2 - d.y1).toFixed(2));
// te voet: een mens (r 0,35) loopt in een rechte lijn van 6 m buiten de poort tot het eind van de garage langs elke baan van de poort
let voetHit = null;
const half = Math.hypot(d.x2 - d.x1, d.y2 - d.y1) / 2 - 0.6; // een wandelaar loopt niet met zijn schouder langs de stijl
for (let off = -half; off <= half && voetHit === null; off += 0.1) for (let s = -6; s <= 16; s += 0.1) {
  const x = d.cx + g.U[0] * off - fwd[0] * s + fwd[0] * 0, y = d.cy + g.U[1] * off - fwd[1] * s;
  if (g.walls.some((w) => segDist(x, y, w) < WALL_R + 0.35)) { voetHit = { off: +off.toFixed(1), s: +s.toFixed(1) }; break; }
}
ok(voetHit === null, 'een wandelaar komt door de poort over de hele breedte van de poort', voetHit ? JSON.stringify(voetHit) : '');
console.log(`${fails ? 'FAIL' : 'OK'} home_garage_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
