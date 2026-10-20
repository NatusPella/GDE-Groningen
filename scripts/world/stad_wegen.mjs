// Wegen en spoor van de stad uit de gedeelde OSM-tegelbouw (#90 fase B3/B4, STAD_LAAG=roads,rails).
//
// De tegels knippen een weg in stukken van een tegel; de stad heeft hele wegen met hoogteprofiel. Daarom
// luistert deze module mee in buildProvince (`collect`: de hele wegen en sporen van een pack, ná de afleiding
// en het koppelen van de verkeerslichten) en doet daarna wat build_map.py deed, in JS:
//
//   wegen      knippen op de dekking van de stad (de overlaytegels dekken de rest), stadssnelheid
//   hoogtes    ring_elevation.mjs (add_elevation.py) > profile.mjs (de oplosser) > railprofile.mjs > profile.mjs > railprofile.mjs
//   spoor      stad_spoor.mjs (add_railways.py: sporen, stations, overwegen, routes, liften, paden afgeknipt bij het spoor)
//   handwerk   mapextras (busRoads, busLanes, roadZ) komt via applyMapExtras op de OSM-wegen, op coördinaat;
//              de busbanen en beschermde wegen gaan mee in de oplosser zoals bij de oude keten
//   lichten    meta.trafficLights uit de OSM-knopen (junction_tiles.mjs snapSignals)
import { ROAD_SPEC } from '../../game/js/worldbuilder.js';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { ringHeights, railItemsFrom } from './ring_elevation.mjs';
import { cityRail, cutPathsAtRails } from './stad_spoor.mjs';
import * as PR from './profile.mjs';
import * as RP from './railprofile.mjs';

// ------------------------------------------------------------------ verzamelen

// collect-haak voor buildProvince; result(): { roads, lights, elements } zonder dubbelen van twee packs
export function collector() {
  const roads = [], seen = new Set(), lights = [], seenLight = new Set(), elements = [], seenEl = new Set();
  return {
    collect(feats, info) {
      for (const f of feats) {
        if (f.kind !== 'roads') continue;
        const key = `${f.row.osm}:${f.row.pts[0][0]},${f.row.pts[0][1]}`;
        if (f.row.osm !== undefined && seen.has(key)) continue;
        seen.add(key);
        roads.push(f.row);
      }
      for (const l of info.lights) {
        const k = `${l.x},${l.y}`;
        if (!seenLight.has(k)) { seenLight.add(k); lights.push(l); }
      }
      for (const el of info.els) {
        const t = el.tags || {};
        if (!t.railway && t.public_transport !== 'platform') continue;
        const id = el.type + el.id;
        if (seenEl.has(id)) continue;
        seenEl.add(id);
        elements.push(el);
      }
    },
    result: () => ({ roads, lights, elements }),
  };
}

// ------------------------------------------------------------------ wegen

// een weg van de OSM-bouw als rij van de stadskaart: de stad kende geen dorpssnelheid en geen _-sleutels
export function cityRoadRow(row) {
  const out = {};
  for (const k of Object.keys(row)) if (k[0] !== '_' && row[k] !== undefined) out[k] = k === 'pts' ? row[k].map((p) => p.slice()) : row[k];
  const spec = ROAD_SPEC[row.type];
  if (spec) out.speed = spec.speed;
  return out;
}

// De stukken van een weg binnen de dekking (binnen(x, y)): alleen daar knippen waar een stuk de rand kruist, de
// hoekpunten blijven, zodat de weg niet verdicht wordt. Het stuk dat buiten valt is aan de overlaytegels.
export function cutToCover(roads, inside, step = 10) {
  const out = [];
  for (const r of roads) {
    const P = r.pts;
    const ins = P.map((p) => inside(p[0], p[1]));
    let allIn = true;
    for (let i = 0; i < P.length - 1 && allIn; i++) {
      if (!ins[i] || !ins[i + 1]) { allIn = false; break; }
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
      for (let t = 1; t < n; t++) if (!inside(ax + ((bx - ax) * t) / n, ay + ((by - ay) * t) / n)) { allIn = false; break; }
    }
    if (allIn) { out.push(r); continue; }
    let run = null;
    const flush = () => { if (run && run.length > 1) out.push({ ...r, pts: run }); run = null; };
    for (let i = 0; i < P.length; i++) {
      if (i > 0) {
        // binnen het stuk i-1 -> i: waar de status wisselt, het wisselpunt (op `step` m)
        const [ax, ay] = P[i - 1], [bx, by] = P[i];
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
        let state = ins[i - 1];
        for (let t = 1; t <= n; t++) {
          const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
          const s = t === n ? ins[i] : inside(x, y);
          if (s === state) continue;
          const q = [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
          if (state) { (run || (run = [P[i - 1]])).push(q); flush(); } else run = [q];
          state = s;
        }
        if (state) (run || (run = [P[i - 1]])).push(P[i]);
        else run = null;
      } else if (ins[0]) run = [P[0]];
    }
    flush();
  }
  return out;
}

// ------------------------------------------------------------------ hoogtes

const noTerrain = () => 0;
const lcPoints = (d) => (d.levelCrossings || []).map((c) => [c.x, c.y]);

// profile.mjs main(): de oplosser tot niets meer verandert, hoogstens drie rondes
function solveRoads(d, protect) {
  let passes = 0;
  for (let pass = 0; pass < 3; pass++) {
    const sol = PR.solve(d, { terrain: noTerrain, protect });
    const res = PR.apply(d, sol);
    passes++;
    if (!res.changed && !res.cleared && !sol.pts.size) break;
  }
  return passes;
}
function solveRails(d) {
  const sol = RP.solve(d, {});
  const res = RP.apply(d, sol);
  return { changed: res.changed, shortfall: sol.shortfall.length };
}

// de pack-elementen met `geometry` ({lat, lon}), zoals railprofile.mjs (matchRailTags, platformsFrom) ze leest
const withGeometry = (els) => els.filter((e) => e.type === 'way').map((e) => ({ ...e, geometry: (e.g || []).map(([lat, lon]) => ({ lat, lon })) }));

// d: de stadsdata (GameMap-invoer vóór de mapextras); wegen: collector().result(); extras: mapextras.json (geladen)
// lagen: 'roads' en/of 'rails'; inside(x, y): de dekking van de stad. Geeft een verslag.
export function profileCity(d, wegen, { lagen, extras = {}, inside }) {
  const wantRoads = lagen.includes('roads'), wantRails = lagen.includes('rails');
  const rep = { roads: 0, passes: 0 };
  const bounds = d.meta.bounds;
  const inRect = (x, y, m = 0) => x >= bounds[0] - m && x <= bounds[2] + m && y >= bounds[1] - m && y <= bounds[3] + m;
  if (wantRoads) {
    d.roads = cutToCover(wegen.roads.map(cityRoadRow), inside);
    d.meta.trafficLights = wegen.lights.filter((l) => inRect(l.x, l.y)).map((l) => ({ ...l }));
    rep.roads = d.roads.length;
  }
  const elements = wegen.elements, geomEls = withGeometry(elements);
  const railsRaw = railItemsFrom(elements.filter((e) => e.type === 'way'), wgsToWorld);
  // de busbanen en beschermde wegen van het handwerk gaan mee (profile.mjs main)
  const bus = busWays(d, extras);
  const protect = PR.protectedRoads(d, extras);
  const solveAll = () => { for (const { road } of bus) d.roads.push(road); rep.passes += solveRoads(d, protect); d.roads = d.roads.filter((r) => !bus.some((b) => b.road === r)); };
  const saved = { rails: d.rails, levelCrossings: d.levelCrossings, railLifts: d.railLifts, railPlatforms: d.railPlatforms };
  if (wantRoads) {
    rep.ring = ringHeights(d, railsRaw);
    // (de volgorde van build_map.py: de eerste ronde zonder spoor)
    if (wantRails) Object.assign(d, { rails: [], levelCrossings: [], railLifts: [], railPlatforms: [] });
    solveAll();
  }
  if (wantRails) {
    const r = cityRail({ elements, roads: d.roads, bounds });
    Object.assign(d, { rails: r.rails, stations: r.stations, levelCrossings: r.levelCrossings, railRoutes: r.railRoutes, railLifts: r.railLifts });
    rep.rails = { rails: r.rails.length, stations: r.stations.length, levelCrossings: r.levelCrossings.length, routes: r.railRoutes.length, lifts: r.railLifts.length, cut: r.cut };
    rep.railTags = RP.matchRailTags(d.rails, geomEls);
    d.railPlatforms = RP.platformsFrom(geomEls).filter((p) => { const q = p.pts[Math.floor(p.pts.length / 2)]; return inRect(q[0], q[1], 150); });
    rep.rail1 = solveRails(d);
    solveAll();
    rep.rail2 = solveRails(d);
  } else if (wantRoads) {
    // de oude sporen blijven: de paden bij het spoor afknippen en de wegen er nog eens tegen oplossen
    Object.assign(d, saved);
    const lifts = d.railLifts || [];
    rep.cut = cutPathsAtRails(d.roads, d.rails || [], lifts, lcPoints(d));
    solveAll();
  } else if (wantRails) rep.skipped = true;
  if (bus.length) restoreBus(bus);
  return rep;
}

// ------------------------------------------------------------------ handwerk

function busWays(d, extras) { return extras.busRoads ? PR.busRoadsOf(d, extras) : []; }
function restoreBus(bus) { return PR.restoreBusRoads(bus); }
