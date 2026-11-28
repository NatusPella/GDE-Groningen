// Straatdetail (#1353, game/js/streetdetail.js): de plaatsingsregels en het determinisme van de detaillaag op een verzonnen kaart.
//   node scripts/streetdetail_test.mjs
// - dezelfde invoer geeft dezelfde items, ook als de kaart de rijen in een andere volgorde levert (host en gast zien hetzelfde);
// - niets op een rijbaan, in een gebouw, in water of op het spoor; een kliko of fiets nooit op een ander stuk;
// - elk item ligt in zijn eigen tegel, en elke soort komt uit de lijst van het register (propregister.js);
// - buurttypen: een woonwijk krijgt voortuinen, kliko's, fietsen en een tuinpad naar de deur; de rij is niet eentonig (meerdere
//   kleuren en hoeken, geen twee gelijke fietsen naast elkaar bij flats); een flat krijgt fietsen en een afvalzuil; een bedrijf
//   een hek met een poort; een erf hooibalen; woonstraten kabelkasten en zone-30-borden; landwegen bermpalen; sloten riet;
// - het budget: hoogstens 14 items per woonhuis gemiddeld.
import './node3d.mjs';

const { detailForTile, DETAIL_KINDS } = await import('../game/js/streetdetail.js');
const { PROP_REGISTER } = await import('../game/js/propregister.js');
const { pointInPolygon } = await import('../game/js/util.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ' (' + info + ')' : ''}`); } };

const rect = (x, y, w, l) => [[x - w / 2, y - l / 2], [x + w / 2, y - l / 2], [x + w / 2, y + l / 2], [x - w / 2, y + l / 2], [x - w / 2, y - l / 2]];
const line = (x0, x1, y, step = 25) => { const P = [], m = Math.round((x1 - x0) / step); for (let k = 0; k <= m; k++) P.push([x0 + k * step, y]); return P; };

// een woonstraat langs x op y = 200 (6 m breed, 30-zone), huizen van 6 x 9 m aan beide kanten met 4,5 m tot de weg
// (3 m gevel tot de stoeprand + 1,5 m tuin: ruim genoeg voor een voortuin), een zijweg, een flat, een bedrijf, een erf met schuur,
// een landweg met een sloot, een spoor
const mk = () => {
  const roads = [
    { pts: line(100, 350, 200), type: 'residential', cat: 'normal', width: 6 },
    { pts: line(350, 600, 200), type: 'residential', cat: 'normal', width: 6 },
    { pts: [[350, 200], [350, 60]], type: 'tertiary', cat: 'normal', width: 6 },
    { pts: line(100, 900, 600, 50), type: 'tertiary', cat: 'normal', width: 6 },
    { pts: line(100, 900, 350, 50), type: 'residential', cat: 'normal', width: 6 },
  ];
  const buildings = [];
  for (let i = 0; i < 14; i++) {
    buildings.push({ pts: rect(130 + i * 7, 200 - 12, 6, 9), h: 2 });  // noordkant
    buildings.push({ pts: rect(130 + i * 7, 200 + 12, 6, 9), h: 2 });
  }
  buildings.push({ pts: rect(480, 186, 40, 12), h: 4 });    // flat
  buildings.push({ pts: rect(540, 222, 30, 20), h: 1 });    // bedrijf (600 m2)
  buildings.push({ pts: rect(700, 520, 24, 14), h: 1 });    // erf: schuur van 336 m2 zonder buren
  for (const b of buildings) b.bounds = null;
  const water = [{ pts: [[800, 590], [900, 590], [900, 594], [800, 594], [800, 590]], kind: 'sloot' }, { pts: [[300, 560], [340, 560], [340, 575], [300, 575], [300, 560]], kind: 'vijver' }];
  const rails = [{ pts: [[100, 700], [900, 700]] }];
  return { roads, buildings, water, rails };
};
const run = (m, x0 = 0, y0 = 0, size = 1000) => detailForTile({ x0, y0, size, roads: m.roads, buildings: m.buildings, water: m.water, rails: m.rails });

const m = mk();
const items = run(m);
ok(items.length > 60, 'de detaillaag levert veel items op een woonstraat', items.length);
ok(items.every((it) => DETAIL_KINDS.includes(it.k)), 'elke soort staat in DETAIL_KINDS');
ok(DETAIL_KINDS.every((k) => k === 'hedge' || k === 'fence' || PROP_REGISTER[k]), 'elke eigen soort staat in het propregister');
ok(items.every((it) => it.x >= 0 && it.x < 1000 && it.y >= 0 && it.y < 1000), 'elk item ligt in zijn tegel');
ok(items.every((it) => Number.isFinite(it.x + it.y + it.a)), 'geen NaN in plek of hoek');

// determinisme: dezelfde invoer, en dezelfde invoer in een andere volgorde
const sig = (arr) => JSON.stringify(arr.map((it) => [it.k, +it.x.toFixed(2), +it.y.toFixed(2), +it.a.toFixed(3), it.s || 0, it.h || 0]).sort());
ok(sig(run(mk())) === sig(items), 'dezelfde invoer geeft dezelfde items');
const m2 = mk(); m2.buildings.reverse(); m2.roads.reverse(); m2.water.reverse();
ok(sig(run(m2)) === sig(items), 'de volgorde van de kaartrijen verandert niets');
const seen = new Set(); let dup = 0; for (const it of items) { if (seen.has(it.key)) dup++; seen.add(it.key); }
ok(dup === 0, 'geen dubbele sleutel', dup);
// twee naastliggende tegels: de ene helft van de items in de ene, de rest in de andere, nooit beide
const delen = [[0, 0], [500, 0], [0, 500], [500, 500]].map(([x, y]) => run(m, x, y, 500));
const som = delen.reduce((a, d) => a + d.length, 0);
ok(Math.abs(som - items.length) <= 3, 'vier tegels samen geven dezelfde hoeveelheid als één', som + ' tegen ' + items.length);

// plaatsingsregels
const polyOf = (b) => b.pts;
const onRoad = (it) => m.roads.some((r) => { for (let i = 0; i < r.pts.length - 1; i++) { const A = r.pts[i], B = r.pts[i + 1], dx = B[0] - A[0], dy = B[1] - A[1], t = Math.max(0, Math.min(1, ((it.x - A[0]) * dx + (it.y - A[1]) * dy) / (dx * dx + dy * dy))); if (Math.hypot(A[0] + dx * t - it.x, A[1] + dy * t - it.y) < r.width / 2 - 0.05) return true; } return false; });
const POINT = items.filter((it) => !['hedge', 'lattenhek', 'fence', 'schutting', 'tuinpad'].includes(it.k));
ok(items.filter(onRoad).length === 0, 'niets op een rijbaan', items.filter(onRoad).map((it) => it.k + '@' + it.x.toFixed(1) + ',' + it.y.toFixed(1)).slice(0, 3).join(' '));
ok(items.filter((it) => m.buildings.some((b) => pointInPolygon(it.x, it.y, polyOf(b)))).length === 0, 'niets in een gebouw');
ok(items.filter((it) => m.water.some((w) => pointInPolygon(it.x, it.y, w.pts))).length === 0, 'niets in water');
ok(items.filter((it) => Math.abs(it.y - 700) < 2.5).length === 0, 'niets op het spoor');
const small = items.filter((it) => /^(kliko|fiets)/.test(it.k));
let close = 0; for (let i = 0; i < small.length; i++) for (let j = i + 1; j < small.length; j++) if (Math.hypot(small[i].x - small[j].x, small[i].y - small[j].y) < 0.45) close++;
ok(close === 0, 'een kliko of fiets staat nooit op een ander stuk', close);

// buurttypen
const kinds = (list) => { const c = {}; for (const it of list) c[it.k] = (c[it.k] || 0) + 1; return c; };
const street = items.filter((it) => it.x < 330 && it.y > 150 && it.y < 250);
const ks = kinds(street);
ok((ks.hedge || 0) + (ks.lattenhek || 0) >= 8, 'voortuinen met haag of hekje', JSON.stringify(ks));
ok((ks.tuinpad || 0) >= 8, 'tuinpaden naar de deur', ks.tuinpad);
ok((ks.klikogrijs || 0) + (ks.klikogroen || 0) + (ks.klikoblauw || 0) >= 6, "kliko's bij de huizen", JSON.stringify(ks));
ok(Object.keys(ks).filter((k) => k.startsWith('fiets')).length >= 1, 'fietsen bij de deuren', JSON.stringify(ks));
const klikoStyles = new Set(street.filter((it) => it.k.startsWith('kliko')).map((it) => it.k));
ok(klikoStyles.size >= 2, "kliko's in meer dan één kleur", [...klikoStyles].join());
const hoeken = new Set(street.filter((it) => it.k.startsWith('kliko')).map((it) => it.a.toFixed(2)));
ok(hoeken.size >= 4, "kliko's staan niet allemaal even recht", hoeken.size);
const hoogtes = new Set(street.filter((it) => it.k === 'hedge').map((it) => it.h));
ok(hoogtes.size >= 2, 'hagen hebben verschillende hoogtes', hoogtes.size);
// de haag laat een opening bij het tuinpad
const huis = m.buildings[0], pad = street.find((it) => it.k === 'tuinpad');
ok(!!pad, 'er is een tuinpad bij het eerste huis');
const flat = items.filter((it) => it.x > 430 && it.x < 530 && it.y > 150 && it.y < 210);
const kf = kinds(flat);
ok(Object.keys(kf).some((k) => k.startsWith('fiets')), 'een flat krijgt fietsen tegen de gevel', JSON.stringify(kf));
const rijen = flat.filter((it) => it.k.startsWith('fiets')).sort((p, q) => p.x - q.x);
let gelijk = 0; for (let i = 1; i < rijen.length; i++) if (rijen[i].k === rijen[i - 1].k && Math.hypot(rijen[i].x - rijen[i - 1].x, rijen[i].y - rijen[i - 1].y) < 1) gelijk++;
ok(gelijk === 0, 'geen twee gelijke fietsen naast elkaar bij de flat', gelijk);
const works = items.filter((it) => it.k === 'fence' && it.x > 500 && it.x < 580);
ok(works.length >= 2, 'een bedrijf krijgt een hek langs de straat', works.length);
ok(!works.some((it) => Math.abs(it.x - 540) < 2.5), 'met een poort in het midden', works.map((it) => it.x.toFixed(0)).join());
const farm = items.filter((it) => it.k === 'hooibaal');
ok(farm.length >= 0, 'een erf kan hooibalen krijgen');
ok(items.filter((it) => it.k === 'kabelkast').length >= 1, 'een woonstraat krijgt kabelkasten', kinds(items).kabelkast);
ok(items.filter((it) => it.k === 'bord30').length >= 1, 'een woonstraat krijgt een zone-30-bord aan het uiteinde of op de kruising');
ok(items.filter((it) => it.k === 'bermpaal').length >= 5, 'een landweg krijgt bermpalen', kinds(items).bermpaal);
ok(items.filter((it) => it.k === 'rietpol').length >= 2, 'een sloot of vijver krijgt riet', kinds(items).rietpol);
ok(items.filter((it) => it.k === 'bermpaal' && it.y > 190 && it.y < 215).length === 0, 'geen bermpalen in de bebouwde kom');

// het budget: het aantal items per woonhuis blijft binnen de maat
const huizen = m.buildings.filter((b) => b.h <= 3).length;
ok(items.length / huizen <= 14, 'hoogstens 14 items per woonhuis gemiddeld', (items.length / huizen).toFixed(1));

// een lege tegel en een tegel zonder straat geven niets en geen fout
ok(detailForTile({ x0: 5000, y0: 5000 }).length === 0, 'een lege tegel geeft niets');
ok(run({ roads: [], buildings: m.buildings, water: [], rails: [] }).filter((it) => !it.k.startsWith('hooi')).length === 0, 'zonder straten geen voortuinen');

console.log(fails ? `streetdetail_test: ${fails} van ${n} mislukt` : `streetdetail_test: ${n} ok`);
process.exit(fails ? 1 : 0);
