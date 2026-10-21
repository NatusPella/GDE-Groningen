// Visuele weer- en nachtlogica (zuiver, synthetisch).   node scripts/weerlook_test.mjs
import * as L from '../game/js/weerlook.js';
let bad = 0;
const check = (n, ok, i = '') => { if (!ok) { bad++; console.log('FAIL', n, i); } };

const [laag, mid, hoog] = ['laag', 'middel', 'hoog'].map(L.lookProfiel);
check('regen oplopend', laag.regenDruppels < mid.regenDruppels && mid.regenDruppels < hoog.regenDruppels);
check('plassen pas vanaf middel', !laag.plassen && mid.plassen && hoog.plassen);
check('onbekend profiel = hoog', L.lookProfiel('x') === hoog);
check('regendruppels schaalt', L.regenDruppels(0, 'hoog') === 0 && L.regenDruppels(1, 'laag') === 900 && L.regenDruppels(2, 'laag') === 900);

check('oost eerder', L.streekUur(30000, 6) > 6 && L.streekUur(-30000, 6) < 6);
check('uur blijft 0..24', L.streekUur(0, 23.99) < 24 && L.streekUur(-65000, 0) >= 0 && L.streekUur(65000, 0) < 24);
check('offset ~4 min per 65 km', Math.abs(L.zonUurOffset(65000) - 4 / 60) < 1e-9);
check('gloed laag zon', L.horizonGloed('stad', 1) > 0.8 && L.horizonGloed('stad', 40) === 0 && L.horizonGloed('stad', -30) === 0);
check('gloed kust sterker', L.horizonGloed('noord', 4) >= L.horizonGloed('oost', 4));
check('gloed gedempt door regen', L.horizonGloed('stad', 1, 0.9, 0.6, 0) < L.horizonGloed('stad', 1));

let nat = 0;
for (let i = 0; i < 60; i++) nat = L.natheidStap(nat, 0.6, 0.1);
check('nat na 6 s regen', nat > 0.9, nat);
let t = 0; let droog = nat;
while (droog > 0.02 && t < 200) { droog = L.natheidStap(droog, 0, 0.5, 1); t += 0.5; }
check('droogt trager dan nat wordt', t > 20 && t < 60, t);
check('zon droogt sneller', (() => { let a = 1, b = 1; for (let i = 0; i < 20; i++) { a = L.natheidStap(a, 0, 1, 1); b = L.natheidStap(b, 0, 1, 0); } return a < b; })());
check('geen plassen op laag', L.wegLook(1, 'laag').plas === 0 && L.wegLook(1, 'hoog').plas > 0.9);
check('droog wegdek', L.wegLook(0, 'hoog').glans === 0);

check('zicht', L.zichtFactor(0, 0) === 1 && L.zichtFactor(1, 1) === 0.2 && L.zichtFactor(0.6, 0) < 1);
check('bliksem alleen bij onweer', L.bliksemKans('regenbui', 0.6, 'hoog') === 0 && L.bliksemKans('onweer', 0.85, 'hoog') > 0);
check('donder', Math.abs(L.donderVertraging(1020) - 3) < 1e-9 && L.donderVertraging(-5) === 0);

check('lantaarns', L.lantaarnAan(0) === 0 && L.lantaarnAan(1) === 1 && L.lantaarnAan(0.4) > 0);
check('lantaarns eerder bij donkere lucht', L.lantaarnAan(0.3, 1, 1) > L.lantaarnAan(0.3));
check('ramen: avond > diepe nacht > middag', L.ramenBrandFractie(21, 1, 'hoog') > L.ramenBrandFractie(3, 1, 'hoog') && L.ramenBrandFractie(3, 1, 'hoog') > L.ramenBrandFractie(13, 0, 'hoog'));
check('ramen: overdag niets', L.ramenBrandFractie(13, 0, 'hoog') === 0);
check('ramen: laag minder dan hoog', L.ramenBrandFractie(21, 1, 'laag') < L.ramenBrandFractie(21, 1, 'hoog'));
check('ramen: ochtendschemer', L.ramenBrandFractie(6, 0.8, 'hoog') > 0);
check('raamBrandt', L.raamBrandt(0.1, 0.5) && !L.raamBrandt(0.9, 0.5));
check('koplampen', L.koplampenAan(0.9, 0, 0) && L.koplampenAan(0, 0.6, 0) && L.koplampenAan(0, 0, 0.7) && !L.koplampenAan(0, 0.1, 0.1));
check('sterren', L.sterrenZicht(1, 0, 0) === 1 && L.sterrenZicht(1, 1, 0) === 0 && L.sterrenZicht(0.2, 0, 0) === 0);
check('maan fase 0..1', [-3, 0, 7, 14.7, 100].every((d) => { const f = L.maanFase(d); return f >= 0 && f < 1; }));
check('volle maan licht', L.maanLicht(14.77) > 0.99 && L.maanLicht(0) < 0.01 && L.maanLicht(14.77, 1) < 0.3);
{
  const n = L.nachtLook({ uur: 23, nacht: 1, dag: 14.77, profiel: 'laag' });
  check('nachtLook velden', n.lantaarns === 1 && n.koplampen && n.sterren === 1 && n.maan > 0.9 && n.ramen > 0 && n.ramen <= 0.35, JSON.stringify(n));
  const d = L.nachtLook({ uur: 13, nacht: 0 });
  check('dag: alles uit', d.lantaarns === 0 && d.ramen === 0 && !d.koplampen && d.sterren === 0);
}
check('determinisch', JSON.stringify(L.nachtLook({ uur: 22, nacht: 0.8, dag: 3 })) === JSON.stringify(L.nachtLook({ uur: 22, nacht: 0.8, dag: 3 })));
check('koplampen: dag droog uit', L.koplampenFactor(0, 0, 0) === 0);
check('koplampen: nacht aan', L.koplampenFactor(1, 0, 0) === 1);
check('koplampen: regen overdag aan', L.koplampenFactor(0, 0.8, 0) > 0.5 && L.koplampenFactor(0, 0.1, 0) === 0);
check('koplampen: dichte mist overdag aan', L.koplampenFactor(0, 0, 0.9) > 0.5);
check('koplampen: stijgt met regen', L.koplampenFactor(0, 0.3, 0) < L.koplampenFactor(0, 0.5, 0));
console.log(bad ? `weerlook_test: ${bad} fout(en)` : 'weerlook_test: alles goed');
process.exit(bad ? 1 : 0);
