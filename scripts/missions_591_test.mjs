// #591, codebase-review verhaal/missies: de vijf midden-/laagpunten uit het reviewrapport
// (docs/archief/review-archief-2026-11-06/verhaal-missies.md), elk met het gedrag dat nu geldt:
//
//  1. een gast-opdracht die niet start laat de keten van de gastheer niet meer op die opdracht staan;
//  2. een chase-stage wacht op ontbrekende wegdata in plaats van meteen te falen (en faalt daarna eerlijk);
//  3. vlak bij de start falen levert wel het Opnieuw-aanbod (en Enter start opnieuw), geen dode zone;
//  4. lazyStart zonder wegdata blijft armed, dus "even wachten" start de opdracht zodra de weg er is;
//  5. de O-skip in de inbraak is een spelerspad: halve beloning en geen rolpunt, niet de debughaak.
//
// De echte missions.js op een platte testkaart (scripts/node3d.mjs voor three.js en de DOM); alleen de
// kaart is nep, net als in coopmissie_motor_test.mjs. Geen opslag, geen browser.
//   node scripts/missions_591_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

let M = null;
const laad = async () => {
  M = await import('../game/js/missions.js');
  await import('../game/js/spelersregister.js');
};
await laad();
const { ververs } = await import('../game/js/spelersregister.js');
// het eindkaartje en de praatjes tekenen in de DOM; de stub van node3d.mjs heeft een body nodig
document.body = document.createElement('div');

let n = 0, fails = 0;
const t = (naam, f) => {
  n++;
  try { f(); console.log('ok    ' + naam); } catch (e) { fails++; process.exitCode = 1; console.log('FAIL  ' + naam + '\n      ' + (e.message || e)); }
};

// Platte kaart: alles is open, niets staat in de weg, geen hoogteverschil. De wegdata kan per test aan
// of uit, want daar gaat het in punten 1, 2 en 4 juist om.
const spot = (x, y) => ({ x, y, road: null });
const maakRoad = (x, y) => ({ x, y, road: { pts: [[x, y], [x + 1, y], [x + 1, y + 2], [x + 3, y + 2]], oneway: false } });
let wegen = true;
const KAART = {
  meta: { bounds: null, shops: [], garages: [], neighbourhoodPoints: [] }, water: [], roads: [], buildings: [], tiles: [],
  isOpenSpot: () => true, nearestRoadPoint: (x, y) => (wegen ? maakRoad(x, y) : null),
  openSpotNear: (x, y) => spot(x, y), findOpenSpawn: (x, y) => spot(x, y), spawnZ: () => 0,
  buildingsNear: () => [], roadsNear: () => [], isOnBridge: () => false, escapeBuilding: (x, y) => [x + 1, y + 1], roadAt: () => null,
  groundHeightAt: () => 0, surfaceAt: () => ({ z: 0 }), spawnState: () => ({}),
};
const wereld = () => {
  const toetsen = new Set();
  const w = {
    map: KAART, onRespawn: [], player: { x: 0, y: 0, z: 0, gz: 0, angle: 0, inVehicle: null, radius: 0.35, exitVehicle() { this.inVehicle = null; } },
    vehicles: [], pedestrians: [], wildlife: [], stats: { pedKills: 0, copKills: 0 }, health: 100, armor: 0,
    money: 0, wanted: 0, time: 0, coopPartners: [], meldingen: [],
    input: { wasPressed: (k) => toetsen.has(k), consume: (k) => toetsen.delete(k), isDown: () => false, toetsen },
    addMessage(t) { this.meldingen.push(t); },
  };
  ververs(w, 0);
  M.initMissions(w);
  return w;
};
const tik = (w, dt = 0.05) => { w.time += dt; M.updateMissions(dt, w); };
const tikk = (w, seconden, dt = 0.05) => { for (let i = 0; i < Math.round(seconden / dt); i++) tik(w, dt); };
const heeft = (w, re) => w.meldingen.some((m) => re.test(m));

// --- punt 1: een gast-opdracht die niet start, laat de keten van de gastheer met rust -------------
t('punt 1: mislukte gast-start zet de eigen keten van de gastheer terug', () => {
  wegen = true;
  const w = wereld();
  const lazy = M.getMissionDefs().findIndex((d) => d.lazyStart);
  assert.ok(lazy >= 0, 'er is een lazyStart-opdracht');
  const host = M.missionIndexById('kroegentocht');
  assert.ok(host >= 0, 'de gastheer staat op zijn eigen opdracht');
  assert.equal(M.trackMission(w, host), true);
  const voor = M.missionDebug.state();
  assert.equal(voor.index, host);

  wegen = false;
  const gestart = M.startMissionVoorGast(w, lazy);
  assert.equal(gestart, false, 'zonder wegdata start de opdracht van de gast niet');
  const na = M.missionDebug.state();
  assert.equal(na.index, host, 'de keten van de gastheer staat weer op zijn eigen opdracht');
  assert.equal(na.phase, 'idle', 'en is weer armeerbaar (geen cooldown van de gast)');
  assert.equal(na.armed, true, 'de eigen trigger staat weer klaar');
  assert.ok(heeft(w, /De weg hier wordt nog geladen/), 'de speler ziet waarom het niet startte');

  // dezelfde aanvraag met wegdata werkt gewoon en zet de gastStart zoals voorheen
  wegen = true;
  assert.equal(M.startMissionVoorGast(w, lazy), true, 'met wegdata start de opdracht van de gast wel');
  assert.equal(M.missionDebug.state().index, lazy);
});

// --- punt 2: een chase-stage wacht op de weg in plaats van meteen te falen -----------------------
const vet = () => {
  wegen = true;
  const w = wereld();
  const i = M.missionIndexById('vetgekaapt');
  assert.ok(i >= 0, 'de tankwagen-opdracht bestaat');
  assert.equal(M.missionDebug.start(w, i), true);
  tik(w); // stage 0 (board)
  return { w, def: M.getMissionDefs()[i] };
};

t('punt 2: chase-spawn wacht op de weg en pakt hem daarna op', () => {
  const { w, def } = vet();
  wegen = false;
  def.start.road = null;
  M.missionDebug.complete(w); // board -> chase
  assert.equal(M.missionDebug.state().stage, 1);
  tik(w);
  assert.equal(M.missionDebug.state().phase, 'active', 'de missie faalt niet meteen');
  assert.ok(heeft(w, /De weg hier wordt nog geladen/), 'de speler hoort dat er gewacht wordt');

  wegen = true; // de tegel streamt in
  tikk(w, 1);
  assert.equal(M.missionDebug.state().phase, 'active');
  assert.equal(w.vehicles.filter((v) => v.chaseTarget).length, 1, 'de tankwagen is er alsnog');
});

t('punt 2: chase-spawn faalt pas na de wachttijd, met een eerlijke reden', () => {
  const { w, def } = vet();
  wegen = false;
  def.start.road = null;
  M.missionDebug.complete(w);
  tikk(w, M.CHASE_SPAWN_WAIT_S + 1, 0.5);
  assert.notEqual(M.missionDebug.state().phase, 'active', 'na de wachttijd faalt de missie');
  assert.ok(heeft(w, /de tankwagen is niet gekomen/), 'met een reden die klopt');
  assert.equal(M.CHASE_SPAWN_RETRY_S < M.CHASE_SPAWN_WAIT_S, true, 'de herkansingen passen binnen de wachttijd');
});

// --- punt 3: geen dode zone vlak bij de start na een mislukking ----------------------------------
t('punt 3: vlak bij de start biedt de mislukking Opnieuw aan, en Enter start opnieuw', () => {
  wegen = true;
  const w = wereld();
  const i = M.missionIndexById('kroegentocht');
  assert.equal(M.missionDebug.start(w, i), true, 'de opdracht start');
  assert.equal(M.missionDebug.lose(w), true, 'en mislukt meteen');
  // de speler staat op het startpunt: dat was de dode zone
  tikk(w, 6, 1);
  const s = M.missionDebug.state();
  assert.equal(s.phase, 'idle');
  assert.equal(s.retry, true, 'het Opnieuw-aanbod blijft staan, ook op de start');
  assert.ok(heeft(w, /opnieuw beginnen\? Druk op Enter/), 'en de speler ziet de vraag');

  w.input.toetsen.add('enter');
  tik(w, 1);
  tikk(w, 2, 0.25);
  assert.equal(M.missionDebug.state().phase, 'active', 'Enter start de opdracht opnieuw, zonder weg te lopen');
});

// --- punt 4: lazyStart blijft wachten en start zodra de weg er is --------------------------------
t('punt 4: "even wachten" start de opdracht vanzelf zodra de weg er is', () => {
  wegen = true;
  const w = wereld();
  const i = M.getMissionDefs().findIndex((d) => d.lazyStart);
  const def = M.getMissionDefs()[i];
  w.player.x = def.start.x; w.player.y = def.start.y;
  assert.equal(M.trackMission(w, i), true);

  wegen = false;
  tik(w);
  let s = M.missionDebug.state();
  assert.equal(s.phase, 'cooldown', 'nog geen weg: de opdracht wacht');
  assert.equal(s.armed, true, 'maar blijft armed: de speler hoeft niet weg te lopen');
  assert.ok(heeft(w, /De weg hier wordt nog geladen/), 'de melding vraagt om te wachten');
  tikk(w, 6, 1); // de speler blijft staan, precies wat de melding vraagt
  assert.equal(M.missionDebug.state().armed, true);

  wegen = true; // de tegel streamt in
  tikk(w, 6, 1);
  assert.equal(M.missionDebug.state().phase, 'active', 'de opdracht start vanzelf, zonder de trigger te verlaten');
});

// --- punt 5: de O-skip in de inbraak is een spelerspad met halve beloning -----------------------
t('punt 5: de skipregel is dezelfde 50% als de verhaal-skip', () => {
  assert.equal(M.HEIST_SKIP_SHARE, 0.5);
  assert.equal(M.skipReward(400), 200);
  assert.equal(M.skipReward(950), 475);
  assert.equal(M.skipReward(0), 0);
});

const heistRun = () => {
  wegen = true;
  const w = wereld();
  const i = M.missionIndexById('museumkraak');
  assert.ok(i >= 0, 'de museumkraak bestaat');
  assert.equal(M.missionDebug.start(w, i), true);
  tik(w);
  return w;
};

t('punt 5: een overgeslagen heiststap betaalt de halve beloning, niet de volle', () => {
  const vol = heistRun();
  assert.equal(M.missionDebug.win(vol), true);
  assert.equal(vol.money, 400, 'zonder skip de volle beloning');

  const half = heistRun();
  const voor = M.missionDebug.state().stage;
  assert.equal(M.missionDebug.skipStage(half), true, 'de spelers-skip werkt');
  assert.equal(M.missionDebug.state().stage, voor + 1, 'de stage gaat verder');
  assert.equal(M.missionDebug.state().heistSkip, true);
  assert.ok(heeft(half, /halve beloning/), 'de speler hoort de regel');
  assert.equal(M.missionDebug.win(half), true);
  assert.equal(half.money, 200, 'met de skip de halve beloning');
  assert.ok(heeft(half, /\+€200/), 'de uitslag noemt het halve bedrag');
});

t('punt 5: een nieuwe poging begint zonder de skip van de vorige', () => {
  const w = heistRun();
  M.missionDebug.skipStage(w);
  assert.equal(M.missionDebug.state().heistSkip, true);
  assert.equal(M.missionDebug.start(w, M.missionIndexById('museumkraak')), false, 'niet dubbel starten tijdens de missie');
  M.missionDebug.win(w);
  assert.equal(M.missionDebug.start(w, M.missionIndexById('museumkraak')), true, 'opnieuw beginnen kan');
  assert.equal(M.missionDebug.state().heistSkip, false, 'de skip is gereset');
});

// De skip mag geen debughaak meer zijn: de O-tak roept de spelersfunctie aan, en heist.js kent de
// uitzondering op het rolpunt. (Het rolpunt zelf is in een solo-wereld niet zichtbaar in geld; deze
// broncontrole bewaakt dat de uitzondering niet stil verdwijnt.)
t('punt 5: geen missionDebug op het spelerspad en een credit-uitzondering voor het rolpunt', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
  const heist = fs.readFileSync(new URL('../game/js/heist.js', import.meta.url), 'utf8');
  assert.match(src, /if \(h === 'skip'\) \{ skipHeistStage\(world\); return; \}/, 'de O-tak gebruikt de spelers-skip');
  assert.doesNotMatch(src, /if \(h === 'skip'\) \{[\s\S]{0,200}missionDebug\.complete/, 'niet meer de debughaak');
  assert.match(src, /function skipHeistStage\(world\)[\s\S]{0,400}chainState\(\)\.heistSkip = true/, 'de skip zet de halve-beloningsvlag');
  assert.match(src, /heistLeaveStage\(world, cur, \{ credit: !chainState\(\)\.heistSkipStage \}\)/, 'een overgeslagen stage levert geen rolpunt op');
  assert.match(heist, /export function heistLeaveStage\(world, st, \{ credit = true \} = \{\}\)/, 'heistLeaveStage kent de uitzondering');
});

console.log(`missions_591_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);

