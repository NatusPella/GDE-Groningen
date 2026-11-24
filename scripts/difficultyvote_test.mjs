// Moeilijkheid bij Samen spelen is een gezamenlijke keuze, geen hostrecht (besluit eigenaar 22-11): de wereldopties (politie, verkeer)
// en het niveau vragen met meer spelers akkoord van de groep; wat van jezelf is, wijzig je zelf.
//   node scripts/difficultyvote_test.mjs
import fs from 'node:fs';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const D = await import('../game/js/difficulty.js');
const V = await import('../game/js/difficultyvote.js');
const G = await import('../game/js/coopgroep.js');

let n = 0, fails = 0;
const ok = (c, name, info) => { n++; if (!c) { fails++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } };
const std = { level: 'standaard', custom: {} };

ok(V.WORLD_OPTIONS.join() === 'policeEscape,policeUnits,trafficDensity', 'de wereldopties zijn politie en verkeer', V.WORLD_OPTIONS);
ok(G.STEM_SOORTEN.includes('moeilijkheid') && typeof G.STEM_TEKST.moeilijkheid === 'function', 'de stemming kent de soort moeilijkheid');
ok(/moeilijkheid van de wereld/.test(G.STEM_TEKST.moeilijkheid('Tessa')) && /Tessa/.test(G.STEM_TEKST.moeilijkheid('Tessa')), 'de vraag noemt wie het vraagt en wat er verandert');
ok(/aangepast/.test(G.stemUitslagTekst(true, '', 'moeilijkheid')) && /blijft/.test(G.stemUitslagTekst(false, '', 'moeilijkheid')) && /antwoord/.test(G.stemUitslagTekst(false, 'geen antwoord', 'moeilijkheid')), 'de uitslag zegt wat er gebeurde');

// wat raakt de wereld?
ok(V.touchesWorld({ type: 'option', key: 'policeUnits' }, std) && V.touchesWorld({ type: 'option', key: 'trafficDensity' }, std), 'politie en verkeer raken de wereld');
ok(!V.touchesWorld({ type: 'option', key: 'damageTaken' }, std) && !V.touchesWorld({ type: 'option', key: 'fines' }, std) && !V.touchesWorld({ type: 'option', key: 'timeFactor' }, std) && !V.touchesWorld({ type: 'option', key: 'hints' }, std), 'schade, boete, tijd en hints zijn van jezelf');
ok(V.touchesWorld({ type: 'level', naar: 'uitdagend' }, std) && !V.touchesWorld({ type: 'level', naar: 'standaard' }, std), 'een ander niveau raakt de wereld, hetzelfde niveau niet');
ok(!V.touchesWorld({ type: 'reset' }, { level: 'standaard', custom: { income: 1.25 } }) && V.touchesWorld({ type: 'reset' }, { level: 'standaard', custom: { policeUnits: 1.5 } }), 'terugzetten raakt de wereld alleen als een wereldoptie afweek');
ok(!V.touchesWorld(null) && !V.touchesWorld({ type: 'onzin' }), 'onbekende wijzigingen raken niets');

// alleen: meteen
{
  let k = 0;
  const w = { addMessage() {} };
  ok(V.changeWithGroup(w, { type: 'option', key: 'policeUnits' }, () => k++, std) === true && k === 1, 'alleen: de wijziging gaat meteen door');
}
// host met een gast: stemming, alleen bij ja
{
  let k = 0, vraag = null;
  const w = { coopNet: { role: 'host', hub: { roster: { spelers: [{ slot: 0 }, { slot: 1 }] } } }, addMessage() {}, coopVraag: (soort, tekst, ja) => { vraag = { soort, tekst, ja }; return true; } };
  ok(V.changeWithGroup(w, { type: 'option', key: 'policeUnits' }, () => k++, std) === true && vraag && vraag.soort === 'moeilijkheid' && k === 0, 'host met gast: eerst een stemming, nog niets gewijzigd');
  vraag.ja();
  ok(k === 1, 'na ja gaat de wijziging door');
  vraag = null;
  V.changeWithGroup(w, { type: 'option', key: 'damageTaken' }, () => k++, std);
  ok(vraag === null && k === 2, 'een eigen optie vraagt niemand iets');
}
// gast (#1169, elke speler is gelijkwaardig): zijn eigen deel verandert meteen, de wereld stelt hij de groep voor
{
  let k = 0; const msgs = [], sent = [];
  D.setActiveDifficulty(std);
  const w = { coopNet: { role: 'client' }, addMessage: (t) => msgs.push(t), coopMoeilijkheidVoorstel: (o) => { sent.push(o); return true; } };
  const apply = () => { k++; D.setActiveOption('trafficDensity', 0.5); };
  ok(V.changeWithGroup(w, { type: 'option', key: 'trafficDensity' }, apply, std) === true && k === 1, 'gast: zijn eigen profiel past zich meteen aan');
  ok(sent.length === 1 && JSON.stringify(sent[0]) === '{"trafficDensity":0.5}', 'gast: alleen de gewijzigde wereldoptie gaat als voorstel', sent);
  ok(msgs[0] === V.WORLD_GUEST_SENT, 'gast: hij hoort dat de groep stemt', msgs);
  ok(V.changeWithGroup(w, { type: 'option', key: 'fines' }, () => k++, std) === true && k === 2 && sent.length === 1, 'gast: een eigen optie gaat gewoon door, zonder voorstel');
  // een oudere host zonder het bericht (of een sessie die net stopt): de oude melding, en het eigen deel is wel aangepast
  const oud = { coopNet: { role: 'client' }, addMessage: (t) => msgs.push(t) };
  ok(V.changeWithGroup(oud, { type: 'option', key: 'policeUnits' }, () => k++, std) === false && k === 3 && msgs[msgs.length - 1] === V.WORLD_GUEST_TEXT, 'gast zonder voorstelhaak: melding, eigen deel wel aangepast');
  D.setActiveDifficulty(std);
}
// het voorstel: wat gaat er mee, wat keurt de opener, wat wordt er gezet
{
  const hard = { level: 'uitdagend', custom: {} };
  const p = V.worldProposal({ type: 'level', naar: 'uitdagend' }, hard);
  ok(p && Object.keys(p).join() === V.WORLD_OPTIONS.join() && p.policeEscape === D.presetValue('uitdagend', 'policeEscape'), 'een niveau stelt alle wereldopties van dat niveau voor', p);
  ok(V.worldProposal({ type: 'option', key: 'damageTaken' }, hard) === null && V.worldProposal(null) === null, 'een eigen optie is geen voorstel');
  ok(JSON.stringify(V.cleanWorldProposal({ policeEscape: 1.25, trafficDensity: 1, damageTaken: 0.5 }, std)) === '{"policeEscape":1.25}', 'de opener houdt alleen wereldopties die anders zijn dan nu');
  ok(V.cleanWorldProposal({ policeEscape: 9 }, std) === null && V.cleanWorldProposal({ trafficDensity: 1 }, std) === null && V.cleanWorldProposal('x', std) === null && V.cleanWorldProposal([1], std) === null, 'een vreemde waarde, niets nieuws of rommel: geen stemming');
  const gezet = [];
  ok(V.applyWorldProposal({ policeEscape: 1.25, trafficDensity: 0.5 }, (key, v) => { gezet.push([key, v]); return true; }) === 2 && gezet.length === 2, 'na ja zet de opener de voorgestelde waarden');
  ok(/Politie kwijtraken: Langer/.test(V.describeWorldProposal({ policeEscape: 1.25 })) && /Verkeersdrukte: Rustig/.test(V.describeWorldProposal({ trafficDensity: 0.5 })), 'de melding noemt optie en stap in gewone woorden');
}
// de stemming over een voorstel van een gast: de opener stemt mee, de vrager telt als ja
{
  const st = G.stemBegin(1, 'moeilijkheid', 'x', [1, 2], 10, { metOpener: true, vrager: 1 });
  ok(st.keuze[0] === 'wacht' && st.keuze[1] === 'ja' && st.keuze[2] === 'wacht' && !st.uitslag, 'opener en andere gast moeten nog antwoorden', st.keuze);
  G.stemAntwoord(st, 2, true);
  ok(!st.uitslag, 'zonder de opener is het nog niet rond');
  G.stemAntwoord(st, 0, false);
  ok(st.uitslag === 'nee', 'een nee van de opener is nee');
  const alleen = G.stemBegin(2, 'moeilijkheid', 'x', [1], 10, { metOpener: true, vrager: 1 });
  G.stemAntwoord(alleen, 0, true);
  ok(alleen.uitslag === 'ja', 'met z\'n tweeën: ja van de opener is akkoord');
  const oud = G.stemBegin(3, 'slapen', 'x', [1, 2]);
  ok(!(0 in oud.keuze) && oud.keuze[1] === 'wacht', 'een tijdsprong die de opener zelf vraagt blijft zoals hij was');
}
// bedrading van het bericht (coopnet.js)
{
  const cn = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  ok(/case 'moeilijkheidverzoek'/.test(cn) && /cleanWorldProposal\(body\.opties\)/.test(cn) && /metOpener: true, vrager: van/.test(cn), 'de host keurt het voorstel en legt het de groep voor, met zijn eigen stem');
  ok(/world\.coopMoeilijkheidVoorstel = \(opties\) => vraagMoeilijkheid/.test(cn) && /k: 'moeilijkheidverzoek'/.test(cn), 'de gast stuurt het voorstel');
  ok(/export function hostStem/.test(cn) && /slot >= 1 && !nu\.has\(slot\)/.test(cn), 'de host antwoordt met J of N en valt niet uit zijn eigen stemming');
}
// bedrading
{
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  ok(/from '\.\/difficultyvote\.js'/.test(pm) && /type: 'level'/.test(pm) && /type: 'reset'/.test(pm) && /type: 'option'/.test(pm), 'pausemenu.js stuurt niveau, optie en reset door de groepsvraag');
}

console.log(fails ? `${fails}/${n} FAIL` : `difficultyvote_test: ${n}/${n} ok`);
process.exitCode = fails ? 1 : 0;
