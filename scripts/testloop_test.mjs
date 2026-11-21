// De gedeelde onderdelen van de testrunners (scripts/lib/testloop.mjs en scripts/lib/vendorcache.mjs):
// herkansing van bekende flakes, hartslag, behoeften (needs-world), tijdslimiet en het vinden van de gevendorde three.js.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KNOWN_FLAKES, flakeInfo, runMetHerkansing, flakeMelding, maakHartslag, skipReden, laadBehoeften, runProces, pool, SERIE } from './lib/testloop.mjs';
import { vendorKandidaten, vindVendorCache, mainRepoRoot, THREE_REL } from './lib/vendorcache.mjs';
import { classify } from './run_tests.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL ' + m); } else console.log('ok   ' + m); };

// ---- bekende flakes
ok(flakeInfo('country_vehicles_test.mjs') && flakeInfo('country_vehicles_test.mjs').issue === 1094, 'country_vehicles_test staat als bekende flake (#1094)');
ok(flakeInfo('nieuwe_test.mjs') === null && flakeInfo('constructor') === null, 'een onbekende test is geen flake (ook geen prototype-sleutel)');
for (const n of Object.keys(KNOWN_FLAKES)) {
  ok(fs.existsSync(path.join(HERE, n)), 'flake bestaat nog: ' + n);
  ok(KNOWN_FLAKES[n].issue > 0 && KNOWN_FLAKES[n].reden && KNOWN_FLAKES[n].retries >= 1 && KNOWN_FLAKES[n].retries <= 2, 'flake heeft issue, reden en 1 of 2 herkansingen: ' + n);
}
const tabel = { 'flaky_test.mjs': { issue: 7, retries: 1, reden: 'x' } };
{
  let n = 0;
  const r = await runMetHerkansing('flaky_test.mjs', async () => (++n === 1 ? { code: 1, out: 'FAIL steekproef 7/12' } : { code: 0, out: 'ok' }), { tabel });
  ok(n === 2 && r.flaky && r.pogingen === 2 && r.res.code === 0, 'bekende flake: tweede poging slaagt en telt als flaky');
  ok(/^FLAKY \(#7\): slaagde pas bij poging 2; eerste fout: FAIL steekproef 7\/12/.test(flakeMelding(r)), 'de melding noemt issue en eerste fout');
}
{
  let n = 0;
  const r = await runMetHerkansing('flaky_test.mjs', async () => { n++; return { code: 1, out: 'FAIL altijd' }; }, { tabel });
  ok(n === 2 && !r.flaky && r.res.code === 1, 'bekende flake die twee keer faalt blijft rood');
  ok(/geen toeval meer/.test(flakeMelding(r)), 'de melding zegt dat het geen toeval meer is');
}
{
  let n = 0;
  const r = await runMetHerkansing('gewone_test.mjs', async () => { n++; return { code: 1, out: 'FAIL echt' }; }, { tabel });
  ok(n === 1 && !r.flaky && flakeMelding(r) === '', 'een gewone test wordt nooit herkanst');
}
{
  let n = 0;
  const r = await runMetHerkansing('flaky_test.mjs', async () => { n++; return { code: 0, out: 'ok' }; }, { tabel });
  ok(n === 1 && !r.flaky && flakeMelding(r) === '', 'een flake die meteen slaagt blijft stil (geen herkansing)');
}
{
  let n = 0;
  const r = await runMetHerkansing('flaky_test.mjs', async () => { n++; return { code: null, timedOut: true, out: '' }; }, { tabel });
  ok(n === 2 && r.res.timedOut, 'ook een time-out van een bekende flake krijgt één herkansing en blijft rood als hij blijft hangen');
}
ok(SERIE.has('coop_tcp_test.mjs') && SERIE.has('coopduur_test.mjs'), 'de tijdgevoelige tests draaien in serie');

// ---- hartslag (met een nepklok)
{
  let t = 1000; const regels = [];
  const h = maakHartslag({ log: (r) => regels.push(r), elkMs: 3600e3, nu: () => t });
  h.start('a_test.mjs', 120e3); h.start('b_test.mjs', 60e3, 2);
  ok(h.regel() === '', 'binnen 30 s nog geen hartslagregel');
  t += 45e3;
  ok(/nog bezig: a_test\.mjs \(45s, limiet 120s\), b_test\.mjs \(45s, poging 2, limiet 60s\)/.test(h.regel()), 'na 45 s staat elke lopende test in de regel, met poging en limiet');
  h.stop('a_test.mjs');
  ok(!h.regel().includes('a_test'), 'een klare test staat er niet meer in');
  h.sluit();
}

// ---- behoeften
{
  const b = { 'w_test.mjs': { wereld: true, reden: 'leest de provincie' }, 't_test.mjs': { three: true }, 'x_test.mjs': {} };
  ok(/^needs-world: game\/world ontbreekt.*leest de provincie/.test(skipReden('w_test.mjs', b, { wereld: false, three: true })), 'needs-world zonder wereld geeft een nette SKIP-reden');
  ok(skipReden('w_test.mjs', b, { wereld: true, three: false }) === '', 'met wereld draait hij gewoon');
  b['d_test.mjs'] = { wereld: true, data: true, reden: 'geen data/cache/province' };
  ok(skipReden('d_test.mjs', b, { wereld: false, three: true, data: true }) === '', 'een test die om data/cache vraagt draait ook zonder game/world als die data er is');
  ok(skipReden('d_test.mjs', b, { wereld: false, three: true, data: false }) !== '', 'zonder wereld en zonder data is hij een SKIP');
  ok(/^needs-three/.test(skipReden('t_test.mjs', b, { wereld: true, three: false })), 'needs-three zonder three geeft een SKIP');
  ok(skipReden('x_test.mjs', b, { wereld: false, three: false }) === '' && skipReden('onbekend_test.mjs', b, { wereld: false, three: false }) === '', 'zonder behoefte altijd draaien');
  const echt = laadBehoeften(ROOT);
  const namen = Object.keys(echt);
  ok(namen.length > 0, `scripts/test_behoeften.json bevat ${namen.length} needs-world-tests`);
  const weg = namen.filter((n) => !fs.existsSync(path.join(HERE, n)));
  ok(weg.length === 0, 'elke test in test_behoeften.json bestaat nog' + (weg.length ? ': ' + weg.join(', ') : ''));
  const leeg = namen.filter((n) => !echt[n].wereld && !echt[n].three);
  ok(leeg.length === 0, 'elke behoefte zegt wereld of three' + (leeg.length ? ': ' + leeg.join(', ') : ''));
  const zonderReden = namen.filter((n) => !echt[n].reden);
  ok(zonderReden.length === 0, 'elke behoefte heeft een reden' + (zonderReden.length ? ': ' + zonderReden.join(', ') : ''));
}

// ---- tijdslimiet en pool
{
  const t0 = Date.now();
  const r = await runProces(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ms: 400, cwd: ROOT });
  ok(r.timedOut && Date.now() - t0 < 8000, 'een hangend proces wordt bij de limiet gestopt (TIMEOUT)');
  ok(classify(r) === 'TIMEOUT', 'run_tests classificeert dat als TIMEOUT');
  const r2 = await runProces(process.execPath, ['-e', 'console.log("hoi")'], { ms: 20e3, cwd: ROOT });
  ok(r2.code === 0 && !r2.timedOut && /hoi/.test(r2.out), 'een gewoon proces geeft code en uitvoer terug');
  let tegelijk = 0, max = 0;
  const taak = () => async () => { tegelijk++; max = Math.max(max, tegelijk); await new Promise((r) => setTimeout(r, 20)); tegelijk--; return 1; };
  const res = await pool([1, 2, 3, 4, 5, 6].map(taak), 2);
  ok(res.length === 6 && max === 2, 'de pool draait hoogstens `jobs` tegelijk (' + max + ')');
}
ok(classify({ code: 0, out: 'SKIP geen game/world met de provincielaag\n' }) === 'SKIP', 'een test die zelf SKIP meldt (exit 0) is SKIP en niet PASS');
ok(classify({ code: 1, out: "Error: Cannot find package 'three' imported from x" }) === 'SKIP', 'ontbrekende three.js is SKIP (needs-stage), geen FAIL');
ok(classify({ code: 0, out: 'alles ok, SKIP elders in een regel' }) === 'PASS', 'SKIP midden in een regel telt niet');

// ---- three.js in een verse worktree
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-vendor-'));
  try {
    const leeg = path.join(tmp, 'leeg');
    fs.mkdirSync(leeg);
    const cache = path.join(tmp, 'cache');
    fs.mkdirSync(path.dirname(path.join(cache, THREE_REL)), { recursive: true });
    fs.writeFileSync(path.join(cache, THREE_REL), '// three');
    const geenGit = vindVendorCache(leeg, {});
    ok(geenGit.three === '' && geenGit.dirs.length === 0 && geenGit.bron === '', 'zonder cache: leeg resultaat');
    const viaEnv = vindVendorCache(leeg, { GDE_VENDOR_CACHE: cache });
    ok(viaEnv.three === path.join(cache, THREE_REL) && viaEnv.bron === 'env', 'GDE_VENDOR_CACHE wijst naar de vendor-cache zelf');
    const viaBoven = vindVendorCache(leeg, { GDE_VENDOR_CACHE: tmp });
    ok(viaBoven.dirs.length === 0, 'een map zonder npm/three@0.160.0 telt niet (dan is er niets gevonden)');
    fs.mkdirSync(path.join(tmp, 'desktop'), { recursive: true });
    fs.cpSync(cache, path.join(tmp, 'desktop', 'vendor-cache'), { recursive: true });
    ok(vindVendorCache(leeg, { GDE_VENDOR_CACHE: tmp }).bron === 'env', 'ook de repo-hoofdmap of desktop/ als waarde werkt');
    ok(vindVendorCache(leeg, { GDE_VENDOR_CACHE: path.join(tmp, 'desktop') }).dirs.length === 1, 'desktop/ als waarde werkt');
    // een worktree met een .git-bestand wijst naar de hoofdmap
    const hoofd = path.join(tmp, 'hoofd'), wt = path.join(tmp, 'wt');
    fs.mkdirSync(path.join(hoofd, '.git', 'worktrees', 'wt'), { recursive: true });
    fs.mkdirSync(wt);
    fs.writeFileSync(path.join(wt, '.git'), 'gitdir: ' + path.join(hoofd, '.git', 'worktrees', 'wt') + '\n');
    ok(path.resolve(mainRepoRoot(wt)) === path.resolve(hoofd), 'mainRepoRoot leest het .git-bestand van een worktree');
    fs.mkdirSync(path.join(hoofd, 'desktop'), { recursive: true });
    fs.cpSync(cache, path.join(hoofd, 'desktop', 'vendor-cache'), { recursive: true });
    const gevonden = vindVendorCache(wt, {});
    ok(gevonden.bron === 'hoofdmap' && gevonden.three.startsWith(path.join(hoofd, 'desktop')), 'een verse worktree vindt de cache van de hoofdmap zonder kopie');
    ok(vendorKandidaten(wt, {})[0] === path.join(wt, 'desktop', 'vendor-cache'), 'de eigen cache van de worktree gaat voor');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

process.exit(fails ? 1 : 0);
