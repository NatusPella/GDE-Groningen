// De rollen in de trein samen (treincoop.js, #444), puur: wie machinist is, wie de deuren en de waakzaamheid mag bedienen,
// overnemen bij wegvallen, geen late instap halverwege een dienst, de beloning per halte en het checkpoint.
//   node scripts/coop/treincoop_test.mjs
import * as T from '../../game/js/treincoop.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

// instappen: wie het eerst komt is machinist, ongeacht wie host is
{
  const c = T.newCrew();
  ok(T.board(c, 2).role === 'machinist', 'de eerste (slot 2, geen host) is machinist');
  ok(T.board(c, 0, 'conducteur').role === 'conducteur', 'de tweede kan conducteur worden');
  ok(T.board(c, 1, 'conducteur').role === 'passagier', 'een derde conducteur kan niet: passagier');
  ok(T.board(c, 0).role === 'conducteur', 'opnieuw instappen geeft dezelfde rol');
  ok(T.members(c).length === 3, 'drie aan boord');
  // rechten
  ok(T.may(c, 2, 'hendel') && T.may(c, 2, 'dienst') && T.may(c, 2, 'noodrem') && T.may(c, 2, 'deuren') && T.may(c, 2, 'waak'), 'de machinist mag alles');
  ok(!T.may(c, 0, 'hendel') && !T.may(c, 0, 'dienst') && !T.may(c, 0, 'noodrem'), 'de conducteur heeft de hendel niet');
  ok(T.may(c, 0, 'deuren') && T.may(c, 0, 'waak') && T.ackFrom(c, 0), 'de conducteur doet deuren en waakzaamheid');
  ok(!T.may(c, 1, 'deuren') && !T.may(c, 1, 'waak') && T.may(c, 1, 'rondlopen'), 'een passagier loopt alleen rond');
  ok(!T.may(c, 7, 'rondlopen'), 'wie niet aan boord is, mag niets');
}

// wisselen en wegvallen
{
  const c = T.newCrew();
  T.board(c, 0); T.board(c, 1, 'conducteur'); T.board(c, 2);
  ok(T.swap(c, 0, 1) && c.machinist === 1 && c.conducteur === 0, 'de rol is wisselbaar met de conducteur');
  ok(!T.swap(c, 0, 1), 'wie geen machinist is, kan niet wisselen');
  ok(T.swap(c, 1, 2) && c.machinist === 2 && c.passagiers.includes(1), 'en met een passagier');
  const r = T.leave(c, 2);
  ok(r.takeover === 0 && c.machinist === 0 && c.conducteur === null, 'valt de machinist weg, dan neemt de conducteur over');
  const r2 = T.leave(c, 0);
  ok(r2.takeover === 1 && c.machinist === 1, 'daarna neemt de passagier over');
  const r3 = T.leave(c, 1);
  ok(r3.takeover === null && r3.brake === false && T.members(c).length === 0, 'is er niemand meer, dan is de trein leeg');
  // niemand die kan overnemen maar wel een passagier die niet kan: kan niet voorkomen; de machinist alleen met een conducteur weg
  const d = T.newCrew();
  T.board(d, 5);
  ok(T.leave(d, 5).takeover === null, 'alleen: stappen uit is gewoon uitstappen');
  const e = T.newCrew();
  T.board(e, 3); T.board(e, 4, 'conducteur');
  T.leave(e, 3);
  ok(e.machinist === 4, 'de conducteur is machinist geworden');
}

// geen late instap
{
  const c = T.newCrew();
  T.board(c, 0);
  c.service = true;
  ok(T.board(c, 1).ok === false, 'halverwege een dienst stapt niemand in');
  c.service = false;
  ok(T.board(c, 1).ok === true, 'zonder dienst wel');
  const d = T.newCrew();
  d.service = true;
  ok(T.board(d, 0).ok === true && d.machinist === 0, 'de eerste mag altijd, ook als de dienst al loopt (hij start hem)');
}

// de beloning
{
  const c = T.newCrew();
  T.board(c, 0);
  ok(JSON.stringify(T.splitReward(c, 40)) === JSON.stringify({ 0: 40 }), 'alleen: alles voor jou');
  T.board(c, 1, 'conducteur');
  const s2 = T.splitReward(c, 40);
  ok(s2[0] + s2[1] === Math.round(40 * (1 + T.COOP_BONUS)) && Math.abs(s2[0] - s2[1]) <= 1, `twee spelers delen gelijk met bonus: ${JSON.stringify(s2)}`);
  T.board(c, 2);
  const s3 = T.splitReward(c, 40);
  ok(s3[0] + s3[1] + s3[2] === 46 && s3[1] === s3[2] && s3[0] >= s3[1], `drie aan boord: gelijke delen, de rest bij de machinist: ${JSON.stringify(s3)}`);
  ok(Object.keys(T.splitReward(T.newCrew(), 40)).length === 0 && Object.keys(T.splitReward(c, 0)).length === 0, 'niemand of niets: niets');
}

// checkpoint
{
  const c = T.newCrew();
  T.board(c, 4); T.board(c, 1, 'conducteur'); T.board(c, 0);
  c.service = false;
  const back = T.restore(T.snapshot(c));
  ok(JSON.stringify(back) === JSON.stringify(c), 'het checkpoint geeft dezelfde bezetting terug');
  ok(T.roleOf(back, 4) === 'machinist' && T.roleOf(back, 1) === 'conducteur' && T.roleOf(back, 0) === 'passagier', 'ook na een host-wissel weten we wie wat is');
}

console.log(`${n - fails}/${n} treincoop ok`);
process.exit(fails ? 1 : 0);
