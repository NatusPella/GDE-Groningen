// De treinreis in de reisscène (#926): de kaart bracht je met de trein naar een
// station, maar de scène toonde alleen een balk en een skipknop. Deze test volgt
// de pure stand van de scène (trainride.js) en houdt de tekenlaag (reisrit.js)
// aan de afspraak: een canvas met trein, spoor en perron, geen leeg scherm.
//   node scripts/trainride_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';
import { ritPlan } from '../game/js/meerijden.js';
import { treinReis, treinLucht, TREIN_SCROLL } from '../game/js/trainride.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

const optie = {
  id: 'trein', etaS: 900, price: 8, lines: [],
  stops: [{ kind: 'instap', name: 'Groningen Noord', x: 0, y: 0 }, { kind: 'uitstap', name: 'Warffum', x: 100, y: 0 }],
  legs: [{ kind: 'train', pts: [[0, 0], [100, 0]], length: 100, line: 'Stoptrein' }],
};
const plan = ritPlan(optie);

t('de drie opnamen: perron, raam, aankomst', () => {
  assert.equal(treinReis(plan, 0).shot, 'perron');
  assert.equal(treinReis(plan, plan.playS * 0.5).shot, 'raam');
  assert.equal(treinReis(plan, plan.playS - 0.01).shot, 'aankomst');
});

t('de trein komt het perron op en staat in het raamshot in beeld', () => {
  const a = treinReis(plan, 0), b = treinReis(plan, plan.playS * 0.18), c = treinReis(plan, plan.playS * 0.5);
  assert.ok(a.trein < 0.4, 'bij de start staat de trein nog links');
  assert.ok(b.trein > a.trein + 0.2, 'de trein schuift het perron op');
  assert.ok(Math.abs(c.trein - 0.5) < 1e-9, 'in het raamshot reist de camera mee: de trein blijft midden');
  assert.equal(a.perron, true);
  assert.equal(c.perron, false);
});

t('het landschap schuift door en de namen kloppen', () => {
  const a = treinReis(plan, 0), b = treinReis(plan, plan.playS), m = treinReis(plan, plan.playS * 0.5);
  assert.ok(b.scroll > a.scroll + TREIN_SCROLL * 0.8, 'de polder schuift voorbij');
  assert.equal(a.bord, 'Groningen Noord');
  assert.equal(b.bord, 'Warffum');
  assert.equal(m.van, 'Groningen Noord');
  assert.equal(m.naar, 'Warffum');
  assert.deepEqual([a.p, b.p], [0, 1]);
});

t('de lucht staat stil per tijd en verduistert op het eind', () => {
  const a = treinLucht(plan, 0), b = treinLucht(plan, plan.playS);
  assert.ok(a.zon >= 0.18 && a.zon <= 0.42, 'de zon zakt');
  assert.ok(b.schemer > 0.9, 'de aankomst is in de schemer');
});

t('de reisscène tekent de trein op een canvas', () => {
  const bron = lees('reisrit.js');
  assert.match(bron, /rr-trein/);
  assert.match(bron, /drawTrein\(treinCanvas, plan, rit\)/);
  assert.match(bron, /build\(plan\.mode === 'taxi', optie\.label, plan\.mode === 'trein'\)/);
  assert.match(bron, /STOPTREIN/);
  assert.match(bron, /tekenPerron/);
  assert.match(bron, /basis \+ 5/, 'de spoorstaaf staat op de baan');
  assert.ok(!/createElement\('video'\)/.test(bron), 'geen videobestand: de reis is een scène');
});

// De tekenlaag zelf: een canvas met een echte 2D-context-stub, op vier momenten.
{
  const { drawTrein } = await import('../game/js/reisrit.js');
  const canvas = document.createElement('canvas');
  canvas.clientWidth = 1280;
  canvas.clientHeight = 720;
  for (const tt of [0, plan.playS * 0.3, plan.playS * 0.5, plan.playS - 0.2]) drawTrein(canvas, plan, { t: tt });
  assert.equal(canvas.width, 1280);
  assert.equal(canvas.height, 720);
  n++;
  console.log('ok de tekenlaag loopt zonder fouten op een canvas');
}

console.log(`trainride_test: ${n}/${n} ok`);
