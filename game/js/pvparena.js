// Samen spelen (#454): de PvP-minigame, een turf shooter. Twee teams veroveren drie zones op een veld in het Stadspark; de
// zones beslissen de wedstrijd, treffers en uitschakelingen tellen voor je eigen score. Echte wapens van het spel, geen verfmodus
// (besluit van de eigenaar, 24-10). Alleen spelers buiten de passieve stand doen mee (#447); dood door een medespeler kost niets.
// Bloed en gore mogen hier (constitutie 6): dit bestand tekent niets, het houdt alleen de stand bij.
// Pure regels, zonder three.js, netwerk en DOM; getest in scripts/pvparena_test.mjs. De wereldhaak staat in multiplayerpvpwereld.js.
//
// Een ronde: 2 tot 8 spelers, twee teams, 2,5 minuut. Wie in het veld staat en niet passief is, doet mee (geen late instap: de
// deelnemers liggen vast bij de start; elke speler, ook wie het spel opende, kan een ronde starten na een J/N-uitnodiging). Een
// zone is van het team met de meeste levende spelers erin (bij een gelijke stand verandert er niets); elk heel tijdvak van
// zoneS seconden levert een punt op. Wie neergaat staat na respawnS seconden weer op bij zijn eigen team (de gastenkant rekent
// dat zelf uit met arenaSpawnVoor), met beschermingstijd (die tijd bewaakt de PvP-laag, cooppvp.js). De host rekent; elke plek
// heeft een eigen score. De beloning is per team gelijk met een kleine bonus voor de winnaar (arenaBeloningPerTeam, #448) en er
// gaat nooit geld of voortgang af: dood kost niets. De gast leest de start (met zijn team), de stand en de uitslag uit de gewone
// meldingen (arenaMelding) en houdt zo zijn eigen bord bij (multiplayerpvpwereld.js).

export const ARENA = Object.freeze({
  id: 'pvparena',
  maxSpelers: 8,
  rondeS: 150,          // 2,5 minuut
  straal: 34,           // m: het speelveld rond de startplek
  zoneS: 2,             // s: zoveel seconden een zone in bezit is één punt
  zonePunt: 1,
  puntenTreffer: 1,     // per geraakte medespeler
  puntenNeer: 5,        // per uitgeschakelde medespeler
  respawnS: 3,          // s voor je weer opstaat
  beschermS: 3,         // s bescherming na het opstaan (cooppvp.js PVP.BESCHERM_S is langer; hier telt de korte variant)
  klaarS: 8,            // s: zolang blijft de uitslag staan
  uitnS: 10,            // s: de J/N-uitnodiging voor de ronde (net als bij een wedstrijd, multiplayerwedstrijd.js)
});

// De beloning per team (#448): gelijk per team, met een kleine bonus voor het winnende team. Dood kost niets; dit geld
// komt uit de ronde zelf en gaat via de coopdeel-laag naar de eigen save van elke speler (coopnet.js payGuest).
export const ARENA_BELONING = Object.freeze({ geld: 40, winst: 15 });

export const ARENA_TEAMS = Object.freeze([
  { id: 'noord', naam: 'Noord', kleur: '#4aa3ff' },
  { id: 'zuid', naam: 'Zuid', kleur: '#ff9a3c' },
]);

// De zones en de opstelplaatsen in meters rond het midden (u langs de as, v dwars erop). Drie zones: het midden en twee
// vleugels, zodat je moet kiezen tussen vasthouden en omsingelen.
const ZONES = Object.freeze([
  { id: 'midden', u: 0, v: 0, r: 7 },
  { id: 'west', u: -20, v: 0, r: 6 },
  { id: 'oost', u: 20, v: 0, r: 6 },
]);
const SPAWNS = Object.freeze([
  [{ u: -5, v: -26 }, { u: 5, v: -26 }, { u: -12, v: -23 }, { u: 12, v: -23 }],
  [{ u: -5, v: 26 }, { u: 5, v: 26 }, { u: -12, v: 23 }, { u: 12, v: 23 }],
]);

export const ARENA_TEKST = {
  naam: 'PvP-arena: het veld in het Stadspark',
  titel: 'PVP-ARENA',
  prompt: 'PvP-arena',
  promptSub: 'Twee teams, drie zones: druk op E om te beginnen',
  promptSolo: 'Alleen met Samen spelen en minstens twee spelers buiten de passieve stand',
  alBezig: 'Er loopt al een ronde in de PvP-arena.',
  min: 'De PvP-arena heeft minstens twee spelers buiten de passieve stand nodig, allebei in het veld.',
  passief: 'De PvP-arena is alleen voor spelers buiten de passieve stand. Zet de passieve stand eerst uit.',
  voertuig: 'Stap eerst uit: de PvP-arena begint te voet.',
  plek: 'Ga bij het veld staan en druk op E.',
  neer: (dader, doel) => `${dader} schakelde ${doel} uit in de arena.`,
  uitslag: (noord, zuid) => `Arena afgelopen: Noord ${noord}, Zuid ${zuid}.`,
  gelijk: (noord, zuid) => `Arena afgelopen: gelijk, ${noord} tegen ${zuid}.`,
  rematch: 'Druk op E bij het veld voor een nieuwe ronde.',
  // De gastenkant (#454): dezelfde gewone meldingen (coopnet.js 'melding', hoogstens 90 tekens), met het eigen team erin.
  label: 'de PvP-arena',
  vraagt: 'Je vraagt de PvP-arena te starten.',
  hostVraag: (naam) => `${naam} wil de PvP-arena starten. Doe je mee? J = ja, N = nee.`,
  verstuurd: (sec) => `Uitnodiging verstuurd: over ${sec} s begint de ronde, of druk nog eens op E.`,
  meedoen: 'Je doet mee: zorg dat je in het veld staat als de ronde begint.',
  nee: 'Je doet niet mee: de ronde loopt zonder jou door.',
  niemand: 'Niemand deed mee: de ronde gaat niet door.',
  opstaan: 'Je staat zo weer op: wacht even.',
  wacht: 'Er loopt al een uitnodiging. Wacht of druk op E bij het veld.',
  nietInVeld: 'Je stond niet in het veld: je deed deze ronde niet mee.',
  startJij: (team) => `De PvP-arena begint: jij speelt in team ${team}. Drie zones, 2,5 minuut.`,
  einde: (uitslag, geld, team) => `${uitslag} Team ${team}: €${geld}. Dood kostte niets.`,
  kreeg: (geld, team) => `Je kreeg €${geld} in je eigen spel (team ${team}).`,
};

export const ARENA_ZONE_NAAM = Object.freeze({ midden: 'Midden', west: 'West', oost: 'Oost' });

const fin = (n) => Number.isFinite(n);
const deelnemer = (ar, slot) => (ar && ar.deeln ? ar.deeln.find((d) => d.slot === slot) || null : null);

// Een plek in het veld, gedraaid om het midden.
function plek(ar, u, v) {
  const c = Math.cos(ar.rot), s = Math.sin(ar.rot);
  return { x: ar.x + c * u - s * v, y: ar.y + s * u + c * v };
}

// x, y: het midden van het veld in wereldmeters; rot: de as van het veld (radialen).
export function maakArena({ x = 0, y = 0, rot = 0 } = {}) {
  const ar = {
    id: ARENA.id, x: fin(x) ? x : 0, y: fin(y) ? y : 0, rot: fin(rot) ? rot : 0, r: ARENA.straal,
    zones: [], spawns: [[], []], deeln: [], score: [0, 0], zoneS: [0, 0],
    fase: 'wacht', t: 0, klaarTot: 0, n: 0, reden: null,
  };
  for (const z of ZONES) { const p = plek(ar, z.u, z.v); ar.zones.push({ id: z.id, x: p.x, y: p.y, r: z.r, eigenaar: null }); }
  for (let t = 0; t < 2; t++) for (const s of SPAWNS[t]) ar.spawns[t].push(plek(ar, s.u, s.v));
  return ar;
}

// ---------------------------------------------------------------- deelnemers
// Wie mag meedoen: niet passief, nog niet in de lijst, een ronde die nog niet loopt, en er is plek. `passief` komt van
// cooppvp.isPassief (de PvP-laag beslist; dit bestand kent geen netwerk).
export function arenaMeld(ar, slot, naam, passief) {
  if (!ar || ar.fase !== 'wacht') return { ok: false, reden: 'bezig' };
  if (!Number.isInteger(slot) || slot < 0 || slot > 15) return { ok: false, reden: 'onbekend' };
  if (passief) return { ok: false, reden: 'passief' };
  if (deelnemer(ar, slot)) return { ok: false, reden: 'al' };
  if (ar.deeln.length >= ARENA.maxSpelers) return { ok: false, reden: 'vol' };
  ar.deeln.push({ slot, naam: String(naam || 'Speler').slice(0, 24), team: 0, punten: 0, treffers: 0, uitschakelingen: 0, neer: 0, doodTot: 0 });
  return { ok: true, reden: '' };
}
// De teams eerlijk verdelen: op plek gesorteerd om en om. Alleen bij de start, dus niemand wisselt halverwege.
function verdeel(ar) {
  ar.deeln.sort((a, b) => a.slot - b.slot);
  ar.deeln.forEach((d, i) => { d.team = i % 2; });
}
// Begint de ronde? Minstens twee spelers, verdeeld over twee teams. Geeft { ok, reden }.
export function arenaStart(ar, nu = 0) {
  if (!ar || ar.fase !== 'wacht') return { ok: false, reden: 'bezig' };
  if (ar.deeln.length < 2) return { ok: false, reden: 'min' };
  verdeel(ar);
  ar.fase = 'bezig'; ar.t = 0; ar.score = [0, 0]; ar.zoneS = [0, 0]; ar.reden = null; ar.n++; ar.klaarTot = 0;
  for (const d of ar.deeln) { d.punten = 0; d.treffers = 0; d.uitschakelingen = 0; d.neer = 0; d.doodTot = 0; }
  for (const z of ar.zones) z.eigenaar = null;
  return { ok: true, reden: '' };
}
// Iemand valt weg (of stopt). Halverwege de ronde telt hij niet meer mee; blijven er minder dan twee over, dan stopt de ronde.
export function arenaVerlaat(ar, slot, nu = 0) {
  if (!ar || !Number.isInteger(slot)) return false;
  const i = ar.deeln.findIndex((d) => d.slot === slot);
  if (i < 0) return false;
  ar.deeln.splice(i, 1);
  if (ar.fase === 'bezig') {
    ar.n++;
    for (const z of ar.zones) if (z.eigenaar != null && !ar.deeln.some((d) => d.team === z.eigenaar)) z.eigenaar = null;
    if (ar.deeln.length < 2) eindig(ar, 'te weinig spelers', nu);
  }
  return true;
}
// Stoppen (ook door de wereld: geen scherm meer, sessie weg).
export function arenaStop(ar, nu = 0) {
  if (!ar || ar.fase !== 'bezig') return false;
  eindig(ar, 'gestopt', nu);
  return true;
}
function eindig(ar, reden, nu) {
  ar.fase = 'klaar'; ar.reden = reden; ar.n++;
  ar.klaarTot = (fin(nu) ? nu : ar.t) + ARENA.klaarS;
}

export const arenaDeelnemer = deelnemer;
export const levend = (ar, slot, nu) => { const d = deelnemer(ar, slot); return !!d && !(d.doodTot > nu); };
export const arenaInVeld = (ar, x, y, marge = 0) => !!ar && fin(x) && fin(y) && Math.hypot(x - ar.x, y - ar.y) <= ar.r + marge;

// ---------------------------------------------------------------- punten en neergaan
// Een treffer van `dader` op `doel` in de arena. Alleen tussen twee deelnemers van verschillende teams, en alleen als de
// wedstrijd loopt; de schade zelf is al door de PvP-laag goedgekeurd (beide spelers buiten de passieve stand).
export function arenaTreffer(ar, dader, doel, bedrag = 0, nu = 0) {
  if (!ar || ar.fase !== 'bezig') return { ok: false, reden: 'fase' };
  if (!Number.isFinite(bedrag) || bedrag <= 0) return { ok: false, reden: 'geen' };
  const d = deelnemer(ar, dader), t = deelnemer(ar, doel);
  if (!d || !t || dader === doel) return { ok: false, reden: 'onbekend' };
  if (!levend(ar, dader, nu) || !levend(ar, doel, nu)) return { ok: false, reden: 'neer' };
  if (d.team === t.team) return { ok: false, reden: 'eigen team' }; // vrienden raken telt niet
  d.treffers++; d.punten += ARENA.puntenTreffer;
  return { ok: true, reden: '', punten: ARENA.puntenTreffer };
}
// `doel` gaat neer door `dader` (of door de wereld: dader null). Geeft het respawnpunt en de tijd dat hij weg blijft.
export function arenaNeer(ar, dader, doel, nu = 0) {
  if (!ar || ar.fase !== 'bezig') return { ok: false, reden: 'fase' };
  const t = deelnemer(ar, doel);
  if (!t) return { ok: false, reden: 'onbekend' };
  if (!fin(nu)) return { ok: false, reden: 'tijd' };
  t.neer++; t.doodTot = nu + ARENA.respawnS;
  const d = Number.isInteger(dader) && dader !== doel ? deelnemer(ar, dader) : null;
  if (d && d.team !== t.team) { d.uitschakelingen++; d.punten += ARENA.puntenNeer; }
  return { ok: true, reden: '', spawn: arenaSpawn(ar, doel), tot: t.doodTot, team: t.team };
}
// Waar iemand van zijn team weer opstaat (per plek een eigen hoekje, zodat twee spelers niet op dezelfde plek staan).
export function arenaSpawn(ar, slot) {
  const d = deelnemer(ar, slot);
  if (!d) return null;
  return arenaSpawnVoor(ar, d.team, slot);
}
// Hetzelfde, maar zonder deelnemerslijst: de gastenkant van de arena kent alleen zijn eigen team en plek (#454).
export function arenaSpawnVoor(ar, team, slot) {
  if (!ar) return null;
  const lijst = ar.spawns[team | 0] || [];
  if (!lijst.length) return { x: ar.x, y: ar.y };
  return { ...lijst[Math.abs(Math.floor(Number(slot) || 0)) % lijst.length] };
}

// ---------------------------------------------------------------- de klok
// Elke stap: de tijd loopt, de zones wisselen van eigenaar en de punten erbij. `lichamen` is [{ slot, x, y }]: de levende
// deelnemers met hun plek. Geeft de gebeurtenissen van deze stap ({ type: 'eind', reden } of { type: 'zone', zone, team }).
export function arenaTik(ar, dt, lichamen = [], nu = 0) {
  if (!ar || ar.fase !== 'bezig') return [];
  const stap = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 1) : 0; // een hapering telt niet als verloren tijd
  ar.t += stap;
  const uit = [];
  const pos = new Map();
  for (const l of lichamen || []) if (l && Number.isInteger(l.slot) && fin(l.x) && fin(l.y)) pos.set(l.slot, l);
  for (const z of ar.zones) {
    let noord = 0, zuid = 0;
    for (const d of ar.deeln) {
      if (!levend(ar, d.slot, nu)) continue;
      const l = pos.get(d.slot); if (!l) continue;
      if (Math.hypot(l.x - z.x, l.y - z.y) > z.r) continue;
      if (d.team === 0) noord++; else zuid++;
    }
    const eigen = noord > zuid ? 0 : zuid > noord ? 1 : null;
    if (eigen !== null && eigen !== z.eigenaar) { z.eigenaar = eigen; uit.push({ type: 'zone', zone: z.id, team: eigen }); }
    if (z.eigenaar === null) continue;
    const was = ar.zoneS[z.eigenaar];
    ar.zoneS[z.eigenaar] += stap;
    while (ar.zoneS[z.eigenaar] >= ARENA.zoneS) { ar.zoneS[z.eigenaar] -= ARENA.zoneS; ar.score[z.eigenaar] += ARENA.zonePunt; }
    if (ar.zoneS[z.eigenaar] < was) uit.push({ type: 'punt', team: z.eigenaar });
  }
  if (ar.t >= ARENA.rondeS) eindig(ar, 'tijd', nu);
  if (ar.fase === 'klaar') uit.push({ type: 'eind', reden: ar.reden });
  return uit;
}

// ---------------------------------------------------------------- de stand en de uitslag
export function arenaStand(ar) {
  const rijen = (ar ? ar.deeln : []).map((d) => ({
    slot: d.slot, naam: d.naam, team: d.team, punten: d.punten, treffers: d.treffers,
    uitschakelingen: d.uitschakelingen, neer: d.neer,
  })).sort((a, b) => (a.team - b.team) || (b.punten - a.punten) || (a.slot - b.slot));
  return {
    fase: ar ? ar.fase : 'wacht', t: ar ? ar.t : 0, rest: ar ? Math.max(0, ARENA.rondeS - ar.t) : ARENA.rondeS,
    score: ar ? [...ar.score] : [0, 0], zones: ar ? ar.zones.map((z) => ({ id: z.id, eigenaar: z.eigenaar })) : [], rijen,
  };
}
// De winnaar: het team met de meeste zonepunten; bij een gelijke stand beslist het aantal uitschakelingen, daarna is het gelijk.
export function arenaWinnaar(ar) {
  if (!ar) return null;
  const [a, b] = ar.score;
  if (a !== b) return a > b ? 0 : 1;
  const kills = [0, 0];
  for (const d of ar.deeln) kills[d.team] += d.uitschakelingen;
  if (kills[0] !== kills[1]) return kills[0] > kills[1] ? 0 : 1;
  return null;
}
export function arenaUitslag(ar) {
  const stand = arenaStand(ar);
  const winnaar = arenaWinnaar(ar);
  return {
    ...stand,
    winnaar,
    tekst: winnaar == null ? ARENA_TEKST.gelijk(stand.score[0], stand.score[1]) : ARENA_TEKST.uitslag(stand.score[0], stand.score[1]),
  };
}
// Eén korte regel voor de bestaande meldingen (coopnet.js: 'melding', hoogstens 90 tekens), zonder nieuw netwerkformaat.
// De gastenkant leest hem terug met arenaLeesRegel en telt de klok zelf door (#454).
export function arenaRegelVan(score, rest) {
  const s = Array.isArray(score) ? score : [0, 0], t = Number.isFinite(rest) ? Math.max(0, rest) : 0;
  const m = Math.floor(t / 60), r = Math.floor(t % 60);
  return `${ARENA_TEAMS[0].naam} ${s[0] | 0} - ${s[1] | 0} ${ARENA_TEAMS[1].naam} · ${m}:${r < 10 ? '0' : ''}${r}`.slice(0, 90);
}
export function arenaRegel(ar) {
  const s = arenaStand(ar);
  return arenaRegelVan(s.score, s.rest);
}

// ---------------------------------------------------------------- de beloning per team (#448, gastenkant #454)
// Elk team krijgt hetzelfde bedrag, het winnende team een kleine bonus. Er gaat nooit geld af: dood kost niets. De host
// betaalt dit één keer per ronde uit via de coopdeel-laag (coopnet.js deelMetGasten/payGuest), per speler in zijn eigen save.
export function arenaBeloningPerTeam(ar) {
  const w = arenaWinnaar(ar);
  return ARENA_TEAMS.map((t, i) => ({ team: i, naam: t.naam, winnaar: w === i, geld: ARENA_BELONING.geld + (w === i ? ARENA_BELONING.winst : 0) }));
}
// Wat deze deelnemer krijgt; null voor wie niet meedeed.
export function arenaBeloning(ar, slot) {
  const d = deelnemer(ar, slot);
  if (!d) return null;
  const rij = arenaBeloningPerTeam(ar)[d.team] || null;
  return rij ? { ...rij, slot } : null;
}

// ---------------------------------------------------------------- wat een gast van de meldingen leest (#454)
// De gastenkant gebruikt geen nieuw bericht: de host stuurt de start (met het eigen team), de stand en de uitslag als gewone
// 'melding' (coopnet.js). Deze functie leest ze terug; onbekende tekst geeft null. Puur, zodat pvparena_test het dekt.
export function arenaTeamUitMelding(tekst) {
  const t = typeof tekst === 'string' ? tekst : '';
  for (let i = 0; i < ARENA_TEAMS.length; i++) if (t.includes(`team ${ARENA_TEAMS[i].naam}`)) return i;
  return null;
}
// De standregel van arenaRegel terug: { score: [noord, zuid], rest }.
export function arenaLeesRegel(tekst) {
  const t = typeof tekst === 'string' ? tekst.trim() : '';
  const m = /^(\S+) (\d{1,4}) - (\d{1,4}) (\S+) · (\d{1,3}):(\d\d)$/.exec(t);
  if (!m || m[1] !== ARENA_TEAMS[0].naam || m[4] !== ARENA_TEAMS[1].naam) return null;
  return { score: [Number(m[2]), Number(m[3])], rest: Number(m[5]) * 60 + Number(m[6]) };
}
// Wat voor melding dit is: { soort: 'start', team } | { soort: 'stand', score, rest } | { soort: 'zone', zone, team } |
// { soort: 'neer', tekst } | { soort: 'eind', tekst }. De gastenkant houdt daarmee zijn eigen bord bij.
export function arenaMelding(tekst) {
  const t = typeof tekst === 'string' ? tekst.trim() : '';
  if (!t) return null;
  if (t.startsWith('De PvP-arena begint')) return { soort: 'start', team: arenaTeamUitMelding(t) };
  if (t.startsWith('Arena afgelopen')) return { soort: 'eind', tekst: t.slice(0, 90) };
  const zone = /^(.*) is van (.*)$/.exec(t);
  if (zone && Object.values(ARENA_ZONE_NAAM).includes(zone[1])) {
    const team = ARENA_TEAMS.findIndex((x) => x.naam === zone[2]);
    if (team >= 0) return { soort: 'zone', zone: zone[1], team };
  }
  const stand = arenaLeesRegel(t);
  if (stand) return { soort: 'stand', score: stand.score, rest: stand.rest };
  if (t.includes('schakelde') && t.endsWith('in de arena.')) return { soort: 'neer', tekst: t.slice(0, 90) };
  return null;
}
