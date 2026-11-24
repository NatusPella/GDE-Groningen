// Verfijnronde Bezit, boerderij, snackwagen en economie (22-11): dagrapport als melding, kudde bij verkoop van een perceel, duidelijke koopfouten, bevestiging bij
// grote uitgaven (vee, ketenuitbreiding, renovatie, bulk), redenen achter grijze knoppen, lege staten, oogstmelding, snack-uitleg, fuzz en een lange simulatie.
// Puur: nepopslag, geen DOM, geen Electron.   node scripts/bezit_verfijn_test.mjs
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as U from '../game/js/bezitui.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';
import * as GT from '../game/js/bezitgate.js';
import * as SL from '../game/js/snacklive.js';
import * as SU from '../game/js/snackui.js';
import * as R from '../game/js/holdingreport.js';
import { harvestReadyLine } from '../game/js/harvestnotice.js';
import { offerCardHtml } from '../game/js/forsalecard.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join(' | ')); } };
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const FILE = { v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], places: [['Winsum', 220000, 590000]],
  rows: [['paaaaaaaaaaa1', 220100, 590100, 300, 0, 0, 220090, 590090], ['pbbbbbbbbbbb2', 220900, 590500, 1500, 1, 1, 220890, 590490]] };
const BFILE = { v: 1, types: ['retail', 'church', 'industrial'], rows: [[111, 220150, 590150, 400, 0, 6, 0], [222, 220160, 590160, 900, 1, 12, 1], [333, 220170, 590170, 2000, 2, 8, 0]] };
const reset = () => { const s = nep(); L.initBezit({ opslag: s }); BL.initBoerderij({ opslag: s }); L.setIndexForTest(FILE, BFILE); L.setClaimLookup(null); L.setClaimSend(null); GT.resetUnlockGate(); U.ui.confirm = null; U.ui.msg = ''; U.ui.sel.clear?.(); SU.sui.msg = ''; SU.sui.confirm = null; R.resetLastReport(); };
const w = (money = 100000) => ({ money, calendar: { day: 100 }, msgs: [], addMessage(x, d, o) { this.msgs.push({ x, o }); } });
const ctx = (world) => ({ bezit: L.getBezit(), farm: BL.getBoerderij(), money: world.money, day: 0 });

// ---- dagrapport ----
t('dagrapport: een regel met het totaal en de posten, met teken en duizendtallen', () => {
  const s = R.dayReportLine({ days: 1, parcels: 1200, business: 340, snack: 0, chains: 0, eventMoney: 0, premium: 30, net: 1510 });
  assert.equal(s, 'Dagrapport: +€1.510 (percelen +€1.200, bedrijven +€340, verzekering -€30).');
});
t('dagrapport: meerdere dagen, verlies en een leeg budget geven de juiste zin', () => {
  assert.match(R.dayReportLine({ days: 5, net: -80, eventMoney: -80 }), /^Dagrapport, 5 dagen: -€80 \(bijzonder -€80\)\.$/);
  assert.match(R.dayReportLine({ days: 1, net: -50, premium: 50 }, 0), /Je geld is op: de kosten lopen door\.$/);
  assert.ok(!/Je geld is op/.test(R.dayReportLine({ days: 1, net: -50, premium: 50 }, 900)));
});
t('dagrapport: niets te melden, rommel en NaN geven null of een veilige regel, nooit een fout', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { net: 0 }, { net: NaN, parcels: NaN }]) assert.equal(R.dayReportLine(bad), null);
  const s = R.dayReportLine({ days: NaN, net: 10, parcels: Infinity });
  assert.match(s, /^Dagrapport: \+€10\.$/);
});
t('dagrapport: de melding krijgt een vaste sleutel (vervangt gisteren), het laatste rapport blijft in het overzicht', () => {
  reset(); const world = w(); const rep = { days: 1, net: 90, parcels: 90 };
  assert.equal(R.deliverDayReport(world, rep), true);
  assert.equal(world.msgs[0].o.key, 'bz-dagrapport'); assert.equal(world.msgs[0].o.kind, 'geld');
  assert.equal(R.deliverDayReport({ money: 1 }, rep), false, 'zonder addMessage geen melding en geen fout');
  assert.equal(R.deliverDayReport(world, { net: 0 }), false);
  assert.match(U.summaryHtml(ctx(world)), /data-rapport="1"[^>]*>Dagrapport: \+€90 \(percelen \+€90\)\.</);
  R.resetLastReport();
  assert.ok(!U.summaryHtml(ctx(world)).includes('data-rapport'));
});

t('dagrapport: het personeel werkte staat in de regel; een dag zonder geld maar met werk wordt wel gemeld', () => {
  assert.match(R.dayReportLine({ days: 1, net: 120, parcels: 120, worked: [{ id: 'a' }, { id: 'b' }] }), /Personeel werkte op 2 percelen.$/);
  assert.equal(R.dayReportLine({ days: 1, net: 0, worked: [{ id: 'a' }] }), 'Dagrapport: +€0. Personeel werkte op 1 perceel.');
  assert.equal(R.dayReportLine({ days: 1, net: 0, worked: [null, 3] }), null);
});
t('meldingen onder het tabblad verlopen na twintig seconden en hangen niet eeuwig', () => {
  reset(); const world = w();
  U.ui.msg = 'Gekocht.'; U.ui.msgAt = 0;
  assert.equal(U.msgNow(), 'Gekocht.');
  U.ui.msgAt = Date.now() - 1000; assert.equal(U.msgNow(), 'Gekocht.');
  U.ui.msgAt = Date.now() - U.MSG_TTL_MS - 5; assert.equal(U.msgNow(), '');
  assert.ok(!U.forSaleHtml({ money: 1, offers: [] }).includes('Gekocht.'));
  U.ui.msg = ''; U.ui.msgAt = 0;
});

// ---- oogstmelding ----
t('oogstmelding: een veld, een paar velden en veel velden tegelijk; rommel geeft null', () => {
  assert.equal(harvestReadyLine([{ gewas: 'Aardappelen', plek: 'Noord' }]), 'Aardappelen op Noord is oogstklaar. Zoek de lichtkolom en oogst met de maaidorser.');
  assert.equal(harvestReadyLine([{ gewas: 'Mais', plek: 'A' }, { gewas: '', plek: 'B' }]), 'Oogstklaar: Mais op A, Je gewas op B.');
  const veel = harvestReadyLine(Array.from({ length: 7 }, () => ({ gewas: 'Mais', plek: 'X' })));
  assert.match(veel, /^7 velden zijn oogstklaar\. Kies in Land en bedrijf de knop Oogst alles/);
  for (const bad of [null, undefined, [], 'x', [null, 3]]) assert.equal(harvestReadyLine(bad), null);
});

// ---- verkoop van een perceel met kudde ----
t('perceel verkopen met kudde: de kudde wordt uitbetaald en verdwijnt, de kaart noemt het', () => {
  reset(); const world = w(80000);
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const hv = L.koopVee(world, 'paaaaaaaaaaa1', 'melkvee'); assert.ok(hv.ok, hv.text);
  const o = L.parcelOffer('paaaaaaaaaaa1');
  assert.ok(o.herdValue > 0 && o.sellValue > 0);
  const html = offerCardHtml(o, { stap: 'verkoop', money: world.money });
  assert.ok(html.includes('je kudde levert'), 'de bevestiging noemt de kudde');
  const voor = world.money;
  const r = L.verkoopPerceel(world, 'paaaaaaaaaaa1');
  assert.ok(r.ok && r.herd === o.herdValue && r.refund === o.sellValue + o.herdValue, JSON.stringify(r));
  assert.equal(world.money, voor + r.refund);
  assert.match(r.text, /kudde/);
  assert.equal(Object.keys(L.getBezit().x.herds || {}).length, 0, 'geen wees-kudde achter');
  assert.equal(L.verkoopPerceel(world, 'paaaaaaaaaaa1').ok, false, 'dubbel verkopen kan niet');
});
t('exploit: perceel kopen, vee erop kopen en alles verkopen levert nooit winst', () => {
  reset(); const world = w(80000); const start = world.money;
  for (let i = 0; i < 12; i++) {
    assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
    L.koopVee(world, 'paaaaaaaaaaa1', 'schapen');
    assert.ok(L.verkoopPerceel(world, 'paaaaaaaaaaa1').ok);
    assert.ok(world.money < start, `ronde ${i}: ${world.money} < ${start}`);
  }
  const o = L.parcelOffer('pbbbbbbbbbbb2'); assert.equal(o.herdValue, 0, 'een perceel zonder kudde: geen kuddewaarde');
});

// ---- koopfouten ----
t('koop: elke weigering heeft een eigen zin; vee op een perceel van een ander zegt dat', () => {
  assert.equal(L.buyFailText({ why: 'te-weinig-geld', tekort: 1234 }), 'Je mist nog €1.234.');
  assert.match(L.buyFailText({ why: 'vol' }), /maximum/);
  assert.match(L.buyFailText({ why: 'al-van-jou' }), /al van jou/);
  assert.match(L.buyFailText({ why: 'iets-anders' }), /Probeer het zo nog eens/);
  assert.match(L.buyFailText(null), /Kopen lukt nu niet/);
  reset(); const world = w(80000);
  assert.match(L.koopVee(world, 'pbbbbbbbbbbb2', 'melkvee').text, /niet van jou/);
});

// ---- bevestiging en redenen ----
t('vee kopen (Velden): de knop per soort staat er, zonder geld met de reden; de aankoop gaat via veldenActie', () => {
  reset(); const world = w(80000);
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const h = U.veldenView(world);
  assert.match(h, /data-vd="koop-vee" data-id="paaaaaaaaaaa1" data-sp="melkvee"/);
  world.money = 100; // zonder geld: een grijze knop met de reden
  assert.match(U.veldenView(world), /data-vd="koop-vee"[^>]*disabled>[^<]*<small>Je mist nog €[\d.]+<\/small>/);
  world.money = 80000;
  // bezit-ui 24-11: Velden vraagt geen tweede druk meer voor vee (de knop zegt wat het kost); de aankoop loopt direct
  U.veldenActie(world, { vd: 'koop-vee', id: 'paaaaaaaaaaa1', sp: 'melkvee' });
  assert.match(U.veldenView(world), /data-vd="verkoop-vee"/, 'na de aankoop staat er een kudde');
});
t('bulk met kosten: de schatting volgt uit bulkCost; bulk zonder kosten is gratis', () => {
  reset(); const world = w(80000);
  assert.ok(L.koopPerceel(world, 'paaaaaaaaaaa1').ok);
  const rows = ctx(world);
  const own = Object.keys(rows.bezit.parcels).filter((id) => !rows.bezit.parcels[id].lg);
  assert.ok(U.bulkCost('bulk-mieren', rows.bezit, own) > 0);
  assert.equal(U.bulkCost('bulk-oogst', rows.bezit, own), 0);
  assert.match(U.bulkText('bulk-mieren', { ok: true }) || 'ok', /./);
});
t('ketenuitbreiding vraagt een tweede druk; renovatie toont de prijs en vraagt een tweede druk', () => {
  const VIEW = { id: 'kaas', name: 'Melk naar kaas', margin: 0.15, sourceKg: 440, sourceCount: 2, picked: 0, closedDays: 0, last: null, weakest: null, sources: [], links: [
    { id: 'kaasmakerij', label: 'Kaasmakerij', role: 'processor', owned: true, ownable: true, fill: 0.5, stock: 10, cap: 100, perDay: 50, trucks: 0, wage: 0, distance: 0, ref: 111, options: [] },
    { id: 'verkoop', label: 'Markt', role: 'outlet', owned: false, ownable: false, fill: 0, stock: 0, cap: 1500, perDay: 400, trucks: 0, wage: 0, distance: 0, ref: null, options: [] }] };
  U.ui.confirm = null;
  assert.match(U.chainsHtml([VIEW], 5000), /data-bz="keten-uit" data-id="kaas\|kaasmakerij"/);
  U.ui.confirm = 'keten-uit:kaas|kaasmakerij';
  const h = U.chainsHtml([VIEW], 5000);
  assert.match(h, /bd-zeker/); assert.match(h, /\+25%/); assert.match(h, /data-ok="1"/);
  U.ui.confirm = null;
  const mine = (q) => [{ osm: 111, kind: { type: 'winkel' }, place: 'Winsum', biz: { q, p: 20000, cls: 'shop', type: 'winkel' } }];
  let b = U.businessesHtml({ money: 5000, mine: mine(40) });
  assert.match(b, /data-bz="reno"[^>]*>Renovatie €[\d.]+</);
  assert.match(b, /Verkoop €/);
  b = U.businessesHtml({ money: 5000, mine: mine(100) });
  assert.match(b, /class="ds-z-chip bz-status" data-bz-status="reno"[^>]*>.*In orde</, 'een pand in orde is een status, geen grijze knop (#1272)');
  U.ui.confirm = 'reno:111';
  assert.match(U.businessesHtml({ money: 5000, mine: mine(40) }), /bd-zeker[^>]*>Voor €[\d.]+\? Je houdt/);
  U.ui.confirm = null;
});
t('te koop: laden en leeg zijn twee verschillende zinnen', () => {
  reset();
  assert.match(U.forSaleHtml({ money: 1, offers: [], loading: true }), /data-leeg="laden"/);
  assert.match(U.forSaleHtml({ money: 1, offers: [] }), /data-leeg="niets"[^>]*>(?:<span[^>]*>.*?<\/span>)?(?:<h3[^>]*>)?Niets te koop/);
  // #1251 (hertest 24-11): de lege staat heeft een icoon en een knop naar de kaartlaag Te koop
  assert.match(U.forSaleHtml({ money: 1, offers: [] }), /bz-leeg-ic[\s\S]*data-bz="kaart-tekoop" data-goto="map"/);
});
t('team: met personeel staat het loon per dag erbij', () => {
  reset(); const world = w(80000);
  assert.ok(L.huurArbeider(world, 2).ok);
  assert.match(U.teamView(world), /[Ll]oon/);
});

// ---- snackwagen: wat nu? ----
t('snack: een wagen die thuis staat krijgt uitleg met de laagste vergunningsprijs, een leeg menu een waarschuwing', () => {
  reset(); const world = w(1e6); world.calendar = { day: 100 };
  const r = SL.buyVan(world); assert.ok(r.ok, r.text);
  let h = SU.snackHtml(SL.snackView(world));
  assert.match(h, /data-hint="thuis"[^>]*>Je wagen staat nog thuis en verdient niets\. Koop hieronder een vergunning[^<]*\(vanaf €[\d.]+\)/);
  const v = SL.snackView(world);
  if (!v.own.menu.length) assert.match(h, /data-hint="menu"/);
  SU.sui.confirm = null;
  const poor = SL.snackView({ ...world, money: 10 });
  const hp = SU.snackHtml(poor);
  assert.match(hp, /title="Je mist nog €[\d.]+"/, 'een grijze koopknop zegt waarom');
});
t('snack: zonder geld staat bij de wagen-aanbieding de reden', () => {
  reset(); const world = w(100);
  assert.match(SU.snackHtml(SL.snackView(world)), /data-sn="koop-wagen"[^>]*title="Je mist nog €7\.400"[^>]*disabled/);
});

// ---- fuzz en lange simulatie ----
const rnd = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
t('fuzz: normalizeBezit met rommel gooit nooit en is idempotent', () => {
  const r = rnd(7);
  const junk = () => { const k = Math.floor(r() * 9); return [null, undefined, NaN, -1, 1e99, 'x', [], {}, { k: 'zz', ha: 'veel' }][k]; };
  for (let i = 0; i < 400; i++) {
    const raw = { v: r() < 0.9 ? 1 : junk(), parcels: { paaaaaaaaaaa1: junk(), pbbbbbbbbbbb2: { k: 'a', ha: junk(), p: junk(), m: junk(), ins: junk() }, 'x y': { k: 'a' } }, buildings: junk(), bstate: { 5: junk() },
      mobile: { frietwagen: junk(), 'BAD ID': {} }, debt: junk(), totals: { bought: junk() }, x: { staff: junk(), herds: junk(), lastDay: junk(), told: junk() } };
    const a = Z.normalizeBezit(raw);
    const b = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(a))));
    assert.deepEqual(Z.serializeBezit(b), Z.serializeBezit(a), `ronde ${i}`);
    assert.ok(Number.isFinite(a.debt) && a.debt >= 0);
  }
});
t('simulatie: 240 speldagen met willekeurig kopen, verkopen en vee: geld blijft eindig en niet negatief, geen fouten, rapporten kloppen', () => {
  reset(); const world = w(120000); const r = rnd(42);
  const farm = BL.getBoerderij(); L.dayTick(world);
  let reports = 0;
  for (let day = 0; day < 240; day++) {
    for (let k = 0; k < 3; k++) {
      const a = Math.floor(r() * 8), id = r() < 0.5 ? 'paaaaaaaaaaa1' : 'pbbbbbbbbbbb2', osm = [111, 222, 333][Math.floor(r() * 3)];
      if (a === 0) L.koopPerceel(world, id); else if (a === 1) L.verkoopPerceel(world, id); else if (a === 2) L.koopVee(world, id, ['melkvee', 'schapen', 'kippen'][Math.floor(r() * 3)]);
      else if (a === 3) L.verkoopVee(world, id); else if (a === 4) L.koopPand(world, osm); else if (a === 5) L.verkoopPand(world, osm); else if (a === 6) L.huurArbeider(world, 1 + Math.floor(r() * 3)); else L.zetVerzekering([id], r() < 0.5);
      assert.ok(Number.isFinite(world.money) && world.money >= 0, `dag ${day}: ${world.money}`);
    }
    farm.uren += 24; world.calendar = { day: 100 + day + 1 };
    const rep = L.dayTick(world);
    assert.ok(Number.isFinite(world.money) && world.money >= 0, `na de dagtik ${day}: ${world.money}`);
    if (rep) { reports++; const line = R.dayReportLine(rep, world.money); if (line) assert.ok(!/NaN|undefined|Infinity/.test(line), line); }
  }
  assert.ok(reports > 10, `rapporten ${reports}`);
  const b = L.getBezit();
  for (const id of Object.keys(b.x.herds || {})) assert.ok(b.parcels[id], `kudde op ${id} zonder perceel`);
});

console.log(`bezit_verfijn_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
