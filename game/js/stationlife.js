// Stationsleven (#198, #14): het vertrekbord, de omroep en de perrondrukte van het station
// bij de speler, uit dienstregeling.js. Het deel zonder wereld is puur (testbaar zonder
// browser: scripts/stationlife_test.mjs); updateStationLife hangt het aan HUD en geluid.
import { vertrekBord, bordUitTreinen, omroep, perronDrukte, tijdLabel, VERVOERDER } from './dienstregeling.js';

export const NEAR_R = 45;      // m: zo dichtbij moet je bij het perron zijn voor bord en omroep
export const CROWD_R = 140;    // m: zo dichtbij worden reizigers getekend
export const OMROEP_GAP = 75;  // s spelklok tussen twee berichten van dezelfde rit

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

// Alles wat HUD, omroep en 3D van een station nodig hebben. clock: spelklok in uren, dag: dagnummer.
// treinen: de rijdende treinen (railway.getTrains()); met die lijst volgt het bord de echte treinen,
// zonder valt het terug op het rooster. schaal: spelklokseconden per echte seconde.
// Een echte trein telt alleen mee als hij binnen BORD_HORIZON spelseconden komt: een trein die in het echt
// tien minuten weg is, is op de spelklok tien uur weg en gaf een bord met willekeurige tijden (#339). Met
// minder dan BORD_MIN echte treinen vult het rooster het bord aan (dubbelen weggelaten), op volgorde van tijd.
export const BORD_HORIZON = 90 * 60, BORD_MIN = 4, BORD_N = 5;
export function stationView(station, clock, dag, treinen = null, schaal = 60) {
  const nu = ((clock % 24) + 24) % 24 * 3600;
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
    t: `${tijdLabel(r.tijd)} ${r.richting} sp.${r.spoor}${r.vertraging >= 60 ? ` +${Math.round(r.vertraging / 60)}` : ''}`,
    cls: r.vertraging >= 60 ? 'bad' : '',
  }));
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
let routesSig = '';
let board = null;
let shown = false;
let ost = omroepToestand();
let lastName = '';
let cur = null; // { station, view } voor de 3D-laag

export function currentStation() { return cur; }
export function allStations() { return stations || []; }

export function updateStationLife(dt, world, opts) {
  const { routes, point, day, createBoard } = opts;
  const sig = routes.length + ':' + routes.map((r) => r.stops.length).join(',');
  if (!stations || sig !== routesSig) { stations = stationsFromRoutes(routes, point); routesSig = sig; }
  const p = world.player;
  const hit = nearestStation(stations, p.x, p.y, CROWD_R);
  cur = hit ? { station: hit.station, d: hit.d, view: stationView(hit.station, world.clock || 0, day, opts.trains ? opts.trains.map((t) => ({ route: t.route, c: t.c, dir: t.dir, v: t.v, state: t.state, target: t.target, timer: t.timer, vmax: t.cfg && t.cfg.vmax })) : null, opts.schaal || 60) } : null;
  // een ander bord (machinist, minigame) gaat voor: het station laat zijn bord dan weg
  const other = opts.driving || (!shown && typeof document !== 'undefined' && document.body.classList.contains('mg-on'));
  const near = cur && cur.d < NEAR_R && !other;
  if (!near) {
    if (shown && board) board.hide();
    shown = false;
    if (!cur) lastName = '';
    return;
  }
  if (!board) board = createBoard(`${VERVOERDER} · vertrekbord`, '#e8b02a');
  const v = cur.view;
  if (v.name !== lastName) { lastName = v.name; ost = omroepToestand(); }
  board.show();
  shown = true;
  board.set({
    row: `<b>${v.name}</b> &middot; ${tijdLabel(v.nu)}`,
    cells: bordCellen(v),
    flash: v.eerst && v.eerst.vertraging >= 60 ? v.eerst.reden : '',
    help: v.bord.length ? '' : 'Geen treinen meer vandaag',
  });
  const msg = omroepStap(ost, v, world.time);
  if (msg) world.addMessage(msg, 5);
}
