// Verfijnronde OV en reizen (22-11, docs/VERFIJNING-22-11-OV-REIZEN.md): regressietests en fuzz voor wat in deze ronde is
// aangescherpt: duurtekst met uren, kapotte invoer (NaN) die nergens "NaN" of een eindeloze scène geeft, de reden bij een
// geblokkeerde taxi, de aanbeveling (geen dure taxi als een goedkopere rit bijna even snel is), unieke bordrijen,
// de hint na een teruggezette klok en het laadscherm dat bij een kapotte teller toch afrondt.  node scripts/verfijn_ov_reizen_test.mjs
import * as Z from '../game/js/reistijd.js';
import * as O from '../game/js/ovopties.js';
import * as K from '../game/js/ovkaart.js';
import * as V from '../game/js/reisview.js';
import * as R from '../game/js/reiskeuze.js';
import * as M from '../game/js/meerijden.js';
import * as KA from '../game/js/kaartactie.js';
import * as T from '../game/js/departuretimeline.js';
import * as TS from '../game/js/trainsource.js';
import * as H from '../game/js/ovhint.js';
import * as L from '../game/js/loadlogic.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const VUIL = [NaN, undefined, null, -1, Infinity, 'x', 0, 1e12];

// 1. duurtekst: minuten, uren, nooit NaN
ok(Z.duurTekst(30) === '1 min' && Z.duurTekst(600) === '10 min', 'minuten');
ok(Z.duurTekst(3540) === '59 min' && Z.duurTekst(3600) === '1 u' && Z.duurTekst(4680) === '1 u 18 min', 'uren', Z.duurTekst(4680));
ok(VUIL.every((v) => /^\d+ (min|u)/.test(Z.duurTekst(v))), 'duurTekst: vuile invoer geeft nooit NaN');
ok(O.etaText(4000) === '± 1 u 7 min' && O.etaText(NaN) === '± 1 min', 'etaText NaN-vast');

// 2. het keuzepaneel en de briefing spreken in uren bij een lange rit
const lang = { to: 'Winschoten', length: 80000, ride: 'trein', selfMode: 'auto', from: 'Delfzijl' };
ok(R.travelOptions(lang).options.find((o) => o.id === 'meerijden').eta === '± 1 u 18 min', 'Snel reizen 80 km in uren');
ok(/1 u 18 min met de trein/.test(V.briefingLine(lang)), "briefing: uren", V.briefingLine(lang));
ok(V.hudLine(80000, 'trein').includes('1 u'), 'hudregel: uren');
const trekker = V.briefingLine({ ...lang, selfMode: 'trekker', ride: 'lift' });
ok(trekker.includes('met de trekker') && !trekker.includes('met de auto'), 'briefing: trekker', trekker);
ok(VUIL.every((v) => !/NaN/.test(V.briefingLine({ to: 'X', length: v }) + V.hudLine(v) + JSON.stringify(R.travelOptions({ to: 'X', length: v })))), 'fuzz: geen NaN in reistekst');
ok(R.selfReward(NaN) === 0 && R.selfReward(-5) === 0 && R.selfReward(1e9) === R.SELF_REWARD.max, 'selfReward: rand en vuil');

// 3. de kaart: een geblokkeerde taxi noemt zijn eigen reden, de rest blijft "Te weinig geld"
const dichtbij = O.reisOpties({ taxi: { length: 200, etaS: 200 } }, { directM: 200, hemelsM: 160, money: 500 });
ok(K.kaartRijen(dichtbij, O.optieRegel).find((r) => r.id === 'taxi').disabled === 'Te dichtbij: loop of rij zelf', 'kaartRijen: taxi te dichtbij');
const arm = O.reisOpties({ trein: { length: 18000, etaS: 1500, pts: [[0, 0], [1, 1]] } }, { directM: 18000, money: 1 });
ok(K.kaartRijen(arm, O.optieRegel).find((r) => r.id === 'trein').disabled === 'Te weinig geld', 'kaartRijen: trein te duur');

// 4. aanbeveling: een dure taxi alleen als hij echt veel sneller is
const bus = { length: 12000, etaS: 1000, changes: [], pts: [[0, 0], [1, 1]], lines: [{ name: 'Lijn 1', color: '#fff', kind: 'bus' }] };
const taxiNaast = O.reisOpties({ bus, taxi: { length: 12000, etaS: 900 } }, { directM: 12000, hemelsM: 9600, money: 200 });
ok(taxiNaast.find((o) => o.id === 'bus').aanbevolen && !taxiNaast.find((o) => o.id === 'taxi').aanbevolen, 'bijna even snel: de goedkope bus', JSON.stringify(taxiNaast.map((o) => [o.id, o.aanbevolen])));
const taxiSnel = O.reisOpties({ bus: { ...bus, etaS: 3000 }, taxi: { length: 12000, etaS: 900 } }, { directM: 12000, hemelsM: 9600, money: 200 });
ok(taxiSnel.find((o) => o.id === 'taxi').aanbevolen && taxiSnel.filter((o) => o.aanbevolen).length === 1, 'veel sneller: de taxi blijft aanbevolen');
let fuzzOk = true;
for (let i = 0; i < 300; i++) {
  const eta = (x) => 60 + rnd() * x;
  const routes = { trein: rnd() < 0.6 ? { length: 5000 + rnd() * 80000, etaS: eta(5000), pts: [[0, 0], [1, 1]] } : null, bus: rnd() < 0.6 ? { ...bus, etaS: eta(6000) } : null, taxi: { length: 1000 + rnd() * 40000, etaS: eta(2500) }, boot: rnd() < 0.3 ? { length: 9000, etaS: eta(3000), pts: [[0, 0], [1, 1]] } : null };
  const os = O.reisOpties(routes, { directM: 12000, hemelsM: 9000, money: rnd() * 80, wanted: rnd() < 0.2 ? 2 : 0 });
  const rec = os.filter((o) => o.aanbevolen);
  if (rec.length > 1 || rec.some((o) => !o.afford) || os.some((o) => /NaN/.test(O.optieRegel(o)))) fuzzOk = false;
}
ok(fuzzOk, 'fuzz: hooguit één aanbevolen, betaalbaar, regels zonder NaN');

// 5. kapotte opties tekenen de kaart niet kapot
ok((() => { try { K.lijnLagen([{ id: 'bus', ride: true, afford: true }], 'bus'); K.kaartRijen([{ id: 'bus', ride: true, lines: undefined }], O.optieRegel); return O.optieRegel({ label: 'x', eta: '± 1 min' }) === 'x · ± 1 min'; } catch (e) { return false; } })(), 'ovkaart/optieRegel: opties zonder lijnen of haltes gooien niet');
ok(O.busTrip(null, [0, 0], [3000, 0]) === null && O.busTrip([], [0, 0], [3000, 0]) === null, 'busTrip zonder lijnen: null');

// 6. de ritscène hangt nooit: kapotte duur of prijs geeft de ondergrens
for (const etaS of [NaN, undefined, -50, 'x']) {
  const p = M.ritPlan({ id: 'trein', etaS, price: NaN, lines: [] });
  ok(p.playS === 6 && p.clockS === 0 && p.price === 0 && p.shots.every((s) => Number.isFinite(s.duur)), `ritPlan(${etaS}): eindige scène`, p.playS);
  const r = M.startRit(p);
  let t = 0;
  while (!r.done && t++ < 1000) M.stepRit(r, 0.1);
  ok(r.done && t < 100, `ritPlan(${etaS}): de scène loopt af`, t);
}
const lange = M.ritPlan({ id: 'trein', etaS: 4680, price: 8, lines: [] });
ok(M.aankomst(M.startRit(lange), { x: 1, y: 1, name: 'Winschoten' }, 50).bericht.includes('Reistijd 1 u 18 min'), 'aankomstbericht in uren');

// 7. kaartactie: info in uren
const info = KA.infoRegels({ spot: { name: 'Plek' }, afstand: 40000 })[1];
ok(info.includes('lopen ± 7 u 24 min'), 'info: lopen in uren', info);

// 8. het vertrekbord: twee gelijke rijen krijgen elk een eigen sleutel
const rij = { richting: 'Groningen', lijn: 'IC', spoor: '4', tijd: 36000, plan: 36000, vertraging: 0, vervallen: false, live: false, k: 7 };
const tl = T.buildTimeline({ name: 'Zuidbroek', nu: 35000, bord: [rij, { ...rij }] });
ok(tl.items.length === 2 && new Set(tl.items.map((x) => x.id)).size === 2, 'bord: dubbele rij houdt twee sleutels', tl.items.map((x) => x.id).join('|'));
ok(T.buildTimeline({ nu: NaN, bord: [rij] }).empty && T.buildTimeline(null).empty, 'bord: geen klok is een lege staat');
let bordOk = true;
for (let i = 0; i < 200; i++) {
  const bord = Array.from({ length: Math.floor(rnd() * 9) }, () => ({ richting: rnd() < 0.2 ? '' : 'Plaats', lijn: 'S', spoor: rnd() < 0.3 ? '' : String(1 + Math.floor(rnd() * 6)), tijd: rnd() < 0.15 ? VUIL[Math.floor(rnd() * VUIL.length)] : 30000 + rnd() * 5000, plan: rnd() < 0.2 ? NaN : 30000 + rnd() * 5000, vertraging: rnd() < 0.3 ? rnd() * 1500 : 0, vervallen: rnd() < 0.1, live: rnd() < 0.5, k: Math.floor(rnd() * 3) }));
  try { const m = T.buildTimeline({ name: 'X', nu: 31000, bord }); if (/NaN|undefined/.test(m.aria) || new Set(m.items.map((x) => x.id)).size !== m.items.length) bordOk = false; } catch (e) { bordOk = false; }
}
ok(bordOk, 'fuzz: vertrekbord zonder gooi, NaN of dubbele sleutel');
ok(TS.departureLine({ tijd: NaN }, 0) === '' && TS.departureLine({ tijd: 5000, vertraging: 4000 }, 0).includes('1 u 7 min vertraagd') && TS.ageText(NaN) === 'zojuist', 'bronregel: geen NaN, uren bij een lange wacht', TS.departureLine({ tijd: 5000, vertraging: 4000 }, 0));

// 9. de hint: een teruggezette klok of een oudere save dempt hem niet blijvend
const basis = { goal: { x: 9000, y: 0 }, speler: { x: 0, y: 0 }, nu: 5000, nuMs: 1e12, aan: true, rol: 'host', vervoer: 'voet', halteNabij: false, geld: 100, bezet: {} };
ok(H.beslis(basis, { ...H.freshState(), gebruikt: 1, gebruiktOp: 1e12 + 5 * 60000 }, H.verseSessie()) !== null, 'hint: een gebruikstijd in de toekomst telt als verlopen');
ok(H.beslis(basis, { ...H.freshState(), gebruikt: 1, gebruiktOp: 1e12 - 60000 }, H.verseSessie()) === null, 'hint: net na een taxirit blijft hij stil');
ok(H.beslis({ ...basis, nu: 2000 }, H.freshState(), { laatsteAt: 90000, doelen: new Set() }) !== null, 'hint: na het laden van een oudere save begint de wachttijd opnieuw');

// 10. het laadscherm rondt altijd af
ok(L.stepProgress(L.startProgress(), 5, NaN, 'travel').done, 'laden: een kapotte tijd rondt af');
let st = L.startProgress(), klaar = false;
for (let i = 0; i < 400 && !klaar; i++) { st = L.stepProgress(st, i < 5 ? NaN : 0, i * 0.05, 'travel'); klaar = st.done; }
ok(klaar && Number.isFinite(st.bar), 'laden: een kapotte teller blokkeert niet', JSON.stringify(st));

console.log(`${n - fails}/${n} verfijn_ov_reizen`);
process.exit(fails ? 1 : 0);
