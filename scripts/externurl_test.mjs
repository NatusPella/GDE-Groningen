// #587: the URL policy of the desktop shell (desktop/externurl.cjs), without
// starting Electron. Only http(s) may go to the player's browser; the game's
// own app://game/ pages stay inside the app; every other scheme is refused.
//   node scripts/externurl_test.mjs
import assert from 'node:assert';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isGameUrl, safeExternalUrl } = require('../desktop/externurl.cjs');
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const SCHEME = 'app', HOST = 'game';

// --- the browser: http(s) and nothing else ---
assert.strictEqual(safeExternalUrl('https://example.com/pad?q=1#x'), 'https://example.com/pad?q=1#x');
assert.strictEqual(safeExternalUrl('http://example.com'), 'http://example.com/', 'http is een gewoon webadres');
assert.strictEqual(safeExternalUrl('HTTPS://Example.COM/'), 'https://example.com/', 'schema en host worden genormaliseerd');
assert.strictEqual(safeExternalUrl('  https://example.com/  '), 'https://example.com/', 'spaties eromheen mogen');

// --- the OS shell: every other scheme is refused (the #587 hole) ---
for (const url of [
  'file:///C:/x.exe', // location = file:///... laat Windows het bestand uitvoeren
  'file:///etc/passwd',
  'ms-msdt:/id PCWDiagnostic', // Windows-foutopsporing
  'search-ms:query=x&crumb=location:C%3A%5C',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'about:blank',
  'mailto:iemand@example.com', // het spel heeft geen mailto-links
  'app://game/cutpreview.html', // hoort in de app, niet bij de OS-shell
  'ftp://example.com/x',
  '\\\\server\\share\\x.exe',
  'example.com',
  '',
]) assert.strictEqual(safeExternalUrl(url), null, `geweigerd: ${url}`);
for (const url of [null, undefined, 42, {}]) assert.strictEqual(safeExternalUrl(url), null, 'geen URL: geweigerd');

// --- the game's own pages: same scheme and host, no port or login ---
for (const url of ['app://game/', 'app://game/index.html', 'app://game/cutpreview.html', 'app://game/index.html?testmenu#x']) {
  assert.strictEqual(isGameUrl(url, SCHEME, HOST), true, `eigen pagina: ${url}`);
}
for (const url of [
  'app://game.evil/x', // andere host
  'app://game@evil.com/x', // login die de host verandert
  'app://game:1234/x', // andere origin door een poort
  'app://other/x',
  'https://game/x',
  'file:///C:/app/game/index.html',
  '',
]) assert.strictEqual(isGameUrl(url, SCHEME, HOST), false, `niet van het spel: ${url}`);
assert.strictEqual(isGameUrl('app://game/x'), false, 'zonder scheme en host geen match: main.js geeft ze mee');

// --- cutpreview.html (game/js/testmenu.js:57) resolves to a game URL too ---
const preview = new URL('cutpreview.html', 'app://game/index.html').href;
assert.strictEqual(preview, 'app://game/cutpreview.html');
assert.strictEqual(isGameUrl(preview, SCHEME, HOST), true);
assert.ok(/data-open="cutpreview\.html"/.test(read('game/js/testmenu.js')), 'het testmenu opent nog steeds cutpreview.html');

// --- the shell wires the policy: no raw page URL reaches shell.openExternal ---
const main = read('desktop/main.js');
assert.ok(/require\('\.\/externurl\.cjs'\)/.test(main), 'main.js gebruikt de allowlist');
assert.ok(/guardPage\(win\.webContents\)/.test(main), 'de hoofdpagina is beveiligd');
assert.ok(/isGameUrl\(url, SCHEME, HOST\)/.test(main));
assert.strictEqual((main.match(/safeExternalUrl\(url\)/g) || []).length, 2, 'beide handlers vragen de allowlist');
assert.ok(!/shell\.openExternal\((url|rawUrl|u)\)/.test(main), 'geen ruwe pagina-URL naar de OS-shell');
assert.strictEqual((main.match(/shell\.openExternal\(/g) || []).length, 2, 'precies twee openExternal-plekken, beide gecontroleerd');
assert.strictEqual((main.match(/shell\.openExternal\(external\)/g) || []).length, 2, 'alleen het gecontroleerde adres gaat naar de shell');
assert.strictEqual((main.match(/action: 'allow'/g) || []).length, 1, 'alleen een eigen venster wordt toegestaan');
assert.ok(/did-create-window/.test(main), 'een nieuw speelvenster krijgt dezelfde bewaking');

// --- that window keeps the sandbox: same webPreferences as the main window ---
const prefs = /function pageWebPreferences\(\)\s*\{([^}]*)\}/.exec(main);
assert.ok(prefs, 'pageWebPreferences bestaat');
for (const regel of [/contextIsolation: true/, /nodeIntegration: false/, /sandbox: true/]) assert.ok(regel.test(prefs[1]), 'veilige webPreferences voor elk venster');
assert.strictEqual((main.match(/webPreferences: pageWebPreferences\(\)/g) || []).length, 2, 'hoofdvenster en cutpreview-venster krijgen dezelfde webPreferences');
assert.ok(!/require\(['"]electron['"]\)/.test(read('desktop/externurl.cjs')), 'de allowlist is puur: geen Electron nodig in de test');

// --- the module ships with the app ---
const pkg = JSON.parse(read('desktop/package.json'));
assert.ok(pkg.build.files.includes('externurl.cjs'), 'externurl.cjs zit in de verpakte app');

console.log('externurl_test: ok');
