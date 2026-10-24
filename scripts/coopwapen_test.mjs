// Samen spelen (#434): een gast met een wapen. De aanvalsknop in de invoer, de klok die gast en host gelijk houdt, het bericht 'wapen',
// de aanval van de host vanuit het lichaam van de gast (combat.js gastAanvalUitvoeren: schade, kogels, misdaad van de gast), de kogels van
// de politie die een gast raken en wapen en aanval in het snapshot (game/js/coopwapen.js, coopspeler.js, coopnet.js, combat.js).
import './node3d.mjs';
import assert from 'node:assert/strict';
import * as W from '../game/js/coopwapen.js';
import * as S from '../game/js/coopspeler.js';
import * as C from '../game/js/coopclient.js';
import * as B from '../game/js/coopbestuur.js';
import * as N from '../game/js/coopnet.js';
import { WEAPONS } from '../game/js/weapons.js';
const { gastAanvalUitvoeren, gastSlagLanding, updateBullets } = await import('../game/js/combat.js');
const { CODEC_VERSION } = await import('../game/js/net/codec.js');
const { PROTO } = await import('../game/js/net/protocol.js');

let n = 0;
const t = (name, f) => { f(); n++; };

t('de aanvalsknop is een eigen bit in de invoer, naast rennen, handrem, springen en bukken', () => {
  assert.equal(S.KNOP_AANVAL, 16);
  assert.equal(S.knoppen({ aanval: true }), 16);
  assert.equal(S.knoppen({ rennen: true, springen: true, bukken: true, handrem: true, aanval: true }), 31);
  assert.equal(C.makeClientInput([0, 0], false, 1, false, false, false, true).buttons, 16);
  assert.equal(C.makeClientInput([0, 0], true, 1).buttons, 1, 'zonder aanval blijft alles zoals het was');
  const sp = S.stapSprong({}, 16, 0.016); assert.equal(sp.z, 0); assert.equal(sp.bukt, false, 'de aanvalsknop springt of bukt niet');
});

t('stapAanvalKlok: koelt af, telt patronen, leeg is een klik, een slagwapen raakt nooit op', () => {
  const k = { timer: 0 };
  let r = W.stapAanvalKlok(k, 0.016, true, 'pistol', 2);
  assert.deepEqual([r.schiet, r.n], [true, 1]);
  r = W.stapAanvalKlok(k, 0.016, true, 'pistol', 1); assert.equal(r.schiet, false, 'nog niet afgekoeld');
  r = W.stapAanvalKlok(k, WEAPONS.pistol.cooldown, true, 'pistol', 1); assert.deepEqual([r.schiet, r.n], [true, 0]);
  r = W.stapAanvalKlok(k, WEAPONS.pistol.cooldown, true, 'pistol', 0); assert.deepEqual([r.schiet, r.klik], [false, true]);
  r = W.stapAanvalKlok(k, 0.1, true, 'pistol', 0); assert.equal(r.klik, false, 'het klikje komt niet elk beeld');
  const m = { timer: 0 }; r = W.stapAanvalKlok(m, 0.016, true, 'knuppel', 1); assert.deepEqual([r.schiet, r.n], [true, 1], 'een slagwapen verbruikt niets');
  r = W.stapAanvalKlok({ timer: 0 }, 0.016, true, 'fists', Infinity); assert.equal(r.schiet, true);
  r = W.stapAanvalKlok({ timer: 0 }, 0.016, false, 'pistol', 5); assert.equal(r.schiet, false, 'zonder knop geen schot');
  assert.equal(W.stapAanvalKlok({ timer: 0 }, 0.016, true, 'bestaatniet', 5).schiet, false);
});

t('het bericht wapen: alleen wat een gast kan overlaten, begrensd', () => {
  assert.deepEqual(W.wapenEvent('pistol', 12), { k: 'wapen', w: 'pistol', n: 12 });
  assert.deepEqual(W.wapenEvent('fists', Infinity), { k: 'wapen', w: 'fists', n: -1 });
  assert.equal(W.wapenEvent('waterpistool', 50).w, '', 'spuiten en gooien blijven bij het eigen spel');
  assert.equal(W.wapenEvent('vuurwerk', 3).w, ''); assert.equal(W.wapenEvent('carbidbus', 3).w, '');
  assert.equal(W.wapenEvent('pistol', 1e9).n, W.MAX_PATRONEN);
  assert.deepEqual(W.leesWapen({ k: 'wapen', w: 'uzi', n: 30 }), { w: 'uzi', n: 30 });
  assert.deepEqual(W.leesWapen({ k: 'wapen', w: 'fists', n: -1 }), { w: 'fists', n: Infinity });
  assert.deepEqual(W.leesWapen({ k: 'wapen', w: 'rakket', n: 5 }), { w: '', n: 5 }, 'een onbekend wapen is niets');
  assert.equal(W.leesWapen({ k: 'ping' }), null); assert.equal(W.leesWapen(null), null);
  assert.ok(JSON.stringify(W.wapenEvent('jachtgeweer', 9999)).length < 60);
});

// een gast met een invoer zoals main.js hem heeft
const invoer = (o = {}) => { const down = new Set(o.toetsen || []); return { mouse: { down: !!o.muis, wheel: o.wiel || 0 }, wasPressed: (k) => (o.druk || []).includes(k), isDown: (k) => down.has(k) }; };
t('de gast kiest zijn wapen (1 tot 4, muiswiel) uit zijn eigen bezit en meldt het aan de host', () => {
  const verstuurd = [];
  const w = { input: invoer({ druk: ['2'] }), ammo: { pistol: 6, uzi: 40, knuppel: 1 }, weapon: 'fists', player: { x: 5, y: 5, angle: 0 } };
  W.gastWapenTik(w, 0.016, (ev) => verstuurd.push(ev));
  assert.equal(w.weapon, 'pistol'); assert.equal(W.kiesSlot(w, 2), true); assert.equal(w.weapon, 'uzi', 'dezelfde toets: het volgende wapen van dat slot');
  assert.equal(W.kiesSlot(w, 3), false, 'geen lang geweer in bezit: niets verandert'); assert.equal(w.weapon, 'uzi');
  assert.ok(verstuurd.length >= 1 && verstuurd[0].k === 'wapen' && verstuurd[0].w === 'pistol' && verstuurd[0].n === 6, 'het eerste bericht: wat je hebt');
  const eerder = verstuurd.length; W.gastWapenTik(w, 0.016, (ev) => verstuurd.push(ev)); W.gastWapenTik(w, 0.016, (ev) => verstuurd.push(ev));
  assert.equal(verstuurd.length - eerder, 1, 'daarna alleen bij een wisseling (uzi), niet elk beeld');
  w.input = invoer({ wiel: 130 }); const v0 = w.weapon; W.gastWapenTik(w, 0.016, () => {}); assert.notEqual(w.weapon, v0, 'het muiswiel wisselt');
  assert.equal(W.heeftWapen(w, 'pistol'), true); assert.equal(W.heeftWapen(w, 'shotgun'), false);
  w.ammo.pistol = 0; assert.equal(W.heeftWapen(w, 'pistol'), true, 'leeg maar nog van jou'); assert.equal(W.heeftPatronen(w, 'pistol'), false);
});

t('de gast: muisknop is de aanvalsknop, patronen gaan af, in een menu, voertuig of activiteit niet', () => {
  const effecten = [];
  W.zetGastWapenHaken({ effect: (w, key) => effecten.push(key), geluid: () => {} });
  const mk = (o = {}) => ({ input: invoer({ muis: true }), ammo: { pistol: 3 }, weapon: 'pistol', player: { x: 1, y: 1, angle: 0 }, time: 0, ...o });
  let w = mk(); const verstuurd = [];
  assert.equal(W.gastWapenTik(w, 0.016, (e) => verstuurd.push(e)), true); assert.equal(w.coopAanvalKnop, true); assert.equal(w.ammo.pistol, 2); assert.deepEqual(effecten, ['pistol']);
  W.gastWapenTik(w, 0.1, () => {}); assert.equal(w.ammo.pistol, 2, 'afkoelen');
  W.gastWapenTik(w, 0.3, () => {}); assert.equal(w.ammo.pistol, 1);
  w = mk({ paused: true }); assert.equal(W.gastWapenTik(w, 0.016, () => {}), false); assert.equal(w.ammo.pistol, 3, 'in een menu schiet je niet');
  w = mk({ coopInVoertuig: true }); assert.equal(W.gastWapenTik(w, 0.016, () => {}), false);
  w = mk({ coopBezig: 'hengelen' }); assert.equal(W.gastWapenTik(w, 0.016, () => {}), false);
  w = mk({ weapon: 'waterpistool', ammo: { waterpistool: 100 }, addMessage: (t) => { w.melding = t; } }); assert.equal(W.gastWapenTik(w, 0.016, () => {}), false); assert.equal(w.melding, W.WAPEN_TEKST.alleenEigen);
  w = mk({ weapon: 'fists', ammo: {} }); assert.equal(W.gastWapenTik(w, 0.016, () => {}), true); assert.equal(w.ammo.fists, undefined, 'vuisten hebben geen patronen');
  W.zetGastWapenHaken({ effect: null, geluid: null });
  W.gastWapenWeg(w); assert.equal(w.coopAanvalKnop, false); assert.equal(w.coopGastWapen, null);
});

// een host met een gast als figuur (plek 2) of als metgezel (plek 1)
const hostWereld = (extra = {}) => ({ time: 10, coop: { remote: true, remoteInput: null }, companion: { x: 0, y: 0, angle: 0, gz: 0 }, coopFigures: { 2: { slot: 2, x: 10, y: 10, angle: 0, gz: 0, input: null, char: 'a' } }, pedestrians: [], vehicles: [], bullets: [], particles: [], stats: { kills: 0, copKills: 0, pedKills: 0 }, wanted: 0, ...extra });
t('wapenTick (host): de knop in de invoer van de gast is een aanval vanuit zijn lichaam, met zijn kijkrichting, zijn patronen en zijn klok', () => {
  const calls = [];
  W.zetWapenHaken({ aanval: (w, slot, l, key, hoek) => { calls.push([slot, key, hoek, l.x, l.y]); return { fx: { type: 'muzzle' } }; }, landing: null });
  const w = hostWereld();
  assert.equal(W.wapenVerwerk(w, 2, { k: 'wapen', w: 'pistol', n: 2 }), true);
  assert.equal(W.wapenVerwerk(w, 0, { k: 'wapen', w: 'pistol', n: 2 }), false, 'plek 0 is de host zelf');
  const f = w.coopFigures[2]; f.input = { mx: 0, my: 0, buttons: 16, yaw: 1.25 };
  assert.equal(W.wapenTick(w, 0.016), 1);
  assert.deepEqual(calls[0], [2, 'pistol', 1.25, 10, 10]); assert.equal(f.angle, 1.25, 'hij kijkt waar zijn camera heen kijkt');
  assert.equal(W.wapens(w)[2].n, 1); assert.equal(f.coopWapen, 'pistol'); assert.equal(f.coopFx.type, 'muzzle');
  assert.equal(W.wapenTick(w, 0.1), 0, 'afkoelen'); w.time += 0.4; assert.equal(W.wapenTick(w, 0.4), 1); assert.equal(W.wapens(w)[2].n, 0);
  w.time += 0.4; assert.equal(W.wapenTick(w, 0.4), 0, 'leeg: geen schot'); assert.equal(calls.length, 2);
  f.input = { mx: 0, my: 0, buttons: 0, yaw: 0 }; w.time += 5; W.wapenTick(w, 0.016); assert.equal(f.coopFx, null, 'na een tijd is de zwaai weg');
  // het snapshot: wapen en laatste aanval van de gast, in de bytes die er al waren
  const rec = N.spelerRecord(w, f, 2); assert.equal(rec.weapon, S.wapenCode('pistol'));
  assert.ok(rec.attack === 0 || rec.attack > 0);
  w.time = 20; W.zetWapen(w, 2, 'pistol', 5); f.input = { mx: 0, my: 0, buttons: 16, yaw: 0 }; W.wapenTick(w, 0.5);
  const rec2 = N.spelerRecord(w, f, 2); assert.ok(rec2.attack > 0, 'een verse aanval staat in het snapshot'); assert.equal(S.leesAanval(rec2.attack).type, 'muzzle');
  const zit = { ...f, inVeh: {} }; assert.equal(N.spelerRecord(w, zit, 2).weapon, 0, 'in een voertuig geen wapen in de hand');
  W.wapenWeg(w, 2); assert.equal(f.coopWapen, undefined); assert.equal(W.wapenVan(w, 2), null);
  W.zetWapenHaken({ aanval: null, landing: null });
});
t('wapenTick: de gast als metgezel (plek 1), een slag met uithalen landt later, in een voertuig of een pauze niets', () => {
  const calls = [], landing = [];
  W.zetWapenHaken({ aanval: (w, slot, l, key, hoek) => { calls.push(slot); return { fx: { type: 'melee', swing: 'bat' }, wacht: { at: w.time + 0.14, angle: hoek, key } }; }, landing: (w, slot, l, wacht) => landing.push([slot, wacht.key]) });
  const w = hostWereld(); W.zetWapen(w, 1, 'knuppel', Infinity);
  w.coop.remoteInput = { mx: 0, my: 0, buttons: 16, yaw: 0.5 };
  assert.equal(W.wapenTick(w, 0.016), 1); assert.equal(landing.length, 0, 'nog aan het uithalen');
  w.time += 0.2; W.wapenTick(w, 0.2); assert.deepEqual(landing, [[1, 'knuppel']]); assert.equal(w.companion.coopFx.swing, 'bat');
  w.time += 2; w.companion.inVehicle = {}; assert.equal(W.wapenTick(w, 1), 0, 'in een voertuig slaat hij niet'); assert.equal(w.companion.coopWapen, '');
  w.companion.inVehicle = null; w.paused = true; assert.equal(W.wapenTick(w, 1), 0, 'de wereld staat stil'); w.paused = false;
  w.coopHold = true; assert.equal(W.wapenTick(w, 1), 0); w.coopHold = false;
  w.companion.coopWacht = true; w.time += 2; assert.equal(W.wapenTick(w, 1), 0, 'de wereld rond hem wordt nog geladen'); w.companion.coopWacht = false;
  W.zetWapenHaken({ aanval: null, landing: null });
});

t('handleEvent: wapen komt alleen bij de host van een gast; schade komt alleen bij een gast en laat hem niet omvallen', () => {
  const w = hostWereld({ coopNet: { role: 'host' } });
  assert.equal(N.handleEvent(w, { k: 'wapen', w: 'uzi', n: 20 }, 2), true); assert.equal(W.wapens(w)[2].w, 'uzi');
  assert.equal(N.handleEvent(w, { k: 'wapen', w: 'uzi', n: 20 }, 0), false, 'van de host zelf telt niet');
  const g = { coopNet: { role: 'client' }, health: 30, armor: 5 };
  assert.equal(N.handleEvent(g, { k: 'schade', n: 7 }, 0), true); assert.equal(g.armor, 0); assert.equal(g.health, 28);
  N.handleEvent(g, { k: 'schade', n: 500 }, 0); assert.equal(g.health, 1, 'je valt er niet door om: je blijft op 1');
  assert.equal(N.handleEvent({ coopNet: { role: 'host' }, health: 50 }, { k: 'schade', n: 7 }, 1), false);
  assert.equal(N.handleEvent(g, { k: 'schade', n: 'veel' }, 0), false);
});

// de echte combat.js met een gast als dader
const ped = (o = {}) => ({ x: 11, y: 10, health: 30, radius: 0.35, state: 'wander', isCop: false, ...o });
t('combat: een schot of slag van een gast raakt een voetganger en de misdaad is van de gast, niet van de host', () => {
  const misdaad = [];
  B.zetBestuurHaken({ misdaad: (w, slot, kind) => misdaad.push([slot, kind]) });
  const w = hostWereld({ map: null });
  // een slag met de vuisten, uit het lichaam van de gast (plek 2), op een voetganger die er nog tegen kan
  const p1 = ped({ health: 50 }); w.pedestrians.push(p1);
  const l = w.coopFigures[2];
  const r = gastAanvalUitvoeren(w, 2, l, 'fists', 0);
  assert.equal(r.fx.type, 'melee'); assert.ok(p1.health < 50, 'de klap landde: schade zoals bij de speler (12)'); assert.equal(p1.health, 50 - WEAPONS.fists.damage);
  assert.equal(w.stats.kills, 0, 'de teller van de speler blijft staan'); assert.deepEqual(misdaad, [], 'een klap die niet doodt is geen misdaad (zoals bij de speler)');
  // een dodelijke klap: een misdaad van de gast
  const p2 = ped({ health: 5, x: 10.8 }); w.pedestrians.length = 0; w.pedestrians.push(p2);
  gastAanvalUitvoeren(w, 2, l, 'fists', 0);
  assert.equal(p2.state, 'dead'); assert.deepEqual(misdaad, [[2, 'pedKill']]); assert.equal(w.wanted, 0, 'de host wordt niet gezocht'); assert.equal(w.stats.pedKills, 0);
  // een knuppel haalt eerst uit en landt later
  const p3 = ped({ health: 100 }); w.pedestrians.length = 0; w.pedestrians.push(p3);
  const k = gastAanvalUitvoeren(w, 2, l, 'knuppel', 0); assert.ok(k.wacht && k.wacht.at > w.time); assert.equal(p3.health, 100);
  assert.equal(gastSlagLanding(w, 2, l, k.wacht), true); assert.equal(p3.health, 100 - WEAPONS.knuppel.damage);
  // een agent doodslaan: een eigen gezocht-niveau van +2
  const cop = ped({ isCop: true, health: 5 }); w.pedestrians.length = 0; w.pedestrians.push(cop); misdaad.length = 0;
  gastAanvalUitvoeren(w, 2, l, 'fists', 0); assert.equal(cop.state, 'dead'); assert.equal(w.coopWanted[2], 2); assert.equal(w.wanted, 0); assert.deepEqual(misdaad, []);
  // een agent raken die blijft staan: de politie komt (copHit)
  const cop2 = ped({ isCop: true, health: 100 }); w.pedestrians.length = 0; w.pedestrians.push(cop2);
  gastAanvalUitvoeren(w, 2, l, 'fists', 0); assert.deepEqual(misdaad, [[2, 'copHit']]);
  assert.equal(gastAanvalUitvoeren(w, 2, l, 'waterpistool', 0), null, 'spuiten en gooien kan een gast niet'); assert.equal(gastAanvalUitvoeren(w, 2, l, 'bestaatniet', 0), null);
  B.zetBestuurHaken({ misdaad: null });
});
t('combat: de kogels van een gast vliegen vanuit zijn lichaam, dragen zijn plek en doden met de schade van het wapen', () => {
  const misdaad = [];
  B.zetBestuurHaken({ misdaad: (w, slot, kind) => misdaad.push([slot, kind]) });
  const w = hostWereld({ map: { buildingsNear: () => [], wallsNear: () => [] } });
  const l = w.coopFigures[2];
  const wa = WEAPONS.pistol;
  const r = gastAanvalUitvoeren(w, 2, l, 'pistol', 0);
  assert.equal(r.fx.type, 'muzzle'); assert.equal(w.bullets.length, 1);
  const b = w.bullets[0]; assert.equal(b.dader, 2); assert.equal(b.owner, 'player'); assert.equal(b.damage, wa.damage); assert.ok(Math.abs(b.vx) <= wa.speed + 1e-6 && b.vx > 0);
  assert.ok(Math.abs(b.x - l.x) < 1 && Math.abs(b.y - l.y) < 1, 'vanuit het lichaam van de gast');
  const sg = gastAanvalUitvoeren(w, 2, l, 'shotgun', 0); assert.equal(w.bullets.length, 1 + WEAPONS.shotgun.pellets); assert.ok(w.bullets.every((q) => q.dader === 2));
  assert.equal(sg.fx.type, 'muzzle');
  assert.equal(w.camKick, undefined, 'de camera van wie het spel opende schudt niet');
  // het schot raakt een voetganger voor het lichaam van de gast: dood = zijn misdaad
  w.bullets.length = 0; const p = ped({ health: 10, x: 14, y: 10 }); w.pedestrians.push(p);
  gastAanvalUitvoeren(w, 2, l, 'pistol', 0);
  for (let i = 0; i < 20 && w.bullets.length; i++) updateBullets(0.016, w);
  assert.equal(p.state, 'dead'); assert.deepEqual(misdaad, [[2, 'pedKill']]); assert.equal(w.stats.pedKills, 0);
  B.zetBestuurHaken({ misdaad: null });
});
t('combat: een kogel van de politie raakt een gast (de schade gaat als bericht naar hem), een kogel van de speler niet', () => {
  const w = hostWereld({ map: { buildingsNear: () => [], wallsNear: () => [] }, player: { x: -50, y: -50, radius: 0.4 } });
  const schade = []; w.coopSchade = (slot, d) => schade.push([slot, d]);
  w.bullets.push({ x: 8, y: 10, vx: 40, vy: 0, damage: 7, owner: 'police', range: 30, traveled: 0 });
  for (let i = 0; i < 10 && w.bullets.length; i++) updateBullets(0.016, w);
  assert.deepEqual(schade, [[2, 7]], 'de gast als figuur (plek 2)'); assert.equal(w.bullets.length, 0, 'de kogel is op');
  w.coopFigures[2].inVeh = {}; schade.length = 0;
  w.bullets.push({ x: 8, y: 10, vx: 40, vy: 0, damage: 7, owner: 'police', range: 30, traveled: 0 });
  for (let i = 0; i < 10 && w.bullets.length; i++) updateBullets(0.016, w);
  assert.deepEqual(schade, [], 'wie in een voertuig zit wordt niet als persoon geraakt');
  w.coopFigures[2].inVeh = null; w.bullets.push({ x: 8, y: 10, vx: 40, vy: 0, damage: 7, owner: 'player', range: 30, traveled: 0 });
  for (let i = 0; i < 10 && w.bullets.length; i++) updateBullets(0.016, w);
  assert.deepEqual(schade, [], 'de kogels van een speler raken geen medespeler');
  w.coopSchade = null; w.bullets.length = 0; w.bullets.push({ x: 8, y: 10, vx: 40, vy: 0, damage: 7, owner: 'police', range: 30, traveled: 0 });
  for (let i = 0; i < 10 && w.bullets.length; i++) updateBullets(0.016, w); // zonder haak (een spel zonder samen spelen) vliegt de kogel er gewoon langs
  assert.equal(w.bullets.length, 1);
});

t('wire: PROTO en CODEC_VERSION blijven 2, het bericht wapen is gewone JSON', () => {
  assert.equal(CODEC_VERSION, 2); assert.equal(PROTO, 2);
  assert.ok(JSON.stringify(W.wapenEvent('uzi', 40)).length < 40);
});

console.log(`coopwapen_test: ${n}/${n} ok`);
