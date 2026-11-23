// Monumentgebied Vesting Bourtange (#953, docs/BOURTANGE-MONUMENT-22-11.md): het gebied-regel (game/js/heritagearea.js) en wat de
// haakpunten ermee doen. Puur: gebiedsdetectie, parameters, wegmateriaal, geen verkeer/borden/lantaarns in het gebied, gevelstijl,
// wallen, kleding, geluid, kaartplek en de aankleding (monumentdecor.js, kits). Het tweede deel legt het gebied naast de tegels
// (zonder game/world: SKIP): droge, vrije plekken voor de aankleding, wegen zonder asfalt, historische gevels, de wallen.
//   node scripts/monumentzone_test.mjs
import fs from 'node:fs';
import './node3d.mjs';

const Z = await import('../game/js/heritagearea.js');
const D = await import('../game/js/monumentdecor.js');
const SF = await import('../game/js/streetfurniture.js');
const MD = await import('../game/js/mapdata.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const { polygonBounds } = await import('../game/js/util.js');
const CL = await import('../game/js/clothing.js');
const CD = await import('../game/js/clothingdata.js');
const THREE = await import('three');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// --- 1. gebiedsdetectie en parameters ------------------------------------------------------------
const bz = Z.heritageAreaById('bourtange');
ok(!!bz && Z.HERITAGE_AREAS.length >= 1, 'Bourtange is een monumentzone');
ok(Z.heritageAreaAt(42470, 22800) === bz, 'het Marktplein ligt in het gebied');
ok(Z.heritageAreaAt(42583, 22679) === bz && Z.heritageAreaAt(42319, 22859) === bz, 'de bolwerken van M30 liggen in het gebied');
ok(Z.heritageAreaAt(0, 0) === null && Z.heritageAreaAt(42470 + bz.radius + 1, 22800) === null, 'buiten de straal is er geen area');
ok(Z.monumentWeight(42470, 22800) === 1 && Z.monumentWeight(0, 0) === 0, 'gewicht 1 in de kern en 0 ver weg');
{
  const mid = Z.monumentWeight(42470 + bz.radius + bz.rim / 2, 22800);
  ok(mid > 0.45 && mid < 0.55, 'het gewicht dooft lineair uit over de rand', String(mid));
}
ok(bz.traffic.cars === false && bz.traffic.motors === false && bz.traffic.scooters === false, 'geen auto, motor of brommer');
ok(bz.audio.traffic === 0 && bz.audio.city < 0.3 && bz.audio.vogels >= 1, 'geluid: geen verkeer, wel vogels');
ok(bz.furniture.drop.includes('lamp') && bz.furniture.drop.includes('shelter') && bz.furniture.drop.includes('placesign') && !bz.furniture.drop.includes('bench'), 'geen lantaarnpaal, bushokje of bord; een bank mag');
ok(bz.rampart.maxZ >= bz.rampart.minZ && bz.rampart.maxZ <= 4, 'wallen: een begrensde hoogte');
// elk gebied heeft de velden die de haakpunten lezen (zodat een volgende plek niets vergeet)
for (const z of Z.HERITAGE_AREAS) {
  for (const k of ['id', 'name', 'at', 'radius', 'rim', 'roads', 'furniture', 'traffic', 'facade', 'people', 'audio', 'light', 'info']) ok(z[k] !== undefined, `area ${z.id}: veld ${k}`);
  ok(Array.isArray(z.at) && z.at.every(Number.isFinite) && z.radius > 50, `area ${z.id}: middelpunt en straal`);
  ok(z.name === 'Vesting Bourtange' ? /1593/.test(z.info) : typeof z.info === 'string' && z.info.length > 10, `area ${z.id}: korte tekst`);
}

// --- 2. wegmateriaal -----------------------------------------------------------------------------
{
  const inside = [42470, 22800], outside = [100, 100];
  for (const type of ['residential', 'unclassified', 'living_street', 'service', 'pedestrian', 'footway', 'steps', 'track', 'cycleway', 'tertiary', 'primary']) {
    const s = Z.monumentRoadSurface({ type }, inside);
    ok(s && s !== 'asphalt' && s !== 'cycle' && s !== 'tiles', `wegtype ${type} in het gebied: klinker of zandpad`, String(s));
    ok(Z.monumentRoadSurface({ type }, outside) === null, `wegtype ${type} buiten het gebied: ongemoeid`);
  }
  ok(Z.monumentRoadSurface({ type: 'residential' }, inside) === 'klinker_red' && Z.monumentRoadSurface({ type: 'footway' }, inside) === 'gravel', 'straten rood klinker, paden zandpad');
}

// --- 3. straatmeubilair: geen lantaarns, borden, bushokjes (furnitureForTile) -------------------------
{
  const line = (x0, x1, y, step = 8) => { const P = []; for (let x = x0; x <= x1; x += step) P.push([x, y]); return P; };
  const mk = (dx, dy) => ({
    roads: [{ pts: line(dx + 0, dx + 160, dy + 100), type: 'residential', cat: 'normal', width: 3.5 }],
    mapped: [
      { k: 'lamp', x: dx + 40, y: dy + 96 }, { k: 'shelter', x: dx + 60, y: dy + 96 }, { k: 'bench', x: dx + 80, y: dy + 96 },
      { k: 'bin', x: dx + 100, y: dy + 96 }, { k: 'bikerack', x: dx + 120, y: dy + 96 }, { k: 'bollard', x: dx + 140, y: dy + 96 },
    ],
  });
  const kinds = (res) => new Set(res.items.map((it) => it.k));
  const binnen = SF.furnitureForTile({ x0: 42400, y0: 22700, size: 1000, ...mk(42400, 22700), opts: { lamps: true, bollards: true } });
  const buiten = SF.furnitureForTile({ x0: 0, y0: 0, size: 1000, ...mk(0, 0), opts: { lamps: true, bollards: true } });
  ok(kinds(buiten).has('lamp') && kinds(buiten).has('shelter') && kinds(buiten).has('bench'), 'buiten het gebied staan lamp, bushokje en bank', [...kinds(buiten)].join(','));
  ok(!kinds(binnen).has('lamp') && !kinds(binnen).has('shelter') && !kinds(binnen).has('bin') && !kinds(binnen).has('bikerack') && !kinds(binnen).has('bollard'), 'in het gebied geen lamp, bushokje, bak, fietsenrek of paal', [...kinds(binnen)].join(','));
  ok(kinds(binnen).has('bench'), 'in het gebied blijft een bank staan');
  ok(binnen.colliders.length < buiten.colliders.length, 'ook de botsvormen van het weggelaten meubilair zijn weg');
  ok(Z.monumentFurnitureAllowed('lamp', 0, 0) && !Z.monumentFurnitureAllowed('lamp', 42470, 22800) && Z.monumentFurnitureAllowed('bench', 42470, 22800), 'monumentFurnitureAllowed volgt de regel');
}

// --- 4. verkeer -------------------------------------------------------------------------------------
{
  ok(!Z.monumentTrafficAllowed('cars', 42470, 22800) && !Z.monumentTrafficAllowed('motors', 42500, 22750) && !Z.monumentTrafficAllowed('scooters', 42450, 22850), 'in het gebied geen auto, motor of brommer');
  ok(Z.monumentTrafficAllowed('bikes', 42470, 22800), 'fietsen blijven mogelijk');
  ok(Z.monumentTrafficAllowed('cars', 0, 0) && Z.monumentTrafficAllowed('cars', 42470 + bz.radius + 5, 22800), 'buiten het gebied rijdt alles gewoon');
  const src = fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8');
  ok(/monumentTrafficAllowed\('cars'/.test(src) && /monumentTrafficAllowed\('scooters'/.test(src) && /monumentTrafficAllowed\('motors'/.test(src), 'vehicle.js houdt auto, brommer en motor uit het gebied');
  ok(/monumentTrafficAllowed\('cars', x, y\)/.test(fs.readFileSync(new URL('../game/js/parkedcars.js', import.meta.url), 'utf8')), 'ook geen geparkeerde auto');
}

// --- 5. gevelstijl -----------------------------------------------------------------------------------
{
  const f = Z.monumentFacadeAt(42470, 22830);
  ok(f && f.style === 'historisch' && f.noRoofGear && f.noShopSigns && f.noAwnings && f.chimney >= 0.8, 'historische gevel in het gebied');
  ok(Z.monumentFacadeAt(0, 0) === null, 'buiten het gebied de gewone gevel');
  const fam = Z.historicFamily(0.4);
  ok(fam.wall.length >= 4 && fam.wall.every((c) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return r > g && g > b; }), 'de muren zijn baksteen: rood tot bruin (r > g > b)');
  ok(Z.HISTORIC_FACADE.roofs.every((c) => ((c >> 16) & 255) > (c & 255)), 'de daken zijn pannen (warm)');
  ok(Z.HISTORIC_FACADE.frames.includes(0xf2efe6) && Z.HISTORIC_FACADE.frames.length >= 2, 'kozijnen wit of groen');
  ok(Z.HISTORIC_FACADE.style.hRatio <= 0.5 && Z.HISTORIC_FACADE.style.w < 1.05, 'kleine ramen');
  // het echte gebouwmodel: binnen het gebied baksteen, pannendak en geen etalage; buiten ongemoeid
  const B = await import('../game/js/models3d_buildings.js');
  const huis = (x, y, type) => ({ id: Math.round(x * 3 + y), pts: [[x, y], [x + 9, y], [x + 9, y + 7], [x, y + 7], [x, y]], h: 2, type, bounds: [x, y, x + 9, y + 7] });
  const kleuren = (g) => { const set = new Set(); let tri = 0, nan = 0; g.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; tri += (o.geometry.index ? o.geometry.index.count : p.count) / 3; for (let i = 0; i < p.array.length; i++) if (Number.isNaN(p.array[i])) nan++; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m && m.color) set.add(m.color.getHex()); }); return { set, tri, nan }; };
  for (const type of ['house', 'commercial', 'shed']) {
    const bin = kleuren(B.buildBuildingMesh(huis(42470, 22830, type)));
    const bui = kleuren(B.buildBuildingMesh(huis(100, 100, type)));
    ok(bin.nan === 0 && bin.tri > 20, `gebouw ${type} in het gebied: geen NaN, driehoeken`, `${bin.tri} driehoeken`);
    ok([...bin.set].some((c) => Z.HISTORIC_FACADE.roofs.includes(c) || Z.HISTORIC_FACADE.walls.some((w) => Math.abs(((c >> 16) & 255) - ((w >> 16) & 255)) < 90)), `gebouw ${type} in het gebied draagt baksteen- of pannenkleuren`, [...bin.set].map((c) => c.toString(16)).join(','));
    if (type === 'commercial') ok(bin.tri < bui.tri, 'geen etalage: een winkelpand in het gebied heeft minder driehoeken dan elders', `${bin.tri} < ${bui.tri}`);
  }
}

// --- 6. wallen -----------------------------------------------------------------------------------------
{
  const mkMap = () => { const g = (items) => { const s = new SpatialGrid(100); for (const it of items) { it.bounds = polygonBounds(it.pts); s.insert(it, it.bounds); } return s; }; return { waterGrid: g([]), railGrid: g([]), roadGrid: g([]) }; };
  const pad = (x0, y0, z = 3.5) => ({ id: 7, cat: 'foot', bridge: true, pts: [[x0, y0], [x0 + 10, y0], [x0 + 20, y0], [x0 + 30, y0]], z: [0, z, z, 0], st: [1, 1, 1], ly: [1, 1, 1] });
  let r = pad(42560, 22700);
  ok(MD.dropNeedlessDeck(mkMap(), r) === true && r.rampart === true && !r.bridge && r.deckDropped, 'een wal in het gebied is een aarden wal, geen dek');
  ok(Array.isArray(r.z) && Math.max(...r.z) === bz.rampart.maxZ && Math.min(...r.z) === 0, 'de wal houdt zijn profiel, begrensd op de maximale hoogte', JSON.stringify(r.z));
  ok(r.st === undefined && r.ly === undefined, 'geen dekprofiel meer');
  r = pad(0, 0);
  ok(MD.dropNeedlessDeck(mkMap(), r) === true && !r.z && !r.rampart, 'buiten het gebied verliest het pad zijn profiel (de bestaande regel)');
  r = pad(42560, 22700, 1.2);
  ok(MD.dropNeedlessDeck(mkMap(), r) === false && r.bridge, 'een laag pad is geen wal en blijft zoals het was');
  r = pad(42560, 22700);
  ok(MD.dropNeedlessDeck({ waterGrid: (() => { const s = new SpatialGrid(100); const w = { pts: [[42568, 22695], [42582, 22695], [42582, 22705], [42568, 22705]] }; w.bounds = polygonBounds(w.pts); s.insert(w, w.bounds); return s; })(), railGrid: mkMap().railGrid, roadGrid: mkMap().roadGrid }, r) === false && r.bridge, 'een brug over de gracht houdt zijn dek');
  ok(Z.monumentRampartProfile([0, 2.5, 0], [[0, 0], [1, 1]]) === null, 'monumentRampartProfile: buiten het gebied niets');
  ok(Z.monumentRampartProfile(null, [[42470, 22800]]) === null && Z.monumentRampartProfile([0, 1, 0], []) === null, 'monumentRampartProfile: ongeldige invoer');
  // de wal als ophoging in het hoogtemodel: een weg met profiel zonder brugvlag geeft een vulling met grashelling
  const EL = await import('../game/js/elevation.js');
  const road = pad(42560, 22700); MD.dropNeedlessDeck(mkMap(), road);
  road.width = 2; road.id = 77; road.type = 'footway';
  const map = { roadGrid: (() => { const s = new SpatialGrid(100); road.bounds = polygonBounds(road.pts); s.insert(road, road.bounds); return s; })(), roadsNear: () => [road] };
  const elev = EL.buildElevation(map);
  const top = EL.groundHeightAt(elev, 42575, 22700, 0, 5);
  ok(elev.has && top > 2.5 && top <= bz.rampart.maxZ + 0.01, 'de wal staat in het hoogtemodel: bovenop is de grond hoog', String(top));
  ok(EL.groundHeightAt(elev, 42575, 22700 + 12, 0, 5) < 0.3, 'twaalf meter ernaast is het weer maaiveld');
  const flank = EL.groundHeightAt(elev, 42575, 22700 + 2.5, 0, 5);
  ok(flank > 0.3 && flank < top, 'de flank loopt glooiend af', String(flank));
}

// --- 7. mensen: wandelaars in zomerkleding, figuranten in historische kleding ------------------------------
{
  const tel = {};
  for (let i = 0; i < 600; i++) { const r = CL.pedRole('monumenttest' + i, { area: 'monument', hour: 13 }); tel[r] = (tel[r] || 0) + 1; }
  ok(tel.historisch > 20 && tel.historisch < 150, 'rond het middaguur lopen een paar figuranten', JSON.stringify(tel));
  ok(!tel.bouwvakker && !tel.feestganger && !tel.zakenman && !tel.boer, 'geen bouwvakkers of zakenlieden in het vestingdorp');
  ok(tel.voetganger > 100 && (tel.toerist || 0) > 50 && (tel.wandelaar || 0) > 30, 'de meeste mensen zijn wandelaars en toeristen', JSON.stringify(tel));
  const nacht = {};
  for (let i = 0; i < 300; i++) { const r = CL.pedRole('nacht' + i, { area: 'monument', hour: 2 }); nacht[r] = (nacht[r] || 0) + 1; }
  ok((nacht.historisch || 0) < tel.historisch / 2, 'figuranten lopen overdag, niet in de nacht');
  const pool = CD.ROLE_POOLS.historisch;
  ok(!!pool && !!CD.ROLE_MOODS.historisch, 'er is een rolpool en een stemming historisch');
  for (const [slot, list] of Object.entries(pool)) for (const [id] of list) ok(id === null || !!CD.ITEM_BY_ID[id], `historisch ${slot}: ${id} bestaat`);
  for (const slot of ['top', 'outer', 'bottom', 'shoes', 'hat']) ok(pool[slot] && pool[slot].length >= 3, `historisch heeft keuze in ${slot}`);
  for (let i = 0; i < 40; i++) {
    const o = CL.npcOutfit('hist' + i, 'historisch', { hot: true });
    ok(o.top && (o.bottom || /^jurk/.test(o.top)) && o.shoes, 'een historische outfit heeft een top, broek of rok en schoenen', JSON.stringify(o));
  }
  ok(Z.monumentAreaKey(42470, 22800) === 'monument' && Z.monumentAreaKey(0, 0) === null, 'monumentAreaKey: monument binnen, anders niets');
}

// --- 8. geluid, licht en kleur ----------------------------------------------------------------------------
{
  const a = Z.monumentAudioScale(42470, 22800);
  ok(a && a.traffic === 0 && a.city < 0.3 && a.vogels >= 1 && a.wind >= 1 && a.weight === 1, 'geluid in de kern: geen verkeer, bijna geen stad, wel vogels en wind');
  ok(Z.monumentAudioScale(0, 0) === null, 'geluid ver weg: ongemoeid');
  const r = Z.monumentAudioScale(42470 + bz.radius + bz.rim / 2, 22800);
  ok(r && r.traffic > 0 && r.traffic < 1, 'geluid aan de rand: zacht uitdovend', JSON.stringify(r));
  ok(Z.monumentLanternOn(bz, 22) && Z.monumentLanternOn(bz, 3) && !Z.monumentLanternOn(bz, 12) && !Z.monumentLanternOn(bz, 7), 'de lantaarns branden alleen in de avond en nacht');
  ok(!Z.monumentLanternOn(null, 22) && !Z.monumentLanternOn(bz, NaN), 'lantaarn: ongeldige invoer is uit');
  ok(Z.monumentTintAt(42470, 22800) > 0 && Z.monumentTintAt(42470, 22800) <= 0.1 && Z.monumentTintAt(0, 0) === 0, 'iets warmer papier in het gebied');
  const src = fs.readFileSync(new URL('../game/js/sfx/ambience.js', import.meta.url), 'utf8');
  ok(/monumentAudioScale\(x, y\)/.test(src), 'sfx/ambience.js leest het gebied');
  // alleen bestaande sfx-sleutels: geen nieuwe audio
  ok(!fs.existsSync(new URL('../game/audio/sfx/monument', import.meta.url)), 'geen nieuwe audio');
}

// --- 9. kaart en tekst -----------------------------------------------------------------------------------------
{
  const pois = Z.monumentPois();
  ok(pois.length === Z.HERITAGE_AREAS.length && pois[0].naam === 'Vesting Bourtange' && pois[0].icon === 'monument' && /ster|vijf/.test(pois[0].tekst), 'de kaart krijgt naam, icoon en korte tekst');
  ok(pois.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), 'kaartpunten hebben coördinaten');
  const mv = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  const hp = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  ok(/meta\.monumenten/.test(mv) && /case 'monument':/.test(hp) && /'monument'/.test(fs.readFileSync(new URL('../game/js/mapicons.js', import.meta.url), 'utf8')), 'grote kaart, minikaart en icoon kennen het monument');
}

// --- 10. de aankleding (puur) en de kits (THREE) ------------------------------------------------------------------
{
  const items = D.monumentDecorItems('bourtange');
  const c = D.monumentDecorCounts('bourtange');
  ok(c.linde === 14 && c.kanon >= 9 && c.kogels >= 3 && c.ton >= 6 && c.bank >= 4 && c.vaandel >= 4 && c.lantaarn >= 15, 'het plan heeft veertien linden, kanonnen, kogels, tonnen, banken, vlaggen en lantaarns', JSON.stringify(c));
  ok(items.every((o) => Number.isFinite(o.x) && Number.isFinite(o.y) && Number.isFinite(o.a)), 'geen NaN in het plan');
  ok(items.every((o) => Z.heritageAreaAt(o.x, o.y) === bz), 'alles ligt in het gebied');
  ok(new Set(items.map((o) => `${o.kind}@${o.x},${o.y}`)).size === items.length, 'geen dubbele onderdelen');
  ok(JSON.stringify(D.monumentDecorItems('bourtange')) === JSON.stringify(items), 'het plan is deterministisch (Samen spelen: voor iedereen gelijk)');
  ok(D.monumentDecorItems('bestaatniet').length === 0, 'een onbekend gebied heeft geen aankleding');
  // de bolwerken gelijk aan die van M30
  const src = fs.readFileSync(new URL('../game/js/missions_akte6.js', import.meta.url), 'utf8');
  const tabel = /export const BOURTANGE = \{([\s\S]*?)\n\};/.exec(src)[1];
  const P = {};
  for (const m of tabel.matchAll(/^\s*(\w+): \[(\d+), (\d+)\]/gm)) P[m[1]] = [Number(m[2]), Number(m[3])];
  ok(D.ANKERS.bolwerken.every((b, i) => b[0] === P['bolwerk' + (i + 1)][0] && b[1] === P['bolwerk' + (i + 1)][1]), 'de bolwerken van de aankleding zijn die van M30');
  ok(D.ANKERS.munsterschePoort[0] === P.poort[0] - 6 || Math.hypot(D.ANKERS.munsterschePoort[0] - P.poort[0], D.ANKERS.munsterschePoort[1] - P.poort[1]) < 20, 'de poort ligt bij de Munsterse Poort van M30');
  const plan = D.monumentDecorPlan('bourtange');
  ok(plan.props.length === items.length && plan.people.length === D.FIGURANTEN.length && plan.people.every((p) => p.look.role === 'historisch'), 'het plan in missiedecor-vorm: props en figuranten in historische kleding');
  ok(D.monumentDecorPlan('x') === null, 'onbekend gebied: geen plan');

  // de kits bouwen driehoeken zonder NaN en ruimen op
  const MK = await import('../game/js/monumentkits3d.js');
  const MDEC = await import('../game/js/missiedecor.js');
  const stats = (g) => { let tri = 0, nan = 0, meshes = 0; g.traverse((o) => { if (!o.isMesh) return; meshes++; const p = o.geometry.attributes.position; tri += (o.geometry.index ? o.geometry.index.count : p.count) / 3; for (let i = 0; i < p.array.length; i++) if (Number.isNaN(p.array[i])) nan++; }); return { tri, nan, meshes }; };
  for (const kind of ['linde', 'lantaarn', 'kogels', 'kanon', 'ton', 'bank', 'vaandel']) {
    const g = MDEC.simpleProp(kind);
    const s = g ? stats(g) : { tri: 0, nan: 1, meshes: 0 };
    ok(!!g && s.tri >= 10 && s.nan === 0, `kit ${kind}: driehoeken, geen NaN`, `${s.tri} driehoeken`);
    ok(s.meshes <= 40, `kit ${kind}: een bescheiden aantal onderdelen`, String(s.meshes));
    if (g) g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  ok(MDEC.registreerPropBouwer('linde', () => null) === false, 'een bestaande bouwer wordt nooit overschreven');
  // de glans van de lantaarns
  MK.setMonumentLantern(true);
  ok(MK.monumentLanternMaterial().color.getHex() === 0xffc46b, 'lantaarnglans aan: warm');
  MK.setMonumentLantern(false);
  ok(MK.monumentLanternMaterial().color.getHex() !== 0xffc46b, 'lantaarnglans uit overdag');
  // de aankleding bouwen in een eigen scène en weer opruimen
  const scene = new THREE.Scene();
  MDEC.registreerAankleding('monument-bourtange-test', plan);
  const set = MDEC.buildMissionDressing(null, 'monument-bourtange-test', { x: bz.at[0], y: bz.at[1], a: 0 }, scene);
  ok(!!set && set.props.length === items.length && set.people.length === plan.people.length, 'de aankleding bouwt alle onderdelen (zonder kaart: niets valt weg)', set ? `${set.props.length}/${items.length}, ${set.people.length}` : 'null');
  if (set) {
    const s = stats(set.group);
    ok(s.nan === 0 && s.tri > 500, 'de hele aankleding: geen NaN', `${s.tri} driehoeken, ${s.meshes} onderdelen`);
    ok(s.meshes < 900, 'de aankleding blijft binnen een bescheiden aantal onderdelen', String(s.meshes));
    ok(set.people.every((p) => Number.isFinite(p.mesh.position.x) && Math.abs(p.mesh.position.x - bz.at[0]) < bz.radius), 'de figuranten staan in het gebied');
    MDEC.updateMissionDressing(set, 0.1);
    MDEC.disposeMissionDressing(set);
    ok(scene.children.length === 0, 'opruimen haalt alles uit de scène');
  }
}

// --- 10b. #1203 (hertest 24-11): het Marktplein is een bestraat plein, de linden staan op de rand met hoge kruinen ------------
{
  const bt = Z.heritageAreaById('bourtange');
  ok(bt.plein && bt.plein.radius >= 18 && bt.plein.ring <= bt.plein.radius && bt.plein.ring > 15, 'het plein heeft een straal en een lindenring aan de rand', JSON.stringify(bt.plein));
  ok(Z.monumentPleinAt(bt.plein.at[0] + 5, bt.plein.at[1] - 5) === bt.plein && Z.monumentPleinAt(bt.plein.at[0] + 40, bt.plein.at[1]) === null, 'monumentPleinAt: binnen ja, erbuiten nee');
  ok(Z.monumentPleinAt(0, 0) === null && Z.monumentPleinAt(bt.plein.at[0] + bt.plein.radius + 5, bt.plein.at[1], 6) === bt.plein, 'met een marge telt de rand mee');
  const lind = D.monumentDecorItems('bourtange').filter((o) => o.kind === 'linde');
  const r = lind.map((o) => Math.hypot(o.x - D.ANKERS.plein[0], o.y - D.ANKERS.plein[1]));
  ok(lind.length === 14 && r.every((d) => Math.abs(d - bt.plein.ring) < 0.3), 'veertien linden op de ring aan de rand, niet midden op het plein', r.map((d) => d.toFixed(1)).join(','));
  const kits = fs.readFileSync(new URL('../game/js/monumentkits3d.js', import.meta.url), 'utf8');
  const onder = Number((kits.match(/LINDE_KRUIN_ONDER = ([\d.]+)/) || [])[1]);
  ok(onder >= 5, 'de kruin van een plein-linde begint op 5 m of hoger (boven het beeld van wie op het plein staat)', String(onder));
  const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  ok(/monumentPleinAt\(t\[0\], t\[1\]\) \? null/.test(src('tilegreenery.js')), 'geen kaartbomen op het plein');
  ok(/if \(plein && monumentPleinAt\(x, y\)\) return null;/.test(src('grass.js')), 'geen grasplukken op het plein');
  ok(/export function buildPleinFloor/.test(src('monumentdecor3d.js')) && /scene\.add\(vloer\)/.test(src('monumentdecor3d.js')) && /dropFloor\(e\)/.test(src('monumentdecor3d.js')), 'de klinkervloer komt en gaat met de aankleding');
}

// --- 11. het gebied naast de tegels (zonder game/world: SKIP) -----------------------------------------------------------
const root = new URL('../game/world/', import.meta.url);
if (!fs.existsSync(new URL('index-provincie.json', root))) {
  console.log('SKIP monumentzone_test (tegels): geen game/world met de provincie');
} else {
  const S = await import('../game/js/tilestore.js');
  const TW = await import('../game/js/tileworld.js');
  const PW = await import('../game/js/provinceworld.js');
  const G = await import('../game/js/gdt.js');
  const { isInWater, pointInPolygon } = await import('../game/js/util.js');
  const { patchRows } = await import('../game/js/vaarnet.js');
  const { onGroundRoad } = await import('../game/js/propfilter.js');
  const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
  const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
  const map = T.world;
  PW.initProvince({ index: T.index, world: map });
  const keys = new Set();
  for (let dx = -300; dx <= 300; dx += 100) for (let dy = -300; dy <= 300; dy += 100) {
    const [i, j] = G.tileIndexOf(bz.at[0] + dx, bz.at[1] + dy);
    const k = G.tileKey(i, j);
    if (T.index.tiles[k]) keys.add(k);
  }
  await Promise.all([...keys].map((k) => T.store.request(k, { priority: -1 })));
  map.tileQueue.run(1e9);
  map.addWaterPatches(patchRows(JSON.parse(fs.readFileSync(new URL('../game/vaarnet_fixes.json', import.meta.url), 'utf8'))).filter((r) => !r.strip));
  const inBuilding = (x, y) => map.buildingsNear(x, y, 0.4).some((b) => { const [a, b2, c, d] = b.bounds; return x >= a && x <= c && y >= b2 && y <= d && pointInPolygon(x, y, b.pts); });

  // wegen: elke weg in het gebied krijgt klinkers of zandpad
  const wegen = map.roadsNear(bz.at[0], bz.at[1], bz.radius).filter((r) => Z.heritageAreaAt(r.pts[Math.floor(r.pts.length / 2)][0], r.pts[Math.floor(r.pts.length / 2)][1]));
  ok(wegen.length > 100, 'de tegels hebben wegen in het gebied', String(wegen.length));
  const mat = new Map();
  for (const r of wegen) { const s = Z.monumentRoadSurface(r, r.pts[Math.floor(r.pts.length / 2)]); mat.set(s, (mat.get(s) || 0) + 1); }
  ok(![...mat.keys()].some((s) => s === 'asphalt' || !s), 'geen enkele weg in het gebied is asfalt', JSON.stringify([...mat]));
  ok((mat.get('klinker_red') || 0) > 20 && (mat.get('gravel') || 0) > 20, 'straten rood klinker en paden zandpad', JSON.stringify([...mat]));

  // gebouwen: allemaal historisch
  const huizen = map.buildingsNear(bz.at[0], bz.at[1], bz.radius).filter((b) => Z.heritageAreaAt(b.pts[0][0], b.pts[0][1]));
  ok(huizen.length > 60 && huizen.every((b) => Z.monumentFacadeAt((b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2) !== null || !Z.heritageAreaAt((b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2)), 'elk gebouw in het gebied krijgt de historische gevel', String(huizen.length));

  // de wallen: een echt voetpad (of trap) in het gebied, zonder water ernaast, met een gegeven hoogteprofiel, wordt een wal
  const paden = wegen.filter((r) => (r.cat === 'foot' || r.cat === 'cycle') && r.pts.length >= 2 && !r.bridge);
  ok(paden.length > 30, 'er zijn voetpaden op de wallen', String(paden.length));
  let wal = 0, behouden = 0;
  for (const r of paden.slice(0, 60)) {
    const kopie = { ...r, bridge: true, tunnel: false, z: r.pts.map((_, i) => (i === 0 || i === r.pts.length - 1 ? 0 : 3.5)), st: r.pts.map(() => 1), ly: r.pts.map(() => 1), pts: r.pts };
    if (kopie.pts.length < 3) continue;
    if (MD.dropNeedlessDeck(map, kopie) && kopie.rampart) { wal++; if (Math.max(...kopie.z) <= bz.rampart.maxZ && Math.max(...kopie.z) >= bz.rampart.minZ) behouden++; }
  }
  ok(wal > 5 && behouden === wal, `echte voetpaden in het gebied worden wallen met begrensde hoogte (${wal})`, String(behouden));

  // de aankleding: de formule geeft een plek bij benadering, fitMonumentDecor legt hem op vrije, droge grond naast de weg
  const items = D.monumentDecorItems('bourtange');
  const fit = D.fitMonumentDecor(map, items);
  const slecht = fit.filter((o) => isInWater(map, o.x, o.y) || inBuilding(o.x, o.y) || (o.kind !== 'lantaarn' && onGroundRoad(map, o.x, o.y, 0.2, { foot: true })) || (o.kind === 'lantaarn' && onGroundRoad(map, o.x, o.y, 0.1)));
  ok(slecht.length === 0, 'geen onderdeel staat op water, in een gebouw of op een weg', slecht.slice(0, 6).map((o) => o.kind + '@' + o.x + ',' + o.y).join(' | '));
  ok(fit.length >= items.length * 0.85, `minstens 85 procent van de aankleding vindt een vrije plek (${fit.length}/${items.length})`);
  ok(fit.every((o) => Math.hypot(o.x - items.find((q) => q.kind === o.kind && Math.hypot(q.x - o.x, q.y - o.y) <= 8.1).x, o.y - items.find((q) => q.kind === o.kind && Math.hypot(q.x - o.x, q.y - o.y) <= 8.1).y) <= 8.1), 'elk onderdeel schuift hooguit acht meter');
  ok(JSON.stringify(D.fitMonumentDecor(map, items)) === JSON.stringify(fit), 'de plekken zijn deterministisch (dezelfde tegels, dezelfde plekken)');
  ok(D.fitMonumentDecor(null, items).length === items.length, 'zonder kaart blijft het plan zoals het is');
  for (const [bx, by] of D.ANKERS.bolwerken) {
    const k = fit.filter((o) => o.kind === 'kanon' && Math.hypot(o.x - bx, o.y - by) < 16).length;
    ok(k >= 2, `bolwerk ${bx},${by}: minstens twee kanonnen op vrije grond`, String(k));
  }
  const aantal = (kind) => fit.filter((o) => o.kind === kind).length;
  ok(aantal('linde') >= 8, 'minstens acht van de veertien linden vinden een plek rond het plein', String(aantal('linde')));
  ok(aantal('lantaarn') >= 12, 'lantaarns langs de straten', String(aantal('lantaarn')));
  ok(aantal('bank') >= 2 && aantal('ton') >= 4 && aantal('vaandel') >= 2, 'banken, tonnen en vlaggen', JSON.stringify({ bank: aantal('bank'), ton: aantal('ton'), vaandel: aantal('vaandel') }));
  const plan = D.monumentDecorPlan('bourtange', fit);
  ok(plan.props.length === fit.length, 'het plan volgt de passende onderdelen');
  console.log(`  aankleding op de tegels: ${fit.length} van ${items.length} onderdelen: ${JSON.stringify(Object.fromEntries([...new Set(fit.map((o) => o.kind))].map((k) => [k, aantal(k)])))}`);
}

console.log(bad ? `monumentzone_test: ${bad} van ${n} controles mislukt` : `monumentzone_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
