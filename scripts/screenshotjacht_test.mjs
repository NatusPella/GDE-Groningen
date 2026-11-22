// De pure kant van de screenshotjacht (scripts/lib/jacht_logic.mjs) met nepdata, zonder Electron of schijf:
//   node scripts/screenshotjacht_test.mjs
import { mulberry32, shuffled, slug, beeldNaam, gelijkenis, tripwires, samenvoegen, tellingen, indexVan, galerijHtml, TRIP } from './lib/jacht_logic.mjs';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const sig = (v) => Array.from({ length: 144 }, (_, i) => (typeof v === 'function' ? v(i) : v));
const px = (o = {}) => ({ black: 0.02, clear: 0, magenta: 0, mean: 90, size: [1280, 720], sig: sig(100), ...o });
const vlag = (rec, prev) => tripwires(rec, prev).map((f) => f.vlag);

// seed
{
  const a = mulberry32(7), b = mulberry32(7), c = mulberry32(8);
  const xs = [a(), a(), a()], ys = [b(), b(), b()];
  ok(xs.join() === ys.join(), 'zelfde seed geeft dezelfde reeks');
  ok(xs.join() !== [c(), c(), c()].join(), 'andere seed geeft een andere reeks');
  ok(xs.every((x) => x >= 0 && x < 1), 'waarden in [0, 1)');
  const s1 = shuffled(mulberry32(3), [1, 2, 3, 4, 5, 6]), s2 = shuffled(mulberry32(3), [1, 2, 3, 4, 5, 6]);
  ok(s1.join() === s2.join() && [...s1].sort().join() === '1,2,3,4,5,6', 'shuffle is reproduceerbaar en verliest niets');
}
// namen
{
  ok(slug('Café Het Hoogeland!') === 'Cafe-Het-Hoogeland', 'slug haalt accenten en leestekens weg');
  ok(slug('') === 'x' && slug(null) === 'x', 'lege slug wordt x');
  ok(slug('a'.repeat(80), 10).length === 10, 'slug kapt af');
  ok(beeldNaam(7, 'verhaal', 'M01-begin') === '0007_verhaal_M01-begin', 'beeldnaam: volgnummer_soort_plaats');
  ok(/^\d{4}_[A-Za-z0-9-]+_[A-Za-z0-9-]+$/.test(beeldNaam(123, 'vrij', 'Bourtange lopen')), 'beeldnaam bevat alleen veilige tekens');
}
// gelijkenis
{
  ok(gelijkenis(sig(100), sig(100)) === 1, 'identieke vingerafdruk is 1');
  ok(gelijkenis(sig(0), sig(255)) === 0, 'zwart tegen wit is 0');
  ok(gelijkenis(sig(100), sig(110)) > 0.95 && gelijkenis(sig(100), sig(110)) < 1, 'klein verschil ligt dichtbij 1');
  ok(gelijkenis(null, sig(1)) === 0 && gelijkenis(sig(1), [1, 2]) === 0, 'ongelijke of ontbrekende vingerafdruk is 0');
}
// tripwires
{
  ok(vlag({ pixel: px() }).length === 0, 'een gezond beeld heeft geen vlag');
  ok(vlag({ pixel: px({ black: 0.9 }) }).includes('zwart'), 'zwart beeld');
  ok(vlag({ pixel: px({ black: TRIP.zwart }) }).length === 0, 'precies op de drempel is nog goed');
  ok(vlag({ pixel: px({ clear: 0.2 }) }).includes('transparant'), 'transparante pixels');
  ok(vlag({ pixel: px({ magenta: 0.05 }) }).includes('magenta'), 'magenta: ontbrekende textuur');
  ok(vlag({ pixel: px({ mean: 2, black: 0.3 }) }).includes('donker'), 'bijna zwart zonder genoeg zwarte pixels: donker');
  ok(vlag({ pixel: px({ mean: 254 }) }).includes('overbelicht'), 'overbelicht');
  ok(vlag({}).includes('geenbeeld'), 'geen pixelcijfers: geenbeeld');
  const vorig = { pixel: px() };
  ok(vlag({ pixel: px(), verwachtAnders: true }, vorig).includes('gelijk'), 'gelijk aan het vorige beeld terwijl er verschil verwacht wordt');
  ok(!vlag({ pixel: px() }, vorig).includes('gelijk'), 'gelijk telt niet zonder verwachtAnders');
  ok(!vlag({ pixel: px({ sig: sig((i) => i * 2) }), verwachtAnders: true }, vorig).includes('gelijk'), 'duidelijk ander beeld is niet gelijk');
  ok(vlag({ pixel: px(), console: [{ level: 'error', msg: 'THREE.BufferGeometry: Computed radius is NaN' }] }).includes('console'), 'consolefout met NaN');
  ok(vlag({ pixel: px(), console: [{ level: 'error', msg: 'Failed to load resource: 404 /models/x.glb' }] }).includes('console'), 'consolefout met 404');
  ok(vlag({ pixel: px(), console: [{ level: 'error', msg: 'THREE.WebGLProgram: Shader Error 0' }] }).includes('console'), 'shaderfout');
  ok(vlag({ pixel: px(), console: [{ level: 'warning', msg: 'tegel laden mislukt: v-1_0.gdp: tile read timed out after 30000 ms' }] }).includes('console'), 'tegel laden mislukt (timeout)');
  ok(!vlag({ pixel: px(), console: [{ level: 'warning', msg: 'Electron Security Warning (Insecure Content-Security-Policy)' }] }).includes('console'), 'bekende Electron-ruis telt niet');
  ok(!vlag({ pixel: px(), console: [{ level: 'warning', msg: 'iets onschuldigs' }] }).includes('console'), 'een gewone waarschuwing is geen bevinding');
  ok(vlag({ pixel: px(), fps: 1.5 }).includes('fps-laag'), 'extreem lage fps');
  ok(vlag({ pixel: px(), fps: 800 }).includes('fps-hoog'), 'extreem hoge fps');
  ok(!vlag({ pixel: px(), fps: 144 }).includes('fps-hoog'), '144 fps is gewoon');
  ok(vlag({ pixel: px(), tekst: 'Saldo: undefined' }).includes('tekst'), 'undefined in de schermtekst');
  ok(vlag({ pixel: px(), tekst: 'Er ging iets mis Het spel loopt zo veel mogelijk door' }).includes('foutmelding'), 'het spel toont zelf een foutmelding');
  ok(vlag({ pixel: px(), fout: 'TypeError: x' }).includes('scriptfout'), 'scriptfout');
}
// samenvoegen
{
  const ev = [
    { type: 'console', level: 'error', msg: 'Failed to load resource: 404 /a.png' },
    { type: 'console', level: 'warning', msg: 'Autofill.enable failed' },
    { type: 'beeld', naam: '0001_verhaal_M01-begin', bestand: '0001_verhaal_M01-begin.jpg', nr: 1, soort: 'verhaal', plaats: 'M01-begin', stop: 'verhaal-M01', fps: 60, tekst: 'ok', verwachtAnders: false },
    { type: 'pixel', name: '0001_verhaal_M01-begin', black: 0.01, clear: 0, magenta: 0, mean: 80, size: [1280, 720], sig: sig(100) },
    { type: 'pixel', name: '0002_verhaal_M01-midden', black: 0.01, clear: 0, magenta: 0, mean: 80, size: [1280, 720], sig: sig(100) },
    { type: 'beeld', naam: '0002_verhaal_M01-midden', bestand: '0002_verhaal_M01-midden.jpg', nr: 2, soort: 'verhaal', plaats: 'M01-midden', stop: 'verhaal-M01', fps: 60, tekst: 'ok', verwachtAnders: true },
    { type: 'beeld', naam: '0003_vrij_x', bestand: '0003_vrij_x.jpg', nr: 3, soort: 'vrij', plaats: 'x', stop: 'vrij-01', fps: 60, tekst: 'ok' },
    { type: 'pixel', name: '0003_vrij_x', black: 0.9, clear: 0, magenta: 0, mean: 5, size: [1280, 720], sig: sig(0) },
    { type: 'crash', stop: 'vrij-02', reden: 'Electron stopte' },
    { type: 'stopfout', stop: 'verhaal-M02', fout: 'sprong mislukt' },
    null,
  ];
  const s = samenvoegen(ev);
  ok(s.beelden.length === 3, 'drie beelden');
  ok(s.beelden[0].console.length === 1 && /404/.test(s.beelden[0].console[0].msg), 'console-regels horen bij het eerstvolgende beeld (ruis eruit)');
  ok(s.beelden[1].console.length === 0, 'het volgende beeld begint zonder console-regels');
  ok(s.beelden[0].vlaggen.some((f) => f.vlag === 'console'), 'de 404 wordt een vlag');
  ok(s.beelden[1].vlaggen.some((f) => f.vlag === 'gelijk'), 'beeld 2 lijkt op beeld 1 van dezelfde stop');
  ok(!s.beelden[2].vlaggen.some((f) => f.vlag === 'gelijk') && s.beelden[2].vlaggen.some((f) => f.vlag === 'zwart'), 'beeld 3: andere stop, wel zwart');
  ok(s.beelden[0].pixel && s.beelden[0].pixel.mean === 80, 'pixelcijfers worden aan de naam gekoppeld, ook als ze vóór het beeldrecord komen');
  ok(s.crashes.length === 1 && s.stopFouten.length === 1, 'crash en stopfout apart');
  const t = tellingen(s.beelden);
  ok(t.totaal === 3 && t.verdacht === 3 && t.perSoort.verhaal === 2 && t.perSoort.vrij === 1, 'tellingen per soort');
  ok(t.perVlag.zwart === 1 && t.perVlag.gelijk === 1, 'tellingen per vlag');
  const idx = indexVan(s, { seed: 1 });
  ok(idx.seed === 1 && idx.beelden.length === 3 && idx.beelden[0].pixel.sig === undefined, 'index zonder vingerafdruk');
  ok(idx.beelden.every((b) => b.verdacht === true), 'index markeert verdachte beelden');
  ok(JSON.parse(JSON.stringify(idx)).tellingen.totaal === 3, 'index is JSON');
  const html = galerijHtml(idx);
  ok(html.startsWith('<!doctype html>') && html.includes('f-soort') && html.includes('f-vd') && html.includes('0001_verhaal_M01-begin.jpg'), 'galerij bevat filters en de beelden');
  ok(!html.includes('</script><script') && (html.match(/<script>/g) || []).length === 1, 'galerij is één pagina met één script');
  const lastig = galerijHtml({ seed: 2, beelden: [{ naam: 'x', bestand: 'x.jpg', soort: 'a', tekst: '</script><b>' }] });
  ok(!lastig.includes('</script><b>'), 'tekst kan de galerij niet breken');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
