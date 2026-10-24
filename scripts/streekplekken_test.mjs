// Test voor de landplekken (game/js/streekplekken.js, scripts/world/streekplekken.mjs, #21 #23 #164 #198):
// classificatie uit OSM-tags, kits, celbudget, audit per streek, drempels en het gebouwde bestand.
//   node scripts/streekplekken_test.mjs
import fs from 'node:fs';
import { puntInVlak, classifyLand, gedenknaam, kitFor, partsToWorld, tileBudget, auditLand, checkDrempels, telKandidaten, streekId, LAND_TYPES, LAND_BUDGET, STREEK_IDS, celVan } from '../game/js/streekplekken.js';
import { collectLand, dedupeLand, finishLand, filterVlakken } from './world/streekplekken.mjs';
import { wgsToWorld } from '../game/js/rdnew.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const cls = (t) => classifyLand(t)?.type;

// classificatie
ok(cls({ railway: 'platform' }) === 'perron' && classifyLand({ railway: 'platform', covered: 'yes' }).sub === 'overkapt', 'perron en overkapt perron');
ok(cls({ public_transport: 'platform', train: 'yes' }) === 'perron' && !cls({ public_transport: 'platform', bus: 'yes' }), 'alleen treinperrons, geen bushalte');
ok(!cls({ railway: 'platform', disused: 'yes' }), 'een perron dat niet meer gebruikt wordt blijft weg');
ok(cls({ man_made: 'chimney' }) === 'schoorsteen', 'schoorsteen');
ok(cls({ man_made: 'mast' }) === 'mast' && cls({ man_made: 'communications_tower' }) === 'mast' && cls({ 'tower:type': 'communication' }) === 'mast', 'masten');
ok(classifyLand({ historic: 'wayside_cross' }).sub === 'kruis' && classifyLand({ man_made: 'obelisk' }).sub === 'obelisk', 'kruis en obelisk');
ok(classifyLand({ historic: 'memorial', memorial: 'statue' }).sub === 'beeld' && classifyLand({ historic: 'monument' }).sub === 'zuil', 'beeld en zuil');
ok(cls({ leisure: 'park' }) === 'park' && !cls({ leisure: 'garden', access: 'private' }) && cls({ leisure: 'garden' }) === 'park', 'park en tuin');
ok(!cls({ landuse: 'recreation_ground' }) && cls({ landuse: 'recreation_ground', name: 'Sportpark' }) === 'park', 'recreatiegrond alleen met naam');
ok(classifyLand({ highway: 'residential' }) === null && classifyLand(null) === null, 'rest blijft weg');
ok(classifyLand({ man_made: 'chimney', name: 'Hoge Pijp' }).name === 'Hoge Pijp', 'naam komt mee');

// kits: elk type binnen zijn cap, geen NaN, meer dan 3 onderdelen
const voorbeeld = {
  perron: [{ id: 1, t: 'perron', sub: 'open', l: 150, w: 5 }, { id: 2, t: 'perron', sub: 'overkapt', l: 40, w: 6 }],
  schoorsteen: [{ id: 3, t: 'schoorsteen', sub: 'baksteen', h: 60 }, { id: 4, t: 'schoorsteen', sub: 'beton' }],
  mast: [{ id: 5, t: 'mast', sub: 'mast', h: 120 }, { id: 6, t: 'mast', sub: 'toren' }],
  monument: ['kruis', 'obelisk', 'beeld', 'zuil'].map((sub, i) => ({ id: 7 + i, t: 'monument', sub })),
  park: [{ id: 11, t: 'park', sub: 'park', l: 150, w: 90 }, { id: 12, t: 'park', sub: 'tuin', l: 20, w: 15 }],
};
for (const [type, lijst] of Object.entries(voorbeeld)) {
  for (const p of lijst) {
    const k = kitFor({ ...p, x: 100, y: 200, a: 0.3 });
    ok(k.length >= 3 && k.length <= LAND_TYPES[type].cap, `${type}/${p.sub} heeft ${k.length} onderdelen binnen de cap`);
    ok(k.every((q) => ['box', 'cyl', 'cone'].includes(q.s) && [q.x, q.y, q.z, q.w, q.h, q.d].every(Number.isFinite) && q.w > 0 && q.h > 0 && q.d > 0 && q.y >= 0), `${type}/${p.sub}: eindige maten, boven de grond`);
    ok(JSON.stringify(kitFor({ ...p, x: 0, y: 0, a: 0 })) === JSON.stringify(kitFor({ ...p, x: 0, y: 0, a: 0 })), `${type}/${p.sub}: deterministisch`);
  }
}
ok(kitFor({ id: 1, t: 'onbekend' }).length === 0, 'onbekend type geeft niets');
// een hogere schoorsteen en mast zijn echt hoger
const top = (p) => Math.max(...kitFor(p).map((q) => q.y + q.h));
ok(top({ id: 3, t: 'schoorsteen', h: 80 }) > top({ id: 3, t: 'schoorsteen', h: 30 }), 'hogere schoorsteen is hoger');
ok(top({ id: 5, t: 'mast', h: 100 }) > top({ id: 5, t: 'mast', h: 30 }), 'hogere mast is hoger');
// een plaquette of een zuil zonder hoogte is een laag steentje, geen zuil van vijf meter op een plein van acht (#419)
ok(classifyLand({ historic: 'memorial', memorial: 'stolperstein' }).sub === 'plaquette', 'struikelsteen is een plaquette');
ok(top({ id: 20, t: 'monument', sub: 'plaquette' }) < 1.5 && top({ id: 21, t: 'monument', sub: 'zuil' }) < 1.5, 'plaquette en zuil zonder hoogte zijn laag');
ok(top({ id: 22, t: 'monument', sub: 'zuil', h: 9 }) >= 8, 'een zuil met een hoogte blijft hoog');
// een lang perron heeft meer onderdelen dan een kort, en een overkapping krijgt een dak
ok(kitFor({ id: 1, t: 'perron', l: 200, w: 5 }).length > kitFor({ id: 1, t: 'perron', l: 30, w: 5 }).length, 'langer perron, meer onderdelen');
ok(kitFor({ id: 2, t: 'perron', sub: 'overkapt', l: 30, w: 6 }).some((q) => q.y > 3), 'overkapt perron heeft een dak');
// een park blijft binnen zijn kistje
const parkKit = kitFor({ id: 11, t: 'park', l: 60, w: 40 });
ok(parkKit.every((q) => Math.abs(q.x) <= 30 && Math.abs(q.z) <= 20), 'bomen blijven binnen het park');

// wereldcoordinaten: draaien met de plek
ok(partsToWorld({ id: 3, t: 'schoorsteen', x: 5, y: 6, a: 0, h: 40 }).length > 3, 'partsToWorld zonder parts gebruikt de landkits');
const wp = partsToWorld({ x: 1000, y: 2000, a: Math.PI / 2 }, [{ s: 'box', x: 10, y: 0, z: 0, w: 1, h: 1, d: 1, c: 0 }])[0];
ok(Math.abs(wp.x - 1000) < 1e-6 && Math.abs(wp.z - 2010) < 1e-6, 'partsToWorld draait mee');

// persoonsnamen op gedenktekens vallen weg, type en soort blijven (#419)
ok(classifyLand({ historic: 'memorial', memorial: 'statue', name: 'Samuel Woltjer' }).name === '' && classifyLand({ historic: 'memorial', memorial: 'statue', name: 'Samuel Woltjer' }).sub === 'beeld', 'beeld met persoonsnaam: naam weg, type blijft');
ok(classifyLand({ historic: 'memorial', name: 'De Families Van Gelder' }).name === '' && classifyLand({ historic: 'monument', name: 'Pieter vd Mei' }).name === '', 'familie en achternaam: naam weg');
ok(classifyLand({ historic: 'memorial', memorial: 'stolperstein', name: 'Levi Wolff' }).name === '' && classifyLand({ historic: 'memorial', memorial: 'plaque', name: 'Gompel Dwinger' }).sub === 'plaquette', 'struikelsteen: naam weg, plaquette blijft');
ok(classifyLand({ historic: 'monument', name: 'Graaf Adolfmonument' }).name === '' && classifyLand({ historic: 'memorial', name: 'Grafmonument Familie Scholten' }).name === '', 'titel of familie in de naam: naam weg');
ok(classifyLand({ historic: 'memorial', name: 'Oorlogsmonument Bedum' }).name === 'Oorlogsmonument Bedum' && classifyLand({ historic: 'memorial', name: 'Joods Monument' }).name === 'Joods Monument', 'een naam die zegt wat het is blijft');
ok(classifyLand({ man_made: 'obelisk', name: 'Hendrik De Vries' }).name === '' && classifyLand({ historic: 'wayside_cross', name: 'Jozeph Kroon' }).name === '', 'obelisk en kruis: naam weg');
ok(classifyLand({ leisure: 'park', name: 'Noorderplantsoen' }).name === 'Noorderplantsoen', 'een park houdt zijn naam');
// celbudget: veel parken in een cel -> binnen het budget, benoemde blijven
const velen = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, t: 'park', sub: 'park', x: 10 + i, y: 10, a: 0, l: 120, w: 80, n: i === 29 ? 'Sterrebos' : undefined }));
const b = tileBudget(velen);
ok(b.kept.length <= LAND_BUDGET.perType.park, `parkenbudget per cel: ${b.kept.length}`);
ok(b.kept.some((p) => p.n === 'Sterrebos'), 'het benoemde park blijft');
ok(b.dropped.park === 30 - b.kept.length, 'de rest staat bij weggelaten');
const mix = [...velen, ...Array.from({ length: 5 }, (_, i) => ({ id: 100 + i, t: 'perron', sub: 'open', x: 20 + i, y: 20, a: 0, l: 100, w: 5 }))];
const bm = tileBudget(mix);
ok(bm.kept.filter((p) => p.t === 'perron').length === 5, 'perrons gaan voor parken');
ok([...bm.perCel.values()].every((v) => v <= LAND_BUDGET.onderdelen), 'nooit boven het onderdelenbudget');

// verzamelen uit OSM-elementen
const [wx, wy] = wgsToWorld(53.2194, 6.5665);
const els = [
  { type: 'node', id: 1, lat: 53.2194, lon: 6.5665, tags: { man_made: 'chimney', height: '45', name: 'Schoorsteen Noord' } },
  { type: 'node', id: 2, lat: 53.21941, lon: 6.56651, tags: { man_made: 'chimney' } },
  { type: 'way', id: 3, g: [[53.22, 6.56], [53.22, 6.5615]], tags: { railway: 'platform' } },
  { type: 'way', id: 4, g: [[53.22, 6.56], [53.22, 6.56002]], tags: { railway: 'platform' } },
  { type: 'way', id: 5, g: [[53.23, 6.57], [53.23, 6.5715], [53.2312, 6.5715], [53.2312, 6.57]], tags: { leisure: 'park', name: 'Noorderplantsoen' } },
  { type: 'way', id: 6, g: [[53.24, 6.57], [53.24001, 6.57], [53.24001, 6.57001]], tags: { leisure: 'park' } },
  { type: 'way', id: 7, g: [[53.2, 6.5], [53.2, 6.51]], tags: { highway: 'path' } },
];
const acc = collectLand(els);
const res = finishLand(acc);
ok(acc.ruw.schoorsteen === 2 && res.alle.filter((p) => p.t === 'schoorsteen').length === 1, 'twee schoorstenen vlak bij elkaar worden een');
ok(res.alle.find((p) => p.t === 'schoorsteen').h === 45 && res.alle.find((p) => p.t === 'schoorsteen').n === 'Schoorsteen Noord', 'hoogte en naam van de schoorsteen');
ok(res.alle.filter((p) => p.t === 'perron').length === 1, 'een te kort perron valt af');
ok(res.alle.filter((p) => p.t === 'park').length === 1 && res.alle.find((p) => p.t === 'park').n === 'Noorderplantsoen', 'een te klein park valt af');
ok(res.alle.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.a)), 'alles eindig');
ok(dedupeLand([{ t: 'park', x: 0, y: 0, id: 1 }, { t: 'park', x: 1, y: 0, id: 2 }]).length === 2, 'parken worden niet samengevoegd');

// monument in een gebouw en park in water vallen af
ok(puntInVlak(5, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]) && !puntInVlak(15, 5, [[0, 0], [10, 0], [10, 10], [0, 10]]), 'puntInVlak');
const [mx, my] = wgsToWorld(53.3, 6.6);
const kand = [{ t: 'monument', x: mx, y: my }, { t: 'park', x: mx, y: my }, { t: 'monument', x: mx + 500, y: my }];
const gg = (d) => [[53.3 - d, 6.6 - d], [53.3 - d, 6.6 + d], [53.3 + d, 6.6 + d], [53.3 + d, 6.6 - d], [53.3 - d, 6.6 - d]];
const nweg = filterVlakken([{ type: 'way', tags: { building: 'yes' }, g: gg(0.0003) }, { type: 'way', tags: { natural: 'water' }, g: gg(0.0003) }], kand);
ok(nweg === 2 && kand[0].weg && kand[1].weg && !kand[2].weg, 'monument in gebouw en park in water vallen af');

// streken en audit per streek
ok(streekId(...wgsToWorld(53.327, 6.89)) === 'eemsdelta' && streekId(...wgsToWorld(52.0, 5.0)) === 'elders', 'streek uit coordinaten');
const au = auditLand(res.alle, acc.ruw, res.budget);
ok(au.rows.length === Object.keys(LAND_TYPES).length, 'een rij per type');
ok(au.rows.find((r) => r.type === 'schoorsteen').ruw === 2 && au.rows.find((r) => r.type === 'schoorsteen').gebouwd === 1, 'ruw en gebouwd');
ok(au.perStreek.park.elders?.herkenbaar === 1 || Object.values(au.perStreek.park).reduce((a, s) => a + s.herkenbaar, 0) === 1, 'park telt in een streek');

// drempels: min mag niet dalen, max mag niet stijgen
const dr = { min: { mast: { hogeland: 5 } }, max: { mast: { hogeland: 2 } } };
ok(checkDrempels({ mast: { hogeland: 5 } }, { min: dr.min }).length === 0 && checkDrempels({ mast: { hogeland: 4 } }, { min: dr.min }).length === 1, 'min-drempel');
ok(checkDrempels({ mast: { hogeland: 2 } }, { max: dr.max }).length === 0 && checkDrempels({ mast: { hogeland: 3 } }, { max: dr.max }).length === 1, 'max-drempel');
ok(checkDrempels({}, { min: dr.min }).length === 1, 'ontbrekende telling telt als nul');
const tk = telKandidaten([{ k: 'church', x: wx, y: wy }, { k: 'church', x: wx, y: wy }, { k: 'tower', x: wx, y: wy }], (it) => (it.k === 'tower' ? null : {}));
ok(Object.values(tk.herkenbaar.church).reduce((a, v) => a + v, 0) === 2 && Object.values(tk.zonderKit.tower).reduce((a, v) => a + v, 0) === 1, 'telKandidaten');

// het gebouwde bestand en de drempels (als aanwezig)
const bestand = new URL('../game/streekplekken.json', import.meta.url);
if (fs.existsSync(bestand)) {
  const j = JSON.parse(fs.readFileSync(bestand, 'utf8'));
  ok(j.v === 1 && Array.isArray(j.plekken) && j.plekken.length > 100, `bestand heeft ${j.plekken.length} plekken`);
  ok(j.plekken.every((p) => LAND_TYPES[p.t] && Number.isFinite(p.x) && Number.isFinite(p.y)), 'bestand: geldige types en coordinaten');
  const perCel = new Map();
  for (const p of j.plekken) perCel.set(celVan(p.x, p.y), (perCel.get(celVan(p.x, p.y)) || 0) + kitFor(p).length);
  ok([...perCel.values()].every((v) => v <= LAND_BUDGET.onderdelen), 'bestand: elke cel binnen het budget');
  const dd = JSON.parse(fs.readFileSync(new URL('./streekplekken_drempels.json', import.meta.url), 'utf8'));
  ok(Object.keys(dd.min).every((t) => LAND_TYPES[t]) && STREEK_IDS.every((s) => dd.min.mast[s] !== undefined), 'drempelbestand dekt alle streken');
  const ver = j.plekken.reduce((a, p) => { a[p.t] = (a[p.t] || 0) + 1; return a; }, {});
  ok(Object.keys(LAND_TYPES).every((t) => (ver[t] || 0) >= 20), 'bestand: van elk type minstens 20 ' + JSON.stringify(ver));
  // geen persoonsnaam op een gedenkteken (constitutie 2 en 4, #419): een naam in het bestand zegt wat het is, geen wie
  ok(j.plekken.filter((p) => p.t === 'monument' && p.n).every((p) => gedenknaam(p.n) === p.n), 'bestand: gedenktekens zonder persoonsnaam');
  ok(!j.plekken.some((p) => p.t === 'monument' && /Gelder|Woltjer|Gudema|Frank|Familie|Famil/.test(p.n || '')), 'bestand: de bekende persoonsnamen zijn weg');
}

console.log(fails ? `${fails} van ${n} mislukt` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
