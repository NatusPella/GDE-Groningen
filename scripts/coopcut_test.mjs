// Samen spelen (#95): cutscenes samen bekijken (coopcut.js): de scène gaat in stukjes naar de gasten en komt heel aan.
import './node3d.mjs'; // three uit de vendor-cache, zodat de test ook de echte gastheer (cutscenehost.js) kan aanroepen
import assert from 'node:assert/strict';
import { gastCine, cutPakket, cutPakketMaat, cutStukken, cutEinde, nieuwCutVerzamelaar, leesCutPakket, cutHostStart, cutHostEnd, cutHostId, cutHostTik, cutGastTempo, cutGastTik, leesCutTijd, cutTijd, cutsceneScene, cutsceneVerdeling, acteurRol, cutsceneSpeelt, cutsceneKlaar, cutGastBezet, cutGastWacht, cutGastWachtTik, cutGastStop, CUT_HOLD, CUT_CHUNK, CUT_MAX_CHARS } from '../game/js/coopcut.js';
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

// (#715) een te groot scenepakket valt niet stil weg: de maat is apart te vragen en de gastheer meldt het in zijn spoor
{
  const maat = cutPakketMaat(cutPakket({ def: { id: 'x' }, lines: [], duration: 3, anchor: null, cine: { id: 'x' } }));
  ok(maat.past && maat.tekens > 0 && maat.tekens < maat.max, 'een gewone scène past');
  const groot = cutPakketMaat({ def: { x: 'a'.repeat(CUT_MAX_CHARS) } });
  ok(!groot.past && groot.tekens > CUT_MAX_CHARS, 'te groot is te meten');
  ok(cutPakketMaat(new Proxy({}, { get() { throw new Error('kapot'); } })).past === false, 'een pakket dat niet te serialiseren is telt als te groot');
  // de gastheer: geen stukjes, geen berichten, wel een regel in het spoor (en één waarschuwing)
  const sent = [];
  const w = { coopNet: { role: 'host', hub: { announce: (b) => { sent.push(b); return true; } } }, coopCutSpoor: [] };
  const id = cutHostId();
  ok(cutHostStart(w, id, { def: { x: 'a'.repeat(CUT_MAX_CHARS) }, lines: [], duration: 3, anchor: null, cine: {} }) === false, 'een te grote scène begint niet bij de gasten');
  ok(sent.length === 0, 'er gaat niets de deur uit');
  ok(w.coopCutSpoor.some((r) => r.includes('host-te-groot')), 'het spoor noemt de te grote scène');
  ok(w.coopCutGrootGemeld === true, 'de waarschuwing komt één keer');
  ok(cutHostStart(w, id + 1, { def: { x: 'a'.repeat(CUT_MAX_CHARS) }, lines: [], duration: 3, anchor: null, cine: {} }) === false && w.coopCutSpoor.filter((r) => r.includes('host-te-groot')).length === 2, 'elke te grote scène wordt gemeld');
}
// (#715) de pakketmaat van de scenes die er nu zijn: een scène die niet past zou bij een gast stil wegvallen
{
  const maten = [];
  for (const [i, act] of acts.entries()) {
    const p = cutPakket({ def: act.def, lines: act.lines, duration: act.duration, anchor: { x: 10.5, y: -4, facing: 1.2, z: 0 }, cine: { id: 'story-opening', kicker: 'Deel 1 · Zomer', title: 'Kop', cardFor: 3.2 } });
    const m = cutPakketMaat(p);
    maten.push([i + 1, m.tekens]);
    ok(m.past, `openingsact ${i + 1} past in het net (${m.tekens} van ${m.max} tekens)`);
  }
  const einde = cutPakketMaat(cutPakket({ def: END_CARD, lines: [{ speaker: '', text: 'Einde', at: 1, dur: 3 }], duration: 6, anchor: { x: 0, y: 0, facing: 0, z: 0 }, cine: { id: 'end' } }));
  ok(einde.past, `de einde-kaart past in het net (${einde.tekens} tekens)`);
  console.log(`coopcut_test: pakketmaten opening ${maten.map(([i, n]) => i + '=' + n).join(' ')} tekens, max ${CUT_MAX_CHARS}`);
}

// (#711) own, clue, card en de opname van de scène gaan mee in het pakket: de gast hoort dezelfde stem en houdt
// dezelfde ondertiteltijden (cinematics.js zocht anders in de 'lines'-bank en schoof at/dur op, waarna de gastheer hem afknipte)
{
  const { attachVoices } = await import('../game/js/cinematics.js');
  const lines = [
    { speaker: 'Tammo', text: 'Deze regel speelt de scène zelf af.', at: 1, dur: 2.5, own: true, voice: 'https://example.invalid/audio/voicelines/story/a.ogg' },
    { speaker: 'Tessa', text: 'Deze regel hoort bij de scène.', at: 4, dur: 3, own: true, clue: true, card: 'Tessa' },
  ];
  const p = cutPakket({ def: { id: 'mission' }, lines, duration: 8, anchor: null, cine: { id: 'mission-scene' }, voices: [null, { src: 'https://example.invalid/audio/voicelines/story/b.ogg', dur: 2 }] });
  const v = nieuwCutVerzamelaar(); let uit = null; for (const s of cutStukken(31, p)) uit = v.voegToe(s) || uit;
  ok(uit && uit.lines.length === 2, 'de regels komen heel aan');
  ok(uit.lines[0].own === true && uit.lines[1].own === true, 'own komt mee (de gast speelt de stemmen niet zelf na)');
  ok(uit.lines[0].voice === lines[0].voice, 'de eigen opname komt mee');
  ok(uit.lines[1].voice === 'https://example.invalid/audio/voicelines/story/b.ogg', 'de opname uit de hulplijst van de scène komt mee');
  ok(uit.lines[1].clue === true && uit.lines[1].card === 'Tessa', 'clue en de naamkaart komen mee');
  // de voice-resolver: met own of een eigen opname zoekt hij niets op, dus de tijden en de duur blijven staan
  const a = { lines: uit.lines, duration: uit.duration };
  attachVoices(a);
  ok(a.lines[0].at === 1 && a.lines[0].dur === 2.5 && a.lines[1].at === 4 && a.lines[1].dur === 3, 'geen verschoven ondertiteltijden bij de gast');
  ok(a.duration === 8, 'de scèneduur blijft gelijk: de gastheer knipt de gast niet meer af');
  // de oude situatie (zonder own en zonder opname) is precies wat attachVoices wél mag bijwerken
  const kaal = { lines: [{ speaker: 'Tammo', text: 'Een regel zonder opname.', at: 1, dur: 2 }], duration: 5 };
  attachVoices(kaal);
  ok(kaal.lines[0].at === 1 && kaal.lines[0].dur === 2, 'een regel zonder eigen stem houdt zijn leestijd als er geen opname is');
}

// (#714) een gast in zijn eigen menu, kaart, winkel, telefoon of minigame mist de scène niet: de kopie wacht tot hij vrij is
{
  ok(cutGastBezet({ paused: true }) && cutGastBezet({ uiPaused: true }), 'een eigen pauzemenu of kaart: bezet');
  ok(cutGastBezet({ activityGame: 'padel' }) && cutGastBezet({ padelGame: {} }) && cutGastBezet({ pigeonMode: true }), 'minigame of duif: bezet');
  ok(cutGastBezet({ coopHold: true }), 'het wachtscherm van samen spelen: bezet');
  ok(!cutGastBezet({}) && !cutGastBezet(null), 'de open wereld: vrij');
  // de wachtrij: de scène begint pas als de gast vrij is; de gastheer kan hem intussen voorbij zijn
  const gespeeld = [];
  const w = { paused: true, coopCutSpoor: [] };
  const p = { id: 7, def: 'x', lines: [], duration: 3 };
  ok(cutGastWacht(w, p) && w.coopCutWacht.length === 1, 'de scène gaat in de wachtrij');
  ok(!cutGastWachtTik(w, (ww, pp) => gespeeld.push([ww, pp.id])), 'zolang de gast bezet is begint hij niet');
  ok(gespeeld.length === 0, 'nog niets gespeeld');
  w.paused = false;
  ok(cutGastWachtTik(w, (ww, pp) => gespeeld.push([ww, pp.id])) && gespeeld.length === 1 && gespeeld[0][1] === 7, 'vrij: de scène begint');
  ok(!w.coopCutWacht && !cutGastWachtTik(w, () => gespeeld.push('x')), 'de wachtrij is leeg');
  // de gastheer is al klaar: de wachtende kopie vervalt
  const w2 = { paused: true, coopCutSpoor: [], coopCutWacht: [p, { id: 8 }] };
  const stop = cutGastStop(w2, 7, false);
  ok(w2.coopCutWacht.length === 1 && w2.coopCutWacht[0].id === 8, 'het einde ruimt alleen de eigen wachtende scène op');
  ok((await stop) === false, 'een wachtende scène was niet bezig, dus er valt niets te stoppen');
  ok(w2.coopCutSpoor.some((r) => r.includes('gast-einde-bericht')), 'het spoor meldt het einde');
  // een nieuwere scène verdringt een oudere wachtende (hij heeft die toch gemist)
  const w3 = { paused: true, coopCutSpoor: [] };
  for (let i = 1; i <= 6; i++) cutGastWacht(w3, { id: i });
  ok(w3.coopCutWacht.length === 4 && w3.coopCutWacht[0].id === 3, 'hooguit vier wachtende scènes');
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
  ok(cutGastTempo(h, 10.3, 1000).rate < 0.9 && cutGastTempo(h, 10.3, 1000).rate > 0 && cutGastTempo(h, 10.6, 1000).rate === 0, 'voor: langzamer, ver voor: stil');
  ok(cutGastTempo(h, 9.95, 1200).rate === 1 && cutGastTempo(h, 10.1, 6000).rate === 1 && cutGastTempo(h, 10.1, 60000).rate === 1, 'de tijd van de gastheer loopt maximaal 0,35 s door sinds zijn bericht (een gastheer die hapert, telt zelf niet door)');
  ok(cutGastTempo(h, 8.5, 1000).zet === 9.75 && cutGastTempo(h, 5, 1000).zet === 9.75 && cutGastTempo(h, 16, 1000).zet === 9.75, 'te ver uit elkaar: een sprong');
  ok(cutGastTempo({ ...h, stil: true }, 10, 5000).rate === 0 && cutGastTempo(null, 3, 0).rate === 1, 'de gastheer staat stil / geen bericht');
  ok(cutGastTempo(h, 9.9, 1000, 0.05).rate > cutGastTempo(h, 9.9, 1000, 0).rate, 'reistijd van het bericht telt mee');
  const g = { coopNet: { session: { rtt: 0.04 } }, coopCutHost: { id: 3, t: 5, stil: false, at: 0 } }; const zet = [];
  ok(cutGastTik(g, 3, 4, { tempo: (r) => zet.push(['rate', r]), tijd: (t) => zet.push(['tijd', t]) }, 0) && zet[0][0] === 'rate' && zet[0][1] > 1, 'gast past zijn tempo aan');
  ok(cutGastTik(g, 4, 4, { tempo: () => {}, tijd: () => {} }, 0) === null, 'een ander nummer: niets');
}
{ // een gast kan zijn eigen weergave overslaan; wat de gastheer overslaat stopt het bij iedereen (#434)
  const klaar = () => {};
  const c = gastCine({ id: 7, cine: { priority: 4, skippable: false, id: 'x' } }, klaar);
  ok(c.skippable === true && c.cutId === 7 && c.onEnd === klaar && c.id === 'x', 'een gast mag zijn eigen filmpje overslaan');
  ok(gastCine({ id: 8, cine: undefined }, klaar).skippable === true, 'ook zonder eigen opties');
}
// rollen per speler (#455): elke client speelt de hoofdrol van de scène lokaal zelf
{
  const p = cutPakket({ def: { id: 'x' }, lines: [], duration: 3, anchor: null, cine: { id: 'x' }, rol: 'tammo' });
  ok(p.rol === 'tammo', 'de scène weet welke hoofdrol hij vraagt');
  const v = nieuwCutVerzamelaar(); let uit = null; for (const s of cutStukken(11, p)) uit = v.voegToe(s) || uit;
  ok(uit && uit.rol === 'tammo', 'de rol komt mee door de stukjes');
  ok(cutPakket({ def: {}, lines: [], duration: 3, rol: 'geen-rol' }).rol === undefined, 'alleen een echte verhaalrol');
  const eigen = cutsceneScene(uit, { character: 'anita' });
  ok(eigen.hoofdrol === 'tammo' && eigen.eigen === 'anita' && eigen.tijdelijk === true, 'een Tessa-speler speelt lokaal tijdelijk Tammo');
  ok(eigen.metgezel === 'anita' && eigen.metgezelEenmalig === true && eigen.avatarsZichtbaar === false, 'de metgezel staat er één keer en avatar-figuren niet');
  ok(cutsceneScene({ rol: 'tammo' }, { character: 'tammo' }).tijdelijk === false, 'eigen rol: geen wissel');
}
// elke speler één rol, de metgezel één keer (#434)
{
  const dubbel = { id: 'proef', actors: { tammo: { look: 'tammo' }, tessa: { look: 'anita' }, tessa2: { look: 'anita' }, buurvrouw: { look: { shirt: 1 } } } };
  ok(acteurRol('tammo', { look: 'tammo' }) === 'tammo' && acteurRol('tessa', { look: 'anita' }) === 'anita', 'de id en het uiterlijk geven dezelfde verhaalrol');
  ok(acteurRol('anita', {}) === 'anita' && acteurRol('tessa', {}) === 'anita' && acteurRol('buurvrouw', { look: {} }) === null, 'Tessa heeft twee ids; een omstander heeft geen rol');
  const v = cutsceneVerdeling(dubbel, cutsceneScene({ rol: 'tammo' }, { character: 'tammo' }));
  ok(v.perActeur.tammo === 'speler' && v.perActeur.tessa === 'metgezel', 'de speler en de metgezel allebei één keer');
  ok(v.perActeur.tessa2 === 'dubbel' && v.verberg.length === 1 && v.verberg[0] === 'tessa2', 'een tweede kopie van een rol wordt niet getekend');
  ok(v.perActeur.buurvrouw === 'figuur' && v.teken.includes('buurvrouw'), 'omstanders horen er gewoon bij');
  const gast = cutsceneScene({ rol: 'tammo' }, { character: 'anita' }, dubbel);
  ok(gast.defId === 'proef' && gast.verdeling.perActeur.tammo === 'speler' && gast.verdeling.perActeur.tessa === 'metgezel', 'de rol van de scène bepaalt wie de speler is');
  ok(!('verdeling' in cutsceneScene({ rol: 'tammo' }, { character: 'anita' })), 'zonder scène geen rolverdeling');
  // de keuken van de opening: Tammo en Tessa, elk één keer
  const keuken = cutsceneVerdeling(acts[1].def, cutsceneScene({}, { character: 'tammo' }));
  ok(keuken.teken.length === 2 && keuken.verberg.length === 0 && keuken.perActeur.tammo === 'speler' && keuken.perActeur.tessa === 'metgezel', 'de opening: twee mensen, elk één keer');
  // tussen twee bedrijven van dezelfde scène blijven de andere spelers nog even uit beeld
  const w = { coopCutRol: null };
  const s = cutsceneScene({ rol: 'tammo' }, { character: 'anita' }, dubbel);
  w.coopCutRol = s;
  ok(cutsceneSpeelt(w, 1000) && cutsceneSpeelt({ coopCutRol: { hoofdrol: 'tammo' } }, 1e12), 'een lopende scène geldt');
  ok(cutsceneKlaar(w, s, 1000) && cutsceneSpeelt(w, 1000 + CUT_HOLD * 1000 - 1), 'na een bedrijf geldt de scène nog even');
  ok(!cutsceneSpeelt(w, 1000 + CUT_HOLD * 1000) && !cutsceneSpeelt({}), 'daarna is de wereld weer van de spelers');
  const ander = { hoofdrol: 'tammo' };
  w.coopCutRol = ander;
  ok(!cutsceneKlaar(w, s, 1000) && w.coopCutRol === ander && ander.tot === undefined, 'een oude scène raakt een nieuwe niet');
}
// (#502) Vervangen is geen overslaan: een scène die door een scène met hogere prioriteit wordt overgenomen
// (cinematics.js playCinematic) laat de gasten meelopen naar de nieuwe scène. Alleen een scène die de speler
// zelf met Spatie/Esc wegklikt gaat als "overgeslagen" naar de gasten.
{
  const { cutHostEinde } = await import('../game/js/cutscenehost.js');
  const { handleEvent } = await import('../game/js/coopnet.js');
  const gastheer = () => {
    const sent = [];
    const w = { coopCutRol: null, coopCutSpoor: [], coopNet: { role: 'host', hub: { announce: (b) => { sent.push(b); return true; } } } };
    const id = cutHostId();
    cutHostStart(w, id, { def: {}, lines: [], duration: 3, anchor: null, cine: {} });
    sent.length = 0; // alleen het einde telt hier
    return { w, id, sent };
  };
  { // de scène speelde gewoon af
    const { w, id, sent } = gastheer();
    ok(cutHostEinde(w, id, { skipped: false, replaced: false }) && sent.length === 1 && sent[0].k === 'cutend' && sent[0].skip === false, 'een scène die afspeelt: een gewoon einde');
  }
  { // vervangen door een scène met hogere prioriteit (cinematics.js finish(true, true))
    const { w, id, sent } = gastheer();
    ok(cutHostEinde(w, id, { skipped: false, replaced: true }) === true, 'de gastheer meldt het einde van een vervangen scène');
    ok(sent.length === 1 && !sent.some((b) => b.k === 'cutend' || b.skip === true), 'een vervangen scène stuurt géén "skip" (en geen cutend) naar de gasten');
    ok(sent[0].k === 'cutvervang' && sent[0].id === id && sent[0].skip === false, 'de gasten horen dat de scène vervangen wordt (cutvervang)');
    ok(w.coopNet.cutNu === null && w.coopCutRol === null, 'de gastheer ruimt de vervangen scène op, net als bij een gewoon einde');
    ok(w.coopCutSpoor.some((r) => r.includes('host-vervangen')) && !w.coopCutSpoor.some((r) => r.includes('host-einde')), 'het spoor zegt "vervangen" en niet "overgeslagen"');
    ok(!cutHostEinde(w, id, { skipped: false, replaced: true }), 'het einde gaat maar één keer');
    // (#727) de gast leest cutvervang nu zelf: hij stopt zijn oude kopie stil (zonder skip-effect) en
    // wacht op de nieuwe scène. De import van cinematics is lui, dus even wachten.
    const gast = { coopNet: { role: 'client', cutVerzamelaar: { reset() {} } }, coopCutBezig: id, coopCutWacht: [{ id }, { id: id + 1 }] };
    ok(handleEvent(gast, sent[0]) === true, 'de gast leest het cutvervang-bericht');
    await new Promise((r) => setTimeout(r, 40));
    ok(gast.coopCutBezig == null, 'de gast stopt zijn vervangen kopie (zonder skip-effect)');
    ok(gast.coopCutWacht == null || gast.coopCutWacht.every((p) => p.id !== id), 'de vervangen scène gaat ook uit de wachtrij');
    // een gast die al een nieuwe scène speelt, houdt die: cutvervang mag nooit de nieuwe wegkieperen
    const nieuw = { coopNet: { role: 'client', cutVerzamelaar: { reset() {} } }, coopCutBezig: id + 1 };
    ok(handleEvent(nieuw, sent[0]) === true && nieuw.coopCutBezig === id + 1, 'een nieuwere scène blijft staan');
    // en een gast zonder lopende scène doet niets
    ok(handleEvent({ coopNet: { role: 'client' } }, sent[0]) === true, 'geen lopende scène: geen fout');
  }
  { // de speler sloeg zelf over: dat blijft precies zoals het was
    const { w, id, sent } = gastheer();
    ok(cutHostEinde(w, id, { skipped: true, replaced: false }) && sent.length === 1 && sent[0].k === 'cutend' && sent[0].skip === true, 'een zelf overgeslagen scène stuurt wél een "skip" naar de gasten');
  }
  { // zelf overslaan wint, ook als er net een nieuwe scène klaarstaat
    const { w, id, sent } = gastheer();
    ok(cutHostEinde(w, id, { skipped: true, replaced: true }) && sent[0].k === 'cutend' && sent[0].skip === true, 'zelf overslaan gaat voor vervangen');
  }
  {
    const { w, id } = gastheer();
    ok(!cutHostEinde({ coopNet: { role: 'client', hub: { announce: () => true } } }, id, { replaced: true }) && !cutHostEinde({}, id, { replaced: true }), 'een gast of een los spel stuurt niets');
    ok(cutHostEinde(w, id + 99, { replaced: true }) === false, 'alleen voor de lopende scène');
  }
}
// (#727) cutvervang: de gastheer verving een scène (nieuw bedrijf in dezelfde reeks) en de gast
// stopt zijn kopie. De bedrading: coopnet kent het bericht, en de handler controleert na de (lui)
// import nog eens of de kopie niet intussen door een nieuwe scène is vervangen.
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.dirname(fileURLToPath(import.meta.url));
  const net = fs.readFileSync(path.join(root, '..', 'game/js/coopnet.js'), 'utf8');
  const cut = fs.readFileSync(path.join(root, '..', 'game/js/coopcut.js'), 'utf8');
  const host = fs.readFileSync(path.join(root, '..', 'game/js/cutscenehost.js'), 'utf8');
  ok(/case 'cutvervang':/.test(net) && /cutGastVervangen\(world, body\.id\)/.test(net), 'coopnet heeft een gast-handler voor cutvervang');
  ok(/export async function cutGastVervangen\(w, id\)/.test(cut), 'de handler staat in coopcut.js');
  const h = cut.slice(cut.indexOf('export async function cutGastVervangen'));
  ok(/if \(w\.coopCutBezig !== id\) return true;/.test(h.slice(0, h.indexOf('skipCinematic'))), 'na de import nog eens kijken of de kopie nog dezelfde is');
  ok(/k: 'cutvervang'/.test(host), 'de gastheer stuurt cutvervang bij vervangen (blijft zo)');
  ok(/if \(skipped \|\| !replaced\) return cutHostEnd\(w, id, skipped\);/.test(host) && /return n\.hub\.announce\(\{ k: 'cutvervang', id, skip: false \}\);/.test(host), 'en alleen bij vervangen, niet bij gewoon einde of zelf overslaan');
}console.log(`coopcut_test: ${n} ok`);
