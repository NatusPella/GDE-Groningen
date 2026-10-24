// Kaartjesknipper (#437): kaartjescontrole op het perron, treinloopbaan niveau 3.
import assert from 'node:assert/strict';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); }, clear() { mem.clear(); } };
const K = await import('../game/js/kaartjescontrole.js');
const LL = await import('../game/js/loopbaanlive.js');
const L = await import('../game/js/loopbaan.js');
const { reizigerPlekken } = await import('../game/js/stationlife.js');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const station = { name: 'Kropswolde', x: 100, y: 200, tx: 1, ty: 0, lijnen: [] };
const cur = (drukte) => ({ station, d: 5, view: { drukte } });
const plekken = reizigerPlekken(station, 16);
const maakWereld = (i = 0) => {
  const pressed = new Set(['e']);
  return {
    time: 1000, money: 100, msgs: [], addMessage(t) { this.msgs.push(t); },
    player: { x: plekken[i].x, y: plekken[i].y },
    input: { wasPressed: (k) => pressed.has(k), consume: (k) => pressed.delete(k) },
  };
};
const zetNiveau = (xp) => { const p = L.nieuwProfiel(); p.vakken.trein.xp = xp; LL.zetProfielVoorTest(p, null); };

// onder niveau 3 is er geen controle
K.resetControle();
zetNiveau(0);
let w = maakWereld(0);
ok(K.magControleren(w) === false && K.kaartjesPrompt(w, cur(8)) === null, 'niveau 1: geen kaartjescontrole');
zetNiveau(L.XP_DREMPELS[1]);
ok(K.kaartjesPrompt(w, cur(8)) === null, 'niveau 2: nog niet');

// Kaartjesknipper (niveau 3): prompt bij een reiziger op het perron
zetNiveau(L.XP_DREMPELS[2]);
ok(L.titelVan('trein', 3) === 'Kaartjesknipper' && K.magControleren(w), 'niveau 3 is Kaartjesknipper');
const tip = K.kaartjesPrompt(w, cur(8));
ok(tip && tip.key === 'E' && tip.label === 'Kaartje controleren' && /1 van 5/.test(tip.sub), 'tip: E, Kaartje controleren, 1 van 5');
ok(K.kaartjesPrompt(w, cur(1)) === null, 'één reiziger: geen opdracht');
ok(K.kaartjesPrompt(w, null) === null, 'geen station: geen tip');
ok(K.kaartjesPrompt({ ...w, player: { x: 0, y: 0 } }, cur(8)) === null, 'ver van het perron: geen tip');
w.player.inVehicle = {};
ok(K.kaartjesPrompt(w, cur(8)) === null, 'niet in een voertuig');
w.player.inVehicle = null;
ok(K.rondeDoel(K.perronReizigers(cur(3))) === 3 && K.rondeDoel(K.perronReizigers(cur(40))) === 5, 'doel: 5, of minder bij rust');

// een reiziger controleren: antwoord, punten, niet twee keer dezelfde
const xp0 = LL.getProfiel().vakken.trein.xp;
ok(K.tryControle(w, cur(8)) === true, 'E controleert');
ok(w.msgs.length === 1 && Object.values(K.ANTWOORDEN).includes(w.msgs[0]), 'een antwoord in het Nederlands');
ok(LL.getProfiel().vakken.trein.xp === xp0 + K.CONTROLE_XP_PER, 'punten per reiziger');
ok(K.kaartjesPrompt(w, cur(8)) === null || K.kaartjesPrompt(w, cur(8)).id !== 'kaartje-0', 'dezelfde reiziger niet nog eens');
ok(new Set(Array.from({ length: 16 }, (_, i) => K.uitkomst('Kropswolde', i))).size >= 2, 'wisselende antwoorden');
ok(K.uitkomst('Kropswolde', 3) === K.uitkomst('Kropswolde', 3), 'vast per reiziger');

// een volle ronde: loon en punten, daarna even rust op dit station
K.resetControle();
w = maakWereld(0);
const geld0 = w.money, xp1 = LL.getProfiel().vakken.trein.xp;
for (let i = 0; i < 5; i++) {
  w.player.x = plekken[i].x; w.player.y = plekken[i].y;
  w.input = { wasPressed: (k) => k === 'e', consume() {} };
  ok(K.controleer(w, cur(8)) === true, `reiziger ${i + 1} gecontroleerd`);
}
ok(w.money > geld0, 'loon voor de ronde');
ok(LL.getProfiel().vakken.trein.xp >= xp1 + 5 * K.CONTROLE_XP_PER + K.CONTROLE_XP, 'punten voor de ronde');
ok(w.msgs.some((m) => /Perron gecontroleerd in Kropswolde/.test(m)), 'melding met de plaats');
w.player.x = plekken[7].x; w.player.y = plekken[7].y;
ok(K.kaartjesPrompt(w, cur(8)) === null, 'na een ronde even rust');
w.time += K.CONTROLE_PAUZE_S + 1;
ok(K.kaartjesPrompt(w, cur(8)) !== null, 'na de pauze weer een ronde');

console.log(`kaartjescontrole_test: ${n}/${n} ok`);
