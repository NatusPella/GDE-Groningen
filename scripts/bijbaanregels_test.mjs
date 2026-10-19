// Tien nieuwe bijbanen (game/js/bijbaanregels.js, #192): elke baan haalt met goed spel een
// beloning, met slecht spel een mislukte ronde, is herhaalbaar met een seed en geeft geen NaN.
import { BIJBANEN, BIJBAAN_IDS, bijbaanById, startRonde, stapRonde, rondeResultaat } from '../game/js/bijbaanregels.js';
import { mulberry32 } from '../game/js/rng.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

ok(BIJBANEN.length === 10 && new Set(BIJBAAN_IDS).size === 10, 'tien unieke banen');
const REGIOS = ['stad', 'hogeland', 'eemsdelta', 'wadden', 'westerkwartier', 'oldambt', 'veenkolonien'];
for (const b of BIJBANEN) {
  ok(REGIOS.includes(b.regio), 'regio', b.id);
  const txt = [b.naam, b.bedrijf, b.blurb, ...b.intro].join(' ');
  ok(b.intro.length >= 2 && b.blurb && b.bedrijf, 'tekst', b.id);
  ok(!/\b(uber|deliveroo|thuisbezorgd|flixbus|arriva|ns |connexxion|google|ikea|albert heijn)\b/i.test(txt), 'geen echte merken', b.id);
  ok(!/sneeuw|winter|vorst|bloed|dood|gewond|ziekenhuis/i.test(txt), 'zomer en geen leed', b.id);
  ok(!/de Grunn/.test(txt), 'Grunn', b.id);
}
ok(new Set(BIJBANEN.map((b) => b.bedrijf)).size === 10, 'tien eigen bedrijven');
ok(new Set(BIJBANEN.map((b) => b.regio)).size >= 6, 'spreiding over de streken');

// Een speler per baan: goed (rustig, op het doel af) en slecht (rijdt te hard, doet niks).
// `ctx` houdt bij waar het doel is: dist loopt af tot 0 en begint opnieuw bij een nieuw doel.
const GOOD = {
  fietssoep: (t, ctx) => ({ speed: 4, decel: 0.5, lat: 1, dist: ctx.near(3, 14) }),
  taxinacht: (t, ctx) => ({ speed: t < 60 ? 12 : 0.5, decel: 0.6, dist: t < 60 ? 400 - t * 6.5 : 3 }),
  veerdienst: (t) => ({ speed: t < 100 ? 2 : 0.3, harbour: true, dist: t < 100 ? 80 - t * 0.8 : 3 }),
  balenrit: (t) => ({ lat: 1.5, dist: t < 60 ? 100 - t : 2 }),
  kermisdraai: (t, ctx) => ({ act: ctx.pulse(t) }),
  berging: (t) => ({ speed: t < 5 ? 0.2 : t < 40 ? 8 : 0.5, dist: t < 5 ? 2 : t < 40 ? 80 : 3 }),
  strandpost: (t, ctx) => ({ act: !!ctx.activeNow, dist: ctx.activeNow ? 1 : 50 }),
  schoolrit: (t, ctx) => ({ speed: ctx.stopPhase(t) ? 0 : 9, decel: 0.5, dist: ctx.stopPhase(t) ? 1 : 60 }),
  melkrit: (t, ctx) => ({ speed: ctx.farmPhase(t) ? 0.2 : 10, dist: ctx.farmPhase(t) ? 1 : 100 }),
  brugdienst: (t, ctx) => ({ act: ctx.brug(t) }),
};
const BAD = {
  fietssoep: () => ({ speed: 9, decel: 6, lat: 7, dist: 50 }),
  taxinacht: () => ({ speed: 28, decel: 6, dist: 500 }),
  veerdienst: () => ({ speed: 6, harbour: true, dist: 60 }),
  balenrit: () => ({ lat: 9, dist: 500 }),
  kermisdraai: () => ({ act: true }),
  berging: () => ({ speed: 1, dist: 50 }),
  strandpost: () => ({ act: false, dist: 90 }),
  schoolrit: () => ({ speed: 25, decel: 6, dist: 80 }),
  melkrit: () => ({ speed: 12, dist: 200 }),
  brugdienst: () => ({ act: true }),
};

function ctxFor(r) {
  let nearT = 0, pulseT = 0, brugT = 0;
  return {
    near(every, hold) { nearT++; return nearT % (hold * 10) < 2 ? 1 : 50; },                 // af en toe bij een doel
    pulse(t) { pulseT++; return pulseT % 14 === 0; },                                         // om de 1,4 s
    get activeNow() { return !!r.s.active; },
    stopPhase(t) { return Math.round(t * 10) % 80 < 25; },                                      // 2,5 s stilstaan per 8 s
    farmPhase(t) { return Math.round(t * 10) % 120 < 12; },
    brug(t) { brugT++; return brugT % 300 === 0; },                                           // om de 30 s wisselen
  };
}

function speel(id, speler, seed, level, seconds = 400) {
  const r = startRonde(id, level, mulberry32(seed));
  const ctx = ctxFor(r);
  const log = [];
  for (let k = 0; k < seconds * 10 && !r.over; k++) {
    const t = k / 10;
    log.push(...stapRonde(r, speler[id](t, ctx), 0.1).map((e) => e.type));
  }
  return { r, log, res: rondeResultaat(r) };
}

for (const id of BIJBAAN_IDS) {
  ok(startRonde('xx') === null && bijbaanById('xx') === null, 'onbekende baan');
  const bad = speel(id, BAD, 3, 2);
  ok(bad.res.failed || bad.res.base + bad.res.tip < 40, 'slecht spel levert weinig of niets', `${id} ${JSON.stringify(bad.res)}`);
  ok(bad.res.base + bad.res.tip <= (bad.res.failed ? 0 : 40), 'slecht = geen volle beloning', id);
  const good = speel(id, GOOD, 3, 2);
  const again = speel(id, GOOD, 3, 2);
  ok(JSON.stringify(good.log) === JSON.stringify(again.log) && JSON.stringify(good.res) === JSON.stringify(again.res), 'zelfde seed, zelfde ronde', id);
  const nums = [good.res.base, good.res.tip, bad.res.base, bad.res.tip];
  ok(nums.every((v) => Number.isFinite(v) && v >= 0 && v < 1000), 'beloning netjes', `${id} ${nums}`);
  ok(good.r.over === 'done' && !good.res.failed, 'goed spel rondt af', `${id} over=${good.r.over} ${JSON.stringify(good.res)} ${good.log.slice(-4)}`);
  ok(good.res.base > 0 && good.res.text, 'goed spel verdient', id);
  ok(good.res.base + good.res.tip > bad.res.base + bad.res.tip, 'goed loont meer dan slecht', id);
  // niveau 1 tot 5: de ronde blijft geldig
  for (const lvl of [1, 3, 5]) {
    const r = startRonde(id, lvl, mulberry32(9));
    const nanFree = Object.values(r.s).every((v) => typeof v !== 'number' || Number.isFinite(v));
    ok(nanFree, 'beginstand zonder NaN', `${id} ${lvl}`);
  }
}
// hogere niveaus zijn merkbaar lastiger
ok(startRonde('fietssoep', 5).s.drops > startRonde('fietssoep', 1).s.drops, 'fietssoep: meer adressen op niveau 5');
ok(startRonde('balenrit', 5).s.limit < startRonde('balenrit', 1).s.limit, 'balenrit: strengere bochtlimiet');
ok(startRonde('schoolrit', 5).s.limit < startRonde('schoolrit', 1).s.limit, 'schoolrit: lagere limiet');
ok(startRonde('melkrit', 5).s.heat > startRonde('melkrit', 1).s.heat, 'melkrit: warmer');
// na het einde doet stapRonde niks meer
const e = startRonde('balenrit', 1);
for (let k = 0; k < 400 && !e.over; k++) stapRonde(e, { lat: 9, dist: 500 }, 0.1);
ok(e.over === 'fail' && stapRonde(e, { dist: 0 }, 0.1).length === 0, 'na fail geen events meer');
console.log(`bijbaanregels_test: ${n - fails}/${n} ok`);
process.exitCode = fails ? 1 : 0;

// adapter-gegevens: doelen per rijdende baan (sidejob_bijbaan.js gebruikt DOELEN)
{
  const { DOELEN, startRonde: sr } = await import('../game/js/bijbaanregels.js');
  for (const id of Object.keys(DOELEN)) {
    for (const lvl of [1, 3, 5]) {
      const r = sr(id, lvl);
      const total = DOELEN[id].total(r.s), at = DOELEN[id].at(r.s);
      if (!(total >= 1 && at >= 0 && at < total)) { console.log('FAIL doelen', id, lvl, total, at); process.exitCode = 1; }
    }
  }
  const src = (await import('node:fs')).readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  if (!/BIJBAAN_JOBS\]/.test(src) && !/\.\.\.BIJBAAN_JOBS/.test(src)) { console.log('FAIL bijbanen staan niet in SIDE_JOBS'); process.exitCode = 1; }
  const ad = (await import('node:fs')).readFileSync(new URL('../game/js/sidejob_bijbaan.js', import.meta.url), 'utf8');
  for (const id of Object.keys(DOELEN)) if (!ad.includes(`maak('${id}'`)) { console.log('FAIL adapter mist', id); process.exitCode = 1; }
}

// veerdienst-adapter (sidejob_veer.js): vaarlijn, steigerdoel en registratie
{
  const fs = await import('node:fs');
  // rondvaart importeert three: de lijn tellen we uit de bron
  const rv = fs.readFileSync(new URL('../game/js/sidejob_rondvaart.js', import.meta.url), 'utf8');
  const LINE = (rv.match(/export const LINE = (\[\[.*?\]\]);/s) || [, '[]'])[1].match(/\[[-\d.]+, [-\d.]+\]/g) || [];
  const v = fs.readFileSync(new URL('../game/js/sidejob_veer.js', import.meta.url), 'utf8');
  const s = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  if (!/veerdienst/.test(s.split(/\r?\n/).find((l) => l.startsWith('export const SIDE_JOBS')))) { console.log('FAIL veerdienst niet in SIDE_JOBS'); process.exitCode = 1; }
  const m = v.match(/VAN = (\d+), NAAR = (\d+)/);
  if (!m || !LINE[+m[1]] || !LINE[+m[2]] || +m[1] === +m[2]) { console.log('FAIL veerdienst-lijnindices'); process.exitCode = 1; }
  else console.log('veerdienst-adapter ok');
}

// paneel-adapter (sidejob_paneel.js): strandpost, kermisdraai, brugdienst in SIDE_JOBS
{
  const fs = await import('node:fs');
  const p = fs.readFileSync(new URL('../game/js/sidejob_paneel.js', import.meta.url), 'utf8');
  const s = fs.readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
  let bad = 0;
  for (const id of ['strandpost', 'kermisdraai', 'brugdienst']) if (!p.includes(`'${id}'`)) { console.log('FAIL paneel mist', id); bad++; }
  if (!/PANEEL_JOBS/.test(s.split(/\r?\n/).find((l) => l.startsWith('export const SIDE_JOBS')))) { console.log('FAIL PANEEL_JOBS niet in SIDE_JOBS'); bad++; }
  if (bad) process.exitCode = 1; else console.log('paneel-adapter ok');
}
