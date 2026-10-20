// The three text jobs (casework.js): BOA voor een dag, dossier naar de rechtbank
// and cabaret in de Stadsschouwburg. Pure rules: the fines add up, each case has
// exactly one right answer and it can be found in the facts, the heckle timing
// windows, the pay never blocks, no real brands. Also that the jobs are in the
// side-job list and the three named places exist on the city map.
//   node scripts/casework_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as CW from '../game/js/casework.js';
import { makeRng } from '../game/js/minigamekit.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

// --- BOA
{
  check('ten cases, all with a unique id', CW.BOA_CASES.length >= 10 && new Set(CW.BOA_CASES.map((c) => c.id)).size === CW.BOA_CASES.length);
  for (const c of CW.BOA_CASES) {
    const total = CW.boaTotal(c);
    check(`${c.id}: the total is a whole positive amount`, Number.isInteger(total) && total > 0 && total < 500, total);
    check(`${c.id}: the rule text names every unit amount and the flat part`, c.terms.every((t) => c.rule.includes(`€${t.unit}`)) && (c.flat === 0 || c.rule.includes(`€${c.flat}`)), c.rule);
    check(`${c.id}: the scene mentions the counts it needs`, c.terms.every((t) => t.n > 0) && c.scene.length > 20 && c.scene.length < 160);
    for (const seed of [1, 2, 3, 4, 5]) {
      const opts = CW.boaOptions(c, makeRng(seed));
      const amounts = opts.map((o) => o.amount);
      check(`${c.id}/${seed}: three different positive amounts, exactly one right`, opts.length === 3 && new Set(amounts).size === 3 && amounts.every((a) => a > 0) && opts.filter((o) => o.ok).length === 1 && opts.find((o) => o.ok).amount === total, JSON.stringify(opts));
    }
  }
  const spread = new Set();
  for (let s = 1; s <= 40; s++) spread.add(CW.boaOptions(CW.BOA_CASES[0], makeRng(s * 9973 + 1)).findIndex((o) => o.ok));
  check('the right answer moves around the three keys', spread.size === 3);
  const v = CW.boaVerdict({ ok: true });
  check('right: paid and flawless; wrong: still paid, never zero', v.kind === 'goed' && v.flawless && v.base > 0 && CW.boaVerdict({ ok: false, kind: 'hoog' }).base > 0 && !CW.boaVerdict({ ok: false, kind: 'laag' }).flawless && CW.boaVerdict({ ok: false, kind: 'laag' }).kind === 'laag');
  check('wrong pays less than right', CW.boaVerdict({ ok: false, kind: 'hoog' }).base < v.base);
  let last = null, repeats = 0;
  for (let i = 0; i < 60; i++) { const c = CW.pickBoaCase(makeRng(i + 7), last); if (last && c.id === last) repeats++; last = c.id; }
  check('a case is not repeated straight away', repeats === 0);
  check('the offender and the BOA have lines for every outcome', ['start', 'goed', 'hoog', 'laag', 'skip'].every((k) => CW.BOA_SAY[k].length >= 2));
}

// --- Rechtbank
{
  check('five dossiers with three facts and three questions each', CW.DOSSIERS.length >= 5 && CW.DOSSIERS.every((d) => d.facts.length === 3 && d.questions.length === 3));
  const stop = new Set(['een', 'het', 'de', 'op', 'in', 'van', 'bij', 'met', 'aan', 'is', 'er', 'op', 'zijn']);
  const toks = (t) => t.toLowerCase().replace(/[^a-zà-ÿ0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !stop.has(w));
  for (const d of CW.DOSSIERS) {
    const facts = ' ' + toks(d.facts.join(' ')).join(' ') + ' ';
    d.questions.forEach((q, i) => {
      check(`${d.id}/${i}: three options, exactly one right`, q.options.length === 3 && q.ok >= 0 && q.ok < 3);
      const cover = (t) => { const w = toks(t); return w.length ? w.filter((x) => facts.includes(' ' + x + ' ') || facts.includes(x.slice(0, 5))).length / w.length : 0; };
      const right = cover(q.options[q.ok]);
      const wrong = q.options.filter((_, j) => j !== q.ok).map(cover);
      check(`${d.id}/${i}: the right answer is in the facts, the others are not`, right >= 0.99 && wrong.every((w) => w < right), `${right} vs ${wrong}`);
    });
    const qs = CW.dossierQuestions(d, makeRng(5));
    check(`${d.id}: shuffling keeps exactly one right answer per question`, qs.length === 3 && qs.every((q) => q.options.filter((o) => o.ok).length === 1));
  }
  const pos = new Set();
  for (let s = 1; s <= 30; s++) CW.dossierQuestions(CW.DOSSIERS[0], makeRng(s * 9973 + 1)).forEach((q) => pos.add(q.options.findIndex((o) => o.ok)));
  check('right answers move around', pos.size === 3);
  const p0 = CW.verklaringPay(0), p2 = CW.verklaringPay(2), p3 = CW.verklaringPay(3);
  check('pay grows with right answers and is never zero', p0.base > 0 && p2.base > p0.base && p3.base > p2.base && p3.tip > 0 && p3.flawless && !p2.flawless);
  check('pay is clamped', CW.verklaringPay(9).base === p3.base && CW.verklaringPay(-3).base === p0.base);
  let last = null, repeats = 0;
  for (let i = 0; i < 60; i++) { const d = CW.pickDossier(makeRng(i + 3), last); if (last && d.id === last) repeats++; last = d.id; }
  check('a dossier is not repeated straight away', repeats === 0);
}

// --- Cabaret
{
  const C = CW.CABARET;
  check('Frisian lines carry a Dutch gloss in brackets', C.acts.every((a) => /\(.+\)/.test(a.text)));
  check('five beats and a closing line', C.acts.filter((a) => a.cue > 0).length === 5 && C.acts[C.acts.length - 1].cue === 0);
  check('timing: perfect, ok, early, late', CW.heckleTiming(10, 10.1) === 'perfect' && CW.heckleTiming(10, 9.7) === 'ok' && CW.heckleTiming(10, 10.4) === 'ok' && CW.heckleTiming(10, 9.2) === 'early' && CW.heckleTiming(10, 11) === 'late');
  check('windows are ordered', C.windows.perfect < C.windows.ok && C.points.perfect > C.points.ok && C.points.ok > C.points.early);
  const s = CW.cabaretSchedule(3.2);
  const cues = s.beats.filter((b) => b.cueAt != null);
  check('the schedule runs in order and the beats come after the line', s.beats.every((b, i) => i === 0 || b.speakAt > s.beats[i - 1].speakAt) && cues.every((b) => b.cueAt > b.speakAt + 3) && s.end > cues[cues.length - 1].cueAt);
  check('a sweep never starts before its line is spoken', cues.every((b) => b.cueAt - 2.4 > b.speakAt));
  check('the act lasts under a minute', s.end > 25 && s.end < 60, s.end);
  const max = cues.length;
  const pays = [0, 4, 8, 12, 15].map((p) => CW.cabaretPay(p, max));
  check('pay grows with points and is never zero', pays.every((p) => p.base > 0) && pays.every((p, i) => i === 0 || p.base > pays[i - 1].base) && pays[4].tip > 0);
  check('a quiet room is still polite', CW.cabaretPay(0, max).verdict.length > 5 && !CW.cabaretPay(0, max).flawless && CW.cabaretPay(15, max).flawless);
  // a player who presses on the perfect moment of every beat scores the maximum
  let pts = 0;
  for (const b of cues) pts += C.points[CW.heckleTiming(b.cueAt, b.cueAt + 0.05)];
  check('perfect timing on every beat gives the maximum', pts === max * C.points.perfect);
  check('no heckle line is cruel', ![...C.heckles, ...Object.values(C.reply).flat()].some((t) => /(dood|kanker|idioot|hoer|neger|homo)/i.test(t)));
}

// --- texts and places
{
  const all = [
    ...CW.BOA_CASES.flatMap((c) => [c.scene, c.rule]), ...Object.values(CW.BOA_SAY).flat(),
    ...CW.DOSSIERS.flatMap((d) => [d.title, ...d.facts, ...d.questions.flatMap((q) => [q.q, ...q.options])]),
    CW.COURT_SAY.pickup, CW.COURT_SAY.arrive, ...CW.COURT_SAY.gavel, CW.CABARET.intro, ...CW.CABARET.acts.map((a) => a.text), ...Object.values(CW.CABARET.reply).flat(), ...CW.CABARET.heckles,
  ];
  const brands = /swapfiets|mcdonald|febo|anwb|\bnam\b|\bduo\b|hanze|vindicat|gasunie|iwink|albert heijn|jumbo|\bnike\b|adidas|google|facebook|instagram/i;
  check('no real brands or bodies in any text', !all.some((t) => brands.test(t)), all.filter((t) => brands.test(t)).join(' | '));
  check('texts are Dutch-length bubbles', all.every((t) => t.length > 1 && t.length < 220));
  check('the BOA satire is about rules, not people', !/(neger|homo|moslim|jood)/i.test(all.join(' ')));

  const here = path.dirname(fileURLToPath(import.meta.url));
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const map = await loadCityData({ extras: false });
  const ex = JSON.parse(fs.readFileSync(path.join(here, '../game/mapextras.json'), 'utf8'));
  const names = new Set([...map.buildings.map((b) => b.name), ...(ex.buildingPatches || []).map((p) => p.set && p.set.name)].filter(Boolean));
  for (const nm of ['Gerechtsgebouw', 'Stadsschouwburg', 'Stadhuis']) check(`${nm} exists on the city map`, names.has(nm));
  check('the police station for the dossier exists', (map.meta.policeStations || []).some((s) => /Centrum/.test(s.name)));
  const src = fs.readFileSync(path.join(here, '../game/js/sidejobs.js'), 'utf8');
  check('the three jobs are in the side-job list', /SIDE_JOBS = \[[^\]]*boa[^\]]*rechtbank[^\]]*cabaret/.test(src));
}

console.log(`casework: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
