// Statische beelden van het schermtoetsenbord (#1011): naam, code, wachtwoord en zoek op 1280x720 en 1920x1080, als contactblad.
// Geen Electron en geen spel: oskview.js tekent de kaart, de controllerknoppen komen uit inputglyphs.js (Xbox) en de echte CSS van het
// designsysteem doet de rest. Draait headless Chrome op een eigen profiel in de tijdelijke map (nooit de Chrome van de eigenaar, nooit taskkill).
//   node scripts/ui/toetsenbord_beeld.mjs [--uit=docs/beeld-22-11/toetsenbord] [--chrome=<pad>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const UIT = path.resolve(ROOT, arg('uit', 'docs/beeld-22-11/toetsenbord'));
const CHROME = arg('chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const M = await import('../../game/js/oskmodel.js');
const V = await import('../../game/js/oskview.js');
const { padSlotFor } = await import('../../game/js/controls.js');
const { padSlotGlyph, inkAttr } = await import('../../game/js/inputglyphs.js');

// de glyphs van het pad in plaats van de toetsenbordglyphs (glyphs.js doet dit live in het spel)
const face = { a: 'a', b: 'b', x: 'x', y: 'y' };
function padHtml(html) {
  return html.replace(/<span class="hud-key[^"]*" data-gk="([^"]+)">(?:<span[^>]*>[^<]*<\/span>|[^<]*)<\/span>/g, (m, tok) => {
    const slot = padSlotFor(tok, 'osk');
    const g = slot && padSlotGlyph(slot, 'xbox', face[slot] || '');
    if (!g) return '';
    const kind = face[slot] ? 'pad-face' : 'pad-sh';
    return `<span class="pad-g pad-kn ${kind}" data-set="${g.set}"${inkAttr(g.set, g.char)} data-slot="${slot}" role="img" aria-label="${slot}">${g.char}</span>`;
  });
}

const sheets = ['menu.css', 'a11y.css', 'ds-tokens.css', 'ds-components.css', 'ds-keycap.css', 'ds-osk.css'].map((f) => pathToFileURL(path.join(ROOT, 'game/js', f)).href);
const fonts = pathToFileURL(path.join(ROOT, 'game/fonts/fonts.css')).href;

const STANDEN = {
  name: () => M.setValue(M.createState({ kind: 'naam', max: 16, label: 'Online naam', chips: M.defaultChips('naam'), check: (t) => ({ ok: true }) }), 'Wadloper'),
  code: () => { let s = M.createState({ kind: 'code', max: 64, label: 'Kamercode of koppelcode', chips: M.defaultChips('code', { recent: ['K3J9D8F2'] }) }); s = M.pressKey(s, { t: 'prefix' }); return M.insertText(s, 'K3J9'); },
  wachtwoord: () => M.insertText(M.createState({ kind: 'wachtwoord', max: 32, label: 'Wachtwoord voor deze sessie' }), 'zomerpolder'),
  zoek: () => M.insertText(M.createState({ kind: 'zoek', max: 60, label: 'Zoek in je spullen', chips: [{ label: 'fiets', tekst: 'fiets' }, { label: 'kast', tekst: 'kast' }, { label: 'stempel', tekst: 'stempel' }] }), 'fie'),
};

function pagina(name, w, h) {
  let st = STANDEN[name]();
  // zet de focus op een toets die het verhaal vertelt (de letter die je nu zou typen)
  st = name === 'wachtwoord' ? M.focusAt(st, 1, 2) : M.focusAt(st, st.r, 2);
  const card = padHtml(V.renderOsk(st));
  const links = sheets.map((u) => `<link rel="stylesheet" href="${u}">`).join('');
  return `<!doctype html><html class="dev-pad" data-device="pad" lang="nl"><head><meta charset="utf-8">${links}<link rel="stylesheet" href="${fonts}">
<style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:linear-gradient(160deg,#17301f,#0c140e 70%)}
.scherm{position:absolute;inset:0;padding:48px;color:#f0ede4;font-family:var(--ds-font-zeef-kop);font-size:28px;letter-spacing:.06em}
.scherm .veld{margin-top:16px;max-width:520px;padding:14px 18px;border:2.5px solid #f3ead3;border-radius:10px;font-family:var(--ds-font-tekst);font-size:22px;opacity:.7}</style></head>
<body><div class="scherm">${name === 'wachtwoord' ? 'WACHTWOORD VOOR DEZE SESSIE' : name === 'code' ? 'MEEDOEN MET EEN KAMERCODE' : name === 'zoek' ? 'ZOEK IN JE SPULLEN' : 'JE ONLINE NAAM'}<div class="veld">${name === 'wachtwoord' ? '••••••••' : 'Jouw invoer staat hierboven'}</div></div>
<div class="osk">${card}</div></body></html>`;
}

function chrome(url, out, w, h, dir) {
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', `--user-data-dir=${dir}`, `--window-size=${w},${h}`, `--screenshot=${out}`, '--virtual-time-budget=4000', url], { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0 && !fs.existsSync(out)) throw new Error(`Chrome faalde (${r.status}): ${(r.stderr || '').slice(-300)}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-osk-beeld-'));
fs.mkdirSync(UIT, { recursive: true });
const profiel = path.join(tmp, 'profiel');
const maten = [[1280, 720], [1920, 1080]];
for (const [w, h] of maten) {
  for (const name of Object.keys(STANDEN)) fs.writeFileSync(path.join(tmp, `${name}-${w}.html`), pagina(name, w, h));
  // contactblad: 2x2 cellen op de halve maat
  const cel = (name) => `<iframe src="${pathToFileURL(path.join(tmp, `${name}-${w}.html`)).href}" style="width:${w}px;height:${h}px;border:0;transform:scale(.5);transform-origin:0 0"></iframe>`;
  const blad = `<!doctype html><html><body style="margin:0;display:grid;grid-template-columns:${w / 2}px ${w / 2}px;grid-auto-rows:${h / 2}px;gap:0;background:#000;width:${w}px;height:${h}px;overflow:hidden">${Object.keys(STANDEN).map((n) => `<div style="width:${w / 2}px;height:${h / 2}px;overflow:hidden">${cel(n)}</div>`).join('')}</body></html>`;
  fs.writeFileSync(path.join(tmp, `blad-${w}.html`), blad);
  chrome(pathToFileURL(path.join(tmp, `blad-${w}.html`)).href, path.join(UIT, `toetsenbord-blad-${w}x${h}.png`), w, h, profiel);
}
chrome(pathToFileURL(path.join(tmp, 'naam-1280.html')).href, path.join(UIT, 'toetsenbord-naam-1280x720.png'), 1280, 720, profiel);
chrome(pathToFileURL(path.join(tmp, 'wachtwoord-1920.html')).href, path.join(UIT, 'toetsenbord-wachtwoord-1920x1080.png'), 1920, 1080, profiel);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('klaar:', UIT);
