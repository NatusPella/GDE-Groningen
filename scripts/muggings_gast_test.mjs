// Samen spelen (#1160): a guest is mugged on his own screen against his own wallet.
// Mock test: loads muggings.js in node with a stub window and drives updateMuggingsGast.
//   node scripts/muggings_gast_test.mjs
import { register } from 'node:module';
// muggings.js drags in half the game (Three.js, the scene, the HUD); this test only needs its own state machine, so the
// neighbours are stubbed with the exports muggings.js uses.
const STUBS = {
  'pedestrians.js': 'export class Pedestrian {}; export const isSpawnHidden = () => true;',
  'pedgeom.js': 'export const isInsideBuilding = () => false;',
  'sidejobkit.js': 'export const walkPed = () => false;',
  'trafficfleet.js': "export const wijkProfileAt = () => ({ wijk: 'Binnenstad' });",
  'hudcards.js': 'export const showCard = () => {}; export const cardsBusy = () => false;',
  'cinematics.js': 'export const isCinematicActive = () => false;',
  'missionquery.js': 'export const isMissionActive = () => false;',
  'activities.js': 'export const isActivityActive = () => false;',
  'home.js': 'export const inHomeFlat = () => false;',
  'gebiedenlive.js': 'export const getProfiel = () => null; export const getIndeling = () => null;',
  'gebieden.js': 'export const veroverdOp = () => false;',
  'busy.js': 'export const playerBusy = () => ({ busy: false });',
};
const HOOK = 'const STUBS = ' + JSON.stringify(STUBS) + `;
export async function resolve(s, c, n) {
  const r = await n(s, c);
  const m = r.url.includes('/game/js/') ? [0, r.url.split('/').pop()] : null;
  if (m && STUBS[m[1]] && c.parentURL && c.parentURL.endsWith('/game/js/muggings.js')) return { url: 'data:text/javascript,' + encodeURIComponent(STUBS[m[1]]), shortCircuit: true };
  return r;
}`;
register('data:text/javascript,' + encodeURIComponent(HOOK));
const M = await import('../game/js/muggingrules.js');

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || { body: { classList: { contains: () => false } } };
let mod;
try { mod = await import('../game/js/muggings.js'); } catch (e) { console.log('FAIL import muggings.js', e.message); process.exit(1); }

const msgs = [];
const map = { escapeBuilding: (x, y) => [x, y], buildingsNear: () => [], meta: {} };
function wereld(extra = {}) {
  const body = { x: 100, y: 100, angle: 0, inVehicle: null, swimming: false, dead: false };
  return { coopRole: 'client', player: body, players: [{ lokaal: true, slot: 1, body }], map, money: 200, clock: 1, time: 0, paused: false, wanted: 0, pedestrians: [], addMessage: (t) => msgs.push(t), ...extra };
}
const rand = Math.random;
mod.initMuggings(wereld());

// the guest's loss and the wallet spot, forced through the debug hook
{
  const w = wereld();
  mod.initMuggings(w);
  Math.random = () => 0.5;
  let ok;
  try { ok = window.__muggings.mug(); } catch (e) { ok = e.message; }
  Math.random = rand;
  const st = window.__muggings.state();
  check('a forced mugging of a guest takes a share of his own money', ok === true && w.money === 200 - M.stolenAmount(200), String(ok) + ' ' + w.money);
  check('the wallet lies at a spot', st.guestSpot && Math.hypot(st.guestSpot.x - 100, st.guestSpot.y - 100) >= 6);
  check('no thief body for a guest', st.thief === false && w.pedestrians.length === 0);
  check('the message names the amount and no violence', /€40/.test(msgs.at(-1)) && !/(geslagen|mes|pistool|bloed|geweld)/i.test(msgs.at(-1)), msgs.at(-1));
  // second mugging while the first lies out: no
  check('no second wallet while one lies out', window.__muggings.mug() === false && w.money === 160);
  // walk to the spot: money back
  w.player.x = st.guestSpot.x; w.player.y = st.guestSpot.y;
  mod.updateMuggingsGast(0.1, w);
  check('reaching the spot returns the wallet', w.money === 200 && !w.muggerChase && window.__muggings.state().guestSpot === null, String(w.money));
}

// too late: the wallet is gone
{
  const w = wereld();
  mod.initMuggings(w);
  Math.random = () => 0.5;
  window.__muggings.mug();
  Math.random = rand;
  for (let i = 0; i < Math.ceil((M.MUG.guestTime + 1) / 0.5); i++) mod.updateMuggingsGast(0.5, w);
  check('too late: the money stays gone', w.money === 160 && window.__muggings.state().guestSpot === null && /ben je kwijt/.test(msgs.at(-1)), String(w.money));
}

// a thin wallet and a paused game are not mugged; the host is not touched by guest state
{
  const w = wereld({ money: 20 });
  mod.initMuggings(w);
  check('a thin wallet cannot be taken', window.__muggings.mug() === false && w.money === 20);
  const w2 = wereld({ paused: true });
  mod.initMuggings(w2);
  mod.updateMuggingsGast(1, w2);
  check('paused does nothing', w2.money === 200);
}

// a guest who becomes the opener while the wallet lies out gets it back
{
  const w = wereld();
  mod.initMuggings(w);
  Math.random = () => 0.5;
  window.__muggings.mug();
  Math.random = rand;
  w.coopRole = 'host';
  mod.updateMuggings(0.1, w);
  check('host change gives the wallet back', w.money === 200 && !w.muggerChase, String(w.money));
}

// the text rules
{
  const all = [M.MUG_TEXT.guestSnatch(40), M.MUG_TEXT.guestBack(40), M.MUG_TEXT.guestGone(40)].join(' ');
  check('guest lines: amounts, no violence', /€40/.test(all) && !/(geslagen|mes|pistool|bloed|dood|geweld|schiet)/i.test(all));
  check('the spot is walkable in time', M.MUG.guestSpot[1] / M.MUG.guestTime < 1);
  check('reach and expiry rules', M.lootReached(1) && !M.lootReached(5) && M.lootGone(80) && !M.lootGone(10));
}

console.log(`muggings_gast: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
