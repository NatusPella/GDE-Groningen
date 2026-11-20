// Samen spelen (#983, #452): de bezorgronde met verdeelde adressen (game/js/bezorgteam.js en de koppeling in sidejob_bezorger.js).
//   node scripts/coop/bezorgteam_test.mjs
// Deel 1 is puur. Deel 2 draait de echte baan (sidejob_bezorger.js) op een platte testkaart met een nep-baancontext: alleen blijft het één
// adres (precies als voorheen), met één of meer meespelers heeft de bestelling meer adressen en is de ronde klaar als elk adres bezorgd is.
import '../node3d.mjs';
import assert from 'node:assert/strict';

const T = await import('../../game/js/bezorgteam.js');
const { doelEvent, leesBijbaan, BIJBAAN_REGELS } = await import('../../game/js/coopbijbaan.js');
const bezorger = (await import('../../game/js/sidejob_bezorger.js')).default;

let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); console.log('ok  ', naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL', naam, '\n    ' + (e.stack || e.message || e)); } };

const adres = (x, y, street = 'Teststraat', nr = 1) => ({ door: { x, y }, street, nr, who: 'Klant' });

// ---- deel 1: de regels
t('het aantal adressen groeit met de meespelers tot vier', () => {
  assert.equal(T.aantalAdressen(0), 1);
  assert.equal(T.aantalAdressen(1), 2);
  assert.equal(T.aantalAdressen(3), 4);
  assert.equal(T.aantalAdressen(9), 4);
  assert.equal(T.aantalAdressen(undefined), 1);
});

t('afvinken: een open adres is bezorgd zodra iemand binnen de straal staat; klaar als alles af is', () => {
  const l = T.maakLijst(adres(0, 0), [adres(100, 0), adres(200, 0)]);
  assert.equal(l.length, 3);
  assert.equal(T.klaar(l), false);
  let pos = [{ x: 100, y: 1 }]; // een bezorger staat bij het tweede adres
  const af = (p) => (door) => Math.min(...p.map((q) => Math.hypot(q.x - door.x, q.y - door.y)));
  assert.deepEqual(T.afvinken(l, af(pos), 3.2), [1]);
  assert.deepEqual(T.afvinken(l, af(pos), 3.2), [], 'een bezorgd adres telt niet dubbel');
  pos = [{ x: 0, y: 0 }, { x: 200, y: 0 }];
  assert.deepEqual(T.afvinken(l, af(pos), 3.2), [0, 2]);
  assert.equal(T.klaar(l), true);
  assert.equal(T.aantalKlaar(l), 3);
});

t('het dichtstbijzijnde open adres is de marker, de rest zijn puntjes, de regel noemt de rest', () => {
  const l = T.maakLijst(adres(0, 0, 'A-straat', 4), [adres(100, 0, 'B-straat', 8), adres(300, 0, 'C-straat', 12)]);
  assert.equal(T.dichtstbij(l, 90, 0), 1);
  assert.deepEqual(T.puntjes(l, 1), [{ x: 0, y: 0 }, { x: 300, y: 0 }]);
  assert.equal(T.andereAdressen(l, 1), 'Ook: A-straat 4 · C-straat 12');
  l[1].done = true;
  assert.equal(T.dichtstbij(l, 90, 0), 0);
  assert.equal(T.andereAdressen(l, 0), 'Ook: C-straat 12');
  l.forEach((a) => { a.done = true; });
  assert.equal(T.dichtstbij(l, 0, 0), null);
  assert.equal(T.andereAdressen(l, null), '');
});

t('loon en tijd schalen met de adressen; één adres is het oude loon en de oude tijd', () => {
  const een = T.maakLijst(adres(0, 0));
  assert.equal(T.basisMetAdressen(30, een), 30);
  assert.equal(T.budgetMetAdressen(60, een), 60);
  const drie = T.maakLijst(adres(0, 0), [adres(1, 0), adres(2, 0)]);
  assert.equal(T.basisMetAdressen(30, drie), 30 + 2 * T.EXTRA_BASIS);
  assert.equal(T.budgetMetAdressen(60, drie), 60 + 2 * T.EXTRA_TIJD_S);
  assert.equal(T.voortgang(4, een), 'Bestelling 4');
  assert.equal(T.voortgang(4, drie), 'Bestelling 4 · 0 van 3 bezorgd');
});

t('ongeldige adressen vallen weg en het maximum geldt', () => {
  const l = T.maakLijst(adres(0, 0), [null, { door: { x: NaN, y: 1 } }, ...Array.from({ length: 8 }, (_, i) => adres(i + 1, 0))]);
  assert.equal(l.length, T.TEAM_MAX);
});

t('de puntjes van de baan gaan mee in het doelbericht naar de gasten, alleen bij de bezorger', () => {
  const pub = { active: true, id: 'bezorger', label: 'Hap & Rap', marker: { x: 1, y: 2 }, dots: [{ x: 10.04, y: 20 }, { x: 30, y: 40 }, { x: 5, y: 5 }, { x: 6, y: 6 }], progress: 'Bestelling 1 · 0 van 3 bezorgd', goal: { label: 'Bezorgen: A 1', desc: 'Ook: B 2' }, timeLeft: 50, color: '#ff9a3c' };
  const e = doelEvent(pub);
  assert.equal(e.o.length, 3, 'hoogstens drie puntjes');
  const gelezen = leesBijbaan(JSON.parse(JSON.stringify(e)));
  assert.deepEqual(gelezen.dots, [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 5, y: 5 }]);
  assert.equal(doelEvent({ ...pub, id: 'krantenwijk' }).o, undefined, 'andere banen sturen niets extra');
  assert.deepEqual(leesBijbaan({ ...e, o: 'rommel' }).dots, []);
  assert.deepEqual(leesBijbaan({ ...e, o: [[1], ['a', 'b'], [3, 4]] }).dots, [{ x: 3, y: 4 }]);
  assert.match(BIJBAAN_REGELS.bezorger.hulp, /adressen/);
  assert.ok(BIJBAAN_REGELS.bezorger.hulp.length <= 160, 'past in het bericht');
});

// ---- deel 2: de echte baan op een platte kaart
const GEBOUW = (x, y) => ({ pts: [[x - 3, y - 3], [x + 3, y - 3], [x + 3, y + 3], [x - 3, y + 3], [x - 3, y - 3]] });
const KAART = {
  water: [], roads: [], tiles: [], meta: { bounds: null },
  nearestRoadPoint: (x, y) => ({ x, y, road: { name: 'Teststraat', cat: 'normal', pts: [[x - 5, y], [x + 5, y]] } }),
  buildingsNear: (x, y) => [GEBOUW(x + 8, y)],
  isOnBridge: () => false, escapeBuilding: (x, y) => [x, y], roadsNear: () => [], groundHeightAt: () => 0,
};
const ZAAK = { name: 'Testzaak', street: 'Teststraat', at: [0, 0], menu: ['patat'] };
function context({ helpers = null } = {}) {
  const meldingen = [], klaar = [];
  const world = {
    map: KAART, pedestrians: [], time: 0, weather: null, player: { x: 0, y: 0, angle: 0, inVehicle: null },
    coopHelpers: helpers ? () => helpers : null,
  };
  const c = {
    world, spot: { x: 0, y: 0 }, streak: 0, level: 1, data: { zaken: [{ ...ZAAK, door: { x: 0, y: 0, face: 0 } }, { ...ZAAK, name: 'Tweede zaak', door: { x: 50, y: 0, face: 0 } }], crashAt: -Infinity },
    vehicle: { x: 0, y: 0, speed: 0, angle: 0 }, timeLeft: 0,
    msg: (tekst) => meldingen.push(tekst), track: (x) => x, complete: (r) => klaar.push(r), fail() {}, skip() {},
  };
  return { c, world, meldingen, klaar };
}
// start een ronde, laat de bezorger de bestelling ophalen (staan bij de zaak) en geef de fase terug
function totDeliver(ctx) {
  const { c, world } = ctx;
  bezorger.round(c);
  const d = c.data;
  world.player.x = d.order.zaak.door.x; world.player.y = d.order.zaak.door.y;
  bezorger.update(0.1, c);
  assert.equal(d.phase, 'deliver', 'opgehaald');
  return d;
}

t('alleen: één adres, de ronde is klaar bij de deur, het oude loon', () => {
  const ctx = context();
  const d = totDeliver(ctx);
  assert.equal(d.team, null, 'geen teambestelling');
  assert.ok(ctx.meldingen.some((m) => /Opgehaald! Naar /.test(m)), 'het gewone bericht');
  ctx.world.player.x = d.order.door.x; ctx.world.player.y = d.order.door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(ctx.klaar.length, 1);
  const verwacht = 16 + d.order.dist / 22 + d.order.n * 3;
  assert.ok(Math.abs(ctx.klaar[0].base - verwacht) < 1e-9, 'basis is het oude loon');
});

t('een lege lijst meespelers is alleen: net zo', () => {
  const ctx = context({ helpers: [] });
  const d = totDeliver(ctx);
  assert.equal(d.team, null);
});

t('met één meespeler: twee adressen, beide moeten bezorgd, de ronde is dan klaar met een hoger basisloon', () => {
  const gast = { slot: 1, x: 5000, y: 5000 };
  const ctx = context({ helpers: [gast] });
  const d = totDeliver(ctx);
  assert.ok(d.team && d.team.length === 2, 'twee adressen');
  assert.ok(ctx.meldingen.some((m) => /2 adressen/.test(m)), 'de bezorgers horen dat er verdeeld wordt');
  const view = bezorger.view(ctx.c);
  assert.equal(view.dots.length, 1, 'het andere adres staat als puntje');
  assert.match(view.progress, /0 van 2 bezorgd/);
  // de gast loopt naar het tweede adres en geeft af: nog niet klaar
  gast.x = d.team[1].door.x; gast.y = d.team[1].door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(d.team[1].done, true);
  assert.equal(ctx.klaar.length, 0, 'het eerste adres wacht nog');
  assert.ok(ctx.meldingen.some((m) => /1 van 2/.test(m)));
  // de bezorger zelf geeft het eerste adres af: nu is het klaar
  ctx.world.player.x = d.order.door.x; ctx.world.player.y = d.order.door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(ctx.klaar.length, 1, 'beide adressen bezorgd: klaar');
  const een = 16 + d.order.dist / 22 + d.order.n * 3;
  assert.ok(Math.abs(ctx.klaar[0].base - (een + T.EXTRA_BASIS)) < 1e-9, 'een extra adres is een extra basisloon voor iedereen');
});

t('de bezorger kan ook eerst zijn eigen adres doen; de meespeler maakt de ronde af', () => {
  const gast = { slot: 1, x: 5000, y: 5000 };
  const ctx = context({ helpers: [gast] });
  const d = totDeliver(ctx);
  ctx.world.player.x = d.order.door.x; ctx.world.player.y = d.order.door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(ctx.klaar.length, 0, 'het tweede adres is er nog niet');
  assert.equal(d.mainDone, true);
  assert.ok(ctx.meldingen.some((m) => /Nog 1 adres\b/.test(m)));
  gast.x = d.team[1].door.x; gast.y = d.team[1].door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(ctx.klaar.length, 1);
});

t('vier spelers: vier adressen, wie wegvalt laat een adres voor de rest over', () => {
  const g1 = { slot: 1, x: 5000, y: 5000 }, g2 = { slot: 2, x: 5000, y: 5000 }, g3 = { slot: 3, x: 5000, y: 5000 };
  const helpers = [g1, g2, g3];
  const ctx = context({ helpers });
  const d = totDeliver(ctx);
  assert.equal(d.team.length, 4);
  // g1 en g2 doen hun adres, g3 valt weg (de lijst wordt korter); de bezorger loopt het derde adres zelf
  g1.x = d.team[1].door.x; g1.y = d.team[1].door.y;
  g2.x = d.team[2].door.x; g2.y = d.team[2].door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(T.aantalKlaar(d.team), 2);
  helpers.length = 2; // g3 valt weg
  ctx.world.player.x = d.team[3].door.x; ctx.world.player.y = d.team[3].door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(T.aantalKlaar(d.team), 3, 'de bezorger neemt het adres van de weggevallene');
  assert.equal(ctx.klaar.length, 0);
  ctx.world.player.x = d.order.door.x; ctx.world.player.y = d.order.door.y;
  bezorger.update(0.1, ctx.c);
  assert.equal(ctx.klaar.length, 1, 'en dan is de ronde klaar');
});

t('een nieuwe ronde begint zonder de adressen van de vorige', () => {
  const gast = { slot: 1, x: 5000, y: 5000 };
  const ctx = context({ helpers: [gast] });
  const d = totDeliver(ctx);
  assert.ok(d.team);
  bezorger.round(ctx.c);
  assert.equal(ctx.c.data.team, null);
  assert.equal(ctx.c.data.mainDone, false);
});

console.log(fails ? `bezorgteam_test: ${n - fails}/${n} ok, ${fails} mislukt` : `bezorgteam_test: ${n}/${n} ok`);
