// Steam preparation (#64): the files of steam/ and docs/STEAM-KLAAR.md hang together.
// Local only; nothing contacts Steam.   node scripts/steam_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES, actionSets, SET_TITLES } from '../steam/make-steam-files.mjs';
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

// --- Deck ------------------------------------------------------------------
ok(isSteamDeck({ isSteamDeck: true }) && isSteamDeck(null, { SteamDeck: '1' }) && !isSteamDeck(null, {}) && !isSteamDeck({}), 'Deck detection');
ok(JSON.stringify(deckDefaults(false)) === '{}' && deckDefaults(true).hintSource === 'pad' && deckDefaults(true).textSize === 'groot', 'the Deck defaults, none elsewhere');
ok(Object.keys(DECK_DEFAULTS).every((k) => ['textSize', 'hintSource', 'padLayout', 'touchControls'].includes(k)), 'the Deck only changes four settings');
ok(isDeckShape(1280, 800) && !isDeckShape(1280, 720) && !isDeckShape(1920, 1200), '16:10 and small');
ok(uiScaleFor(1280, 800) === 1 && hudEdge(1280, 800, 1) >= 24 && hudEdge(1280, 800, 1) * 1 >= 800 * 0.035, 'the HUD on 1280x800: scale 1, title-safe edge');
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

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
