// Regiehoogten (#730): handgemaakte scènes (missie-intro, mislukking, dood, vijf sterren,
// crash, landmark-orbit, Ommelanden) gingen uit van absolute z=0. Op een dijk, viaduct,
// wierde of verdiepte weg stond de camera dan onder het maaiveld of zweefde hij. De
// camera-module heeft nu groundLift (dezelfde hoogtevraag als de speler, via
// map.groundHeightAt) en cinematics telt die bij de hoogten op. Deze test doet
// groundLift zelf en bewaakt de bedrading in de bron.
//   node scripts/cine_hoogte_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = await import(pathToFileURL(path.join(ROOT, 'game/js/camerapath.js')).href);
const bron = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// --- groundLift zelf
{
  const map = { groundHeightAt: (x, y, zHint) => 6.2 + x * 0 + y * 0 + (Number.isFinite(zHint) ? 0 : 99) };
  ok(C.groundLift(map, 10, 20, 0) === 6.2, 'de grondhoogte van de kaart (dijk/viaduct)');
  ok(C.groundLift(map, -5, 3, 12) === 6.2, 'de zHint verandert de uitkomst hier niet');
  ok(C.groundLift({ groundHeightAt: () => -1.4 }, 0, 0) === -1.4, 'een verdiepte weg telt ook');
  ok(C.groundLift({ groundHeightAt: () => NaN }, 0, 0) === 0, 'geen geldige hoogte: vlak (0)');
  ok(C.groundLift({ groundHeightAt: () => { throw new Error('geen hoogtemodel'); } }, 0, 0) === 0, 'een fout hoogtemodel valt terug op 0');
  ok(C.groundLift(null, 0, 0) === 0 && C.groundLift({}, 0, 0) === 0, 'zonder kaart of zonder hoogtevraag: 0');
  const args = [];
  C.groundLift({ groundHeightAt: (...a) => { args.push(a); return 3; } }, 4, 5, 6);
  ok(args.length === 1 && args[0][0] === 4 && args[0][1] === 5 && args[0][2] === 6, 'de vraag gaat met de plek en de hint naar de kaart', JSON.stringify(args));
}

// --- de bedrading: elke handgemaakte scène telt de grondhoogte bij de hoogte op
ok(/groundLift/.test(bron) && /import \{.*groundLift.*\} from '\.\/camerapath\.js';/.test(bron), 'cinematics laadt groundLift uit de camera-module');
const blok = (naam) => { const i = bron.indexOf(naam); if (i < 0) return ''; return bron.slice(i, i + 1600); };
for (const [naam, wat] of [
  ['export function playMissionIntro(w,', 'missie-intro'],
  ['export function playMissionFailed(w,', 'mislukking'],
  ['function playDeath(w,', 'dood/pak'],
  ['function orbitShot(w,', 'landmark-orbit'],
  ['function tryCrashReplay(w,', 'crash'],
  ['function playWantedFive(w)', 'vijf sterren'],
  ['function playOmmelanden(w)', 'Ommelanden'],
]) {
  const b = blok(naam);
  ok(!!b, `${wat} is te vinden`);
  ok(/groundLift\(w\.map/.test(b), `${wat} vraagt de grondhoogte op`);
  ok(/gz \+ /.test(b) || /gz \+/.test(b) || /groundLift\(w\.map[^)]*\) \+ 2/.test(b), `${wat} telt die bij de hoogte op`, b.split('\n').find((l) => /groundLift/.test(l)) || '');
}
// de speler levert de hint (zijn eigen gz) en de gebouwenlift blijft bestaan: geen dubbele correctie
ok(/p\.gz \|\| 0/.test(bron), 'de hoogte van de speler gaat als hint mee');
ok(/clearKeys\(w, keys\)|clearKeys\(w, right\)/.test(bron), 'de gebouwenlift (clearKeys) blijft erbij');

console.log(fails ? `cine_hoogte_test: ${fails} van ${n} mislukt` : `cine_hoogte_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
