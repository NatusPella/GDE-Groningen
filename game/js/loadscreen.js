import { hoofdspeler } from './players.js';
// The load screen (the approved "Laadscherm"): a slow Ken Burns picture of the
// place you are going to, the logo, a "Je gaat verder in" card and a real progress
// bar with ONE status line under it (21-11, text diet: no tips, no story recap). It
// covers loading a save, fast travel and long jumps (teleport, a long
// respawn); the work it waits for is the city streaming in round the player
// (scene3d.js streamPending). The picture is one of the game's own renders
// (img/laad/), chosen by where you are going.
import { zachtePauze } from './coopgroep.js';
import { hudDate } from './hudcalendar.js';
import { streamPending, prewarmStreamAt, prewarmPending, readyCounts } from './scene3d.js';
import { placeLabel } from './hud_panel.js';
import { loadScreenHtml, missionPicture } from './loadscene.js';
import { createGate, gateTick, fadeMs, wachtOpGastheer } from './loadgate.js';
import { openerNaam } from './coopplayers.js';
import { registerNoticeHold, noticeQueue } from './notifyqueue.js';
import { JUMP_M as JM, loadKind, stepProgress, startProgress, loadPending, loadStepAt, easeBar, setLoadHold, retargetProgress } from './loadlogic.js';

export const JUMP_M = JM;

let css = false;
let active = null;

// 22-11: meldingen (ontdekking, gebiedsnaam, prestaties) wachten tot het laadscherm en het opstartscherm weg zijn (notifyqueue.js)
registerNoticeHold('loading', () => !!active);
registerNoticeHold('startup', () => {
  if (typeof document === 'undefined' || !document.body) return false;
  const b = document.body.classList;
  return !b.contains('game-started') && !b.contains('trailer-hud');
});

// The picture for a place: the open road in the country, the fair at night,
// the harbours by the water, otherwise one of the city views by name. Only a
// place we know picks a specific picture (#600): an unknown place gets the
// neutral aerial, never the chase picture.
export function pickImage(world, place, mission) {
  if (mission) return missionPicture(mission);
  const night = !!(world.dayNight && (world.dayNight.night ?? 0) > 0.5);
  if (place.country) return night ? 'luchtfoto' : 'ringrace';
  if (/haven|kade|diep|gracht|water/i.test(place.name || '')) return 'rondvaart';
  if (/markt|binnenstad|forum|toren|kerk/i.test(place.name || '')) return night ? 'kermis' : 'vismarkt';
  if (night) return 'kermis';
  return 'luchtfoto';
}

function ensureCss() {
  if (css) return;
  css = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./loadscreen.css', import.meta.url).href;
  document.head.appendChild(link);
}

// opts: { kind: 'save' | 'travel' | 'snel', x, y, name, instant, from, mission }
// mission (a key of MISSION_PICTURE) picks that mission's own picture.
// snel is the small hop (fast travel nearby): only the place and the bar.
// Returns { done: Promise, el }. One at a time.
// Een nieuwe statusregel komt vloeiend binnen (ds-laad.css): de klasse eraf en een frame later erop, zodat de animatie opnieuw start
// zonder een geforceerde layout. Bij Beweging beperken zet de CSS de animatie uit.
const NIEUW = 'ds-laad__status--nieuw';
function nieuweRegel(el) {
  el.classList.remove(NIEUW);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => el.classList.add(NIEUW)); else el.classList.add(NIEUW);
}

export function startLoadScreen(world, opts = {}) {
  if (active) return active;
  ensureCss();
  const p = hoofdspeler(world);
  const x = Number.isFinite(opts.x) ? opts.x : p.x, y = Number.isFinite(opts.y) ? opts.y : p.y;
  const kind = ['save', 'travel', 'snel'].includes(opts.kind) ? opts.kind : 'travel';
  let place = { name: opts.name || '', country: false, district: '' };
  try { place = { ...place, ...placeLabel(world, x, y) }; } catch (e) { /* the label is a nicety */ }
  const date = hudDate(world);
  const img = pickImage(world, place, opts.mission);
  const el = document.createElement('div');
  el.id = 'load-screen';
  el.className = 'ls ls-' + kind + ' instant ds-laad'; // ds-laad.css: de gedeelde beweging van alle laadschermen
  // #600: the bar is the one progressbar; the destination, the story and the tip
  // stay ordinary text a screen reader can read (children of a progressbar are
  // presentational, so the role used to be on the whole screen).
  el.innerHTML = loadScreenHtml({ kind, name: place.name, special: date.special, icon: date.icon, img });
  document.body.appendChild(el);
  // the boot screen may still be fading underneath: one bar at a time
  const boot = document.getElementById('loading');
  if (boot) boot.classList.add('ls-over');
  requestAnimationFrame(() => el.classList.add('on'));

  // #929: de bestemming wordt voorverwarmd terwijl het scherm openstaat. Het laden
  // wachtte alleen op de gebouwen en wegen van scene3d; de tegels van de plek waar je
  // aankomt en het voorwerk daarvan kwamen pas daarna, zodat de wereld na het
  // laadscherm nog seconden traag bleef. De straal is de boot van de prewarm-lus
  // (PREWARM_R, 110 m) met een lange looptijd: het scherm dekt de eerste frames.
  if (kind !== 'snel') prewarmStreamAt(x, y, 30);
  const wasPaused = !!world.uiPaused;
  world.uiPaused = true;
  setLoadHold(world, 'laadscherm', true); // phone.js refreshPause keeps uiPaused on while this hold stands
  zachtePauze(world, 'laden', true); // met meer spelers loopt de wereld door (#452)
  const fill = el.querySelector('.ls-bar i');
  const barEl = el.querySelector('.ls-bar');
  const stepEl = el.querySelector('.ls-step');
  let gateStap = '';
  let t0 = performance.now();
  let prog = startProgress();
  let res;
  const done = new Promise((r) => { res = r; });
  let ended = false;
  // de laadpoort (loadgate.js): geen prompt; zodra het laden klaar is gaat het scherm zelf door (korte fade, bij reduced motion direct)
  const gate = createGate();
  let shownBar = 0, lastT = performance.now();
  const reduced = () => document.documentElement.classList.contains('reduce-motion') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const finish = () => {
    if (ended) return;
    ended = true;
    const ms = fadeMs(reduced());
    el.style.transitionDuration = ms + 'ms';
    el.classList.remove('on');
    el.classList.add('out');
    // #1292: de pauze gaat er pas af als de fade klaar is; anders reed de speler al terwijl het beeld nog bedekt was.
    // Opent er tijdens de fade al een nieuw laadscherm, dan houdt dat de pauze vast en laat dit scherm hem staan.
    const release = () => {
      if (active) return;
      setLoadHold(world, 'laadscherm', false);
      world.uiPaused = wasPaused;
      zachtePauze(world, 'laden', false);
    };
    setTimeout(() => { el.remove(); release(); }, ms);
    active = null;
    // een savegame laden: wat er tijdens het laden als 'nieuw' voorbijkwam is niet nieuw; alleen echte ontdekkingen na het laden tellen
    if (kind === 'save') noticeQueue.drop(['discovery', 'area', 'reveal', 'hint']);
    res();
  };
  let tickGemeld = false;
  const step = () => {
    // #770: is het scherm van de pagina gehaald, dan rondt de lus af: alleen stoppen liet de
    // done-promise hangen en de wereld (en de wachters erop) voor altijd wachten.
    if (!el.isConnected) { finish(); return; }
    const now = performance.now();
    // #929: ook de tegelwachtrij en de prewarm van de bestemming tellen mee; zonder
    // die twee sloot het scherm terwijl de eerste seconde nog bouwde.
    const st = streamPending();
    const tiles = world.map && world.map.tileQueue ? world.map.tileQueue.size : 0;
    // spawnbinnen.js: a game that starts at home waits until the flat upstairs stands (home.js hook; none outside a home start)
    const hl = world.homeLaad;
    let binnen = 0;
    try { binnen = hl ? hl.tick(Math.max(0, Math.min(0.25, (now - lastT) / 1000))) : 0; } catch (e) { binnen = 0; if (!tickGemeld) { tickGemeld = true; console.warn('loadscreen: homeLaad.tick gooide, het scherm wacht er niet op', e); } } // review 22-11: een gooiende tick houdt de laadpauze niet vast
    // #1354: het scherm wacht ook op shaders en texturen, het verre LOD en de bevolking rond de plek (tileready.js), met de bestaande maximumtijd
    let extra = 0;
    try { const rc = readyCounts(world); extra = rc.gpu + rc.lod + rc.population; } catch (e) { extra = 0; }
    prog = stepProgress(prog, loadPending(st, tiles, prewarmPending(), binnen, extra), (now - t0) / 1000, kind);
    // één doorlopende balk: zacht naar het doel, nooit terug, nooit voorbij 100 % voor het klaar is
    shownBar = prog.done ? 1 : easeBar(shownBar, prog.bar, now - lastT);
    lastT = now;
    fill.style.transform = `scaleX(${shownBar.toFixed(3)})`;
    barEl.setAttribute('aria-valuenow', String(Math.round(shownBar * 100)));
    const stepNow = loadStepAt(prog.bar, kind);
    if (stepEl.dataset.id !== stepNow.id) {
      stepEl.dataset.id = stepNow.id;
      gateStap = stepNow.label;
    }
    // de ene statusregel onder de balk: de echte stap (of de reden van een lange wacht); alleen schrijven bij een wijziging
    const gv = gateTick(gate, { done: prog.done, elapsedS: (now - t0) / 1000, stap: gateStap, wachtOp: opts.wachtOp ? opts.wachtOp() : wachtOpGastheer(world.coopNet, () => openerNaam(world.coopRoster)) });
    if (stepEl.textContent !== gv.status) { stepEl.textContent = gv.status; barEl.setAttribute('aria-valuetext', gv.status); nieuweRegel(stepEl); }
    if (gv.actie === 'door') { finish(); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // a second jump while the screen is up: warm the new place and wait for it (watchJumps)
  const retarget = (nx, ny) => {
    if (ended) return;
    if (kind !== 'snel') prewarmStreamAt(nx, ny, 30);
    prog = retargetProgress(prog);
    t0 = performance.now();
  };
  active = { done, el, retarget };
  return active;
}


// A jump of the player (fast travel, teleport) far from where he was: show
// the screen while the city streams in. main.js calls this every frame.
let lastX = null, lastY = 0;
export function watchJumps(world, { swallow = false, hold = false } = {}) {
  const p = hoofdspeler(world);
  // hold: a menu or the map is open, the jump is looked at once it closes
  if (hold && lastX != null) return;
  const moved = lastX == null ? 0 : Math.hypot(p.x - lastX, p.y - lastY);
  lastX = p.x; lastY = p.y;
  if (active && moved >= JUMP_M && active.retarget) active.retarget(p.x, p.y);
  if (swallow || active || moved < JUMP_M) return;
  startLoadScreen(world, { kind: loadKind(moved), x: p.x, y: p.y, mission: world.loadMission });
}
export function resetJumpWatch() { lastX = null; }

