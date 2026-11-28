// Schrijft docs/verhaal/FILMSCRIPT-21-11.md: het verhaal als filmscript. Bron van waarheid voor de scènes blijft
// docs/verhaal/nieuw/09-script-akte*.md (via game/storydata/script.json); dit bestand wordt daaruit gegenereerd en bevat de
// handgeschreven delen (logline, synopsis, beat sheet per akte, rolverdeling en muziekmomenten) uit de tabellen hieronder.
// Per scène: slugline (BINNEN/BUITEN - plaats - tijd van de dag), de eerste actieregel (regie), wie er praat, welke stap van het
// spel de scène uitvoert en of de scène gespeeld of een cutscene is. Een scènebord (personage x scène) staat achteraan.
//   node scripts/filmscript_export.mjs [--check]
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('game/storydata/script.json', root), 'utf8'));
const { STEPS, PARTS } = await import('../game/js/storyarc.js');
const { BRIDGES } = await import('../game/js/storyarc.js');

// de logline van de hoofdstuklijn (bijbel 28-11, 01 sectie 1); de synopsis en de beat sheet per akte hieronder beschrijven nog de oude akte-opzet en worden per hoofdstuk herschreven (zie de lijst H4 tot en met H16 in het eindrapport van #1368 tot en met #1370)
const LOGLINE = 'Twee net afgestudeerde vrienden uit Groningen weten niet wat ze willen worden, maar wel dat ze elkaar niet kwijt willen. Over één zomer proberen ze alles: de boerderij van een oom, een dorpsvoetbalclub, een taxidienst, een rondvaartboot. Ondertussen krijgen ze brieven van een bureaucratische Friese snackbaron, met kenmerken en bezwaartermijnen. Pas als alles wat ze leerden samenkomt, bouwen ze iets wat alleen zij kunnen: een snackwagen met een eigen standplaats.';
const SYNOPSIS = [
  'Vrijdag 14 augustus, Grunn. Tammo en Tessa verhuizen als huisgenoten naar Paddepoel. Geen baan, geen plan, wel de angst dat na de studie iedereen een eigen kant op gaat. Een wedstrijd (de Noordelijke Snackprijs) en een gouden eierbal zijn het eerste gedeelde project; Jelle Terpstra, een lange, rijke, bureaucratische Fries met een klomp vol contant geld, wint intussen met regels, vergunningen en trucs, "foar mem".',
  'Door het Noorden proberen ze baantjes en loopbanen: Tammo rijdt, Tessa heeft de boerderij, de kermis en later het voetbal. In sommige dingen zijn ze elkaars redding, in andere kunnen ze niet samenwerken. Onderweg zien ze hoe lief de ander voor andere mensen is, en dat is waar het van gaat. Na een misverstand en een herstel (de knuffel) vallen de stukjes: een snackwagen, voor haar de snacks, voor hem het rijden en de plek naast haar.',
  'Op de Grote Markt winnen ze het Ontzet met de beste eierbal, een eerlijke wagen en de vrienden die ze onderweg hielpen; Tammo zegt zijn vijf woorden, en ze worden een stel. Daarna is er geen einde maar een open wereld: de wagen laten groeien, standplaatsen overnemen en het snackimperium van Jelle uitdagen, terwijl alle loopbanen openblijven.',
].join('\n\n');

// beat sheet per hoofdstuk (de nieuwe lijn, bijbel 28-11, 01 sectie 4.3): alleen H1 tot en met H3 zijn al uitgewerkt; H4 tot en met H16 volgen met hun bouwronde
const HOOFDSTUKKEN = [
  { h: 'H1 Verhuisdag', open: 'De keuken in de Oosterparkwijk, een bierviltje met een blauwe wagen; daarna de verhuizing naar de flat in Paddepoel.', vraag: 'Raak je elkaar kwijt als alles verandert?', katalysator: 'Geld nodig: een bakkie, een bord Vrije standplaats op de Vismarkt en de radiospot van Us Mem Snacks.', keerpunt: 'Berend, nul krassen, de eerste euro\'s en een Fries met een klomp.', slot: 'Half drie, een pannetje friet: Tessa wil dit elke nacht, voor mensen die nog wakker zijn. Mijlpaal: de eerste regel van "Wat weten we?" (ze willen elkaar niet kwijt).', stappen: ['M00', 'h1-vismarkt', 'M01', 'N1', 'N3', 'W1'] },
  { h: 'H2 De straat', open: 'De gang op de elfde verdieping: Veldkamp, een duif en een vraag ("Zijn jullie al…?").', vraag: 'Wie is hier de baas van de straat?', katalysator: 'De eerste brief: J. Terpstra, voorzitter van de Commissie Standplaatsen Noord.', keerpunt: 'Het Loket: Jelle stempelt zelf het werkbewijs, "Bezwaar: zes weken. Helaas drie dagen."', slot: 'Het werkbewijs is binnen; Jelle is een naam, een stem en een bureaucraat. Mijlpaal: formulier 14-B ingeleverd.', stappen: ['N2', 'h2-scooters', 'J1', 'h2-bon', 'M02', 'N4', 'M03'] },
  { h: 'H3 De stad is een derde hoofdpersoon', open: 'De Grote Markt, een koperen bel: de stadsomroeper leest een besluit voor.', vraag: 'Waar hoort de stad bij jou, en jij bij de stad?', katalysator: 'Bert en zijn duiven geven de stad van boven; een fietsrace en een middag op het terras.', keerpunt: 'De Kiezelweek, vijf jaar geleden: de "Oma van de straat" is Tessa\'s oma.', slot: 'De avond bij Oma Trijntje aan de Noorderhaven: 1953, de Snackprijs en een gerecht van vijf ingrediënten, vijf vrienden. Mijlpaal: de kaart van de Stad is open.', stappen: ['h3-omroeper', 'h3-bert', 'M05', 'N10', 'h3-kiezelweek', 'N8'] },
];

// beat sheet per akte: [deel]: { beeld, vraag, katalysator, keerpunt, midpoint, verloren, climax, slotbeeld }
const BEATS = {
  kop: { open: 'D\'Olle Grieze bij zonsopgang; een keukentafel met een bierviltje en een huurbrief.', vraag: 'Wat doe je met je leven als je net bent afgestudeerd, en raak je elkaar kwijt?', katalysator: 'De bank zegt nee; een wedstrijd en een standplaats zijn de enige weg.', keerpunt: 'Het Loket: Jelle koopt de rij en de standplaatsen.', midpoint: 'Ze besluiten de Gouden Eierbal eerst te pakken, "dan liever wij".', verloren: 'De vitrine is leeg: "Tige tank! – J."', climax: 'De kraak in het museum (drie minuten zonder camera).', slot: 'De lege vitrine op het kussen; Jelle is een stap voor.' },
  romp: { open: 'Oma Trijntjes keuken aan de Noorderhaven.', vraag: 'Hoe win je eerlijk als de ander alles opkoopt?', katalysator: 'Oma Trijntje: het recept van 1953 met vijf ingrediënten van vijf vrienden.', keerpunt: 'Tessa de boerendochter: haar kennis haalt het recept binnen.', midpoint: 'De zandplaat onder de sterren: een lange blik.', verloren: 'Jelle koopt de eieren, het zout en het vet; het recept lijkt verloren.', climax: 'De sloot: Jelle laat zijn hart zien ("Mem wil niks. Daarom doe ik het").', slot: 'Dijkstra\'s belletje: het koopboek is de haak.' },
  staart: { open: 'Jelle legt zijn koopboek zelf uit (radio, ballon).', vraag: 'Kun je een tegenstander stoppen die alles koopt?', katalysator: 'Het koopboek: acht plakjes, "Foar mem" met een hartje.', keerpunt: 'Lammerts havenkantoor: hun eerste eigen stek.', midpoint: 'De dijk: een race, een "Moi... Moi".', verloren: 'De jury lijkt gekocht.', climax: 'De kermis en de kus in de botsauto, daarna alsof er niets was.', slot: 'Durk verklapt dat Jelle met de bal naar Veendam rijdt.' },
  zuid: { open: 'Wubbo en elf bruggen, één ritme.', vraag: 'Wat doe je als je bewijs hebt dat niemand wil horen?', katalysator: 'Het logboek: Jelle had de bal vier dagen voor de kraak al.', keerpunt: 'Berend legt de juryregel uit; de vrienden van Oma twijfelen.', midpoint: 'Mem neemt de bal van Jelle af in de kruitkelder (de beste onthulling van het spel)', verloren: 'Een misverstand tussen de twee: hij zwijgt, zij zwijgt (zoet, geen drama), de auto staat op een trein.', climax: 'De auto terughalen, solo, en de vrienden bijeenhouden.', slot: 'Beiden onderweg naar Tinus\' schuur: weer samen.' },
  ontzet: { open: 'De schuur van Tinus: de knuffel en het luik in de Escapade.', vraag: 'Durf je te zeggen wat je wilt?', katalysator: 'Het luik zit erin: dit is de snackwagen.', keerpunt: 'De colonne van Oma\'s vrienden rijdt mee.', midpoint: 'De rekening van Jelle: hij is bang.', verloren: 'Jelle laat zich bij de notaris inschrijven.', climax: 'Het Ontzet: de beste eierbal, Jelles eigen vergunning, de vijf woorden en de kus.', slot: 'De rij loopt tot de Korenbeurs; een foto, een bord.' },
  nazomer: { open: 'Willemien in Loppersum.', vraag: 'Wat doe je met wat je hebt?', katalysator: 'Willemien is vaste klant en vraagt hulp bij haar verbouwing.', keerpunt: 'Het proefbeleg in Bourtange: Berend wint en vindt dat verkeerd.', midpoint: 'Dansen op het erf: "Voor de grip".', verloren: 'n.v.t. (warm en stil)', climax: 'De uitnodiging voor de open wereld (M30).', slot: 'Wat nu: de wagen groeit, de wereld staat open.' },
};
// muziekmomenten (een latere muziekronde; alleen verzonnen artiesten en eigen nummers)
const MUZIEK = {
  kop: 'Openingsthema (warm, licht, een toeter); Rikus draait een verzonnen nachtnummer; stilte bij de lege vitrine.',
  romp: 'Oma\'s keukenthema (accordeon); een stille zandplaat; het sloot-thema van Jelle (een klompendans in mineur).',
  staart: 'Het koopboek-thema (bureaucratische marsmuziek); kermismuziek; een zachte stilte na de kus.',
  zuid: 'Bruggenritme (elf slagen); een stoomtreinmars; de kruitkelder (alleen een druppel).',
  ontzet: 'De knuffel (piano); de colonne (blaaskapel van Oma\'s vrienden); de vijf woorden (stilte, dan een enkel akkoord).',
  nazomer: 'Rikus\' nummer zonder praatje; het erf (dansmuziek, eigen nummer); het slotthema.',
};

const sceneById = new Map(data.scenes.map((s) => [s.id, s]));
const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
function slugline(sc) {
  const first = clean((sc.regie && sc.regie[0]) || '');
  const inside = /(flat|keuken|kantoor|huis|binnen|loket|kelder|museum|schuur|café|studio|trein|bus|auto|wagen|woonschip|zaal|keuken)/i.test(sc.vehicle + ' ' + first.slice(0, 200)) && !/(buiten|straat|markt|dijk|veld|haven|kade|plein)/i.test(first.slice(0, 80));
  const tijd = /nacht|middernacht|twaalf uur 's nachts/i.test(first) ? 'NACHT' : /avond/i.test(first) ? 'AVOND' : /ochtend|zonsopgang|vroege ochtend/i.test(first) ? 'OCHTEND' : /middag/i.test(first) ? 'MIDDAG' : 'DAG';
  return `${inside ? 'BINNEN' : 'BUITEN'} – ${(sc.region || '').toUpperCase() || 'ONBEKEND'} – ${tijd}`;
}
const playerOf = (stepId) => { const s = STEPS.find((x) => x.id === stepId); return s && s.player === 'anita' ? 'Tessa' : 'Tammo'; };

const L = [];
L.push('# Filmscript (21-11)');
L.push('');
L.push('Gegenereerd door `node scripts/filmscript_export.mjs` uit `game/storydata/script.json` (bron: `docs/verhaal/nieuw/09-script-akte*.md`); wijzig scènes in de bron en bouw opnieuw. De handgeschreven delen (logline, synopsis, beat sheet, muziek) staan in het script dat dit bestand maakt. Het script leidt de ruggengraat ([verhaal/RUGGENGRAAT.md](RUGGENGRAAT.md)), de relatie-bijbel ([../VERHAAL-RELATIE-21-11.md](../VERHAAL-RELATIE-21-11.md)), het tempoplan ([../VERHAAL-TEMPO-21-11.md](../VERHAAL-TEMPO-21-11.md)) en de cutscene-regie (regie-bijbel docs/CUTSCENE-REGIE-21-11.md). Personagekaarten: docs/PERSONAGES-DOSSIERS-21-11.md.');
L.push('');
L.push('**Samen spelen (rolverdeling):** elke speler is lokaal de hoofdpersoon die de stap nodig heeft (Tammo of Tessa, kolom "Speler-protagonist") en ziet de ander als partner-NPC met het andere personage; de andere speler is voor hem die NPC. Een cutscene draait lokaal per speler met de lokale protagonist; een gast ziet de scène als data en slaat hem lokaal over zonder de host te stoppen. Aanspreekvormen in de dialoog zijn dus altijd "jij" tegen het partnerpersonage.');
L.push('');
L.push('## Logline');
L.push('');
L.push(LOGLINE);
L.push('');
L.push('## Synopsis');
L.push('');
L.push(SYNOPSIS);
L.push('');
L.push('## Beat sheet per hoofdstuk (nieuwe lijn)');
L.push('');
L.push('De hoofdstukken H1 tot en met H3 zijn het nieuwe begin (bijbel 28-11); de aktes hieronder beschrijven de rest nog zoals de oude opzet. H4 tot en met H16 en de nazomer volgen met hun bouwronde. In het spel staat M04 (Kieken van boven) en M06 (de kraak) voorlopig nog direct na H3; ze verhuizen naar H12.');
L.push('');
L.push('| Hoofdstuk | Openingsbeeld | Thema-vraag | Katalysator | Keerpunt | Slotbeeld en mijlpaal | Stappen |');
L.push('|---|---|---|---|---|---|---|');
for (const c of HOOFDSTUKKEN) L.push(`| ${c.h} | ${c.open} | ${c.vraag} | ${c.katalysator} | ${c.keerpunt} | ${c.slot} | ${c.stappen.join(', ')} |`);
L.push('');
L.push('## Beat sheet per akte');
L.push('');
L.push('| Akte | Openingsbeeld | Thema-vraag | Katalysator | Keerpunt | Midpoint | Dieptepunt | Climax | Slotbeeld |');
L.push('|---|---|---|---|---|---|---|---|---|');
for (const [p, b] of Object.entries(BEATS)) L.push(`| ${PARTS[p].title} | ${b.open} | ${b.vraag} | ${b.katalysator} | ${b.keerpunt} | ${b.midpoint} | ${b.verloren} | ${b.climax} | ${b.slot} |`);
L.push('');
L.push('## Muziekmomenten (voor een latere muziekronde)');
L.push('');
for (const [p, m] of Object.entries(MUZIEK)) L.push(`- **${PARTS[p].title}:** ${m}`);
L.push('');
L.push('## Sequenties en scènes');
L.push('');
const speaker = new Map();
for (const part of Object.keys(PARTS)) {
  L.push(`### ${PARTS[part].title}`);
  L.push('');
  for (const st of STEPS.filter((s) => s.part === part)) {
    const own = data.scenes.filter((sc) => sc.step === st.id);
    L.push(`**Sequentie ${st.id}: ${st.title}** (${st.kind === 'mission' ? 'missie ' + (st.mission || '') : 'activiteit'}; speler-protagonist ${playerOf(st.id)})`);
    L.push('');
    for (const sc of own) {
      const who = [...new Set(sc.lines.filter((l) => l.channel !== 'app-stil').map((l) => l.speaker))];
      for (const w of who) { const s = speaker.get(w) || new Set(); s.add(sc.id); speaker.set(w, s); }
      const gespeeld = sc.kind === 'bridge' ? 'overgangsscène (BRIDGES)' : sc.kind === 'banter' ? 'autogesprek' : sc.kind === 'radio' ? 'radio' : sc.kind === 'app' ? 'appjes' : ['intro', 'outro', 'key', 'opening', 'epilogue'].includes(sc.kind) ? 'cutscene of gespeeld in de missie' : sc.kind;
      L.push(`- **${sc.id}** ${slugline(sc)} · ${sc.title} · ${gespeeld}`);
      if (sc.regie && sc.regie[0]) L.push(`  - ${clean(sc.regie[0]).slice(0, 220)}`);
      if (who.length) L.push(`  - praat: ${who.join(', ')}`);
    }
    L.push('');
  }
}
L.push('## Scènebord: personage per akte');
L.push('');
const acts = [1, 2, 3, 4, 5, 6];
L.push('| Personage | ' + acts.map((a) => (a === 6 ? 'Deel 4' : 'Akte ' + a)).join(' | ') + ' |');
L.push('|---|' + acts.map(() => '---').join('|') + '|');
for (const [name, ids] of [...speaker.entries()].sort((a, b) => b[1].size - a[1].size)) {
  const cells = acts.map((a) => [...ids].filter((id) => (sceneById.get(id) || {}).act === a).length || '');
  L.push(`| ${name} | ${cells.join(' | ')} |`);
}
L.push('');
L.push(`Overgangsscènes: ${BRIDGES.length} (${BRIDGES.map((b) => b.id).join(', ')}).`);
L.push('');
const out = L.join('\n');
const target = new URL('docs/verhaal/FILMSCRIPT-21-11.md', root);
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== out) { console.log('FILMSCRIPT-21-11.md is verouderd: node scripts/filmscript_export.mjs'); process.exit(1); }
  console.log('FILMSCRIPT-21-11.md ok');
} else {
  fs.writeFileSync(target, out);
  console.log(`${data.scenes.length} scènes naar docs/verhaal/FILMSCRIPT-21-11.md`);
}
