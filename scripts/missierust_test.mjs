// Rust tijdens een missie en een leesbare eindkaart (23-11, akte 1 op eindniveau, beelden M01-M06):
//   - zolang er een missie loopt, wacht elke melding die er niet bij hoort (een tip over de voetbalclub naast de doelbalk van M01);
//     gevaar, politie, wanted, missie- en bijbaanmeldingen gaan door, en een kaart die zelf bij de missie hoort (spec.missie) ook;
//   - onder de eindkaart hoogstens drie kernwaarden (geen rij van zeven chips), op papier, links van de overslaanhint;
//   - geen ondertitel tegelijk met de eindkaart (de loketbediende praatte er onder door).
//   node scripts/missierust_test.mjs
import fs from 'node:fs';
import { createNoticeQueue, registerNoticeHold, unregisterNoticeHold, noticeHeldBy, ignoreFor, MISSIE_HOLD, KINDS } from '../game/js/notifyqueue.js';
import { kernCijfers, KERN_MAX } from '../game/js/missionstats.js';
import { hiddenSubtitles } from '../game/js/subtitlegate.js';

let bad = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

// 1. de missiehold
let actief = true;
registerNoticeHold(MISSIE_HOLD, () => actief);
const houdt = (kind, extra = []) => noticeHeldBy(ignoreFor(kind, extra)).includes(MISSIE_HOLD);
for (const k of ['tip', 'hint', 'achievement', 'phone', 'discovery', 'radio']) ok(houdt(k), `tijdens een missie wacht ${k}`);
for (const k of ['danger', 'police', 'wanted', 'mission', 'sidejob']) ok(!houdt(k), `tijdens een missie gaat ${k} door`);
ok(!houdt('tip', [MISSIE_HOLD]), 'een kaart van de missie zelf (spec.missie) gaat door');
actief = false;
ok(!houdt('tip'), 'zonder missie wacht een tip niet');
unregisterNoticeHold(MISSIE_HOLD);
ok(Object.keys(KINDS).length > 10, 'de soorten van de wachtrij');
void createNoticeQueue;

// 2. de eindkaart: hoogstens drie kernwaarden, in volgorde van belang
const zeven = [['Tijd', '2:31'], ['Verwondingen', '0%'], ['Inschrijfgeld', '-€150'], ['Medaille', 'goud'], ['Oordeel', 'Kon minder.'], ['Formulieren', '2'], ['Verlies', 'geen']];
const kern = kernCijfers(zeven);
ok(kern.length === KERN_MAX && KERN_MAX === 3, 'hoogstens drie cijfers onder de eindkaart', kern.length);
ok(kern[0][0] === 'Medaille' && kern[1][0] === 'Tijd' && kern[2][0] === 'Verlies', 'de belangrijkste eerst (medaille, tijd, verlies)', JSON.stringify(kern));
ok(JSON.stringify(kernCijfers([['Tijd', '1:00']])) === JSON.stringify([['Tijd', '1:00']]) && kernCijfers(null).length === 0, 'kort blijft kort');
const cine = fs.readFileSync(new URL('../game/js/cinematics.js', import.meta.url), 'utf8');
ok(/const toon = moment \? kernCijfers\(stats\) : stats;/.test(cine), 'cinematics.js toont onder de grote kaart alleen de kernwaarden');
const css = fs.readFileSync(new URL('../game/js/bigmoment.css', import.meta.url), 'utf8');
ok(/bm-vervangen \.cb-col \{[^}]*max-width: 56%/.test(css), 'de cijfers blijven links, weg van de overslaanhint rechtsonder');
ok(/bm-vervangen \.cb-stats b \{[^}]*font-size: 30px/.test(css), 'de waarden zijn groot genoeg voor 1080p');

// 3. geen ondertitel tegelijk met de eindkaart
const hold = fs.readFileSync(new URL('../game/js/overlayhold.js', import.meta.url), 'utf8');
ok(/classList\.contains\('bm-eindkaart'\)/.test(hold) && /hiddenSubtitles\(zichtbaar, schermOpen\(document\) \|\| laadt \|\| eindkaart\)/.test(hold), 'de eindkaart verbergt de ondertitel');
ok(hiddenSubtitles(['story-talk'], true).has('story-talk'), 'een open kaart verbergt elke ondertitel');

// 4. de bronnen die bij de missie horen zijn gemarkeerd, en missions.js registreert de hold
const regel = fs.readFileSync(new URL('../game/js/regelkaart.js', import.meta.url), 'utf8');
ok((regel.match(/kind: 'tip', missie: true/g) || []).length === 2, 'de regelkaart hoort bij de missie');
const mis = fs.readFileSync(new URL('../game/js/missions.js', import.meta.url), 'utf8');
ok(/registerNoticeHold\(MISSIE_HOLD, isMissionActive\)/.test(mis), 'missions.js houdt de meldingen vast zolang een missie loopt');

// 5. het doelicoon in de wereld hangt dichtbij lager, zodat het niet half buiten beeld staat (M02: de gele driehoek aan de bovenrand)
const { iconY, ICON_Y, ICON_Y_NEAR, ICON_NEAR_M } = await import('../game/js/markerlook.js');
ok(iconY(3) < 3.5 && iconY(3) >= ICON_Y_NEAR, 'vlakbij hangt het icoon rond 3 m', iconY(3));
ok(iconY(ICON_NEAR_M + 1) === ICON_Y && iconY(200) === ICON_Y, 'verder weg op de oude hoogte');
ok(iconY(5) < iconY(15) && iconY(15) < iconY(21), 'en stijgt geleidelijk mee');
ok(/wm\.top\.position\.y = iconY\(d\)/.test(fs.readFileSync(new URL('../game/js/worldmarker3d.js', import.meta.url), 'utf8')), 'worldmarker3d.js gebruikt de hoogte per afstand');

console.log(bad ? `missierust_test: ${bad} van ${n} fout` : `missierust_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
