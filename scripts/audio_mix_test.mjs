// De mix van 21-11 (#988, #1021): laagplan per omgeving (haven, spoor, verkeer overdag, occlusie, variatie), de stemlimiet per
// categorie, declick en de dempstand van de muziek onder een gesprek. node scripts/audio_mix_test.mjs
// Puur: geen Web Audio, geen DOM. Bronscans voor de aansluiting in ambience.js, audio.js en scenario.js.
import { readFileSync } from 'node:fs';
import {
  OMGEVING_LAGEN, ONTBRAK_21_11, havenNiveau, HAVEN_PEAK, spoorNiveau, treinHoornPauze, verkeerDagNiveau, scheepshoornPauze,
  occlusie, bedWobble, bedStartRate, crossfade,
} from '../game/js/sfx/lagenplan.js';
import { CAT_CAPS, capVoor, createStemTeller, declick, FADE_IN_S, FADE_UIT_S } from '../game/js/sfx/stemlimiet.js';
import { CATEGORIES, musicDuckGain, musicDuckStep, MUSIC_DUCK_KEEP } from '../game/js/sfx/mixplan.js';
import { SAMPLE_INFO } from '../game/js/sfx/samples.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const amb = src('../game/js/sfx/ambience.js');
const aud = src('../game/js/audio.js');
const scen = src('../game/js/audio/scenario.js');

// 1. audit: elke genoemde laag is een bed (of een gebeurtenis met !), elke omgeving heeft minstens drie lagen
const bedKeys = new Set([...amb.slice(amb.indexOf('const BED_DEFS'), amb.indexOf('let scanTimer')).matchAll(/^\s{2}(\w+): \{/gm)].map((m) => m[1]));
for (const [env, lagen] of Object.entries(OMGEVING_LAGEN)) {
  ok(lagen.length >= 2, `omgeving ${env} heeft lagen`, lagen.length);
  for (const l of lagen) if (!l.startsWith('!')) ok(bedKeys.has(l), `laag ${l} (${env}) is een bed in ambience.js`);
}
ok(Object.keys(OMGEVING_LAGEN).length >= 10, 'audit dekt de tien omgevingen');
for (const k of ONTBRAK_21_11) if (!k.startsWith('!')) ok(bedKeys.has(k), `nieuwe laag ${k} bestaat`);
// de opnames die de nieuwe lagen gebruiken zijn bestaande klanken
for (const k of ['boot_motor_stat', 'scheepshoorn_op', 'trein_hoorn_kort', 'trein_hoorn_lang', 'stad_nacht_nl']) ok(!!SAMPLE_INFO[k], `bestaande opname ${k}`);
ok(/boot_motor_stat/.test(amb) && /havenNiveau/.test(amb) && /spoorNiveau/.test(amb) && /occlusie\(/.test(amb) && /bedWobble/.test(amb), 'ambience.js gebruikt het laagplan');

// 2. haven
ok(havenNiveau({ industrial: 0.8, waterD: 5 }) > 0.9, 'haven: kade met loodsen');
ok(havenNiveau({ industrial: 0, waterD: 5 }) === 0, 'haven: water zonder industrie is geen haven');
ok(havenNiveau({ industrial: 1, waterD: 200 }) === 0, 'haven: industrie zonder water');
ok(havenNiveau({ industrial: 1, waterD: 5, sea: true }) === 0, 'haven: niet op open water');
ok(havenNiveau({ industrial: 0, waterD: 10, streek: 'eemsdelta' }) > 0.4, 'haven: de Eemsdelta aan het water');
ok(havenNiveau({ industrial: 1, waterD: 5, closed: true }) < havenNiveau({ industrial: 1, waterD: 5 }), 'haven: in een auto zachter');
ok(HAVEN_PEAK < 0.1, 'haven: de brom blijft onder de omgevingslagen');
ok(Number.isFinite(havenNiveau({ waterD: NaN, industrial: NaN })), 'haven: NaN-vrij');
ok(scheepshoornPauze(0.1) >= 40 && scheepshoornPauze(1) < scheepshoornPauze(0.3), 'scheepshoorn: vaker in een drukke haven');

// 3. spoor en verkeer
ok(spoorNiveau(0) === 1 && spoorNiveau(90) === 0 && spoorNiveau(Infinity) === 0, 'spoor: niveau naar afstand');
ok(treinHoornPauze(10, 0, 0, 0.5) < treinHoornPauze(80, 0, 0, 0.5), 'treinhoorn: dichterbij vaker');
ok(treinHoornPauze(10, 1, 0, 0.5) > treinHoornPauze(10, 0, 0, 0.5), 'treinhoorn: nacht zeldzamer');
ok(treinHoornPauze(10, 0, 0.9, 0.5) < 60, 'treinhoorn: bij veel regen alleen een korte controle, geen hoorn');
ok(verkeerDagNiveau(1, 1, 1, 0) > verkeerDagNiveau(0, 0, 1, 0), 'verkeer overdag: drukker is luider');
ok(verkeerDagNiveau(1, 1, 0, 0) === 0, 'verkeer overdag: niet in de nacht (daar is stadNacht)');
ok(verkeerDagNiveau(1, 1, 1, 1) < 0.01, 'verkeer overdag: niet op het platteland');

// 4. occlusie
ok(occlusie({}, 'city').lp === 20000 && occlusie({}, 'city').gain === 1, 'occlusie: buiten onaangetast');
ok(occlusie({ indoors: true }, 'city').lp < 1200 && occlusie({ indoors: true }, 'city').gain < 0.5, 'occlusie: in de flat dof en zachter');
ok(occlusie({ closed: true }, 'wind').lp < 2500, 'occlusie: gesloten voertuig dempt de hoge tonen');
ok(occlusie({ indoors: true }, 'binnen').lp === 20000 && occlusie({ indoors: true }, 'roof').gain === 1, 'occlusie: het binnengeluid blijft');
ok(occlusie({ closed: true }, 'regenAuto').gain === 1, 'occlusie: autoregen blijft');

// 5. variatie en kruisfade
let lo = 9, hi = 0;
for (let t = 0; t < 120; t += 0.5) { const w = bedWobble(t, 'polder', 0.08); lo = Math.min(lo, w); hi = Math.max(hi, w); }
ok(lo < 1 && hi > 1 && lo > 0.9 && hi < 1.1, 'wobble: klein en levend', `${lo.toFixed(3)} ${hi.toFixed(3)}`);
ok(bedWobble(5, 'polder') !== bedWobble(5, 'kust'), 'wobble: per laag een eigen fase');
ok(bedStartRate(0) >= 0.985 && bedStartRate(1) <= 1.015 && bedStartRate(0.5) === 1, 'startrate: +-1,5 procent');
for (let x = 0; x <= 1.0001; x += 0.1) { const c = crossfade(x); ok(Math.abs(c.a * c.a + c.b * c.b - 1) < 1e-9, 'kruisfade: gelijk vermogen', x); }
ok(crossfade(0).a === 1 && crossfade(1).b > 0.999, 'kruisfade: de einden');

// 6. stemlimiet per categorie
for (const cat of Object.keys(CAT_CAPS)) ok(!!CATEGORIES[cat], `categorie ${cat} bestaat in mixplan`);
for (const [k, i] of Object.entries(SAMPLE_INFO)) ok(CATEGORIES[i.cat], `opname ${k}: categorie ${i.cat} bekend`);
ok(capVoor('voetstap', 2) > capVoor('voetstap', 1) && capVoor('voetstap', 0) < capVoor('voetstap', 1), 'cap: prioriteit 2 ruimer, 0 krapper');
ok(capVoor('onbekend') === Infinity, 'cap: onbekende categorie alleen globale limiet');
ok(capVoor('wapen', 2) >= capVoor('voetstap', 1), 'cap: een schot valt niet door een stap');
{
  const t = createStemTeller();
  let toe = 0;
  for (let i = 0; i < 40; i++) if (t.neem('voetstap', 1)) toe++;
  ok(toe === capVoor('voetstap', 1), 'teller: voetstappen stoppen bij de cap', toe);
  ok(t.stats.geweigerd.voetstap === 40 - toe, 'teller: weigeringen geteld');
  ok(t.neem('wapen', 2), 'teller: een schot past nog');
  t.geef('voetstap'); ok(t.neem('voetstap', 1), 'teller: na vrijgeven weer plek');
  for (let i = 0; i < 100; i++) t.geef('voetstap');
  ok(t.aantal('voetstap') === 0, 'teller: nooit onder nul');
  ok(t.neem(null) === true, 'teller: zonder categorie altijd door');
}
ok(/stemTeller\.neem\(cat, prio\)/.test(aud) && /stemTeller\.geef\(cat\)/.test(aud), 'audio.js playBuf telt per categorie');
{
  // review 21-11 (N5): een mislukte start geeft de stem terug aan de teller (geen permanent volle categorie), en delay/rate worden bewaakt
  const a = aud.indexOf('function playBuf');
  const f = aud.slice(a, aud.indexOf('function playHit', a));
  ok(/Number\.isFinite\(delay\)/.test(f) && /Number\.isFinite\(rate\)/.test(f), 'playBuf bewaakt delay en rate (geen NaN-tijd)');
  ok(/catch \(e\) \{\s*activeVoices--;\s*stemTeller\.geef\(cat\);\s*return null;/.test(f), 'playBuf geeft de stem terug als de start mislukt');
  // gedrag van de teller: neem zonder geef vult de categorie, geef maakt weer ruimte
  const t = createStemTeller();
  const cat = Object.keys(CAT_CAPS)[0];
  let genomen = 0;
  while (t.neem(cat, 1)) { if (++genomen > 200) break; }
  t.geef(cat);
  ok(t.neem(cat, 1) === true, 'teller: na geef is er weer ruimte');
}
ok((aud.match(/cat: info\.cat/g) || []).length >= 2, 'playFx en playSample geven hun categorie door');

// 7. declick
{
  const d = declick(1.5);
  ok(d.fadeIn === FADE_IN_S && d.fadeUit === FADE_UIT_S && Math.abs(d.uitStart - (1.5 - FADE_UIT_S)) < 1e-9, 'declick: normale klank');
  ok(FADE_IN_S >= 0.003 && FADE_UIT_S <= 0.01, 'declick: binnen 3 tot 10 ms');
  const k = declick(0.01);
  ok(k.fadeIn + k.fadeUit <= 0.01 * 0.5 + 1e-12 && k.uitStart >= k.fadeIn, 'declick: een zeer korte klank blijft heel');
  ok(declick(2, true).fadeUit === 0, 'declick: een lus krijgt geen fade uit');
  const z = declick(NaN);
  ok(z.fadeIn === 0 && z.fadeUit === 0, 'declick: NaN geeft geen fade');
}
ok(/declick\(buffer\.duration/.test(aud) && /linearRampToValueAtTime\(level, t0 \+ dk\.fadeIn\)/.test(aud), 'audio.js playBuf past declick toe');

// 8. muziek onder dialoog
ok(musicDuckGain(0) === 1 && Math.abs(musicDuckGain(1) - MUSIC_DUCK_KEEP) < 1e-9, 'duck: 0 laat staan, 1 tot de helft');
ok(musicDuckGain(NaN) === 1 && musicDuckGain(7) === MUSIC_DUCK_KEEP, 'duck: NaN en buiten bereik');
{
  let l = 0;
  for (let i = 0; i < 30; i++) l = musicDuckStep(l, 1, 1 / 60);
  ok(l > 0.5 && l < 1, 'duck: zakt in ca. een halve seconde grotendeels', l.toFixed(2));
  const up = l;
  for (let i = 0; i < 30; i++) l = musicDuckStep(l, 0, 1 / 60);
  ok(l < up && l > 0.3, 'duck: komt trager terug dan hij zakt', l.toFixed(2));
  ok(Number.isFinite(musicDuckStep(NaN, NaN, NaN)), 'duck: NaN-vrij');
  ok(musicDuckStep(0.3, 1, 5) < 1, 'duck: een lange dt springt niet');
}
ok(/musicDuckStep\(scenarioDuck, cutMusicActive\(\) \? 0 : speech\.musicDuck\(\), dt\)/.test(scen) && /musicDuckGain\(scenarioDuck\)/.test(scen), 'scenariomuziek dempt onder een gesprek');

// 9. tabwissel
ok(/function softResume/.test(aud) && /softResume\(\);/.test(aud) && /ctx\.currentTime > softUntil/.test(aud), 'audio.js: zachte start na een tabwissel, wachter wacht even');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
