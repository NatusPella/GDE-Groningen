// Vervoer (#1375): de verhaalingang D1 tot en met D3 met migratie voor oude saves, de rangmomenten van bus, taxi en trein via de rang-haak,
// de terugblik, de Dienstkaart en de Lijn van Dries. Pure test: geen Electron, geen wereld; de opslag is een nepobject (nooit echte opslag).
//   node scripts/vervoer_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import './node3d.mjs';
import { STEPS, ADDED_STEPS, nextStoryStep, stepDone, missionIndexOf } from '../game/js/storyarc.js';
import { milestoneFlagsForDone } from '../game/js/storymilestones.js';
import * as R from '../game/js/rankmoments.js';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import * as V from '../game/js/vervoer.js';
import { speakerColor } from '../game/js/speakers.js';
import { OPERATOR } from '../game/js/busboard.js';

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

// --- de verhaalingang: drie toegevoegde stappen na N7, met een scène en migratie voor oude saves ---------------------------------------------
const D = ['D1', 'D2', 'D3'];
const idx = (id) => STEPS.findIndex((s) => s.id === id);

t('D1 tot en met D3 zijn toegevoegde activiteiten op een reisdoel met hun eigen scène', () => {
  for (const id of D) {
    const s = STEPS[idx(id)];
    assert.ok(s && ADDED_STEPS.includes(id), `${id} is een toegevoegde stap`);
    assert.equal(s.kind, 'activity');
    assert.ok(s.built && s.added === true && !s.reward && !s.cost, `${id}: gebouwd, zonder beloning of kosten`);
    assert.ok(s.goal.type === 'reis' && s.goal.scene === id && s.scenes.includes(id) && s.goal.r >= 250, `${id}: reisdoel met scène`);
    assert.ok(s.lead && s.lead[1].length > 20, `${id}: een lead`);
  }
});
t('de stappen staan na N7 en vóór T2, en D2 opent vervoer', () => {
  assert.ok(idx('N7') < idx('D1') && idx('D1') < idx('D2') && idx('D2') < idx('D3') && idx('D3') < idx('T2'));
  assert.equal(STEPS[idx('D2')].unlocks, V.VERVOER_VLAG);
  assert.ok(!STEPS[idx('D1')].unlocks && !STEPS[idx('D3')].unlocks, 'alleen D2 zet de vlag');
});
t('de dertig missies staan nog in dezelfde volgorde', () => {
  const m = STEPS.filter((s) => s.kind === 'mission').map((s) => s.id).join();
  assert.equal(m, [...Array(30)].map((_, i) => 'M' + String(i + 1).padStart(2, '0')).join());
});

// een save van vóór deze ronde: alle stappen behalve D1 tot en met D3
const OUD = STEPS.filter((s) => !D.includes(s.id));
const saveTot = (laatste) => {
  const k = OUD.findIndex((s) => s.id === laatste);
  const done = new Set(OUD.slice(0, k + 1).map((s) => s.id));
  const passed = new Set([...done].map((id) => STEPS.find((s) => s.id === id)).filter((s) => s && s.kind === 'mission').map((s) => missionIndexOf(s.mission)));
  return { done, mp: (i) => passed.has(i) };
};
const huidige = (laatste) => { const s = saveTot(laatste); return nextStoryStep((id) => s.done.has(id), s.mp, () => false); };
t('een oude save vóór het invoegpunt speelt D1 tot en met D3; voorbij het invoegpunt herhaalt hij ze niet', () => {
  assert.equal(huidige('N7').id, 'D1');
  assert.notEqual(huidige('T2').id, 'D1');
  assert.notEqual(huidige('M11').id, 'D2');
  const s = saveTot('M21');
  assert.ok(D.every((id) => stepDone(idx(id), (x) => s.done.has(x), s.mp)), 'een save voorbij M21 heeft ze als gedaan (geen blokkade)');
  assert.equal(huidige('M30').id, 'F6', 'een uitgespeelde oude save speelt alleen het slot');
});
t('de stappen geven geen extra wagen-vlaggen of beloning', () => {
  const tot = (l) => new Set(OUD.slice(0, OUD.findIndex((s) => s.id === l) + 1).map((s) => s.id));
  for (const l of ['M13', 'M21']) assert.equal(milestoneFlagsForDone(new Set([...tot(l), ...D])).join(), milestoneFlagsForDone(tot(l)).join());
});

t('de scènes bestaan, zijn kort en laten de bijfiguren zichzelf noemen', () => {
  for (const id of D) {
    const sc = scenes.get(id);
    assert.ok(sc && sc.step === id, `${id}: scène`);
    assert.ok(sc.lines.length + sc.regie.length <= 20, `${id}: kort genoeg`);
    assert.ok(sc.lines.every((l) => l.text.split(/\s+/).length <= 14), `${id}: elke beurt kort`);
    assert.ok(sc.lines.every((l) => l.textOnly), `${id}: nog geen opname (stem komt in de TTS-ronde)`);
  }
  const sp = (id) => new Set(scenes.get(id).lines.map((l) => l.speaker));
  assert.ok(sp('D1').has('Dries') && sp('D1').has('Mevrouw Wassink'), 'D1: Dries en mevrouw Wassink');
  assert.ok(sp('D2').has('Annemarie') && !sp('D2').has('Dries'), 'D2: Annemarie aan de telefoon, Dries ligt op de bank');
  assert.ok(sp('D3').has('Jochem Luiken'), 'D3: Jochem');
  assert.ok(scenes.get('D1').lines.some((l) => /Annemarie/.test(l.text)), 'Annemarie is al genoemd voor ze belt (aankondiging)');
  assert.ok(scenes.get('D2').lines.some((l) => /Jochem/.test(l.text)), 'Jochem is al genoemd voor hij spreekt');
  assert.ok(scenes.get('D2').lines.filter((l) => l.speaker === 'Annemarie').every((l) => l.channel === 'telefoon'), 'Annemarie is alleen een stem op de telefoon');
  assert.ok(scenes.get('D1').lines.some((l) => /getrouwd/.test(l.text)) && scenes.get('D1').lines.some((l) => /Dat zeiden wij ook/.test(l.text)), 'de vraag van mevrouw Wassink');
});

// --- de rangmomenten -----------------------------------------------------------------------------------------------------------------------

t('elk vak van vervoer heeft een moment voor rang 2 tot en met 6, geldig en in het register', () => {
  const ids = R.rankMoments().map((m) => m.id);
  for (const vak of V.VERVOER_VAKKEN) {
    for (let rang = 2; rang <= 6; rang++) {
      const m = R.rankMomentsOf(vak).find((x) => x.rang === rang);
      assert.ok(m, `${vak} rang ${rang}`);
      assert.equal(m.id, V.momentId(vak, rang));
      assert.ok(ids.includes(m.id) && m.id.length <= 60);
      assert.equal(R.momentProblem({ id: m.id, vak, rang, scene: m.scene }), '', m.id);
    }
  }
});
t('alle sprekers van de momenten en de terugblik zijn bekend en hebben een eigen kleur', () => {
  const namen = new Set();
  for (const vak of V.VERVOER_VAKKEN) {
    for (const regels of Object.values(V.MOMENTEN[vak])) for (const [wie] of regels) namen.add(wie);
    for (const l of V.terugblikTalk(vak)) namen.add(l.speaker);
  }
  for (const wie of namen) assert.ok(wie === 'Tammo' || wie === 'Anita' || speakerColor(wie) !== '#8a8a8a', `${wie}: kleur`);
  assert.ok([...namen].every((w) => !/Tessa/.test(w)), "Tessa heet in de spreeksleutel 'Anita'");
});

t('een stijging speelt het moment van die rang één keer, in volgorde, en alleen voor deze speler', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'bus', 2);
  assert.deepEqual(Live.rankHook.wachtrij(), ['vervoer-bus-rang2']);
  assert.deepEqual(speelAlles(w), ['vervoer-bus-rang2']);
  naarNiveau(w, 'bus', 4); // een sprong over rang 3: beide spelen, in volgorde
  assert.deepEqual(speelAlles(w), ['vervoer-bus-rang3', 'vervoer-bus-rang4']);
  assert.ok(L.momentGezien(Live.getProfiel(), 'vervoer-bus-rang3'), 'gezien staat in het profiel van deze speler');
  naarNiveau(w, 'taxi', 2);
  assert.deepEqual(speelAlles(w), ['vervoer-taxi-rang2'], 'een ander vak is een eigen moment');
  // een nieuwe speler (een gast op zijn eigen apparaat, een leeg profiel) ziet zijn eigen momenten, onafhankelijk van de eerste
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const gast = nepWereld();
  naarNiveau(gast, 'bus', 2);
  assert.deepEqual(speelAlles(gast), ['vervoer-bus-rang2']);
});
t('een moment wacht tot het rustig is', () => {
  Live.rankHook.leeg();
  Live.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld();
  naarNiveau(w, 'trein', 2);
  for (let i = 0; i < 10; i++) assert.equal(Live.rankHook.tik(1, w, { ...rustig, sideJob: true }), null, 'een dienst bezig is niet rustig');
  assert.deepEqual(speelAlles(w), ['vervoer-trein-rang2']);
});

// --- de terugblik ----------------------------------------------------------------------------------------------------------------------------

t('de terugblik is er voor bus, taxi en trein, is kort, en vervalt voor wie de aanleiding speelde', () => {
  for (const vak of V.VERVOER_VAKKEN) {
    const regels = V.terugblikTalk(vak);
    assert.equal(regels.length, 2, vak);
    assert.ok(regels.every((l) => l.textOnly && l.text.split(/\s+/).length <= 25), `${vak}: kort en zonder opname`);
    assert.ok(regels.some((l) => /Dries Oltmans/.test(l.text)), `${vak}: noemt wie weggevallen is`);
    assert.deepEqual(V.terugblikTalk(vak, { gezien: true }), [], `${vak}: de speler die D2 speelde krijgt hem niet`);
  }
  assert.deepEqual(V.terugblikTalk('padel'), [], 'een ander vak heeft geen terugblik');
  assert.ok(V.terugblikTalk('trein').every((l) => l.speaker === 'Jochem Luiken'), 'de trein vertelt Jochem zelf');
});

// --- de Dienstkaart ----------------------------------------------------------------------------------------------------------------------------

t('de Dienstkaart zegt de kernlus, de rang nu en de volgende; een ander vak heeft er geen', () => {
  const g = V.vervoerGids('bus', 3);
  assert.equal(g.stappen.length, 5);
  assert.equal(g.nu.titel, 'Lijnchauffeur');
  assert.equal(g.volgende.titel, 'Dienstroosterheld');
  assert.equal(V.vervoerGids('trein', 1).nu.titel, 'Perronstaander');
  assert.equal(V.vervoerGids('taxi', 6).volgende, null, 'de hoogste rang heeft geen volgende');
  assert.equal(V.vervoerGids('padel', 2), null);
  assert.ok(g.titel.includes('Noorderspoor'));
  for (const vak of V.VERVOER_VAKKEN) for (let nv = 1; nv <= 6; nv++) assert.equal(V.vervoerGids(vak, nv).nu.titel, L.vakInfo(vak).titels[nv - 1]);
});

// --- de Lijn van Dries -------------------------------------------------------------------------------------------------------------------------

const lijn = (ref, pts) => ({ id: ref, ref, name: `Lijn ${ref} Hunzedal`, pts, length: pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0) });
t('de lijn die langs Winsum rijdt krijgt zijn naam, één keer, en een lijn ver weg blijft zoals hij was', () => {
  const winsum = [1000, 2000];
  const verweg = lijn('9', [[9000, 9000], [12000, 9000]]);
  const langs = lijn('5', [[0, 2100], [3000, 2100]]);
  const kort = lijn('6', [[900, 2300], [1200, 2300]]);
  const lijst = [verweg, kort, langs];
  assert.equal(V.lijnVanDries(lijst, winsum), langs, 'bij twee lijnen langs Winsum de langste');
  V.markeerLijnVanDries(lijst, winsum);
  assert.equal(langs.name, V.LIJN_VAN_DRIES);
  assert.equal(verweg.name, 'Lijn 9 Hunzedal');
  assert.equal(V.lijnVanDries([verweg], winsum), null, 'niets binnen 800 m');
  assert.equal(V.lijnVanDries([], winsum), null);
  assert.equal(V.lijnVanDries(null, winsum), null);
  assert.deepEqual(V.markeerLijnVanDries([verweg], winsum), [verweg], 'zonder lijn bij Winsum blijft alles zoals het was');
});

// --- de naam van het bedrijf -------------------------------------------------------------------------------------------------------------------------

t('Noorderspoor is het bedrijf van de lijndienst en het bord (geen Hunzedal meer in beeld)', () => {
  assert.equal(V.BEDRIJF, 'Noorderspoor');
  assert.equal(OPERATOR, 'Noorderspoor');
});

console.log(`vervoer_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
