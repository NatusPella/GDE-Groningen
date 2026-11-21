// #1011: het wachtscherm "Verbinding weg" is een .cp-overlay (coophold.js via coopoverlay.js), geen .coop-hold. De regel die de Enter-toets
// ("Kies") op aanraking verbergt moest daarom ook de .cp-overlay raken; in een echt venster met touch=1 stond "Opnieuw verbinden Kies" nog op de knop.
//   node scripts/coop/wachtscherm_touch_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bron = (p) => fs.readFileSync(new URL('../../game/js/' + p, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; };

t('het wachtscherm hangt aan een .cp-overlay', () => {
  assert.match(bron('coopoverlay.js'), /class="gm cp-overlay"/);
  assert.match(bron('coophold.js'), /mountOverlay\(/);
  assert.doesNotMatch(bron('coophold.js'), /coop-hold/, 'coophold.js gebruikt de klasse .coop-hold niet: de CSS moet de .cp-overlay raken');
});

t('de hoofdknop van het wachtscherm heeft een toetshint, en die gaat weg op aanraking', () => {
  assert.match(bron('lobbyui.js'), /class="coop-toets">\$\{keyTextHtml\('\{ENTER\}'\)\}/);
  const css = bron('samenspelen.css');
  const regel = css.split(/\r?\n/).find((l) => /^html\.touch-device\s+:is\(.*\)\s+\.coop-toets\s*\{\s*display:\s*none/.test(l));
  assert.ok(regel, 'er is een regel die .coop-toets op aanraking verbergt');
  assert.match(regel, /\.cp-overlay/, 'die regel raakt het wachtscherm (.cp-overlay)');
  assert.match(regel, /#pause-menu \.pm-samen/, 'en het Samen-paneel in het pauzemenu');
});

console.log(`wachtscherm_touch_test: ${n} tests ok`);
