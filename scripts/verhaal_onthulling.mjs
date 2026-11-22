// #987: de onthullingsdichtheid van de opening (C00.1-C00.3) en missie 1 t/m 3.
// Loopt de regels door in speelvolgorde, met een tijd, en telt per regel wat een nieuwe speler
// erbij krijgt: nieuwe namen (personen, bedrijven, evenementen, voorwerpen), nieuwe plekken,
// jargon, voorgeschiedenis en verwijzingen naar iets wat nog niet is getoond of uitgelegd.
//   node scripts/verhaal_onthulling.mjs              samenvatting per scène en per minuut
//   node scripts/verhaal_onthulling.mjs --regels     ook elke regel met zijn nieuwe dingen
//   node scripts/verhaal_onthulling.mjs --json       alles als JSON
// Puur: geen Electron, geen netwerk. De test (verhaal_onthulling_test.mjs) bewaakt de norm.
// De tellers zijn een meetlat, geen oordeel: ze vinden de plekken waar een speler niets aan heeft,
// de speltest en de eigenaar beslissen of het verhaal ook klopt (docs/verhaal/OPENING-ONTHULLING.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// VERHAAL_ROOT wijst naar een andere werkboom (een eerdere stand voor de nulmeting)
const REPO = process.env.VERHAAL_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// De norm voor de eerste vijf minuten (en voor elke scène daarna in dit bereik).
export const NORM = {
  eersteMinuten: 5,
  namenPerScene: 2, // personen, bedrijven, evenementen, voorwerpen met een eigennaam
  figurenPerScene: 1, // een figuur zonder naam ("een Fries in een blauw colbert") is een haak, geen naam
  plekkenPerScene: 2,
  jargonPerScene: 2,
  voorgeschiedenisPerScene: 2, // regels die naar iets verwijzen wat de speler niet zag (een uitleg ervan telt mee)
  onverklaardPerScene: 0,
  // na de eerste vijf minuten (de rest van M01-M03) mag een scène iets meer dragen
  later: { namenPerScene: 3, figurenPerScene: 1, plekkenPerScene: 3, jargonPerScene: 3, voorgeschiedenisPerScene: 3, onverklaardPerScene: 0 },
};

// ---------------------------------------------------------------------------------------------
// Het lexicon: wat een nieuwe speler moet leren kennen. `kind` bepaalt waar het meetelt.
//   re        herkent de naam in een regel (en in de regie, waar het getoond wordt)
//   speaker   de spreker die dit personage is (een nieuwe stem is een nieuw personage)
//   gratis    hoort bij het beeld of de titel (hoofdpersonen, de stad): telt niet
//   gloss     een regel (of regie) die het ding uitlegt; zonder die uitleg is een vermelding onverklaard
// ---------------------------------------------------------------------------------------------
export const LEXICON = [
  { id: 'tammo', kind: 'persoon', re: /\bTammo\b/, speaker: 'Tammo', gratis: true },
  { id: 'tessa', kind: 'persoon', re: /\bTessa\b/, speaker: 'Tessa', gratis: true },
  { id: 'grunn', kind: 'plek', re: /\bGrunn\b|\bStad\b/, gratis: true },
  { id: 'martinitoren', kind: 'plek', re: /\bMartinitoren\b/, gratis: true },
  { id: 'rikus', kind: 'persoon', re: /\bRikus\b/, speaker: 'Rikus', gratis: true }, // de radio is de stem van de wereld, geen personage om te onthouden
  { id: 'nachtstreek', kind: 'organisatie', re: /\bNachtstreek\b/, gratis: true }, // de zender waarop Rikus praat: ruis van de wereld
  { id: 'berend', kind: 'persoon', re: /\bBerend(?:s)?\b|\bBommen Berend\b|\bBos\b/, speaker: 'Berend Bos' },
  { id: 'jelle', kind: 'persoon', re: /\bJelle\b|\bTerpstra\b|\bJelleWâld\b|\bmeneer Klomp\b/i, speaker: 'Jelle Terpstra' },
  { id: 'fries', kind: 'figuur', re: /\bFries in een blauw colbert\b|\bFries die\b|\bblauw colbert\b/ },
  { id: 'streamer', kind: 'persoon', re: /\bstreamer\b/i, speaker: 'Streamer' },
  { id: 'torenwachter', kind: 'persoon', re: /\btorenwachter\b/i, speaker: 'Torenwachter' },
  { id: 'terrasgast', kind: 'persoon', re: /\bterrasgast\b/i, speaker: 'Terrasgast' },
  { id: 'sjabbe', kind: 'persoon', re: /\bSjabbe\b/, speaker: 'Sjabbe' },
  { id: 'durk', kind: 'persoon', re: /\bDurk\b/, speaker: 'Durk' },
  { id: 'douwe', kind: 'persoon', re: /\bDouwe\b/, speaker: 'Douwe' },
  { id: 'hoving', kind: 'persoon', re: /\bHoving\b|\bbewaarder\b/i, speaker: 'Mevrouw Hoving' },
  { id: 'loketbediende', kind: 'persoon', re: /\bloketbediende\b/i, speaker: 'Loketbediende' },
  { id: 'bert', kind: 'persoon', re: /\bBert\b/, speaker: 'Duivenmelker Bert' },
  { id: 'fjordfrituur', kind: 'organisatie', re: /\bsnackwagen\b/, regie: /TAM & TES|snackwagen/, gloss: /frietwagen|frituur(?!e)/i },
  { id: 'snackprijs', kind: 'evenement', re: /\b(?:Noordelijke )?Snackprijs\b/, gloss: /wedstrijd|beste eierbal|prijs voor de beste/i },
  { id: 'usmemsnacks', kind: 'organisatie', re: /\bUs Mem Snacks\b/ },
  { id: 'kiekdoar', kind: 'organisatie', re: /\bKiekdoar\b/, gloss: /\bstream|\bchat\b|filmt|kijkers|content/i },
  { id: 'pandpoen', kind: 'organisatie', re: /\bPand & Poen\b/, gloss: /koopt wat niemand wil|Sjabbe van Pand|winkel/i },
  { id: 'spuitklaar', kind: 'organisatie', re: /\bSpuit & Klaar\b/, gloss: /nieuwe kleur|spuiterij|spuit hem/i },
  { id: 'loket', kind: 'organisatie', re: /\bHet Loket\b|\bhet Loket\b/, gloss: /inschrijv|inschrijfloket/i },
  { id: 'ontzet', kind: 'evenement', re: /\bOntzet\b/, gloss: /1672|bisschop/i },
  { id: 'eierbal', kind: 'voorwerp', re: /\bGouden Eierbal\b|\bgouden eierbal\b/, gloss: /wisselprijs|bewaarder|bewaar de/i },
  { id: 'escapade', kind: 'voorwerp', re: /\bEscapade\b/ },
  { id: 'paddepoel', kind: 'plek', re: /\bPaddepoel\b/ },
  { id: 'grotemarkt', kind: 'plek', re: /\bGrote Markt\b/ },
  { id: 'martinikerkhof', kind: 'plek', re: /\bMartinikerkhof\b/ },
  { id: 'boterdiep', kind: 'plek', re: /\bBoterdiep\b/ },
  { id: 'herestraat', kind: 'plek', re: /\bHerestraat\b/ },
  { id: 'stationsplein', kind: 'plek', re: /\bStationsplein\b/ },
  { id: 'stadhuis', kind: 'plek', re: /\bStadhuis\b/ },
  { id: 'museum', kind: 'plek', re: /\bmuseum\b|\bMuseum\b/ },
  { id: 'standplaats', kind: 'term', re: /\bstandplaats(?:en)?\b/i, gloss: /plek|frietwagen|neerzetten|staan/i },
  { id: 'salamitactiek', kind: 'term', re: /\bSalamitactiek\b|\bsalamitactiek\b/, gloss: /plakje/i },
  { id: 'complimentenladder', kind: 'term', re: /\bcomplimentenladder\b|\bTrede (?:één|twee|drie|vier|vijf)\b/i, gloss: /ladder.*(?:trede|compliment)|compliment.*ladder.*:/i },
  { id: 'artikel', kind: 'term', re: /\bartikel \d+\b/i, gloss: /reglement/i },
  { id: 'formulier7b', kind: 'term', re: /\b7B\b/, gloss: /formulier/i },
  { id: 'stuntpunten', kind: 'term', re: /\bstuntpunten\b/i, gloss: /stunt|punten|parasols/i },
];

// Verwijzingen naar iets wat de speler niet gezien heeft: `needs` moet eerder in een regel of regie staan.
export const VERWIJZINGEN = [
  { id: 'ladder', re: /\bTrede (?:één|twee|drie|vier|vijf) van de complimentenladder\b/i, needs: /\bcomplimentenladder\b.*(?:vijf|treden|trede)|\bladder\b.*\bcompliment/i, uitleg: 'een complimentenladder die nergens is uitgelegd' },
  { id: 'man-uit-de-chat', re: /\bde man uit de chat\b/i, needs: /\bchat\b.*\bJelleWâld\b|\bJelleWâld\b.*\bchat\b|\bJelleWâld\b/, uitleg: 'de man uit de chat, die niet is getoond' },
  { id: 'colbert-van-berend', re: /\bHet colbert van Berend\b/i, needs: /blauw colbert/i, uitleg: 'een colbert dat Berend niet heeft genoemd' },
  { id: 'jelle-uit-de-klomp', re: /\buit een klomp\b/i, needs: /\bklomp\b/i, uitleg: 'een klomp zonder eerdere context', zelf: true },
];

// Voorgeschiedenis: iets wat al gebeurd is of altijd zo was, zonder dat de speler het zag.
export const VOORGESCHIEDENIS = [
  /\bzoals je weet\b/i, /\bweet je nog\b/i, /\bzoals gezegd\b/i, /\bik zei al\b/i, /\bnog steeds\b/i,
  /\bal jaren\b/i, /\belk jaar\b/i, /\bveertig jaar\b/i, /\bsinds (?:\d{4}|woensdag|gisteren)\b/i,
  /\bin (?:1[0-9]{3}|20[0-9]{2})\b/, /\bvroeger\b/i, /\bvorige week\b/i,
  /\b(?:mijn|je|jouw) opa\b/i, /\bhij huilde\b/i, /\bnog nooit\b/i, /\bvoor het eerst\b(?<!!)/i,
];

const STOP_CAPS = new Set(['Moi', 'Goidag', 'Goedemorgen', 'Nederlands', 'Fries', 'Fjord', 'Stadjers', 'Noorden', 'Eén', 'Gronings', 'Nul', 'Contant', 'Chat', 'Ik', 'Wij', 'Jij', 'Hij', 'Zij', 'Het', 'De', 'Een', 'Dat', 'Dit', 'Niet', 'Foar', 'Oant', 'Jelle', 'Loket', 'Formulier', 'Gefeliciteerd', 'Kiekdoar', 'Vierentwintig', 'Honderdvijftig', 'Vijftig', 'Tienduizend', 'Dan', 'Maar', 'En', 'Als', 'Wat', 'Wie', 'Hoe', 'Waar', 'Waarom', 'Daarom', 'Alleen', 'Weer', 'Eerst', 'Samen', 'Kom', 'Werk', 'Zonder', 'Sleutels', 'Spreek', 'Overdrijf', 'Dus']);

// ---------------------------------------------------------------------------------------------
// Kernfunctie. `scenes`: [{ id, minuten?, regie: [..], lines: [{ speaker, text, dur }] }] in speelvolgorde,
// met `at` (seconden sinds de start) per scène. Geeft per regel en per scène de nieuwe dingen.
// ---------------------------------------------------------------------------------------------
export function analyse(scenes, { lexicon = LEXICON, verwijzingen = VERWIJZINGEN, geschiedenis = VOORGESCHIEDENIS } = {}) {
  const kend = new Set();           // lexicon-id's die de speler al heeft gehoord of gezien
  const uitgelegd = new Set();      // id's waarvan de uitleg al geweest is
  const gezien = [];                // alle tekst die al getoond is (regie en regels), voor `needs`
  const out = [];
  const kinds = { persoon: 'namen', organisatie: 'namen', evenement: 'namen', voorwerp: 'namen', plek: 'plekken', term: 'jargon', figuur: 'figuren' };
  for (const sc of scenes) {
    const regieTekst = (sc.regie || []).join(' ');
    const scene = { id: sc.id, at: sc.at ?? 0, duur: 0, regels: [], namen: [], figuren: [], plekken: [], jargon: [], voorgeschiedenis: [], onverklaard: [], onbekend: [], leeg: [] };
    const regieMentions = new Set(lexicon.filter((e) => (e.regie || e.re).test(regieTekst)).map((e) => e.id));
    gezien.push(regieTekst);
    for (const e of lexicon) if (e.gloss && e.gloss.test(regieTekst) && regieMentions.has(e.id)) uitgelegd.add(e.id);
    let t = sc.at ?? 0;
    const sceneTekst = [regieTekst];
    for (const [idx, l] of sc.lines.entries()) {
      const regel = { speaker: l.speaker, text: l.text, at: t, dur: l.dur || 0, nieuw: [], voorgeschiedenis: [], onverklaard: [], onbekend: [], leeg: false };
      const nieuw = (e, hoe) => {
        if (kend.has(e.id)) return;
        kend.add(e.id);
        if (e.gratis) return;
        const k = kinds[e.kind] || 'namen';
        regel.nieuw.push({ id: e.id, soort: k, hoe });
        scene[k].push(e.id);
      };
      // een nieuwe stem is een nieuw personage
      const spk = lexicon.find((e) => e.speaker && e.speaker.toLowerCase() === String(l.speaker || '').toLowerCase());
      if (spk) nieuw(spk, 'stem');
      const text = l.text || '';
      const treffers = lexicon.filter((e) => e.re.test(text));
      for (const e of treffers) {
        // een uitleg in dezelfde regel telt als uitleg (de gloss mag voor of na de naam staan)
        const eerder = kend.has(e.id);
        nieuw(e, 'tekst');
        if (e.gloss) {
          const vooruit = sc.lines.slice(idx, idx + 4).map((x) => x.text).join(' ');
          if (uitgelegd.has(e.id) || e.gloss.test(text) || e.gloss.test(sceneTekst.join(' ')) || e.gloss.test(gezien.slice(-25).join(' ')) || e.gloss.test(vooruit)) uitgelegd.add(e.id);
          else if (!regieMentions.has(e.id)) {
            regel.onverklaard.push(`${e.id} (zonder uitleg)`);
            scene.onverklaard.push(`${e.id}: ${text}`);
          }
        }
        void eerder;
      }
      for (const v of verwijzingen) {
        if (!v.re.test(text)) continue;
        if (v.zelf) continue;
        if (!v.needs.test(gezien.join(' '))) {
          regel.onverklaard.push(v.uitleg);
          scene.onverklaard.push(`${v.id}: ${text}`);
        }
      }
      for (const g of geschiedenis) {
        const m = g.exec(text);
        if (m) regel.voorgeschiedenis.push(m[0]);
      }
      if (regel.voorgeschiedenis.length) scene.voorgeschiedenis.push(regel.voorgeschiedenis.join(' + '));
      // hoofdletterwoorden midden in een zin die het lexicon niet kent
      const spans = [];
      for (const e of lexicon) { const g = new RegExp(e.re.source, e.re.flags.includes('g') ? e.re.flags : e.re.flags + 'g'); for (const m of text.matchAll(g)) spans.push([m.index, m.index + m[0].length]); }
      for (const m of text.matchAll(/(?<=[a-zà-ÿ,;:"'] )([A-ZÀ-Ý][\p{L}â]+(?: [A-ZÀ-Ý][\p{L}â]+)*)/gu)) {
        const w = m[1].split(' ')[0];
        if (STOP_CAPS.has(w) || spans.some(([a, b]) => m.index >= a && m.index < b)) continue;
        regel.onbekend.push(m[1]);
        scene.onbekend.push(m[1]);
      }
      const nieuwTotaal = regel.nieuw.length;
      regel.leeg = regel.onverklaard.length > 0 || nieuwTotaal >= 3 || regel.onbekend.length > 0;
      if (regel.leeg) scene.leeg.push(text);
      gezien.push(text);
      sceneTekst.push(text);
      t += l.dur || 0;
      scene.regels.push(regel);
    }
    scene.duur = t - (sc.at ?? 0);
    out.push(scene);
  }
  return out;
}

// De onthullingsdichtheid: nieuwe dingen per minuut, in vensters van een minuut.
export function dichtheid(scenes) {
  const nieuw = [];
  for (const sc of scenes) for (const r of sc.regels) for (const n of r.nieuw) nieuw.push({ at: r.at, soort: n.soort });
  const eind = Math.max(0, ...scenes.map((s) => s.at + s.duur));
  const minuten = [];
  for (let m = 0; m * 60 < eind; m++) {
    const van = m * 60, tot = van + 60;
    const inDit = nieuw.filter((n) => n.at >= van && n.at < tot);
    const regels = scenes.flatMap((s) => s.regels).filter((r) => r.at >= van && r.at < tot);
    minuten.push({ minuut: m + 1, nieuw: inDit.length, regels: regels.length });
  }
  return minuten;
}

// De norm: geeft de overtredingen terug (lege lijst = voldoet).
export function toets(scenes, norm = NORM) {
  const fouten = [];
  const grens = norm.eersteMinuten * 60;
  for (const sc of scenes) {
    const n = sc.at >= grens ? { ...norm, ...norm.later } : norm;
    const kop = `${sc.id}`;
    if (sc.figuren.length > n.figurenPerScene) fouten.push(`${kop}: ${sc.figuren.length} figuren zonder naam (${sc.figuren.join(', ')}), norm ${n.figurenPerScene}`);
    if (sc.namen.length > n.namenPerScene) fouten.push(`${kop}: ${sc.namen.length} nieuwe namen (${sc.namen.join(', ')}), norm ${n.namenPerScene}`);
    if (sc.plekken.length > n.plekkenPerScene) fouten.push(`${kop}: ${sc.plekken.length} nieuwe plekken (${sc.plekken.join(', ')}), norm ${n.plekkenPerScene}`);
    if (sc.jargon.length > n.jargonPerScene) fouten.push(`${kop}: ${sc.jargon.length} jargon (${sc.jargon.join(', ')}), norm ${n.jargonPerScene}`);
    if (sc.voorgeschiedenis.length > n.voorgeschiedenisPerScene) fouten.push(`${kop}: ${sc.voorgeschiedenis.length} verwijzingen naar voorgeschiedenis (${sc.voorgeschiedenis.join(' | ')}), norm ${n.voorgeschiedenisPerScene}`);
    if (sc.onverklaard.length > n.onverklaardPerScene) fouten.push(`${kop}: onverklaard: ${sc.onverklaard.join(' | ')}`);
  }
  return fouten;
}

// ---------------------------------------------------------------------------------------------
// De echte data: script.json in speelvolgorde, met de HUD-teksten van de missies en een tijd.
// ---------------------------------------------------------------------------------------------
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

// Speelvolgorde. `speel` is de geschatte speeltijd in seconden tussen het einde van het vorige en het
// begin van dit blok (rijden, stunten, wachten); een schatting uit de missiedefinities, niet gemeten in het spel.
export const VOLGORDE = [
  { montage: true, speel: 0 }, { id: 'C00.2', speel: 0 }, { id: 'C00.3', speel: 0 },
  { id: 'M01.1', speel: 40 }, { id: 'M01.2', speel: 10 }, { hud: 'M01', speel: 5 },
  { id: 'M01.3', speel: 45 }, { id: 'M01.4', speel: 60 }, { id: 'M01.5', speel: 60 },
  { id: 'M01.6', speel: 60 }, { hud: 'M01.uit', speel: 0 },
  { id: 'R1.0', speel: 30 },
  { id: 'M02.1', speel: 20 }, { hud: 'M02', speel: 5 }, { id: 'M02.2', speel: 30 }, { id: 'M02.3', speel: 90 }, { hud: 'M02.uit', speel: 0 }, { id: 'M02.5', speel: 10 },
  { id: 'M03.1', speel: 45 }, { hud: 'M03', speel: 5 }, { id: 'M03.2', speel: 40 }, { id: 'M03.3', speel: 40 }, { id: 'M03.4', speel: 40 }, { hud: 'M03.uit', speel: 0 },
];

const readingTime = (text) => Math.max(2.2, Math.min(12, 1.3 + String(text || '').length * 0.058));

function manifests() {
  const out = {};
  for (const rec of ['lines', 'story', 'banter']) {
    const p = path.join(REPO, 'game', 'audio', 'voicelines', rec, 'manifest.json');
    out[rec] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  }
  return out;
}

// De tekstblokken van de missies (briefing, uitkomst) en het HUD-doel uit de missiedefinities en de stappen.
function hudBlokken() {
  const out = {};
  const bron = [
    ['M01', 'Nul krassen, vijftienhonderd punten', 'game/js/missions_nieuw.js'],
    ['M02', 'Even pinnen', 'game/js/missions_defs.js'],
    ['M03', 'Het Loket', 'game/js/missions_nieuw.js'],
  ];
  for (const [id, label, file] of bron) {
    const tekst = fs.readFileSync(path.join(REPO, file), 'utf8');
    const i = tekst.indexOf(`label: '${label}'`);
    if (i < 0) continue;
    const stuk = tekst.slice(i, i + 4000);
    const intro = /intro: (\[[\s\S]*?\]),\n/.exec(stuk);
    const outro = /outro: '((?:[^'\\]|\\.)*)'/.exec(stuk);
    out[id] = intro ? [].concat(new Function(`return ${intro[1]}`)()) : [];
    out[`${id}.uit`] = outro ? [outro[1].replace(/\\'/g, "'")] : [];
  }
  const lead = {};
  const stepsSrc = fs.readFileSync(path.join(REPO, 'game', 'js', 'storyarc_nieuw.js'), 'utf8');
  for (const id of ['M01', 'M02', 'M03']) {
    const m = new RegExp(`M\\('${id}',[\\s\\S]*?lead: \\['[A-Z]', '((?:[^'\\\\]|\\\\.)*)'\\]`).exec(stepsSrc);
    if (m) lead[id] = m[1].replace(/\\'/g, "'");
  }
  return { out, lead };
}

// De regels die de opening niet speelt (OPENING_CUT in cutscenes.js, #662): de meting telt wat de speler ziet.
function openingCut() {
  const src = fs.readFileSync(path.join(REPO, 'game', 'js', 'cutscenes.js'), 'utf8');
  const m = /const OPENING_CUT = \[([\s\S]*?)\];/.exec(src);
  return m ? [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]) : [];
}

// C00.1 zoals het spel het speelt: de trailermontage van intromontage.js (kaarten, geen stem). De Rikus-regels
// van C00.1 in het script zijn alleen de terugvalact (story.js startTrailer) en tellen dus niet mee.
function montageBlok() {
  const src = fs.readFileSync(path.join(REPO, 'game', 'js', 'intromontage.js'), 'utf8');
  const a = src.indexOf('const sun = {'), b = src.indexOf('const dateCard');
  const stuk = src.slice(a, b);
  const lines = [];
  for (const m of stuk.matchAll(/(im-title|im-tagline|im-kicker)">([^<$]+)<\/div>|tags: \[\[[^,]+, [^,]+, '([^']+)', '((?:[^'\\]|\\.)*)'\]\]/g)) {
    if (m[2]) lines.push({ speaker: 'kaart', text: m[2].trim(), dur: 2.6 });
    else lines.push({ speaker: 'kaart', text: m[4].replace(/\\'/g, "'"), dur: 2.6 });
  }
  return { regie: ['Trailermontage: zon op d\'Olle Grieze, fietsers, een meeuw met een frikandel, een werkboot, stilstaande beelden met de naamkaarten van Tessa en Tammo, flitsen vooruit (een duif bij het museum, een zwarte limousine, een tankwagen, een helikopter), de titelkaart.'], lines };
}

export function laadScenes() {
  const cut = openingCut();
  const script = readJson('game/storydata/script.json');
  const byId = new Map(script.scenes.map((s) => [s.id, s]));
  const man = manifests();
  const { out: hud, lead } = hudBlokken();
  const blokken = [];
  let at = 1.2;
  const duurVan = (l) => {
    const v = !l.textOnly && l.rec && man[l.rec] && man[l.rec][(l.voice || l.speaker) + '|' + l.text];
    return v ? Math.max(readingTime(l.text) * 0.6, v.dur + 0.35) + 0.12 : readingTime(l.text) + 0.12;
  };
  for (const v of VOLGORDE) {
    at += v.speel;
    if (v.montage) {
      const m = montageBlok();
      blokken.push({ id: 'C00.1 (trailermontage)', at, ...m });
      at += 40; // schatting: de twaalf trailershots (intromontage.js, maxShots 12)
    } else if (v.id) {
      const sc = byId.get(v.id);
      if (!sc) continue;
      const lines = sc.lines.filter((l) => l.channel !== 'app-stil' && !(/^C00\./.test(sc.id) && cut.some((t) => l.text.startsWith(t)))).map((l) => ({ speaker: l.speaker, text: l.text, dur: duurVan(l) }));
      blokken.push({ id: sc.id, at, regie: sc.regie || [], lines });
      at += lines.reduce((a, l) => a + l.dur, 0) + 0.9;
    } else {
      const tekst = hud[v.hud] || [];
      const kop = v.hud.endsWith('.uit') ? [] : lead[v.hud] ? [lead[v.hud]] : [];
      const lines = [...kop, ...tekst].map((text) => ({ speaker: 'HUD', text, dur: readingTime(text) + 0.3 }));
      blokken.push({ id: `HUD ${v.hud}`, at, regie: [], lines });
      at += lines.reduce((a, l) => a + l.dur, 0);
    }
  }
  return blokken;
}

// ---------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scenes = analyse(laadScenes());
  const minuten = dichtheid(scenes);
  const fouten = toets(scenes);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scenes, minuten, fouten }, null, 2));
  } else {
    const f = (s) => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
    console.log('scène           start  regels  namen plekken jargon geschiedenis onverklaard leeg');
    for (const s of scenes) {
      console.log(`${s.id.padEnd(15)} ${f(s.at).padStart(5)}  ${String(s.regels.length).padStart(6)}  ${String(s.namen.length).padStart(5)} ${String(s.plekken.length).padStart(6)} ${String(s.jargon.length).padStart(6)} ${String(s.voorgeschiedenis.length).padStart(11)} ${String(s.onverklaard.length).padStart(10)} ${String(s.leeg.length).padStart(4)}`);
      if (process.argv.includes('--regels')) {
        for (const r of s.regels) {
          const nw = r.nieuw.map((n) => n.id).join(',');
          const vlag = [r.onverklaard.length ? `ONVERKLAARD ${r.onverklaard.join('; ')}` : '', r.voorgeschiedenis.length ? `geschiedenis ${r.voorgeschiedenis.join('; ')}` : '', r.onbekend.length ? `onbekend ${r.onbekend.join('; ')}` : ''].filter(Boolean).join(' | ');
          console.log(`   ${r.leeg ? '!' : ' '} ${f(r.at)} ${String(r.speaker).padEnd(14)} ${r.text.slice(0, 70).padEnd(70)} ${nw ? '+' + nw : ''} ${vlag}`);
        }
      }
    }
    console.log('\nonthullingsdichtheid (nieuwe dingen per minuut):');
    console.log(minuten.map((m) => `min ${m.minuut}: ${m.nieuw} nieuw, ${m.regels} regels`).join('\n'));
    const eerste = minuten.slice(0, NORM.eersteMinuten);
    console.log(`eerste ${NORM.eersteMinuten} minuten: ${eerste.reduce((a, m) => a + m.nieuw, 0)} nieuwe dingen, ${eerste.reduce((a, m) => a + m.regels, 0)} regels`);
    const alleLeeg = scenes.flatMap((s) => s.leeg.map((t) => `${s.id}: ${t}`));
    console.log(`regels waar een nieuwe speler weinig aan heeft: ${alleLeeg.length}`);
    for (const t of alleLeeg) console.log('  ! ' + t.slice(0, 120));
    console.log(fouten.length ? `\nnorm overschreden (${fouten.length}):\n` + fouten.map((x) => '  - ' + x).join('\n') : '\nnorm gehaald');
  }
}
