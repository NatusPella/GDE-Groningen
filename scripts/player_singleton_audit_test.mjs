// Test voor scripts/player_singleton_audit.mjs (#500): de teller vangt de
// vormen die ertoe doen, commentaar en strings tellen niet, gelijk blijft groen,
// groei en een nieuw bestand falen, en een daling mag (met --update).
//   node scripts/player_singleton_audit_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { countReferences, compare } from './player_singleton_audit.mjs';

const SCRIPT = fileURLToPath(new URL('./player_singleton_audit.mjs', import.meta.url));
let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('FAIL ' + msg); } };

// ---- de teller
ok(countReferences('const p = world.player;') === 1, 'world.player');
ok(countReferences('w.player.x = 1;') === 1, 'w.player');
ok(countReferences('const { x } = world.player;') === 1, 'destructurering van world.player');
ok(countReferences('const t = `${world.player.x}`;') === 1, 'world.player in een template-expressie');
ok(countReferences('const g = world; g.player.x;') === 1, 'alias van de wereld');
ok(countReferences('const andere = { player: 1 }; andere.player;') === 0, 'een andere player is geen wereldspeler');
ok(countReferences('// world.player\nconst a = "world.player";\nconst t = `world.player`;') === 0, 'commentaar en strings tellen niet');
ok(countReferences('const r = /world\\.player/;') === 0, 'een regex is geen leesactie');

// ---- synthetische map
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-psa-'));
const schrijf = (naam, tekst) => fs.writeFileSync(path.join(tmp, naam), tekst);
const basis = path.join(tmp, 'baseline.json');
const draai = (...extra) => spawnSync(process.execPath, [SCRIPT, `--dir=${tmp}`, `--baseline=${basis}`, ...extra], { encoding: 'utf8' });
const files = (b) => JSON.parse(fs.readFileSync(b, 'utf8')).files;

schrijf('a.js', 'const p = world.player;\nconst q = w.player;\n');
schrijf('b.js', 'const p = world.player;\n');
schrijf('leeg.js', 'const x = 1;\n');
const eerste = draai('--update');
ok(eerste.status === 0, 'eerste --update slaagt');
const b = files(basis);
ok(b['a.js'] === 2 && b['b.js'] === 1, 'basislijn telt per bestand: ' + JSON.stringify(b));
ok(!('leeg.js' in b), 'een bestand zonder verwijzingen staat niet in de basislijn');

const gelijk = draai();
ok(gelijk.status === 0, 'gelijk blijft groen: ' + gelijk.stdout + gelijk.stderr);
ok(/basislijn 3, 0/.test(gelijk.stdout), 'gelijk meldt 0 verschil: ' + gelijk.stdout);

schrijf('a.js', 'world.player; world.player.x; w.player;\n');
const groei = draai();
ok(groei.status === 1, 'groei faalt');
ok(/FOUT\s+a\.js: 3 verwijzingen, basislijn 2 \(\+1\)/.test(groei.stdout), 'groei noemt bestand en aantal: ' + groei.stdout);

schrijf('a.js', 'world.player; w.player;\n');
schrijf('nieuw.js', 'const p = world.player;\n');
const nieuw = draai();
ok(nieuw.status === 1, 'een nieuw bestand faalt');
ok(/FOUT\s+nieuw\.js: 1 verwijzingen, staat niet in de basislijn/.test(nieuw.stdout), 'nieuw bestand wordt genoemd: ' + nieuw.stdout);

fs.rmSync(path.join(tmp, 'nieuw.js'));
schrijf('a.js', 'world.player;\n');
const daling = draai();
ok(daling.status === 0, 'een daling is goed: ' + daling.stdout + daling.stderr);
ok(/OK\s+a\.js: 1 verwijzingen, basislijn 2 \(-1\)/.test(daling.stdout), 'daling wordt gemeld: ' + daling.stdout);
ok(/Werk de basislijn bij met --update/.test(daling.stdout), 'daling vraagt om --update');

const bij = draai('--update');
ok(bij.status === 0 && files(basis)['a.js'] === 1 && JSON.parse(fs.readFileSync(basis, 'utf8')).total === 2, '--update werkt de daling bij');
ok(draai().status === 0, 'na --update weer groen');

// ---- compare als pure functie
const cmp = compare({ 'x.js': 2 }, { total: 3, files: { 'x.js': 3 } });
ok(cmp.fouten.length === 0 && cmp.dalingen.length === 1 && cmp.totaal === 2 && cmp.basis === 3, 'compare: daling');
const cmp2 = compare({ 'y.js': 1 }, { total: 0, files: {} });
ok(cmp2.fouten.length === 1, 'compare: nieuw bestand');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} test(s) mislukt` : 'player_singleton_audit_test: alles goed');
process.exit(failed ? 1 : 0);
