// De treinen van de wereld volgen het echte rooster (#1085): uit game/trainschedule.json (trainschedule.js) en de spoorlijnen van het
// spel (railway.getRoutes(): { name, len, stops: [{ name, s, offmap }] }) volgt per rit ("leg": één trein op één spoorlijn, met
// haltetijden) waar die trein op de spelklok is. PUUR en DETERMINISTISCH: geen THREE, geen wereld, geen toeval, geen klok die
// ergens bijgehouden wordt. Dezelfde spelklok geeft overal dezelfde trein op dezelfde plek: de host, een gast en het bord.
// Een trein buiten bereik hoeft dus niet gesimuleerd: zijn plek volgt uit de klok (legState). Tests: scripts/trainservice_test.mjs.
//
// Wat een rit is. Het rooster heeft per station vertrekrijen met treinnummer; rijen met hetzelfde nummer in tijdsvolgorde zijn
// één rit. Een rit die over het station Groningen (de knoop van alle spellijnen) rijdt valt in twee legs, één per spoorlijn
// (zoals het spel de lijnen kent: elke lijn begint op het Hoofdstation). Een leg heeft minstens twee haltes die op de lijn staan;
// een rit met minder haltes in de wereld heeft geen trein en staat dus ook niet op het bord.
// Tijden: halte j: aan (aankomst) en weg (vertrek) in seconden na middernacht; met live vertraging per halte erbij (legTimes).
// Beweging (#1339): de spelklok loopt 60 keer sneller dan de wereld (een speldag is 24 echte minuten), het rooster rekent in spelseconden.
// Een stop van 3 min op het rooster is dus 3 echte seconden: de stationsafstand (4 km) zou met 1000 m/s afgelegd worden, hoe zacht de
// curve ook is. De trein staat daarom nog precies op de halteplek tussen aankomst en vertrek (bord = wereldtrein), maar rijdt met een echte
// trapezoïde (VERSNELLING, V_REIS) alleen in het VENSTER na zijn vertrek en voor zijn aankomst (hooguit 40% van de tijd tussen twee
// haltes), en is daartussen niet in de wereld: nooit sneller dan V_REIS. Komt de rit van buiten de kaart (eerste halte van de wereld is niet
// de eerste van de rit), dan rijdt hij uit de richting waar hij vandaan komt binnen; rijdt hij na zijn laatste halte door, dan rijdt hij weg;
// een eindstation in de wereld laat hem daar tot NABLIJF s staan.
// Beginstation: de trein staat VOORAF s vóór het vertrek klaar op het perron (de plek van de halte op de lijn).
// Het perron is de halte van de lijn (stop.s); de echte sporen (sp. 3 enz.) zijn tekst op het bord: de wereld heeft per lijn
// één spoor per richting, dus de sporennummers zijn geen aparte geometrie.

import { vertragingVan } from './trainschedule.js';

export const DIENST = {
  vooraf: 120,      // s dat een beginnende trein klaarstaat voor zijn vertrek
  nablijf: 60,      // s dat een trein op zijn eindstation blijft staan
  klokSchaal: 60,   // spelseconden per echte seconde (86400 / DAY_LENGTH_S, daynight.js): de spelklok loopt 60 keer sneller dan de beweging in de wereld
  vReis: 22,        // m/s kruissnelheid van een trein in de wereld (80 km/u, zoals railway.js TRAIN_TYPES vmax)
  versnelling: 0.8, // m/s2 optrekken en remmen
  venster: 1200,    // spelseconden (20 echte s) dat een trein na zijn vertrek of voor zijn aankomst in beeld is (#1339)
  minStop: 20,      // s minimaal tussen aankomst en vertrek na een vertraging
  knoop: 'Groningen Hoofdstation',
  gat: 9000,        // s tussen twee vertrekken waarna hetzelfde treinnummer een andere rit is
};

// De rijen van één dagsoort als haltes per rit. rooster: trainschedule.json. routes: spoorlijnen van het spel.
// Geeft { legs, vindRij, perLijn, legMet }.
export function bouwDienst(rooster, dagsoort, routes, opts = {}) {
  const cfg = { ...DIENST, ...opts };
  const gameName = (n) => (n === 'Groningen' ? cfg.knoop : n);
  const dayRows = rooster && rooster.rit && rooster.rit[dagsoort];
  const legs = [];
  if (!dayRows) return buildIndex(legs, routes);
  // 1. alle rijen per treinnummer
  const byNumber = new Map();
  for (const [si, rijen] of Object.entries(dayRows)) {
    const st = rooster.stations[+si];
    for (const x of rijen) {
      const rij = { nummer: x[1], st: gameName(st.naam), code: st.code, weg: x[0], aan: x[5], spoor: x[2], dest: rooster.bestemmingen[x[3]], lijn: rooster.lijnen[x[4]], soort: x[6] || 0 };
      if (!byNumber.has(x[1])) byNumber.set(x[1], []);
      byNumber.get(x[1]).push(rij);
    }
  }
  const stopMap = routes.map((r) => new Map(r.stops.map((s, i) => [s.name, { s: s.s, i, offmap: !!s.offmap }])));
  const telling = new Map();   // leg-id -> aantal, voor een uniek id bij een hergebruikt nummer
  for (const [nummer, alle] of byNumber) {
    alle.sort((a, b) => a.weg - b.weg || a.aan - b.aan);
    // 2. een nummer kan twee ritten op één dag zijn (ver uit elkaar): splitsen op een groot gat
    const ritten = [];
    let huidig = [];
    for (const r of alle) {
      if (huidig.length && r.weg - huidig[huidig.length - 1].weg > cfg.gat) { ritten.push(huidig); huidig = []; }
      huidig.push(r);
    }
    if (huidig.length) ritten.push(huidig);
    for (const rit of ritten) {
      // 3. tijden over middernacht doortellen
      let vorig = -Infinity;
      for (const r of rit) {
        while (r.weg < vorig - 43200) r.weg += 86400;
        if (r.aan > r.weg + 43200) r.aan -= 86400;
        while (r.aan < r.weg - 43200) r.aan += 86400;
        if (r.aan > r.weg) r.aan = r.weg;
        vorig = r.weg;
      }
      // 4. splitsen op de knoop: één leg per spoorlijn
      const h = rit.findIndex((r) => r.st === cfg.knoop);
      const delen = h > 0 && h < rit.length - 1 ? [rit.slice(0, h + 1), rit.slice(h)] : [rit];
      delen.forEach((deel, di) => {
        const leg = buildLeg(nummer, deel, routes, stopMap, { splitsing: delen.length === 2, deelIdx: di });
        if (!leg) return;
        const n = (telling.get(leg.id) || 0);
        telling.set(leg.id, n + 1);
        if (n) leg.id = `${leg.id}#${n}`;
        legs.push(leg);
      });
    }
  }
  return buildIndex(legs, routes);
}

function buildLeg(nummer, deel, routes, stopMap, { splitsing = false, deelIdx = 0 } = {}) {
  let best = null;
  for (let ri = 0; ri < routes.length; ri++) {
    const map = stopMap[ri];
    const gedekt = deel.filter((r) => map.has(r.st));
    if (gedekt.length < 2) continue;
    // de s-volgorde moet monotoon zijn (een rit rijdt niet heen en weer)
    const ss = gedekt.map((r) => map.get(r.st).s);
    const op = ss.every((v, i) => i === 0 || v > ss[i - 1]), neer = ss.every((v, i) => i === 0 || v < ss[i - 1]);
    if (!op && !neer) continue;
    const voorkeur = gedekt.filter((r) => r.lijn === routes[ri].name).length;
    const score = gedekt.length * 10 + voorkeur;
    if (!best || score > best.score) best = { ri, gedekt, op, score };
  }
  if (!best) return null;
  const railLine = routes[best.ri], map = stopMap[best.ri];
  const halten = best.gedekt.map((r) => ({ st: r.st, code: r.code, s: map.get(r.st).s, idx: map.get(r.st).i, offmap: map.get(r.st).offmap, aan: r.aan, weg: r.weg, spoor: r.spoor, soort: r.soort, dest: r.dest }));
  // een leg begint als de rit er begint (soort 2) of als hij de tweede helft van een rit over de knoop is; hij eindigt als de rit er eindigt (soort 1) of als hij de eerste helft is
  halten[0].aan = Math.min(halten[0].aan, halten[0].weg);
  return {
    id: `${nummer}@${railLine.name}`, nummer, route: railLine.name, routeIdx: best.ri, dir: best.op ? 1 : -1, halten,
    begin: halten[0].soort === 2 || (splitsing && deelIdx === 1),
    eind: halten[halten.length - 1].soort === 1 || (splitsing && deelIdx === 0),
    bestemming: halten[halten.length - 1].dest,
    // ruim venster waarbinnen de leg ooit in de wereld kan zijn (met vertraging): daarbuiten rekenen we hem niet door
    van: Math.min(halten[0].aan, halten[0].weg) - DIENST.vooraf - DIENST.venster - 1800,
    tot: halten[halten.length - 1].weg + DIENST.nablijf + DIENST.venster + 3600,
  };
}

function buildIndex(legs, routes) {
  const perId = new Map(legs.map((l) => [l.id, l]));
  const perRij = new Map();      // nummer|station -> [{ leg, j }]
  const byLine = new Map();
  for (const leg of legs) {
    if (!byLine.has(leg.route)) byLine.set(leg.route, []);
    byLine.get(leg.route).push(leg);
    leg.halten.forEach((h, j) => {
      const k = `${leg.nummer}|${h.st}`;
      if (!perRij.has(k)) perRij.set(k, []);
      perRij.get(k).push({ leg, j });
    });
  }
  return {
    legs, perId, perLijn: byLine,
    // de leg en de halte bij een bordrij (nummer + station): de leg waar het station niet het eindpunt is (een vertrek)
    vindRij(nummer, station) {
      const l = perRij.get(`${nummer}|${station}`);
      if (!l) return null;
      return l.find((e) => e.j < e.leg.halten.length - 1) || null;
    },
    leg: (id) => perId.get(id) || null,
  };
}

// De haltetijden van een leg met de live vertraging (dezelfde functie als het bord: trainschedule.vertragingVan). stand: Map of null.
// Geeft { aan: [], weg: [], vervallen, vertraging: [] } per halte. Een vervallen rit rijdt niet.
export function legTimes(leg, stand, cfg = DIENST) {
  const n = leg.halten.length;
  const arrivals = [], weg = [], vertraging = [];
  let vervallen = false;
  for (let j = 0; j < n; j++) {
    const h = leg.halten[j];
    const m = vertragingVan(stand, leg.nummer, h.code, h.weg);
    const d = m ? m.vertraging : 0;
    if (m && m.vervallen) vervallen = true;
    vertraging.push(d);
    let a = h.aan + d, w = h.weg + d;
    if (!(j === n - 1 && leg.eind)) a = Math.min(a, w - cfg.minStop);   // een trein staat minstens even stil (het rooster heeft soms aankomst = vertrek)
    if (j > 0) { a = Math.max(a, weg[j - 1] + 10); w = Math.max(w, a); }
    if (j === n - 1 && leg.eind) w = a;
    arrivals.push(a); weg.push(w);
  }
  return { aan: arrivals, weg, vertraging, vervallen };
}

// Echte beweging vanuit stilstand: afstand en snelheid na `tau` echte seconden optrekken (versnelling, dan kruissnelheid). Remmen is het spiegelbeeld.
const optrekAfstand = (tau, cfg) => {
  const tc = cfg.vReis / cfg.versnelling;
  return tau <= tc ? 0.5 * cfg.versnelling * tau * tau : 0.5 * cfg.vReis * tc + cfg.vReis * (tau - tc);
};
const optrekSnelheid = (tau, cfg) => Math.min(cfg.vReis, cfg.versnelling * tau);

// Waar de trein van een leg is op tijd `nu` (s na middernacht). null = niet in de wereld (nog niet of niet meer, onderweg buiten het venster, of vervallen).
// Geeft { s, v (m/s, >= 0, nooit boven cfg.vReis), dir, staat ('dwell' | 'run'), halte (index in leg.halten van de halte waar hij staat of heen rijdt),
// doel (route-stopindex om naartoe), rest (s dat hij nog blijft staan), vertraging (s) }. routeLen: lengte van de spoorlijn (s).
export function legState(leg, nu, routeLen, tijden, cfg = DIENST) {
  if (tijden.vervallen) return null;
  const { aan, weg } = tijden;
  const n = leg.halten.length, dir = leg.dir;
  const eerste = leg.halten[0], laatste = leg.halten[n - 1];
  const klaar = (s, v, staat, halte, rest) => {
    if (!(s >= 0 && s <= routeLen)) return null;
    return { s, v, dir, staat, halte, doel: leg.halten[Math.min(n - 1, halte)].idx, rest, vertraging: tijden.vertraging[Math.min(n - 1, halte)] };
  };
  const SC = cfg.klokSchaal;
  // het stuk dat de trein na vertrek (u s) of voor aankomst (w s) aflegt, hooguit het venster en 40% van de rit tussen twee haltes (de twee stukken raken elkaar nooit)
  const venster = (gat) => Math.min(cfg.venster, Math.max(0, gat) * 0.4);
  // vóór de eerste halte
  if (nu < aan[0] || (leg.begin && nu < weg[0])) {
    if (leg.begin) return nu >= weg[0] - cfg.vooraf ? klaar(eerste.s, 0, 'dwell', 0, Math.max(0, weg[0] - nu)) : null;
    const w = aan[0] - nu;   // nog zo lang tot hij op de halte staat: hij komt van buiten de kaart
    if (w > cfg.venster) return null;
    const tau = w / SC;
    return klaar(eerste.s - dir * optrekAfstand(tau, cfg), optrekSnelheid(tau, cfg), 'run', 0, 0);
  }
  for (let j = 0; j < n; j++) {
    const h = leg.halten[j];
    if (nu >= aan[j] && nu <= weg[j]) {
      return klaar(h.s, 0, 'dwell', j, Math.max(0, weg[j] - nu));
    }
    if (j < n - 1 && nu > weg[j] && nu < aan[j + 1]) {
      const b = leg.halten[j + 1];
      const W = venster(aan[j + 1] - weg[j]), afstand = Math.abs(b.s - h.s);
      const u = nu - weg[j], w = aan[j + 1] - nu;
      if (u <= W) return klaar(h.s + dir * Math.min(afstand / 2, optrekAfstand(u / SC, cfg)), optrekSnelheid(u / SC, cfg), 'run', j + 1, 0);
      if (w <= W) return klaar(b.s - dir * Math.min(afstand / 2, optrekAfstand(w / SC, cfg)), optrekSnelheid(w / SC, cfg), 'run', j + 1, 0);
      return null;   // onderweg: buiten beeld (zie de kop)
    }
  }
  // na de laatste halte
  if (leg.eind) return nu <= aan[n - 1] + cfg.nablijf ? klaar(laatste.s, 0, 'dwell', n - 1, 0) : null;
  const u = nu - weg[n - 1];
  if (u > cfg.venster) return null;
  return klaar(laatste.s + dir * optrekAfstand(u / SC, cfg), optrekSnelheid(u / SC, cfg), 'run', n - 1, 0);
}

// De legs die op tijd `nu` een trein in de wereld hebben, per spoorlijn (naam). stand: live vertragingen (Map) of null.
// Geeft [{ leg, stand, tijden }] gesorteerd op leg-id (stabiel).
export function actieveLegs(dienst, routes, nu, stand = null) {
  const uit = [];
  for (const leg of dienst.legs) {
    // de tijden lopen door na middernacht (> 86400): kijk ook naar de klok van morgen
    const tt = nu >= leg.van && nu <= leg.tot ? nu : nu + 86400 >= leg.van && nu + 86400 <= leg.tot ? nu + 86400 : null;
    if (tt === null) continue;
    const railLine = routes[leg.routeIdx];
    const times = legTimes(leg, stand);
    const st = legState(leg, tt, railLine.len, times);
    if (st) uit.push({ leg, stand: st, tijden: times });
  }
  return uit.sort((a, b) => (a.leg.id < b.leg.id ? -1 : 1));
}

// Een bordrij is dezelfde trein als de wereldtrein: zelfde rit-id en dezelfde tijden. Hulp voor tests en de omroep: de vertrektijd
// van de leg op halte j met vertraging (gelijk aan rij.tijd van trainschedule.rijenUitRooster).
export const vertrekVan = (leg, j, stand) => legTimes(leg, stand).weg[j];

// De dienst van de machinist uit een leg (machinist.js): dezelfde vorm als dienstregeling.dienstVanRit, maar met de haltes en tijden van de
// trein van het bord (leg + tijden uit legTimes, dus met de live vertraging). vanaf: de halte waar de speler instapt; null als die niet in
// de leg ligt of het eindpunt is (dan rijdt de machinist de verzonnen dienst van dienstregeling.js).
export function dienstVanLeg(leg, tijden, vanaf, dag = 1) {
  if (!leg || !tijden) return null;
  const n = leg.halten.length;
  const j = vanaf ? leg.halten.findIndex((h) => h.st === vanaf) : 0;
  if (j < 0 || j >= n - 1) return null;
  const halten = leg.halten.map((h, i) => ({ name: h.st, s: h.s, aan: tijden.aan[i], weg: tijden.weg[i], laatste: i === n - 1, offmap: !!h.offmap }));
  const verw = tijden.vertraging[j] || 0;
  return {
    lijn: leg.route, dir: leg.dir, k: 0, dag, start: halten[0].weg, vertraging: verw, reden: verw ? 'Zo meldt de open reisinformatie' : '',
    van: halten[0].name, naar: leg.bestemming || halten[n - 1].name, halten, vanaf: halten[j].name, vertrek: halten[j].weg, rit: leg.id, nummer: leg.nummer,
  };
}

// De bron voor railway.setTreinDienst: bouwt de dienst per dagsoort één keer (zodra de spoorlijnen en het rooster er zijn) en geeft elke
// frame { dienst, nu, stand } terug. Alles komt als functie binnen, zodat dit puur blijft: rooster() -> trainschedule.json of null,
// routes() -> railway.getRoutes(), dagsoort(world) -> 'werk' | 'za' | 'zo', klok(world) -> spelklok in uren, stand(world) -> live vertragingen (Map) of null.
export function createServiceSource({ rooster, routes, dagsoort, klok, stand = () => null }) {
  const cache = new Map();
  let sig = '';
  return (world) => {
    const r = rooster(), rs = routes();
    if (!r || !rs || !rs.length) return null;
    const dayType = dagsoort(world);
    const nextSig = `${rs.length}:${rs.map((x) => x.stops.length).join(',')}`;
    if (nextSig !== sig) { cache.clear(); sig = nextSig; }
    if (!cache.has(dayType)) cache.set(dayType, bouwDienst(r, dayType, rs));
    const nu = (((klok(world) % 24) + 24) % 24) * 3600;
    return { dienst: cache.get(dayType), nu, stand: stand(world) };
  };
}
