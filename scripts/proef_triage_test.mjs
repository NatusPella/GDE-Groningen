// Voortgang, variatiematrix, blind reviewen, triage en gouden beelden van de proefspeler, op gefabriceerde events.jsonl en PNG's. Geen Electron.
//   node scripts/proef_triage_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodePng } from './lib/pngcheck.mjs';
import { voortgangAnalyse, faalHeatmap, heatmapAscii, balansOverzicht } from './bot/voortgang.mjs';
import { AS, matrixPlan, pairwise, volledig, gedekteParen, assenVoor, staatVergelijk, chaosBevindingen, runArgsVoor } from './bot/matrix.mjs';
import { zichtbareTekst, kiesMomenten, blindBundelSchrijven, duidelijkheidScore, duidelijkheidRapport, PERSONAS, tegenlezerBrief, pasTegenlezerToe, inhoudsWoorden } from './bot/blind.mjs';
import { handtekening, triage, issueVoorstel, reproVoor, samenvattingBevindingen, bevindingenJson, issuesMd, typeInfo } from './bot/triage.mjs';
import { pixelVerschil, goudBewaar, goudVergelijk, goudSleutels } from './bot/goud.mjs';
import { analyseRun, analyseSamen } from './bot/proefanalyse.mjs';
import { parseArgs, bouwTaken, runArgs, uitvoeringen, mapVoor, main as proefMain } from './bot/proef.mjs';
import { samenvatMissie } from './bot/proefbundel.mjs';

let n = 0, fails = 0;
const wacht = [];
const meld = (name, e) => { fails++; console.log('FAIL', name, '|', String(e.stack || e.message).split(String.fromCharCode(10)).slice(0, 3).join(' / ')); };
const t = (name, f) => { n++; try { const r = f(); if (r && r.then) wacht.push(r.catch((e) => meld(name, e))); } catch (e) { meld(name, e); } };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gde-triage-test-'));
const beeld = (w, h, f) => { const rgba = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); const i = (y * w + x) * 4; rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; } return { w, h, rgba }; };
const druk = (im) => Buffer.from(encodePng(im.w, im.h, im.rgba));
const ruis = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 255;
const gewoon = () => beeld(96, 54, (x, y) => [ruis(x, y), ruis(y, x), ruis(x + y, y)]);

// een oogmoment zoals bouwOogMoment het logt
const oog = (t0, reden, o = {}) => ({
  type: 'oog', t: t0, reden, shot: `M02-oog${String(o.nr || 1).padStart(2, '0')}-${reden}`, stap: 'M02', fase: 'goto', missieActief: true, doelTekst: 'Even pinnen', doelNaam: 'Spuit & Klaar', afstand: 100,
  zicht: { bekend: true, zichtbaar: true, reden: 'in beeld' }, ondertitel: '', dialoog: null, berichten: [], kaart: null, voertuig: { soort: 'auto', gezondheid: 100, snelheid: 5 },
  gezondheid: 100, snelheid: 5, frameMs: 16, gezocht: 0, geld: 100, mislukt: 0, plek: [100, 100], spreiding: null, stilS: 0, filmpje: false, tijd: t0, ...o,
});

// --- voortgang en balans ---------------------------------------------------------------------------------------------------------
const run1 = () => [
  { type: 'meta', seed: 1 },
  { t: 0, type: 'step', event: 'begin', id: 'M02', label: 'Even pinnen', verwachtS: 120 },
  oog(0, 'begin', { nr: 1 }),
  { t: 5, type: 'doel', stage: 'goto', doel: 'Garage', afstand: 300 },
  oog(70, 'stil', { nr: 2, stilS: 65, afstand: 300 }),             // 65 s stilstand = dode tijd
  { t: 150, type: 'doel', stage: 'pay', doel: 'Pinautomaat', afstand: 20 },
  oog(160, 'doel', { nr: 3, doelTekst: '', doelNaam: '', zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, afstand: 20 }),
  oog(200, 'doel', { nr: 4, doelTekst: '', doelNaam: '', zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, afstand: 20 }),
  oog(240, 'doel', { nr: 5, doelTekst: '', doelNaam: '', zicht: { bekend: true, zichtbaar: false, reden: 'links buiten beeld' }, afstand: 20 }),
  { t: 250, type: 'mission', event: 'fail', id: 'M02', msgs: ['Te laat!'], phase: 'failed' },
  oog(251, 'mislukt', { nr: 6, plek: [410, 205], gezondheid: 40, mislukt: 1, geld: 80 }),
  { t: 400, type: 'step', event: 'end', id: 'M02', outcome: 'klaar' },
];

t('voortgangAnalyse: duur, fases, dode tijd (bewijsgebonden), mislukking met plek en oorzaak, geld en schade', () => {
  const a = voortgangAnalyse(run1(), { id: 'M02' });
  assert.equal(a.duurS, 400);
  assert.equal(a.verwachtS, 120);
  assert.equal(a.verhouding, 3.33);
  assert.equal(a.oordeel, 'veel langer dan verwacht');
  assert.deepEqual(a.fases.map((f) => f.fase), ['begin', 'goto', 'pay']);
  assert.equal(a.fases[1].duurS, 145);
  const stil = a.dodeTijd.find((d) => d.redenen.includes('stilstand'));
  assert.ok(stil && stil.duurS >= 60, JSON.stringify(a.dodeTijd));
  assert.equal(a.mislukkingen.length, 1);
  assert.deepEqual(a.mislukkingen[0].plek, [410, 205]);
  assert.equal(a.mislukkingen[0].oorzaak, 'Te laat!');
  assert.equal(a.geld.delta, -20);
  assert.equal(a.schade.minGezondheid, 40);
  assert.equal(a.pogingen, 2);
});

t('voortgangAnalyse: een rit zonder oogmomenten is geen dode tijd, en een snelle missie krijgt geen oordeel over traag', () => {
  const ev = [{ t: 0, type: 'step', event: 'begin', id: 'M09' }, oog(0, 'begin', { stap: 'M09' }), oog(500, 'slagen', { stap: 'M09', nr: 2 }), { t: 500, type: 'step', event: 'end', id: 'M09', outcome: 'klaar' }];
  const a = voortgangAnalyse(ev, { id: 'M09', verwachtS: 480 });
  assert.equal(a.dodeTijd.length, 0);
  assert.equal(a.oordeel, 'binnen verwachting');
});

t('faalHeatmap en heatmapAscii: mislukkingen over seeds op dezelfde plek vormen een cel', () => {
  const runs = [
    { missie: 'M02', seed: 1, mislukkingen: [{ plek: [410, 205], oorzaak: 'Te laat!' }] },
    { missie: 'M02', seed: 2, mislukkingen: [{ plek: [430, 210], oorzaak: 'Te laat!' }, { plek: [900, 900], oorzaak: 'dood' }] },
    { missie: 'M02', seed: 3, mislukkingen: [{ plek: null }] },
  ];
  const h = faalHeatmap(runs);
  assert.equal(h[0].n, 2); assert.deepEqual(h[0].seeds, [1, 2]); assert.equal(h[0].oorzaak, 'Te laat!');
  assert.equal(h.length, 2);
  assert.match(heatmapAscii(h), /2/);
  assert.equal(heatmapAscii([]), '(geen mislukkingen met een plek)');
});

t('balansOverzicht: mediaan, spreiding en verhouding per missie', () => {
  const a = (d, v) => ({ missie: 'M02', duurS: d, verwachtS: v, geld: { delta: 10 }, schade: { gezondheidVerlies: 20 }, dodeTijdS: 0, pogingen: 1 });
  const b = balansOverzicht([a(100, 120), a(200, 120), a(150, 120)])[0];
  assert.equal(b.duurMediaanS, 150); assert.equal(b.verhouding, 1.25); assert.equal(b.spreidingDuur, 2); assert.equal(b.seeds, 3);
});

// --- matrix -----------------------------------------------------------------------------------------------------------------------
t('pairwise: elk waardepaar van twee assen komt voor, met veel minder runs dan volledig', () => {
  const assen = assenVoor('M02');
  const rijen = pairwise(assen), namen = Object.keys(assen);
  const alle = new Set();
  for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) for (const a of assen[namen[i]]) for (const b of assen[namen[j]]) alle.add(`${namen[i]}=${a}|${namen[j]}=${b}`);
  const gedekt = gedekteParen(rijen, namen);
  assert.equal([...alle].filter((p) => !gedekt.has(p)).length, 0, 'alle paren gedekt');
  const volle = namen.reduce((a, nm) => a * assen[nm].length, 1);
  assert.ok(rijen.length < volle / 10, `${rijen.length} runs tegen ${volle} volledig`);
  assert.deepEqual(pairwise(assen), rijen, 'deterministisch');
});

t('matrixPlan rook: basis, nacht, save-load en sterf; elke run heeft run.mjs-opties en de echt-spel-markering', () => {
  const p = matrixPlan({ missies: ['M02'], modus: 'rook' });
  assert.deepEqual(p.map((r) => r.naam), ['basis', 'tijd-nacht', 'chaos-save-load', 'chaos-sterf']);
  assert.deepEqual(p[1].args, ['--seed=1', '--klok=22', '--scherm=1280x720'].filter((a) => p[1].args.includes(a)));
  assert.ok(p[1].args.includes('--klok=22'));
  assert.ok(p[2].args.includes('--chaos=save-load:20'));
  assert.deepEqual(p[1].page, ['tijd']);
});

t('matrixPlan: pairwise en volledig, met uitsluitingen per missie (skûtsje geen voertuig-uit, vliegtuig geen gebied-uit)', () => {
  const pw = matrixPlan({ missies: ['M11', 'M15'], modus: 'pairwise', seeds: [1, 2] });
  assert.ok(pw.some((r) => r.missie === 'M11') && pw.some((r) => r.missie === 'M15'));
  assert.ok(!pw.filter((r) => r.missie === 'M11').some((r) => r.perturbaties.chaos === 'voertuig-uit'));
  assert.ok(!pw.filter((r) => r.missie === 'M11').some((r) => r.perturbaties.voertuig !== 'standaard'));
  assert.ok(!pw.filter((r) => r.missie === 'M15').some((r) => r.perturbaties.chaos === 'gebied-uit'));
  const v = matrixPlan({ missies: ['M02'], modus: 'volledig', assen: ['tijd', 'weer'] });
  assert.equal(v.length, 2 * 3 * 1);   // tijd x weer, de rest op standaard
  assert.throws(() => volledig(assenVoor('M02'), 100), /te groot/);
  assert.throws(() => matrixPlan({ missies: ['M02'], modus: 'alles' }), /onbekende matrixmodus/);
});

t('matrixPlan: wat alleen in het echte spel te testen is, wordt gemarkeerd (mist, mobiel, controller)', () => {
  const v = matrixPlan({ missies: ['M02'], modus: 'volledig', assen: ['weer', 'scherm', 'invoer'] });
  const echt = new Set(v.flatMap((r) => r.echt.map((e) => `${e.as}=${e.waarde}`)));
  assert.ok(echt.has('weer=mist') && echt.has('scherm=800x360') && echt.has('invoer=controller'));
  assert.ok(v.find((r) => r.perturbaties.weer === 'helder' && r.perturbaties.scherm === '1280x720' && r.perturbaties.invoer === 'toetsenbord').echt.length === 0);
  assert.deepEqual(runArgsVoor({ perturbaties: { seed: 2, tijd: 'dag', chaos: 'stop-herstart' } }), ['--seed=2', '--klok=12', '--annuleer=20']);
  assert.ok(Object.keys(AS).includes('chaos'));
});

t('staatVergelijk (save/load): gelijk is ok; geld, doel, voortgang, voertuig en wanted die verschillen worden genoemd', () => {
  const s = { stap: 'M02', fase: 'goto', doelNaam: 'Garage', doelX: 10, doelY: 10, voortgangDone: 1, voortgangTotal: 5, geld: 100, gezocht: 0, voertuig: 'auto', missieActief: true };
  assert.equal(staatVergelijk(s, { ...s, doelX: 12 }).ok, true, 'binnen 15 m');
  const r = staatVergelijk(s, { ...s, geld: 70, gezocht: 2, voertuig: 'te voet', doelNaam: 'Winkel', voortgangDone: 0 });
  assert.equal(r.ok, false);
  assert.deepEqual(r.verschillen.map((v) => v.veld).sort(), ['doelNaam', 'geld', 'gezocht', 'voertuig', 'voortgangDone']);
  assert.equal(staatVergelijk(null, s).ok, false);
});

t('chaosBevindingen: staatbreuk, soft-lock zonder herstel, doel weg na uitstappen, mislukte stop en een snelreis die midden in de missie lukte', () => {
  const s = { stap: 'M02', fase: 'goto', doelNaam: 'Garage', geld: 100, gezocht: 0, voertuig: 'auto', missieActief: true };
  const ev = [
    { type: 'chaos', soort: 'save-load', t: 50, stap: 'M02', voor: s, na: { ...s, geld: 60 } },
    { type: 'chaos', soort: 'sterf', t: 80, stap: 'M02', voor: s, na: { ...s, voertuig: 'te voet' } },
    { type: 'chaos', soort: 'snelreis', t: 90, stap: 'M02', voor: s, geweigerd: false },
    { type: 'chaos', soort: 'voertuig-uit', t: 100, stap: 'M02', voor: s, na: { ...s, doelNaam: '', voertuig: 'te voet' } },
    { type: 'chaos-herstel', soort: 'voertuig-uit', t: 110 },
    { type: 'annuleer', t: 120, ok: false, voor: { id: 'M02' }, na: {} },
  ];
  const r = chaosBevindingen(ev), typen = r.map((x) => x.type);
  assert.ok(typen.includes('chaos-staatbreuk'));
  assert.equal(r.find((x) => x.type === 'chaos-staatbreuk').bewijs.verschillen[0].veld, 'geld');
  assert.ok(r.some((x) => x.type === 'chaos-softlock' && x.bewijs.chaos === 'sterf'), 'sterf zonder herstel');
  assert.ok(!r.some((x) => x.type === 'chaos-softlock' && x.bewijs.chaos === 'voertuig-uit'), 'voertuig-uit herstelde');
  assert.ok(typen.includes('chaos-snelreis-in-missie'));
  assert.ok(typen.includes('chaos-doel-weg'));
  assert.ok(typen.includes('chaos-stop-herstart'));
  // eindigt de stap na de verstoring, dan telt dat als herstel
  assert.ok(!chaosBevindingen([{ type: 'chaos', soort: 'sterf', t: 1, voor: s }, { type: 'step', event: 'end', t: 9 }]).some((x) => x.type === 'chaos-softlock'));
});

// --- blind reviewen ---------------------------------------------------------------------------------------------------------------
const blindRun = (d) => {
  const ev = [{ type: 'meta' }];
  const redenen = ['begin', 'doel', 'doel', 'slagen', 'stil', 'doel', 'mislukt', 'doel'];
  redenen.forEach((r, i) => {
    const o = oog(i * 10, r, { nr: i + 1, doelTekst: i === 1 ? 'Bezorg de pakketten bij Delfstof Noord' : 'Even pinnen', ondertitel: i === 2 ? 'Tessa: Kom mee naar de garage' : '', berichten: i === 3 ? ['Je hebt 50 euro verdiend'] : [] });
    ev.push(o);
    fs.writeFileSync(path.join(d, `shots-${o.shot}.png`), druk(gewoon()));
  });
  fs.writeFileSync(path.join(d, 'events.jsonl'), ev.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return ev;
};

t('zichtbareTekst: alleen wat de speler ziet, geen interne toestand', () => {
  const z = zichtbareTekst(oog(1, 'doel', { ondertitel: 'Tessa: Hoi', berichten: ['x'], kaart: { tekst: 'Tip', zichtbaarS: 3 } }));
  assert.deepEqual(Object.keys(z).sort(), ['doelregel', 'meldingen', 'ondertitel', 'uitlegkaart']);
  assert.ok(!JSON.stringify(z).includes('Spuit'), 'doelNaam is interne toestand');
});

t('kiesMomenten: alleen beslismomenten, venster van 4 tot 8 beelden, begrensd en gelijkmatig uitgedund', () => {
  const ev = Array.from({ length: 40 }, (_, i) => oog(i, i % 2 ? 'doel' : 'slagen', { nr: i + 1, shot: `s${i}` }));
  const m = kiesMomenten(ev, { venster: 12, max: 5 });
  assert.equal(m.length, 5);
  assert.ok(m.every((x) => x.venster.length <= 8 && x.oog.reden === 'doel'));
  assert.ok(m[0].venster.length >= 1);
});

t('blindBundelSchrijven: blind/ bevat alleen neutrale beelden, zichtbare tekst en briefs; waarheid.json staat apart met de oplossing', () => {
  const d = tmp(); blindRun(d);
  const r = blindBundelSchrijven(d, d, { venster: 5, max: 8 });
  const blind = path.join(d, 'blind');
  const bestanden = fs.readdirSync(blind);
  assert.ok(bestanden.includes('brief.md') && bestanden.includes('zichtbare-tekst.json'));
  for (const p of PERSONAS.filter((x) => x.id !== 'tegenlezer')) assert.ok(bestanden.includes(`persona-${p.id}.md`), p.id);
  assert.ok(bestanden.filter((f) => f.endsWith('.png')).every((f) => /^beeld-\d\d\.png$/.test(f)), 'neutrale namen: geen reden of stap in de bestandsnaam');
  const inhoud = bestanden.map((f) => (f.endsWith('.png') ? '' : fs.readFileSync(path.join(blind, f), 'utf8'))).join('\n');
  for (const lek of ['M02', 'Spuit', 'oog0', 'goto', '"zicht"', '"afstand"', '"plek"', '"stap"', '"fase"', '"doelNaam"', 'waarheid']) assert.ok(!inhoud.includes(lek), `blind/ mag '${lek}' niet bevatten`);
  assert.ok(inhoud.includes('Bezorg de pakketten bij Delfstof Noord'), 'de doelregel staat wel in beeld');
  const w = JSON.parse(fs.readFileSync(path.join(d, 'waarheid.json'), 'utf8'));
  assert.ok(w.momenten.length === r.momenten.length && w.momenten[0].stap === 'M02' && w.momenten.some((m) => m.doelNaam === 'Spuit & Klaar'));
  assert.ok(fs.existsSync(path.join(d, 'antwoord-sjabloon.json')));
  for (const z of JSON.parse(fs.readFileSync(path.join(blind, 'zichtbare-tekst.json'), 'utf8'))) assert.ok(z.beelden.length >= 1 && z.beelden.length <= 8);
});

t('duidelijkheidScore: woordoverlap met de echte doeltekst; "weet niet" is nul; zonder doeltekst onbepaald', () => {
  const w = { doelTekst: 'Bezorg de pakketten bij Delfstof Noord', doelNaam: '' };
  assert.ok(duidelijkheidScore({ wat: 'Ik moet pakketten bezorgen bij Delfstof Noord', waar: 'de HUD' }, w).score >= 0.75);
  assert.ok(duidelijkheidScore({ wat: 'Ik moet de stad in rijden', waar: 'het scherm' }, w).score < 0.25);
  assert.equal(duidelijkheidScore({ wat: 'Ik weet het niet, pakketten misschien', waar: '' }, w).score, 0);
  assert.equal(duidelijkheidScore({ wat: 'iets', waar: '' }, { doelTekst: '', doelNaam: '' }).score, null);
  assert.deepEqual(inhoudsWoorden('Bezorg de pakketten'), inhoudsWoorden('bezorgen PAKKET'));
});

t('duidelijkheidRapport: score per moment, label, gemiddelde, een LLM-oordeel weegt mee, onbeantwoord blijft zichtbaar en laag wordt een bevinding', () => {
  const waarheid = { momenten: [
    { moment: 1, stap: 'M02', doelTekst: 'Bezorg de pakketten bij Delfstof Noord', beelden: ['beeld-01.png'], shot: 'a', plek: [1, 2] },
    { moment: 2, stap: 'M02', doelTekst: 'Even pinnen bij de automaat', beelden: ['beeld-02.png'], shot: 'b', plek: [3, 4] },
    { moment: 3, stap: 'M02', doelTekst: 'Rij naar de garage', beelden: [], shot: 'c' },
  ] };
  const ant = [{ moment: 1, wat: 'pakketten bezorgen bij Delfstof Noord', waar: 'HUD', zekerheid: 4 }, { moment: 2, wat: 'Wegrijden', waar: 'de straat', onduidelijk: 'geen idee wat ik moet', zekerheid: 3 }];
  const r = duidelijkheidRapport(ant, waarheid, [{ moment: 1, score: 1 }]);
  assert.equal(r.momenten[0].label, 'duidelijk'); assert.ok(r.momenten[0].score >= 0.9);
  assert.equal(r.momenten[1].label, 'onduidelijk');
  assert.equal(r.momenten[2].label, 'niet beantwoord');
  assert.equal(r.bevindingen.length, 1);
  assert.equal(r.bevindingen[0].type, 'duidelijkheid-laag'); assert.equal(r.bevindingen[0].bewijs.spelerDacht, 'Wegrijden');
  assert.ok(r.gemiddeld > 0 && r.gemiddeld < 1);
});

t('tegenlezer: de brief bevat elk cluster met bewijs, en weerlegde bevindingen vallen weg', () => {
  const cl = [{ id: 'B001', type: 'dom-afgekapt', ernst: 'verwarrend', frequentie: { runs: 1, van: 2 }, tekst: 'Lang', bewijs: [{ beeld: 'x', eventTijd: 3, bewijs: { a: 1 } }], issue: { titel: 'T1' } }, { id: 'B002', type: 'console-error', ernst: 'verwarrend', frequentie: { runs: 2, van: 2 }, tekst: '', bewijs: [], issue: { titel: 'T2' } }];
  const b = tegenlezerBrief(cl);
  assert.match(b, /B001/); assert.match(b, /B002/); assert.match(b, /weerleggen/i);
  const na = pasTegenlezerToe(cl, [{ id: 'B001', oordeel: 'weerlegd', reden: 'bedoeld' }, { id: 'B002', oordeel: 'bevestigd', reden: 'echt' }]);
  assert.deepEqual(na.map((c) => c.id), ['B002']);
  assert.ok(PERSONAS.some((p) => p.id === 'ogen') && PERSONAS.some((p) => p.id === 'controller') && PERSONAS.some((p) => p.id === 'ongeduldig') && PERSONAS.some((p) => p.id === 'nieuw') && PERSONAS.some((p) => p.id === 'tegenlezer'));
});

// --- triage -----------------------------------------------------------------------------------------------------------------------
const bev = (type, o = {}) => ({ type, soort: type.split('-')[0], ernst: 'verwarrend', stap: 'M02', plek: [105, 110], t: 20, tekst: 'Even pinnen', shot: 'M02-oog01-doel', bewijs: {}, ...o });

t('handtekening: seed en variant doen er niet toe, plek in cellen van 50 m, tekst en selector voor DOM', () => {
  assert.equal(handtekening(bev('frame-hitch', { plek: [105, 110] }), 'M02'), handtekening(bev('frame-hitch', { plek: [120, 140] }), 'M02'));
  assert.notEqual(handtekening(bev('frame-hitch', { plek: [105, 110] }), 'M02'), handtekening(bev('frame-hitch', { plek: [305, 110] }), 'M02'));
  assert.equal(handtekening(bev('dom-afgekapt', { plek: [1, 1], bewijs: { sel: 'div.obj' } }), 'M02'), handtekening(bev('dom-afgekapt', { plek: [900, 900], bewijs: { sel: 'div.obj' } }), 'M02'));
  assert.match(handtekening(bev('lees-te-snel', { tekst: 'Wij moeten NU!' }), 'M02'), /wij moeten nu/);
});

t('triage: ontdubbelt over seeds, ernst = impact x frequentie, sorteert, geeft bewijs, repro en een issue-voorstel', () => {
  const mk = (seed, lijst, o = {}) => ({ missie: 'M02', seed, naam: '', dir: `.scr/proef/M02/seed-${seed}`, events: [{ t: 20, type: 'doel' }], bevindingen: lijst, replay: !!o.replay, args: [] });
  const runs = [
    mk(1, [bev('chaos-softlock', { ernst: 'blokkeert', soort: 'chaos', plek: null, tekst: '' }), bev('dom-lettergrootte', { ernst: 'verwarrend', tekst: 'Klein', bewijs: { sel: 'div.k', fontPx: 10 } })], { replay: true }),
    mk(2, [bev('chaos-softlock', { ernst: 'blokkeert', soort: 'chaos', plek: null, tekst: '' })]),
    mk(3, [bev('dom-lettergrootte', { ernst: 'verwarrend', tekst: 'Klein', bewijs: { sel: 'div.k', fontPx: 10 } }), bev('dom-lettergrootte', { ernst: 'verwarrend', tekst: 'Klein', bewijs: { sel: 'div.k', fontPx: 10 } })]),
    mk(4, [bev('goud-verschil', { ernst: 'cosmetisch', soort: 'goud', bewijs: { sleutel: 'M02-doel-1' } })]),
  ];
  const c = triage(runs);
  assert.equal(c.length, 3);
  assert.equal(c[0].type, 'chaos-softlock');
  assert.equal(c[0].ernst, 'blokkeert'); assert.equal(c[0].impact, 3);
  assert.equal(c[0].frequentie.runs, 2); assert.equal(c[0].frequentie.van, 4); assert.deepEqual(c[0].frequentie.seeds, [1, 2]);
  assert.equal(c[0].id, 'B001');
  assert.ok(c[0].score > c[1].score && c[1].score > c[2].score, 'blokkeert > verwarrend > cosmetisch');
  const dom = c.find((x) => x.type === 'dom-lettergrootte');
  assert.equal(dom.frequentie.aantal, 3);   // 1 + 2 metingen: wel in 2 runs
  assert.equal(dom.frequentie.runs, 2);
  assert.ok(c[0].bewijs.length >= 1 && c[0].bewijs[0].seed === 1);
  assert.ok(c[0].repro.replay && /--replay=/.test(c[0].repro.replay), 'seed 1 had een replay');
  assert.match(c[0].repro.proef, /proef\.mjs --missies=M02 --seeds=1/);
});

t('issueVoorstel: Nederlandse titel en body, labels bug/wens + impact + kosten, bewijs en repro erin', () => {
  const c = triage([{ missie: 'M02', seed: 1, dir: '.scr/x', events: [], bevindingen: [bev('lees-te-snel', { ernst: 'cosmetisch', soort: 'lezen', tekst: 'Wij moeten nu meteen naar het kantoor', bewijs: { woordenPerS: 5.5 } })], replay: false }])[0];
  const i = c.issue;
  assert.match(i.titel, /^M02/); assert.match(i.titel, /te kort in beeld/);
  assert.deepEqual(i.labels, ['bug', 'impact-laag', 'kosten-S']);
  for (const kop of ['**Wat:**', '**Waar:**', '**Hoe vaak:**', '**Verwacht:**', '**Bewijs:**', '**Reproduceren:**']) assert.ok(i.body.includes(kop), kop);
  assert.match(i.body, /#975/); assert.match(i.body, /nog niet door een mens bekeken/);
  assert.equal(typeInfo('onbekend-ding').soort, 'bug');
  assert.equal(typeInfo('lees-herhaling').soort, 'wens');
  assert.equal(typeInfo('voortgang-niet-geslaagd').kosten, 'kosten-M');
  assert.ok(typeInfo('chaos-staatbreuk').titel.includes('opslaan'));
});

t('reproVoor: met replay het run.mjs --replay-commando, zonder de proef.mjs-regel met de perturbaties', () => {
  const a = reproVoor({ missie: 'M11', seed: 2, dir: 'C:\\x\\M11', replay: true, args: [] });
  assert.match(a.replay, /run\.mjs --replay=C:\/x\/M11\/replay\.jsonl/);
  const b = reproVoor({ missie: 'M11', seed: 2, dir: 'x', replay: false, args: ['--klok=22', '--chaos=sterf:20'] });
  assert.equal(b.replay, null); assert.match(b.proef, /--klok=22 --chaos=sterf:20/);
});

t('samenvattingBevindingen: niet geslaagd, vast, dode tijd, traag, mislukt en doel buiten beeld uit samenvatting en voortgang', () => {
  const ev = run1();
  const sam = samenvatMissie(ev, { id: 'M02', seed: 1 });
  const a = voortgangAnalyse(ev, { id: 'M02' });
  const l = samenvattingBevindingen({ ...sam, geslaagd: false, uitkomst: 'opgegeven', vastgezetMomenten: [{ t: 99, stap: 'M02', x: 5, y: 6, stilS: 31, trede: 2 }], schermenZonderZichtbaarDoel: 4, schermenZonderDoelNrs: [3, 4, 5, 6] }, a);
  const typen = l.map((x) => x.type);
  for (const k of ['voortgang-niet-geslaagd', 'voortgang-vast', 'voortgang-dode-tijd', 'voortgang-traag', 'voortgang-mislukt', 'voortgang-doel-niet-in-beeld']) assert.ok(typen.includes(k), k);
  assert.equal(l.find((x) => x.type === 'voortgang-niet-geslaagd').ernst, 'blokkeert');
});

t('bevindingenJson en issuesMd: totalen per prioriteit en een sectie per cluster', () => {
  const runs = [{ missie: 'M02', seed: 1, dir: 'd', events: [], bevindingen: [bev('chaos-softlock', { ernst: 'blokkeert', soort: 'chaos', plek: null }), bev('lees-te-snel', { ernst: 'cosmetisch', soort: 'lezen', plek: null })], replay: false }];
  const c = triage(runs), j = bevindingenJson(runs, c, { gemaakt: 'nu' });
  assert.equal(j.totaal.clusters, 2); assert.equal(j.versie, 1); assert.equal(j.runs[0].seed, 1);
  assert.equal(j.totaal.p1 + j.totaal.p2 + j.totaal.p3, 2);
  const md = issuesMd(c);
  assert.match(md, /## B001 \[P\d\]/); assert.match(md, /Labels: bug, impact-hoog/);
});

// --- goud -------------------------------------------------------------------------------------------------------------------------
t('pixelVerschil: fractie, gemiddelde en bounding box; andere grootte geeft null', () => {
  const a = beeld(20, 10, () => [10, 10, 10]), b = beeld(20, 10, (x, y) => (x >= 5 && x < 10 && y < 4 ? [200, 10, 10] : [10, 10, 10]));
  const v = pixelVerschil(a, b);
  assert.equal(v.fractie, 0.1); assert.deepEqual(v.box, [5, 0, 9, 3]);
  assert.equal(pixelVerschil(a, beeld(5, 5, () => [0, 0, 0])), null);
});

t('goud: bewaren per stap-reden-nummer, vergelijken met tolerantie; geen goud is geen bevinding; ander formaat wordt gemeld', () => {
  const d = tmp(), root = path.join(tmp(), 'goud');
  const ev = [oog(1, 'doel', { nr: 1 }), oog(9, 'doel', { nr: 2, shot: 'M02-oog02-doel' }), oog(12, 'begin', { nr: 3, shot: 'M02-oog03-begin' })];
  assert.deepEqual(goudSleutels(ev).map((x) => x.sleutel), ['M02-doel-1', 'M02-doel-2', 'M02-begin-1']);
  const basis = gewoon();
  for (const o of ev) fs.writeFileSync(path.join(d, `shots-${o.shot}.png`), druk(basis));
  assert.equal(goudBewaar(d, ev, root, { missie: 'M02' }), 3);
  assert.equal(goudBewaar(d, ev, root, { missie: 'M02' }), 0, 'bestaand goud blijft staan');
  assert.deepEqual(goudVergelijk(d, ev, root, { missie: 'M02' }), []);
  // een tweede run: beeld 2 is erg anders, beeld 3 heeft een andere grootte
  fs.writeFileSync(path.join(d, 'shots-M02-oog02-doel.png'), druk(beeld(96, 54, () => [250, 0, 0])));
  fs.writeFileSync(path.join(d, 'shots-M02-oog03-begin.png'), druk(beeld(48, 27, () => [1, 2, 3])));
  const r = goudVergelijk(d, ev, root, { missie: 'M02' });
  assert.deepEqual(r.map((x) => x.type).sort(), ['goud-formaat', 'goud-verschil']);
  const g = r.find((x) => x.type === 'goud-verschil');
  assert.ok(g.bewijs.fractie > 0.9 && g.bewijs.sleutel === 'M02-doel-2'); assert.equal(g.shot, 'M02-oog02-doel');
  assert.deepEqual(goudVergelijk(d, ev, root, { missie: 'M02', tolerantie: 1 }).map((x) => x.type), ['goud-formaat']);
  assert.deepEqual(goudVergelijk(d, ev, path.join(root, 'leeg'), { missie: 'M02' }), [], 'geen goud');
  goudBewaar(d, ev, root, { missie: 'M02', vernieuw: true });
  assert.deepEqual(goudVergelijk(d, ev, root, { missie: 'M02' }).map((x) => x.type), []);
});

// --- proef.mjs: matrix droog en een hele keten op gefabriceerde runs -----------------------------------------------------------------
t('proef.mjs: --matrix en --plan tonen het plan zonder Electron; uitvoeringen en runArgs nemen de perturbaties mee', () => {
  const taken = bouwTaken({ missies: 'M02', seeds: '1,2' });
  const plan = matrixPlan({ missies: ['M02'], modus: 'rook', seeds: [1, 2] });
  const u = uitvoeringen(taken[0], plan);
  assert.equal(u.length, plan.length);
  assert.ok(u.every((x) => !x.extra.some((a) => a.startsWith('--seed='))));
  assert.equal(uitvoeringen(taken[0], null).length, 2);
  const a = runArgs(taken[0], u[1].seed, 'x', [], u[1].extra);
  assert.ok(a.includes('--klok=22') && a.includes('--mens'));
  assert.equal(mapVoor('o', taken[0], 1, u[1].variant), path.join('o', 'M02', 'tijd-nacht'));
  assert.equal(parseArgs(['--matrix=pairwise', '--assen=tijd', '--speed=2']).door.length, 1);
  const r = spawnSync(process.execPath, ['scripts/bot/proef.mjs', '--missies=M02,M11', '--matrix=pairwise', '--plan'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /matrix pairwise: \d+ run\(s\) voor 2 missie\(s\)/); assert.match(r.stdout, /M11 .*--/);
  const slecht = spawnSync(process.execPath, ['scripts/bot/proef.mjs', '--missies=M02', '--matrix=alles'], { encoding: 'utf8' });
  assert.equal(slecht.status, 2);
});

t('keten: analyseRun leest een run, triage maakt clusters, analyseSamen schrijft bevindingen.json, issues.md, balans.md en de tegenlezerbrief; --alleen-bundel hergebruikt de analyse', async () => {
  const out = tmp(), dir = path.join(out, 'M02');
  fs.mkdirSync(dir, { recursive: true });
  const zwart = beeld(96, 54, () => [1, 1, 1]);
  const ev = [
    { type: 'meta', seed: 1 }, { t: 0, type: 'mens', seed: 1 },
    { t: 1, type: 'step', event: 'begin', id: 'M02', label: 'Even pinnen' },
    oog(1, 'begin', { nr: 1 }),
    { t: 5, type: 'tekst', bron: 'gesprek', spreker: 'Tessa', stap: 'M02', tekst: 'Wij moeten nu meteen naar het kantoor van Delfstof Noord rijden', zichtbaarS: 2 },
    oog(30, 'doel', { nr: 2, shot: 'M02-oog02-doel', ondertitel: 'Tessa: Hoi', doelTekst: 'Garage' }),
    { t: 40, type: 'console', level: 'error', soort: 'nan', sig: 'NaN in mesh #', tekst: 'NaN in mesh 4' },
    { t: 50, type: 'detect', soort: 'dom', stap: 'M02', plek: [3, 4], items: [{ type: 'dom-lettergrootte', ernst: 'verwarrend', tekst: 'Klein', sel: 'div.k', rect: {}, bewijs: { fontPx: 10 } }] },
    { t: 60, type: 'mission', event: 'fail', id: 'M02', msgs: ['Te laat'] },
    oog(61, 'mislukt', { nr: 3, shot: 'M02-oog03-mislukt', mislukt: 1, plek: [410, 205] }),
    { t: 99, type: 'step', event: 'end', id: 'M02', outcome: 'klaar' },
  ];
  fs.writeFileSync(path.join(dir, 'events.jsonl'), ev.map((e) => JSON.stringify(e)).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'replay.jsonl'), '{}\n');
  fs.writeFileSync(path.join(dir, 'shots-M02-oog01-begin.png'), druk(zwart));
  fs.writeFileSync(path.join(dir, 'shots-M02-oog02-doel.png'), druk(gewoon()));
  fs.writeFileSync(path.join(dir, 'shots-M02-oog03-mislukt.png'), druk(gewoon()));
  const run = analyseRun(dir, { id: 'M02', seed: 1 });
  const typen = run.bevindingen.map((b) => b.type);
  for (const k of ['beeld-zwart', 'console-nan', 'dom-lettergrootte', 'lees-onleesbaar-snel', 'voortgang-mislukt']) assert.ok(typen.includes(k), `${k} in ${typen.join(',')}`);
  assert.ok(run.replay && fs.existsSync(path.join(dir, 'analyse.json')) && fs.existsSync(path.join(dir, 'blind', 'brief.md')) && fs.existsSync(path.join(dir, 'waarheid.json')));
  const clusters = analyseSamen([run], out, { plan: matrixPlan({ missies: ['M02'], modus: 'rook' }) });
  for (const f of ['bevindingen.json', 'issues.md', 'balans.md', 'tegenlezer-brief.md', 'matrix.md']) assert.ok(fs.existsSync(path.join(out, f)), f);
  const j = JSON.parse(fs.readFileSync(path.join(out, 'bevindingen.json'), 'utf8'));
  assert.equal(j.clusters.length, clusters.length);
  assert.ok(j.clusters.every((c) => c.id && c.handtekening && c.repro && c.issue && c.bewijs.length >= 1));
  const nan = j.clusters.find((c) => c.type === 'console-nan');
  assert.equal(nan.ernst, 'blokkeert');
  assert.match(nan.repro.replay, /--replay=/);
  assert.match(fs.readFileSync(path.join(out, 'balans.md'), 'utf8'), /M02 bij \(425, 225\)/);
  // opnieuw bundelen zonder ruwe beelden (zoals --alleen-bundel): de beeldbevindingen komen uit de vorige analyse
  fs.rmSync(path.join(dir, 'shots-M02-oog01-begin.png')); fs.rmSync(path.join(dir, 'shots-M02-oog02-doel.png')); fs.rmSync(path.join(dir, 'shots-M02-oog03-mislukt.png'));
  const opnieuw = analyseRun(dir, { id: 'M02', seed: 1 });
  assert.ok(opnieuw.bevindingen.some((b) => b.type === 'beeld-zwart'), 'uit de cache');
  // en de hele proef.mjs met --alleen-bundel op deze map (geen Electron)
  const code = await proefMain(['--missies=M02', `--out=${out}`, '--alleen-bundel']);
  assert.equal(code, 0);
  assert.ok(fs.existsSync(path.join(out, 'overzicht.md')) && fs.existsSync(path.join(out, 'M02', 'index.md')));
  assert.ok(JSON.parse(fs.readFileSync(path.join(out, 'bevindingen.json'), 'utf8')).clusters.some((c) => c.type === 'beeld-zwart'));
});

await Promise.all(wacht);
console.log(`${n - fails}/${n} triagetests geslaagd`);
if (fails) process.exit(1);
