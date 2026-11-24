// Cutscene-kwaliteitssysteem, laag 2: de regels van de regie-bijbel als pure code (geen game, geen browser, geen wereld).
// De statische linter (scripts/cutscene_lint.mjs) bouwt eenheden uit de echte data en roept lintUnit() aan; de test
// (scripts/cutscene_lint_test.mjs) voert opzettelijk foute eenheden in en eist dat de regels ze vangen.
//
// Eén eenheid ("unit") is één cutscene:
//   { id, group, kind: 'staged' | 'script', act, regie: [string], lines: [regel], def, scene, duration }
//   regel = { speaker, key, text, at, dur, channel, textOnly, voiceDur }  (at/dur uit de tijdlijn van de scène)
//   def/scene = de cutscript-scènedefinitie en de bemonsterbare scène (compileScene); null bij een kale scriptscène.
//
// Regel-ID's hieronder (CS-...) zijn voorlopig; de regie-bijbel (docs/CUTSCENE-REGIE-21-11.md) krijgt eigen R-nummers.
// bijbelIds(regelsJson) hangt ze eraan zodra scripts/release/cutscene-regels.json bestaat.
//
// Smaak: humor wordt hier NIET als goed of slecht beoordeeld. De regels voor humor zijn structureel
// (grap uitgelegd, geen ruimte na een punch); komische beats worden alleen als kandidaat gelabeld
// (humorCandidates) voor het humorpanel, en tellen niet mee in de score.

import { simulateRecords, analyseRecords } from './cutscene_measure.mjs';

export const ERNST ={ blokkerend: 'blokkerend', belangrijk: 'belangrijk', nit: 'nit' };
const GEWICHT = { blokkerend: 25, belangrijk: 8, nit: 1 };

export const RULES = {
  // --- tekst
  'CS-T01': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Leessnelheid', uitleg: 'Een ondertitel mag niet sneller dan 20 tekens per seconde; boven 28 is hij onleesbaar.' },
  'CS-T02': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Beurt te lang', uitleg: 'Een beurt is twee tot twaalf woorden; boven 25 woorden is het een exposie (splits met een reactie), boven 45 onleesbaar.' },
  'CS-T03': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Te veel beurten achter elkaar', uitleg: 'Hooguit drie opeenvolgende beurten van één spreker, dan een reactie.' },
  'CS-T04': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Te veel sprekers', uitleg: 'Hooguit drie sprekers per scène (radio en app tellen niet).' },
  'CS-T05': { categorie: 'tekst', ernst: 'blokkerend', laag: 'lint', titel: 'Constitutie in de tekst', uitleg: 'Geen echte merken (2), "de Grunn" nooit (1), geen winter of sneeuw (3), geen Engelse spelertekst (1).' },
  'CS-T06': { categorie: 'tekst', ernst: 'blokkerend', laag: 'lint', titel: 'Kapotte tekst', uitleg: 'Geen onopgeloste {TOKEN}, %s, undefined, NaN of lege regel.' },
  'CS-T07': { categorie: 'tekst', ernst: 'blokkerend', laag: 'lint', titel: 'Onbekend personage', uitleg: 'Elke spreker staat in de sprekerstabel van het script.' },
  'CS-T08': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Introductie ontbreekt', uitleg: 'Een personage met meer dan één regel wordt aangekondigd of krijgt een naamkaart; radio en telefoon introduceren nooit; hooguit één nieuw personage per scène.' },
  'CS-T09': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Toespraak tegen de speler', uitleg: 'Een scène met één spreker en meer dan drie regels is een toespraak, geen gesprek (behalve radio, telefoon, voicemail en app).' },
  'CS-T10': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Stemclip ontbreekt', uitleg: 'Wie praat heeft een stemclip of is bewust alleen ondertitel (textOnly).' },
  // --- camera
  'CS-C01': { categorie: 'camera', ernst: 'blokkerend', laag: 'lint', titel: 'Geen getal in de camera', uitleg: 'Positie, kijkpunt en lens zijn eindige getallen; geen NaN, geen lege shot.' },
  'CS-C02': { categorie: 'camera', ernst: 'blokkerend', laag: 'lint', titel: 'Camera onder de grond of ver weg', uitleg: 'Cameraplek (lokaal) tussen 0,25 en 60 m hoog en binnen 45 m van de plek.' },
  'CS-C03': { categorie: 'camera', ernst: 'blokkerend', laag: 'lint', titel: 'Camera in een figuur of voertuig', uitleg: 'De camera staat niet in een lichaam of in een voertuig; minimaal 0,6 m van een figuur.' },
  'CS-C04': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Shotduur buiten de grenzen', uitleg: 'Een shot duurt minstens 0,8 s; per type hooguit: close 8 s, medium 10 s, wide 14 s.' },
  'CS-C05': { categorie: 'camera', ernst: 'blokkerend', laag: 'lint', titel: 'Spreker niet in beeld', uitleg: 'Wie praat is in beeld (of bewust off-screen met reden: radio, telefoon, een shot met offscreen).' },
  'CS-C06': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Springende as (180-gradenregel)', uitleg: 'Opeenvolgende gespreksshots blijven aan dezelfde kant van de lijn tussen de sprekers.' },
  'CS-C07': { categorie: 'camera', ernst: 'nit', laag: 'lint', titel: 'Jump cut', uitleg: 'Twee opeenvolgende shots op bijna dezelfde plek en hoek lijken een sprong.' },
  'CS-C08': { categorie: 'camera', ernst: 'blokkerend', laag: 'lint', titel: 'Scène valideert niet', uitleg: 'validateScene en de preview-bemonstering geven geen fout (de vorm van de scène klopt).' },
  'CS-C09': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Camera te lang stil', uitleg: 'De camera staat hooguit 8 s stil.' },
  'CS-C10': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Geen shot-variatie', uitleg: 'Een gesprek heeft minstens een wide of medium en een close of reactie; niet één shottype de hele scène.' },
  // --- gerenderde metingen (laag 3, scripts/lib/cutscene_measure.mjs; alleen met Electron of in de simulatie)
  'CS-R01': { categorie: 'camera', ernst: 'blokkerend', laag: 'render', titel: 'Zwart of leeg beeld', uitleg: 'Een frame is zwart of een effen vlak (lens in een muur of lege hemel).' },
  'CS-R02': { categorie: 'camera', ernst: 'blokkerend', laag: 'render', titel: 'Camera in geometrie', uitleg: 'De camera staat in een gebouw of onder de grond, of de lens is vol (kijkstralen raken iets binnen 1,3 m).' },
  'CS-R03': { categorie: 'camera', ernst: 'blokkerend', laag: 'render', titel: 'Spreker niet op het scherm', uitleg: 'De geprojecteerde spreker staat niet op het scherm of achter de camera.' },
  'CS-R04': { categorie: 'camera', ernst: 'belangrijk', laag: 'render', titel: 'Ondertitel bedekt iets belangrijks', uitleg: 'De ondertitel bedekt de spreker of een HUD-element.' },
  'CS-R05': { categorie: 'camera', ernst: 'belangrijk', laag: 'render', titel: 'Luminantiesprong tussen shots', uitleg: 'Belichting, dagtijd of weer springt tussen twee shots van één scène.' },
  'CS-R06': { categorie: 'camera', ernst: 'blokkerend', laag: 'render', titel: 'Bevroren of ongeldige camera', uitleg: 'De camera heeft een geen-getal of beweegt niet terwijl de scène doorloopt.' },
  // --- visuele logica
  'CS-V01': { categorie: 'visueel', ernst: 'blokkerend', laag: 'lint', titel: 'Spreker ontbreekt in de scène', uitleg: 'Wie praat staat in de scène (of praat via radio, telefoon of app) en is op dat moment niet verborgen.' },
  'CS-V02': { categorie: 'visueel', ernst: 'blokkerend', laag: 'lint', titel: 'Onbekend personage of prop', uitleg: 'Elk personage en elke prop in de regie bestaat (look in de tabel, soort in de catalogus).' },
  'CS-V03': { categorie: 'visueel', ernst: 'belangrijk', laag: 'lint', titel: 'Positie of pose onlogisch', uitleg: 'Geen figuren in elkaar, niet staand in een voertuig, niet buiten bereik van de scène.' },
  'CS-V04': { categorie: 'visueel', ernst: 'belangrijk', laag: 'lint', titel: 'Gebaar past niet bij de tekst', uitleg: 'Knikken bij "Nee", hoofdschudden bij "Ja" en vergelijkbare tegenspraak.' },
  'CS-V05': { categorie: 'visueel', ernst: 'belangrijk', laag: 'lint', titel: 'Kijkrichting', uitleg: 'Wie praat tegen een ander kijkt die kant op (niet meer dan 120 graden ervan af, tenzij hij loopt).' },
  // --- regieregels van #1324 (camera en blik; met een baseline die alleen mag dalen: scripts/release/cutscene-regie-baseline.json)
  'CS-C11': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Afgekapt hoofd', uitleg: 'Wie praat heeft zijn hoofd in het kader: niet de schouders in beeld en het gezicht boven of onder de rand (mens ca. 1,78 m).' },
  'CS-C12': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Camera in of achter geometrie', uitleg: 'De camera staat niet in een prop of set-object, het zicht op de spreker gaat niet door een object, geen object vóór het onderwerp vult meer dan 30% van het kader en geen object erachter meer dan 60% (behalve een insert op dat object).' },
  'CS-C13': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Spreker van achteren', uitleg: 'Wie praat zien we van voren of over de schouder van de luisteraar, niet op zijn achterhoofd (meer dan 115 graden van de camera af gedraaid in een medium- of close-shot).' },
  'CS-C14': { categorie: 'camera', ernst: 'belangrijk', laag: 'lint', titel: 'Te snelle snedes', uitleg: 'Hooguit drie snedes in elke 4 s; een shot korter dan 1,2 s (behalve het laatste) is een losse nit.' },
  'CS-T11': { categorie: 'tekst', ernst: 'belangrijk', laag: 'lint', titel: 'Ondertitel te kort in beeld', uitleg: 'De werkelijke tijd van een ondertitel (tot de volgende regel begint) geeft hooguit 20 tekens per seconde.' },
  'CS-V06': { categorie: 'visueel', ernst: 'belangrijk', laag: 'lint', titel: 'Loopt door een object', uitleg: 'Een lopend personage loopt niet door een prop of door een ander personage heen.' },
  // --- smaak (nooit een oordeel; alleen structuur en labels)
  'CS-H01': { categorie: 'smaak', ernst: 'nit', laag: 'lint', titel: 'Grap uitgelegd', uitleg: 'Een regel legt een voorgaande grap uit ("dat was een grap", "haha, snap je") en doodt hem; structuur, geen smaakoordeel.' },
  'CS-H02': { categorie: 'smaak', ernst: 'nit', laag: 'lint', titel: 'Geen ruimte na de punch', uitleg: 'Na een kort punch-antwoord komt de volgende regel binnen 0,2 s zonder reactie in beeld (geen stilte, geen reactieshot).' },
};

// Koppel voorlopige ID's aan de regie-bijbel zodra de regelslijst er is. Verwacht { regels: [{ id, lint? | linter? | cutscene_lint? }] }
// of een lijst; een regel zonder veld wordt overgeslagen. Geeft { 'CS-T01': 'R-12', ... }.
export function bijbelIds(regelsJson) {
  const lijst = Array.isArray(regelsJson) ? regelsJson : (regelsJson && (regelsJson.regels || regelsJson.rules)) || [];
  const map = {};
  for (const r of lijst) {
    const sleutel = r && (r.lint || r.linter || r.cutscene_lint || r.lintId);
    if (sleutel && r.id) for (const s of [].concat(sleutel)) map[s] = r.id;
  }
  return map;
}

// ---------------------------------------------------------------- vondsten

function vondst(unit, ruleId, bericht, extra = {}) {
  const r = RULES[ruleId];
  if (!r) throw new Error('onbekende regel ' + ruleId);
  return { cutscene: unit.id, regel: ruleId, categorie: r.categorie, ernst: extra.ernst || r.ernst, bericht, ...(extra.t != null ? { t: Math.round(extra.t * 10) / 10 } : {}), ...(extra.regelNr != null ? { regelNr: extra.regelNr } : {}) };
}


// ---------------------------------------------------------------- tekstregels

// Echte merken en bedrijven die niet in de spelertekst mogen (constitutie 2). Het register van de eigenaar
// (docs/MERKENREGISTER.md) heeft de rest; dit is de bewaking tegen de herkenbare gevallen. EIKEA is een verzonnen parodie.
export const MERKEN = ['Albert Heijn', 'Jumbo', 'Coca-Cola', 'Coca Cola', 'Pepsi', "McDonald's", 'McDonalds', 'Burger King', 'KFC', 'Google', 'Instagram', 'WhatsApp', 'Facebook', 'TikTok', 'Netflix', 'Spotify', 'Tesla', 'Volkswagen', 'Mercedes', 'Toyota', 'Shell', 'Gazprom', 'Gasunie', 'Ikea', 'Hema', 'Lidl', 'Aldi', 'Bol.com', 'Marktplaats', 'Uber', 'Airbnb', 'Amazon', 'Apple', 'iPhone', 'Samsung', 'Nokia', 'Heineken', 'Red Bull', 'Nike', 'Adidas', 'PostNL', 'Bavaria', 'Fanta', 'Snapchat', 'YouTube'];
const MERK_RES = MERKEN.map((m) => ({ m, re: new RegExp(`(?<![\\p{L}\\d])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\d])`, 'iu') }));
const WINTER = /\b(winter|winters|sneeuw|sneeuwt|besneeuwd|natuurijs|vorst|vriest|ijzel|schaatsen|kerstmis|kerstboom)\b/i;
const ENGELS = /\b(the|and|you|your|with|this|that|have|what|are|not|just|please|thanks|hello|okay)\b/gi;
const KAPOT = /(\{[A-Za-z_]+\}|%s|%d|\bundefined\b|\bNaN\b|\bnull\b|\[object|\$\{)/;
export const woorden = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

// Kanalen waarop een spreker niet in beeld hoeft (radio, telefoon, app, voicemail, narrator).
const OFF_SCREEN = /^(radio|telefoon|app|app-stil|voicemail|livestream)/;
const isOff = (l) => OFF_SCREEN.test(l.channel || '') || l.key === 'V';

export function checkText(unit, ctx = {}) {
  const out = [];
  const lines = unit.lines || [];
  const sprekers = ctx.speakers || null;
  lines.forEach((l, i) => {
    const nr = i;
    const t = String(l.text || '');
    if (!t.trim()) out.push(vondst(unit, 'CS-T06', `regel ${i} is leeg`, { regelNr: nr }));
    else if (KAPOT.test(t)) out.push(vondst(unit, 'CS-T06', `regel ${i} heeft een onopgeloste plaatshouder of NaN: "${t.slice(0, 50)}"`, { regelNr: nr }));
    if (sprekers && l.key != null && !sprekers[l.key] && !(ctx.npc && ctx.npc[l.key])) out.push(vondst(unit, 'CS-T07', `regel ${i}: spreker "${l.key}" staat niet in de sprekerstabel`, { regelNr: nr }));
    // constitutie in de tekst
    for (const { m, re } of MERK_RES) if (re.test(t)) out.push(vondst(unit, 'CS-T05', `regel ${i} noemt het merk "${m}" (constitutie 2)`, { regelNr: nr }));
    if (/\bde grunn\b/i.test(t)) out.push(vondst(unit, 'CS-T05', `regel ${i}: "de Grunn" (het is "Grunn")`, { regelNr: nr }));
    if (WINTER.test(t)) out.push(vondst(unit, 'CS-T05', `regel ${i} noemt winter of sneeuw (altijd zomer)`, { regelNr: nr }));
    if ((t.match(ENGELS) || []).length >= 3) out.push(vondst(unit, 'CS-T05', `regel ${i} lijkt Engels: "${t.slice(0, 50)}"`, { regelNr: nr }));
    // beurtlengte
    const w = woorden(t);
    if (w > 45) out.push(vondst(unit, 'CS-T02', `regel ${i} heeft ${w} woorden (max 25)`, { regelNr: nr, ernst: 'blokkerend' }));
    else if (w > 25) out.push(vondst(unit, 'CS-T02', `regel ${i} heeft ${w} woorden (max 25): splits met een reactie`, { regelNr: nr }));
    // leessnelheid: spreektijd voor een ingesproken regel (de ondertitel blijft die tijd en 0,25 s staan), anders de leestijd
    if (t.trim() && !(l.channel === 'app-stil')) {
      const getoond = l.voiceDur ? l.voiceDur + 0.25 : Math.max(2.2, Math.min(8, 1.3 + t.length * 0.058));
      const cps = t.length / getoond;
      if (cps > 28) out.push(vondst(unit, 'CS-T01', `regel ${i}: ${cps.toFixed(0)} tekens per seconde (onleesbaar boven 28)`, { regelNr: nr, ernst: 'blokkerend' }));
      else if (cps > 20) out.push(vondst(unit, 'CS-T01', `regel ${i}: ${cps.toFixed(0)} tekens per seconde (max 20)`, { regelNr: nr }));
    }
    // stemclip
    if (l.hasVoice === false && !l.textOnly && l.channel !== 'app-stil') out.push(vondst(unit, 'CS-T10', `regel ${i} (${l.speaker}) heeft geen stemclip en is niet als alleen-ondertitel gemarkeerd`, { regelNr: nr }));
  });
  // opeenvolgende beurten van één spreker
  let run = 1;
  for (let i = 1; i <= lines.length; i++) {
    if (i < lines.length && lines[i].speaker === lines[i - 1].speaker) { run++; continue; }
    if (run > 3 && lines[i - 1].channel !== 'app-stil') out.push(vondst(unit, 'CS-T03', `${lines[i - 1].speaker} praat ${run} beurten achter elkaar (max 3)`, { regelNr: i - run, ernst: run >= 6 && !isOff(lines[i - 1]) ? 'blokkerend' : 'belangrijk' }));
    run = 1;
  }
  // sprekers per scène
  const live = new Set(lines.filter((l) => !isOff(l) && l.channel !== 'app-stil').map((l) => l.speaker));
  if (live.size > 3) out.push(vondst(unit, 'CS-T04', `${live.size} sprekers in één scène (${[...live].join(', ')}; max 3)`));
  // toespraak
  const alle = new Set(lines.filter((l) => l.channel !== 'app-stil').map((l) => l.speaker));
  if (alle.size === 1 && lines.length > 3 && !lines.some(isOff) && unit.kind !== 'app') out.push(vondst(unit, 'CS-T09', `één spreker (${[...alle][0]}) houdt een toespraak van ${lines.length} regels`));
  return out;
}

// Introducties over de hele verhaallijn: de scènes in volgorde. Een personage is bekend als zijn naam eerder door een ander
// is genoemd, als de regie van een eerdere (of deze) scène een naamkaart noemt, of als het Tammo, Tessa of de verteller is.
// Geeft vondsten per scène-id. units: [{ id, lines, regie }] in verhaalvolgorde; names: { sleutel: weergavenaam }.
export function checkIntroductions(units, names = {}, opts = {}) {
  const per = new Map();
  const add = (u, v) => { if (!per.has(u.id)) per.set(u.id, []); per.get(u.id).push(v); };
  const bekend = new Set(['T', 'A', 'V', 'rikus', 'Tammo', 'Tessa', 'Anita', 'Rikus']); // Rikus is de radiostem die het verhaal opent (sleutel én naam)
  const totaal = {};
  for (const u of units) for (const l of u.lines || []) if (l.key) totaal[l.key] = (totaal[l.key] || 0) + 1;
  const eersteNaam = (key) => String(names[key] || key).split(/\s+/)[0];
  const genoemd = (tekst, key) => new RegExp(`(?<![\\p{L}])${eersteNaam(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(tekst);
  for (const u of units) {
    if (u.kind === 'app') continue;
    const regie = (u.regie || []).join(' ');
    const kaart = (key) => new RegExp(`naamkaart[^.]*${eersteNaam(key)}`, 'i').test(regie) || new RegExp(eersteNaam(key) + '[^.]*naamkaart', 'i').test(regie);
    const nieuw = [];
    for (const l of u.lines || []) {
      if (!l.key || bekend.has(l.key) || nieuw.includes(l.key)) continue;
      if (kaart(l.key)) { bekend.add(l.key); continue; }
      nieuw.push(l.key);
    }
    for (const key of nieuw) {
      if ((totaal[key] || 0) > 1 || (opts.altijd || false)) {
        const eerste = u.lines.find((l) => l.key === key);
        const viaKanaal = /^(radio|telefoon|voicemail)/.test(eerste.channel || '');
        add(u, vondst(u, 'CS-T08', viaKanaal
          ? `${names[key] || key} wordt voor het eerst gehoord via ${eerste.channel}: radio en telefoon introduceren nooit (eerst via een ander personage)`
          : `${names[key] || key} praat zonder dat een ander hem eerder noemde of de regie een naamkaart geeft (${totaal[key]} regels in het verhaal)`));
      }
    }
    if (nieuw.filter((k) => (totaal[k] || 0) > 1).length > 1) add(u, vondst(u, 'CS-T08', `${nieuw.length} nieuwe personages in één scène (${nieuw.map((k) => names[k] || k).join(', ')}; max 1, tenzij ze samen een grap zijn)`, { ernst: 'nit' }));
    // na deze scène zijn de genoemde en sprekende personages bekend
    for (const l of u.lines || []) { if (l.key) bekend.add(l.key); }
    for (const key of Object.keys(totaal)) if ((u.lines || []).some((l) => l.key !== key && genoemd(l.text, key))) bekend.add(key);
  }
  return per;
}

// Een staged eenheid: nieuwe personages worden ook tegen genoemd-eerder gehouden, maar een personage dat al in dezelfde
// scène genoemd wordt telt mee. (Zie checkIntroductions: de eerste vermelding mag in dezelfde scène staan, voor zijn eerste regel.)

// ---------------------------------------------------------------- humor (alleen structuur en labels)

const UITLEG = /\b(dat was een grap|grapje|haha+|snap je|geintje|bedoel(de)? ik als grap|lach maar)\b/i;

// Kandidaten voor het humorpanel: een korte punch na een langere opbouw van een ander, een vergelijking, een
// terugkerend woord. Het zegt NIET dat het grappig is; het labelt alleen waar een panel naar moet kijken.
export function humorCandidates(unit) {
  const out = [];
  const lines = unit.lines || [];
  lines.forEach((l, i) => {
    const w = woorden(l.text);
    const vorige = lines[i - 1];
    const redenen = [];
    if (vorige && vorige.speaker !== l.speaker && woorden(vorige.text) >= 8 && w <= 7 && /[.!]$/.test(String(l.text).trim())) redenen.push('korte punch na een lange opbouw');
    if (/\b(als een|net als een|alsof)\b/i.test(l.text) && w <= 20) redenen.push('vergelijking');
    if (/\bTammo zegt niks\b|^\.\.\.$/.test(l.text)) redenen.push('stilte als beurt');
    if (l.tag === 'BEHOUDEN' && w <= 9 && /[.!?]$/.test(String(l.text).trim()) && i > 0 && vorige && vorige.speaker !== l.speaker && /\?$/.test(String(vorige.text).trim())) redenen.push('vraag en droog antwoord');
    if (redenen.length) out.push({ cutscene: unit.id, regelNr: i, speaker: l.speaker, text: l.text, redenen, label: 'humor-review' });
  });
  return out;
}

export function checkHumorStructure(unit) {
  const out = [];
  const lines = unit.lines || [];
  lines.forEach((l, i) => {
    if (i > 0 && UITLEG.test(l.text) && lines[i - 1].speaker !== l.speaker) out.push(vondst(unit, 'CS-H01', `regel ${i} legt de grap van de vorige beurt uit: "${l.text.slice(0, 50)}"`, { regelNr: i }));
  });
  const kandidaten = humorCandidates(unit).filter((c) => c.redenen.includes('korte punch na een lange opbouw'));
  for (const c of kandidaten) {
    const volgende = lines[c.regelNr + 1];
    if (!volgende) continue;
    const gat = volgende.at - (lines[c.regelNr].at + lines[c.regelNr].dur);
    if (gat < 0.2 && volgende.speaker !== c.speaker && !hasReactionAround(unit, lines[c.regelNr].at + lines[c.regelNr].dur)) out.push(vondst(unit, 'CS-H02', `na de punch van regel ${c.regelNr} komt regel ${c.regelNr + 1} zonder adempauze of reactie in beeld`, { regelNr: c.regelNr, t: lines[c.regelNr].at }));
  }
  return out;
}

// 12, 'L3' of 'L3+1.5' in seconden op de tijdlijn van deze eenheid (null als de regel niet bestaat)
export function tijdVan(unit, x) {
  if (typeof x === 'number') return x;
  const m = /^L(\d+)([+-]\d+(?:\.\d+)?)?$/.exec(String(x));
  const l = m && (unit.lines || [])[+m[1]];
  return l ? l.at + (m[2] ? +m[2] : 0) : null;
}

// Is er rond tijd t ruimte: een luisteraar die iets doet (cue) of een reactie-shot binnen 1,5 s? Zonder regie is er niets te toetsen.
function hasReactionAround(unit, t) {
  const def = unit.def;
  if (!def) return true;
  const tijd = (x) => tijdVan(unit, x);
  const cue = (def.cues || []).some((c) => { const ct = tijd(c.t); return c.actor && ct != null && ct >= t - 0.1 && ct <= t + 1.5 && (c.anim || c.walk || c.face); });
  const shot = (def.shots || []).some((s) => { const st = tijd(s.t); return st != null && st >= t - 0.1 && st <= t + 1.5; });
  return cue || shot;
}

// ---------------------------------------------------------------- camera en visuele regels (op de bemonsterde scène)

const AANKER = { x: 500, y: -300, facing: 1.1, z: 0 };
const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const SHOT_MAX = { close: 8, medium: 10, wide: 14 };


// Staat punt p (x,y,z) in beeld van de camera c? Horizontaal en verticaal binnen de lens (aspect 16:9), voor de camera.
export function inFrame(c, p, aspect = 16 / 9) {
  const dx = p.x - c.position.x, dy = p.y - c.position.y, dz = p.z - c.position.z;
  const fx = c.lookAt.x - c.position.x, fy = c.lookAt.y - c.position.y, fz = c.lookAt.z - c.position.z;
  const fl = Math.hypot(fx, fy, fz) || 1e-9;
  const dl = Math.hypot(dx, dy, dz) || 1e-9;
  const cos = (dx * fx + dy * fy + dz * fz) / (fl * dl);
  if (cos <= 0.05) return false;
  // horizontale en verticale hoek tov de kijkrichting
  const yaw = Math.atan2(dy, dx) - Math.atan2(fy, fx);
  const dyaw = Math.abs(Math.atan2(Math.sin(yaw), Math.cos(yaw)));
  const pitchP = Math.atan2(dz, Math.hypot(dx, dy)), pitchC = Math.atan2(fz, Math.hypot(fx, fy));
  const vf = (c.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  return dyaw < (hf / 2) * 0.96 && Math.abs(pitchP - pitchC) < (vf / 2) * 0.96;
}

export function sampleScene(unit, step = 0.1) {
  const frames = [];
  const duur = unit.duration;
  for (let t = 0; t <= duur + 1e-9; t += step) frames.push({ t, s: unit.scene.sample(Math.min(t, duur), AANKER) });
  return frames;
}

// De shots uit een reeks frames: [{ idx, t0, t1, frames }]
export function shotsVan(frames) {
  const shots = [];
  for (const f of frames) {
    const idx = f.s.camera.shotIndex;
    const last = shots[shots.length - 1];
    if (last && last.idx === idx) { last.t1 = f.t; last.frames.push(f); } else shots.push({ idx, t0: f.t, t1: f.t, frames: [f] });
  }
  return shots;
}

// Een grove classificatie van het shottype uit het beeld zelf: wide (veel afstand of hoog), close (strak en lange lens), anders medium.
export function shotType(shot, defShot) {
  const f = shot.frames[Math.floor(shot.frames.length / 2)].s;
  const c = f.camera;
  const actors = Object.values(f.actors).filter((a) => a.visible !== false);
  let nearest = Infinity;
  for (const a of actors) nearest = Math.min(nearest, Math.hypot(a.x - c.position.x, a.y - c.position.y, (a.h || 0) + 1.5 - c.position.z));
  const kind = defShot && defShot.shot;
  if (kind === 'ots') return 'ots';
  if (kind === 'reaction') return 'reaction';
  if (kind === 'insert') return 'insert';
  if (nearest > 8 || c.position.z > 5 || (c.fov > 50 && nearest > 5)) return 'wide';
  if (nearest < 3.4 && c.fov <= 34) return 'close';
  return 'medium';
}

export function checkCamera(unit) {
  const out = [];
  if (!unit.scene || !unit.def) return out;
  const frames = sampleScene(unit);
  // C01 en C02: eindige getallen en hoogte
  let nietEindig = null, ondergronds = null, ver = null;
  for (const { t, s } of frames) {
    const c = s.camera;
    const w = [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov];
    if (w.some((v) => !Number.isFinite(v))) { nietEindig = nietEindig ?? t; continue; }
    if (c.position.z < 0.25 && ondergronds == null) ondergronds = t;
    if ((c.position.z > 60 || Math.hypot(c.position.x - AANKER.x, c.position.y - AANKER.y) > 45) && ver == null) ver = t;
  }
  if (nietEindig != null) out.push(vondst(unit, 'CS-C01', `de camera heeft een geen-getal (NaN) vanaf ${nietEindig.toFixed(1)} s`, { t: nietEindig }));
  if (!(unit.def.shots || []).length) out.push(vondst(unit, 'CS-C01', 'de scène heeft geen shots (lege camera)'));
  if (ondergronds != null) out.push(vondst(unit, 'CS-C02', `de camera zakt onder 0,25 m hoogte op ${ondergronds.toFixed(1)} s`, { t: ondergronds }));
  if (ver != null) out.push(vondst(unit, 'CS-C02', `de camera staat te hoog of meer dan 45 m van de plek op ${ver.toFixed(1)} s`, { t: ver }));
  if (nietEindig != null) return out;

  // C03: de camera in een figuur of voertuig
  let binnen = null;
  for (const { t, s } of frames) {
    const c = s.camera;
    for (const [id, a] of Object.entries(s.actors)) {
      if (a.visible === false) continue;
      if (dist2(a.x, a.y, c.position.x, c.position.y) < 0.6 && c.position.z < (a.h || 0) + 2.1 && !binnen) binnen = { t, wie: id };
    }
    for (const [id, p] of Object.entries(s.props || {})) {
      if (p.visible === false || !p.kind) continue;
      const foot = unit.footOf && unit.footOf(p.kind);
      if (foot && !binnen) {
        const r = Math.min(foot[0], foot[1]) / 2;
        if (dist2(p.x, p.y, c.position.x, c.position.y) < r && c.position.z < (p.h || 0) + foot[2]) binnen = { t, wie: id };
      }
    }
  }
  if (binnen) out.push(vondst(unit, 'CS-C03', `de camera staat in ${binnen.wie} op ${binnen.t.toFixed(1)} s`, { t: binnen.t }));

  const shots = shotsVan(frames);
  const defShots = unit.def.shots || [];
  // C04 shotduur per type
  const types = shots.map((sh) => shotType(sh, sh.idx < defShots.length ? defShots[sh.idx] : null));
  shots.forEach((sh, i) => {
    const dur = (i + 1 < shots.length ? shots[i + 1].t0 : unit.duration) - sh.t0;
    if (dur < 0.8 && i + 1 < shots.length) out.push(vondst(unit, 'CS-C04', `shot ${sh.idx} duurt ${dur.toFixed(1)} s (min 0,8 s)`, { t: sh.t0 }));
    const max = SHOT_MAX[types[i]];
    if (max && dur > max) out.push(vondst(unit, 'CS-C04', `${types[i]}-shot ${sh.idx} duurt ${dur.toFixed(1)} s (max ${max} s)`, { t: sh.t0 }));
  });

  // C05: de spreker in beeld
  const regels = unit.lines || [];
  regels.forEach((l, i) => {
    if (isOff(l) || l.dur < 1.2) return;
    const actorId = speakerActorId(unit, l.speaker);
    if (!actorId) return; // V01 meldt dit
    const eerste = frames.filter((f) => f.t >= l.at && f.t < l.at + l.dur);
    if (!eerste.length) return;
    let zichtbaar = 0, gemeten = 0;
    for (const { s } of eerste) {
      const a = s.actors[actorId];
      if (!a || a.visible === false) continue;
      gemeten++;
      if (offscreenToegestaan(unit, s.camera.shotIndex)) { zichtbaar++; continue; }
      // hoofd en borst: een strakke close-up mag op het gezicht staan, een zittende heeft een lager hoofd
      const hoofd = (a.h || 0) + (a.sit ? a.sit + 0.62 : 1.55), borst = (a.h || 0) + (a.sit ? a.sit + 0.3 : 1.15);
      if (inFrame(s.camera, { x: a.x, y: a.y, z: hoofd }) || inFrame(s.camera, { x: a.x, y: a.y, z: borst })) zichtbaar++;
    }
    if (!gemeten) return;
    const deel = zichtbaar / gemeten;
    if (deel === 0) out.push(vondst(unit, 'CS-C05', `${l.speaker} praat (regel ${i}) en is nergens in beeld`, { t: l.at, regelNr: i }));
    else if (deel < 0.4) out.push(vondst(unit, 'CS-C05', `${l.speaker} is bij regel ${i} maar ${(deel * 100).toFixed(0)}% van de tijd in beeld`, { t: l.at, regelNr: i, ernst: 'belangrijk' }));
  });

  // C06: de as van het gesprek (180 graden) over opeenvolgende gespreksshots
  // De as is de lijn tussen de spreker van dat moment en de vorige andere spreker; alleen shots op hetzelfde paar tellen.
  {
    const sprongen = []; let vorige = null, vorigeIdx = null, paarSleutel = null;
    const sprekerBij = (t) => { const l = regels.find((q) => t >= q.at - 0.01 && t < q.at + q.dur + 0.1); return l ? speakerActorId(unit, l.speaker) : null; };
    let laatsteAnder = null, laatsteSpreker = null;
    for (let i = 0; i < shots.length; i++) {
      const f = shots[i].frames[Math.min(shots[i].frames.length - 1, 1)].s; // net na de snee
      const nu = sprekerBij(shots[i].t0 + 0.05);
      if (nu && nu !== laatsteSpreker) { if (laatsteSpreker) laatsteAnder = laatsteSpreker; laatsteSpreker = nu; }
      const A = laatsteSpreker, B = laatsteAnder;
      if (!A || !B) { vorige = null; continue; }
      const sleutel = [A, B].sort().join('|');
      if (sleutel !== paarSleutel) { vorige = null; paarSleutel = sleutel; }
      const [P, Q] = [A, B].sort(); const a = f.actors[P], b = f.actors[Q]; // vaste richting van de as, ongeacht wie praat
      if (!a || !b || a.visible === false || b.visible === false) { vorige = null; continue; }
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const afstand = dist2(f.camera.position.x, f.camera.position.y, mx, my);
      const gespreksshot = afstand < 7 && f.camera.position.z < 3.2;
      if (!gespreksshot) { vorige = null; continue; }
      const ax = b.x - a.x, ay = b.y - a.y;
      const kant = ax * (f.camera.position.y - my) - ay * (f.camera.position.x - mx);
      const klein = Math.abs(kant) / (Math.hypot(ax, ay) || 1) < 0.6; // vrijwel op de as: geen kant
      if (!klein) {
        const k = Math.sign(kant);
        // een OTS-wisseling (schouder-tegenschouder) hoort bij de as: de camera blijft aan dezelfde kant en wisselt alleen van figuur
        if (vorige != null && k !== vorige) sprongen.push({ t: shots[i].t0, tekst: `de camera springt over de as tussen ${A} en ${B} tussen shot ${vorigeIdx} en ${shots[i].idx} (${shots[i].t0.toFixed(1)} s)` });
        vorige = k; vorigeIdx = shots[i].idx;
      }
    }
    if (sprongen.length >= 3) out.push(vondst(unit, 'CS-C06', `${sprongen.length} keer over de as in deze scène, o.a. ${sprongen[0].tekst}`, { t: sprongen[0].t }));
    else for (const s of sprongen) out.push(vondst(unit, 'CS-C06', s.tekst, { t: s.t, ernst: 'nit' }));
  }

  // C07: jump cut
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1].frames[shots[i - 1].frames.length - 1].s.camera, b = shots[i].frames[0].s.camera;
    const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
    const h1 = Math.atan2(a.lookAt.y - a.position.y, a.lookAt.x - a.position.x), h2 = Math.atan2(b.lookAt.y - b.position.y, b.lookAt.x - b.position.x);
    const da = Math.abs(Math.atan2(Math.sin(h1 - h2), Math.cos(h1 - h2))) * 180 / Math.PI;
    if (d < 0.3 && da < 12 && Math.abs(a.fov - b.fov) < 4) out.push(vondst(unit, 'CS-C07', `shot ${shots[i].idx} lijkt een jump cut op het vorige (${d.toFixed(2)} m en ${da.toFixed(0)} graden verschil)`, { t: shots[i].t0 }));
  }

  // C09: camera stil
  if (unit.rhythm && unit.rhythm.longestStill > 8) out.push(vondst(unit, 'CS-C09', `de camera staat ${unit.rhythm.longestStill.toFixed(1)} s stil (vanaf ${(unit.rhythm.stillAt || 0).toFixed(1)} s)`, { t: unit.rhythm.stillAt || 0 }));

  // C10: variatie in een gesprek
  if (regels.filter((l) => !isOff(l)).length >= 6 && shots.length >= 3) {
    const verschillend = new Set(types);
    if (verschillend.size < 2) out.push(vondst(unit, 'CS-C10', `${shots.length} shots, allemaal ${[...verschillend][0]}: geen variatie`));
  }
  return out;
}

function offscreenToegestaan(unit, shotIdx) {
  const s = (unit.def.shots || [])[shotIdx];
  return !!(s && (s.offscreen || s.shot === 'insert'));
}

export function speakerActorId(unit, naam) {
  const actors = (unit.def && unit.def.actors) || {};
  for (const [id, a] of Object.entries(actors)) {
    if (id === naam) return id;
    if ([].concat(a.speaker || []).includes(naam)) return id;
  }
  return null;
}

export function checkVisual(unit) {
  const out = [];
  if (!unit.def) return out;
  const actors = unit.def.actors || {};
  const regels = unit.lines || [];
  // V01: spreker ontbreekt of is verborgen
  const verborgen = (id, t, scene) => { try { const s = scene.sample(t, AANKER); return s.actors[id] && s.actors[id].visible === false; } catch { return false; } };
  regels.forEach((l, i) => {
    if (isOff(l)) return;
    const id = speakerActorId(unit, l.speaker);
    if (!id) {
      out.push(vondst(unit, 'CS-V01', `${l.speaker} praat (regel ${i}) maar staat niet in de scène`, { regelNr: i, t: l.at }));
      return;
    }
    // een inzittende die met zijn voertuig meerijdt (`road`) is bewust verborgen: de camera toont het voertuig
    if (unit.scene && actors[id].road === undefined && verborgen(id, l.at + Math.min(0.3, l.dur / 2), unit.scene)) out.push(vondst(unit, 'CS-V01', `${l.speaker} is verborgen terwijl hij praat (regel ${i})`, { regelNr: i, t: l.at }));
  });
  // V03: figuren in elkaar, staand in een voertuig, ver buiten de scène
  // een inzittende die met zijn voertuig meerijdt (`road`) of vanaf de eerste seconde verborgen is, staat niet als figuur in de scène (#1146)
  const zonderFiguur = (id) => actors[id].road !== undefined || (unit.def.cues || []).some((c) => c.actor === id && c.hide === true && (c.t === 0 || c.t === undefined));
  const ids = Object.keys(actors).filter((id) => !zonderFiguur(id));
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = actors[ids[i]], b = actors[ids[j]];
    if (a.at && b.at && dist2(a.at[0], a.at[1], b.at[0], b.at[1]) < 0.3 && !a.sit && !b.sit) out.push(vondst(unit, 'CS-V03', `${ids[i]} en ${ids[j]} staan in elkaar bij het begin (${dist2(a.at[0], a.at[1], b.at[0], b.at[1]).toFixed(2)} m)`));
  }
  for (const [id, a] of Object.entries(actors)) {
    if (zonderFiguur(id)) continue;
    if (a.at && Math.hypot(a.at[0], a.at[1]) > 40) out.push(vondst(unit, 'CS-V03', `${id} staat ${Math.hypot(a.at[0], a.at[1]).toFixed(0)} m van de plek`));
    for (const [pid, p] of Object.entries(unit.def.props || {})) {
      const foot = unit.footOf && unit.footOf(p.kind);
      if (!foot || !a.at || !p.at || a.sit || p.kind === 'duif' || p.kind === 'fiets' || a.anim === 'ride') continue;
      const kleur = p.road !== undefined ? 'voertuig' : '';
      if (['auto', 'bestelbus', 'bakkie', 'politie', 'trekker', 'aanhanger'].includes(p.kind) && dist2(a.at[0], a.at[1], p.at[0], p.at[1]) < Math.min(foot[0], foot[1]) * 0.35) out.push(vondst(unit, 'CS-V03', `${id} staat in ${kleur || 'prop'} ${pid} (${p.kind}) zonder te zitten`));
    }
  }
  // V04: gebaar tegen de tekst in
  for (const c of unit.def.cues || []) {
    const ct = tijdVan(unit, c.t);
    if (!c.actor || (c.anim !== 'nod' && c.anim !== 'shake') || ct == null) continue;
    const l = regels.find((q) => ct >= q.at - 0.01 && ct <= q.at + q.dur + 0.01);
    if (!l || speakerActorId(unit, l.speaker) !== c.actor) continue;
    if (c.anim === 'nod' && /^\s*(nee|nooit|niet)\b/i.test(l.text)) out.push(vondst(unit, 'CS-V04', `${c.actor} knikt bij "${l.text.slice(0, 30)}"`, { t: ct }));
    if (c.anim === 'shake' && /^\s*(ja|zeker|natuurlijk|prima)\b/i.test(l.text)) out.push(vondst(unit, 'CS-V04', `${c.actor} schudt nee bij "${l.text.slice(0, 30)}"`, { t: ct }));
  }
  // V05: kijkrichting van de spreker, op twee momenten in de regel (een draai die onderweg is telt niet)
  if (unit.scene) {
    // a conversation partner has a line of his own in this scene (an extra who only has a name does not talk along)
    const sprekers = new Set(regels.filter((q) => !isOff(q)).map((q) => speakerActorId(unit, q.speaker)).filter(Boolean));
    const gesprekspartners = (id) => Object.keys(actors).filter((x) => x !== id && actors[x].speaker && sprekers.has(x));
    // the ones he talks to: the last other speaker before the line and the next one after it (he may look at either)
    const aangesproken = (i, id) => {
      const ander = (q) => { const a = isOff(q) ? null : speakerActorId(unit, q.speaker); return a && a !== id ? a : null; };
      return [...new Set([regels.slice(0, i).reverse().map(ander).find(Boolean), regels.slice(i + 1).map(ander).find(Boolean)].filter(Boolean))];
    };
    const weg = (s, id, doelen) => {
      const me = s.actors[id];
      if (!me || me.visible === false || me.speed > 0.3 || me.sit) return null;
      const naastmij = (doelen && doelen.length ? doelen : gesprekspartners(id)).map((o) => s.actors[o]).filter((o) => o && o.visible !== false && (doelen && doelen.length ? true : dist2(o.x, o.y, me.x, me.y) < 9));
      if (!naastmij.length) return null;
      const hoek = (d) => { const naar = Math.atan2(d.y - me.y, d.x - me.x); return Math.abs(Math.atan2(Math.sin(naar - me.a), Math.cos(naar - me.a))) * 180 / Math.PI; };
      return Math.min(...naastmij.map(hoek));
    };
    let fout = 0;
    for (const [i, l] of regels.entries()) {
      if (isOff(l) || fout >= 2) continue;
      const id = speakerActorId(unit, l.speaker);
      if (!id) continue;
      const doelen = aangesproken(i, id);
      const d1 = weg(unit.scene.sample(l.at + Math.min(1, l.dur / 2), AANKER), id, doelen);
      const d2 = weg(unit.scene.sample(l.at + l.dur * 0.8, AANKER), id, doelen);
      if (d1 != null && d2 != null && d1 > 120 && d2 > 120) { fout++; out.push(vondst(unit, 'CS-V05', `${l.speaker} praat bij regel ${i} met zijn rug naar de ander (${d1.toFixed(0)} graden)`, { t: l.at, regelNr: i })); }
    }
  }
  return out;
}

// ---------------------------------------------------------------- regieregels (#1324): kader, geometrie, blik, tempo

// Maten van een mens (de personages van het spel, ca. 1,78 m): het midden van het hoofd, de kruin en de schouders, in m boven de voeten.
export const MENS = { hoofd: 1.66, kruin: 1.79, schouder: 1.45, zitHoofd: 0.72, zitSchouder: 0.48 };
export const hoofdZ = (a) => (a.h || 0) + (a.sit ? a.sit + MENS.zitHoofd : MENS.hoofd);
const schouderZ = (a) => (a.h || 0) + (a.sit ? a.sit + MENS.zitSchouder : MENS.schouder);
export const REGIE_DREMPELS = { objectVulling: 0.3, achtergrondVulling: 0.6, achterHoek: 115, achterHoofdMin: 0.06, snedesPerVenster: 3, venster: 4, kortShot: 1.2, tekensPerSeconde: 20, deelVanRegel: 0.5 };

// De camera als projector: kader(p) -> { x, y } in [-1, 1] binnen het beeld (x rechts, y boven), z = diepte; null achter de camera.
// Rechts in beeld is omhoog x vooruit in spelcoördinaten (zie scripts/lib/contactvel_schets.mjs).
export function kaderVan(c, aspect = 16 / 9) {
  let fx = c.lookAt.x - c.position.x, fy = c.lookAt.y - c.position.y, fz = c.lookAt.z - c.position.z;
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = -fy, ry = fx; const rl = Math.hypot(rx, ry) || 1; rx /= rl; ry /= rl;
  const ux = -fz * ry, uy = fz * rx, uz = fx * ry - fy * rx;
  const tv = Math.tan((c.fov * Math.PI) / 360), th = tv * aspect;
  return (p, near = 0.05) => {
    const vx = p.x - c.position.x, vy = p.y - c.position.y, vz = p.z - c.position.z;
    const z = vx * fx + vy * fy + vz * fz;
    if (z < near) return null;
    return { x: (vx * rx + vy * ry) / (z * th), y: (vx * ux + vy * uy + vz * uz) / (z * tv), z };
  };
}
const binnen = (q) => q && Math.abs(q.x) <= 1 && Math.abs(q.y) <= 1;

// De doos van een prop (voetafdruk uit cutscenemodels.js): ligt punt (x, y, z) erin (met marge)?
function inDoos(p, foot, x, y, z, marge = 0) {
  const dx = x - p.x, dy = y - p.y, c = Math.cos(-(p.a || 0)), s = Math.sin(-(p.a || 0));
  const lx = dx * c - dy * s, ly = dx * s + dy * c;
  return Math.abs(lx) < foot[0] / 2 - marge && Math.abs(ly) < foot[1] / 2 - marge && z > (p.h || 0) && z < (p.h || 0) + foot[2];
}
// Snijdt het lijnstuk a -> b de doos van een prop? (slab-methode in de lokale assen van de prop)
function lijnDoorDoos(p, foot, a, b) {
  const c = Math.cos(-(p.a || 0)), s = Math.sin(-(p.a || 0));
  const loc = (q) => { const dx = q.x - p.x, dy = q.y - p.y; return [dx * c - dy * s, dx * s + dy * c, q.z - (p.h || 0)]; };
  const A = loc(a), B = loc(b);
  const lo = [-foot[0] / 2, -foot[1] / 2, 0], hi = [foot[0] / 2, foot[1] / 2, foot[2]];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = B[k] - A[k];
    if (Math.abs(d) < 1e-9) { if (A[k] < lo[k] || A[k] > hi[k]) return false; continue; }
    let u = (lo[k] - A[k]) / d, v = (hi[k] - A[k]) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v);
    if (t0 > t1) return false;
  }
  return true;
}
// Het deel van het kader dat de doos van een prop vult: een raster van 16 x 9 kijkstralen door het kader, het deel dat de doos raakt
// (ook goed als de camera er vlak naast of half in staat, waar een projectie van de hoeken niet werkt).
export function kaderVulling(c, p, foot, { aspect = 16 / 9, achtergrond = false } = {}) {
  let fx = c.lookAt.x - c.position.x, fy = c.lookAt.y - c.position.y, fz = c.lookAt.z - c.position.z;
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = -fy, ry = fx; const rl = Math.hypot(rx, ry) || 1; rx /= rl; ry /= rl;
  const ux = -fz * ry, uy = fz * rx, uz = fx * ry - fy * rx;
  const tv = Math.tan((c.fov * Math.PI) / 360), th = tv * aspect;
  const diep = achtergrond ? 80 : fl * 0.85; // standaard alleen wat VOOR het onderwerp (het kijkpunt) staat; achtergrond: alles
  let raak = 0, n = 0;
  for (let iy = 0; iy < 9; iy++) for (let ix = 0; ix < 16; ix++) {
    const x = ((ix + 0.5) / 16) * 2 - 1, y = ((iy + 0.5) / 9) * 2 - 1;
    const dx = fx + rx * x * th + ux * y * tv, dy = fy + ry * x * th + uy * y * tv, dz = fz + uz * y * tv;
    n++;
    if (lijnDoorDoos(p, foot, c.position, { x: c.position.x + dx * diep, y: c.position.y + dy * diep, z: c.position.z + dz * diep })) raak++;
  }
  return raak / n;
}
// Een shot dat bewust op een prop staat (insert, of zijn look/target noemt de prop)
const shotOpProp = (sh, pid) => !!sh && (sh.shot === 'insert' || [sh.look, sh.target, sh.at].some((v) => typeof v === 'string' && new RegExp(`(^|[:,])${pid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[,@])`).test(v)));

export function checkRegie(unit) {
  const out = [];
  if (!unit.scene || !unit.def) return out;
  const D = REGIE_DREMPELS;
  const frames = sampleScene(unit);
  const shots = shotsVan(frames);
  const defShots = unit.def.shots || [];
  const regels = unit.lines || [];
  const foot = (kind) => (unit.footOf ? unit.footOf(kind) : null);
  const offscreen = (idx) => offscreenToegestaan(unit, idx);

  // C11, C13 en het zicht-deel van C12: per gesproken regel, over de frames van die regel
  regels.forEach((l, i) => {
    if (isOff(l) || l.dur < 1.2) return;
    const id = speakerActorId(unit, l.speaker);
    if (!id) return;
    let n = 0, kop = 0, rug = 0, geblokt = 0, blokNaam = null;
    for (const { t, s } of frames) {
      if (t < l.at || t >= l.at + l.dur) continue;
      const a = s.actors[id];
      if (!a || a.visible === false || offscreen(s.camera.shotIndex)) continue;
      const kader = kaderVan(s.camera);
      const h = kader({ x: a.x, y: a.y, z: hoofdZ(a) }), sch = kader({ x: a.x, y: a.y, z: schouderZ(a) });
      if (!binnen(h) && !binnen(sch)) continue; // niet in beeld: dat is C05
      n++;
      if (binnen(sch) && h && Math.abs(h.x) <= 1 && Math.abs(h.y) > 1) kop++;
      // van achteren: de kijkrichting van het hoofd tegenover de richting naar de camera, alleen als het hoofd groot genoeg in beeld is
      if (h && binnen(h) && 0.25 / (h.z * Math.tan((s.camera.fov * Math.PI) / 360)) / 2 > D.achterHoofdMin) {
        const kijk = (a.a || 0) + (a.gaze || 0);
        const naar = Math.atan2(s.camera.position.y - a.y, s.camera.position.x - a.x);
        if (Math.abs(Math.atan2(Math.sin(naar - kijk), Math.cos(naar - kijk))) * 180 / Math.PI > D.achterHoek) rug++;
      }
      // zicht op het hoofd door een prop heen
      const doel = { x: a.x, y: a.y, z: hoofdZ(a) };
      const dl = Math.hypot(doel.x - s.camera.position.x, doel.y - s.camera.position.y, doel.z - s.camera.position.z) || 1;
      const eind = { x: doel.x - ((doel.x - s.camera.position.x) / dl) * 0.35, y: doel.y - ((doel.y - s.camera.position.y) / dl) * 0.35, z: doel.z - ((doel.z - s.camera.position.z) / dl) * 0.35 };
      for (const [pid, p] of Object.entries(s.props || {})) {
        const f = p.visible !== false && foot(p.kind);
        if (!f || a.carrying === pid) continue;
        if (lijnDoorDoos(p, f, s.camera.position, eind)) { geblokt++; blokNaam = `${pid} (${p.kind})`; break; }
      }
    }
    if (!n) return;
    if (kop / n >= D.deelVanRegel) out.push(vondst(unit, 'CS-C11', `${l.speaker} praat (regel ${i}) met de schouders in beeld en het hoofd buiten het kader (${Math.round((kop / n) * 100)}% van de regel)`, { t: l.at, regelNr: i }));
    if (rug / n >= D.deelVanRegel) out.push(vondst(unit, 'CS-C13', `${l.speaker} praat (regel ${i}) en we zien vooral zijn achterhoofd (${Math.round((rug / n) * 100)}% van de regel); film van voren of over de schouder van de luisteraar`, { t: l.at, regelNr: i }));
    if (geblokt / n >= D.deelVanRegel) out.push(vondst(unit, 'CS-C12', `het zicht op ${l.speaker} (regel ${i}) gaat door ${blokNaam}`, { t: l.at, regelNr: i }));
  });

  // C12: de camera in een prop, of een prop die meer dan 30% van het kader vult (per shot, in het midden)
  {
    const gemeld = new Set();
    for (const sh of shots) {
      const midden = sh.frames[Math.floor(sh.frames.length / 2)];
      const s = midden.s, c = s.camera;
      for (const [pid, p] of Object.entries(s.props || {})) {
        const f = p.visible !== false && foot(p.kind);
        if (!f || gemeld.has(`${sh.idx}|${pid}`)) continue;
        if (inDoos(p, f, c.position.x, c.position.y, c.position.z, 0.02)) { gemeld.add(`${sh.idx}|${pid}`); out.push(vondst(unit, 'CS-C12', `de camera staat in ${pid} (${p.kind}) in shot ${sh.idx}`, { t: sh.t0 })); continue; }
        if (shotOpProp(defShots[sh.idx], pid)) continue;
        const vul = kaderVulling(c, p, f), achter = vul > D.objectVulling ? 0 : kaderVulling(c, p, f, { achtergrond: true });
        if (vul > D.objectVulling) { gemeld.add(`${sh.idx}|${pid}`); out.push(vondst(unit, 'CS-C12', `${pid} (${p.kind}) staat voor het onderwerp en vult ${Math.round(Math.min(1, vul) * 100)}% van het kader in shot ${sh.idx} (de camera staat erachter of ertegenaan)`, { t: sh.t0 })); }
        else if (achter > D.achtergrondVulling) { gemeld.add(`${sh.idx}|${pid}`); out.push(vondst(unit, 'CS-C12', `${pid} (${p.kind}) vult als achtergrond ${Math.round(achter * 100)}% van het kader in shot ${sh.idx} (een muur van ${p.kind}: kies een ander standpunt)`, { t: sh.t0 })); }
      }
    }
  }

  // C14: te snelle snedes
  {
    const t0s = shots.map((s) => s.t0);
    let venster = null;
    for (let i = 0; i < t0s.length; i++) {
      const j = t0s.findIndex((t) => t > t0s[i] + D.venster - 1e-6);
      const snedes = (j < 0 ? t0s.length : j) - i - (i === 0 ? 1 : 0);
      if (snedes > D.snedesPerVenster && !venster) venster = { t: t0s[i], n: snedes };
    }
    if (venster) out.push(vondst(unit, 'CS-C14', `${venster.n} snedes binnen ${D.venster} s vanaf ${venster.t.toFixed(1)} s`, { t: venster.t }));
    shots.forEach((sh, i) => {
      if (i + 1 >= shots.length) return;
      const dur = shots[i + 1].t0 - sh.t0;
      if (dur >= 0.8 && dur < D.kortShot) out.push(vondst(unit, 'CS-C14', `shot ${sh.idx} staat maar ${dur.toFixed(1)} s in beeld`, { t: sh.t0, ernst: 'nit' }));
    });
  }

  // V06: lopen door een prop of door een ander personage
  {
    const gemeld = new Set();
    for (const { t, s } of frames) {
      const lopers = Object.entries(s.actors).filter(([, a]) => a.visible !== false && !a.sit && a.speed > 0.05 && a.anim !== 'ride');
      for (const [id, a] of lopers) {
        for (const [pid, p] of Object.entries(s.props || {})) {
          const f = p.visible !== false && foot(p.kind);
          if (!f || f[2] < 0.25 || (p.h || 0) > 0.3 || a.carrying === pid || gemeld.has(`${id}|${pid}`)) continue;
          if (inDoos(p, f, a.x, a.y, (p.h || 0) + 0.1, 0.12)) { gemeld.add(`${id}|${pid}`); out.push(vondst(unit, 'CS-V06', `${id} loopt door ${pid} (${p.kind}) op ${t.toFixed(1)} s`, { t })); }
        }
        for (const [oid, o] of Object.entries(s.actors)) {
          if (oid === id || o.visible === false || o.sit || gemeld.has([id, oid].sort().join('|'))) continue;
          if (dist2(a.x, a.y, o.x, o.y) < 0.3) { gemeld.add([id, oid].sort().join('|')); out.push(vondst(unit, 'CS-V06', `${id} loopt door ${oid} heen op ${t.toFixed(1)} s`, { t })); }
        }
      }
    }
  }
  return out;
}

// T11: de werkelijke tijd van een ondertitel (tot de volgende regel begint); een regel die T01 al te snel vindt, telt hier niet nog eens
export function checkLeestijd(unit) {
  const out = [];
  const regels = unit.lines || [];
  regels.forEach((l, i) => {
    const tekens = String(l.text || '').length;
    const volgende = regels[i + 1];
    if (!tekens || !volgende || !(l.dur > 0)) return;
    const eff = Math.min(l.dur, volgende.at - l.at);
    if (!(eff > 0) || tekens / l.dur > REGIE_DREMPELS.tekensPerSeconde) return;
    if (tekens / eff > REGIE_DREMPELS.tekensPerSeconde) out.push(vondst(unit, 'CS-T11', `regel ${i} staat maar ${eff.toFixed(1)} s in beeld voor ${tekens} tekens (${(tekens / eff).toFixed(0)} per seconde): de volgende regel begint te vroeg`, { t: l.at, regelNr: i }));
  });
  return out;
}

// De projectiemetingen van laag 3 zonder pixels (simulateRecords): spreker op het scherm en ondertitel over de spreker, per shot één
// vondst. Een R03 die een C05 op hetzelfde moment al meldt, komt er niet nog eens bij.
function projectieVondsten(unit, bestaand) {
  if (!unit.scene || !unit.def) return [];
  const c05 = bestaand.filter((x) => x.regel === 'CS-C05');
  const gezien = new Set();
  const out = [];
  for (const x of analyseRecords(unit.id, simulateRecords(unit))) {
    if (x.regel !== 'CS-R03' && x.regel !== 'CS-R04') continue;
    const sleutel = `${x.regel}|${x.shot}`;
    if (gezien.has(sleutel)) continue;
    if (x.regel === 'CS-R03' && c05.some((c) => Math.abs((c.t ?? -99) - x.t) < 3)) continue;
    gezien.add(sleutel);
    out.push({ ...x, bron: 'projectie' });
  }
  return out;
}

// ---------------------------------------------------------------- samenstellen

// Alle regels op één eenheid (de introductieregel draait over de hele lijn: checkIntroductions).
export function lintUnit(unit, ctx = {}) {
  const v = [];
  if (unit.status === 'fout' && Array.isArray(unit.issues)) for (const m of unit.issues) v.push(vondst(unit, /ontbrekende acteur/.test(m) ? 'CS-V02' : 'CS-C08', m));
  if (unit.status === 'fout' && unit.missing) for (const m of unit.missing) v.push(vondst(unit, 'CS-V02', `personage ${m} bestaat niet in de tabel`));
  v.push(...checkText(unit, ctx));
  v.push(...checkHumorStructure(unit));
  try { v.push(...checkCamera(unit)); } catch (e) { v.push(vondst(unit, 'CS-C08', 'bemonsteren faalde: ' + String(e.message || e).slice(0, 120))); }
  try { v.push(...projectieVondsten(unit, v)); } catch (e) { v.push(vondst(unit, 'CS-C08', 'projectiemeting faalde: ' + String(e.message || e).slice(0, 120))); }
  try { v.push(...checkVisual(unit)); } catch (e) { v.push(vondst(unit, 'CS-C08', 'visuele controle faalde: ' + String(e.message || e).slice(0, 120))); }
  try { v.push(...checkRegie(unit), ...checkLeestijd(unit)); } catch (e) { v.push(vondst(unit, 'CS-C08', 'regiecontrole faalde: ' + String(e.message || e).slice(0, 120))); }
  return v;
}

// De score van een cutscene: blokkerend 25, belangrijk 8, nit 1 per vondst. Uitgezonderde vondsten en smaak tellen niet mee.
export function scoreVan(vondsten) {
  let straf = 0;
  for (const v of vondsten) if (!v.uitzondering && v.categorie !== 'smaak') straf += GEWICHT[v.ernst] || 0;
  return Math.max(0, Math.round(100 - straf));
}

export function rapportVan(unit, vondsten) {
  const per = { blokkerend: 0, belangrijk: 0, nit: 0, smaak: 0, uitgezonderd: 0 };
  for (const v of vondsten) { if (v.uitzondering) per.uitgezonderd++; else if (v.categorie === 'smaak') per.smaak++; else per[v.ernst]++; }
  return { id: unit.id, group: unit.group, kind: unit.kind, regels: (unit.lines || []).length, shots: unit.def ? (unit.def.shots || []).length : 0, score: scoreVan(vondsten), ...per, vondsten };
}

export function globaleScore(rapporten) {
  if (!rapporten.length) return 100;
  return Math.round(rapporten.reduce((s, r) => s + r.score, 0) / rapporten.length);
}

// ---------------------------------------------------------------- strengheid en uitzonderingen

// Eigenaar-besluit 21-11: de regels gelden voor ALLE cutscenes, ook de bestaande; geen stille baseline. Een regel die bij een bestaande
// cutscene bewust niet geldt, staat met een reden in scripts/release/cutscene-uitzonderingen.json:
//   { "uitzonderingen": [ { "cutscene": "E2", "regel": "CS-T03", "regelNr": 4, "reden": "waarom dit hier bewust zo is", "akkoord": "wie" } ] }
// Een uitzondering zonder reden, voor een onbekende regel of cutscene, of die geen vondst meer dekt, is zelf een fout.
export const MIN_REDEN = 20;

export function valideerUitzonderingen(data, { cutscenes = null } = {}) {
  const fouten = [];
  const lijst = data && Array.isArray(data.uitzonderingen) ? data.uitzonderingen : null;
  if (!lijst) return ['cutscene-uitzonderingen.json heeft geen lijst "uitzonderingen"'];
  const gezien = new Set();
  lijst.forEach((u, i) => {
    const waar = `uitzondering ${i + 1}${u && u.cutscene ? ` (${u.cutscene} ${u.regel || ''})` : ''}`;
    if (!u || typeof u !== 'object') { fouten.push(`${waar}: geen object`); return; }
    if (!u.cutscene) fouten.push(`${waar}: cutscene ontbreekt`);
    else if (cutscenes && !cutscenes.has(u.cutscene)) fouten.push(`${waar}: onbekende cutscene "${u.cutscene}"`);
    if (!u.regel || !RULES[u.regel]) fouten.push(`${waar}: onbekende regel "${u.regel}"`);
    else if (RULES[u.regel].categorie === 'smaak') fouten.push(`${waar}: smaakregels tellen niet mee en hebben geen uitzondering nodig`);
    if (typeof u.reden !== 'string' || u.reden.trim().length < MIN_REDEN) fouten.push(`${waar}: een uitzondering heeft een reden van minstens ${MIN_REDEN} tekens (waarom geldt de regel hier bewust niet)`);
    if (u.regelNr != null && !Number.isInteger(u.regelNr)) fouten.push(`${waar}: regelNr is een geheel getal`);
    const sleutel = `${u.cutscene}|${u.regel}|${u.regelNr ?? ''}`;
    if (gezien.has(sleutel)) fouten.push(`${waar}: dubbel`);
    gezien.add(sleutel);
  });
  return fouten;
}

// Zet de uitzonderingen op de vondsten: een gedekte vondst krijgt `uitzondering` (de reden) en telt niet meer mee in de aantallen en de score.
// Geeft { verouderd } met de uitzonderingen die geen vondst meer dekken (een stille, vergeten uitzondering is zelf een fout).
export function pasUitzonderingenToe(vondstenPerCutscene, uitzonderingen = []) {
  const gebruikt = new Set();
  for (const [id, vondsten] of Object.entries(vondstenPerCutscene)) {
    for (const v of vondsten) {
      const i = uitzonderingen.findIndex((u) => u.cutscene === id && u.regel === v.regel && (u.regelNr == null || u.regelNr === v.regelNr));
      if (i >= 0) { v.uitzondering = uitzonderingen[i].reden; gebruikt.add(i); }
    }
  }
  return { verouderd: uitzonderingen.filter((u, i) => !gebruikt.has(i)) };
}

