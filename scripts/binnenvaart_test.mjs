// Binnenvaartschip als baan (#1376, W3): de regels van De Drie Zusters en het baancontract.
//   node scripts/binnenvaart_test.mjs
// De kades en routes zelf worden met een wereld gecontroleerd: scripts/binnenvaart_world_test.mjs (SKIP zonder game/world).
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as R from '../game/js/binnenvaartrules.js';
import { BOAT_KINDS, binnenvaartName } from '../game/js/boattypes.js';

let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };
const eq = (a, b, m) => { n++; assert.deepEqual(a, b, m); };

// 1) het schip: een spits van 38,5 m met een vaste naam, de rederij heet Noorderspoor
ok(R.SCHIP.naam === 'De Drie Zusters' && R.SCHIP.soort === 'spits', 'vast schip');
ok(R.SCHIP.len === BOAT_KINDS.spits.len && R.SCHIP.wid === BOAT_KINDS.spits.wid, 'maten uit boattypes (spits)');
ok(/^Noorderspoor/.test(R.REDERIJ), 'rederij heet Noorderspoor');
ok(binnenvaartName({ id: 5, fixedName: 'De Drie Zusters' }) === 'De Drie Zusters', 'een vaste naam blijft');
ok(typeof binnenvaartName({ id: 5 }) === 'string', 'zonder vaste naam: een uit de lijst');

// 2) sluis en bruggen: past een schip van 38,5 x 5,05 m?
ok(R.schipPast({ kind: 'beweegbaar' }).ok, 'beweegbare brug opent');
ok(R.schipPast({ kind: 'vast', clear: 5.25 }).ok, 'vaste brug van klasse IV (5,25 m) is ruim genoeg');
ok(!R.schipPast({ kind: 'vast', clear: 4.3 }).ok && R.schipPast({ kind: 'vast', clear: 4.3 }).reden === 'te-laag', 'een laag brugdek houdt hem tegen');
ok(R.schipPast({ kind: 'vast' }).ok, 'zonder hoogte geldt de kanaalklasse');
ok(R.schipPast({ kind: 'sluis', width: 12, length: 120 }).ok, 'ruime sluis');
ok(R.schipPast({ kind: 'sluis', width: 5.5, length: 120 }).reden === 'te-smal', 'smalle sluis: te smal');
ok(R.schipPast({ kind: 'sluis', width: 12, length: 38 }).reden === 'te-kort', 'korte sluis: te kort');
ok(!R.schipPast(null).ok && !R.schipPast({ kind: 'iets' }).ok, 'onbekend: niet door');
const rc = R.routeControle([{ kind: 'vast', clear: 6 }, { kind: 'vast', clear: 3 }, { kind: 'sluis', width: 3, length: 100 }]);
ok(!rc.ok && rc.blokkades.length === 2, 'routecontrole telt de blokkades');
ok(R.routeControle([]).ok && R.routeControle(undefined).ok, 'lege route is vrij');

// 3) de kades en overtochten
ok(R.KADES.length === 3 && R.KADES.every((k) => Number.isFinite(k.water.x) && /^de /.test(k.naam)), 'drie kades met een naam');
ok(R.kadeById(R.THUIS) && R.THUIS === 'rustpunt', 'de thuiskade bestaat');
ok(R.overtochten().length === 6 && R.overtochten().every((o) => o.lengte > 1000), 'zes overtochten, allemaal langer dan een km');
ok(R.kiesOvertocht(1, 0, R.THUIS).naar === 'oost', 'laag niveau: de korte');
ok(R.kiesOvertocht(4, 1, R.THUIS).naar === 'west', 'hoger niveau: afwisselen met de lange');
ok(R.kiesOvertocht(1, 0, 'west').van === 'west', 'vanaf een andere kade begint de volgende daar');

// 4) een overtocht: laden, varen, aanleggen, lossen, klaar
{
  const s = R.maakOvertocht('rustpunt-oost', 1), van = R.kadeById('rustpunt').water, naar = R.kadeById('oost').water;
  ok(s && s.fase === 'laden' && !R.maakOvertocht('nergens-heen'), 'schone overtocht; onbekende is null');
  ok(R.maakOvertocht('rustpunt-oost', 5).budget < s.budget, 'hoger niveau: minder tijd');
  ok(R.doelVan(s).label === 'de Kade bij het Rustpunt', 'eerst het laden aan de startkade');
  eq(R.stapOvertocht(s, { ...van, speed: 2 }, 1), [], 'niet stil: geen lading');
  let ev = [];
  for (let t = 0; t < 7; t++) ev.push(...R.stapOvertocht(s, { ...van, speed: 0 }, 1));
  ok(ev.some((e) => e.type === 'geladen') && s.fase === 'varen', 'na zes seconden stilliggen is hij geladen');
  ok(R.doelVan(s).label === 'de Oostkade', 'doel is nu de eindkade');
  eq(R.stapOvertocht(s, { x: (van.x + naar.x) / 2, y: (van.y + naar.y) / 2, speed: 4 }, 1), [], 'onderweg: niets bijzonders');
  ev = R.stapOvertocht(s, { ...naar, speed: 0.5 }, 1);
  ok(ev.some((e) => e.type === 'aangelegd') && s.fase === 'lossen', 'aangelegd');
  ev = [];
  for (let t = 0; t < 6; t++) ev.push(...R.stapOvertocht(s, { ...naar, speed: 0 }, 1));
  ok(ev.some((e) => e.type === 'klaar') && s.klaar, 'gelost: klaar');
  const u = R.uitslagVan(s);
  ok(!u.failed && u.base > 100 && u.tip === 35 && u.flawless, 'schone overtocht: loon en fooi');
  eq(R.stapOvertocht(s, { ...naar, speed: 0 }, 1), [], 'na afloop gebeurt er niets meer');
}

// 5) te hard bij de kade kost de fooi en uiteindelijk de klus; midden op het kanaal mag het
{
  const s = R.maakOvertocht('rustpunt-oost', 1), kade = R.kadeById('rustpunt').water;
  const ver = { x: kade.x + 600, y: kade.y + 100 };
  for (let t = 0; t < 30; t++) R.stapOvertocht(s, { ...ver, speed: R.SCHIP.maxSpeed }, 1);
  ok(s.tehard === 0 && !s.mislukt, 'op het kanaal mag hij op topsnelheid');
  const ev = [];
  for (let t = 0; t < 9; t++) ev.push(...R.stapOvertocht(s, { x: kade.x + 50, y: kade.y, speed: 4 }, 1));
  ok(ev.some((e) => e.type === 'tehard') && ev.some((e) => e.type === 'fail') && s.mislukt, 'te lang te hard bij de kade: mislukt');
  ok(R.uitslagVan(s).failed, 'mislukt geeft geen loon');
  const t = R.maakOvertocht('rustpunt-oost', 1); t.klaar = true; t.tehard = 2; t.t = t.budget * 0.5;
  ok(R.uitslagVan(t).tip === 0 && !R.uitslagVan(t).flawless && R.uitslagVan(t).base > 0, 'te hard geweest: geen fooi, wel loon');
}

// 6) de tijd raakt op
{
  const s = R.maakOvertocht('rustpunt-west', 1), v = R.kadeById('rustpunt').water;
  const ev = R.stapOvertocht(s, { ...v, speed: 0 }, s.budget + 1);
  ok(ev.some((e) => e.type === 'fail') && s.mislukt, 'te laat: mislukt');
}

// 7) het baancontract: de job leest dezelfde regels en meldt door via c.* (zonder wereld)
{
  const { binnenvaart } = await import('../game/js/sidejob_binnenvaart.js');
  ok(binnenvaart.id === 'binnenvaart' && binnenvaart.needsVehicle() === true, 'id en voertuigplicht');
  ok(/Noorderspoor/.test(binnenvaart.tagline) && /Drie Zusters/.test(binnenvaart.boardText), 'tekst: rederij en schip');
  ok(!/winter|sneeuw|ijsvrij|natuurijs/i.test(binnenvaart.intro.join(' ') + binnenvaart.blurb), 'altijd zomer');
  ok(binnenvaart.anchor(null).x === R.kadeById(R.THUIS).kade.x, 'zonder kaart is het anker de thuiskade');
  const log = { msgs: [], done: null, failed: null };
  const kade = R.kadeById(R.THUIS).water;
  const c = { level: 1, streak: 2, data: {}, vehicle: { x: kade.x, y: kade.y, vx: 0, vy: 0, speed: 0, angle: 0 }, msg: (m) => log.msgs.push(m), complete: (r) => { log.done = r; }, fail: (w) => { log.failed = w; } };
  binnenvaart.round(c);
  ok(c.data.overtocht && c.timeLeft === c.data.overtocht.budget && /Noorderspoor/.test(log.msgs[0]), 'ronde start met de rederij');
  for (let t = 0; t < 30 && c.data.overtocht.fase === 'laden'; t++) binnenvaart.update(1, c); // de laadtijd komt uit het contract (vaarvracht.js)
  ok(c.data.overtocht.fase === 'varen' && log.msgs.some((m) => /Geladen/.test(m)), 'laden meldt');
  const naar = R.kadeById('oost').water;
  c.vehicle.x = naar.x; c.vehicle.y = naar.y;
  for (let t = 0; t < 30 && !log.done; t++) binnenvaart.update(1, c);
  ok(log.done && log.done.base > 0 && !log.failed && c.data.vanKade === 'oost', 'klaar: loon en de volgende begint bij de eindkade');
  ok(binnenvaart.view(c).marker && /kade/i.test(binnenvaart.view(c).goal.label), 'view geeft marker en doel');
  binnenvaart.round(c);
  ok(c.data.overtocht.van === 'oost', 'de volgende overtocht vertrekt van de eindkade');
  ok(binnenvaart.sikkom(c).includes('2'), 'sikkom noemt de reeks');
  ok(typeof binnenvaart.timeout() === 'string', 'timeout-tekst');
}

console.log(`binnenvaart_test: ${n} controles ok`);
