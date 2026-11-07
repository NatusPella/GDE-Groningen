// Telt de hele-array-lezers van de zeven kaartarrays (#314, C1: de stad ontpinnen).
//
// De stad ligt gepind (index.pins.city) omdat een reeks modules de hele arrays
// van de kaart leest: `map.buildings`, `map.roads`, `map.water`, `map.trees`,
// `map.rails`, `map.furniture` en `map.green`. Zolang die lezers bestaan mag er
// geen stadstegel uit de store vallen: dropTile haalt de rijen uit de rasters
// terwijl de arrays ze houden, en bij terugkomst staat elk object er dubbel
// (scripts/tileworld_pinned_test.mjs, 4569 van 4639 gidsen).
//
// Deze teller legt vast waar die lezers staan, per bestand en per regel, zodat
// een volgende fase ze één voor één kan omzetten naar de rasters of naar een
// tegelvraag (buildingsNear, roadsNear, ...). De teller kan alleen dalen: een
// nieuwe lezer of een hoger aantal in een bestand is een fout.
//
// Wat telt (dezelfde maat als de inventaris in docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md,
// bijlage A):
//   * elke plaats die de array als geheel gebruikt: doorgeven (`buildElevation(map)`
//     niet, `adoptSideSpans(map.roads)` wel), erover lopen, `.map`/`.filter`/
//     `.find`/`.some`/`.forEach`/`.indexOf`/`.length`, `.push`/`.splice`, en ook
//     de bestaanscheck (`map.roads ? ...`: de array moet er zijn).
//   * de ontvanger is de kaart: `map`, `world.map`, `w.map` (alles wat op `.map`
//     eindigt), en `this`/`m` alleen in de bestanden waar die onmiskenbaar de
//     kaart zelf is (mapdata.js is de klasse, tileworld.js erft ervan,
//     trafficlights.js geeft de kaart als `m` door).
// Wat niet telt:
//   * een losse rij (`map.roads[i]`, `map.buildings[gid]`): die vraagt één slot,
//     geen hele array, en blijft werken als de rest van de array weg is.
//   * een toewijzing van de hele array (`m.roads = p.roads`, `map.roads = []`):
//     dat is een schrijver, geen lezer (staat in scripts/world_eigenaar.json).
//   * commentaar, strings en de tekst van template-literals (maskSource uit
//     scripts/player_singleton_audit.mjs).
//
// Gebruik:
//   node scripts/tegellezers_test.mjs            keurt tegen de basislijn hieronder
//   node scripts/tegellezers_test.mjs --verbose  met de regelnummers per lezer
//   node scripts/tegellezers_test.mjs --json     machineleesbare uitvoer
//   node scripts/tegellezers_test.mjs --update   verlaagt de basislijn in dit bestand
//
// Exit 1 bij groei of een nieuw bestand, 0 bij gelijk of een daling. Het script
// schrijft nooit naar `game/`; --update raakt alleen dit bestand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maskSource } from './player_singleton_audit.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = path.join(ROOT, 'game', 'js');

// De zeven arrays die de stad bij elkaar houden (mapdata.js, GameMap).
export const ARRAYS = ['roads', 'buildings', 'water', 'trees', 'rails', 'furniture', 'green'];

// Bestanden waarin `this` of `m` de kaart zelf is. Buiten deze bestanden is
// `this.water` bijvoorbeeld de zwemtoestand van de speler (player.js) en telt
// `m.water` een punt (heistui.js) in plaats van de waterlijst.
const MAP_THIS = new Set(['mapdata.js', 'tileworld.js']);
const MAP_M = new Set(['mapdata.js', 'trafficlights.js']);

// De lezers van één bronbestand: [{ regel, soort, ontvanger }].
export function lezersVan(src, bestand = '') {
  const kort = bestand.split(/[\\/]/).pop();
  const masked = maskSource(src);
  const re = new RegExp(`(?<![\\w$])(map|this|m)\\s*\\.\\s*(${ARRAYS.join('|')})\\b`, 'g');
  const uit = [];
  let m;
  while ((m = re.exec(masked))) {
    const ontvanger = m[1];
    if (ontvanger === 'this' && !MAP_THIS.has(kort)) continue;
    if (ontvanger === 'm' && !MAP_M.has(kort)) continue;
    const rest = masked.slice(m.index + m[0].length);
    // een losse rij (`[i]`, `[gid]`) vraagt één slot, geen hele array
    if (/^\s*\[/.test(rest)) continue;
    // een toewijzing van de hele array is een schrijver, geen lezer
    if (/^\s*(?<![=!<>+\-*/%&|^])=(?!=)/.test(rest)) continue;
    uit.push({ regel: masked.slice(0, m.index).split('\n').length, soort: m[2], ontvanger });
  }
  return uit;
}

function keyFor(file, dir) {
  const rel = path.relative(ROOT, file);
  const bruikbaar = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  return (bruikbaar ? rel : path.relative(dir, file)).split(path.sep).join('/');
}

// Alle JS-bestanden onder een map, met per bestand de lezers (ook nul).
export function scanDir(dir = DEFAULT_DIR) {
  const perBestand = {};
  const regels = {};
  const walk = (d) => {
    for (const naam of fs.readdirSync(d).sort()) {
      if (naam === 'node_modules' || naam === '.git') continue;
      const p = path.join(d, naam);
      const st = fs.statSync(p);
      if (st.isDirectory()) { walk(p); continue; }
      if (!naam.endsWith('.js')) continue;
      const key = keyFor(p, dir);
      const lijst = lezersVan(fs.readFileSync(p, 'utf8'), key);
      perBestand[key] = lijst.length;
      regels[key] = lijst;
    }
  };
  walk(dir);
  const totaal = Object.values(perBestand).reduce((s, n) => s + n, 0);
  const bestanden = Object.values(perBestand).filter((n) => n > 0).length;
  return { perBestand, regels, totaal, bestanden };
}

export const totalOf = (telling) => Object.values(telling).reduce((s, n) => s + n, 0);

// Vergelijkt de meting met de basislijn. Groei en een nieuw bestand zijn fouten;
// een daling of een verdwenen bestand is winst en vraagt om --update.
export function compare(meting, basis) {
  const per = basis.per || {};
  const fouten = [];
  const dalingen = [];
  for (const [bestand, n] of Object.entries(meting.perBestand).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(bestand in per)) { if (n > 0) fouten.push(`${bestand}: ${n} lezers, staat niet in de basislijn`); continue; }
    if (n > per[bestand]) fouten.push(`${bestand}: ${n} lezers, basislijn ${per[bestand]} (+${n - per[bestand]})`);
    else if (n < per[bestand]) dalingen.push(`${bestand}: ${n} lezers, basislijn ${per[bestand]} (-${per[bestand] - n})`);
  }
  for (const [bestand, was] of Object.entries(per).sort(([a], [b]) => a.localeCompare(b))) {
    if (!(bestand in meting.perBestand) && was > 0) dalingen.push(`${bestand}: weg, basislijn ${was} (-${was})`);
  }
  return { fouten, dalingen, totaal: meting.totaal, basis: basis.totaal ?? totalOf(per) };
}

// --- basislijn (begin) -------------------------------------------------------------------------
// Gemeten op 29-10-2026 met de definitie hierboven: 76 lezers in 35 bestanden.
// De verkenning van 25-10 noemde 112 met een ruimere greep (elke vermelding van
// map.<array>, ook toewijzingen van een hele array en losse rijen); dit is de
// strakke maat die vanaf nu geldt, en dezelfde voor elke volgende ronde.
const BASIS = {"totaal":76,"bestanden":35,"per":{"game/js/bridgerails.js":1,"game/js/canopies3d.js":0,"game/js/cinematics.js":1,"game/js/countryedge.js":4,"game/js/elevation.js":4,"game/js/farlod.js":0,"game/js/flavour.js":1,"game/js/flitspaal.js":1,"game/js/geokernels.js":0,"game/js/grass.js":2,"game/js/home.js":2,"game/js/junctions.js":2,"game/js/main.js":0,"game/js/mapdata.js":21,"game/js/mapview.js":1,"game/js/marktfiets.js":1,"game/js/movablebridges.js":2,"game/js/nightlights3d.js":1,"game/js/ommelandplace.js":0,"game/js/parkedcars.js":1,"game/js/passagecheck.js":1,"game/js/passages.js":4,"game/js/pedestrians.js":0,"game/js/pedroutes.js":1,"game/js/quaywalls.js":1,"game/js/railprofile.js":0,"game/js/railway.js":0,"game/js/railway3d.js":0,"game/js/ringcheck.js":2,"game/js/roadstructures3d.js":0,"game/js/roadsurface.js":1,"game/js/routing.js":1,"game/js/scene3d.js":0,"game/js/shops.js":1,"game/js/sidejobkit.js":1,"game/js/simworld.js":1,"game/js/skyprops.js":1,"game/js/stationtravel.js":0,"game/js/streetfurniture3d.js":2,"game/js/streetsigns.js":1,"game/js/testmenu.js":1,"game/js/thuis3d.js":1,"game/js/tileworld.js":5,"game/js/trafficlights.js":0,"game/js/trailer.js":1,"game/js/vehicle/traffic.js":1,"game/js/waterindex.js":3,"game/js/worldevents.js":1}};
// --- basislijn (eind) --------------------------------------------------------------------------

const SCRIPT = fileURLToPath(import.meta.url);

// De teller zelf: de vormen die ertoe doen en de vormen die niet meetellen.
// Zonder deze checks kan een te ruime of te smalle regex de basislijn stil laten
// zakken zonder dat er een lezer weg is.
export function zelftest() {
  const fouten = [];
  const telt = (src, bestand, n, naam) => {
    const k = lezersVan(src, bestand).length;
    if (k !== n) fouten.push(`zelftest ${naam}: ${k} lezers, verwacht ${n}`);
  };
  telt('for (const b of map.buildings) {}', 'x.js', 1, 'for...of over de gebouwen');
  telt('map.roads.filter((r) => r.z)', 'x.js', 1, 'filteren op de wegen');
  telt('const n = map.roads.length;', 'x.js', 1, '.length van de wegen');
  telt('const b = map.buildings[3];', 'x.js', 0, 'een losse rij vraagt geen hele array');
  telt('m.roads = p.roads;', 'mapdata.js', 0, 'een toewijzing van de hele array is een schrijver');
  telt('// map.roads\nconst s = "map.roads";', 'x.js', 0, 'commentaar en strings tellen niet');
  telt('this.water = "swim";', 'player.js', 0, 'this.water buiten de klasse is de zwemtoestand');
  telt('for (const b of this.buildings) {}', 'mapdata.js', 1, 'this in de kaartklasse telt');
  telt('world.map.roads.forEach(f);', 'x.js', 1, 'world.map.roads telt');
  telt('waterval.roads;', 'x.js', 0, 'een andere roads is niet de kaart');
  return fouten;
}

// Verlaagt de basislijn in dit bestand. Nooit omhoog: per bestand het minimum van
// de oude en de nieuwe stand, zodat een nieuwe lezer blijft staan als fout.
function schrijfBasis(nieuw) {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const begin = '// --- basislijn (begin)';
  const eind = '// --- basislijn (eind)';
  const a = src.indexOf(begin), b = src.indexOf(eind);
  if (a < 0 || b < 0) throw new Error('de basislijnmarkeringen staan niet meer in dit bestand');
  const per = {};
  for (const [bestand, n] of Object.entries(nieuw.per).sort(([x], [y]) => x.localeCompare(y))) {
    // een bestand zonder lezers hoort niet in de basislijn, tenzij het er al in staat (dan blijft het op 0 staan als bewijs)
    if (n === 0 && !(bestand in BASIS.per)) continue;
    per[bestand] = bestand in BASIS.per ? Math.min(BASIS.per[bestand], n) : n;
  }
  const totaal = totalOf(per);
  const bestanden = Object.values(per).filter((n) => n > 0).length;
  nieuw = { totaal, bestanden, per };
  const blok = [
    begin + ' -------------------------------------------------------------------------',
    `// Gemeten op 29-10-2026 met de definitie hierboven: ${nieuw.totaal} lezers in ${nieuw.bestanden} bestanden.`,
    '// De verkenning van 25-10 noemde 112 met een ruimere greep (elke vermelding van',
    '// map.<array>, ook toewijzingen van een hele array en losse rijen); dit is de',
    '// strakke maat die vanaf nu geldt, en dezelfde voor elke volgende ronde.',
    `const BASIS = ${JSON.stringify({ totaal: nieuw.totaal, bestanden: nieuw.bestanden, per }, null, 0)};`,
    eind + ' --------------------------------------------------------------------------',
  ].join('\n');
  fs.writeFileSync(SCRIPT, src.slice(0, a) + blok + src.slice(src.indexOf('\n', b)));
}

function main() {
  const argv = process.argv.slice(2);
  const verbose = argv.includes('--verbose');
  const json = argv.includes('--json');
  const update = argv.includes('--update');
  const dir = path.resolve((argv.find((v) => v.startsWith('--dir=')) || '').slice(6) || DEFAULT_DIR);
  if (!fs.existsSync(dir)) { console.error(`FOUT  map bestaat niet: ${dir}`); return 2; }

  const meting = scanDir(dir);

  if (update) {
    const oud = BASIS.totaal;
    schrijfBasis({ totaal: meting.totaal, bestanden: meting.bestanden, per: meting.perBestand });
    const regel = fs.readFileSync(SCRIPT, 'utf8').split('\n').find((r) => r.startsWith('const BASIS'));
    const na = JSON.parse(regel.slice(14).replace(/;$/, ''));
    console.log(`Basislijn bijgewerkt: ${na.totaal} lezers in ${na.bestanden} bestanden (was ${oud}; ${path.relative(ROOT, SCRIPT)}).`);
    for (const [bestand, n] of Object.entries(meting.perBestand)) {
      if (n > 0 && n > (BASIS.per[bestand] ?? 0)) console.log(`LET OP ${bestand}: ${n} lezers tegen basislijn ${BASIS.per[bestand] ?? 0}; een nieuwe lezer wordt niet opgenomen`);
    }
    return 0;
  }

  const zelffouten = zelftest();
  const { fouten: basisfouten, dalingen, basis } = compare(meting, BASIS);
  const fouten = [...zelffouten, ...basisfouten];
  const verschil = meting.totaal - basis;
  const top = Object.entries(meting.perBestand).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (json) {
    console.log(JSON.stringify({ totaal: meting.totaal, bestanden: meting.bestanden, basis, per: meting.perBestand, fouten, dalingen }, null, 1));
    return fouten.length ? 1 : 0;
  }

  console.log(`tegellezers: ${meting.totaal} hele-array-lezers van ${ARRAYS.join('/')} in ${meting.bestanden} bestanden (basislijn ${basis}, ${verschil <= 0 ? verschil : '+' + verschil}); ${meting.totaal ? top.length : 0} bestanden met lezers.`);
  for (const [bestand, n] of top) {
    const soorten = {};
    for (const r of meting.regels[bestand]) soorten[r.soort] = (soorten[r.soort] || 0) + 1;
    const verdeling = Object.entries(soorten).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
    console.log(`  ${String(n).padStart(3)}  ${bestand.padEnd(28)} ${verdeling}`);
    if (verbose) console.log(`       regel ${meting.regels[bestand].map((r) => r.regel).join(', ')}`);
  }
  for (const regel of dalingen) console.log(`OK    ${regel}`);
  for (const regel of fouten) console.log(`FOUT  ${regel}`);
  if (dalingen.length) console.log('Werk de basislijn bij met --update (dat verlaagt hem; hij gaat nooit omhoog).');
  if (fouten.length) console.log('Laat de nieuwe lezer per tegel vragen (buildingsNear, roadsNear, ...) of via de rasters, en houd de gepinde set klein (#314 C1).');
  return fouten.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) process.exit(main());
