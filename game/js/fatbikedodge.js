// AAA M08 (Fatbikes ontwijken, #955): de uitdaging zelf, puur en deterministisch (geen DOM, geen wereld, geen Math.random).
//
//   planWaves(seed, len)        de golven langs de baan: wanneer (voortgang in m), welk patroon, hoeveel fietsen
//   createDodge(len, seed)      de staat van een poging: golven, tellers per speler, herstartpunten
//   wavesDue(d, s)              welke golven nu losbreken bij voortgang s (eenmalig)
//   waveBikes(d, wave, s)       de fietsen van een golf: { sOffset, dir, lat, latT, speed, fat, cross, courier }
//   passTick(rec, dist)         ontweken of geraakt? per fiets en speler: 'ontweken' | null
//   noteDodge / noteHit         tellers per speler; twee keer geraakt = herstart van het stuk
//   tempoTick(d, key, dt, s)    de colonne loopt door: wie blijft staan krijgt een extra golf van achteren
//   halfwayDue(d, s)            de mini-beat halverwege (de koerier roept), eenmalig
//   hudLine / slotLines         de tekst voor de HUD en de nasleep
//
// Samen spelen: de baan is gedeeld, de tellers staan per speler (`key`: 'host' of de slot van een gast) zodat elke speler zijn eigen
// 'Ontweken' en 'Geraakt' ziet. Wie als eerste te voet bij Oma Trijntje is laat de missie slagen (missions.js, ongewijzigd). Alleen het
// lichaam van dit apparaat wordt bij een herstart teruggezet; een gast bestuurt zijn eigen lichaam en kan niet door de host worden verplaatst: hij krijgt via
// world.coopMeld zijn eigen meldingen (Geraakt, Ontweken) en bij een herstart alleen een nieuwe teller en de vraag zelf terug te lopen.
export const DODGE = {
  hitLimit: 2,        // twee keer geraakt: herstart van het stuk
  touchR: 1.15,       // zelfde raakstraal als missionlanes.js
  nearR: 4.5,         // binnen deze straal telt een fiets als 'langs gekomen'
  farR: 6.5,          // buiten deze straal na een nadering is hij ontweken
  segments: 3,        // herstartpunten: de start en elk derde deel
  idleSecs: 4,        // zo lang stilstaan voordat de colonne een extra golf stuurt
  idleSpeed: 0.5,     // m/s voortgang waaronder iemand stilstaat
  idleCooldown: 12,   // uitstel tussen twee tempo-golven
  maxWaves: 8,
  restartBonus: 15,   // seconden erbij bij een herstart: een val kost een stuk lopen, geen mislukking
};

function rng(seed) { // mulberry32
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// De volgorde leert de speler iets: eerst tegemoet, dan kruisend, dan een rij, de koerier halverwege, een colonne van achteren, slot dubbel.
const PATTERNS = ['tegen', 'kruis', 'rij', 'kruis', 'achter', 'tegen', 'kruis', 'rij'];

export function planWaves(seed, len) {
  const r = rng(seed ^ 0x51ED);
  const n = Math.min(DODGE.maxWaves, Math.max(4, Math.round(len / 55)));
  const waves = [];
  for (let k = 0; k < n; k++) {
    const frac = (k + 0.4) / n;
    waves.push({
      id: `w${k}`, at: Math.round(frac * len * 0.96), kind: PATTERNS[k % PATTERNS.length],
      n: Math.min(5, 2 + Math.floor(k / 2) + (r() < 0.4 ? 1 : 0)), gap: 8 + Math.round(r() * 5), side: r() < 0.5 ? -1 : 1,
      speed: 5.4 + Math.min(2.4, k * 0.35) + r() * 0.8, // de colonne loopt door: elke golf is een tikje sneller
    });
  }
  return waves;
}

export function createDodge(len, seed = 1) {
  return {
    len, seed, waves: planWaves(seed, len), fired: new Set(), halfway: false,
    players: {}, // key -> { dodged, hits, restarts, idle, idleCool, lastS }
    extra: 0,
  };
}

const speler = (d, key) => d.players[key] || (d.players[key] = { dodged: 0, hits: 0, restarts: 0, idle: 0, idleCool: 0, lastS: null, totalHits: 0 });
export const playerOf = speler;

// De golven die losbreken als de (verste) speler bij voortgang s is. Elk golf komt precies één keer.
export function wavesDue(d, s) {
  const uit = [];
  for (const w of d.waves) {
    if (d.fired.has(w.id)) continue;
    if (s >= w.at - 30) { d.fired.add(w.id); uit.push(w); }
  }
  return uit;
}

// De fietsen van een golf, relatief aan de voortgang s van de speler (waveBikes levert sOffset: + is vóór de speler langs de baan).
export function waveBikes(d, wave, laneHalf = 2.1) {
  const r = rng(d.seed * 131 + wave.id.length * 17 + wave.at);
  const uit = [];
  for (let i = 0; i < wave.n; i++) {
    const fat = wave.kind === 'achter' ? true : r() < 0.6;
    if (wave.kind === 'tegen') uit.push({ sOffset: 48 + i * wave.gap, dir: -1, lat: (i % 2 ? 1 : -1) * wave.side * laneHalf * 0.6, latT: null, speed: wave.speed, fat, cross: false });
    else if (wave.kind === 'rij') uit.push({ sOffset: 52 + i * 4, dir: -1, lat: (-laneHalf + (i + 0.5) * (2 * laneHalf / wave.n)), latT: null, speed: wave.speed - 0.6, fat, cross: false });
    else if (wave.kind === 'achter') uit.push({ sOffset: -(34 + i * wave.gap * 0.7), dir: 1, lat: (i % 2 ? 1 : -1) * laneHalf * 0.5, latT: null, speed: wave.speed + 0.8, fat, cross: false });
    else { // kruis: komt van de rand en steekt schuin over, op wisselende afstanden
      const van = (i % 2 ? -1 : 1) * wave.side;
      uit.push({ sOffset: 20 + i * (wave.gap * 0.8) + r() * 5, dir: -1, lat: van * (laneHalf + 0.3), latT: -van * laneHalf, speed: wave.speed - 1.2, fat, cross: true });
    }
  }
  return uit;
}

// Eén ontmoeting van fiets en speler. rec: { min, near, klaar }. dist: afstand nu. Geeft 'ontweken' zodra de fiets na een nabije
// passage weer ver weg is zonder dat hij je raakte (rec.klaar zet de aanroeper bij een treffer: de fiets telt dan niet meer).
export function passTick(rec, dist) {
  if (rec.klaar) return null;
  if (dist < DODGE.touchR) { rec.klaar = true; return null; }
  if (dist < DODGE.nearR) { rec.near = true; rec.min = Math.min(rec.min ?? Infinity, dist); }
  else if (rec.near && dist > DODGE.farR) { rec.klaar = true; return 'ontweken'; }
  return null;
}

export function noteDodge(d, key) { const p = speler(d, key); p.dodged++; return p.dodged; }

// Een treffer: geeft { hits, restart }. Bij de limiet gaan de treffers van dit stuk op nul en telt de herstart.
export function noteHit(d, key) {
  const p = speler(d, key);
  p.hits++; p.totalHits++;
  if (p.hits >= DODGE.hitLimit) { p.hits = 0; p.restarts++; p.idle = 0; return { hits: DODGE.hitLimit, restart: true }; }
  return { hits: p.hits, restart: false };
}

// Het herstartpunt: de voortgang (m) van het begin van het stuk waarin s ligt. Het stuk van de speler blijft zijn eigen verdienste:
// de tellers van 'Ontweken' blijven staan, alleen de treffers gaan op nul.
export function segmentStart(d, s) {
  const seg = d.len / DODGE.segments;
  const k = Math.max(0, Math.min(DODGE.segments - 1, Math.floor(s / seg)));
  return k * seg;
}

// De colonne loopt door: wie stilstaat (te weinig voortgang) krijgt na idleSecs een extra golf van achteren.
// Geeft 'prikkel' (de aanroeper maakt een golf van achteren: extraWave) of null.
export function tempoTick(d, key, dt, s) {
  const p = speler(d, key);
  p.idleCool = Math.max(0, p.idleCool - dt);
  const gain = p.lastS == null ? Infinity : (s - p.lastS) / Math.max(dt, 1e-3);
  p.lastS = s;
  if (gain < DODGE.idleSpeed) p.idle += dt; else p.idle = Math.max(0, p.idle - dt * 2);
  if (p.idle >= DODGE.idleSecs && p.idleCool <= 0) { p.idle = 0; p.idleCool = DODGE.idleCooldown; d.extra++; return 'prikkel'; }
  return null;
}
export function extraWave(d) {
  return { id: `x${d.extra}`, at: 0, kind: 'achter', n: 2, gap: 9, side: d.extra % 2 ? 1 : -1, speed: 7.6 };
}

// De mini-beat halverwege: de fatbike-koerier roept. Eenmalig, bij voortgang >= de helft.
export function halfwayDue(d, s) {
  if (d.halfway || s < d.len * 0.5) return null;
  d.halfway = true;
  return { id: 'm08-koerier', wie: 'Fatbike-koerier', tekst: 'Pakketje voor Oma Trijntje! Opzij, opzij!', secs: 4 };
}

// De HUD-regel per speler en de uitleg met toetsplaatjes (tokens die keycap.js rendert).
export const DODGE_HINT = 'Stap opzij met {A} en {D}. Twee keer geraakt en je begint het stuk opnieuw.';
export function hudLine(d, key) {
  const p = speler(d, key);
  return `Ontweken: ${p.dodged} · Geraakt ${p.hits}/${DODGE.hitLimit}`;
}

// Nasleep op de uitslagkaart: [wie, wat]. De ontweek-teller bepaalt de toon; elke herstart is een knipoog, nooit een verwijt.
export function slotLines(d, key) {
  const p = speler(d, key);
  const rij = [['Oma Trijntje', p.dodged >= 15 ? `${p.dodged} keer ontweken? Je danst, kind.` : p.dodged >= 7 ? `${p.dodged} keer opzij gestapt. Dat is een goede dag in Grunn.` : 'Je kwam er. Meer vraag ik niet.']];
  if (p.restarts > 0) rij.push(['Fatbike-koerier', p.restarts === 1 ? 'Eén keer omgevallen. Hij zwaait toch maar even.' : `${p.restarts} keer omgevallen. Hij zwaait elke keer.`]);
  return rij;
}

// Een pure spelsimulatie voor de test: loopt een speler met snelheid v langs de baan; elke golf-fiets wordt als (s, lat)-bewegend punt
// gemodelleerd. Geeft { dodged, hits, restarts, finished }. Bedoeld om determinisme en slagen te bewijzen, niet om de wereld te vervangen.
export function simulate(len, seed, { speed = 1.8, dodgeSkill = 1, dt = 0.1, maxT = 400 } = {}) {
  const d = createDodge(len, seed);
  const r = rng(seed ^ 0xBEEF);
  const bikes = []; let s = 0, t = 0;
  const rec = [];
  while (t < maxT && s < len) {
    for (const w of wavesDue(d, s)) for (const b of waveBikes(d, w)) bikes.push({ ...b, s: s + b.sOffset, lat: b.lat, rec: { min: null }, });
    const h = halfwayDue(d, s); if (h) rec.push(h.id);
    for (const b of bikes) {
      b.s += b.dir * b.speed * dt;
      if (b.raak === undefined) b.raak = r() >= dodgeSkill; // een geoefende speler stapt bijna altijd opzij
      const dd = Math.hypot(b.s - s, b.raak ? 0 : 2.6);
      const raak = !b.rec.klaar && dd < DODGE.touchR;
      const res = passTick(b.rec, dd);
      if (res === 'ontweken') noteDodge(d, 'host');
      else if (raak && noteHit(d, 'host').restart) s = segmentStart(d, s);
    }
    tempoTick(d, 'host', dt, s);
    s += speed * dt; t += dt;
  }
  const p = speler(d, 'host');
  return { dodged: p.dodged, hits: p.hits, restarts: p.restarts, finished: s >= len, waves: d.fired.size, beats: rec, t };
}
