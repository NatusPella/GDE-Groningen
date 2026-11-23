// Het geluid van de flat (game/js/flatgeluid.js): de niveaus per plek en dat home.js het aanzet. Puur deel en broncontrole.
//   node scripts/flatgeluid_test.mjs
import fs from 'node:fs';
let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };
globalThis.window = globalThis.window || {};
const { flatNiveaus, NIVEAU, KOELKAST } = await import('../game/js/flatgeluid.js').catch(async () => {
  // audio.js hoort bij de browser: lees de pure functie dan uit de bron
  const src = fs.readFileSync(new URL('../game/js/flatgeluid.js', import.meta.url), 'utf8').replace(/^import .*$/m, '').replace(/export /g, '');
  return new Function(`${src}; return { flatNiveaus, NIVEAU, KOELKAST };`)();
});
const buiten = flatNiveaus(false, 5, 5);
ok(buiten.kamer === 0 && buiten.koelkast === 0 && buiten.stad === 0, 'buiten de flat: stil');
const keuken = flatNiveaus(true, KOELKAST.x - 0.5, KOELKAST.z);
const slaapkamer = flatNiveaus(true, 4.5, 8);
ok(keuken.koelkast > slaapkamer.koelkast && slaapkamer.koelkast === 0, 'de koelkast hoor je in de keuken, niet in de slaapkamer');
ok(flatNiveaus(true, 3, 0.5).stad > flatNiveaus(true, 3, 8.5).stad, 'bij het glas hoor je de stad meer dan achterin');
ok(Object.values(NIVEAU).every((v) => v > 0 && v <= 0.02), 'alles zacht (hoogstens 0,02 op de wereldbus)');
const home = fs.readFileSync(new URL('../game/js/home.js', import.meta.url), 'utf8');
ok(/updateFlatGeluid\(!!inside, lx, lz\)/.test(home) && /else updateFlatGeluid\(false\)/.test(home), 'home.js zet het geluid aan in de flat en uit erbuiten');
console.log(bad ? `flatgeluid_test: ${bad} van ${n} fout` : `flatgeluid_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
