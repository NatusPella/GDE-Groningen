// Het laadscherm houdt de wereld echt stil, wacht opnieuw bij een tweede sprong en geeft de tegelstroom het laadbudget.
// node scripts/loadhold_test.mjs  (puur, geen DOM)
//
// 1. phone.js refreshPause rekent world.uiPaused elk frame opnieuw uit. Het laadscherm en de reisscÃ¨ne zetten uiPaused
//    Ã©Ã©n keer; een frame later stond hij weer uit en liep de wereld (klok, verkeer, politie, eigen invoer) door achter
//    het scherm. De houder (setLoadHold/loadHeld) telt nu mee in die berekening.
// 2. Een tweede sprong terwijl het scherm al open is: de wachtteller begint opnieuw (retargetProgress), zodat het
//    scherm niet sluit op "niets te doen" van de vorige plek.
// 3. Achter het laadscherm krijgt de stroomplanner het laadbudget (loading), net als onder het zwart van een cutscene.
import fs from 'node:fs';
import { setLoadHold, loadHeld, retargetProgress, stepProgress, startProgress } from '../game/js/loadlogic.js';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FOUT: ' + m); } };
const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// 1. de houder
{
  const w = {};
  ok(loadHeld(w) === false && loadHeld(null) === false, 'zonder houder staat er niets stil');
  setLoadHold(w, 'laadscherm', true);
  setLoadHold(w, 'reisrit', true);
  ok(loadHeld(w), 'een houder houdt de wereld stil');
  setLoadHold(w, 'reisrit', false);
  ok(loadHeld(w), 'de ene houder laat de andere niet los');
  setLoadHold(w, 'laadscherm', false);
  setLoadHold(w, 'laadscherm', false);
  ok(!loadHeld(w), 'alle houders weg: de wereld loopt weer');
  // de frame-lus nagebouwd: het laadscherm zet uiPaused Ã©Ã©n keer, refreshPause rekent hem elk frame opnieuw uit
  const refreshPause = (world, dialogs) => { world.uiPaused = dialogs || loadHeld(world); };
  const world = {};
  world.uiPaused = true; setLoadHold(world, 'laadscherm', true);
  for (let i = 0; i < 5; i++) refreshPause(world, false);
  ok(world.uiPaused === true, 'na vijf frames staat de wereld nog stil achter het laadscherm');
  setLoadHold(world, 'laadscherm', false);
  refreshPause(world, false);
  ok(world.uiPaused === false, 'scherm weg: de pauze gaat eraf');
  ok(/world\.uiPaused = [^\n;]*loadHeld\(world\)/.test(src('phone.js')), 'phone.js refreshPause telt de laadhouder mee');
  const ls = src('loadscreen.js');
  ok(/setLoadHold\(world, 'laadscherm', true\)/.test(ls) && /setLoadHold\(world, 'laadscherm', false\)/.test(ls), 'loadscreen.js zet en lost zijn houder');
  const rr = src('reisrit.js');
  ok(/setLoadHold\(world, 'reisrit', true\)/.test(rr) && /setLoadHold\(world, 'reisrit', false\)/.test(rr), 'reisrit.js zet en lost zijn houder');
}

// 2. een tweede sprong
{
  const run = (retarget) => {
    let st = startProgress();
    let t = 0;
    // de eerste plek is bijna klaar: 4 blinde frames, dan 10 rustige frames
    for (let i = 0; i < 14; i++) { t += 1 / 60; st = stepProgress(st, 0, 2 + t, 'travel'); }
    ok(!st.done, 'voor de tweede sprong is het scherm nog niet klaar');
    if (retarget) { st = retargetProgress(st); t = 0; }
    // de sprong: de stroom heeft de nieuwe plek de eerste 3 frames nog niet bekeken (meldt 0), daarna 40 stuks werk
    let closedAt = -1;
    for (let i = 0; i < 30 && closedAt < 0; i++) {
      t += 1 / 60;
      st = stepProgress(st, i < 3 ? 0 : 40, (retarget ? 0 : 2) + t, 'travel');
      if (st.done) closedAt = i;
    }
    return closedAt;
  };
  ok(run(false) >= 0 && run(false) < 3, 'zonder herstart sluit het scherm op de vorige plek (de fout die dit dekt)');
  ok(run(true) === -1, 'met retargetProgress wacht het scherm op de nieuwe plek');
  const r = retargetProgress({ total: 30, shown: 0.8, calm: 11, frames: 90 });
  ok(r.shown === 0.8 && r.calm === 0 && r.frames === 0 && r.total === 0, 'de balk houdt zijn stand, de tellers beginnen opnieuw');
  ok(retargetProgress(null).shown === 0, 'een lege stand breekt niets');
  const ls = src('loadscreen.js');
  ok(/active\.retarget\(p\.x, p\.y\)/.test(ls) && /prog = retargetProgress\(prog\)/.test(ls), 'watchJumps richt een open scherm op de nieuwe plek');
}

// 3. het laadbudget achter het laadscherm
ok(/loading: !!world\.cineJumpLoading \|\| loadHeld\(world\)/.test(src('main.js')), 'main.js geeft de stroomplanner het laadbudget achter het laadscherm');

// 4. de ringcheck (ringcheck.js) rijdt zijn proefritten over veel frames en zette uiPaused ook maar één keer: na één
//    frame liep de wereld (verkeer, politie) mee met de proefauto. Beide ritten houden nu een eigen houder vast.
{
  const rc = src('ringcheck.js');
  for (const [fn, bron] of [['driveRingLap', 'ringcheck-lap'], ['driveWaterCrossings', 'ringcheck-water']]) {
    const from = rc.indexOf('export async function ' + fn);
    const next = rc.indexOf('export ', from + 10);
    const body = from < 0 ? '' : rc.slice(from, next < 0 ? rc.length : next);
    const on = body.indexOf(`setLoadHold(world, '${bron}', true)`), off = body.indexOf(`setLoadHold(world, '${bron}', false)`);
    ok(on >= 0 && off > on, `ringcheck.js ${fn} zet en lost de houder ${bron}`);
    ok(off > body.indexOf('finally') && body.includes('finally'), `ringcheck.js ${fn} lost de houder in finally, ook na een fout`);
    ok(off >= 0 && off < body.lastIndexOf('world.uiPaused = keep.paused'), `ringcheck.js ${fn} lost de houder voor de vorige pauzestand terugkomt`);
  }
  // de frame-lus nagebouwd met beide ritten na elkaar: de ene rit lost de andere niet
  const refreshPause = (world) => { world.uiPaused = loadHeld(world); };
  const world = {};
  world.uiPaused = true; setLoadHold(world, 'ringcheck-lap', true);
  for (let i = 0; i < 5; i++) refreshPause(world);
  ok(world.uiPaused === true, 'na vijf frames staat de wereld nog stil tijdens de ringronde');
  setLoadHold(world, 'ringcheck-water', true); setLoadHold(world, 'ringcheck-lap', false); refreshPause(world);
  ok(world.uiPaused === true, 'de waterkruisingen houden de wereld stil als de ringronde klaar is');
  setLoadHold(world, 'ringcheck-water', false); refreshPause(world);
  ok(world.uiPaused === false, 'ringcheck klaar: de pauze gaat eraf');
}

console.log(fails ? `loadhold_test: ${fails} fout(en)` : 'loadhold_test: alles goed');
process.exit(fails ? 1 : 0);
