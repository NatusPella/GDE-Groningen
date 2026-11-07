// Wereldpauze tijdens een scène (#729). De regie zet pause:true bij bijna elke scène,
// maar dat moet de speler en de wereld ook echt stilzetten: world.uiPaused rekent
// main.js mee in world.paused, en updateGameplay (met world.time en player.update)
// draait alleen als de wereld niet gepauzeerd is. Deze test bewaakt die keten in de
// bron, en de nieuwe eigenaar in cinematics.js die de pauze ook op paden zonder
// updatePhone (duif/heli) zet en de vorige stand terugzet.
//   node scripts/cine_pause_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bron = fs.readFileSync(path.join(ROOT, 'game/js/cinematics.js'), 'utf8');
const main = fs.readFileSync(path.join(ROOT, 'game/js/main.js'), 'utf8');
const phone = fs.readFileSync(path.join(ROOT, 'game/js/phone.js'), 'utf8');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const blok = (text, van, tot) => { const i = text.indexOf(van); if (i < 0) return ''; const j = text.indexOf(tot, i); return text.slice(i, j > i ? j : i + 1200); };

// 1. de scène zegt of hij pauzeert
ok(/export function cinematicPausesGameplay\(\) \{\s*return !!\(active && active\.pause\);/.test(bron), 'cinematicPausesGameplay leest pause van de scène');
ok(/pause: false, timeScale: 1,/.test(bron), 'het standaardgedrag is niet pauzeren (een losse kaart of filmpje over de live wereld)');

// 2. de eigenaar in cinematics: pauze aan bij begin, vorige stand terug bij het einde
const on = blok(bron, 'function pauseOn() {', 'function pauseOff()');
const off = blok(bron, 'function pauseOff() {', 'export function getCinemaCamMode');
ok(/world\.uiPaused = true/.test(on) && /world\.cinematicPause = true/.test(on), 'pauseOn zet world.uiPaused (en de eigen vlag)');
ok(/pausePrevUi = !!world\.uiPaused/.test(on), 'de vorige stand wordt bewaard');
ok(/world\.uiPaused = pausePrevUi/.test(off) && /world\.cinematicPause = false/.test(off), 'pauseOff zet de vorige stand terug');
const begin = blok(bron, 'function begin(spec) {', 'function finish(');
ok(/attachVoices\(active\);\s*if \(active\.pause\) pauseOn\(\);/.test(begin), 'begin zet de pauze meteen als de scène dat vraagt');
const finish = blok(bron, 'function finish(skipped, replaced = false) {', 'function updateSkipHold');
ok(/const a = active;\s*active = null;\s*pauseOff\(\);/.test(finish), 'finish haalt de pauze weg, ook bij overslaan of vervangen');

// 3. main.js laat world.paused van die vlag afhangen en slaat updateGameplay dan over
ok(/world\.paused = isMapOpen\(\) \|\| isPauseMenuOpen\(\) \|\| isShopOpen\(\) \|\| !!world\.uiPaused \|\| !!world\.coopHold;/.test(main), 'main rekent world.uiPaused mee in world.paused');
ok(/if \(!world\.paused\) for \(let r = 0; r < reps; r\+\+\) updateGameplay\(gameDt\);/.test(main), 'updateGameplay draait alleen als de wereld niet gepauzeerd is');
const spel = blok(main, 'function updateGameplay(dt) {', '\n  }');
ok(/world\.time \+= dt;/.test(spel), 'de wereldklok loopt in updateGameplay (dus niet tijdens de scène)');
ok(/player\.update\(dt, world\)/.test(spel), 'de speler bestuurt in updateGameplay (dus niet tijdens de scène)');

// 4. phone.js koppelt dezelfde vlag elke frame aan de scène (bestaand pad)
const rp = blok(phone, 'function refreshPause() {', 'let phoneWasOpen');
ok(/const hard = cinematicPausesGameplay\(\);/.test(rp), 'refreshPause leest cinematicPausesGameplay');
ok(/world\.uiPaused = hard \|\|/.test(rp), 'en zet world.uiPaused daarop');

console.log(fails ? `cine_pause_test: ${fails} van ${n} mislukt` : `cine_pause_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
