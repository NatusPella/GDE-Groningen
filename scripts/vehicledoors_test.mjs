// Voertuigdeuren (#225): definities, standen, timing, schade (game/js/vehicledoors.js).
//   node scripts/vehicledoors_test.mjs
import * as D from '../game/js/vehicledoors.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const deuren = (v) => D.doorsFor(v).filter((d) => d.side !== 0);
const car = (name, o = {}) => ({ model: { name, len: 4.3, wid: 1.8 }, dentLog: [], speed: 0, ...o });

// definities
check('sedan heeft vier deuren', deuren(car('sedan')).length === 4);
check('hatch heeft twee deuren', deuren(car('hatch')).length === 2);
check('taxi via vlag krijgt vier deuren', deuren(car('hatch', { isTaxi: true })).length === 4);
check('politie vier deuren', deuren(car('police', { isPolice: true })).length === 4);
check('bus dubbele deuren rechts', D.doorsFor(car('bus', { isBus: true })).filter((d) => d.side === 1).length >= 4);
check('bestelbus heeft een schuifdeur', D.doorsFor(car('van')).some((d) => d.soort === 'schuif'));
check('tractor cabine twee deuren', D.doorsFor(car('tractor')).length === 2);
for (const k of [{ isBike: true }, { isScooter: true }, { isBoat: true }, { isHeli: true }, { _mount: 'horse' }]) {
  check('geen deur: ' + Object.keys(k)[0], D.doorsFor(car('sedan', k)).length === 0);
}
check('onbekend model en null', D.doorsFor(car('raar')).length === 0 && D.doorsFor(null).length === 0);
for (const [n, defs] of Object.entries(D.DEUR_DEFS)) {
  const ids = new Set(defs.map((d) => d.id));
  check('unieke ids ' + n, ids.size === defs.length);
  check('maten ' + n, defs.every((d) => d.w > 0 && d.h > 0 && Math.abs(d.x) < 0.5 && [-1, 0, 1].includes(d.side)));
}

// rollen
const sed = D.doorsFor(car('sedan'));
check('bestuurder links', D.deurVoorRol(sed, 'bestuurder').id === 'vl');
check('bijrijder rechts', D.deurVoorRol(sed, 'bijrijder').id === 'vr');
check('achter kiest kant', D.deurVoorRol(sed, 'achter', null, 1).id === 'ar');
const st = D.makeDoorState(); st.loose.vl = true;
check('losse deur: opening blijft de weg', D.deurVoorRol(sed, 'bestuurder', st).id === 'vl');
check('geen deuren geeft null', D.deurVoorRol([], 'bestuurder') === null);
const bus = D.doorsFor(car('bus', { isBus: true }));
check('buspassagier krijgt busdeur', D.deurVoorRol(bus, 'bijrijder').soort === 'schuif');

// standen en timing
const s = D.makeDoorState();
D.wantDoor(s, 'vl', true);
let n = 0; while (D.stepDoors(s, 1 / 60) && n++ < 100);
check('deur gaat helemaal open', s.open.vl === 1 && n < 20, n);
check('openen duurt ~0,22 s', n >= 12 && n <= 15, n);
D.wantDoor(s, 'vl', false); n = 0; while (D.stepDoors(s, 1 / 60) && n++ < 100);
check('en weer dicht, opgeruimd', !('vl' in s.open) && !('vl' in s.want));
D.wantDoor(s, 'vr', true); D.stepDoors(s, 1); D.stepDoors(s, 0.1, { speed: 12 });
check('rijdend voertuig slaat deur dicht', (s.open.vr || 0) < 1);
const s2 = D.makeDoorState(); D.wantDoor(s2, 'vl', true, 0.3);
for (let i = 0; i < 60; i++) D.stepDoors(s2, 1 / 60);
check('houdtijd sluit vanzelf', !s2.open.vl);
check('dt 0 doet niets', D.stepDoors(D.makeDoorState(), 0) === false);
check('hoeken binnen grenzen', Math.abs(D.deurStand(sed[0], 1) - 1.05) < 1e-9 && D.deurStand(sed[0], -3) === 0 && D.deurStand(sed[0], 7) <= 1.25);
check('scheve deur sluit niet helemaal', D.deurStand(sed[0], 0, 'scheef') > 0);
check('schuifdeur in meters', D.deurStand(bus[0], 1) > 0.4 && D.deurStand(bus[0], 1) < bus[0].w);

// animatie
const A = (kind, t, o = {}) => ({ kind, t, walkT: 0.3, sitT: 0.42, ...o });
check('enter: dicht tijdens loopstart', D.deurDoelVoorAnim(A('enter', 0)) === 0);
check('enter: open vlak voor de deur', D.deurDoelVoorAnim(A('enter', 0.25)) === 1);
check('enter: dicht als hij zit', D.deurDoelVoorAnim(A('enter', 0.3 + 0.42)) === 0);
check('exit: meteen open, later dicht', D.deurDoelVoorAnim(A('exit', 0.01)) === 1 && D.deurDoelVoorAnim(A('exit', 0.9)) === 0);
check('carjack: deur open tijdens het trekken', D.deurDoelVoorAnim(A('enter', 0.4, { jack: true })) === 1);
check('geen anim is dicht', D.deurDoelVoorAnim(null) === 0);
for (const o of [{}, { afstand: 3 }, { afstand: 50 }, { soort: 'boot' }, { soort: 'fiets', afstand: 1 }]) {
  const t = D.stapDuur(o);
  check('duur binnen 0,4-0,7 ' + JSON.stringify(o), t >= D.STAP_MIN && t <= D.STAP_MAX, t);
}
check('haast is kort', D.stapDuur({ haast: true }) < D.STAP_MIN);
check('carjack iets langer, begrensd', D.stapDuur({ jack: true }) <= D.STAP_MAX + 0.25);

// onderbrekingen en glitches
const e = A('enter', 0.1);
check('wrak breekt af', D.stapOnderbreking(e, { wrecked: true }) === 'wrak');
check('klap breekt af', D.stapOnderbreking(e, { schade: true }) === 'schade');
check('wanted breekt af', D.stapOnderbreking(e, { wanted: true }) === 'wanted');
check('rijdend voertuig bij instappen', D.stapOnderbreking(e, { speed: 2 }) === 'rijdt');
check('vastzitten na 0,35 s', D.stapOnderbreking(A('enter', 0.5), { geblokkeerd: true }) === 'vast' && D.stapOnderbreking(e, { geblokkeerd: true }) === null);
check('uitstappen mag bij rijden', D.stapOnderbreking(A('exit', 0.1), { speed: 5 }) === null);
check('niets te onderbreken', D.stapOnderbreking(null, { wrecked: true }) === null && D.stapOnderbreking(e) === null);

// schade
const L = 4.3, W = 1.8;
const klap = (lx, lz, sterkte) => [lx, lz, sterkte];
let sch = D.deurSchade(sed, [klap(0.6, 0.9, 0.5)], L, W);
check('klap op rechter voordeur: scheef', sch.vr === 'scheef' && !sch.vl, JSON.stringify(sch));
sch = D.deurSchade(sed, [klap(0.6, 0.9, 0.8), klap(0.7, 0.9, 0.8)], L, W);
check('zware klap: los', sch.vr === 'los', JSON.stringify(sch));
check('neus raakt geen deur', Object.keys(D.deurSchade(sed, [klap(2.1, 0, 2)], L, W)).filter((k) => k !== 'kap').length === 0);
check('rommel in logboek', Object.keys(D.deurSchade(sed, [null, [NaN, 1, 1], 'x', [1, 'a', 1]], L, W)).length === 0 && Object.keys(D.deurSchade(sed, null, L, W)).length === 0);

const v = car('sedan', { dentLog: [klap(0.6, 0.9, 0.8), klap(0.7, 0.9, 0.8)] });
const wereld = { n: 0 };
const los = D.reconcileDoors(v, sed, wereld);
check('deur gaat los, wereldteller', los.join() === 'vr' && wereld.n === 1 && v.doors.loose.vr);
check('niet twee keer los', D.reconcileDoors(v, sed, wereld).length === 0 && wereld.n === 1);
D.wantDoor(v.doors, 'vr', true);
check('losse deur gaat niet open', !v.doors.want.vr);
v.dentLog = [];
D.reconcileDoors(v, sed, wereld);
check('reparatie zet de deur terug', !v.doors.loose.vr && wereld.n === 0);
const vol = { n: D.MAX_LOSSE_DEUREN };
const w2 = car('sedan', { dentLog: [klap(0.6, 0.9, 2)] });
check('maximum losse deuren: scheef i.p.v. los', D.reconcileDoors(w2, sed, vol).length === 0 && w2.doors.dmg.vr === 'scheef' && vol.n === D.MAX_LOSSE_DEUREN);
check('geen deuren, geen werk', D.reconcileDoors(car('bike'), [], wereld).length === 0);

// motorkap, kofferbak, laadklep
check('sedan heeft kap en kofferbak', sed.some((d) => d.id === 'kap') && sed.some((d) => d.id === 'klep'));
check('wagon en bestelbus: achterklep als deur', ['wagon', 'van', 'ambulance'].every((n) => D.doorsFor(car(n, n === 'ambulance' ? { isAmbulance: true } : {})).some((d) => d.id === 'klep' && d.soort !== 'klep' || d.id === 'klep')));
check('bus heeft geen kap', !bus.some((d) => d.id === 'kap'));
check('kap: lichte klap niets', !D.deurSchade(sed, [klap(2, 0, 0.5)], L, W).kap);
check('kap: opwippen vanaf 0,7', D.deurSchade(sed, [klap(2, 0, 0.8)], L, W).kap === 'scheef');
check('kap: los vanaf 1,8', D.deurSchade(sed, [klap(2, 0, 1), klap(2, 0.2, 0.9)], L, W).kap === 'los');
check('klep: achterklap, kap blijft', (() => { const r = D.deurSchade(sed, [klap(-2, 0, 1.7)], L, W); return r.klep === 'los' && !r.kap; })());
check('kap staat op een kier bij scheef', D.deurStand(sed.find((d) => d.id === 'kap'), 0, 'scheef') > 0.1 && D.deurStand(sed.find((d) => d.id === 'kap'), 1) === 1);
const vk = car('sedan', { dentLog: [klap(2, 0, 1), klap(2, 0.2, 0.9), klap(0.6, 0.9, 0.8), klap(0.7, 0.9, 0.8)] });
const wk = { n: 0 };
check('kap en deur tegelijk los', D.reconcileDoors(vk, sed, wk).sort().join() === 'kap,vr' && wk.n === 2);
check('garageprijs per los deel', D.deelPrijs(vk) === D.DEEL_PRIJS.kap + D.DEEL_PRIJS.deur && D.deelPrijs({}) === 0);
vk.dentLog = []; D.reconcileDoors(vk, sed, wk);
check('reparatie: alles terug, prijs 0', D.deelPrijs(vk) === 0 && wk.n === 0);
const wv = { n: D.MAX_LOSSE_DEUREN - 1 };
const vm = car('sedan', { dentLog: [klap(2, 0, 3), klap(-2, 0, 3)] });
check('limiet geldt ook voor kap en klep', D.reconcileDoors(vm, sed, wv).length === 1 && wv.n === D.MAX_LOSSE_DEUREN && Object.keys(vm.doors.dmg).length === 1);

check('bus staat stil: deuren open', D.stilstandDeurOpen(car('bus', { isBus: true })) && !D.stilstandDeurOpen(car('bus', { isBus: true, speed: 5 })) && !D.stilstandDeurOpen(car('sedan')));

// de bestuurdersdeur bij uitstappen of uit de auto trekken (#49)
{
  const s = car('sedan');
  check('de bestuurdersdeur gaat open', D.openDriverDoor(s) === 'vl' && s.doors.want.vl === 1 && s.doors.hold.vl > 0);
  const dt = 1 / 60;
  for (let i = 0; i < 30; i++) D.stepDoors(s.doors, dt, { speed: 0 });
  check('en staat open', s.doors.open.vl === 1);
  for (let i = 0; i < 200; i++) D.stepDoors(s.doors, dt, { speed: 0 });
  check('en valt na een tijdje weer dicht', !(s.doors.open.vl > 0));
  const w = car('hatch'); w.doors = D.makeDoorState(); w.doors.loose.vl = true;
  check('een losse deur: geen fout, de opening blijft de weg', ['vl', 'vr'].includes(D.openDriverDoor(w)) && !(w.doors.open.vl > 0));
  check('een fiets heeft geen deur', D.openDriverDoor(car('bike')) === null);
  const m = car('sedan', { speed: 8 });
  D.openDriverDoor(m); D.stepDoors(m.doors, dt * 30, { speed: 8 });
  check('een rijdende auto slaat de deur dicht', !(m.doors.open.vl > 0.5));
}
// busdeuren sluiten aan op de opening in het busmodel (hoogte 3,0 m, opening 0,42..2,6 m, 1,25 m breed)
for (const [naam, len, aantal] of [['bus', 11.2, 4], ['midibus', 8.4, 2]]) {
  const b = D.doorsFor({ model: { name: naam, len, wid: 2.5 }, isBus: true });
  check(naam + ': deurdelen rechts', b.length === aantal && b.every((d) => d.side === 1));
  check(naam + ': deur hoog genoeg voor een instapper', b.every((d) => d.h >= 2.0 && d.y0 + d.h <= 2.65 && d.y0 >= 0.3), JSON.stringify(b[0]));
  const dubbelBreed = b[0].w + b[1].w;
  check(naam + ': dubbele deur dekt de opening', dubbelBreed >= 1.1 && dubbelBreed <= 1.3, String(dubbelBreed));
  check(naam + ': deuren binnen de romp', b.every((d) => Math.abs(d.x * len) + d.w / 2 < len / 2));
}
if (bad) { console.log(bad + ' mislukt'); process.exit(1); }
console.log('vehicledoors_test: ok');
