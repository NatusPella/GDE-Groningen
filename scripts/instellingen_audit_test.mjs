// Audit van Instellingen (verfijnronde 22-11): geen verborgen en geen dubbele opties, elke keuzelijst bevat zijn standaard, de rijen staan op het
// tabblad waar settingsrules.js ze zet, en de bedrading (herstellen per tabblad, tellers, redenen, stiltewaarschuwing, schudproef, zoeksynoniemen,
// Cheats alleen na keuze) staat in de bron van het pauzemenu.
//   node scripts/instellingen_audit_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TAB_KEYS, OWN_SCREEN, NO_ROW } from '../game/js/settingsrules.js';

const KEY = 'gde-settings';
globalThis.localStorage = { getItem: () => null, setItem: (k) => { throw new Error(`test schreef naar ${k}`); }, removeItem() {}, clear() {} };
globalThis.document = undefined;
const S = await import('../game/js/settings.js');
const DEF = S.defaultSettings();

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const menu = lees('pausemenu.js');
let n = 0;
const ok = (c, naam) => { n++; assert.ok(c, naam); };

// de bron van settingsHtml, in stukken per tabblad
const start = menu.indexOf('function settingsHtml()');
const eind = menu.indexOf('\n}\n', start);
ok(start > 0 && eind > start, 'settingsHtml gevonden');
const bron = menu.slice(start, eind);
const delen = bron.split(/\$\{tab\('(\w+)'/);
const rijen = {}; // tab -> [{ soort, key, regel }]
for (let i = 1; i < delen.length; i += 2) {
  const tab = delen[i];
  rijen[tab] = rijen[tab] || [];
  for (const m of delen[i + 1].matchAll(/\$\{(toggle|picker|slider)\('(\w+)'([^\n]*)/g)) rijen[tab].push({ soort: m[1], key: m[2], regel: m[0] });
}
ok(Object.keys(rijen).length >= 8, 'alle tabbladen van Instellingen gevonden');

// 1. geen dubbele opties: een sleutel heeft hoogstens een rij in Instellingen
{
  const gezien = new Map();
  for (const [tab, lijst] of Object.entries(rijen)) for (const { key } of lijst) {
    ok(!gezien.has(key), `${key} staat op twee plekken (${gezien.get(key)} en ${tab})`);
    gezien.set(key, tab);
  }
  // 2. de rijen staan op het tabblad uit settingsrules.js, en elke sleutel daar heeft een rij
  for (const [tab, keys] of Object.entries(TAB_KEYS)) {
    for (const k of keys) ok(gezien.get(k) === tab, `${k} hoort op ${tab}, staat op ${gezien.get(k) || 'nergens'}`);
  }
  for (const [k, tab] of gezien) ok(TAB_KEYS[tab] && TAB_KEYS[tab].includes(k), `rij ${k} op ${tab} staat niet in settingsrules.js`);
}

// 3. geen verborgen opties: elke instelling heeft een rij, een eigen scherm of een bewuste uitzondering
{
  const bekend = new Set([...Object.values(TAB_KEYS).flat(), ...OWN_SCREEN, ...NO_ROW]);
  for (const k of Object.keys(DEF)) ok(bekend.has(k), `instelling ${k} heeft geen rij en staat niet als uitzondering in settingsrules.js`);
  for (const k of bekend) ok(Object.prototype.hasOwnProperty.call(DEF, k), `settingsrules.js noemt ${k}, maar settings.js kent hem niet`);
}

// 4. elke keuzelijst bevat zijn standaard, en elke optie is een toegestane waarde
{
  let pickers = 0;
  for (const lijst of Object.values(rijen)) for (const { soort, key, regel } of lijst) {
    if (soort !== 'picker') continue;
    const waarden = [...regel.matchAll(/\[\s*'([^']*)'\s*,/g)].map((m) => m[1]);
    if (!waarden.length) continue; // een lijst uit een variabele (kwaliteit)
    pickers++;
    ok(waarden.includes(String(DEF[key])), `${key}: de standaard ${DEF[key]} staat niet in de keuzes ${waarden.join(', ')}`);
    for (const w of waarden) {
      const v = typeof DEF[key] === 'number' ? Number(w) : w;
      ok(S.isValidSetting(key, v), `${key}: optie ${w} is geen toegestane waarde`);
    }
    ok(new Set(waarden).size === waarden.length, `${key}: een optie staat dubbel`);
  }
  ok(pickers >= 20, `genoeg keuzelijsten gecontroleerd (${pickers})`);
}

// 5. de schuiven: min en max liggen in het toegestane bereik, de standaard ligt ertussen
{
  let schuiven = 0;
  for (const lijst of Object.values(rijen)) for (const { soort, key, regel } of lijst) {
    if (soort !== 'slider') continue;
    const m = /slider\('\w+',\s*'[^']*'(?:,\s*([\d.]+),\s*([\d.]+),\s*([\d.]+))?/.exec(regel);
    const lo = m && m[1] !== undefined ? Number(m[1]) : 0, hi = m && m[2] !== undefined ? Number(m[2]) : 1;
    schuiven++;
    ok(DEF[key] >= lo && DEF[key] <= hi, `${key}: de standaard ${DEF[key]} ligt niet tussen ${lo} en ${hi}`);
    ok(S.isValidSetting(key, lo) && S.isValidSetting(key, hi), `${key}: de uiterste standen ${lo} en ${hi} worden geweigerd door settings.js`);
  }
  ok(schuiven >= 12, `genoeg schuiven gecontroleerd (${schuiven})`);
}

// 6. de bedrading in het pauzemenu
ok(menu.includes('reset-tab-go') && menu.includes('resetSettingsKeys(TAB_KEYS[sub]'), 'herstellen per tabblad is bedraad');
ok(/data-action="reset-tab-go"/.test(menu) && /data-action="reset-go">Alles herstellen/.test(menu), 'de herstelvraag biedt tabblad en alles');
ok(menu.includes('syncSettingsExtras(st)') && menu.includes('syncSettingsExtras(getSettings())'), 'tellers en redenen volgen elke wijziging en elke opening');
ok(menu.includes('data-silence') && menu.includes('silenceWarning(st)'), 'de stiltewaarschuwing staat onder de volumes');
ok(menu.includes('data-shake-proef') && menu.includes('proefSchudden'), 'de schudproef staat bij Toegankelijkheid');
ok(menu.includes('reducedMotion()') && menu.includes('effectsFor('), 'de schudproef volgt Beweging beperken en het besturingssysteem');
ok(menu.includes('synonymsFor('), 'de zoekregels krijgen synoniemen');
ok(menu.includes('cheatsVisible(') && /filter\(\(id\) => id !== 'streken' \|\| cheatsInMenu\(\)\)/.test(menu), 'Cheats staat alleen in de rail in dev, bij een actieve cheat of na het vrijspelen in het verhaal');
ok(/name === 'streken' && !ids\.includes\('streken'\)/.test(menu), 'een oude verwijzing naar Cheats valt terug op Instellingen');
ok(!/cheatsTonen/.test(menu), 'er is geen instelling meer die Cheats toont: het verhaal speelt ze vrij');
ok(menu.includes('COLOR_BLIND_LABELS.deuteranopie'), 'de kleurenstanden hebben gewone namen');
// de rail verbergt de knop ook zodra de laatste actieve cheat uitgaat
ok(menu.includes(`.ra[data-goto="streken"]`) && menu.includes('cheatsBtn.hidden = !cheatsInMenu()'), 'de railknop verdwijnt weer na uitzetten');
// elk nieuw stuk heeft zijn stijl
const css = lees('pausemenu.css');
for (const sel of ['.pm-why', '.pm-afhankelijk', '.pm-silence', '.pm-shake-box.is-schud', '@keyframes pm-schud']) ok(css.includes(sel), `stijl voor ${sel}`);
// Beweging beperken: de schudproef animeert nooit zonder stand; de CSS-animatie is kort en eenmalig
ok(/animation: pm-schud var\(--ds-m-lang\) linear 1;/.test(css), 'de proef schudt een keer, binnen de lange beweging van het designsysteem');
// Samen spelen: alles lokaal per speler, geen netwerk in de nieuwe module
const regels = lees('settingsrules.js');
ok(!/fetch\(|WebSocket|RTCPeer|import .*coop|import .*net/.test(regels), 'settingsrules.js is puur en lokaal');
const bronSettings = lees('settings.js');
ok(!/^\s*cheatsTonen: /m.test(bronSettings), 'cheatsTonen staat niet meer in de standaardinstellingen');
void KEY;

console.log(`instellingen_audit_test: ${n} controles ok`);
