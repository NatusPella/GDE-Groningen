// Releasenotities na de Actions-builds (scripts/release_builds.mjs): alleen bijlagen die er zijn,
// het blok wordt vervangen in plaats van verdubbeld, de regel "nog geen dmg" verdwijnt, en de
// minuten worden per job naar boven afgerond.
// Sinds 28-10 staat er ook een test op --droog: dat mocht niets starten maar startte drie workflows.
// Die test draait met een nep-gh (exec), dus zonder netwerk en zonder echte runs.
//   node scripts/release_builds_test.mjs
import { notesFor, applyBlock, billable, expectedAssets, planRuns, main, BLOCK_START, BLOCK_END, BUILDS } from './release_builds.mjs';

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

// --- --droog: het plan start niets ---
const W = 'gde-world.tgz';
const alle = Object.keys(BUILDS);
const droogPlan = planRuns({ only: alle, explicit: null, names: [W], version: V, dry: true });
ok(droogPlan.wanted.length === 4 && droogPlan.start.length === 0, '--droog: vier workflows in het plan, niets te starten');
ok(planRuns({ only: alle, explicit: null, names: [W], version: V, notesOnly: true }).start.length === 0, '--notes-only start niets');
ok(planRuns({ only: alle, explicit: null, names: [W], version: V, dry: true, notesOnly: true }).start.length === 0, '--droog met --notes-only start niets');
ok(planRuns({ only: alle, explicit: null, names: [W], version: V }).start.length === 4, 'gewone route start alle vier');
const metDmg = planRuns({ only: alle, explicit: null, names: [W, `GDE-Groningen-${V}-mac.dmg`], version: V });
ok(metDmg.skipped.join(',') === 'mac' && !metDmg.start.includes('mac'), 'bijlage die er al staat wordt overgeslagen');
ok(planRuns({ only: ['mac'], explicit: 'mac', names: [W, `GDE-Groningen-${V}-mac.dmg`], version: V }).start.join(',') === 'mac', '--only bouwt ook als de bijlage bestaat');
ok(expectedAssets('linux', V).length === 2 && expectedAssets('linux', V, true).length === 4 && expectedAssets('mac', V).length === 1, 'droog noemt ook de linux-tar.gz en de ARM-bijlagen');

// --- --droog via main(), met een nep-gh: bewijst dat er geen workflow run langskomt ---
const releaseJson = (assets) => JSON.stringify({ assets: assets.map((name) => ({ name })), body: '## x\n', isPrerelease: false });
const nepGh = (calls, assets) => (args) => {
  calls.push(args.join(' '));
  if (args[0] === 'release' && args[1] === 'view') return releaseJson(assets);
  if (args[0] === 'release' && args[1] === 'edit') return '';
  if (args[0] === 'workflow') return '';
  if (args[0] === 'run' && args[1] === 'list') return JSON.stringify([{ databaseId: 4242, createdAt: new Date().toISOString(), status: 'queued' }]);
  if (args[0] === 'run' && args[1] === 'view') return JSON.stringify({ status: 'completed', conclusion: 'success', jobs: [{ startedAt: '2026-10-29T10:00:00Z', completedAt: '2026-10-29T10:07:30Z' }] });
  if (args[0] === 'repo') return 'iwink/GDE-Groningen';
  throw new Error('onverwachte gh-aanroep: ' + args.join(' '));
};

const droogCalls = [];
const droogOut = [];
await main({ argv: [`v${V}`, '--droog'], exec: nepGh(droogCalls, [W]), log: (s) => droogOut.push(String(s)), logErr: (s) => droogOut.push(String(s)) });
ok(!droogCalls.some((c) => c.startsWith('workflow run')), '--droog roept geen gh workflow run aan');
ok(!droogCalls.some((c) => c.startsWith('release edit')), '--droog wijzigt de releasenotities niet');
ok(droogCalls.every((c) => c.startsWith('release view')), '--droog doet alleen leesacties');
ok(!droogCalls.some((c) => c.startsWith('run list') || c.startsWith('run view')), '--droog wacht niet op runs');
const droogTekst = droogOut.join('\n');
ok(droogTekst.includes(`zou starten: mac-release.yml (macOS-dmg) met tag=v${V}`), 'droog toont welke workflow en welke tag');
ok(droogTekst.includes(`ontbrekende bijlagen: GDE-Groningen-${V}-mac.dmg`), 'droog toont welke bijlagen ontbreken');
ok(droogTekst.includes('niets gestart, niets geüpload en niets aan de release gewijzigd'), 'droog zegt wat het niet doet');

// Zonder gde-world.tgz breekt --droog niet af (de gewone route doet dat wel): tonen wat er ontbreekt.
const leegCalls = [];
const leegOut = [];
await main({ argv: [`v${V}`, '--droog'], exec: nepGh(leegCalls, []), log: (s) => leegOut.push(String(s)), logErr: (s) => leegOut.push(String(s)) });
ok(leegCalls.every((c) => c.startsWith('release view')) && leegOut.join('\n').includes('geen gde-world.tgz'), 'droog zonder wereld: alleen een waarschuwing, geen run');

// De gewone route moet ongewijzigd blijven: daar gaat er wél een workflow run uit.
const levendCalls = [];
await main({ argv: [`v${V}`, '--only', 'mac'], exec: nepGh(levendCalls, [W]), log: () => {}, logErr: () => {} });
ok(levendCalls.includes(`workflow run mac-release.yml -f tag=v${V}`), 'zonder --droog start de workflow wel');

// #576: een tag zonder v (zoals de release 0.55.0) is een fout, geen stille terugval
// op de versie uit desktop/package.json.
const tagFout = await main({ argv: ['0.55.0', '--droog'], exec: () => { throw new Error('gh had niet aangeroepen mogen worden'); }, log: () => {}, logErr: () => {} })
  .then(() => '', (e) => String(e && e.message || e));
ok(/ongeldige tag "0\.55\.0"/.test(tagFout), 'tag zonder v wordt geweigerd');
const halfFout = await main({ argv: ['v0.39', '--droog'], exec: () => { throw new Error('gh had niet aangeroepen mogen worden'); }, log: () => {}, logErr: () => {} })
  .then(() => '', (e) => String(e && e.message || e));
ok(/ongeldige tag/.test(halfFout), 'onvolledige tag wordt geweigerd');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
