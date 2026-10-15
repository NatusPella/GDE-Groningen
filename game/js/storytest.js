// Automated story test (?storytest, desktop --story-test; loaded by main.js
// only then, with in-memory storage from devflags.js). Starts a new game and
// plays every available story step through the debug hooks: activities are
// completed the way a player would (purchases are paid), missions are
// started at their marker and finished objective by objective. H3 goes
// through the fail + "Sla deze missie over" path; the padel match, the story
// bumper-car ride and the demo flight are played for real (storyfun.js
// scenes included). Checks that the flow
// reaches "Wordt vervolgd" at the end of the last open part, that money
// never runs short (also when every mission is skipped) with a comfortable
// margin, that the economy targets hold (economyChecks), that an old save
// migrates, and logs a report. `console.log('[storytest-capture] name')`
// makes the desktop app save a screenshot per step.

import { skipCinematic, isCinematicActive, cinematicPoseIssues } from './cinematics.js';
import { heistWatchers, PLAN_BOUNDS } from './heist.js';
import { isInWater } from './util.js';
import { deliverOwnedVehicle } from './ownedvehicles.js';
import { skipStoryContact } from './storycontact.js';
import { STEPS, STEP_BY_ID, PARTS, stepAvailable, computeMoneyTimeline, missionIndexOf } from './storyarc.js';
import { getMissionDefs, isMissionActive } from './missions.js';
import { applySave, saveGame, loadLatestSave } from './savegame.js';
import { isVillageMiniActive } from './dorpsuitjes.js';
import { isActivityActive } from './activities.js';
import { getOwnedEntries, WEAPON_STOCK, VEHICLE_STOCK, CAR_UPGRADES, OUTFITS, replacementFee } from './shops.js';
import { repairCost, bustFine, HERO_REPLACE_FEE, SIDEJOB_PAY_MULT } from './economy.js';
import { getFurnitureSave } from './furniture.js';
import { validateSpots } from './spotcheck.js';
import { auditPassages } from './passagecheck.js';
import { probeRingSolids, driveRingLap, probeRailLifts, driveWaterCrossings } from './ringcheck.js';
import { requestRespawn } from './world.js';
import { nearestFacility } from './facilities.js';
import { realRoadNear } from './ommelandplace.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function key(k, code) {
  for (const t of [window, document]) {
    t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true }));
    t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true }));
  }
}

async function waitFor(fn, ms = 20000, step = 150) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    try { if (fn()) return true; } catch (e) { /* not yet */ }
    await sleep(step);
  }
  return false;
}

// Skips every cutscene until the game has been quiet for a moment.
async function drain(world, quietMs = 700) {
  let quietSince = performance.now();
  const t0 = performance.now();
  while (performance.now() - t0 < 25000) {
    if (isCinematicActive()) { skipCinematic(); quietSince = performance.now(); }
    if (world.pendingRespawn) quietSince = performance.now();
    if (performance.now() - quietSince > quietMs) return;
    await sleep(100);
  }
}

function overlay(text) {
  let el = document.getElementById('storytest-report');
  if (!el) {
    el = document.createElement('pre');
    el.id = 'storytest-report';
    el.style.cssText = 'position:fixed;left:12px;top:12px;z-index:99;max-width:560px;max-height:80vh;overflow:auto;background:rgba(10,12,16,.92);color:#dfe;font:12px/1.35 monospace;padding:10px;border-radius:8px;white-space:pre-wrap';
    document.body.appendChild(el);
  }
  el.textContent = text;
}

const MIN_MARGIN = 150;
const MIN_MARGIN_SKIP = 100;

const afterStep = (tl, id) => (tl.rows.find((r) => r.id === id) || {}).after ?? 0;

// Price checks against the story's money: arc costs match the shops, and the
// targets from the economy pass hold for a player who only does the story.
function economyChecks(check, tl) {
  const gun = (k) => WEAPON_STOCK.find((w) => w.key === k).gun;
  const cars = Object.values(VEHICLE_STOCK).filter((s) => s.kind === 'car' && s.price);
  const cheapestCar = Math.min(...cars.map((s) => s.price));
  const cost = (id) => STEP_BY_ID.get(id).cost;
  check('economy: omafiets price = k-fiets', cost('k-fiets') === VEHICLE_STOCK.omafiets.price);
  check('economy: incognito price = k-kraakspullen', cost('k-kraakspullen') === OUTFITS.tammo.find((o) => o.id === 'incognito').price);
  check('economy: motor tuning price = r-tuning', cost('r-tuning') === CAR_UPGRADES.find((u) => u.id === 'motor').price);
  // the definitive script: only the bike, the heist gear and the boat are story purchases (tuning is recommended)
  // a train fare (or an ice cream, r-trein's other pick) is not a purchase
  const buys = STEPS.filter((s) => s.cost && !s.optional && s.kind === 'activity' && s.goal?.type !== 'train' && s.goal?.type !== 'hideout');
  check('economy: three story purchases', buys.length === 3, buys.map((s) => s.id).join(', '));
  check('economy: a car is within reach after the Kop', afterStep(tl, 'H6') >= cheapestCar, `€${afterStep(tl, 'H6')} na H6, goedkoopste €${cheapestCar}`);
  const rewards = STEPS.filter((s) => s.kind === 'mission' && s.reward).map((s) => s.reward);
  const avg = Math.round(rewards.reduce((a, b) => a + b, 0) / rewards.length);
  const mug = VEHICLE_STOCK.mug.price;
  const dent = repairCost(30, 1, false);
  const wreck = replacementFee({ spec: VEHICLE_STOCK.mug });
  const earlyCash = afterStep(tl, 'H3');
  check('economy: gun + repair after H3', earlyCash >= gun('pistol') + dent, `€${earlyCash} na H3`);
  check('economy: normal repair cheap', dent <= avg * 0.08, `€${dent} bij 30% schade, missie gem. €${avg}`);
  check('economy: wreck restore moderate', wreck <= avg * 0.25, `€${wreck} voor een Mug`);
  const romp = afterStep(tl, 'H13');
  const top = ['wervelwind', 'raket', 'midibus', 'speedboot', 'wiekenwubbo'].map((k) => VEHICLE_STOCK[k].price);
  check('economy: top vehicles reachable after the Romp', romp >= Math.max(...top), `€${romp} na H13, duurste €${Math.max(...top)}`);
  check('economy: top vehicles still a goal after the Kop', afterStep(tl, 'H6') < Math.max(...top), `€${afterStep(tl, 'H6')} na H6`);
  const fine = bustFine(5, 1000);
  check('economy: bust fine gentle', fine <= 200, `€${fine} bij 5 sterren en €1000`);
  return [
    ['gem. missiebeloning', `€${avg}`],
    ['start / na H3 / na H6 / na H13 / eind', `€${tl.rows[0].before} / €${earlyCash} / €${afterStep(tl, 'H6')} / €${romp} / €${tl.end}`],
    ['wapens (pistool / uzi / hagel)', WEAPON_STOCK.slice(0, 3).map((w) => `€${w.gun} (+€${w.ammoPrice})`).join(' / ')],
    ['overige wapens', WEAPON_STOCK.slice(3).map((w) => `${w.key} €${w.gun}`).join(', ')],
    ['Mug / Wervelwind / Raket / Midibus', ['mug', 'wervelwind', 'raket', 'midibus'].map((k) => `€${VEHICLE_STOCK[k].price}`).join(' / ')],
    ['speedboot', `€${VEHICLE_STOCK.speedboot.price}`],
    ['reparatie 30% / 100% schade', `€${dent} / €${repairCost(100, 3, false)}`],
    ['wrak Mug / Raket / Escapade', `€${wreck} / €${replacementFee({ spec: VEHICLE_STOCK.raket })} / €${HERO_REPLACE_FEE}`],
    ['tuning motor/remmen/grip/turbo', CAR_UPGRADES.map((u) => `€${u.price}`).join(' / ')],
    ['boete opgepakt 1 / 5 sterren (bij €1000)', `€${bustFine(1, 1000)} / €${fine}`],
    ['bijbaan loonfactor', `x${SIDEJOB_PAY_MULT}`],
  ];
}

export async function runStoryTest(world) {
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason && e.reason.message || e.reason)));
  const report = { result: 'running', steps: [], checks: [], errors, startedAt: new Date().toISOString() };
  window.__storyTestReport = report;
  const check = (name, ok, info = '') => { report.checks.push({ name, ok: !!ok, info }); return ok; };
  const S = () => window.__story;
  const capture = (name) => console.log('[storytest-capture] ' + name);

  try {
    await waitFor(() => document.querySelector('#start-screen .ss-item'), 120000);
    await sleep(800);
    key('Enter', 'Enter');
    check('game started', await waitFor(() => document.body.classList.contains('game-started'), 30000));
    await drain(world, 1500);
    world.devInvuln = true;

    // every start and target point is on open ground you can walk away from
    const spots = validateSpots(world);
    for (const b of spots.bad) console.log('[spotcheck]', b.kind, b.id, b.x, b.y, b.why);
    check(`all ${spots.total} spots reachable`, !spots.bad.length, spots.bad.map((b) => `${b.kind} ${b.id} (${b.x}, ${b.y}): ${b.why}`).join('; '));
    // no street, cycleway or footway runs through a solid wall or an invisible hole
    const pa = auditPassages(world.map);
    for (const e of pa.bad) console.log('[passagecheck]', e.cls, e.road, e.building, e.x, e.y, 'depth', e.depth, 'len', e.len);
    check(`ways through buildings are passages or doors (${JSON.stringify(pa.counts)})`, !pa.bad.length, pa.bad.slice(0, 30).map((e) => `${e.cls} ${e.road} in ${e.building} (${e.x}, ${e.y})`).join('; '));
    // nothing solid across the ring race lap and the ring roads, and a lap really drives
    const solids = probeRingSolids(world);
    check('ring roads free of solid obstacles', !solids.length, solids.slice(0, 40).map((h) => `${h.route} +${h.s} m ${h.kind} ${h.what} (${h.x}, ${h.y}, z ${h.z})`).join('; '));
    const railLifts = probeRailLifts(world);
    check('rail lifts can be walked, driven and cycled up', !railLifts.length, railLifts.map((h) => `lift ${h.lift} ${h.how}: ${h.what} (${h.x}, ${h.y}, z ${h.z})`).join('; '));
    const wet = await driveWaterCrossings(world);
    check(`cars cross all ${wet.drives} major-road water crossings at 80 km/h`, !wet.fails.length, wet.fails.slice(0, 30).map((f) => `${f.route} (${f.dir}) bij (${f.at}): ${f.what} op (${f.x}, ${f.y}, z ${f.z}) ${f.v} km/u`).join('; '));
    const lap = await driveRingLap(world);
    check('scripted car drives a full ring lap', lap.scripted.ok, JSON.stringify(lap.scripted));
    check('AI racers finish a full ring lap', lap.ai.ok, JSON.stringify(lap.ai));
    await drain(world);

    // desktop --validate-spots: only the spot check
    story: {
      if (new URLSearchParams(location.search).has('spotsonly')) break story;
      // money timeline over the whole arc, planned steps included
      const tl = computeMoneyTimeline();
      check('money timeline never below zero', tl.low >= 0, `laagste marge €${tl.low}, eind €${tl.end}`);
      check('money timeline comfortable margin', tl.low >= MIN_MARGIN, `laagste marge €${tl.low}, minimaal €${MIN_MARGIN}`);
      const tlSkip = computeMoneyTimeline(undefined, 0.5);
      check('money timeline ok when every mission is skipped', tlSkip.low >= MIN_MARGIN_SKIP, `laagste marge €${tlSkip.low}, minimaal €${MIN_MARGIN_SKIP}`);
      report.timeline = tl.rows;
      report.economy = economyChecks(check, tl);
      const lastPart = Object.keys(PARTS).filter((k) => PARTS[k].open).pop();
      // every step says who plays it; its phone lines come from the other one
      const noPlayer = STEPS.filter((q) => q.player !== 'tammo' && q.player !== 'anita').map((q) => q.id);
      check('every step has a player', !noPlayer.length, noPlayer.join(', '));
      const selfTalk = STEPS.filter(stepAvailable).filter((q) => {
        const me = q.player === 'anita' ? 'A' : 'T';
        return [q.lead, q.done, q.say, ...(q.after || []), ...(q.beat || [])].some((l) => l && l[0] === me);
      }).map((q) => q.id);
      check('phone lines come from the companion', !selfTalk.length, selfTalk.join(', '));
      let swaps = 0, prevChar = null;
      const defs = getMissionDefs();
      for (const s of STEPS.filter((q) => q.kind === 'mission' && stepAvailable(q))) {
        const d = defs[missionIndexOf(s.mission)];
        check(`reward ${s.id} matches missions.js`, d && d.reward === s.reward, d ? `arc €${s.reward}, def €${d.reward}` : 'geen def');
      }

      let n = 0;
      for (let guard = 0; guard < 90; guard++) {
        await drain(world);
        const cur = S().current();
        if (!cur) { check('current step', false, 'geen stap'); break; }
        if (cur.end) break;
        const step = STEP_BY_ID.get(cur.id);
        const entry = { id: cur.id, kind: cur.kind, title: cur.title, moneyBefore: Math.round(world.money), ok: false, notes: [] };
        report.steps.push(entry);
        const t0 = performance.now();
        if (step.cost) {
          entry.notes.push(world.money >= step.cost ? `kan €${step.cost} betalen` : `te kort voor €${step.cost}: voorschot verwacht`);
          check(`money ok before ${cur.id}`, world.money >= step.cost, `€${Math.round(world.money)} voor €${step.cost}`);
        }
        if (step.player) {
          // the swap waits for a quiet moment: keep skipping scenes meanwhile
          // (story contacts too: a fast run piles them up, a radio call from a mission ago holds the handover off)
          const ok = await waitFor(() => {
            if (isCinematicActive()) skipCinematic();
            else skipStoryContact();
            return world.player.character === step.player && (!world.companion || world.companion.character !== step.player);
          }, 20000);
          check(`${cur.id}: plays as ${step.player}`, ok, ok ? world.player.character : JSON.stringify(S().swapInfo()));
          if (prevChar && prevChar !== world.player.character) { swaps++; entry.notes.push(`speelt als ${world.player.character}`); }
          prevChar = world.player.character;
          await drain(world, 300);
        }
        // the calendar: every step plays on its own day (calendar.js), Ontzet on vrijdag 28 augustus
        const cal = window.__calendar && window.__calendar.get();
        check(`${cur.id}: on its day`, cal && cal.day >= window.__calendar.stepDay(cur.id) && cal.day <= cal.bounds.max, cal && `${cal.info.long} (dag ${cal.day})`);
        if (cur.id === 'H18') check('H18 on Gronings Ontzet', cal && cal.info.long === 'Vrijdag 28 augustus' && cal.specials[0] === 'ontzet', cal && cal.specials.join());
        if (cur.kind === 'activity') {
          const courts0 = window.__storyFun ? window.__storyFun.state().played.court : 0;
          S().teleport();
          await sleep(900);
          capture(`${String(++n).padStart(2, '0')}-${cur.id}`);
          check(`${cur.id}: no skip offered before a first try`, !S().canSkip() && !S().view().canSkip);
          const before = world.money;
          if (step.goal && step.goal.type === 'padel' && window.__padel) {
            // the twins' challenge at the court, then a real match there, ended at once (a loss still counts)
            const pd = window.__padel, sf = window.__storyFun;
            if (sf && sf.court) {
              // walking up to the court (the teleport) may already have played it
              const met = sf.state().played.court > courts0 || sf.court();
              check(`${cur.id}: Durk and Douwe challenge you at the court`, met, JSON.stringify(sf.state()));
              await waitFor(() => { if (isCinematicActive()) skipCinematic(); return !isCinematicActive(); }, 15000, 200);
            }
            const started = pd.start();
            await sleep(1500);
            const st = pd.state();
            check(`${cur.id}: padel match starts against the twins`, started && st && st.twins, JSON.stringify(st));
            capture(`${String(n).padStart(2, '0')}-${cur.id}-match`);
            pd.finish(false);
            check(`${cur.id}: padel match completes the step`, await waitFor(() => { const c = S().current(); return !c || c.id !== cur.id; }, 5000));
            check(`${cur.id}: padel gives full health`, world.health >= 100, String(world.health));
          } else if (step.goal && step.goal.type === 'kermis' && window.__kermis && window.__activities) {
            // the story ride from the booth (E): free even when broke, Durk & Douwe in two of the cars
            const km = window.__kermis, sf = window.__storyFun;
            const p = world.player, s = km.spot();
            if (p.inVehicle) p.exitVehicle(world.map, world);
            p.x = s.x; p.y = s.y;
            world.wanted = 0;
            const cash = world.money;
            world.money = 1;
            const scenes = sf.state().played.kermis;
            window.__activities.get('kermis').interact(world);
            await sleep(1200);
            const st = km.state();
            check(`${cur.id}: story ride starts free with Durk and Douwe`, st && st.twins.join() === 'durk,douwe' && world.money === 1, JSON.stringify({ st, money: world.money }));
            world.money = cash;
            capture(`${String(n).padStart(2, '0')}-${cur.id}-ride`);
            km.finish();
            check(`${cur.id}: the ride completes the step`, await waitFor(() => { const c = S().current(); return !c || c.id !== cur.id; }, 15000));
            check(`${cur.id}: the twins' scene plays after the ride`, await waitFor(() => sf.state().played.kermis > scenes, 20000), JSON.stringify(sf.state()));
            await sleep(2500);
            capture(`${String(n).padStart(2, '0')}-${cur.id}-scene`);
            await sleep(800);
            check(`${cur.id}: done text follows the scene`, await waitFor(() => { if (isCinematicActive()) skipCinematic(); return !sf.state().pending; }, 20000, 200), JSON.stringify(sf.state()));
          } else if (step.goal && step.goal.type === 'eikea' && window.__storyEikea && window.__home) {
            // EIKEA: the Escapade at the loading dock, three boxes on the roof, one knock costs one, home, upstairs
            const se = window.__storyEikea, hm = window.__home, p = world.player;
            const shop = se.shop();
            const g0 = world.storyGuide;
            check(`${cur.id}: the guide points to EIKEA`, !!shop && !!g0 && Math.hypot(g0.x - shop.x, g0.y - shop.y) < 5, JSON.stringify(g0));
            const car = world.vehicles.find((v) => v.isHeroCar && !v.wrecked);
            if (shop && car) {
              if (p.inVehicle) p.exitVehicle(world.map, world);
              car.x = shop.x; car.y = shop.y; car.speed = 0; car.homeStored = false;
              p.x = car.x; p.y = car.y;
              world.teleported = world.time;
              p.enterVehicle(car, world);
              const loaded = await waitFor(() => (se.state() || {}).phase === 'carry', 10000);
              check(`${cur.id}: the dock scene loads three boxes on the roof`, loaded && se.state().boxes.length === 3 && car.roofBoxes === 3, JSON.stringify(se.state()));
              await waitFor(() => { if (isCinematicActive()) skipCinematic(); return !isCinematicActive(); }, 20000);
              capture(`${String(n).padStart(2, '0')}-${cur.id}-dak`);
              world.lastImpact = { strength: 1, time: world.time + 0.01, x: car.x, y: car.y };
              check(`${cur.id}: a hard knock costs one box`, await waitFor(() => se.state().boxes.length === 2 && car.roofBoxes === 2, 4000), JSON.stringify(se.state()));
              const d = hm.home.garage.door;
              car.x = d.cx + d.nx * 6; car.y = d.cy + d.ny * 6; car.speed = 0;
              p.x = car.x; p.y = car.y;
              world.teleported = world.time;
              check(`${cur.id}: the boxes come off at home`, await waitFor(() => (se.state() || {}).phase === 'home', 10000) && !car.roofBoxes, JSON.stringify({ st: se.state(), d: Math.round(Math.hypot(car.x - se.home().x, car.y - se.home().y)) }));
              p.exitVehicle(world.map, world);
              await sleep(400);
              world.wanted = 0;
              hm.enter();
              const built = await waitFor(() => { if (isCinematicActive()) skipCinematic(); const c = S().current(); return !c || c.id !== cur.id; }, 20000);
              check(`${cur.id}: the assembly scene upstairs completes the step`, built, JSON.stringify({ st: se.state(), home: hm.state() }));
              const own = getFurnitureSave().owned;
              check(`${cur.id}: the carried pieces are in the flat, the lost one is not`, own.includes('bed') && own.includes('kast') && !own.includes('lamp'), JSON.stringify(own));
              hm.leave();
              await sleep(1500);
            } else S().complete();
          } else if (step.goal && (step.goal.type === 'night' || step.goal.type === 'home') && step.homeScene && window.__home) {
            // waiting at home: go home, up in the lift, the scene plays and the step is done
            const hm = window.__home;
            if (world.player.inVehicle) world.player.exitVehicle(world.map, world);
            hm.goHome();
            await sleep(1500);
            world.wanted = 0;
            hm.enter();
            const sceneDone = await waitFor(() => { if (isCinematicActive()) skipCinematic(); const c = S().current(); return !c || c.id !== cur.id; }, 20000);
            check(`${cur.id}: the scene at home completes the step`, sceneDone, JSON.stringify({ cur: S().current(), home: hm.state() }));
            if (step.goal.type === 'night') check(`${cur.id}: it is night after the wait`, (world.clock % 24) >= 21 || (world.clock % 24) < 5, String(world.clock));
            hm.leave();
            await sleep(1500);
          } else if (step.goal && step.goal.type === 'flight' && window.__storyFun) {
            // Rotor Roelf with his demo heli on Eelde: walking up plays his scene and completes the step (H15 flies it)
            const sf = window.__storyFun, p = world.player;
            const guide = world.storyGuide;
            check(`${cur.id}: the guide points to Eelde`, !!guide && Math.hypot(guide.x - step.goal.heli[0], guide.y - step.goal.heli[1]) < 30, JSON.stringify(guide));
            const v = (await waitFor(() => sf.demo(), 5000)) && sf.demo();
            check(`${cur.id}: Rotor Roelf's demo heli waits on his pad, not owned`, v && v.isHeli && v.missionCar && !v.playerOwned && Math.hypot(v.x - step.goal.heli[0], v.y - step.goal.heli[1]) < 12, JSON.stringify(sf.state()));
            if (v) {
              if (p.inVehicle) p.exitVehicle(world.map, world);
              p.x = v.x - 6; p.y = v.y + 5;
              check(`${cur.id}: Rotor Roelf's scene plays at his heli`, await waitFor(() => sf.state().played.meet > 0, 8000), JSON.stringify({ ...sf.state(), mission: isMissionActive(), cine: isCinematicActive(), inVehicle: p.inVehicle ? p.inVehicle.type || p.inVehicle.model || true : false, d: Math.round(Math.hypot(p.x - v.x, p.y - v.y) * 10) / 10 }));
              const met = await waitFor(() => { if (isCinematicActive()) skipCinematic(); const c = S().current(); return !c || c.id !== cur.id; }, 20000);
              check(`${cur.id}: meeting Roelf completes the step`, met, JSON.stringify(S().current()));
            }
            check(`${cur.id}: no helicopter bought for the demo flight`, !getOwnedEntries().some((o) => o.spec && o.spec.kind === 'heli'));
          } else if (step.goal && step.goal.type === 'carbid' && window.__carbid && window.__activities && window.__storyFun) {
            // the lift: on foot in town, Henk drops the Escapade off for free; then a real round at boer Roelf's churn
            const cb = window.__carbid, sf = window.__storyFun, p = world.player;
            if (p.inVehicle) p.exitVehicle(world.map, world);
            const town = world.map.nearestRoadPoint(701.21, -338.36, 120, false) || { x: 701.21, y: -338.36 };
            p.x = town.x; p.y = town.y;
            for (const v of world.vehicles) if (v.isHeroCar && !v.wrecked) { v.x += 2000; v.y += 2000; }
            world.wanted = 0;
            await sleep(500);
            const lifted = sf.lift();
            const hero = world.vehicles.find((v) => v.isHeroCar && !v.wrecked);
            check(`${cur.id}: Henk drops the Escapade off for the ride out`, lifted && hero && Math.hypot(hero.x - p.x, hero.y - p.y) < 260, JSON.stringify({ lifted, hero: hero && [Math.round(hero.x), Math.round(hero.y)], p: [Math.round(p.x), Math.round(p.y)] }));
            const s = cb.spot();
            p.x = s.x; p.y = s.y;
            await sleep(1500);
            const cash = world.money;
            const scenes = sf.state().played.carbid;
            window.__activities.get('carbid').interact(world);
            await sleep(1200);
            check(`${cur.id}: carbid starts free at the churn`, !!cb.state() && world.money >= cash, JSON.stringify({ st: cb.state(), money: world.money, cash }));
            cb.fire(1, 0, 0.5);
            await sleep(2500);
            capture(`${String(n).padStart(2, '0')}-${cur.id}-knal`);
            cb.finish();
            check(`${cur.id}: the round completes the step`, await waitFor(() => { const c = S().current(); return !c || c.id !== cur.id; }, 15000));
            check(`${cur.id}: Roelf and Hilje's scene plays after the round`, await waitFor(() => sf.state().played.carbid > scenes, 20000), JSON.stringify(sf.state()));
            await sleep(2500);
            capture(`${String(n).padStart(2, '0')}-${cur.id}-scene`);
            await sleep(800);
            check(`${cur.id}: done text follows the scene`, await waitFor(() => { if (isCinematicActive()) skipCinematic(); return !sf.state().pending; }, 20000, 200), JSON.stringify(sf.state()));
          } else S().complete();
          if (step.cost) entry.notes.push(`betaald, saldo €${Math.round(world.money)} (was €${Math.round(before)})`);
          check(`money ok at ${cur.id}`, world.money >= 0, `€${Math.round(world.money)}`);
        } else {
          S().teleport();
          const started = await waitFor(() => isMissionActive(), 4000);
          if (!started) { entry.notes.push('trigger startte niet, debug-start'); S().complete(); }
          await sleep(300);
          await drain(world, 400);
          capture(`${String(++n).padStart(2, '0')}-${cur.id}`);
          check(`${cur.id}: no skip offered before a first try`, !S().canSkip() && !S().view().canSkip);
          if (cur.id === 'H15' || cur.id === 'H17') {
            // Staart: a failed heli run (H15) and a running mission skipped from the pause menu (H17)
            const m0 = world.money;
            if (cur.id === 'H15') {
              for (let k = 0; k < 6 && isMissionActive() && !world.heliRun; k++) { S().objective(); await sleep(400); await drain(world, 300); }
              S().lose();
              await drain(world);
              check('H15: fail ends the heli run', !world.heliRun && !isMissionActive());
              check('H15: skip offered after the fail', S().canSkip());
            }
            const ok = S().skip(cur.id === 'H17');
            await drain(world);
            check(`${cur.id}: skip works`, ok && !isMissionActive() && S().current().id !== cur.id, JSON.stringify(S().current()));
            entry.notes.push(`${cur.id === 'H15' ? 'mislukt en ' : 'tijdens de missie '}overgeslagen: +€${Math.round(world.money - m0)}`);
          } else if (cur.id === 'H3') {
            S().lose();
            await drain(world);
            const offered = S().canSkip();
            const m0 = world.money;
            check('skip offered after a failed mission (H3)', offered);
            check('skip button shown', !!document.querySelector('#story-skip:not([hidden])') || offered);
            S().skip();
            entry.notes.push(`mislukt en overgeslagen: +€${Math.round(world.money - m0)}`);
          } else {
            for (let k = 0; k < 150 && isMissionActive(); k++) {
              await drain(world, 300);
              if (cur.id === 'H6' && !entry.watchersChecked && heistWatchers().length) {
                // the cameras and guards outside: on dry ground, inside the blueprint's frame
                entry.watchersChecked = true;
                const [x0, y0, x1, y1] = PLAN_BOUNDS;
                const bad = heistWatchers().filter((w) => !(w.x > x0 && w.x < x1 && w.y > y0 && w.y < y1) || (w.kind === 'camera' && isInWater(world.map, w.x, w.y)));
                check('H6: every camera and guard stands on the map', !bad.length, JSON.stringify(bad));
              }
              if (!isMissionActive()) break;
              const ms = S().mission();
              const def = ms && getMissionDefs()[ms.index];
              const stage = def && def.stages && def.stages[ms.stage];
              if (stage && stage.kind === 'pigeon' && !world.pigeonMode && !entry.waitedPigeon) {
                entry.waitedPigeon = true;
                const flew = await waitFor(() => world.pigeonMode, 6000);
                entry.notes.push(flew ? 'duif-modus gestart' : 'duif-modus startte niet ' + JSON.stringify(S().mission()));
                check(`${cur.id}: pigeon mode starts`, flew);
                await drain(world, 300);
              }
              const pigeon = window.__debug && window.__debug.pigeon;
              if (world.pigeonMode && pigeon && pigeon.P && !isCinematicActive()) {
                // fly over the marked target so the photo really gets taken
                const m = world.mission.marker;
                pigeon.P.x = m.x; pigeon.P.y = m.y;
                pigeon.P.z = Number.isFinite(m.z) ? m.z : Math.max(pigeon.P.z, 25);
                if ('speed' in pigeon.P) pigeon.P.speed = 0;
                await sleep(1100);
                entry.notes.push('duif boven doel');
                continue;
              }
              S().objective();
              await sleep(350);
            }
          }
          check(`mission ${cur.id} finished`, !isMissionActive());
        }
        await drain(world);
        const after = S().current();
        entry.ok = !after || after.end || after.id !== cur.id;
        entry.moneyAfter = Math.round(world.money);
        entry.seconds = Math.round((performance.now() - t0) / 100) / 10;
        check(`step ${cur.id} advances`, entry.ok);
        if (!entry.ok) break;
      }

      await sleep(600);
      await waitFor(() => S().cardShown(lastPart), 8000);
      capture('99-wordt-vervolgd');
      await drain(world);
      const end = S().current();
      check(`flow reaches "Wordt vervolgd" (${lastPart})`, end && end.end === lastPart, JSON.stringify(end));
      check('"Wordt vervolgd" card shown', S().cardShown(lastPart));
      check('all available steps passed', report.steps.length === STEPS.filter(stepAvailable).length, `${report.steps.length} stappen`);
      check('Tammo and Tessa take turns', swaps >= 4, `${swaps} wissels`);
      const calEnd = window.__calendar && window.__calendar.get();
      check('after the story the calendar is in September', calEnd && (!PARTS[lastPart].finale || calEnd.day >= 19), calEnd && calEnd.info.long);
      check('no cutscene camera off the map', !cinematicPoseIssues().length, JSON.stringify(cinematicPoseIssues().slice(0, 4)));
      check('Rotor Roelf took his demo heli back', !window.__storyFun || !window.__storyFun.state().demo, JSON.stringify(window.__storyFun && window.__storyFun.state()));

      // after the ending (postgame.js): Jelle's challenges and the Fjord Frituur
      const pg = window.__postgame;
      if (PARTS[lastPart] && PARTS[lastPart].finale) {
        check('post-game opens after the ending', await waitFor(() => pg && pg.open() && pg.spots().length >= 4, 8000), JSON.stringify(pg && pg.spots().map((q) => q.id)));
        for (const id of ['bruggen', 'fierljep', 'skutsje', 'fjord', 'koe']) {
          const p = world.player;
          if (p.inVehicle && id !== 'fjord') p.exitVehicle(world.map, world);
          await sleep(300);
          const started = pg.start(id);
          await sleep(900);
          for (let i = 0; i < 4 && isCinematicActive(); i++) { skipCinematic(); await sleep(250); }
          await sleep(1200);
          if (started && id !== 'fierljep') capture('pg-' + id);
          const won = started && pg.win();
          await waitFor(() => !pg.state(), 6000);
          const rec = pg.record(id);
          check(`post-game ${id} runs and records a medal`, started && won && rec && rec.medal > 0, JSON.stringify(rec));
          await drain(world, 700);
        }
        check('Fjord Frituur unlocked in the garage', await waitFor(() => getOwnedEntries().some((o) => o.key === 'fjordfrituur'), 5000));
        // the credits wait for every mission: the skipped H15 and H17 keep them back
        // (H3 was skipped too, but a pass recorded in the prestaties counts)
        const ending = S().ending();
        const open = ending.missions.map((m) => m.code);
        check('ending: all challenges count as done', ending.finale && ending.challenges.length === 0, JSON.stringify(ending.challenges));
        check('ending: skipped missions keep the credits back', !ending.done && !ending.credits && open.includes('H15') && open.includes('H17') && open.every((c) => ['H3', 'H15', 'H17'].includes(c)), JSON.stringify(ending.missions));
        check('ending: Overzicht counts down to the end', /^Nog .* tot het einde$/.test(S().view().title), S().view().title);
        if (world.player.inVehicle) world.player.exitVehicle(world.map, world);
      }

      // the Ommeland extras (ommelandfun.js): twelve wereldeinden, a dorpsuitje per station
      const om = window.__ommeland;
      if (om) {
        const ends = om.ends();
        check(`all 12 wereldeinden placed at the edge of the data`, ends.length === 12, ends.map((e) => `${e.id} ${e.road}`).join(', '));
        const vs = om.villages();
        check(`every Ommeland station has its dorpsuitjes (${vs.length})`, vs.length === 8 && vs.every((v) => v.acts.length === 2 && v.egg), JSON.stringify(vs.filter((v) => v.acts.length < 2 || !v.egg).map((v) => v.name)));
        if (world.player.inVehicle) world.player.exitVehicle(world.map, world);
        const before = om.endsFound();
        om.go(ends[0].x, ends[0].y);
        check('a wereldeinde is found by walking up to it', await waitFor(() => om.endsFound() > before || ends[0].found, 6000), JSON.stringify(ends[0]));
        await sleep(600);
        capture('om-wereldeinde');
        await drain(world, 700);
        const bell = vs.find((v) => v.name === 'Loppersum');
        const used = bell && om.use('Loppersum', 'special');
        check('a dorpsuitje can be done (Loppersum, de klok)', used && await waitFor(() => om.villages().find((v) => v.name === 'Loppersum').done, 4000));
        // out in the Ommeland your own car can still be delivered (phone, Laten afleveren)
        world.wanted = 0;
        world.money = Math.max(world.money, 500);
        const del = deliverOwnedVehicle(world, 'hero');
        const hero = world.vehicles.find((v) => v.isHeroCar && !v.wrecked);
        check('the Escapade is delivered in the Ommeland', del.ok && hero && Math.hypot(hero.x - world.player.x, hero.y - world.player.y) < 160, JSON.stringify({ del, at: hero && [Math.round(hero.x), Math.round(hero.y)], p: [Math.round(world.player.x), Math.round(world.player.y)] }));
        await sleep(500);
        capture('om-dorp');
        await drain(world, 700);
      }

      // a heli run keeps its players hidden past the safety watchdog, and a loaded
      // save ends whatever holds the player (heli run, padel match, village tennis)
      if (window.__heliRun && window.__padel) {
        if (world.player.inVehicle) world.player.exitVehicle(world.map, world);
        saveGame(world, { toast: false });
        window.__heliRun.start('ballonjacht');
        await sleep(600);
        for (let i = 0; i < 8 && isCinematicActive(); i++) { skipCinematic(); await sleep(250); }
        await sleep(3800);
        check('heli run keeps the players hidden past the safety watchdog', world.heliRun && world.cinematicHidePlayers);
        loadLatestSave(world);
        check('a loaded save ends a heli run', !world.heliRun);
        await drain(world, 700);
        window.__padel.start();
        await sleep(1200);
        const padelOn = !!world.padelGame;
        loadLatestSave(world);
        check('a loaded save ends a padel match', padelOn && !world.padelGame, `match started: ${padelOn}`);
        await drain(world, 700);
        if (om && om.use('Haren', 'special')) {
          const tennisOn = isVillageMiniActive();
          loadLatestSave(world);
          check('a loaded save ends village tennis', tennisOn && !isVillageMiniActive(), `tennis started: ${tennisOn}`);
          await drain(world, 700);
        }
        if (window.__kermis && window.__kermis.start()) {
          await sleep(1200);
          const ridingOn = isActivityActive();
          loadLatestSave(world);
          check("a loaded save ends the botsauto's", ridingOn && !isActivityActive(), `ride started: ${ridingOn}`);
          await drain(world, 700);
        }
      }

      // an old 0.4 save: missions 1-3 done (H1, H3, H5), no story data
      const money = world.money;
      applySave(world, { v: 1, money: 1234, missions: { index: 3, completed: [0, 1, 2], seen: [0, 1, 2] }, shops: null });
      await sleep(400);
      const mig = S().current();
      check('old save migrates to H2', mig && mig.id === 'H2', JSON.stringify(mig));
      check('old save plays as the current step\'s character', await waitFor(() => world.player.character === STEP_BY_ID.get('H2').player, 5000), world.player.character);
      check('old save keeps money', world.money === 1234, `€${world.money}`);
      world.money = money;

      // death and arrest trips to the nearest real facility, in town and out
      // in the Ommelanden (respawn.js, facilities.js)
      for (const [label, x, y, busted] of [['UMCG', 758.72, -132.95, false], ['Bedum', 1931.4, -9027.27, true], ['Zuidhorn', -10732.8, -3017.02, false], ['Stad', 304.73, 297.32, true]]) {
        const p = world.player;
        if (p.inVehicle) { p.inVehicle.driver = null; p.inVehicle = null; }
        const q = realRoadNear(x, y, 300);
        const at = q && label !== 'UMCG' && label !== 'Stad' ? q : world.map.findOpenSpawn(x, y, 200) || { x, y };
        p.x = at.x; p.y = at.y;
        const want = nearestFacility(busted ? 'police' : 'medical', p.x, p.y);
        const site = want && want.umcg && world.map.meta.hospital ? world.map.meta.hospital : want;
        requestRespawn(world, { busted });
        await sleep(300);
        await drain(world, 900);
        const d = site ? Math.hypot(p.x - site.x, p.y - site.y) : Infinity;
        check(`${busted ? 'arrest' : 'death'} at ${label} -> ${want ? want.name : '?'}`, !world.pendingRespawn && d < 150, `${Math.round(d)} m from it, at (${Math.round(p.x)}, ${Math.round(p.y)})`);
      }
    }
  } catch (e) {
    errors.push('test: ' + (e && e.stack || e));
  }
  report.result = report.checks.every((c) => c.ok) && !errors.length ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  const lines = [`STORY TEST ${report.result}`, ''];
  for (const s of report.steps) lines.push(`${s.ok ? 'ok ' : 'XX '} ${s.id.padEnd(15)} €${s.moneyBefore} -> €${s.moneyAfter}  ${s.seconds}s  ${s.notes.join('; ')}`);
  lines.push('');
  for (const c of report.checks) if (!c.ok || /timeline|vervolgd|migrat|skip|economy/.test(c.name)) lines.push(`${c.ok ? 'ok ' : 'XX '} ${c.name}${c.info ? ' (' + c.info + ')' : ''}`);
  if (report.timeline) {
    lines.push('', 'money timeline (worst case)', 'step            before   cost    pay  after  margin');
    for (const r of report.timeline) lines.push(`${r.id.padEnd(15)} ${String(r.before).padStart(6)} ${String(r.cost || '').padStart(6)} ${String(r.pay || '').padStart(6)} ${String(r.after).padStart(6)} ${r.margin == null ? '' : String(r.margin).padStart(7)}`);
  }
  if (report.economy) {
    lines.push('', 'economy');
    for (const [k, v] of report.economy) lines.push(`${k.padEnd(34)} ${v}`);
  }
  if (errors.length) lines.push('', 'errors:', ...errors.slice(0, 10));
  overlay(lines.join('\n'));
  console.log('[storytest-done] ' + JSON.stringify(report));
  return report;
}
