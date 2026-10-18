// Radionieuws-ticker (nieuwsticker.js, #202). Puur, geen browser.
//   node scripts/nieuwsticker_test.mjs
import * as N from '../game/js/nieuwsticker.js';
import { KINDS, cardPrio, P3 } from '../game/js/hudbus.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const t = N.createTicker(7);
check('onbekende soort wordt genegeerd', N.meld(t, 'ufo', {}, 0) === null);
const a = N.meld(t, 'overval', { regio: 'groningen', plaats: 'Haren' }, 100);
check('eerste melding komt door', !!a && a.tekst.includes('Haren') && !a.tekst.includes('{plaats}'));
check('lezer past bij de regio', N.LEZERS.groningen.includes(a.lezer));
check('ticker-tekst heeft bron en lezer', N.tickerTekst(a).startsWith(`${N.BRON} · ${a.lezer}: `));
check('zelfde soort direct erna: cooldown', N.meld(t, 'overval', {}, 110) === null);
check('andere lage prio direct erna: pauze', N.meld(t, 'kermis', {}, 120) === null);
const hoog = N.meld(t, 'achtervolging', { regio: 'friesland', plaats: 'Leeuwarden' }, 120);
check('hoge prio breekt de pauze door', !!hoog && N.LEZERS.friesland.includes(hoog.lezer));
check('wachtrij sorteert hoge prio eerst', t.queue[0].soort === 'achtervolging');
check('onbekende regio valt terug op overig', N.LEZERS.overig.includes(N.meld(N.createTicker(1), 'brug', { regio: 'mars' }, 0).lezer));

// ticker toont één regel tegelijk en laat hem verlopen
const cur = N.tikTicker(t, 121);
check('tik pakt de hoogste prio', cur.soort === 'achtervolging');
check('regel blijft staan tot hij verloopt', N.tikTicker(t, 121 + N.LIMIETEN.levensduur - 1) === cur);
const after = N.tikTicker(t, 121 + N.LIMIETEN.levensduur + 0.1);
check('daarna de volgende uit de wachtrij', after && after.soort === 'overval');
check('en daarna leeg', N.tikTicker(t, 1e6) === null);

// dichtheid: nooit meer dan het plafond per venster
const d = N.createTicker(3);
let toegelaten = 0;
const soorten = Object.keys(N.SOORTEN);
for (let s = 0; s < 300; s += 5) if (N.meld(d, soorten[(s / 5) % soorten.length], { regio: 'groningen', plaats: 'X' }, s)) toegelaten++;
check('plafond per venster gehaald niet', (() => {
  const times = d.times; return times.length <= N.LIMIETEN.maxPerVenster;
})(), JSON.stringify(d.times));
check('niet alles komt door bij dichte stroom', toegelaten <= N.LIMIETEN.maxPerVenster && toegelaten >= 1, toegelaten);
const later = N.meld(d, 'brug', {}, 1000);
check('later is er weer ruimte', !!later);
check('wachtrij begrensd', d.queue.length <= N.LIMIETEN.wachtrij);

// herhaling
const r = N.createTicker(5);
const gezien = new Set();
for (let i = 0; i < 6; i++) { const it = N.meld(r, 'kermis', { plaats: 'Y' }, i * 1000); if (it) gezien.add(it.tekst); }
check('regels wisselen af', gezien.size >= 2, gezien.size);

// inhoud
for (const soort of Object.keys(N.SOORTEN)) {
  const x = N.meld(N.createTicker(9), soort, { regio: 'drenthe', plaats: 'Assen' }, 0);
  check(`${soort}: tekst gevuld, plaats ingevuld`, x && x.tekst.length > 20 && x.tekst.includes('Assen'));
  check(`${soort}: geen leed of winter`, !/dood|dode|bloed|gewond geraakt|slachtoffer|sneeuw|winter|ijs\b/i.test(x.tekst), x.tekst);
  check(`${soort}: geen echte merken`, !/Shell|Albert Heijn|Jumbo|NS\b|Gasunie|NAM\b/.test(x.tekst));
}
check('overval: geen gewonde', /geen|niemand|bescheiden|schrik|zakgeld|lichter|streek/i.test(N.meld(N.createTicker(2), 'overval', {}, 0).tekst));
check('plaats wordt schoongemaakt', !/[<>]/.test(N.meld(N.createTicker(2), 'brug', { plaats: '<b>Hack</b>' }, 0).tekst));
check('lange plaats afgekapt', N.meld(N.createTicker(2), 'brug', { plaats: 'x'.repeat(500) }, 0).plaats.length === 40);

// scroll
check('scrollsnelheid leesbaar', (() => { const v = N.scrollSnelheid(a); return v >= 6 && v < 40; })());

// hudbus
check('hud-soort bestaat en is laagste rang', !!KINDS[N.HUD_SOORT] && cardPrio(N.HUD_SOORT) === P3);

// deterministisch
const x1 = N.meld(N.createTicker(11), 'overval', { regio: 'groningen', plaats: 'Z' }, 0), x2 = N.meld(N.createTicker(11), 'overval', { regio: 'groningen', plaats: 'Z' }, 0);
check('zelfde seed geeft dezelfde regel', x1.tekst === x2.tekst && x1.lezer === x2.lezer);

console.log(bad ? `${bad} van ${n} mislukt` : `nieuwsticker_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
