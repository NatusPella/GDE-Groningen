// De boerderij in de wereld (#415 stap 2): erf, machines en werktuigen verschijnen bij het erf, koppelen met E, aftakas en hef, veldwerk per cel, diesel,
// de aanhanger, en dat een gast er niets van doet.   node scripts/boerderijwereld_test.mjs
// Een nepwereld (vlak land, geen gebouwen) en een neptoetsenbord; schrijft nooit naar echte opslag.
import assert from 'node:assert/strict';
import './node3d.mjs';
const PC = await import('../game/js/percelen.js');
const B = await import('../game/js/boerderij.js');
const M = await import('../game/js/machines.js');
const WT = await import('../game/js/werktuigen.js');
const Live = await import('../game/js/boerderijlive.js');
const WW = await import('../game/js/boerderijwereld.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');
const { akkerRijen } = await import('../game/js/bietenrules.js');

let n = 0, fails = 0;
const t = async (name, fn) => { n++; try { await fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 4).join('\n  ')); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

const [ex, ey] = wgsToWorld(PC.erfDef(PC.START_ERF).lat, PC.erfDef(PC.START_ERF).lon);
const gedrukt = new Set();
const input = { wasPressed: (k) => gedrukt.has(k), consume: (k) => gedrukt.delete(k) };
const map = { groundHeightAt: () => 0, buildingsNear: () => [], nearestRoadPoint: (x, y) => ({ x, y }), spawnZ: () => 0 };
const msgs = [];
const w = { map, player: { x: ex, y: ey, angle: 0, inVehicle: null }, vehicles: [], money: 200000, input, time: 0, clock: 8, addMessage: (x) => msgs.push(x) };
const druk = (...k) => { for (const x of k) gedrukt.add(x); WW.interactBoerderijWereld(w); gedrukt.clear(); };
const tik = (s = 1, dt = 0.1) => { for (let i = 0; i < s / dt; i++) { w.time += dt; WW.updateBoerderijWereld(dt, w); } };
const laatste = () => msgs[msgs.length - 1] || '';

Live.zetBoerderijVoorTest(null, nepOpslag());
WW.resetBoerderijWereld();
const bd = () => Live.getBedrijf();
const koopCat = (type) => { const r = Live.koopMachineCat(w, type, PC.START_ERF); assert.ok(r.ok, r.reden); return r.uid; };

await t('bij het erf verschijnen het erf, de machines en de werktuigen; ver weg niet', () => {
  const trek = koopCat('trekker-klein'), ploeg = koopCat('ploeg-3'), kar = koopCat('aanhanger'), zaai = koopCat('zaaimachine');
  w.player.x = ex + 2000; w.player.y = ey;
  tik(1);
  assert.deepEqual(WW.boerderijWereldStand().voertuigen, []);
  w.player.x = ex + 20; w.player.y = ey + 30;
  tik(1);
  const st = WW.boerderijWereldStand();
  assert.deepEqual(st.voertuigen, [trek]); assert.equal(st.werktuigen.length, 3);
  assert.deepEqual(st.erven, [PC.START_ERF]);
  const v = w.vehicles.find((x) => x.farm === trek);
  assert.ok(v && v.playerOwned && v.model.name === 'tractor' && v.model.len === 3.9);
  // ver weg gaat het weer weg; terugkomen zet het op dezelfde plek
  const pos = { x: v.x, y: v.y };
  w.player.x = ex + 2000; tik(1);
  assert.equal(w.vehicles.length, 0);
  w.player.x = ex + 20; tik(1);
  const v2 = w.vehicles.find((x) => x.farm === trek);
  assert.ok(Math.hypot(v2.x - pos.x, v2.y - pos.y) < 0.01, 'terug op dezelfde plek');
  void ploeg; void kar; void zaai;
});

const stap = () => { const v = w.vehicles.find((x) => x.farm); return v; };
const stapIn = (v) => { w.player.inVehicle = v; v.driver = 'player'; w.player.x = v.x; w.player.y = v.y; };
const stapUit = (v) => { w.player.inVehicle = null; v.driver = null; };
const impPos = (uid) => { const i = WW._staat().werktuigen.get(uid); return i; };

await t('koppelen met E in de trekker bij het werktuig; niet te ver; niet twee; X koppelt los; te voet kan ook', () => {
  const v = stap();
  const werk = bd().machinepark.werktuigen;
  const ploeg = werk.find((x) => x.type === 'ploeg-3').uid;
  stapIn(v);
  // zet de trekker met zijn rug naar de ploeg, vlakbij
  const imp = impPos(ploeg);
  v.angle = 0; v.x = ex + 60; v.y = ey + 90; v.speed = 0;
  tik(0.6);
  assert.equal(WW.koppelKandidaat(w), null, 'het koppelpunt is te ver');
  v.angle = Math.PI; v.x = imp.x - (3.9 / 2 + 1.6 + 2);   // rug naar de ploeg, 2 m ervandaan
  v.y = imp.y;
  tik(0.6);
  const k = WW.koppelKandidaat(w);
  assert.ok(k && k.imp.uid === ploeg, 'de ploeg is te koppelen');
  assert.equal(WW.boerderijPrompt(w).key, 'E');
  druk('e');
  assert.match(laatste(), /Ploegbaas 3-schaar gekoppeld/);
  assert.equal(WW.boerderijWereldStand().rigs[v.farm].werktuig, ploeg);
  druk('e');                                       // nog eens E koppelt niets en laat je niet uitstappen?  Er is geen kandidaat meer: E blijft voor de rest
  tik(0.5);
  // het werktuig hangt achter de trekker
  const i2 = impPos(ploeg);
  assert.ok(Math.hypot(i2.x - v.x, i2.y - v.y) > 3 && Math.hypot(i2.x - v.x, i2.y - v.y) < 6);
  // hef en aftakas
  assert.equal(WW.boerderijWereldStand().rigs[v.farm].hef, 'omhoog');
  druk('t'); assert.equal(WW.boerderijWereldStand().rigs[v.farm].hef, 'omlaag');
  druk('g'); assert.match(laatste(), /aftakas/i); assert.equal(WW.boerderijWereldStand().rigs[v.farm].pto, false, 'de ploeg heeft geen aftakas');
  druk('t'); assert.equal(WW.boerderijWereldStand().rigs[v.farm].hef, 'omhoog');
  v.speed = 3; druk('x'); assert.match(laatste(), /stil/);
  v.speed = 0; druk('x');
  assert.equal(WW.boerderijWereldStand().rigs[v.farm].werktuig, null); assert.match(laatste(), /losgekoppeld/);
  // te voet: de speler staat bij de ploeg, de trekker er vlakbij
  stapUit(v);
  const i3 = impPos(ploeg);
  w.player.x = i3.x + 1.5; w.player.y = i3.y;
  tik(0.6);
  assert.ok(WW.koppelKandidaat(w), 'te voet koppelen kan'); druk('e');
  assert.equal(WW.boerderijWereldStand().rigs[v.farm].werktuig, ploeg);
  druk('e'); assert.equal(WW.boerderijWereldStand().rigs[v.farm].werktuig, null, 'tweede E te voet maakt los');
  // staat de speler bij de trekker en is het werktuig verder weg, dan is er niets te koppelen: E stapt dan in de trekker
  const o = impPos(ploeg); o.x = v.x + 6; o.y = v.y; w.player.x = v.x + 2.6; w.player.y = v.y; tik(0.6);
  assert.equal(WW.koppelKandidaat(w), null, 'bij de trekker stapt E in');
});

// een trekker die de rijen van het veld rijdt met het werktuig achter zich
function rijRijen(v, rig, { speed = 4, hoogte = 'omlaag', pto = null } = {}) {
  const b = Live.getBoerderij();
  const pos = B.veldPositie(b, b.bedrijf.actief);
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  const imp = WW._staat().werktuigen.get(rig.werktuig);
  const d = WT.WERKTUIG[imp.type];
  for (const r of rijen) {
    const ang = Math.atan2(r.uy, r.ux);
    const af = v.model.len / 2 + 0.3 + d.achter - 0.3;
    for (let l = -6; l <= 106; l += speed * 0.1) {
      const px = r.ax + r.ux * l, py = r.ay + r.uy * l;       // het midden van het werktuig
      v.angle = ang; v.x = px + Math.cos(ang) * af; v.y = py + Math.sin(ang) * af; v.speed = speed;
      w.time += 0.1; WW.updateBoerderijWereld(0.1, w);
      if (!WW._staat().werk && B.fase(b) !== 'braak' && hoogte === 'omlaag' && rig.hef) { /* klaar of nog niet begonnen */ }
    }
  }
}

await t('veldwerk: ploegen met trekker en ploeg verandert het veld; zonder hef omlaag gebeurt er niets; materiaal en diesel kosten geld', () => {
  const b = Live.getBoerderij(), v = stap(), rig = WW._staat().rigs.get(v.farm);
  const ploeg = bd().machinepark.werktuigen.find((x) => x.type === 'ploeg-3').uid;
  Live.zetVeldPositie(PC.START_PERCEEL, { x: ex + 150, y: ey, a: 0.3 });
  w.player.x = ex + 150; w.player.y = ey;
  stapIn(v);
  const imp = impPos(ploeg); v.angle = Math.PI; v.x = imp.x - 3.55 - 0.5; v.y = imp.y; tik(0.6);
  druk('e');
  assert.equal(rig.werktuig, ploeg);
  tik(1);
  assert.equal(B.fase(b), 'braak');
  // hef omhoog: er gebeurt niets
  rijRijen(v, rig);
  assert.equal(B.fase(b), 'braak'); assert.equal(WW.boerderijWereldStand().werk, null);
  assert.match(msgs.join('|'), /hef omlaag/);
  druk('t');
  const geld = w.money, brandstof = M.vind(bd(), v.farm).brandstof, slijtage = M.vind(bd(), v.farm).slijtage;
  rijRijen(v, rig);
  assert.equal(B.fase(b), 'geploegd', msgs.slice(-3).join('|'));
  assert.ok(b.veld.bodem > 0.9, String(b.veld.bodem));
  assert.match(msgs.join('|'), /Geploegd/);
  assert.equal(w.money, geld, 'ploegen kost met je eigen ploeg geen huur of materiaal');
  const m = M.vind(bd(), v.farm);
  assert.ok(m.brandstof < brandstof && m.slijtage > slijtage, 'diesel en slijtage lopen op');
  assert.ok(m.uren > 0);
});

await t('cultiveren, zaaien (aftakas nodig), bemesten en spuiten met de juiste werktuigen; verkeerd werktuig voor het gewas kan niet', () => {
  const b = Live.getBoerderij(), v = stap(), rig = WW._staat().rigs.get(v.farm);
  const park = () => bd().machinepark.werktuigen;
  const wissel = (type) => {
    M.vind(bd(), v.farm).brandstof = 90; v.speed = 0; druk('x');
    const uid = park().find((x) => x.type === type).uid;
    const imp = impPos(uid);
    v.angle = Math.PI; v.x = imp.x - 3.55 - 0.5; v.y = imp.y; tik(0.6);
    druk('e'); assert.equal(rig.werktuig, uid, type);
  };
  // zaaien kan zonder cultivator (de cultivator is niet gekocht); koop hem en doe het netjes
  koopCat('cultivator'); koopCat('mestwaaier'); koopCat('spuit'); koopCat('maaier');
  tik(1);
  wissel('cultivator');
  druk('t');
  rijRijen(v, rig);
  assert.ok(b.veld.cult > 0.9, 'gecultiveerd: ' + b.veld.cult);
  assert.equal(B.fase(b), 'geploegd');
  druk('t');
  // zaaien: hef omlaag en aftakas aan
  wissel('zaaimachine');
  druk('t');
  rijRijen(v, rig);
  assert.equal(B.fase(b), 'geploegd', 'zonder aftakas wordt er niet gezaaid');
  druk('g');
  w.money = 40;                         // precies genoeg voor het zaaigoed: het werk mag niet stoppen omdat het geld op is
  const geld = w.money;
  rijRijen(v, rig);
  assert.equal(B.fase(b), 'groeit'); assert.equal(b.veld.gewas, 'aardappelen');
  assert.equal(w.money, geld - 40, 'zaaigoed kost €40, geen huur');
  w.money = 200000;
  druk('t'); druk('g');
  wissel('mestwaaier'); druk('g');
  const g2 = w.money;
  rijRijen(v, rig);
  assert.ok(b.veld.mest > 0.9); assert.equal(w.money, g2 - 25);
  druk('g');
  wissel('spuit'); druk('g');
  rijRijen(v, rig);
  assert.ok(b.veld.spuit > 0.9);
  druk('g');
  // oogsten met de maaier kan niet (gras) en de maaidorser is er nog niet
  B.tikUren(b, 100);
  wissel('maaier'); druk('t'); druk('g');
  const voorMsg = msgs.length;
  rijRijen(v, rig);
  assert.equal(B.fase(b), 'rijp'); assert.match(msgs.slice(voorMsg).join('|'), /maaidorser/);
  druk('t'); druk('g');
});

await t('oogsten met de maaidorser, laden bij je erf, leveren met de aanhanger bij de afnemer', () => {
  const b = Live.getBoerderij();
  const trekker = stap();
  stapUit(trekker);
  const dorserUid = koopCat('laadmachine');
  void dorserUid;
  const dorser = koopCat('maaidorser');
  tik(1);
  const dv = w.vehicles.find((x) => x.farm === dorser);
  assert.ok(dv && dv.model.name === 'maaidorser' && dv.model.len > 7);
  stapIn(dv);
  const rig = WW._staat().rigs.get(dorser);
  druk('t'); druk('g');
  assert.equal(rig.hef, 'omlaag'); assert.equal(rig.pto, true);
  const pos = B.veldPositie(b, b.bedrijf.actief);
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  const geld = w.money;
  for (const r of rijen) {
    const ang = Math.atan2(r.uy, r.ux);
    for (let l = -6; l <= 106; l += 0.4) { const px = r.ax + r.ux * l, py = r.ay + r.uy * l; dv.angle = ang; dv.x = px - Math.cos(ang) * (dv.model.len / 2 - 0.5); dv.y = py - Math.sin(ang) * (dv.model.len / 2 - 0.5); dv.speed = 4; w.time += 0.1; WW.updateBoerderijWereld(0.1, w); }
  }
  assert.ok(b.schuur.kg > 1000, 'oogst in de schuur: ' + b.schuur.kg);
  assert.equal(B.fase(b), 'braak');
  assert.equal(w.money, geld, 'geen kosten voor het oogsten');
  const kg = b.schuur.kg;
  // laden: de aanhanger achter de trekker, bij het erf
  stapUit(dv); dv.speed = 0;
  const v = trekker; stapIn(v); v.speed = 0; druk('x');
  const rigT = WW._staat().rigs.get(v.farm);
  const kar = bd().machinepark.werktuigen.find((x) => x.type === 'aanhanger').uid;
  const i = impPos(kar); v.angle = Math.PI; v.x = i.x - 3.55 - 0.5; v.y = i.y; v.speed = 0; tik(0.6);
  druk('e'); assert.equal(rigT.werktuig, kar);
  v.x = ex; v.y = ey + 20; v.speed = 0; tik(0.6);
  assert.equal(WW.boerderijPrompt(w).label, 'Aanhanger laden');
  druk('e');
  assert.equal(rigT.lading.kg, Math.min(kg, WT.AANHANGER_KG)); assert.equal(b.schuur.kg, kg - rigT.lading.kg);
  // te hard rijden morst
  v.speed = 12; tik(2); assert.ok(rigT.lading.kwaliteit < 1);
  // bij de afnemer
  const a = WW._staat().afnemers.get(rigT.lading.gewas);
  assert.ok(a, 'de afnemer is op een weg gelegd');
  v.x = a.x + 3; v.y = a.y; v.speed = 0; tik(0.6);
  assert.equal(WW.boerderijPrompt(w).label, 'Lading lossen');
  const g3 = w.money;
  druk('e');
  assert.ok(w.money > g3); assert.equal(rigT.lading, null); assert.match(laatste(), /afgeleverd/);
  assert.ok(b.boek.velden[PC.START_PERCEEL].omzet > 0, 'de omzet staat bij het veld');
});

await t('diesel: een lege tank maakt de machine traag, R tankt bij het dieselvat (goedkoop) en bij een pomp niet als die er niet is', () => {
  const v = stap();
  stapIn(v);
  const m = M.vind(bd(), v.farm);
  m.brandstof = 0.001;
  v.speed = 4; tik(2, 0.5);
  assert.equal(m.brandstof, 0);
  tik(0.6);
  assert.ok(v.model.maxSpeed <= 0.7, 'kruipt: ' + v.model.maxSpeed);
  assert.match(msgs.join('|'), /zonder diesel/);
  v.x = ex + 100; v.y = ey + 100; v.speed = 0;
  druk('r'); assert.match(laatste(), /dieselvat|pomp/);
  const vat = WW.dieselvatPlek(WW._staat().erven.get(PC.START_ERF));
  v.x = vat.x + 2; v.y = vat.y; v.speed = 0; tik(0.6);
  const geld = w.money;
  assert.equal(WW.boerderijPrompt(w).key, 'R');
  druk('r');
  assert.ok(m.brandstof > 80 && geld - w.money === Math.round(m.brandstof * M.DIESEL_ERF * 1) || geld - w.money > 100, `getankt ${m.brandstof} voor ${geld - w.money}`);
  tik(0.6);
  assert.ok(v.model.maxSpeed > 5, 'weer vol vermogen: ' + v.model.maxSpeed);
  m.slijtage = 100; tik(1);
  assert.ok(v.model.maxSpeed <= 0.7, 'versleten machine kruipt');
  stapUit(v);
});

await t('samen spelen: een gast bestuurt de tweede trekker op jouw akker; koppelen, hef en aftakas gaan vanzelf; zijn werk levert hem een deel op', async () => {
  const CB = await import('../game/js/coopbestuur.js');
  Live.verkoopMachineCat(w, bd().machinepark.machines.find((x) => x.type === 'laadmachine').uid);   // een plek vrij
  const uid2 = koopCat('trekker-groot');
  const deel = [], meld = [];
  w.coopDeel = (bedrag, info) => deel.push({ bedrag, info }); w.coopMeld = (slot, tekst) => meld.push({ slot, tekst });
  w.player.inVehicle = null; w.player.x = ex + 150; w.player.y = ey + 30;
  tik(1);
  const g = w.vehicles.find((x) => x.farm === uid2);
  assert.ok(g, 'de tweede trekker staat in de wereld');
  assert.equal(CB.weigerReden(g), null, 'een gast mag een machine van de boerderij besturen (geen diefstal)');
  assert.equal(CB.weigerReden({ playerOwned: true }), 'niet', 'andere eigen voertuigen van de host blijven dicht');
  const b = Live.getBoerderij();
  assert.equal(B.fase(b), 'braak');
  const ploeg = bd().machinepark.werktuigen.find((x) => x.type === 'ploeg-3').uid;
  const imp = impPos(ploeg);
  let k = 1; for (const o of WW._staat().werktuigen.values()) if (o.uid !== ploeg && !WW._staat().rigs.get('x')) { o.x += 30 * k; o.y += 30; k++; }   // de andere werktuigen staan elders: alleen de ploeg is dichtbij
  g.driver = 'player'; g.coopBestuurder = 2; g.angle = Math.PI; g.x = imp.x - 3.75 - 0.6; g.y = imp.y; g.speed = 0;
  const hostMsgs = msgs.length;
  tik(1);
  const rig = WW._staat().rigs.get(uid2);
  assert.equal(rig.werktuig, ploeg, 'het werktuig vlak achter zijn trekker is vanzelf gekoppeld');
  assert.ok(meld.some((m) => m.slot === 2 && /gekoppeld/.test(m.tekst)), 'de melding gaat naar de gast');
  assert.equal(msgs.length, hostMsgs, 'de host krijgt zijn melding niet');
  M.vind(bd(), uid2).brandstof = 100;
  rijRijen(g, rig);
  assert.equal(B.fase(b), 'geploegd', 'de gast ploegde zonder toetsen: ' + JSON.stringify(meld.slice(-3)));
  assert.equal(rig.hef, 'omlaag', 'op het veld staat de hef vanzelf omlaag');
  assert.ok(deel.length === 1 && deel[0].bedrag > 0 && deel[0].info.vak === 'landbouw', JSON.stringify(deel));
  g.x = ex + 400; g.y = ey + 400; g.speed = 3; tik(0.6);
  assert.equal(rig.hef, 'omhoog', 'van het veld af gaat de hef omhoog');
  g.driver = null; g.coopBestuurder = 0; g.speed = 0;
  // de host tankt de machine van de gast te voet bij het dieselvat
  const vat = WW.dieselvatPlek(WW._staat().erven.get(PC.START_ERF));
  g.x = vat.x + 3; g.y = vat.y; w.player.x = vat.x + 2; w.player.y = vat.y + 1; M.vind(bd(), uid2).brandstof = 10; tik(0.6);
  druk('r');
  assert.ok(M.vind(bd(), uid2).brandstof > 100, 'R te voet tankt de machine naast je: ' + M.vind(bd(), uid2).brandstof);
  w.coopDeel = null; w.coopMeld = null;
});

await t('een gast bestuurt en ziet de boerderij van de gastheer niet; een verkochte of teruggebrachte machine verdwijnt uit de wereld', () => {
  const gast = { ...w, coopRole: 'client' };
  const voor = JSON.stringify(WW.boerderijWereldStand());
  WW.updateBoerderijWereld(0.5, gast);
  assert.equal(JSON.stringify(WW.boerderijWereldStand()), voor);
  assert.equal(WW.boerderijPrompt(gast), null);
  const uid = bd().machinepark.machines.find((x) => x.type === 'trekker-klein').uid;
  assert.ok(Live.verkoopMachineCat(w, uid).ok);
  tik(1);
  assert.equal(w.vehicles.filter((x) => x.farm === uid).length, 0);
  assert.equal(WW.boerderijWereldStand().voertuigen.includes(uid), false);
  assert.equal(WW.boerderijWereldStand().rigs[uid], undefined);
});

await t('elk gewas heeft een afnemerplek', () => {
  for (const id of B.GEWAS_IDS) assert.ok(WW.afnemerPlek(w, id), `geen afnemerplek voor ${id}`);
});

console.log(`boerderijwereld_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
