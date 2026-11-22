// Interieurs (epic #1150, ronde 4): meer soorten panden (sportschool, studentenkamer, kapper en bakker met eigen mensen), drukte per uur,
// schema's per dag en nacht, kijken door de ramen zonder extra kosten (zichtbudget), kleding per rol, de dagkaart aan de balie en de
// Samen-spelen-regel (dezelfde klok, dezelfde mensen). Puur, geen scene.
// Draai: node scripts/interior_crowd_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { KINDS, kindOfBuilding, kindOfFacility, PUBLIEK_VARIANTS } from '../game/js/interiorkinds.js';
import { walkGrid, reachable, validateLayout, STAFF } from '../game/js/interiorlayout.js';
import { SCRIPTS, STAFF_ROLES, makeStage, makeActor, stepActor, MAX_ACTORS } from '../game/js/interioractivity.js';
import { crowdAt, crowdCurves, phaseOf, presentAt, rankOf, ALWAYS_THERE } from '../game/js/interiorcrowd.js';
import { sightSpans, seenThrough, MAX_SEEN } from '../game/js/interiorsight.js';
import { ROLES, npcLook } from '../game/js/interiornpc.js';
import { productFor, buyProduct } from '../game/js/interiorbuy.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

// --- de nieuwe soorten komen uit het gebouw ---
ok(PUBLIEK_VARIANTS.includes('sportschool'), 'sportschool is een publiek-variant');
ok(KINDS.publiek.roles.includes('sporter') && KINDS.publiek.roles.includes('trainer') && KINDS.woning.roles.includes('student'), 'de rollen staan bij de soort');
const sc = kindOfBuilding({ type: 'sports_centre', pts: [] });
ok(sc && sc.kind === 'publiek' && sc.sub === 'sportschool', 'een sporthal is een sportschool', JSON.stringify(sc));
const dorm = kindOfBuilding({ type: 'dormitory', pts: [] });
ok(dorm && dorm.kind === 'woning' && dorm.sub === 'studentenkamer', 'een studentenflat is een studentenkamer', JSON.stringify(dorm));
const gym = kindOfFacility({ kind: 'fitness_centre' });
ok(gym && gym.sub === 'sportschool', 'een fitnesscentrum uit de voorzieningen is een sportschool');

// --- de inrichting en de mensen ---
const rnd = mulberry32(2111);
const cnt = (L, t) => L.items.filter((i) => i.type === t).length;
let gyms = 0, rooms = 0, kappers = 0, bakkers = 0, stuck = 0;
for (let k = 0; k < 40; k++) {
  const w = 6 + rnd() * 6, d = 7 + rnd() * 6;
  let r = building('publiek', 'sportschool', w, d, rnd);
  let p = planInterior(r.b, { spot: r.spot, upper: false });
  if (p.ok) {
    gyms++;
    const L = p.layout;
    ok(p.sub === 'sportschool', 'sportschool: de soort blijft', String(p.sub));
    ok(cnt(L, 'machine') >= 1 && cnt(L, 'bench') + cnt(L, 'rack') >= 1, 'sportschool: loopbanden en banken of rekken', `${cnt(L, 'machine')}/${cnt(L, 'bench')}`);
    ok(L.npc.some((q) => q.role === 'sporter') && L.npc.some((q) => q.role === 'baliemedewerker'), 'sportschool: sporters en een baliemedewerker', `${w.toFixed(1)}x${d.toFixed(1)} dichtheid ${L.density} ${L.npc.map((q) => q.role)} ${JSON.stringify(p.hall)}`);
    ok(L.use.some((s) => s.id === 'balie'), 'sportschool: een balie om de dagkaart te kopen');
    ok(validateLayout(L).length === 0, 'sportschool: geldige indeling');
    if (L.removed) { stuck++; console.error('uitgedund', p.kind, p.sub, L.density, L.removed); }
  }
  r = building('woning', 'studentenkamer', 5 + rnd() * 6, 6 + rnd() * 6, rnd);
  p = planInterior(r.b, { spot: r.spot, upper: false });
  if (p.ok) {
    rooms++;
    const L = p.layout;
    ok(p.sub === 'studentenkamer', 'studentenkamer: de soort blijft', String(p.sub));
    ok(cnt(L, 'bed') === 1 && cnt(L, 'desk') >= 1, 'studentenkamer: bed en bureau', `${cnt(L, 'bed')}/${cnt(L, 'desk')}`);
    ok(validateLayout(L).length === 0, 'studentenkamer: geldige indeling');
    if (L.removed) { stuck++; console.error('uitgedund', p.kind, p.sub, L.density, L.removed); }
  }
  r = building('winkel', 'kapper', 5 + rnd() * 5, 7 + rnd() * 5, rnd);
  p = planInterior(r.b, { upper: false });
  if (p.ok) { if (p.layout.npc.some((q) => q.role === 'kapper') && p.layout.npc.some((q) => q.role === 'knipklant')) kappers++; ok(validateLayout(p.layout).length === 0, 'kapper: geldige indeling'); }
  r = building('winkel', 'bakker', 5 + rnd() * 5, 7 + rnd() * 5, rnd);
  p = planInterior(r.b, { upper: false });
  if (p.ok) { if (p.layout.npc.some((q) => q.role === 'bakker')) bakkers++; ok(validateLayout(p.layout).length === 0, 'bakker: geldige indeling'); }
}
ok(gyms >= 20 && rooms >= 20, 'de meeste panden worden een sportschool en een studentenkamer', `${gyms}/${rooms}`);
ok(kappers >= 10, 'kapper: de knipper en de klant in de stoel zijn er meestal', String(kappers));
ok(bakkers >= 10, 'bakker: de bakker achter de toonbank', String(bakkers));
ok(stuck === 0, 'geen indeling uitgedund');

// --- schema's: nieuwe rollen en dag/nacht ---
for (const role of ['kapper', 'knipklant', 'bakker', 'student', 'sporter', 'trainer']) {
  ok(SCRIPTS[role] && SCRIPTS[role].length >= 3 && SCRIPTS[role].length <= 6, `${role}: 3 tot 6 activiteiten`);
  ok(ROLES[role] !== undefined, `${role}: een look`);
}
for (const role of ['kapper', 'bakker', 'knipklant']) ok(STAFF.has(role) && STAFF_ROLES.has(role), `${role} blijft op zijn plek (personeel)`);
for (const [role, list] of Object.entries(SCRIPTS)) ok(list.every((a) => !a.when || a.when.every((x) => ['dag', 'avond', 'nacht'].includes(x))), `${role}: when kent alleen dag, avond, nacht`);
ok(phaseOf(7) === 'dag' && phaseOf(18) === 'avond' && phaseOf(22.9) === 'avond' && phaseOf(23) === 'nacht' && phaseOf(2) === 'nacht' && phaseOf(-1) === 'nacht', 'dagdelen');

// een bewoner kijkt 's nachts tv en kookt niet; overdag andersom
{
  const r = building('woning', null, 9, 11, mulberry32(9));
  const p = planInterior(r.b, { upper: false });
  ok(p.ok, 'woning om de bewoner in te zetten');
  const L = p.layout, grid = walkGrid(L), reach = reachable(L, grid);
  const seen = { dag: new Set(), nacht: new Set() };
  for (const phase of ['dag', 'nacht']) {
    for (let s = 0; s < 6; s++) {
      const st = makeStage(L, grid, reach); st.phase = phase;
      const a = makeActor(st, { role: 'bewoner', u: L.hall.u0 + 1.5, v: L.hall.v0 + 2, face: 0, pose: 'stand' }, mulberry32(100 + s), 0, null);
      for (let t = 0; t < 4000; t++) { stepActor(st, a, 0.1); if (a.act && a.state === 'do') seen[phase].add(a.act.id); }
    }
  }
  ok(!seen.nacht.has('koken') && seen.dag.has('koken') || seen.dag.size === 0, 'bewoner kookt overdag en niet in de nacht', `${[...seen.dag]} | ${[...seen.nacht]}`);
  ok(!seen.dag.has('tv kijken'), 'bewoner kijkt overdag geen tv', [...seen.dag].join(','));
}

// de mensen in de sportschool en de studentenkamer doen echt verschillende dingen en lopen niet door meubels
for (const [kind, sub, ww, dd] of [['publiek', 'sportschool', 8, 10], ['woning', 'studentenkamer', 7, 9]]) {
  const r = building(kind, sub, ww, dd, mulberry32(5));
  const p = planInterior(r.b, { spot: r.spot, upper: false });
  ok(p.ok, `${sub}: planbaar voor de loop`);
  if (!p.ok) continue;
  const L = p.layout, grid = walkGrid(L), reach = reachable(L, grid), st = makeStage(L, grid, reach);
  const solids = L.items.filter((i) => i.solid);
  const acts = new Set(); let inSolid = 0;
  const list = L.npc.slice(0, MAX_ACTORS).map((np, i) => makeActor(st, np, mulberry32(p.seed ^ (i * 7919 + 13)), i, STAFF_ROLES.has(np.role) ? reachable(L, grid, { u: np.u, v: np.v }) : null));
  for (let t = 0; t < 3000; t++) for (const a of list) {
    stepActor(st, a, 0.1);
    if (a.state === 'do' && a.act) acts.add(a.role + ':' + a.act.id);
    if (!a.sit && !a.staff && solids.some((q) => Math.abs(a.u - q.u) < (q.w + 0.2) / 2 - 0.15 && Math.abs(a.v - q.v) < (q.d + 0.2) / 2 - 0.15 && (q.face & 1 ? Math.abs(a.u - q.u) < q.d / 2 - 0.1 && Math.abs(a.v - q.v) < q.w / 2 - 0.1 : true))) inSolid++;
  }
  ok(acts.size >= 4, `${sub}: minstens vier verschillende handelingen`, [...acts].join(' '));
  ok(inSolid === 0, `${sub}: niemand loopt door een meubel`, String(inSolid));
}

// --- drukte per uur ---
for (const key of Object.keys(crowdCurves())) {
  const [kind, sub] = key.split(':');
  let lo = 9, hi = -1;
  for (let h = 0; h < 24; h += 0.25) { const c = crowdAt(kind, sub || null, h); ok(c >= 0 && c <= 1, `drukte ${key} ligt tussen 0 en 1`, `${h}: ${c}`); lo = Math.min(lo, c); hi = Math.max(hi, c); }
  ok(hi - lo >= 0.3, `drukte ${key} verschilt per uur`, `${lo}..${hi}`);
  ok(Math.abs(crowdAt(kind, sub || null, 0) - crowdAt(kind, sub || null, 24)) < 0.6, `drukte ${key} sluit aan over middernacht`);
}
ok(crowdAt('winkel', 'bakker', 8) > crowdAt('winkel', 'bakker', 15), 'bakker is om 8 uur drukker dan om 15 uur');
ok(crowdAt('horeca', 'kroeg', 23) > crowdAt('horeca', 'kroeg', 10), 'kroeg is in de nacht drukker dan in de ochtend');
ok(crowdAt('kantoor', null, 10) > crowdAt('kantoor', null, 22), 'kantoor is overdag drukker dan in de avond');
ok(crowdAt('publiek', 'sportschool', 18) > crowdAt('publiek', 'sportschool', 14), 'sportschool is na het werk drukker');
ok(crowdAt('woning', null, 20) > crowdAt('woning', null, 11), 'een woning is in de avond drukker');
ok(crowdAt('onbekend', null, 12) === crowdAt('winkel', null, 12), 'onbekende soort valt terug op de winkel');

// aanwezig: personeel altijd, de rest met de drukte, en deterministisch (Samen spelen: dezelfde klok, dezelfde mensen)
{
  const seed = 123456789;
  ok(ALWAYS_THERE.has('winkelier') && presentAt('winkelier', seed, 0, 0), 'personeel is er altijd');
  let a = 0, b = 0;
  for (let i = 0; i < 200; i++) { if (presentAt('klant', seed + i * 7, i, 0.2)) a++; if (presentAt('klant', seed + i * 7, i, 0.9)) b++; }
  ok(b > a * 2.5, 'een druk uur geeft veel meer mensen dan een rustig uur', `${a} vs ${b}`);
  ok(Math.abs(b / 200 - 0.9) < 0.12 && Math.abs(a / 200 - 0.2) < 0.12, 'het aandeel volgt het drukteniveau', `${a / 200}, ${b / 200}`);
  const run = () => Array.from({ length: 30 }, (_, i) => presentAt('klant', seed, i, 0.5));
  ok(JSON.stringify(run()) === JSON.stringify(run()), 'dezelfde klok geeft dezelfde mensen (host, gast en nieuwe host)');
  ok(presentAt('klant', seed, 3, 0.3, true) && !presentAt('klant', seed, 3, 0.1, true) || rankOf(seed, 3) < 0.1, 'de eerste bezoeker is er zolang het niet helemaal dood is');
}

// --- kijken door de ramen: het zichtbudget ---
{
  const r = building('winkel', 'kleding', 9, 10, mulberry32(77));
  const p = planInterior(r.b, { upper: false });
  ok(p.ok, 'winkel voor het raamzicht');
  const spans = sightSpans(p);
  ok(spans.length >= 2, 'de deur en minstens een raam zijn open', String(spans.length));
  ok(seenThrough(spans, 0, 3, 5, 5), 'wie binnen is ziet alles');
  // frontaal voor de deur: wie recht achter de deur staat is zichtbaar
  ok(seenThrough(spans, 0, -4, 0, 4), 'recht door de deur');
  // ver naast de gevel: onder een scherpe hoek door het raam, de rest verstopt
  const hall = p.hall;
  let seenFront = 0, seenSide = 0, tot = 0;
  for (let u = hall.u0 + 0.5; u < hall.u1 - 0.4; u += 0.5) for (let v = 0.8; v < hall.v1 - 0.4; v += 0.5) { tot++; if (seenThrough(spans, 0, -5, u, v)) seenFront++; if (seenThrough(spans, hall.u1 + 12, -1.5, u, v)) seenSide++; }
  ok(seenFront < tot && seenFront > 0, 'frontaal zie je een deel van de kamer, niet alles', `${seenFront}/${tot}`);
  ok(seenSide < tot * 0.5, 'onder een scherpe hoek zie je minder dan de helft', `${seenSide}/${tot}`);
  // wat achter de muur staat is nooit te zien
  ok(!seenThrough([[-0.5, 0.5]], 5, -3, -10, 3), 'door een muur is niets te zien');
  ok(!seenThrough(spans, 0, -3, 0, -4), 'wie achter de kijker staat wordt niet binnen gezien');
  // budget: nooit meer figuren in beeld dan de mensenlimiet, en de test kost bijna niets (geen extra fps)
  ok(MAX_SEEN === 8 && MAX_ACTORS === 8, 'het zichtbudget is de mensenlimiet');
  const t0 = process.hrtime.bigint();
  let hits = 0;
  for (let i = 0; i < 100000; i++) if (seenThrough(spans, (i % 40) - 20, -3 - (i % 7), (i % 11) - 5, 2 + (i % 9))) hits++;
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ok(ms < 150, '100.000 zichttoetsen kosten minder dan 150 ms (8 mensen per beeld: onmeetbaar)', ms.toFixed(1) + ' ms');
  ok(hits > 0 && hits < 100000, 'de toets laat sommige zien en verbergt de rest');
}

// --- kleding: elke rol gebruikt een bestaande rolpool van epic Kleding ---
{
  const POOLS = new Set(['voetganger', 'student', 'toerist', 'bouwvakker', 'boer', 'kok', 'bakker', 'winkelier', 'zakenman', 'sporter', 'feestganger', 'ambtenaar']);
  for (const role of Object.keys(ROLES)) {
    for (const sub of [null, 'bakker', 'snackbar', 'restaurant', 'kroeg', 'kapper']) {
      const look = npcLook(role, 4242, 1, 0x3f6ea8, sub);
      ok(POOLS.has(look.opts.role), `rol ${role}/${sub} kleedt zich uit een bestaande pool`, String(look.opts.role));
    }
  }
  ok(npcLook('sporter', 1, 0).opts.role === 'sporter' && npcLook('student', 1, 0).opts.role === 'student' && npcLook('bakker', 1, 0).opts.role === 'bakker' && npcLook('kapper', 1, 0).opts.role === 'winkelier', 'sporter, student, bakker en kapper hebben hun pool');
  ok(npcLook('sporter', 77, 2).opts.seed === npcLook('sporter', 77, 2).opts.seed, 'de look is deterministisch');
}

// --- kopen aan de balie: de dagkaart ---
{
  const prod = productFor('publiek', 'sportschool');
  ok(prod && prod.item && prod.price > 0 && prod.health > 0, 'de sportschool verkoopt een dagkaart');
  const st = { money: 20, health: 50 };
  const r = buyProduct(st, prod);
  ok(r.ok && st.money === 20 - prod.price && st.health > 50, 'de dagkaart kost geld en geeft gezondheid');
  const poor = { money: 1, health: 50 };
  ok(!buyProduct(poor, prod).ok && poor.money === 1, 'te weinig geld: niets gebeurt');
  ok(!productFor('woning', 'studentenkamer'), 'in een studentenkamer valt niets te kopen');
}

console.log(`interior_crowd_test: ${n} controles${bad ? `, ${bad} MISLUKT` : ' ok'}`);
process.exit(bad ? 1 : 0);
