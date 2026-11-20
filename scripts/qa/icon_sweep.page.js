// Page half of scripts/qa/icon_sweep.mjs (desktop --perf-script body; opdracht 21-11, Kist Kees-melding): scant de DOM van het
// draaiende spel op een toets of knop die als losse letter of woord naast een label staat, zonder toetsplaatje
// (.hud-key, .pad-g, kbd, .m-kc, [data-gk]) eromheen, of als rauwe {TOKEN} die de sweep (glyphs.js) niet heeft vervangen.
// Het statische tegenstuk is scripts/ui/icon_sweep.mjs; deze kijkt naar wat er echt op het scherm komt (runtime-opgebouwde
// zinnen, DOM-strings met += en template literals, data).
//   window.__iconSweep.scan(label)  -> lijst bevindingen { label, tekst, patroon, pad }; ook te gebruiken in de spelbot (--watch)
//   Dit script: start het spel, opent Besturing en Hulp, toont de Kist Kees-kaarten (instaptip, vliegles-uitleg, hint), zet
//   het instrumentenpaneel van het vliegtuig neer, scant na elke stap en schrijft het resultaat als JSON.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const KEYCAP = '.hud-key, .pad-g, kbd, .m-kc, [data-gk], [data-g-raw], .keycap, .hud-mouse, script, style, textarea, input, option, code, pre, canvas';
const LET = 'WASDEFQRGKXCVZHOIT';
const PATTERNS = [
  ['rauwe {TOKEN}', /\{(?:[A-Z0-9]{1,9})\}/],
  ['woordtoets', /(?<![\w{[(/.\-'’"+#])(?:Spatiebalk|Spatie|Shift|Ctrl|Esc|Enter|Backspace|WASD|LMB|RMB|F(?:[1-9]|1[0-2]))(?![\w}\]'’-])/],
  ['letter na druk/met/houd', new RegExp(String.raw`\b(?:[Dd]ruk(?: nog eens)?(?: op)?|[Hh]oud|[Tt]ik|[Mm]et|[Vv]ia|[Ll]aat|[Dd]an) [${LET}](?![\w}'’-])(?!\. [A-Z][a-z])`)],
  ['letterpaar', new RegExp(String.raw`(?<![\w{[(/.\-'’"+#])[WASDQEFZX]( en | of | ?/ ?|, )[WASDQEFZX](?![\w}\]/.'’-])`)],
  ['letter + werkwoord', new RegExp(String.raw`(?<![\w{[(/.\-'’"+#])[${LET}](?= (?:vooruit|achteruit|remt|rem|gas|los|omhoog|omlaag|koppelt|gooit|bij stilstand)\b)`)],
  ['muiswoord', /\b(?:muisknop|muiswiel|scrollwiel|linkermuis\w*|rechtermuis\w*|rechtsklik|linksklik|spatiebalk)\b/i],
];
// een kort woord naast een label dat zelf geen toetsplaatje heeft: <span>E</span> <span>uitstappen</span> (losse letter als tekstknoop)
const LOSSE_LETTER = new RegExp(`^[${LET}]$`);
const ALLOW_TEXT = [/Plan [AB]/, /Loket [ABC]/, /Hoge der A/, /\bA7\b|\bA28\b|\bA7\b/];

function pad(el) { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : '')); return p.join(' < '); }
function zichtbaar(el) { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false; if (e.hidden) return false; } return true; }
function scan(label) {
  const hits = [];
  const w = document.createTreeWalker(document.body, 4);
  while (w.nextNode()) {
    const t = w.currentNode; const v = t.nodeValue; if (!v || !v.trim()) continue;
    const el = t.parentElement; if (!el || el.closest(KEYCAP) || !zichtbaar(el)) continue;
    if (ALLOW_TEXT.some((r) => r.test(v))) continue;
    let hit = null;
    for (const [naam, re] of PATTERNS) if (re.test(v)) { hit = naam; break; }
    if (!hit && LOSSE_LETTER.test(v.trim()) && el.children.length === 0 && el.nextElementSibling && !el.closest('svg, .ph-compass, .hi-top, [class*="kompas"]')) hit = 'losse letter naast een label';
    if (hit) hits.push({ label, tekst: v.trim().slice(0, 90), patroon: hit, pad: pad(el) });
  }
  for (const el of document.querySelectorAll('[aria-label],[title]')) {
    for (const a of ['aria-label', 'title']) { const v = el.getAttribute(a); if (v && /\{[A-Z0-9]{1,9}\}/.test(v)) hits.push({ label, tekst: v.slice(0, 90), patroon: 'rauwe {TOKEN} in ' + a, pad: pad(el) }); }
  }
  return hits;
}
window.__iconSweep = { scan, hits: [] };
const all = [];
const stap = async (naam, f, ms = 900) => { try { await f(); } catch (e) { all.push({ label: naam, tekst: 'FOUT ' + e.message, patroon: 'script', pad: '' }); } await sleep(ms); const h = scan(naam); all.push(...h); console.log('[capture] ' + naam); };

for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
if (document.pointerLockElement) document.exitPointerLock();
await sleep(1500);
await stap('start', async () => {});

// Kist Kees: de kaarten die de speler bij het vliegtuig en in de vliegschool ziet, door de echte kaartlaag
const HC = await imp('hudcards');
const INS = await imp('instrumenten');
const VR = await imp('vliegschoolrules');
const HK = await imp('hintkit');
await stap('kist-kees-instaptip', async () => HC.showCard(w, { kind: 'tip', kicker: 'Kist Kees', title: 'Instappen', body: INS.UITLEG_INSTAPPEN, duration: 6, key: 'is-instap' }));
await stap('kist-kees-hint', async () => { const h = HK.HINTS.find((x) => x.id === 'v-vliegtuig'); HC.showCard(w, { kind: 'tip', kicker: 'Hint', title: h.title, body: h.body, duration: 6, key: 'is-hint' }); });
for (const id of Object.keys(VR.LIJNEN || {})) await stap('vliegles-' + id, async () => HC.showCard(w, { kind: 'tip', kicker: 'Instructeur', title: id, body: VR.LIJNEN[id].uitleg, duration: 5, key: 'is-les-' + id }), 450);
await stap('kist-kees-paneel', async () => { const p = INS.maakPaneel(); if (p) p.zet({ speedKmh: 90, altM: 120, vz: 0, throttle: 70, flaps: 1, gear: true, onGround: false, windSpeed: 3, windUit: 'ZW', graden: 90, pitch: 0, roll: 0, tegenwind: 0, stalled: false }, 'Gestel uit met {G}!', 'Kist Kees'); }, 1200);

// het pauzemenu: Besturing, Hulp en Instellingen
const PM = await imp('pausemenu');
for (const tab of ['controls', 'help', 'todo', 'map']) await stap('pauzemenu-' + tab, async () => { PM.openPauseMenu(tab); }, 1800);
PM.closePauseMenu();

clearInterval(skipper);
const uniek = [...new Map(all.filter((h) => h.patroon !== 'script' || true).map((h) => [h.patroon + '|' + h.tekst, h])).values()];
return JSON.stringify({ bevindingen: uniek.length, lijst: uniek.slice(0, 60) });
