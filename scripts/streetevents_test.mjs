// Straatgebeurtenissen (game/js/streetevents.js, #1316): soorten, uren, zeldzaamheid (een uur spelen geeft er gemiddeld
// drie tot vijf), opstelling, einde en tekst; plus de bedrading (propregister, rekwisieten voor gasten, alleen de host).
// Pure test, zonder wereld.   node scripts/streetevents_test.mjs
import fs from 'node:fs';
import { EVENT, EVENT_KINDS, EVENT_IDS, EVENT_LINES, mayStart, rollsStart, eligibleKinds, pickKind, durationOf, layout, endReason, nextLine, LINE_GAP, simulateCount } from '../game/js/streetevents.js';
import { PROP_REGISTER } from '../game/js/propregister.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// --- soorten ------------------------------------------------------------------------------------------------
ok(EVENT_IDS.length >= 7, 'minstens zeven soorten', String(EVENT_IDS.length));
for (const id of EVENT_IDS) {
  const k = EVENT_KINDS[id];
  ok(!!k.nl && k.uren.length === 2 && k.duur[0] > 0 && k.duur[1] >= k.duur[0] && k.gewicht > 0, id + ': naam, uren, duur, gewicht');
  ok(k.duur[1] <= 300, id + ': kort (hooguit vijf minuten)');
  ok(k.rollen.length >= 1 && k.rollen.some((r) => r.kans == null), id + ': minstens één vaste rol');
  for (const p of k.props) ok(!!PROP_REGISTER[p.id] && PROP_REGISTER[p.id].gebruik.includes('straat'), id + ': prop ' + p.id + ' komt uit het propregister');
  const L = EVENT_LINES[id];
  ok(!!L && Object.values(L).every((a) => a.length >= 2 && a.every((s) => typeof s === 'string' && s.length > 2 && s.length < 60)), id + ': regels per rol');
  ok(Object.keys(L).every((rol) => k.rollen.some((r) => r.rol === rol)), id + ': elke rol met regels bestaat');
}
// geen geweld: geen wapens, geen slaan in de tekst of de houdingen
{
  const all = Object.values(EVENT_LINES).flatMap((o) => Object.values(o).flat()).join(' ').toLowerCase();
  ok(!/\b(sla|slaan|schiet|schieten|mes|bloed|vermoord|klap|klappen)\b/.test(all), 'geen geweld in de regels');
  ok(/\bklap\b/.test('een klap') && !/\b(sla)\b/.test('slagroom'), 'de woordgrens werkt (slagroom is geen geweld)');
  const poses = EVENT_IDS.flatMap((id) => EVENT_KINDS[id].rollen.map((r) => r.pose));
  ok(poses.every((p) => p == null || ['muziek', 'vendor', 'phone', 'angry', 'crouch', 'talk'].includes(p)), 'alleen bestaande houdingen', poses.join());
}

// --- uren en omstandigheden -----------------------------------------------------------------------------------
ok(eligibleKinds({ hour: 3, wet: 0, inCity: true }).length === 0, "'s nachts geen scènes");
ok(eligibleKinds({ hour: 14, wet: 0, inCity: true }).length >= 6, 'middag in de stad: bijna alles kan');
ok(!eligibleKinds({ hour: 14, wet: 0.8, inCity: true }).includes('ijscokar') && !eligibleKinds({ hour: 14, wet: 0.8, inCity: true }).includes('muzikant'), 'bij regen geen ijscokar of muzikant');
ok(eligibleKinds({ hour: 14, wet: 0.8, inCity: true }).includes('hond'), 'een hond ontsnapt ook in de regen');
ok(!eligibleKinds({ hour: 14, wet: 0, inCity: false }).includes('toeristen'), 'toeristen alleen in de stad');
ok(!eligibleKinds({ hour: 14, wet: 0, inCity: true, has: { auto: false } }).includes('parkeerruzie'), 'geen geparkeerde auto: geen parkeerruzie');
ok(eligibleKinds({ hour: 8.5, wet: 0, inCity: true }).every((id) => !['muzikant', 'ijscokar', 'kraampje'].includes(id)), 'om half negen nog geen muzikant, ijscokar of kraampje');
ok(pickKind({ hour: 3, wet: 0, inCity: true }, 0.5) === null, 'niets kan: null');
{
  const c = {}; const r = rng(5);
  for (let i = 0; i < 3000; i++) { const id = pickKind({ hour: 15, wet: 0, inCity: true }, r()); c[id] = (c[id] || 0) + 1; }
  ok(c.muzikant > c.parkeerruzie, 'een muzikant is vaker dan een parkeerruzie', JSON.stringify(c));
  ok(EVENT_IDS.filter((id) => c[id]).length >= 6, 'de middag kent alle soorten die dan kunnen');
}

// --- zeldzaamheid --------------------------------------------------------------------------------------------
{
  const st = { lastEndAt: -Infinity, active: null };
  ok(!mayStart(st, 30), 'niet in de eerste anderhalve minuut');
  ok(mayStart(st, EVENT.firstAfter + 1), 'daarna wel');
  ok(!mayStart({ lastEndAt: 500, active: null }, 500 + EVENT.minGap - 1), 'een pauze na elke scène');
  ok(!mayStart({ lastEndAt: -Infinity, active: {} }, 999), 'nooit twee tegelijk');
  ok(!mayStart(st, 999, { busy: true }) && !mayStart(st, 999, { playerSpeed: 30 }), 'niet tijdens een missie of filmpje, niet als je over de ring scheurt');
  ok(rollsStart(0) && !rollsStart(EVENT.chance + 0.01), 'kans per check');
  // een uur spelen (tweeënhalve speldag met nachten), 600 keer, op verschillende beginuren
  const r = rng(42); const counts = [];
  for (let i = 0; i < 600; i++) counts.push(simulateCount(3600, r, { hour: (i * 1.7) % 24, wet: 0, inCity: true }));
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  counts.sort((a, b) => a - b);
  ok(mean >= 3 && mean <= 5, 'een uur vrij spelen: gemiddeld drie tot vijf scènes', mean.toFixed(2));
  ok(counts[Math.floor(counts.length * 0.05)] >= 1 && counts[Math.floor(counts.length * 0.95)] <= 7, 'zelden geen en nooit een stortvloed', counts[30] + '..' + counts[570]);
  console.log(`  zeldzaamheid: gemiddeld ${mean.toFixed(2)} per speeluur (p5 ${counts[30]}, p95 ${counts[570]})`);
}

// --- duur, opstelling, einde -----------------------------------------------------------------------------------
for (const id of EVENT_IDS) {
  const d0 = durationOf(id, 0), d1 = durationOf(id, 1);
  ok(d0 === EVENT_KINDS[id].duur[0] && d1 === EVENT_KINDS[id].duur[1] && durationOf(id, 5) === d1, id + ': duur binnen de grenzen');
  const all = layout(id, 100, 50, 0.7, EVENT_KINDS[id].rollen.map(() => 0));
  ok(all.rollen.length === EVENT_KINDS[id].rollen.length, id + ': met lage worpen alle rollen');
  const few = layout(id, 100, 50, 0.7, EVENT_KINDS[id].rollen.map(() => 0.99));
  ok(few.rollen.length === EVENT_KINDS[id].rollen.filter((r) => r.kans == null).length, id + ': met hoge worpen alleen de vaste rollen');
  ok(all.rollen.every((r) => Math.hypot(r.x - 100, r.y - 50) < 6 && Number.isFinite(r.angle)), id + ': rollen dicht bij het anker');
  ok(all.props.every((p) => Math.hypot(p.x - 100, p.y - 50) < 3), id + ': props bij het anker');
  // geen twee figuren op elkaar
  for (let i = 0; i < all.rollen.length; i++) for (let j = i + 1; j < all.rollen.length; j++) ok(Math.hypot(all.rollen[i].x - all.rollen[j].x, all.rollen[i].y - all.rollen[j].y) > 0.6, id + ': figuren niet op elkaar');
}
{
  // de opstelling draait mee met de hoek: de prop van de muzikant ligt voor hem
  const a = layout('muzikant', 0, 0, 0, [0, 0, 0]), b = layout('muzikant', 0, 0, Math.PI / 2, [0, 0, 0]);
  ok(Math.abs(a.props[0].x - 0.9) < 1e-9 && Math.abs(b.props[0].y - 0.9) < 1e-9, 'opstelling draait mee');
  ok(layout('bestaatniet', 0, 0, 0) === null, 'onbekende soort: null');
}
ok(endReason({ until: 100 }, 50, 20) === null, 'loopt nog');
ok(endReason({ until: 100 }, 101, 20) === 'tijd', 'tijd om');
ok(endReason({ until: 100 }, 50, EVENT.despawnDist + 1) === 'weg', 'weggereden: meteen voorbij');

// --- tekst -----------------------------------------------------------------------------------------------------
{
  const ev = { rollen: [{ rol: 'bestuurder' }, { rol: 'buurman' }], lineAt: -99, turn: 0 };
  const a = nextLine('parkeerruzie', ev, 10, 0.1, 10);
  ok(a && a.rolIndex === 0 && EVENT_LINES.parkeerruzie.bestuurder.includes(a.line), 'eerst de bestuurder');
  ev.lineAt = 10; ev.turn = 1;
  ok(nextLine('parkeerruzie', ev, 10 + LINE_GAP - 1, 0.1, 10) === null, 'niet te vaak');
  const b = nextLine('parkeerruzie', ev, 10 + LINE_GAP + 0.1, 0.1, 10);
  ok(b && b.rolIndex === 1 && EVENT_LINES.parkeerruzie.buurman.includes(b.line), 'dan de buurman');
  ok(nextLine('parkeerruzie', { ...ev, lineAt: -99 }, 50, 0.1, 40) === null, 'te ver weg om te lezen: geen ballon');
  const m = nextLine('ijscokar', { rollen: [{ rol: 'verkoper' }, { rol: 'klant' }, { rol: 'klant' }], lineAt: -99, turn: 1 }, 5, 0.99, 5);
  ok(m && m.rolIndex === 1 && EVENT_LINES.ijscokar.klant.includes(m.line), 'de klant mag ook iets zeggen');
}

// --- bedrading ---------------------------------------------------------------------------------------------------
{
  const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const live = src('streeteventlive.js'), d3 = src('streetevents3d.js'), main = src('main.js'), cx = src('coopextra.js'), cx3 = src('coopextra3d.js');
  ok(/new Pedestrian\(/.test(live) && !/buildPersonMesh|BoxGeometry|CylinderGeometry/.test(live), 'figuren zijn gewone voetgangers, geen eigen poppetjes');
  ok(/propGeometry\(id\)/.test(d3) && !/BoxGeometry|CylinderGeometry/.test(d3), 'props uit het propregister, geen eigen primitieven');
  ok(/registreerRekwisieten\('straatevent'/.test(live), 'de props gaan als tijdelijke rekwisieten naar de gasten');
  for (const id of ['kraampje', 'ijscokar', 'gitaarkoffer']) {
    ok(new RegExp(`'${id}'`).test(cx.match(/REKW_SOORTEN = \[[^\]]*\]/)[0]), `${id} is een rekwisietsoort`);
    ok(new RegExp(`${id}: \\(\\) => propRekwisiet\\('${id}'\\)`).test(cx3), `de gast bouwt ${id} uit het propregister`);
  }
  ok(/REKW_SOORTEN = \['laser', 'zekering', 'kluis', 'vlag', 'carbid', 'raket', 'wapendrop', 'spijkermat'/.test(cx), 'de oude soorten houden hun nummer (achteraan toegevoegd)');
  // alleen op het gameplaypad van de host (een gast draait updateGameplay niet)
  const gp = main.slice(main.indexOf('function updateGameplay('));
  ok(/updateStreetEvents, dt, world/.test(gp), 'main.js: updateStreetEvents in updateGameplay (alleen de host)');
  ok(/updateStreetEvents3D\(world, getScene\(\)\)/.test(main), 'main.js tekent de props');
  ok(/state === 'loose'/.test(src('wildlife.js')), 'wildlife.js kent de losgebroken hond');
}

console.log(fails ? `streetevents_test: ${fails} van ${n} mislukt` : `streetevents_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
