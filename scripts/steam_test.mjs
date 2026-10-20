// Steam preparation (#64): the files of steam/ and docs/STEAM-KLAAR.md hang together.
// Local only; nothing contacts Steam.   node scripts/steam_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FILES, actionSets, SET_TITLES, achievementsJson, proposedApiName } from '../steam/make-steam-files.mjs';
import { fillVdfs } from '../steam/make-build-vdf.mjs';
const { steamSwitches } = createRequire(import.meta.url)('../desktop/steamflags.cjs');
import { ACHIEVEMENTS } from '../game/js/achievements.js';
import { PAD_MAPS } from '../game/js/controls.js';
import { DECK_DEFAULTS, deckDefaults, isSteamDeck, isDeckShape } from '../game/js/deck.js';
import { uiScaleFor, hudEdge } from '../game/js/hudlook.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, m, extra) => { n++; if (!c) { fails++; console.log('FAIL', m, extra !== undefined ? JSON.stringify(extra) : ''); } };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// a small VDF reader: nested "key" { ... } and "key" "value"; // comments
function parseVdf(text) {
  const tokens = [];
  const re = /"((?:[^"\\]|\\.)*)"|([{}])|\/\/[^\n]*/g;
  let m;
  while ((m = re.exec(text))) { if (m[1] !== undefined) tokens.push(m[1]); else if (m[2]) tokens.push(m[2]); }
  let i = 0;
  const block = () => {
    const o = {};
    while (i < tokens.length && tokens[i] !== '}') {
      const k = tokens[i++];
      if (tokens[i] === '{') { i++; o[k] = block(); i++; } else o[k] = tokens[i++];
    }
    return o;
  };
  return block();
}

// --- SteamPipe -------------------------------------------------------------
const app = parseVdf(read('steam/scripts/app_build.vdf')).AppBuild;
ok(app && app.AppID === 'APP_ID', 'app_build.vdf: AppID is still the placeholder APP_ID (nothing is registered)');
ok(app.SetLive === '' && app.Preview === '0', 'app_build.vdf: uploading never goes live by itself');
const depotIds = Object.keys(app.Depots || {});
ok(depotIds.length === 3 && depotIds.every((d) => /^DEPOT_ID_(WINDOWS|MAC|LINUX)$/.test(d)), 'three depot placeholders', depotIds);
for (const [id, file] of Object.entries(app.Depots || {})) {
  ok(exists('steam/scripts/' + file), `${file} exists`);
  const d = exists('steam/scripts/' + file) ? parseVdf(read('steam/scripts/' + file)).DepotBuildConfig : null;
  ok(d && d.DepotID === id, `${file}: DepotID matches the app build`, d && d.DepotID);
  const os = /_(windows|mac|linux)\./.exec(file)[1];
  ok(d && d.FileMapping && d.FileMapping.LocalPath === `${os}/*` && d.FileMapping.recursive === '1', `${file}: maps content/${os}/`);
}
ok(/\.\.\/content\/$/.test(app.ContentRoot) && /\.\.\/output\/$/.test(app.BuildOutput), 'content and output sit next to scripts/');
const gi = read('.gitignore');
ok(/steam\/content\//.test(gi) && /steam\/output\//.test(gi), 'steam/content and steam/output are ignored by git');
// copy-builds.mjs and the README agree on the three launch options
const copy = read('steam/copy-builds.mjs'), readme = read('steam/README.md');
for (const launch of ['GDE Groningen.exe', 'GDE Groningen.app', 'gde-groningen']) {
  ok(copy.includes(launch.replace('GDE Groningen', '${APP}')) || copy.includes(launch), `copy-builds.mjs launches ${launch}`);
  ok(readme.includes(launch), `README names the launch option ${launch}`);
}
ok(!/steam_api|steamworks\.js|greenworks|require\(['"]steam/i.test(read('desktop/package.json') + read('desktop/main.js')), 'no Steam library in the app (nothing contacts Steam)');

// the filled-in copies (make-build-vdf.mjs): ids in, no placeholder left, never live by itself
const templates = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'steam/scripts')).filter((f) => f.endsWith('.vdf')).map((f) => [f, read('steam/scripts/' + f)]));
const fill = (o) => fillVdfs(templates, { contentRoot: '/x/content/', buildOutput: '/x/output/', ...o });
const filled = fill({ app: '1234560', windows: '1234561', mac: '1234562', linux: '1234563' });
ok(Object.values(filled).every((t) => !/APP_ID|DEPOT_ID/.test(t.replace(/^\s*\/\/.*$/gm, ''))), 'a filled build keeps no placeholder');
const fApp = parseVdf(filled['app_build.vdf']).AppBuild;
ok(fApp.AppID === '1234560' && fApp.Preview === '1' && fApp.SetLive === '', 'filled build: app id, dry run, not live');
ok(Object.keys(fApp.Depots).join() === '1234561,1234562,1234563', 'filled build: three depots', Object.keys(fApp.Depots));
ok(parseVdf(filled['depot_build_mac.vdf']).DepotBuildConfig.DepotID === '1234562', 'filled depot file has its id');
ok('depot_build_windows.vdf' in fill({ app: '1', windows: '2' }) && !('depot_build_mac.vdf' in fill({ app: '1', windows: '2' })), 'an OS without a depot id is left out');
ok(!Object.keys(parseVdf(fill({ app: '1', windows: '2' })['app_build.vdf']).AppBuild.Depots).some((d) => /DEPOT/.test(d)), 'a left-out OS leaves no placeholder in the app build');
ok(parseVdf(fill({ app: '1', linux: '2', preview: false })['app_build.vdf']).AppBuild.Preview === '0', 'the real upload is only on request');
ok(parseVdf(fill({ app: '1', linux: '2', beta: 'beta' })['app_build.vdf']).AppBuild.SetLive === 'beta', 'a beta branch is only set when asked');
for (const bad of [{ windows: '2' }, { app: 'abc', windows: '2' }, { app: '1' }, { app: '1', windows: '1' }, { app: '1', windows: '0x2' }]) {
  let threw = false; try { fill(bad); } catch (e) { threw = true; }
  ok(threw, 'make-build-vdf refuses ' + JSON.stringify(bad));
}

// a trial run of copy-builds.mjs on a made-up dist/ in a temp folder (the real builds are 1 GB)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-steam-test-'));
  try {
    const dist = path.join(tmp, 'dist'), content = path.join(tmp, 'content');
    const touch = (rel) => { const f = path.join(dist, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'x'); };
    touch('win-unpacked/GDE Groningen.exe'); touch('win-unpacked/resources/app.asar');
    touch('linux-unpacked/gde-groningen'); touch('linux-unpacked/chrome-sandbox');
    touch('mac-universal/GDE Groningen.app/Contents/MacOS/GDE Groningen'); touch('mac-universal/other.txt');
    const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'steam/copy-builds.mjs'), ...a], { encoding: 'utf8', env: { ...process.env, GDE_STEAM_DIST: dist, GDE_STEAM_CONTENT: content } });
    const r = run();
    ok(r.status === 0, 'copy-builds copies a made-up dist', r.stderr);
    ok(fs.existsSync(path.join(content, 'windows/GDE Groningen.exe')) && fs.existsSync(path.join(content, 'windows/resources/app.asar')), 'copy-builds: the windows depot holds the launch file');
    ok(fs.existsSync(path.join(content, 'linux/gde-groningen')) && fs.existsSync(path.join(content, 'linux/chrome-sandbox')), 'copy-builds: the linux depot holds the launch file');
    ok(fs.existsSync(path.join(content, 'mac/GDE Groningen.app/Contents/MacOS/GDE Groningen')) && !fs.existsSync(path.join(content, 'mac/other.txt')), 'copy-builds: the mac depot holds only the .app');
    for (const f of Object.keys(templates).filter((n) => n.startsWith('depot_'))) {
      const osName = /_(windows|mac|linux)\./.exec(f)[1];
      ok(fs.existsSync(path.join(content, osName)), 'the ' + osName + ' depot maps a folder copy-builds made');
    }
    fs.writeFileSync(path.join(content, 'linux/stale.txt'), 'x');
    run('linux');
    ok(!fs.existsSync(path.join(content, 'linux/stale.txt')), 'copy-builds replaces the old content of a depot');
    ok(run('beos').status !== 0, 'copy-builds refuses an unknown platform');
    fs.rmSync(path.join(dist, 'linux-unpacked'), { recursive: true });
    ok(run('linux').status !== 0, 'copy-builds fails when a named platform has no build');
    const r2 = spawnSync(process.execPath, [path.join(ROOT, 'steam/copy-builds.mjs')], { encoding: 'utf8', env: { ...process.env, GDE_STEAM_DIST: path.join(tmp, 'leeg'), GDE_STEAM_CONTENT: path.join(tmp, 'c2') } });
    ok(r2.status !== 0, 'copy-builds fails when nothing was built');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// the overlay switches (desktop/steamflags.cjs): off unless asked for
ok(steamSwitches([], {}, 'win32').length === 0 && steamSwitches(['x', '--no-sandbox'], {}, 'linux').length === 0, 'no Steam switches without --steam-overlay');
ok(steamSwitches(['--steam-overlay'], {}, 'win32').map((s) => s[0]).join() === 'in-process-gpu,disable-direct-composition', 'overlay on Windows: gpu in the main process, no DirectComposition');
ok(steamSwitches([], { GDE_STEAM_OVERLAY: '1' }, 'linux').map((s) => s[0]).join() === 'in-process-gpu', 'overlay on Linux: gpu in the main process');
ok(/steamSwitches\(\)/.test(read('desktop/main.js')) && /"steamflags\.cjs"/.test(read('desktop/package.json')), 'main.js applies the switches and the build ships steamflags.cjs');

// --- Steam Input -----------------------------------------------------------
const generated = Object.fromEntries(FILES().map(([f, t]) => [path.relative(ROOT, f).split(path.sep).join('/'), t]));
for (const [rel, text] of Object.entries(generated)) ok(exists(rel) && read(rel) === text, `${rel} is up to date (node steam/make-steam-files.mjs)`);
const input = parseVdf(read('steam/steam_input/game_actions_APP_ID.vdf'))['In Game Actions'];
const sets = Object.keys(input.actions);
ok(sets.length === Object.keys(SET_TITLES).length && sets.every((s) => PAD_MAPS[s]), 'one action set per controller situation', sets);
const loc = input.localization;
ok(loc && loc.english && loc.dutch && Object.keys(loc.english).length === Object.keys(loc.dutch).length, 'english and dutch blocks exist and match');
// every title the sets point at has text, and the text is plain Dutch without a maker's name
const strings = loc.dutch;
const refs = [];
for (const [s, def] of Object.entries(input.actions)) {
  refs.push(def.title);
  for (const grp of ['StickPadGyro', 'Button']) for (const [k, v] of Object.entries(def[grp] || {})) refs.push(typeof v === 'string' ? v : v.title);
}
ok(refs.every((r) => r.startsWith('#') && strings[r.slice(1)]), 'every action has a title text', refs.filter((r) => !strings[r.slice(1)]).slice(0, 3));
const BRANDS = /\b(xbox|playstation|dualshock|dualsense|nintendo|switch|steam|valve|logitech|microsoft|sony)\b/i;
ok(Object.values(strings).every((t) => !BRANDS.test(t)), 'no brand in the visible names', Object.values(strings).filter((t) => BRANDS.test(t)).slice(0, 3));
ok(Object.values(strings).every((t) => t.length > 0 && t.length <= 64), 'names are short');
const asked = new Set(actionSets().flatMap((s) => s.buttons.map((b) => b.name)));
ok(asked.size > 80 && sets.every((s) => Object.keys(input.actions[s].Button).length > 0), 'every set has buttons');
ok(Object.values(input.actions).every((d) => d.StickPadGyro && Object.keys(d.StickPadGyro).length === 2), 'every set has a move and a look stick');

// --- prestaties ------------------------------------------------------------
const ach = JSON.parse(read('steam/achievements.json'));
ok(ach.prestaties.length === ACHIEVEMENTS.length && new Set(ach.prestaties.map((a) => a.id)).size === ACHIEVEMENTS.length, 'every prestatie is in the table once');
ok(ACHIEVEMENTS.every((a, i) => ach.prestaties[i].id === a.id), 'same order as achievements.js');
ok(ach.prestaties.every((a) => a.steamApiNaam === '' || /^[A-Z0-9_]{1,128}$/.test(a.steamApiNaam)), 'API names are empty or valid');
const named = ach.prestaties.filter((a) => a.steamApiNaam).map((a) => a.steamApiNaam);
ok(new Set(named).size === named.length, 'API names are unique');
const props = ach.prestaties.map((a) => a.voorstelApiNaam);
ok(props.every((n, i) => n === proposedApiName(ach.prestaties[i].id) && /^[A-Z0-9_]{1,128}$/.test(n)) && new Set(props).size === props.length, 'every prestatie has a valid, unique proposed API name');
ok(ach.prestaties.every((a, i) => a.titel === ACHIEVEMENTS[i].title && a.omschrijving === ACHIEVEMENTS[i].desc && a.verborgen === !!ACHIEVEMENTS[i].hidden), 'title, description and hidden flag follow achievements.js');
ok(ach.prestaties.every((a) => a.titel.length > 0 && a.titel.length <= 100 && a.omschrijving.length > 0 && a.omschrijving.length <= 250), 'titles and descriptions fit the Steamworks fields', ach.prestaties.filter((a) => a.titel.length > 100 || a.omschrijving.length > 250).map((a) => a.id));
ok(ach.prestaties.every((a) => !BRANDS.test(a.titel + ' ' + a.omschrijving)), 'no brand in the prestatie texts', ach.prestaties.filter((a) => BRANDS.test(a.titel + ' ' + a.omschrijving)).map((a) => a.id));
// a regeneration keeps the API names the owner filled in
{
  const edited = JSON.parse(JSON.stringify(ach));
  edited.prestaties[0].steamApiNaam = 'MIJN_EERSTE'; edited.prestaties[5].steamApiNaam = 'MIJN_ZESDE';
  const again = JSON.parse(achievementsJson(JSON.stringify(edited))).prestaties;
  ok(again[0].steamApiNaam === 'MIJN_EERSTE' && again[5].steamApiNaam === 'MIJN_ZESDE' && again.filter((a) => a.steamApiNaam).length === 2, 'regenerating keeps the filled-in API names');
  ok(JSON.parse(achievementsJson('kapot')).prestaties.every((a) => a.steamApiNaam === ''), 'a broken file is regenerated empty');
}

// --- Deck ------------------------------------------------------------------
ok(isSteamDeck({ isSteamDeck: true }) && isSteamDeck(null, { SteamDeck: '1' }) && !isSteamDeck(null, {}) && !isSteamDeck({}), 'Deck detection');
ok(JSON.stringify(deckDefaults(false)) === '{}' && deckDefaults(true).hintSource === 'pad' && deckDefaults(true).textSize === 'groot', 'the Deck defaults, none elsewhere');
ok(Object.keys(DECK_DEFAULTS).every((k) => ['textSize', 'hintSource', 'padLayout', 'touchControls'].includes(k)), 'the Deck only changes four settings');
ok(isDeckShape(1280, 800) && !isDeckShape(1280, 720) && !isDeckShape(1920, 1200), '16:10 and small');
ok(uiScaleFor(1280, 800) === 1 && hudEdge(1280, 800, 1) >= 24 && hudEdge(1280, 800, 1) * 1 >= 800 * 0.035, 'the HUD on 1280x800: scale 1, title-safe edge');
// small text on the 7-inch screen: nothing under 12 px except the keycaps (hidden with controller hints) and the dev tool
{
  const small = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) { if (!/^game\/(audio|models|img|storydata)$/.test(rel)) walk(rel); continue; }
      if (!/\.(js|css|html)$/.test(e.name)) continue;
      read(rel).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/font-size:\s*([0-9.]+)px/g)) if (+m[1] < 12 && !/\.hud-key/.test(line) && !/storydev\.js$/.test(rel)) small.push(rel + ':' + (i + 1) + ' ' + m[1] + 'px');
      });
    }
  };
  walk('game');
  ok(small.length === 0, 'no text under 12 px for the Deck (keycaps and the dev tool excepted)', small);
  ok(/--hud-min:\s*calc\(13px/.test(read('game/js/hud_panel.css')), 'the HUD floor stays 13 device pixels');
}
const prel = read('desktop/preload.js');
ok(/isSteamDeck:\s*process\.env\.SteamDeck === '1'/.test(prel), 'preload passes SteamDeck=1 on');
const settingsSrc = read('game/js/settings.js');
ok(/deckDefaults\(isSteamDeck\(\)\)/.test(settingsSrc), 'settings.js lays the player over the Deck defaults');

// --- checklist -------------------------------------------------------------
const doc = read('docs/STEAM-KLAAR.md');
ok(/^## 1\. /m.test(doc) && /^## 3\. Wat de eigenaar zelf moet doen/m.test(doc), 'checklist sections');
const files = [...doc.matchAll(/`((?:steam|docs|scripts|game|desktop)\/[A-Za-z0-9_./<>-]+)`/g)].map((m) => m[1]).filter((f) => !/^(desktop\/dist|steam\/content|steam\/output)/.test(f)); // made by a build, not in git
const missing = [...new Set(files)].filter((f) => !/[<>]/.test(f) && !/\/$/.test(f) && !f.includes('APP_ID') && !exists(f));
ok(missing.length === 0, 'every file the checklist names exists', missing);
const dirs = [...new Set(files)].filter((f) => /\/$/.test(f));
ok(dirs.every((d) => exists(d)), 'every folder the checklist names exists', dirs.filter((d) => !exists(d)));
const hidden = ACHIEVEMENTS.filter((a) => a.hidden).length;
ok(doc.includes(`${ACHIEVEMENTS.length} stuks, ${hidden} verborgen`), 'the checklist counts the prestaties right', [ACHIEVEMENTS.length, hidden]);
ok(doc.includes(`${Object.keys(SET_TITLES).length} actiesets`), 'the checklist counts the action sets right');
for (const must of ['Steamworks-account', 'app-id', 'Depots', 'Startopties', 'Prestaties', 'Leeftijds', 'Winkelpagina', 'Deck-test', 'Publicatiebesluit']) ok(doc.includes(must), `the checklist covers: ${must}`);
ok(!/\b(Xbox|PlayStation|Nintendo)\b/.test(doc), 'no maker names in the checklist');
for (const rel of ['docs/steam/winkelpagina.md', 'docs/IARC-ANTWOORDEN.md', 'docs/steam/trailer.md']) ok(exists(rel), `${rel} exists`);

// docs/STEAM-CHECKLIST.md: every row has a status, the files it names exist, the numbers are right
const list = read('docs/STEAM-CHECKLIST.md');
const STATUS = /\|\s*(\*\*)?(klaar|open|eigenaar)\b/;
const rows = list.split('\n').filter((l) => /^\| /.test(l) && !/^\| (Punt|---)/.test(l) && !/^\| \d/.test(l));
ok(rows.length >= 25, 'the Steam checklist has its rows', rows.length);
ok(rows.every((r) => STATUS.test(r)), 'every checklist row has the status klaar, open or eigenaar', rows.filter((r) => !STATUS.test(r)).map((r) => r.slice(0, 40)));
const listFiles = [...new Set([...list.matchAll(/`((?:steam|docs|scripts|game|desktop)\/[A-Za-z0-9_./-]+)`/g)].map((m) => m[1]).filter((f) => !/^(steam\/(content|output)|desktop\/dist)/.test(f) && !f.includes('APP_ID') && !/\/$/.test(f)))];
ok(listFiles.every(exists), 'every file the Steam checklist names exists', listFiles.filter((f) => !exists(f)));
ok(list.includes(`${ACHIEVEMENTS.length} (${hidden} verborgen)`), 'the Steam checklist counts the prestaties right');
for (const must of ['Steamworks-account', 'Steam Direct', 'app-id', 'Startopties', 'Privacyverklaring', 'Steam Cloud', 'echte Deck', 'Publicatiebesluit']) ok(list.includes(must), `the Steam checklist covers: ${must}`);
ok(!/\b(Xbox|PlayStation|Nintendo|Carmageddon)\b/.test(list + read('docs/steam/winkelpagina.md')), 'no maker or game names on the store page and the checklist');
ok(read('docs/steam/winkelpagina.md').includes(`${ACHIEVEMENTS.length} prestaties in het spel`), 'the store page counts the prestaties right');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
