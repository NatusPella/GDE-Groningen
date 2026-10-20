// Spelbot (issue #186), the page side: ?autoplay (devflags.js) opens
// window.__bot. status() is the game state as JSON (botlogic.js validateStatus
// describes it); the actions go in through the input contract the game already
// has: key events (a keydown is always followed by its keyup), the pad stick
// (input.padAxis, like gamepad.js) and dialog keys. Nothing here opens a port:
// an outside driver (Electron executeJavaScript, scripts/bot/) calls the API.
// Every action and event is also written as a replay line ([bot-log] <json> on
// the console, which the desktop app appends to the run's events file).
import { FLAGS } from './devflags.js';
import { sendKey } from './input.js';
import { STATUS_VERSION, validateStatus, replayInputs } from './botlogic.js';
import { getStoryView, storyApi } from './story.js';
import { getMissionDefs, activeStage } from './missionquery.js';
import { getGoal, goalTarget } from './goal.js';
import { isCinematicActive, isBannerUp } from './cinematics.js';
import { talkState, talkActive } from './storytalk.js';
import { isPauseMenuOpen } from './pausestate.js';
import { isShopOpen } from './shopui.js';
import { isRitActive } from './reisrit.js';
import { isPigeonActive } from './pigeonmode.js';
import { installAudioTap } from './botaudio.js';

const r1 = (v) => Math.round(v * 10) / 10;
const text = (el) => (el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '');

export function initPlayerApi(world, input) {
  if (!FLAGS.autoplay || typeof window === 'undefined') return null;
  const player = world.player;
  const held = new Set();
  let lastAxis = [0, 0];
  let lastAxisT = -1;
  const T = () => world.time || 0;
  const emit = (type, data = {}) => {
    const e = { t: Math.round(T() * 1000) / 1000, type, ...data };
    console.log('[bot-log] ' + JSON.stringify(e));
    return e;
  };

  const kindOf = (v) => (v.isBoat ? 'boot' : v.isHeli ? 'heli' : v.isPlane ? 'vliegtuig' : v.isBike ? 'fiets' : v.isScooter ? 'scooter' : v.isBus ? 'bus' : 'auto');

  function nearbyVehicles(max = 60) {
    const out = [];
    for (const v of world.vehicles || []) {
      const d = Math.hypot(v.x - player.x, v.y - player.y);
      if (d > max || v === player.inVehicle) continue;
      out.push({ x: r1(v.x), y: r1(v.y), distance: r1(d), kind: kindOf(v), free: !v.wrecked && !v.isPolice && !v.sinking, drivable: !v.isBoat && !v.isHeli });
    }
    return out.sort((a, b) => a.distance - b.distance).slice(0, 8);
  }

  function dialog() {
    const panel = document.querySelector('#hud .cw-panel:not([hidden])');
    if (!panel) return null;
    return {
      kicker: text(panel.querySelector('small')), text: text(panel.querySelector('.cw-text')),
      options: [...panel.querySelectorAll('.cw-opt')].map((o) => ({ key: o.dataset.key, label: text(o.querySelector('span:last-child')) })),
    };
  }

  function subtitle() {
    const cine = document.getElementById('cine');
    if (cine && cine.classList.contains('has-sub')) return { speaker: text(cine.querySelector('.cine-speaker')), text: text(cine.querySelector('.cine-line')), source: 'cutscene' };
    const ts = talkState();
    if (ts.cur && ts.cur.line) return { speaker: text(document.querySelector('#story-talk .st-speaker')), text: String(ts.cur.line), source: 'gesprek' };
    return null;
  }

  // where the bot should go: the running mission's marker, else the story step's place
  function target() {
    const m = world.mission;
    const view = getStoryView();
    const x = player.x, y = player.y;
    let t = null, source = '';
    if (m && m.phase === 'active' && m.marker) { t = { x: m.marker.x, y: m.marker.y, z: Number.isFinite(m.marker.z) ? m.marker.z : null, name: m.label }; source = 'missie'; }
    else if (!view.end && view.kind === 'mission' && m && m.marker) { t = { x: m.marker.x, y: m.marker.y, name: view.title }; source = 'missiestart'; }
    else if (world.storyGuide) { t = { x: world.storyGuide.x, y: world.storyGuide.y, name: world.storyGuide.name || view.title }; source = 'verhaal'; }
    else {
      const g = getGoal() && goalTarget(world);
      if (g) { t = { x: g.x, y: g.y, name: g.name }; source = 'doel'; }
    }
    if (!t) return null;
    // the marker is a vehicle the player is not in (a mission that wants its own tractor, bike or boat back)
    const mv = source === 'missie' && (world.vehicles || []).find((q) => Math.hypot(q.x - t.x, q.y - t.y) < 0.6);
    return { x: r1(t.x), y: r1(t.y), z: t.z ?? null, name: t.name || '', source, distance: r1(Math.hypot(t.x - x, t.y - y)), ...(mv && player.inVehicle !== mv ? { vehicle: true } : {}) };
  }

  function status() {
    const v = player.inVehicle;
    const view = getStoryView();
    const m = world.mission || {};
    const defs = getMissionDefs();
    const stage = activeStage();
    const msgs = (world.messages || []).filter((q) => q.until > T()).map((q) => q.text);
    const dlg = dialog();
    const b = {
      cinematic: !!isCinematicActive(), banner: !!isBannerUp(), talk: !!talkActive(), pauseMenu: !!isPauseMenuOpen(),
      paused: !!world.paused, respawn: !!world.pendingRespawn, loading: !document.body.classList.contains('game-started'),
      shop: !!isShopOpen(), ride: !!isRitActive(), dialog: dlg,
    };
    const s = {
      v: STATUS_VERSION, t: r1(T()), wall: Math.round(performance.now()), arc: 'nieuw',
      player: {
        x: r1(player.x), y: r1(player.y), z: r1((player.gz || 0) + (player.z || 0)), angle: Math.round(player.angle * 1000) / 1000,
        camYaw: Math.round((world.camYaw ?? player.angle) * 1000) / 1000, pigeon: !!isPigeonActive(), health: player.health, money: world.money, character: player.character || '',
        vehicle: v ? { kind: kindOf(v), x: r1(v.x), y: r1(v.y), angle: Math.round(v.angle * 1000) / 1000, speed: r1(v.speed || 0), boat: !!v.isBoat, heli: !!v.isHeli, plane: !!v.isPlane } : null,
      },
      story: view.end ? { end: true, part: view.part, title: view.title } : { end: false, id: view.id, part: view.part, kind: view.kind, title: view.title, lead: view.lead, canSkip: view.canSkip, fails: view.fails, done: view.done, total: view.total },
      mission: {
        active: m.phase === 'active', phase: m.phase || 'idle', index: m.index ?? -1, id: defs[m.index] ? defs[m.index].id : '', code: m.code || '', label: m.label || '', type: m.type || '',
        stage: stage ? stage.kind : '', marker: m.marker ? { x: r1(m.marker.x), y: r1(m.marker.y) } : null, distance: Number.isFinite(m.distanceToMarker) ? r1(m.distanceToMarker) : null,
        timeLeft: m.timeLeft ?? null, armed: !!m.armed, triggerRadius: m.triggerRadius ?? null, onFoot: false,
      },
      goal: getGoal() ? { kind: getGoal().kind, name: getGoal().name, x: r1(getGoal().x), y: r1(getGoal().y) } : null,
      target: target(),
      hud: { messages: msgs, subtitle: subtitle(), prompt: text(document.querySelector('#hud .prompt, #hud .interact-prompt')), objective: view.end ? '' : view.title, text: text(document.getElementById('hud')).slice(0, 400) },
      blocking: b,
      wanted: world.wanted || 0,
      nearby: { vehicles: nearbyVehicles(), peds: (world.pedestrians || []).filter((p) => Math.hypot(p.x - player.x, p.y - player.y) < 40).length, police: (world.vehicles || []).filter((q) => q.isPolice && Math.hypot(q.x - player.x, q.y - player.y) < 120).length },
      held: [...held],
    };
    return s;
  }

  // --- actions: the input contract ------------------------------------------------
  function down(key) {
    if (held.has(key)) return;
    held.add(key);
    sendKey('keydown', key);
    emit('key', { key, down: true });
  }
  function up(key) {
    if (!held.has(key)) return;
    held.delete(key);
    sendKey('keyup', key);
    emit('key', { key, down: false });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function press(key, ms = 90) { down(key); await sleep(ms); up(key); }
  function releaseAll() {
    for (const k of [...held]) up(k);
    stick(0, 0);
  }
  // the stick (x right, y down, like Input.axis); logged when it changes
  function stick(x, y) {
    x = Math.max(-1, Math.min(1, x)); y = Math.max(-1, Math.min(1, y));
    input.padAxis = [x, y];
    const toZero = !x && !y && (lastAxis[0] || lastAxis[1]);
    const changed = Math.abs(x - lastAxis[0]) > 0.08 || Math.abs(y - lastAxis[1]) > 0.08;
    if (toZero || (changed && T() - lastAxisT >= 0.1)) {
      lastAxis = [x, y]; lastAxisT = T();
      emit('axis', { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
    }
  }
  const waitGame = async (s) => { const t0 = T(); while (T() - t0 < s) await sleep(50); };
  const shot = (name) => { const n = String(name).replace(/[^\w.-]/g, '_'); console.log('[capture] ' + n); emit('shot', { name: n }); return n; };

  // plays an input log back (RunLog.inputs()) in game time from now
  async function replay(events) {
    const ins = replayInputs(events);
    if (!ins.length) return 0;
    const t0 = ins[0].t, g0 = T();
    for (const e of ins) {
      while (T() - g0 < e.t - t0) await sleep(16);
      if (e.type === 'key') (e.down ? down : up)(e.key); else stick(e.x, e.y);
    }
    releaseAll();
    return ins.length;
  }

  const api = {
    version: STATUS_VERSION, status, validate: () => validateStatus(status()),
    press, down, up, stick, releaseAll, wait: sleep, waitGame, shot, replay, log: emit,
    time: T,
    // game speed 1..8 (whole extra gameplay steps per frame, main.js devTimeScale); returns the speed in force. A replay stays valid: the steps keep the same dt
    speed: (n = 1) => { const v = Math.max(1, Math.min(8, Math.round(Number(n) || 1))); world.devTimeScale = v; emit('speed', { x: v }); return v; },
    // the dialog keys: the first option, or a given key
    choose: (key) => { const d = dialog(); const k = key || (d && d.options[0] && d.options[0].key); return k ? press(String(k)) : Promise.resolve(); },
    // the cheats a stuck bot may use (testmenu / story dev API); the caller logs "had een cheat nodig"
    cheat: {
      teleport: () => storyApi.teleport(),
      objective: () => storyApi.objective(),
      win: () => storyApi.win(),
      complete: () => storyApi.complete(),
      skip: () => storyApi.skip(true),
      invulnerable: (on = true) => { world.devInvuln = !!on; },
    },
    world, player, input,
  };
  if (FLAGS.audiograf) installAudioTap(emit);
  window.__bot = api;
  emit('ready', { arc: api.status().arc });
  return api;
}
