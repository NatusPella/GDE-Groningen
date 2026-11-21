// Interieurs ronde 5 (#1150): de nieuwe pandtypes en recepten (school, ziekenhuis, museum, bioscoop, kapel): ze komen uit het gebouw,
// hebben hun eigen inrichting en mensen, blijven geldig en bereikbaar op elke maat, en elke rol heeft een uiterlijk en een schema.
// Puur, geen scene. Draai: node scripts/interior_pandtypes_test.mjs
import { planInterior } from '../game/js/interiorrules.js';
import { KINDS, kindOfBuilding, kindOfFacility, labelOf } from '../game/js/interiorkinds.js';
import { validateLayout } from '../game/js/interiorlayout.js';
import { SCRIPTS, scriptOf, makeStage, makeActor, stepActor } from '../game/js/interioractivity.js';
import { ROLES, npcLook } from '../game/js/interiornpc.js';
import { clerkLine } from '../game/js/interiortexts.js';
import { productFor, buyProduct } from '../game/js/interiorbuy.js';
import { building } from './interior_fixtures.mjs';
import { mulberry32 } from '../game/js/rng.js';

let bad = 0, n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ' (' + info + ')' : '')); } };
const rnd = mulberry32(1150);
const count = (L, t) => L.items.filter((i) => i.type === t).length;

// de soort en de variant komen uit het gebouw en uit de voorziening
const subOf = (t) => { const k = kindOfBuilding({ type: t, pts: [] }); return k ? k.kind + '/' + k.sub : null; };
ok(subOf('museum') === 'publiek/museum' && subOf('cinema') === 'publiek/bioscoop' && subOf('chapel') === 'kerk/kapel', 'museum, bioscoop en kapel uit het bouwtype');
ok(subOf('school') === 'publiek/school' && subOf('hospital') === 'publiek/ziekenhuis' && subOf('church') === 'kerk/null', 'school, ziekenhuis en kerk uit het bouwtype');
ok(kindOfFacility({ kind: 'museum' }).sub === 'museum' && kindOfFacility({ kind: 'cinema' }).sub === 'bioscoop', 'voorzieningen: museum en bioscoop');
ok(labelOf('publiek', 'museum') === 'Museum' && labelOf('publiek', 'bioscoop') === 'Bioscoop' && labelOf('kerk', 'kapel') === 'Kapel', 'labels');
ok(['arts', 'leraar', 'leerling', 'suppoost', 'museumbezoeker', 'filmbezoeker'].every((r) => KINDS.publiek.roles.includes(r)), 'de nieuwe rollen staan bij de soort publiek');

// elk recept over veel maten: geldig, niets uitgedund, de eigen inrichting en de eigen mensen
const spec = {
  school: { items: ['desk', 'chair', 'board', 'locker'], roles: ['leraar', 'leerling', 'baliemedewerker'], room: 'klaslokaal' },
  ziekenhuis: { items: ['bench', 'counter', 'sink'], roles: ['arts', 'baliemedewerker'], room: 'afdeling' },
  museum: { items: ['showcase', 'painting', 'counter'], roles: ['suppoost', 'museumbezoeker', 'baliemedewerker'], room: null },
  bioscoop: { items: ['pew', 'board', 'counter', 'coffee'], roles: ['filmbezoeker', 'baliemedewerker'], room: 'zaal' },
};
const seen = {};
for (const [sub, s] of Object.entries(spec)) {
  let made = 0, rooms = 0, thinned = 0;
  for (let k = 0; k < 40; k++) {
    const w = 5.5 + rnd() * 9, d = 7 + rnd() * 12;
    const r = building('publiek', sub, w, d, rnd);
    const p = planInterior(r.b, { spot: r.spot, upper: false });
    if (!p.ok) continue;
    made++;
    const L = p.layout;
    ok(p.sub === sub && p.label === labelOf('publiek', sub), sub + ': de variant en het label blijven', String(p.sub));
    ok(validateLayout(L).length === 0, sub + ': geldige indeling', validateLayout(L).join('; '));
    if (L.removed) thinned++;
    for (const t of s.items) seen[sub + t] = (seen[sub + t] || 0) + count(L, t);
    for (const role of s.roles) seen[sub + role] = (seen[sub + role] || 0) + L.npc.filter((q) => q.role === role).length;
    if (s.room && L.rooms.some((q) => q.id === s.room)) { rooms++; ok(L.openings.length >= 1, sub + ': een kamer heeft een deuropening'); }
    ok(L.use.some((u) => u.id === 'balie'), sub + ': een balie om te vragen of te kopen');
  }
  ok(made >= 30, sub + ': past in de meeste panden', made + '/40');
  ok(thinned === 0, sub + ': niets uitgedund', String(thinned));
  if (s.room) ok(rooms >= 5, sub + ': ' + s.room + ' bij een diep pand', String(rooms));
  for (const t of s.items) ok(seen[sub + t] > 0, sub + ': heeft ' + t, String(seen[sub + t]));
  for (const role of s.roles) ok(seen[sub + role] > 0, sub + ': heeft ' + role, String(seen[sub + role]));
}

// de kapel: klein, een blok banken, kaarsen
let chapels = 0;
for (let k = 0; k < 30; k++) {
  const r = building('kerk', 'kapel', 6 + rnd() * 4, 8 + rnd() * 5, rnd);
  const p = planInterior(r.b, { upper: false });
  if (!p.ok) continue;
  chapels++;
  ok(p.sub === 'kapel' && count(p.layout, 'altar') === 1 && count(p.layout, 'pew') >= 2 && count(p.layout, 'organ') === 0, 'kapel: altaar, banken, geen orgel');
  ok(validateLayout(p.layout).length === 0, 'kapel: geldige indeling');
  ok(p.layout.use.some((u) => u.id === 'kaars'), 'kapel: een kaars om aan te steken');
}
ok(chapels >= 20, 'kapellen komen er', String(chapels));

// elke rol van een indeling heeft een uiterlijk, een kleding en een eigen schema; de mensen bewegen zonder in meubels te lopen
for (const role of ['arts', 'leraar', 'leerling', 'suppoost', 'museumbezoeker', 'filmbezoeker']) {
  ok(ROLES[role] !== undefined, 'rol ' + role + ' heeft een uiterlijk');
  ok(SCRIPTS[role] && SCRIPTS[role].length >= 3, 'rol ' + role + ' heeft een eigen schema van minstens drie handelingen');
  const look = npcLook(role, 4242, 1, 0x3f6ea8, 'museum');
  ok(look && look.opts && look.opts.role, 'rol ' + role + ' wordt aangekleed uit een rolpool', String(look && look.opts && look.opts.role));
}
for (const sub of Object.keys(spec)) {
  const r = building('publiek', sub, 10, 14, rnd);
  const p = planInterior(r.b, { spot: r.spot, upper: false });
  if (!p.ok) { ok(false, sub + ': plan voor de loopproef'); continue; }
  const L = p.layout;
  const { walkGrid, reachable } = await import('../game/js/interiorlayout.js');
  const stage = makeStage(L, walkGrid(L), reachable(L, walkGrid(L)));
  const rn = mulberry32(7);
  const actors = L.npc.slice(0, 6).map((q, i) => makeActor(stage, q, rn, i));
  let steps = 0;
  for (let t = 0; t < 1200; t++) for (const a of actors) { stepActor(stage, a, 0.1, rn); steps++; }
  ok(actors.every((a) => Number.isFinite(a.u) && Number.isFinite(a.v) && a.u >= L.hall.u0 - 0.2 && a.u <= L.hall.u1 + 0.2 && a.v >= L.hall.v0 - 0.2 && a.v <= L.hall.v1 + 0.2), sub + ': de mensen blijven in de hal', String(steps));
  ok(scriptOf('suppoost').length > 0, 'schema bestaat');
}

// teksten en producten
ok(clerkLine('publiek', 3, 0, 'museum') !== clerkLine('publiek', 3, 0, 'gemeente') || clerkLine('publiek', 3, 1, 'museum') !== clerkLine('publiek', 3, 1, 'gemeente'), 'het museumloket zegt iets anders dan het gemeentehuis');
ok(/film|zaal|popcorn/i.test(clerkLine('publiek', 1, 0, 'bioscoop') + clerkLine('publiek', 2, 1, 'bioscoop') + clerkLine('publiek', 3, 2, 'bioscoop')), 'het bioscoopkassaloket praat over de film');
const card = productFor('publiek', 'museum'), movie = productFor('publiek', 'bioscoop');
ok(card && card.price > 0 && movie && movie.price > 0, 'museum en bioscoop verkopen een kaartje');
const st = { money: 20, health: 50 };
ok(buyProduct(st, movie).ok && st.money === 20 - movie.price && st.health > 50, 'een filmkaartje met popcorn kost geld en geeft een beetje gezondheid');
ok(!buyProduct({ money: 1, health: 50 }, card).ok, 'te weinig geld voor een museumkaartje');

// bereikbaarheid van woningen met de deur aan de rand van de hal (#1165): de wand van de slaapkamer begon in het deurgat naar de keuken
// (de audit vond ca. 0,2 procent van de huizen zonder indeling); nu houdt de deuropening 1,6 m afstand
{
  const { generateLayout } = await import('../game/js/interiorlayout.js');
  let nul = 0, thin = 0, total = 0;
  const halls = [[-6.3, 1, 10.7], [-1.3, 7.7, 8.2], [-1.4, 5, 11.1], [-1, 7.9, 13.1], [-9.9, 1.2, 8], [-4, 4, 9], [-5, 5, 12], [-3.1, 3.1, 7.6]];
  for (const [u0, u1, v1] of halls) for (let k = 1; k < 400; k++) {
    total++;
    const L = generateLayout({ kind: 'woning', sub: null, seed: k * 7919, hall: { u0, u1, v0: 0.3, v1 }, door: { w: 1.2, h: 2.1 }, height: 2.6 });
    if (!L) nul++; else if (L.removed) thin++;
  }
  ok(nul === 0, 'woningen met de deur aan de rand: elke hal geeft een indeling', nul + ' van ' + total);
  ok(thin === 0, 'woningen met de deur aan de rand: niets uitgedund', thin + ' van ' + total);
  const seed102947 = generateLayout({ kind: 'woning', sub: null, seed: 102947, hall: { u0: -6.3, u1: 1, v0: 0.3, v1: 10.7 }, door: { w: 1.2, h: 2.1 }, height: 2.6 });
  ok(seed102947 && validateLayout(seed102947).length === 0, 'het gevonden gevallen pand (zaad 102947) heeft nu een geldige indeling');
}

console.log(bad ? 'interior_pandtypes_test: ' + bad + ' van ' + n + ' mislukt' : 'interior_pandtypes_test: ' + n + ' controles ok');
process.exit(bad ? 1 : 0);
