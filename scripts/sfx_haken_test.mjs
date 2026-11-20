// SFX ronde 4 (#988): de haken van de missie-polish (sfx/haken.js) en hun koppeling aan de opnames (samples.js).
//   node scripts/sfx_haken_test.mjs
// Pure test zonder Web Audio: de haken zetten een audio-gebeurtenis in de rij of roepen de UI-haak aan; elke naam die de
// spelcode gebruikt moet een opname hebben (FX_OPNAME_ALLEEN of FX_VERVANG), en de haken moeten fouttolerant zijn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { haakFx, haakUi } from '../game/js/sfx/haken.js';
import { sfxLinks } from '../game/js/latehooks.js';
import { FX_OPNAME_ALLEEN, FX_VERVANG, vervangSleutel } from '../game/js/sfx/samples.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };

// haakFx: een gebeurtenis met plek; zonder plek op de speler; zonder speler niets; de rij loopt nooit over
{
  const w = { player: { x: 10, y: 20 } };
  ok(haakFx(w, 'startsein_toeter', 5, 6) && w.audioEvents[0].kind === 'fx' && w.audioEvents[0].name === 'startsein_toeter' && w.audioEvents[0].x === 5 && w.audioEvents[0].y === 6, 'een geluid met plek');
  ok(haakFx(w, 'bel_uitslag') && w.audioEvents[1].x === 10 && w.audioEvents[1].y === 20, 'zonder plek: de plek van de speler');
  const v = { player: { x: 1, y: 2 }, lokaalLichaam: { inVehicle: { x: 7, y: 8 } } };
  ok(haakFx(v, 'klok_tik') && v.audioEvents[0].x === 7, 'in een voertuig: de plek van het voertuig');
  ok(haakFx(w, 'bel_uitslag', undefined, 4) && w.audioEvents[2].x === 10, 'een half getal telt als geen plek');
  ok(haakFx({}, 'x') === false, 'zonder speler: niets');
  ok(haakFx(null, 'x') === false && haakFx(w, '') === false, 'zonder wereld of naam: niets');
  const q = { player: { x: 0, y: 0 }, audioEvents: new Array(64).fill({}) };
  ok(haakFx(q, 'x') === false && q.audioEvents.length === 64, 'een volle rij blijft 64');
  ok(haakFx({ get player() { throw new Error('kapot'); } }, 'x') === false, 'een fout in de wereld raakt het spel niet');
}
// haakUi: via sfxLinks.uiFx; een fout of een ontbrekend geluid geeft false
{
  const oud = sfxLinks.uiFx;
  let kreeg = null;
  sfxLinks.uiFx = (naam) => { kreeg = naam; return true; };
  ok(haakUi('regelkaart_papier') === true && kreeg === 'regelkaart_papier', 'haakUi roept de UI-haak aan');
  sfxLinks.uiFx = () => { throw new Error('kapot'); };
  ok(haakUi('x') === false, 'een kapotte UI-haak raakt het spel niet');
  sfxLinks.uiFx = oud;
  ok(haakUi('') === false, 'zonder naam: false');
}

// elke naam die de spelcode aan haakFx, haakUi of uiFx geeft (ronde 4) heeft een opname
{
  const bestanden = fs.readdirSync(JS, { recursive: true }).filter((f) => f.endsWith('.js') && !f.endsWith('haken.js') && !f.startsWith(`sfx${path.sep}`) || f === `sfx${path.sep}ui.js`);
  const gebruikt = new Map();
  for (const f of bestanden) {
    const t = fs.readFileSync(path.join(JS, f), 'utf8');
    for (const m of t.matchAll(/\b(?:haakFx\(\s*[A-Za-z_.]+\s*,|haakUi\(|uiFx\()\s*'([a-z_0-9]+)'/g)) { if (!gebruikt.has(m[1])) gebruikt.set(m[1], new Set()); gebruikt.get(m[1]).add(f); }
  }
  for (const [naam, files] of gebruikt) if (!FX_INFO[naam] && !FX_INFO[`${naam}_0`]) ok(vervangSleutel(naam, () => true, () => 0) !== null, `de haak "${naam}" (${[...files].join(', ')}) heeft een opname in samples.js`);
  for (const verwacht of ['regelkaart_papier', 'startsein_toeter', 'startsein_fluit', 'publiek_gejuich', 'publiek_applaus', 'klok_tik', 'bel_uitslag', 'ei_breuk', 'kratten_klets', 'worp_lucht', 'brievenbus_klep', 'oplegger_hydrauliek', 'weegbrug_klik', 'perron_ding', 'wacht_klaar', 'dobber_plons']) ok(gebruikt.has(verwacht), `de haak "${verwacht}" staat in de spelcode`);
  // elke opname-only naam wordt door een haak gebruikt (anders is hij dood gewicht)
  const alles = [...bestanden].map((f) => fs.readFileSync(path.join(JS, f), 'utf8')).join('\n');
  for (const naam of Object.keys(FX_OPNAME_ALLEEN)) ok(alles.includes(`'${naam}'`), `${naam} (FX_OPNAME_ALLEEN) wordt ergens in de code gebruikt`);
  ok(/steam: true/.test(fs.readFileSync(path.join(JS, 'stagerit.js'), 'utf8')) && /steam/.test(fs.readFileSync(path.join(JS, 'audio.js'), 'utf8')), 'de stoomfluit van M19 gaat via train_horn met steam: true');
  for (const naam of ['ui_weiger', 'ui_uitgave', 'hengel_vangst', 'horeca_hap']) ok(FX_VERVANG[naam], `${naam} heeft een opname naast de synth`);
}

console.log(fails ? `sfx_haken_test: ${fails} fouten van ${n}` : `sfx_haken_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
