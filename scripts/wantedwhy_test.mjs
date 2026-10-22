// De aanleiding van een ster op de kaart (#391): elke weg naar een ster zonder eigen kaart noemt zijn oorzaak, in hooguit 14 woorden.
//   node scripts/wantedwhy_test.mjs
import { WANTED_WHY, WANTED_OWN_CARD, wantedWhyText, noteWantedWhy } from '../game/js/wantedwhy.js';
import { reportCrime } from '../game/js/crime.js';
import { wordCount, WORD_BUDGET } from '../game/js/hudtext.js';
import { reportImpact } from '../game/js/vehicleimpact.js';
let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

for (const [k, text] of Object.entries(WANTED_WHY)) {
  ok(wordCount(text) <= WORD_BUDGET.cardBody, `budget: ${k} (${wordCount(text)} woorden)`);
  ok(/[a-z]/.test(text) && !/[A-Z]{4,}/.test(text), `taal: ${k} is gewone Nederlandse zin`);
  ok(!/\b(sneeuw|winter)\b/i.test(text), `zomer: ${k}`);
}
ok(wantedWhyText('bestaat-niet') === null, 'onbekende soort geeft niets');

const mk = (extra = {}) => { const msgs = []; return { msgs, w: { time: 100, wanted: 0, vehicles: [], pedestrians: [], player: { x: 0, y: 0 }, stats: {}, addMessage: (t, s, o) => msgs.push([t, o && o.kind, o && o.key]), ...extra } }; };

// een gezien misdrijf: een ster met zijn oorzaak
{
  const { w, msgs } = mk();
  reportCrime(w, 'pedHit', { seen: true });
  ok(w.wanted === 0 && msgs.length === 0, 'een eerste aanrijding in zicht van de politie is nog geen ster (de hitte)');
  reportCrime(w, 'pedHit', { seen: true });
  ok(w.wanted === 1, 'twee aanrijdingen in zicht: een ster');
  ok(msgs.length === 1 && msgs[0][0] === WANTED_WHY.pedHit && msgs[0][1] === 'politie', 'de kaart noemt de aanrijding', JSON.stringify(msgs));
}
// ongezien, maar de hitte loopt op: te veel overlast
{
  const { w, msgs } = mk();
  for (let i = 0; i < 6 && !w.wanted; i++) reportCrime(w, 'pedKill', { seen: false });
  ok(w.wanted === 1 && msgs.length === 1 && msgs[0][0] === WANTED_WHY.overlast, 'ongezien opgebouwd: overlast', JSON.stringify(msgs));
}
// een geldwagen heeft een eigen kaart: geen tweede regel
{
  const { w, msgs } = mk();
  reportCrime(w, 'cashVanBlown', { seen: true });
  ok(w.wanted === 1 && msgs.length === 0 && WANTED_OWN_CARD.has('cashVanBlown'), 'geldwagen: een ster, de eigen kaart doet het woord');
}
ok(noteWantedWhy({}, 'copAanval') === null, 'zonder addMessage geen fout');

// de botsing onthoudt waartegen: alleen een politiewagen telt als 'politiewagen geraakt'
{
  const cop = { isPolice: true };
  const w = { time: 5, particles: [] };
  reportImpact(w, 1, 2, 10, true, cop);
  ok(w.lastImpact && w.lastImpact.other === cop, 'lastImpact kent de andere auto');
  reportImpact(w, 1, 2, 10, true);
  ok(w.lastImpact.other === null, 'een paal of muur: geen andere auto');
  const w2 = { time: 5, particles: [] };
  reportImpact(w2, 1, 2, 10, false, cop);
  ok(!w2.lastImpact, 'zonder speler geen lastImpact');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
