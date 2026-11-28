// Samen spelen op het water (#1376, W6): De Drie Zusters met een bemanning. Pure test: de regel in coopbijbaan.js, de rollen en de hulp uit
// binnenvaartrules.js, en de baan zelf (sidejob_binnenvaart.js) zonder wereld, met een nep-context.
//   node scripts/coop/binnenvaartcrew_test.mjs
import assert from 'node:assert/strict';
import '../node3d.mjs';
// de baan laadt three van een CDN: node3d.mjs moet eerst, dus de game-modules komen dynamisch
const B = await import('../../game/js/coopbijbaan.js');
const R = await import('../../game/js/binnenvaartrules.js');
const { binnenvaart } = await import('../../game/js/sidejob_binnenvaart.js');
const { vakVanBaan } = await import('../../game/js/loopbaan.js');

let n = 0;
const t = (name, f) => { f(); n++; };

// --- de regel -------------------------------------------------------------------------------------------------------------------------------

t('de regel: een gast is bemanning, hulp met E, volgt het schip; de baan hoort bij het vak Water', () => {
  const r = B.BIJBAAN_REGELS.binnenvaart;
  assert.ok(r && r.rol === 'bemanning' && r.actie === true && r.positie === false);
  assert.match(r.hulp, /laden en lossen/);
  assert.match(r.hulp, /\{E\}/);
  assert.equal(B.bijbaanMetCoop('binnenvaart'), true);
  assert.equal(vakVanBaan('binnenvaart'), 'water');
  assert.ok(!/gastheer/i.test(r.hulp), 'in het spel heet het "wie het spel opende"');
});

t('de rollen: de stuurman vaart, de eerste meespeler is dekhulp, de tweede gids, de rest bemanning', () => {
  assert.deepEqual(R.bemanningVan([3, 1, 2, 4], 0), { 0: 'stuurman', 3: 'dekhulp', 1: 'gids', 2: 'bemanning', 4: 'bemanning' }, 'in de volgorde van melden');
  assert.deepEqual(R.bemanningVan([], 0), { 0: 'stuurman' });
  assert.deepEqual(R.bemanningVan([0, 0, 5], 0), { 0: 'stuurman', 5: 'dekhulp' }, 'de stuurman niet dubbel, dubbele meldingen tellen één keer');
  assert.deepEqual(R.bemanningVan(null, 0), { 0: 'stuurman' });
  for (const rol of [...R.ROLLEN, 'bemanning']) assert.ok(R.ROL_TEKST[rol].length > 15, rol);
});

// --- de hulp aan de kade en onder het varen --------------------------------------------------------------------------------------------------

const nepContext = (extra = {}) => {
  const kade = R.kadeById(R.THUIS).water;
  const log = { msgs: [], done: null, failed: null };
  const c = {
    level: 1, streak: 0, round: 0, data: {}, world: undefined, vehicle: { x: kade.x, y: kade.y, vx: 0, vy: 0, speed: 0, angle: 0 },
    msg: (m) => log.msgs.push(m), complete: (r) => { log.done = r; }, fail: (w) => { log.failed = w; }, ...extra,
  };
  binnenvaart.round(c);
  return { c, log, kade };
};

t('een dekhulp helpt aan de kade met E: laden gaat sneller, alleen dichtbij en bij stilliggen', () => {
  const { c, log, kade } = nepContext();
  const s = c.data.overtocht;
  assert.equal(s.fase, 'laden');
  const voor = s.ladenS - s.wacht;
  assert.equal(binnenvaart.helperActie(c, { slot: 1, x: kade.x + 5, y: kade.y }), true);
  assert.ok(s.ladenS - s.wacht < voor, 'de resterende laadtijd daalt');
  assert.ok(log.msgs.some((m) => /dekhulp pakt mee/.test(m)), 'de eerste meespeler heet dekhulp');
  assert.equal(binnenvaart.helperActie(c, { slot: 2, x: kade.x + 500, y: kade.y }), false, 'te ver weg: geen hulp');
  c.vehicle.speed = 4;
  assert.equal(binnenvaart.helperActie(c, { slot: 1, x: kade.x, y: kade.y }), false, 'een varend schip kan niet geladen worden');
  c.vehicle.speed = 0;
  // helpen tot het laden klaar is: daarna gaat het schip varen
  for (let i = 0; i < 30; i++) binnenvaart.helperActie(c, { slot: 1, x: kade.x, y: kade.y });
  binnenvaart.update(0.5, c);
  assert.equal(s.fase, 'varen', 'de lading is aan boord');
});

t('een gids vertelt onder het varen met E: één keer per overtocht, extra fooi voor iedereen', () => {
  const { c, kade } = nepContext();
  const s = c.data.overtocht;
  for (let i = 0; i < 40 && s.fase === 'laden'; i++) binnenvaart.update(1, c);
  assert.equal(s.fase, 'varen');
  assert.equal(binnenvaart.helperActie(c, { slot: 1, x: kade.x, y: kade.y }), true, 'de eerste E onder het varen telt');
  assert.equal(binnenvaart.helperActie(c, { slot: 1, x: kade.x, y: kade.y }), false, 'hoogstens één keer per overtocht');
  const naar = R.kadeById(s.naar).water;
  c.vehicle.x = naar.x; c.vehicle.y = naar.y;
  const log = { done: null };
  c.complete = (r) => { log.done = r; };
  for (let i = 0; i < 40 && !log.done; i++) binnenvaart.update(1, c);
  assert.ok(log.done && log.done.tip >= R.GIDS_FOOI, 'de fooi bevat de gidsfooi');
  // zonder gids is er geen gidsfooi
  const zonder = R.maakOvertocht('rustpunt-oost', 1); zonder.klaar = true; zonder.t = zonder.budget * 0.5;
  assert.equal(R.uitslagVan(zonder).tip, 35);
  zonder.verteld = true;
  assert.equal(R.uitslagVan(zonder).tip, 35 + R.GIDS_FOOI);
});

t('de dekhulp en de gids helpen niet buiten hun moment, en een lege of rare context geeft false', () => {
  assert.equal(R.helpAanKade(null), null);
  assert.equal(R.vertelAanBoord(null), false);
  const s = R.maakOvertocht('rustpunt-oost', 1);
  assert.equal(R.vertelAanBoord(s), false, 'niet tijdens het laden');
  s.fase = 'varen';
  assert.equal(R.helpAanKade(s), null, 'niet tijdens het varen');
  assert.equal(R.vertelAanBoord(s), true);
  const { c } = nepContext();
  assert.equal(binnenvaart.helperActie(c, null), false);
  assert.equal(binnenvaart.helperActie(c, { slot: 1, x: NaN, y: 0 }), false);
  assert.equal(binnenvaart.helperActie({ data: {} }, { slot: 1, x: 0, y: 0 }), false, 'zonder overtocht geen hulp');
});

// --- voor anker bij wegvallen van de stuurman -----------------------------------------------------------------------------------------------

t('is de stuurman van het roer, dan ligt het schip voor anker: de overtocht staat stil en mislukt niet; terug aan het roer gaat hij verder', () => {
  const speler = { inVehicle: null };
  const { c, log } = nepContext({ world: { player: speler, lokaalLichaam: speler } });
  const s = c.data.overtocht;
  speler.inVehicle = c.vehicle;
  binnenvaart.update(1, c);
  const t1 = s.t;
  assert.ok(t1 > 0, 'aan het roer loopt de tijd');
  speler.inVehicle = null; // de stuurman is weg van het roer
  for (let i = 0; i < 600; i++) binnenvaart.update(1, c);
  assert.equal(s.anker, true);
  assert.equal(s.t, t1, 'er verstrijkt niets: geen verlies, geen time-out');
  assert.equal(s.mislukt, false);
  assert.equal(log.failed, null);
  assert.equal(log.msgs.filter((m) => /voor anker/.test(m)).length, 1, 'de melding komt één keer');
  speler.inVehicle = c.vehicle;
  binnenvaart.update(1, c);
  assert.equal(s.anker, false);
  assert.ok(s.t > t1, 'de overtocht gaat verder');
  assert.ok(log.msgs.some((m) => /Anker op/.test(m)));
  // voor het aan boord gaan ligt het schip niet voor anker: de speler loopt eerst naar de kade
  const nog = { inVehicle: null };
  const vers = nepContext({ world: { player: nog, lokaalLichaam: nog } });
  binnenvaart.update(1, vers.c);
  assert.equal(vers.c.data.overtocht.anker, false);
});

t('voor anker kan alleen een lopende overtocht, en stapOvertocht doet dan niets', () => {
  const s = R.maakOvertocht('rustpunt-oost', 1);
  assert.equal(R.zetAnker(s, true), true);
  assert.deepEqual(R.stapOvertocht(s, { x: 0, y: 0, speed: 0 }, 5), []);
  assert.equal(s.t, 0);
  assert.equal(R.zetAnker(s, false), true);
  s.klaar = true;
  assert.equal(R.zetAnker(s, true), false, 'een afgeronde overtocht ligt niet voor anker');
  assert.equal(R.zetAnker(null, true), false);
});

// --- de beloning, wegvallen en later aansluiten ---------------------------------------------------------------------------------------------

t('elke deelnemer krijgt de volle beloning per levering, één keer; wie wegvalt houdt wat hij kreeg; wie later komt kijkt mee tot de volgende baan', () => {
  const st = B.maakBijbaan(0);
  const uit = B.beginBijbaan(st, 'binnenvaart', 'De Drie Zusters', [1, 2, 3]);
  assert.deepEqual(uit.map((u) => u.slot), [1, 2, 3]);
  assert.ok(B.antwoordBijbaan(st, 1, true) && B.antwoordBijbaan(st, 2, true) && B.antwoordBijbaan(st, 3, false));
  const verbonden = new Set([1, 2, 3]);
  assert.deepEqual(B.deelnemers(st, verbonden), [1, 2]);
  const r1 = B.beloningBijbaan(st, verbonden, { basis: 180, vak: 'water', xp: 40, ronde: 0 });
  assert.deepEqual(r1.map((r) => [r.slot, r.geld, r.xp, r.vak]), [[1, 180, 40, 'water'], [2, 180, 40, 'water']], 'beiden het volle bedrag in het vak Water');
  assert.deepEqual(B.beloningBijbaan(st, verbonden, { basis: 180, vak: 'water', xp: 40, ronde: 0 }), [], 'dezelfde levering nogmaals geeft niets');
  B.verlaatBijbaan(st, 2); // een gast valt weg
  const r2 = B.beloningBijbaan(st, new Set([1]), { basis: 150, vak: 'water', xp: 30, ronde: 1 });
  assert.deepEqual(r2.map((r) => r.slot), [1], 'wie wegviel krijgt daarna niets, en verliest niets');
  assert.equal(B.laatBijbaan(st, 4), true, 'een gast die later komt kijkt mee');
  assert.deepEqual(B.deelnemers(st, new Set([1, 2, 3, 4])), [1], 'en doet pas mee bij de volgende baan');
  B.eindeBijbaan(st);
  const volgende = B.beginBijbaan(st, 'binnenvaart', 'De Drie Zusters', [1, 4]);
  assert.deepEqual(volgende.map((u) => u.slot), [1, 4], 'bij de volgende baan krijgt hij de uitnodiging');
});

console.log(`binnenvaartcrew_test: ${n} groepen ok`);
