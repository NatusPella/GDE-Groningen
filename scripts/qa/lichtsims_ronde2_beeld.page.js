// Pagina-helft van scripts/qa/lichtsims_ronde2_beeld.mjs (desktop --perf-script; #985 light sims ronde 2): start elke sim in het echte spel, leest de strook
// (#sh-hud, simhud.js) en de lichtkolom en neemt een beeld ("[capture] <prefix>-<naam>"). Het wegwerpprofiel is het enige dat beschreven wordt.
// window.__ls = { prefix, only? }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 300 && !(window.__debug && window.__debug.world && window.__debug.world.player && window.__debug.world.map); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player;
const PRE = (window.__ls && window.__ls.prefix) || 'x';
const ONLY = (window.__ls && window.__ls.only) || null;
const imp = (f) => import('/js/' + f + '.js');
const uit = { controles: [], fouten: [], venster: [innerWidth, innerHeight], sims: {} };
const check = (naam, ok, info = '') => { uit.controles.push({ naam, ok: !!ok, info: String(info).slice(0, 300) }); };
const origErr = console.error.bind(console);
console.error = (...a) => { uit.fouten.push(a.map(String).join(' ').slice(0, 240)); origErr(...a); };
window.addEventListener('error', (e) => uit.fouten.push('error: ' + e.message));

const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(300); }
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
try { const DN = await imp('daynight'); if (DN.refreshDayNight) DN.refreshDayNight(w); } catch (e) { /* geen dagnacht is geen ramp */ }

const strook = () => {
  const el = document.getElementById('sh-hud');
  if (!el) return { bestaat: false };
  const r = el.getBoundingClientRect();
  return { bestaat: true, zichtbaar: !el.hidden && r.height > 0, tekst: el.innerText.replace(/\s+/g, ' ').slice(0, 260), stappen: el.querySelectorAll('.sh-stappen li').length, primair: el.querySelectorAll('.sh-primair').length,
    iconen: el.querySelectorAll('.sh-cijfers svg').length, meter: !!el.querySelector('[role=progressbar]'), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], kleur: el.dataset.sim || '' };
};
const kolommen = () => { const sc = (window.__debug && window.__debug.scene) || null; let n = 0; if (sc && sc.traverse) sc.traverse((o) => { if (/kolom$/.test(o.name || '') && o.visible) n++; }); return n; };
const shot = async (naam, ms = 1500) => { await sleep(ms); console.log('[capture] ' + PRE + '-' + naam); await sleep(900); };
const nepKey = (k) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : 'Key' + k.toUpperCase(), bubbles: true })); } };
const nepKeyUp = (k) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k === ' ' ? 'Space' : 'Key' + k.toUpperCase(), bubbles: true })); } };

const sims = [
  { naam: 'kartbaan', api: '__kartbaan', start: (a) => a.start(true), wacht: 5500, na: async () => { nepKey('w'); await sleep(1800); nepKeyUp('w'); } },
  { naam: 'discgolf', api: '__discgolf', start: (a) => a.start(true), wacht: 1500, na: async () => { if (window.__discgolf.mode) window.__discgolf.mode('negen'); await sleep(1200); } },
  { naam: 'pitchputt', api: '__pitchputt', start: (a) => a.start(true), wacht: 2500 },
  { naam: 'zwembad', api: '__zwembad', start: (a) => a.start(true), wacht: 5500 },
  { naam: 'skatepark', api: '__skatepark', start: (a) => a.start(true), wacht: 5500 },
  { naam: 'wandeling', api: '__wandeling', start: (a) => a.start(), wacht: 1500 },
  { naam: 'padel', api: '__padel', start: (a) => a.start(), wacht: 6000 },
];
for (const s of sims) {
  if (ONLY && !ONLY.includes(s.naam)) continue;
  const a = window[s.api];
  if (!a) { check(s.naam + ': debug-api', false, 'ontbreekt'); continue; }
  try {
    const sp = a.spot ? a.spot() : null;
    if (sp) { p.x = sp.x; p.y = sp.y; p.vx = p.vy = p.speed = 0; }
    await sleep(800);
    const ok = s.start(a);
    check(s.naam + ': start', ok !== false, String(ok));
    await sleep(s.wacht);
    if (s.na) await s.na();
    const st = strook();
    uit.sims[s.naam] = { ...st, kolommen: kolommen() };
    check(s.naam + ': strook zichtbaar', st.bestaat && st.zichtbaar, JSON.stringify(st));
    check(s.naam + ': stappen, primaire waarde, iconen, meter', st.stappen >= 3 && st.primair === 1 && st.iconen >= 2 && st.meter, JSON.stringify(st));
    await shot(s.naam, 600);
    if (a.quit) a.quit();
    await sleep(900);
    const na = strook();
    check(s.naam + ': strook weg na stoppen', !na.zichtbaar, JSON.stringify(na));
  } catch (e) { check(s.naam + ': uitzondering', false, e && e.stack ? e.stack : String(e)); try { if (a.quit) a.quit(); } catch (e2) { /* niets */ } }
}
clearInterval(skipper);
return JSON.stringify({ ...uit, mislukt: uit.controles.filter((c) => !c.ok).map((c) => c.naam) });
