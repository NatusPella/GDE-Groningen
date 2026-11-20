// De hoekdetector van de QA-sweep (scripts/qa/hoeken.page.js, #985 #980): zonder Electron controleren we de pure meetkunde
// (radius lezen, schalen, punt in een afgeronde rechthoek), dat het bestand een bibliotheek van functiedeclaraties is die als
// paginascript parseert, en dat de sweep hem aanroept. Het beeldraster (schermen_sweep.mjs --beeld=1) bewaakt de echte schermen.
//   node scripts/hoeken_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); } };

const src = fs.readFileSync(path.join(ROOT, 'scripts/qa/hoeken.page.js'), 'utf8');
let parse = true;
try { new (Object.getPrototypeOf(async function () {}).constructor)(src); } catch (e) { parse = false; ok(false, 'hoeken.page.js parseert', e.message); }
ok(parse, 'hoeken.page.js parseert als functietekst');
ok(!/localStorage|sessionStorage/.test(src), 'de detector raakt geen opslag');
for (const f of ['parseRadius', 'schaalRadii', 'pointInRR', 'hoekScan', 'hoekMarkeer', 'hoekVerf', 'hoekVerftPunt']) ok(new RegExp(`^function ${f}\\(`, 'm').test(src), `functie ${f} staat erin`);

// de pure helpers los laden
const { parseRadius, schaalRadii, pointInRR } = new Function(`${src.slice(0, src.indexOf('// ---------- DOM-kant'))}\nreturn { parseRadius, schaalRadii, pointInRR };`)();
const rond = (a) => ({ tl: [a, a], tr: [a, a], br: [a, a], bl: [a, a] });
const vierkant = rond(0);

ok(parseRadius('12px', 100, 50).join() === '12,12', 'radius in px');
ok(parseRadius('12px 8px', 100, 50).join() === '12,8', 'radius met twee waarden');
ok(parseRadius('50%', 100, 50).join() === '50,25', 'radius in procent');
ok(parseRadius('0px', 100, 50).join() === '0,0' && parseRadius('', 10, 10).join() === '0,0', 'geen radius is 0');

const r = { left: 0, top: 0, right: 100, bottom: 40 };
ok(pointInRR(r, vierkant, 0.5, 0.5), 'een vierkante box bevat zijn hoek');
ok(!pointInRR(r, rond(10), 0.5, 0.5), 'een afgeronde box bevat zijn hoekpunt niet');
ok(pointInRR(r, rond(10), 2, 2) === false && pointInRR(r, rond(10), 5, 5), 'de boog loopt zoals een cirkel (2,2 erbuiten, 5,5 erbinnen)');
ok(pointInRR(r, rond(10), 50, 20) && pointInRR(r, rond(10), 50, 0.5), 'het midden en de rechte rand blijven binnen');
ok(!pointInRR(r, rond(10), 101, 20) && !pointInRR(r, rond(10), 50, -1), 'buiten de box is buiten');
ok(!pointInRR(r, { tl: [10, 10], tr: [0, 0], br: [0, 0], bl: [0, 0] }, 1, 1) && pointInRR(r, { tl: [10, 10], tr: [0, 0], br: [0, 0], bl: [0, 0] }, 99, 1), 'een enkele afgeronde hoek laat de andere vierkant');
ok(!pointInRR(r, { tl: [0, 0], tr: [0, 0], br: [10, 10], bl: [0, 0] }, 99.5, 39.5) && pointInRR(r, { tl: [0, 0], tr: [0, 0], br: [10, 10], bl: [0, 0] }, 0.5, 39.5), 'rechtsonder los van linksonder');

// CSS schaalt radii die samen groter zijn dan de zijde (een pil: 999px)
const pil = schaalRadii(rond(999), 100, 40);
ok(Math.abs(pil.tl[0] - 20) < 0.01 && Math.abs(pil.tl[1] - 20) < 0.01, 'een pil van 999px wordt op de halve hoogte gezet', pil.tl.join());
ok(schaalRadii(rond(8), 100, 40).tl[0] === 8, 'een kleine radius blijft zoals hij is');
// het balkje van 3 px met 8 px radius op een knop met 8 px radius (het startscherm): de boog van het balkje is kleiner dan die van de knop
const balk = schaalRadii({ tl: [8, 8], tr: [0, 0], br: [0, 0], bl: [8, 8] }, 3, 43);
ok(balk.tl[0] < 8 && balk.tl[0] > 0, 'een balkje van 3 px schaalt zijn radius mee', balk.tl.join());

// de sweep roept de detector aan
const sweepJs = fs.readFileSync(path.join(ROOT, 'scripts/qa/schermen_sweep.page.js'), 'utf8');
const sweepMjs = fs.readFileSync(path.join(ROOT, 'scripts/qa/schermen_sweep.mjs'), 'utf8');
ok(/hoekScan\(root\)/.test(sweepJs) && /hoekMarkeer/.test(sweepJs), 'schermen_sweep.page.js roept hoekScan en hoekMarkeer aan');
ok(/hoeken\.page\.js/.test(sweepMjs) && /'hoeken'\]/.test(sweepMjs), 'schermen_sweep.mjs voegt de bibliotheek toe en telt hoeken in de samenvatting');
for (const s of ['kaart-legenda', 'kaart-zoek', 'kaart-plekkaartje', 'kaart-ontdekt', 'regelkaart', 'toast', 'fotomodus', 'over-credits']) ok(sweepJs.includes(s), `de sweep meet ${s}`);

console.log(`hoeken_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
