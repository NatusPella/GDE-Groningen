// De treinen van de wereld volgen het rooster van het bord (#1085): één bron voor bord en spoor. Pure delen (trainservice.js) en de wereld
// (railway.js met een eigen spoor, zoals gasttrein_test). Nodig: een gevendorde three (cd desktop && npm run stage), net als gasttrein_test.
//   node scripts/trainservice_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const { bouwDienst, actieveLegs, legTimes, legState, createServiceSource, dienstVanLeg, DIENST } = await import('../game/js/trainservice.js');
const { rijenUitRooster, pasVertragingToe, validSchedule } = await import('../game/js/trainschedule.js');
const { meldSleutel } = await import('../game/js/livetrains.js');
const { stationView } = await import('../game/js/stationlife.js');

let fails = 0, n = 0;
const ok = (c, m, i = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${i !== '' ? ' (' + i + ')' : ''}`); } };

const rooster = JSON.parse(fs.readFileSync(new URL('../game/trainschedule.json', import.meta.url), 'utf8'));
ok(validSchedule(rooster), 'het rooster is geldig');

// de spoorlijnen van het spel (zoals scripts/world/stad_spoor.mjs en cityroutes_src.json ze kennen; de afstanden zijn een proef)
const H = 'Groningen Hoofdstation';
const LIJNEN = [
  ['Stoptrein Roodeschool', 'gtw', 41000, [[H, 400], ['Groningen Noord', 2500], ['Sauwerd', 9000], ['Winsum', 18000], ['Uithuizen', 33000], ['Roodeschool', 40000, 1]]],
  ['Stoptrein Delfzijl', 'gtw', 33000, [[H, 400], ['Bedum', 9000], ['Stedum', 13000], ['Loppersum', 20000], ['Appingedam', 26000], ['Delfzijl', 32000, 1]]],
  ['Stoptrein Leeuwarden', 'gtw', 61000, [[H, 400], ['Zuidhorn', 12000], ['Leeuwarden', 60000, 1]]],
  ['Intercity Zwolle', 'virm', 91000, [[H, 400], ['Zwolle', 90000, 1]]],
  ['Stoptrein Assen', 'wink', 26000, [[H, 400], ['Haren', 6000], ['Assen', 25000, 1]]],
  ['Stoptrein Winschoten', 'wink', 37000, [[H, 400], ['Kropswolde', 8000], ['Hoogezand-Sappemeer', 14000], ['Zuidbroek', 22000], ['Scheemda', 28000], ['Winschoten', 36000, 1]]],
  ['Stoptrein Veendam', 'gtw', 27000, [[H, 400], ['Kropswolde', 8000], ['Martenshoek', 11000], ['Veendam', 26000, 1]]],
];
const railRoutes = LIJNEN.map(([name, train, len, stops]) => ({ name, train, pts: [[0, 0], [len, 0]], stops: stops.map(([nm, s, off]) => ({ name: nm, s, ...(off ? { offmap: true } : {}) })) }));
const plain = (rs) => rs.map((r) => ({ name: r.name, len: r.pts[1][0], stops: r.stops }));

// --- 1. de dienst (puur) ------------------------------------------------------------------------------------------------
const routesPlain = plain(railRoutes);
const dienst = bouwDienst(rooster, 'werk', routesPlain);
ok(dienst.legs.length > 300, 'het rooster geeft honderden ritten in de wereld', dienst.legs.length);
ok(new Set(dienst.legs.map((l) => l.id)).size === dienst.legs.length, 'elk rit-id is uniek');
ok(dienst.legs.every((l) => l.halten.length >= 2 && l.halten.every((h, i) => i === 0 || (h.s - l.halten[i - 1].s) * l.dir > 0)), 'elke rit heeft minstens twee haltes in rijrichting');
ok(dienst.legs.every((l) => l.halten.every((h, i) => h.aan <= h.weg && (i === 0 || h.aan >= l.halten[i - 1].weg))), 'de haltetijden lopen door in de tijd');
ok(bouwDienst(rooster, 'werk', routesPlain).legs.map((l) => l.id).join() === dienst.legs.map((l) => l.id).join(), 'deterministisch: zelfde ritten bij een tweede bouw');
ok(bouwDienst(rooster, 'zo', routesPlain).legs.length < dienst.legs.length, 'op zondag rijden er minder ritten dan op een werkdag');
ok(bouwDienst(null, 'werk', routesPlain).legs.length === 0 && bouwDienst(rooster, 'werk', []).legs.length === 0, 'zonder rooster of lijnen: geen ritten (eigen dienst)');

// --- 2. bord en trein zijn dezelfde trein, met dezelfde tijden (ook met vertraging) ------------------------------------
const STATIONS = [[H, 'Groningen Hoofdstation'], ['Bedum'], ['Sauwerd'], ['Winsum'], ['Haren'], ['Zuidhorn'], ['Kropswolde'], ['Veendam'], ['Appingedam']];
function bordRijen(stand, nu, naam, aantal = 12) {
  return pasVertragingToe(rijenUitRooster(rooster, naam, 'werk', nu, { aantal, terug: 30, dienst }), stand);
}
let rijenGetest = 0;
for (const stand of [null, 'vertraagd']) {
  for (const nu of [6.2 * 3600, 8 * 3600 + 17 * 60, 12.5 * 3600, 17.9 * 3600, 22 * 3600]) {
    // een stand met vertraging: elke rij die we vinden krijgt 4 min (en één rit vervalt)
    let live = null;
    if (stand) {
      live = new Map();
      for (const [naam] of STATIONS) for (const r of rijenUitRooster(rooster, naam, 'werk', nu, { aantal: 12, terug: 30, dienst })) live.set(meldSleutel(r.nummer, r.code, r.plan % 86400), { vertraging: 240, vervallen: false });
    }
    for (const [naam] of STATIONS) {
      for (const r of bordRijen(live, nu, naam)) {
        const leg = dienst.leg(r.rit);
        ok(!!leg, `bordrij ${r.nummer} in ${naam} heeft een trein (geen bordregel zonder trein)`);
        if (!leg) continue;
        ok(leg.route === r.lijn && leg.nummer === r.nummer, 'dezelfde trein: rit-id, lijn en treinnummer');
        const tijden = legTimes(leg, live);
        const j = r.halte;
        ok(leg.halten[j].st === naam && Math.abs((((tijden.weg[j] - r.tijd) % 86400) + 86400) % 86400) < 1, `de wereldtrein vertrekt op de tijd van het bord (${naam} ${r.nummer})`, `${tijden.weg[j]} vs ${r.tijd}`);
        // op het bord-moment staat de trein op de halte (de plek van de lijn), op de klok van de dag zelf
        const route = routesPlain[leg.routeIdx];
        const klok = tijden.weg[j] > 86400 ? tijden.weg[j] - 86400 : tijden.weg[j];
        const st = legState(leg, tijden.weg[j], route.len, tijden);
        ok(st && st.staat === 'dwell' && Math.abs(st.s - leg.halten[j].s) < 0.01 && st.v === 0, `op de vertrektijd staat de trein op het perron van ${naam}`, JSON.stringify(st));
        const later = legState(leg, tijden.weg[j] + 60, route.len, tijden);
        ok(!later || later.staat === 'run' || later.s !== leg.halten[j].s, 'een minuut na vertrek is de trein weg van het perron (onderweg, op de volgende halte of weg)', JSON.stringify(later));
        ok(!leg.halten[j].soort || leg.halten[j].soort !== 1, 'een bordrij is nooit een eindstation');
        rijenGetest++;
        void klok;
      }
    }
  }
}
ok(rijenGetest > 150, 'genoeg bordrijen getoetst', rijenGetest);

// en andersom: elke leg heeft op elke halte (behalve het eindpunt) een bordrij
{
  let fout = 0, geteld = 0;
  for (const leg of dienst.legs.filter((_, i) => i % 7 === 0)) {
    leg.halten.forEach((h, j) => {
      if (j === leg.halten.length - 1) return;
      const naam = h.st;
      if (!STATIONS.some(([x]) => x === naam)) {
        const rijen = rijenUitRooster(rooster, naam, 'werk', h.weg - 10, { aantal: 40, terug: 30, dienst });
        geteld++; if (!rijen.some((r) => r.rit === leg.id)) fout++;
        return;
      }
      const rijen = rijenUitRooster(rooster, naam, 'werk', h.weg % 86400 - 10, { aantal: 40, terug: 30, dienst });
      geteld++;
      if (!rijen.some((r) => r.rit === leg.id)) fout++;
    });
  }
  ok(geteld > 100 && fout === 0, 'elke trein heeft zijn bordrij op elk station waar hij vertrekt (geen trein zonder rooster)', `${fout} van ${geteld}`);
}

// een vervallen rit: de rij staat er (vervalt), er is geen trein
{
  const nu = 8 * 3600;
  const rij = rijenUitRooster(rooster, 'Bedum', 'werk', nu, { aantal: 3, dienst })[0];
  const live = new Map([[meldSleutel(rij.nummer, rij.code, rij.plan), { vertraging: 0, vervallen: true }]]);
  const leg = dienst.leg(rij.rit);
  const t = legTimes(leg, live);
  ok(t.vervallen && legState(leg, rij.plan, routesPlain[leg.routeIdx].len, t) === null, 'een vervallen rit heeft geen trein in de wereld');
  ok(pasVertragingToe([rij], live)[0].vervallen, 'en het bord zegt dat hij vervalt');
}

// --- 3. de beweging: stil in de haltes, onderweg ertussen, deterministisch -------------------------------------------
{
  const leg = dienst.legs.find((l) => l.halten.length >= 3 && !l.begin && !l.eind) || dienst.legs.find((l) => l.halten.length >= 3);
  const t = legTimes(leg, null);
  const len = routesPlain[leg.routeIdx].len;
  const a = leg.halten[0], b = leg.halten[1];
  const midden = legState(leg, t.weg[0] + Math.min(DIENST.venster, (t.aan[1] - t.weg[0]) * 0.4) / 2, len, t); // kort na het vertrek; in het midden van de rit is hij niet in beeld (#1339)
  ok(midden && midden.staat === 'run' && midden.v > 0 && (midden.s - a.s) * leg.dir > 0 && (b.s - midden.s) * leg.dir > 0, 'kort na het vertrek rijdt de trein tussen twee haltes', JSON.stringify(midden));
  ok(legState(leg, (t.weg[0] + t.aan[1]) / 2, len, t) === null, 'midden in een rit is hij niet in beeld (geen snelheid van 1000 m/s)');
  ok(midden.doel === b.idx, 'het doel is de volgende halte van de lijn');
  const aankomst = legState(leg, t.aan[1], len, t), vertrek = legState(leg, t.weg[1], len, t);
  ok(aankomst && aankomst.s === b.s && vertrek && vertrek.s === b.s, 'in de halte staat hij op de halteplek');
  ok(JSON.stringify(legState(leg, t.weg[0] + 100, len, t)) === JSON.stringify(legState(leg, t.weg[0] + 100, len, t)), 'dezelfde klok geeft dezelfde plek');
  ok(legState(leg, t.aan[leg.halten.length - 1] + 7200, len, t) === null && legState(leg, t.aan[0] - 5000, len, t) === null, 'buiten zijn rit is hij er niet');
  // een rit die van buiten de kaart komt, komt uit de richting waar hij vandaan komt binnen
  const binnen = dienst.legs.find((l) => !l.begin && l.dir === 1 && l.halten[0].s > 5000);
  if (binnen) { const tt = legTimes(binnen, null); const s = legState(binnen, tt.aan[0] - 20, routesPlain[binnen.routeIdx].len, tt); ok(!s || s.s < binnen.halten[0].s, 'een binnenkomende trein nadert vanaf de oorspronkelijke kant', JSON.stringify(s)); }
  // de dienst van de machinist uit dezelfde leg: dezelfde haltes en tijden
  const d = dienstVanLeg(leg, t, leg.halten[0].st);
  ok(d && d.halten.length === leg.halten.length && d.halten[0].weg === t.weg[0] && d.rit === leg.id && d.halten[d.halten.length - 1].laatste, 'de machinist rijdt de rit van het bord');
  ok(dienstVanLeg(leg, t, leg.halten[leg.halten.length - 1].st) === null, 'vanaf het eindpunt geen dienst');
}

// de bron per frame: dagsoort, klok en live stand
{
  let dag = 'werk'; const stand = new Map();
  const bron = createServiceSource({ rooster: () => rooster, routes: () => routesPlain, dagsoort: () => dag, klok: (w) => w.clock, stand: () => stand });
  const a = bron({ clock: 8.25 });
  ok(a && a.nu === 8.25 * 3600 && a.stand === stand && a.dienst.legs.length === dienst.legs.length, 'de bron geeft de dienst, de klok en de live stand');
  ok(bron({ clock: 25 }).nu === 3600, 'de klok loopt rond');
  dag = 'za'; ok(bron({ clock: 9 }).dienst.legs.length !== a.dienst.legs.length, 'een andere dagsoort een andere dienst');
  ok(createServiceSource({ rooster: () => null, routes: () => routesPlain, dagsoort: () => 'werk', klok: () => 0 })({}) === null, 'zonder rooster geen bron');
}

// --- 3b. nooit sneller dan een echte trein (#1339): de spelklok loopt 60 keer sneller dan de wereld ------------------
// Stap in echte tijd (1/60 s = 1 spelseconde, en een haperend beeld van 0,25 s = 15 spelseconden) en meet de verplaatsing per echte seconde.
{
  const SC = DIENST.klokSchaal;
  ok(SC === 60, 'de klokschaal is 86400 / 1440 s');
  let maxV = 0, maxGeo = 0, gemeten = 0;
  for (const leg of dienst.legs.filter((l, i) => i % 7 === 0)) {
    const t = legTimes(leg, null), len = routesPlain[leg.routeIdx].len;
    for (const stap of [1, 15]) {                       // spelseconden per beeld (60 fps en een haperend beeld)
      let vorig = null;
      for (let nu = t.aan[0] - 1500; nu <= t.weg[leg.halten.length - 1] + 1500; nu += stap) {
        const st = legState(leg, nu, len, t);
        if (st) maxV = Math.max(maxV, st.v);
        if (st && vorig) { const geo = Math.abs(st.s - vorig.s) / (stap / SC); if (geo > maxGeo) maxGeo = geo; gemeten++; }
        vorig = st;
      }
    }
  }
  ok(gemeten > 1000, 'genoeg stappen gemeten', gemeten);
  ok(maxV <= DIENST.vReis + 1e-9, `de gemelde snelheid blijft onder ${DIENST.vReis} m/s`, maxV.toFixed(1));
  ok(maxGeo <= DIENST.vReis * 1.02, `de verplaatsing per echte seconde blijft onder ${DIENST.vReis} m/s (was ~1000 m/s)`, maxGeo.toFixed(1));
}

// --- 4. de wereld (railway.js): treinen komen uit het rooster ---------------------------------------------------------
const newMap = () => ({ railRoutes: railRoutes.map((r) => ({ ...r, stops: r.stops.map((s) => ({ ...s })) })), railLifts: [], levelCrossings: [], meta: { bounds: [[-100, -200], [100000, 200]] }, roadsNear: () => [] });
const newWorld = (map) => ({
  map, vehicles: [], pedestrians: [], player: { x: 0, y: 0, angle: 0, vx: 0, vy: 0, z: 0, gz: 0, radius: 0.35 }, companion: null,
  time: 0, clock: 10, money: 200, wanted: 0, input: { isDown: () => false, wasPressed: () => false, consume() {}, reset() {} },
  onRespawn: [], audioEvents: [], particles: [], addMessage() {}, health: 100, armor: 0, coopRole: null,
});
const Hst = await import('../game/js/railway.js');
const Gst = await import('../game/js/railway.js?gast');
const hw = newWorld(newMap()), gw = newWorld(newMap());
Hst.initRailway(hw); Gst.initRailway(gw);
ok(Hst.getTrains().length === 7, 'eerst de eigen dienst: een pendeltrein per lijn');
let liveStand = null;
const maak = (R) => createServiceSource({ rooster: () => rooster, routes: R.getRoutes, dagsoort: () => 'werk', klok: (w) => w.clock, stand: () => liveStand });
Hst.setTreinDienst(maak(Hst)); Gst.setTreinDienst(maak(Gst));
hw.clock = 8 + 17 / 60;
Hst.updateRailway(0.1, hw);
const treinen = Hst.getTrains().filter((t) => !t.ambient);
const metRooster = treinen.filter((t) => t.route.pool);
ok(metRooster.length > 6 && metRooster.every((t) => t.rit && t.rit.leg), 'op lijnen met rooster rijdt alleen een rit van het bord, geen willekeurige trein', metRooster.length);
ok(Hst.getRoutes().filter((r) => r.pool).every((r) => !treinen.some((t) => t.route === r && !t.rit)), 'de pendeltreinen zijn weg op lijnen met rooster');
const zonderRooster = Hst.getRoutes().filter((r) => !r.pool);
ok(zonderRooster.length === 1 && zonderRooster[0].name === 'Intercity Zwolle' && treinen.filter((t) => t.route === zonderRooster[0]).length === 1, 'een lijn zonder rit in de data (hier Intercity Zwolle) houdt zijn eigen dienst');
ok(treinen.every((t) => (t.state === 'dwell' || t.state === 'run') && Number.isFinite(t.c) && t.cars.length >= 2), 'elke trein is gezet op zijn plek');
{
  const perLeg = new Map(metRooster.map((t) => [t.rit.leg.id, t]));
  ok(perLeg.size === metRooster.length, 'elke rit heeft precies één trein');
  const actief = actieveLegs(dienst, routesPlain, hw.clock * 3600, null);
  ok(actief.length === metRooster.length && actief.every((a) => perLeg.has(a.leg.id)), 'de treinen in de wereld zijn precies de actieve ritten', `${actief.length} vs ${metRooster.length}`);
  for (const t of metRooster) ok(Math.abs(t.c - t.rit.stand.s) < 1e-6 && t.dir === t.rit.leg.dir, 'plek en richting komen uit de klok');
}
// bord en wereld: de trein van de eerste bordrij staat op de vertrektijd op het perron, vertrekt daarna
{
  const naam = 'Bedum';
  const station = { name: naam, x: 0, y: 0, tx: 1, ty: 0, lijnen: [{ name: 'Stoptrein Delfzijl', stops: [{ name: naam, s: 9000 }] }] };
  const view = stationView(station, 8.4, 3, null, 60, { rooster, dagsoort: 'werk', live: null, dienst });
  ok(view.echtRooster && view.bord.length > 0 && view.bord.every((r) => r.rit), 'het bord bestaat uit ritten');
  for (const rij of view.bord.slice(0, 3)) {
    hw.clock = (rij.tijd - 0.5) / 3600;   // een halve seconde voor vertrek: de trein staat nog
    Hst.updateRailway(0.1, hw);
    const t = Hst.getTrains().find((q) => q.rit && q.rit.leg.id === rij.rit);
    const stop = t && t.route.stops.find((s) => s.name === naam);
    ok(t && stop && t.state === 'dwell' && Math.abs(t.c - stop.s) < 1e-6, `de trein van het bord (${rij.nummer}) staat op de vertrektijd in ${naam}`);
    hw.clock = (rij.tijd + 90) / 3600;
    Hst.updateRailway(0.1, hw);
    const t2 = Hst.getTrains().find((q) => q.rit && q.rit.leg.id === rij.rit);
    ok(t2 === t && t2.state === 'run' && (t2.c - stop.s) * t2.dir > 0, 'en vertrekt daarna de goede kant op, dezelfde trein');
  }
  // met live vertraging: de trein wacht, het bord zegt het
  const eerste = view.bord[0];
  liveStand = new Map([[meldSleutel(eerste.nummer, eerste.code, eerste.plan), { vertraging: 300, vervallen: false }]]);
  const viewV = stationView(station, 8.4, 3, null, 60, { rooster, dagsoort: 'werk', live: liveStand, dienst });
  const rijV = viewV.bord.find((r) => r.rit === eerste.rit);
  ok(rijV && rijV.tijd === eerste.plan + 300 && rijV.vertraging === 300, 'het bord toont de vertraging');
  hw.clock = (eerste.plan - 1) / 3600;
  Hst.updateRailway(0.1, hw);
  const tw = Hst.getTrains().find((q) => q.rit && q.rit.leg.id === eerste.rit);
  const legV = dienst.leg(eerste.rit), stop = Hst.getRoutes()[legV.routeIdx].stops.find((s) => s.name === naam);
  ok(!tw || !(tw.state === 'dwell' && Math.abs(tw.c - stop.s) < 1e-6), 'op de geplande tijd staat de vertraagde trein er nog niet: hij is te laat (of nog buiten beeld)');
  hw.clock = (rijV.tijd - 0.5) / 3600;
  Hst.updateRailway(0.1, hw);
  const tl = Hst.getTrains().find((q) => q.rit && q.rit.leg.id === eerste.rit);
  ok(tl.state === 'dwell' && Math.abs(tl.c - stop.s) < 1e-6, 'op de vertraagde tijd van het bord staat hij op het perron');
  hw.clock = (rijV.tijd + 60) / 3600;
  Hst.updateRailway(0.1, hw);
  ok(Hst.getTrains().find((q) => q.rit && q.rit.leg.id === eerste.rit).c !== stop.s, 'en daarna vertrekt hij');
  liveStand = null;
}
// Samen spelen: een gast rekent hetzelfde uit de gezamenlijke klok
{
  hw.clock = 9.1; gw.clock = 9.1;
  Hst.updateRailway(0.1, hw);
  Gst.gastOverwegen(0.1, gw);
  const ha = Hst.getTrains().filter((t) => t.rit).map((t) => `${t.rit.leg.id}:${t.c.toFixed(3)}:${t.state}`).sort();
  const ga = Gst.getTrains().filter((t) => t.rit).map((t) => `${t.rit.leg.id}:${t.c.toFixed(3)}:${t.state}`).sort();
  ok(ha.length > 0 && ha.join('|') === ga.join('|'), 'de gast heeft dezelfde treinen op dezelfde plek (zelfde klok)', `${ha.length} vs ${ga.length}`);
  ok(Gst.getTrains().filter((t) => t.rit).every((t) => t.gastWeg === false), 'een gast tekent de treinen van het rooster');
  // de snapshot van de host met een gewone rooster-trein verandert niets bij de gast
  const t0 = Hst.getTrains().find((t) => t.rit);
  const p = Hst.routePoint(t0.route, t0.c);
  const voor = Gst.getTrains().filter((t) => !t.ambient).map((t) => t.c).join();
  Gst.zetTreinenVanHost([{ route: Hst.getRoutes().indexOf(t0.route), x: p[0], y: p[1], v: t0.v, overgenomen: false }]);
  Gst.gastOverwegen(0.1, gw);
  ok(Gst.getTrains().filter((t) => !t.ambient).map((t) => t.c).join() === voor, 'een trein van het rooster in de snapshot: de gast houdt zijn eigen (klok)plek');
  // een overgenomen trein (een speler rijdt hem): de gast volgt de host
  const route = Hst.getRoutes().indexOf(t0.route);
  Gst.zetTreinenVanHost([{ route, x: p[0] + 700, y: p[1], v: 5, overgenomen: true }]);
  const volgt = Gst.getTrains().find((t) => t.gastVolgt);
  ok(volgt && Math.abs(volgt.c - (p[0] + 700)) < 2, 'een overgenomen trein volgt de snapshot van de host');
  Gst.gastOverwegen(0.1, gw);
  ok(Math.abs(Gst.getTrains().find((t) => t.gastVolgt).c - (p[0] + 700)) < 12, 'en de klok trekt hem er niet vandaan');
  Gst.zetTreinenVanHost([]);
  ok(!Gst.getTrains().some((t) => t.gastVolgt), 'niet meer overgenomen: terug naar de klok');
}
// een speler die in de trein van het bord stapt: de trein blijft van hem, de rit wordt niet dubbel gereden
{
  hw.clock = 11.0; Hst.updateRailway(0.1, hw);
  const t = Hst.getTrains().find((q) => q.state === 'dwell' && q.rit);
  const id = t.rit.leg.id;
  Hst.hijackTrain(t, t.rit.leg.dir);
  Hst.updateRailway(0.1, hw);
  ok(t.stolen && Hst.getTrains().includes(t), 'de overgenomen trein blijft in de wereld');
  ok(Hst.getTrains().filter((q) => q.rit && q.rit.leg.id === id).length === 1, 'de rit wordt niet nog een keer gereden');
  const d = dienstVanLeg(t.rit.leg, t.rit.tijden, t.rit.leg.halten[t.rit.stand.halte].st);
  ok(!d || d.rit === id, 'de dienst van de machinist is die van het bord');
}
// zonder dienstbron blijft alles bij de eigen dienst
{
  const X = await import('../game/js/railway.js?zonder');
  const w = newWorld(newMap());
  X.initRailway(w);
  X.updateRailway(0.1, w);
  ok(X.getTrains().length === 7 && X.getTrains().every((t) => !t.rit), 'zonder rooster houden de lijnen hun eigen dienst');
}

console.log(`${n - fails}/${n} treindienst ${fails ? 'MISLUKT' : 'ok'}`);
if (fails) process.exit(1);
void DIENST;
