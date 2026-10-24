// De cabine van de machinist (#444, #442): een tractiehendel in plaats van gas, de waakzaamheidsknop (dodemansknop),
// en het cabinebord onderin beeld (snelheid, snelheidsbord, hendel, volgend station, deuren, storingen, eindstand).
// Het eerste deel is puur (geen DOM, geen THREE: scripts/treincabine_test.mjs); het bord onderaan tekent met DOM.
// traindrive.js leest de toetsen in een cab-stand, machinist.js voedt het bord met de dienst.
import { key } from './minigamekit.js';

// --- de hendel -----------------------------------------------------------------------------------
export const LEVER_MIN = -3;   // Rem 3: volle bedrijfsrem
export const LEVER_MAX = 4;    // Tractie 4: vol vermogen
export const REPEAT_FIRST = 0.45; // s houden voor de hendel verder schuift
export const REPEAT = 0.28;
export const DM_AFTER = 35;    // s zonder iets aan te raken terwijl je rijdt: de waakzaamheid vraagt om een knop
export const DM_GRACE = 8;     // s om te reageren; daarna remt de trein vanzelf
export const DM_MIN_V = 1.5;   // m/s: stilstaand vraagt niemand iets

export const clampLever = (n) => Math.max(LEVER_MIN, Math.min(LEVER_MAX, n));
export const leverLabel = (n) => (n === 0 ? 'Rollen' : n > 0 ? `Tractie ${n}` : `Rem ${-n}`);
// de hendel als de natuurkunde hem leest (railway.js stepDriven: ctl.power, ctl.brakeF)
export const leverCtl = (n) => ({ power: n > 0 ? n / LEVER_MAX : 0, brakeF: n < 0 ? -n / -LEVER_MIN : 0 });

export function newCab() {
  return { lever: 0, hold: 0, dir: 0, dm: 0, warn: false, brake: false, count: 0, since: 0 };
}

// Een beeld. inp: { up, down (ingedrukt), upP, downP (net gedrukt), ack (waakzaamheidsknop net gedrukt), doorsOpen }.
// v: snelheid in m/s. Geeft de gebeurtenissen: 'hendel', 'waak-vraag', 'waak-ok', 'waak-rem'.
export function stepCab(cab, dt, inp, v) {
  const ev = [];
  let moved = false;
  const step = (d) => {
    if (cab.brake) return; // de waakzaamheidsrem houdt de hendel vast tot de trein staat
    const n = clampLever(cab.lever + d);
    if (n !== cab.lever) { cab.lever = n; moved = true; ev.push({ kind: 'hendel', lever: n }); }
  };
  const press = (inp.upP ? 1 : 0) - (inp.downP ? 1 : 0);
  const want = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
  if (press) { step(press); cab.dir = press; cab.hold = REPEAT_FIRST; moved = true; }
  else if (!want) { cab.dir = 0; cab.hold = 0; }
  else if (want !== cab.dir) { step(want); cab.dir = want; cab.hold = REPEAT_FIRST; moved = true; }
  else {
    cab.hold -= dt;
    if (cab.hold <= 0) { step(want); cab.hold = REPEAT; moved = true; }
  }
  // deuren open: de trein staat en trekt niet op
  if (inp.doorsOpen && cab.lever > 0) { cab.lever = 0; ev.push({ kind: 'hendel', lever: 0 }); }

  // waakzaamheid
  if (v < DM_MIN_V && !cab.brake) { cab.dm = 0; cab.warn = false; }
  else if (moved || inp.ack) {
    if (cab.warn && !cab.brake) ev.push({ kind: 'waak-ok' });
    if (!cab.brake) { cab.dm = 0; cab.warn = false; }
  } else cab.dm += dt;
  if (!cab.brake && !cab.warn && cab.dm > DM_AFTER) { cab.warn = true; ev.push({ kind: 'waak-vraag' }); }
  if (!cab.brake && cab.warn && cab.dm > DM_AFTER + DM_GRACE) {
    cab.brake = true; cab.count++; cab.lever = 0;
    ev.push({ kind: 'waak-rem' });
  }
  if (cab.brake && v < 0.3) { cab.brake = false; cab.warn = false; cab.dm = 0; }
  return ev;
}

// Wat de trein van de cabine krijgt: { power, brakeF, emergency }.
export function cabCtl(cab, emergencyKey) {
  const c = leverCtl(cab.lever);
  return { power: cab.brake ? 0 : c.power, brakeF: c.brakeF, emergency: !!emergencyKey || cab.brake };
}

// Seconden tot de waakzaamheid ingrijpt (alleen als er gevraagd wordt).
export const dmLeft = (cab) => (cab.warn && !cab.brake ? Math.max(0, Math.ceil(DM_AFTER + DM_GRACE - cab.dm)) : null);

export const mmss = (s) => {
  const a = Math.abs(Math.round(s));
  return `${Math.floor(a / 60)}:${String(a % 60).padStart(2, '0')}`;
};

// --- wat het bord toont ----------------------------------------------------------------------------
// bv: boardView van de dienst (of null zonder dienst); cab; v in m/s.
export function cabView(cab, v, bv, vmaxV) {
  const out = {
    kmh: Math.round(v * 3.6), maxKmh: Math.round(vmaxV * 3.6), lever: cab.lever, leverText: leverLabel(cab.lever),
    brakeF: leverCtl(cab.lever).brakeF, power: leverCtl(cab.lever).power, emergency: cab.brake,
    dm: dmLeft(cab), limitKmh: null, next: null, doors: false, storing: null, service: false, faults: 0,
  };
  if (bv && !bv.done) {
    out.service = true;
    out.limitKmh = bv.limitKmh;
    out.doors = bv.doors;
    out.storing = bv.storing || null;
    out.faults = bv.faults || 0;
    out.next = {
      name: bv.name, toStop: bv.toStop, dueIn: bv.dueIn, depIn: bv.depIn, delay: bv.delay, tooFast: bv.tooFast,
      brakeFrac: bv.brakeFrac, index: bv.stopIndex + 1, count: bv.stopCount,
    };
  }
  return out;
}

export const distText = (m) => (m < 0 ? 'voorbij' : m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`);

// --- het bord (DOM) ------------------------------------------------------------------------------------
const CSS = `
#hud .tc-cab[hidden], #hud .tc-result[hidden] { display: none; }
#hud .tc-cab { position: absolute; bottom: var(--hud-bottom, 22px); left: 50%; transform: translateX(-50%); display: grid; grid-template-columns: auto auto auto minmax(190px, 1fr); gap: 4px 18px; align-items: center; width: min(760px, calc(100vw - 32px)); padding: 10px 18px 8px 14px; color: #f0ede4; text-shadow: var(--hud-shadow); pointer-events: none; z-index: 4;
  background: linear-gradient(0deg, rgba(10,16,24,0.92), rgba(18,28,40,0.74)); border-bottom: 3px solid #3a7bd5; }
#hud .tc-cab .tc-sign { width: 58px; height: 58px; border-radius: 50%; background: #f4f1e8; border: 6px solid #d94a3a; color: #15181c; font: bold 22px Arial, sans-serif; display: flex; align-items: center; justify-content: center; text-shadow: none; }
#hud .tc-cab .tc-sign.none { background: rgba(240,237,228,0.12); border-color: rgba(240,237,228,0.3); color: rgba(240,237,228,0.5); font-size: 14px; }
#hud .tc-cab .tc-speed { text-align: center; line-height: 1; }
#hud .tc-cab .tc-speed b { display: block; font-weight: normal; font-size: 46px; letter-spacing: 1px; color: #ffd23f; }
#hud .tc-cab .tc-speed b.over { color: #ff9a3c; }
#hud .tc-cab .tc-speed small { font-size: 13px; letter-spacing: 2px; color: rgba(240,237,228,0.75); }
#hud .tc-cab .tc-lever { display: flex; flex-direction: column; gap: 1px; width: 122px; }
#hud .tc-cab .tc-lever i { display: block; height: 14px; font-style: normal; font-size: 12px; line-height: 14px; padding-left: 5px; background: rgba(240,237,228,0.1); color: rgba(240,237,228,0.55); }
#hud .tc-cab .tc-lever i.pw { border-left: 4px solid #46a35e; }
#hud .tc-cab .tc-lever i.br { border-left: 4px solid #d94a3a; }
#hud .tc-cab .tc-lever i.zero { border-left: 4px solid #c8c3b4; }
#hud .tc-cab .tc-lever i.on { background: rgba(255,210,63,0.4); color: #fff; }
#hud .tc-cab .tc-next { min-width: 0; }
#hud .tc-cab .tc-next small { display: block; font-size: 12px; letter-spacing: 3px; color: #3a7bd5; filter: brightness(1.35); }
#hud .tc-cab .tc-next b { display: block; font-weight: normal; font-size: 21px; letter-spacing: 1px; color: #f0ede4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#hud .tc-cab .tc-next span { display: block; font-size: 15px; color: rgba(240,237,228,0.85); }
#hud .tc-cab .tc-next em { font-style: normal; color: #ffd23f; }
#hud .tc-cab .tc-next .bad { color: #ff9a3c; }
#hud .tc-cab .tc-row { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 3px 16px; align-items: center; font-size: 14px; color: rgba(240,237,228,0.8); font-family: 'Arial Narrow', Arial, sans-serif; }
#hud .tc-cab .tc-row .tc-door { padding: 1px 8px; background: rgba(240,237,228,0.12); font-size: 14px; }
#hud .tc-cab .tc-row .tc-door.open { background: rgba(93,255,122,0.25); color: #b9ffc6; }
#hud .tc-cab .tc-row .tc-storing { color: #ff9a3c; font-size: 16px; letter-spacing: 1px; }
#hud .tc-cab .tc-row .tc-storing::before { content: '\\26A0\\a0'; }
#hud .tc-cab .tc-alert { grid-column: 1 / -1; padding: 5px 10px; background: rgba(217,74,58,0.9); color: #fff; font-size: 20px; letter-spacing: 2px; text-align: center; animation: tcblink 0.5s steps(2) infinite; }
#hud .tc-cab .tc-alert[hidden] { display: none; }
@keyframes tcblink { 50% { background: rgba(120,28,20,0.9); } }
#hud .tc-cab .hud-key { margin: 0 2px; vertical-align: middle; }
#hud .tc-intro { position: absolute; bottom: calc(var(--hud-bottom, 22px) + 190px); left: 50%; transform: translateX(-50%); width: min(560px, calc(100vw - 32px)); padding: 10px 16px; color: #f0ede4; font-size: 15px; line-height: 1.6; background: rgba(10,16,24,0.88); border-left: 3px solid #ffd23f; pointer-events: none; z-index: 4; text-shadow: var(--hud-shadow); }
#hud .tc-intro[hidden] { display: none; }
#hud .tc-intro b { font-weight: normal; color: #ffd23f; letter-spacing: 2px; font-size: 13px; display: block; }
#hud .tc-result { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); min-width: 340px; padding: 14px 22px 12px; color: #f0ede4; background: rgba(10,16,24,0.93); border-top: 3px solid #3a7bd5; pointer-events: none; z-index: 5; text-shadow: var(--hud-shadow); }
#hud .tc-result small { display: block; font-size: 12px; letter-spacing: 3px; color: #7fb2ff; }
#hud .tc-result h3 { margin: 2px 0 8px; font-weight: normal; font-size: 30px; letter-spacing: 2px; color: #ffd23f; }
#hud .tc-result .tc-score { display: flex; justify-content: space-between; gap: 24px; font-size: 18px; padding: 2px 0; border-bottom: 1px solid rgba(240,237,228,0.12); }
#hud .tc-result .tc-score b { font-weight: normal; }
#hud .tc-result .tc-score b.good { color: #5dff7a; }
#hud .tc-result .tc-score b.mid { color: #ffd23f; }
#hud .tc-result .tc-score b.low { color: #ff9a3c; }
#hud .tc-result p { margin: 8px 0 0; font-size: 15px; color: rgba(240,237,228,0.82); }
body.tc-on #hud .hud-speedo, body.tc-on #hud .hud-route { display: none !important; }
@media (max-width: 560px) { #hud .tc-cab { grid-template-columns: auto auto 1fr; } #hud .tc-cab .tc-next { grid-column: 1 / -1; } }
`;

let cssDone = false;
export function createCabHud() {
  if (typeof document === 'undefined') return null;
  if (!cssDone) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    cssDone = true;
  }
  const hud = document.getElementById('hud') || document.body;
  const root = document.createElement('div');
  root.className = 'tc-cab';
  root.hidden = true;
  const intro = document.createElement('div');
  intro.className = 'tc-intro';
  intro.hidden = true;
  const res = document.createElement('div');
  res.className = 'tc-result';
  res.hidden = true;
  hud.appendChild(root); hud.appendChild(intro); hud.appendChild(res);
  let last = '', lastRes = '', lastIntro = '';
  const notches = [];
  for (let n = LEVER_MAX; n >= LEVER_MIN; n--) notches.push(n);
  return {
    root,
    show() { root.hidden = false; document.body.classList.add('tc-on'); last = ''; },
    hide() { root.hidden = true; intro.hidden = true; res.hidden = true; document.body.classList.remove('tc-on'); last = ''; lastRes = ''; },
    // v: cabView; helpHtml: de toetsenregel
    set(v, helpHtml) {
      const sig = JSON.stringify([v, helpHtml]);
      if (sig === last) return;
      last = sig;
      const over = v.limitKmh != null && v.kmh > v.limitKmh + 3;
      const lever = notches.map((n) => `<i class="${n > 0 ? 'pw' : n < 0 ? 'br' : 'zero'}${n === v.lever ? ' on' : ''}">${leverLabel(n)}</i>`).join('');
      const nx = v.next;
      const nextHtml = nx
        ? `<small>VOLGEND STATION ${nx.index}/${nx.count}</small><b>${nx.name}</b><span><em>${distText(nx.toStop)}</em> &middot; ${nx.depIn != null ? `vertrek over ${mmss(nx.depIn)}` : `aankomst ${nx.dueIn >= 0 ? `over ${mmss(nx.dueIn)}` : `${mmss(-nx.dueIn)} te laat`}`}</span><span class="${nx.tooFast ? 'bad' : ''}">${nx.delay}${nx.tooFast ? ' &middot; te hard' : ''}</span>`
        : `<small>GEEN DIENST</small><b>Vrij rijden</b><span>${key('G')} dienst rijden vanaf de halte</span>`;
      root.innerHTML = `<div class="tc-sign${v.limitKmh == null ? ' none' : ''}" title="snelheidsbord">${v.limitKmh == null ? 'vrij' : v.limitKmh}</div>`
        + `<div class="tc-speed"><b class="${over ? 'over' : ''}">${v.kmh}</b><small>KM/U${v.maxKmh ? ` (MAX ${v.maxKmh})` : ''}</small></div>`
        + `<div class="tc-lever" title="tractiehendel">${lever}</div><div class="tc-next">${nextHtml}</div>`
        + `<div class="tc-alert" ${v.dm != null || v.emergency ? '' : 'hidden'}>${v.emergency ? 'WAAKZAAMHEIDSREM: de trein remt vanzelf' : `WAAKZAAM? Druk ${key('K')} binnen ${v.dm} s`}</div>`
        + `<div class="tc-row"><span>Hendel: <b style="font-weight:normal;color:#ffd23f">${v.leverText}</b></span>`
        + `<span class="tc-door${v.doors ? ' open' : ''}">Deuren ${v.doors ? 'open' : 'dicht'}</span>`
        + `${v.storing ? `<span class="tc-storing">${v.storing}</span>` : ''}`
        + `<span>${helpHtml || ''}</span></div>`;
    },
    // De uitleg bij het instappen: een paar seconden, alleen als de speler nog niets heeft aangeraakt.
    intro(html) {
      if (html === lastIntro) return;
      lastIntro = html;
      intro.hidden = !html;
      intro.innerHTML = html || '';
    },
    // De eindstand na een dienst: r = result van machinistrules, pay in euro's.
    result(r, pay, abandoned, helpHtml) {
      if (!r) { res.hidden = true; lastRes = ''; return; }
      const sig = JSON.stringify([r, pay, abandoned]);
      if (sig === lastRes) { res.hidden = false; return; }
      lastRes = sig;
      const cls = (p) => (p >= 85 ? 'good' : p >= 60 ? 'mid' : 'low');
      res.hidden = false;
      res.innerHTML = `<small>${abandoned ? 'DIENST GESTOPT' : 'EINDSTAND VAN DE DIENST'}</small><h3>${r.medalName} &middot; ${r.score} punten</h3>`
        + `<div class="tc-score"><span>Halten gehaald</span><b>${r.made} van ${r.stops}</b></div>`
        + `<div class="tc-score"><span>Punctualiteit</span><b class="${cls(r.punct)}">${r.punct}%</b></div>`
        + `<div class="tc-score"><span>Comfort</span><b class="${cls(r.comfort)}">${r.comfort}%</b></div>`
        + `<div class="tc-score"><span>Veiligheid</span><b class="${cls(r.veilig)}">${r.veilig}%</b></div>`
        + `<div class="tc-score"><span>Beloning</span><b class="good">${pay > 0 ? `€${pay}` : 'niets'}${r.faultless ? ' (rit zonder fouten)' : ''}</b></div>`
        + `<p>${helpHtml || ''}</p>`;
    },
  };
}
