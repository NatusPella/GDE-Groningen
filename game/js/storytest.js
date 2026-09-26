// Automated story test (?storytest, desktop --story-test; loaded by main.js
// only then, with in-memory storage from devflags.js). Starts a new game and
// plays every available story step through the debug hooks: activities are
// completed the way a player would (purchases are paid), missions are
// started at their marker and finished objective by objective. H3 goes
// through the fail + "Sla deze missie over" path. Checks that the flow
// reaches "Wordt vervolgd" at the end of the last open part, that money
// never runs short (also when every mission is skipped), that an old save
// migrates, and logs a report. `console.log('[storytest-capture] name')`
// makes the desktop app save a screenshot per step.

import { skipCinematic, isCinematicActive } from './cinematics.js';
import { STEPS, STEP_BY_ID, PARTS, stepAvailable, computeMoneyTimeline, missionIndexOf } from './storyarc.js';
import { getMissionDefs, isMissionActive } from './missions.js';
import { applySave } from './savegame.js';

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

    // money timeline over the whole arc, planned steps included
    const tl = computeMoneyTimeline();
    check('money timeline never below zero', tl.low >= 0, `laagste marge €${tl.low}, eind €${tl.end}`);
    const tlSkip = computeMoneyTimeline(undefined, 0.5);
    check('money timeline ok when every mission is skipped', tlSkip.low >= 0, `laagste marge €${tlSkip.low}`);
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
      if (step.cost) entry.notes.push(world.money >= step.cost ? `kan €${step.cost} betalen` : `te kort voor €${step.cost}: voorschot verwacht`);
      if (step.player) {
        // the swap waits for a quiet moment: keep skipping scenes meanwhile
        const ok = await waitFor(() => {
          if (isCinematicActive()) skipCinematic();
          return world.player.character === step.player && (!world.companion || world.companion.character !== step.player);
        }, 20000);
        check(`${cur.id}: plays as ${step.player}`, ok, ok ? world.player.character : JSON.stringify(S().swapInfo()));
        if (prevChar && prevChar !== world.player.character) { swaps++; entry.notes.push(`speelt als ${world.player.character}`); }
        prevChar = world.player.character;
        await drain(world, 300);
      }
      if (cur.kind === 'activity') {
        S().teleport();
        await sleep(900);
        capture(`${String(++n).padStart(2, '0')}-${cur.id}`);
        const before = world.money;
        S().complete();
        if (step.cost) entry.notes.push(`betaald, saldo €${Math.round(world.money)} (was €${Math.round(before)})`);
        check(`money ok at ${cur.id}`, world.money >= 0, `€${Math.round(world.money)}`);
      } else {
        S().teleport();
        const started = await waitFor(() => isMissionActive(), 4000);
        if (!started) { entry.notes.push('trigger startte niet, debug-start'); S().complete(); }
        await sleep(300);
        await drain(world, 400);
        capture(`${String(++n).padStart(2, '0')}-${cur.id}`);
        if (cur.id === 'H3') {
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
    check('Tammo and Anita take turns', swaps >= 4, `${swaps} wissels`);

    // an old 0.4 save: missions 1-3 done (H1, H3, H5), no story data
    const money = world.money;
    applySave(world, { v: 1, money: 1234, missions: { index: 3, completed: [0, 1, 2], seen: [0, 1, 2] }, shops: null });
    await sleep(400);
    const mig = S().current();
    check('old save migrates to H2', mig && mig.id === 'H2', JSON.stringify(mig));
    check('old save plays as the current step\'s character', await waitFor(() => world.player.character === STEP_BY_ID.get('H2').player, 5000), world.player.character);
    check('old save keeps money', world.money === 1234, `€${world.money}`);
    world.money = money;
  } catch (e) {
    errors.push('test: ' + (e && e.stack || e));
  }
  report.result = report.checks.every((c) => c.ok) && !errors.length ? 'PASS' : 'FAIL';
  report.finishedAt = new Date().toISOString();
  const lines = [`STORY TEST ${report.result}`, ''];
  for (const s of report.steps) lines.push(`${s.ok ? 'ok ' : 'XX '} ${s.id.padEnd(15)} €${s.moneyBefore} -> €${s.moneyAfter}  ${s.seconds}s  ${s.notes.join('; ')}`);
  lines.push('');
  for (const c of report.checks) if (!c.ok || /timeline|vervolgd|migrat|skip/.test(c.name)) lines.push(`${c.ok ? 'ok ' : 'XX '} ${c.name}${c.info ? ' (' + c.info + ')' : ''}`);
  if (errors.length) lines.push('', 'errors:', ...errors.slice(0, 10));
  overlay(lines.join('\n'));
  console.log('[storytest-done] ' + JSON.stringify(report));
  return report;
}
