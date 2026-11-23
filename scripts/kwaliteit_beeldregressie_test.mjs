// Test van de beeldregressie van de kwaliteitsmachine: perceptuele diff en drempels (scripts/kwaliteit/perceptdiff.mjs), de
// vergelijking per camerapunt en het rapport (scripts/kwaliteit/beeldregressie.mjs), en de camerapuntenlijst zelf. Zonder Electron.
//   node scripts/kwaliteit_beeldregressie_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './lib/pngdiff.mjs';
import { vergelijkPerceptueel, oordeel, diffBeeld, snij, STANDAARD_DREMPEL } from './kwaliteit/perceptdiff.mjs';
import { vergelijkRun, rapportHtml, laadPunten } from './kwaliteit/beeldregressie.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };

// een 'wereldbeeld' van 320x180: verloop met wat structuur (ramen), zodat SSIM iets te meten heeft
function beeld(w = 320, h = 180, f = () => null) {
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const raam = (x % 16 < 6 && y % 12 < 5) ? 60 : 0;
    let c = [80 + (x * 120) / w + raam, 120 + (y * 80) / h - raam / 2, 160 - (x * 40) / w];
    c = f(x, y, c) || c;
    const k = (v) => Math.max(0, Math.min(255, Math.round(v))); // Buffer rekent modulo 256: zelf begrenzen
    data[o] = k(c[0]); data[o + 1] = k(c[1]); data[o + 2] = k(c[2]); data[o + 3] = 255;
  }
  return { w, h, data };
}
const opts = { schaal: 2, blok: 8 };

const a = beeld();
const r0 = vergelijkPerceptueel(a, beeld(), opts);
ok(r0.gelijkMaat && r0.ssim > 0.999 && r0.slecht === 0 && oordeel(r0).ok, 'twee gelijke beelden: SSIM 1 en binnen de drempel', r0.ssim);

// ruis van een paar niveaus (anti-aliasing, dithering): binnen de drempel
let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const ruis = beeld(320, 180, (x, y, c) => c.map((v) => v + (rnd() - 0.5) * 6));
const r1 = vergelijkPerceptueel(a, ruis, opts);
ok(oordeel(r1).ok, 'lichte ruis valt binnen de standaarddrempel', { ssim: r1.ssim, slecht: r1.aandeelSlecht });

// een halve pixel verschuiving van alles: binnen de drempel (dat is waarom we niet per pixel vergelijken)
const schuif = beeld(320, 180, (x, y) => { const xx = x + 1; const raam = (xx % 16 < 6 && y % 12 < 5) ? 60 : 0; return [80 + (xx * 120) / 320 + raam, 120 + (y * 80) / 180 - raam / 2, 160 - (xx * 40) / 320]; });
ok(oordeel(vergelijkPerceptueel(a, schuif, opts)).ok, 'een verschuiving van 1 pixel valt binnen de drempel');

// een groot zwart vlak (een gebouw dat niet laadde): afwijking
const gat = beeld(320, 180, (x, y) => (x > 100 && x < 200 && y > 40 && y < 120 ? [0, 0, 0] : null));
const r2 = vergelijkPerceptueel(a, gat, opts);
const o2 = oordeel(r2);
ok(!o2.ok && r2.aandeelSlecht > STANDAARD_DREMPEL.maxSlecht, 'een zwart gat van 100x80 is een afwijking', { slecht: r2.aandeelSlecht, redenen: o2.redenen });
ok(o2.redenen.some((t) => /slechte blokken/.test(t)), 'de reden noemt het aandeel slechte blokken');
// hetzelfde gat onder een masker telt niet
const r3 = vergelijkPerceptueel(a, gat, { ...opts, maskers: [{ x: 0.3, y: 0.2, w: 0.35, h: 0.5 }] });
ok(oordeel(r3).ok, 'een masker over de afwijking maakt het punt groen', { slecht: r3.aandeelSlecht });
// een kleurverschuiving zonder structuurverschil (verkeerde lucht): het kleurverschil vangt hem
const blauw = beeld(320, 180, (x, y, c) => [c[0] - 40, c[1] - 40, c[2] + 60]);
const r4 = vergelijkPerceptueel(a, blauw, opts);
ok(!oordeel(r4).ok && r4.maxKleur > STANDAARD_DREMPEL.blokKleur, 'een kleurverschuiving zonder vormverschil is een afwijking', { kleur: r4.maxKleur });
// drempel per punt: een ruimere drempel laat een kleine afwijking door, een strengere niet
const klein = beeld(320, 180, (x, y) => (x > 10 && x < 40 && y > 10 && y < 40 ? [255, 255, 255] : null));
const r5 = vergelijkPerceptueel(a, klein, opts);
ok(!oordeel(r5, { maxSlecht: 0.005 }).ok && oordeel(r5, { maxSlecht: 0.05, minSsim: 0.8 }).ok, 'de drempel per punt beslist bij een kleine afwijking', { slecht: r5.aandeelSlecht, ssim: r5.ssim });
// andere maat
const r6 = vergelijkPerceptueel(a, beeld(300, 180), opts);
ok(!r6.gelijkMaat && !oordeel(r6).ok && /beeldmaat/.test(oordeel(r6).redenen[0]), 'een andere maat is altijd een afwijking');
// regio: alleen dat deel telt (de minikaart rechtsonder)
const rechtsonder = beeld(320, 180, (x, y) => (x > 240 && y > 120 ? [255, 0, 0] : null));
ok(!oordeel(vergelijkPerceptueel(a, rechtsonder, { ...opts, regio: { x: 0.75, y: 0.66, w: 0.25, h: 0.34 } })).ok, 'een afwijking in de regio telt');
ok(oordeel(vergelijkPerceptueel(a, rechtsonder, { ...opts, regio: { x: 0, y: 0, w: 0.5, h: 0.5 } })).ok, 'een afwijking buiten de regio telt niet');
const sn = snij(a, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
ok(sn.w === 160 && sn.h === 90 && sn.data[0] === a.data[(90 * 320 + 160) * 4], 'snij neemt het juiste deel');
const db = diffBeeld(gat, r2, { schaal: 2 });
ok(db.w === 160 && db.h === 90 && db.data.length === 160 * 90 * 4, 'het diffbeeld heeft de verkleinde maat');
const midden = ((60 * 160) + 75) * 4;
ok(db.data[midden] > 150 && db.data[midden + 1] < 80, 'het gat staat rood in het diffbeeld', [db.data[midden], db.data[midden + 1], db.data[midden + 2]]);

// ---------- vergelijking per punt en rapport (echte bestanden in .scr) ----------
const werk = path.join(ROOT, '.scr', `beeldregressie-test-${process.pid}`);
try {
  const nieuw = path.join(werk, 'uit', 'nieuw'), ref = path.join(werk, 'ref');
  fs.mkdirSync(nieuw, { recursive: true }); fs.mkdirSync(ref, { recursive: true });
  const cfg = { formaat: '320x180', seed: 1, klok: 13, weer: 'helder', standaardDrempel: { minSsim: 0.9, maxSlecht: 0.02 }, punten: [
    { id: 'gelijk', soort: 'wereld', titel: 'Gelijk' }, { id: 'kapot', soort: 'wereld', titel: 'Kapot' }, { id: 'ruim', soort: 'wereld', titel: 'Ruim', drempel: { maxSlecht: 0.5, minSsim: 0.3 } },
    { id: 'nieuwpunt', soort: 'menu' }, { id: 'weg', soort: 'kaart' }, { id: 'paginafout', soort: 'rijden' }] };
  for (const id of ['gelijk', 'kapot', 'ruim', 'weg', 'paginafout']) fs.writeFileSync(path.join(ref, `${id}.png`), encodePng(a));
  fs.writeFileSync(path.join(nieuw, 'gelijk.png'), encodePng(ruis));
  fs.writeFileSync(path.join(nieuw, 'kapot.png'), encodePng(gat));
  fs.writeFileSync(path.join(nieuw, 'ruim.png'), encodePng(gat));
  fs.writeFileSync(path.join(nieuw, 'nieuwpunt.png'), encodePng(a));
  const v = vergelijkRun({ cfg, nieuwMap: nieuw, refDir: ref, diffMap: path.join(werk, 'uit', 'diff'), paginaUit: { punten: { paginafout: { ok: false, fout: 'regio niet gevonden' } } } });
  const staat = Object.fromEntries(v.rijen.map((r) => [r.id, r.staat]));
  ok(staat.gelijk === 'gelijk' && staat.kapot === 'afwijking' && staat.ruim === 'gelijk', 'per punt: gelijk, afwijking, en een ruime drempel per punt', staat);
  ok(staat.nieuwpunt === 'geen-referentie' && staat.weg === 'ontbreekt' && staat.paginafout === 'fout', 'zonder referentie, zonder beeld en een fout uit de pagina', staat);
  ok(v.afwijkend === 1 && v.nieuw === 1 && v.ontbreekt === 1 && v.fouten === 1, 'de tellers kloppen', v);
  ok(fs.existsSync(path.join(werk, 'uit', 'diff', 'kapot.png')), 'een diffbeeld per vergeleken punt');
  const html = rapportHtml({ out: path.join(werk, 'uit'), v, cfg, refDir: ref, meta: { commit: 'abc' } });
  ok(/<html lang="nl">/.test(html) && /href="#kapot"/.test(html) && /src="nieuw\/kapot\.png"/.test(html) && /src="diff\/kapot\.png"/.test(html), 'het rapport is één pagina met relatieve voor/na/diff-links');
  ok(!/https?:\/\//.test(html), 'het rapport haalt niets van buiten');
} finally { fs.rmSync(werk, { recursive: true, force: true }); }

// ---------- de echte camerapuntenlijst ----------
const P = laadPunten();
const ids = P.punten.map((p) => p.id);
for (const nodig of ['stad', 'grote-markt', 'martinitoren', 'appartement', 'garage', 'kaart', 'hud-rijden', 'minimap', 'laadscherm']) ok(ids.includes(nodig), `camerapunt ${nodig} bestaat`);
ok(P.punten.filter((p) => p.soort === 'filmpje').length >= 2, 'minstens twee filmpjesbeelden');
ok(P.formaat === '1920x1080' && Number.isInteger(P.seed) && typeof P.klok === 'number' && P.weer, 'formaat 1920x1080, vaste seed, klok en weer');
ok(new Set(ids).size === ids.length && ids.every((id) => /^[a-z0-9-]+$/.test(id)), 'unieke, bestandsveilige ids');
ok(P.punten.every((p) => ['filmpje', 'wereld', 'menu', 'kaart', 'rijden', 'laadscherm'].includes(p.soort)), 'alleen soorten die de pagina kent');
const page = fs.readFileSync(path.join(ROOT, 'scripts', 'kwaliteit', 'camerapunten.page.js'), 'utf8');
for (const soort of ['filmpje', 'wereld', 'menu', 'kaart', 'rijden', 'laadscherm']) ok(page.includes(`'${soort}'`), `de pagina behandelt soort ${soort}`);

console.log(fails ? `kwaliteit_beeldregressie_test: ${fails} mislukt` : 'kwaliteit_beeldregressie_test: ok');
process.exit(fails ? 1 : 0);
