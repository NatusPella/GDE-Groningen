// H3's stunt evening on screen (stuntavond.js drives it): a short brief at the
// start (one sentence with the goal, one line on what counts; #392), then a score panel under the
// top-right block with a progress bar to the target, the combo with its
// window running out, a "nog X punten" line near the end, and a popup per
// action ("+120 parasol", "reeks x2", "-250 iemand geraakt"). Lives in #hud,
// so it fades with the rest of the HUD during cutscenes.

const CSS = `
#hud .stunt-hud { position: absolute; top: calc(var(--hud-tr-bottom) + 8px); right: var(--hud-edge, 46px); width: 232px; box-sizing: border-box;
  padding: 8px 14px 10px; border-radius: 10px; background: rgba(10, 19, 13, 0.78); border: 1px solid rgba(63, 201, 122, 0.16);
  border-right: 3px solid var(--gron-green-light); color: #f0ede4; text-shadow: var(--hud-shadow); font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; }
#hud .stunt-hud[hidden], #hud .stunt-brief[hidden] { display: none; }
#hud .stunt-hud .sh-top { display: flex; justify-content: space-between; align-items: baseline; }
#hud .stunt-hud .sh-label { font-size: 15px; letter-spacing: 1px; color: #a3b2a6; }
#hud .stunt-hud .sh-combo { font-size: 22px; color: var(--gron-green-light); }
#hud .stunt-hud .sh-combo[data-on="0"] { color: #a3b2a6; opacity: 0.6; }
#hud .stunt-hud .sh-score { font-size: 48px; line-height: 0.95; font-variant-numeric: tabular-nums; }
#hud .stunt-hud .sh-score small { font-size: 22px; color: #a3b2a6; }
#hud .stunt-hud .sh-bar { position: relative; height: 10px; margin-top: 4px; border-radius: 5px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }
#hud .stunt-hud .sh-bar i { position: absolute; inset: 0 auto 0 0; width: 0; background: var(--gron-green-light); transition: width 0.25s ease-out; }
#hud .stunt-hud .sh-cw { height: 3px; margin-top: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
#hud .stunt-hud .sh-cw i { display: block; height: 100%; width: 0; background: var(--gron-green); }
#hud .stunt-hud .sh-left { margin-top: 4px; font-size: 20px; letter-spacing: 0.5px; }
#hud .stunt-hud .sh-left[data-urgent="1"] { color: #e8c93a; animation: sh-pulse 0.9s ease-in-out infinite alternate; }
#hud .stunt-hud .sh-left[data-done="1"] { color: var(--gron-green-light); }
@keyframes sh-pulse { to { opacity: 0.55; } }
#hud .stunt-pops { position: absolute; top: calc(var(--hud-tr-bottom) + 12px); right: 292px; width: 220px; height: 150px; pointer-events: none; }
#hud .stunt-pop { position: absolute; right: 0; top: 0; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 28px;
  letter-spacing: 0.5px; color: #f0ede4; text-shadow: var(--hud-shadow); white-space: nowrap; animation: sh-rise 1.5s ease-out forwards; }
#hud .stunt-pop b { font-weight: normal; color: var(--gron-green-light); }
#hud .stunt-pop.combo { font-size: 24px; color: var(--gron-green-light); }
#hud .stunt-pop.bad b, #hud .stunt-pop.bad { color: #d93f3f; }
@keyframes sh-rise { 0% { transform: translateY(20px) scale(0.85); opacity: 0; } 12% { transform: translateY(0) scale(1.05); opacity: 1; } 70% { opacity: 1; } 100% { transform: translateY(-46px); opacity: 0; } }
#hud .stunt-brief { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); width: min(340px, 86vw); box-sizing: border-box;
  padding: 14px 18px 12px; border-radius: 12px; background: rgba(10, 19, 13, 0.88); border: 1px solid rgba(63, 201, 122, 0.3);
  border-top: 3px solid var(--gron-green-light); color: #f0ede4; text-shadow: var(--hud-shadow); animation: hud-rise var(--dur-slow, 320ms) var(--ease-out, ease-out); }
#hud .stunt-brief.out { opacity: 0; transition: opacity 0.4s; }
#hud .stunt-brief h3 { margin: 0 0 2px; font: normal 30px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; color: var(--gron-green-light); }
#hud .stunt-brief p { margin: 0 0 8px; font: 17px 'Arial Narrow', Arial, sans-serif; }
#hud .stunt-brief ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr auto; gap: 2px 14px; font: 17px 'Arial Narrow', Arial, sans-serif; }
#hud .stunt-brief li { display: contents; }
#hud .stunt-brief li span:last-child { text-align: right; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; font-size: 21px; color: var(--gron-green-light); }
#hud .stunt-brief li.bad span:last-child { color: #d93f3f; }
#hud .stunt-brief .sb-foot { margin-top: 8px; font: 15px 'Arial Narrow', Arial, sans-serif; color: #a3b2a6; }
@media (prefers-reduced-motion: reduce) { #hud .stunt-pop { animation-duration: 1.2s; } #hud .stunt-hud .sh-left[data-urgent="1"] { animation: none; } }
@media (max-width: 760px) { #hud .stunt-pops { right: 14px; top: calc(var(--hud-tr-bottom) + 150px); } }
`;

const BRIEF_TIME = 6;
const MAX_POPS = 5;

let els = null;
let state = null;

function ensure() {
  if (els && els.root.isConnected) return els;
  const root = document.getElementById('hud');
  if (!root) return null;
  if (!document.getElementById('stunt-hud-css')) {
    const st = document.createElement('style');
    st.id = 'stunt-hud-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const panel = document.createElement('div');
  panel.className = 'stunt-hud';
  panel.setAttribute('role', 'status');
  panel.hidden = true;
  panel.innerHTML = '<div class="sh-top"><span class="sh-label">Stuntavond · punten</span><span class="sh-combo" data-on="0"></span></div>' +
    '<div class="sh-score"><span class="sh-num">0</span> <small>/ <span class="sh-target"></span></small></div>' +
    '<div class="sh-bar" role="progressbar" aria-label="Punten naar het doel" aria-valuemin="0" aria-valuemax="100"><i></i></div>' +
    '<div class="sh-cw" aria-hidden="true"><i></i></div><div class="sh-left"></div>';
  const pops = document.createElement('div');
  pops.className = 'stunt-pops';
  pops.setAttribute('aria-hidden', 'true');
  const brief = document.createElement('div');
  brief.className = 'stunt-brief';
  brief.hidden = true;
  root.append(panel, pops, brief);
  els = {
    root, panel, pops, brief,
    num: panel.querySelector('.sh-num'), target: panel.querySelector('.sh-target'), combo: panel.querySelector('.sh-combo'),
    bar: panel.querySelector('.sh-bar'), fill: panel.querySelector('.sh-bar i'), cw: panel.querySelector('.sh-cw i'), left: panel.querySelector('.sh-left'),
  };
  return els;
}

// (older callers still pass a rules list and options; the brief no longer lists them)
export function showStuntHud(target) {
  const e = ensure();
  if (!e) return;
  state = { target, shown: -1, briefT: BRIEF_TIME, briefUp: false };
  e.target.textContent = String(target);
  e.brief.classList.remove('out');
  e.brief.innerHTML = `<h3>Stuntavond: ${target} punten</h3>` +
    `<p>Rij over de Grote Markt en sloop spullen voor de tijd om is.</p>` +
    '<div class="sb-foot">Alles wat je omver rijdt telt. Mensen springen opzij en kosten niets.</div>';
  e.panel.hidden = false;
}

export function hideStuntHud() {
  state = null;
  if (!els) return;
  els.panel.hidden = true;
  els.brief.hidden = true;
  els.pops.textContent = '';
}

// s: { score, target, combo, comboLeft (0..1), timeLeft }
export function updateStuntHud(dt, s, paused) {
  if (!state || !els) return;
  const e = els;
  // the brief waits for the intro cutscene to end, then stays a while
  if (!paused) {
    if (!state.briefUp && state.briefT > 0) { state.briefUp = true; e.brief.hidden = false; }
    if (state.briefUp && state.briefT > 0) {
      state.briefT -= dt;
      if (state.briefT <= 0.4 && !e.brief.classList.contains('out')) e.brief.classList.add('out');
      if (state.briefT <= 0) e.brief.hidden = true;
    }
  }
  if (s.score !== state.shown) {
    state.shown = s.score;
    e.num.textContent = String(s.score);
    const pct = Math.min(100, Math.round((s.score / s.target) * 100));
    e.fill.style.width = pct + '%';
    e.bar.setAttribute('aria-valuenow', String(pct));
  }
  const on = s.combo > 1 && s.comboLeft > 0;
  const ct = on ? `reeks x${s.combo}` : 'reeks x1';
  if (e.combo.textContent !== ct) { e.combo.textContent = ct; e.combo.dataset.on = on ? '1' : '0'; }
  e.cw.style.width = on ? `${Math.round(s.comboLeft * 100)}%` : '0';
  const left = Math.max(0, s.target - s.score);
  const tl = Number.isFinite(s.timeLeft) ? Math.ceil(s.timeLeft) : null;
  let text, urgent = false;
  if (!left) text = 'Doel gehaald!';
  else if (left <= s.target * 0.35 || (tl != null && tl <= 30)) { text = `Nog ${left} punten${tl != null ? ` · ${tl}s` : ''}`; urgent = true; }
  else text = 'Sloop spullen, stuur duiven op';
  if (e.left.textContent !== text) e.left.textContent = text;
  e.left.dataset.urgent = urgent ? '1' : '0';
  e.left.dataset.done = left ? '0' : '1';
}

// One popup: kind 'pts' ("+120 parasol"), 'combo' ("reeks x3") or 'bad' ("-250 ...").
export function stuntPopup(text, kind = 'pts') {
  if (!state || !els) return;
  popup(text, kind);
}

// Losse chip buiten de stuntavond ("+€8 Rakelings", #216): zelfde popup, geen stuntpaneel nodig.
export function chipPopup(text, kind = 'pts') {
  if (!ensure()) return;
  popup(text, kind);
}

function popup(text, kind) {
  const d = document.createElement('div');
  d.className = 'stunt-pop' + (kind === 'pts' ? '' : ' ' + kind);
  const m = /^([+-]\d+)(.*)$/.exec(text);
  if (m) { const b = document.createElement('b'); b.textContent = m[1]; d.append(b, m[2]); } else d.textContent = text;
  const n = els.pops.children.length;
  d.style.top = `${Math.min(n, MAX_POPS - 1) * 26}px`;
  els.pops.appendChild(d);
  while (els.pops.children.length > MAX_POPS) els.pops.firstChild.remove();
  setTimeout(() => d.remove(), 1600);
}
