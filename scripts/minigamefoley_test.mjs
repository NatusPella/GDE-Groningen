// Minigame-foley (#460): de tabel die de gebeurtenissen van discgolf, het
// skatepark en de klimtoren aan geluid koppelt. Puur: elk effect bestaat in de
// bank, elke planner geeft alleen bestaande effecten met een redelijk niveau,
// de rij van de wereld krijgt wat de planner zegt, en er zit geen Web Audio of
// timer in de module.
//   node scripts/minigamefoley_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MINIGAME_FX, discgolfFx, skateFx, climbFx, pushFoley } from '../game/js/sfx/minigamefoley.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { CATEGORIES } from '../game/js/sfx/mixplan.js';
import { describe } from './sfx_spectrum.mjs';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// -- de tabel ---------------------------------------------------------------
for (const [name, source] of Object.entries(MINIGAME_FX)) {
  ok(!!FX_INFO[name], `${name}: bestaat in de bank`);
  ok(FX_INFO[name] && FX_INFO[name].cat in CATEGORIES, `${name}: mengcategorie bekend`);
  ok(typeof source === 'string' && /^[a-z0-9_]+\.js: /.test(source), `${name}: noemt zijn bron`, source);
  const file = source.split(':')[0];
  ok(new RegExp("pushFoley\\(").test(src(file)), `${name}: ${file} duwt de foley echt`);
}
// niets in de bank blijft onbereikbaar: elk effect van de sportlaag staat in de tabel
const sport = Object.keys(FX_INFO).filter((k) => FX_INFO[k].cat === 'sport').sort();
ok(sport.length >= 9, 'de sportlaag heeft de effecten van de drie minigames', String(sport.length));
for (const k of sport) ok(k in MINIGAME_FX, `${k}: van een minigame heeft een bron in de tabel`);

// elke planner geeft alleen bestaande effecten, met een niveau dat niet klipt
const all = [];
for (const [game, fn, cases] of [
  ['discgolf', discgolfFx, [{ type: 'worp', power: 0 }, { type: 'worp', power: 1 }, { type: 'landing', reason: 'chains', holed: true }, { type: 'landing', reason: 'rattle' }, { type: 'landing', reason: 'tree' }, { type: 'landing', reason: 'water' }, { type: 'landing', reason: 'land' }]],
  ['skatepark', skateFx, [{ type: 'air', pop: true }, { type: 'air' }, { type: 'grind' }, { type: 'land', height: 0 }, { type: 'land', height: 3 }, { type: 'bail', why: 'flip' }, { type: 'grindfall' }, { type: 'bump' }]],
  ['klimtoren', climbFx, [{ type: 'grip', hold: { big: true } }, { type: 'grip', hold: {} }, { type: 'chalk' }, { type: 'fall', height: 12 }, { type: 'top' }, { type: 'let-go', hand: 'a' }]],
]) {
  for (const ev of cases) {
    const out = fn(ev);
    ok(Array.isArray(out), `${game} ${ev.type}: geeft een lijst`);
    for (const e of out) {
      all.push(`${game} ${ev.type} -> ${e.name || e.kind}`);
      ok(e.kind === 'fx' || e.kind === 'splash', `${game} ${ev.type}: soort ${e.kind}`);
      if (e.kind === 'fx') ok(!!FX_INFO[e.name], `${game} ${ev.type}: effect ${e.name} bestaat`);
      if (e.gain !== undefined) ok(e.gain > 0.4 && e.gain <= 1.6, `${game} ${ev.type}: niveau ${e.gain}`);
    }
  }
  ok(fn(null).length === 0 && fn(undefined).length === 0 && fn({}).length === 0, `${game}: zonder gebeurtenis stil`);
}

// -- wat er per gebeurtenis klinkt -----------------------------------------
const names = (list) => list.map((e) => e.name || e.kind).join(',');
const one = (list) => list.length === 1;
ok(names(discgolfFx({ type: 'worp', power: 0.5 })) === 'disc_whoosh', 'discgolf: een worp sist');
ok(discgolfFx({ type: 'worp', power: 1 })[0].gain > discgolfFx({ type: 'worp', power: 0 })[0].gain, 'discgolf: harder gooien is harder');
ok(one(discgolfFx({ type: 'landing', holed: true, reason: 'chains' })) && discgolfFx({ type: 'landing', holed: true })[0].gain === 1, 'discgolf: in de mand rinkelt op vol niveau');
ok(names(discgolfFx({ type: 'landing', reason: 'rattle' })) === 'disc_ketting' && discgolfFx({ type: 'landing', reason: 'rattle' })[0].gain < 1, 'discgolf: aan de ketting rinkelt zachter');
ok(names(discgolfFx({ type: 'landing', reason: 'tree' })) === 'disc_boom', 'discgolf: tegen de boom klinkt dof');
ok(names(discgolfFx({ type: 'landing', reason: 'water' })) === 'splash', 'discgolf: het water is de bestaande plons');
ok(discgolfFx({ type: 'landing', reason: 'land' }).length === 0, 'discgolf: een disc op het gras is stil');

ok(names(skateFx({ type: 'air', pop: true })) === 'skate_pop', 'skatepark: een pop tikt');
ok(skateFx({ type: 'air', pop: false }).length === 0, 'skatepark: de rest van de sprong is stil');
ok(names(skateFx({ type: 'grind' })) === 'skate_grind', 'skatepark: de leuning giert');
ok(names(skateFx({ type: 'land', height: 2.5 })) === 'skate_land' && skateFx({ type: 'land', height: 2.5 })[0].gain > skateFx({ type: 'land', height: 0 })[0].gain, 'skatepark: hoger landen is harder');
ok(names(skateFx({ type: 'bail', why: 'rail' })) === 'skate_val' && names(skateFx({ type: 'grindfall' })) === 'skate_val', 'skatepark: een val klinkt, ook van de leuning');
ok(skateFx({ type: 'bump' }).length === 0, 'skatepark: een botsing tegen de rand is stil');

ok(names(climbFx({ type: 'grip', hold: { big: true } })) === 'klim_greep', 'klimtoren: de hand pakt de greep');
ok(climbFx({ type: 'grip', hold: { big: true } })[0].gain >= climbFx({ type: 'grip', hold: {} })[0].gain, 'klimtoren: een grote greep is niet zachter');
ok(names(climbFx({ type: 'chalk' })) === 'klim_kalk', 'klimtoren: magnesium sist');
ok(names(climbFx({ type: 'fall', height: 12 })) === 'klim_val' && climbFx({ type: 'fall', height: 12 })[0].gain > climbFx({ type: 'fall', height: 1 })[0].gain, 'klimtoren: een hoge val klinkt harder');
ok(climbFx({ type: 'top' }).length === 0 && climbFx({ type: 'let-go', hand: 'a' }).length === 0, 'klimtoren: boven en loslaten zijn stil (daar is de stem)');
ok(all.length >= 10, 'de test raakt elke planner echt', String(all.length));

// -- de rij van de wereld ---------------------------------------------------
{
  const w = { audioEvents: [] };
  ok(pushFoley(w, discgolfFx({ type: 'worp', power: 0.7 }), 12, 34) === 1, 'pushFoley: een geluid erbij');
  ok(w.audioEvents.length === 1 && w.audioEvents[0].x === 12 && w.audioEvents[0].y === 34 && w.audioEvents[0].kind === 'fx', 'pushFoley: met de plek erbij');
  const p = { audioEvents: [] };
  pushFoley(p, skateFx({ type: 'grind' }));
  ok(p.audioEvents.length === 1 && !('x' in p.audioEvents[0]), 'pushFoley: zonder plek klinkt het bij de speler');
  ok(pushFoley({}, [{ kind: 'fx', name: 'skate_pop' }]) === 1 && pushFoley(null, [{ kind: 'fx' }]) === 0 && pushFoley(w, []) === 0, 'pushFoley: geen wereld of niets te spelen is geen fout');
  const full = { audioEvents: Array.from({ length: 64 }, () => ({ kind: 'fx', name: 'skate_pop' })) };
  pushFoley(full, [{ kind: 'fx', name: 'skate_pop' }]);
  ok(full.audioEvents.length === 64, 'pushFoley: de rij stopt bij 64 zoals audio.js verwacht');
}

// -- klank: de kettingen en het staal helder, de mat dof (scripts/sfx_spectrum.mjs) --
{
  const ket = describe('disc_ketting');
  ok(ket && ket.above1500 > 0.5, 'disc_ketting: kettingen klinken helder, geen doffe bons', ket && ket.above1500.toFixed(2));
  const grind = describe('skate_grind');
  ok(grind && grind.above1500 > 0.7, 'skate_grind: staal op staal is hoog', grind && grind.above1500.toFixed(2));
  const mat = describe('klim_val');
  ok(mat && mat.peaks[0] < 200, 'klim_val: de mat is laag, geen klap', mat && String(mat.peaks[0]));
  const pop = describe('skate_pop');
  ok(pop && pop.peak >= 0.4 && pop.secs <= 0.5, 'skate_pop: kort en met niveau', pop && pop.secs.toFixed(2));
}

// -- puur: geen audio en geen timers ---------------------------------------
const m = src('sfx/minigamefoley.js').replace(/\/\/.*$/gm, '');
ok(!/AudioContext|createGain|createBufferSource|setTimeout|setInterval|requestAnimationFrame/.test(m), 'minigamefoley: geen audio-nodes en geen timers');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
