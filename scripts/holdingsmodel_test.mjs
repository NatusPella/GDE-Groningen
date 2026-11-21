// Het beheerscherm van Bezit (#1101): lijst, sorteren (rijp eerst), filteren, selectie, bulkacties, regels voor het teeltplan, aandachtspunten, de
// dagverwerking en de prestaties bij duizend percelen.   node scripts/holdingsmodel_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as PF from '../game/js/parcelfarm.js';
import * as S from '../game/js/farmstaff.js';
import * as L from '../game/js/livestock.js';
import * as H from '../game/js/holdingsmodel.js';
import { loonwerkKosten } from '../game/js/machines.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; PC.wisExtraPercelen(); try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 6).join('\n   ')); } };
const pid = (i) => 'p' + (0xabc000000000 + i * 7919).toString(16).padStart(12, '0');
const REGIONS = ['oldambt', 'hogeland', 'veenkolonien', 'westerwolde'];
const KINDS = ['a', 'a', 'w', 'b'];
// bezit en boerderij met `count` percelen, streek en soort wisselend, bodem vast
function setup(count, ha = 1.2, mode = 'self') {
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  for (let i = 0; i < count; i++) { Z.buyParcel(bz, { id: pid(i), kind: KINDS[i % 4], ha, ax: 0, ay: 0 }, 3000, 0, 1e9); bz.parcels[pid(i)].m = mode; }
  PF.syncFarmWithBezit(farm, bz, { region: (id) => REGIONS[Object.keys(bz.parcels).indexOf(id) % 4], place: () => 'Winsum' }, 0);
  return { bz, farm };
}
const ms = (fn) => { const t0 = process.hrtime.bigint(); const r = fn(); return [Number(process.hrtime.bigint() - t0) / 1e6, r]; };
const rijpMaken = (farm, id, uren = 100) => { farm.uren = 0; PF.workField(farm, id, 'ploegen'); PF.workField(farm, id, 'zaaien'); farm.uren = uren; };

t('de lijst: een rij per perceel met naam, streek, soort, niveau en stand', () => {
  const { bz, farm } = setup(8, 2);
  const rows = H.holdingRows(bz, farm);
  assert.equal(rows.length, 8);
  const r = rows.find((x) => x.id === pid(0));
  assert.equal(r.region, 'oldambt'); assert.equal(r.soort, 'akker'); assert.equal(r.level, 'self'); assert.equal(r.ha, 2);
  assert.match(r.name, /bij Winsum/); assert.equal(r.stand, 'kaal'); assert.equal(r.phase, 'braak'); assert.equal(r.plan, 'aardappelen');
  assert.equal(rows.find((x) => x.id === pid(2)).soort, 'weiland'); assert.equal(rows.find((x) => x.id === pid(2)).plan, 'gras');
  assert.equal(rows.find((x) => x.id === pid(3)).soort, 'boomgaard'); assert.equal(rows.find((x) => x.id === pid(3)).plan, 'fruit');
  assert.ok(r.attention.includes('braak'));
  const leeg = H.holdingRows(Z.newBezit(), farm);
  assert.deepEqual(leeg, []);
  assert.equal(H.holdingRows(bz, farm).length, 8, 'deterministisch');
});

t('sorteren: rijp eerst, dan wat aandacht vraagt, dan de rest; ook op naam, ha, inkomen en streek', () => {
  const { bz, farm } = setup(6, 2);
  rijpMaken(farm, pid(4)); rijpMaken(farm, pid(1));
  bz.parcels[pid(5)].m = 'leased';
  const rows = H.holdingRows(bz, farm);
  const gesorteerd = H.sortRows(rows, 'ripe');
  assert.deepEqual(gesorteerd.slice(0, 2).map((r) => r.id).sort(), [pid(1), pid(4)].sort());
  assert.ok(gesorteerd[0].ripe && gesorteerd[1].ripe && !gesorteerd[2].ripe);
  assert.equal(rows.length, gesorteerd.length); assert.notEqual(rows, gesorteerd, 'het origineel blijft');
  assert.deepEqual(H.sortRows(rows, 'ripe').map((r) => r.id), gesorteerd.map((r) => r.id), 'stabiel');
  const naam = H.sortRows(rows, 'name').map((r) => r.name);
  assert.deepEqual(naam, naam.slice().sort());
  const { bz: b2, farm: f2 } = setup(4, 1);
  b2.parcels[pid(0)].ha = 9; PC.registreerExtraPerceel({ ...PC.perceelDef(pid(0)), ha: 9 }); b2.parcels[pid(1)].m = 'leased';
  assert.equal(H.sortRows(H.holdingRows(b2, f2), 'ha')[0].id, pid(0));
  assert.equal(H.sortRows(H.holdingRows(b2, f2), 'income')[0].id, pid(1));
  const reg = H.sortRows(H.holdingRows(b2, f2), 'region').map((r) => r.region);
  assert.deepEqual(reg, reg.slice().sort());
  assert.equal(H.sortRows(rows, 'bestaat-niet').length, rows.length, 'onbekend: de standaard');
});

t('filteren op streek, soort en niveau, en samen; alle en leeg tellen niet mee', () => {
  const { bz, farm } = setup(16, 2);
  for (let i = 0; i < 16; i += 4) bz.parcels[pid(i)].m = 'leased';
  const rows = H.holdingRows(bz, farm);
  assert.equal(H.filterRows(rows, { region: 'oldambt' }).length, 4);
  assert.equal(H.filterRows(rows, { soort: 'akker' }).length, 8);
  assert.equal(H.filterRows(rows, { level: 'leased' }).length, 4);
  assert.equal(H.filterRows(rows, { region: 'oldambt', soort: 'akker', level: 'leased' }).length, 4);
  assert.equal(H.filterRows(rows, { region: 'hogeland', level: 'leased' }).length, 0);
  assert.equal(H.filterRows(rows, { region: 'alle', soort: '', level: undefined }).length, 16);
  assert.equal(H.filterRows(rows, {}).length, 16);
  assert.equal(H.filterRows(rows, { search: 'WINSUM' }).length, 16, 'zoeken zonder hoofdletters');
  assert.equal(H.filterRows(rows, { attention: true }).length, rows.filter((r) => r.attention.length).length);
  const o = H.filterOptions(rows);
  assert.deepEqual(o.regions, ['hogeland', 'oldambt', 'veenkolonien', 'westerwolde']); assert.deepEqual(o.soorten, ['akker', 'boomgaard', 'weiland']);
});

t('selectie: aan en uit, alles, leegmaken, en een verkocht perceel valt eruit', () => {
  const { bz, farm } = setup(5);
  const rows = H.holdingRows(bz, farm);
  const sel = H.newSelection();
  assert.equal(H.toggleSelect(sel, pid(1)), true); assert.equal(H.toggleSelect(sel, pid(1)), false);
  H.selectRows(sel, H.filterRows(rows, { soort: 'akker' }));
  assert.deepEqual(H.selectedIds(sel, rows), rows.filter((r) => r.soort === 'akker').map((r) => r.id));
  Z.sellParcel(bz, pid(0));
  H.pruneSelection(sel, bz);
  assert.ok(!sel.has(pid(0)));
  assert.equal(H.clearSelection(sel).size, 0);
});

t('bulk: verpacht, en personeel alleen met personeel; een onbekend niveau doet niets', () => {
  const { bz } = setup(5);
  const ids = Object.keys(bz.parcels);
  assert.deepEqual(H.bulkSetMode(bz, ids, 'leased'), { done: 5, skipped: {} });
  assert.equal(S.managedCount(bz), 5);
  assert.deepEqual(H.bulkSetMode(bz, ids, 'leased'), { done: 0, skipped: { 'al-zo': 5 } });
  assert.deepEqual(H.bulkSetMode(bz, ids, 'staff').skipped, { 'geen-personeel': 5 });
  S.hireWorker(bz, 1, 0);
  assert.equal(H.bulkSetMode(bz, ids.slice(0, 2), 'staff').done, 2);
  assert.equal(bz.parcels[ids[0]].m, 'staff');
  assert.deepEqual(H.bulkSetMode(bz, ids, 'self'), { done: 5, skipped: {} });
  assert.equal(H.bulkSetMode(bz, ids, 'tuin').skipped['onbekend-niveau'], 5);
  assert.equal(H.bulkSetMode(bz, ['p000000000000'], 'self').skipped['niet-van-jou'], 1);
});

t('bulk: gewas kiezen voor de selectie; wat niet bij de grond past slaat over', () => {
  const { bz, farm } = setup(8);
  const ids = Object.keys(bz.parcels);
  const r = H.bulkSetCrop(farm, ids, 'graan');
  assert.equal(r.done, 4); assert.equal(r.skipped['past-niet'], 4);
  assert.equal(B.planVoor(farm, pid(0)), 'graan'); assert.equal(B.planVoor(farm, pid(2)), 'gras'); assert.equal(B.planVoor(farm, pid(3)), 'fruit');
  assert.equal(H.bulkSetCrop(farm, ids, 'fruit').done, 2);
  assert.equal(H.bulkSetCrop(farm, ids, 'draak').done, 0);
  assert.equal(H.bulkSetCrop(farm, ['onbekend'], 'graan').skipped['niet-van-jou'], 1);
});

t('regel "teeltplan per streek": alle akkers in Oldambt graan; slaat op, past toe op nieuwe percelen, onzin wordt geweigerd', () => {
  const { bz, farm } = setup(16);
  assert.equal(H.setPlanRule(bz, 'oldambt', 'akker', 'graan'), true);
  assert.equal(H.setPlanRule(bz, 'oldambt', 'akker', 'gras'), false, 'gras hoort niet op een akker');
  assert.equal(H.setPlanRule(bz, 'Oldambt!', 'akker', 'graan'), false);
  assert.equal(H.setPlanRule(bz, 'hogeland', 'weiland', 'gras'), true);
  const rows = H.holdingRows(bz, farm);
  const gewijzigd = H.applyPlanRules(bz, farm, rows);
  assert.equal(gewijzigd, rows.filter((r) => r.region === 'oldambt' && r.soort === 'akker').length);
  for (const r of rows) if (r.region === 'oldambt' && r.soort === 'akker') assert.equal(B.planVoor(farm, r.id), 'graan');
  assert.equal(B.planVoor(farm, pid(1)), 'aardappelen', 'een andere streek blijft');
  assert.equal(H.applyPlanRules(bz, farm, rows), 0, 'tweede keer niets');
  const terug = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(bz))));
  assert.deepEqual(H.rulesOf(terug), { 'oldambt:akker': 'graan', 'hogeland:weiland': 'gras' });
  assert.ok(H.clearPlanRule(bz, 'oldambt', 'akker')); assert.deepEqual(Object.keys(H.rulesOf(bz)), ['hogeland:weiland']);
  assert.deepEqual(H.normalizeRules({ 'oldambt:akker': 'gras', 'x:akker': 'graan', 'oldambt:akker2': 'graan', 'hogeland:akker': 'graan' }), { 'hogeland:akker': 'graan' });
});

t('bulk zaai alles en oogst alles met de loonwerker: kosten, kwaliteit, geld op en niet-eigen overslaan', () => {
  const { bz, farm } = setup(8, 2.4);
  const ids = Object.keys(bz.parcels).filter((id) => PC.perceelDef(id).soort === 'akker');
  bz.parcels[ids[0]].m = 'leased';
  const alle = Object.keys(bz.parcels);
  const kosten1 = loonwerkKosten('ploegen', 2.4) + loonwerkKosten('zaaien', 2.4) + 40 * 2;
  const zaai = H.bulkWork(bz, farm, alle, 'zaaien', { money: 1e9 });
  assert.equal(zaai.done, 7); assert.equal(zaai.skipped['niet-zelf'], 1);
  assert.ok(zaai.cost > kosten1 && zaai.net === -zaai.cost, 'ploegen, zaaien en zaaigoed');
  for (const id of zaai.ids) assert.equal(PF.fieldPhase(farm, id), 'groeit');
  assert.equal(PF.fieldPhase(farm, ids[0]), 'braak', 'het verpachte perceel is niet aangeraakt');
  assert.equal(H.bulkWork(bz, farm, alle, 'zaaien', { money: 1e9 }).done, 0, 'groeit al');
  assert.equal(H.bulkWork(bz, farm, alle, 'oogsten', { money: 1e9 }).skipped['niet-rijp'], 7);
  farm.uren = 100;
  const oogst = H.bulkWork(bz, farm, alle, 'oogsten', { money: 1e9, day: 4 });
  assert.equal(oogst.done, 7); assert.ok(oogst.revenue > oogst.cost && oogst.net > 0, `${oogst.revenue} tegen ${oogst.cost}`);
  assert.ok(farm.totaal.leveringen >= 7 && farm.boek.jaren[1].posten.loonwerk > 0);
  assert.equal(farm.schuur.kg, 0, 'de schuur is onaangeroerd');
  // te weinig geld: wat niet kan, slaat over, de rest gaat door
  const arm = setup(6, 2.4);
  const een = loonwerkKosten('ploegen', 2.4) + loonwerkKosten('zaaien', 2.4) + 80;
  const r = H.bulkWork(arm.bz, arm.farm, Object.keys(arm.bz.parcels), 'zaaien', { money: een * 2 + 1 });
  assert.equal(r.done, 2); assert.equal(r.skipped['te-weinig-geld'], 4); assert.ok(r.cost <= een * 2 + 1);
  assert.equal(H.bulkWork(arm.bz, arm.farm, ['p0'], 'wieden').skipped['onbekende-taak'], 1);
  // de loonwerker werkt slordiger dan handwerk
  const hand = setup(1, 2.4); rijpMaken(hand.farm, pid(0));
  const handKg = PF.workField(hand.farm, pid(0), 'oogsten', { fractie: 1, opbrengst: PF.unitScale(2.4) }).load.kg;
  const lw = setup(1, 2.4); H.bulkWork(lw.bz, lw.farm, [pid(0)], 'zaaien'); lw.farm.uren = 100;
  H.bulkWork(lw.bz, lw.farm, [pid(0)], 'oogsten');
  assert.ok(lw.farm.boek.velden[pid(0)].kg < handKg && lw.farm.boek.velden[pid(0)].kg > handKg * 0.5, 'minder dan handwerk');
});

t('aandachtspunten: rijp, zieke kudde, braak, personeel, schuur; belangrijkste eerst', () => {
  const { bz, farm } = setup(8, 2);
  rijpMaken(farm, pid(0));
  const wei = pid(2); L.stockHerd(bz, wei, 'schapen'); L.infect(L.herdsOf(bz)[wei]);
  farm.schuur = { gewas: 'graan', kg: 500, kwaliteit: 1, veld: null };
  const rows = H.holdingRows(bz, farm);
  const p = H.attentionPoints(rows, bz, farm);
  const codes = p.map((x) => x.code);
  assert.ok(codes.includes('rijp') && codes.includes('zieke-kudde') && codes.includes('braak') && codes.includes('schuur'));
  assert.equal(codes[0], 'rijp');
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].prio <= x.prio));
  assert.match(p.find((x) => x.code === 'rijp').tekst, /^1 perceel is oogstklaar$/);
  assert.match(p.find((x) => x.code === 'schuur').tekst, /500 kg/);
  assert.ok(p.find((x) => x.code === 'braak').ids.length <= 5);
  // personeel: geen mensen, te weinig mensen, wachtend
  bz.parcels[pid(1)].m = 'staff';
  assert.ok(H.attentionPoints(H.holdingRows(bz, farm), bz, farm).some((x) => x.code === 'geen-personeel'));
  S.hireWorker(bz, 1, 0);
  for (let i = 0; i < 8; i++) { bz.parcels[pid(i)].m = 'staff'; PC.registreerExtraPerceel({ ...PC.perceelDef(pid(i)), ha: 15 }); }
  const rows2 = H.holdingRows(bz, farm, { waiting: H.waitingIds(bz, farm, 1) });
  const p2 = H.attentionPoints(rows2, bz, farm);
  assert.ok(p2.some((x) => x.code === 'capaciteit') && p2.some((x) => x.code === 'wacht'));
  assert.deepEqual(H.attentionPoints([], Z.newBezit(), null), []);
  // moede grond
  const moe = setup(1); moe.farm.bodemlog[pid(0)] = { u: 0.25, g: 'graan' };
  assert.ok(H.holdingRows(moe.bz, moe.farm)[0].attention.includes('grond-moe'));
});

t('samenvatting: aantallen, hectares, niveaus, inkomen per dag, vee', () => {
  const { bz, farm } = setup(8, 2, 'self');
  bz.parcels[pid(0)].m = 'leased'; S.hireWorker(bz, 2, 0); bz.parcels[pid(1)].m = 'staff';
  L.stockHerd(bz, pid(2), 'melkvee');
  const rows = H.holdingRows(bz, farm);
  const s = H.summarize(rows);
  assert.equal(s.count, 8); assert.equal(s.ha, 16); assert.deepEqual(s.byLevel, { self: 6, leased: 1, staff: 1 });
  assert.ok(s.incomeDay > 0 && s.herds === 1 && s.animals === 5 && rows.find((r) => r.id === pid(2)).herd.visible === 5);
  assert.deepEqual(H.summarize([]), { count: 0, ha: 0, ripe: 0, attention: 0, byLevel: { self: 0, leased: 0, staff: 0 }, incomeDay: 0, herds: 0, animals: 0 });
});

t('dagverwerking: eerste keer zet de dag vast, daarna personeel, pacht en vee; hervatten na slapen; begrensd', () => {
  const { bz, farm } = setup(6, 2.4, 'self');
  S.hireWorker(bz, 2, 0);
  bz.parcels[pid(0)].m = 'staff'; bz.parcels[pid(1)].m = 'leased'; bz.parcels[pid(2)].m = 'self';
  L.stockHerd(bz, pid(2), 'melkvee');
  const eerste = H.advanceDays(bz, farm, 10);
  assert.equal(eerste.days, 0); assert.equal(bz.x.lastDay, 10);
  assert.equal(H.advanceDays(bz, farm, 10).days, 0, 'dezelfde dag: niets');
  assert.equal(H.advanceDays(bz, farm, 5).days, 0, 'terug in de tijd: niets');
  const r = H.advanceDays(bz, farm, 20, { money: 1e6 });
  assert.equal(r.days, 10); assert.equal(r.from, 11); assert.equal(r.to, 20); assert.equal(bz.x.lastDay, 20);
  assert.ok(r.staff.income > 0 && r.staff.wages === 10 * S.WAGE_DAY[2] && r.lease > 0 && r.livestock.value > 0);
  assert.equal(Math.round(r.net), Math.round(r.staff.income - r.staff.wages - r.staff.diesel - r.staff.seed + r.lease + r.livestock.value - r.livestock.feedCost));
  assert.equal(farm.uren, 0, 'de boerderijklok is niet verzet');
  const lang = H.advanceDays(bz, farm, 20 + 5000, { money: 1e6 });
  assert.equal(lang.days, S.MAX_CATCHUP_DAYS, 'een lange slaap is begrensd; de rest volgt');
  assert.equal(bz.x.lastDay, 20 + S.MAX_CATCHUP_DAYS);
  assert.ok(Z.serializeBezit(bz).x.lastDay === bz.x.lastDay, 'de dag blijft bewaard');
});

t('dagverwerking: zonder loon geld werkt het personeel niet; opslag voor vee en oogst; voer uit de opslag', () => {
  const { bz, farm } = setup(2, 2.4, 'self');
  S.hireWorker(bz, 1, 0); bz.parcels[pid(0)].m = 'staff';
  H.advanceDays(bz, farm, 1);
  const arm = H.advanceDays(bz, farm, 4, { money: 0 });
  assert.equal(arm.staff.income, 0); assert.ok(arm.events.every((e) => e.type === 'loon-onbetaald') && arm.events.length === 3);
  const a = setup(3, 3, 'self');
  S.hireWorker(a.bz, 3, 0); a.bz.parcels[pid(0)].m = 'staff';
  a.farm.bedrijf.opslag[a.farm.bedrijf.thuis].hooi = 500;
  L.stockHerd(a.bz, pid(2), 'melkvee');
  H.advanceDays(a.bz, a.farm, 0);
  const r = H.advanceDays(a.bz, a.farm, 5, { money: 1e6, deliver: 'store', robot: true });
  assert.ok(r.staff.harvestedKg > 0 && PC.opslagGebruikt(a.farm.bedrijf, a.farm.bedrijf.thuis) > 0);
  assert.ok((a.farm.bedrijf.opslag[a.farm.bedrijf.thuis].melk || 0) > 0, 'de melk in de opslag');
  assert.ok(r.livestock.products.melk > 0);
});

t('prestaties: duizend percelen, elke berekening onder 20 ms', () => {
  const { bz, farm } = setup(1000, 1.2, 'self');
  for (let i = 0; i < 1000; i += 3) bz.parcels[pid(i)].m = i % 2 ? 'leased' : 'self';
  for (let i = 0; i < 1000; i += 50) rijpMaken(farm, pid(i), 100);
  farm.uren = 100;
  for (let i = 2; i < 1000; i += 8) L.stockHerd(bz, pid(i), 'schapen');
  let rows;
  const meet = (naam, fn) => { const [t0, r] = ms(fn); assert.ok(t0 < 20, `${naam}: ${t0.toFixed(1)} ms`); return r; };
  meet('rijen (warm)', () => H.holdingRows(bz, farm));
  rows = meet('rijen', () => H.holdingRows(bz, farm));
  assert.equal(rows.length, 1000);
  const gesorteerd = meet('sorteren', () => H.sortRows(rows, 'ripe'));
  assert.ok(gesorteerd[0].ripe);
  meet('sorteren op naam', () => H.sortRows(rows, 'name'));
  const gefilterd = meet('filteren', () => H.filterRows(rows, { region: 'oldambt', soort: 'akker', level: 'self' }));
  assert.ok(gefilterd.length > 0 && gefilterd.length < 1000);
  meet('zoeken', () => H.filterRows(rows, { search: 'wierde' }));
  meet('samenvatting', () => H.summarize(rows));
  meet('aandachtspunten', () => H.attentionPoints(rows, bz, farm));
  const sel = H.newSelection();
  meet('alles selecteren', () => H.selectRows(sel, rows)); assert.equal(sel.size, 1000);
  meet('geselecteerd', () => H.selectedIds(sel, rows));
  meet('niveau voor allen', () => H.bulkSetMode(bz, [...sel], 'self'));
  meet('gewas voor allen', () => H.bulkSetCrop(farm, [...sel], 'graan'));
  H.setPlanRule(bz, 'oldambt', 'akker', 'uien'); H.setPlanRule(bz, 'hogeland', 'akker', 'bieten');
  meet('regels toepassen', () => H.applyPlanRules(bz, farm, rows));
  meet('wachtenden', () => H.waitingIds(bz, farm, 5));
});

t('prestaties: bulk zaaien van 1000 percelen blijft bruikbaar', () => {
  const { bz, farm } = setup(1000, 1.2, 'self');
  const [tijd, r] = ms(() => H.bulkWork(bz, farm, Object.keys(bz.parcels), 'zaaien', { money: 1e9 }));
  assert.equal(r.done, 1000); assert.ok(tijd < 1000, `${tijd.toFixed(0)} ms`);
});

console.log(`holdingsmodel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
