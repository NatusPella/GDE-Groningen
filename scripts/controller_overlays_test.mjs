// De controllertest voor alle kaarten, popups en korte overlays (22-11, #1011 en #495): de audit (controller_audit_overlays.mjs) moet nul
// bevindingen geven buiten de lijst met onderbouwde uitzonderingen hieronder, en de reparaties zelf zijn vastgezet.
//   node scripts/controller_overlays_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from './controller_audit_overlays.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL ' + m + (info !== '' ? ' (' + (typeof info === 'string' ? info : JSON.stringify(info)) + ')' : '')); } };

// Bekende uitzonderingen: scherm + controle + waarom het geen fout is. Een uitzondering die niet meer voorkomt, is zelf een fout (opruimen).
const UITZONDERINGEN = [
  { screen: 'recapkaart', check: 'klikdiv', reden: 'het element is de achtergrond van de kaart (een klik ernaast sluit); de focusbare uitweg is de knop Verder met de focus (recapcardrun.js, [data-rk-ok]) en Esc/B sluit ook' },
];

const r = await runAudit();
ok(r.screens.length >= 40, 'de audit dekt minstens 40 schermen', r.screens.length);
const echt = r.findings.filter((f) => !UITZONDERINGEN.some((u) => u.screen === f.screen && u.check === f.check));
ok(echt.length === 0, 'geen bevindingen buiten de uitzonderingen', echt.map((f) => `${f.screen}/${f.check}: ${f.detail}`));
for (const u of UITZONDERINGEN) ok(r.findings.some((f) => f.screen === u.screen && f.check === u.check), `de uitzondering ${u.screen}/${u.check} komt nog voor (anders schrappen)`);
ok(UITZONDERINGEN.every((u) => u.reden.length > 40), 'elke uitzondering is onderbouwd');

// de soorten schermen die de eigenaar noemde zijn er allemaal
const ids = new Set(r.screens.map((s) => s.id));
for (const id of ['startkeuze', 'naamkaart-samen', 'toestemming', 'moeilijkheid', 'oudesaves', 'laadscherm', 'keuzepaneel', 'qte', 'eindkaart-impact', 'recapkaart', 'aftiteling', 'melding', 'afsluiten', 'winkel', 'balie', 'pashokje', 'kappersstoel', 'telefoon', 'vertrekbord', 'radiomelding', 'samenwiel', 'doelvoorstel', 'meedoen', 'mg-kart', 'mg-padel', 'mg-golf', 'mg-klimtoren', 'mg-penalty', 'mg-training', 'mg-voetbal', 'voetbal-tv']) ok(ids.has(id), `de audit kent het scherm ${id}`);

// de reparaties
const pad = read('game/js/gamepad.js');
ok(/const FOCUSABLE = '[^']*\bsummary\b[^']*'/.test(pad) && /const FOCUSABLE = '[^']*textarea/.test(pad), 'de D-pad bereikt uitklappers (summary) en tekstvakken (textarea)');
ok(/classList\.contains\('shop-open'\)\) return slot === 'lb' \? '\[' : '\]'/.test(pad), 'in een open winkel wisselen LB en RB de afdeling');
const { bewaarFocus } = await import('../game/js/listnav.js');
const doc = { body: { id: 'b' }, activeElement: null };
const knop = { isConnected: true, focus() { doc.activeElement = this; } };
doc.activeElement = knop;
const terug = bewaarFocus(doc);
doc.activeElement = { other: true };
terug();
ok(doc.activeElement === knop, 'bewaarFocus zet de focus terug op de knop van voor de kaart');
knop.isConnected = false; doc.activeElement = null; terug();
ok(doc.activeElement === null, 'bewaarFocus slaat een intussen verdwenen knop over');
const leeg = bewaarFocus({ body: 1, activeElement: 1 });
ok(typeof leeg === 'function' && leeg() === undefined, 'bewaarFocus zonder focus op de pagina doet niets');
const ov = await import('../game/js/coopoverlay.js');
const h = ov.overlayHtml({ title: 't', buttons: [{ action: 'ja', label: 'Ja', toets: 'J', primary: true }, { action: 'nee', label: 'Nee' }] });
ok(/<button[^>]*data-cp-action="ja"[^>]*aria-keyshortcuts="J"[^>]*>Ja <span class="ds-z-knop__toets"[^>]*>.*data-gk="J"/.test(h.replace(/\n/g, ' ')), 'de Samen-overlay zet de toets IN de knop (data-gk), geen "(J)" in het label');
ok(!/aria-keyshortcuts[^>]*data-cp-action="nee"|data-cp-action="nee"[^>]*aria-keyshortcuts/.test(h), 'een knop zonder toets krijgt geen sneltoetskenmerk');
ok(!/\((J|N)\)/.test(read('game/js/multiplayerhostwisselui.js')), 'het overnemen-scherm heeft geen platte "(J)" en "(N)" meer');
const vb = read('game/js/voetbal.js');
ok(/panel\.pagina/.test(vb) && /\{E\} tweede pagina/.test(vb), 'het voetbal-keuzescherm heeft een tweede pagina voor de opties 5 tot 8 (E/Y)');
ok(/tikHanden\(\)/.test(read('game/js/klimtoren.js')) && /tikHand/.test(read('game/js/klimtoren.js')), 'de klimtoren heeft een tik-alternatief voor A en D tegelijk vasthouden (tikStand)');
const nu = read('game/js/onlineconsentui.js') + read('game/js/launchchoiceui.js');
ok((nu.match(/bewaarFocus\(\)/g) || []).length >= 2, 'de naamkaart en de toestemmingskaart geven de focus terug');

console.log(`${n - fails}/${n} ok${fails ? ', ' + fails + ' FOUT' : ''}`);
process.exit(fails ? 1 : 0);
