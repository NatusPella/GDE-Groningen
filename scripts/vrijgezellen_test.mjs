// Vrijgezellenfeestjes (#403): de regels (vrijgezellen.js), het groepje dat streetlife.js neerzet, de hoedjes en het juichen in de figuur
// (models3d_people.js) en het waggelen.
//   node scripts/vrijgezellen_test.mjs
import './node3d.mjs';

const THREE = await import('three');
const V = await import('../game/js/vrijgezellen.js');
const SL = await import('../game/js/streetlife.js');
const P = await import('../game/js/models3d_people.js');
const { Pedestrian } = await import('../game/js/pedestrians.js');
const D = await import('../game/js/streetlifedata.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// --- het groepje -------------------------------------------------------------------------------------------------
{
  const rng = seeded(4);
  let ok = true, maten = new Set(), thema = new Set();
  for (let i = 0; i < 300; i++) {
    const g = V.maakGroep(rng);
    thema.add(g.thema);
    maten.add(g.leden.length);
    const [bruid, ...gasten] = g.leden;
    if (bruid.rol !== 'bruid' || bruid.look.top !== 'dress' || bruid.look.hat !== 'sluier' || bruid.clothing !== V.BRUID.clothing) ok = false;
    if (!gasten.length || gasten.some((x) => x.rol !== 'gast' || x.look.hat !== V.THEMAS[g.thema].hat || !/^#[0-9a-f]{6}$/i.test(x.clothing) || !Number.isFinite(x.side) || !(x.k >= 1))) ok = false;
    // de plekken van de gasten zijn verschillend (niemand loopt door een ander heen)
    const sleutels = gasten.map((x) => `${x.side}|${x.k}|${x.back}`);
    if (new Set(sleutels).size !== sleutels.length) ok = false;
  }
  check('een groepje heeft een bruid en gasten met het thema en eigen plekken', ok);
  check('de bruid met 3 of 4 gasten, alle drie de thema\'s komen voor', [...maten].sort().join() === '4,5' && thema.size === 3, [...maten].join() + ' ' + [...thema].join());
  check('niemand draagt een rugzak of tas', Array.from({ length: 50 }, () => V.maakGroep(seeded(Math.random() * 1e6 | 0)).leden).flat().every((x) => x.look.bag === null));
  check('een gekozen thema blijft zo', V.maakGroep(seeded(1), 'tutu').thema === 'tutu' && V.maakGroep(seeded(1), 'bestaatniet').thema !== 'bestaatniet');
  const tutu = V.maakGroep(seeded(2), 'tutu').leden[1];
  check('een tutu is een rok in een vrolijke kleur', tutu.look.bottom === 'skirt' && Number.isFinite(tutu.look.pants) && tutu.look.pants === tutu.look.skirtColor);
  check('hawaï heeft een zonnebril', V.maakGroep(seeded(3), 'hawaii').leden[1].look.glasses === true && V.maakGroep(seeded(3), 'konijn').leden[1].look.glasses === false);
}

// --- wanneer -------------------------------------------------------------------------------------------------------
{
  const kans = (wijk, d, h, wd) => V.vrijgezellenKans(wijk, d, h, wd);
  check('zaterdagavond in het centrum is de piek', kans('centrum', 100, 21, 6) > kans('centrum', 100, 15, 6) && kans('centrum', 100, 15, 6) > 0);
  check('doordeweeks overdag is er niets', kans('centrum', 100, 11, 2) === 0 && kans('centrum', 100, 21, 1) === 0 && kans('student', 300, 9, 3) === 0);
  check('vrijdag en zaterdag zijn gelijk, zondag stiller, donderdagavond een beetje', kans('centrum', 100, 20, 5) === kans('centrum', 100, 20, 6) && kans('centrum', 100, 15, 0) < kans('centrum', 100, 15, 6) && kans('student', 300, 21, 4) > 0 && kans('student', 300, 21, 4) < kans('student', 300, 21, 5));
  check('alleen centrum en studentenwijken', kans('chic', 300, 21, 6) === 0 && kans('standaard', 300, 21, 6) === 0 && kans('industrie', 300, 21, 6) === 0 && kans('centrum', 100, 21, 6) > kans('student', 100, 21, 6));
  check('niet in de polders of bij rare invoer', kans('centrum', 3000, 21, 6) === 0 && kans('centrum', NaN, 21, 6) === 0 && kans('centrum', 100, NaN, 6) === 0 && kans('centrum', 100, 21, -1) === 0);
  check('een of twee groepjes tegelijk', V.maxGroepjes(6, 21) === 2 && V.maxGroepjes(6, 15) === 1 && V.maxGroepjes(2, 12) === 1 && V.MAX_GROEPJES <= 2);
  // met de echte wijkprofielen van het verkeer: een kaart met één studentenbuurt op (0, 0)
  const map = { meta: { neighbourhoodPoints: [{ x: 0, y: 0, name: 'Paddepoel' }, { x: 9000, y: 9000, name: 'Vinkhuizen' }] } };
  let ja = 0, nee = 0;
  const r = seeded(8);
  for (let i = 0; i < 4000; i++) { if (SL.pickVrijgezellen(map, D.CENTRE.x, D.CENTRE.y, 21, 6, r)) ja++; if (SL.pickVrijgezellen(map, 9000, 9000, 21, 6, r)) nee++; }
  check('de keuze volgt de wijk en de avond: in het centrum vaak genoeg, ver weg nooit', ja > 100 && ja < 2500 && nee === 0, JSON.stringify({ ja, nee }));
}

// --- waggelen en juichen -----------------------------------------------------------------------------------------
{
  let max = 0, maxZij = 0, fin = true;
  for (let t = 0; t < 20; t += 0.05) { const w = V.waggel(t, 0.3, 1.2); if (!Number.isFinite(w.kantel) || !Number.isFinite(w.zij)) fin = false; max = Math.max(max, Math.abs(w.kantel)); maxZij = Math.max(maxZij, Math.abs(w.zij)); }
  check('waggelen blijft klein en eindig', fin && max > 0.05 && max <= V.WAGGEL.hoek + 1e-9 && maxZij > 0.05 && maxZij <= V.WAGGEL.zij + 1e-9, [max, maxZij]);
  const stil = V.waggel(1.3, 0.3, 0);
  check('wie stilstaat waggelt niet', stil.kantel === 0 && stil.zij === 0);
  check('twee figuren met een ander zaadje waggelen niet gelijk', V.waggel(2, 0.1, 1.2).kantel !== V.waggel(2, 0.6, 1.2).kantel);
  const r = seeded(1);
  const volgende = Array.from({ length: 200 }, () => V.volgendeJuich(100, r));
  check('om de 7 tot 16 s wordt er gejuicht', Math.min(...volgende) >= 107 && Math.max(...volgende) <= 116);
  const midden = V.juichSterkte(10.85, 10 + V.JUICH_DUUR), begin = V.juichSterkte(10.01, 10 + V.JUICH_DUUR), eind = V.juichSterkte(11.69, 10 + V.JUICH_DUUR);
  check('het juichen loopt zacht in en uit', midden === 1 && begin < 0.2 && eind < 0.2 && V.juichSterkte(12, 11.7) === 0 && V.juichSterkte(NaN, 5) === 0, [begin, midden, eind]);
  const h = V.juichHoek(3, 1);
  check('de armen gaan om en om omhoog', h.links > 2 && h.rechts > 2 && h.links !== h.rechts && h.spring >= 0 && h.spring <= 0.08);
}

// --- de teksten ----------------------------------------------------------------------------------------------------------
{
  const teksten = [V.BRUID_LINES, V.GAST_LINES, V.JUICH_LINES, Object.values(V.THEMAS).map((t) => t.naam)].flat();
  check('alleen Nederlands en geen merken of echte namen', teksten.every((t) => typeof t === 'string' && t.length > 3) && !/\b(the|and|you|party)\b/i.test(teksten.join(' ')) && !/heineken|bacardi|jägermeister|hawaiian tropic|ibiza|disney|barbie/i.test(teksten.join(' ')));
  check('vriendelijk: geen drank- of spotregels over de bruid', !/dronken|zat|bier|wodka|slet|dik|lelijk|drank/i.test(teksten.join(' ')));
  check('genoeg verschillende regels', V.BRUID_LINES.length >= 4 && V.GAST_LINES.length >= 5 && V.JUICH_LINES.length >= 4);
}

// --- het groepje in de wereld ---------------------------------------------------------------------------------------------
{
  const kaart = { buildingsNear: () => [], isInWater: () => false, roadsNear: () => [], meta: {} };
  const lead = new Pedestrian(10, 10, 0.5);
  const world = { map: kaart, time: 100, pedestrians: [] };
  const info = SL.zetVrijgezellenNeer(world, lead, 'konijn');
  check('de bruid is de leider en de gasten lopen met haar mee', lead.party && lead.party.rol === 'bruid' && info.groep.length >= 4 && info.groep.slice(1).every((g) => g.leader === lead && g.party.rol === 'gast' && g.pairK >= 1 && Number.isFinite(g.pairBack)), info.groep.length);
  check('alle leden hebben dezelfde groep, het thema en een eerste juichtijd', info.groep.every((m) => m.party.groep === info.groep && m.party.thema === 'konijn' && m.party.cheerAt > world.time));
  check('ze waggelen: trager en met een eigen zaadje', info.groep.every((m) => m.paceMul < 1 && m.paceMul >= 0.6 && Number.isFinite(m.waggelSeed)));
  check('de gasten staan niet op elkaar of op de bruid', info.groep.every((a, i) => info.groep.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) > 0.6)));
  check('de gasten zijn aan de wereld toegevoegd, de bruid doet de aanroeper', world.pedestrians.length === info.groep.length - 1 && !world.pedestrians.includes(lead));
  check('geen tas', info.groep.every((m) => m.hasBag === false));
}

// langs een muur: aan de kant van het gebouw staat niemand in de muur, de gasten staan aan de vrije kant
{
  const muur = { pts: [[0, 10.3], [40, 10.3], [40, 30], [0, 30]], bounds: [0, 10.3, 40, 30] };
  const kaart = { buildingsNear: () => [muur], isInWater: () => false, roadsNear: () => [], meta: {} };
  const lead = new Pedestrian(20, 10, 0);
  const world = { map: kaart, time: 0, pedestrians: [] };
  const info = SL.zetVrijgezellenNeer(world, lead, 'hawaii');
  check('langs een muur komen alle gasten toch mee en geen enkele staat in het gebouw', info.groep.length >= 4 && info.groep.every((m) => m.y < 10.3), info.groep.map((m) => m.y.toFixed(1)).join());
}

// --- de figuren ----------------------------------------------------------------------------------------------------------
{
  const bouw = (look, shirt = 0xcaa46a) => P.buildPersonMesh(shirt, 0xe0b48a, { seed: 5, variant: 'female', look });
  const hoekpunten = (m) => { let c = 0; m.traverse((o) => { if (o.geometry && o.geometry.attributes.position) c += o.geometry.attributes.position.count; }); return c; };
  const kaal = hoekpunten(bouw({ hat: null }));
  const metHoed = (hat) => hoekpunten(bouw({ hat, hatColor: 0xf4efe6 }));
  check('elk nieuw hoedje is echt getekend', ['krans', 'konijn', 'sluier', 'tiara'].every((h) => metHoed(h) > kaal), ['krans', 'konijn', 'sluier', 'tiara'].map((h) => metHoed(h) - kaal).join());
  const kleurIn = (m, hex) => { const want = new THREE.Color(hex); let hit = false; m.traverse((o) => { const c = o.geometry && o.geometry.attributes.color; if (!c) return; for (let i = 0; i < c.count && !hit; i++) if (Math.abs(c.getX(i) - want.r) < 0.01 && Math.abs(c.getY(i) - want.g) < 0.01 && Math.abs(c.getZ(i) - want.b) < 0.01) hit = true; }); return hit; };
  check('de krans heeft bloemen en blad, het kroontje goud, de ogen van de konijnoren roze', kleurIn(bouw({ hat: 'krans', hatColor: 0xff7a9a }), 0x3f8a3c) && kleurIn(bouw({ hat: 'tiara', hatColor: 0xf2c400 }), 0xf2c400) && kleurIn(bouw({ hat: 'konijn', hatColor: 0xf4efe6 }), 0xf2a6c0));
  const bruid = bouw(V.BRUID.look, 0xf6f3ec);
  check('de bruid draagt een jurk met een sluier', hoekpunten(bruid) > hoekpunten(bouw({ top: 'dress', bottom: 'dress', hat: null })) && kleurIn(bruid, 0xf8f6f0));
  // het juichen zet de armen omhoog en laat de figuur even springen
  const m = bouw({ hat: null });
  P.animatePersonWalk(m, 1.2, 0.1);
  const voor = m.userData.armR.rotation.z;
  m.position.y = 0;
  P.juichOverlay(m, 1, 2.5, 2.5, 0.05, 1);
  check('juichen: armen omhoog, een sprongetje', m.userData.armR.rotation.z > 2 && m.userData.armL.rotation.z > 2 && m.userData.armR.rotation.z > voor && Math.abs(m.position.y - 0.05) < 1e-9);
  const m2 = bouw({ hat: null });
  P.animatePersonWalk(m2, 1.2, 0.1);
  const z0 = m2.userData.armR.rotation.z;
  P.juichOverlay(m2, 1, 2.5, 2.5, 0.05, 0);
  check('juichen met sterkte 0 doet niets', m2.userData.armR.rotation.z === z0 && m2.position.y === 0);
}

console.log(bad ? `${bad} van ${n} mislukt` : `vrijgezellen_test: alles goed (${n} controles)`);
process.exit(bad ? 1 : 0);
