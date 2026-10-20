// Samen spelen (#95): cutscenes samen bekijken (coopcut.js): de scène gaat in stukjes naar de gasten en komt heel aan.
import assert from 'node:assert/strict';
import { cutPakket, cutStukken, cutEinde, nieuwCutVerzamelaar, leesCutPakket, cutHostStart, cutHostEnd, cutHostId, cutHostTik, cutGastTempo, cutGastTik, leesCutTijd, cutTijd, CUT_CHUNK } from '../game/js/coopcut.js';
import { openingActs, END_CARD } from '../game/js/cutscenes.js';
import { encodeJson, decodeJson, T } from '../game/js/net/codec.js';
import { Reliable } from '../game/js/net/protocol.js';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const lines = [];
for (let i = 0; i < 40; i++) lines.push({ speaker: i % 2 ? 'Tessa' : 'Tammo', text: 'Dit is regel ' + i + ' van de opening, met een paar woorden erbij zodat het lang genoeg is.', at: 1 + i * 3, dur: 2.8, ...(i % 3 ? { voice: 'audio/voice/C00.1_' + i + '.ogg' } : {}) });
const acts = openingActs(lines);
ok(acts.length === 3, 'drie openingsacts');

for (const [i, act] of acts.entries()) {
  const p = cutPakket({ def: act.def, lines: act.lines, duration: act.duration, anchor: { x: 10.5, y: -4, facing: 1.2, z: 0 }, cine: { id: 'story-opening', kicker: 'Deel 1 · Zomer', title: 'Kop', cardFor: 3.2, onEnd() {} } });
  const stukken = cutStukken(i + 1, p);
  ok(stukken.length > 0, `act ${i}: past in stukjes (${stukken.length})`);
  // elk stuk past in een betrouwbaar bericht, en het gaat door de echte codec
  for (const s of stukken) {
    const bytes = encodeJson(T.EVENT, 1, 0, 0, s);
    ok(decodeJson(bytes).body.d === s.d, `act ${i} stuk ${s.i}: codec`);
    ok(s.d.length <= CUT_CHUNK, 'stuk niet te lang');
  }
  // door de Reliable-rij (volgorde en verlies): omgekeerde volgorde komt toch heel aan
  const v = nieuwCutVerzamelaar();
  let uit = null;
  for (const s of [...stukken].reverse()) { const r = v.voegToe(JSON.parse(JSON.stringify(s))); if (r) uit = r; }
  ok(uit && uit.id === i + 1 && uit.duration === act.duration, `act ${i}: compleet na alle stukjes`);
  ok(JSON.stringify(uit.def) === JSON.stringify(JSON.parse(JSON.stringify(act.def))), `act ${i}: de scène is gelijk`);
  ok(uit.lines.length === act.lines.length && uit.lines[0].text === act.lines[0].text, `act ${i}: de regels zijn gelijk`);
  ok(uit.anchor.x === 10.5 && uit.cine.id === 'story-opening' && uit.cine.cardFor === 3.2 && !('onEnd' in uit.cine), `act ${i}: anker en kaart`);
}

// de einde-kaart
{
  const stukken = cutStukken(9, cutPakket({ def: END_CARD, lines: [{ speaker: '', text: 'Einde', at: 1, dur: 3 }], duration: 6, anchor: { x: 0, y: 0, facing: 0, z: 0 }, cine: { id: 'end' } }));
  const v = nieuwCutVerzamelaar(); let uit = null; for (const s of stukken) uit = v.voegToe(s) || uit;
  ok(uit && uit.id === 9, 'einde-kaart komt heel aan');
}

// slechte stukken
{
  const v = nieuwCutVerzamelaar();
  ok(v.voegToe(null) === null && v.voegToe({ k: 'cut', id: 1, n: 99, i: 0, d: 'x' }) === null, 'te veel stukken');
  ok(v.voegToe({ k: 'cut', id: 1, n: 2, i: 5, d: 'x' }) === null, 'stuk buiten de reeks');
  ok(v.voegToe({ k: 'cut', id: 1, n: 1, i: 0, d: '{kapot' }) === null, 'kapotte JSON');
  ok(v.voegToe({ k: 'cut', id: 1, n: 1, i: 0, d: JSON.stringify({ def: {}, lines: [], duration: -1 }) }) === null, 'geen duur');
  ok(leesCutPakket({ def: {}, lines: new Array(500).fill({}), duration: 5 }, 1) === null, 'te veel regels');
  ok(cutStukken(1, { def: { x: 'a'.repeat(100000) } }).length === 0, 'te grote scène wordt niet gestuurd');
  // een nieuwe scène onderbreekt een halve
  const a = cutStukken(1, { def: { a: 'x'.repeat(2000) }, lines: [], duration: 3, anchor: null, cine: {} }), b = cutStukken(2, { def: { b: 1 }, lines: [], duration: 3, anchor: null, cine: {} });
  v.voegToe(a[0]); const r = v.voegToe(b[0]);
  ok(r && r.id === 2, 'een nieuwe scène vervangt een halve');
}

// de gastheer: start en einde bij alle gasten
{
  const sent = [];
  const w = { coopNet: { role: 'host', hub: { announce: (b) => { sent.push(b); return true; } } } };
  const id = cutHostId();
  ok(cutHostStart(w, id, { def: {}, lines: [], duration: 3, anchor: null, cine: {} }) && sent.every((s) => s.k === 'cut') && w.coopNet.cutNu === id, 'host stuurt de scène');
  ok(cutHostEnd(w, id, true) && sent[sent.length - 1].k === 'cutend' && sent[sent.length - 1].skip === true && w.coopNet.cutNu === null, 'host stuurt het einde (overgeslagen)');
  ok(!cutHostEnd(w, id, false), 'einde maar één keer');
  ok(!cutHostStart({ coopNet: { role: 'client' } }, 1, {}) && !cutHostStart({}, 1, {}), 'een gast of een los spel stuurt niets');
  ok(cutEinde(3, false).skip === false, 'gewoon einde');
}

// een rij van twaalf stukken past in de wachtrij van een gast (32)
{
  const r = new Reliable(); let verzonden = 0;
  const st = cutStukken(1, cutPakket({ def: acts[1].def, lines: acts[1].lines, duration: acts[1].duration, anchor: { x: 1, y: 1, facing: 0, z: 0 }, cine: { id: 'x' } }));
  for (const s of st) if (r.send(s, 0, () => { verzonden++; })) { /* in de rij */ }
  ok(verzonden === st.length && st.length < 32, `de rij van ${st.length} stukjes past in de wachtrij`);
}
// tempo: de gast loopt mee met de tijd van de gastheer
{
  const sent = [];
  const w = { coopNet: { role: 'host', hub: { announce: (b) => { sent.push(b); return true; } } } };
  const id = cutHostId(); cutHostStart(w, id, { def: {}, lines: [], duration: 3, anchor: null, cine: {} }); sent.length = 0;
  ok(cutHostTik(w, id, 1.0, 10000) && sent[0].k === 'cuttijd' && sent[0].t === 1 && sent[0].p === 0, 'host stuurt zijn tijd');
  ok(!cutHostTik(w, id, 1.2, 10200) && sent.length === 1, 'niet vaker dan elke halve seconde');
  ok(cutHostTik(w, id, 1.2, 10600) && sent[1].p === 1, 'staat zijn tijd stil (pauzemenu) dan staat dat erbij');
  ok(!cutHostTik(w, id + 1, 1, 99999), 'alleen voor de lopende scène');
  ok(leesCutTijd(cutTijd(4, 2.345, false)).t === 2.35 && leesCutTijd({ k: 'cuttijd', id: 1, t: -1 }) === null && leesCutTijd({ k: 'cuttijd', id: 1.5, t: 1 }) === null, 'tijdbericht lezen en controleren');
  const h = { t: 10, stil: false, at: 1000 };
  ok(cutGastTempo(h, 9.75, 1000).rate === 1, 'gelijk (de gast mikt een kwart seconde achter de gastheer): gewone snelheid');
  ok(cutGastTempo(h, 9.2, 1000).rate > 1.1 && cutGastTempo(h, 9.2, 1000).rate <= 1.6, 'achter: sneller');
  ok(cutGastTempo(h, 10.3, 1000).rate < 0.9 && cutGastTempo(h, 10.3, 1000).rate >= 0.6, 'voor: langzamer');
  ok(cutGastTempo(h, 10.75, 2000).rate === 1, 'de tijd van de gastheer loopt door sinds het bericht');
  ok(cutGastTempo(h, 8.5, 1000).zet === 9.75 && cutGastTempo(h, 5, 1000).zet === 9.75 && cutGastTempo(h, 16, 1000).zet === 9.75, 'te ver uit elkaar: een sprong');
  ok(cutGastTempo({ ...h, stil: true }, 10, 5000).rate === 0 && cutGastTempo(null, 3, 0).rate === 1, 'de gastheer staat stil / geen bericht');
  ok(cutGastTempo(h, 9.9, 1000, 0.05).rate > cutGastTempo(h, 9.9, 1000, 0).rate, 'reistijd van het bericht telt mee');
  const g = { coopNet: { session: { rtt: 0.04 } }, coopCutHost: { id: 3, t: 5, stil: false, at: 0 } }; const zet = [];
  ok(cutGastTik(g, 3, 4, { tempo: (r) => zet.push(['rate', r]), tijd: (t) => zet.push(['tijd', t]) }, 0) && zet[0][0] === 'rate' && zet[0][1] > 1, 'gast past zijn tempo aan');
  ok(cutGastTik(g, 4, 4, { tempo: () => {}, tijd: () => {} }, 0) === null, 'een ander nummer: niets');
}
console.log(`coopcut_test: ${n} ok`);
