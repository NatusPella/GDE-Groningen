// Playthrough test of the whole story chain (22-11, #1121): plays every step from the opening (M00) up to F6, also the travel, home and
// between steps that the plain story test (storytest.js) skips because a later mission makes them moot. Per step it logs: reached
// (the step became the next one), finished (through its own goal, not the debug hook), duration, scenes seen, console errors,
// script errors and missing files (image, sound, script, fetch). A step that does not finish by itself gets a diagnosis (goal,
// distance, scene running, mission active) and is then pushed on with the debug hook so the rest of the chain still runs; that
// step shows up as `via: 'haak'` in the report. Only reachable with ?ketentest (desktop: GDE_STORY_KETEN=1 with --story-test).
// Everything stays in memory: nothing reaches the player's storage.
import { skipCinematic, isCinematicActive } from './cinematics.js';
import { skipStoryContact } from './storycontact.js';
import { STEPS, STEP_BY_ID, PARTS, missionIndexOf } from './storyarc.js';
import { getMissionDefs, isMissionActive, unmetRequirement } from './missions.js';
import { hoofdspeler } from './players.js';
import { refreshDayNight } from './daynight.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 20000, step = 150) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    try { if (fn()) return true; } catch (e) { /* not yet */ }
    await sleep(step);
  }
  return false;
}

// Collects the errors between two steps (console, script, files).
function makeCatcher() {
  const bucket = { console: [], script: [], file: [] };
  const origErr = console.error, origWarn = console.warn;
  const clip = (a) => a.map((x) => (x && x.message) || String(x)).join(' ').slice(0, 220);
  console.error = (...a) => { bucket.console.push('error: ' + clip(a)); origErr.apply(console, a); };
  console.warn = (...a) => { const t = clip(a); if (/NaN|computeBoundingSphere|ontbreekt|missing|not found|404/i.test(t)) bucket.console.push('warn: ' + t); origWarn.apply(console, a); };
  window.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t !== window && (t.src || t.href)) bucket.file.push(`${t.tagName || 'resource'} ${String(t.src || t.href).slice(-120)}`);
    else bucket.script.push(String((e && (e.message || e.error)) || e).slice(0, 220));
  }, true);
  window.addEventListener('unhandledrejection', (e) => bucket.script.push('belofte: ' + String((e.reason && (e.reason.message || e.reason)) || e).slice(0, 220)));
  const f0 = window.fetch;
  if (typeof f0 === 'function') {
    window.fetch = async (...a) => {
      try {
        const r = await f0.apply(window, a);
        if (r && r.ok === false && r.status >= 400) bucket.file.push(`fetch ${r.status} ${String((a[0] && a[0].url) || a[0]).slice(-120)}`);
        return r;
      } catch (e) { if (!(e && e.name === 'AbortError') && !/\.gdp$/.test(String((a[0] && a[0].url) || a[0]))) bucket.file.push(`fetch mislukt ${String((a[0] && a[0].url) || a[0]).slice(-120)}`); throw e; } // a cancelled tile fetch after a teleport is no missing file
    };
  }
  return { bucket, take() { const r = { console: [...bucket.console], script: [...bucket.script], file: [...bucket.file] }; bucket.console.length = bucket.script.length = bucket.file.length = 0; return r; } };
}

export async function runKetenTest(world, { report, check, capture }) {
  const S = () => window.__story;
  const catcher = makeCatcher();
  const rows = [];
  report.keten = rows;
  // count scenes: every switch from no to yes cinematic is one scene; we skip them (their length is known statically)
  let scenes = 0, wasCine = false;
  const tick = () => {
    const now = isCinematicActive();
    if (now && !wasCine) scenes++;
    wasCine = now;
    if (now) skipCinematic(); else skipStoryContact();
  };
  const settle = async (ms = 600) => {
    let quietSince = performance.now();
    const t0 = performance.now();
    while (performance.now() - t0 < 25000) {
      tick();
      if (isCinematicActive() || world.pendingRespawn) quietSince = performance.now();
      if (performance.now() - quietSince > ms) return;
      await sleep(120);
    }
  };
  const currentId = () => { const c = S().current(); return c ? (c.end ? 'END:' + c.end : c.id) : null; };
  const advanced = (id) => () => { tick(); return currentId() !== id; };
  const diagnose = () => {
    const p = hoofdspeler(world), g = world.storyGuide;
    return JSON.stringify({ view: S().view && S().view(), guide: g && [Math.round(g.x), Math.round(g.y)], speler: [Math.round(p.x), Math.round(p.y)], afstand: g ? Math.round(Math.hypot(p.x - g.x, p.y - g.y)) : null, cine: isCinematicActive(), missie: isMissionActive(), fase: S().goalPhase && S().goalPhase(), gepauzeerd: !!world.paused, wanted: world.wanted }).slice(0, 600);
  };

  // heartbeat: a screenshot every 45 s with the step and phase in its name, so a hang shows where it stands
  let phase = 'start', hbN = 0;
  setInterval(() => { capture(`hb-${String(++hbN).padStart(3, '0')}-${phase}`); }, 45000);
  await settle(1500);
  world.devInvuln = true;
  const endPart = Object.keys(PARTS).filter((k) => PARTS[k].open).pop();
  let swaps = 0, prevChar = null;

  for (let guard = 0; guard < 130; guard++) {
    await settle(500);
    const cur = S().current();
    if (!cur) { check('keten: huidige stap', false, 'geen stap'); break; }
    if (cur.end) {
      if (cur.end === endPart) break;
      // the end card of an act: first the card, then the story goes on
      await waitFor(() => { tick(); return S().cardShown(cur.end); }, 25000);
      check(`keten: de eindkaart van ${cur.end} is te zien`, S().cardShown(cur.end));
      await settle();
      const resumed = await waitFor(() => { tick(); const c = S().current(); return !!c && !c.end; }, 30000);
      check(`keten: na de eindkaart van ${cur.end} gaat het verhaal door`, resumed, JSON.stringify(S().current()));
      if (!resumed) break;
      continue;
    }
    const step = STEP_BY_ID.get(cur.id);
    const cal = window.__calendar && window.__calendar.get();
    const entry = { id: cur.id, kind: cur.kind, part: step.part, title: cur.title, reached: true, done: false, via: 'natuurlijk', secs: 0, scenes: 0, day: cal ? cal.day : null, notes: [], errors: null };
    rows.push(entry);
    catcher.take();
    scenes = 0;
    phase = `${cur.id}-${cur.kind}`;
    const t0 = performance.now();
    if (step.cost && world.money < step.cost) entry.notes.push(`te kort voor €${step.cost}: voorschot verwacht`);
    if (cur.id === 'M06') { world.clock = 23.9; refreshDayNight(world); }
    if (step.player) {
      const ok = await waitFor(() => { tick(); return hoofdspeler(world).character === step.player && (!world.companion || world.companion.character !== step.player); }, 20000);
      check(`keten ${cur.id}: speelt als ${step.player}`, ok, ok ? '' : JSON.stringify(S().swapInfo && S().swapInfo()));
      if (prevChar && prevChar !== hoofdspeler(world).character) swaps++;
      prevChar = hoofdspeler(world).character;
    }

    if (cur.kind === 'activity') {
      const g = step.goal || {};
      S().teleport();
      await sleep(700);
      if (g.type === 'opening') {
        const begun = await waitFor(() => { tick(); return S().goalPhase() !== 'wait'; }, 25000);
        entry.notes.push(begun ? 'opening speelt' : 'opening startte niet');
      } else if ((g.type === 'home' || g.type === 'night') && window.__home) {
        const hm = window.__home, p = hoofdspeler(world);
        if (p.inVehicle) p.exitVehicle(world.map, world);
        hm.goHome();
        await sleep(1500);
        world.wanted = 0;
        hm.enter();
      } else if (g.type === 'padel' && window.__padel) {
        const pd = window.__padel;
        await waitFor(() => { tick(); return !isCinematicActive(); }, 8000);
        pd.start(); await sleep(1500); pd.finish(false);
      } else if (g.type === 'kermis' && window.__kermis && window.__activities) {
        const km = window.__kermis, p = hoofdspeler(world), s = km.spot();
        if (p.inVehicle) p.exitVehicle(world.map, world);
        p.x = s.x; p.y = s.y; world.wanted = 0;
        window.__activities.get('kermis').interact(world);
        await waitFor(() => !!km.state(), 6000);
        await sleep(800);
        km.finish();
      } else if (g.type === 'sideJob') {
        entry.notes.push('bijbaan: de ronde zelf slaat de test over (via de haak)');
        entry.via = 'haak (bijbaan)';
        S().complete();
      } else if (g.type === 'shop') {
        // walking into the shop opens its menu: that menu flow is covered by the shop tests; here the guide must stand at the shop
        entry.notes.push('winkelstap: de gids staat bij de winkel');
        entry.via = 'haak (winkelbezoek)';
        S().complete();
      }
      // wait for the step's own goal; tick() skips the scenes; the guide may appear a moment late, so go there again every 3 s
      let lastTp = performance.now();
      let finished = await waitFor(() => { if (performance.now() - lastTp > 3000 && g.type === 'reis') { lastTp = performance.now(); S().teleport(); } return advanced(cur.id)(); }, g.type === 'opening' ? 40000 : 30000, 200);
      if (!finished) {
        entry.notes.push('GEEN eigen afronding: ' + diagnose());
        entry.via = 'haak (vastgelopen)';
        S().complete();
        finished = await waitFor(advanced(cur.id), 8000, 200);
      }
      if (step.homeScene && window.__home) { try { window.__home.leave(); } catch (e) { /* not inside */ } }
    } else {
      // a flight mission leaves the player in the air: step out first, as a player lands before the next mission
      { const pl = hoofdspeler(world); if (pl.inVehicle) pl.exitVehicle(world.map, world); }
      S().teleport();
      let lastTp2 = performance.now();
      const begun = await waitFor(() => { tick(); if (performance.now() - lastTp2 > 3000) { lastTp2 = performance.now(); S().teleport(); } return isMissionActive(); }, 25000);
      if (!begun) {
        // a gate (gear first, e.g. the bike of the KEI race) is the designed way to hold a mission back: the guide then points to the shop
        const def = getMissionDefs()[missionIndexOf(step.mission)];
        const gate = def ? unmetRequirement(world, def) : null;
        entry.notes.push(`trigger startte niet in 25 s${gate ? ` (eis: ${gate}, de gids wijst naar de winkel)` : ''}, debugstart: ` + diagnose());
        entry.via = gate ? `haak (eis ${gate})` : 'haak (start)';
        S().complete();
        await sleep(300);
      }
      await sleep(300);
      await settle(400);
      phase = `${cur.id}-missielus`;
      for (let k = 0; k < 150 && isMissionActive() && performance.now() - t0 < 150000; k++) {
        await settle(300);
        if (!isMissionActive()) break;
        const ms = S().mission();
        const def = ms && getMissionDefs()[ms.index];
        const stage = def && def.stages && def.stages[ms.stage];
        if (stage && stage.kind === 'pigeon' && !world.pigeonMode && !entry.pigeonDone) {
          entry.pigeonDone = true;
          const lp = hoofdspeler(world);
          if (lp.inVehicle) lp.exitVehicle(world.map, world);
          await waitFor(() => world.pigeonMode, 6000);
          await settle(300);
        }
        const pigeon = window.__debug && window.__debug.pigeon;
        if (world.pigeonMode && pigeon && pigeon.P && !isCinematicActive()) {
          const m = world.mission.marker;
          pigeon.P.x = m.x; pigeon.P.y = m.y;
          pigeon.P.z = Number.isFinite(m.z) ? m.z : Math.max(pigeon.P.z, 25);
          if ('speed' in pigeon.P) pigeon.P.speed = 0;
          await sleep(1100);
          continue;
        }
        if (k % 4 === 0) S().teleport();
        S().objective();
        await sleep(350);
      }
      await settle(300);
      // a flight mission or a failure that lets the story offer 'Sla deze missie over'
      const c2 = S().current();
      if (c2 && c2.id === cur.id && S().canSkip()) { S().skip(); await settle(300); entry.notes.push('mislukt en overgeslagen'); entry.via = 'overgeslagen'; }
      entry.done = currentId() !== cur.id;
      if (!entry.done) {
        entry.notes.push('GEEN eigen afronding: ' + diagnose());
        entry.via = 'haak (vastgelopen)';
        S().complete();
        await waitFor(advanced(cur.id), 8000, 200);
      }
    }
    await settle(300);
    entry.done = currentId() !== cur.id;
    entry.secs = Math.round((performance.now() - t0) / 100) / 10;
    entry.scenes = scenes;
    const f = catcher.take();
    entry.errors = (f.console.length || f.script.length || f.file.length) ? { console: f.console.slice(0, 5), script: f.script.slice(0, 5), file: [...new Set(f.file)].slice(0, 5) } : null;
    if (/NaN/i.test(JSON.stringify(f))) entry.notes.push('NaN-melding');
    capture(`keten-${String(rows.length).padStart(2, '0')}-${cur.id}`);
    check(`keten ${cur.id}: afgerond`, entry.done, entry.notes.join(' | ').slice(0, 400));
    check(`keten ${cur.id}: zonder haak`, entry.via === 'natuurlijk' || /bijbaan|overgeslagen|winkelbezoek|eis /.test(entry.via), entry.via);
    check(`keten ${cur.id}: geen script- of bestandsfouten`, !entry.errors || (!entry.errors.script.length && !entry.errors.file.length), JSON.stringify(entry.errors).slice(0, 400));
    if (!entry.done) break;
  }

  await settle(600);
  await waitFor(() => { tick(); return S().cardShown(endPart); }, 10000);
  const end = S().current();
  check(`keten: het verhaal bereikt het einde van ${endPart}`, !!end && end.end === endPart, JSON.stringify(end));
  // steps that finished by themselves within a scene or on arrival (the player already stood at the goal) were never the current step for long
  const doneIds = new Set((S().save() || {}).done || []);
  for (const s of STEPS) if (!rows.some((r) => r.id === s.id) && doneIds.has(s.id)) rows.push({ id: s.id, kind: s.kind, part: s.part, title: s.title, reached: true, done: true, via: 'automatisch (bij aankomst)', secs: 0, scenes: 0, notes: [], errors: null });
  const seen = new Set(rows.map((r) => r.id));
  const missing = STEPS.filter((s) => !seen.has(s.id)).map((s) => s.id);
  check('keten: elke stap is aan de beurt geweest', missing.length === 0, `${rows.length}/${STEPS.length}; niet gezien: ${missing.join(', ') || 'geen'}`);
  const walked = rows.filter((r) => !/automatisch/.test(r.via)).map((r) => r.id);
  check('keten: de stappen kwamen in verhaalvolgorde', walked.join() === STEPS.filter((s) => walked.includes(s.id)).map((s) => s.id).join());
  // the credits: the epilogue has been played and the ending says where the credits stand
  const ending = S().ending && S().ending();
  report.ketenEnd = { ending: ending ? { finale: ending.finale, credits: ending.credits } : null, swaps };
  check('keten: de epiloog (E) is gespeeld', seen.has('E') && rows.find((r) => r.id === 'E').done, JSON.stringify([...doneIds].slice(-6)));
}
