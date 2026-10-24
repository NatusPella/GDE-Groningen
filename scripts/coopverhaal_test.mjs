// Samen spelen (#429): een verhaalopdracht die een gast meespeelt telt ook in zijn eigen verhaal en opgeslagen spel
// (game/js/coopverhaal.js, coopsave.js, coopmeedoen.js, coopnet.js). Pure tests, geen spel nodig: node scripts/coopverhaal_test.mjs
import assert from 'node:assert/strict';
import * as V from '../game/js/coopverhaal.js';
import * as M from '../game/js/coopmeedoen.js';
import * as S from '../game/js/coopsave.js';
import { createLink } from '../game/js/net/memtransport.js';
import * as N from '../game/js/coopnet.js';
import { registerGastVerhaal } from '../game/js/savehook.js';
import { STEPS, STEP_BY_ID, PARTS, MISSION_IDS, missionIndexOf, stepDone, nextStoryStep, stepAvailable } from '../game/js/storyarc.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const klon = (o) => JSON.parse(JSON.stringify(o));

// een opgeslagen spel van iemand die alles vóór stap `id` deed (en die stap nog niet)
function saveVoor(id, extra = {}) {
  const k = STEPS.findIndex((s) => s.id === id);
  const prior = STEPS.slice(0, k);
  const completed = prior.filter((s) => s.kind === 'mission').map((s) => missionIndexOf(s.mission));
  const kaarten = PARTS[STEPS[k].part].after ? [PARTS[STEPS[k].part].after] : [];
  return { v: 1, money: 300, story: { v: 1, done: prior.map((s) => s.id), skipped: [], fails: {}, waived: [], voorschot: [], cards: kaarten, flags: prior.filter((s) => s.unlocks).map((s) => s.unlocks) }, missions: { index: completed.length ? Math.max(...completed) : 0, completed, seen: completed, medals: {} }, ...extra };
}
const stapDone = (save, id) => { const k = STEPS.findIndex((s) => s.id === id); const d = new Set(save.story.done), c = new Set(save.missions.completed); return stepDone(k, (i) => d.has(i), (i) => c.has(i)); };
const volgende = (save) => { const d = new Set(save.story.done), c = new Set(save.missions.completed), kk = new Set(save.story.cards); return nextStoryStep((i) => d.has(i), (i) => c.has(i), (p) => kk.has(p)); };

t('status: al gedaan, de stap waar je nu bent, of vooruit; onbekend of zonder spel is geen verhaal', () => {
  assert.equal(V.verhaalStatus(saveVoor('M06'), 'M06'), 'normaal');
  assert.equal(V.verhaalStatus(saveVoor('M02'), 'M06'), 'vooruit');
  assert.equal(V.verhaalStatus(saveVoor('M07'), 'M06'), 'gedaan');
  assert.equal(V.verhaalStatus(saveVoor('M02'), 'M02'), 'normaal');
  assert.equal(V.verhaalStatus({}, 'M01'), 'vooruit', 'M00 (de opening) is er nog niet: de eerste missie springt mee');
  assert.equal(V.verhaalStatus({ money: 5 }, 'nietbestaand'), null);
  assert.equal(V.verhaalStatus(null, 'M01'), null);
  assert.equal(V.stapVanMissie(missionIndexOf('M06')), 'M06'); assert.equal(V.stapVanMissie(-1), null); assert.equal(V.stapVanMissie(9999), null);
  assert.equal(V.geldigeStap('M06'), 'M06'); assert.equal(V.geldigeStap('__proto__'), null); assert.equal(V.geldigeStap(5), null);
});

t('dezelfde stand: de stap telt als gedaan, niets wordt overgeslagen, geen extra geld', () => {
  const was = saveVoor('M06'); const kopie = klon(was);
  const r = V.pasVerhaalToe(was, 'M06');
  assert.deepEqual(was, kopie, 'de invoer blijft zoals hij was');
  assert.equal(r.status, 'normaal'); assert.deepEqual(r.overgeslagen, []); assert.equal(r.bonus, 0);
  assert.ok(stapDone(r.save, 'M06')); assert.ok(r.save.missions.completed.includes(missionIndexOf('M06')));
  assert.equal(volgende(r.save).id, 'M07');
  assert.equal(r.save.money, 300, 'het geld is niet aan de verhaalstap: het deel van de beloning komt apart');
  assert.deepEqual(r.save.story.skipped, []);
  assert.equal(V.pasVerhaalToe(r.save, 'M06'), null, 'dubbel toepassen verandert niets (idempotent)');
});

t('al gedaan: niets te schrijven, de gast krijgt alleen de beloning', () => {
  assert.equal(V.pasVerhaalToe(saveVoor('M08'), 'M06'), null);
  assert.equal(V.pasVerhaalToe(saveVoor('M06'), 'onzin'), null);
  assert.equal(V.pasVerhaalToe(null, 'M06'), null);
});

t('vooruit: de stappen ertussen zijn overgeslagen met een deel van het geld, de vlaggen en kaarten kloppen', () => {
  const was = saveVoor('M02'); const kopie = klon(was);
  const r = V.pasVerhaalToe(was, 'M06');
  assert.deepEqual(was, kopie);
  assert.equal(r.status, 'vooruit'); assert.deepEqual(r.overgeslagen, ['M02', 'M03', 'M04', 'M05']);
  assert.deepEqual(r.save.story.skipped, ['M02', 'M03', 'M04', 'M05'], 'overgeslagen, de opdracht zelf niet');
  const loon = STEP_BY_ID.get('M02').reward + STEP_BY_ID.get('M03').reward + STEP_BY_ID.get('M04').reward + STEP_BY_ID.get('M05').reward;
  assert.ok(r.bonus > 0 && r.bonus <= loon / 2 + 20 && r.bonus % 5 === 0, 'de helft van de beloningen, op 5');
  for (const id of ['M02', 'M03', 'M04', 'M05', 'M06']) assert.ok(stapDone(r.save, id), id);
  assert.equal(volgende(r.save).id, 'M07');
  assert.ok(r.save.missions.index === missionIndexOf('M07'), 'de volgende missie is de eerstvolgende open');
  const k = klon(r.save); assert.deepEqual(k, r.save, 'alles is gewone JSON');
});

t('een sprong vanuit een leeg spel (alleen de opening nog) en over een deelgrens: eindkaart en vlaggen mee', () => {
  const r = V.pasVerhaalToe({}, 'M09');
  assert.ok(r && r.save.story.flags.includes('zitmoi'), 'M08 zet de vlag zitmoi, ook als hij is overgeslagen');
  assert.ok(stapDone(r.save, 'M00') && stapDone(r.save, 'T1') && stapDone(r.save, 'M09'));
  const nazomer = STEPS.find((s) => PARTS[s.part].after && stepAvailable(s));
  if (nazomer) { const q = V.pasVerhaalToe({}, nazomer.id); assert.ok(q.save.story.cards.includes(PARTS[nazomer.part].after), 'de eindkaart van het deel ervoor staat als gespeeld'); assert.ok(volgende(q.save).id !== PARTS[nazomer.part].after); }
});

t('elke stap als doel, vanuit elke eigen stand: het verhaal blijft een heel pad naar het einde (verhaaltest met een springende gast-save)', () => {
  const geldigeMissies = new Set(MISSION_IDS.map((_, i) => i));
  let combinaties = 0;
  for (const doel of STEPS) {
    if (!stepAvailable(doel)) continue;
    for (const van of ['M00', ...STEPS.filter(stepAvailable).map((s) => s.id)]) {
      const was = van === 'M00' ? { v: 1, money: 100 } : saveVoor(van);
      const r = V.pasVerhaalToe(was, doel.id);
      const status = V.verhaalStatus(was, doel.id);
      if (status === 'gedaan') { assert.equal(r, null, `${van} naar ${doel.id}`); continue; }
      combinaties++;
      assert.ok(r, `${van} naar ${doel.id}`);
      const k = STEPS.indexOf(doel);
      for (let j = 0; j <= k; j++) assert.ok(stapDone(r.save, STEPS[j].id), `${van} naar ${doel.id}: ${STEPS[j].id} gedaan`);
      for (const id of r.save.story.done) assert.ok(STEP_BY_ID.has(id));
      for (const s of STEPS.slice(0, k + 1)) if (s.unlocks) assert.ok(r.save.story.flags.includes(s.unlocks), `${doel.id}: vlag ${s.unlocks}`);
      for (const i of [...r.save.missions.completed, ...r.save.missions.seen, r.save.missions.index]) assert.ok(geldigeMissies.has(i), 'missie-index in bereik');
      assert.ok(Number.isInteger(r.bonus) && r.bonus >= 0);
      // verder spelen: de volgende stap is de eerstvolgende; stap voor stap tot het einde zonder vastlopen
      let cur = klon(r.save), vorige = -1, stappen = 0;
      for (;;) {
        const nx = volgende(cur);
        if (nx.end) break;
        const nk = STEPS.indexOf(nx);
        assert.ok(nk > k && nk > vorige, `${doel.id}: het pad loopt vooruit (${nx.id})`);
        vorige = nk; stappen++;
        cur.story.done.push(nx.id); if (nx.unlocks) cur.story.flags.push(nx.unlocks);
        if (nx.kind === 'mission') cur.missions.completed.push(missionIndexOf(nx.mission));
        assert.ok(stappen < 80, 'geen eindeloze lus');
      }
      assert.equal(V.pasVerhaalToe(r.save, doel.id), null, 'idempotent');
    }
  }
  assert.ok(combinaties > 300, `genoeg combinaties (${combinaties})`);
});

t('bestaande saves breken niet: ontbrekende of rare velden, de coöp-sleutels en de gastvelden blijven', () => {
  assert.ok(S.applyGuestStory({ money: 5 }, 'M01'), 'een save zonder verhaal of missies');
  const oud = { v: 1, money: 70, story: 'kapot', missions: [1, 2] };
  const r = S.applyGuestStory(oud, 'M02'); assert.ok(r && r.save.story.v === 1 && Array.isArray(r.save.missions.completed));
  assert.equal(r.save.money, 70, 'geld blijft aan de aanroeper');
  assert.equal(BASE_KEYS.coopSave, undefined, 'geen nieuwe opslagsleutel voor verhaalvoortgang: het zit in de bestaande save-slot');
  assert.equal(KEYS.coopSession, 'gde-coop-sessie');
  const ruim = S.applyGuestChanges(r.save, { money: 99 }, 0); assert.equal(ruim.money, 99); assert.deepEqual(ruim.story, r.save.story, 'de gastvelden raken het verhaal niet aan');
  assert.equal(V.pasVerhaalToe(saveVoor('M06', { unbekend: 1 }), 'M06').save.unbekend, 1, 'onbekende velden blijven');
});

t('meedoen: een spoilerwaarschuwing krijgt geen standaard-ja en geen deel zolang hij niet bevestigd is', () => {
  const st = M.maakMeedoen(); M.begin(st, 'x', [1, 2, 3], null, 'M06');
  assert.equal(st.stap, 'M06');
  assert.equal(M.bevestig(st, 2), true); assert.equal(M.bevestig(st, 9), false);
  assert.equal(M.krijgtDeel(st, 2), false); assert.equal(M.loopVrij(st, 2), true);
  assert.deepEqual(M.meespelers(st).sort(), [], 'wie niet antwoordt of een spoiler moet bevestigen speelt niet mee (#452)');
  assert.deepEqual(M.tik(st, 11), [], 'zonder antwoord doet niemand vanzelf mee (#452)'); assert.equal(st.keuze[1], 'wacht');
  assert.deepEqual(M.tik(st, 28), []); assert.equal(st.keuze[2], 'wacht');
  assert.deepEqual(M.tik(st, 2), []); assert.equal(st.keuze[2], 'nee', 'na het vangnet van de host: nee');
  assert.equal(M.krijgtDeel(st, 2), false);
  M.begin(st, 'y', [2], null, 'M06'); M.bevestig(st, 2); assert.equal(M.antwoord(st, 2, true), true);
  assert.deepEqual(M.meespelers(st), [2]); assert.equal(M.krijgtDeel(st, 2), true);
  const u = M.maakUitnodiging({ k: 'meedoen', label: 'Museumkraak', stap: 'M06' }, 'vooruit');
  assert.equal(u.status, 'vooruit'); assert.equal(u.rest, V.BEVESTIG_GAST);
  assert.match(M.uitnodigingTekst(u, 'Tammo'), /Spoilerwaarschuwing.*springt jouw verhaal mee.*J = ja, N = nee/);
  assert.match(M.uitnodigingTekst(M.maakUitnodiging({ k: 'meedoen', label: 'X', stap: 'M06' }, 'gedaan')), /al gedaan: je krijgt alleen de beloning/);
  assert.equal(M.maakUitnodiging({ k: 'meedoen', label: 'X', stap: 'nietbestaand' }, 'vooruit').status, null, 'een onbekende stap is gewoon een opdracht');
  assert.match(M.uitnodigingTekst(M.maakUitnodiging({ k: 'meedoen', label: 'X' }), 'Tammo'), /Meedoen met X\? J = ja, N = nee/);
});

// ---- over het net: een host met twee gasten
const INFO = { game: 'GDE', proto: 1, version: '1', tiles: '-', story: 'nieuw' };
const mkWorld = (extra = {}) => ({ player: { x: 0, y: 0, angle: 0, character: 'tammo', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'anita' }, coop: { local: true }, money: 0, wanted: 0, camYaw: 0, time: 0, messages: [], addMessage(m) { this.messages.push(m); }, input: { axis: () => [0, 0], isDown: () => false, wasPressed: () => false }, ...extra });
// de opslag van elke gast (savegame.js doet dit met de echte save-slot)
registerGastVerhaal({
  status: (w, stap) => V.verhaalStatus(w.save, stap),
  schrijf(w, stap) {
    const r = S.applyGuestStory(w.save, stap); if (!r) return null;
    if (w.schrijfFaalt) return null; // writeSlotRaw faalt (vol): savegame.js geeft dan null
    w.save = r.save; w.money += r.bonus; w.coopVerhaalNieuw = true; w.schrijvingen = (w.schrijvingen || 0) + 1;
    return { status: r.status, overgeslagen: r.overgeslagen.length, bonus: r.bonus };
  },
  herlaad(w) { if (!w.coopVerhaalNieuw) return false; w.coopVerhaalNieuw = false; w.herladen = klon(w.save); return true; },
});
function avond(saves) {
  const hw = mkWorld(), gs = [];
  N.startHost(hw, INFO, { seed: 5 });
  saves.forEach((save, i) => {
    const link = createLink({ latency: 0.02, seed: 11 + i * 7 });
    N.addGuest(hw, link.a);
    const gw = mkWorld({ save, player: { x: 0, y: 0, angle: 0, character: 'anita', vx: 0, vy: 0 }, companion: { x: 1, y: 1, angle: 0, character: 'tammo' } });
    N.startClient(gw, link.b, INFO, {});
    gs.push({ gw, link });
  });
  const step = (secs) => { for (let k = 0; k < Math.round(60 * secs); k++) { N.tickCoopNet(hw, 1 / 60); for (const g of gs) { if (g.gw.coopNet) N.tickCoopNet(g.gw, 1 / 60); g.link.advance(1 / 60); g.gw.time += 1 / 60; } hw.time += 1 / 60; } };
  step(2);
  return { hw, gs, step };
}
const druk = (gw, toets) => { let eens = true; gw.input.wasPressed = (k) => { if (k === toets && eens) { eens = false; return true; } return false; }; };
const startM06 = (hw) => { hw.mission = { phase: 'active', label: 'Museumkraak', type: 'heist', index: missionIndexOf('M06'), progressText: 'Naar het museum' }; };
const gelukt = (hw, loon = 400) => { hw.coopDeel(loon); hw.coopUitslag(true, 'Museumkraak', '', loon); };

t('host plus twee gasten: dezelfde stand telt mee, wie nog niet zover is bevestigt eerst de spoiler en springt mee', () => {
  const { hw, gs, step } = avond([saveVoor('M06'), saveVoor('M02')]);
  const [a, b] = [gs[0].gw, gs[1].gw];
  startM06(hw); step(1);
  assert.ok(a.messages.some((m) => /Meedoen met Museumkraak\? J = ja, N = nee/.test(m)), 'gast A: gewone uitnodiging');
  assert.ok(b.messages.some((m) => /Spoilerwaarschuwing/.test(m)), 'gast B: spoilerwaarschuwing');
  assert.equal(hw.coopNet.meedoen.keuze[1], 'wacht'); assert.equal(hw.coopNet.meedoen.keuze[2], 'wacht');
  assert.equal(hw.coopNet.meedoen.spoiler[2], true, 'de host weet dat B moet bevestigen'); assert.equal(hw.coopNet.meedoen.spoiler[1], undefined);
  step(12); // A antwoordt niet: toeschouwer, geen standaard-ja; B is nog aan het kiezen (#452)
  assert.equal(hw.coopNet.meedoen.keuze[1], 'wacht'); assert.equal(hw.coopNet.meedoen.keuze[2], 'wacht', 'geen standaard-ja bij een spoiler');
  druk(a, 'j'); step(1); assert.equal(hw.coopNet.meedoen.keuze[1], 'ja');
  druk(b, 'j'); step(1);
  assert.equal(hw.coopNet.meedoen.keuze[2], 'ja'); assert.equal(b.coopMeedoenJa, 'M06');
  gelukt(hw); step(1);
  assert.ok(stapDone(a.save, 'M06') && a.save.story.skipped.length === 0, 'A: gedaan, niets overgeslagen');
  assert.ok(stapDone(b.save, 'M06') && b.save.story.skipped.join() === 'M02,M03,M04,M05', 'B: meegesprongen, tussenliggende stappen overgeslagen');
  assert.ok(b.money > 0 && a.money > 0, 'beloning (deel) en voor B ook het geld van de overgeslagen missies');
  assert.ok(b.messages.some((m) => /meegesprongen naar Museumkraak\. 4 stappen ervoor zijn overgeslagen/.test(m)));
  assert.ok(a.messages.some((m) => /staat nu ook in jouw eigen verhaal als gedaan/.test(m)));
  assert.equal(a.schrijvingen, 1); assert.equal(b.schrijvingen, 1);
  // terug naar het eigen spel: het geheugen volgt de opgeslagen sprong
  N.stopCoopNet(b); assert.ok(b.herladen && stapDone(b.herladen, 'M06'), 'het lopende spel krijgt de sprong, zodat de volgende save hem bewaart');
});

t('wie nee zegt, een spoiler niet bevestigt of nooit werd gevraagd, krijgt geen verhaalstap; wie hem al deed alleen de beloning', () => {
  const { hw, gs, step } = avond([saveVoor('M02'), saveVoor('M02'), saveVoor('M08')]);
  const [b, c, d] = [gs[0].gw, gs[1].gw, gs[2].gw];
  startM06(hw); step(1);
  druk(b, 'n'); druk(d, 'j'); step(1); // c zwijgt
  assert.ok(d.messages.some((m) => /al gedaan: je krijgt alleen de beloning/.test(m)), 'D: al gedaan, alleen de beloning');
  step(35); // c: na 30 s zonder antwoord zegt zijn spel zelf nee; D zei J
  assert.equal(hw.coopNet.meedoen.keuze[2], 'nee'); assert.equal(hw.coopNet.meedoen.keuze[3], 'ja');
  gelukt(hw); step(1);
  assert.ok(!stapDone(b.save, 'M06') && !stapDone(c.save, 'M06'), 'geen verhaalstap zonder meedoen');
  assert.equal(b.save.story.skipped.length, 0); assert.equal(b.schrijvingen || 0, 0); assert.equal(c.schrijvingen || 0, 0);
  assert.equal(d.schrijvingen || 0, 0, 'al gedaan: niets te schrijven'); assert.ok(d.money > 0, 'maar wel de beloning');
  // een gast die later aansluit en nooit is uitgenodigd krijgt de stap niet
  assert.equal(N.handleEvent(b, { k: 'verhaalstap', stap: 'M06', label: 'X' }, 0), false, 'wie nee zei');
  c.coopMeedoenNee = false; c.coopMeedoenJa = null;
  assert.equal(N.handleEvent(c, { k: 'verhaalstap', stap: 'M06', label: 'X' }, 0), false, 'een vooruit-gast zonder eigen J');
  assert.equal(N.handleEvent(hw, { k: 'verhaalstap', stap: 'M06', label: 'X' }, 0), false, 'een host luistert er niet naar');
  assert.equal(N.handleEvent(c, { k: 'verhaalstap', stap: 'ONZIN', label: 'X' }, 0), false);
});

t('de opslag blijft heel: pas bij de uitslag, een mislukking of een vol schijf laat de save zoals hij was', () => {
  const { hw, gs, step } = avond([saveVoor('M02')]);
  const b = gs[0].gw; const voor = klon(b.save);
  startM06(hw); step(1); druk(b, 'j'); step(1);
  assert.deepEqual(b.save, voor, 'tijdens de opdracht is er niets geschreven');
  hw.mission = null; hw.coopUitslag(false, 'Museumkraak', 'betrapt'); step(1);
  assert.deepEqual(b.save, voor, 'mislukt: niets geschreven');
  startM06(hw); step(1); druk(b, 'j'); step(1);
  b.schrijfFaalt = true; gelukt(hw); step(1);
  assert.deepEqual(b.save, voor, 'schrijven mislukt: de oude save blijft'); assert.equal(b.money, hw.coopNet ? b.money : 0);
  assert.ok(!stapDone(b.save, 'M06'));
  // de gast verliest de verbinding voor de uitslag: geen halve schrijfbeurt
  const c = avond([saveVoor('M02')]); const cg = c.gs[0].gw; const cv = klon(cg.save);
  startM06(c.hw); c.step(1); druk(cg, 'j'); c.step(1);
  c.gs[0].link.advance(0); cg.coopNet.session.status = 'verbroken'; c.step(1);
  assert.deepEqual(cg.save, cv, 'weggevallen voor de uitslag: de save is ongewijzigd');
});

t('een opdracht die geen verhaalstap is (bijbaan, ander spel) verandert het verhaal niet', () => {
  const { hw, gs, step } = avond([saveVoor('M02')]);
  hw.mission = { phase: 'active', label: 'Bezorgen', type: 'checkpoint', index: 9999, progressText: 'Rij' }; step(1);
  assert.equal(hw.coopNet.meedoen.stap, null);
  druk(gs[0].gw, 'j'); step(1); hw.coopUitslag(true, 'Bezorgen', '', 100); step(1);
  assert.equal(gs[0].gw.schrijvingen || 0, 0);
});

console.log(`coopverhaal_test: ${n}/${n} ok`);
