// De grens van het speelgebied zet je niet ten onrechte of in een lus terug (#988).
// Pure test: synthetische grenslijnen, en (als de wereld lokaal staat) de echte provinciedata.
//   node scripts/edge_grens_test.mjs        (GDE_WORLD_DIR=<map met index-provincie.json> om een andere wereld te kiezen)
import fs from 'node:fs';
import { edgeRule, outsideDist, borderByData } from '../game/js/worldedge.js';
import { createEdgeWatch, stepEdgeWatch, cancelEdgeWatch, chooseBackSpot, COOL_S } from '../game/js/edgescene.js';

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

// 1. een scherpe punt in de grens: binnen blijft binnen (de kant van één segment was het antwoord niet)
// grens loopt west naar oost over y = 0, met een naald omhoog naar (1000, -300) en terug; buiten = links van de richting = noord (y < 0)
// (in dit assenstelsel: links van +x is y > 0, dus zet buiten op het zuiden: out = 1 en lijn van oost naar west)
const spike = { kind: 'drenthe', out: 1, bufferM: 300, pts: [[0, 0], [900, 0], [1000, 300], [1100, 0], [2000, 0]] };
// richting +x: links = +y (zuid). De binnenkant is het noorden (y < 0); de naald wijst naar het zuiden.
for (const [x, y, binnen] of [[1000, -800, true], [1000, -50, true], [1000, 600, false], [500, 400, false], [500, -400, true], [1400, 200, false]]) {
  const q = outsideDist(x, y, [spike]);
  ok(`punt ${x},${y} ${binnen ? 'binnen' : 'buiten'}`, (q.d <= 0) === binnen, JSON.stringify(q && q.d));
}
// de punt van een naald naar binnen: een punt vlak boven de punt is gewoon binnen
const bay = { kind: 'friesland', out: 1, bufferM: 300, pts: [[0, 0], [400, 0], [450, -2000], [500, 0], [1000, 0]] };
ok('punt boven de naald is binnen', outsideDist(450, -2500, [bay]).d < 0, String(outsideDist(450, -2500, [bay]).d));
ok('punt onder de lijn is buiten', outsideDist(450, 500, [bay]).d > 0);

// 2. het vrije einde van een lijn: erbuiten is geen grens
const short = { kind: 'friesland', out: 1, bufferM: 300, pts: [[0, 0], [1000, 0]] };
ok('voorbij het einde van de lijn is niet buiten', outsideDist(5000, -4000, [short]).d < 0 && outsideDist(-5000, 4000, [short]).d < 0);
ok('naast de lijn wel', outsideDist(500, 100, [short]).d > 0);

// 3. een stuk van een gesneden lijn kent zijn buren (borderByData): geen verkeerde kant bij het knooppunt
const cut = borderByData({ coast: [], border: [{ kind: 'drenthe', out: 1, bufferM: 2500, pts: spike.pts }] }, () => true, { pieceM: 800 });
ok('gesneden stukken hebben buren', cut.border.length >= 2 && cut.border.some((b) => b.pre || b.post));
for (const [x, y, binnen] of [[1000, -800, true], [1400, -2000, true], [500, 600, false]]) {
  const q = outsideDist(x, y, cut.border);
  ok(`gesneden: punt ${x},${y} ${binnen ? 'binnen' : 'buiten'}`, (q.d <= 0) === binnen, JSON.stringify(q.d));
}

// 4. de Dollard is geen open zee
const kust = { kind: 'eems', out: 1, pts: [[0, 0], [0, 5000]] };
const edge = { coast: [kust], border: [], seaM: 3000, airM: 3000 };
// zee is rechts (links van +y is -x; dus out = 1 betekent x < 0): zet de zee op x < 0
const diep = edgeRule(-4000, 2500, edge, { mode: 'boat' });
ok('open water ver van de kust keert om', diep && diep.action === 'back');
ok('in de Dollard (inland) niet', edgeRule(-4000, 2500, edge, { mode: 'boat', inland: true }) === null);

// 5. naderen, waarschuwen, terugzetten, geen lus. Grens loopt over y = 0, buiten = zuiden (y > 0).
const rand = { coast: [], border: [{ kind: 'drenthe', out: 1, bufferM: 300, pts: [[-5000, 0], [5000, 0]] }], seaM: 3000, airM: 3000 };
const ruleAt = (x, y) => edgeRule(x, y, rand, { mode: 'car' });
let w = createEdgeWatch(), t = 0, warnAt = null, sceneAt = null, back = null, y = -400;
const events = [];
for (let i = 0; i < 4000 && !back; i++) { // 25 m/s, 0,05 s per stap, vanaf 400 m binnen de grens naar buiten
  const dt = 0.05; t += dt; y += 25 * dt;
  const ev = stepEdgeWatch(w, ruleAt(0, y), dt, { x: 0, y });
  if (!ev) continue;
  events.push(ev.type);
  if (ev.type === 'warn' && warnAt === null) warnAt = y;
  if (ev.type === 'scene' && sceneAt === null) sceneAt = y;
  if (ev.type === 'back') back = ev;
}
ok('eerst een waarschuwing, dan de scène, dan terug', events[0] === 'warn' && events.includes('scene') && events.at(-1) === 'back', events.join(','));
ok('de waarschuwing komt binnen de buffer, vóór de scène', warnAt !== null && warnAt > 0 && warnAt < sceneAt, `${warnAt} ${sceneAt}`);
ok('de scène begint pas buiten de buffer van 300 m', sceneAt > 300 && sceneAt < 340, String(sceneAt));
ok('de terugzetplek ligt binnen de grens', ruleAt(back.spot.x, back.spot.y) === null, JSON.stringify(back.spot));
// geen lus: op de terugzetplek blijven staan, rondjes rijden binnen de grens: minuten lang geen scène
let loop = 0, tt = 0;
for (let i = 0; i < 6000; i++) {
  const dt = 0.05; tt += dt;
  const ev = stepEdgeWatch(w, ruleAt(back.spot.x, back.spot.y), dt, { x: back.spot.x, y: back.spot.y });
  if (ev && (ev.type === 'scene' || ev.type === 'back')) loop++;
}
ok('na de terugzetting volgt geen nieuwe scène (geen lus)', loop === 0, String(loop));

// 6. een terugzetplek die zelf buiten ligt wordt vervangen (de weg-snap vond een weg aan de overkant)
const planned = { x: 0, y: 200, angle: -Math.PI / 2 }; // nog in de bufferstrook, buiten
const snappedOut = { x: 0, y: 450, angle: 0 }; // een weg verder buiten
const c = chooseBackSpot({ planned, snapped: snappedOut, face: -Math.PI / 2, edgeRule: ruleAt });
ok('buiten gesnapte plek wordt niet gekozen', c.spot !== snappedOut && ruleAt(c.spot.x, c.spot.y) === null, c.how);
const snappedIn = { x: 30, y: -500, angle: 0 };
ok('een binnen gesnapte plek wel', chooseBackSpot({ planned, snapped: snappedIn, face: -Math.PI / 2, edgeRule: ruleAt }).spot === snappedIn);
ok('alles buiten: de laatste veilige plek', chooseBackSpot({ planned, snapped: null, face: Math.PI / 2, edgeRule: ruleAt, lastSafe: { x: 5, y: -900, angle: 0 } }).how === 'laatste');

// 7. zelf omdraaien annuleert de scène
const w2 = createEdgeWatch();
stepEdgeWatch(w2, { action: 'back', edge: 'drenthe', face: -Math.PI / 2, d: 320, warnAt: 50, text: 'x', at: { x: 0, y: 0 } }, 0.1, { x: 0, y: 320 });
ok('een scène loopt', w2.phase === 'scene');
cancelEdgeWatch(w2);
ok('geannuleerd: geen scène en even stil', w2.phase === 'idle' && w2.cool > 0 && w2.cool < COOL_S);

// 8. de echte provinciedata (alleen als hij lokaal staat)
const dirs = [process.env.GDE_WORLD_DIR, new URL('../game/world/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), new URL('../desktop/build/game/world/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')].filter(Boolean);
const dir = dirs.map((d) => (d.endsWith('/') ? d : d + '/')).find((d) => fs.existsSync(d + 'index-provincie.json') && fs.existsSync(d + 'index.json'));
if (!dir) console.log('SKIP echte data: geen game/world met index-provincie.json (niet gemeten)');
else {
  const G = await import('../game/js/gdt.js');
  const R = await import('../game/js/regions.js');
  const ip = JSON.parse(fs.readFileSync(dir + 'index-provincie.json'));
  const ix = JSON.parse(fs.readFileSync(dir + 'index.json'));
  const tiles = { ...ix.tiles, ...ip.tiles };
  const tileHas = (x, y) => { const [i, j] = G.tileIndexOf(x, y); return !!tiles[G.tileKey(i, j)]; };
  R.setRegionData(ip.global, tileHas);
  const e = R.regionEdgeLayer();
  let landBack = 0, dollardBack = 0, first = null;
  for (let x = -30000; x <= 46000; x += 100) for (let yy = -40000; yy <= 42000; yy += 100) {
    const reg = R.regionAt(x, yy);
    if (reg.id === 'groningen' && R.provinceLandAt(x, yy)) {
      const r = edgeRule(x, yy, e, { mode: 'car' });
      if (r && r.action === 'back') { landBack++; first = first || [x, yy, r.edge]; }

    }
    if (reg.id === 'dollard' && x % 200 === 0 && yy % 200 === 0) {
      const r = edgeRule(x, yy, e, { mode: 'boat', inland: true });
      if (r && r.action === 'back' && /^eems$/.test(r.edge)) dollardBack++;
    }
  }
  ok('echte data: geen terugzetting op land binnen Groningen', landBack === 0, `${landBack} cellen, eerste ${first}`);
  ok('echte data: de Dollard keert geen boot om als open zee', dollardBack === 0, String(dollardBack));
}

console.log(`edge_grens_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
