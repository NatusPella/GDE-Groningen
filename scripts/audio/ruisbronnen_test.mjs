// Test van het ruisregister (game/js/audio/ruisbronnen.js) en de aansluiting: puur, zonder Electron en zonder audio-uitvoer.
//   node scripts/audio/ruisbronnen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNoiseRegistry, schoon, RUIS_GRENS, RUIS_STRIKES } from '../../game/js/audio/ruisbronnen.js';
import { formatAudioBlok } from '../../game/js/audiodiag.js';
import { scoreClip, fft } from './ruisachtig_scan.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

const fakeSrc = () => { const l = {}; return { addEventListener: (e, f) => { l[e] = f; }, eind: () => l.ended && l.ended() }; };
const fakeParam = (v) => { const p = { value: v, cancelled: 0, cancelScheduledValues() { p.cancelled++; } }; return p; };

// schoon
ok(schoon(NaN, 0) === 0 && schoon(Infinity, 3) === 3 && schoon('x', 1) === 1 && schoon(0.5) === 0.5 && schoon(undefined, 2) === 2, 'schoon');

// volg: tellen, einde, stapeling
{
  const r = createNoiseRegistry();
  const a = fakeSrc(), b = fakeSrc(), c = fakeSrc();
  r.volg('bed:wind', a); r.volg('bed:regen', b);
  ok(r.stand().lussen === 2 && r.stand().stapeling === 0, 'twee lussen, geen stapeling');
  r.volg('bed:wind', c);   // twee winden tegelijk: stapeling
  ok(r.stand().stapeling === 1 && r.stand().perNaam['bed:wind'] === 2 && /bed:wind/.test(r.stand().laatste), 'stapeling gemeld');
  a.eind(); a.eind();      // een tweede 'ended' telt niet dubbel
  ok(r.stand().perNaam['bed:wind'] === 1 && r.stand().lussen === 2, 'einde telt een keer');
  b.eind(); c.eind();
  ok(r.stand().lussen === 0 && r.stand().gestart === 3 && r.stand().gestopt === 3 && r.stand().piek['bed:wind'] === 2, 'alles opgeruimd');
  // zonder addEventListener (onended)
  const o = { onended: null }; let oud = 0; o.onended = () => { oud++; };
  r.volg('x', o); o.onended(); ok(r.stand().lussen === 0 && oud === 1, 'onended-terugval houdt de oude handler');
}

// bewaak en controleer: een open ruisstem die uit hoort te zijn
{
  let gefixt = [];
  const r = createNoiseRegistry({ onFix: (naam, p) => { gefixt.push(naam); p.cancelScheduledValues(0); p.value = 0; } });
  const heli = fakeParam(0.35), schuur = fakeParam(0), piep = fakeParam(0.3);
  const w = { policeHeli: false, paused: false };
  r.bewaak('heli', heli, (x) => !!x.policeHeli);
  r.bewaak('schuur', schuur, () => false);
  r.bewaak('piep', piep, () => true);
  ok(r.controleer(w).length === 0, 'een ronde: nog geen ingreep (uitfade kan lopen)');
  ok(r.stand().gecorrigeerd === 0, 'nog niet gecorrigeerd');
  const g = r.controleer(w);
  ok(RUIS_STRIKES === 2 && g.length === 1 && g[0] === 'heli' && heli.value === 0 && heli.cancelled === 1, 'tweede ronde: heli dichtgezet', JSON.stringify(g));
  ok(piep.value === 0.3 && schuur.value === 0, 'een stem die klinkt mag, een stille blijft stil');
  // de heli komt echt: niet dichtzetten
  heli.value = 0.35; w.policeHeli = true;
  r.controleer(w); r.controleer(w); r.controleer(w);
  ok(heli.value === 0.35 && r.stand().gecorrigeerd === 1, 'een gewenste stem blijft open');
  // eenmalig open onder de grens telt niet (uitfade)
  w.policeHeli = false; heli.value = RUIS_GRENS * 0.9;
  r.controleer(w); r.controleer(w); r.controleer(w);
  ok(r.stand().gecorrigeerd === 1, 'onder de hoorbaarheidsgrens: geen ingreep');
  // een NaN-gain staat vast en telt als open
  const kapot = fakeParam(NaN); const r2 = createNoiseRegistry({ onFix: (nm, p) => { p.value = 0; } });
  r2.bewaak('kapot', kapot, () => false);
  r2.controleer({}); r2.controleer({});
  ok(kapot.value === 0 && r2.stand().gecorrigeerd === 1 && /NaN/.test(r2.stand().laatste), 'NaN-gain wordt dichtgezet');
  // een kapotte verwacht-functie laat de stem met rust
  const r3 = createNoiseRegistry(); const p3 = fakeParam(0.5);
  r3.bewaak('gooit', p3, () => { throw new Error('x'); });
  r3.controleer({}); r3.controleer({}); r3.controleer({});
  ok(p3.value === 0.5, 'een gooiende verwacht-functie grijpt niet in');
}

// het tekstblok kent het register
{
  const blok = formatAudioBlok({ ctx: 'running', sampleRate: 48000, glitchesPerMin: 0, glitchesTotaal: 0, glitchWorst: 0, ingrepen: 0, clips: 0, nans: 0, guard: { gevangen: 0 }, voices: 1, master: 0.5, channels: 2,
    ruis: { lussen: 3, perNaam: { 'bed:wind': 2, motorlaag: 1 }, bewaakt: 4, gecorrigeerd: 1, stapeling: 1, laatste: 'ruis-vast heli-synth: gain 0.350 terwijl hij uit hoort' } });
  ok(/Ruisbronnen \(lussen\): 3 levend \(bed:wind 2x, motorlaag\), 4 doorlopende/.test(blok) && /Ruis die bleef hangen: 1x dichtgezet, 1x te veel/.test(blok), 'tekstblok toont de ruisbronnen', blok);
}

// de ruisscan: wit is ruis, een toon niet; de FFT klopt op een sinus
{
  const len = 22050;
  const wit = new Float32Array(len), toon = new Float32Array(len);
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < len; i++) { wit[i] = (rnd() * 2 - 1) * 0.1; toon[i] = Math.sin(i * 0.05) * 0.1 + Math.sin(i * 0.12) * 0.05; }
  ok(scoreClip(wit).aandeel > 0.95 && scoreClip(wit).staart > 15, 'witte ruis scoort als ruis');
  ok(scoreClip(toon).aandeel === 0, 'een toon scoort niet als ruis');
  const stil = new Float32Array(len).fill(0.0001);
  ok(scoreClip(stil).actief === 0 && scoreClip(stil).aandeel === 0, 'stilte is geen ruis');
  const re = new Float64Array(1024), im = new Float64Array(1024);
  for (let i = 0; i < 1024; i++) re[i] = Math.sin(2 * Math.PI * 64 * i / 1024);
  fft(re, im);
  ok(Math.hypot(re[64], im[64]) > 500 && Math.hypot(re[10], im[10]) < 1e-6, 'fft: een sinus staat in bin 64');
}

// de aansluiting in de bron: elke mixer apart bewaakt, de ruisstemmen bewaakt, de watchdog controleert, het bed is tegen NaN beschermd
{
  const au = fs.readFileSync(path.join(ROOT, 'game/js/audio.js'), 'utf8');
  const blok = au.slice(au.indexOf('function updateWorldMixers'), au.indexOf('const guardFails'));
  const regels = blok.split('\n').filter((l) => /^\s+(guarded\(|update)/.test(l));
  ok(regels.length >= 14 && regels.every((l) => /guarded\(/.test(l)), 'elke mixer in updateWorldMixers staat in guarded()', regels.filter((l) => !/guarded\(/.test(l)).join(' | '));
  for (const nm of ['heli-synth', 'schuren', 'bandenpiep-synth', 'rommel']) ok(au.includes(`ruis.bewaak('${nm}'`), 'bewaakt: ' + nm);
  ok(/ruis\.controleer\(world\)/.test(au), 'de watchdog roept ruis.controleer aan');
  ok(/ruis: \(\) => ruis\.stand\(\)/.test(au), 'de diagnose krijgt de ruisstand');
  ok(/track: \(naam, src, opts\) => ruis\.volg/.test(au), 'kit.track bestaat');
  const amb = fs.readFileSync(path.join(ROOT, 'game/js/sfx/ambience.js'), 'utf8');
  ok(/Number\.isFinite\(b\.target\)/.test(amb) && /Number\.isFinite\(b\.level\)/.test(amb) && /K\.track\('bed:'/.test(amb), 'ambience: bedden tegen NaN beschermd en geteld');
  ok(/Number\.isFinite\(duration \+ freq \+ q \+ gain \+ delay\)/.test(au), 'playNoiseBurst weigert een niet-eindige waarde');
}

console.log(`ruisbronnen_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
