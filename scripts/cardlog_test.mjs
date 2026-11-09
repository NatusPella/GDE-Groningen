// #801: tekstlog van HUD-kaarten. Puur: optellen, begrenzen en als tekst tonen.
//   node scripts/cardlog_test.mjs
import fs from 'node:fs';
import { addCardLog, cardLogText, CARD_LOG_MAX } from '../game/js/cardlog.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

let log = [];
for (let i = 0; i < CARD_LOG_MAX + 5; i++) log = addCardLog(log, { title: 'T' + i, body: 'B' + i });
ok(log.length === CARD_LOG_MAX, 'het log is begrensd', log.length);
ok(log[0].title === 'T5' && log[log.length - 1].title === 'T' + (CARD_LOG_MAX + 4), 'de oudste vallen weg, de nieuwste blijven');

const tekst = cardLogText([{ title: 'Geld', body: 'Je hebt € 50.' }, { text: 'Alleen tekst' }], 2);
ok(tekst.includes('Geld: Je hebt € 50.'), 'titel en body komen in de tekst');
ok(tekst.includes('Alleen tekst'), 'een kaart zonder titel gebruikt zijn tekst');
ok(cardLogText([], 3) === '', 'een leeg log geeft geen tekst');
ok(cardLogText([{ title: 'A' }, { title: 'B' }, { title: 'C' }], 2) === 'B\nC', 'het aantal nieuwste regels telt');

// bedrading: het log wordt gevuld bij het tonen en is via het pauzemenu te openen
const hud = fs.readFileSync(new URL('../game/js/hudcards.js', import.meta.url), 'utf8');
const pause = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../game/js/onboarding.js', import.meta.url), 'utf8');
ok(/addCardLog\(cardLog/.test(hud) && hud.includes('export function openCardLog'), 'hudcards vult en opent het tekstlog');
ok(pause.includes('data-card-log') && pause.includes('openCardLog()'), 'pauzemenu heeft een tekstlogknop');
ok(onboarding.includes('onClose: () => markSeen'), 'een les wordt pas bij sluiten als gezien opgeslagen');

console.log(fails ? `${fails} FAIL` : 'cardlog_test ok');
process.exit(fails ? 1 : 0);
