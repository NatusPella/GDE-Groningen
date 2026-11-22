// Verfijnronde 22-11 (loopbaan, prestaties, veroverd, foto's): regressietests, fuzz en een lange simulatie voor de
// kleine verbeteringen van die ronde. Puur: geen DOM, geen Electron, geen opslag.
//   node scripts/verfijn_loopbaan_prestaties_test.mjs
// Wat het dekt staat in docs/VERFIJNING-22-11-LOOPBAAN-PRESTATIES.md (tabel wrijving, oplossing, bewijs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  eerlijkPct, achFmt, achZoek, achZoekLeeg, achZoekTekst, ACH_ZOEK_MAX, achWhen, achNear, achDone, achCategoryPct,
} from '../game/js/menumodels.js';
import * as F from '../game/js/fotomodus.js';
import * as L from '../game/js/loopbaan.js';
import * as M from '../game/js/careermodel.js';
import { ACHIEVEMENTS, getAchievementSummary, getAchievementView } from '../game/js/achievements.js';

let n = 0;
const t = (naam, f) => { try { f(); } catch (e) { console.error('FAIL', naam); throw e; } n++; };
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// kleine vaste generator, zodat een mislukte run te herhalen is
let seed = 22112025;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const RAAR = [NaN, Infinity, -Infinity, -1, 0, 1e21, undefined, null, '5', {}, [], 0.5, 99999, -0.0001];

// --- eerlijke percentages ------------------------------------------------------------------------------------------
t('eerlijkPct: nooit 100 zolang er nog iets ontbreekt', () => {
  assert.equal(eerlijkPct(0.996), 99);
  assert.equal(eerlijkPct(0.999999), 99);
  assert.equal(eerlijkPct(1), 100);
  assert.equal(eerlijkPct(0.5), 50);
  assert.equal(eerlijkPct(0), 0);
  assert.equal(eerlijkPct(NaN), 0);
  assert.equal(eerlijkPct(-3), 0);
  assert.equal(eerlijkPct(0.4, true), 100); // expliciet klaar (hoogste niveau) blijft 100
  assert.equal(achCategoryPct({ items: Array(300), done: 299 }), 99);
  assert.equal(achCategoryPct({ items: Array(300), done: 300 }), 100);
  assert.equal(achCategoryPct({ items: [], done: 0 }), 0);
});

// --- bedragen en datums --------------------------------------------------------------------------------------------
t('achFmt: een kapotte stand geeft nooit NaN, Infinity of een min op het scherm (fuzz)', () => {
  for (const unit of ['m', '€', 's', 'km/u', '', undefined]) {
    for (const v of RAAR) for (let i = 0; i < 3; i++) {
      const s = achFmt(typeof v === 'number' && i ? v * rnd() * 1000 : v, unit);
      assert.ok(typeof s === 'string' && !/NaN|Infinity|-/.test(s), `${unit} ${String(v)} -> ${s}`);
    }
  }
  assert.equal(achFmt(1500, 'm'), '1,5 km');
  assert.equal(achFmt(999, 'm'), '999 m');
  assert.equal(achFmt(125, 's'), '2:05');
});

t('achWhen: na bijna een jaar staat het jaartal erbij', () => {
  const dag = 86400000, nu = Date.UTC(2026, 10, 22, 12);
  const fmt = (at, jaar) => (jaar ? 'met jaar' : 'zonder jaar');
  assert.equal(achWhen(nu - 10 * dag, nu, 0, fmt), 'zonder jaar');
  assert.equal(achWhen(nu - 299 * dag, nu, 0, fmt), 'zonder jaar');
  assert.equal(achWhen(nu - 300 * dag, nu, 0, fmt), 'met jaar');
  assert.equal(achWhen(nu - 3 * dag, nu, 0, fmt), '3 dagen geleden');
  assert.equal(achWhen(nu + 5 * dag, nu, 0, fmt), 'vandaag'); // klok teruggezet: geen negatieve dagen
});

t('Bijna binnen en Behaald: gelijke stand blijft op titel staan, dus de lijst springt niet', () => {
  const mk = (id, title, cur, at = 0, unlocked = false) => ({ id, title, unlocked, at, hidden: false, progress: { cur, goal: 10 } });
  const lijst = [mk('c', 'Charlie', 5), mk('a', 'Alfa', 5), mk('b', 'Bravo', 5), mk('z', 'Zulu', 9)];
  for (let i = 0; i < 20; i++) {
    const ids = achNear([...lijst].sort(() => rnd() - 0.5)).map((x) => x.id).join('');
    assert.equal(ids, 'zabc');
  }
  const klaar = [mk('x', 'X', 10, 100, true), mk('a', 'A', 10, 100, true), mk('n', 'N', 10, 300, true)];
  assert.equal(achDone([...klaar].reverse()).map((x) => x.id).join(''), 'nax');
});

// --- zoeken ----------------------------------------------------------------------------------------------------------
t('zoeken in Prestaties: woorden, categorie, geheime blijven onvindbaar, ongeldige invoer', () => {
  const all = [
    { id: 'a', title: 'Eerste Fiets', desc: 'Rijd een rondje', catLabel: 'Rijden' },
    { id: 'b', title: 'Trein naar Zuidhorn', desc: 'Stap in', catLabel: 'Spoor' },
    { id: 'g', title: 'Geheime Fiets', desc: 'fiets geheim', catLabel: 'Rijden', hidden: true },
  ];
  assert.deepEqual(achZoek(all, 'fiets').map((x) => x.id), ['a']);
  assert.deepEqual(achZoek(all, '  FIETS   rondje ').map((x) => x.id), ['a']);
  assert.deepEqual(achZoek(all, 'spoor').map((x) => x.id), ['b']);
  assert.equal(achZoek(all, '').length, 3, 'leeg filter laat alles zien');
  assert.equal(achZoek(all, null).length, 3);
  assert.deepEqual(achZoek(all, 'geheim'), [], 'een geheime prestatie is nooit te vinden');
  assert.equal(achZoek(all, 'bestaatniet').length, 0);
  assert.equal(achZoekTekst('a\u0000b\u001fc'), 'a b c');
  assert.equal(achZoekTekst('x'.repeat(500)).length, ACH_ZOEK_MAX);
  for (let i = 0; i < 200; i++) assert.doesNotThrow(() => achZoek(all, pick(RAAR)));
  assert.match(achZoekLeeg('abc', 2), /^Niets gevonden voor "abc"\. Nog 2 geheime/);
  assert.doesNotMatch(achZoekLeeg('abc', 0), /geheime/);
});

// --- prestaties: tellers en lijsten kloppen met elkaar ---------------------------------------------------------------
t('overzicht, samenvatting en lijst tellen hetzelfde en de zoekfunctie ziet alle zichtbare prestaties', () => {
  const view = getAchievementView();
  const sum = getAchievementSummary();
  const items = view.flatMap((c) => c.items);
  assert.equal(items.length, sum.total, 'het aantal in de lijst is het totaal van de hero');
  assert.equal(items.filter((a) => a.unlocked).length, sum.done);
  for (const c of view) assert.equal(c.done, c.items.filter((a) => a.unlocked).length, `categorie ${c.cat}`);
  const alle = view.flatMap((c) => c.items.map((a) => ({ ...a, catLabel: c.label })));
  for (const a of alle.filter((x) => !x.hidden)) {
    assert.ok(achZoek(alle, a.title).some((x) => x.id === a.id), `zoek op titel vindt ${a.id}`);
  }
  assert.equal(alle.filter((a) => a.hidden).filter((a) => achZoek(alle, a.title).some((x) => x.id === a.id)).length, 0, 'geen geheime treffers');
  assert.ok(ACHIEVEMENTS.length >= alle.length);
});

// --- fotomodus -------------------------------------------------------------------------------------------------------
t('fotomodus: clampPhoto en stepFreeCam laten nooit een niet-getal staan (fuzz)', () => {
  for (let i = 0; i < 500; i++) {
    const p = F.createPhoto({ x: 100, y: 200, z: 1.7 }, 12);
    for (const k of ['fov', 'dof', 'focus', 'hour']) if (rnd() < 0.5) p[k] = pick(RAAR);
    for (const k of ['x', 'y', 'z', 'yaw', 'pitch', 'roll']) if (rnd() < 0.5) p.cam[k] = pick(RAAR);
    if (rnd() < 0.3) p.weather = pick(RAAR);
    if (rnd() < 0.3) p.filter = pick(RAAR);
    F.stepFreeCam(p, { fwd: pick(RAAR), right: pick(RAAR), up: pick(RAAR), yawRate: pick(RAAR), pitchRate: pick(RAAR), boost: rnd() < 0.5 }, 0.016);
    for (const v of [p.fov, p.dof, p.focus, p.hour, p.cam.x, p.cam.y, p.cam.z, p.cam.yaw, p.cam.pitch, p.cam.roll]) assert.ok(Number.isFinite(v), JSON.stringify(p));
    assert.ok(p.fov >= F.LIMITS.fov[0] && p.fov <= F.LIMITS.fov[1]);
    assert.ok(p.hour >= 0 && p.hour < 24);
    assert.ok(F.FILTER_IDS.includes(p.filter));
    assert.ok(!/NaN/.test(F.hourLabel(p.hour)));
  }
  assert.equal(F.hourLabel(NaN), '12:00');
});

t('galerij: een kapotte of vreemde opslag geeft een veilige lijst', () => {
  const fout = 'data:image/png;base64,AAAA" onerror="alert(1)';
  const ok = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const lijst = F.schoonLijst([
    null, 5, 'tekst', {}, { id: '' }, { id: 7 },
    { id: 'f1', plaats: 'Haren', uur: '14:30', thumb: ok, filter: 'bestaatniet', weer: 'sneeuw' },
    { id: 'f1', plaats: 'dubbel' },
    { id: 'f2', thumb: fout, uur: 'NaN:NaN', file: 'x'.repeat(500) },
  ]);
  assert.deepEqual(lijst.map((s) => s.id), ['f1', 'f2']);
  assert.equal(lijst[0].thumb, ok);
  assert.equal(lijst[0].uur, '14:30');
  assert.equal(lijst[0].filter, 'geen');
  assert.equal(lijst[0].weer, null);
  assert.equal(lijst[1].thumb, '', 'een voorbeeld met aanhalingstekens komt nooit in een src');
  assert.equal(lijst[1].uur, '12:00');
  assert.ok(lijst[1].file.length <= 120);
  assert.equal(F.makeShot({ id: 'x', thumb: fout }).thumb, '');
  assert.equal(F.makeShot({ id: 'x', thumb: ok }).thumb, ok);
  assert.equal(F.makeShot({ id: 'x', hour: NaN }).uur, '12:00');
  const mem = { d: JSON.stringify(Array.from({ length: 80 }, (_, i) => ({ id: 'f' + i }))), getItem() { return this.d; } };
  assert.equal(F.loadGallery(mem).length, F.GALLERY.max, 'nooit meer dan het maximum');
  for (const raw of ['{', '[', 'null', '7', '{"a":1}']) assert.deepEqual(F.loadGallery({ getItem: () => raw }), []);
});

t('galerij: weghalen is terug te draaien en een nieuwe foto krijgt nooit een bestaand nummer', () => {
  let lijst = ['f5', 'f4', 'f3', 'f2', 'f1'].map((id) => F.makeShot({ id }));
  const r = F.haalWeg(lijst, 'f3');
  assert.deepEqual(r.lijst.map((s) => s.id), ['f5', 'f4', 'f2', 'f1']);
  assert.equal(r.weg.index, 2);
  assert.deepEqual(F.zetTerug(r.lijst, r.weg).map((s) => s.id), ['f5', 'f4', 'f3', 'f2', 'f1'], 'terug op de oude plek');
  assert.equal(F.zetTerug(lijst, r.weg), lijst, 'niet dubbel');
  assert.equal(F.zetTerug(lijst, null), lijst);
  assert.equal(F.haalWeg(lijst, 'bestaatniet').weg, null);
  const vol = Array.from({ length: F.GALLERY.max }, (_, i) => F.makeShot({ id: 'f' + (i + 100) }));
  assert.equal(F.zetTerug(vol, { shot: F.makeShot({ id: 'f1' }), index: 0 }).length, F.GALLERY.max);
  // de nieuwste foto weghalen mag het nummer niet hergebruiken
  assert.equal(F.volgendNummer(lijst, 0), 6);
  lijst = F.removeShot(lijst, 'f5');
  assert.equal(F.volgendNummer(lijst, 5), 6, 'met het geheugen van dit spel nooit terug');
  assert.equal(F.volgendNummer([], 0), 1);
  assert.equal(F.volgendNummer(null, NaN), 1);
  assert.equal(F.volgendNummer([{ id: 'zonder cijfers' }, null, { id: 'f9' }], 2), 10);
  assert.notEqual(F.shotFileName('Haren', 5), F.shotFileName('Haren', 6));
});

t('fotomodus: de reden dat het niet start is concreet', () => {
  assert.equal(F.startReden({ fotomodus: true }), '');
  assert.match(F.startReden({ speler: null }), /geen speler/);
  assert.match(F.startReden({ speler: { ragdoll: true } }), /sta eerst op/);
  assert.match(F.startReden({ speler: {}, cameraOverride: {} }), /filmpje of scène/);
  assert.match(F.startReden({ speler: {}, uiPaused: true }), /menu/);
  assert.equal(F.startReden({ speler: {} }), '');
});

// --- loopbaan --------------------------------------------------------------------------------------------------------
t('loopbaan: een nieuwe plek geeft één keer punten, ook als de lijst vol is', () => {
  const p = L.nieuwProfiel();
  const vak = L.VAK_IDS[0];
  const a = L.tel(p, vak, { uniek: 'plek-1' });
  assert.equal(a.xp, L.UNIEK_XP);
  assert.equal(L.tel(p, vak, { uniek: 'plek-1' }).xp, 0, 'zelfde plek geeft niets');
  for (let i = 0; i < 500; i++) L.tel(p, vak, { uniek: 'p' + i });
  assert.ok(p.vakken[vak].uniek.length <= 120);
  const voor = p.vakken[vak].xp;
  assert.equal(L.tel(p, vak, { uniek: 'nooit-gezien' }).xp, 0, 'vol: geen onthouden plek, dus geen punten');
  assert.equal(p.vakken[vak].xp, voor);
});

t('loopbaan: tellerTekst gebruikt bij 1 het enkelvoud voor elk vak', () => {
  for (const info of L.VAKKEN) {
    const p = L.nieuwProfiel();
    p.vakken[info.id].n = 1;
    const een = L.tellerTekst(p, info.id);
    assert.ok(een.startsWith('1 '), `${info.id}: ${een}`);
    assert.ok(!/^1 (klussen|oogsten|activiteiten|vangsten|ritten|potjes|rondes|races|diensten|optredens|vluchten)$/.test(een), `${info.id}: enkelvoud verwacht, kreeg "${een}"`);
  }
});

t('loopbaan: "1 punt" in het enkelvoud, in de stap en in de eis', () => {
  const p = L.nieuwProfiel();
  const vak = L.VAK_IDS[0];
  L.startVak(p, vak);
  p.vakken[vak].xp = L.XP_DREMPELS[1] - 1;
  assert.match(L.volgendeStap(p, vak).tekst, /^Nog 1 punt tot niveau 2/);
  assert.match(M.eisEnVerdiensten(p, vak).eis, /^Nog 1 punt tot /);
  p.vakken[vak].xp = L.XP_DREMPELS[1] - 2;
  assert.match(L.volgendeStap(p, vak).tekst, /^Nog 2 punten tot niveau 2/);
});

t('loopbaan: de kaart zegt alleen 100% op het hoogste niveau (balk en getal liegen niet)', () => {
  const p = L.nieuwProfiel();
  for (const info of L.VAKKEN) {
    L.startVak(p, info.id);
    for (let nu = 1; nu < L.MAX_NIVEAU; nu++) {
      p.vakken[info.id].xp = L.XP_DREMPELS[nu] - 1; // één punt voor het volgende niveau
      const k = M.vakKaart(p, info);
      assert.ok(k.pct <= 99, `${info.id} niveau ${nu}: ${k.pct}%`);
      assert.ok(M.eisEnVerdiensten(p, info.id).pct <= 99);
    }
    p.vakken[info.id].xp = L.XP_DREMPELS[L.MAX_NIVEAU - 1];
    assert.equal(M.vakKaart(p, info).pct, 100, 'op het hoogste niveau wel 100');
  }
});

t('loopbaan: opslag fuzz en samenvoegen blijven geldig, groeien alleen en zijn idempotent', () => {
  const stukken = () => ({
    v: pick([1, 1, 1, 2, null, '1']),
    vakken: pick([null, {}, 'x', Object.fromEntries(L.VAK_IDS.map((id) => [id, pick([null, 5, { xp: pick(RAAR), n: pick(RAAR), uniek: pick([[], ['a', 'a', 7, null, 'x'.repeat(99)], 'nee', null]) }])]))]),
    gestart: pick([[], ['onbekend', L.VAK_IDS[0], L.VAK_IDS[0]], 'x', null]), kaarten: pick([[], [L.VAK_IDS[1]], 7]), duizendpoot: pick([true, false, 'ja']), zaad: pick([true, undefined]),
  });
  for (let i = 0; i < 400; i++) {
    const a = L.normaliseer(rnd() < 0.2 ? JSON.stringify(stukken()) : stukken());
    const b = L.normaliseer(stukken());
    for (const id of L.VAK_IDS) {
      const v = a.vakken[id];
      assert.ok(Number.isFinite(v.xp) && v.xp >= 0 && v.xp <= 100000 && Number.isFinite(v.n) && v.n >= 0, `${id}: ${JSON.stringify(v)}`);
      assert.ok(Array.isArray(v.uniek) && v.uniek.length <= 120 && v.uniek.every((u) => typeof u === 'string'));
      const nv = L.niveauVoorVak(a, id);
      assert.ok(nv >= 1 && nv <= L.MAX_NIVEAU);
    }
    const m = L.voegSamen(a, b);
    for (const id of L.VAK_IDS) assert.equal(m.vakken[id].xp, Math.max(a.vakken[id].xp, b.vakken[id].xp));
    assert.deepEqual(L.voegSamen(m, a), m, 'samenvoegen met een eerdere stand verandert niets');
    assert.deepEqual(L.voegSamen(m, m), m);
    assert.deepEqual(L.normaliseer(JSON.parse(JSON.stringify(m))), m, 'wat we schrijven lezen we terug');
  }
});

t('loopbaan: simulatie van 20.000 gebeurtenissen houdt alle regels vast', () => {
  const p = L.nieuwProfiel();
  let vorig = 0;
  const niveaus = Object.fromEntries(L.VAK_IDS.map((v) => [v, 1]));
  for (let i = 0; i < 20000; i++) {
    const vak = pick(L.VAK_IDS);
    const opties = { n: pick([0, 1, 1, 2.5, NaN, -4]), xp: pick([0, 3, 10, 40, NaN, Infinity, -9]), uniek: rnd() < 0.3 ? 'plek' + Math.floor(rnd() * 400) : null };
    const r = L.tel(p, vak, opties);
    assert.ok(Number.isFinite(r.xp) && r.xp >= 0);
    const nv = L.niveauVoorVak(p, vak);
    assert.ok(nv >= niveaus[vak], 'een niveau daalt nooit');
    assert.ok(!r.omhoog || (r.omhoog.naar === nv && r.omhoog.van < r.omhoog.naar));
    niveaus[vak] = nv;
    const basis = pick([1, 7, 50, 120]);
    assert.ok(L.loon(p, vak, basis) >= basis, 'het loon is nooit lager dan het basisloon');
    if (i % 997 === 0) {
      const s = L.samenvatting(p);
      assert.ok(s.som >= vorig && s.som <= s.max);
      vorig = s.som;
      const k = M.vakKaart(p, L.vakInfo(vak));
      assert.ok(k.pct >= 0 && k.pct <= 100 && k.pct === Math.floor(k.pct));
      const st = L.volgendeStap(p, vak);
      assert.ok(!st || /^(Nog \d+ punt(en)? tot niveau|Hoogste niveau)/.test(st.tekst), st && st.tekst);
    }
  }
  assert.ok(vorig > 0);
});

// --- schermen: de kleine bedrading staat erin (de render zelf is nog niet in beeld bekeken) -------------------------
t('Prestaties: zoekveld, Esc wist eerst, geheime rij heeft een eigen naam', () => {
  const b = bron('achievementsui.js');
  assert.match(b, /class="pa-zoek" type="search"/);
  assert.match(b, /e\.key !== 'Escape'[\s\S]*zoek = ''/);
  assert.match(b, /aria-label="Geheime prestatie"/);
  assert.match(b, /eerlijkPct/);
  assert.match(b, /achFmt\(v, unit, formatMissionTime\)/);
});

t('Veroverd: de gekozen gebiedskaart en de scrolstand overleven een nieuwe tekening', () => {
  const b = bron('veroverdpanel.js');
  assert.match(b, /gekozenGebied = null;/);
  assert.match(b, /scrol\[b\.dataset\.voBody\]/);
  assert.match(b, /Doel staat op de kaart/);
  assert.doesNotMatch(b, /let gebied = null;/, 'de oude stale variabele is weg');
});

t('Foto\'s: flits met Beweging beperken uit, ongedaan maken en een foutmelding bij een mislukte opslag', () => {
  const b = bron('fotomodusui.js');
  assert.match(b, /function flits\(\)[\s\S]*calmState\(\)\) return/);
  assert.match(b, /data-foto-undo/);
  assert.match(b, /F\.haalWeg\(/);
  assert.match(b, /Het bestand bewaren lukte niet/);
  assert.match(b, /F\.volgendNummer\(list, counter\)/);
  assert.match(b, /meldStartFout\(world\)/);
});

console.log(`verfijn_loopbaan_prestaties_test: ${n}/${n} ok`);
