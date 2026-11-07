// Samen spelen (#683): acht herhaalbare banen met een helper-rol — rondvaart en veerdienst (de gast vaart mee
// als passagier), de rechtbank (tweede jurylid) en de vijf met een eigen E-hulp: cabaret (mede-optreder), loket
// (tweede balie), snackoverlast (handhaver), tjalke (bemanning) en bietenoogst (helper). De banen zelf laden
// three van een CDN en zijn hier niet te importeren; deze test dekt de regels, de uitnodiging, de volledige
// beloning per speler, de hulpregels en de bron van elke haak. De echte TCP-kant staat in scripts/coop/bijbaan_test.mjs.
//   node scripts/coop/bijbaanrollen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as B from '../../game/js/coopbijbaan.js';
import * as S from '../../game/js/coopstatus.js';
import { juryGenade } from '../../game/js/casework.js';
import { medeGrapje, hulpStap, hulpTip, HULP_MAX } from '../../game/js/bijbaanhulp.js';
import { BAAN_IDS, vakVanBaan } from '../../game/js/loopbaan.js';
import { sfeerVan } from '../../game/js/carrieresfeer.js';

const bron = (p) => fs.readFileSync(new URL('../../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const ROL = {
  rondvaart: 'passagier', veerdienst: 'passagier', rechtbank: 'tweede jurylid',
  cabaret: 'mede-optreder', loket: 'tweede balie', snackoverlast: 'handhaver', tjalke: 'bemanning', bietenoogst: 'helper',
};

t('#683: de drie banen hebben een regel met een helper-rol en staan op werkt', () => {
  for (const [id, rol] of Object.entries(ROL)) {
    assert.equal(B.bijbaanMetCoop(id), true, id);
    assert.equal(B.BIJBAAN_REGELS[id].rol, rol, id + ': rol');
    assert.ok(B.BIJBAAN_REGELS[id].hulp.length > 30, id + ': hulptekst');
    assert.equal(S.samenStatus('bijbaan', id), S.WERKT, id + ': status');
    const label = { rondvaart: 'de rondvaart', veerdienst: 'de veerdienst', rechtbank: 'de rechtbank', cabaret: 'het cabaret', loket: 'het loket', snackoverlast: 'de snackoverlast', tjalke: 'de tjalke', bietenoogst: 'de bietenoogst' }[id];
    assert.ok(S.samenKan().includes(label), id + ' staat in de positieve lijst');
  }
  // een passagier hoeft niet bij een deur te staan; de juryleden drukken geen hulpactie
  assert.equal(B.BIJBAAN_REGELS.rondvaart.positie, false);
  assert.equal(B.BIJBAAN_REGELS.veerdienst.positie, false);
  assert.equal(B.BIJBAAN_REGELS.rechtbank.actie, false);
});

// Dezelfde pure toestand die sidejobs.js en coopnet.js gebruiken: uitnodigen, antwoorden, belonen.
t('#683: de gast zegt J en krijgt elke ronde het volle bedrag en de punten; N en geen antwoord krijgen niets', () => {
  for (const id of Object.keys(ROL)) {
    const st = B.maakBijbaan(), v = new Set([1, 2, 3]);
    const uit = B.beginBijbaan(st, id, 'testbaan', [1, 2, 3], 1, 'Tessa');
    assert.deepEqual(uit.map((u) => u.slot), [2, 3], id + ': de starter wordt niet gevraagd');
    assert.equal(B.antwoordBijbaan(st, 2, true), true, id + ': J telt');
    assert.equal(B.antwoordBijbaan(st, 3, false), true, id + ': N telt');
    assert.deepEqual(B.deelnemers(st, v), [1, 2], id + ': de starter en wie J zei');
    const r = B.beloningBijbaan(st, v, { basis: 90, vak: 'water', xp: 10, ronde: 0 });
    assert.deepEqual(r.map((x) => [x.slot, x.geld, x.xp]), [[1, 90, 10], [2, 90, 10]], id + ': ieder het volle bedrag en alle punten');
    assert.deepEqual(B.beloningBijbaan(st, v, { basis: 90, vak: 'water', xp: 10, ronde: 0 }), [], id + ': dezelfde ronde niet twee keer');
    const r2 = B.beloningBijbaan(st, v, { basis: 90, xp: 10, ronde: 1 });
    assert.equal(r2.length, 2, id + ': de volgende ronde betaalt weer');
    assert.notEqual(r2[0].id, r[0].id, id + ': een nieuwe ronde heeft een eigen id');
    B.verlaatBijbaan(st, 2);
    assert.deepEqual(B.beloningBijbaan(st, new Set([1]), { basis: 90, ronde: 2 }).map((x) => x.slot), [1], id + ': wie wegvalt krijgt niets meer');
    B.eindeBijbaan(st);
    assert.deepEqual(B.beloningBijbaan(st, v, { basis: 90, ronde: 3 }), [], id + ': na de baan geen beloning');
  }
});

t('#683: de rechtbank: een tweede jurylid vergeeft één fout antwoord', () => {
  assert.equal(juryGenade(2, 1, 1), 2, 'alleen: geen genade');
  assert.equal(juryGenade(2, 1, 2), 3, 'tweede jurylid: één fout telt als goed');
  assert.equal(juryGenade(0, 3, 4), 1, 'hooguit één');
  assert.equal(juryGenade(3, 0, 2), 3, 'zonder fouten niets extra');
  assert.equal(juryGenade(0, 0, 2), 0);
  const rb = bron('sidejob_rechtbank.js');
  assert.match(rb, /juryGenade\(d\.right, d\.wrong, d\.jury\)/, 'de baan gebruikt dezelfde regel');
  assert.match(rb, /coopBijbaanAantal\(c\.owner \|\| 0\)/, 'het aantal juryleden komt van de baan');
  assert.match(rb, /tweede jurylid/, 'de melding noemt de rol');
});

t('#683: de vijf E-hulpjes rekenen met dezelfde regels als de baan (mede-optreden, balie, handhaver, bemanning, oogst)', () => {
  const perfect = medeGrapje(10, 10.1), vroeg = medeGrapje(10, 9.2), laat = medeGrapje(10, 11.5);
  assert.equal(perfect.soort, 'perfect'); assert.ok(perfect.punten > 0);
  assert.equal(vroeg.soort, 'te-vroeg'); assert.equal(laat.soort, 'te-laat');
  assert.equal(medeGrapje(10, 10.1, true).ok, false, 'één keer per grap');
  let h = 0;
  for (let i = 0; i < 5; i++) h = hulpStap(h).help;
  assert.equal(h, HULP_MAX, 'nooit meer dan drie hulpen');
  assert.equal(hulpStap(HULP_MAX).ok, false);
  assert.equal(hulpTip('balie', 2), 20); assert.equal(hulpTip('handhaver', 1), 15);
  assert.equal(hulpTip('bemanning', 3), 30); assert.equal(hulpTip('oogst', 1), 12); assert.equal(hulpTip('balie', 0), 0);
  // elke baan heeft de haak en publiceert dat er nu iets te helpen is
  for (const f of ['sidejob_cabaret.js', 'sidejob_keuze.js', 'sidejob_snackbar.js', 'sidejob_tjalke.js', 'sidejob_bieten.js']) {
    const src = bron(f);
    assert.match(src, /helperActie\(c\)/, f + ': helperActie');
    assert.match(src, /help: /, f + ': help in de publicatie');
  }
  assert.match(bron('sidejob_cabaret.js'), /medeGrapje/, 'cabaret: mede-optreden');
  assert.match(bron('sidejob_keuze.js'), /hulpTip\('balie'/, 'loket: tweede balie telt tip');
  assert.match(bron('sidejob_snackbar.js'), /hulpTip\('handhaver'/, 'snackoverlast: handhaver');
  assert.match(bron('sidejob_tjalke.js'), /hulpTip\('bemanning'/, 'tjalke: bemanning');
  assert.match(bron('sidejob_bieten.js'), /hulpTip\('oogst'/, 'bietenoogst: helper');
});

t('#683: de haak en de uitleg staan in de bron, het register en de docs', () => {
  assert.match(bron('sidejob_rondvaart.js'), /id: 'rondvaart'/, 'de rondvaart-baan bestaat');
  assert.match(bron('sidejob_veer.js'), /id: 'veerdienst'/, 'de veerdienst-baan bestaat');
  const cg = bron('coopgast.js');
  for (const w of ['rondvaart', 'veerdienst', 'rechtbank']) assert.match(cg, new RegExp(w), w + ' staat in de gast-uitleg');
  const doc = bron('../../docs/COOP-GAST.md');
  for (const w of ['rondvaart', 'veerdienst', 'rechtbank', 'cabaret', 'loket', 'snackoverlast', 'tjalke', 'bietenoogst']) assert.match(doc, new RegExp(w), w + ' staat in docs/COOP-GAST.md');
  assert.match(bron('coopstatus.js'), /cabaret: WERKT, loket: WERKT, snackoverlast: WERKT, tjalke: WERKT, bietenoogst: WERKT/, 'de vijf statussen staan op werkt');
});

t('#631: elke bijbaan heeft een sfeer uit carrieresfeer.js en de startkaart noemt hem', () => {
  for (const id of BAAN_IDS) assert.ok(sfeerVan(vakVanBaan(id)).naam, id + ': sfeer');
  const sj = bron('sidejobs.js');
  assert.match(sj, /sfeerVan\(vakVanBaan\(job\.id\)\)/, 'de baan leest de sfeer van zijn vak');
  assert.match(sj, /sfeerKop/, 'de sfeer staat in de kaart en de herhaaltoast');
});

console.log(`bijbaanrollen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
