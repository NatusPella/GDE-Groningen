#!/usr/bin/env node
// Builds docs/verhaal/nieuw/HET-VERHAAL.md (the whole story as one screenplay) from the 09 scripts.
//   node scripts/build_screenplay.mjs
// Source of truth: docs/verhaal/nieuw/09-script-akte1..5.md. The tags [BEHOUDEN]/[NIEUW] are dropped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs/verhaal/nieuw/', import.meta.url));

const LEESWIJZER = `LEESWIJZER

1. Dit is het hele verhaal als filmscript, van de opening tot de epiloog, in de volgorde waarin het gespeeld wordt.
2. \`# AKTE n: titel\` is een akte; het verhaal heeft er vijf.
3. Elke scène begint met een scènekop in hoofdletters: INT. of EXT., de plaats, het dagdeel en het missie-id tussen blokhaken, bijvoorbeeld [M03]. [C] is de opening, [T] een reisscène, [R] de radio, [B] autogesprekken, [A] appjes, [E] epiloog.
4. Gewone regels zijn handeling in de tegenwoordige tijd: wat we zien en wat de speler doet. Een regel die met "Gameplay:" begint, beschrijft wat de speler speelt.
5. Een naam in hoofdletters op een eigen regel is wie er spreekt; de regel eronder is de tekst.
6. (V.O. radio) is een stem uit de radio (het nachtprogramma Nachtstreek, dat alleen de wereld vertelt en nooit tijdens een missie praat); (V.O. telefoon) is een stem aan de telefoon.
7. (app, stil) is een appje: alleen tekst, niet voorgelezen.
8. Tussen haakjes achter een scènekop staat soms een markering, zoals (DE EERSTE KUS), (HET DIEPTEPUNT) of (DE FINALE).
9. SNIJ NAAR: en FADE OUT. zijn overgangen, alleen waar ze helpen.
10. Alles is Nederlands; Gronings en Fries komen alleen kort en zorgvuldig voor (Grunn, Ljouwert, Moi). Alle namen en bedrijven zijn verzonnen; de plaatsen zijn echt.
`;

const TITELBLAD = `TITEL: GDE GRONINGEN - ZOMER VOL MISDAAD
(werktitel van het verhaal: ALLES VOOR ÉÉN EIERBAL)

een game van NatusPella

LOGLINE: Twee Stadjers zonder geld willen een frietwagen laten staan op de enige standplaats van Grunn, en moeten daarvoor de Noordelijke Snackprijs winnen. Een Friese snackbaron koopt plakje voor plakje de hele markt op om dat te voorkomen, en hij heeft de Gouden Eierbal echt uit het museum gehaald: vóór hen. Over de hele provincie, in twee weken, tegen een jury, een bal en een droge woordenwisseling in, tot zijn eigen moeder hem de bal afneemt en de beste eierbal wint.

HET DOEL: Op 28 augustus de Noordelijke Snackprijs winnen. Dan krijgt de Fjord Frituur, de blauwe frietwagen van Tessa en Tammo, de enige vrije standplaats van Grunn.

HET MOTIEF: Tessa heeft nooit lang ergens gewoond en wil een thuis met wielen. Tammo wil bij haar blijven maar zegt het niet. De huur is te hoog en de bank vond het plan sympathiek, wat nee betekent.

DE TEGENSTANDER: Jelle Terpstra van Us Mem Snacks, een ijdele Friese snackbaron die eerst kil en zakelijk is en nooit gemeen. Hij wil zijn moeder Gerda de Gouden Eierbal geven, die zij in 1953 net miste, en koopt daarvoor alles op wat een eierbal nodig heeft: standplaatsen, vet, eieren, zout, haven, bloem, jury, mosterd en tot slot de bewaarder van de bal. Zijn moeder wil dat helemaal niet.

DE TWIST: Het kaartje in de lege vitrine zegt "Tige tank! – J." en het is van Jelle zelf: hij schrijft overal een bedankje onder, dat leerde zijn moeder hem. Hij heeft de bal echt gestolen, op 12 augustus, vóór Tessa en Tammo, en zijn claim op de radio is waar. In Bourtange neemt zijn moeder Mem de bal van hem af, met Oma Trijntje en Berends bakkie, om hem te stoppen. Tessa en Tammo houden de bal vast onder druk van Jelles beleggers; daarna raken ze hem, de wagen en elkaar kwijt, tot de knuffel in Tinus' schuur. In de finale is de bal geen derde roof: de beste eierbal wint de standplaats, en de Gouden Eierbal gaat terug naar het museum.

PERSONEN

TAMMO: de held, een echte Stadjer uit het Oosterpark. Droog, kort, understatement; zegt wat telt in weinig woorden, en wordt alleen langer in drie grote momenten. Zegt niks, en leert vijf woorden: "Ik wil bij jou blijven". Eigenwijs en vaak fout ("Dat bedoelde ik ook.").
TESSA: de heldin en de baas van het duo. Ze is Nederlands, niet Gronings: ze groeide op op zeven plekken en logeerde elke zomer in Ljouwert naast Mem, daarom kent ze Friezen. Tammo vindt dat gek. Snel, ad rem, standaard Nederlands. Heeft vaak gelijk en is soms wat saai ("Rijden, niet praten."). Vertaalt Tammo's gezicht.
RIKUS: nacht-dj van het radioprogramma Nachtstreek en jeugdvriend. Warm en droog. De radio vertelt alleen de wereld, nooit de briefing van een missie, en duidt de relatie niet.
JELLE TERPSTRA: de tegenstander. Nederlands met Friese woorden; kil en zakelijk, elke zin is reclame of een contract; "foar mem" komt pas langzaam boven.
MEM (GERDA) TERPSTRA: Jelles moeder, 91. Stellig, Fries getint. Wil dat hij ophoudt. Appt Tessa. Neemt de bal van hem af.
OMA TRIJNTJE: Tammo's oma, 92, bakte in 1953 de beste eierbal (volgens haarzelf). Warm en stellig.
MEVROUW TUINSTRA: de bewaarder van de Gouden Eierbal, bij traditie voorzitter van de jury. Beleefd, oud, formeel. Door Jelle met een treinreis aan de kant gezet.
DURK EN DOUWE: Jelles tweeling van reuzen, traag en synchroon. "…Hè."
BEREND BOS: Bommen Berend, nors, jurylid en getaway-chauffeur. "Nul krassen."
Verder: Bert (duivenmelker), Sjabbe (pandhouder en telefoonstem), Sjoerd (Kiezelcommissie), Henk (garage), Jelmer (streamer), Geert (kroegbaas), Dokter Dijkstra (UMCG), de torenwachter ("Ik meld alleen."), en de bondgenoten van Oma: Geesje (kosteres), Kapitein Klaas, Lammert (havenmeester), Roelfien (graanboerin en vlieger), Wubbo (brugwachter) en Tinus (trekkertrekker).
`;

const AKTE = {
  1: ['Moi, Grunn', 'Stad, vrijdag 14 tot maandag 17 augustus. Kiezelweek: studenten met polsbandjes, lange zomeravonden, wind tegen. Tessa en Tammo willen een frietwagen laten staan op de enige vrije standplaats van Grunn; daarvoor moeten ze de Noordelijke Snackprijs winnen. Een Fries in een blauw colbert koopt plakje voor plakje de hele markt op, kil en zakelijk. De romantiek begint als vriendschap, plagen, een lange blik en een hand in het donker.'],
  2: ['Het Noorden is groot', 'Stad, Hogeland en de Waddenzee, dinsdag 18 tot donderdag 20 augustus. Jelle koopt vet, eieren en zout, en grijpt actief in: een weg dichtgekocht, een boer gehuurd, een hinderlaag op de wierde. Oma Trijntje stuurt Tessa en Tammo langs haar oude vrienden. Jelle heeft de bal echt, in een gouden koffer.'],
  3: ['Aan de Eems', 'Eemsdelta en Oldambt, vrijdag 21 tot zondag 23 augustus. Het koopboek, de haven, de dijk, de kermis. Jelle houdt de bloem en de standplaatsen, de jury loopt gedeeltelijk weg, en op de kermis verraadt Durk waar de bal zit. Aan het eind: de eerste kus.'],
  4: ['Zuidwaarts', 'Veenkoloniën, Westerwolde en het Westerkwartier, maandag 24 tot woensdag 26 augustus. Het bewijs dat Jelle de bal eerder nam, een trein zonder machinist, en het Beleg van Bourtange, waar Mem de bal van haar zoon afneemt. Dan breekt het dieptepunt los, in twee solodelen.'],
  5: ['Ontzet', 'Westerkwartier en Stad, woensdag 26 augustus tot vrijdag 28 augustus, en twee weken later. Herstel, een luik, een colonne van alle vrienden, een vlag aan de toren, een bod dat tegenvalt. Op 28 augustus is er een echte wedstrijd: bakken, een blokkade met de wagen, een jury die stemt, en vijf woorden.'],
};

const MARKERS = {
  'C00.1': 'OPENING', 'M06.1': 'DE DREMPEL', 'M06.3': 'DE LEGE VITRINE', 'M16.4': 'DE EERSTE KUS',
  'M20.1': 'HET BELEG', 'M20.5': 'HET DIEPTEPUNT', 'M21.1': 'HET DIEPTEPUNT, TWEE SOLODELEN', 'M22.4': 'DE KNUFFEL EN DE OPENBARING',
  'M26.1': 'DE FINALE', 'M26.7': 'DE VIJF WOORDEN', 'E1': 'EPILOOG', 'E2': 'SLOT',
  'M20.3': 'MEM NEEMT DE BAL AF', 'M12.3': 'DE AKTETAS', 'M05.2': 'DE EERSTE LANGE BLIK', 'M06.0': '',
  'M11.6': 'DE LANGE BLIK', 'M26.4': 'DE BLOKKADE',
};
const REGIONS = new Set(['Stad', 'Hogeland', 'Waddenzee', 'Eemsdelta', 'Oldambt', 'Veenkoloniën', 'Westerwolde', 'Westerkwartier']);
const INT_RE = /keuken|kamer|loket|binnen|kruitkelder|kerkkelder|schuur|kantoor|wiebelwerk|pand & poen|kraankooi|café|studio|oma's|woonschip|flat|servers|salon|kelder|spuit|tent|groninger museum$|groninger museum,/i;
const NIGHT_RE = /zonsondergang|zonsopgang|middernacht|nacht|avond|ochtend|middag|half acht|kwart voor drie|tien uur|twaalf uur/;

function dagdeel(text) {
  const t = text.toLowerCase().replace(/nachtstreek/g, '');
  if (/zonsondergang/.test(t)) return 'ZONSONDERGANG';
  if (/zonsopgang/.test(t)) return 'ZONSOPGANG';
  if (/middernacht|nacht|bijna twaalf uur/.test(t)) return 'NACHT';
  if (/avond/.test(t)) return 'AVOND';
  if (/ochtend|half acht|vroege ochtend/.test(t)) return 'OCHTEND';
  if (/middag|kwart voor drie|tien uur|twaalf uur/.test(t)) return /tien uur/.test(t) ? 'OCHTEND' : 'MIDDAG';
  return null;
}

function slugPlace(plaats) {
  const parts = plaats.split(',').map((p) => p.trim()).filter(Boolean);
  let region = '';
  if (parts.length && REGIONS.has(parts[0])) region = parts.shift();
  const specific = parts.map((p) => p.replace(/^(de|het|een) /i, '').toUpperCase());
  const tail = region === 'Stad' || region === '' ? 'GRUNN' : region.toUpperCase();
  if (!specific.length) return tail;
  return specific.join(', ') + (tail === 'GRUNN' && region === '' ? '' : ', ' + tail);
}

function cue(label) {
  let m = label.match(/^APP ([A-ZÄËÏÖÜ0-9 .'’\/&-]+)→([A-ZÄËÏÖÜ0-9 .'’\/&-]+) \(stil\)$/);
  if (m) return `${m[1].trim()} (app, stil)`;
  m = label.match(/^(.+?) \(radio\)$/);
  if (m) return `${m[1]} (V.O. radio)`;
  m = label.match(/^(.+?) \(telefoon\)$/);
  if (m) return `${m[1]} (V.O. telefoon)`;
  return label;
}

const CUTS = new Set(['M06.3', 'M20.3', 'M21.4', 'M26.4', 'M26.7']);
const DP = { T1: 'MIDDAG', T2: 'OCHTEND', T3: 'OCHTEND', T4: 'AVOND', 'M26.1': 'OCHTEND', E1: 'MIDDAG', E2: 'NACHT' };
const SLUG = {
  'C00.2': 'INT. KEUKEN, OOSTERPARKWIJK, GRUNN',
  'C00.3': 'EXT. PADDEPOEL, GRUNN',
  'M04.2': 'EXT. MUSEUM, GRUNN (VANUIT DE LUCHT)',
  'M07.2': 'EXT. ONDERWEG NAAR DE OOSTERPOORT, GRUNN',
  'M10.2': 'EXT. KERKENPAD, HOGELAND',
  'M10.4': 'EXT. BUSHALTE, UITHUIZEN',
  'M26.2': 'EXT. GROTE MARKT, GRUNN, DE JURYTAFEL',
  'M26.4': 'EXT. OUDE BOTERINGESTRAAT, GRUNN',
  'M26.5': 'EXT. OUDE BOTERINGESTRAAT, GRUNN',
  'M20.5': 'EXT. PARKEERPLAATS, BOURTANGE',
  'M26.8': 'INT. TELEFOON',
  E2: 'INT. NACHTSTREEK, STUDIO',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const LINE = /^([A-ZÄËÏÖÜ][A-ZÄËÏÖÜ0-9 .'’\/&→-]*?(?: \([^)]*\))?): (.+?)(?: \[(?:BEHOUDEN|NIEUW)\])?\s*$/;

let out = LEESWIJZER + '\n' + TITELBLAD;
let lastDay = 'DAG';
let sceneCount = 0;

for (let act = 1; act <= 5; act++) {
  const src = fs.readFileSync(path.join(root, `09-script-akte${act}.md`), 'utf8').split(/\r?\n/);
  out += `\n# AKTE ${act}: ${AKTE[act][0]}\n\n${AKTE[act][1]}\n`;
  let i = 0;
  let skip = false;
  while (i < src.length) {
    const raw = src[i++];
    const h = raw.match(/^## \[([^\]]+)\] (.*)$/);
    if (!h) continue;
    const id = h[1];
    const rest = h[2].split(' – ');
    const title = rest[0].trim();
    const plaats = (rest[1] || '').trim();
    const vehicle = (rest[2] || '').trim();
    // collect the body of the scene
    const body = [];
    while (i < src.length && !src[i].startsWith('## [')) body.push(src[i++]);
    if (/: herhaling$/.test(title) || /^S01\b/.test(id)) continue;
    const regie = body.filter((l) => l.startsWith('(regie:')).join(' ');
    const base = id.replace(/\.\d+[a-z]?$/, '');
    const isRadio = /^R\d/.test(id);
    const isApp = /^A\d/.test(id);
    const isBanter = /^B\d/.test(id) || /^Autogesprek/.test(title);
    // day part
    let dp = DP[id] || DP[base] || dagdeel(`${title} ${regie}`);
    if (isRadio) dp = dp || 'NACHT';
    else if (isApp || isBanter) dp = 'DAG';
    else dp = dp || lastDay;
    if (!isRadio) lastDay = dp;
    // INT/EXT and place
    let slug;
    if (isRadio) slug = `INT. NACHTSTREEK, STUDIO - ${dp}`;
    else if (isApp) slug = `INT. TELEFOON - ${dp}`;
    else if (SLUG[id]) slug = `${SLUG[id]} - ${dp}`;
    else if (/^B\d/.test(id) || /^Autogesprek/.test(title)) slug = /te voet/i.test(vehicle) ? `EXT. ONDERWEG - ${dp}` : /Escapade/i.test(vehicle) ? `INT. ESCAPADE, ONDERWEG - ${dp}` : `INT. ONDERWEG - ${dp}`;
    else {
      const place = slugPlace(plaats);
      const intExt = /^(M06\.2|M06\.3|C00\.2)$/.test(id) || /meerijden|telefoon/.test(vehicle) || (INT_RE.test(plaats) && !/kade|perron|poort|wallen|gracht|parkeerplaats|overweg|dijk|helidek|platform/i.test(plaats)) ? 'INT.' : 'EXT.';
      slug = `${intExt} ${place} - ${dp}`;
    }
    const idShown = `[${isRadio ? id.match(/^R\d+/)[0] : isApp ? id.match(/^A\d+/)[0] : /^B\d/.test(id) ? id : /^[CMTE]\d/.test(id) ? base : base}]`;
    const marker = MARKERS[id] ? ` (${MARKERS[id]})` : (isBanter ? ' (AUTOGESPREKKEN)' : isApp ? ' (APPJES)' : /^T\d/.test(id) ? ' (REISBEAT)' : '');
    if (CUTS.has(id)) out += '\nSNIJ NAAR:\n';
    out += `\n${slug} ${idShown}${marker}\n`;
    sceneCount++;
    // body lines
    for (const l of body) {
      const rm = l.match(/^\(regie: (.*)\)$/);
      if (rm) {
        let t = rm[1].trim();
        const g = t.split(/Gameplay:\s*/);
        const before = g[0].trim();
        if (before) out += `\n${cap(before)}\n`;
        if (g.length > 1) out += `\nGameplay: ${g.slice(1).join(' ').trim().replace(/\.?$/, '.')}\n`;
        continue;
      }
      const m = l.match(LINE);
      if (!m) continue;
      out += `\n${cue(m[1])}  \n${m[2]}\n`;
    }
  }
  out += `\nFADE OUT.\n`;
}

fs.writeFileSync(path.join(root, 'HET-VERHAAL.md'), out);
console.log(`HET-VERHAAL.md: ${sceneCount} scènes, ${out.length} tekens`);
