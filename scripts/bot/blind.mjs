// Het 'denken-hardop'-protocol van de proefspeler (docs/PROEFSPELER.md, "Blind reviewen"). Een vision-reviewer speelt de naieve speler:
// hij krijgt ALLEEN de laatste 4 tot 8 beelden en de tekst die de speler op dat moment ziet, geen interne toestand, en antwoordt
//   1. wat denk ik dat ik nu moet doen?   2. waar kijk ik?   3. wat is onduidelijk?
// Een tweede stap legt dat antwoord naast de echte doeltekst (woordoverlap en optioneel een LLM-oordeel) en geeft een duidelijkheidsscore.
//   blindBundelSchrijven(runDir, doel, opts)   maakt <doel>/blind/ (beelden, zichtbare tekst, briefs) en <doel>/waarheid.json (de oplossing, apart)
//   PERSONAS                                   nieuwe speler, ongeduldig, controller, gevoelige ogen of kleurenblind, en de tegenlezer
//   duidelijkheidScore(antwoord, waarheid)     0..1
//   duidelijkheidRapport(antwoorden, waarheid, oordelen)   per moment en gemiddeld, plus bevindingen onder de drempel
//   tegenlezerBrief(clusters)                  de brief voor de tegenlezer die elke bevinding probeert te weerleggen
import fs from 'node:fs';
import path from 'node:path';
import { oogMomenten, parseEvents } from './proefbundel.mjs';

export const BLIND = { venster: 6, minVenster: 4, maxVenster: 8, maxMomenten: 12, drempelOnduidelijk: 0.25, drempelHalf: 0.5 };
// de redenen waarop een speler moet weten wat hij nu moet doen
export const BESLISREDENEN = ['begin', 'start', 'doel', 'stil', 'vast', 'mislukt', 'opgegeven'];

export const PERSONAS = [
  { id: 'nieuw', naam: 'Nieuwe speler', instructie: 'Je kent het spel niet en hebt geen handleiding gelezen. Je leest alles wat er staat en volgt wat het spel je vertelt. Waar het spel iets aanneemt dat je al weet (een knop, een woord, een plek), zeg je dat het onduidelijk is.' },
  { id: 'ongeduldig', naam: 'Ongeduldige speler', instructie: 'Je leest ondertitels maar half en klikt snel door. Je kijkt vooral naar het beeld en de doelregel. Staat er een lange tekst, dan lees je alleen de eerste zin. Meld wat je daardoor miste en of je het doel dan nog snapt.' },
  { id: 'controller', naam: 'Controller-speler', instructie: 'Je speelt met een controller en kent geen toetsenbord. Elke prompt die een toets noemt (E, F, spatie, de muis) is voor jou onbruikbaar; meld die. Prompts met een knopsymbool wel (A, B, X, Y, stick).' },
  { id: 'ogen', naam: 'Speler met gevoelige ogen of kleurenblind', instructie: 'Je ziet rood en groen slecht uit elkaar, helder licht en flikkering zijn vervelend, en kleine of lichte tekst op lichte grond is moeilijk. Meld tekst die je niet kunt lezen, doelen die alleen aan een kleur te herkennen zijn, en schermen die fel of flikkerend zijn.' },
  { id: 'tegenlezer', naam: 'Tegenlezer', instructie: 'Je krijgt de bevindingen van anderen met hun bewijs. Probeer elke bevinding te weerleggen: is het bedoeld, is het een artefact van de bot, is het beeld misleidend, is het te klein om te tellen? Een bevinding die je niet kunt weerleggen, bevestig je met je reden. Een bevinding zonder bewijs is niet bevestigd.' },
];

// --- het blinde bundel ---------------------------------------------------------------------------------------

// Wat de speler op dat moment zichtbaar in beeld heeft (tekst), zonder interne toestand: geen stapnaam, fase, afstand, plek, doelnaam, zicht.
export function zichtbareTekst(o) {
  const t = {};
  if (o.doelTekst) t.doelregel = o.doelTekst;
  if (o.ondertitel) t.ondertitel = o.ondertitel;
  if (o.dialoog) t.dialoog = { tekst: o.dialoog.tekst, opties: o.dialoog.opties || [] };
  if (o.berichten && o.berichten.length) t.meldingen = o.berichten;
  if (o.kaart && o.kaart.tekst) t.uitlegkaart = o.kaart.tekst;
  return t;
}

// De momenten waarop de naieve speler iets moet beslissen, met het venster van de laatste n beelden (zelfde run, oplopende tijd)
export function kiesMomenten(events, { venster = BLIND.venster, max = BLIND.maxMomenten, redenen = BESLISREDENEN } = {}) {
  const n = Math.max(BLIND.minVenster, Math.min(BLIND.maxVenster, venster));
  const oog = oogMomenten(events).filter((o) => o.shot);
  const keuze = oog.filter((o) => redenen.includes(o.reden));
  // te veel momenten: gelijkmatig uitdunnen, de eerste en laatste blijven
  let gekozen = keuze;
  if (keuze.length > max) { gekozen = []; for (let i = 0; i < max; i++) gekozen.push(keuze[Math.round((i * (keuze.length - 1)) / (max - 1))]); }
  return gekozen.map((o, i) => {
    const idx = oog.findIndex((q) => q.nr === o.nr);
    const win = oog.slice(Math.max(0, idx - n + 1), idx + 1);
    return { nr: i + 1, oog: o, venster: win };
  });
}

export function blindBrief({ venster = BLIND.venster } = {}) {
  return [
    '# Blinde review: de naieve speler', '',
    `Je bent een speler die dit spel voor het eerst ziet. Je krijgt per moment hooguit ${BLIND.maxVenster} beelden (de laatste ${venster}, het nieuwste laatst) en de tekst die op dat moment in beeld stond. Je krijgt GEEN code, geen missienaam, geen coordinaten en geen uitleg. Zoek die ook niet op: een antwoord op basis van wat je weet in plaats van wat je ziet is waardeloos.`, '',
    'Open de beelden van een moment met de Read-tool, in volgorde. Lees `zichtbare-tekst.json` voor dat moment. Beantwoord per moment, in je eigen woorden:', '',
    '1. **Wat denk ik dat ik nu moet doen?** Een of twee zinnen, zoals je het aan een vriend zou zeggen.',
    '2. **Waar kijk ik?** Welk deel van het beeld trekt je oog (HUD, een gebouw, een personage, een pijl)? Zie je het doel?',
    '3. **Wat is onduidelijk?** Wat zou je vragen? Woorden, knoppen, plekken, tijdsdruk. Laat leeg als niets onduidelijk is.',
    '4. **Zekerheid** van 1 (gok) tot 5 (zeker).', '',
    'Schrijf je antwoorden als JSON naar `antwoorden.json` (naast deze map, niet erin): een lijst van `{ "moment": 1, "wat": "...", "waar": "...", "onduidelijk": "...", "zekerheid": 3 }` (zie `antwoord-sjabloon.json`). Raad niet naar de oplossing: een eerlijk "ik weet het niet" is een bruikbare uitkomst.', '',
    'Geen smaakoordeel over humor of verhaal, alleen of je snapt wat je moet doen.', '',
    'Lees daarna `persona-<naam>.md` als je als een bepaalde speler moet kijken. Een persona verandert je kijk, niet je regels.', '',
  ].join('\n');
}

// Schrijft <doel>/blind/ (alleen wat de reviewer mag zien) en <doel>/waarheid.json (de oplossing, apart houden). Geeft { momenten, blindDir }.
export function blindBundelSchrijven(runDir, doel, { venster = BLIND.venster, max = BLIND.maxMomenten, kopieer = true } = {}) {
  const evPad = path.join(runDir, 'events.jsonl');
  const events = fs.existsSync(evPad) ? parseEvents(fs.readFileSync(evPad, 'utf8')) : [];
  const momenten = kiesMomenten(events, { venster, max });
  const blind = path.join(doel, 'blind');
  fs.mkdirSync(blind, { recursive: true });
  // beelden krijgen een neutrale naam: de reden (begin, slagen, doel) en de stap zouden de oplossing verraden
  const naam = new Map(); let k = 0;
  const bron = (shot) => [path.join(runDir, `shots-${shot}.png`), path.join(runDir, `${shot}.png`)].find((p) => fs.existsSync(p));
  const blindBeeld = (o) => {
    if (naam.has(o.shot)) return naam.get(o.shot);
    const b = `beeld-${String(++k).padStart(2, '0')}.png`;
    const p = bron(o.shot);
    if (p && kopieer) fs.copyFileSync(p, path.join(blind, b)); else if (!p) { naam.set(o.shot, ''); return ''; }
    naam.set(o.shot, b); return b;
  };
  const zichtbaar = [], waarheid = [];
  for (const m of momenten) {
    const beelden = m.venster.map(blindBeeld).filter(Boolean);
    zichtbaar.push({ moment: m.nr, beelden, tekst: zichtbareTekst(m.oog) });
    waarheid.push({
      moment: m.nr, oogNr: m.oog.nr, reden: m.oog.reden, stap: m.oog.stap, fase: m.oog.fase, doelTekst: m.oog.doelTekst, doelNaam: m.oog.doelNaam, afstand: m.oog.afstand,
      zicht: m.oog.zicht, ondertitel: m.oog.ondertitel, dialoog: m.oog.dialoog, plek: m.oog.plek, shot: m.oog.shot, beelden,
    });
  }
  fs.writeFileSync(path.join(blind, 'zichtbare-tekst.json'), JSON.stringify(zichtbaar, null, 1));
  fs.writeFileSync(path.join(blind, 'brief.md'), blindBrief({ venster }));
  for (const p of PERSONAS.filter((q) => q.id !== 'tegenlezer')) fs.writeFileSync(path.join(blind, `persona-${p.id}.md`), `# Persona: ${p.naam}\n\n${p.instructie}\n`);
  fs.writeFileSync(path.join(doel, 'antwoord-sjabloon.json'), JSON.stringify(zichtbaar.map((z) => ({ moment: z.moment, wat: '', waar: '', onduidelijk: '', zekerheid: 0 })), null, 1));
  fs.writeFileSync(path.join(doel, 'waarheid.json'), JSON.stringify({ noot: 'DE OPLOSSING: niet aan de blinde reviewer geven', momenten: waarheid }, null, 1));
  return { momenten: waarheid, blindDir: blind, aantalBeelden: k };
}

// --- de tweede stap: antwoord tegen waarheid ---------------------------------------------------------------------

const STOP = new Set('de het een en van naar in op te dat die dit deze is zijn was ik je jij we wij ze zij er niet wel met voor aan om bij of als maar nog dan wat wie waar hoe nu hier daar moet moeten mag kan kun ga gaan ben heb hebt heeft'.split(' '));
const stam = (w) => w.slice(0, 5);   // een ruwe stam: 'bezorgen', 'bezorg' en 'bezorgd' vallen op elkaar
export const inhoudsWoorden = (t) => [...new Set(String(t || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)).map(stam))];

// Hoeveel van de inhoudswoorden van de echte doeltekst (doelregel, doelnaam, ondertitel) komen in het antwoord terug (recall), 0..1.
// Is er geen doeltekst (een stap zonder doelregel), dan is het onbepaald (null): dat zegt iets over de stap, niet over de reviewer.
export function duidelijkheidScore(antwoord, waarheid) {
  const echt = inhoudsWoorden([waarheid.doelTekst, waarheid.doelNaam].filter(Boolean).join(' ') || waarheid.ondertitel || (waarheid.dialoog && waarheid.dialoog.tekst) || '');
  if (!echt.length) return { score: null, overlap: [], echt: [], reden: 'geen doeltekst om mee te vergelijken' };
  const ant = new Set(inhoudsWoorden([antwoord.wat, antwoord.waar].filter(Boolean).join(' ')));
  const overlap = echt.filter((w) => ant.has(w));
  let s = overlap.length / echt.length;
  // 'ik weet het niet' of een lege wat is nul, ook als er toevallig een woord overeenkomt
  if (!String(antwoord.wat || '').trim() || /\b(weet (het )?niet|geen idee|onduidelijk)\b/i.test(String(antwoord.wat || ''))) s = 0;
  return { score: Math.round(s * 100) / 100, overlap, echt };
}

export const duidelijkLabel = (s, o = BLIND) => (s == null ? 'onbepaald' : s < o.drempelOnduidelijk ? 'onduidelijk' : s < o.drempelHalf ? 'half duidelijk' : 'duidelijk');

// Een prompt voor een LLM-oordeel als de woordoverlap te grof is (tweede stap, optioneel): de uitkomst is { moment, score 0..1, uitleg }
export function oordeelPrompt(antwoord, waarheid) {
  return [`De echte doeltekst voor de speler: "${waarheid.doelTekst || waarheid.doelNaam || waarheid.ondertitel || ''}".`, `Een speler zonder voorkennis dacht: "${antwoord.wat}". Hij keek naar: "${antwoord.waar}". Onduidelijk vond hij: "${antwoord.onduidelijk || '-'}".`,
    'Beoordeel van 0 tot 1 hoe goed zijn begrip overeenkomt met het echte doel (1 = precies, 0.5 = half, 0 = fout of leeg). Antwoord met JSON: {"score": 0.0, "uitleg": "..."} en niets anders.'].join('\n');
}

// Combineert antwoorden, waarheid en eventuele LLM-oordelen tot een rapport. Een oordeel weegt even zwaar als de woordoverlap.
export function duidelijkheidRapport(antwoorden, waarheid, oordelen = [], o = BLIND) {
  const w = Array.isArray(waarheid) ? waarheid : waarheid.momenten || [];
  const per = [];
  for (const t of w) {
    const a = antwoorden.find((q) => q.moment === t.moment);
    if (!a) { per.push({ moment: t.moment, stap: t.stap, score: null, label: 'niet beantwoord', beelden: t.beelden }); continue; }
    const d = duidelijkheidScore(a, t), j = oordelen.find((q) => q.moment === t.moment);
    const score = d.score == null ? (j ? j.score : null) : j && Number.isFinite(j.score) ? Math.round(((d.score + j.score) / 2) * 100) / 100 : d.score;
    per.push({ moment: t.moment, stap: t.stap, reden: t.reden, score, woordScore: d.score, oordeel: j ? j.score : null, label: duidelijkLabel(score, o), zekerheid: a.zekerheid || null, wat: a.wat, onduidelijk: a.onduidelijk || '', echt: t.doelTekst || t.doelNaam || '', beelden: t.beelden, shot: t.shot, plek: t.plek });
  }
  const m = per.filter((q) => Number.isFinite(q.score));
  const gem = m.length ? Math.round((m.reduce((a, q) => a + q.score, 0) / m.length) * 100) / 100 : null;
  const bevindingen = per.filter((q) => q.label === 'onduidelijk' && (q.zekerheid == null || q.zekerheid >= 2)).map((q) => ({
    type: 'duidelijkheid-laag', soort: 'duidelijkheid', ernst: 'verwarrend', stap: q.stap || '', plek: q.plek || null, t: null, tekst: q.echt, shot: q.shot,
    bewijs: { moment: q.moment, score: q.score, spelerDacht: q.wat, spelerOnduidelijk: q.onduidelijk, echteDoel: q.echt, beelden: q.beelden },
  }));
  return { gemiddeld: gem, onduidelijk: per.filter((q) => q.label === 'onduidelijk').length, momenten: per, bevindingen };
}

export function duidelijkheidMd(rapport) {
  const k = ['# Duidelijkheid per moment (blinde review)', '', `Gemiddelde score: ${rapport.gemiddeld ?? 'onbekend'}; onduidelijk: ${rapport.onduidelijk} van ${rapport.momenten.length}.`, '', '| moment | stap | score | oordeel | de speler dacht | het echte doel |', '| --- | --- | --- | --- | --- | --- |'];
  for (const q of rapport.momenten) k.push(`| ${q.moment} | ${q.stap || ''} | ${q.score ?? '-'} | ${q.label} | ${String(q.wat || '').replace(/\|/g, '/').slice(0, 80)} | ${String(q.echt || '').replace(/\|/g, '/').slice(0, 80)} |`);
  return k.join('\n') + '\n';
}

// De brief voor de tegenlezer: de bevindingen met hun bewijs en de opdracht om ze te weerleggen (precisie)
export function tegenlezerBrief(clusters, { max = 25 } = {}) {
  const p = PERSONAS.find((q) => q.id === 'tegenlezer');
  const k = ['# Tegenlezer: probeer elke bevinding te weerleggen', '', p.instructie, '',
    'Per bevinding: **weerlegd**, **onzeker** of **bevestigd**, met een reden van een zin. Weerleggen mag op deze gronden: het is bedoeld gedrag, het is een artefact van de bot (hij ziet niet wat een mens ziet, hij is vastgelopen op iets wat een mens omzeilt), het beeld laat het niet zien, het gaat om een verwaarloosbaar detail, of de bevinding is in feite twee losse dingen. Geen bewijs, geen bevestiging. Antwoord als JSON: `[{ "id": "B001", "oordeel": "bevestigd", "reden": "..." }]`.', ''];
  for (const c of clusters.slice(0, max)) {
    k.push(`## ${c.id} ${c.issue ? c.issue.titel : c.type}`, '', `- type ${c.type}, ernst ${c.ernst}, ${c.frequentie.runs}/${c.frequentie.van} runs`, `- tekst: ${String(c.tekst || '').slice(0, 120)}`, `- bewijs: ${c.bewijs.map((b) => `${b.beeld || 'geen beeld'} (t=${b.eventTijd ?? '?'})`).join(', ')}`, `- meting: \`${JSON.stringify((c.bewijs[0] || {}).bewijs || {}).slice(0, 240)}\``, '');
  }
  return k.join('\n');
}

// Past het oordeel van de tegenlezer toe: weerlegde clusters vallen weg uit de lijst voor issues, onzekere krijgen een vlag
export function pasTegenlezerToe(clusters, oordelen) {
  const per = new Map((oordelen || []).map((o) => [o.id, o]));
  return clusters.map((c) => { const o = per.get(c.id); return o ? { ...c, tegenlezer: { oordeel: o.oordeel, reden: o.reden } } : c; }).filter((c) => !c.tegenlezer || c.tegenlezer.oordeel !== 'weerlegd');
}
