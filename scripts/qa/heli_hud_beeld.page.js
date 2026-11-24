// Page half of scripts/qa/heli_hud_beeld.mjs (desktop --perf-script body; #1033): vliegt de Ballonjacht bij het UMCG met de
// automatische piloot van start tot eind en neemt beelden plus een meting van de HUD tijdens en na de vlucht; daarna start hij de
// roostervlucht (M12, Lauwersoog) en breekt die af. window.__hh = { max } (seconden voor de hele ballonjacht).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world;
const imp = (f) => import('/js/' + f + '.js');
const MAX = ((window.__hh || {}).max || 330) * 1000;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fix();
const fixer = setInterval(fix, 500);
const grab = async (name) => { console.log('[capture] ' + name); await sleep(700); };
const zichtbaar = (el) => { if (!el) return false; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return !el.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.width > 0 && r.height > 0; };
const meet = (stap) => {
  const hh = document.getElementById('heli-hud');
  const hud = document.getElementById('hud');
  const s = window.__heliRun && window.__heliRun.state ? window.__heliRun.state() : null;
  return {
    stap, t: Math.round(performance.now() / 1000),
    klassen: [...document.body.classList].filter((c) => /heli|cine|hide|montage|pigeon|foto|trailer/.test(c)),
    heliRun: !!w.heliRun, heliHud: zichtbaar(hh), heliPaneel: zichtbaar(hh && hh.querySelector('.hh-panel')),
    heliTekst: hh ? (hh.querySelector('.hh-panel') || hh).textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null,
    hud: zichtbaar(hud), leg: s && (s.leg != null ? s.leg : s.legKind), speler: { inVehicle: !!w.player.inVehicle, hidden: !!w.player.hidden },
  };
};
const out = { stappen: [], fouten: [] };
window.addEventListener('error', (e) => out.fouten.push(String(e.message).slice(0, 200)));
window.addEventListener('unhandledrejection', (e) => out.fouten.push(String(e.reason && e.reason.message || e.reason).slice(0, 200)));
for (let k = 0; k < 60 && !(window.__heliRun && window.__heliRun.spot && window.__heliRun.spot()); k++) await sleep(500);
out.voor = meet('voor');
await grab('0-voor');
let uitslag = null;
const H = window.__heliRun;
H.autopilot = true;
out.gestart = H.start('ballonjacht', (r) => { uitslag = r; });
const t0 = performance.now();
const momenten = [4000, 30000, 90000, 150000];
let mi = 0;
while (!uitslag && performance.now() - t0 < MAX) {
  if (mi < momenten.length && performance.now() - t0 >= momenten[mi]) { out.stappen.push(meet('tijdens-' + (momenten[mi] / 1000) + 's')); await grab('1-tijdens-' + (momenten[mi] / 1000) + 's'); mi++; }
  await sleep(250);
}
out.uitslag = uitslag ? { variant: uitslag.variant, ok: uitslag.ok, reason: uitslag.reason, score: uitslag.score, medal: uitslag.medal } : 'geen (tijd op)';
if (!uitslag) { H.abort(); out.afgebroken = true; }
await sleep(3000);
out.stappen.push(meet('na'));
await grab('2-na');
await sleep(4000);
out.stappen.push(meet('na-7s'));
await grab('3-na-7s');
// de roostervlucht (M12): start op Lauwersoog, even vliegen, afbreken; de HUD moet daarna terug zijn
let r2 = null;
out.rooster = H.start('rooster', (r) => { r2 = r; });
await sleep(12000);
out.stappen.push(meet('rooster-tijdens'));
await grab('4-rooster-tijdens');
H.abort();
await sleep(3000);
out.roosterUitslag = r2 ? { ok: r2.ok, reason: r2.reason } : null;
out.stappen.push(meet('rooster-na'));
await grab('5-rooster-na');
H.autopilot = false;
clearInterval(skipper); clearInterval(fixer);
return JSON.stringify(out);
