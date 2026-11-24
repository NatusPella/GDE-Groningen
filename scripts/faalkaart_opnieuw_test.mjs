// De faalkaart zegt 'Opnieuw proberen [Enter]'; Enter moet dan ook OP de kaart werken (23-11, beelden M01-M06: Enter ging verloren
// zolang de kaart onder een scène stond, de missielus stond stil). Broncontrole: cinematics.js vangt Enter bij een faalkaart met
// opnieuw en roept de haak van missions.js; die doet dezelfde nieuwe poging als Enter na de kaart, met dezelfde bewakers.
//   node scripts/faalkaart_opnieuw_test.mjs
import fs from 'node:fs';
let bad = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { bad++; console.log('FAIL', name); } };
const bron = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const cine = bron('cinematics.js'), mis = bron('missions.js');
ok(/export function setOpnieuwHaak\(fn\)/.test(cine), 'cinematics.js heeft een haak voor Enter op de faalkaart');
ok(/opnieuw: !!opnieuw && kind === 'fail'/.test(cine), 'alleen een faalkaart die Opnieuw proberen noemt luistert naar Enter');
ok(/banner && banner\.opnieuw && opnieuwHaak && w && w\.input && w\.input\.wasPressed\('enter'\)/.test(cine), 'Enter op de kaart roept de haak');
ok(/w\.input\.consume\('enter'\)/.test(cine), 'Enter wordt verbruikt (geen dubbele actie)');
ok(/setOpnieuwHaak\(\(\) => \{/.test(mis), 'missions.js zet de haak');
const haak = mis.slice(mis.indexOf('setOpnieuwHaak(() => {'), mis.indexOf('function updateRetry('));
ok(/st\.retry\.missionIndex !== st\.index/.test(haak) && /\['idle', 'cooldown'\]\.includes\(st\.phase\)/.test(haak), 'de haak heeft dezelfde bewakers als de nieuwe poging, ook in de cooldown waarin de kaart staat');
ok(/skipCinematic\(\)/.test(haak) && /st\.retry\.fade = RETRY_FADE_S/.test(haak), 'de haak sluit de scène en start dezelfde nieuwe poging');
console.log(bad ? `faalkaart_opnieuw_test: ${bad} van ${n} fout` : `faalkaart_opnieuw_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
