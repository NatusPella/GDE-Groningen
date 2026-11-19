// De missie-stings (sfx/missiebank.js, sfx/stingen.js): gedrag, geen bronregex.
//   - elke klank rendert deterministisch (twee keer dezelfde samples), zonder NaN of Infinity, onder de piekgrens, met een korte
//     duur (stings hooguit 2,5 s) en zonder klik aan de randen
//   - de varianten verschillen; het speelniveau (gain x categorie x niveau) blijft onder het mixplan en de rangorde klopt
//     (stap zachter dan start, brons korter en zachter dan goud)
//   - muzikale samenhang: elke sting zit in de toonladder van het motief (spectrum: de sterkste toonhoogte is een noot van
//     C-groot pentatonisch of, bij mislukken en bijna mislukt, van de mineurkleur eromheen)
//   - stingen.js met een nagemaakte kit: de juiste bank, de sting-bus, kleine toonspreiding, afkoeltijd, rangorde (een lagere sting
//     klinkt niet door een hogere heen), stil, spraakdemping, de Effecten-schuif (de bus) en het aantal gelijktijdige stemmen
//   - de gebeurtenis voor de missie-agents (pushSting, stingVanEvent) en de medailleafbeelding
//   - de kassa (ui.js met world.kassaKlik) en de tram- en busbel (de linkup-regel)
//   - elke klank staat in docs/SFX-GAPS.md als gebouwd en in docs/SFX-LUISTERLIJST.md
//   node scripts/sfx_stingen_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.document = { querySelector: () => null, querySelectorAll: () => [], body: { classList: { contains: () => true } } };

const { renderData, variantsOf, bufferNames } = await import('../game/js/sfx/dsp.js');
const { FX_INFO } = await import('../game/js/sfx/fxbank.js');
const { MISSIE_FX, MISSIE_SOUNDS } = await import('../game/js/sfx/missiebank.js');
const { categoryLevel, speechDuckFactor, CATEGORIES } = await import('../game/js/sfx/mixplan.js');
const S = await import('../game/js/sfx/stingen.js');
const { initUiSfx, uiWorldInit, updateUiSfx } = await import('../game/js/sfx/ui.js');
const { createLinkups } = await import('../game/js/sfx/linkups.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + name + (info ? ' :: ' + info : '')); } };
const SR = 44100;

// --- 1. renderen -----------------------------------------------------------------------------------------------------
const stats = (d) => {
  let peak = 0, e = 0, bad = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i]; if (!Number.isFinite(x)) { bad++; continue; } peak = Math.max(peak, Math.abs(x)); e += x * x; }
  return { peak, rms: Math.sqrt(e / Math.max(1, d.length)), bad };
};
const duurVan = (name) => { const r = renderData(name, SR); return r.chs[0].length / r.sr; };
const STINGS = Object.entries(MISSIE_FX).filter(([, d]) => d.info.cat === 'sting');
ok(STINGS.length >= 14, 'de bank heeft de stings (11 namen, met varianten)', String(STINGS.length));
for (const [name, d] of Object.entries(MISSIE_FX)) {
  const a = renderData(name, SR), b = renderData(name, SR);
  ok(!!a && !!b, `${name}: rendert`);
  if (!a || !b) continue;
  ok(a.chs[0].every((x, i) => x === b.chs[0][i]), `${name}: twee keer renderen geeft dezelfde samples (zaad)`);
  const s = stats(a.chs[0]);
  ok(s.bad === 0, `${name}: geen NaN of Infinity`);
  ok(s.peak <= 0.92 && s.peak >= 0.5, `${name}: piek onder de grens en niet te zacht`, s.peak.toFixed(3));
  ok(s.rms > 0.02, `${name}: niet stil`, s.rms.toFixed(4));
  const dur = a.chs[0].length / a.sr;
  ok(dur > 0.3 && dur <= (d.info.cat === 'sting' ? 2.5 : 1.3), `${name}: korte duur (stings hooguit 2,5 s)`, dur.toFixed(2));
  ok(Math.abs(a.chs[0][0]) < 0.05 && Math.abs(a.chs[0][a.chs[0].length - 1]) < 0.05, `${name}: geen klik aan de randen`);
  const lvl = d.info.gain * categoryLevel(d.info.cat);
  ok(lvl > 0.1 && lvl <= 0.6, `${name}: speelniveau onder het mixplan (gain x categorie)`, lvl.toFixed(2));
  ok(bufferNames().includes(name) && FX_INFO[name] === d.info, `${name}: staat in de bank en in FX_INFO`);
  // de staart moet uitgeklonken zijn: de laatste tiende is veel zachter dan de piek
  const t = a.chs[0], l0 = Math.floor(t.length * 0.9);
  let e = 0; for (let i = l0; i < t.length; i++) e += t[i] * t[i];
  ok(Math.sqrt(e / (t.length - l0)) < 0.25 * s.peak, `${name}: de staart is uitgeklonken`);
}
for (const base of new Set(Object.keys(MISSIE_FX).filter((k) => /_\d$/.test(k)).map((k) => k.replace(/_\d$/, '')))) {
  const namen = variantsOf(base);
  ok(namen.length >= 2 && namen.length <= 4, `${base}: ${namen.length} varianten`);
  const a = renderData(namen[0], SR).chs[0];
  for (const nm of namen.slice(1)) {
    const b = renderData(nm, SR).chs[0];
    let v = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) v += Math.abs(a[i] - b[i]);
    ok(v / a.length > 0.005, `${nm} verschilt van ${namen[0]}`);
  }
}

// --- 2. niveau, lengte en rangorde ------------------------------------------------------------------------------------
const niveau = (naam) => FX_INFO[variantsOf(S.STING_NAAM[naam])[0] || S.STING_NAAM[naam]].gain * categoryLevel('sting') * S.STING_REGEL[naam].niveau;
const lang = (naam) => S.stingDuur(naam);
ok(S.STING_NAMEN.every((k) => S.STING_REGEL[k] && lang(k) > 0 && lang(k) <= 2.5), 'elke sting heeft een regel en duurt hooguit 2,5 s');
ok(niveau('stap') < niveau('start') && niveau('start') < niveau('geslaagd_groot') + 1e-9, 'stap zachter dan start, start niet luider dan het grote slot');
ok(niveau('brons') < niveau('zilver') + 1e-9 && niveau('zilver') < niveau('goud') + 1e-9 && lang('brons') < lang('zilver') && lang('zilver') < lang('goud'), 'brons, zilver en goud worden luider en langer');
ok(S.STING_REGEL.brons.rang < S.STING_REGEL.zilver.rang && S.STING_REGEL.zilver.rang < S.STING_REGEL.goud.rang, 'de rang volgt de medaille');
ok(S.STING_NAMEN.every((k) => niveau(k) <= 0.6), 'geen sting boven het mixplan (0,6)');
ok(CATEGORIES.sting && CATEGORIES.sting.speech < 1 && CATEGORIES.sting.speech >= 0.4, 'de categorie sting wordt door spraak gedempt, maar niet weggedrukt');
ok(speechDuckFactor('sting', 1) < speechDuckFactor('sting', 0) && speechDuckFactor('sting', 0) === 1, 'spraakdemping: stil zonder stem, zachter met een stem');

// muzikale samenhang: de sterkste toonhoogte (grove Goertzel-scan over C3 tot C7) is een noot van de gemeenschappelijke toonladder
function sterksteNoot(naam) {
  const d = renderData(naam, 22050), x = d.chs[0], sr = d.sr;
  const w = x.length;
  let beste = 0, bestM = -1;
  for (let midi = 48; midi <= 96; midi++) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), k = 2 * Math.cos(2 * Math.PI * f / sr);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < w; i += 2) { const s0 = x[i] + k * s1 - s2; s2 = s1; s1 = s0; }
    const m = s1 * s1 + s2 * s2 - k * s1 * s2;
    if (m > bestM) { bestM = m; beste = midi; }
  }
  return beste;
}
{
  const MAJEUR = new Set([0, 2, 4, 7, 9]);              // C-groot pentatonisch, relatief aan C
  const KLEUR = new Set([0, 2, 3, 4, 6, 7, 9, 10, 11]);    // plus de mineurtonen (Es, Bes), de spanningsnoot Fis en de bovenleidtoon
  for (const [name, d] of STINGS) {
    const pc = ((sterksteNoot(name) - 72) % 12 + 12) % 12;
    const mineur = /mislukt|bijna/.test(name);
    const set = mineur ? KLEUR : MAJEUR;
    ok(set.has(pc), `${name}: de sterkste toon (${pc} boven C) hoort bij de toonladder`, [...set].join());
    void d;
  }
}

// --- 3. stingen.js met een nagemaakte kit -----------------------------------------------------------------------------
function maakKit() {
  const kit = {
    t: 0, plays: [], tones: 0, mutedNow: false, praat: 0, ducks: [], bufLeeg: false,
    ctx: { get currentTime() { return kit.t; } },
    bank: { warm() {} },
    buses: { ui: { n: 'ui' }, sting: { n: 'sting' } },
    muted: () => kit.mutedNow,
    speech: () => kit.praat,
    duckAmb: (a, h) => kit.ducks.push([a, h]),
    tone() { kit.tones++; },
    noise() { kit.tones++; },
    buf(name, o) { if (kit.bufLeeg) return null; kit.plays.push({ name, t: kit.t, gain: o.gain, rate: o.rate, bus: o.bus.n, delay: o.delay || 0 }); return {}; },
  };
  return kit;
}
{
  const k = maakKit(); S.initStingen(k);
  ok(S.speel('start') === true && k.plays.length === 1, 'start speelt');
  const p = k.plays[0];
  ok(/^missie_start_\d$/.test(p.name) && p.bus === 'sting' && p.gain > 0 && p.gain <= 0.6, 'de juiste bank, op de sting-bus, onder het mixplan', JSON.stringify(p));
  ok(p.rate >= 0.99 - 1e-9 && p.rate <= 1.01 + 1e-9, 'een toonspreiding van hooguit 1 procent, zodat de sting in toon blijft', String(p.rate));
  ok(k.ducks.length === 1 && k.ducks[0][0] > 0, 'een start dempt de omgeving even');
  k.t = 1; ok(S.speel('start') === true && k.plays.length === 1, 'binnen de afkoeltijd klinkt start niet nog eens (en geeft geen terugval)');
  k.t = 4; S.speel('start');
  ok(k.plays.length === 2 && k.plays[1].name !== k.plays[0].name, 'een volgende start kiest een andere variant dan de vorige');
  ok(S.speel('bestaatniet') === false && S.speel('') === false && S.speel(undefined) === false, 'een onbekende naam speelt niets en geeft false');
  k.mutedNow = true; k.t = 20; ok(S.speel('goud') === true && k.plays.length === 2, 'stil (dempknop) is stil');
  k.mutedNow = false;
  k.bufLeeg = true; k.t = 30; ok(S.speel('geslaagd') === false, 'een bank die nog rendert geeft false (de aanroeper valt terug op het oude geluid)');
  k.bufLeeg = false;
}
{
  // rangorde: een lagere sting klinkt niet door een hogere heen; een hogere breekt door een lagere heen
  const k = maakKit(); S.initStingen(k);
  k.t = 10; S.speel('geslaagd_groot');
  k.t = 10.3; S.speel('stap'); S.speel('start');
  ok(k.plays.length === 1, 'tijdens het grote slot klinken stap en start niet');
  const k2 = maakKit(); S.initStingen(k2);
  k2.t = 10; S.speel('stap'); k2.t = 10.1; S.speel('goud');
  ok(k2.plays.length === 2 && k2.plays[1].name === 'medaille_goud', 'goud klinkt wel door een stap heen');
  k2.t = 10.15; S.speel('scene_in'); S.speel('bijna');
  ok(k2.plays.length === 2, 'nooit meer dan twee stings tegelijk');
  k2.t = 14; S.speel('scene_in'); ok(k2.plays.length === 3, 'daarna klinkt de volgende weer');
}
{
  // spraak: de sting is zachter terwijl iemand praat
  const k = maakKit(); S.initStingen(k);
  k.t = 5; S.speel('start'); k.t = 10; k.praat = 1; S.speel('start');
  const stil = k.plays[0].gain, praat = k.plays[1].gain;
  ok(praat < stil * 0.7 && praat > stil * 0.5, 'een stem dempt de sting tot 60 procent', `${stil.toFixed(3)} -> ${praat.toFixed(3)}`);
}
{
  // een druk scenario van drie minuten: een missie met stappen, mislukken en weer proberen, medailles; hoeveel stemmen tegelijk
  let seed = 11;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const k = maakKit(); S.initStingen(k);
  for (let t = 0; t < 180; t += 0.25) {
    k.t = t;
    if (rnd() < 0.3) S.speel(S.STING_NAMEN[Math.floor(rnd() * S.STING_NAMEN.length)]);
  }
  const lijst = k.plays.map((p) => ({ ...p, eind: p.t + p.delay + duurVan(p.name) }));
  let piek = 0;
  for (const p of lijst) piek = Math.max(piek, lijst.filter((q) => q.t <= p.t && q.eind > p.t).length);
  ok(lijst.length > 20, 'het scenario speelt genoeg stings', String(lijst.length));
  ok(piek <= 3, `hooguit 3 stings tegelijk in een willekeurig scenario (nu ${piek}; twee door de poort plus een uitklinkende staart)`, String(piek));
  ok(lijst.every((p) => Number.isFinite(p.gain) && p.gain > 0 && p.gain <= 0.6), 'elk speelniveau is eindig en onder het mixplan');
  let perSeconde = 0;
  for (let s = 0; s < 180; s++) perSeconde = Math.max(perSeconde, lijst.filter((q) => q.t >= s && q.t < s + 1).length);
  ok(perSeconde <= 3, `hooguit 3 stings per seconde (nu ${perSeconde})`, String(perSeconde));
}
{
  // de poort zelf
  const p = S.maakPoort();
  ok(p.request('start', 0) && !p.request('start', 1) && p.request('start', 3.5) && p.actief(3.6) >= 1, 'poort: afkoeltijd per naam');
  ok(!p.request('x', 0) && !p.request('stap', NaN), 'poort: onbekende naam en NaN worden geweigerd');
}

// --- 4. de gebeurtenis voor de missie-agents ----------------------------------------------------------------------------
{
  const w = {};
  ok(S.pushSting(w, 'stap') && w.audioEvents.length === 1 && w.audioEvents[0].kind === 'missiesting' && w.audioEvents[0].name === 'stap', 'pushSting legt een gebeurtenis in de wereldrij');
  ok(S.stingVanEvent(w.audioEvents[0]) === 'stap' && S.stingVanEvent({ kind: 'missiesting', name: 'bestaatniet' }) === null && S.stingVanEvent({ kind: 'sting', name: 'stap' }) === null && S.stingVanEvent(null) === null, 'stingVanEvent keurt de naam en de soort');
  ok(!S.pushSting(w, 'nee') && !S.pushSting(null, 'stap') && !S.pushSting(w, '__proto__') && !S.pushSting(w, 'toString'), 'pushSting weigert een onbekende naam (ook prototype-namen)');
  const vol = { audioEvents: new Array(64).fill({}) };
  ok(!S.pushSting(vol, 'stap') && vol.audioEvents.length === 64, 'pushSting loopt de rij niet over de grens');
  ok(S.medailleSting(1) === 'brons' && S.medailleSting(2) === 'zilver' && S.medailleSting(3) === 'goud' && S.medailleSting(0) === null && S.medailleSting(undefined) === null && S.medailleSting(4) === null, 'medailleSting: 1 brons, 2 zilver, 3 goud');
  ok(S.stingen.speel === S.speel && S.stingen.push === S.pushSting, 'het stingen-object is de API');
}

// --- 5. de kassa (ui.js) ------------------------------------------------------------------------------------------------
{
  const wereld = (o = {}) => ({ money: 500, wanted: 0, messages: [], vehicles: [], phoneHistory: [], paused: false, ...o });
  const k = maakKit(); const w = wereld();
  initUiSfx(k); uiWorldInit(w);
  w.money = 480; w.kassaKlik = true; k.t = 1; updateUiSfx(0.016, w);
  ok(k.plays.length === 1 && /^winkel_kassa_\d$/.test(k.plays[0].name) && k.plays[0].bus === 'ui', 'een aankoop klinkt als een kassa op de UI-bus', JSON.stringify(k.plays.map((p) => p.name)));
  ok(w.kassaKlik === false, 'de kassavlag wordt elk beeld gewist');
  w.money = 460; k.t = 3; updateUiSfx(0.016, w);
  ok(k.plays.length === 2 && /^ui_uitgave_\d$/.test(k.plays[1].name), 'geld dat daalt zonder aankoop (een boete) blijft ui_uitgave');
  w.money = 440; w.kassaKlik = true; w.paused = true; k.t = 6; updateUiSfx(0.016, w);
  ok(k.plays.length === 2 && w.kassaKlik === false, 'in de pauze geen kassa, en de vlag blijft niet hangen');
  // een mislukte missie klinkt als de nieuwe sting (de bank is er), niet meer als het oude zaagtandje
  const k2 = maakKit(); const w2 = wereld(); initUiSfx(k2); uiWorldInit(w2);
  w2.messages.push({ text: 'Missie mislukt: te laat', kind: 'missie', key: 'a', until: 99 }); k2.t = 2; updateUiSfx(0.016, w2);
  ok(k2.plays.some((p) => p.name === 'missie_mislukt' && p.bus === 'sting'), 'een melding met mislukt speelt de mislukt-sting op de sting-bus', JSON.stringify(k2.plays.map((p) => p.name)));
}

// --- 6. de tram- en busbel (de linkup-regel) ------------------------------------------------------------------------------
{
  const tram = { x: 10, y: 0, isTram: true, speed: 0, doors: { loose: {}, open: {} } };
  const bus = { x: -10, y: 0, isBus: true, speed: 0, doors: { loose: {}, open: {} } };
  const auto = { x: 5, y: 5, speed: 0, doors: { loose: {}, open: {} } };
  const ver = { x: 500, y: 0, isTram: true, speed: 0, doors: { loose: {}, open: { d1a: 1 } } };
  const env = { bridges: () => [], trains: () => [], vehicles: () => [tram, bus, auto, ver], listener: () => ({ x: 0, y: 0 }) };
  const L = createLinkups();
  const stap = (t) => L.step({ time: t, paused: false, player: { x: 0, y: 0, swimming: false } }, env).filter((e) => /_bel$/.test(e.name)).map((e) => ({ ...e }));
  stap(0);
  tram.speed = 5; bus.speed = 5; auto.speed = 8; ver.speed = 5;
  ok(stap(1).length === 0, 'een tram of bus die rijdt zonder dat de deuren open waren, belt niet (verkeer, een stoplicht)');
  tram.speed = 0; bus.speed = 0; tram.doors.open.d1a = 1; bus.doors.open.d0a = 1; stap(2);
  tram.doors.open.d1a = 0; bus.doors.open.d0a = 0; stap(3);
  tram.speed = 3; bus.speed = 3; auto.speed = 4; ver.speed = 6;
  const r = stap(4);
  ok(r.length === 2 && r.some((e) => e.name === 'tram_bel' && e.x === 10) && r.some((e) => e.name === 'bus_bel' && e.x === -10), 'bij het wegrijden na een halte: tram_bel voor de tram, bus_bel voor de bus, niets voor de auto of voor wat ver weg is', JSON.stringify(r.map((e) => e.name)));
  ok(stap(5).length === 0, 'een keer per vertrek');
  ok(Object.keys(FX_INFO).includes('tram_bel_0') && FX_INFO.tram_bel_0.cat === 'voertuig' && FX_INFO.bus_bel.cat === 'voertuig', 'tram_bel en bus_bel zijn voertuiggeluiden in de bank');
}

// --- 7. de dekkingstabel en de luisterlijst ---------------------------------------------------------------------------------
const gaps = fs.readFileSync(path.join(root, 'docs', 'SFX-GAPS.md'), 'utf8');
const lijst = fs.readFileSync(path.join(root, 'docs', 'SFX-LUISTERLIJST.md'), 'utf8');
for (const naam of MISSIE_SOUNDS) {
  ok(gaps.includes('`' + naam + '`'), `SFX-GAPS.md noemt ${naam}`);
  ok(lijst.includes('`' + naam + '`'), `SFX-LUISTERLIJST.md noemt ${naam}`);
}
const bouw = fs.readFileSync(path.join(root, 'docs', 'missies', 'BOUWSTENEN.md'), 'utf8');
for (const naam of S.STING_NAMEN) ok(bouw.includes("'" + naam + "'"), `BOUWSTENEN.md beschrijft de sting '${naam}'`);

if (fails) { console.log(`${fails} van ${n} mislukt`); process.exit(1); }
console.log(`sfx_stingen_test: ${n}/${n} ok`);
