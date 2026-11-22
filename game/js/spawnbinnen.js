// Binnenspawn (wens van de eigenaar, 22-11): verschijnt de speler bij een thuisplek, dan staat hij BINNEN in de woning en niet
// beneden voor de deur. Eén algemene regel voor alle woningen (docs/SPAWN-BINNEN-22-11.md): deze module beslist alleen (puur, geen DOM,
// geen wereld, geen THREE) en kiest de plek binnen; home.js (de flat in Paddepoel, via flatplan.js) en interiors.js (een pand met een
// gewoon interieur) doen het bouwen en het neerzetten.
//
//   chooseSpawn(inv)            wat gebeurt er in deze situatie? -> { plek: 'binnen' | 'buiten' | 'houd', type, reden }
//   chooseFlatSpawn(plan, ...)  de plek in de flat (woonkamer, kijkend naar het glas), met de bestaande botsing; anders de liftuitgang
//   chooseHomePropertySpawn(plan)       de plek in de hal van een pand met een interieur (loopbaar, vrij van meubels, deur bereikbaar)
//   makeIndoorWait / tickBinnenWacht  het laadscherm wacht op het interieur; een time-out valt terug op buiten voor de deur
//
// Samen spelen: elke speler is lokale hoofdpersoon. De binnenspawn is lokaal per speler en stuurt niets over het net; het interieur
// is lokaal (de ander zie je binnen of door het raam). Een gast die aansluit komt bij de host (buiten); zie docs/COOP-GAST.md.
import { walkGrid, reachable, reachableAt, rectOf, CELL, PLAYER_R } from './interiorlayout.js';
import { toWorld, dirToWorld } from './interiorframe.js';
import { FLAT_W, FLAT_D } from './flatplan.js';

// Alle situaties waarin de speler bij een thuisplek kan verschijnen (de rijen van de spawnmatrix in het doc).
export const SITUATIES = ['nieuw-spel', 'opening', 'laden', 'slapen', 'naar-huis', 'reis-thuis', 'missie-thuis', 'ziekenhuis', 'hostwissel', 'gast-aansluit'];

export const BINNEN_MAX_S = 6; // zo lang wacht het laadscherm op het interieur; daarna valt de speler terug op buiten

// Wat voor binnenkant heeft dit thuis? 'flat' (home.js bouwt hem), 'pand' (een Bezit-pand: het gewone interieur van interiors.js,
// de homebase.js `ref` wijst naar het pand) of 'geen' (er is nog geen interieur: Oma's logeerkamer, het havenkantoor, Tinus' schuur, de wagen).
export function interieurType(home) {
  if (!home) return 'geen';
  if (home.kind === 'flat') return 'flat';
  if (home.kind === 'pand' && home.ref != null) return 'pand';
  return 'geen';
}

// inv: { situatie, instelling (startBinnen, standaard aan), thuis (een homebase-thuis of null), rol ('solo' | 'host' | 'gast'),
//        saveCtx ('home' | 'busy' | 'free' | undefined, uit de save), binnenSave (true | false | undefined: stond de speler binnen
//        toen hij opsloeg?), interieurKlaar (false: het pand kon niet worden gebouwd) }
export function chooseSpawn(inv = {}) {
  const { situatie, instelling = true, thuis = null, rol = 'solo', saveCtx, binnenSave, interieurKlaar = true } = inv;
  const type = interieurType(thuis);
  const uit = (plek, reden) => ({ plek, type, reden });
  switch (situatie) {
    case 'nieuw-spel':
    case 'opening':
      return uit('buiten', 'De openingsfilm en de eerste missie beginnen voor de deur, bij de Escapade in de garage.');
    case 'laden':
      if (saveCtx === 'busy' || saveCtx === 'free') return uit('houd', 'Een save midden in een missie of ergens anders in de provincie houdt zijn plek.');
      if (rol === 'gast') return uit('buiten', 'Een gast staat bij de host (de coop-regel), niet in zijn eigen woning.');
      if (binnenSave === false) return uit('buiten', 'Deze save stond buiten bij het huis en blijft buiten.');
      return homeIndoors(type, instelling, interieurKlaar, uit);
    case 'naar-huis':
      return homeIndoors(type, instelling, interieurKlaar, uit);
    case 'slapen':
      return uit('houd', 'Je slaapt al in de woning en blijft er na het slapen.');
    case 'hostwissel':
      return uit('houd', 'Een hostwissel verplaatst niemand.');
    case 'reis-thuis':
      return uit('buiten', 'Een taxi of een kaartreis zet je voor de deur; de lift of de deur zijn je eigen keuze.');
    case 'missie-thuis':
      return uit('buiten', 'Een missie die thuis eindigt, eindigt bij de deur waar je zelf aankomt.');
    case 'ziekenhuis':
      return uit('buiten', 'Na het ziekenhuis of het bureau sta je daar, niet thuis.');
    case 'gast-aansluit':
      return uit('buiten', 'Een gast die aansluit wordt naast de host gezet, nooit in een woning waar de groep niet is.');
    default:
      return uit('buiten', 'Onbekende situatie: de oude regel (buiten).');
  }
}
function homeIndoors(type, instelling, interieurKlaar, uit) {
  if (!instelling) return uit('buiten', 'De instelling Start binnen (thuis) staat uit.');
  if (type === 'geen') return uit('buiten', 'Dit huis heeft nog geen interieur: je staat voor de deur.');
  if (!interieurKlaar) return uit('buiten', 'Het interieur kon niet worden gebouwd: terugval op voor de deur.');
  return uit('binnen', 'Je staat in de woning, met de deur of de lift als uitweg.');
}

// De save: stond de speler binnen toen hij opsloeg? Een oude save heeft het veld niet (undefined: het was altijd "naar huis", dus
// de woning); alleen een expliciet false blijft buiten.
export const binnenOpslag = (binnen) => ({ binnen: !!binnen });
export function readIndoorSave(d) {
  const t = d && typeof d === 'object' ? d.thuis : null;
  return t && typeof t.binnen === 'boolean' ? t.binnen : undefined;
}

// --- de wacht op het interieur (laadscherm) ----------------------------------------------------------------------

export const makeIndoorWait = () => ({ t: 0, staat: 'wacht', reden: '' });
// staat: 'wacht' (het laadscherm blijft open), 'klaar' (het interieur staat) of 'terugval' (mislukt of te lang: buiten voor de deur).
// Eindstanden blijven staan.
export function tickBinnenWacht(w, { dt = 0, klaar = false, mislukt = false } = {}) {
  if (w.staat !== 'wacht') return w;
  w.t += Number.isFinite(dt) && dt > 0 ? dt : 0;
  if (mislukt) { w.staat = 'terugval'; w.reden = 'mislukt'; }
  else if (klaar) w.staat = 'klaar';
  else if (w.t >= BINNEN_MAX_S) { w.staat = 'terugval'; w.reden = 'time-out'; }
  return w;
}
export const binnenPending = (w) => (w && w.staat === 'wacht' ? 1 : 0);

// --- de flat -----------------------------------------------------------------------------------------------------

const FLAT_R = 0.32; // dezelfde straal als clampToFlat in home.js
const dist2Seg = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return (px - cx) ** 2 + (py - cy) ** 2;
};
// Kan iemand op (lx, lz) staan zonder dat de botsing van home.js hem verschuift? Dezelfde drie regels: binnen de buitenmuren, niet
// op een wand, niet in een meubel. `solids` is wat er nu staat (de vaste meubels plus de EIKEA-stukken en de Sloapstee).
export function flatSpotOk(plan, lx, lz, solids = plan.solids, r = FLAT_R) {
  if (!Number.isFinite(lx) || !Number.isFinite(lz)) return false;
  if (lx < r + 0.1 || lx > plan.w - r - 0.1 || lz < r + 0.2 || lz > plan.d - r - 0.1) return false;
  for (const [x1, z1, x2, z2] of plan.walls) if (dist2Seg(lx, lz, x1, z1, x2, z2) < (r + 0.07) ** 2) return false;
  for (const [x0, z0, x1, z1] of solids) {
    const cx = Math.max(x0, Math.min(x1, lx)), cz = Math.max(z0, Math.min(z1, lz));
    if (Math.hypot(lx - cx, lz - cz) < r) return false;
  }
  return true;
}

// Kan hij van (lx, lz) naar de lift lopen? Vlakvulling op een raster van 0,2 m over de punten die flatSpotOk goedkeurt.
export function flatBereikbaar(plan, lx, lz, solids = plan.solids) {
  const S = 0.2, nx = Math.ceil(plan.w / S), nz = Math.ceil(plan.d / S);
  const cell = (x, z) => [Math.min(nx - 1, Math.max(0, Math.floor(x / S))), Math.min(nz - 1, Math.max(0, Math.floor(z / S)))];
  const free = (i, k) => flatSpotOk(plan, (i + 0.5) * S, (k + 0.5) * S, solids);
  const [si, sk] = cell(lx, lz), [ti, tk] = cell(plan.use.door.x, plan.use.door.z);
  const seen = new Uint8Array(nx * nz), q = [[si, sk]];
  seen[sk * nx + si] = 1;
  while (q.length) {
    const [i, k] = q.pop();
    if (i === ti && k === tk) return true;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = k + dk;
      if (a < 0 || b < 0 || a >= nx || b >= nz || seen[b * nx + a]) continue;
      const near = Math.abs(a - ti) + Math.abs(b - tk) <= 1; // het liftpunt zelf staat een voet van de wand: tel de buurcellen mee
      if (!free(a, b) && !near) continue;
      seen[b * nx + a] = 1; q.push([a, b]);
    }
  }
  return false;
}

// De plek in de flat: de eerste kandidaat (woonkamer, tussen de bank en de keuken) die vrij en bereikbaar is, anders de uitgang van de
// lift (die is altijd vrij: dat is waar de speler anders ook uit de lift komt). Kijkrichting: naar het glas (naar z = 0), de richting
// waarin je ook uit de lift stapt. lx, lz in het eigen frame van de flat; home.js rekent het om.
export function chooseFlatSpawn(plan, solids = plan.solids) {
  for (const [lx, lz] of plan.spawn || []) {
    if (flatSpotOk(plan, lx, lz, solids) && flatBereikbaar(plan, lx, lz, solids)) return { lx, lz, kijk: [0, -1], terugval: false };
  }
  return { lx: plan.entry[0], lz: plan.entry[1], kijk: [0, -1], terugval: true };
}
export { FLAT_W, FLAT_D };

// --- een pand met een gewoon interieur (Bezit, een gekocht huis) -------------------------------------------------

const MIN_VRIJ = 0.55; // minstens zoveel vrije ruimte tot het dichtstbijzijnde meubel of de dichtstbijzijnde wand
const blocksOf = (L) => [...L.walls, ...(L.rails || []), ...(L.blocks || []), ...L.items.filter((i) => i.solid).map(rectOf)];
const vrijTot = (blocks, u, v) => {
  let m = Infinity;
  for (const b of blocks) { const du = Math.max(b.u0 - u, 0, u - b.u1), dv = Math.max(b.v0 - v, 0, v - b.v1); m = Math.min(m, Math.hypot(du, dv)); }
  return m;
};

// plan: een plan van planInterior (interiorrules.js). Geeft { u, v, x, y, angle, vrij } in de hal: de loopbare, bereikbare cel met
// de meeste ruimte die het dichtst bij het midden van de woonruimte ligt, kijkend naar de gevel met de deur en de ramen. null als
// er geen plek is (dan valt de aanroeper terug op buiten).
export function chooseHomePropertySpawn(plan) {
  if (!plan || !plan.ok || !plan.layout || !plan.hall) return null;
  const L = plan.layout, H = plan.hall;
  const grid = walkGrid(L), res = reachable(L, grid);
  const blocks = blocksOf(L);
  const cu = (H.u0 + H.u1) / 2, cv = H.v0 + (H.v1 - H.v0) * 0.45; // iets voor het midden: de achterwand is vaak kast of bed
  let best = null;
  for (let k = 0; k < grid.nv; k++) for (let i = 0; i < grid.nu; i++) {
    const idx = k * grid.nu + i;
    if (!grid.free[idx] || !res.seen[idx]) continue;
    const u = H.u0 + (i + 0.5) * CELL, v = H.v0 + (k + 0.5) * CELL;
    const vrij = vrijTot(blocks, u, v);
    if (vrij < MIN_VRIJ) continue;
    const score = Math.hypot(u - cu, v - cv) - Math.min(vrij, 1.2) * 0.3;
    if (!best || score < best.score) best = { u, v, vrij, score };
  }
  if (!best) return null;
  const [x, y] = toWorld(plan.frame, best.u, best.v);
  const [dx, dy] = dirToWorld(plan.frame, 0, -1); // naar de deurwand
  return { u: best.u, v: best.v, x, y, angle: Math.atan2(dy, dx), vrij: best.vrij };
}

// Controle voor de tests (en een laatste check van de aanroeper): staat de plek in de hal, vrij van meubels en wanden, bereikbaar vanaf de deur?
export function pandSpawnOk(plan, sp) {
  if (!plan || !plan.ok || !sp) return { ok: false, why: 'geen plek' };
  const L = plan.layout, H = plan.hall;
  if (sp.u < H.u0 + PLAYER_R || sp.u > H.u1 - PLAYER_R || sp.v < H.v0 + PLAYER_R || sp.v > H.v1 - PLAYER_R) return { ok: false, why: 'buiten de hal' };
  const blocks = blocksOf(L);
  if (vrijTot(blocks, sp.u, sp.v) < PLAYER_R) return { ok: false, why: 'in een meubel of wand' };
  const res = reachable(L, walkGrid(L));
  if (!reachableAt(res, sp.u, sp.v, 0.4)) return { ok: false, why: 'deur niet bereikbaar' };
  return { ok: true, why: '' };
}
