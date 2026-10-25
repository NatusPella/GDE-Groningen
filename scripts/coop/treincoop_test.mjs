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
  ok(s2[0] === 40 && s2[1] === 40, `twee spelers: elk het volle bedrag: ${JSON.stringify(s2)}`);
  T.board(c, 2);
  const s3 = T.splitReward(c, 40);
  ok(s3[0] === 40 && s3[1] === 40 && s3[2] === 40, `drie aan boord: elk het volle bedrag: ${JSON.stringify(s3)}`);
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

// vloeiend rijden bij een gast (#434): de trein loopt tussen twee snapshots door en haalt een late snapshot zacht in
{
  ok(T.volgTrein(300, 301, 20, 1 / 60) > 300 && T.volgTrein(300, 301, 20, 1 / 60) < 301, 'een halve meter voor: hij schuift mee');
  const stap = T.volgTrein(300, 301, 20, 1 / 60) - 300;
  ok(Math.abs(stap - 20 / 60) < 0.02, 'en wel met de snelheid van de host', stap.toFixed(3));
  ok(Math.abs(T.volgTrein(300, 500, 20, 1 / 60) - 500) < 1e-9, 'een sprong van meer dan 20 m: meteen mee');
  ok(T.volgTrein(300, 300, 0, 1 / 60) === 300, 'stilstaan blijft stilstaan');
  ok(T.volgTrein(NaN, 300, 20, 1 / 60) === 300, 'zonder eigen plek: op het doel staan');
  ok(T.volgTrein(300, NaN, 20, 1 / 60) === 300, 'zonder doel: blijven staan');
  ok(T.volgTrein(320, 300, -8, 1 / 60) < 320, 'een trein die terugrijdt gaat achteruit');
  ok(T.volgTrein(990, 1010, 20, 1, 1000) === 1000, 'hij rijdt niet voorbij het einde van de route');
}

// een trein is solide, ook bij een gast (#436): de wagen duwt een lichaam de kortste kant op
{
  const wagen = { x: 0, y: 0, angle: 0, len: 17 };
  const d = T.duwVanWagen(wagen, 0.2, 0.1, 0.35);
  ok(d && d.depth > 0 && Math.abs(d.ny) === 1, 'naast de hartlijn: de duw gaat opzij');
  ok(T.duwVanWagen(wagen, 0, 0, 0.35).nx !== 0 || T.duwVanWagen(wagen, 0, 0, 0.35).ny !== 0, 'in het midden: er is altijd een duw');
  ok(T.duwVanWagen(wagen, 8.4, 0, 0.35).depth > 0 && Math.abs(T.duwVanWagen(wagen, 8.4, 0, 0.35).nx) === 1, 'bij de kop: langs de wagen naar buiten');
  ok(T.duwVanWagen(wagen, 12, 0, 0.35) === null, 'naast de wagen: geen duw');
  ok(T.duwVanWagen(wagen, 0, 4, 0.35) === null, 'naast de wagen (dwars): geen duw');
  // een wagen die schuin staat duwt ook schuin
  const schuin = T.duwVanWagen({ x: 0, y: 0, angle: Math.PI / 4, len: 17 }, 0, 0.5, 0.35);
  ok(schuin && Math.abs(Math.hypot(schuin.nx, schuin.ny) - 1) < 1e-9, 'de duw is een eenheidsvector');
  ok(T.duwVanWagen({}, 0, 0) === null && T.duwVanWagen(wagen, NaN, 0) === null, 'zonder gegevens: geen duw');
}

// de crew van cooptrein.js (#492): de gastheer is de machinist, de eerste gast conducteur en de volgende passagier
{
  const c = T.newCrew();
  ok(T.board(c, 0).role === 'machinist', 'de gastheer is de eerste machinist');
  const g = T.board(c, 1, 'conducteur');
  ok(g.ok && g.role === 'conducteur' && T.roleOf(c, 1) === 'conducteur', 'de eerste gast is conducteur');
  ok(T.may(c, 1, 'deuren') && T.may(c, 1, 'waak') && T.ackFrom(c, 1), 'de conducteur doet de deuren en de waakzaamheid');
  ok(!T.may(c, 1, 'hendel') && !T.may(c, 1, 'dienst') && !T.may(c, 1, 'noodrem'), 'maar niet de hendel, de dienst of de noodrem');
  const p = T.board(c, 2, 'conducteur');
  ok(p.ok && p.role === 'passagier', 'een tweede gast is passagier');
  ok(!T.may(c, 2, 'deuren') && !T.may(c, 2, 'waak'), 'een passagier mag de deuren en de waakzaamheid niet');
  ok(T.may(c, 0, 'hendel') && T.may(c, 0, 'dienst') && T.may(c, 0, 'deuren'), 'de gastheer houdt de hendel en de dienst');
  ok(T.members(c).length === 3 && c.machinist === 0 && c.conducteur === 1, 'drie aan boord, de gastheer is de machinist');
  const uit = T.leave(c, 2);
  ok(uit.takeover === null && T.roleOf(c, 2) === null && c.machinist === 0 && T.members(c).length === 2, 'een passagier stapt uit: de gastheer blijft machinist');
  ok(T.leave(c, 1).takeover === null && T.roleOf(c, 1) === null && c.conducteur === null, 'de conducteur stapt uit: zijn plek komt vrij');
  c.service = true;
  ok(T.board(c, 3).ok === false && T.roleOf(c, 3) === null, 'een late gast stapt niet in tijdens een dienst');
  c.service = false;
  ok(T.board(c, 3, 'conducteur').role === 'conducteur', 'zonder dienst is de nieuwe gast conducteur nu de plek vrij is');
  const s = T.splitReward(c, 40);
  ok(s[0] === 40 && s[3] === 40 && Object.keys(s).length === 2, 'elk crewlid het volle bedrag, de gastheer doet zelf mee');
  ok(T.TREIN_HALF_WID === 1.45, 'de halve breedte van een wagen komt uit deze regels');
}

console.log(`${n - fails}/${n} treincoop ok`);
process.exit(fails ? 1 : 0);
