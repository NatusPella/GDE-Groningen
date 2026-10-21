// Releasenotities na de Actions-builds (scripts/release_builds.mjs): alleen bijlagen die er zijn,
// het blok wordt vervangen in plaats van verdubbeld, de regel "nog geen dmg" verdwijnt, en de
// minuten worden per job naar boven afgerond.
//   node scripts/release_builds_test.mjs
import { notesFor, applyBlock, billable, BLOCK_START, BLOCK_END, BUILDS } from './release_builds.mjs';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };
const V = '0.39.0';
const all = [`GDE-Groningen-${V}-mac.dmg`, `GDE-Groningen-${V}-linux.AppImage`, `GDE-Groningen-${V}-linux.tar.gz`, `GDE-Groningen-${V}-android-debug.apk`, 'gde-world.tgz'];

ok(notesFor(V, ['gde-world.tgz']).length === 0, 'zonder bijlagen geen regels');
ok(notesFor(V, all).length === 3, 'drie regels met alle bijlagen');
ok(notesFor(V, all.filter((a) => !a.endsWith('.tar.gz'))).length === 2, 'Linux alleen met AppImage en tar.gz');
const android = notesFor(V, all).find((s) => s.startsWith('**Android'));
ok(/onbekende bronnen/.test(android) && /nog niet op een echt toestel getest/.test(android), 'Android: sideloaden en nog niet op een toestel getest');

const body = '## GDE Groningen 0.39.0\n\n**Windows:** download x.\n\n**macOS:** voor deze versie is er nog geen dmg; die volgt later.\n\nSpeelde je al...\n';
const once = applyBlock(body, notesFor(V, all), true);
ok(once.includes(BLOCK_START) && once.includes(BLOCK_END), 'blok toegevoegd');
ok(!/nog geen dmg/.test(once), 'regel nog geen dmg weg');
const twice = applyBlock(once, notesFor(V, all), true);
ok(twice === once, 'tweede keer geeft hetzelfde (idempotent)');
ok(twice.split(BLOCK_START).length === 2, 'één blok');
const lessAfter = applyBlock(once, notesFor(V, all.slice(1)), true);
ok(!/\*\*macOS\*\* \(Apple/.test(lessAfter.split(BLOCK_START)[1] || ''), 'blok wordt vervangen, niet aangevuld');
ok(applyBlock(body, [], false) === body.replace(/\s+$/, '') + '\n', 'geen regels: notities blijven staan');
const localLinux = '## x\n\n**Linux en Steam Deck** (x64, ook niet ondertekend): download hem.\n';
ok(!applyBlock(localLinux, notesFor(V, all), true).split(BLOCK_START)[1]?.includes('**Linux en Steam Deck**'), 'Linux niet dubbel als release.sh het al noemde');

const j = (a, b) => ({ startedAt: a, completedAt: b });
const b = billable([j('2026-10-21T10:00:00Z', '2026-10-21T10:04:10Z'), j('2026-10-21T10:00:00Z', '2026-10-21T10:00:20Z')], 10);
ok(b.minutes === 6 && b.free === 60 && b.seconds === 270, 'minuten per job omhoog afgerond');
ok(BUILDS.windows.factor === 2 && BUILDS.windows.arm && BUILDS.linux.arm && !BUILDS.mac.arm && !BUILDS.android.arm, 'Windows 2x; ARM-optie alleen Windows en Linux');
ok(notesFor(V, all).length === 3, 'ARM-regels staan er niet zolang de bijlagen ontbreken');
const arm = notesFor(V, [...all, `GDE-Groningen-${V}-windows-arm64-portable.exe`, `GDE-Groningen-${V}-linux-arm64.AppImage`, `GDE-Groningen-${V}-linux-arm64.tar.gz`]);
ok(arm.length === 5 && arm.every((x) => !/ARM/.test(x) || /niet op echte ARM-hardware getest/.test(x)), 'ARM-regels met de eerlijke kanttekening');
ok(BUILDS.mac.factor === 10 && BUILDS.linux.factor === 1 && BUILDS.android.factor === 1, 'factoren');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
