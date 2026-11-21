// Personeel, verpachten en de zichtbare weergave (#1101): een landarbeider werkt een perceel met teeltplan af tegen 80 tot 90% van handwerk,
// capaciteit en voorman, loon en diesel, de afnemende beheeropbrengst, pacht, het dagschema als werkactoropdrachten.   node scripts/farmstaff_test.mjs
// Schrijft nooit naar echte opslag: alles in het geheugen.
import assert from 'node:assert/strict';
import * as Z from '../game/js/bezit.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as PF from '../game/js/parcelfarm.js';
import * as S from '../game/js/farmstaff.js';
import { leaseOutPerDay } from '../game/js/bezitprijs.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; PC.wisExtraPercelen(); try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 6).join('\n   ')); } };
let base = 0;                                   // elke setup krijgt eigen id's: het register is globaal
const pid = (i) => 'p' + (0xabc000000000 + (base + i) * 7919).toString(16).padStart(12, '0');
// bezit met `count` percelen van `ha` ha (bodem vast 0,75), in de gegeven modus, en een boerderij die ze kent
function setup(count, ha = 1.2, mode = 'staff', kind = 'a', price = 3000) {
  base += 10000;
  const bz = Z.newBezit(), farm = B.nieuweBoerderij();
  for (let i = 0; i < count; i++) {
    assert.ok(Z.buyParcel(bz, { id: pid(i), kind, ha, ax: 0, ay: 0 }, price, 0, 1e9).ok);
    bz.parcels[pid(i)].m = mode;
  }
  PF.registerOwnedParcels(bz);
  for (let i = 0; i < count; i++) { PC.registreerExtraPerceel({ ...PC.perceelDef(pid(i)), bodem: 0.75 }); PF.adoptParcel(farm, pid(i), 0); }
  return { bz, farm };
}
const run = (bz, farm, from, to, ctx = {}) => { const reps = []; for (let d = from; d <= to; d++) reps.push(S.staffDayTick(bz, farm, d, ctx)); return reps; };

t('namen: een lijst, uniek per aanname, geen toeval', () => {
  const names = new Set(Array.from({ length: S.FIRST_NAMES.length * S.BYNAMES.length }, (_, i) => S.workerName(i)));
  assert.equal(names.size, S.FIRST_NAMES.length * S.BYNAMES.length);
  assert.equal(S.workerName(0), S.workerName(72));
  const bz = Z.newBezit();
  const a = S.hireWorker(bz, 1, 0).worker, b = S.hireWorker(bz, 2, 0).worker;
  assert.notEqual(a.name, b.name); assert.notEqual(a.id, b.id);
});

t('aannemen: niveau, tekengeld, te weinig geld, maximum, ontslaan', () => {
  const bz = Z.newBezit();
  assert.equal(S.hireWorker(bz, 4, 0).ok, false); assert.equal(S.hireWorker(bz, 0, 0).ok, false);
  const arm = S.hireWorker(bz, 2, 0, 50);
  assert.equal(arm.ok, false); assert.equal(arm.why, 'te-weinig-geld'); assert.equal(arm.tekort, S.WAGE_DAY[2] - 50);
  assert.equal(S.staffOf(bz).workers.length, 0, 'een weigering verandert niets');
  const r = S.hireWorker(bz, 2, 5, 1000);
  assert.ok(r.ok && r.fee === S.WAGE_DAY[2] && r.worker.since === 5);
  for (let i = 0; i < S.MAX_WORKERS; i++) S.hireWorker(bz, 1, 0);
  assert.equal(S.hireWorker(bz, 1, 0).why, 'vol');
  assert.ok(S.fireWorker(bz, r.worker.id)); assert.equal(S.fireWorker(bz, r.worker.id), false);
});

t('capaciteit en loon: 20 ha per arbeider, de voorman bundelt er drie', () => {
  const bz = Z.newBezit();
  S.hireWorker(bz, 1, 0); S.hireWorker(bz, 2, 0);
  assert.equal(S.staffCapacity(S.staffOf(bz)), 40);
  S.hireWorker(bz, 3, 0);
  assert.equal(S.staffCapacity(S.staffOf(bz)), 40 + 20 * S.FOREMAN_BUNDLE);
  assert.equal(S.staffWages(S.staffOf(bz)), S.WAGE_DAY[1] + S.WAGE_DAY[2] + S.WAGE_DAY[3]);
  assert.ok(S.WAGE_DAY[3] < 3 * S.WAGE_DAY[2] && S.SKILL_RATIO[3] > S.SKILL_RATIO[2], 'een voorman is goedkoper dan drie en werkt netter');
  assert.ok(S.SKILL_RATIO[1] >= 0.8 && S.SKILL_RATIO[3] <= 0.9, '80 tot 90% van handwerk');
});

t('opslag: het personeel overleeft normaliseren en kapotte opslag geeft een leeg team', () => {
  const bz = Z.newBezit();
  S.hireWorker(bz, 3, 2);
  const raw = JSON.parse(JSON.stringify(Z.serializeBezit(bz)));
  const terug = Z.normalizeBezit(raw);
  assert.deepEqual(S.staffOf(terug).workers, S.staffOf(bz).workers);
  for (const slecht of [null, 5, 'x', [], { v: 2 }, { v: 1, workers: 'nee' }, { v: 1, workers: [null, { id: '../x' }, { id: 'w1', skill: 99, name: 7 }] }]) {
    const s = S.normalizeStaff(slecht);
    assert.ok(Array.isArray(s.workers) && s.workers.every((w) => w.skill >= 1 && w.skill <= 3 && /^w\d+$/.test(w.id)));
  }
  assert.equal(Z.normalizeBezit({ v: 1, x: { staff: 'kapot', onbekend: { a: 1 }, lastDay: 'x' } }).x.staff, undefined);
  assert.deepEqual(Object.keys(Z.normalizeBezit({ v: 1, x: { onbekend: { a: 1 } } }).x), [], 'onbekende delen vallen weg');
});

t('afnemende beheeropbrengst: x 1 / (1 + n / 40)', () => {
  assert.equal(S.mgmtFactor(0), 1);
  assert.equal(S.mgmtFactor(40), 0.5);
  assert.ok(Math.abs(S.mgmtFactor(400) - 1 / 11) < 1e-12, 'de 400e levert een tiende');
  assert.ok(S.mgmtFactor(10) > 0.79 && S.mgmtFactor(10) < 0.81);
  for (let i = 1; i < 500; i++) assert.ok(S.mgmtFactor(i) < S.mgmtFactor(i - 1));
  const { bz } = setup(5, 1.2, 'self');
  assert.equal(S.managedCount(bz), 0);
  bz.parcels[pid(0)].m = 'leased'; bz.parcels[pid(1)].m = 'staff';
  assert.equal(S.managedCount(bz), 2);
});

t('de cyclus: zaaien, groeien, oogsten, afleveren en weer zaaien, op de speldag', () => {
  const { bz, farm } = setup(1);
  S.hireWorker(bz, 2, 0);
  const reps = run(bz, farm, 1, 12);
  assert.equal(reps[0].worked[0].tasks.map((x) => x.taak).join(), 'ploegen,zaaien', 'dag 1: ploegen en zaaien');
  assert.equal(B.veldStand(farm, pid(0)).stoppel, 'aardappelen', 'na de laatste oogst staat er stoppel van het teeltplan');
  assert.equal(reps[1].worked.length, 0, 'dag 2: het gewas groeit (30 uur)');
  assert.equal(reps[2].worked[0].tasks[0].taak, 'oogsten', 'dag 3: rijp');
  assert.ok(reps[2].income > 0 && reps[2].harvestedKg > 0);
  assert.equal(reps[3].worked[0].tasks.map((x) => x.taak).join(), 'ploegen,zaaien', 'dag 4: opnieuw');
  const oogsten = reps.filter((r) => r.income > 0).length;
  assert.ok(oogsten >= 3, `${oogsten} oogsten in 12 dagen`);
  assert.ok(farm.totaal.leveringen >= 3 && farm.totaal.omzet > 0);
  assert.equal(farm.uren, 0, 'de boerderijklok is niet verzet');
  assert.ok(farm.bodemlog[pid(0)].u > 0, 'de grond wordt moe, zoals bij handwerk');
});

t('staff levert 80 tot 90% van handwerk (handwerk 100%) en handwerk met Tessa-bonus blijft er los boven', () => {
  for (const skill of [1, 2, 3]) {
    const { bz, farm } = setup(1);
    S.hireWorker(bz, skill, 0);
    const mf = S.mgmtFactor(1);
    run(bz, farm, 1, 2);
    const rep = S.staffDayTick(bz, farm, 3);
    const kg = rep.harvestedKg;
    const hand = setup(1, 1.2, 'self');
    PF.workField(hand.farm, pid(0), 'ploegen'); PF.workField(hand.farm, pid(0), 'zaaien'); hand.farm.uren = 72;
    const handKg = PF.workField(hand.farm, pid(0), 'oogsten', { fractie: 1 }).load.kg;
    assert.ok(Math.abs(kg / (handKg * mf) - S.SKILL_RATIO[skill]) < 0.01, `niveau ${skill}: ${kg} tegen ${handKg}`);
    assert.ok(kg < handKg, 'altijd minder dan handwerk');
    const tessa = setup(1, 1.2, 'self');
    PF.workField(tessa.farm, pid(0), 'ploegen'); PF.workField(tessa.farm, pid(0), 'zaaien'); tessa.farm.uren = 72;
    const tessaKg = PF.workField(tessa.farm, pid(0), 'oogsten', { fractie: 1, opbrengst: 1.05 }).load.kg;
    assert.ok(tessaKg > handKg && tessaKg > kg * 1.1, 'de karakterbonus geldt alleen voor het handwerk');
  }
});

t('een groot perceel: personeel werkt alle rondes, dus de oogst volgt de hectares (per werkeenheid gelijk)', () => {
  const { bz, farm } = setup(1, 12);
  S.hireWorker(bz, 2, 0);
  run(bz, farm, 1, 2);
  const rep = S.staffDayTick(bz, farm, 3);
  const klein = setup(1, 1.2); S.hireWorker(klein.bz, 2, 0); run(klein.bz, klein.farm, 1, 2);
  const kleinRep = S.staffDayTick(klein.bz, klein.farm, 3);
  assert.ok(Math.abs(rep.harvestedKg / kleinRep.harvestedKg - 10) < 0.2, `${rep.harvestedKg} / ${kleinRep.harvestedKg}`);
});

t('loon, diesel en zaaigoed: rapport klopt en het net is inkomsten min kosten; een goed perceel verdient', () => {
  const { bz, farm } = setup(8, 2.4);
  S.hireWorker(bz, 2, 0);
  const wages = S.WAGE_DAY[2];
  const reps = run(bz, farm, 1, 10);
  for (const r of reps) {
    assert.equal(r.wages, wages);
    assert.equal(r.net, r.income - r.wages - r.diesel - r.seed);
    assert.ok(r.diesel >= 0 && r.seed >= 0);
  }
  assert.ok(reps[0].seed > 0 && reps[0].diesel > 0, 'de eerste dag kost zaaigoed en diesel');
  const net = reps.reduce((x, r) => x + r.net, 0);
  assert.ok(net > 0, `netto over tien dagen: ${net}`);
  assert.ok(farm.boek.jaren[1].posten.personeel === wages * 10 && farm.boek.jaren[1].posten.brandstof > 0, 'in het kasboek');
  // zonder iets om te doen kost het personeel alleen loon
  const leeg = setup(0); S.hireWorker(leeg.bz, 1, 0);
  const r = S.staffDayTick(leeg.bz, leeg.farm, 1);
  assert.equal(r.net, -S.WAGE_DAY[1]); assert.equal(r.worked.length, 0);
});

t('capaciteit: wat niet past wacht, een te groot perceel wacht tot er meer mensen zijn', () => {
  const { bz, farm } = setup(30, 1.2);
  S.hireWorker(bz, 1, 0);
  const rep = S.staffDayTick(bz, farm, 1);
  assert.equal(rep.worked.length, 16, '20 ha is 16 percelen van 1,2 ha (19,2 ha)');
  assert.equal(rep.waiting, 14);
  const rep2 = S.staffDayTick(bz, farm, 2);
  assert.equal(rep2.worked.length, 14, 'de rest volgt de volgende dag');
  const groot = setup(1, 25);
  S.hireWorker(groot.bz, 1, 0);
  assert.equal(S.staffDayTick(groot.bz, groot.farm, 1).worked.length, 0, '25 ha past niet in 20 ha per dag');
  S.hireWorker(groot.bz, 1, 0);
  const twee = S.staffDayTick(groot.bz, groot.farm, 2);
  assert.equal(twee.worked.length, 1, 'met twee arbeiders wel');
  const voorman = setup(1, 50); S.hireWorker(voorman.bz, 3, 0);
  assert.equal(S.staffDayTick(voorman.bz, voorman.farm, 1).worked.length, 1, 'een voorman regelt 60 ha');
});

t('rijp gaat voor: bij weinig capaciteit wordt eerst geoogst', () => {
  const { bz, farm } = setup(20, 1.2);
  S.hireWorker(bz, 1, 0);
  for (let i = 0; i < 4; i++) { PF.workField(farm, pid(19 - i), 'ploegen'); PF.workField(farm, pid(19 - i), 'zaaien'); }
  const rep = S.staffDayTick(bz, farm, 3);                   // vier velden zijn dan rijp
  const eerste = rep.worked.slice(0, 4).map((w) => w.phase);
  assert.deepEqual(eerste, ['rijp', 'rijp', 'rijp', 'rijp']);
});

t('geen loon: zonder geld doet het personeel niets en er wordt niets geboekt', () => {
  const { bz, farm } = setup(2);
  S.hireWorker(bz, 2, 0);
  const rep = S.staffDayTick(bz, farm, 1, { money: 10 });
  assert.equal(rep.worked.length, 0); assert.equal(rep.net, 0); assert.equal(rep.events[0].type, 'loon-onbetaald');
  assert.equal(PF.fieldPhase(farm, pid(0), 24), 'braak');
  assert.equal(S.staffDayTick(bz, farm, 1, { money: S.WAGE_DAY[2] }).worked.length, 2, 'precies genoeg is genoeg');
  assert.equal(S.staffDayTick(Z.newBezit(), farm, 1).worked.length, 0, 'zonder personeel geen werk');
});

t('afleveren naar de opslag van het erf, de rest wordt verkocht', () => {
  const { bz, farm } = setup(4, 3);
  S.hireWorker(bz, 3, 0);
  run(bz, farm, 1, 2, { deliver: 'store' });
  const rep = S.staffDayTick(bz, farm, 3, { deliver: 'store' });
  assert.ok(rep.storedKg > 0 && PC.opslagGebruikt(farm.bedrijf, farm.bedrijf.thuis) === rep.storedKg);
  assert.ok(rep.storedKg <= 4000, 'de opslag is begrensd (4000 kg op de Zonnehoek)');
  assert.ok(rep.harvestedKg > rep.storedKg && rep.income > 0, 'wat niet past, wordt verkocht');
});

t('deterministisch: dezelfde stand en dag geven hetzelfde rapport', () => {
  const a = setup(6, 2), b = setup(6, 2);
  S.hireWorker(a.bz, 2, 0); S.hireWorker(b.bz, 2, 0);
  const kern = (reps) => reps.map((r) => [r.wages, r.diesel, r.seed, r.income, r.harvestedKg, r.net, r.worked.length, r.waiting]);
  assert.deepEqual(kern(run(a.bz, a.farm, 1, 9)), kern(run(b.bz, b.farm, 1, 9)));
  assert.deepEqual(a.farm.boek.jaren, b.farm.boek.jaren);
});

t('verpachten: 0,9% van de koopprijs per speldag, met de afnemende opbrengst; braak en zelf doen niets', () => {
  const { bz, farm } = setup(3, 2, 'self', 'a', 10000);
  bz.parcels[pid(0)].m = 'leased';
  const r = S.leaseDayTick(bz, farm, 1);
  assert.equal(leaseOutPerDay(10000), 90);
  assert.equal(r.income, Math.round(90 * S.mgmtFactor(1))); assert.equal(r.parcels, 1);
  bz.parcels[pid(1)].m = 'leased'; bz.parcels[pid(2)].m = 'leased';
  assert.equal(S.leaseDayTick(bz, farm, 2).income, 3 * Math.round(90 * S.mgmtFactor(3)));
  assert.ok(farm.totaal.omzet > 0);
  const braak = setup(2, 2, 'self');
  assert.equal(S.leaseDayTick(braak.bz, braak.farm, 1).income, 0);
  assert.equal(S.staffDayTick(braak.bz, braak.farm, 1).worked.length, 0);
  // pacht is lager dan wat een huurder vraagt (1,2%): geen geldmachine
  assert.ok(leaseOutPerDay(10000) < Math.round(10000 * 0.012));
  // een vast perceel (legacy, p = 0) pacht op de koopprijs van de lijst
  const lg = Z.newBezit(); Z.syncLegacyParcels(lg, { percelen: { wierdeakker: { sinds: 0 } } }); lg.parcels.wierdeakker.m = 'leased';
  assert.equal(S.leaseDayTick(lg, null, 1).income, Math.round(leaseOutPerDay(PC.perceelDef('wierdeakker').koop) * S.mgmtFactor(1)));
});

t('zichtbare weergave: hoogstens 4 werkers, de dichtstbijzijnde, binnen de streamstraal, langs de rijen', () => {
  const { bz, farm } = setup(10, 1.2);
  S.hireWorker(bz, 3, 0);
  const rep = S.staffDayTick(bz, farm, 1);
  const pos = {}; rep.worked.forEach((w, i) => { pos[w.id] = { x: 100 * i, y: 0, a: 0 }; });
  const posOf = (id) => pos[id] || null;
  const view = { x: 0, y: 0 };
  const eerste = rep.worked[0];
  const jobs = S.visibleJobs(rep.worked, view, { posOf, dayFrac: (eerste.t0 + eerste.t1) / 2 });
  assert.ok(jobs.length >= 1 && jobs.length <= S.VISIBLE_MAX);
  assert.equal(jobs[0].parcelId, eerste.id); assert.equal(jobs[0].vehicle, 'trekker');
  assert.ok(Number.isFinite(jobs[0].x) && Number.isFinite(jobs[0].heading) && jobs[0].progress >= 0 && jobs[0].progress <= 1);
  // met vele gelijktijdige werkers: de vier dichtstbijzijnde
  const veel = Array.from({ length: 9 }, (_, i) => ({ id: pid(i), worker: 'w' + i, workerName: 'x', ha: 1.2, phase: 'rijp', t0: 0, t1: 1, tasks: [{ taak: 'oogsten', t0: 0, t1: 1 }] }));
  const pp = {}; veel.forEach((w, i) => { pp[w.id] = { x: 20 * (9 - i), y: 0, a: 0 }; });
  const vier = S.visibleJobs(veel, view, { posOf: (id) => pp[id], dayFrac: 0.5 });
  assert.equal(vier.length, 4);
  assert.deepEqual(vier.map((j) => j.parcelId), [pid(8), pid(7), pid(6), pid(5)], 'de dichtstbijzijnde eerst');
  assert.ok(vier.every((j, i) => i === 0 || j.distance >= vier[i - 1].distance));
  // te ver weg en buiten het tijdvak: niets
  assert.equal(S.visibleJobs(veel, { x: 5000, y: 0 }, { posOf: (id) => pp[id], dayFrac: 0.5 }).length, 0);
  assert.equal(S.visibleJobs([{ ...veel[0], tasks: [{ taak: 'oogsten', t0: 0.2, t1: 0.4 }] }], view, { posOf: (id) => pp[id], dayFrac: 0.9 }).length, 0);
  assert.equal(S.visibleJobs(veel, view, { posOf: () => null, dayFrac: 0.5 }).length, 0);
  assert.equal(S.visibleJobs(veel, view, { posOf: (id) => pp[id], dayFrac: 0.5, max: 2 }).length, 2);
  assert.deepEqual(S.visibleJobs(veel, view, { posOf: (id) => pp[id], dayFrac: 0.5 }), vier, 'deterministisch');
  // de positie loopt langs de rijen: later in het tijdvak staat de werker verder
  const een = [{ id: 'a', worker: 'w', workerName: 'x', ha: 1.2, tasks: [{ taak: 'oogsten', t0: 0, t1: 1 }] }];
  const at = () => ({ x: 10, y: 10, a: 0 });
  const p0 = S.visibleJobs(een, view, { posOf: at, dayFrac: 0.01 })[0], p1 = S.visibleJobs(een, view, { posOf: at, dayFrac: 0.3 })[0];
  assert.ok(p1.progress > p0.progress && (p1.row > p0.row || p1.x !== p0.x));
});

t('1000 percelen: de dagtik en het plan blijven snel', () => {
  const { bz, farm } = setup(1000, 1.2);
  for (let i = 0; i < 4; i++) S.hireWorker(bz, 3, 0);
  const t0 = process.hrtime.bigint();
  const plan = S.planStaffDay(bz, farm, 1);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(plan.jobs.length, 200, '4 voormannen regelen 240 ha: 200 percelen van 1,2 ha');
  assert.ok(ms < 20, `plan ${ms} ms`);
  const t1 = process.hrtime.bigint();
  const rep = S.staffDayTick(bz, farm, 1);
  const ms2 = Number(process.hrtime.bigint() - t1) / 1e6;
  assert.equal(rep.worked.length, 200); assert.equal(rep.waiting, 800);
  assert.ok(ms2 < 1500, `dagtik ${ms2} ms`);
});

console.log(`farmstaff_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
