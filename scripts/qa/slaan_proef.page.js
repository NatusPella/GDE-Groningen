// Page half van scripts/qa/slaan_proef.mjs (#1355, #1356): met de vuisten naast een voorbijganger.
// 1. Geen Slaan-popup (primaire hint) en geen Slaan-chip; de eerste-keer-hint staat hoogstens als kleine regel in de besturingshulp.
// 2. Een lege zwaai (van de voorbijganger af), waarna die voorbijganger door iets anders gewond raakt: geen gezocht, geen getuigenbel.
// 3. Een echte treffer op de voorbijganger: wel een misdrijf (getuige belt of de voorbijganger vlucht).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const ss = document.getElementById('start-screen');
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent)); if (it) it.click(); else key('Enter', 'Enter'); }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(4000);
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const PM = await import('/js/players.js');
const p = PM.hoofdspeler(w);
w.devInvuln = true; w.weapon = 'fists';
const out = { stappen: [] };
const living = () => w.pedestrians.filter((q) => q.state !== 'dead' && !q.isCop && !q.scripted && !q.hidden && !q.rager && !q.ragdoll);
for (let i = 0; i < 60 && !living().length; i++) await sleep(500);
const victim = living().sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
if (!victim) return JSON.stringify({ results: { slaan: { fout: 'geen voorbijganger' } } });
const place = (face) => { // 1,2 m van de voorbijganger, kijkend naar hem (face) of van hem af
  p.x = victim.x - 1.2; p.y = victim.y; p.vx = 0; p.vy = 0;
  p.angle = face ? 0 : Math.PI; w.camYaw = p.angle;
};
const hints = () => ({
  primary: [...document.querySelectorAll('.wp-primary')].filter((e) => e.classList.contains('shown') || getComputedStyle(e).opacity > 0.1).map((e) => e.textContent.trim()),
  rijen: [...document.querySelectorAll('.hud-ctx .ctx-row')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')),
  slaanChip: [...document.querySelectorAll('.hud-prompts, .hud-ctx')].some((e) => /Slaan|Een agent\? Durf/.test(e.textContent) && !!e.querySelector('.wp-primary .wp-chip') && /Slaan/.test((e.querySelector('.wp-primary .wp-chip') || {}).textContent || '')),
});
const swing = async (face) => { place(face); await sleep(150); D.input.mouse.down = true; await sleep(120); D.input.mouse.down = false; };
// 1: hint
w.wanted = 0; place(true);
await sleep(3500);
out.hintMetPersoonInBereik = hints();
await sleep(2500);
out.hintLater = hints();
// 2: lege zwaai en daarna toevallige schade
w.wanted = 0; victim.state = 'wander'; victim.health = 100; await sleep(500);
const states = [];
await swing(false);
await sleep(200);
const hp0 = victim.health;
victim.health -= 10; // iets anders (een auto, een val), niet de zwaai
out.lege = { hpVoor: hp0, hpNa: victim.health };
for (let i = 0; i < 12; i++) { await sleep(500); states.push({ wanted: w.wanted, belt: w.pedestrians.filter((q) => q.state === 'call').length }); }
out.lege.states = states;
// 3: echte treffer
w.wanted = 0; victim.state = 'wander'; victim.health = 100; await sleep(1500);
const hp1 = victim.health;
await swing(true);
await sleep(300);
out.treffer = { hpVoor: hp1, hpNa: victim.health, staat: victim.state, tijdlijn: [] };
for (let i = 0; i < 30; i++) { await sleep(500); out.treffer.tijdlijn.push({ wanted: w.wanted, belt: w.pedestrians.filter((q) => q.state === 'call').length, vlucht: w.pedestrians.filter((q) => /flee|panic|run/.test(q.state)).length }); }
return JSON.stringify({ results: { slaan: out } });
