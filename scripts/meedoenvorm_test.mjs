// Meedoen? als vraag met twee knoppen waar de toets in zit (#1001, ontwerpsysteem); puur plus de bedrading in de bron.
//   node scripts/meedoenvorm_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { uitnodigingVorm, uitnodigingTekst, MEEDOEN_KNOPPEN } from '../game/js/coopmeedoen.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const rd = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const vraag = uitnodigingVorm({ label: 'Bezorgen', rest: 10 }, 'Tammo');
ok(vraag.tekst === 'Meedoen met Bezorgen?' && vraag.knoppen.length === 2, 'een uitnodiging is een vraag met twee knoppen');
ok(vraag.knoppen.map((k) => k.toets).join() === 'j,n' && vraag.knoppen.map((k) => k.letter).join() === 'J,N', 'de knoppen sturen J en N, met de letter erin');
ok(vraag.knoppen.map((k) => k.label).join() === 'Ja,Nee', 'de knoppen zijn gewone woorden: Ja en Nee');
ok(vraag.tekst.split(/\s+/).length <= 4, 'de vraag is kort (geen tekstmuur)');
ok(uitnodigingVorm({ label: 'Bezorgen', start: true }, 'Tammo').knoppen.length === 0, 'een begonnen opdracht heeft niets te kiezen');
ok(/je doet mee/.test(uitnodigingVorm({ label: 'Bezorgen', verplicht: true }, 'Tammo').tekst) && uitnodigingVorm({ label: 'Bezorgen', verplicht: true }, 'Tammo').knoppen.length === 0, 'als het verhaal je nodig heeft is er geen keuze');
ok(uitnodigingVorm({ label: 'Spoiler', status: 'vooruit', rest: 20 }, 'Tammo').tekst === uitnodigingTekst({ label: 'Spoiler', status: 'vooruit', rest: 20 }, 'Tammo'), 'een status houdt zijn eigen zin');
ok(uitnodigingVorm(null) === null, 'zonder uitnodiging niets');
ok(MEEDOEN_KNOPPEN.every((k) => /^[a-z]$/.test(k.toets)), 'de toetsen zijn kleine letters, zoals inp.wasPressed ze kent');

const hud = rd('game/js/coophud.js');
ok(/ds-z-knop cp-meedoen-knop/.test(hud) && /ds-z-toets/.test(hud), 'coophud tekent een knop met een toetsplaatje erin');
ok(/sendKey\('keydown', k\.dataset\.k, 'touch'\); sendKey\('keyup', k\.dataset\.k, 'touch'\)/.test(hud), 'de knop stuurt keydown en keyup, nooit een los keydown');
const css = rd('game/js/samenspelen.css');
ok(/\.cp-meedoen \{ pointer-events: auto;/.test(css), 'de bon laat klikken toe (menu.css zet pointer-events uit)');
console.log(`meedoenvorm_test: ${n} controles ok`);
