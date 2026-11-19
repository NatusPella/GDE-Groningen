// De proefspeler (Spelbot --mens): de pure menselijke regels en de waarneming (scripts/bot/mens.mjs), droog, zonder Electron.
//   node scripts/mens_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  MENS, rng, gauss, reactieMs, Ruis, ruisStick, mensProfiel, situatieSleutel, pogingenOp,
  cameraUitMatrix, cameraKijkt, projecteer, afdekking, doelZichtbaarheid, bewegingsSpreiding, TekstDuur, OogRem, bouwOogMoment,
} from './bot/mens.mjs';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };

// --- seed en reactietijd ---
t('rng: dezelfde seed geeft dezelfde reeks, een andere seed een andere', () => {
  const a = rng(5), b = rng(5), c = rng(6);
  const ra = [a(), a(), a(), a()], rb = [b(), b(), b(), b()], rc = [c(), c(), c(), c()];
  assert.deepEqual(ra, rb);
  assert.notDeepEqual(ra, rc);
  assert.ok(ra.every((v) => v >= 0 && v < 1));
});

t('reactietijd: altijd 250 tot 400 ms, gemiddeld in het midden, vaker midden dan rand', () => {
  const r = rng(1);
  const xs = Array.from({ length: 4000 }, () => reactieMs(r));
  assert.ok(xs.every((x) => x >= 250 && x <= 400), 'binnen de grenzen');
  assert.ok(Math.abs(mean(xs) - 325) < 6, `gemiddelde ${mean(xs)}`);
  assert.ok(Math.min(...xs) < 275 && Math.max(...xs) > 375, 'het hele bereik komt voor');
  const rand = xs.filter((x) => x < 275 || x > 375).length, midden = xs.filter((x) => x >= 300 && x <= 350).length;
  assert.ok(midden > rand, 'driehoekig: meer in het midden');
  assert.deepEqual(Array.from({ length: 5 }, ((q) => () => reactieMs(q))(rng(9))), Array.from({ length: 5 }, ((q) => () => reactieMs(q))(rng(9))));
});

t('reactietijd: eigen grenzen worden gevolgd', () => {
  const r = rng(2);
  for (let i = 0; i < 500; i++) { const x = reactieMs(r, { reactieMin: 100, reactieMax: 120 }); assert.ok(x >= 100 && x <= 120); }
});

t('gauss: gemiddeld 0 en spreiding 1', () => {
  const r = rng(3), xs = Array.from({ length: 20000 }, () => gauss(r));
  assert.ok(Math.abs(mean(xs)) < 0.03 && Math.abs(sd(xs) - 1) < 0.03);
});

// --- stuur- en richtruis ---
t('ruis: gemiddeld 0, spreiding bij sigma, en langzaam wandelend (geen witte ruis)', () => {
  const ru = new Ruis(rng(4), 0.07, 1.4);
  const xs = Array.from({ length: 30000 }, () => ru.stap(0.1));
  assert.ok(Math.abs(mean(xs)) < 0.01, `gemiddelde ${mean(xs)}`);
  assert.ok(Math.abs(sd(xs) - 0.07) < 0.012, `sd ${sd(xs)}`);
  const m = mean(xs); let c = 0, v = 0;
  for (let i = 1; i < xs.length; i++) { c += (xs[i] - m) * (xs[i - 1] - m); v += (xs[i] - m) ** 2; }
  assert.ok(c / v > 0.8, `autocorrelatie ${c / v} (een hand springt niet van tik tot tik)`);
});

t('ruisStick: stilstaan blijft stilstaan, een voertuig krijgt stuurruis, een voetganger een gedraaide richting van gelijke lengte', () => {
  assert.deepEqual(ruisStick(0, 0, { voertuig: true, stuurRuis: 0.5 }), [0, 0]);
  assert.deepEqual(ruisStick(0.3, -1, { voertuig: true, stuurRuis: 0.1 }).map((v) => Math.round(v * 100) / 100), [0.4, -1]);
  assert.equal(ruisStick(0.95, -1, { voertuig: true, stuurRuis: 0.5 })[0], 1, 'begrensd op 1');
  const [x, y] = ruisStick(0, -1, { voertuig: false, richtRuis: 0.1 });
  assert.ok(Math.abs(Math.hypot(x, y) - 1) < 1e-9 && Math.abs(Math.atan2(x, -y)) > 0.09, 'gedraaid, even lang');
  assert.deepEqual(ruisStick(0.5, 0.5, { voertuig: false, richtRuis: 0 }), [0.5, 0.5]);
});

t('mensProfiel: dezelfde seed geeft dezelfde reacties en dezelfde ruis, een andere seed niet', () => {
  const rij = (seed) => { const p = mensProfiel(seed); return [p.reactie(), p.reactie(), ...p.stick(0, -1, false), ...p.stick(0.2, -1, true)]; };
  assert.deepEqual(rij(7), rij(7));
  assert.notDeepEqual(rij(7), rij(8));
  assert.equal(mensProfiel(1).pogingen, MENS.pogingen);
  assert.equal(mensProfiel(1, { pogingen: 5 }).pogingen, 5);
});

t('mensProfiel: de stick wijkt af maar blijft dicht bij de bedoeling (geen sturende chaos)', () => {
  const p = mensProfiel(11), uit = Array.from({ length: 2000 }, () => p.stick(0, -1, true)[0]);
  assert.ok(sd(uit) > 0.03 && sd(uit) < 0.12 && Math.max(...uit.map(Math.abs)) < 0.5);
});

// --- reactie en pogingen ---
t('situatieSleutel: verandert bij een nieuw doel, gesprek of filmpje, niet bij positie of tijd', () => {
  const s = (o = {}) => ({ t: 1, player: { x: 1, y: 2 }, story: { id: 'M02' }, mission: { active: true, stage: 'goto' }, target: { name: 'Garage', distance: 50 }, blocking: {}, ...o });
  const a = situatieSleutel(s());
  assert.equal(a, situatieSleutel(s({ t: 99, player: { x: 50, y: 60 }, target: { name: 'Garage', distance: 3 } })));
  assert.notEqual(a, situatieSleutel(s({ target: { name: 'Uitgang', distance: 50 } })));
  assert.notEqual(a, situatieSleutel(s({ blocking: { cinematic: true } })));
  assert.notEqual(a, situatieSleutel(s({ blocking: { dialog: { text: 'Hoi' } } })));
  assert.notEqual(a, situatieSleutel(s({ mission: { active: true, stage: 'drive' } })));
});

t('pogingenOp: geeft op bij het ingestelde aantal mislukkingen', () => {
  assert.equal(pogingenOp(2, 3), false);
  assert.equal(pogingenOp(3, 3), true);
  assert.equal(pogingenOp(1), false);
  assert.equal(pogingenOp(MENS.pogingen), true);
});

// --- waarneming: projecteren en afdekken ---
t('cameraUitMatrix en projecteer: midden, rechts en links, achter de camera', () => {
  // de identiteit: de camera kijkt langs -Z (three-ruimte), dus in wereldcoördinaten naar -y
  const e = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const cam = cameraUitMatrix(e, 60, 16 / 9);
  const mid = projecteer(cam, { x: 0, y: -10, z: 0 }), rechts = projecteer(cam, { x: 5, y: -10, z: 0 }), links = projecteer(cam, { x: -5, y: -10, z: 0 }), boven = projecteer(cam, { x: 0, y: -10, z: 3 });
  assert.ok(Math.abs(mid.sx) < 1e-9 && Math.abs(mid.sy) < 1e-9);
  assert.ok(rechts.sx > 0 && links.sx < 0 && Math.abs(rechts.sx + links.sx) < 1e-9);
  assert.ok(boven.sy > 0);
  assert.equal(projecteer(cam, { x: 0, y: 10, z: 0 }), null, 'achter de camera');
  assert.equal(cameraUitMatrix([1, 2], 60), null);
});

t('projecteer: het beeldveld klopt met de kijkhoek (60 graden verticaal, op 10 m is de helft 5,77 m)', () => {
  const cam = cameraKijkt({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, 60, 16 / 9);
  const top = projecteer(cam, { x: 0, y: 10, z: Math.tan(Math.PI / 6) * 10 });
  assert.ok(Math.abs(top.sy - 1) < 1e-6, `sy ${top.sy}`);
  const kant = projecteer(cam, { x: 10 * Math.tan(Math.PI / 6) * (16 / 9), y: 10, z: 0 });
  assert.ok(Math.abs(Math.abs(kant.sx) - 1) < 1e-6, `sx ${kant.sx}`);
});

t('afdekking: een gebouw tussen camera en doel dat hoger is dan de lijn telt, een lager gebouw niet', () => {
  const cam = [0, 2, 0];   // three: X, Y (hoogte), Z
  const doel = { x: 0, y: 40, z: 1.5 };
  const muur = (h) => (x, y) => (y > 18 && y < 24 ? h : null);
  const hoog = afdekking(cam, doel, muur(12)), laag = afdekking(cam, doel, muur(1));
  assert.equal(hoog.afgedekt, true);
  assert.ok(hoog.y >= 18 && hoog.y <= 24 && hoog.hoogte === 12);
  assert.equal(laag.afgedekt, false);
  assert.equal(afdekking(cam, doel, () => null).afgedekt, false);
});

t('afdekking: het gebouw waar het doel zelf in staat telt niet', () => {
  const r = afdekking([0, 2, 0], { x: 0, y: 40, z: 1.5 }, (x, y) => (y > 38 ? 30 : null));
  assert.equal(r.afgedekt, false);
});

t('doelZichtbaarheid: in beeld, buiten beeld (met kant), achter de camera, afgedekt', () => {
  const cam = cameraKijkt({ x: 0, y: 0, z: 2 }, { x: 0, y: 30, z: 2 }, 60, 16 / 9);
  const vrij = doelZichtbaarheid(cam, { x: 0, y: 30, z: 1.5 });
  assert.equal(vrij.zichtbaar, true); assert.equal(vrij.reden, 'in beeld');
  const zijkant = doelZichtbaarheid(cam, { x: 200, y: 30, z: 1.5 });
  assert.equal(zijkant.zichtbaar, false); assert.equal(zijkant.opScherm, false); assert.match(zijkant.reden, /buiten beeld/);
  const achter = doelZichtbaarheid(cam, { x: 0, y: -30, z: 1.5 });
  assert.equal(achter.voorCamera, false); assert.equal(achter.zichtbaar, false); assert.match(achter.reden, /achter/);
  const dicht = doelZichtbaarheid(cam, { x: 0, y: 30, z: 1.5 }, { hoogteAt: (x, y) => (y > 10 && y < 14 ? 15 : null) });
  assert.equal(dicht.opScherm, true); assert.equal(dicht.afgedekt, true); assert.equal(dicht.zichtbaar, false); assert.match(dicht.reden, /gebouw/);
  assert.deepEqual(doelZichtbaarheid(null, { x: 1, y: 1 }), { bekend: false });
  assert.deepEqual(doelZichtbaarheid(cam, { x: NaN, y: 1 }), { bekend: false });
});

// --- vastzitten, prompts, rem, momentopname ---
t('bewegingsSpreiding: stilstand wordt herkend, beweging niet, een te korte reeks geeft null', () => {
  const stil = Array.from({ length: 24 }, (_, i) => ({ t: i * 0.5, x: 100 + (i % 2) * 0.1, y: 50 }));
  const loop = Array.from({ length: 24 }, (_, i) => ({ t: i * 0.5, x: 100 + i * 1.5, y: 50 }));
  assert.equal(bewegingsSpreiding(stil).stil, true);
  assert.equal(bewegingsSpreiding(loop).stil, false);
  assert.ok(bewegingsSpreiding(loop).sd > bewegingsSpreiding(stil).sd);
  assert.equal(bewegingsSpreiding(stil.slice(0, 4)), null);
  assert.equal(bewegingsSpreiding([]), null);
});

t('TekstDuur: telt hoe lang dezelfde tekst staat, begint opnieuw bij een andere, 0 zonder tekst', () => {
  const d = new TekstDuur();
  assert.equal(d.zie(10, 'Druk op E'), 0);
  assert.equal(d.zie(13.5, 'Druk op E'), 3.5);
  assert.equal(d.zie(14, 'Druk op F'), 0);
  assert.equal(d.zie(20, ''), 0);
  assert.equal(d.zie(21, 'Druk op F'), 0);
});

t('OogRem: per reden hooguit om de gap, dwingen mag altijd, andere redenen zijn onafhankelijk', () => {
  const r = new OogRem(4);
  assert.equal(r.mag('doel', 10), true);
  assert.equal(r.mag('doel', 12), false);
  assert.equal(r.mag('vast', 12), true);
  assert.equal(r.mag('doel', 14.1), true);
  assert.equal(r.mag('doel', 14.2, { dwing: true }), true);
});

t('bouwOogMoment: de gestructureerde momentopname met doel, zicht, ondertitel, kaart, schade, snelheid, frametijd en stilstand', () => {
  const s = {
    t: 123.4, wanted: 2,
    player: { x: 10, y: 20, health: 80, money: 55, vehicle: { kind: 'auto', speed: 7.5, health: 64 } },
    story: { id: 'M02', fails: 1 }, mission: { active: true, stage: 'garage', label: 'Rij de garage in' },
    target: { name: 'Spuit & Klaar', distance: 42.3 },
    hud: { objective: 'Even pinnen', subtitle: { speaker: 'Tessa', text: 'Daar is het.' }, messages: ['a', 'b', 'c', 'd'] },
    blocking: { cinematic: false, dialog: { text: 'Kiezen', options: [{ label: 'Ja' }, { label: 'Nee' }] } },
  };
  const o = bouwOogMoment({ reden: 'doel', s, zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, frameMs: 22.26, kaartTekst: 'Druk op E', kaartS: 3, spreiding: { sd: 4 }, stilS: 6.04, shot: 'M02-oog03-doel' });
  assert.equal(o.stap, 'M02'); assert.equal(o.fase, 'garage'); assert.equal(o.doelTekst, 'Even pinnen'); assert.equal(o.afstand, 42.3);
  assert.equal(o.ondertitel, 'Tessa: Daar is het.');
  assert.deepEqual(o.dialoog, { tekst: 'Kiezen', opties: ['Ja', 'Nee'] });
  assert.equal(o.berichten.length, 3);
  assert.deepEqual(o.kaart, { tekst: 'Druk op E', zichtbaarS: 3 });
  assert.deepEqual(o.voertuig, { soort: 'auto', gezondheid: 64, snelheid: 7.5 });
  assert.equal(o.gezondheid, 80); assert.equal(o.gezocht, 2); assert.equal(o.mislukt, 1);
  assert.equal(o.frameMs, 22.3); assert.equal(o.stilS, 6); assert.equal(o.shot, 'M02-oog03-doel');
  assert.equal(o.zicht.zichtbaar, false);
  JSON.stringify(o);
  const leeg = bouwOogMoment({ reden: 'begin', s: { t: 0, player: { x: 0, y: 0 }, story: {}, mission: {}, target: null, hud: {}, blocking: {} } });
  assert.equal(leeg.afstand, null); assert.equal(leeg.voertuig, null); assert.equal(leeg.kaart, null); assert.equal(leeg.dialoog, null); assert.equal(leeg.zicht.bekend, false);
});

// --- de koppeling met run.mjs en bot.page.js ---
t('run.mjs geeft mens.mjs als window.__botMens mee en de export-omzetting levert alle namen die de pagina gebruikt', () => {
  const run = fs.readFileSync(new URL('./bot/run.mjs', import.meta.url), 'utf8');
  assert.match(run, /window\.__botMens/);
  assert.match(run, /mens: flag\('mens'\)/);
  const bron = fs.readFileSync(new URL('./bot/mens.mjs', import.meta.url), 'utf8').replace(/^export (const|function|class) /gm, '$1 ');
  const lijst = run.match(/window\.__botMens = \(\(\) => \{[^]*?return \{ ([^}]*) \};/)[1].split(',').map((x) => x.trim());
  const api = new Function(`${bron}\nreturn { ${lijst.join(', ')} };`)();
  for (const k of lijst) assert.ok(api[k] !== undefined, `window.__botMens.${k}`);
  const page = fs.readFileSync(new URL('./bot/bot.page.js', import.meta.url), 'utf8');
  for (const m of page.matchAll(/Mens\.(\w+)/g)) assert.ok(lijst.includes(m[1]), `bot.page.js gebruikt Mens.${m[1]}, maar run.mjs geeft hem niet mee`);
});

t('bot.page.js: --mens weigert elke cheat, geeft op in plaats van een cheat en laat de oude paden zonder --mens ongemoeid', () => {
  const page = fs.readFileSync(new URL('./bot/bot.page.js', import.meta.url), 'utf8');
  assert.match(page, /B\.cheat\[k\] = \(\) => \{ B\.log\('cheat-geweigerd'/);
  assert.match(page, /const MENS = !!\(CFG\.mens && Mens\)/);
  assert.match(page, /result = 'OPGEGEVEN'/);
  assert.match(page, /if \(!MENS && s\.mission\.active && \(fails\[s\.story\.id\] \|\| 0\) >= failsMax/, 'de win-cheat na mislukken is uit bij --mens');
  assert.match(page, /!CFG\.zonderStartplek && !MENS &&/, 'de startplek-teleport is uit bij --mens');
  assert.match(page, /world\.devInvuln = !!CFG\.invulnerable && !CFG\.mens/, 'onkwetsbaar is uit bij --mens');
  // in rescue() staat de cheat-weigering vóór de cheats
  const i = page.indexOf('--mens: geen cheat'), j = page.indexOf("if (rung === 'teleport') ok = B.cheat.teleport()");
  assert.ok(i > 0 && j > i, 'de weigering staat voor de cheat-ladder');
});

console.log(`${n - fails}/${n} tests`);
process.exit(fails ? 1 : 0);
