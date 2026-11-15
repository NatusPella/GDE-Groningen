// Ontdekking van een wijk (#925): er horen geen video's meer te verschijnen.
// De oude flyover is in #709 weggehaald; wat overblijft is de naamkaart met de
// Rikus-regel en de highlights. Deze test bewaakt dat er bij het ontdekken geen
// video- of filmlaag meer aan hangt en dat de kaart de enige vorm is.
//   node scripts/wijk_ontdekking_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../game/js/', import.meta.url);
const lees = (f) => fs.readFileSync(new URL(f, root), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de wijkkaart is de hele ontdekking: geen film of video', () => {
  const bron = lees('cinematics.js');
  const check = bron.slice(bron.indexOf('function checkWijk'), bron.indexOf('// The card\'s own area'));
  assert.match(check, /showWijkCard\(w, p\)/, 'de kaart gaat af');
  assert.ok(!/playCinematic|createElement\('video'\)|<video/.test(check), 'geen film of video in het ontdekkingspad');
  assert.match(bron, /#709\/#925: the old flyover is gone for good/);
});

t('nergens in het spel wordt nog een videolabel aangemaakt', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
    }
  };
  walk(fileURLToPath(new URL('.', root)));
  const hits = files.filter((f) => /createElement\((['"])video\1\)|<video\b/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(hits, [], 'geen videospelers in de spellcode');
});

t('er is geen instelling meer voor een filmpje bij een nieuwe wijk', () => {
  const settings = lees('settings.js');
  const menu = lees('pausemenu.js');
  assert.ok(!/wijk(film|video)|filmPje.*wijk/i.test(settings), 'geen wijkfilmpje in de instellingen');
  assert.ok(!/wijk(film|video)|filmPje.*wijk/i.test(menu), 'geen wijkfilmpje in het menu');
});

console.log(`district_discovery_test: ${n}/${n} ok`);
