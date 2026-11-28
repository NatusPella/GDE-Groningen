// Samen in dezelfde club of op hetzelfde erf (#1380, deel 2): de regels (game/js/loopbaansamen.js) en het transport (loopbaansamennet.js) over de echte netcode (coopnet.js) met een
// nepverbinding in het geheugen. Geen Electron en geen echte opslag.
//   node scripts/loopbaansamen_test.mjs
// Dekt: uitnodiging (J of N, geen antwoord is nee), later aansluiten pas bij de volgende ronde, de eerlijke verdeling (op de cent, niemand legt iets in, de eigenaar houdt zijn eigen opbrengst),
// nooit dubbel, wegvallen van een lid en van de eigenaar, de eigenaar als gast (host alleen als doorgever), de echte afzender, hostwissel zonder verlies en een oude client die 'crew' niet kent.
import assert from 'node:assert/strict';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import * as S from '../game/js/loopbaansamen.js';
import * as CN from '../game/js/loopbaansamennet.js';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 12).join(' | ')); } };
const INFO = N.handshakeInfo({ tiles: 'abc', story: 'oud' });
const toets = () => { const s = new Set(); return { s, wasPressed: (k) => s.delete(k), isDown: () => false, axis: () => [0, 0] }; };
const mk = (char = 'tammo', money = 0) => ({ player: { x: 0, y: 0, angle: 0, character: char, vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money, wanted: 0, camYaw: 0, time: 0, clock: 12, messages: [], addMessage(m) { this.messages.push(m); }, input: toets() });

// Een sessie: de host (plek 0) en gasten (plek 1, 2, ...). Geld per wereld.
function sessie(aantalGasten) {
  const hw = mk(); N.startHost(hw, INFO, { seed: 5, max: 8 });
  const s = { hw, gw: [], links: [], stap(secs) { for (let k = 0; k < Math.round(60 * secs); k++) { N.tickCoopNet(hw, 1 / 60); for (const g of s.gw) if (g.coopNet) N.tickCoopNet(g, 1 / 60); for (const l of s.links) l.advance(1 / 60); for (const g of s.gw) g.time += 1 / 60; hw.time += 1 / 60; } } };
  s.sluit = () => { const link = createLink({ latency: 0.03, jitter: 0.01, loss: 0, seed: 11 + s.gw.length * 7 }); N.addGuest(hw, link.a); const gw = mk('anita'); N.startClient(gw, link.b, INFO, {}); s.gw.push(gw); s.links.push(link); return gw; };
  s.val = (i) => { N.stopCoopNet(s.gw[i]); };
  s.einde = () => { for (const g of s.gw) { try { N.stopCoopNet(g); } catch (e) { /* weg */ } } try { N.stopCoopNet(hw); } catch (e) { /* weg */ } };
  for (let i = 0; i < aantalGasten; i++) s.sluit();
  s.stap(4);
  return s;
}
const slotVan = (g) => g.coopNet.session.slot;

// ---------------------------------------------------------------- de regels, puur
t('de teambonus: 15% per extra meewerkende mens, hooguit drie, nul alleen', () => {
  assert.equal(S.teamBonus(1000, 1), 0); assert.equal(S.teamBonus(1000, 2), 150); assert.equal(S.teamBonus(1000, 3), 300); assert.equal(S.teamBonus(1000, 4), 450); assert.equal(S.teamBonus(1000, 9), 450);
  assert.equal(S.teamBonus(-5, 3), 0); assert.equal(S.teamBonus(NaN, 3), 0);
});

t('de verdeling klopt altijd op de cent met de bonus, ook bij rare gewichten', () => {
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 400; i++) {
    const k = 1 + Math.floor(rnd() * 4), totaal = Math.floor(rnd() * 3000);
    const leden = Array.from({ length: k }, (_, j) => ({ slot: j, inzet: rnd() < 0.2 ? 0 : rnd() * 100 }));
    const uit = S.verdeelNaarInzet(totaal, leden);
    assert.equal(Object.values(uit).reduce((a, b) => a + b, 0), totaal, `som voor ${JSON.stringify(leden)} en ${totaal}`);
    for (const v of Object.values(uit)) assert.ok(Number.isInteger(v) && v >= 0);
  }
  assert.deepEqual(S.verdeelNaarInzet(100, [{ slot: 0, inzet: 0 }, { slot: 1, inzet: 0 }, { slot: 2, inzet: 0 }]), { 0: 34, 1: 33, 2: 33 }, 'geen inzet: gelijk, de rest naar de laagste plek');
  assert.deepEqual(S.verdeelNaarInzet(100, [{ slot: 0, inzet: 90 }, { slot: 1, inzet: 10 }]), { 0: 90, 1: 10 }, 'naar rato van de inzet');
  assert.deepEqual(S.verdeelNaarInzet(10, []), {});
});

t('een club: 40% van de bonus naar de clubkas, de rest naar de leden; de eigenaar houdt zijn eigen opbrengst helemaal', () => {
  const c = S.maakCrew({ id: 'c0', soort: 'club', eigenaar: 0, naam: 'Vv Terpzicht' });
  S.nodigUit(c, [1, 2], 0); S.antwoord(c, 1, true); S.antwoord(c, 2, true);
  S.beginRonde(c, 'dag1');
  S.zetInzet(c, 0, 90); S.zetInzet(c, 1, 90); S.zetInzet(c, 2, 0);
  const b = S.boek(c, 'wedstrijd-1', 1000);
  assert.equal(b.bonus, 300); assert.equal(b.kas, 120); assert.equal(c.kasTotaal, 120);
  assert.equal(b.kas + Object.values(b.uitkering).reduce((a, x) => a + x, 0), b.bonus, 'niets weg en niets erbij');
  assert.deepEqual(b.uitkering, { 0: 90, 1: 90, 2: 0 }, 'naar rato van de inzet: wie niet speelde krijgt van de bonus niets (wel zijn eigen beloning elders)');
  assert.equal(S.boek(c, 'wedstrijd-1', 1000), null, 'dezelfde gebeurtenis boekt nooit twee keer');
  const b2 = S.boek(c, 'wedstrijd-2', 1000);
  assert.deepEqual(b2.uitkering, { 0: 60, 1: 60, 2: 60 }, 'zonder nieuwe inzet: gelijk');
});

t('een erf heeft geen clubkas: de hele bonus gaat naar de meewerkenden', () => {
  const c = S.maakCrew({ id: 'e0', soort: 'erf', eigenaar: 0, naam: 'De Zonnehoek' });
  S.nodigUit(c, [1], 0); S.antwoord(c, 1, true); S.beginRonde(c, 'oogst');
  S.zetInzet(c, 1, 3); S.zetInzet(c, 0, 1);
  const b = S.boek(c, 'oogst-1', 400);
  assert.equal(b.bonus, 60); assert.equal(b.kas, 0); assert.deepEqual(b.uitkering, { 0: 15, 1: 45 });
});

t('uitnodigen: geen antwoord is nee, een J tijdens een ronde telt pas bij de volgende, maximaal vier mensen', () => {
  const c = S.maakCrew({ id: 'c0', soort: 'club', eigenaar: 0 });
  assert.deepEqual(S.nodigUit(c, [0, 1, 2, 3, 4], 0), [1, 2, 3], 'de eigenaar nodigt zichzelf niet uit en het maximum is vier');
  assert.equal(S.antwoord(c, 1, true), 'mee'); assert.equal(S.antwoord(c, 2, false), 'nee'); assert.equal(S.antwoord(c, 1, true), null, 'één antwoord per vraag');
  assert.deepEqual(S.tik(c, S.UITNODIGING_S - 1), []); assert.deepEqual(S.tik(c, S.UITNODIGING_S), [3], 'plek 3 antwoordde niet: nee');
  S.beginRonde(c, 'r1');
  assert.deepEqual(S.nodigUit(c, [2], 30), [2]); assert.equal(S.antwoord(c, 2, true), 'later', 'tijdens de ronde: pas de volgende');
  assert.deepEqual(S.meeLeden(c), [0, 1]);
  S.zetInzet(c, 2, 50); assert.deepEqual(c.open, {}, 'wie nog niet meedoet kan geen inzet verdienen');
  S.eindeRonde(c); S.beginRonde(c, 'r2');
  assert.deepEqual(S.meeLeden(c), [0, 1, 2]);
});

t('wegvallen: wie weggaat telt niet meer mee en de rest rekent door; valt de eigenaar weg, dan eindigt alles zonder saldo', () => {
  const c = S.maakCrew({ id: 'c0', soort: 'club', eigenaar: 0 });
  S.nodigUit(c, [1, 2], 0); S.antwoord(c, 1, true); S.antwoord(c, 2, true); S.beginRonde(c, 'r1');
  S.zetInzet(c, 1, 10);
  assert.equal(S.verlaat(c, 1), false);
  const b = S.boek(c, 'g1', 1000);
  assert.deepEqual(Object.keys(b.uitkering).map(Number).sort(), [0, 2], 'plek 1 is weg: zijn inzet telt niet en hij krijgt niets meer');
  assert.equal(b.kas + Object.values(b.uitkering).reduce((a, x) => a + x, 0), b.bonus);
  assert.equal(S.verlaat(c, 0), true); assert.ok(S.isOpgeheven(c)); assert.equal(S.boek(c, 'g2', 1000), null);
});

t('een uitkering wordt begrensd en komt alleen van de eigenaar van het gezelschap', () => {
  const lid = { crew: 'c0', eigenaar: 0 };
  assert.deepEqual(S.leesUitkering(lid, { crew: 'c0', ev: 'x', geld: 100 }, 0), { ev: 'crew:x', geld: 100 });
  assert.equal(S.leesUitkering(lid, { crew: 'c0', ev: 'x', geld: 100 }, 2), null, 'een andere afzender');
  assert.equal(S.leesUitkering(lid, { crew: 'c9', ev: 'x', geld: 100 }, 0), null, 'een ander gezelschap');
  assert.equal(S.leesUitkering(lid, { crew: 'c0', ev: 'x', geld: 1e12 }, 0).geld, S.MAX_BEDRAG);
  for (const slecht of [-5, 0, NaN, 'veel', null]) assert.equal(S.leesUitkering(lid, { crew: 'c0', ev: 'x', geld: slecht }, 0), null);
  assert.equal(S.leesUitkering(null, { crew: 'c0', ev: 'x', geld: 5 }, 0), null);
});

// ---------------------------------------------------------------- over de echte netcode
t('de host is eigenaar: de gasten krijgen de vraag, J en N werken met de toets, en elk lid krijgt zijn deel in zijn eigen portemonnee', () => {
  const s = sessie(3);
  const [g1, g2, g3] = s.gw;
  const c = CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht');
  assert.ok(c); s.stap(1);
  for (const g of s.gw) assert.ok(g.crewUitnodiging, 'elke gast ziet de vraag'), assert.match(g.messages.join(' '), /Meedoen in mijn club\?/);
  g1.input.s.add('j'); g2.input.s.add('n');                               // gast 3 antwoordt niet
  s.stap(1);
  assert.ok(!g1.crewUitnodiging); assert.ok(g1.crewLid); assert.ok(!g2.crewLid);
  s.stap(S.UITNODIGING_S);
  assert.ok(!g3.crewUitnodiging, 'geen antwoord: de vraag is verlopen');
  assert.deepEqual(S.meeLeden(s.hw.crew), [0, slotVan(g1)], 'de host en gast 1 doen mee');
  assert.equal(g1.crewLid.status, 'mee');
  CN.crewBeginRonde(s.hw, 'dag1'); CN.crewInzet(s.hw, 0, 45); CN.crewInzet(s.hw, slotVan(g1), 45);
  const voor = [s.hw.money, g1.money, g2.money, g3.money];
  const b = CN.crewBoek(s.hw, 'wed1', 1000);
  s.stap(2);
  assert.equal(b.bonus, 150);
  assert.equal(s.hw.money - voor[0] + g1.money - voor[1], 90, 'de uitgekeerde bonus is er precies');
  assert.equal(g1.money, 45); assert.equal(g1.coopVerdiend, 45, 'in de eigen save van de gast'); assert.equal(s.hw.money, 45);
  assert.equal(g2.money, 0); assert.equal(g3.money, 0); assert.equal(s.hw.crew.kasTotaal, 60);
  assert.match(g1.messages.join(' '), /Teambonus van de club: €45/);
  s.einde();
});

t('de eigenaar is een gast: de host geeft alleen door met de echte afzender; een andere gast en de host zijn gewoon leden', () => {
  const s = sessie(2);
  const [g1, g2] = s.gw, o = slotVan(g1);
  const c = CN.crewUitnodigen(g1, 'erf', 'De Zonnehoek');
  assert.ok(c); assert.equal(c.eigenaar, o);
  s.stap(1);
  assert.ok(g2.crewUitnodiging, 'de andere gast ziet de vraag'); assert.equal(g2.crewUitnodiging.eigenaar, o, 'de echte eigenaar, door de host gestempeld');
  assert.equal(s.hw.crewUitnodiging && s.hw.crewUitnodiging.eigenaar, o, 'ook de host is gewoon een speler en krijgt de vraag');
  s.hw.input.s.add('j'); g2.input.s.add('j');
  s.stap(1);
  assert.deepEqual(S.meeLeden(g1.crew), [0, o, slotVan(g2)].sort((a, b) => a - b));
  CN.crewBeginRonde(g1, 'oogst'); CN.crewInzet(g1, o, 1); CN.crewInzet(g1, 0, 1); CN.crewInzet(g1, slotVan(g2), 2);
  CN.crewBoek(g1, 'oogst-1', 1000);
  s.stap(2);
  assert.equal(s.hw.money, 75); assert.equal(g2.money, 150); assert.equal(g1.money, 75, 'de eigenaar boekt zijn eigen deel in zijn eigen portemonnee');
  assert.equal(s.hw.money + g1.money + g2.money, 300, 'de bonus van 30% van 1000, op de cent');
  s.einde();
});

t('nooit dubbel: dezelfde uitkering twee keer ontvangen geeft één keer geld', () => {
  const s = sessie(1); const g = s.gw[0];
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht'); s.stap(1); g.input.s.add('j'); s.stap(1);
  CN.crewBeginRonde(s.hw, 'r'); CN.crewInzet(s.hw, 0, 1); CN.crewInzet(s.hw, slotVan(g), 1);
  N.handleEvent(g, { k: 'crew', a: 'uitkering', crew: s.hw.crew.id, ev: 'zelfde', geld: 50, from: 0 });
  N.handleEvent(g, { k: 'crew', a: 'uitkering', crew: s.hw.crew.id, ev: 'zelfde', geld: 50, from: 0 });
  assert.equal(g.money, 50);
  CN.crewBoek(s.hw, 'w1', 1000); const geld = g.money; s.stap(2); const na = g.money;
  assert.ok(na > geld); N.handleEvent(g, { k: 'crew', a: 'uitkering', crew: s.hw.crew.id, ev: `${s.hw.crew.id}:w1`, geld: 999, from: 0 });
  assert.equal(g.money, na, 'de gebeurtenis van de host is al geboekt');
  s.einde();
});

t('een gast kan niemand betalen: een uitkering van een ander dan de eigenaar telt niet', () => {
  const s = sessie(2); const [g1, g2] = s.gw;
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht'); s.stap(1); g1.input.s.add('j'); g2.input.s.add('j'); s.stap(1);
  // gast 1 doet alsof hij de eigenaar is en betaalt gast 2 via de host
  g1.coopNet.session.sendEvent({ k: 'crew', a: 'uitkering', crew: s.hw.crew.id, ev: 'vals2', geld: 1000, to: slotVan(g2) });
  s.stap(2);
  assert.equal(g2.money, 0, 'de host zet de echte afzender in from; gast 2 weet dat de eigenaar de host is');
  // en een gast die zich voor de eigenaar uitgeeft in het veld from: de host overschrijft het
  g1.coopNet.session.sendEvent({ k: 'crew', a: 'uitkering', crew: s.hw.crew.id, ev: 'vals3', geld: 1000, to: slotVan(g2), from: 0 });
  s.stap(2);
  assert.equal(g2.money, 0);
  s.einde();
});

t('wegvallen van een lid: hij houdt wat hij kreeg, de rest rekent door; de eigenaar die wegvalt beëindigt het gezelschap', () => {
  const s = sessie(2); const [g1, g2] = s.gw;
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht'); s.stap(1); g1.input.s.add('j'); g2.input.s.add('j'); s.stap(1);
  CN.crewBeginRonde(s.hw, 'r'); CN.crewInzet(s.hw, slotVan(g1), 10); CN.crewInzet(s.hw, slotVan(g2), 10);
  CN.crewBoek(s.hw, 'w1', 1000); s.stap(2);
  const m1 = g1.money, m2 = g2.money; assert.ok(m1 > 0 && m2 > 0);
  const slot1 = slotVan(g1); s.val(0); s.stap(2);
  assert.ok(!S.meeLeden(s.hw.crew).includes(slot1), 'de host weet dat hij weg is');
  assert.equal(g1.money, m1, 'zijn geld blijft van hem');
  CN.crewInzet(s.hw, slotVan(g2), 10); CN.crewBoek(s.hw, 'w2', 1000); s.stap(2);
  assert.ok(g2.money > m2); assert.equal(g1.money, m1, 'wie weg is krijgt niets meer en verliest niets');
  assert.equal(S.meeLeden(s.hw.crew).length, 2);
  s.einde();
});

t('de eigenaar (een gast) valt weg: de leden horen het en niemand verliest iets', () => {
  const s = sessie(2); const [g1, g2] = s.gw;
  CN.crewUitnodigen(g1, 'erf', 'De Zonnehoek'); s.stap(1); g2.input.s.add('j'); s.hw.input.s.add('j'); s.stap(1);
  assert.ok(g2.crewLid);
  CN.crewBeginRonde(g1, 'o'); CN.crewInzet(g1, slotVan(g2), 2); CN.crewBoek(g1, 'o1', 1000); s.stap(2);
  const m = g2.money, mh = s.hw.money; assert.ok(m > 0);
  s.val(0); s.stap(2);
  assert.ok(!g2.crewLid, 'het gezelschap is afgelopen'); assert.ok(!s.hw.crewLid);
  assert.equal(g2.money, m); assert.equal(s.hw.money, mh);
  assert.match(g2.messages.join(' '), /samenwerken is afgelopen/);
  s.einde();
});

t('later aansluiten: een nieuwe gast heeft geen gezelschap tot de eigenaar hem uitnodigt en doet dan pas bij de volgende ronde mee', () => {
  const s = sessie(1);
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht'); s.stap(1); s.gw[0].input.s.add('j'); s.stap(1);
  CN.crewBeginRonde(s.hw, 'r1');
  const laat = s.sluit(); s.stap(3);
  assert.ok(!laat.crewUitnodiging); assert.ok(!laat.crewLid, 'niets met terugwerkende kracht');
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht', [slotVan(laat)]); s.stap(1);
  assert.ok(laat.crewUitnodiging); laat.input.s.add('j'); s.stap(1);
  assert.equal(laat.crewLid.status, 'later'); assert.equal(S.meeLeden(s.hw.crew).includes(slotVan(laat)), false, 'niet halverwege een ronde');
  CN.crewInzet(s.hw, 0, 1); CN.crewBoek(s.hw, 'r1-w', 1000); s.stap(2);
  assert.equal(laat.money, 0, 'de bonus van deze ronde is niet van hem');
  CN.crewEindeRonde(s.hw); CN.crewBeginRonde(s.hw, 'r2'); CN.crewInzet(s.hw, slotVan(laat), 5); CN.crewBoek(s.hw, 'r2-w', 1000); s.stap(2);
  assert.ok(laat.money > 0, 'de volgende ronde doet hij mee');
  s.einde();
});

t('hostwissel en einde van de sessie: het gezelschap verdwijnt, alles was al geboekt; een nieuwe sessie begint opnieuw met vragen', () => {
  const s = sessie(1); const g = s.gw[0];
  CN.crewUitnodigen(s.hw, 'club', 'Vv Terpzicht'); s.stap(1); g.input.s.add('j'); s.stap(1);
  CN.crewBeginRonde(s.hw, 'r'); CN.crewInzet(s.hw, 0, 1); CN.crewInzet(s.hw, slotVan(g), 1); CN.crewBoek(s.hw, 'w', 1000); s.stap(2);
  const m = g.money, mh = s.hw.money; assert.ok(m > 0);
  s.einde();
  assert.equal(g.money, m); assert.equal(s.hw.money, mh); assert.equal(s.hw.crew, null); assert.ok(!g.crewLid);
  const s2 = sessie(1); assert.ok(!s2.gw[0].crewLid, 'een nieuwe sessie kent het oude gezelschap niet'); s2.einde();
});

t('berichten van een oude of slechte afzender doen niets: onbekend soort, zonder sessie, slechte velden', () => {
  const s = sessie(1); const g = s.gw[0];
  assert.equal(N.handleEvent(g, { k: 'crew', a: 'nodig', crew: 'x', soort: 'schaakclub', naam: 'a', from: 0 }), true);
  assert.ok(!g.crewUitnodiging, 'een onbekend soort vraagt niets');
  for (const slecht of [{ k: 'crew' }, { k: 'crew', a: 5, crew: 'x' }, { k: 'crew', a: 'nodig', crew: 'x', soort: 'club' }]) assert.doesNotThrow(() => N.handleEvent(g, slecht, 0));
  const los = mk();                                                       // zonder sessie
  assert.equal(CN.crewUitnodigen(los, 'club', 'x'), null);
  assert.equal(CN.crewBoek(los, 'x', 100), null);
  s.einde();
});

console.log(`loopbaansamen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
