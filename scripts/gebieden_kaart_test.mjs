// De kaartlaag Veroverd per zoomniveau (#423, gebiedenkaart.js): welke laag bij welke zoom hoort, de drie toestanden, lijndikte die meeschaalt, labels zonder overlap,
// de legenda en de minikaart. Op de echte grenzen (game/grenzen.json) met een neptekencontext; de beelden zelf staan in scripts/qa/gebieden_shots.mjs.
//   node scripts/gebieden_kaart_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ontvouw } from '../game/js/grenzen.js';
import * as G from '../game/js/gebieden.js';
import * as Live from '../game/js/gebiedenlive.js';
import * as K from '../game/js/gebiedenkaart.js';
import { wgsToWorld } from '../game/js/rdnew.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const grenzen = ontvouw(JSON.parse(fs.readFileSync(fileURLToPath(new URL('../game/grenzen.json', import.meta.url)), 'utf8')));
const [gx, gy] = wgsToWorld(53.2194, 6.5665); // de Grote Markt
const taken = [
  ['m:a', 0, 0], ['b:b', 300, 100], ['a:c', -200, 400], ['f:d', 800, -300], ['b:e', 1500, 500], ['a:f', 40, 60], ['b:g', 60, 20], ['f:h', 5000, 5000], ['f:i', 5100, 5000],
].map(([id, dx, dy]) => ({ id, soort: id[0] === 'm' ? 'missie' : id[0] === 'b' ? 'baan' : id[0] === 'a' ? 'spel' : 'vondst', naam: id, x: gx + dx, y: gy + dy, sleutels: [id] }));
const nepOpslag = { getItem: () => null, setItem() {} };
Live.initGebieden({ bron: () => ({ grenzen, taken, bekend: () => new Set() }), opslag: nepOpslag });
const w = { money: 0, player: { x: gx, y: gy }, addMessage() {} };
Live.getIndeling();
for (const id of ['m:a', 'b:b', 'a:f', 'b:g']) Live.doeTaak(w, id); // het stadshart: een deel gedaan, en de buurt rond (a:f, b:g, m:a) helemaal
K.vernieuwKaartLaag();

// een neptekencontext die bijhoudt wat er getekend wordt
function nepCtx() {
  const log = { vul: 0, lijnen: [], teksten: [], dash: [], alpha: new Set() };
  const c = { font: '13px sans-serif', lineWidth: 1, globalAlpha: 1 };
  const noop = () => {};
  Object.assign(c, { save: noop, restore: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop, roundRect: noop, fill() { log.vul++; log.alpha.add(c.globalAlpha); }, stroke() { log.lijnen.push(c.lineWidth); },
    setLineDash(d) { log.dash.push(d.length); }, fillText(tx) { log.teksten.push(tx); }, measureText: (tx) => ({ width: String(tx).length * 6.5 }) });
  return { c, log };
}
const toScreen = (scale, cx, cy) => (x, y) => [640 + (x - cx) * scale, 360 + (y - cy) * scale];
function teken(scale, cx = gx, cy = gy) {
  const { c, log } = nepCtx();
  const hover = [], labels = [];
  const laagId = K.tekenVeroverd(c, toScreen(scale, cx, cy), scale, 1280, 720, hover, (ctx, tekst, x, y) => labels.push({ tekst, x, y, w: String(tekst).length * 6.5 }), '#fff');
  K.tekenLegenda(c, 1280, 720, laagId, '#fff');
  return { laagId, log, labels, hover };
}

t('kiesLaag: ver uit gemeenten, midden woonplaatsen, dichtbij wijken en nog dichterbij buurten; de provincie nooit zelf', () => {
  const { typisch } = K.kaartLaag();
  assert.ok(typisch.gemeente > typisch.buurt && typisch.provincie > typisch.gemeente, JSON.stringify(typisch));
  assert.equal(K.kiesLaag(typisch, 0.004), 'gemeente');
  assert.equal(K.kiesLaag(typisch, 0.045), 'gemeente', 'zoom 0,5 van de grote kaart');
  assert.equal(K.kiesLaag(typisch, 0.09), 'woonplaats', 'zoom 1');
  assert.equal(K.kiesLaag(typisch, 0.22), 'wijk', 'zoom 2,5');
  assert.equal(K.kiesLaag(typisch, 0.45), 'buurt', 'zoom 5');
  assert.equal(K.kiesLaag(typisch, 1.4), 'buurt');
  assert.equal(K.kiesLaag(typisch, 0), null);
  for (const sc of [0.001, 0.01, 0.1, 1, 5]) assert.notEqual(K.kiesLaag(typisch, sc), 'provincie');
  assert.equal(K.kiesLaag({}, 1), null);
  const lagen = [0.004, 0.03, 0.1, 0.4, 1.4].map((s) => K.kiesLaag(typisch, s));
  assert.deepEqual(lagen, [...lagen].sort((a, b) => ['gemeente', 'woonplaats', 'wijk', 'buurt'].indexOf(a) - ['gemeente', 'woonplaats', 'wijk', 'buurt'].indexOf(b)), 'dichterbij is nooit een grovere laag');
});
t('het kader: de grens van de laag erboven (provincie om gemeenten, gemeente om woonplaatsen en wijken, wijk om buurten)', () => {
  assert.deepEqual(K.KADER, { gemeente: 'provincie', woonplaats: 'gemeente', wijk: 'gemeente', buurt: 'wijk' });
});
t('lijnDikte schaalt mee met de zoom: groeit, blijft tussen 1,1 en 3,4 px', () => {
  const d = [0.004, 0.02, 0.1, 0.4, 1.4, 6].map(K.lijnDikte);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] >= d[i - 1], d.join(' '));
  assert.ok(d[0] >= 1.1 && d.at(-1) <= 3.4 && d.at(-1) > d[0] + 1);
});
t('de drie toestanden zijn ook zonder kleur te onderscheiden: stippellijn, doorgetrokken met vulling, vlag en "veroverd"', () => {
  const basis = { veroverbaar: true, deel: 0, voltooid: false, klaar: 0, kleur: null, alpha: 0, vlag: '#4fb3a6' };
  const nog = K.stijl(basis), bezig = K.stijl({ ...basis, klaar: 2, deel: 0.4, kleur: 'rgb(150,184,70)', alpha: 0.2 }), klaar = K.stijl({ ...basis, voltooid: true, klaar: 5, deel: 1 }), leeg = K.stijl({ ...basis, veroverbaar: false });
  assert.equal(nog.streep, true); assert.equal(nog.vul, null);
  assert.equal(bezig.streep, false); assert.ok(bezig.vul && bezig.alpha >= 0.24);
  assert.equal(klaar.streep, false); assert.equal(klaar.vul, '#4fb3a6'); assert.ok(klaar.breed > bezig.breed);
  assert.ok(leeg.lijnAlpha < nog.lijnAlpha && leeg.vul === null, 'wat niets te doen heeft is bijna onzichtbaar');
  assert.equal(new Set([nog, bezig, klaar].map((s) => `${s.streep}|${!!s.vul}|${s.breed}`)).size, 3);
});
t('op vier zoomniveaus: de goede laag, grenzen, vulling voor wat gedaan is, en een legenda met de drie toestanden', () => {
  const uit = [[0.006, 'gemeente'], [0.1, 'woonplaats'], [0.22, 'wijk'], [0.5, 'buurt']].map(([sc, verwacht]) => ({ sc, verwacht, ...teken(sc) }));
  for (const u of uit) {
    assert.equal(u.laagId, u.verwacht, `zoom ${u.sc}`);
    assert.ok(u.log.lijnen.length > 0, `zoom ${u.sc}: geen grenzen`);
    for (const tekst of ['Nog niet begonnen', 'Bezig', 'Veroverd']) assert.ok(u.log.teksten.includes(tekst), `zoom ${u.sc}: legenda mist ${tekst}`);
    assert.ok(u.log.teksten.some((x) => x.startsWith('Veroverd · ')), 'de legenda noemt de laag');
  }
  assert.ok(uit[1].log.vul > 0 || uit[2].log.vul > 0 || uit[3].log.vul > 0, 'wat je deed is gekleurd');
  const dikten = uit.map((u) => Math.max(...u.log.lijnen));
  for (let i = 1; i < dikten.length; i++) assert.ok(dikten[i] >= dikten[i - 1], 'dichterbij zijn de lijnen niet dunner: ' + dikten.join(' '));
});
t('labels vallen niet over elkaar en hebben naam en voortgang met percentage', () => {
  for (const sc of [0.006, 0.1, 0.22, 0.5]) {
    const { labels } = teken(sc);
    const doos = labels.map((l) => [l.x - l.w / 2, l.y - 7, l.x + l.w / 2, l.y + 7]);
    for (let i = 0; i < doos.length; i++) for (let j = i + 1; j < doos.length; j++) {
      const a = doos[i], b = doos[j];
      assert.ok(!(a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) || labels[i].x === labels[j].x, `zoom ${sc}: ${labels[i].tekst} raakt ${labels[j].tekst}`);
    }
    for (const l of labels) assert.ok(l.x >= 0 && l.x <= 1280 && l.y >= 0 && l.y <= 720);
  }
  const wijken = teken(0.22).labels.map((l) => l.tekst);
  assert.ok(wijken.some((x) => /^\d+ van \d+ · \d+%$/.test(x) || x === 'veroverd'), 'voortgang met percentage: ' + wijken.join(' | '));
});
t('een veroverd gebied krijgt een vlag, een titel bij het aanwijzen en een eigen vulling; een volle kaart heeft niet meer labels dan er plek voor is', () => {
  const o = Live.getOverzicht();
  const klaar = o.ind.gebieden.filter((g) => G.voortgang(o.profiel, o.ind, g.id).voltooid);
  assert.ok(klaar.length >= 1, 'de proef heeft minstens één veroverd gebied');
  const kleinste = klaar.sort((a, b) => a.grens.b[2] - a.grens.b[0] - (b.grens.b[2] - b.grens.b[0]))[0];
  const sc = { buurt: 0.5, wijk: 0.22, woonplaats: 0.1, gemeente: 0.006 }[kleinste.niveau];
  const r = teken(sc, kleinste.x, kleinste.y);
  assert.ok(r.labels.some((l) => l.tekst === 'veroverd'), 'het veroverde gebied zegt het');
  assert.ok(r.hover.some((h) => /veroverd/i.test(h.sub)), 'en heeft een titel bij het aanwijzen');
  assert.ok(teken(0.006).labels.length <= 12 && teken(0.5).labels.length <= 12);
});
t('de minikaart tekent dezelfde lagen zonder labels, in wereldmeters, en blijft binnen de straal', () => {
  const { c, log } = nepCtx();
  K.tekenVeroverdMini(c, 1.45, gx, gy, 200);
  assert.ok(log.lijnen.length > 0, 'grenzen op de minikaart');
  assert.deepEqual(log.teksten, [], 'geen labels op de minikaart');
  const ver = nepCtx();
  K.tekenVeroverdMini(ver.c, 1.45, gx + 200000, gy, 200);
  assert.equal(ver.log.lijnen.length, 0, 'ver buiten de provincie niets');
  assert.doesNotThrow(() => K.tekenVeroverdMini(nepCtx().c, 1.45, NaN, NaN, 200));
});
t('zonder gebieden (de wereld is er nog niet) tekent de laag niets en gaat er niets mis', () => {
  Live.initGebieden({ bron: () => null, opslag: nepOpslag });
  K.vernieuwKaartLaag();
  const r = teken(0.4);
  assert.equal(r.laagId, null);
  assert.equal(r.log.lijnen.length, 0);
  assert.doesNotThrow(() => K.tekenLegenda(nepCtx().c, 1280, 720, null));
});
t('de haken: de grote kaart tekent laag en legenda, de minikaart de laag, de legenda houdt het laagjes-tabblad kloppend', () => {
  const src = (f) => fs.readFileSync(fileURLToPath(new URL('../game/js/' + f, import.meta.url)), 'utf8');
  assert.ok(src('mapview.js').includes('tekenLegenda(ctx, state.cw, state.ch, laagId'));
  const hud = src('hud_panel.js');
  assert.ok(hud.includes("minimapShows('veroverd')") && hud.includes('tekenVeroverdMini'));
  assert.ok(hud.indexOf('tekenVeroverdMini(ctx') > hud.indexOf('fillPolys(ctx, view.water)') && hud.indexOf('tekenVeroverdMini(ctx') < hud.indexOf('for (const r of view.roads)'), 'boven groen en water, onder de wegen');
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
