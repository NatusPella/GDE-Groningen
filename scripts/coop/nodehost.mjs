// Coöp-testbank (#95): een gescripte host zonder Electron, voor wie alleen de kant van de GAST in beeld wil
// bekijken met één Electron-instantie. De host draait de echte koppeling (coopnet.js: hub, sessies, snapshots,
// berichten) op een nep-wereld en luistert op dezelfde TCP-route (desktop/coopcore.cjs) als de app. Een Electron-gast
// verbindt er gewoon mee. Het draaiboek (script) beweegt Tammo, voertuigen en voetgangers, zet een opdracht, een
// filmpje, een keuze, pauze, wanted en een passagier in het spel, en betaalt de gast.
//   const h = await startNodeHost({ stage });   // h.code, h.world, h.step(), h.stop()
import { createRequire } from 'node:module';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const { createCoopCore } = require(path.join(ROOT, 'desktop', 'coopcore.cjs'));
const imp = (f) => import(pathToFileURL(path.join(ROOT, 'game', 'js', f)).href);

export const START = { x: -1287, y: -1066 }; // de startplek van een nieuw spel (voor de tegels van de gast)

export async function startNodeHost({ stage, tiles = '-', story = 'nieuw', max = 4 }) {
  const N = await imp('coopnet.js');
  const { listenForGuests } = await imp('net/ipctransport.js');
  const { coopStep } = await imp('coopglue.js');
  const { VERSION } = await import(pathToFileURL(path.join(stage, 'js', 'version.js')).href);
  const info = N.handshakeInfo({ tiles, story });
  info.version = String(VERSION); // dezelfde versie als de gestagede game van de gast
  const state = { filmpje: false, pauze: false, regel: null, keuze: null };
  const world = {
    player: { x: START.x + 4, y: START.y, angle: 0, character: 'tammo', vx: 0, vy: 0, inVehicle: null },
    companion: { x: START.x, y: START.y + 2, angle: 0, character: 'anita', vx: 0, vy: 0, inVehicle: null },
    coop: { local: true }, money: 500, wanted: 0, clock: 17.5, camYaw: 0, time: 0, paused: false, messages: [], addMessage(m) { this.messages.push(m); },
    input: { axis: () => [0, 0], isDown: () => false }, vehicles: [], pedestrians: [], wildlife: [], mission: { phase: 'idle' },
  };
  // een paar voertuigen en voetgangers in de buurt (de gast tekent ze als blokken en poppetjes)
  for (let i = 0; i < 6; i++) world.vehicles.push({ id: 100 + i, x: START.x + 15 + i * 9, y: START.y - 8 + (i % 2) * 14, angle: i % 2 ? Math.PI : 0, model: { len: i === 3 ? 11 : 4.2 }, isBus: i === 3 });
  // met een uiterlijk (#428): kleding, huid, zaad, een look voor een paar, een groet, praten, een agent
  const KLEUR = ['#b8473a', '#3a6ea5', '#4f8a5b', '#d9b44a', '#7a5a9a', '#e8e6e0', '#8a8f96', '#c77d3a'], HUID = ['#f0c8a0', '#d9aa82', '#b98560', '#8a5a3c', '#5c3a28'];
  for (let i = 0; i < 14; i++) {
    const q = { x: START.x - 10 + i * 3, y: START.y + 6 + (i % 3) * 3, angle: i, speed: 0.8, state: 'wander', health: 30, isCop: i === 2, clothing: i === 2 ? '#1f3f8f' : KLEUR[i % KLEUR.length], skin: HUID[(i * 3) % HUID.length], _lookSeed: 17.25 + i * 91.7, hasBag: i % 4 === 0 };
    if (i === 5) q.look = { top: 'hoodie', hat: 'cap', hatColor: 0x2a2a2a };
    if (i === 6) { q.clothing = '#e0a020'; q.carry = 'paper'; q.look = { top: 'jacket' }; }
    world.pedestrians.push(q);
  }
  world.pedestrians[3].speechText = 'Moi, mooi weer vandaag!'; world.pedestrians[3].speechUntil = 1e9;
  // #428: een dode en een omgevallen man, een man met een knuppel die slaat, iemand die een klap krijgt; een dood dier; een spreker zonder voetganger
  world.pedestrians[10].state = 'dead'; world.pedestrians[10].health = 0; world.pedestrians[10].deadUntil = 1e9; world.pedestrians[11].ragdoll = { t: 0 };
  world.pedestrians[12].heldWeapon = 'knuppel'; world.pedestrians[12].attackFx = { type: 'melee', swing: 'bat', start: 0 }; world.pedestrians[13].hitReact = { t: 0, dx: 1, dy: 0, k: 0.7 };
  world.extraSpeakers = [{ x: START.x + 3, y: START.y + 4, h: 2.3, female: false, speechName: 'Kermisbaas Jan', speechText: 'Hoi, kom maar binnen!', speechUntil: 1e9 }];
  world.pedestrians[4].greetUntil = 1e9; world.pedestrians[8].party = true; world.pedestrians[9].speed = 3.4;
  const DIER = [['cow', { variant: 'red' }], ['cow', {}], ['sheep', {}], ['sheep', {}], ['dog', { breed: 2, color: 0.6 }], ['cat', { variant: 1 }], ['duck', { variant: 'swan' }], ['pigeon', {}], ['seagull', {}]];
  DIER.forEach(([kind, extra], i) => world.wildlife.push({ kind, x: START.x - 4 + (i % 5) * 4, y: START.y + 15 + Math.floor(i / 5) * 4, angle: i, speed: i % 3 ? 0.5 : 0, bobSeed: 0.7 + i, ...extra }));
  const X = await imp('coopextra.js');
  const stuntNep = { x: START.x + 5, y: START.y + 32, props: ['parasol', 'kliko', 'stoepbord', 'chair', 'table'].flatMap((kind, k) => Array.from({ length: 4 }, (_, i) => ({ kind, x: START.x + 5 - 8 + i * 5, y: START.y + 32 - 6 + k * 3, alive: !(k === 0 && i < 2) }))) };
  world.coopExtraDeps = { controllers: () => [0, 1, 2, 3, 4].map((i) => ({ x: START.x + i * 5, y: START.y + 20, t: ((i * 3 + 1 + (h.lichtT || 0)) % 15), cycle: 15 })), misc: (bij, g, nu) => X.maakMisc({ kermis: true, stunt: stuntNep, punten: [{ x: START.x + 10, y: START.y - 5, z: 0 }, { x: START.x + 20, y: START.y - 5, z: 0 }, { x: START.x + 30, y: START.y - 5, z: 0 }] }, g, nu), gebroken: () => (h.kapot || []).map((k) => ({ key: k.key, kind: k.key.split('@')[0], x10: k.x10, y10: k.y10 })) };
  const hostInfo = { ...info };
  N.startHost(world, hostInfo, { seed: 9, max, scene: () => ({ ...state }) });

  // de TCP-kant van de app achter dezelfde ipc-brug als in Electron
  const listeners = new Set();
  const core = createCoopCore({ gameDir: stage, emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, localIp: '127.0.0.1', upnp: false });
  const api = { send: (id, b) => core.send(id, b), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max });

  const h = { code: hosted.code, world, state, core, N, t: 0, log: [], timers: [], kapot: [], wereld: [] };
  world.coopExtraDeps.wereld = () => h.wereld; // bruggen en sluizen die de gast moet laten bewegen (testbank: [{ soort, staat (index), x, y, a, b, peil }])
  world.coopExtraDeps.sprekers = (bij, nu) => X.maakSprekersLijst(world.extraSpeakers, nu, bij);
  // Tammo loopt rondjes; de voertuigen rijden heen en weer; Tessa wordt door de gast bestuurd (coopStep), of rijdt mee als passagier
  const move = (c, dt) => { c.x += c.vx * dt; c.y += c.vy * dt; };
  h.drive = null; // { car, until } : de host rijdt een stuk met Tessa als passagier
  let last = Date.now();
  h.timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    h.t += dt; world.time += dt; world.clock = (world.clock + dt / 120) % 24;
    const p = world.player;
    if (h.drive) { // in het voertuig: rijdt rechtdoor
      const car = h.drive.car; car.x += Math.cos(car.angle) * 9 * dt; car.y += Math.sin(car.angle) * 9 * dt; p.x = car.x; p.y = car.y; p.angle = car.angle;
    } else if (h.walk) { p.x = START.x + 4 + Math.cos(h.t / 4) * 6; p.y = START.y + Math.sin(h.t / 4) * 6; p.angle = h.t / 4 + Math.PI / 2; }
    for (const v of world.vehicles) { if (v.id === 100 + 99 || v.parkeer) continue; v.x += Math.cos(v.angle) * 4 * dt; if (Math.abs(v.x - START.x) > 90) v.angle += Math.PI; }
    if (world.wildlife[1]) world.wildlife[1].dead = true;
    for (const q of world.pedestrians) { q.x += Math.cos(q.angle) * 0.8 * dt; q.y += Math.sin(q.angle) * 0.8 * dt; q.angle += 0.2 * dt; }
    for (const a of world.wildlife) { if (a.speed) { a.x += Math.cos(a.angle) * a.speed * dt; a.y += Math.sin(a.angle) * a.speed * dt; a.angle += 0.15 * dt; } }
    h.lichtT = (h.lichtT || 0) + dt;
    if (world.pedestrians[12] && world.pedestrians[12].attackFx) world.pedestrians[12].attackFx.start = world.time; // blijven vechten en geraakt worden
    if (world.pedestrians[13] && world.pedestrians[13].hitReact) world.pedestrians[13].hitReact.t = world.time;
    if (!world.companion.inVehicle && !state.pauze) coopStep(world.companion, dt, world, move); // de gast bestuurt Tessa; staat het spel van de host op pauze, dan stapt coopnet.js haar zelf (stapMetgezelInPauze, #388)
    world.paused = state.pauze;
    if (!h.stalled) { const t0 = performance.now(); N.tickCoopNet(world, dt); if (h.tickMs) h.tickMs(performance.now() - t0); } // h.stalled: de gastheer reageert even niet (duurtest)
  }, 16);
  h.walk = true;
  // een voertuig voor de rit: Tammo stapt in, Tessa (de gast) rijdt mee en haar eigen x en y blijven staan zoals in het spel
  h.rit = (aan, sjabloon = {}) => { // sjabloon: eigenschappen van het voertuig (bijvoorbeeld een fiets: { isBike: true, model: { len: 1.8, wid: 0.6, name: 'bike' } })
    const w = world;
    if (aan) {
      const car = { id: 199, x: w.player.x + 3, y: w.player.y, angle: 0, model: { len: 4.2 }, ...sjabloon };
      w.vehicles.push(car); h.drive = { car }; h.walk = false;
      w.player.inVehicle = car; w.companion.inVehicle = car; // de metgezel behoudt zijn oude x en y
    } else if (h.drive) {
      const car = h.drive.car; w.player.inVehicle = null; w.companion.inVehicle = null; w.companion.x = car.x - 2; w.companion.y = car.y + 2;
      w.vehicles = w.vehicles.filter((v) => v !== car); h.drive = null; h.walk = true;
    }
  };
  // #434: de gast bestuurt een voertuig van de gastheer (coopbestuur.js): de echte koppeling en stoelen, met een eenvoudige natuurkunde in plaats van player.js
  const Bst = await imp('coopbestuur.js');
  Bst.zetBestuurHaken({
    vind: (x, y, lijst) => lijst.filter((v) => Math.hypot(v.x - x, v.y - y) < 5).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null,
    enter: (l, v) => { v.driver = 'player'; l.inVehicle = v; },
    exit: (l) => { const v = l.inVehicle; v.driver = null; l.inVehicle = null; l.x = v.x + 2.5; l.y = v.y + 2; },
    drive: (l, dt, inv) => { const v = l.inVehicle, [ax, ay] = inv.axis(); const doel = inv.isDown(' ') ? 0 : -ay * 14; v.speed = (v.speed || 0) + (doel - (v.speed || 0)) * Math.min(1, dt * (inv.isDown(' ') ? 4 : 1.2)); v.angle += ax * dt * 1.4 * Math.min(1, Math.abs(v.speed) / 4); v.x += Math.cos(v.angle) * v.speed * dt; v.y += Math.sin(v.angle) * v.speed * dt; l.x = v.x; l.y = v.y; l.angle = v.angle; },
    los: () => ({ ok: true, wacht: false }),
    bijGroep: () => true,
  });
  h.parkeerAuto = (afstand = 2.5) => { const c = world.companion, car = { id: 198, x: c.x + afstand, y: c.y, angle: 0, speed: 0, halfLen: 2.1, halfWid: 0.9, model: { len: 4.2 }, parkeer: true }; world.vehicles.push(car); return car; };
  // #434: een wapen in de hand van de gastheer en een aanval (een zwaai met de knuppel, elke 1,5 s opnieuw)
  const CE = await imp('combateffect.js');
  h.wapen = (key) => { world.weapon = key; };
  h.slaan = (aan) => { if (h.slaanTimer) { clearInterval(h.slaanTimer); h.slaanTimer = null; CE.setCombatEffect(null); } if (aan) h.slaanTimer = setInterval(() => CE.setCombatEffect({ type: 'melee', swing: 'bat', start: world.time }), 1500); };
  h.mission = (m) => { world.mission = m || { phase: 'idle' }; };
  h.pay = (geld, slot = 1) => N.payGuest(world, geld, slot);
  h.at = (sec, fn) => { const t = setTimeout(async () => { try { await fn(h); } catch (e) { h.log.push('fout ' + e.message); } }, sec * 1000); h.timers.push(t); return t; };
  h.roster = () => (world.coopRoster || []).map((r) => [r.slot, r.verbinding]);
  h.stop = async () => { h.slaan(false); clearInterval(h.timer); for (const t of h.timers) clearTimeout(t); try { N.stopCoopNet(world); } catch (e) { /* al weg */ } await new Promise((r) => setTimeout(r, 600)); try { await core.stop(); } catch (e) { /* al weg */ } };
  return h;
}

// #450: de gastheer zonder venster. Dezelfde hub, dezelfde berichten en dezelfde TCP-route als de app, maar op een wereld
// zonder speler (`net/koploos.js`): geen Three.js, geen venster en geen gestagede game nodig. De klok loopt door, nieuwe
// spelers komen op de startplek van de server en elke gast is een figuur die deze server zelf simuleert. De beheerder kan
// kijken wie er is, iemand kicken of verbieden (alleen het token van die verbinding, geen naam of adres), het wachtwoord
// zetten en het maximum aanpassen. Stoppen doet `h.stop()`; de CLI hieronder leest dezelfde taken van het toetsenbord.
//   const h = await startKoplozeHost({ max: 4, wachtwoord: 'zomer' });   // h.code, h.spelers(), h.kick(2), h.stop()
export async function startKoplozeHost({ max = 4, wachtwoord = '', start = START, clock = 12, seed = 95, localIp = null, upnp = false } = {}) {
  const N = await imp('coopnet.js');
  const { koplozeWereld } = await imp('net/koploos.js');
  const { listenForGuests } = await imp('net/ipctransport.js');
  const info = N.handshakeInfo({ tiles: '-', story: 'nieuw' });
  const world = koplozeWereld({ start, clock });
  N.startHost(world, info, { seed, max, koploos: true, wachtwoord });

  // de TCP-kant van de app achter dezelfde ipc-brug als in Electron; zonder Electron is dit de enige kant
  const listeners = new Set();
  const core = createCoopCore({ gameDir: path.join(ROOT, 'game'), emit: (k, p) => { for (const f of [...listeners]) f(k, p); }, ...(localIp ? { localIp } : null), upnp });
  const api = { send: (id, b) => core.send(id, b), close: (id) => core.close(id), onEvent: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } };
  const off = listenForGuests(api, (tr) => N.addGuest(world, tr));
  const hosted = await core.host({ max });
  if (!hosted.ok) {
    try { off(); } catch (e) { /* al weg */ }
    try { N.stopCoopNet(world); } catch (e) { /* al weg */ }
    try { await core.stop(); } catch (e) { /* al weg */ }
    throw new Error(hosted.text || 'De gastheer kon geen poort openen.');
  }

  const h = { world, info, code: hosted.code, lanCode: hosted.lanCode || '', online: !!hosted.online, core, N, t: 0, gestopt: false };
  let last = Date.now();
  h.timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    h.t += dt; world.time += dt; world.clock = (world.clock + dt / 120) % 24;
    N.tickCoopNet(world, dt);
  }, 16);
  // de beheerderstaken: plek 0 is de server zelf en telt niet als speler
  h.spelers = () => (world.coopRoster || []).filter((r) => r && r.slot !== 0 && r.verbinding !== 'lost').map((r) => ({ ...r }));
  h.kick = (slot) => N.removeGuest(world, slot | 0);
  h.verbied = (slot) => N.verbiedGast(world, slot | 0);
  h.zetWachtwoord = (ww = '') => N.zetWachtwoord(world, ww);
  h.max = (n) => N.setMaxPlayers(world, n);
  h.stop = async () => {
    if (h.gestopt) return;
    h.gestopt = true; clearInterval(h.timer);
    try { off(); } catch (e) { /* al weg */ }
    try { N.stopCoopNet(world); } catch (e) { /* al weg */ }
    await new Promise((r) => setTimeout(r, 300));
    try { await core.stop(); } catch (e) { /* al weg */ }
  };
  return h;
}

// Het start/stop-commando van de server (#450), zonder venster:
//   node scripts/coop/nodehost.mjs [--max=4] [--wachtwoord=...] [--upnp]
// Daarna leest hij regels van het toetsenbord: spelers, kick <plek>, verbied <plek>, wachtwoord <tekst>, wachtwoord uit,
// max <aantal>, stop. Ctrl+C of het einde van de invoer stopt hem ook. De poort kiest het spel zelf (41000-41999).
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Gebruik: node scripts/coop/nodehost.mjs [--max=4] [--wachtwoord=...] [--upnp]');
    console.log('Commando\'s: spelers, kick <plek>, verbied <plek>, wachtwoord <tekst>, wachtwoord uit, max <aantal>, stop');
    return;
  }
  const opt = (naam) => { const a = args.find((x) => x.startsWith(`--${naam}=`)); return a ? a.slice(naam.length + 3) : ''; };
  const ww = opt('wachtwoord');
  let h;
  try { h = await startKoplozeHost({ max: Number(opt('max')) || 4, wachtwoord: ww, upnp: args.includes('--upnp') }); }
  catch (e) { console.error('De gastheer kon niet starten: ' + (e && e.message ? e.message : e)); process.exit(1); }
  console.log('Koploze gastheer gestart (#450).');
  console.log('Koppelcode: ' + h.code);
  if (h.lanCode && h.lanCode !== h.code) console.log('In het eigen netwerk: ' + h.lanCode);
  console.log(`Wachtwoord: ${ww ? 'ja' : 'nee'}. Spelers: hoogstens ${h.world.coopNet.hub.roster.max}.`);
  console.log('Commando\'s: spelers, kick <plek>, verbied <plek>, wachtwoord <tekst>, wachtwoord uit, max <aantal>, stop');
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  let bezig = false;
  const stoppen = async () => {
    if (bezig) return; bezig = true;
    try { rl.close(); } catch (e) { /* al dicht */ }
    await h.stop();
    console.log('Gestopt.');
    process.exit(0);
  };
  rl.on('line', async (regel) => {
    const [cmd, ...rest] = regel.trim().split(/\s+/);
    const arg = rest.join(' ');
    if (!cmd) return;
    switch (cmd.toLowerCase()) {
      case 'spelers': {
        const lijst = h.spelers();
        console.log(lijst.length ? lijst.map((r) => `plek ${r.slot}: ${(r.avatar && r.avatar.naam) || r.naam || 'speler'} (${r.verbinding})`).join('\n') : 'Er is nu niemand.');
        break;
      }
      case 'kick': { const slot = Number(arg); console.log(h.kick(slot) ? `Plek ${slot} is verwijderd.` : 'Die plek bestaat niet.'); break; }
      case 'verbied': { const slot = Number(arg); console.log(h.verbied(slot) ? `Plek ${slot} is verwijderd en mag niet terugkomen.` : 'Die plek bestaat niet.'); break; }
      case 'wachtwoord':
        if (!arg || arg.toLowerCase() === 'uit') { h.zetWachtwoord(''); console.log('De sessie is weer open.'); }
        else { h.zetWachtwoord(arg); console.log('Het wachtwoord staat aan; wie al meespeelt blijft zitten.'); }
        break;
      case 'max': { const m = h.max(Number(arg)); console.log(m ? `Hoogstens ${m} spelers.` : 'Gebruik: max <aantal>.'); break; }
      case 'stop': case 'quit': case 'exit': await stoppen(); break;
      default: console.log('Onbekend commando. Gebruik: spelers, kick <plek>, verbied <plek>, wachtwoord <tekst>, wachtwoord uit, max <aantal>, stop');
    }
  });
  process.once('SIGINT', () => { stoppen(); });
  process.once('SIGTERM', () => { stoppen(); });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
