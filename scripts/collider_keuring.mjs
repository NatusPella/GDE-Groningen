// Collider-keuring (#502, playtest 27-10): loopt over de stad en het
// buitengebied en zet elke vaste collider naast het tekenwerk dat er in het
// spel tegenover staat. Een collider zonder tekengeometrie is een onzichtbare
// muur: je loopt ergens tegenaan wat je niet ziet. De keuring telt ze op met
// coördinaat, soort en reden, zodat er een gerichte fix of issue van te maken
// is in plaats van per klacht te zoeken.
//
//   node scripts/collider_keuring.mjs                 de stad en een rand polder eromheen
//   node scripts/collider_keuring.mjs --rand=2500     een bredere rand buitengebied
//   node scripts/collider_keuring.mjs --stad          alleen de stad (snel)
//   node scripts/collider_keuring.mjs --json=out.json ook als JSON
//   node scripts/collider_keuring.mjs --max=200        meer verdachte plekken tonen
//   node scripts/collider_keuring.mjs --strict        exit 1 bij een verdachte plek
//
// Bronnen (colliders) en hun tekenwerk:
//   stad:gebouw          map.buildings, getekend door scene3d.js (elk gebouw)
//   stad:propindex       cityprops.js cellPropSpots (de propindex van de
//                        samengevoegde celmesh; elke prop heeft daar een geo)
//   stad:ringwand        elevation.js brkWalls, getekend door de ringmesh en de
//                        prop van cityprops.js registerWalls
//   stad:brugleuning     bridgerails.js railingItems; het celmesh tekent ze via
//                        streetclutter.js, maar laat een stuk weg dat op een
//                        rijbaan staat of naast de straat ligt (offStreetLevel)
//   stad:wegmeubel       streetfurniture.js furnitureColliders, getekend door
//                        streetfurniture3d.js (een soort zonder geo is onzichtbaar)
//   land:hek             countryside.js tile.walls / tile.trunks (heg, draad,
//                        stam), getekend door dezelfde push() als de instanties
//   land:polderleuning   countryrails.js polderLines, getekend door de
//                        bruggen van countryside.js genBridges
//   land:erf             countryplan.js pushOutOfPlan (schuren, silo's,
//                        werktuigen, terp, dorpshuizen), getekend door het
//                        erfmodel en de dorpsprops
//
// Het omgekeerde telt de keuring ook: tekenwerk dat wél een botsvolume heeft
// maar op het moment dat je ertegenaan loopt niet te zien is (`zichtbaar:false`
// in de tekenlijst). De marktkraampjes van cityprops.js zetten hun mesh én hun
// prop 's nachts uit, dus die vallen er niet onder; de keuring meldt het aantal
// dat ze tegenkomt in plaats van er een aan te nemen.
//
// De keuring verandert niets. Ze leest dezelfde bronnen als het spel (stad.json
// met de OSM-lagen, de polderplanning en de tegelwereld) en dezelfde regels.
// Zonder de provincie-extracten (data/cache/province) slaat ze zichzelf over,
// zoals de andere wereldaudits.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ------------------------------------------------------------------ kern
// De kern is puur (geen three.js, geen wereld): de test bouwt er een nep-wereld
// mee. Maten in meters; `half` is de halve lengte van een lijncollider (een hek,
// een leuning, een muur), `r` de dikte of de straal van een puntcollider.

const CEL = 12; // roostercel van de tekenindex (m)

function celKey(i, j) {
  return i * 100003 + j;
}

// afstand van (x, y) tot lijnstuk a-b, in het kwadraat
function segDist2(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  const px = ax + dx * t - x, py = ay + dy * t - y;
  return px * px + py * py;
}

// even-odd punt-in-polygoon (de profielen van een gebouw of een erf)
export function inPolygoon(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// de steekproefpunten van een collider: het middelpunt, elke meter langs een
// lijnstuk (zodat een hek van 40 m niet door één heg gedekt lijkt), of de
// muren van een gebouwprofiel (daar loopt de speler tegenaan, niet in het
// midden van een U-vorm)
export function steekproeven(c) {
  if (c.pts && c.pts.length > 2) {
    const out = [];
    const n = Math.min(c.pts.length, 40);
    for (let i = 0; i < n; i++) {
      const a = c.pts[i], b = c.pts[(i + 1) % n];
      out.push([a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    return out;
  }
  const half = Math.abs(c.half || 0);
  if (half < 0.05) return [[c.x, c.y]];
  const a = c.angle || 0, dx = Math.cos(a) * half, dy = Math.sin(a) * half;
  const n = Math.max(1, Math.ceil(half * 2));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = -1 + (2 * i) / n;
    out.push([c.x + dx * t, c.y + dy * t]);
  }
  return out;
}

export function tekenBBox(t) {
  if (t.pts && t.pts.length) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of t.pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  }
  if (t.seg) {
    const [ax, ay, bx, by] = t.seg;
    return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
  }
  return [t.x, t.y, t.x, t.y];
}

// dekt dit tekenwerk het punt (x, y)? `marge` is de speling waarbinnen een
// collider nog bij het tekenwerk hoort (een paal in een heg, een leuning naast
// het dek).
export function dekt(t, x, y, marge) {
  if (t.pts && t.pts.length > 2) {
    if (inPolygoon(x, y, t.pts)) return true;
    for (let i = 0; i < t.pts.length; i++) {
      const a = t.pts[i], b = t.pts[(i + 1) % t.pts.length];
      if (segDist2(x, y, a[0], a[1], b[0], b[1]) <= marge * marge) return true;
    }
    return false;
  }
  if (t.seg) {
    const [ax, ay, bx, by] = t.seg;
    const rr = (t.r || 0.2) + marge;
    return segDist2(x, y, ax, ay, bx, by) <= rr * rr;
  }
  const rr = (t.r || 0.3) + marge;
  return (x - t.x) ** 2 + (y - t.y) ** 2 <= rr * rr;
}

// De keuring zelf. `colliders` en `teken` zijn platte lijsten:
//   collider: { soort, x, y, r?, half?, angle?, pts?, bron? }
//   teken:    { soort, x, y, r? } | { soort, seg: [ax, ay, bx, by], r? } | { soort, pts: [[x, y], ...] }
// Elk teken mag `zichtbaar: false` hebben: het staat in de wereld maar je ziet
// het niet op het moment dat het je tegenhoudt (dan is het evengoed een
// onzichtbare muur).
// Geeft per collider de dekking (0..1) en de verdachte plekken terug, plus het
// omgekeerde (tekenwerk dat onzichtbaar is en tóch blokkeert).
export function keur(colliders, teken, opties = {}) {
  const marge = opties.marge ?? 0.8;
  const dekking = opties.dekking ?? 0.6;
  // strikt: alleen tekenwerk van dezelfde soort telt, en binnen een krappe
  // marge. Voor props en leuningen die één op één horen te zijn (een leuning
  // van 1,6 m verderop dekt het gat van deze sectie niet).
  const strikt = opties.strikt === true;
  const striktMarge = opties.striktMarge ?? 0.4;
  // ruimtelijke index van het tekenwerk: elke cel waar de omhullende doos van
  // een teken (plus marge) komt, wijst naar dat teken
  const index = new Map();
  for (const t of teken) {
    const [x0, y0, x1, y1] = tekenBBox(t);
    const pad = (t.pts ? 0 : t.seg ? (t.r || 0.2) : (t.r || 0.3)) + marge;
    for (let i = Math.floor((x0 - pad) / CEL); i <= Math.floor((x1 + pad) / CEL); i++) {
      for (let j = Math.floor((y0 - pad) / CEL); j <= Math.floor((y1 + pad) / CEL); j++) {
        const k = celKey(i, j);
        const lijst = index.get(k);
        if (lijst) lijst.push(t); else index.set(k, [t]);
      }
    }
  }
  const verdacht = [], onzichtbaar = [];
  let gedekt = 0;
  for (const c of colliders) {
    const punten = steekproeven(c);
    let goed = 0, zichtbaarGoed = 0, dichtstbij = Infinity;
    for (const [x, y] of punten) {
      const lijst = index.get(celKey(Math.floor(x / CEL), Math.floor(y / CEL)));
      let hit = null, hitD = Infinity;
      if (lijst) {
        for (const t of lijst) {
          if (strikt && t.soort !== c.soort) continue;
          if (!dekt(t, x, y, strikt ? striktMarge : marge)) continue;
          const [bx, by] = t.seg
            ? [(t.seg[0] + t.seg[2]) / 2, (t.seg[1] + t.seg[3]) / 2]
            : t.pts ? [t.x ?? 0, t.y ?? 0] : [t.x, t.y];
          const d = Math.hypot(bx - x, by - y);
          if (d < hitD) { hitD = d; hit = t; }
        }
      }
      if (hit) {
        goed++;
        if (hit.zichtbaar !== false) zichtbaarGoed++;
        dichtstbij = Math.min(dichtstbij, hitD);
      }
    }
    const frac = goed / punten.length;
    if (goed && !zichtbaarGoed) {
      onzichtbaar.push({ soort: c.soort, bron: c.bron, x: c.x, y: c.y, dekking: frac });
    }
    if (frac >= dekking) { gedekt++; continue; }
    verdacht.push({
      soort: c.soort, bron: c.bron, x: c.x, y: c.y,
      half: c.half || 0, angle: c.angle || 0, r: c.r || 0,
      dekking: +frac.toFixed(2),
      dichtstbij: dichtstbij === Infinity ? null : +dichtstbij.toFixed(2),
    });
  }
  return { n: colliders.length, gedekt, verdacht, onzichtbaar };
}

// ------------------------------------------------------------------ wereld
// Hieronder de echte wereld. Deze importeert het spel pas in main(), zodat de
// test alleen de kern hoeft te laden (en er geen three.js of wereld voor nodig
// heeft).

const hier = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(hier), '..');
// dynamische import van een spelmodule (op Windows moet dat een file://-URL zijn)
const spel = (naam) => pathToFileURL(path.join(ROOT, 'game/js', naam)).href;

async function laadWereld() {
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const { GameMap } = await import(spel('mapdata.js'));
  const data = await loadCityData();
  return new GameMap(data);
}

// Soorten die cityprops.js/streetclutter.js echt tekenen (elke prop komt uit
// een item met een geo in de samengevoegde celmesh). Een soort die hier niet
// in staat is een prop zonder tekengeometrie.
const STAD_PROPS_GETEKEND = new Set([
  'bench', 'bin', 'bike', 'chair', 'table', 'parasol', 'stall', 'nietje', 'planter',
  'zuil', 'container', 'bollard', 'scooter', 'kliko', 'abri', 'elecbox', 'signpost',
  'stoepbord', 'kiosk', 'rail', 'bridgerail', 'hek', 'vangrail',
]);

// Soorten die streetfurniture3d.js tekent: de switch in updateStreetFurniture3D
// en de GEOS-tabel. `lamp` staat er niet in (GAME_OPTS.lamps staat uit; de stad
// heeft haar eigen lantaarns in nightlights3d.js). Komt er ooit een lamp-item
// in deze laag, dan is elke lantaarnpaal een onzichtbare paal: de keuring zet
// hem dan in de lijst.
const WEGMEUBEL_GETEKEND = new Set([
  'guardrail', 'fence', 'hedge', 'noise', 'hectometer', 'speedbump', 'gantry', 'beam',
  'bench', 'bin', 'bikerack', 'shelter', 'bollard', 'placesign', 'wegwijzer',
]);

// Straal van een getekend polderprop (de instantie in de chunkmesh), per soort.
// Voor een heg en een draad is dat de halve lengte (2,6 m prop, 1,3 m), voor
// een boom de kroon, voor een brug het dek.
function landTekenStraal(kind) {
  if (kind.startsWith('house')) return 5;
  if (kind === 'hedge') return 1.3;
  if (kind === 'wire') return 1.3;
  if (kind === 'tree' || kind === 'poplar' || kind === 'willow') return 1;
  if (kind === 'bridge') return 5.5;
  if (kind === 'gate') return 1.5;
  if (kind === 'mound') return 29;
  if (kind === 'gas') return 8;
  if (kind === 'mestsilo') return 5;
  if (kind === 'towersilo') return 3;
  if (kind === 'feedsilo') return 1.2;
  if (kind === 'shed' || kind === 'barrack' || kind === 'clamp' || kind === 'glass' || kind === 'clubhouse') return 8;
  return 0;
}

function rectPunten(b) {
  return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
}

// De colliders en het tekenwerk per bron. Elke bron zegt zelf waarom zijn
// tekenwerk hetzelfde is als zijn collider (of niet).
async function verzamel(map, opties) {
  const bronnen = [];
  const teken = []; // het tekenwerk van alle bronnen bij elkaar: een erf mag een
                    // schuur dekken die de planbron als collider opvoert
  const [minx, miny, maxx, maxy] = map.meta.bounds;
  const rand = opties.rand;
  const band = [minx - rand, miny - rand, maxx + rand, maxy + rand];
  const inBand = (x, y) => x >= band[0] && x <= band[2] && y >= band[1] && y <= band[3];
  const stats = { cellen: 0, tegels: 0, meubeltegels: 0 };

  // --- 1. gebouwen ---------------------------------------------------------
  {
    const colliders = [];
    for (const b of map.buildings) {
      const [x0, y0, x1, y1] = b.bounds;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const h = b.h ?? b.height;
      const soort = 'gebouw';
      // een gebouw met een leeg of plat profiel tekent niets (of een streep op
      // de grond) terwijl zijn voetafdruk wel blokkeert
      if (b.pts.length >= 3 && h > 0.3) teken.push({ soort, x: cx, y: cy, pts: b.pts });
      // de collider is het profiel zelf: de speler stuit op de muren, niet op
      // het middelpunt (dat bij een U-vorm in de binnenplaats ligt)
      colliders.push({ soort, x: cx, y: cy, pts: b.pts, r: Math.max(x1 - x0, y1 - y0) / 2, bron: 'stad:gebouw' });
    }
    bronnen.push({
      naam: 'stad:gebouw',
      waarom: 'elk gebouw wordt door scene3d.js getekend; een profiel zonder hoogte niet',
      reden: 'een profiel zonder hoogte (of met minder dan drie punten) tekent niets',
      colliders,
    });
  }

  // --- 2. de propindex van de stad (cityprops.js) --------------------------
  {
    const CP = await import(spel('cityprops.js'));
    CP.initCityProps({ map, player: { x: 0, y: 0 }, vehicles: [], pedestrians: [], time: 0 });
    const CEL_C = CP.CLUTTER_CELL;
    const colliders = [];
    for (let gx = Math.floor(minx / CEL_C); gx <= Math.floor(maxx / CEL_C); gx++) {
      for (let gy = Math.floor(miny / CEL_C); gy <= Math.floor(maxy / CEL_C); gy++) {
        stats.cellen++;
        for (const p of CP.cellPropSpots(map, gx, gy)) {
          // de propindex van het spel: elke prop heeft een item met een geo in
          // de celmesh; een soort buiten de getekende lijst is een post zonder
          // tekening (en dus een onzichtbare paal)
          const soort = p.kind;
          const half = p.half || 0;
          const r = p.r || 0.3;
          if (STAD_PROPS_GETEKEND.has(soort)) {
            teken.push({ soort, x: p.x, y: p.y, r: r + half });
          }
          colliders.push({
            soort, x: p.x, y: p.y, r, half, angle: p.angle || 0,
            bron: 'stad:propindex',
          });
        }
      }
    }
    bronnen.push({
      naam: 'stad:propindex',
      waarom: 'de propindex van de celmesh (cityprops.js/streetclutter.js)',
      reden: 'de soort staat niet in de getekende lijst van cityprops/streetclutter',
      colliders, strikt: true,
    });
  }

  // --- 3. de ringwanden (elevation.js) -------------------------------------
  if (map.elev && map.elev.has) {
    const colliders = [];
    // de ringmesh tekent elk stuk uit elev.walls (drawOnly stukken uitgezonderd:
    // die hebben bewust geen botsvolume)
    for (const w of map.elev.walls) {
      if (w.drawOnly) continue;
      teken.push({ soort: 'ringwand', seg: [w.ax, w.ay, w.bx, w.by], r: 0.2 });
    }
    for (const w of map.elev.brkWalls) {
      const x = (w.ax + w.bx) / 2, y = (w.ay + w.by) / 2;
      if (!inBand(x, y)) continue;
      colliders.push({
        soort: 'ringwand', x, y, r: 0.2,
        half: Math.hypot(w.bx - w.ax, w.by - w.ay) / 2,
        angle: Math.atan2(w.by - w.ay, w.bx - w.ax),
        bron: 'stad:ringwand',
      });
    }
    bronnen.push({
      naam: 'stad:ringwand',
      waarom: 'de ringmesh tekent dezelfde stukken; het breekbare deel is een prop van cityprops.js',
      reden: 'het stuk staat niet in de ringmesh (elevation.js walls)',
      colliders,
    });
  }

  // --- 4. brugleuningen ----------------------------------------------------
  {
    const BR = await import(spel('bridgerails.js'));
    const colliders = [];
    for (const r of map.roads) {
      if (!BR.hasRailings(r) || r.movable) continue;
      for (const it of BR.railingItems(map, r)) {
        if (!inBand(it.x, it.y)) continue;
        // Het tekenwerk van een leuning is de prop in de celmesh (soort
        // bridgerail, bron stad:propindex). cityprops.js laat een item weg dat
        // op een rijbaan staat of naast de straat ligt (offLimits), terwijl
        // resolveRailings de voet er wel tegenhoudt: een hekje dat je niet
        // ziet (#502, playtest 27-10).
        colliders.push({
          soort: 'bridgerail', x: it.x, y: it.y, r: 0.12, half: 1, angle: it.angle,
          bron: 'stad:brugleuning',
        });
      }
    }
    bronnen.push({
      naam: 'stad:brugleuning',
      waarom: 'streetclutter.js tekent dezelfde secties uit bridgerails.js in de celmesh',
      reden: 'het celmesh laat een sectie op een rijbaan of naast de straat weg (offLimits); resolveRailings hield hem toch',
      colliders, strikt: true,
    });
  }

  // --- 5. wegmeubel (streetfurniture) --------------------------------------
  {
    const SF = await import(spel('streetfurniture.js'));
    const G = await import(spel('gdt.js'));
    const TILE_M = G.TILE_M ?? 1000;
    const colliders = [];
    const opts = { lamps: false, bollards: false, livingBumps: false, towns: [] };
    const i0 = Math.floor(band[0] / TILE_M), i1 = Math.floor(band[2] / TILE_M);
    const j0 = Math.floor(band[1] / TILE_M), j1 = Math.floor(band[3] / TILE_M);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const x0 = G.GRID_X0 + i * TILE_M, y0 = G.GRID_Y0 + j * TILE_M;
        const cx = x0 + TILE_M / 2, cy = y0 + TILE_M / 2;
        const roads = map.roadsNear(cx, cy, TILE_M * 0.71 + 220);
        // dezelfde aanroep als streetfurniture3d.js tileItems
        const mapped = (map.furniture || []).filter((m) => {
          const p = m.pts ? m.pts : [[m.x, m.y]];
          return p.some((q) => q[0] >= x0 - 50 && q[0] < x0 + TILE_M + 50 && q[1] >= y0 - 50 && q[1] < y0 + TILE_M + 50);
        });
        const water = map.waterNear(cx, cy, TILE_M * 0.71 + 60);
        const rails = (map.railNear ? map.railNear(cx, cy, TILE_M * 0.71 + 60) : []).concat(map.rails || []);
        const buildings = map.buildingsNear(cx, cy, TILE_M * 0.71 + 60);
        const res = SF.furnitureForTile({
          x0, y0, size: TILE_M, roads, mapped, water, rails, buildings, places: [], opts,
        });
        stats.meubeltegels++;
        for (const it of res.items) {
          if (!inBand(it.x, it.y)) continue;
          // streetfurniture3d.js tekent het item als zijn soort in de switch of
          // in GEOS staat. De collider heeft een eigen soortnaam (guardrail ->
          // vangrail, bikerack -> rail, ...): het tekenwerk krijgt die naam,
          // zodat de keuring per collider kan vergelijken.
          const tekent = WEGMEUBEL_GETEKEND.has(it.k);
          for (const c of SF.furnitureColliders([it])) {
            if (tekent) {
              const a = c.angle || 0, hl = c.half || 0;
              teken.push({
                soort: c.kind, x: c.x, y: c.y, r: c.r || 0.3,
                seg: hl ? [c.x - Math.cos(a) * hl, c.y - Math.sin(a) * hl, c.x + Math.cos(a) * hl, c.y + Math.sin(a) * hl] : undefined,
              });
            }
            colliders.push({
              soort: c.kind, x: c.x, y: c.y, r: c.r || 0.3, half: c.half || 0,
              angle: c.angle || 0, bron: 'stad:wegmeubel',
            });
          }
        }
      }
    }
    bronnen.push({
      naam: 'stad:wegmeubel',
      waarom: 'streetfurniture3d.js tekent per soort (de GEOS-tabel); een soort zonder geo is onzichtbaar',
      reden: 'de soort heeft geen geo in streetfurniture3d (de switch of GEOS)',
      colliders, strikt: true,
    });
  }

  // --- 6/7/8. het buitengebied --------------------------------------------
  if (!opties.stad) {
    const F = await import(spel('countryfield.js'));
    const CP = await import(spel('countryplan.js'));
    const CS = await import(spel('countryside.js'));
    const CR = await import(spel('countryrails.js'));
    // het polderplan rekent met de randen van de kaart (dezelfde voorbereiding
    // als het spel in main.js doet)
    F.setCountryBounds(map.meta.bounds);
    CP.ensureCountryEdge(map);

    const TILE = 160;
    const tegels = new Map();
    const tegel = (tx, ty) => {
      const k = tx + ',' + ty;
      let t = tegels.get(k);
      if (!t) { t = CS.countryTileItems(tx, ty); tegels.set(k, t); }
      return t;
    };
    const tx0 = Math.floor(band[0] / TILE), tx1 = Math.floor(band[2] / TILE);
    const ty0 = Math.floor(band[1] / TILE), ty1 = Math.floor(band[3] / TILE);

    // --- 6. heggen, draden en stammen ------------------------------------
    {
      const colliders = [];
      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = ty0; ty <= ty1; ty++) {
          const t = tegel(tx, ty);
          stats.tegels++;
          const items = t.items;
          // wat de chunkmesh van deze tegel tekent, als tekenwerk. Een heg en
          // een draad zijn langs hun lokale x geschaald (fenceLine zet één
          // draad van 70 m neer), dus die worden een lijnstuk en geen punt.
          for (const k of Object.keys(items)) {
            const r = landTekenStraal(k);
            if (!r) continue;
            const m = items[k].m;
            for (let i = 0; i < m.length; i += 16) {
              const x = m[i + 12], y = m[i + 14];
              const hx = m[i] / 2, hy = m[i + 2] / 2; // halve lengte langs de lokale x
              if ((k === 'hedge' || k === 'wire') && Math.hypot(hx, hy) > 0.1) {
                teken.push({ soort: k, x, y, seg: [x - hx, y - hy, x + hx, y + hy], r: 0.3 });
              } else if (k === 'gas') {
                // het gaswinningsmodel (countrymodels.js gasSiteGeometry) is
                // 56 x 40 m en staat met zijn linkerkant op de plek van het
                // item; het hek staat op de rand van dat vlak
                teken.push({ soort: k, x, y, pts: rectPunten([x, y - 20, x + 56, y + 20]) });
              } else {
                teken.push({ soort: k, x, y, r });
              }
              // een boomstam is ook tekenwerk van de stam-collider (de kroon
              // staat eromheen; de stam zelf is het smalle deel)
              if (k === 'tree' || k === 'poplar' || k === 'willow') {
                teken.push({ soort: 'stam', x, y, r: 0.3 });
              }
            }
          }
          // de muren (heg, draad) en stammen die countryside.js push() én
          // countrywalls.js registreert
          const W = t.walls || [];
          for (let i = 0; i < W.length; i += 6) {
            const ax = W[i], ay = W[i + 1], bx = W[i + 2], by = W[i + 3];
            const x = (ax + bx) / 2, y = (ay + by) / 2;
            if (!inBand(x, y)) continue;
            colliders.push({
              // de dikte verraadt de soort: een heg is een halve meter dik,
              // een draad 8 cm (countryside.js push() zet wall[1] hier neer)
              soort: W[i + 5] > 0.2 ? 'hedge' : 'wire', x, y, r: W[i + 5],
              half: Math.hypot(bx - ax, by - ay) / 2,
              angle: Math.atan2(by - ay, bx - ax), bron: 'land:hek',
            });
          }
          const T = t.trunks || [];
          for (let i = 0; i < T.length; i += 6) {
            if (!inBand(T[i], T[i + 1])) continue;
            colliders.push({ soort: 'stam', x: T[i], y: T[i + 1], r: T[i + 5], bron: 'land:hek' });
          }
        }
      }
      bronnen.push({
        naam: 'land:hek',
        waarom: 'countryside.js push() zet de muur en de instantie in één keer neer; ze horen bij dezelfde tegel',
        reden: 'de muur of stam staat niet bij een getekende heg, draad of boom',
        colliders, strikt: true,
      });
    }

    // --- 7. de leuningen van de polderbruggen ----------------------------
    {
      const colliders = [];
      const gehad = new Set();
      const BLOCK = F.BLOCK, RC = F.ROAD_IN + F.ROAD_W / 2;
      const b0x = Math.floor(band[0] / BLOCK), b1x = Math.floor(band[2] / BLOCK);
      const b0y = Math.floor(band[1] / BLOCK), b1y = Math.floor(band[3] / BLOCK);
      for (let bx = b0x; bx <= b1x; bx++) {
        for (let by = b0y; by <= b1y; by++) {
          const X = bx * BLOCK, Y = by * BLOCK;
          for (const [qx, qy] of [[X + RC, Y], [X, Y + RC]]) {
            const L = CR.countryRailsNear(qx, qy, 0);
            for (let i = 0; i < L.length; i += 4) {
              const ax = L[i], ay = L[i + 1], bx2 = L[i + 2], by2 = L[i + 3];
              const x = (ax + bx2) / 2, y = (ay + by2) / 2;
              // alleen de lijnen van dit kruispunt (countryRailsNear geeft ook
              // de buren binnen zijn venster)
              if (Math.hypot(x - qx, y - qy) > 5.6) continue;
              const k = Math.round(x * 10) + ',' + Math.round(y * 10);
              if (gehad.has(k)) continue;
              gehad.add(k);
              if (!inBand(x, y)) continue;
              // de brug van genBridges staat op hetzelfde kruispunt; hij wordt
              // in de tegel van het kruispunt gezet, dat net naast de tegel van
              // het lijnmidden kan liggen (het midden ligt 2,95 m naast de weg)
              let brug = false;
              for (const [sx, sy] of [[x, y], [qx, qy]]) {
                const it = tegel(Math.floor(sx / TILE), Math.floor(sy / TILE)).items.bridge;
                if (!it) continue;
                for (let q = 0; q < it.m.length; q += 16) {
                  if (Math.hypot(it.m[q + 12] - x, it.m[q + 14] - y) <= 5) { brug = true; break; }
                }
                if (brug) break;
              }
              if (brug) teken.push({ soort: 'brug', x, y, r: 5.5 });
              colliders.push({
                soort: 'leuning', x, y, r: 0.12,
                half: Math.hypot(bx2 - ax, by2 - ay) / 2,
                angle: Math.atan2(by2 - ay, bx2 - ax), bron: 'land:polderleuning',
              });
            }
          }
        }
      }
      bronnen.push({
        naam: 'land:polderleuning',
        waarom: 'countryside.js genBridges tekent de brug op dezelfde plek als countryrails.js de leuning neerzet',
        reden: 'er staat geen bruggetekening op dit kruispunt',
        colliders,
      });
    }

    // --- 8. erven, terpen en dorpshuizen ---------------------------------
    {
      const colliders = [];
      const BLOCK = F.BLOCK;
      const b0x = Math.floor(band[0] / BLOCK), b1x = Math.floor(band[2] / BLOCK);
      const b0y = Math.floor(band[1] / BLOCK), b1y = Math.floor(band[3] / BLOCK);
      for (let bx = b0x; bx <= b1x; bx++) {
        for (let by = b0y; by <= b1y; by++) {
          const P = CP.blockPlan(bx, by);
          if (!P) continue;
          for (const f of P.farms) {
            // het erfmodel tekent het hele erf (de schuren zitten in de fkhr/
            // folda/fsmall/fdairy-pool), dus zijn `full`-vlak is het tekenwerk
            const fd = CP.farmDetail(f);
            teken.push({ soort: 'erf', x: f.x, y: f.y, pts: rectPunten(f.full) });
            for (const b of fd.boxes) {
              const x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2;
              if (!inBand(x, y)) continue;
              const w = b[2] - b[0], h = b[3] - b[1];
              colliders.push({ soort: 'erfschuur', x, y, r: Math.min(w, h) / 2, half: Math.max(w, h) / 2, angle: w > h ? 0 : Math.PI / 2, bron: 'land:erf' });
            }
            for (const c of fd.circles) {
              if (!inBand(c.x, c.y)) continue;
              colliders.push({ soort: 'silo', x: c.x, y: c.y, r: c.r, bron: 'land:erf' });
            }
          }
          if (P.gas) {
            const g = P.gas;
            const gx = (g.box[0] + 2 + g.box[2]) / 2, gy = (g.box[1] + g.box[3]) / 2;
            if (inBand(gx, gy)) {
              colliders.push({
                soort: 'gasterrein', x: gx, y: gy,
                r: 1, half: (g.box[2] - g.box[0]) / 2, angle: 0, bron: 'land:erf',
              });
            }
          }
          for (const v of [P.village, P.villageE]) {
            if (!v) continue;
            for (const c of CP.villagePlan(v).colliders) {
              if (!inBand(c.x, c.y)) continue;
              // de terp (r 23) is het dorpseiland; de huizen zijn echte muren
              colliders.push({ soort: c.r > 10 ? 'terp' : 'dorpshuis', x: c.x, y: c.y, r: c.r, bron: 'land:erf' });
            }
          }
        }
      }
      bronnen.push({
        naam: 'land:erf',
        waarom: 'countryplan.js bouwt de colliders uit dezelfde items als het erfmodel en de dorpsprops',
        reden: 'het erf- of dorpsmodel staat er niet (of niet op deze plek)',
        colliders,
      });
    }
  }

  return { bronnen, teken, stats };
}

// ------------------------------------------------------------------ rapport

const rond = (v) => Math.round(v * 10) / 10;

export function rapport(uitslagen, opties = {}) {
  const max = opties.max ?? 40;
  const regels = [];
  const totaal = uitslagen.reduce((a, u) => a + u.colliders.length, 0);
  const verdacht = uitslagen.reduce((a, u) => a + u.uitkomst.verdacht.length, 0);
  const onzichtbaar = uitslagen.reduce((a, u) => a + u.uitkomst.onzichtbaar.length, 0);
  regels.push(`collider_keuring: ${totaal} colliders, ${verdacht} zonder tekenwerk, ${onzichtbaar} onzichtbaar tekenwerk met botsvolume`);
  regels.push('');
  regels.push('per bron'.padEnd(24) + 'colliders'.padStart(10) + 'verdacht'.padStart(10) + '  waarom het tekenwerk klopt');
  for (const u of uitslagen) {
    regels.push(
      u.naam.padEnd(24) + String(u.colliders.length).padStart(10) +
      String(u.uitkomst.verdacht.length).padStart(10) + '  ' + u.waarom,
    );
  }
  for (const u of uitslagen) {
    const v = u.uitkomst.verdacht;
    if (!v.length) continue;
    regels.push('');
    regels.push(`== ${u.naam}: ${v.length} verdacht ==`);
    // eerst de plekken waar de collider helemaal geen tekenwerk heeft
    v.sort((a, b) => a.dekking - b.dekking || a.x - b.x);
    for (const s of v.slice(0, max)) {
      const half = s.half ? ` half ${rond(s.half)} m` : '';
      const d = s.dichtstbij === null ? 'geen tekenwerk in de buurt' : `dichtstbijzijnd tekenwerk ${s.dichtstbij} m`;
      const waarom = u.reden ? ` — ${u.reden}` : '';
      regels.push(`  (${rond(s.x)}, ${rond(s.y)}) ${s.soort.padEnd(12)} dekking ${Math.round(s.dekking * 100)}%${half} — ${d}${waarom}`);
    }
    if (v.length > max) regels.push(`  ... en ${v.length - max} meer (--max=${v.length} voor alles, of --json)`);
  }
  for (const u of uitslagen) {
    if (!u.uitkomst.onzichtbaar.length) continue;
    regels.push('');
    regels.push(`== ${u.naam}: ${u.uitkomst.onzichtbaar.length} keer tekenwerk dat je niet ziet maar wel blokkeert ==`);
    for (const s of u.uitkomst.onzichtbaar.slice(0, max)) {
      regels.push(`  (${rond(s.x)}, ${rond(s.y)}) ${s.soort} — het tekenwerk is verborgen (zichtbaar:false) maar het botsvolume staat er`);
    }
  }
  return regels;
}

async function main() {
  await import(pathToFileURL(path.join(ROOT, 'scripts/node3d.mjs')).href);
  const args = process.argv.slice(2);
  const opt = (k) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
  const opties = {
    rand: Number(opt('rand') ?? 1200),
    stad: args.includes('--stad'),
    max: Number(opt('max') ?? 40),
  };
  const map = await laadWereld();
  const t0 = performance.now();
  const { bronnen, teken, stats } = await verzamel(map, opties);
  const uitslagen = bronnen.map((b) => ({
    ...b,
    uitkomst: keur(b.colliders, teken, { marge: 0.8, dekking: 0.6, strikt: b.strikt }),
  }));
  console.log(rapport(uitslagen, opties).join('\n'));
  console.log('');
  console.log(`(${stats.cellen} propcellen, ${stats.tegels} landtegels, ${stats.meubeltegels} meubeltegels, ${teken.length} tekenstukken, ${((performance.now() - t0) / 1000).toFixed(1)} s)`);
  if (opt('json')) {
    const fs = await import('node:fs');
    fs.writeFileSync(opt('json'), JSON.stringify({
      stats,
      teken: teken.length,
      bronnen: uitslagen.map((u) => ({ naam: u.naam, colliders: u.colliders.length, verdacht: u.uitkomst.verdacht, onzichtbaar: u.uitkomst.onzichtbaar })),
    }, null, 1));
  }
  const verdacht = uitslagen.reduce((a, u) => a + u.uitkomst.verdacht.length, 0);
  process.exit(args.includes('--strict') && verdacht > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === hier) await main();
