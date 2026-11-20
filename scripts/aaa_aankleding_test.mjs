// AAA-aankleding zonder nieuwe assets (AAA-upgradeplan, ronde 3): de eierkratten achterop (M09), de afstandsmeter van de limo
// (M10), Oma Trijntje als figuur (M08), de weegbrug en de kippende oplegger (A1), de kruitkelder-binnenset (M20) en de
// aankomst bij het volgende perron (M19). Gedrag, geen bronregex; zelfde opzet als akte2_aaa_test.mjs en akte45_aaa_test.mjs.
//   node scripts/aaa_aankleding_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const mem = new Map();
const ECHT = /^gde-(save-v1|settings|prestaties-v1)$/;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => { assert.ok(!ECHT.test(k), `test leest echte opslag: ${k}`); return mem.has(k) ? mem.get(k) : null; },
    setItem: (k, v) => { assert.ok(!ECHT.test(k), `test schrijft echte opslag: ${k}`); mem.set(k, String(v)); },
    removeItem: (k) => { assert.ok(!ECHT.test(k), `test wist echte opslag: ${k}`); mem.delete(k); },
    clear: () => mem.clear(),
  },
});
const { buildAkte2Defs, applyAkte2 } = await import('../game/js/missions_akte2.js');
const P = await import('../game/js/akte2_plan.js');
const B = await import('../game/js/bietenhal.js');
const R = await import('../game/js/roomspec.js');
const { aankomstNodig, AANKOMST_AFSTAND } = await import('../game/js/stagerit.js');
const { dressingPlan } = await import('../game/js/missiedecor.js');
const { wijzerVorm } = await import('../game/js/regelwidget.js');
const { TRACTOR_MODEL } = await import('../game/js/vehicle.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { STAGE_SETS } = await import('../game/js/stagesets.js');
const { crowdPlan } = await import('../game/js/crowdplan.js');
const { applyAkte45 } = await import('../game/js/missions_akte45.js');
const { applyAkte6 } = await import('../game/js/missions_akte6.js');
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.message || e)); } };

// ---- M09: de kratten achterop ---------------------------------------------------------------------------------------------
t('M09: Geesjes trekker krijgt zes kratten, zonder de gedeelde TRACTOR_MODEL aan te passen', () => {
  const defs = buildAkte2Defs({ models: { tractor: TRACTOR_MODEL, quad: TRACTOR_MODEL } });
  const m09 = defs.find((d) => d.label === 'Heel aankomen is ook een kunst');
  assert.equal(m09.vehicleModel.kratten, 6);
  assert.equal(m09.vehicleModel.name, 'tractor');
  assert.equal(TRACTOR_MODEL.kratten, undefined, 'het gedeelde model blijft schoon');
  assert.equal(m09.eggs.count, 60, 'de eierregels blijven');
});

t('M09: de trekker met kratten is meer geometrie dan de gewone trekker, en een gewone trekker verandert niet', () => {
  const tel = (model) => {
    const m = buildVehicleMesh({ model, wrecked: false, id: 1, isBike: false, speed: 0 });
    const body = m.userData.body || m.children[0];
    return body.geometry.attributes.position.count;
  };
  const gewoon = tel({ ...TRACTOR_MODEL }), met = tel({ ...TRACTOR_MODEL, kratten: 6 }), drie = tel({ ...TRACTOR_MODEL, kratten: 3 });
  assert.ok(met > gewoon, `met kratten ${met} > ${gewoon}`);
  assert.ok(drie > gewoon && drie < met, 'drie kratten zit ertussen');
  assert.equal(tel({ ...TRACTOR_MODEL }), gewoon, 'dezelfde trekker blijft dezelfde (cache per aantal)');
});

// ---- M10: de afstandsmeter --------------------------------------------------------------------------------------------------
t('M10: de limo-wijzer knippert binnen de eerste ring (12 m) en wijst achter je', () => {
  const ringen = [12, 30, 80];
  const dichtbij = wijzerVorm({ afstand: 9, hoek: Math.PI, ringen, label: 'Limo achter je' });
  assert.equal(dichtbij.stand, 'dichtbij');
  assert.equal(dichtbij.anim, 'knipper');
  assert.match(dichtbij.alt, /Limo achter je: 10 m/);
  const ver = wijzerVorm({ afstand: 70, hoek: Math.PI, ringen, label: 'Limo achter je' });
  assert.equal(ver.stand, 'ok');
  assert.equal(ver.ring, 2);
  assert.match(ver.kant, /achter/);
  assert.equal(wijzerVorm({ afstand: NaN, hoek: 0, ringen }).verborgen, true, 'kapotte invoer toont niets');
});

// ---- M08: Oma Trijntje ------------------------------------------------------------------------------------------------------
t('M08: Oma Trijntje staat als figuur aan het eind van de wandeling, met haar bun en een bank', () => {
  const lijst = [{ label: 'Fatbikes tellen niet als fiets', intro: [], stages: [] }];
  applyAkte2(lijst);
  assert.equal(lijst[0].eindDressing, 'trijntje');
  const plan = dressingPlan('trijntje');
  assert.ok(plan, 'het plan is aangemeld');
  assert.equal(plan.people.length, 1);
  const oma = plan.people[0];
  assert.equal(oma.look.variant, 'female');
  assert.equal(oma.look.hairStyle, 'bun');
  assert.equal(oma.look.extra.age, 'old');
  assert.equal(oma.anim, 'wave');
  assert.ok(Math.abs(Math.abs(oma.a) - Math.PI) < 1e-9, 'ze kijkt de speler tegemoet');
  assert.ok(plan.props.some((p) => p.kind === 'bank'));
  // buiten de stage-cirkel van 4,5 m rond het doel blijft er ruimte om te lopen: de figuur staat er niet middenin
  assert.ok(Math.hypot(oma.along, oma.side) > 3, 'niet op de markering zelf');
  applyAkte2([{ label: 'Fatbikes tellen niet als fiets', intro: [], stages: [] }]); // een tweede keer meldt niets dubbel
  assert.equal(dressingPlan('trijntje').people.length, 1);
});

// ---- A1: weegbrug en oplegger -------------------------------------------------------------------------------------------------
t('A1: de weegbrug en de oplegger staan 8,5 m van de hoop, aan weerszijden van de aanrijroute', () => {
  const hoop = { x: 100, y: 200 };
  const plan = B.weegPlan(hoop, 0);
  assert.ok(plan.weegbrug && plan.oplegger);
  for (const p of [plan.weegbrug, plan.oplegger]) assert.ok(Math.abs(Math.hypot(p.x - hoop.x, p.y - hoop.y) - B.WEEG_AFSTAND) < 1e-9);
  assert.ok(plan.weegbrug.y > hoop.y && plan.oplegger.y < hoop.y, 'aan weerszijden van de aanrijroute (+x)');
  assert.equal(plan.clear.length, 2);
  assert.equal(B.weegPlan(null, 0), null);
  assert.equal(B.weegPlan({ x: NaN, y: 0 }, 0), null);
});

t('A1: een plek in water of gebouw schuift op of valt weg; zonder enige vrije plek geen plan', () => {
  const hoop = { x: 0, y: 0 };
  assert.equal(B.weegPlan(hoop, 0, () => false), null);
  const enkel = B.weegPlan(hoop, 0, (x, y) => y <= 0); // alles aan de +y-kant is water: de weegbrug (die daar staat) valt weg
  assert.equal(enkel.weegbrug, null);
  assert.ok(enkel.oplegger && enkel.oplegger.y < 0);
  assert.equal(enkel.clear.length, 1);
});

t('A1: de bak kantelt vloeiend naarmate de trekker nadert: nul ver weg, vol dichtbij, nooit teruglopend', () => {
  assert.equal(B.kantelStand(500), 0);
  assert.equal(B.kantelStand(B.KANTEL.van), 0);
  assert.equal(B.kantelStand(B.KANTEL.tot), 1);
  assert.equal(B.kantelStand(0), 1);
  let vorige = 0;
  for (let d = B.KANTEL.van; d >= 0; d -= 1) { const s = B.kantelStand(d); assert.ok(s >= vorige - 1e-12, 'monotoon bij ' + d); vorige = s; }
  assert.equal(B.kantelStand(NaN), 0);
});

t('A1: het publiek bij de hoop blijft uit de buurt van de weegbrug en de oplegger', () => {
  const hoop = { x: 0, y: 0 };
  const plan = B.weegPlan(hoop, 0);
  const spec = P.hoopPubliek(hoop, 0, plan.clear);
  assert.equal(spec.clear.length, 2);
  const uit = crowdPlan(spec, () => true);
  assert.ok(uit.members.length > 0, 'er is een publiek');
  for (const q of uit.members) for (const c of plan.clear) assert.ok(Math.hypot(q.x - c.x, q.y - c.y) >= c.r - 1e-6, 'niemand in de cirkel van de weegbrug of oplegger');
  assert.deepEqual(P.hoopPubliek(hoop, 0).clear, [], 'zonder weegplan blijft het publiek zoals het was');
});

// ---- M20: de kruitkelder ---------------------------------------------------------------------------------------------------------
t('M20: de kruitkelder is een kamer: meubels, figuren en speler passen, de deur staat voor de speler', () => {
  assert.ok(R.isRoomKind('kruitkelder') && STAGE_SETS.includes('kruitkelder'));
  const spec = R.ROOMS.kruitkelder;
  assert.deepEqual(R.roomFit('kruitkelder', R.roomPeoplePoints('kruitkelder')), []);
  const deur = spec.furniture.find((f) => f.kind === 'deur');
  assert.ok(deur.u > spec.player.u, 'de speler kijkt naar +u: de deur staat voor hem');
  assert.ok(spec.furniture.filter((f) => f.kind === 'kruitton').length >= 3, 'kruittonnen');
  assert.ok(spec.furniture.some((f) => f.kind === 'kist'), 'de kist met de bal');
  assert.deepEqual(spec.npcs.map((q) => q.key).sort(), ['mem', 'trijntje']);
});

t('M20: de drie deurstappen spelen in de kruitkelder, de wal en de scène niet', () => {
  const lijst = [{ label: 'Het beleg van Bourtange', stages: [
    { kind: 'goto', label: 'Naar de wallen van de vesting' },
    { kind: 'hold', label: 'Verdedig de westwal tegen het beleg' },
    { kind: 'hold', label: 'Houd de eerste deur tegen Jelles mannen' },
    { kind: 'hold', label: 'Houd de tweede deur tegen' },
    { kind: 'goto', label: 'Ren naar de derde deur: de laatste' },
    { kind: 'hold', label: 'Houd de derde deur tegen' },
  ] }];
  applyAkte45(lijst);
  const sets = lijst[0].stages.map((s) => s.set || null);
  assert.deepEqual(sets, [null, null, 'kruitkelder', 'kruitkelder', null, 'kruitkelder']);
});

// ---- M27: de woonkamer ---------------------------------------------------------------------------------------------------------------
t('M27: de drie inpakstappen spelen in de woonkamer met Willemien; de bus en de scène niet', () => {
  const lijst = [{ label: 'Inpakken', stages: [
    { kind: 'hold', label: 'Pak de boeken in kleine dozen' },
    { kind: 'hold', label: 'Pak het servies in de krant' },
    { kind: 'scene', label: 'Een foto in de la' },
    { kind: 'hold', label: 'Zet de kat in de mand' },
    { kind: 'goto', label: 'Draag de laatste doos naar de verhuisbus' },
  ] }];
  applyAkte6(lijst);
  assert.deepEqual(lijst[0].stages.map((s) => s.set || null), ['woonkamer', 'woonkamer', null, 'woonkamer', null]);
  assert.ok(lijst[0].stages.filter((s) => s.set).every((s) => s.setVariant === 'inpakken'));
  const v = R.ROOMS.woonkamer.varianten.inpakken;
  assert.deepEqual(v.map((q) => q.key), ['willemien']);
  assert.deepEqual(R.roomFit('woonkamer', [{ ...R.ROOMS.woonkamer.player, id: 'speler' }, ...v.map((q) => ({ u: q.u, v: q.v, id: q.key }))]), [], 'speler en Willemien passen');
});

// ---- M19: de aankomst ----------------------------------------------------------------------------------------------------------------
t('M19: de aankomst (stoomfluit en perron) komt één keer, binnen 150 m van het volgende perron', () => {
  assert.equal(AANKOMST_AFSTAND, 150);
  const R1 = { aankomst: false };
  assert.equal(aankomstNodig(R1, 800), false);
  assert.equal(aankomstNodig(R1, 150), true);
  R1.aankomst = true;
  assert.equal(aankomstNodig(R1, 40), false, 'nooit twee keer');
  assert.equal(aankomstNodig(null, 10), false);
  assert.equal(aankomstNodig({}, NaN), false);
});

console.log(fails ? `\naaa_aankleding_test: ${fails} van ${n} mislukt` : `\naaa_aankleding_test: ${n} controles ok`);
