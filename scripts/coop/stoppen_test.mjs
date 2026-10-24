// Samen spelen (#448): host en gast stoppen midden in een opdracht (wegvallen, crash). Pure Node, geheugenopslag, nooit echte opslag.
// Elke speler schrijft zijn eigen save (checkpoint elke 60 s en bij een gelukte opdracht) met de echte schrijfweg (writeSlotRaw, herstelkopie).
//   node scripts/coop/stoppen_test.mjs
import assert from 'node:assert/strict';
import { writeSlotRaw, readSlot } from '../../game/js/saveslots.js';
import { applyGuestChanges } from '../../game/js/coopsave.js';
import { slotKey } from '../../game/js/storagekeys.js';
import { SAVE_VERSION } from '../../game/js/savemigrate.js';
import { ARC_ID } from '../../game/js/storyarc.js';
import { maakCheckpoint } from '../../game/js/coopcheckpoint.js';
import { beloningVoorGebeurtenis, maakBoekhouding, pasGebeurtenisToe } from '../../game/js/coopbeloning.js';

let n = 0;
async function t(naam, f) { await f(); n++; }
class Mem {
  constructor() { this.m = new Map(); this.stuk = false; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { if (this.stuk) throw new Error('schijf weg'); this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const startSave = (money) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 1, money, moneyBackup: money, speeltijd: 100, missions: { index: 1, completed: [0], seen: [0] }, character: 'tammo' });

// één speler: een eigen opslag, een eigen wereld (geld in het geheugen) en een eigen checkpointklok
function speler(rol, geld) {
  const ls = new Mem(); writeSlotRaw(ls, 1, JSON.stringify(startSave(geld)));
  const w = { rol, money: geld, opdrachten: 0, boek: maakBoekhouding(), cp: maakCheckpoint(60), levend: true };
  const schrijf = () => { // wat savegame.js doet: de host schrijft zijn hele stand, de gast alleen zijn eigen velden in zijn eigen save
    const r = readSlot(ls, 1); const data = r.data;
    const next = rol === 'client' ? applyGuestChanges(data, { money: w.money }, 0) : { ...data, money: w.money, moneyBackup: w.money, missions: { ...data.missions, completed: [...data.missions.completed, ...Array.from({ length: w.opdrachten }, (_, i) => 100 + i)] } };
    return next ? writeSlotRaw(ls, 1, JSON.stringify(next)) : true;
  };
  const tik = (dt) => { w.cp.opdrachtGelukt(w.opdrachten); if (w.cp.tik(dt) && w.levend) schrijf(); };
  // een beloning komt binnen: nooit twee keer dezelfde gebeurtenis
  const ontvang = (id, geld) => { if (!w.levend || !w.boek.claim(id)) return false; w.money += geld; return true; };
  return { ls, w, tik, schrijf, ontvang, op: () => readSlot(ls, 1).data };
}

function avond() {
  const h = speler('host', 1000), g = speler('client', 200), s = [h, g];
  let tijd = 0;
  return { h, g, tijd: () => tijd, loop(sec) { for (let i = 0; i < sec; i++) { tijd++; for (const x of s) x.tik(1); } }, opdrachtKlaar(id, totaal) {
    const r = beloningVoorGebeurtenis({ id, totaal, deelnemers: [0, 1] });
    h.ontvang(id, r.bedragen[0]); g.ontvang(id, r.bedragen[1]); h.w.opdrachten++; g.w.opdrachten++; return r;
  } };
}

await t('host en gast stoppen midden in de tweede opdracht: de beloning van de eerste staat in beide saves, de gast schrijft zelf', async () => {
  const a = avond();
  a.loop(100); // 100 s samen spelen, één checkpoint op 60 s
  const r = a.opdrachtKlaar('s:b:1', 600); // opdracht 1 lukt: 600 voor elke speler (geen verdeling, geen bonus)
  assert.deepEqual(r.bedragen, { 0: 600, 1: 600 });
  a.loop(1); // het checkpoint na de gelukte opdracht volgt meteen, niet pas na een minuut
  assert.equal(a.h.op().money, 1600); assert.equal(a.g.op().money, 800);
  a.loop(20); // opdracht 2 loopt, niemand schrijft iets nieuws (geen verandering)
  a.h.w.money += 40; a.g.w.money += 25; // iets verdiend midden in de opdracht, nog niet in een checkpoint
  a.h.w.levend = a.g.w.levend = false; // allebei weg zonder afscheid
  assert.equal(a.h.op().money, 1600, 'host: de beloning van opdracht 1 staat er, alleen de laatste seconden ontbreken'); assert.equal(a.g.op().money, 800);
  assert.equal(readSlot(a.g.ls, 1).state, 'ok'); assert.equal(readSlot(a.h.ls, 1).state, 'ok');
  assert.equal(a.h.op().missions.completed.length, 2); // de gelukte opdracht staat ook in de save van de host
});

await t('alleen de host valt weg: de gast houdt zijn geld en spoelt niets terug, en schrijft verder in zijn eigen save', async () => {
  const a = avond();
  a.loop(10); a.opdrachtKlaar('s:b:1', 400); a.loop(1);
  const gastVoor = a.g.op().money;
  a.h.w.levend = false;
  a.loop(125); // de gast speelt verder: twee checkpoints
  assert.equal(a.g.op().money, gastVoor);
  a.g.w.money += 30; a.loop(61);
  assert.equal(a.g.op().money, gastVoor + 30, 'het eigen checkpoint van de gast werkt zonder host');
});

await t('alleen de gast valt weg: het geld van de gast blijft, de host verliest niets', async () => {
  const a = avond();
  a.loop(5); a.opdrachtKlaar('s:b:1', 500); a.loop(1);
  a.g.w.levend = false; const hostVoor = a.h.op().money;
  a.loop(70);
  assert.equal(a.g.op().money, 200 + 500); assert.equal(a.h.op().money, hostVoor);
});

await t('dubbel toekennen: dezelfde gebeurtenis (ook na opnieuw sturen of herstart) geeft geen tweede keer geld', async () => {
  const a = avond();
  a.loop(1); a.opdrachtKlaar('s:b:1', 600); a.loop(1);
  assert.equal(a.g.ontvang('s:b:1', 600), false, 'opnieuw gestuurd binnen de sessie');
  assert.equal(a.g.w.money, 800);
  // na een crash komt de gast terug uit zijn save; het bericht wordt nog eens gestuurd: de id staat in zijn save, dus geen tweede keer
  const eerst = pasGebeurtenisToe(a.g.op(), 's:b:2', 450); assert.equal(eerst.money, 1250);
  assert.equal(writeSlotRaw(a.g.ls, 1, JSON.stringify(eerst)), true);
  assert.equal(pasGebeurtenisToe(a.g.op(), 's:b:2', 450), null);
  assert.equal(a.g.op().money, 1250);
});

await t('een schijf die midden in het schrijven wegvalt laat de vorige save heel; de herstelkopie springt bij een kapotte hoofdsave in', async () => {
  const a = avond();
  a.loop(1); a.opdrachtKlaar('s:b:1', 600); a.loop(1); const voor = a.g.op().money;
  a.g.ls.stuk = true; a.g.w.money += 99; assert.equal(a.g.schrijf(), false, 'schrijven mislukt'); a.g.ls.stuk = false;
  assert.equal(a.g.op().money, voor, 'de oude save staat nog');
  a.g.w.money += 5; assert.equal(a.g.schrijf(), true); // daarna is er weer een herstelkopie
  a.g.ls.setItem(slotKey(1), '{afgebroken'); // een afgebroken hoofdsave
  const r = readSlot(a.g.ls, 1); assert.equal(r.state, 'hersteld'); assert.equal(r.data.money, voor, 'herstelkopie = de vorige goede save');
});

console.log(`stoppen_test: ${n}/${n} ok`);
