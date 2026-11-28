// Test voor game/js/menuachtergrond.js: de baan, het plan (wanneer de luchtfoto naar de stad vervaagt), en het opruimen na de keuze
// (geen tweede wereld, geen lopende lus, speler, klok en weer terug, de gehouden tegels vrij).
import assert from 'node:assert/strict';
import { menuPose, menuAchtergrondPlan, startMenuAchtergrond, stopMenuAchtergrond, menuAchtergrondActief, TOREN, MENU_UUR, KLAAR_MAX_S, KLAAR_RUST_BEELDEN, MENU_FPS_S, MENU_FPS_VOL_S } from '../game/js/menuachtergrond.js';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

// de baan: een cirkel rond de Martinitoren, hoog boven de daken, de camera kijkt naar de toren (met een zijwaartse verschuiving)
let minR = Infinity, maxR = 0, minZ = Infinity, maxStap = 0, vorige = null;
for (let t = 0; t <= 600; t += 0.5) {
  const q = menuPose(t, 1.2);
  const r = Math.hypot(q.position.x - TOREN.x, q.position.y - TOREN.y);
  minR = Math.min(minR, r); maxR = Math.max(maxR, r); minZ = Math.min(minZ, q.position.z);
  ok(Number.isFinite(q.position.x + q.position.y + q.position.z + q.lookAt.x + q.lookAt.y + q.lookAt.z), 'geen NaN in de baan');
  if (vorige) maxStap = Math.max(maxStap, Math.hypot(q.position.x - vorige.x, q.position.y - vorige.y));
  vorige = q.position;
}
ok(minR > 120 && maxR < 180, `de straal blijft rond de toren (${minR.toFixed(0)} tot ${maxR.toFixed(0)} m)`);
ok(minZ > 65, `de camera vliegt boven de daken (laagste ${minZ.toFixed(0)} m)`);
ok(maxStap < 3, `de beweging is traag en vloeiend (grootste stap per halve seconde ${maxStap.toFixed(2)} m)`);
const a = menuPose(0, 0), b = menuPose(0, 0);
eq(a, b, 'dezelfde tijd en hoek geven dezelfde pose (geen toeval in de baan)');
ok(menuPose(10, 0, { x: 0, y: 0 }).position.x !== menuPose(10, 0).position.x, 'de baan volgt de toren die de kaart geeft');
ok(MENU_UUR >= 4.3 && MENU_UUR <= 5.5, 'gouden ochtend: lage zon');

// het plan
let p = menuAchtergrondPlan({ aan: false });
ok(!p.teken && !p.wereld, 'zonder hoofdmenu wordt er niets getekend');
p = menuAchtergrondPlan({ aan: true, sinds: 0.2 });
ok(p.teken && !p.wereld && p.interval === MENU_FPS_S, 'net open: de luchtfoto blijft, de wereld tekent al op 30 per seconde');
p = menuAchtergrondPlan({ aan: true, sinds: 3, tegelsIn: true, rust: KLAAR_RUST_BEELDEN - 1 });
ok(!p.wereld, 'nog werk in de weg: de luchtfoto blijft');
p = menuAchtergrondPlan({ aan: true, sinds: 3, tegelsIn: true, rust: KLAAR_RUST_BEELDEN });
ok(p.wereld, 'tegels binnen en rust: vervagen naar de wereld');
p = menuAchtergrondPlan({ aan: true, sinds: KLAAR_MAX_S });
ok(p.wereld, 'een tegel die nooit komt houdt het menu niet vast');
ok(menuAchtergrondPlan({ aan: true, sinds: 1, paneel: true }).interval === MENU_FPS_VOL_S, 'achter een groot paneel iets zuiniger');
ok(!menuAchtergrondPlan({ aan: true, sinds: 20, verborgen: true }).teken, 'een verborgen venster tekent niet');

// de laag zelf, met een nepomgeving
const klassen = new Set();
const overlay = { classList: { contains: (k) => k === 'sp-hm' } };
let overlayAan = true;
const rafs = [];
globalThis.requestAnimationFrame = (f) => { rafs.push(f); return rafs.length; };
globalThis.cancelAnimationFrame = (id) => { rafs[id - 1] = null; };
globalThis.document = {
  hidden: false,
  body: { classList: { add: (k) => klassen.add(k), remove: (k) => klassen.delete(k), contains: (k) => klassen.has(k) } },
  getElementById: (id) => (id === 'online-start' && overlayAan ? overlay : null),
};
const lijn = [];
const world = {
  map: {
    meta: { landmarks: [{ name: 'Martinitoren', x: 213.81, y: 9.9 }] },
    registerShots: (shots, o) => { lijn.push(['pin', shots[0].at, o.radius, o.token]); return Promise.resolve(1); },
    releaseShots: () => lijn.push(['vrij']),
  },
  player: { x: 4000, y: -2500, character: 'tammo' },
  clock: 14.5, weather: { active: true, kind: 'rain', intensity: 0.8 }, cameraOverride: null, menuCam: false,
};
let ticks = 0, renders = 0, verplaatst = [];
const lichtKlok = [];
const env = {
  tick: () => { ticks++; }, render: () => { renders++; },
  relocate: (x, y) => { verplaatst.push([x, y]); world.player.x = x; world.player.y = y; },
  wacht: () => ({ buildings: 0, roads: 0 }),
  licht: (w) => { lichtKlok.push(w.clock); },
};
const stap = (ms) => { const f = rafs.splice(0).filter(Boolean); f.forEach((fn) => fn(stap.nu += ms)); };
stap.nu = 1000;

const stop = startMenuAchtergrond(world, env);
ok(menuAchtergrondActief(), 'de achtergrond loopt');
ok(startMenuAchtergrond(world, env) === stop, 'een tweede start maakt geen tweede lus (geen dubbele wereld)');
eq(lijn[0], ['pin', [TOREN.x, TOREN.y], 200, 'menu'], 'alleen een klein stuk stad rond de toren wordt gevraagd en vastgehouden');
await Promise.resolve();
for (let i = 0; i < 80; i++) stap(33);
ok(ticks > 20 && renders === ticks, `de wereld leeft achter het menu (${renders} beelden)`);
ok(klassen.has('hm-3d') && klassen.has('hm-3d-klaar'), 'het laadscherm gaat weg en de luchtfoto vervaagt zodra de tegels er zijn');
ok(world.cameraOverride && world.cameraOverride.bron === 'hoofdmenu' && world.cameraOverride.cut === true, 'de camera is een eigen override');
ok(world.menuCam === true && world.clock === MENU_UUR && !world.weather.active, 'ochtendlicht, droog, menucamera');
ok(Math.hypot(world.player.x - TOREN.x, world.player.y - TOREN.y) < 100, 'de speler staat bij de toren zodat de straten meekomen');
// 30 beelden per seconde, niet 60
const voor = renders; for (let i = 0; i < 60; i++) stap(16.7);
ok(renders - voor <= 36 && renders - voor >= 24, `ongeveer 30 per seconde (${renders - voor} in 1 s)`);
// het menu is even weg (kaarten van Samen spelen): niets tekenen, laadscherm terug
overlayAan = false;
const rustVoor = renders; for (let i = 0; i < 20; i++) stap(33);
ok(renders === rustVoor && !klassen.has('hm-3d'), 'zonder menu geen beelden en het laadscherm is weer zichtbaar');
overlayAan = true; for (let i = 0; i < 10; i++) stap(33);
ok(renders > rustVoor && klassen.has('hm-3d'), 'terug in het menu: weer de stad');
// een verborgen venster tekent niet
document.hidden = true; const h0 = renders; for (let i = 0; i < 20; i++) stap(33); document.hidden = false;
ok(renders === h0, 'een verborgen venster tekent niet');

// opruimen na de keuze
stopMenuAchtergrond();
ok(!menuAchtergrondActief(), 'na de keuze loopt er niets meer');
eq([lichtKlok[0], lichtKlok.at(-1)], [MENU_UUR, 14.5], 'het licht wordt bij het begin op de ochtend gezet en na de keuze teruggezet');
ok(world.cameraOverride === null && world.menuCam === false && world.clock === 14.5 && world.weather.kind === 'rain', 'camera, klok en weer zijn terug');
ok(world.player.x === 4000 && world.player.y === -2500, 'de speler staat weer waar hij stond (de save of het begin)');
ok(lijn.at(-1)[0] === 'vrij', 'de vastgehouden tegels zijn weer vrij');
ok(!klassen.has('hm-3d') && !klassen.has('hm-3d-klaar'), 'de klassen zijn weg');
const r0 = renders; for (let i = 0; i < 20; i++) stap(33);
ok(renders === r0 && rafs.filter(Boolean).length === 0, 'geen lus meer na stop (geen lek)');
stopMenuAchtergrond(); // twee keer stoppen is veilig
// opnieuw starten kan (Terug naar de keuzekaart in dezelfde sessie)
const s2 = startMenuAchtergrond(world, env); ok(menuAchtergrondActief(), 'opnieuw starten kan'); s2(); ok(!menuAchtergrondActief(), 'en weer stoppen');
// zonder kaart of render: geen fout, geen lus
ok(typeof startMenuAchtergrond({}, env) === 'function' && !menuAchtergrondActief(), 'een wereld zonder kaart start niets');
console.log(`menuachtergrond_test: ${n} controles ok`);
