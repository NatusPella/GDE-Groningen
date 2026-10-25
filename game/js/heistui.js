// The screen side of H6 Het museum stond er al zo (heist.js holds the game state): the
// minigame panels (fuse box, lock, the case's dial), the blueprint of the
// museum for the plan scene with the choice of approach, the card on the
// empty cushion, the alarm vignette and the "hold O to skip" chip.
import { dualHtml } from './subtitles.js';

let root = null;
let panel = null;
let panelKind = '';
let plan = null;
let note = null;
let alarmEl = null;
let flashEl = null;
let skipEl = null;

const key = (k) => `<span class="hud-key">${k}</span>`;
const SKIP_ROW = `<div class="hx-skip">Lukt het niet? Houd ${key('O')} ingedrukt om dit stuk over te slaan</div>`;

function ensureRoot() {
  if (root && root.isConnected) return root;
  if (!document.getElementById('heist-css')) {
    const link = document.createElement('link');
    link.id = 'heist-css';
    link.rel = 'stylesheet';
    link.href = new URL('./heist.css', import.meta.url).href;
    document.head.appendChild(link);
  }
  root = document.createElement('div');
  root.id = 'heist-ui';
  document.body.appendChild(root);
  alarmEl = document.createElement('div');
  alarmEl.className = 'hx-alarm';
  flashEl = document.createElement('div');
  flashEl.className = 'hx-flash';
  root.append(alarmEl, flashEl);
  return root;
}

// --- the minigame panel --------------------------------------------------------------

function openPanel(kind, html) {
  ensureRoot();
  if (panel && panelKind === kind) return panel;
  closePanel();
  panel = document.createElement('div');
  panel.className = 'hx-panel';
  panel.innerHTML = html + SKIP_ROW;
  root.appendChild(panel);
  panelKind = kind;
  void panel.offsetWidth;
  panel.classList.add('on');
  return panel;
}

export function closePanel() {
  if (!panel) return;
  const el = panel;
  panel = null;
  panelKind = '';
  el.classList.remove('on');
  setTimeout(() => el.remove(), 260);
}

export function shakePanel() {
  if (!panel) return;
  panel.classList.remove('shake');
  void panel.offsetWidth;
  panel.classList.add('shake');
}

export function fusePanel(F, total) {
  const el = openPanel('fuse', `<div class="hx-title">Stroomkast</div><div class="hx-sub" data-s></div>
    <div class="hx-bar"><div class="hx-zone" data-z></div><div class="hx-needle" data-n></div></div>
    <div class="hx-lamps">${'<i class="hx-lamp"></i>'.repeat(total)}</div>
    <div class="hx-keys">${key('SPATIE')}<span>als de naald in het groen staat</span></div>`);
  el.querySelector('[data-s]').textContent = `Zekering ${Math.min(total, F.hits + 1)} van ${total}: de camera's gaan op herhaling`;
  const z = el.querySelector('[data-z]');
  z.style.left = `${(F.center - F.width / 2) * 100}%`;
  z.style.width = `${F.width * 100}%`;
  el.querySelector('[data-n]').style.left = `${F.x * 100}%`;
  el.querySelectorAll('.hx-lamp').forEach((l, i) => l.classList.toggle('done', i < F.hits));
}

export function lockPanel(L) {
  const n = L.pins.length;
  const el = openPanel('lock', `<div class="hx-title">Achterdeur</div><div class="hx-sub">Slotje openpeuteren: zet de pinnetjes één voor één vast</div>
    <div class="hx-lock">${'<div class="hx-chamber"><div class="hx-pin"></div></div>'.repeat(n)}</div>
    <div class="hx-keys">${key('SPATIE')}<span>als het oplichtende pinnetje in de groene strook staat</span></div>`);
  el.querySelectorAll('.hx-chamber').forEach((ch, i) => {
    const p = L.pins[i];
    ch.classList.toggle('cur', i === L.cur);
    ch.classList.toggle('set', i < L.cur);
    ch.style.setProperty('--zone', `${Math.round(L.zone * 100)}%`);
    // y 1 = at the top (the shear line), 0 = resting at the bottom
    const y = i < L.cur ? 1 : p.y;
    ch.querySelector('.hx-pin').style.top = `${(1 - y) * 44 + 2}px`;
  });
}

const DIAL_TICKS = 40;

function dialSvg() {
  let ticks = '';
  for (let i = 0; i < DIAL_TICKS; i++) {
    const a = (i / DIAL_TICKS) * Math.PI * 2 - Math.PI / 2;
    const big = i % 5 === 0;
    const r0 = big ? 52 : 56, r1 = 62;
    ticks += `<line class="tick${big ? ' big' : ''}" x1="${(75 + Math.cos(a) * r0).toFixed(1)}" y1="${(75 + Math.sin(a) * r0).toFixed(1)}" x2="${(75 + Math.cos(a) * r1).toFixed(1)}" y2="${(75 + Math.sin(a) * r1).toFixed(1)}"/>`;
    if (big) ticks += `<text class="num" x="${(75 + Math.cos(a) * 42).toFixed(1)}" y="${(75 + Math.sin(a) * 42).toFixed(1)}">${i}</text>`;
  }
  return `<svg class="hx-dial" viewBox="0 0 150 150"><circle class="face" cx="75" cy="75" r="66"/>
    <g data-rot>${ticks}<path class="hintmark" data-h d=""/></g>
    <path class="mark" d="M75 3 l6 10 h-12 z"/><circle class="hub" cx="75" cy="75" r="16"/></svg>`;
}

export function crackPanel(C) {
  const el = openPanel('crack', `<div class="hx-title">De vitrine</div><div class="hx-sub">Draai aan het slot tot je hem voelt klikken</div>
    <div class="hx-dialrow">${dialSvg()}<div><div class="hx-code">${C.code.map(() => '<span class="hx-digit">?</span>').join('')}</div>
    <div class="hx-feel"><i data-f></i></div><div class="hx-side" data-d></div></div></div>
    <div class="hx-keys">${key('A')}${key('D')}<span>draaien</span><span class="sep">·</span>${key('SPATIE')}<span>vastzetten bij de klik</span></div>`);
  el.querySelector('[data-rot]').setAttribute('transform', `rotate(${(-C.v / DIAL_TICKS) * 360} 75 75)`);
  el.querySelector('.hx-dial').classList.toggle('hot', C.hot);
  el.querySelector('[data-f]').style.width = `${Math.round(C.feel * 100)}%`;
  el.querySelectorAll('.hx-digit').forEach((d, i) => {
    d.textContent = i < C.cur || C.showCode ? String(C.code[i]) : '?';
    d.classList.toggle('done', i < C.cur);
    d.classList.toggle('cur', i === C.cur);
  });
  el.querySelector('[data-d]').textContent = C.cur < C.code.length ? (C.cur % 2 ? 'Nu naar links (A)' : 'Naar rechts (D)') : '';
  const hm = el.querySelector('[data-h]');
  if (C.showMark && C.cur < C.code.length) {
    const t = C.code[C.cur];
    const a0 = ((t - 0.6) / DIAL_TICKS) * Math.PI * 2 - Math.PI / 2, a1 = ((t + 0.6) / DIAL_TICKS) * Math.PI * 2 - Math.PI / 2;
    hm.setAttribute('d', `M${75 + Math.cos(a0) * 64} ${75 + Math.sin(a0) * 64} A64 64 0 0 1 ${75 + Math.cos(a1) * 64} ${75 + Math.sin(a1) * 64}`);
    hm.classList.add('on');
  } else hm.classList.remove('on');
}

// --- the blueprint ---------------------------------------------------------------------------
// data: world-space outlines and marks from heist.js planData(); focus keys:
// island, water, fuse, cams, guards, lasers, vitrine, routeA, routeB, choice.
// data.samen: één regel per speler met zijn rollen (#438), alleen met meer dan één speler.

const CW = 960, CH = 640;
const INK = '#3fc97a', INK_SOFT = 'rgba(63, 201, 122, 0.35)', PAPER = '#f0ede4', GOLD = '#f2c14e', RED = '#d93f3f';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function showPlan(data) {
  ensureRoot();
  hidePlan(true);
  const el = document.createElement('div');
  el.className = 'hx-plan';
  const samen = data && Array.isArray(data.samen) ? data.samen.filter((s) => typeof s === 'string' && s) : [];
  el.innerHTML = `<div class="hx-plan-head"><span>Bouwtekening · Groninger Museum</span><small>Begane grond · nachtdienst</small></div>
    <canvas width="${CW}" height="${CH}"></canvas>
    ${samen.length ? `<div class="hx-samen" role="note"><b>Samen:</b>${samen.map((s) => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="hx-choice">
      <button type="button" class="hx-card" data-pick="sluip"><b>${key('A')} Achterdeur</b><span>Sluipen: slotje openpeuteren, langs de bewaker in zaal 1.</span><em>Spannend en stil.</em></button>
      <button type="button" class="hx-card" data-pick="vermomd"><b>${key('S')} Schoonmakers</b><span>Vermomd in een overall: pasje rollen, gewoon door de glazen deur.</span><em>De bewakers zien je pas van dichtbij.</em></button>
    </div>
    <div class="hx-choice-note">Kies met A of S (of klik). Allebei eindigen ze in zaal 3.</div>`;
  root.appendChild(el);
  const cv = el.querySelector('canvas');
  plan = { el, cv, g: cv.getContext('2d'), data, focus: 'island', since: performance.now(), raf: 0, sel: null, onPick: null, seen: new Set(['island']) };
  el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (plan && plan.onPick) plan.onPick(b.dataset.pick); }));
  void el.offsetWidth;
  el.classList.add('on');
  const tick = () => { if (!plan || plan.el !== el) return; drawPlan(); plan.raf = requestAnimationFrame(tick); };
  plan.raf = requestAnimationFrame(tick);
}

export function planFocus(focus) {
  if (!plan || !focus || plan.focus === focus) return;
  plan.focus = focus;
  plan.since = performance.now();
  plan.seen.add(focus);
}

export function planChoosing(on, onPick = null, sel = null) {
  if (!plan) return;
  plan.el.classList.toggle('choosing', !!on);
  plan.onPick = on ? onPick : null;
  plan.sel = sel;
  plan.el.querySelectorAll('[data-pick]').forEach((b) => b.classList.toggle('sel', b.dataset.pick === sel));
  if (on) planFocus('choice');
}

export function planShown() { return !!plan; }

export function hidePlan(now = false) {
  if (!plan) return;
  const p = plan;
  plan = null;
  cancelAnimationFrame(p.raf);
  p.el.classList.remove('on');
  if (now) p.el.remove();
  else setTimeout(() => p.el.remove(), 450);
}

function drawPlan() {
  const { g, data } = plan;
  const b = data.bounds;
  const s = Math.min((CW - 40) / (b[2] - b[0]), (CH - 40) / (b[3] - b[1]));
  const ox = (CW - (b[2] - b[0]) * s) / 2 - b[0] * s, oy = (CH - (b[3] - b[1]) * s) / 2 - b[1] * s;
  const X = (x) => ox + x * s, Y = (y) => oy + y * s;
  const t = (performance.now() - plan.since) / 1000;
  const now = performance.now() / 1000;
  const f = plan.focus;
  const lit = (k) => f === k || (f === 'choice' && (k === 'routeA' || k === 'routeB'));
  const pulse = 0.5 + 0.5 * Math.sin(now * 5);
  g.clearRect(0, 0, CW, CH);
  // paper and grid
  g.fillStyle = '#0f1c13';
  g.fillRect(0, 0, CW, CH);
  g.strokeStyle = 'rgba(63, 201, 122, 0.07)';
  g.lineWidth = 1;
  for (let x = Math.ceil(b[0] / 5) * 5; x < b[2]; x += 5) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), CH); g.stroke(); }
  for (let y = Math.ceil(b[1] / 5) * 5; y < b[3]; y += 5) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(CW, Y(y)); g.stroke(); }
  const poly = (pts, fill, stroke, w = 1.5, dash = null) => {
    if (!pts || pts.length < 2) return;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    if (fill) { g.closePath(); g.fillStyle = fill; g.fill(); }
    if (stroke) { g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); g.setLineDash([]); }
  };
  // water (hatched), the museum pavilions, the rooms, the bridges
  const waterLit = lit('water') || lit('island');
  for (const w of data.water) poly(w, waterLit ? `rgba(63, 160, 140, ${0.16 + pulse * 0.08})` : 'rgba(63, 160, 140, 0.13)', null);
  for (const pts of data.buildings) poly(pts, 'rgba(240, 237, 228, 0.05)', lit('island') ? `rgba(240, 237, 228, ${0.5 + pulse * 0.4})` : 'rgba(240, 237, 228, 0.35)', 1.2);
  for (const r of data.rooms) poly(r.pts, 'rgba(63, 201, 122, 0.1)', INK_SOFT, 1.2);
  for (const br of data.bridges) poly(br, null, lit('island') || lit('water') ? `rgba(242, 193, 78, ${0.5 + pulse * 0.4})` : 'rgba(240, 237, 228, 0.3)', 3, [5, 4]);
  g.font = "15px 'Bebas Neue', 'Arial Narrow', sans-serif";
  g.textAlign = 'center';
  g.fillStyle = 'rgba(240, 237, 228, 0.55)';
  for (const r of data.rooms) if (r.name) g.fillText(r.name.toUpperCase(), X(r.c[0]), Y(r.c[1]) + 5);
  // routes: drawn on by Tessa's pen while they are the topic, kept after
  const route = (pts, color, k) => {
    if (!pts || pts.length < 2 || (!plan.seen.has(k) && f !== 'choice')) return;
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * s;
    const k0 = f === k ? Math.min(1, t / 2.2) : 1;
    g.save();
    g.setLineDash([10, 7]);
    g.lineDashOffset = -now * 18;
    g.beginPath();
    let left = L * k0;
    pts.forEach(([x, y], i) => {
      if (!i) { g.moveTo(X(x), Y(y)); return; }
      const [px, py] = pts[i - 1];
      const seg = Math.hypot(x - px, y - py) * s;
      if (left <= 0) return;
      const u = Math.min(1, left / seg);
      g.lineTo(X(px + (x - px) * u), Y(py + (y - py) * u));
      left -= seg;
    });
    g.strokeStyle = color;
    g.lineWidth = lit(k) ? 4 : 2.5;
    g.globalAlpha = lit(k) || f === 'choice' ? 1 : 0.55;
    g.stroke();
    g.restore();
  };
  route(data.routes.sluip, INK, 'routeA');
  route(data.routes.vermomd, PAPER, 'routeB');
  // marks
  const ring = (x, y, r, color) => { g.beginPath(); g.arc(X(x), Y(y), r + pulse * 5, 0, Math.PI * 2); g.strokeStyle = color; g.lineWidth = 2.5; g.stroke(); };
  const label = (x, y, text, color = PAPER, dy = -14) => {
    g.font = "17px 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
    g.fillStyle = color;
    g.fillText(text, X(x), Y(y) + dy);
  };
  const m = data.marks;
  if (m.start) { g.fillStyle = GOLD; g.beginPath(); g.arc(X(m.start.x), Y(m.start.y), 6, 0, Math.PI * 2); g.fill(); label(m.start.x, m.start.y, 'wij', GOLD); }
  if (m.fuse) {
    g.fillStyle = lit('fuse') ? GOLD : PAPER;
    g.fillRect(X(m.fuse.x) - 6, Y(m.fuse.y) - 8, 12, 16);
    if (lit('fuse') || lit('cams')) { ring(m.fuse.x, m.fuse.y, 14, GOLD); label(m.fuse.x, m.fuse.y, 'stroomkast', GOLD, -24); }
  }
  for (const c of m.cams || []) {
    g.save();
    g.translate(X(c.x), Y(c.y));
    g.rotate(c.a);
    g.fillStyle = lit('cams') ? `rgba(242, 193, 78, ${0.25 + pulse * 0.2})` : 'rgba(240, 237, 228, 0.12)';
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 38, -0.4, 0.4); g.closePath(); g.fill();
    g.fillStyle = PAPER; g.fillRect(-4, -4, 8, 8);
    g.restore();
  }
  if (lit('cams') && m.cams && m.cams[0]) label(m.cams[0].x, m.cams[0].y, 'camera\'s: op herhaling', GOLD, -22);
  for (const q of m.guards || []) {
    g.save();
    g.translate(X(q.x), Y(q.y));
    g.rotate(q.a + (lit('guards') ? Math.sin(now * 1.3 + q.x) * 0.5 : 0));
    g.fillStyle = lit('guards') ? `rgba(255, 227, 160, ${0.3 + pulse * 0.2})` : 'rgba(255, 227, 160, 0.14)';
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, q.r * s, -0.5, 0.5); g.closePath(); g.fill();
    g.restore();
    g.fillStyle = PAPER; g.beginPath(); g.arc(X(q.x), Y(q.y), 5, 0, Math.PI * 2); g.fill();
  }
  if (lit('guards') && m.guards && m.guards[0]) label(m.guards[0].x, m.guards[0].y, 'bewakers', PAPER, -18);
  for (const [a, c] of m.lasers || []) {
    g.beginPath(); g.moveTo(X(a[0]), Y(a[1])); g.lineTo(X(c[0]), Y(c[1]));
    g.strokeStyle = RED; g.globalAlpha = lit('lasers') ? 0.55 + pulse * 0.45 : 0.45; g.lineWidth = lit('lasers') ? 3 : 1.5; g.stroke(); g.globalAlpha = 1;
  }
  if (lit('lasers') && m.lasers && m.lasers[0]) label((m.lasers[0][0][0] + m.lasers[0][1][0]) / 2, m.lasers[0][0][1], 'lasers!', RED, -10);
  if (m.vitrine) {
    const v = m.vitrine;
    g.save();
    g.translate(X(v.x), Y(v.y));
    g.fillStyle = GOLD;
    g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = (i / 10) * Math.PI * 2 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill();
    g.restore();
    if (lit('vitrine') || lit('island')) { ring(v.x, v.y, 16, GOLD); label(v.x, v.y, lit('vitrine') ? 'code: 1953?' : 'de Eierbal', GOLD, 34); }
  }
  if (m.achterdeur && (lit('routeA') || f === 'choice')) { ring(m.achterdeur.x, m.achterdeur.y, 9, INK); label(m.achterdeur.x, m.achterdeur.y, 'achterdeur', INK, -18); }
  if (m.glasdeur && (lit('routeB') || f === 'choice')) { ring(m.glasdeur.x, m.glasdeur.y, 9, PAPER); label(m.glasdeur.x, m.glasdeur.y, 'glazen deur', PAPER, 30); }
  if (m.water && lit('water')) label(m.water.x, m.water.y, 'Verbindingskanaal', 'rgba(140, 220, 200, 0.9)', 0);
}

// --- the card on the cushion -----------------------------------------------------------------

export function showNote(text, kick = 'Op het lege kussen') {
  ensureRoot();
  if (!note) {
    note = document.createElement('div');
    note.className = 'hx-note';
    root.appendChild(note);
  }
  note.innerHTML = `<div class="kick">${kick}</div><div class="txt">${dualHtml(text)}</div>`;
  void note.offsetWidth;
  note.classList.add('on');
}

export function hideNote() {
  if (note) note.classList.remove('on');
}

// --- alarm, zap, skip ------------------------------------------------------------------------

// De rol van deze speler bij de inbraak (Samen spelen, #438): één regel onder in beeld. Leeg = weg.
let roleEl = null;
export function roleChip(text) {
  if (!text) { if (roleEl) { roleEl.style.opacity = '0'; roleEl.classList.remove('on'); } return; }
  ensureRoot();
  if (!roleEl) {
    roleEl = document.createElement('div');
    roleEl.className = 'hx-rolechip';
    // eigen vorm, zodat er geen stylesheet bij hoeft (heist.css blijft zoals hij is)
    roleEl.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:104px;z-index:60;display:flex;gap:8px;align-items:center;max-width:min(560px,86vw);padding:8px 14px;border-radius:10px;background:rgba(12,16,14,.82);color:#f0ede4;font:14px/1.35 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.35);opacity:0;transition:opacity .2s;pointer-events:none;';
    roleEl.innerHTML = '<b style="color:#f2c14e;white-space:nowrap">Jouw rol</b><span data-r></span>';
    root.appendChild(roleEl);
  }
  const s = roleEl.querySelector('[data-r]');
  if (s) s.textContent = text;
  roleEl.style.opacity = '1';
  roleEl.classList.add('on');
}

export function setAlarmUi(k) {
  if (!k && !alarmEl) return;
  ensureRoot();
  alarmEl.style.opacity = String(Math.max(0, Math.min(1, k)));
}

export function flashZap() {
  ensureRoot();
  flashEl.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => flashEl && flashEl.classList.remove('on')));
}

export function skipChip(show, hold = 0) {
  if (!show && !skipEl) return;
  ensureRoot();
  if (!skipEl) {
    skipEl = document.createElement('div');
    skipEl.className = 'hx-skipchip';
    skipEl.innerHTML = `<svg viewBox="0 0 20 20"><circle class="bg" cx="10" cy="10" r="8"/><circle class="fg" cx="10" cy="10" r="8"/></svg>${key('O')}<span>ingedrukt houden: sla dit stuk over</span>`;
    root.appendChild(skipEl);
  }
  skipEl.classList.toggle('on', !!show && !panel);
  if (panel) panel.classList.toggle('skip-on', !!show);
  skipEl.style.setProperty('--hold', String(Math.max(0, Math.min(1, hold))));
}

export function disposeHeistUi() {
  closePanel();
  hidePlan(true);
  if (note) { note.remove(); note = null; }
  if (skipEl) { skipEl.remove(); skipEl = null; }
  if (roleEl) { roleEl.remove(); roleEl = null; }
  setAlarmUi(0);
}
