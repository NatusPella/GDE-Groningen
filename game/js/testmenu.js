// Testmenu (?testmenu, loaded by main.js only then). F10 opens it: every URL
// switch of devflags.js with its Dutch explanation and a toggle (the page
// reloads with the switch changed), and shortcuts to a test situation per new
// feature. The logic is testmenulogic.js. ?testmenu implies the dev storage
// (gde-dev:, devflags.js), so nothing here reaches the real save. The jumps
// reuse the cheat teleport (w.cheatActions), the story API and the vehicle
// code; nothing is rebuilt.
import { FLAGS, FLAG_DOCS, SEARCH } from './devflags.js';
import { flagRows, withFlag, clearedSearch, shortcutGroups, SHORTCUTS, findWaterNear } from './testmenulogic.js';
import { isInWater } from './util.js';
import { Vehicle } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { cheatsUit, CHEATS_UIT_TEKST } from './coopgroep.js';

let world = null;
let root = null;
let open = false;
let note = '';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function css() {
  const st = document.createElement('style');
  st.textContent = `
#testmenu{position:fixed;inset:0;z-index:70;display:none;background:rgba(8,10,14,.72);font:14px/1.4 system-ui,sans-serif;color:#eee}
#testmenu.open{display:block}
#testmenu .tm-box{position:absolute;top:4vh;left:50%;transform:translateX(-50%);width:min(760px,94vw);max-height:92vh;overflow:auto;background:rgba(18,20,26,.97);border:1px solid #4a4f5c;border-radius:12px;padding:14px 16px}
#testmenu h2{margin:0 0 4px;font-size:18px}
#testmenu h3{margin:14px 0 4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#9aa3b5}
#testmenu .tm-sub{color:#9aa3b5;font-size:12px}
#testmenu .tm-note{min-height:18px;color:#f3c969;margin:6px 0}
#testmenu button,#testmenu select{font:inherit;background:#23262d;color:#eee;border:1px solid #555;border-radius:6px;padding:4px 9px;margin:2px 4px 2px 0;cursor:pointer}
#testmenu button:hover{background:#343844}
#testmenu .tm-flag{display:flex;gap:10px;align-items:flex-start;padding:5px 0;border-top:1px solid #2b2e38}
#testmenu .tm-flag b{min-width:110px;font-family:ui-monospace,monospace}
#testmenu .tm-flag span{flex:1;color:#cfd3da}
#testmenu .tm-on{background:#1e6e3e;border-color:#2c9a58}`;
  document.head.appendChild(st);
}

function build() {
  root = document.createElement('div');
  root.id = 'testmenu';
  root.innerHTML = '<div class="tm-box"></div>';
  document.body.appendChild(root);
  for (const t of ['mousedown', 'mouseup', 'wheel', 'keydown']) root.addEventListener(t, (e) => e.stopPropagation());
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.flag) {
      const sel = root.querySelector(`select[data-val="${b.dataset.flag}"]`);
      const on = b.dataset.on !== '1';
      go(withFlag(SEARCH, b.dataset.flag, on, sel ? sel.value : null));
    } else if (b.dataset.clear) go(clearedSearch());
    else if (b.dataset.close) setOpen(false);
    else if (b.dataset.open) window.open(b.dataset.open, '_blank');
    else if (b.dataset.sc) runShortcut(b.dataset.sc);
  });
}

function go(search) {
  location.assign(location.pathname + search);
}

function render() {
  const rows = flagRows(FLAG_DOCS, SEARCH);
  const flags = rows.map((r) => {
    const sel = r.values ? `<select data-val="${r.name}">${r.values.map((v) => `<option${v === r.value ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>` : '';
    return `<div class="tm-flag"><b>?${esc(r.name)}</b><span>${esc(r.doc)}</span>${sel}<button data-flag="${r.name}" data-on="${r.on ? 1 : 0}" class="${r.on ? 'tm-on' : ''}">${r.on ? 'Aan' : 'Uit'}</button></div>`;
  }).join('');
  const groups = shortcutGroups().map((g) => `<h3>${esc(g.name)}</h3>` + g.items.map((s) => `<button data-sc="${s.id}">${esc(s.label)}</button>`).join('')).join('');
  root.querySelector('.tm-box').innerHTML = `<h2>Testmenu</h2>
    <div class="tm-sub">F10 sluit. Eigen opslag (gde-dev:): je echte savegame, instellingen en prestaties blijven onaangeroerd. Een schakelaar laadt de pagina opnieuw.</div>
    <div class="tm-note">${esc(note)}</div>
    <h3>Snelkoppelingen</h3>${groups}
    <h3>Hulpmiddelen</h3><button data-open="cutpreview.html">Cutscene-preview (scènes bekijken, scrubben, valideren)</button>
    <h3>Schakelaars</h3>${flags}
    <div style="margin-top:10px"><button data-clear="1">Alle schakelaars uit</button><button data-close="1">Sluiten</button></div>`;
}

function say(text) { note = text; if (world && world.addMessage) world.addMessage(text, 3); if (open) render(); }

function teleport(x, y, name) {
  const t = world.cheatActions && world.cheatActions.teleport;
  if (!t) return say('Teleporteren is nog niet klaar');
  setOpen(false);
  t(x, y, name);
}

function runShortcut(id) {
  const s = SHORTCUTS.find((c) => c.id === id);
  if (!s || !world) return;
  if (cheatsUit(world)) return say(CHEATS_UIT_TEKST); // het menu stond al open toen iemand aansloot (#452)
  const a = s.act, map = world.map;
  if (a.kind === 'landmark') {
    const l = ((map && map.meta && map.meta.landmarks) || []).find((m) => m.name === a.name);
    return l ? teleport(l.x, l.y, a.name) : say(`${a.name} staat niet op deze kaart`);
  }
  if (a.kind === 'reuzenrad') {
    const sp = window.__hoogvlieger && window.__hoogvlieger.spot();
    return sp ? teleport(sp.x, sp.y, 'het reuzenrad') : say('Het reuzenrad is er nog niet (kermis)');
  }
  if (a.kind === 'bridge') {
    const p = world.player;
    let best = null, bd = Infinity;
    for (const r of (map && map.roads) || []) {
      if (!r.bridge || !r.pts || r.pts.length < 2) continue;
      const m = r.pts[Math.floor(r.pts.length / 2)], d = Math.hypot(m[0] - p.x, m[1] - p.y);
      if (d > 30 && d < bd) { bd = d; best = m; }
    }
    return best ? teleport(best[0], best[1], 'een brug') : say('Geen brug gevonden');
  }
  if (a.kind === 'station') {
    const st = ((map && map.stations) || [])[0];
    return st ? teleport(st.x, st.y, st.name || 'het station') : say('Geen station gevonden');
  }
  if (a.kind === 'clock') { world.clock = a.hour; return say(`Het is nu ${a.hour}:00`); }
  if (a.kind === 'money') { world.money += a.amount; return say(`+€${a.amount}`); }
  if (a.kind === 'wanted') { world.wanted = a.level; world.wantedDecayTimer = 0; return say(a.level ? `Wanted op ${a.level} sterren` : 'Wanted weg'); }
  if (a.kind === 'story') {
    const S = window.__story;
    if (!S) return say('Verhaal is nog niet klaar');
    setOpen(false);
    if (a.what === 'teleport') return S.teleport();
    const first = S.steps.find((x) => x.kind === 'mission');
    return first ? S.jump(first.id) : say('Geen missie gevonden');
  }
  if (a.kind === 'ship') {
    const p = world.player;
    const water = findWaterNear(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30, (x, y) => isInWater(map, x, y), 200, 12);
    if (!water) return say('Geen water in de buurt: ga eerst naar een kanaal');
    const v = new Vehicle(water.x, water.y, water.angle, { ...BOAT_KINDS[a.model] });
    v.isBoat = true;
    v.speed = 0;
    world.vehicles.push(v);
    setOpen(false);
    return say(`${a.model === 'spits' ? 'Spits' : 'Kempenaar'} ligt klaar; loop erheen en stap in`);
  }
}

function setOpen(v) {
  if (v && cheatsUit(world)) { if (world.addMessage) world.addMessage(CHEATS_UIT_TEKST, 4); v = false; } // met meer spelers geen testmenu (#452)
  open = v;
  world.devPanelOpen = open;
  if (open) render();
  root.classList.toggle('open', open);
  if (open && document.pointerLockElement) document.exitPointerLock();
}

export function initTestMenu(w) {
  world = w;
  css();
  build();
  const canLock = w.input.canLock;
  w.input.canLock = () => !open && (!canLock || canLock());
  window.addEventListener('keydown', (e) => { if (e.key === 'F10') { e.preventDefault(); setOpen(!open); } });
  if (FLAGS.testmenu) w.addMessage && w.addMessage('Testmenu: druk F10', 4);
}
