// De rangen van de boer (#1373, audit B3): per niveau van Landbouw een verhaalmoment en wat de rang opent (machines en percelen pas vanaf een rang, alleen voor wie de hoeve
// kreeg, met de reden erbij), en de migratieregel: wie de hoeve niet kreeg koopt alles zoals voorheen.   node scripts/boerrang_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as R from '../game/js/boerrang.js';
import * as M from '../game/js/boerrangmomenten.js';
import { momentsFor, rankMoments, makeRankHook, rankMomentsOf } from '../game/js/rankmoments.js';
import * as BL from '../game/js/boerderijlive.js';
import * as L from '../game/js/bezitlive.js';
import * as LB from '../game/js/loopbaanlive.js';
import * as Lp from '../game/js/loopbaan.js';
import * as PC from '../game/js/percelen.js';
import * as CT from '../game/js/boerderijcontracten.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 1e6) => ({ money, msgs: [], addMessage(x) { this.msgs.push(x); } });
const words = (x) => String(x).trim().split(/\s+/).length;
const reset = () => { const st = nepOpslag(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st }); BL.zetBoerderijVoorTest(null, st); L.zetBezitVoorTest(null, st); LB.zetProfielVoorTest(Lp.nieuwProfiel(), nepOpslag()); return st; };
const naarNiveau = (w, niveau) => { LB.loopbaanTel(w, 'landbouw', { xp: Lp.XP_DREMPELS[niveau - 1] + 1, n: 0 }); assert.ok(Lp.niveauVoorVak(LB.getProfiel(), 'landbouw') >= niveau); };

t('de ladder: zes titels uit loopbaan.js, elke rang zegt wat hij opent, en een eis is een bestaand niveau', () => {
  assert.equal(R.rangTitel(1), 'Veldhulp'); assert.equal(R.rangTitel(6), 'Bietenbaron van Oldambt');
  for (let i = 1; i <= Lp.MAX_NIVEAU; i++) assert.ok(R.RANG_OPENT[i] && R.RANG_OPENT[i].length > 20, 'rang ' + i + ' heeft een zin');
  for (const [tab, def] of [[R.EIS_MACHINE, PC.MACHINE_CATALOGUS], [R.EIS_PERCEEL, Object.fromEntries(PC.PERCELEN.map((p) => [p.id, p]))], [R.EIS_ERF, Object.fromEntries(PC.ERVEN.map((p) => [p.id, p]))]]) {
    for (const [id, eis] of Object.entries(tab)) { assert.ok(def[id], id + ' bestaat'); assert.ok(Number.isInteger(eis) && eis >= 1 && eis <= Lp.MAX_NIVEAU, id); }
  }
  for (const id of Object.keys(PC.MACHINE_CATALOGUS)) assert.ok(R.EIS_MACHINE[id], id + ' heeft een eis');
  assert.equal(R.rangEis('machine', 'bestaat-niet'), 1);
});

t('een duurdere machine van hetzelfde soort vraagt nooit een lagere rang', () => {
  const trekkers = Object.entries(PC.MACHINE_CATALOGUS).filter(([, c]) => c.type === 'trekker').sort((a, b) => a[1].koop - b[1].koop);
  for (let i = 1; i < trekkers.length; i++) assert.ok(R.EIS_MACHINE[trekkers[i][0]] >= R.EIS_MACHINE[trekkers[i - 1][0]]);
  assert.ok(R.rangEis('machine', 'maaidorser') > R.rangEis('machine', 'trekker-groot'));
  assert.equal(R.rangEis('machine', 'trekker-klein'), 1, 'de eerste trekker is er vanaf het begin');
});

t('rangSlot: dicht onder de eis, open erboven, nooit voor wie de hoeve niet kreeg, met de reden', () => {
  assert.equal(R.rangSlot({ niveau: 1, hoeve: false }, 'machine', 'maaidorser'), null);
  const s = R.rangSlot({ niveau: 2, hoeve: true }, 'machine', 'maaidorser');
  assert.equal(s.eis, 4); assert.equal(s.titel, 'Loonwerker'); assert.equal(s.nu, 'Zaaier');
  assert.match(s.tekst, /Vanaf Loonwerker/); assert.match(s.tekst, /Zaaier/);
  assert.equal(R.rangSlot({ niveau: 4, hoeve: true }, 'machine', 'maaidorser'), null);
  assert.equal(R.rangSlot({ niveau: 1, hoeve: true }, 'perceel', 'zeldenrust-wei'), null, 'de geschonken hoeve is nooit dicht');
  assert.equal(R.rangSlot({ niveau: 1, hoeve: true }, 'perceel', 'p123456789abc'), null, 'de percelen van Bezit hebben hun eigen poort');
  assert.equal(R.volgendeRang(6), null); assert.equal(R.volgendeRang(1).titel, 'Zaaier');
});

t('de gedragstest met de boerderij: zonder hoeve koop je alles, met de hoeve open de rangen hem stap voor stap', () => {
  reset();
  const w = wereld();
  assert.ok(BL.koopMachineCat(w, 'maaidorser', BL.getBedrijf().thuis).ok, 'zonder de schenking blijft alles te koop (migratie)');
  reset();
  assert.ok(BL.rangStand().hoeve === false);
  assert.ok(L.schenkHoeveCompleet().ok);
  const w2 = wereld(1e6);
  const voor = w2.money;
  const dicht = BL.koopMachineCat(w2, 'maaidorser', BL.getBedrijf().thuis);
  assert.equal(dicht.ok, false); assert.match(dicht.reden, /Vanaf Loonwerker/); assert.equal(dicht.slot.eis, 4);
  assert.equal(w2.money, voor, 'geen geld eraf bij een dichte rang');
  assert.equal(BL.huurMachineCat(w2, 'trekker-groot', BL.getBedrijf().thuis).ok, false);
  assert.equal(BL.koopPerceel(w2, 'perceel', 'wierdeakker').ok, false, 'het eerste perceel vraagt Zaaier');
  assert.equal(BL.koopPerceel(w2, 'erf', 'wierdehoeve').slot.eis, 5);
  assert.ok(BL.koopMachineCat(w2, 'trekker-klein', BL.getBedrijf().thuis).ok, 'de eerste trekker staat open');
  naarNiveau(w2, 2);
  assert.equal(BL.rangStand().titel, 'Zaaier'); assert.equal(BL.rangStand().volgende.titel, 'Trekkerrijder');
  assert.ok(BL.koopPerceel(w2, 'perceel', 'wierdeakker').ok);
  assert.equal(BL.koopMachineCat(w2, 'trekker-groot', BL.getBedrijf().thuis).ok, false);
  naarNiveau(w2, 3);
  assert.ok(BL.koopMachineCat(w2, 'trekker-groot', BL.getBedrijf().thuis).ok);
  assert.equal(BL.koopMachineCat(w2, 'maaidorser', BL.getBedrijf().thuis).ok, false);
  naarNiveau(w2, 4);
  assert.ok(BL.koopMachineCat(w2, 'maaidorser', BL.getBedrijf().thuis).ok);
  assert.ok(BL.rangSlotVoor('machine', 'maaidorser') === null);
});

t('wat je al hebt blijft van jou: een rang verlaagt niets en een machine van voor de schenking blijft', () => {
  reset();
  const w = wereld();
  assert.ok(BL.koopMachineCat(w, 'maaidorser', BL.getBedrijf().thuis).ok);
  L.schenkHoeveCompleet();
  assert.ok(PC.machinesOp(BL.getBedrijf(), BL.getBedrijf().thuis).some((m) => m.type === 'maaidorser'));
  assert.equal(BL.koopMachineCat(w, 'maaidorser', BL.getBedrijf().thuis).ok, false, 'een tweede kopen kan niet (rang) maar de eerste blijft');
});

t('de momenten: vijf stuks voor rang 2 tot en met 6, korte regels, elke naam eerst ingeleid', () => {
  const lijst = rankMomentsOf('landbouw');
  assert.deepEqual(lijst.map((m) => m.rang), [2, 3, 4, 5, 6]);
  assert.equal(new Set(lijst.map((m) => m.id)).size, 5);
  assert.ok(M.registratie.every((r) => r.ok), JSON.stringify(M.registratie));
  const bekend = new Set(['Tessa', 'Tammo', 'Ypie']);   // Ypie is ingeleid door Tante Aaltje in N5.2; wie in een eerdere rang sprak is ook bekend
  for (const m of lijst) {
    const regels = m.scene.regels;
    assert.ok(regels.length >= 3 && regels.length <= 6, m.id);
    const gezegd = [];
    regels.forEach(([wie, tekst], i) => {
      assert.ok(words(tekst) <= 25, `${m.id}: ${tekst}`);
      if (!bekend.has(wie)) {
        const eerste = wie.split(' ').pop();
        const ingeleid = new RegExp(eerste).test(tekst) || gezegd.some((x) => new RegExp(eerste).test(x)) || false;
        assert.ok(ingeleid, `${m.id}: ${wie} wordt niet eerst ingeleid (regel ${i + 1})`);
      }
      gezegd.push(tekst);
    });
    for (const [wie] of regels) bekend.add(wie);   // een naam uit een eerdere rang (Lutje in rang 3) blijft bekend
  }
  // wie in een latere rang optreedt is al in een eerdere ingeleid, of wordt in de eerste regel genoemd
  const eerst = new Map();
  for (const m of lijst) for (const [wie] of m.scene.regels) if (!eerst.has(wie)) eerst.set(wie, m.rang);
  assert.equal(eerst.get('Lutje'), 3); assert.equal(eerst.get('Mevrouw Hofstra'), 4); assert.equal(eerst.get('Jorrit'), 5);
  const tekst = lijst.map((m) => m.scene.regels.map((r) => r[1]).join(' ')).join(' ');
  assert.doesNotMatch(tekst, /overlijd|dood|winter|sneeuw/i);
});

t('de momenten spelen alleen voor wie de hoeve kreeg, in volgorde, en een sprong speelt de overgeslagen rangen', () => {
  reset();
  assert.deepEqual(momentsFor('landbouw', 1, 6, { ctx: {} }).map((m) => m.rang), [], 'zonder de schenking alleen het kaartje');
  L.schenkHoeveCompleet();
  assert.deepEqual(momentsFor('landbouw', 1, 2, { ctx: {} }).map((m) => m.rang), [2]);
  assert.deepEqual(momentsFor('landbouw', 1, 4, { ctx: {} }).map((m) => m.rang), [2, 3, 4], 'een sprong speelt alles in volgorde');
  assert.deepEqual(momentsFor('landbouw', 4, 6, { ctx: {} }).map((m) => m.rang), [5, 6]);
  assert.deepEqual(momentsFor('landbouw', 3, 3, { ctx: {} }).map((m) => m.rang), []);
  const gezien = new Set(['landbouw-rang2-ypie']);
  assert.deepEqual(momentsFor('landbouw', 1, 3, { gezien: (id) => gezien.has(id), ctx: {} }).map((m) => m.rang), [3], 'wat gezien is speelt niet nog eens');
});

t('de haak: een niveau omhoog zet het moment in de wachtrij, het speelt een keer op een rustig moment en wordt onthouden', () => {
  reset();
  L.schenkHoeveCompleet();
  const gezien = new Set(), gespeeld = [];
  const hook = makeRankHook({ store: { gezien: (id) => gezien.has(id), markeer: (id) => gezien.add(id) }, speel: (m) => { gespeeld.push(m.id); return true; } });
  assert.equal(hook.omhoog({}, { vak: 'landbouw', van: 1, naar: 2 }), 1);
  const rustig = { started: true };
  for (let i = 0; i < 5; i++) hook.tik(1, {}, rustig);
  assert.deepEqual(gespeeld, ['landbouw-rang2-ypie']);
  assert.equal(hook.omhoog({}, { vak: 'landbouw', van: 1, naar: 2 }), 0, 'een tweede keer speelt niet');
  assert.equal(hook.omhoog({}, { vak: 'taxi', van: 1, naar: 2 }), 0, 'een ander vak niet');
  assert.ok(rankMoments().length >= 5);
});

t('de Bietencampagne: een keer per week een grote bietenvracht, alleen voor de Bietenbaron met de hoeve; het gewone aanbod blijft zoals het was', () => {
  const z = 1234;
  const gewoon = CT.aanbod(14, z), met = CT.aanbod(14, z, { campagne: true });
  assert.deepEqual(met.slice(0, 5), gewoon, 'het gewone aanbod is hetzelfde');
  assert.equal(gewoon.length, 5); assert.equal(met.length, 6);
  const c = met[5];
  assert.ok(CT.isCampagne(c) && c.gewas === 'bieten' && c.kg >= 6000 && c.kg <= 9000 && c.deadlineUren === 120);
  assert.ok(c.bonus > met.find((x) => x.gewas === 'bieten').bonus, 'rijker dan het gewone bietencontract');
  assert.equal(CT.aanbod(15, z, { campagne: true }).length, 5, 'alleen elke zevende dag');
  assert.equal(CT.aanbod(0, z, { campagne: true }).length, 5);
  reset();
  L.schenkHoeveCompleet();
  const w = wereld();
  BL.getBoerderij().uren = 14 * 24 + 1;
  assert.ok(!BL.contracten().aanbod.some(CT.isCampagne), 'als Zaaier is er geen campagne');
  naarNiveau(w, 6);
  BL.getBoerderij().uren = 21 * 24 + 1;
  const k = BL.contracten();
  const camp = k.aanbod.find(CT.isCampagne);
  assert.ok(camp, 'als Bietenbaron is er op dag 21 een campagne');
  assert.ok(BL.neemContract(camp.id).ok);
  const lev = CT.lever(BL.getBoerderij().contracten, 'bieten', camp.kg, BL.getBoerderij().uren);
  assert.equal(lev.afgerond.length, 1); assert.equal(lev.bonus, camp.bonus);
  // zonder de hoeve geen campagne, ook niet op niveau 6
  reset(); naarNiveau(w, 6); BL.getBoerderij().uren = 21 * 24 + 1;
  assert.ok(!BL.contracten().aanbod.some(CT.isCampagne));
});

console.log(`boerrang_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
