// #955: de aankleding van een missie (missiedecor.js): de naspeling in Bourtange
// (tenten, kartonnen kanonnen, figuranten en publiek) en het erf van Tinus
// (trekker, balen, kisten en vrienden). De opstelling is puur; het bouwen
// gebeurt in een eigen THREE.Scene.
//   node scripts/missiedecor_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const { dressingPlan, buildMissionDressing, updateMissionDressing, disposeMissionDressing, DRESSING_KINDS, spoorHoek } = await import('../game/js/missiedecor.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// --- #955 (M19): het perron staat langs het spoor, niet erop ----------------------------------
const rails = [{ pts: [[0, 0], [100, 0]] }, { pts: [[0, 40], [60, 100]] }];
ok(spoorHoek(rails, 30, 3) === 0, 'het spoor langs de x-as geeft hoek 0', String(spoorHoek(rails, 30, 3)));
ok(Math.abs(spoorHoek([{ pts: [[0, 0], [0, 100]] }], 2, 50) - Math.PI / 2) < 1e-9, 'een spoor langs de y-as geeft een kwartslag');
ok(Math.abs(spoorHoek([{ pts: [[50, 0], [0, 0]] }], 25, 1)) < 1e-9, 'de rijrichting maakt niet uit (hoek mod pi)');
ok(spoorHoek(rails, 30, 200) === null && spoorHoek([], 0, 0) === null && spoorHoek(null, 0, 0) === null, 'geen spoor in de buurt: null');
ok(Math.abs(spoorHoek(rails, 40, 80) - Math.atan2(60, 60)) < 1e-9, 'het dichtstbijzijnde van twee sporen wint');
{
  // het perron met de hoek van het spoor: geen prop of persoon binnen 2,2 m van de rails (met de kijkrichting van de speler wel)
  const a = spoorHoek([{ pts: [[0, 0], [100, 0]] }], 30, 0);
  const plan = dressingPlan('perron');
  const afstand = (q, hoek) => Math.abs(-Math.sin(hoek) * q.along + Math.cos(hoek) * q.side);
  const items = [...plan.props, ...plan.people];
  ok(items.every((q) => afstand(q, a) > 2.2), 'langs het spoor staat niets op de rails', items.map((q) => afstand(q, a).toFixed(1)).join(' '));
}
ok(fs.readFileSync(new URL('../game/js/missions_akte45.js', import.meta.url), 'utf8').includes('dressingAlongRail: true'), 'M19 zet het perron langs het spoor');

// #503/#955: het spandoek (signBothSides) heeft geen dubbelzijdig materiaal: dat liet de tekst van achteren gespiegeld zien
ok(!/signBothSides\([^;]*DoubleSide/.test(fs.readFileSync(new URL('../game/js/missiedecor.js', import.meta.url), 'utf8')), 'het spandoek van het plein staat niet gespiegeld');

// --- de plannen --------------------------------------------------------------
ok(DRESSING_KINDS.includes('naspeling') && DRESSING_KINDS.includes('schuur'), 'twee soorten aankleding');
ok(dressingPlan('onbekend') === null, 'een onbekende soort bestaat niet');
for (const kind of DRESSING_KINDS) {
  const p = dressingPlan(kind);
  ok(!!p, kind + ': een plan');
  ok(Array.isArray(p.props) && p.props.length >= 4, kind + ': genoeg props', String(p.props.length));
  ok(Array.isArray(p.people) && p.people.length >= 3, kind + ': figuranten', String(p.people.length));
  for (const q of p.props) ok(Number.isFinite(q.along) && Number.isFinite(q.side), kind + ': proppositie is een getal');
  for (const q of p.people) ok(Number.isFinite(q.along) && Number.isFinite(q.side) && q.look && Number.isFinite(q.look.seed), kind + ': figurantpositie en seed');
  // niets op de plek waar de speler staat of in de stage-cirkel
  ok([...p.props, ...p.people].every((q) => Math.hypot(q.along, q.side) > 4), kind + ': alles staat buiten de stage-cirkel');
}

const nas = dressingPlan('naspeling');
ok(nas.props.some((p) => p.kind === 'tent') && nas.props.some((p) => p.kind === 'kanon') && nas.props.some((p) => p.kind === 'banner'), 'de naspeling heeft tenten, kanonnen en een doek');
ok(nas.people.length >= 8, 'de naspeling heeft kostuumacteurs en publiek', String(nas.people.length));
ok(nas.props.filter((p) => p.kind === 'kanon').length >= 2, 'minstens twee kartonnen kanonnen');
const schuur = dressingPlan('schuur');
ok(schuur.props.some((p) => p.kind === 'tractor') && schuur.props.some((p) => p.kind === 'baal'), 'het erf heeft een trekker en balen');
ok(schuur.people.length >= 3, 'er staan vrienden op het erf');

// --- bouwen en opruimen ------------------------------------------------------
function nanCount(group) {
  let bad = 0;
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) if (!Number.isFinite(a.getX(i)) || !Number.isFinite(a.getY(i)) || !Number.isFinite(a.getZ(i))) { bad++; break; }
    const p = o.getWorldPosition(new THREE.Vector3());
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) bad++;
  });
  return bad;
}
for (const kind of DRESSING_KINDS) {
  const scene = new THREE.Scene();
  const world = { map: { groundHeightAt: (x, y) => Math.sin(x * 0.03) * 0.7 } };
  const set = buildMissionDressing(world, kind, { x: 100, y: -50, a: 0.7 }, scene);
  ok(!!set && set.kind === kind, kind + ': de set bouwt');
  ok(set.group.parent === scene, kind + ': de set hangt in de scène');
  ok(set.group.children.length >= 8, kind + ': de set heeft inhoud', String(set.group.children.length));
  ok(nanCount(set.group) === 0, kind + ': geen NaN in de set');
  updateMissionDressing(set, 0.1);
  updateMissionDressing(set, 0.1);
  ok(set.t > 0.19, kind + ': de figuranten leven');
  disposeMissionDressing(set);
  ok(set.group.parent === null && scene.children.length === 0, kind + ': de set gaat weer weg');
}
{
  const scene = new THREE.Scene();
  const set = buildMissionDressing({ map: { groundHeightAt: () => 0 } }, 'onbekend', { x: 0, y: 0 }, scene);
  ok(set === null && scene.children.length === 0, 'een onbekende soort bouwt niets');
}

// #955: onderdelen op water of in een gebouw vervallen of schuiven naar het doel (M30: 2 van 5 in een gracht, 2 in een huis)
{
  const SQ = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const tel = (set) => set.props.filter((q) => !q.tex).length + set.people.length;
  const kaal = buildMissionDressing({ map: { groundHeightAt: () => 0 } }, 'naspeling', { x: 0, y: 0, a: 0 }, new THREE.Scene());
  const alles = buildMissionDressing({ map: { groundHeightAt: () => 0, buildingsNear: () => [{ pts: SQ(-1e5, -1e5, 1e5, 1e5) }] } }, 'naspeling', { x: 0, y: 0, a: 0 }, new THREE.Scene());
  ok(tel(kaal) > 4, 'zonder gebouwen staan alle onderdelen er', String(tel(kaal)));
  ok(tel(alles) === 0, 'staat alles in een gebouw, dan vervallen de onderdelen', String(tel(alles)));
  // een huis alleen op x van 8 tot 40: wat er stond verschuift naar het doel of vervalt, niets staat nog in het huis
  const huis = { pts: SQ(8, -40, 40, 40) };
  const deels = buildMissionDressing({ map: { groundHeightAt: () => 0, buildingsNear: () => [huis] } }, 'naspeling', { x: 0, y: 0, a: 0 }, new THREE.Scene());
  let binnen = 0;
  deels.group.updateMatrixWorld(true);
  for (const c of deels.group.children) { const p = c.getWorldPosition(new THREE.Vector3()); if (p.x > 8 && p.x < 40 && p.z > -40 && p.z < 40) binnen++; }
  ok(tel(deels) > 0, 'een deel van de onderdelen blijft staan', String(tel(deels)));
  ok(binnen === 0, 'geen onderdeel in het huis', String(binnen));
}

// --- de missies en de missielus ---------------------------------------------
const m4 = fs.readFileSync(new URL('../game/js/missions_akte4.js', import.meta.url), 'utf8');
const m5 = fs.readFileSync(new URL('../game/js/missions_akte5.js', import.meta.url), 'utf8');
const mj = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok((m4.match(/dressing: 'naspeling'/g) || []).length >= 5, 'M20 kleedt de wallen, de gracht en de poort aan', String((m4.match(/dressing: 'naspeling'/g) || []).length));
ok(/label: 'Kijk naar de naspeling: het publiek klapt'/.test(m4) && /kind: 'hold', dressing: 'naspeling'/.test(m4), 'de Bourtange-missie eindigt met een naspeling');
ok(/dressing: 'schuur'/.test(m5) && /Een luik erin/.test(m5), 'M22 kleedt het erf van Tinus aan');
ok(/buildMissionDressing\(world, st\.dressing/.test(mj), 'de missielus bouwt de aankleding');
ok(/updateMissionDressing\(S\.dressing, dt\)/.test(mj), 'de missielus laat de figuranten leven');
ok(/disposeMissionDressing\(S\.dressing\)/.test(mj), 'de aankleding gaat mee met de stap');
// #962: een verhaalstap zonder QTE kan zijn gevolg als tag meegeven
ok(/if \(cur && cur\.tag\)/.test(mj), 'een gewone stap kan een tag geven (#962)');

console.log(fails ? `${fails} van ${n} mislukt` : `missiedecor_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
