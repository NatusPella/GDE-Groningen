// Test van de rangenboog (#1374, taak V3): game/js/footballrankmoments.js, de haak van rankmoments.js en de koppeling met de voetbalcarrière. Puur, geen Electron;
// schrijft nooit naar echte opslag (nepopslag voor het profiel en de carrière).
// Dekt: vijf aangemelde momenten voor rang 2 tot 6, dezelfde tekst als het script (V3.2 tot V3.6), een moment bij elke stijging (een sprong speelt de overgeslagen
// rangen in volgorde), niets achteraf voor een oude carrière, niets dubbel na zakken of opnieuw laden, per speler eigen voortgang, en de vlag overleeft opslaan en laden.
//   node scripts/football_rank_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import * as R from '../game/js/rankmoments.js';
import * as F from '../game/js/footballrankmoments.js';
import * as V from '../game/js/footballstory.js';
import * as Live from '../game/js/loopbaanlive.js';
import * as L from '../game/js/loopbaan.js';
import * as C from '../game/js/voetbalcarriere.js';
import * as LIVE from '../game/js/voetbalcarrierelive.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const index = makeParkIndex(PARKDATA);
const start = () => C.createCareer({ char: 'anita', index, home: V.storyHome(index) });
const nepOpslag = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const rustig = { started: true, held: [] };
const nepWereld = () => ({ money: 0, msgs: [], addMessage(x) { this.msgs.push(x); }, coopDeel() {} });
// een carrière op rang r, zoals voetbal_story_test hem bouwt: de voorwaarden van storyRank
const opRang = (c, r) => ({ ...c, flags: { ...c.flags, ...(r >= 2 ? { debut: true } : {}), ...(r >= 4 ? { bid: true } : {}), ...(r >= 5 ? { captain: true } : {}) },
  stats: { ...c.stats, ...(r >= 3 ? { promotions: 1 } : {}) }, roles: { ...c.roles, ...(r >= 6 ? { trainer: true } : {}) } });
// een eigen haak met eigen opslag (een andere speler): speel verzamelt wat begon
function speler() {
  const gezien = new Set(); const gespeeld = [];
  const hook = R.makeRankHook({ store: { gezien: (id) => gezien.has(id), markeer: (id) => gezien.add(id) }, speel: (m) => { gespeeld.push(m.id); return true; } });
  const uit = () => { for (let i = 0; i < 40; i++) hook.tik(1, null, rustig); return gespeeld.splice(0); };
  return { hook, gezien, uit };
}

t('vijf momenten voor rang 2 tot 6 van de voetbalcarrière, geldig en met unieke id\'s', () => {
  const lijst = R.rankMomentsOf('voetbal');
  assert.deepEqual(lijst.map((m) => m.rang), [2, 3, 4, 5, 6]);
  assert.deepEqual(lijst.map((m) => m.id), F.RANK_SCENES.map((m) => m.id));
  for (const m of lijst) { assert.equal(R.momentProblem(m), '', m.id); assert.ok(m.id.length <= 60); assert.equal(m.scene.soort, 'talk'); }
  assert.equal(F.registerFootballRankMoments(), 0, 'een tweede keer aanmelden doet niets');
  assert.equal(R.registerRankMoment({ id: 'x', vak: 'onbekend', rang: 2, scene: { soort: 'kaart', wie: 'A', tekst: 'b' } }).ok, false, 'een onbekend vak blijft geweigerd');
});
t('de tekst is Nederlands, kort, zonder echte merken en elke bijfiguur is eerst met naam en rol ingeleid', () => {
  const eerst = new Set();
  for (const m of F.RANK_SCENES) {
    assert.ok(m.regels.length >= 2 && m.regels.length <= 4, m.id);
    for (const [wie, tekst] of m.regels) {
      assert.ok(wie && tekst.split(/\s+/).length <= 25 && !hasForbiddenWord(tekst) && !/\b(de Grunn|winter|sneeuw|ijs|Ajax|PSV|FC Groningen)\b/i.test(tekst), tekst);
      assert.ok(!/Remco|Kleibijter/.test(`${wie} ${tekst}`));
      // een naam in de tekst wordt eerst door die persoon zelf of door een eerdere scène genoemd
      for (const naam of ['Hilbrand', 'Femke', 'Eppo', 'Albert', 'Jaap', 'De Vries-Jansen']) {
        if (new RegExp(naam).test(tekst) && !eerst.has(naam) && !wie.includes(naam)) assert.fail(`${naam} wordt genoemd in ${m.id} voor hij zich voorstelde`);
      }
      eerst.add(wie.split(' ')[0] === 'Mevrouw' ? 'De Vries-Jansen' : wie.split(' ')[0]);
    }
  }
  const rang4 = F.RANK_SCENES.find((m) => m.rang === 4).regels[0][1];
  assert.match(rang4, /scout van De Stadjers/, 'de scout krijgt zijn rol bij de eerste ontmoeting');
  assert.match(F.RANK_SCENES.find((m) => m.rang === 5).regels[0][1], /de bakker/);
  assert.match(F.RANK_SCENES.find((m) => m.rang === 2).regels[1][1], /de keeper/);
});
t('de tekst is gelijk aan het script (V3.2 tot V3.6 in script.json)', () => {
  for (const m of F.RANK_SCENES) {
    const s = script.scenes.find((x) => x.id === m.scene);
    assert.ok(s, `${m.scene} staat in script.json`);
    assert.equal(s.step, 'V3');
    assert.deepEqual(s.lines.map((l) => l.text), m.regels.map(([, x]) => x), `${m.scene}: tekst`);
    const naam = (w) => (w === 'Anita' ? 'Tessa' : w);
    assert.deepEqual(s.lines.map((l) => l.speaker), m.regels.map(([w]) => naam(w)), `${m.scene}: sprekers`);
  }
});
t('een nieuwe carrière begint stil; elke stijging speelt precies zijn moment, een keer', () => {
  const p = speler();
  let c = start();
  let r = F.feedFootballRank(c, p.hook); c = r.career;
  assert.equal(r.fired, 0); assert.equal(c.flags.rankSeen, 1, 'de eerste keer zet hij de rang stil neer');
  assert.deepEqual(p.uit(), [], 'op rang 1 speelt de haak niets (de invalbeurt is de scène van rang 1)');
  assert.equal(F.feedFootballRank(c, p.hook).career, c, 'zonder stijging verandert er niets (dezelfde verwijzing)');
  for (const rang of [2, 3, 4, 5, 6]) {
    r = F.feedFootballRank(opRang(c, rang), p.hook); c = r.career;
    assert.equal(r.fired, 1, `rang ${rang}`); assert.equal(c.flags.rankSeen, rang);
    assert.deepEqual(p.uit(), [F.RANK_SCENES.find((m) => m.rang === rang).id]);
  }
  // niets komt terug: dezelfde rang opnieuw voeden, zakken en weer stijgen
  assert.equal(F.feedFootballRank(c, p.hook).fired, 0);
  const lager = F.feedFootballRank(opRang(start(), 4), p.hook); assert.equal(lager.fired, 0);
  const terug = { ...c, flags: { ...c.flags }, roles: { trainer: false, manager: false } };
  r = F.feedFootballRank(terug, p.hook);
  assert.equal(r.career.flags.rankSeen, 6, 'de laatst geziene rang zakt nooit');
  assert.deepEqual(p.uit(), []);
});
t('een sprong over meer rangen speelt de overgeslagen momenten in volgorde', () => {
  const p = speler();
  let c = F.feedFootballRank(start(), p.hook).career;
  const r = F.feedFootballRank(opRang(c, 4), p.hook);
  assert.equal(r.fired, 3);
  assert.deepEqual(p.uit(), ['voetbal-rang2-debuut', 'voetbal-rang3-selectie', 'voetbal-rang4-doorbraak']);
});
t('een oude carrière op een hoge rang krijgt de lagere momenten nooit achteraf, ook niet na opslaan en laden', () => {
  const p = speler();
  const oud = opRang(start(), 5);                       // een profiel van voor de haak: geen vlag rankSeen
  assert.equal(oud.flags.rankSeen, undefined);
  let r = F.feedFootballRank(oud, p.hook);
  assert.equal(r.fired, 0); assert.equal(r.career.flags.rankSeen, 5);
  assert.deepEqual(p.uit(), []);
  const geladen = C.normalize(C.serialize(r.career));
  assert.equal(geladen.flags.rankSeen, 5, 'de vlag overleeft opslaan en laden');
  assert.equal(F.feedFootballRank(geladen, p.hook).fired, 0);
  r = F.feedFootballRank(opRang(geladen, 6), p.hook);
  assert.equal(r.fired, 1); assert.deepEqual(p.uit(), ['voetbal-rang6-euroborg']);
  assert.equal(F.feedFootballRank(null, p.hook).fired, 0); assert.equal(F.feedFootballRank(C.newCareer(), p.hook).fired, 0, 'zonder carrière niets');
});
t('Samen spelen: elke speler heeft zijn eigen voortgang; een mislukte haak raakt de carrière niet', () => {
  const a = speler(), b = speler();
  const c = F.feedFootballRank(start(), a.hook).career;
  F.feedFootballRank(start(), b.hook);
  F.feedFootballRank(opRang(c, 3), a.hook);          // alleen speler A stijgt
  assert.deepEqual(a.uit(), ['voetbal-rang2-debuut', 'voetbal-rang3-selectie']);
  assert.deepEqual(b.uit(), [], 'speler B ziet niets van het moment van A');
  assert.equal(b.gezien.size, 0);
  const kapot = { omhoog() { throw new Error('boem'); } };
  const r = F.feedFootballRank(opRang(c, 2), kapot);
  assert.equal(r.fired, 0); assert.equal(r.career.flags.rankSeen, 2, 'een fout in de haak stopt het spel niet');
});
t('de echte haak van loopbaanlive: het gezien-zijn staat in het eigen profiel en overleeft laden', () => {
  const opslag = nepOpslag();
  Live.zetProfielVoorTest(null, opslag); Live.rankHook.leeg();
  const w = nepWereld();
  let c = F.feedFootballRank(start(), Live.rankHook, w).career;
  c = F.feedFootballRank(opRang(c, 2), Live.rankHook, w).career;
  assert.deepEqual(Live.rankHook.wachtrij(), ['voetbal-rang2-debuut']);
  const g = []; for (let i = 0; i < 20; i++) { const id = Live.rankHook.tik(1, w, rustig); if (id) g.push(id); }
  assert.deepEqual(g, ['voetbal-rang2-debuut']);
  assert.ok(L.momentGezien(Live.getProfiel(), 'voetbal-rang2-debuut'), 'gezien in het profiel van deze speler');
  // een tweede carrière met dezelfde vlag-stand speelt het moment niet opnieuw (het profiel weet dat hij het zag)
  Live.rankHook.leeg();
  const nogmaals = F.feedFootballRank({ ...opRang(start(), 2), flags: { ...opRang(start(), 2).flags, rankSeen: 1 } }, Live.rankHook, w);
  assert.equal(nogmaals.fired, 0, 'een gezien moment komt niet in de wachtrij');
  Live.zetProfielVoorTest(null, nepOpslag()); Live.rankHook.leeg();
});
t('de live-laag: updateBeats voedt de haak bij een stijging en slaat de rang in de eigen carrière op', () => {
  Live.zetProfielVoorTest(null, nepOpslag()); Live.rankHook.leeg();
  LIVE.useStorage(nepOpslag()); LIVE.useParkData(PARKDATA);
  const w = { money: 0, clock: 12, time: 1500, msgs: [], addMessage(x) { this.msgs.push(x); }, coopDeel: null, player: { character: 'anita' } };
  LIVE.createNew(w, 'anita');
  LIVE.updateBeats(3, w);
  assert.equal(LIVE.getCareer().flags.rankSeen, 1, 'de eerste ronde zet de rang stil neer');
  assert.deepEqual(Live.rankHook.wachtrij(), [], 'rang 1: de haak is leeg');
  const k = LIVE.getCareer();
  LIVE.replaceCareer({ ...k, flags: { ...k.flags, debut: true } });       // rang 2
  w.time = 3000; LIVE.updateBeats(3, w);
  assert.deepEqual(Live.rankHook.wachtrij(), ['voetbal-rang2-debuut'], 'een stijging zet het moment in de wachtrij');
  assert.equal(LIVE.getCareer().flags.rankSeen, 2);
  w.time = 4500; LIVE.updateBeats(3, w);
  assert.deepEqual(Live.rankHook.wachtrij(), ['voetbal-rang2-debuut'], 'een tweede ronde zet hem niet dubbel neer');
  Live.rankHook.leeg(); Live.zetProfielVoorTest(null, nepOpslag());
});
console.log(`football_rank_test: ${n} groepen ok`);
