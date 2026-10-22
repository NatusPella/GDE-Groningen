// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=kerken.page.js --nomenu (#406): voor/na-beelden van kerken die als gewoon gebouw
// werden getekend (een doos met een doostoren) of waar de kit het tegelgebouw niet dekt. Eén opname per kerk: shots-kerk-<naam>.png.
// De plekken komen uit scripts/world/kerk_audit.mjs (de tegels van de provincie): x, y van het tegelgebouw.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 120 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug, w = D.world, p = w.player, map = w.map;
const cine = await import('/js/cinematics.js');
const S3 = await import('/js/scene3d.js');
const DN = await import('/js/daynight.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
w.devInvuln = true;
D.input.canLock = () => false;
const DOELEN = [
  ['eenum', 14057, -13625], ['wirdum', 14537, -11853], ['liudger', -14171, -498], ['stedum', 8168, -11438], ['oosterwijtwerd', 16245, -13681],
  ['kandelaars', 720, -1548], ['zijldijk', 12398, -19760], ['gerefo', -15262, -4962], ['kerkje', 27066, 4059],
  ['bonifatius-tegel', -9392, -15272], ['zions-tegel', 6993, -20956], ['kapel-tegel', 28549, 2538], ['loppersum-kit', 11991, -12735],
];
const only = (window.__mp && window.__mp.ids ? window.__mp.ids.split(',') : []).filter(Boolean);
let cam = null;
// het spel zet w.cameraOverride zelf terug op null: een eigen eigenschap die altijd onze camera geeft
Object.defineProperty(w, 'cameraOverride', { configurable: true, get: () => cam, set: () => {} });
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const uit = { kerken: [] };
for (const [naam, x, y] of DOELEN) {
  if (only.length && !only.includes(naam)) continue;
  fixWorld();
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x + 40; p.y = y + 40; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
  // de camera 38 m uit het zuidwesten, op 11 m hoogte, kijkend naar de kerk
  cam = { position: { x: x - 27, y: y + 27, z: 11 }, lookAt: { x, y, z: 7 }, fov: 55, cut: true };
  let rustig = 0;
  for (let i = 0; i < 80 && rustig < 4; i++) {
    await sleep(500);
    const s = S3.streamPending();
    rustig = s.buildings + s.roads === 0 && !s.ahead ? rustig + 1 : 0;
  }
  await sleep(1500);
  const rij = map.buildingsNear ? map.buildingsNear(x, y, 25).filter((b) => b.type === 'church' || b.type === 'chapel' || (b.name && /kerk|kapel/i.test(b.name))).map((b) => ({ naam: b.name || '', type: b.type, hm: b.hm, kit: !!b._kitItem, kitSoort: b._kitItem && b._kitItem.k })) : [];
  uit.kerken.push({ naam, rij });
  console.log('[capture] kerk-' + naam);
  await sleep(900);
}
delete w.cameraOverride;
w.cameraOverride = null;
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'kerken' }] });
