// Test voor scripts/world_eigenaar.mjs (#498): de maskeerder, de schrijf-
// detectie (alle vormen, en `===`/`!==`/`>=` juist niet), de array-mutatie, de
// validatie van het register en de basislijnregel. De integratietest draait de
// audit op een tijdelijke map, nooit op game/.
//   node scripts/world_eigenaar_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  analyseSource, maskSource, validateRegister, checkEigenaarschap, compareBaseline, DOOD,
} from './world_eigenaar.mjs';

const SCRIPT = fileURLToPath(new URL('./world_eigenaar.mjs', import.meta.url));
let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };
const veld = (src, naam = 'x') => analyseSource(src)[naam] || { schrijf: 0, lees: 0 };

// ---- maskeerder: commentaar, strings en regex tellen niet, code in ${} wel
ok(veld('// world.x = 1;').schrijf === 0 && veld('// world.x = 1;').lees === 0, 'regelcommentaar telt niet');
ok(veld('/* world.x = 1; */').schrijf === 0, 'blokcommentaar telt niet');
ok(veld('const s = "world.x = 1";').schrijf === 0, 'een dubbele string telt niet');
ok(veld("const s = 'world.x = 1';").schrijf === 0, 'een enkele string telt niet');
ok(veld('const t = `world.x = 1`;').schrijf === 0, 'de tekst van een template telt niet');
ok(veld('const t = `${world.x = 1}`;').schrijf === 1, 'code in een template-expressie telt wel');
ok(veld('const r = /world\\.x = 1/;').schrijf === 0, 'een regex telt niet');
ok(maskSource('a // b\nc').split('\n').length === 2, 'de maskeerder houdt regeleinden');
ok(veld('// world.x\nworld.x += 1;').schrijf === 1, 'maskeren en tellen werken samen');

// ---- schrijfacties: elke vorm apart
const schrijfVormen = [
  'world.x = 1;', 'world.x += 1;', 'world.x -= 1;', 'world.x *= 2;', 'world.x /= 2;',
  'world.x %= 2;', 'world.x **= 2;', 'world.x <<= 1;', 'world.x >>= 1;', 'world.x >>>= 1;',
  'world.x &= 1;', 'world.x |= 1;', 'world.x ^= 1;', 'world.x &&= y;', 'world.x ||= y;',
  'world.x ??= y;', 'world.x++;', 'world.x--;', '++world.x;', '--world.x;',
  'delete world.x;', 'world.x.push(1);', 'world.x.pop();', 'world.x.shift();',
  'world.x.unshift(1);', 'world.x.splice(0, 1);', 'world.x.sort();', 'world.x.fill(0);',
  'world.x.reverse();', 'world.x.copyWithin(0, 1);', 'world.x?.push(1);',
  'world.x.length = 0;', 'world.x.length += 1;', 'world.x.length++;',
];
for (const src of schrijfVormen) {
  const t = veld(src);
  ok(t.schrijf === 1 && t.lees === 0, `schrijfactie gemist: ${src} (${JSON.stringify(t)})`);
}

// ---- geen schrijfactie: vergelijkingen, lezen en methodeaanroepen
const leesVormen = [
  'if (world.x === 1) {}', 'if (world.x !== 1) {}', 'if (world.x == 1) {}',
  'if (world.x != 1) {}', 'if (world.x >= 1) {}', 'if (world.x <= 1) {}',
  'const y = world.x;', 'const y = world.x + 1;', 'world.x.push === undefined;',
  'const y = world.x.length;', 'foo(world.x);',
];
for (const src of leesVormen) {
  const t = veld(src);
  ok(t.schrijf === 0 && t.lees === 1, `ten onrechte een schrijfactie of verkeerde telling: ${src} (${JSON.stringify(t)})`);
}
ok(veld('world.x = y === z;').schrijf === 1, 'een vergelijking aan de rechterkant maakt de toewijzing niet ongedaan');
ok(Object.keys(analyseSource('world.helper();')).length === 0, 'een methodeaanroep op de wereld is geen veld');
ok(veld('world.x.y = 1;').schrijf === 0 && veld('world.x.y = 1;').lees === 1, 'een genest veld telt als leesactie op het bovenliggende veld');
ok(veld('world.x = world.x + 1;').schrijf === 1 && veld('world.x = world.x + 1;').lees === 1, 'lezen en schrijven in één regel');
ok(veld('world . x = 1;').schrijf === 1, 'spatie rond de punt');

// ---- register: elke uitzondering heeft veld, bestand, max, reden en issue
const meting = {
  bestanden: ['game/js/a.js', 'game/js/b.js'],
  velden: {
    x: { schrijf: 2, lees: 3, schrijvers: { 'game/js/a.js': 2 } },
    y: { schrijf: 1, lees: 1, schrijvers: { 'game/js/a.js': 1, 'game/js/b.js': 1 } },
  },
};
const basisRegister = (uitzonderingen = []) => ({
  velden: { x: { eigenaar: 'game/js/a.js' }, y: { eigenaar: 'game/js/a.js' } },
  uitzonderingen,
});
const goedeRegel = { veld: 'y', bestand: 'game/js/b.js', max: 1, reden: 'leest en schrijft de teller', issue: '#498' };
ok(validateRegister(basisRegister([goedeRegel]), meting).length === 0, 'een complete uitzondering is goed');
ok(validateRegister(basisRegister([{ ...goedeRegel, reden: '' }]), meting).some((f) => /reden/.test(f)), 'een regel zonder reden is fout');
ok(validateRegister(basisRegister([{ ...goedeRegel, issue: '' }]), meting).some((f) => /issue/.test(f)), 'een regel zonder issue is fout');
ok(validateRegister(basisRegister([{ ...goedeRegel, veld: 'bestaatniet' }]), meting).some((f) => /onbekend veld/.test(f)), 'een onbekend veld is fout');
ok(validateRegister(basisRegister([{ ...goedeRegel, bestand: 'game/js/nee.js' }]), meting).some((f) => /onbekend bestand/.test(f)), 'een onbekend bestand is fout');
ok(validateRegister(basisRegister([goedeRegel, goedeRegel]), meting).some((f) => /dubbel/.test(f)), 'een dubbele regel is fout');
ok(validateRegister(basisRegister([{ ...goedeRegel, max: 0 }]), meting).some((f) => /max/.test(f)), 'max moet een positief getal zijn');
ok(validateRegister({ velden: { x: { eigenaar: 'game/js/a.js' }, y: { eigenaar: 'gedeeld, alleen lezen' } }, uitzonderingen: [] }, meting).length === 0, 'een register zonder uitzonderingen is goed');
ok(validateRegister({ velden: { x: { eigenaar: 'game/js/a.js' }, y: { eigenaar: 'gedeeld, alleen lezen' }, z: { eigenaar: 'game/js/a.js' } }, uitzonderingen: [] }, meting).some((f) => /onbekend veld|niet voor/.test(f)), 'een veld dat niet in de code staat is fout');

// ---- eigendom: alleen de eigenaar schrijft, tenzij een uitzondering het toestaat
const eigen = checkEigenaarschap(basisRegister([goedeRegel]), meting);
ok(eigen.fouten.length === 0, 'de eigenaar en een geldige uitzondering zijn groen: ' + eigen.fouten.join('; '));
const zonderUitzondering = checkEigenaarschap(basisRegister([]), meting);
ok(zonderUitzondering.fouten.length === 1 && /game\/js\/b\.js/.test(zonderUitzondering.fouten[0]), 'een niet-eigenaar zonder uitzondering is fout');
const bovenMax = checkEigenaarschap(basisRegister([{ ...goedeRegel, max: 1 }]), { velden: { y: { schrijf: 2, lees: 0, schrijvers: { 'game/js/b.js': 2 } } } });
ok(bovenMax.fouten.some((f) => /schrijft 2 keer/.test(f)), 'meer schrijfacties dan max is fout');
const onderMax = checkEigenaarschap(basisRegister([{ ...goedeRegel, max: 2 }]), { velden: { y: { schrijf: 1, lees: 0, schrijvers: { 'game/js/b.js': 1 } } } });
ok(onderMax.fouten.length === 0 && onderMax.dalingen.some((d) => /mag weg/.test(d)) === false, 'onder max is groen');
const gedeeld = checkEigenaarschap(basisRegister([]), { velden: { y: { schrijf: 1, lees: 0, schrijvers: { 'game/js/b.js': 1 } } } });
ok(gedeeld.fouten.length === 1, 'gedeeld, alleen lezen betekent dat niemand schrijft zonder uitzondering');
const dood = checkEigenaarschap({ velden: { x: { eigenaar: DOOD } }, uitzonderingen: [] }, meting);
ok(dood.fouten.length === 0, 'een dood veld hoeft geen eigenaar te hebben');

// ---- basislijn: hoger is fout, lager mag
const basis = { veldTotaal: 2, velden: { x: 1, y: 2 } };
function schrijfMeting(aantal) {
  const velden = {};
  for (const [naam, n] of Object.entries(aantal)) {
    if (n === 0) continue;
    velden[naam] = { schrijf: n, lees: 0, schrijvers: Object.fromEntries(Array.from({ length: n }, (_, i) => [`game/js/f${i}.js`, 1])) };
  }
  return { bestanden: [], velden };
}
ok(compareBaseline(schrijfMeting({ x: 1, y: 2 }), basis).fouten.length === 0, 'gelijk aan de basislijn is groen');
const hoger = compareBaseline(schrijfMeting({ x: 2, y: 2 }), basis);
ok(hoger.fouten.length === 1 && /basislijn 1 \(\+1\)/.test(hoger.fouten[0]), 'hoger dan de basislijn is fout');
const lager = compareBaseline(schrijfMeting({ x: 1, y: 1 }), basis);
ok(lager.fouten.length === 0 && lager.dalingen.length === 1, 'lager dan de basislijn mag en wordt gemeld');
const nieuw = compareBaseline(schrijfMeting({ x: 1, y: 2, z: 1 }), basis);
ok(nieuw.fouten.some((f) => /staat niet in de basislijn/.test(f)), 'een nieuw veld met schrijvers is fout');
const weg = compareBaseline(schrijfMeting({ x: 1, y: 0 }), basis);
ok(weg.fouten.length === 0 && weg.dalingen.some((d) => /geen schrijvers meer/.test(d)), 'een veld zonder schrijvers is een daling');

// ---- integratie: de audit op een tijdelijke map
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-world-'));
const schrijf = (naam, tekst) => fs.writeFileSync(path.join(tmp, naam), tekst);
const basisFile = path.join(tmp, 'baseline.json');
const registerFile = path.join(tmp, 'register.json');
const draai = (...extra) => spawnSync(process.execPath, [SCRIPT, `--dir=${tmp}`, `--baseline=${basisFile}`, `--register=${registerFile}`, ...extra], { encoding: 'utf8' });

schrijf('a.js', 'world.money += 1;\nworld.money -= 2;\n');
schrijf('b.js', 'world.money = 2;\n');
schrijf('c.js', 'const m = world.money;\n');
fs.writeFileSync(registerFile, JSON.stringify({
  velden: { money: { eigenaar: 'a.js' } },
  uitzonderingen: [{ veld: 'money', bestand: 'b.js', max: 1, reden: 'proef', issue: '#498' }],
}, null, 1));

const eerste = draai('--update');
ok(eerste.status === 0, 'de eerste --update slaagt: ' + eerste.stdout + eerste.stderr);
const basisStand = JSON.parse(fs.readFileSync(basisFile, 'utf8'));
ok(basisStand.velden.money === 2 && basisStand.veldTotaal >= 1, 'de basislijn telt twee schrijvende bestanden: ' + JSON.stringify(basisStand));

const groen = draai();
ok(groen.status === 0, 'de gemeten stand is groen: ' + groen.stdout + groen.stderr);
ok(/2 schrijvende bestanden/.test(groen.stdout) === false, 'de kop is geen foutregel: ' + groen.stdout);
const json = draai('--json');
ok(json.status === 0 && JSON.parse(json.stdout).veldenMetSchrijvers === 1, '--json geeft de meting: ' + json.stdout);

schrijf('b.js', 'world.money = 2;\nworld.money = 3;\n');
const boven = draai();
ok(boven.status === 1 && /FOUT\s+money: b\.js schrijft 2 keer/.test(boven.stdout), 'meer schrijfacties dan max faalt: ' + boven.stdout);

schrijf('b.js', '');
schrijf('d.js', 'world.money++;\n');
const vreemde = draai();
ok(vreemde.status === 1 && /d\.js schrijft 1 keer/.test(vreemde.stdout), 'een nieuwe schrijver zonder uitzondering faalt: ' + vreemde.stdout);

fs.rmSync(path.join(tmp, 'd.js'));
schrijf('b.js', 'world.money = 2;\n');
const hersteld = draai();
ok(hersteld.status === 0, 'na herstel weer groen: ' + hersteld.stdout + hersteld.stderr);

// een daling mag, en --update verlaagt; groei wordt nooit opgenomen
schrijf('b.js', '');
const gedaald = draai();
ok(gedaald.status === 0 && /OK\s+money: 1 schrijvende bestanden/.test(gedaald.stdout), 'een daling is groen en wordt gemeld: ' + gedaald.stdout);
const bij = draai('--update');
ok(bij.status === 0 && JSON.parse(fs.readFileSync(basisFile, 'utf8')).velden.money === 1, '--update verlaagt de basislijn');
schrijf('b.js', 'world.money = 2;\n');
const groei = draai();
ok(groei.status === 1, 'groei na een verlaging faalt');
const nietOp = draai('--update');
ok(nietOp.status === 0 && JSON.parse(fs.readFileSync(basisFile, 'utf8')).velden.money === 1, '--update neemt groei niet op');
ok(draai().status === 1, 'de groei blijft daarna een fout');

// een ontbrekend register is een fout, geen crash
fs.rmSync(registerFile);
const zonderRegister = draai();
ok(zonderRegister.status === 1 && /register ontbreekt/.test(zonderRegister.stdout), 'een ontbrekend register is een fout');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} test(s) mislukt` : 'world_eigenaar_test: alles goed');
process.exit(failed ? 1 : 0);
