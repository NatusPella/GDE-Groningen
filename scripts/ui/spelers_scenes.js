// Spelersmenu (21-11): de flow van Samen spelen in beeld, voor en na de herziening (docs/SPELERSMENU-UX-21-11.md).
// De sessie is nagebootst (een gastheer met drie spelers, zonder netwerk): alleen de weergave telt.
//   node desktop/build/slots/slot.mjs run spelers -- node scripts/ui_shots.mjs --sizes=1280x720 --scenes=scripts/ui/spelers_scenes.js --out=<map>
// Zet window.__shotsOnly (--only=a,b) om scenes te kiezen: wachtkamer, spelers, tab, gast, verbroken, start.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const laadt = () => !!document.querySelector('#loading:not([hidden]), .ls.on:not(.out)');
const klaar = () => document.body.classList.contains('game-started') && window.__debug && window.__debug.world && window.__debug.world.map && !laadt();
const done = [];
for (let i = 0; i < 240 && !klaar(); i++) {
  if (!document.body.classList.contains('game-started')) tap('Enter', 'Enter');
  if (window.__debug && window.__debug.world && window.__debug.world.paused) tap(' ', 'Space');
  await sleep(1000);
}
await sleep(3000);
const D = window.__debug; const w = D.world;
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); done.push(name); };
const probeer = async (naam, fn) => { try { await fn(); } catch (e) { done.push(naam + ' FOUT ' + (e && e.message)); } };
const PM = await imp('pausemenu');
const only = (window.__shotsOnly || '').split(',').filter(Boolean);
const wil = (n) => !only.length || only.includes(n);
const px = w.player ? w.player.x : 0, py = w.player ? w.player.y : 0;

// een nagebootste sessie: wie het spel opende (plek 0) en drie spelers erbij
const rooster = [
  { slot: 0, char: 'tammo', rol: 'host', verbinding: 'ok', avatar: { naam: 'Tammo', kleur: '#4fb3ff', char: 'tammo' } },
  { slot: 1, char: 'rik', rol: 'gast', verbinding: 'ok', avatar: { naam: 'Rik', kleur: '#f2b134', char: 'rik' } },
  { slot: 2, char: 'sanne', rol: 'gast', verbinding: 'lag', avatar: { naam: 'Sanne', kleur: '#5bd6a0', char: 'sanne' } },
  { slot: 3, char: 'bram', rol: 'gast', verbinding: 'lost', avatar: { naam: 'Bram', kleur: '#b78cff', char: 'bram' } },
];
const rijen = (rol) => rooster.map((r) => ({
  slot: r.slot, naam: r.avatar.naam, kleur: r.avatar.kleur, vorm: { 0: 'driehoek', 1: 'vierkant', 2: 'cirkel', 3: 'vijfhoek' }[r.slot], jij: rol === 'host' ? r.slot === 0 : r.slot === 1,
  verbinding: r.verbinding, verbindingTekst: { ok: 'goed', lag: 'haperd', lost: 'weg' }[r.verbinding], ms: { 0: null, 1: 34, 2: 180, 3: null }[r.slot],
  passief: r.slot !== 1, pvpInSpel: true, groep: r.slot === 0 ? 'leidt Het Loket' : '', leidt: r.slot === 0, doet: ['te voet', 'in een voertuig', 'aan het stuur', 'onbekend'][r.slot],
  afstand: [null, 40, 420, null][r.slot], afstandTekst: ['', 'bij je', '420 m', ''][r.slot] || (r.slot === 1 ? '40 m' : ''), x: r.slot === 3 ? null : px + 40 * r.slot, y: r.slot === 3 ? null : py - 30 * r.slot,
}));
const maakSessie = (rol) => {
  const hub = { roster: { max: 4, spelers: rooster }, cfg: {}, publiek: () => null, announce() {}, zetOpenbaar: () => ({ ok: true }), on() {}, off() {} };
  w.coopSolo = false; w.coopRole = rol; w.coopPvp = { aan: true, passief: {} };
  w.coopRoster = rooster; w.coopSpelers = rijen(rol);
  w.coopNet = rol === 'host' ? { role: 'host', hub, route: 'kamer', info: {} } : { role: 'client', route: 'kamer', session: { slot: 1, caps: ['pvp'], welcome: { max: 4, lijst: rooster }, sendEvent: () => true }, info: {} };
};
const weg = () => { w.coopNet = null; w.coopRole = null; w.coopSpelers = []; };
const sluit = async () => { tap('Escape', 'Escape'); await sleep(400); tap('Escape', 'Escape'); await sleep(600); };

if (wil('wachtkamer')) await probeer('wachtkamer', async () => {
  maakSessie('host'); await sleep(300);
  PM.openPauseMenu('samen'); await sleep(1800); await shot('wachtkamer-host', 600); await sluit(); weg();
});
if (wil('spelers')) await probeer('spelers', async () => {
  maakSessie('host'); await sleep(300);
  PM.openPauseMenu('spelers'); await sleep(1800); await shot('spelers-tab-host', 600);
  const k = document.querySelector('#pause-menu .cs-eruit'); if (k) { k.click(); await sleep(700); await shot('spelers-tab-bevestig', 400); }
  await sluit(); weg();
});
if (wil('gast')) await probeer('gast', async () => {
  maakSessie('gast'); await sleep(300);
  PM.openPauseMenu('samen'); await sleep(1800); await shot('wachtkamer-gast', 600); await sluit();
  PM.openPauseMenu('spelers'); await sleep(1800); await shot('spelers-tab-gast', 600); await sluit(); weg();
});
if (wil('tab')) await probeer('tab', async () => {
  maakSessie('host'); await sleep(300);
  const U = await imp('coopspelersui'); w.paused = false;
  const oud = w.input.isDown; w.input.isDown = (k) => k === 'tab' || (oud && oud.call(w.input, k));
  U.updateSpelersOverlay(w); await sleep(300); U.updateSpelersOverlay(w); await shot('tab-lijst', 800);
  w.input.isDown = oud; U.updateSpelersOverlay(w); weg();
});
clearInterval(skipper);
return done;
