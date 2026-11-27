import { hoofdspeler } from './players.js';
// Stationsleven (#198, #14): het vertrekbord, de omroep en de perrondrukte van het station
// bij de speler, uit dienstregeling.js. Het deel zonder wereld is puur (testbaar zonder
// browser: scripts/stationlife_test.mjs); updateStationLife hangt het aan HUD en geluid.
import { vertrekBord, bordUitTreinen, omroep, perronDrukte, tijdLabel, VERVOERDER } from './dienstregeling.js';
import { hasStop, rijenUitRooster, pasVertragingToe } from './trainschedule.js';
import { sourceState, bronLabel, departureLine } from './trainsource.js';
import { buildTimeline } from './departuretimeline.js';
import { createTimeline } from './departuretimelineui.js';

export const NEAR_R = 45;      // m: zo dichtbij moet je bij het perron zijn voor bord en omroep
export const CROWD_R = 140;    // m: zo dichtbij worden reizigers getekend
export const OMROEP_GAP = 75;  // s spelklok tussen twee berichten van dezelfde rit
export const LIVE_R = 400;     // m: binnen deze afstand van een station zijn live vertragingen het opvragen waard (bord en treinen in zicht)

// #1345: het bord blokkeerde het zicht. Het staat alleen in beeld als de speler (te voet of in een voertuig) stilstaat: loopt of rijdt hij,
// dan vervaagt het meteen en verdwijnt het na BORD_VERVAAG s; na BORD_STIL s stilstaan komt het terug. Puur, zonder DOM (stationlife_test).
export const BORD_STIL = 0.8, BORD_BEWEEG = 0.8, BORD_VERVAAG = 0.4; // s, m/s, s
export function bordZichtToestand() { return { x: null, y: null, stil: 0, weg: 0, zicht: false }; }
export function bordZichtStap(st, dt, x, y) {
  const d = st.x === null ? 0 : Math.hypot(x - st.x, y - st.y);
  st.x = x; st.y = y;
  const snelheid = dt > 0 ? d / dt : 0;
  if (snelheid > BORD_BEWEEG || d > 30) { st.stil = 0; st.zicht = false; st.weg += dt; } // een sprong (teleport, reis) telt als bewegen
  else { st.stil += dt; if (st.stil >= BORD_STIL) { st.zicht = true; st.weg = 0; } else st.weg += dt; }
  return { zicht: st.zicht, verborgen: !st.zicht && st.weg >= BORD_VERVAAG };
}

// Stations uit de lijnen, op naam samengevoegd: { name, x, y, lijnen:[route...] }.
// `point(route, s)` geeft [x, y] (railway.routePoint); haltes buiten de kaart blijven weg.
export function stationsFromRoutes(routes, point) {
  const map = new Map();
  for (const r of routes) {
    for (const st of r.stops) {
      if (st.offmap) continue;
      const [x, y] = point(r, st.s);
      let e = map.get(st.name);
      if (!e) {
        const [bx, by] = point(r, st.s - 6), [cx, cy] = point(r, st.s + 6);
        const l = Math.hypot(cx - bx, cy - by) || 1;
        map.set(st.name, e = { name: st.name, x, y, tx: (cx - bx) / l, ty: (cy - by) / l, lijnen: [] });
      }
      if (!e.lijnen.includes(r)) e.lijnen.push(r);
    }
  }
  return [...map.values()];
}

export function nearestStation(stations, x, y, r = NEAR_R) {
  let best = null, bd = r;
  for (const s of stations) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { station: best, d: bd } : null;
}

// Live treinen opvragen (OVapi) alleen als het resultaat gebruikt wordt: niet in Samen spelen (iedereen rekent daar zonder live vertraging)
// en niet ver van elk station (review 22-11).
export function shouldPollLiveTrains(world, stationList, x, y, r = LIVE_R) {
  if (world && world.coopRole) return false;
  return !!(stationList && stationList.length && nearestStation(stationList, x, y, r));
}

// Alles wat HUD, omroep en 3D van een station nodig hebben. clock: spelklok in uren, dag: dagnummer.
// treinen: de rijdende treinen (railway.getTrains()); met die lijst volgt het bord de echte treinen,
// zonder valt het terug op het rooster. schaal: spelklokseconden per echte seconde.
// Een echte trein telt alleen mee als hij binnen BORD_HORIZON spelseconden komt: een trein die in het echt
// tien minuten weg is, is op de spelklok tien uur weg en gaf een bord met willekeurige tijden (#339). Met
// minder dan BORD_MIN echte treinen vult het rooster het bord aan (dubbelen weggelaten), op volgorde van tijd.
export const BORD_HORIZON = 90 * 60, BORD_MIN = 4, BORD_N = 5;
// #1085: met `dienst` ({ rooster, dagsoort, live (Map vertragingen of null), dienst (trainservice.js bouwDienst) }) volgt het bord de ECHTE dienstregeling
// van dit station (trainschedule.js, vertrektijden uit open gegevens, verzonnen lijnnamen) met de live vertragingen erop. Elke bordrij is een
// wereldtrein: dezelfde rit (rij.rit = leg.id) met dezelfde tijden (trainservice.js legTimes); een vertrek zonder trein in de wereld staat er niet.
// Een station zonder echt rooster (of zonder rij) houdt zijn eigen dienst (hieronder, label 'Rooster (eigen dienst)').
export function stationView(station, clock, dag, treinen = null, schaal = 60, dienst = null) {
  const nu = ((clock % 24) + 24) % 24 * 3600;
  if (dienst && dienst.rooster && hasStop(dienst.rooster, station.name)) {
    const basis = rijenUitRooster(dienst.rooster, station.name, dienst.dagsoort || 'werk', nu, { aantal: BORD_N + 4, terug: 30, dienst: dienst.dienst || null });
    if (basis.length) {
      const bord = pasVertragingToe(basis, dienst.live).slice(0, BORD_N);
      const eerst = bord.find((r) => !r.vervallen) || null;
      const wacht = eerst ? eerst.tijd - nu : Infinity;
      return {
        name: station.name, nu, bord, eerst, echtRooster: true,
        drukte: perronDrukte(station.lijnen.length, nu / 3600, Number.isFinite(wacht) ? wacht : 900),
        tekst: eerst ? omroep(eerst, nu) : '',
      };
    }
  }
  const echt = (treinen ? bordUitTreinen(treinen.filter((t) => station.lijnen.includes(t.route)), station.name, nu, { aantal: 12, schaal }) : [])
    .filter((r) => r.tijd - nu <= BORD_HORIZON).slice(0, BORD_N);
  let bord = echt;
  if (echt.length < BORD_MIN) {
    const rooster = vertrekBord(station.lijnen, station.name, nu, dag, { aantal: BORD_N + 3, terug: 30 });
    const dubbel = (r) => echt.some((e) => e.lijn === r.lijn && e.richting === r.richting && Math.abs(e.tijd - r.tijd) < 600);
    bord = echt.concat(rooster.filter((r) => !dubbel(r))).sort((a, b) => a.tijd - b.tijd || a.lijn.localeCompare(b.lijn)).slice(0, BORD_N);
  }
  const eerst = bord[0] || null;
  const wacht = eerst ? eerst.tijd - nu : Infinity;
  return {
    name: station.name, nu, bord, eerst,
    drukte: perronDrukte(station.lijnen.length, nu / 3600, Number.isFinite(wacht) ? wacht : 900),
    tekst: eerst ? omroep(eerst, nu) : '',
  };
}

// Regels voor het bord: { label, cls } per cel.
export function bordCellen(view) {
  return view.bord.slice(0, 4).map((r) => ({
    t: `${tijdLabel(r.tijd)} ${r.richting}${r.spoor !== '' && r.spoor != null ? ` sp.${r.spoor}` : ''}${r.vervallen ? ' vervalt' : r.vertraging >= 60 ? ` +${Math.round(r.vertraging / 60)}` : ''}`,
    cls: r.vertraging >= 60 || r.vervallen ? 'bad' : '',
  }));
}

// De bron van het bord in woorden (#1085): { kort: 'Live' | 'Rooster' | 'Rooster (eigen dienst)', regel, eerste } voor het label en de
// regels onder het bord. De eerste regel is "Vertrekt over 4 min · 3 min vertraagd". liveStand: trainlive stand(); instelling: liveTreinen.
export function bordBron(view, { instelling = true, liveStand = null, nu = Date.now() } = {}) {
  const stand = sourceState({ instelling, stand: liveStand, nu });
  const label = bronLabel(stand, { eigenDienst: !view.echtRooster });
  const rij = view.bord.find((r) => !r.vervallen) || view.bord[0] || null;
  return { ...label, soort: view.echtRooster ? stand.soort : 'eigen', eerste: view.echtRooster ? departureLine(rij, view.nu) : '', tekst: stand.tekst };
}

// Waar reizigers staan: aan de rechterkant van het spoor (kijkrichting van de eerste lijn), verspreid
// over het perron, vaste plekken per station zodat niemand verspringt als de drukte verandert.
export const PERRON_LANG = 40, PERRON_AF = 5.2;
export function reizigerPlekken(station, n) {
  const out = [];
  let h = 0;
  for (const ch of station.name) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const nx = station.ty, ny = -station.tx; // rechts van de rijrichting
  for (let i = 0; i < n; i++) {
    const along = (rnd() * 2 - 1) * PERRON_LANG;
    const off = PERRON_AF + rnd() * 1.6;
    out.push({ x: station.x + station.tx * along + nx * off, y: station.y + station.ty * along + ny * off, hue: rnd(), size: 0.92 + rnd() * 0.16, face: Math.atan2(-ny, -nx) });
  }
  return out;
}

// Omroep: één bericht per rit en vertrekfase, niet vaker dan OMROEP_GAP. Geeft de tekst of ''.
export function omroepToestand() { return { rit: null, fase: '', at: -1e9 }; }
export function omroepStap(st, view, tijd) {
  const e = view.eerst;
  if (!e) return '';
  const wacht = e.tijd - view.nu;
  const fase = e.vertraging >= 60 ? 'laat' : wacht <= 0 ? 'nu' : wacht <= 90 ? 'klaar' : 'plan';
  const rit = `${e.lijn}|${e.k}|${e.dir}`;
  if (fase === 'plan' && st.rit !== rit && wacht > 600) return '';
  if (st.rit === rit && st.fase === fase) return '';
  if (tijd - st.at < OMROEP_GAP && st.rit === rit) return '';
  st.rit = rit; st.fase = fase; st.at = tijd;
  return view.tekst;
}

// ---- glue -------------------------------------------------------------------------------------

let stations = null;
const routesSig = []; // the stop count per route the stations were built from
let board = null;
let timeline = null;  // de tijdlijn in het bord (departuretimelineui.js)
let shown = false;
const zichtSt = bordZichtToestand();
let ost = omroepToestand();
let lastName = '';
let cur = null; // { station, view } voor de 3D-laag

export function currentStation() { return cur; }
export function allStations() { return stations || []; }

export function updateStationLife(dt, world, opts) {
  const { routes, point, day, createBoard } = opts;
  const dienst = opts.rooster ? { rooster: opts.rooster, dagsoort: opts.dagsoort, live: opts.live ? opts.live.vertragingen() : null, dienst: opts.dienst || null } : null;
  // same check as the old joined string, without building an array and a string every frame
  let same = !!stations && routesSig.length === routes.length;
  for (let i = 0; same && i < routes.length; i++) same = routesSig[i] === routes[i].stops.length;
  if (!same) {
    stations = stationsFromRoutes(routes, point);
    routesSig.length = routes.length;
    for (let i = 0; i < routes.length; i++) routesSig[i] = routes[i].stops.length;
  }
  const p = hoofdspeler(world);
  const hit = nearestStation(stations, p.x, p.y, CROWD_R);
  cur = hit ? { station: hit.station, d: hit.d, view: stationView(hit.station, world.clock || 0, day, opts.trains ? opts.trains.map((t) => ({ route: t.route, c: t.c, dir: t.dir, v: t.v, state: t.state, target: t.target, timer: t.timer, vmax: t.cfg && t.cfg.vmax })) : null, opts.schaal || 60, dienst) } : null;
  // een ander bord (machinist, minigame) gaat voor: het station laat zijn bord dan weg
  const other = opts.driving || (!shown && typeof document !== 'undefined' && document.body.classList.contains('mg-on'));
  const near = cur && cur.d < NEAR_R && !other;
  if (!near) {
    if (shown && board) board.hide();
    shown = false;
    zichtSt.stil = 0; zichtSt.zicht = false; zichtSt.weg = 0; zichtSt.x = null;
    if (!cur) lastName = '';
    return;
  }
  const zicht = bordZichtStap(zichtSt, dt, p.x, p.y);
  if (zicht.verborgen || (!zicht.zicht && !shown)) { if (shown && board) board.hide(); shown = false; return; }
  if (!board) board = createBoard('station'); // #596: het vertrekbord uit de thematabel, geen eigen hex meer
  if (!timeline && board.root && typeof board.root.querySelector === 'function') timeline = createTimeline(board.root, { before: board.root.querySelector('.mg-flash') });
  const v = cur.view;
  if (v.name !== lastName) { lastName = v.name; ost = omroepToestand(); }
  if (!shown) board.show();
  shown = true;
  if (board.root && board.root.classList) board.root.classList.toggle('stl-vervaag', !zicht.zicht); // vervaagt (CSS) terwijl de speler beweegt; zie bordZichtStap
  const bron = bordBron(v, { instelling: opts.liveInstelling !== false, liveStand: opts.live ? opts.live.stand() : null });
  board.set({
    row: `<b>${v.name}</b> &middot; ${tijdLabel(v.nu)} <em class="mg-sfeer">${bron.kort}</em>`,
    cells: null, extra: '', // de eerstvolgende treinen staan als tijdlijn onder de kop (#1085)
    flash: v.eerst && v.eerst.vertraging >= 60 ? v.eerst.reden : '',
    help: bron.regel, // de lege stand (geen treinen meer vandaag) staat in de tijdlijn zelf
  });
  if (timeline) timeline.set(buildTimeline(v));
  const msg = omroepStap(ost, v, world.time);
  if (msg) world.addMessage(msg, 5);
}


