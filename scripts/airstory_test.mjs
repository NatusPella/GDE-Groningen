// Lucht (#1377): de verhaalingang L1 en L2 (de ballon) met migratie voor oude saves, de rangmomenten van Lucht via de rang-haak, de terugblik
// en de Dienstkaart. Pure test: geen Electron, geen wereld; de opslag is een nepobject (nooit echte opslag).
//   node scripts/airstory_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import './node3d.mjs';
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';
import * as R from '../game/js/rankmoments.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import * as A from '../game/js/airstory.js';
import * as VB from '../game/js/vehicle_balloon.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { speakerColor } from '../game/js/speakers.js';
import { dossierOf } from '../game/js/characterdossiers.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => {
  const m = new Map(Object.entries(start));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
};
const nepWereld = () => ({ money: 0, msgs: [], addMessage(text) { this.msgs.push(text); }, coopDeel() {} });
const rustig = { started: true, held: [] };
const naarNiveau = (w, vak, niv) => Live.loopbaanTel(w, vak, { xp: L.XP_DREMPELS[niv - 1] - Live.getProfiel().vakken[vak].xp });
const speelAlles = (w) => { const g = []; for (let i = 0; i < 40; i++) { const id = Live.rankHook.tik(1, w, rustig); if (id) g.push(id); } return g; };
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scenes = new Map(script.scenes.map((s) => [s.id, s]));
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const LUCHT = ['L1', 'L2'];

// --- de verhaalingang: twee toegevoegde stappen na de kermisrit, met een scène en migratie voor oude saves ---------------------------------

t('L1 en L2 zijn toegevoegde activiteiten op een reisdoel met hun eigen scène, zonder beloning', () => {
  for (const id of LUCHT) {
    const s = STEPS[idx(id)];
    assert.ok(s && ADDED_STEPS.includes(id), `${id} is een toegevoegde stap`);
    assert.equal(s.kind, 'activity');
    assert.ok(s.built && s.added === true && !s.reward && !s.cost, `${id}: gebouwd, zonder beloning of kosten`);
    assert.ok(s.goal.type === 'reis' && s.goal.scene === id && s.scenes.includes(id) && s.goal.r >= 250, `${id}: reisdoel met scène`);
    assert.ok(s.lead && s.lead[1].length > 20, `${id}: een lead`);
  }
  assert.equal(STEPS[idx('L1')].unlocks, A.BALLON_VLAG, 'L1 zet de vlag ballon');
  assert.ok(!STEPS[idx('L2')].unlocks);
});
t('de stappen staan na M15 en vóór het koffiebezoek J3, en de missies blijven dertig', () => {
  assert.ok(idx('M15') < idx('L1') && idx('L1') < idx('L2') && idx('L2') < idx('J3'));
  const m = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join();
  assert.equal(m.split(',').length, 30, 'geen missie erbij of weg');
  assert.ok(!m.split(',').some((id) => id.startsWith('L')), 'L1 en L2 zijn activiteiten, geen missies');
});
t('de reisdoelen liggen op de lanceerplekken waar de speler echt kan instappen (Eelde en de Dollarddijk)', () => {
  const plek = (id) => VB.lanceerPlekken().find((p) => p.id === id);
  for (const [stap, id] of [['L1', 'eelde'], ['L2', 'dollard']]) {
    const [x, y] = wgsToWorld(...STEPS[idx(stap)].goal.at);
    assert.ok(plek(id), `${id} is een lanceerplek`);
    assert.ok(Math.hypot(plek(id).x - x, plek(id).y - y) < 5, `${stap}: het reisdoel is de lanceerplek ${id}`);
    assert.ok(STEPS[idx(stap)].goal.r >= VB.INSTAP_AFSTAND, `${stap}: de aankomststraal dekt de instapafstand`);
  }
});

const OUD = STEPS.filter((s) => !LUCHT.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };
t('een oude save vóór het invoegpunt speelt L1; voorbij het invoegpunt herhaalt hij ze niet', () => {
  assert.equal(huidige('A2').id, 'L1');
  assert.notEqual(huidige('J3').id, 'L1');
  const s = saveTot('M21');
  assert.ok(LUCHT.every((id) => stepDone(idx(id), (x) => s.done.has(x), s.mp)), 'een save voorbij M21 heeft ze als gedaan (geen blokkade)');
});
t('de stappen geven geen extra wagen-vlaggen of beloning', () => {
  const tot = (l) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === l) + 1).map((s) => s.id));
  for (const l of ['M13', 'M21']) assert.equal(milestoneFlagsForDone(new Set([...tot(l), ...LUCHT])).join(), milestoneFlagsForDone(tot(l)).join());
});

t('de scènes bestaan, zijn kort en laten Gerlof zichzelf noemen', () => {
  for (const id of LUCHT) {
    const sc = scenes.get(id);
    assert.ok(sc && sc.step === id, `${id}: scène`);
    assert.ok(sc.lines.length + sc.regie.length <= 20, `${id}: kort genoeg`);
    assert.ok(sc.lines.every((l) => l.text.split(/\s+/).length <= 18), `${id}: elke beurt kort`);
    assert.ok(sc.lines.every((l) => l.textOnly), `${id}: nog geen opname (stem komt in de TTS-ronde)`);
  }
  const sp = (id) => new Set(scenes.get(id).lines.map((l) => l.speaker));
  assert.ok(sp('L1').has('Gerlof Hamminga'), 'L1: Gerlof');
  assert.ok(scenes.get('L1').lines.some((l) => /Gerlof Hamminga, ballonvaarder/.test(l.text)), 'Gerlof stelt zich zelf voor');
  assert.ok(sp('L2').has('Jelle Terpstra') && !sp('L2').has('Gerlof Hamminga'), 'L2: Jelle zwaait, Gerlof is er niet bij');
  assert.equal(scenes.get('L2').lines.filter((l) => l.speaker === 'Jelle Terpstra').length, 1, 'Jelle is een visueel moment: één roep, geen gesprek');
  assert.ok(scenes.get('L2').lines.some((l) => /schaap/.test(l.text)), 'het schaap van het eerste bijna');
});
t('Gerlof heeft een dossier en een eigen spreeksleutel met kleur', () => {
  const d = dossierOf('gerlof');
  assert.ok(d && d.name === 'Gerlof Hamminga' && d.firstStep === 'L1');
  assert.notEqual(speakerColor('Gerlof Hamminga'), '#8a8a8a');
});

// --- de rangmomenten -----------------------------------------------------------------------------------------------------------------------

t('Lucht heeft een moment voor rang 2 tot en met 6, geldig en in het register', () => {
  const ids = R.rankMoments().map((m) => m.id);
  for (let rang = 2; rang <= 6; rang++) {
    const m = R.rankMomentsOf('lucht').find((x) => x.rang === rang);
    assert.ok(m, `rang ${rang}`);
    assert.equal(m.id, A.momentId(rang));
    assert.ok(ids.includes(m.id) && m.id.length <= 60);
    assert.equal(R.momentProblem({ id: m.id, vak: 'lucht', rang, scene: m.scene }), '', m.id);
  }
});
t('alle sprekers van de momenten en de terugblik hebben een eigen kleur en elk personage stelt zich voor', () => {
  const namen = new Set();
  for (const regels of Object.values(A.MOMENTEN)) for (const [wie] of regels) namen.add(wie);
  for (const l of A.luchtTerugblikTalk('lucht')) namen.add(l.speaker);
  for (const wie of namen) assert.ok(wie === 'Tammo' || wie === 'Anita' || speakerColor(wie) !== '#8a8a8a', `${wie}: kleur`);
  assert.ok([...namen].every((w) => !/Tessa/.test(w)), "Tessa heet in de spreeksleutel 'Anita'");
  // de eerste regel waarin een personage spreekt noemt zijn naam, zodat een speler zonder M12, M15 of L1 weet wie het is
  for (const wie of ['Dokter Dijkstra', 'Roelfien', 'Gerlof Hamminga']) {
    const eerste = Object.entries(A.MOMENTEN).sort((a, b) => a[0] - b[0]).find(([, regels]) => regels.some(([w]) => w === wie));
    const zin = eerste[1].find(([w]) => w === wie)[1];
    assert.ok(zin.includes(wie.replace('Dokter ', '')), `${wie} noemt zichzelf in zijn eerste moment (rang ${eerste[0]})`);
  }
});
t('een stijging speelt het moment van die rang één keer, in volgorde, en alleen voor deze speler', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'lucht', 2);
  assert.deepEqual(speelAlles(w), ['lucht-rang2']);
  naarNiveau(w, 'lucht', 4); // een sprong over rang 3: beide spelen, in volgorde
  assert.deepEqual(speelAlles(w), ['lucht-rang3', 'lucht-rang4']);
  assert.ok(L.momentGezien(Live.getProfiel(), 'lucht-rang3'), 'gezien staat in het profiel van deze speler');
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const gast = nepWereld();
  naarNiveau(gast, 'lucht', 2);
  assert.deepEqual(speelAlles(gast), ['lucht-rang2'], 'een gast op zijn eigen apparaat ziet zijn eigen moment');
});
t('een moment wacht tot het rustig is', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'lucht', 2);
  for (let i = 0; i < 10; i++) assert.equal(Live.rankHook.tik(1, w, { ...rustig, sideJob: true }), null, 'een vlucht bezig is niet rustig');
  assert.deepEqual(speelAlles(w), ['lucht-rang2']);
});

// --- de terugblik en de Dienstkaart ----------------------------------------------------------------------------------------------------------

t('de terugblik is kort, zonder opname, en vervalt voor wie Gerlof zelf ontmoette (L1)', () => {
  const regels = A.luchtTerugblikTalk('lucht');
  assert.equal(regels.length, 2);
  assert.ok(regels.every((l) => l.textOnly && l.text.split(/\s+/).length <= 25 && l.speaker === 'Gerlof Hamminga'));
  assert.ok(/Gerlof Hamminga/.test(regels[0].text));
  assert.deepEqual(A.luchtTerugblikTalk('lucht', { gezien: true }), []);
  assert.deepEqual(A.luchtTerugblikTalk('bus'), [], 'een ander vak heeft geen terugblik');
});
t('de Dienstkaart zegt de kernlus, de rang nu en de volgende; een ander vak heeft er geen', () => {
  const g = A.luchtGids('lucht', 3);
  assert.equal(g.stappen.length, 5);
  assert.equal(g.nu.titel, 'Piloot in opleiding');
  assert.equal(g.volgende.titel, 'Piloot');
  assert.equal(A.luchtGids('lucht', 6).volgende, null);
  assert.equal(A.luchtGids('bus', 2), null);
  for (let nv = 1; nv <= 6; nv++) assert.equal(A.luchtGids('lucht', nv).nu.titel, L.vakInfo('lucht').titels[nv - 1]);
});

console.log(`airstory_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
