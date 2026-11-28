// Regressietest voor de verhaalwerkpakketten WP3 (#1126, akte 2), WP4 (#1127, akte 3) en WP5 (#1128, akte 4): de beats uit de issues en uit de
// ruggengraat (docs/VERHAAL-ANALYSE-21-11.md hoofdstuk 7 en 15) staan in de verhaaldata. Zuiver node, zonder wereld of Electron; de matrix met
// wat gedaan is en wat ontbrak staat in docs/verhaal/WP-STAND-21-11.md. node scripts/verhaal_wp345_test.mjs
import fs from 'node:fs';
import { STEPS, WHY, CLUES } from '../game/js/storyarc.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const scene = new Map(script.scenes.map((s) => [s.id, s]));
const lines = (id) => (scene.get(id) ? scene.get(id).lines : []);
const text = (id) => lines(id).map((l) => l.speaker + ': ' + l.text).join('\n') + '\n' + ((scene.get(id) || {}).regie || []).join('\n');
const said = (id, who, re) => lines(id).some((l) => l.speaker === who && re.test(l.text));
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const maxRun = (id) => { let best = 0, run = 0, prev = ''; for (const l of lines(id)) { run = l.speaker === prev ? run + 1 : 1; prev = l.speaker; best = Math.max(best, run); } return best; };
const actScenes = (a) => script.scenes.filter((s) => s.act === a);
const jelleLines = (a) => actScenes(a).reduce((t, s) => t + s.lines.filter((l) => /^Jelle/.test(l.speaker)).length, 0);

// --- WP3 akte 2 (#1126) ---
ok(lines('M07.1')[0] && /^Jelle/.test(lines('M07.1')[0].speaker), 'WP3: M07.1 opent met Jelle zelf (hij belt over zijn vet), niet met Tessa die uitlegt');
ok(lines('M07.1').every((l) => words(l.text) <= 16) && maxRun('M07.1') <= 3, 'WP3: M07.1 is in korte beurten');
ok(lines('M08.3').length >= 12 && maxRun('M08.3') <= 3 && lines('M08.3').every((l) => words(l.text) <= 25), 'WP3: M08.3 (het recept van Oma) is in korte beurten met reacties, geen monoloog van meer dan 25 woorden');
ok(/prikbord/.test(text('M08.3')) && /Geesje/.test(text('M08.3')) && /Klaas/.test(text('M08.3')) && /Dijkstra/.test(text('M08.3')), 'WP3: Oma noemt de vijf vrienden en het prikbord, met Geesje, Klaas en Dijkstra als aanloop');
ok(/prikbord/.test(text('N8')) && /punaise/.test(text('N8')) && idx('N8') < idx('M08') && idx('N8') > idx('M05'), 'WP3: N8 laat het prikbord met de vijf namen zien (hoofdstuk 3, ruim voor M08 waar Oma de namen noemt)');
ok(/broodtrommel/.test(text('M11.3')) && /Getekend M/.test(text('M11.3')) && !actScenes(2).some((s) => /oefenbal/i.test(text(s.id))), 'WP3: M11.3 is een briefje van Mem, de oefenbal is weg uit akte 2');
ok(['O4', 'O5'].every((id) => lines(id).some((l) => l.speaker === 'Mem Terpstra' && l.channel === 'telefoon')), 'WP3: Mem krijgt een stem in twee telefoontjes (O4 en O5)');
ok(scene.get('O4').act === 2 && scene.get('O5').act === 2, 'WP3: de telefoontjes van Mem zijn overgangsscènes in akte 2');
ok(/koe/.test(text('N5')) && /melken/.test(text('N5')) && said('N5', 'Tessa', /erf/), 'WP3: N5 toont het thuis van Tessa (het erf, de koe, melken) en de verbazing van Tammo');
ok(said('M09.1', 'Tessa', /kippen|eieren/) && /Dat wist ik niet|pas nu/.test(text('M09.1') + text('N5')), 'WP3: M09.1 en N5 laten Tammo ontdekken dat Tessa boerendochter is');
ok(scene.get('K1') && said('K1', 'Geesje', /land/) && idx('K1') > idx('N5') && idx('K1') < idx('M10'), 'WP3: K1 opent het land achter de pastorie (Landbouw en de boerderij) met Geesje');
ok(said('M11.5', 'Tessa', /Melkweg/) && said('M11.6', 'Tessa', /Je kijkt naar mij/) && said('M11.6', 'Tessa', /Kijk naar de sterren/), 'WP3: de sterren (M11.5 en M11.6) hebben een duidelijke romantische reactie van Tessa');
ok(scene.get('K2') && said('K2', 'Tessa', /Ik zag je kijken/) && said('K2', 'Tammo', /al lang/) && idx('K2') > idx('M11') && idx('K2') < idx('M12'), 'WP3: K2 geeft de regel van Tammo dat hij het al lang wist, op de ochtend na de sterren');
ok(/Droomsequens/.test(text('T2')) && lines('T2').some((l) => /droomde over verkeer/.test(l.text)), 'WP3: de dagdroom in T2 staat als regie en tekst (de 3D-regie ervan is nog open, zie WP-STAND)');
ok(/recept/i.test(WHY.romp) && /vijf/.test(WHY.romp), 'WP3: WHY.romp kondigt het doel aan (het recept van Oma met vijf vrienden)');
ok(CLUES.some((c) => c.step === 'M08' && /1953/.test(c.text)), 'WP3: een clue legt het recept van 1953 vast');

// --- WP4 akte 3 (#1127) ---
ok(jelleLines(3) >= 20, 'WP4: Jelle is in akte 3 zelf aan het woord (minstens 20 regels)', jelleLines(3));
ok(['R3.0', 'M14.1', 'M15.5', 'O6'].every((id) => lines(id).some((l) => /^Jelle/.test(l.speaker))), 'WP4: Jelle legt zijn koopboek en plan zelf uit (radio, deurwaarder, kantoorwagen, bod)');
ok(/koopboek/.test(text('R3.0')) && !said('M12.1', 'Tessa', /Daarin staat welk plakje/), 'WP4: het koopboek wordt door Jelle uitgelegd, niet meer door Tessa');
ok(said('M12.1', 'Oma Trijntje', /Dijkstra/) && said('M11.8', 'Dokter Dijkstra', /Trijntje/), 'WP4: Dijkstra komt via Oma (M11.8 en M12.1)');
ok(said('M15.3', 'Roelfien', /Geert/) && idx('M15') < idx('M16'), 'WP4: Geert wordt eerst door Roelfien genoemd (M15.3), daarna pas zijn intro (M16.1)');
ok(said('M15.6', 'Daan', /Geert/), 'WP4: Daan landt met aanloop (Geert, de bar)');
ok(said('M15.5', 'Jelle Terpstra', /Tige tank/) && /limo|kantoor/i.test(scene.get('M15.5').title + text('M15.5')), 'WP4: het bedankbriefje van Jelle en zijn kantoor op wielen op de kermis (M15.5)');
ok(said('M16.1', 'Tessa', /Jaloers/) && said('M16.1', 'Geert', /nummer/), 'WP4: de jaloerse grap in M16.1 blijft als signaal van de boog');
ok(said('M16.5', 'Durk', /Veendam/) && said('M16.5', 'Durk', /koffer|limo/), 'WP4: het keerpunt M16.5 (Durk verklapt Veendam en de bal in de limo)');
ok(lines('A3.3').some((l) => l.speaker === 'Mem') && /Mem/.test(text('A3.3')), 'WP4: Mem schrijft Tessa in akte 3 (A3.3)');
ok(/pand/.test(text('A3.2')) && /havenkantoor/.test(text('A3.2')), 'WP4: Sjabbe noemt Bezit in akte 3 als appje (A3.2)');
ok(scene.get('K3') && said('K3', 'Sjabbe', /Jelle koopt, jullie beheren/) && idx('K3') > idx('M13') && idx('K3') < idx('M14'), 'WP4: K3 laat Sjabbe Bezit in eigen persoon introduceren, met het havenkantoor van Lammert als eerste pand');
ok(CLUES.some((c) => c.step === 'M13' && /havenkantoor/.test(c.text) && /beheren/.test(c.text)), 'WP4: een clue bij M13 legt het havenkantoor als eerste pand vast');
ok(/haven/.test(WHY.staart), 'WP4: WHY.staart noemt de haven');

// --- WP5 akte 4 (#1128) ---
ok(jelleLines(4) >= 12, 'WP5: Jelle is in akte 4 vaker te zien dan zeven regels', jelleLines(4));
ok(['R4.0', 'M17.3', 'M20.3', 'M21.2'].every((id) => lines(id).some((l) => /^Jelle/.test(l.speaker))), 'WP5: Jelle in beeld of aan de telefoon (R4.0, M17.3, M20.3, M21.2)');
ok(/Bourtange/.test(WHY.zuid) && /bal/.test(WHY.zuid) && /bewijs/.test(WHY.zuid) && /jury/.test(WHY.zuid), 'WP5: WHY.zuid noemt het doel (de bal terughalen in Bourtange), het bewijs en de jury');
ok(STEPS.filter((s) => s.part === 'zuid' && s.lead).every((s) => s.lead[1].length > 30), 'WP5: elke stap van akte 4 heeft een lead');
ok(lines('R4.0').some((l) => l.speaker === 'Rikus' && /chat/.test(l.text) && /Stadjers/.test(l.text)), 'WP5: Rikus zegt dat de stad twee Stadjers voor de dieven houdt (R4.0), de aanleiding voor het bewijs');
ok(said('M18.1', 'Tessa', /dieven/) && said('M26.2', 'Tessa', /logboek/), 'WP5: het bewijs heeft een aanleiding (M18.1) en een afloop (M26.2)');
ok(lines('M18.4').some((l) => l.speaker === 'Mem Terpstra' && l.channel === 'telefoon' && /Bourtange/.test(l.text)), 'WP5: de uitnodiging voor Bourtange is een telefoontje van Mem, geen stil appje (M18.4)');
ok(lines('M21.2').some((l) => l.speaker === 'Mem Terpstra' && l.channel === 'telefoon' && /Zuidhorn/.test(l.text)), 'WP5: de trein bij Zuidhorn is een telefoontje van Mem (M21.2)');
ok(lines('A4.1').some((l) => l.speaker === 'Mem' && /Nog vier dagen/.test(l.text)) && lines('O5').some((l) => l.speaker === 'Mem Terpstra'), 'WP5: de lijn van Mem is vooraf duidelijk (O5, A4.1)');
ok(said('M19.3', 'Berend Bos', /Vanavond/) && said('M19.3', 'Berend Bos', /notaris/) && said('M19.3', 'Tessa', /Berend/), 'WP5: de juryregel komt in beurten met Berend (M19.3)');
ok(said('M21.4', 'Geesje', /./) && said('M21.4', 'Kapitein Klaas', /./) && said('M21.4', 'Tammo', /niet goed/), 'WP5: M21.4 is een ruzie tussen twee vrienden (Geesje en Klaas) en Tammo faalt, geen rollenlijst');
ok(['V1', 'V2', 'V3'].every((id) => idx(id) > idx('M19') && idx(id) < idx('M20')) && lines('R4.0b').some((l) => /keeper/.test(l.text)), 'WP5: de voetbal-aanloop is een beat (Femke belt Rikus, V1 tot en met V3)');
ok(/dorpsteam/.test(text('B4')) && /Veendam/.test(text('B4')), 'WP5: een autogesprek over Veendam en het dorpsteam (B4)');
ok(!/zaterdag/i.test(text('M17.1')) && said('O7', 'Tammo', /zaterdag/i), 'WP5: M17.1 wordt niet meer onderbroken door Even over zaterdag (dat staat in O7)');

console.log(`verhaal_wp345_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
