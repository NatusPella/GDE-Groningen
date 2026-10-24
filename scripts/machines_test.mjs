// Machines van de boerderij (#415 stap 2): kopen en huren uit de catalogus, diesel, slijtage, onderhoud, de loonwerker, het kasboek en de bank,
// de haken van boerderijlive.js en de opslag (versie 1 blijft, oude opslag migreert).   node scripts/machines_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as M from '../game/js/machines.js';
import * as Live from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n  ')); } };
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 100000) => ({ money, clock: 8, time: 0, msgs: [], addMessage(x) { this.msgs.push(x); } });
const nieuw = () => { Live.zetBoerderijVoorTest(null, nepOpslag()); return Live.getBoerderij(); };

t('de catalogus: elke machine heeft een tank, verbruik en slijtage; namen zijn verzonnen', () => {
  const echt = /fendt|claas|deutz|john deere|massey|new holland|kubota|lely|krone|kverneland|amazone|valtra|jcb|zetor|volvo|liebherr|manitou|bobcat/i;
  for (const [id, c] of Object.entries(PC.MACHINE_CATALOGUS)) {
    assert.ok(!echt.test(c.naam), c.naam);
    if (c.soort === 'machine') {
      const s = M.SPEC[id];
      assert.ok(s && s.tank > 0 && s.top > 0 && s.verbruik.length === 3 && s.slijt.length === 3, id);
      assert.ok(s.verbruik[0] < s.verbruik[1] && s.verbruik[1] < s.verbruik[2], id + ' verbruik loopt op met de belasting');
    }
  }
  assert.ok(M.SPEC['trekker-klein'] && M.SPEC.maaidorser && M.SPEC.laadmachine);
});

t('kopen: prijs, een plek op het erf, een halve tank; te weinig geld, geen plek, onbekend', () => {
  const bd = PC.nieuwBedrijf();
  assert.equal(M.koopUitCatalogus(bd, 'trekker-klein', PC.START_ERF, 8999).ok, false);
  const r = M.koopUitCatalogus(bd, 'trekker-klein', PC.START_ERF, 9000);
  assert.ok(r.ok && r.prijs === 9000);
  const m = M.vind(bd, r.uid);
  assert.equal(m.bezit, 'gekocht'); assert.equal(m.brandstof, 45); assert.equal(m.slijtage, 0);
  assert.equal(M.koopUitCatalogus(bd, 'bestaatniet', PC.START_ERF, 1e9).ok, false);
  assert.equal(M.koopUitCatalogus(bd, 'ploeg-3', 'wierdehoeve', 1e9).ok, false, 'dat erf is niet van jou');
  while (PC.vrijePlekken(bd, PC.START_ERF) > 0) assert.ok(M.koopUitCatalogus(bd, 'ploeg-3', PC.START_ERF, 1e9).ok);
  assert.match(M.koopUitCatalogus(bd, 'ploeg-3', PC.START_ERF, 1e9).reden, /plek/);
  assert.equal(bd.totaal.gekocht, 9000 + 1800 * (PC.erfDef(PC.START_ERF).machinePlekken - 1));
});

t('huren per speldag: eerste dag meteen, daarna per dag; achterstand en terug na twee gemiste dagen', () => {
  const bd = PC.nieuwBedrijf();
  const r = M.huurUitCatalogus(bd, 'trekker-groot', PC.START_ERF, 10, 130);
  assert.ok(r.ok && r.prijs === 130);
  const m = M.vind(bd, r.uid);
  assert.equal(m.bezit, 'gehuurd'); assert.equal(m.volgende, 34); assert.equal(m.brandstof, 160, 'een gehuurde machine staat vol');
  assert.equal(M.verwerkMachineHuur(bd, 33, 1000).uitgave, 0);
  assert.equal(M.verwerkMachineHuur(bd, 34, 1000).uitgave, 130);
  assert.equal(M.huurPerDagMachines(bd), 130);
  const a = M.verwerkMachineHuur(bd, 58, 10);
  assert.equal(a.events[0].type, 'achterstand'); assert.equal(m.achterstand, 1);
  const t2 = M.verwerkMachineHuur(bd, 82, 10);
  assert.ok(t2.events.some((e) => e.type === 'terug')); assert.equal(bd.machinepark.machines.length, 0);
  assert.equal(bd.totaal.teruggegeven, 1);
  assert.equal(M.huurUitCatalogus(bd, 'trekker-groot', PC.START_ERF, 0, 129).ok, false);
});

t('een lange slaap telt niet oneindig veel huurdagen en geeft geen negatief geld', () => {
  const bd = PC.nieuwBedrijf();
  M.huurUitCatalogus(bd, 'laadmachine', PC.START_ERF, 0, 1000);
  const r = M.verwerkMachineHuur(bd, 1e7, 100000);
  assert.ok(r.uitgave >= 0 && r.uitgave <= 60 * 90);
});

t('diesel: verbruik loopt op met de belasting, een lege tank stopt de motor, bijtanken kost per liter (erf goedkoper dan pomp)', () => {
  const bd = PC.nieuwBedrijf();
  const m = M.vind(bd, M.koopUitCatalogus(bd, 'trekker-klein', PC.START_ERF, 9000).uid);
  const voor = m.brandstof;
  M.draai(m, 1, 0); const stil = voor - m.brandstof;
  const v2 = m.brandstof; M.draai(m, 1, 1); const rij = v2 - m.brandstof;
  const v3 = m.brandstof; M.draai(m, 1, 2); const werk = v3 - m.brandstof;
  assert.ok(stil < rij && rij < werk, `${stil} ${rij} ${werk}`);
  assert.equal(M.kanStarten(m).ok, true);
  const r = M.draai(m, 100, 2);
  assert.ok(r.leeg || m.slijtage >= 100); assert.equal(m.brandstof, 0);
  assert.equal(M.kanStarten(m).ok, false);
  m.slijtage = 0;
  assert.match(M.kanStarten(m).reden, /diesel/);
  const erf = M.tankBij(m, 'erf', 1e6), kosten = erf.kosten;
  assert.ok(erf.ok && Math.abs(erf.liter - 90) < 1e-6 && kosten === Math.round(90 * M.DIESEL_ERF));
  assert.equal(M.tankBij(m, 'erf', 1e6).ok, false, 'de tank is vol');
  m.brandstof = 0;
  assert.ok(M.tankBij(m, 'pomp', 1e6).kosten > kosten);
  m.brandstof = 0;
  const arm = M.tankBij(m, 'erf', 16);          // €16 is 10 liter
  assert.ok(arm.ok && arm.liter === 10 && arm.kosten === 16);
  m.brandstof = 80; assert.equal(M.tankBij(m, 'erf', 1e6, 5).liter, 5, 'maxLiter beperkt');
  assert.equal(M.tankBij(m, 'erf', 0).ok, false);
});

t('slijtage: loopt op met de uren, vertraagt boven 40%, kapot bij 100%, onderhoud kost geld en zet hem terug', () => {
  const bd = PC.nieuwBedrijf();
  const m = M.vind(bd, M.koopUitCatalogus(bd, 'trekker-groot', PC.START_ERF, 22000).uid);
  m.brandstof = 160;
  assert.equal(M.snelheidsFactor(m), 1); assert.equal(M.staat(m), 'goed');
  m.slijtage = 40; assert.equal(M.snelheidsFactor(m), 1);
  m.slijtage = 70; assert.ok(M.snelheidsFactor(m) < 1 && M.snelheidsFactor(m) > 0.75); assert.equal(M.staat(m), 'matig');
  m.slijtage = 99; assert.ok(M.snelheidsFactor(m) < 0.65 && M.snelheidsFactor(m) > 0.5);
  assert.ok(M.verbruikFactor(m) > 1.4);
  M.draai(m, 5, 2);
  assert.equal(m.slijtage, 100); assert.equal(M.kanStarten(m).ok, false); assert.equal(M.staat(m), 'kapot'); assert.equal(M.topSnelheid(m), 0);
  const k = M.onderhoudKosten(m);
  assert.ok(k >= 50 && k <= 600, String(k));
  assert.equal(M.onderhoud(m, k - 1).ok, false);
  assert.equal(M.onderhoud(m, k).kosten, k); assert.equal(m.slijtage, 0);
  assert.equal(M.onderhoud(m, 1e6).ok, false, 'in goede staat: niets te doen');
  m.slijtage = 20; const klein = M.onderhoudKosten(m); m.slijtage = 80; assert.ok(M.onderhoudKosten(m) > klein, 'meer slijtage, hogere beurt');
});

t('verkopen en terugbrengen: gekocht levert een deel op (minus slijtage), gehuurd niets', () => {
  const bd = PC.nieuwBedrijf();
  const a = M.vind(bd, M.koopUitCatalogus(bd, 'trekker-klein', PC.START_ERF, 9000).uid);
  const b = M.vind(bd, M.huurUitCatalogus(bd, 'laadmachine', PC.START_ERF, 0, 1000).uid);
  const nieuwWaarde = M.verkoopWaarde(a);
  a.slijtage = 80; assert.ok(M.verkoopWaarde(a) < nieuwWaarde);
  const v = M.terugOfVerkoop(bd, a.uid);
  assert.ok(v.ok && v.soort === 'verkocht' && v.bedrag === M.verkoopWaarde({ ...a }) && bd.totaal.verkocht === v.bedrag);
  const t2 = M.terugOfVerkoop(bd, b.uid);
  assert.ok(t2.ok && t2.soort === 'terug' && t2.bedrag === 0);
  assert.equal(bd.machinepark.machines.length, 0);
  assert.equal(M.terugOfVerkoop(bd, 'bestaatniet').ok, false);
});

t('de loonwerker: loon per hectare, materiaal voor jou, hij werkt netjes maar niet perfect; niet in de verkeerde volgorde', () => {
  assert.ok(M.loonwerkKosten('ploegen', 1.2) > M.loonwerkKosten('zaaien', 1.2));
  assert.ok(M.loonwerkKosten('ploegen', 3) > M.loonwerkKosten('ploegen', 1.2));
  assert.equal(M.loonwerkKosten('afleveren'), 0); assert.equal(M.loonwerkBestaat('afleveren'), false);
  const b = nieuw(), w = wereld(1000);
  assert.equal(Live.loonwerk(w, 'zaaien').ok, false, 'zaaien op braak land kan niet');
  const p = Live.loonwerk(w, 'ploegen');
  assert.ok(p.ok && w.money === 1000 - p.kosten && p.fractie === M.LOONWERKER.kwaliteit);
  assert.equal(B.fase(b), 'geploegd');
  const c = Live.loonwerk(w, 'cultiveren'); assert.ok(c.ok); assert.ok(b.veld.cult > 0 && b.veld.cult < 1);
  assert.equal(Live.loonwerk(w, 'cultiveren').ok, false, 'een keer is genoeg');
  const z = Live.loonwerk(w, 'zaaien'); assert.ok(z.ok && z.kosten === z.loon + 40);
  assert.equal(B.fase(b), 'groeit');
  assert.ok(Live.loonwerk(w, 'spuiten').ok); assert.ok(Live.loonwerk(w, 'bemesten').ok);
  assert.equal(Live.loonwerk(w, 'oogsten').ok, false, 'het gewas groeit nog');
  B.tikUren(b, 100);
  const arm = wereld(5); assert.equal(Live.loonwerk(arm, 'oogsten').ok, false); assert.equal(arm.money, 5);
  const o = Live.loonwerk(w, 'oogsten'); assert.ok(o.ok && o.kg > 0);
  const geld = w.money;
  const l = Live.loonwerkAfleveren(w);
  assert.ok(l.ok && l.fee > 0 && w.money > geld && b.schuur.kg === 0);
  assert.equal(Live.loonwerkAfleveren(w).ok, false);
  const jr = b.boek.jaren[1];
  assert.ok(jr.omzet > 0 && jr.kosten > 0 && jr.posten.loonwerk > 0 && jr.posten.zaaigoed === 40);
});

t('cultiveren en spuiten geven een kleine meeropbrengst, zijn vrij (niet in de bijbaan) en kunnen niet in de verkeerde fase', () => {
  const b = B.nieuweBoerderij();
  assert.deepEqual(B.opties(b).map((o) => o.taak), ['ploegen']);
  B.rondTaakAf(b, 'ploegen', 1);
  assert.deepEqual(B.opties(b).map((o) => o.taak), ['zaaien'], 'de bijbaan kent cultiveren niet');
  assert.deepEqual(B.opties(b, { vrij: true }).map((o) => o.taak), ['zaaien', 'cultiveren']);
  assert.equal(B.volgendeTaak(b), 'zaaien');
  assert.equal(B.magTaak(b, 'cultiveren').ok, false); assert.equal(B.magTaak(b, 'cultiveren', Infinity, { vrij: true }).ok, true);
  assert.equal(B.magTaak(b, 'spuiten', Infinity, { vrij: true }).ok, false);
  const basis = (cult, spuit) => { const x = B.nieuweBoerderij(); B.rondTaakAf(x, 'ploegen', 1); if (cult) B.rondTaakAf(x, 'cultiveren', 1, { vrij: true }); B.rondTaakAf(x, 'zaaien', 1); if (spuit) B.rondTaakAf(x, 'spuiten', 1, { vrij: true }); B.tikUren(x, 100); return B.opbrengstKg(x); };
  assert.ok(Math.abs(basis(true, false) / basis(false, false) - 1.08) < 1e-9);
  assert.ok(Math.abs(basis(false, true) / basis(false, false) - 1.08) < 1e-9);
  assert.equal(B.kosten(b, 'cultiveren').huur, 0); assert.equal(B.kosten(b, 'spuiten', 'aardappelen', { vrij: true }).totaal, 15);
});

t('perceel en gewas: weiland geeft gras, akker geen gras; elk perceel houdt zijn eigen stand; grootte telt mee; de grond wordt moe', () => {
  const b = B.nieuweBoerderij();
  assert.equal(B.actiefGewas(b), 'aardappelen');
  B.kiesGewas(b, 'gras'); assert.equal(B.actiefGewas(b), 'aardappelen', 'gras hoort op weiland');
  B.kiesGewas(b, 'graan'); assert.equal(B.actiefGewas(b), 'graan');
  B.rondTaakAf(b, 'ploegen', 1); B.rondTaakAf(b, 'zaaien', 1);
  assert.equal(b.veld.gewas, 'graan');
  PC.huur(b.bedrijf, 'perceel', 'dijkweide', 'week', 0, 1e6);
  PC.koop(b.bedrijf, 'perceel', 'bedumer-klei', 1e6);
  assert.ok(PC.zetActief(b.bedrijf, 'dijkweide')); assert.ok(B.syncVeld(b));
  assert.equal(B.fase(b), 'braak', 'het weiland is braak; het graan staat op de Zonnehoek');
  assert.equal(B.veldenOverzicht(b).find((v) => v.id === PC.START_PERCEEL).fase, 'groeit');
  assert.equal(B.actiefGewas(b), 'gras');
  B.rondTaakAf(b, 'ploegen', 1); B.rondTaakAf(b, 'zaaien', 1); assert.equal(b.veld.gewas, 'gras');
  B.tikUren(b, 100);
  const kgGras = B.opbrengstKg(b);
  assert.ok(Math.abs(kgGras - B.GEWASSEN.gras.kgBasis * PC.bodemFactor(0.6) * (2.5 / B.HA_REF)) < 1e-6, String(kgGras));
  B.rondTaakAf(b, 'oogsten', 1);
  assert.equal(b.schuur.veld, 'dijkweide'); assert.ok(B.uitputting(b) > 0);
  const eerste = B.uitputting(b);
  B.rondTaakAf(b, 'ploegen', 1); B.rondTaakAf(b, 'zaaien', 1); B.tikUren(b, 100); B.rondTaakAf(b, 'oogsten', 1);
  assert.ok(B.uitputting(b) - eerste > 0.04, 'dezelfde teelt twee keer put harder uit dan wisselen');
  assert.ok(B.uitputting(b) <= B.UITPUTTING_MAX);
  assert.ok(PC.zetActief(b.bedrijf, PC.START_PERCEEL)); B.syncVeld(b);
  assert.equal(B.fase(b), 'rijp', 'de Zonnehoek heeft zijn graan nog, inmiddels rijp');
  assert.equal(b.veld.gewas, 'graan');
  // het perceel gaat terug naar de verhuurder: zijn gewas gaat mee
  assert.ok(PC.zetActief(b.bedrijf, 'dijkweide')); B.syncVeld(b);
  B.rondTaakAf(b, 'ploegen', 1);
  PC.zegOp(b.bedrijf, 'perceel', 'dijkweide'); B.syncVeld(b);
  assert.equal(b.bedrijf.actief, PC.START_PERCEEL); assert.equal(b.veldVan, PC.START_PERCEEL); assert.equal(b.velden.dijkweide, undefined);
});

t('het kasboek: per veld en per boekjaar, met posten; de bank leent een beetje, rekent rente per dag en wil aflossing', () => {
  const b = nieuw(), w = wereld(2000);
  Live.loonwerk(w, 'ploegen'); Live.loonwerk(w, 'zaaien');
  assert.ok(b.boek.velden[PC.START_PERCEEL].kosten > 0);
  assert.equal(B.boekjaar(b), 1);
  B.tikUren(b, B.BOEKJAAR_UREN);
  assert.equal(B.boekjaar(b), 2);
  B.boek(b, { omzet: 100, kosten: 10, post: 'brandstof' });
  assert.equal(b.boek.jaren[2].omzet, 100); assert.equal(b.boek.jaren[2].posten.brandstof, 10); assert.ok(b.boek.jaren[1].kosten > 0);
  for (let j = 3; j < 40; j++) { b.uren = (j - 1) * B.BOEKJAAR_UREN; B.boek(b, { omzet: 1 }); }
  assert.ok(Object.keys(b.boek.jaren).length <= B.BOEKJAREN_BEWAARD, 'het kasboek groeit niet door');
  // de bank
  b.uren = 0; b.boek.jaren = {}; b.boek.lening = { schuld: 0, opgenomen: 0, afgelost: 0, rente: 0, tot: 0 };
  const g = wereld(0);
  assert.equal(Live.leenGeld(g, 50).ok, false); assert.equal(Live.leenGeld(g, B.LENING.max + 1).ok, false);
  assert.ok(Live.leenGeld(g, 10000).ok && g.money === 10000 && B.schuldBank(b) === 10000 && B.leenRuimte(b) === 15000);
  assert.equal(B.renteTik(b), 0, 'nog geen volle dag');
  B.tikUren(b, 24 * 10);
  const r = B.renteTik(b);
  assert.ok(r > 70 && r < 100, String(r));       // 0,08% per dag over tien dagen
  assert.equal(B.schuldBank(b), 10000 + r);
  assert.ok(b.boek.jaren[1].posten.rente === r);
  assert.equal(B.renteTik(b), 0);
  assert.equal(Live.leenGeld(g, 20000).ok, false, 'meer dan het maximum kan niet');
  const l1 = Live.losAf(g, 3000); assert.ok(l1.ok && l1.bedrag === 3000 && g.money === 7000);
  const l2 = Live.losAf(g, 1e9); assert.ok(l2.ok && l2.bedrag === 7000 && g.money === 0);
  assert.equal(B.schuldBank(b), 10000 + r - 10000);
  assert.equal(Live.losAf(wereld(0), 5).ok, false);
});

t('de haken: tanken, onderhoud, draaien en de machinehuur lopen via het geld van de speler en komen in het kasboek', () => {
  const b = nieuw(), w = wereld(100000);
  const k = Live.koopMachineCat(w, 'trekker-klein', PC.START_ERF);
  assert.ok(k.ok && w.money === 100000 - 9000);
  const h = Live.huurMachineCat(w, 'laadmachine', PC.START_ERF);
  assert.ok(h.ok && w.money === 100000 - 9000 - 90);
  const m = M.vind(b.bedrijf, k.uid);
  Live.draaiMachine(k.uid, 12, 2);
  assert.ok(m.brandstof < 45 && m.slijtage > 10);
  const geld = w.money;
  const tk = Live.tankMachine(w, k.uid, 'erf'); assert.ok(tk.ok && w.money === geld - tk.kosten);
  assert.equal(Live.tankMachine(w, k.uid, 'erf').ok, false);
  const ob = Live.onderhoudMachine(w, k.uid); assert.ok(ob.ok && m.slijtage === 0);
  assert.equal(Live.tankMachine(w, 'weg', 'erf').ok, false);
  assert.equal(Live.onderhoudMachine(w, 'weg').ok, false);
  const j = b.boek.jaren[1].posten;
  assert.ok(j.aankoop === 9000 && j.machines === 90 && j.brandstof > 0 && j.onderhoud > 0);
  // de huur loopt mee met de speluren
  b.uren = 30; const voor = w.money;
  Live.huurTik(w);
  assert.equal(w.money, voor - 90);
  const vk = Live.verkoopMachineCat(w, k.uid); assert.ok(vk.ok && vk.bedrag > 0);
});

t('opslag: versie blijft 1; machines met brandstof en slijtage en het kasboek blijven bewaard; oude opslag migreert; kapotte opslag geeft een geldige boerderij', () => {
  const st = nepOpslag();
  Live.zetBoerderijVoorTest(null, st);
  const b = Live.getBoerderij(), w = wereld();
  const k = Live.koopMachineCat(w, 'maaidorser', PC.START_ERF);
  Live.draaiMachine(k.uid, 3, 2); Live.leenGeld(w, 1000); Live.loonwerk(w, 'ploegen');
  Live.schrijfNu();
  const raw = JSON.parse(st.m.get('gde-boerderij-v1'));
  assert.equal(raw.v, 1);
  Live.zetBoerderijVoorTest(null, st);
  const terug = Live.getBoerderij();
  assert.deepEqual(terug.bedrijf.machinepark, b.bedrijf.machinepark);
  assert.deepEqual(terug.boek, b.boek); assert.equal(terug.veldVan, b.veldVan);
  assert.equal(B.normaliseer(JSON.stringify(terug)).boek.lening.schuld, 1000);
  // van stap 1: geen boek, geen veldVan, een machine zonder staat
  const oud = { v: 1, uren: 10, veld: { fase: 'geploegd', bodem: 0.9 }, schuur: { gewas: 'bieten', kg: 10, kwaliteit: 1 }, bedrijf: { v: 1, machinepark: { machines: [{ uid: 'm1', type: 'trekker-klein', erf: PC.START_ERF }], werktuigen: [{ uid: 'w1', type: 'ploeg-3', erf: PC.START_ERF }] } } };
  const m = B.normaliseer(oud);
  assert.equal(m.boek.lening.schuld, 0); assert.equal(m.veldVan, PC.START_PERCEEL); assert.equal(B.fase(m), 'geploegd');
  assert.equal(m.bedrijf.machinepark.machines[0].bezit, 'gekocht'); assert.ok(m.bedrijf.machinepark.machines[0].brandstof > 0); assert.equal(m.bedrijf.machinepark.werktuigen[0].brandstof, undefined);
  for (const raw2 of [{ v: 1, boek: 5 }, { v: 1, boek: { velden: 'x', jaren: [1], lening: { schuld: 'veel' } } }, { v: 1, velden: { dijkweide: 5 }, veldVan: 'spook', bodemlog: 3 }, { v: 1, bedrijf: { v: 1, machinepark: { machines: [{ uid: 'x', type: 'trekker-klein', erf: PC.START_ERF, brandstof: 'veel', slijtage: -50, bezit: 'gestolen' }] } } }]) {
    const x = B.normaliseer(raw2);
    assert.equal(x.v, 1); assert.equal(x.boek.lening.schuld, 0);
  }
  const x = B.normaliseer({ v: 1, bedrijf: { v: 1, machinepark: { machines: [{ uid: 'x', type: 'trekker-klein', erf: PC.START_ERF, brandstof: 9e9, slijtage: -50, bezit: 'gestolen' }] } } });
  const mm = x.bedrijf.machinepark.machines[0];
  assert.ok(mm.bezit === 'gekocht' && mm.slijtage === 0 && mm.brandstof <= 600);
});

console.log(`machines_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
