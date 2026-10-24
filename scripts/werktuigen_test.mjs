// Werktuigen (#415 stap 2): koppelen en ontkoppelen, aftakas en hef, welk werktuig bij welke klus hoort, het veldwerk per cel en de aanhanger.
//   node scripts/werktuigen_test.mjs
import assert from 'node:assert/strict';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import * as M from '../game/js/machines.js';
import * as W from '../game/js/werktuigen.js';
import { akkerRijen, rijPositie } from '../game/js/bietenrules.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n  ')); } };

const park = () => {
  const bd = PC.nieuwBedrijf();
  const id = (type) => M.vind(bd, M.koopUitCatalogus(bd, type, PC.START_ERF, 1e9).uid);
  return { bd, id };
};

t('de tabel: elk werktuig in de catalogus met gedrag heeft een taak, hef en aftakas; de aanhanger vervoert', () => {
  for (const [type, d] of Object.entries(W.WERKTUIG)) {
    assert.ok(Object.values(PC.MACHINE_CATALOGUS).some((c) => c.type === type && c.soort === 'werktuig'), type + ' staat in de catalogus');
    assert.ok(d.achter > 0 && d.woord, type);
    if (!d.vervoer) assert.ok(B.TAKEN[d.taak], type);
  }
  for (const taak of ['ploegen', 'cultiveren', 'zaaien', 'bemesten', 'spuiten', 'oogsten']) assert.ok(Object.values(W.WERKTUIG).some((d) => d.taak === taak), taak);
  assert.ok(W.WERKTUIG.aanhanger.vervoer && W.WERKTUIG.aanhanger.kg > 0);
  for (const taak of ['ploegen', 'cultiveren', 'zaaien', 'bemesten', 'spuiten', 'oogsten']) { const b = W.BANDEN[taak]; assert.ok(b.vMax - b.vMin >= 2.5 && b.vMax <= 8 && b.tol >= 2, taak); }
  assert.equal(W.WERKTUIG_TYPES.length, 7);
});

t('koppelen: een trekker neemt een werktuig mee; niet twee tegelijk, niet aan een maaidorser, niet hetzelfde werktuig aan twee trekkers', () => {
  const { id } = park();
  const t1 = id('trekker-klein'), t2 = id('trekker-groot'), dorser = id('maaidorser'), ploeg = id('ploeg-3'), zaai = id('zaaimachine');
  const r1 = W.nieuweRig(t1.uid), r2 = W.nieuweRig(t2.uid), rd = W.nieuweRig(dorser.uid);
  assert.equal(W.koppel(rd, dorser, ploeg).ok, false);
  assert.equal(W.koppel(r1, t1, t1).ok, false, 'een machine is geen werktuig');
  assert.ok(W.koppel(r1, t1, ploeg).ok);
  assert.equal(r1.werktuig, ploeg.uid); assert.equal(r1.pto, false); assert.equal(r1.hef, 'omhoog');
  assert.equal(W.koppel(r1, t1, zaai).ok, false, 'er hangt al een werktuig');
  assert.match(W.koppel(r2, t2, ploeg, [ploeg.uid]).reden, /andere trekker/);
  assert.ok(W.koppel(r2, t2, zaai, [ploeg.uid]).ok);
  assert.ok(W.ontkoppel(r1).ok); assert.equal(r1.werktuig, null);
  assert.equal(W.ontkoppel(r1).ok, false);
});

t('aftakas en hef: alleen als er iets aan hangt dat ze gebruikt; werken kan pas met hef omlaag en aftakas aan zoals het werktuig vraagt', () => {
  const { id } = park();
  const tr = id('trekker-klein'), ploeg = id('ploeg-3'), zaai = id('zaaimachine'), mest = id('mestwaaier'), maai = id('maaier');
  const rig = W.nieuweRig(tr.uid);
  assert.equal(W.wisselPto(rig, tr, null).ok, false); assert.equal(W.wisselHef(rig, tr, null).ok, false);
  assert.equal(W.werkSet(rig, tr, null), null);
  W.koppel(rig, tr, ploeg);
  let set = W.werkSet(rig, tr, ploeg);
  assert.equal(set.taak, 'ploegen'); assert.equal(W.werktNu(set, rig), false);
  assert.deepEqual(W.ontbreekt(set, rig), ['hef omlaag (T)']);
  assert.equal(W.wisselPto(rig, tr, ploeg).ok, false, 'de ploeg heeft geen aftakas');
  assert.equal(W.wisselHef(rig, tr, ploeg).omlaag, true);
  assert.equal(W.werktNu(set, rig), true);
  assert.equal(W.wisselHef(rig, tr, ploeg).omlaag, false);
  W.ontkoppel(rig); W.koppel(rig, tr, zaai); set = W.werkSet(rig, tr, zaai);
  assert.deepEqual(W.ontbreekt(set, rig), ['hef omlaag (T)', 'aftakas aan (G)']);
  W.wisselHef(rig, tr, zaai); assert.equal(W.werktNu(set, rig), false, 'de zaaimachine wil ook de aftakas');
  assert.equal(W.wisselPto(rig, tr, zaai).aan, true); assert.equal(W.werktNu(set, rig), true);
  W.ontkoppel(rig); assert.equal(rig.pto, false, 'ontkoppelen zet de aftakas uit'); assert.equal(rig.hef, 'omhoog');
  W.koppel(rig, tr, mest); set = W.werkSet(rig, tr, mest);
  assert.deepEqual(W.ontbreekt(set, rig, { pto: 'G', hef: 'T' }), ['aftakas aan (G)']);
  assert.equal(W.wisselHef(rig, tr, mest).ok, false, 'de mestverspreider heeft geen hef');
  W.ontkoppel(rig); W.koppel(rig, tr, maai);
  assert.equal(W.werkSet(rig, tr, maai).gewas[0], 'gras');
});

t('de maaidorser oogst zelf (aftakas en maaitafel), maar geen gras; de maaier is voor gras', () => {
  const { id } = park();
  const dorser = id('maaidorser'), tr = id('trekker-groot'), maai = id('maaier');
  const rd = W.nieuweRig(dorser.uid);
  const set = W.werkSet(rd, dorser, null);
  assert.equal(set.taak, 'oogsten'); assert.equal(W.werktNu(set, rd), false);
  assert.ok(W.wisselPto(rd, dorser, null).aan); assert.ok(W.wisselHef(rd, dorser, null).omlaag); assert.equal(W.werktNu(set, rd), true);
  assert.equal(W.pastBij(set, 'oogsten', 'graan').ok, true);
  assert.match(W.pastBij(set, 'oogsten', 'gras').reden, /maaier/);
  assert.equal(W.pastBij(set, 'ploegen', 'graan').ok, false);
  const rt = W.nieuweRig(tr.uid); W.koppel(rt, tr, maai);
  const ms = W.werkSet(rt, tr, maai);
  assert.equal(W.pastBij(ms, 'oogsten', 'gras').ok, true); assert.match(W.pastBij(ms, 'oogsten', 'graan').reden, /maaidorser/);
});

// een trekker die de vier rijen netjes rijdt: de plek van het werktuig langs elke rij
const rij = (rijen, x, y) => rijen.map((r) => rijPositie(r, x, y));
function rijdAlles(w, { speed = 4, across = 0, dt = 0.1, werkt = true, rijenOverslaan = [] } = {}) {
  const rijen = akkerRijen({ x: 0, y: 0 }, 0.3);
  const ev = [];
  rijen.forEach((r, i) => {
    if (rijenOverslaan.includes(i)) return;
    for (let along = -3; along <= r.len + 3; along += speed * dt) {
      const x = r.ax + r.ux * along - r.uy * across, y = r.ay + r.uy * along + r.ux * across;
      ev.push(...W.werkStap(w, rij(rijen, x, y), speed, werkt, dt));
    }
  });
  return ev;
}

t('veldwerk: netjes rijden maakt het werk af; te hard geeft de helft; te langzaam, naast de rij of met het werktuig omhoog niets', () => {
  for (const taak of ['ploegen', 'cultiveren', 'zaaien', 'bemesten', 'spuiten', 'oogsten']) {
    const w = W.nieuwWerk(taak);
    const ev = rijdAlles(w, { speed: (W.BANDEN[taak].vMin + W.BANDEN[taak].vMax) / 2 });
    assert.ok(w.klaar && ev.some((e) => e.type === 'klaar'), taak);
    assert.ok(W.fractieWerk(w) > 0.95, `${taak} ${W.fractieWerk(w)}`);
    const hard = W.nieuwWerk(taak); const eh = rijdAlles(hard, { speed: W.BANDEN[taak].vMax + 1.5 });
    assert.ok(hard.klaar && eh.some((e) => e.type === 'tehard') && W.fractieWerk(hard) > 0.45 && W.fractieWerk(hard) < 0.55, `${taak} te hard ${W.fractieWerk(hard)}`);
    const traag = W.nieuwWerk(taak); rijdAlles(traag, { speed: W.BANDEN[taak].vMin - 0.5 }); assert.equal(W.fractieWerk(traag), 0); assert.equal(traag.klaar, false);
    const naast = W.nieuwWerk(taak); rijdAlles(naast, { speed: 4, across: 40 }); assert.equal(naast.gedaan, 0);
    const omhoog = W.nieuwWerk(taak); rijdAlles(omhoog, { speed: 4, werkt: false }); assert.equal(omhoog.gedaan, 0);
  }
});

t('veldwerk: in elke volgorde en half af telt half; een eigen machine geeft een ruimere rij; klaar kan maar een keer', () => {
  const w = W.nieuwWerk('ploegen');
  rijdAlles(w, { speed: 4, rijenOverslaan: [1, 3] });
  assert.equal(w.klaar, false); assert.ok(Math.abs(W.aandeelKlaar(w) - 0.5) < 0.03, String(W.aandeelKlaar(w)));
  assert.ok(W.fractieWerk(w) > 0.45 && W.fractieWerk(w) < 0.52);
  const rest = rijdAlles(w, { speed: 4 });
  assert.equal(w.klaar, true); assert.equal(rest.filter((e) => e.type === 'klaar').length, 1);
  assert.deepEqual(W.werkStap(w, [null, null, null, null], 4, true, 0.1), []);
  assert.ok(W.nieuwWerk('ploegen', { eigen: true }).tol > W.nieuwWerk('ploegen', { eigen: false }).tol);
  // een rij die je tussendoor verlaat geeft een waarschuwing, niet meteen
  const s = W.nieuwWerk('zaaien');
  const rijen = akkerRijen({ x: 0, y: 0 }, 0);
  let scheef = 0;
  for (let i = 0; i < 40; i++) { const r = rijen[0]; scheef += W.werkStap(s, rij(rijen, r.ax + i * 0.5, r.ay), 4, true, 0.1).filter((e) => e.type === 'scheef').length; }
  for (let i = 0; i < 40; i++) scheef += W.werkStap(s, rij(rijen, rijen[0].ax + 20, rijen[0].ay + 50), 4, true, 0.1).filter((e) => e.type === 'scheef').length;
  assert.ok(scheef >= 1 && scheef <= 3, String(scheef));
});

t('de aanhanger: laden uit de schuur (hooguit zijn capaciteit), hard remmen en te hard rijden morsen, ontkoppelen kan niet met lading', () => {
  const { id } = park();
  const tr = id('trekker-klein'), kar = id('aanhanger');
  const rig = W.nieuweRig(tr.uid);
  assert.ok(W.koppel(rig, tr, kar).ok);
  const schuur = { gewas: 'bieten', kg: 20000, kwaliteit: 1, veld: 'wierdeakker' };
  assert.equal(W.laad(rig, { gewas: null, kg: 0 }).ok, false);
  const l = W.laad(rig, schuur);
  assert.ok(l.ok && l.kg === W.AANHANGER_KG && schuur.kg === 20000 - W.AANHANGER_KG && rig.lading.veld === 'wierdeakker');
  assert.equal(W.laad(rig, schuur).ok, false, 'al geladen');
  assert.equal(W.ontkoppel(rig).ok, false);
  assert.equal(W.rijdMetLading(rig, { decel: 0, lat: 0, speed: 4 }, 0.1), false); assert.equal(rig.lading.kwaliteit, 1);
  assert.equal(W.rijdMetLading(rig, { decel: 6, lat: 0, speed: 4 }, 0.5), true); assert.ok(rig.lading.kwaliteit < 1);
  const q = rig.lading.kwaliteit; W.rijdMetLading(rig, { decel: 0, lat: 0, speed: 11 }, 1); assert.ok(rig.lading.kwaliteit < q);
  for (let i = 0; i < 400; i++) W.rijdMetLading(rig, { decel: 9, lat: 9, speed: 11 }, 0.1);
  assert.equal(rig.lading.kwaliteit, 0, 'nooit negatief');
  rig.lading.kwaliteit = 1;
  const b = B.nieuweBoerderij();
  const v = B.leverVracht(b, rig.lading, 1);
  assert.equal(v.bedrag, Math.round(8000 * B.GEWASSEN.bieten.prijsKg)); assert.equal(b.boek.velden.wierdeakker.omzet, v.bedrag);
  const vorige = W.ledig(rig); assert.equal(rig.lading, null); assert.equal(vorige.kg, 8000);
  assert.ok(W.ontkoppel(rig).ok);
  const rest = { ...schuur };
  assert.ok(W.laad(W.nieuweRig('x'), rest).ok); assert.equal(rest.kg, 20000 - 2 * W.AANHANGER_KG);
  const klein = { gewas: 'bieten', kg: 100, kwaliteit: 1, veld: null };
  W.laad(W.nieuweRig('y'), klein); assert.equal(klein.kg, 0); assert.equal(klein.gewas, null);
});

console.log(`werktuigen_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
