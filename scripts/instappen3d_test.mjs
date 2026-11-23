// De lijm van het in- en uitstappen (instappen3d.js, wens eigenaar 23-11), headless: wachtenden bij een bushalte uit
// de pool, een bus die zich meldt (host) en een bus van de host die bij een gast stilstaat; de wachtenden stappen in,
// alles gaat terug in de pool en de halte loopt later weer vol. Deterministisch (vaste rng).
import './node3d.mjs';
const P = await import('../game/js/models3d_people.js');
const { syncInstappen, instapStats, resetInstappen } = await import('../game/js/instappen3d.js');
const { zetHalteBron, wachtAantal, zaad } = await import('../game/js/instappen.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
let seed = 11;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// een halte waar volgens het zaad minstens twee mensen wachten (het aantal hangt van het id en het kwartier af)
let id = 0;
while (wachtAantal(zaad('bh' + id) ^ 0, 0, 3) < 2) id++;
const halte = { id: 'h' + id };
zetHalteBron(() => [halte], () => ({ x: 100, y: 60, ang: 0 }));

const scene = { kids: new Set(), add(m) { scene.kids.add(m); }, remove(m) { scene.kids.delete(m); } };
let gebouwd = 0;
const bouw = (shirt, skin, s, rol) => { gebouwd++; return P.buildPersonMesh(shirt, skin, { seed: s, role: rol }); };
const world = { player: { x: 100, y: 50 }, players: [{ x: 100, y: 50 }], haltefx: [], map: null };
const DT = 1 / 30;
const draai = (sec) => { for (let i = 0; i < sec / DT; i++) syncInstappen(world, scene, bouw, DT, rng); };

draai(1);
const wacht0 = instapStats().wachtend;
ok(wacht0 >= 2 && wacht0 <= 3, 'wachtenden bij de halte', wacht0);
ok(gebouwd === wacht0, 'één figuur per wachtende, uit de pool', `${gebouwd}/${wacht0}`);

// een lijnbus haltert: de paal staat rechts van de bus (de stoepkant)
const bus = { x: 101, y: 55.8, angle: 0, isBus: true, model: { name: 'bus', len: 12, wid: 2.55 } };
world.haltefx.push({ v: bus, board: -1, alight: 2 });
draai(0.2);
ok(instapStats().wachtend === 0, 'de wachtenden lopen naar de bus');
ok(instapStats().wissels === 1, 'één uitwisseling');
draai(15);
const st1 = instapStats();
ok(st1.wissels === 0, 'uitwisseling klaar', st1.wissels);
ok(st1.vrij === st1.gebouwd, 'alles terug in de pool', `${st1.vrij}/${st1.gebouwd}`);
ok(st1.gebouwd <= wacht0 + 2, 'uitstappers uit de pool, niet meer dan nodig', st1.gebouwd);
ok([...scene.kids].every((m) => !m.visible), 'niemand meer in beeld');

// een bus aan de overkant (de halte ligt links van hem): geen wachtenden mee, wel uitstappers
draai(95); // de halte loopt weer vol
const wacht1 = instapStats().wachtend;
ok(wacht1 >= 1, 'de halte loopt na een tijdje weer vol', wacht1);
world.haltefx.push({ v: { ...bus, y: 52, angle: Math.PI }, board: -1, alight: 1 });
draai(0.2);
ok(instapStats().wachtend === wacht1, 'een bus aan de overkant neemt de wachtenden niet mee');
draai(15);

// Samen spelen: een gast ziet een bus van de host een seconde bij de halte stilstaan en tekent zelf de reizigers
world.coopRole = 'client';
world.coopHost = { voertuigen: [{ id: 7, soort: 'bus', x: bus.x, y: bus.y, angle: 0, snelheid: 0, len: 12, wid: 2.55 }] };
draai(0.5);
ok(instapStats().wissels === 0, 'gast: nog niet na een halve seconde');
draai(0.8);
ok(instapStats().wissels === 1 && instapStats().wachtend === 0, 'gast: na een seconde stilstand stappen de wachtenden in', JSON.stringify(instapStats()));
draai(15);
world.coopHost.voertuigen[0].x = 300; // een bus voor een rood licht, ver van een halte
draai(3);
ok(instapStats().wissels === 0, 'gast: geen uitwisseling zonder halte');
ok(gebouwd <= 28, 'de pool blijft binnen zijn grens', gebouwd);

resetInstappen();
ok(instapStats().groepen === 0 && instapStats().vrij === instapStats().gebouwd, 'reset: alles terug in de pool');
console.log(fails ? `instappen3d_test: ${fails} van ${n} mislukt` : `instappen3d_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
