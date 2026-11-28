// Wanneer is een tegel "klaar voor de speler"? (#1354) Puur: geen three.js, geen DOM, geen eigen timers (de aanroeper geeft
// `now` in ms), zodat scripts/tileready_test.mjs elke overgang zonder browser keurt. Uitleg en afweging: docs/wereld/TEGEL-KLAAR-28-11.md.
//
// Het probleem: "klaar" betekende tot nu toe "de tegel staat in het geheugen, de gebouwen en wegen in de ring zijn gebouwd". Wat
// daarna nog kwam (gras, bomen, texturen, shaders, het verre LOD, auto's en mensen) verscheen dus binnen het zicht: pop-in.
//
// De definitie is een keten van zes niveaus. Een tegel zit op niveau N als niveau 0..N allemaal klaar zijn en er voor geen van die
// niveaus nog een taak openstaat: een hoger niveau kan nooit "klaar" zijn zolang een lager niveau weer iets opent (terugval).
//   data        de rijen van de tegel zijn gedecodeerd en binnen
//   colliders   de rijen staan in de kaart (rasters, wegen, gebouwen, hoogte): botsing en hoogtevragen kloppen
//   geometry    gebouwen (met detail), wegen, water, gras, bomen en props zijn gebouwd en staan in de scene
//   gpu         shaders zijn gelinkt en texturen staan op de GPU: de eerste draw kost niets
//   lod         het verre LOD (de verre kopie, de kroon- en billboardlaag) dekt de rand van de ring, naastliggende niveaus staan er
//   population  de bevolking van de tegel (auto's, geparkeerde auto's, mensen) staat op het eindmodel, rigs en modellen geladen
// Een tegel hoeft niet alle niveaus te halen: wat er nodig is hangt van zijn afstand af (requiredLevels). In de nabije ring (en in
// elk cutsceneshot) gelden alle zes.

export const LEVELS = ['data', 'colliders', 'geometry', 'gpu', 'lod', 'population'];
export const RANK = Object.freeze(Object.fromEntries(LEVELS.map((l, i) => [l, i])));

// Afstanden en tijden. nearM: de nabije ring (alle niveaus); viewM: tot hier zichtbaar (t/m lod); beyondM: daarbuiten alleen de data.
export const READY = {
  nearM: 160,       // de nabije ring rond de speler (en vooruit in de rijrichting): alle niveaus
  viewM: 700,       // binnen de zichtafstand: t/m 'lod' (de bevolking komt daar geleidelijk, zonder modelwissel)
  minMs: 400,       // een poort wacht minstens zo lang, zodat de streams hun focus gevolgd hebben voor "klaar" telt
  calmTicks: 8,     // zoveel opeenvolgende rustige metingen voor "klaar" (geen nieuwe uitbarsting)
  maxMs: 20000,     // daarna: terugval met een nette melding, nooit eeuwig hangen
  stuckMs: 8000,    // een tegel met een taak die zo lang openstaat telt als vastgelopen (rapport, geen eeuwige wacht)
};

// Welke niveaus gelden voor een tegel op deze afstand van de speler (of de camera)?
export function requiredLevels(distM, p = READY) {
  if (!(distM >= 0)) return LEVELS.slice();
  if (distM <= p.nearM) return LEVELS.slice();
  if (distM <= p.viewM) return LEVELS.slice(0, RANK.lod + 1);
  return ['data'];
}
export const maxRank = (levels) => (levels && levels.length ? Math.max(...levels.map((l) => (l in RANK ? RANK[l] : -1))) : -1);

// De nabije ring groeit met de snelheid: wie sneller gaat ziet verder vooruit, en wat daar nog niet staat verschijnt bij 30 m/s
// binnen een paar seconden in beeld. Per vervoermiddel een eigen kijktijd en een bovengrens.
export const MODES = {
  foot:  { leadS: 4, maxLead: 40,  nearBase: 120 },
  bike:  { leadS: 4, maxLead: 80,  nearBase: 140 },
  car:   { leadS: 4, maxLead: 200, nearBase: 160 },
  boat:  { leadS: 4, maxLead: 160, nearBase: 160 },
  train: { leadS: 6, maxLead: 400, nearBase: 200 },
  heli:  { leadS: 5, maxLead: 300, nearBase: 200 },
  plane: { leadS: 6, maxLead: 600, nearBase: 260 },
};
export function modeOf(p) {
  const v = p && p.inVehicle;
  if (!v) return 'foot';
  const k = String(v.kind || v.type || '').toLowerCase();
  if (v.isBoat || /boat|boot|ship/.test(k)) return 'boat';
  if (v.isTrain || /train|trein|tram/.test(k)) return 'train';
  if (v.isHeli || /heli/.test(k)) return 'heli';
  if (v.isPlane || /plane|vliegtuig|jet/.test(k)) return 'plane';
  if (/bike|fiets|scooter|bromfiets|motor/.test(k)) return 'bike';
  return 'car';
}
// De vooruitkijkafstand (m) en de straal van de nabije ring voor dit vervoermiddel en deze snelheid.
export function leadFor(mode, speed) {
  const m = MODES[mode] || MODES.foot;
  const v = Number.isFinite(speed) && speed > 0 ? speed : 0;
  const lead = Math.min(m.maxLead, v * m.leadS);
  return { lead, nearM: m.nearBase + lead * 0.5, leadS: m.leadS };
}
// Het punt waar de nabije ring op gericht staat: de focus plus de vooruitkijkafstand in de rijrichting.
export function aheadPoint(x, y, dirX, dirY, lead) {
  const l = Math.hypot(dirX, dirY) || 1;
  return { x: x + (dirX / l) * lead, y: y + (dirY / l) * lead };
}

// ---------------------------------------------------------------- het grootboek per tegel

// Houdt per tegel bij welke niveaus klaar gemeld zijn en welke taken nog openstaan. Een niveau telt pas als alle lagere ook
// tellen, en een nieuwe taak op een laag niveau zet de tegel terug (de hogere niveaus gelden dan niet meer).
export function createTileLedger(p = READY) {
  const tiles = new Map(); // key -> { done: Set(level), jobs: Map(level -> Map(id -> t0)), firstOpen: ms|null, timedOut: bool }
  const get = (key) => {
    let t = tiles.get(key);
    if (!t) { t = { done: new Set(), jobs: new Map(), firstOpen: null, timedOut: false }; tiles.set(key, t); }
    return t;
  };
  const openCount = (t, level) => (t.jobs.get(level) ? t.jobs.get(level).size : 0);
  const levelOf = (t) => {
    let L = -1;
    for (let i = 0; i < LEVELS.length; i++) {
      if (!t.done.has(LEVELS[i]) || openCount(t, LEVELS[i])) break;
      L = i;
    }
    return L;
  };
  return {
    // een taak voor dit niveau begint (een gebouw bouwen, een shader linken, een auto spawnen)
    open(key, level, id, now = 0) {
      if (!(level in RANK)) throw new Error('onbekend niveau ' + level);
      const t = get(key);
      let m = t.jobs.get(level); if (!m) { m = new Map(); t.jobs.set(level, m); }
      if (!m.has(id)) m.set(id, now);
      if (t.firstOpen === null) t.firstOpen = now;
      return t;
    },
    // de taak is af
    close(key, level, id, now = 0) {
      const t = tiles.get(key); if (!t) return false;
      const m = t.jobs.get(level);
      const had = !!(m && m.delete(id));
      if (m && !m.size) t.jobs.delete(level);
      if (!this.hasOpen(key)) { t.firstOpen = null; t.timedOut = false; }
      void now;
      return had;
    },
    // het niveau als geheel is gemeld (alle rijen binnen, alle gebouwen gebouwd)
    complete(key, level) {
      if (!(level in RANK)) throw new Error('onbekend niveau ' + level);
      get(key).done.add(level);
    },
    // het niveau is niet meer waar (de rijen van de tegel werden weggegooid, een nieuwe lading): terug naar dat niveau
    regress(key, level) {
      const t = tiles.get(key); if (!t) return;
      for (let i = RANK[level]; i < LEVELS.length; i++) t.done.delete(LEVELS[i]);
    },
    drop(key) { tiles.delete(key); },
    hasOpen(key) { const t = tiles.get(key); if (!t) return false; for (const m of t.jobs.values()) if (m.size) return true; return false; },
    level(key) { const t = tiles.get(key); return t ? levelOf(t) : -1; },
    // klaar voor deze afstand? Een onbekende tegel is nooit klaar.
    ready(key, need = LEVELS) {
      const t = tiles.get(key); if (!t) return false;
      const r = maxRank(need);
      return r < 0 ? true : levelOf(t) >= r;
    },
    // wat houdt de tegel op: het eerste niveau (in de keten) dat niet klaar is, met de openstaande taken
    blocking(key, need = LEVELS) {
      const t = tiles.get(key);
      if (!t) return { level: LEVELS[0], reason: 'onbekend', jobs: [] };
      const r = maxRank(need);
      for (let i = 0; i <= r; i++) {
        const l = LEVELS[i], n = openCount(t, l);
        if (n) return { level: l, reason: 'open', jobs: [...t.jobs.get(l).keys()] };
        if (!t.done.has(l)) return { level: l, reason: 'niet gemeld', jobs: [] };
      }
      return null;
    },
    // taken die langer dan stuckMs openstaan: de tegel telt als vastgelopen (rapport; de poort gaat dan na maxMs toch door)
    expire(now) {
      const out = [];
      for (const [key, t] of tiles) {
        if (t.timedOut || t.firstOpen === null) continue;
        let oldest = Infinity;
        for (const m of t.jobs.values()) for (const t0 of m.values()) oldest = Math.min(oldest, t0);
        if (now - oldest >= p.stuckMs) { t.timedOut = true; out.push(key); }
      }
      return out;
    },
    state(key) { const t = tiles.get(key); return t ? { level: levelOf(t), timedOut: t.timedOut, open: [...t.jobs].map(([l, m]) => [l, m.size]) } : null; },
    get size() { return tiles.size; },
  };
}

// ---------------------------------------------------------------- een gebied meten (tellers per niveau)

export const emptyCounts = () => ({ data: 0, colliders: 0, geometry: 0, gpu: 0, lod: 0, population: 0 });
const n0 = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

// counts: wat er per niveau nog openstaat in het gebied (de sensoren van readysensors.js); need: de niveaus die tellen.
// Geeft het hoogste niveau waarvan alle lagere ook leeg zijn, en wat blokkeert.
export function regionReadiness(counts, need = LEVELS) {
  const c = counts || {};
  const r = maxRank(need);
  let level = -1, broken = false;
  const blocking = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const n = n0(c[LEVELS[i]]);
    if (n && i <= r) blocking.push({ level: LEVELS[i], n });
    if (n) broken = true;
    if (!broken) level = i;
  }
  return { ready: blocking.length === 0, level, blocking, total: LEVELS.reduce((s, l, i) => s + (i <= r ? n0(c[l]) : 0), 0) };
}
export function sumCounts(list) {
  const out = emptyCounts();
  for (const c of list || []) if (c) for (const l of LEVELS) out[l] += n0(c[l]);
  return out;
}

const LEVEL_TEXT = {
  data: 'de kaartgegevens',
  colliders: 'de wegen en gebouwen op de kaart',
  geometry: 'de gebouwen, wegen en bomen',
  gpu: 'de afbeeldingen en schaduwen',
  lod: 'de verre gebouwen',
  population: 'de mensen en auto\'s',
};
// Een nette melding voor de speler bij een time-out (Nederlands, zonder jargon): wat de wereld nog bezig hield.
export function waitText(blocking) {
  const b = (blocking && blocking[0]) || null;
  return b ? 'We wachten nog even op ' + LEVEL_TEXT[b.level] + '.' : 'We zijn er bijna.';
}

// ---------------------------------------------------------------- de poort (laadscherm, benchmark, cutscene)

// idle -> wait -> ready | timeout. `tick(now, counts, need)` geeft { phase, ready, timedOut, waitedMs, blocking, text }.
// Klaar = minstens minMs gewacht en calmTicks metingen achter elkaar zonder open niveau (geen nieuwe uitbarsting). Na maxMs gaat de poort
// toch open (timedOut, met de reden): liever een iets te vroege wereld dan een scherm dat nooit weggaat.
export function createReadyGate(p = READY) {
  let phase = 'idle', t0 = 0, calm = 0, last = null;
  const stats = { gates: 0, timeouts: 0, maxWaitedMs: 0 };
  return {
    stats,
    get phase() { return phase; },
    get active() { return phase === 'wait'; },
    get last() { return last; },
    start(now) { phase = 'wait'; t0 = now; calm = 0; last = null; stats.gates++; },
    tick(now, counts, need = LEVELS) {
      if (phase === 'idle') this.start(now);
      if (phase !== 'wait') return last;
      const waitedMs = now - t0;
      const r = regionReadiness(counts, need);
      calm = r.ready ? calm + 1 : 0;
      let out;
      if (waitedMs >= p.minMs && calm >= p.calmTicks) { phase = 'ready'; out = { phase, ready: true, timedOut: false, waitedMs, blocking: [], text: '' }; }
      else if (waitedMs >= p.maxMs) { phase = 'timeout'; stats.timeouts++; out = { phase, ready: false, timedOut: true, waitedMs, blocking: r.blocking, text: waitText(r.blocking) }; }
      else out = { phase, ready: false, timedOut: false, waitedMs, blocking: r.blocking, text: r.ready ? '' : waitText(r.blocking) };
      if (phase !== 'wait') stats.maxWaitedMs = Math.max(stats.maxWaitedMs, waitedMs);
      last = out;
      return out;
    },
    reset() { phase = 'idle'; calm = 0; last = null; },
  };
}

// ---------------------------------------------------------------- cutscenes: de strengste klant

// Cutscene: de poort eist alle niveaus rond het hele shotpad, houdt het beeld zwart zodra het wachten voelbaar wordt (blackAfterMs) en
// geeft een eigen maximumtijd (een scène die begint mag wat langer wachten dan een shot-wissel midden in een scène).
export const CUT = {
  nearM: 150,        // de straal rond elk punt van het pad (alle niveaus)
  actorM: 60,        // rond de plek van een acteur
  stepM: 40,         // een pad tussen twee standen wordt zo fijn bemonsterd
  maxRegions: 40,
  blackAfterMs: 250, // blijft de wereld zo lang niet klaar: zwart (een korte duik is beter dan pop-in in beeld)
  startMaxMs: 8000,  // het begin van een scène
  shotMaxMs: 4000,   // een shot-wissel binnen een scène
  minMs: 150,
  calmTicks: 4,
};

const finite = (v) => Number.isFinite(v);
const pt = (v) => (v && finite(v.x) && finite(v.y) ? { x: v.x, y: v.y, z: finite(v.z) ? v.z : 0 } : null);

// De gebieden die een scène laat zien. poses: [{ position, lookAt, actors? }] (de camerastanden van de bestaande scènedata, bv. cutscript
// shotPoints/sample); een hoge camera ziet verder (de straal groeit met de hoogte). Dichtbij elkaar liggende gebieden worden samengevoegd.
export function shotRegions(poses, p = CUT) {
  const raw = [];
  const add = (v, r) => { const q = pt(v); if (q) raw.push({ x: q.x, y: q.y, r }); };
  let prev = null;
  for (const o of poses || []) {
    if (!o) continue;
    const eye = pt(o.position), look = pt(o.lookAt);
    const high = eye ? Math.min(150, Math.max(0, eye.z - 20)) : 0; // een luchtshot ziet verder dan een straatshot
    const r = p.nearM + high;
    if (eye) add(eye, r);
    if (look) {
      add(look, r);
      if (eye) add({ x: (eye.x + look.x) / 2, y: (eye.y + look.y) / 2 }, r);
    }
    for (const a of o.actors || []) add(a, p.actorM);
    // de baan tussen twee opeenvolgende stand: bemonsterd, zodat een snelle camera geen gat laat
    const here = look || eye;
    if (prev && here) {
      const d = Math.hypot(here.x - prev.x, here.y - prev.y);
      for (let s = p.stepM; s < d; s += p.stepM) add({ x: prev.x + (here.x - prev.x) * (s / d), y: prev.y + (here.y - prev.y) * (s / d) }, r);
    }
    prev = here || prev;
  }
  // samenvoegen: een gebied dat binnen een halve straal van een groter ligt, valt erin op
  raw.sort((a, b) => b.r - a.r);
  const out = [];
  for (const g of raw) {
    const hit = out.find((o) => Math.hypot(o.x - g.x, o.y - g.y) <= o.r * 0.5 && o.r >= g.r);
    if (!hit) out.push({ ...g });
  }
  // te veel gebieden: de kleinste worden bij het dichtstbijzijnde grotere gevoegd (de straal groeit mee)
  while (out.length > p.maxRegions) {
    const g = out.pop();
    let best = null, bd = Infinity;
    for (const o of out) { const d = Math.hypot(o.x - g.x, o.y - g.y); if (d < bd) { bd = d; best = o; } }
    if (best) best.r = Math.max(best.r, bd + g.r);
  }
  return out;
}

// De cutscenepoort: een readygate met strengere parameters plus de beslissing "zwart". tick(now, counts) geeft
// { phase, ready, timedOut, black, holdClock, waitedMs, text }. holdClock: de scèneklok blijft staan zolang de wereld niet klaar is.
export function createCutsceneGate({ shot = false, p = CUT } = {}) {
  const gate = createReadyGate({ ...READY, minMs: p.minMs, calmTicks: p.calmTicks, maxMs: shot ? p.shotMaxMs : p.startMaxMs });
  let black = false;
  return {
    gate,
    get phase() { return gate.phase; },
    get black() { return black; },
    start(now) { gate.start(now); black = false; },
    tick(now, counts) {
      if (gate.phase === 'idle') gate.start(now);
      const r = gate.tick(now, counts, LEVELS) || { phase: gate.phase, ready: false, timedOut: false, waitedMs: 0, blocking: [], text: '' };
      if (r.phase === 'wait' && r.waitedMs >= p.blackAfterMs) black = true;
      const done = r.phase === 'ready' || r.phase === 'timeout';
      return { ...r, black, holdClock: !done, done };
    },
    release() { black = false; },
    reset() { gate.reset(); black = false; },
    stats: gate.stats,
  };
}
