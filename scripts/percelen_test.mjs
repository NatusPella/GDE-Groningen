// Percelen en erven (#415 stap 1): het aanbod, kopen, leasen met achterstand, het erf en zijn opslag, de bodem, de migratie van oude
// boerderij-opslag en de haken (boerderijlive.js).   node scripts/percelen_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject.
import assert from 'node:assert/strict';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as Live from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const wereld = (money = 100000) => ({ money, clock: 8, time: 0, msgs: [], addMessage(x) { this.msgs.push(x); } });

t('aanbod: unieke id\'s, geldige gegevens, eerste is de Zonnehoek', () => {
  assert.equal(new Set(PC.PERCEEL_IDS).size, PC.PERCELEN.length);
  assert.equal(PC.PERCELEN[0].id, PC.START_PERCEEL);
  assert.equal(PC.ERVEN[0].id, PC.START_ERF);
  for (const p of PC.PERCELEN) {
    assert.ok(['akker', 'weiland'].includes(p.soort), p.id);
    assert.ok(p.ha > 0 && p.bodem >= 0 && p.bodem <= 1 && Number.isFinite(p.lat) && Number.isFinite(p.lon), p.id);
    assert.ok(p.lat > 53 && p.lat < 53.5 && p.lon > 6.2 && p.lon < 6.8, p.id + ' ligt buiten de provincie');
    if (p.aanbod !== 'eigen') assert.ok(p.koop > 0 && p.huurDag > 0 && p.eigenaar, p.id);
  }
  for (const e of PC.ERVEN) assert.ok(e.opslagKg > 0 && e.machinePlekken > 0 && e.huis && e.schuur, e.id);
  const plaatsen = new Set(PC.PERCELEN.map((p) => p.plaats));
  for (const p of ['Hoogkerk', 'Zuidhorn', 'Winsum']) assert.ok(plaatsen.has(p), p);
  assert.ok(PC.PERCELEN.some((p) => p.soort === 'weiland') && PC.PERCELEN.some((p) => p.soort === 'akker'));
  for (const a of ['koop', 'huur', 'beide']) assert.ok(PC.PERCELEN.some((p) => p.aanbod === a), a);
});

t('catalogus machines en werktuigen: verzonnen namen, geen echte merken', () => {
  const echt = /fendt|claas|deutz|john deere|massey|new holland|kubota|case|lely|krone|kverneland|amazone|valtra|jcb|zetor/i;
  for (const [id, c] of Object.entries(PC.MACHINE_CATALOGUS)) {
    assert.ok(c.naam && ['machine', 'werktuig'].includes(c.soort) && c.koop > 0 && c.huurDag > 0, id);
    assert.ok(!echt.test(c.naam), c.naam);
  }
  assert.ok(Object.values(PC.MACHINE_CATALOGUS).some((c) => c.type === 'trekker') && Object.values(PC.MACHINE_CATALOGUS).some((c) => c.type === 'maaidorser'));
});

t('nieuw bedrijf: Zonnehoek is van jou en thuis, machinepark leeg', () => {
  const bd = PC.nieuwBedrijf();
  assert.equal(bd.thuis, PC.START_ERF);
  assert.equal(bd.percelen[PC.START_PERCEEL].status, 'gekocht');
  assert.deepEqual(bd.machinepark, { machines: [], werktuigen: [] });
  assert.equal(PC.totaalHa(bd), 1.2);
});

t('kopen: prijs van het geld af, niet twee keer, niet als het alleen te huur is, niet te weinig geld', () => {
  const bd = PC.nieuwBedrijf();
  assert.equal(PC.koop(bd, 'perceel', 'dijkweide', 1e6).ok, false);          // alleen te huur
  assert.equal(PC.koop(bd, 'perceel', 'wierdeakker', 10).ok, false);
  const k = PC.perceelDef('wierdeakker').koop;
  const r = PC.koop(bd, 'perceel', 'wierdeakker', k);
  assert.ok(r.ok && r.prijs === k && bd.percelen.wierdeakker.status === 'gekocht');
  assert.equal(PC.koop(bd, 'perceel', 'wierdeakker', 1e6).ok, false);
  assert.equal(PC.koop(bd, 'perceel', 'nietbestaand', 1e6).ok, false);
  assert.equal(bd.totaal.gekocht, k);
});

t('verkopen: je krijgt een deel terug; de Zonnehoek niet; gehuurd niet', () => {
  const bd = PC.nieuwBedrijf();
  PC.koop(bd, 'perceel', 'wierdeakker', 1e6);
  const r = PC.verkoop(bd, 'perceel', 'wierdeakker');
  assert.ok(r.ok && r.opbrengst === Math.round(PC.perceelDef('wierdeakker').koop * PC.VERKOOP_FACTOR) && !bd.percelen.wierdeakker);
  assert.equal(PC.verkoop(bd, 'perceel', PC.START_PERCEEL).ok, false);
  assert.equal(PC.verkoop(bd, 'erf', PC.START_ERF).ok, false);
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  assert.equal(PC.verkoop(bd, 'perceel', 'dijkweide').ok, false);
});

t('leasen: eerste periode meteen betaald, per dag of week, een week is goedkoper', () => {
  const bd = PC.nieuwBedrijf();
  const d = PC.perceelDef('dijkweide');
  assert.equal(PC.huur(bd, 'perceel', 'dijkweide', 'maand', 0, 1e6).ok, false);
  assert.equal(PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, d.huurDag - 1).ok, false);
  assert.equal(PC.huur(bd, 'perceel', 'zandkamp', 'dag', 0, 1e6).ok, false);   // alleen te koop
  const r = PC.huur(bd, 'perceel', 'dijkweide', 'week', 10, 1e6);
  assert.ok(r.ok && r.bedrag === PC.huurBedrag(d, 'week') && r.bedrag < d.huurDag * 7);
  assert.equal(bd.percelen.dijkweide.volgende, 10 + 7 * 24);
  assert.equal(PC.stand(bd, 'perceel', 'dijkweide').van, 'jou');
  assert.equal(PC.huurPerDag(bd), Math.round(r.bedrag / 7));
});

t('huur loopt in speltijd: betaald als het kan, niets voor de periode verstrijkt', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  const d = PC.perceelDef('dijkweide');
  let r = PC.verwerkHuur(bd, 23.9, 1e6);
  assert.equal(r.uitgave, 0);
  r = PC.verwerkHuur(bd, 24, 1e6);
  assert.deepEqual(r.events.map((e) => e.type), ['betaald']);
  assert.equal(r.uitgave, d.huurDag);
  r = PC.verwerkHuur(bd, 24 * 4, 1e6);                                         // drie dagen slapen: drie betalingen
  assert.equal(r.events.filter((e) => e.type === 'betaald').length, 3);
  assert.equal(bd.percelen.dijkweide.achterstand, 0);
});

t('te laat betalen: achterstand, daarna terug naar de verhuurder', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  PC.zetActief(bd, PC.START_PERCEEL);
  let r = PC.verwerkHuur(bd, 24, 0);
  assert.deepEqual(r.events.map((e) => e.type), ['achterstand']);
  assert.equal(bd.percelen.dijkweide.achterstand, 1);
  assert.equal(PC.openSchuld(bd), PC.perceelDef('dijkweide').huurDag);
  r = PC.verwerkHuur(bd, 48, 0);
  assert.deepEqual(r.events.map((e) => e.type), ['achterstand', 'terug']);
  assert.ok(!bd.percelen.dijkweide);
  assert.equal(PC.stand(bd, 'perceel', 'dijkweide').van, 'verhuurder');
  assert.equal(bd.totaal.teruggegeven, 1);
  assert.equal(PC.openSchuld(bd), 0);
});

t('achterstand inhalen: genoeg geld betaalt de schuld mee; zelf betalen kan ook', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  const d = PC.perceelDef('dijkweide');
  PC.verwerkHuur(bd, 24, 0);
  const r = PC.verwerkHuur(bd, 48, d.huurDag * 2);
  assert.deepEqual(r.events.map((e) => e.type), ['betaald']);
  assert.equal(r.uitgave, d.huurDag * 2);
  assert.equal(bd.percelen.dijkweide.achterstand, 0);
  PC.verwerkHuur(bd, 72, 0);
  assert.equal(PC.betaalSchuld(bd, 'perceel', 'dijkweide', 1).ok, false);
  const p = PC.betaalSchuld(bd, 'perceel', 'dijkweide', 1e6);
  assert.ok(p.ok && p.bedrag === d.huurDag && PC.openSchuld(bd) === 0);
});

t('een heel lange slaap blijft begrensd en rekent door', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  const r = PC.verwerkHuur(bd, 24 * 1000, 1e9);
  assert.ok(r.events.length <= 60 && r.events.every((e) => e.type === 'betaald'));
});

t('opzeggen: terug naar de verhuurder; gekocht kun je niet opzeggen; actief perceel valt terug', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'zuiderzijde', 'dag', 0, 1e6);
  assert.ok(PC.zetActief(bd, 'zuiderzijde'));
  assert.ok(PC.zegOp(bd, 'perceel', 'zuiderzijde').ok);
  assert.equal(bd.actief, PC.START_PERCEEL);
  PC.koop(bd, 'perceel', 'wierdeakker', 1e6);
  assert.equal(PC.zegOp(bd, 'perceel', 'wierdeakker').ok, false);
  assert.equal(PC.zegOp(bd, 'perceel', 'leekster-veld').ok, false);
});

t('actief perceel: alleen een akker die van jou is', () => {
  const bd = PC.nieuwBedrijf();
  assert.equal(PC.zetActief(bd, 'wierdeakker'), false);
  PC.koop(bd, 'perceel', 'wierdeakker', 1e6);
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  assert.equal(PC.zetActief(bd, 'dijkweide'), false);                          // weiland
  assert.ok(PC.zetActief(bd, 'wierdeakker'));
});

t('bodem beïnvloedt de opbrengst; de Zonnehoek blijft precies zoals voorheen', () => {
  assert.equal(PC.bodemFactor(0.75), 1);
  assert.ok(PC.bodemFactor(0.35) < 1 && PC.bodemFactor(0.95) > 1);
  const opbr = (actief) => {
    const b = B.nieuweBoerderij();
    if (actief !== PC.START_PERCEEL) { PC.koop(b.bedrijf, 'perceel', actief, 1e6); PC.zetActief(b.bedrijf, actief); }
    b.veld = { fase: 'gezaaid', gewas: 'aardappelen', bodem: 1, zaai: 1, mest: 0, gezaaidOp: 0 };
    b.uren = 100;
    return B.opbrengstKg(b);
  };
  assert.equal(opbr(PC.START_PERCEEL), B.GEWASSEN.aardappelen.kgBasis);        // zoals voor #415 stap 1
  assert.ok(opbr('bedumer-klei') > opbr(PC.START_PERCEEL));
  assert.ok(opbr('zandkamp') < opbr(PC.START_PERCEEL));
  assert.equal(PC.bodemNaam(0.3), 'zwak');
  assert.equal(PC.bodemNaam(0.95), 'uitstekend');
});

t('erf: kopen of huren, thuis kiezen, opslag met grens', () => {
  const bd = PC.nieuwBedrijf();
  assert.equal(PC.zetThuis(bd, 'wierdehoeve'), false);
  assert.ok(PC.koop(bd, 'erf', 'wierdehoeve', 1e6).ok);
  assert.ok(PC.zetThuis(bd, 'wierdehoeve') && bd.thuis === 'wierdehoeve');
  const vrij = PC.opslagVrij(bd, 'wierdehoeve');
  assert.equal(vrij, PC.erfDef('wierdehoeve').opslagKg);
  const r = PC.bergOp(bd, 'wierdehoeve', 'aardappelen', vrij + 500);
  assert.ok(r.ok && r.kg === vrij && PC.opslagVrij(bd, 'wierdehoeve') === 0);
  assert.equal(PC.bergOp(bd, 'wierdehoeve', 'bieten', 10).ok, false);          // vol
  assert.equal(PC.bergOp(bd, 'kleiplaats', 'bieten', 10).ok, false);           // niet van jou
  const u = PC.haalUit(bd, 'wierdehoeve', 'aardappelen', 1000);
  assert.ok(u.ok && u.kg === 1000 && PC.opslagGebruikt(bd, 'wierdehoeve') === vrij - 1000);
  assert.equal(PC.haalUit(bd, 'wierdehoeve', 'bieten', 5).ok, false);
});

t('machines op het erf: plekken, verplaatsen, alleen uit de catalogus', () => {
  const bd = PC.nieuwBedrijf();
  const plek = PC.erfDef(PC.START_ERF).machinePlekken;
  for (let i = 0; i < plek; i++) assert.ok(PC.stal(bd, i === 0 ? 'trekker-klein' : 'ploeg-3', PC.START_ERF).ok);
  assert.equal(PC.vrijePlekken(bd, PC.START_ERF), 0);
  assert.equal(PC.stal(bd, 'ploeg-3', PC.START_ERF).ok, false);
  assert.equal(PC.stal(bd, 'bestaatniet', PC.START_ERF).ok, false);
  assert.equal(bd.machinepark.machines.length, 1);
  assert.equal(bd.machinepark.werktuigen.length, plek - 1);
  PC.koop(bd, 'erf', 'kleiplaats', 1e6);
  assert.ok(PC.verplaats(bd, 'trekker-klein-1', 'kleiplaats').ok);
  assert.equal(PC.vrijePlekken(bd, PC.START_ERF), 1);
});

t('een erf kwijt: opslag en machines verhuizen naar De Zonnehoek, thuis valt terug', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'erf', 'weidehof', 'dag', 0, 1e6);
  PC.zetThuis(bd, 'weidehof');
  PC.bergOp(bd, 'weidehof', 'bieten', 1500);
  PC.stal(bd, 'maaier', 'weidehof');
  assert.ok(PC.zegOp(bd, 'erf', 'weidehof').ok);
  assert.equal(bd.thuis, PC.START_ERF);
  assert.equal(bd.opslag.weidehof, undefined);
  assert.equal(bd.opslag[PC.START_ERF].bieten, 1500);
  assert.equal(PC.machinesOp(bd, PC.START_ERF).length, 1);
});

t('een erf dat terug moet door achterstand ruimt ook op', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'erf', 'kleiplaats', 'week', 0, 1e6);
  PC.zetThuis(bd, 'kleiplaats');
  PC.bergOp(bd, 'kleiplaats', 'aardappelen', 800);
  PC.verwerkHuur(bd, 7 * 24, 0);
  const r = PC.verwerkHuur(bd, 14 * 24, 0);
  assert.ok(r.events.some((e) => e.type === 'terug'));
  assert.equal(bd.thuis, PC.START_ERF);
  assert.equal(bd.opslag[PC.START_ERF].aardappelen, 800);
});

t('normaliseren: leeg, oud (zonder bedrijf), kapot en onzin geven een geldig bedrijf', () => {
  for (const raw of [undefined, null, 5, 'x', [], { v: 99 }, { v: 1, percelen: 'kapot', erven: 7, opslag: [], machinepark: 3 }]) {
    const bd = PC.normaliseerBedrijf(raw);
    assert.equal(bd.thuis, PC.START_ERF);
    assert.equal(bd.percelen[PC.START_PERCEEL].status, 'gekocht');
  }
  const bd = PC.nieuwBedrijf();
  PC.koop(bd, 'perceel', 'wierdeakker', 1e6);
  PC.huur(bd, 'erf', 'weidehof', 'week', 5, 1e6);
  PC.zetThuis(bd, 'weidehof');
  PC.bergOp(bd, 'weidehof', 'bieten', 700);
  PC.stal(bd, 'cultivator', 'weidehof');
  const terug = PC.normaliseerBedrijf(JSON.parse(JSON.stringify(bd)));
  assert.deepEqual(terug, bd);
});

t('normaliseren: onbekende id\'s, te veel opslag, vreemde machines en slechte getallen gaan weg', () => {
  const bd = PC.normaliseerBedrijf({
    v: 1, thuis: 'nergens', actief: 'dijkweide',
    percelen: { dijkweide: { status: 'gehuurd', betaling: 'x', volgende: 'z', schuld: -5, achterstand: 99 }, spook: { status: 'gekocht' }, wierdeakker: { status: 'gekocht', sinds: NaN } },
    erven: { weidehof: { status: 'gekocht' } },
    opslag: { weidehof: { bieten: 1e9, 'KAPOT!': 5, aardappelen: -3 }, spook: { bieten: 5 } },
    machinepark: { machines: [{ uid: 'a', type: 'ploeg-3', erf: 'weidehof' }, { uid: 'b', type: 'trekker-klein', erf: 'spook' }, null], werktuigen: [{ uid: 'c', type: 'ploeg-3', erf: 'weidehof' }] },
  });
  assert.equal(bd.thuis, PC.START_ERF);
  assert.equal(bd.actief, PC.START_PERCEEL);                                    // weiland kan niet actief zijn
  assert.equal(bd.percelen.spook, undefined);
  const dw = bd.percelen.dijkweide;
  assert.ok(dw.betaling === 'dag' && Number.isFinite(dw.volgende) && dw.schuld === 0 && dw.achterstand === PC.MAX_ACHTERSTAND);
  assert.equal(bd.opslag.weidehof.bieten, PC.erfDef('weidehof').opslagKg);
  assert.deepEqual(Object.keys(bd.opslag.weidehof), ['bieten']);
  assert.equal(bd.machinepark.machines.length, 0);                              // ploeg is geen machine, spook-erf bestaat niet
  assert.equal(bd.machinepark.werktuigen.length, 1);
});

t('migratie: een oude boerderij (v1 zonder bedrijf) laadt heel, met De Zonnehoek als bedrijf', () => {
  const oud = { v: 1, uren: 120, perceel: { x: 10, y: 20, a: 0.5 }, keuze: 'bieten', veld: { fase: 'gezaaid', gewas: 'bieten', bodem: 0.8, zaai: 0.9, mest: 0.5, gezaaidOp: 100 }, schuur: { gewas: 'aardappelen', kg: 900, kwaliteit: 1 }, machines: { ploeg: 'eigen' }, totaal: { oogsten: 3, leveringen: 2, omzet: 700, uitgaven: 300 } };
  const b = B.normaliseer(JSON.stringify(oud));
  assert.equal(b.uren, 120);
  assert.equal(b.keuze, 'bieten');
  assert.equal(b.schuur.kg, 900);
  assert.equal(b.machines.ploeg, 'eigen');
  assert.equal(b.totaal.omzet, 700);
  assert.equal(b.veld.gewas, 'bieten');
  assert.equal(b.bedrijf.thuis, PC.START_ERF);
  assert.equal(b.bedrijf.percelen[PC.START_PERCEEL].status, 'gekocht');
  const verwacht = B.GEWASSEN.bieten.kgBasis * (0.6 + 0.4 * 0.8) * (0.5 + 0.5 * 0.9) * (1 + 0.2 * 0.5) * (20 / 48);   // groei: 20 van 48 speluren
  assert.ok(Math.abs(B.opbrengstKg(b) - verwacht) < 1e-6);
});

t('kaartlaag: soort en onderschrift', () => {
  const bd = PC.nieuwBedrijf();
  PC.huur(bd, 'perceel', 'dijkweide', 'dag', 0, 1e6);
  const o = Object.fromEntries(PC.overzichtPercelen(bd).map((s) => [s.id, s]));
  assert.equal(PC.kaartSoort(o[PC.START_PERCEEL]), 'perceel-eigen');
  assert.equal(PC.kaartSoort(o.dijkweide), 'perceel-eigen');
  assert.equal(PC.kaartSoort(o.zandkamp), 'perceel-koop');
  assert.equal(PC.kaartSoort(o.wierdeakker), 'perceel-koop');
  assert.equal(PC.kaartSoort(o['reitdiep-weide']), 'perceel-huur');
  assert.match(PC.kaartOnderschrift(o.wierdeakker), /te koop €[\d.]+, te huur €[\d.]+ per dag · Maatschap Wierdehoek/);
  assert.match(PC.kaartOnderschrift(o.dijkweide), /gehuurd/);
});

// --- boerderijlive: betalen uit je geld, opslag, huur in de klok ---

t('live: kopen en huren gaan van het geld af en blijven in de opslag; de Zonnehoek-akker bestaat al', () => {
  const st = nepOpslag();
  Live.zetBoerderijVoorTest(null, st);
  Live.initBoerderij({ opslag: st });
  const w = wereld(10000);
  const k = PC.perceelDef('wierdeakker').koop;
  assert.ok(Live.koopPerceel(w, 'perceel', 'wierdeakker').ok);
  assert.equal(w.money, 10000 - k);
  const h = Live.huurPerceel(w, 'perceel', 'dijkweide', 'dag');
  assert.ok(h.ok);
  assert.equal(w.money, 10000 - k - PC.perceelDef('dijkweide').huurDag);
  assert.equal(Live.koopPerceel(wereld(5), 'perceel', 'bedumer-klei').ok, false);
  Live.schrijfNu();
  assert.equal(Live.getBedrijf().percelen.wierdeakker.status, 'gekocht');
  Live.zetBoerderijVoorTest(null, st);                                          // opnieuw laden uit de opslag
  Live.initBoerderij({ opslag: st });
  assert.equal(Live.getBedrijf().percelen.dijkweide.status, 'gehuurd');
  assert.ok(Live.verkoopPerceel(w, 'perceel', 'wierdeakker').ok);
  assert.equal(w.money, 10000 - PC.perceelDef('dijkweide').huurDag - k + Math.round(k * PC.VERKOOP_FACTOR));
});

t('live: de huur loopt mee met de klok; achterstand geeft een melding, daarna gaat het perceel terug', () => {
  const st = nepOpslag();
  Live.zetBoerderijVoorTest(null, st);
  const w = wereld(1000);
  Live.huurPerceel(w, 'perceel', 'dijkweide', 'dag');
  const d = PC.perceelDef('dijkweide').huurDag;
  let klok = 8, tijd = 0;
  const loop = (uren) => { for (let i = 0; i < uren; i += 6) { klok += 6; w.clock = klok % 24; Live.boerderijTijd(w, (tijd += 100)); } };
  w.clock = klok; Live.boerderijTijd(w, 0);
  loop(18);
  assert.equal(w.money, 1000 - d);                                              // nog binnen de eerste dag
  loop(6);
  assert.equal(w.money, 1000 - 2 * d);                                          // de dag voorbij: betaald
  w.money = 0;
  loop(24);
  assert.ok(w.msgs.some((m) => /loopt achter/.test(m)), 'melding bij achterstand');
  assert.ok(Live.getBedrijf().percelen.dijkweide);
  loop(24);
  assert.ok(w.msgs.some((m) => /terug naar de verhuurder/.test(m)), 'melding bij terug');
  assert.equal(Live.getBedrijf().percelen.dijkweide, undefined);
  assert.equal(w.money, 0);
});

t('live: oogst naar de opslag van je thuis en weer naar de schuur', () => {
  const st = nepOpslag();
  Live.zetBoerderijVoorTest(null, st);
  const b = Live.getBoerderij();
  assert.equal(Live.schuurNaarErf().ok, false);                                // schuur leeg
  b.schuur = { gewas: 'aardappelen', kg: 1500, kwaliteit: 1 };
  const r = Live.schuurNaarErf();
  assert.ok(r.ok && r.kg === 1500 && b.schuur.kg === 0 && Live.getBedrijf().opslag[PC.START_ERF].aardappelen === 1500);
  const u = Live.erfNaarSchuur(PC.START_ERF, 'aardappelen');
  assert.ok(u.ok && b.schuur.kg === 1500 && b.schuur.gewas === 'aardappelen' && PC.opslagGebruikt(Live.getBedrijf(), PC.START_ERF) === 0);
  assert.equal(Live.erfNaarSchuur(PC.START_ERF, 'aardappelen').ok, false);
});

t('live: een volle opslag neemt niet alles; wat niet past blijft in de schuur', () => {
  const st = nepOpslag();
  Live.zetBoerderijVoorTest(null, st);
  const b = Live.getBoerderij();
  const cap = PC.erfDef(PC.START_ERF).opslagKg;
  b.schuur = { gewas: 'bieten', kg: cap + 700, kwaliteit: 1 };
  const r = Live.schuurNaarErf();
  assert.ok(r.ok && r.kg === cap && b.schuur.kg === 700);
});

console.log(`percelen_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
