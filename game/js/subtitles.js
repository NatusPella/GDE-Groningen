// Dual subtitles for dialect lines: a Frisian (fy) or Gronings (gro) line is
// shown as written, with its Dutch translation underneath (`.nl-sub`).
// The line itself stays a plain string everywhere (tables, voice keys
// "<speaker>|<text>", voice_coverage), so a translation is looked up by the
// exact text. A key may also be a fragment (a quote inside a Dutch line, the
// part of a template before a placeholder): every key found in a longer text
// is replaced by its translation. Node-safe: no DOM at import time.
//
// Adding a Frisian line: add `'<exact text>': '<Dutch>'` to FY. voice_coverage
// fails on any spoken line that reads as Frisian (looksFrisian) without one.

export const FY = {
  // story cutscenes (missionstory.js) and mission scenes (missions.js)
  'Moai, Grinzers! Wat Grunn kan, kan Fryslân beter. Ook hardrijden.': 'Mooi, Groningers! Wat Groningen kan, kan Friesland beter. Ook hardrijden.',
  'Onze baas… is slim. De bal… de bal ligt op het skûtsje. Hik. Net fertelle, hè?': 'Onze baas… is slim. De bal… de bal ligt op het skûtsje. Hik. Niet doorvertellen, hè?',
  'Moai, Grinzers. Ik heb een voorstel. Op Gronings Ontzet bakken we tegen elkaar, voor de Noordelijke Snackprijs.': 'Mooi, Groningers. Ik heb een voorstel. Op Gronings Ontzet bakken we tegen elkaar, voor de Noordelijke Snackprijs.',
  'Winnen jullie, dan houden jullie de Eierbal. Win ik, dan krijg ik hem terug. En is de aaibal Frysk.': 'Winnen jullie, dan houden jullie de Eierbal. Win ik, dan krijg ik hem terug. En is de eierbal Fries.',
  'Dat is in detail, Grinzer.': 'Dat is een detail, Groninger.',
  'Ja, mem. Goed. Ik proef jullie aaibal. Maar ik zeg niks.': 'Ja, mam. Goed. Ik proef jullie eierbal. Maar ik zeg niks.',
  'Dit is… better as ús. Net fertelle.': 'Dit is… beter dan de onze. Niet doorvertellen.',
  'Moai. Sa\'n gouden aaibal… dy heart eins yn Fryslân.': 'Mooi. Zo\'n gouden eierbal… die hoort eigenlijk in Friesland.',
  'Moai! Oant sjen, Grinzers!': 'Mooi! Tot ziens, Groningers!',
  'Moai! Oant sjen op Gronings Ontzet!': 'Mooi! Tot ziens op Gronings Ontzet!',
  'Moai, Grinzers. Mijn vet. Mijn tankwagen. Mijn dag.': 'Mooi, Groningers. Mijn vet. Mijn tankwagen. Mijn dag.',
  'Dan koop ik nieuw vet. Jild genôch. En een polsstok.': 'Dan koop ik nieuw vet. Geld genoeg. En een polsstok.',
  'Jim fytse mar, jonges.': 'Fietsen jullie maar, jongens.',
  'Moai, Grinzers. Jullie hebben mijn sûkelade gevonden.': 'Mooi, Groningers. Jullie hebben mijn chocola gevonden.',
  'Die gaat de lucht in. Fan\'e jûn, met een ballon.': 'Die gaat de lucht in. Vanavond, met een ballon.',
  'Oant fan\'e jûn, Grinzers!': 'Tot vanavond, Groningers!',
  'Moai, Grinzers! Bedankt voor de Eierbal. Die neem ik mar mei.': 'Mooi, Groningers! Bedankt voor de Eierbal. Die neem ik maar mee.',
  'Nu staat hij in mijn trekker. Oant sjen!': 'Nu staat hij in mijn trekker. Tot ziens!',
  'Jullie krijgen me nooit! Ik ben de beste fierljepper fan Fryslân!': 'Jullie krijgen me nooit! Ik ben de beste fierljepper van Friesland!',
  'Neat is te breed foar Jelle Terpstra!': 'Niets is te breed voor Jelle Terpstra!',
  'Help! Myn polsstok is brutsen! Ik bin wiet!': 'Help! Mijn polsstok is gebroken! Ik ben nat!',
  'Tige tank, Grinzers. Echt. Hjir, de Eierbal.': 'Hartelijk dank, Groningers. Echt. Hier, de Eierbal.',
  'Tige tank! – W.': 'Hartelijk dank! – W.',
  'Tige tank foar de auto. W.': 'Hartelijk dank voor de auto. W.',
  'Priuw, jonge.': 'Proef, jongen.',
  // Mem Terpstra (storyarc.js contact)
  'Pas goed op dysels, famke. – M.': 'Pas goed op jezelf, meisje. – M.',
  'Anita, famke? Met mij. Myn jonges hebben dyn auto.': 'Anita, meisje? Met mij. Mijn jongens hebben jouw auto.',
  'Op de trein naar Ljouwert, fan\'e middei. Net fertelle dat ik belde.': 'Op de trein naar Leeuwarden, vanmiddag. Niet doorvertellen dat ik belde.',
  'Tige tank. Eh… dank je. Ik zeg niks tegen Tammo.': 'Hartelijk dank. Eh… dank je. Ik zeg niks tegen Tammo.',
  '"Moai stedsje. Foar in wykein."': '"Mooi stadje. Voor een weekend."',
  '"Oant sjen op Gronings Ontzet."': '"Tot ziens op Gronings Ontzet."',
  '"Tige tank."': '"Hartelijk dank."',
  '"tige tank"': '"hartelijk dank"',
  'Foar in wykein.': 'Voor een weekend.',
  'Pompeblêden': 'Plompenbladeren',
  'Fryske meeuw': 'Friese meeuw',
  'Operaasje Aaibal': 'Operatie Eierbal',
  '"fakmanskip"': '"vakmanschap"',
  'SEIL LOS!': 'ZEIL LOS!',
  'Moai.': 'Mooi.',
  'Moai!': 'Mooi!',
  'MOAI!': 'MOOI!',
  // Jelle's livestream, calls, posts and cards (storyarc.js contact, storycontact.js)
  'Moai, Grinzers! Hier is Jelle. Jelle Terpstra, van Us Mem Snacks.': 'Mooi, Groningers! Hier is Jelle. Jelle Terpstra, van Us Mem Snacks.',
  'Zoeken jullie je Gouden Eierbal? Sjoch ris wat ik hier heb.': 'Zoeken jullie je Gouden Eierbal? Kijk eens wat ik hier heb.',
  'Zwaaien, jongens. Oant sjen op Gronings Ontzet!': 'Zwaaien, jongens. Tot ziens op Gronings Ontzet!',
  'Moai, Grinzer. Hier is Jelle. Wij moeten eens hardrijden, op jullie ringweg.': 'Mooi, Groninger. Hier is Jelle. Wij moeten eens hardrijden, op jullie ringweg.',
  'Met een eigen auto, hear. As dat jild der is.': 'Met een eigen auto, hoor. Als dat geld er is.',
  'Wie heeft mijn flagge…? In DUIF?! Ik weet wel wie die duif is.': 'Wie heeft mijn vlag…? Een DUIF?! Ik weet wel wie die duif is.',
  'Moai, Grinzers. Kom naar het Stadsbalkon. Ik heb een bod voor jullie.': 'Mooi, Groningers. Kom naar het Stadsbalkon. Ik heb een bod voor jullie.',
  'Moai, Grinzers! Kijk eens omhoog. Wat een aardich tuorke, no.': 'Mooi, Groningers! Kijk eens omhoog. Wat een aardig torentje, nu.',
  // phone and Sikkom feed (storyarc.js, phone.js, postgame.js)
  'Moai, Grinzers! Hier is Jelle. Operaasje Aaibal is begonnen. Oant sjen op Gronings Ontzet!': 'Mooi, Groningers! Hier is Jelle. Operatie Eierbal is begonnen. Tot ziens op Gronings Ontzet!',
  'Dat vet was van mij! No ja. Ik heb meer. Operaasje Aaibal gaat gewoon door, Grinzers.': 'Dat vet was van mij! Nou ja. Ik heb meer. Operatie Eierbal gaat gewoon door, Groningers.',
  '"Op de ringweg, met een eigen auto. As dat jild der is."': '"Op de ringweg, met een eigen auto. Als dat geld er is."',
  'Dit is net klear, Grinzer. Op Gronings Ontzet zien we wel wie het hardst gaat.': 'Dit is nog niet klaar, Groninger. Op Gronings Ontzet zien we wel wie het hardst gaat.',
  '[selfie met een boos gezicht] Wie heeft mijn flagge…? In DUIF?! Ik weet wel wie die duif is.': '[selfie met een boos gezicht] Wie heeft mijn vlag…? Een DUIF?! Ik weet wel wie die duif is.',
  'Sûkelade, Grinzers! Lekker? De echte gaat fan\'e jûn de lucht in.': 'Chocola, Groningers! Lekker? De echte gaat vanavond de lucht in.',
  'Ik sta in een weiland bij Ten Boer. Mei kij. Dit is noch net klear, Grinzers.': 'Ik sta in een weiland bij Ten Boer. Met koeien. Dit is nog niet klaar, Groningers.',
  'Tige tank voor het lenen van de auto. Hij rijdt beter dan mijn trekker. Net fertelle.': 'Hartelijk dank voor het lenen van de auto. Hij rijdt beter dan mijn trekker. Niet doorvertellen.',
  'Moai dien, Grinzers. Volgend jaar weer? Dan mogen jullie naar Ljouwert komen.': 'Mooi gedaan, Groningers. Volgend jaar weer? Dan mogen jullie naar Leeuwarden komen.',
  'Moai, Grinzers! Revanche? Elf bruggen, een fierljep of een skûtsje. Kies mar.': 'Mooi, Groningers! Revanche? Elf bruggen, een fierljep of een skûtsje. Kies maar.',
  'Ik heb geoefend, hear. Deze keer win ik. Wis en wrachtich.': 'Ik heb geoefend, hoor. Deze keer win ik. Zeker weten.',
  'Mijn mem zegt: Jelle, laat die Grinzers maar winnen. Maar mijn mem is er niet.': 'Mijn moeder zegt: Jelle, laat die Groningers maar winnen. Maar mijn moeder is er niet.',
  'Moai! Jullie hebben mijn kaartje gevonden? Tige tank voor het wachten.': 'Mooi! Jullie hebben mijn kaartje gevonden? Hartelijk dank voor het wachten.',
  'Grunn is een aardig groot dorp. Mar wat Grunn kin, kin Fryslân better.': 'Groningen is een aardig groot dorp. Maar wat Groningen kan, kan Friesland beter.',
  'De Eierbal? Nooit van gehoord. Oant sjen op Gronings Ontzet!': 'De Eierbal? Nooit van gehoord. Tot ziens op Gronings Ontzet!',
  'Moai, Grinzers. Revanche? Elf bruggen, een fierljep-duel en een skûtsje-sprint. Mijn stipkes staan op jullie kaart.': 'Mooi, Groningers. Revanche? Elf bruggen, een fierljep-duel en een skûtsje-sprint. Mijn stipjes staan op jullie kaart.',
  'De Fryske Snackkening': 'De Friese Snackkoning',
  'de Fryske Snackkening': 'de Friese Snackkoning',
  // fierljep.js bubbles
  'Oant sjen, Grinzers!': 'Tot ziens, Groningers!',
  'Moaie sprong, al zeg ik het zelf.': 'Mooie sprong, al zeg ik het zelf.',
  'Wiet! Hielendal wiet!': 'Nat! Helemaal nat!',
  'Sjoch mar ris!': 'Kijk maar eens!',
  // post-game (pg_lines.js)
  'Moai! Noch in potsje, Grinzers?': 'Mooi! Nog een potje, Groningers?',
  'Deze keer win ik. Wis en wrachtich.': 'Deze keer win ik. Zeker weten.',
  'Klaar voor de revanche, Grinzers?': 'Klaar voor de revanche, Groningers?',
  'Ien, twa, trije... fuort!': 'Een, twee, drie... weg!',
  'Kijk maar naar mijn hekweach, Grinzer!': 'Kijk maar naar mijn kielzog, Groninger!',
  'Deze brug is van mij. En de volgende ek.': 'Deze brug is van mij. En de volgende ook.',
  'Gas derop! Of is dat in trapfyts?': 'Gas erop! Of is dat een trapfiets?',
  'Wacht efkes! Mijn motor is nog koud!': 'Wacht even! Mijn motor is nog koud!',
  'Hoe vonden jullie dat gatsje?': 'Hoe vonden jullie dat gaatje?',
  'Net slim. Ik laat jullie even voorgaan.': 'Niet erg. Ik laat jullie even voorgaan.',
  'Goed gevaren, hear. Net fertelle in Snits.': 'Goed gevaren, hoor. Niet doorvertellen in Sneek.',
  'Elf bruggen. Jullie waren beter. Hjoed.': 'Elf bruggen. Jullie waren beter. Vandaag.',
  'Elf bruggen, elf keer voor! Moai, hè?': 'Elf bruggen, elf keer voor! Mooi, hè?',
  'Oefen maar, Grinzers. Jelle wacht wel.': 'Oefen maar, Groningers. Jelle wacht wel.',
  'Sjoch en lear!': 'Kijk en leer!',
  'Deze is voor Fryslân!': 'Deze is voor Friesland!',
  'Wiet! Die telt niet, hear!': 'Nat! Die telt niet, hoor!',
  'Dat is de mjitte. Spring er maar overheen.': 'Dat is de maat. Spring er maar overheen.',
  'Beter dan dat wordt het niet, Grinzer.': 'Beter dan dat wordt het niet, Groninger.',
  'Hoe! Dat was net min.': 'Hé! Dat was niet slecht.',
  'Ferhip, die heeft geoefend.': 'Verdikkie, die heeft geoefend.',
  'Plons! Zwemmen kunnen jullie teminsten.': 'Plons! Zwemmen kunnen jullie tenminste.',
  'Te betiid los. Dat zie ik van hier.': 'Te vroeg los. Dat zie ik van hier.',
  'Verder dan ik. Net fertelle, hear.': 'Verder dan ik. Niet doorvertellen, hoor.',
  'Moaie sprong. Ik ga naar huis en oefenen.': 'Mooie sprong. Ik ga naar huis en oefenen.',
  'Fryslân wint! Maar jullie waren dichtbij.': 'Friesland wint! Maar jullie waren dichtbij.',
  'Kom maar werom als jullie vleugels hebben, Grinzers.': 'Kom maar terug als jullie vleugels hebben, Groningers.',
  'Seil los!': 'Zeil los!',
  'Een skûtsje heeft gjin motor nedich. Alleen fakmanskip.': 'Een skûtsje heeft geen motor nodig. Alleen vakmanschap.',
  'Je zeil klappert, Grinzer!': 'Je zeil klappert, Groninger!',
  'De wind is Frysk vandaag.': 'De wind is Fries vandaag.',
  'Hoe kan dat nou? Mijn seil staat goed!': 'Hoe kan dat nou? Mijn zeil staat goed!',
  'Nee! Niet aan myn hek komen!': 'Nee! Niet aan mijn achtersteven komen!',
  'Dat is gewoon gelok met de wind.': 'Dat is gewoon geluk met de wind.',
  'Jullie kunnen zeilen. Jelle schaamt zich in bytsje.': 'Jullie kunnen zeilen. Jelle schaamt zich een beetje.',
  'Windkracht en fakmanskip. Jullie hebben het allebei.': 'Windkracht en vakmanschap. Jullie hebben het allebei.',
  'Sa silet in Fries! Moai oan de wyn.': 'Zo zeilt een Fries! Mooi aan de wind.',
  'Trim dat zeil, Grinzers. Dan praten we verder.': 'Trim dat zeil, Groningers. Dan praten we verder.',
  'Moai, Grinzers! Elf bruggen, één rondje Diepenring. Wie het eerst terug is, wint.': 'Mooi, Groningers! Elf bruggen, één rondje Diepenring. Wie het eerst terug is, wint.',
  'Dan zien we jullie dinsdei wel achter mijn boat.': 'Dan zien we jullie dinsdag wel achter mijn boot.',
  'Fierljeppen, Grinzers! Ik zet de mjitte, jullie springen eroverheen.': 'Polsstokverspringen, Groningers! Ik zet de maat, jullie springen eroverheen.',
  'Dan is dit in hele grote plas.': 'Dan is dit een heel grote plas.',
  'Een echte skûtsjesiler heeft gjin motor nedich. Wind en fakmanskip.': 'Een echte skûtsjezeiler heeft geen motor nodig. Wind en vakmanschap.',
  // achievements (titles)
  'Brêgekening': 'Bruggenkoning',
  'Fierljepkening': 'Fierljepkoning',
  'Skûtsjekening': 'Skûtsjekoning',
  'Better as ús': 'Beter dan de onze',
};

export const GRO = {
  'Kiek. Die duiven luuster\'n noar dij, jong.': 'Kijk. Die duiven luisteren naar jou, jongen.',
  'Een ballon? Doe bist nait goed wies!': 'Een ballon? Jij bent niet goed wijs!',
  'Heel de Grote Markt, mien wicht.': 'Heel de Grote Markt, meisje.',
  'Nait soezen, Tammo. Deurbroezen!': 'Niet treuzelen, Tammo. Doorgaan!',
  'Bist betoeterd?': 'Ben je gek geworden?',
  'Au! Wat dust doe?': 'Au! Wat doe jij?',
  'Au! Doe bist nait goed wies!': 'Au! Jij bent niet goed wijs!',
  'Kiek uut woarst lopst, mien jong!': 'Kijk uit waar je loopt, jongen!',
  'Hé! Kom terug mit mien auto!': 'Hé! Kom terug met mijn auto!',
  'Hier wordt schoten!': 'Hier wordt geschoten!',
  'Der wordt hier een auto jat!': 'Er wordt hier een auto gejat!',
  'Blief stoan, mien jong!': 'Blijf staan, jongen!',
  'Kom mor mit noar t bureau.': 'Kom maar mee naar het bureau.',
  'Moi! Hou dij goud!': 'Hoi! Hou je goed!',
  'Kiek, doar is n bootje!': 'Kijk, daar is een bootje!',
  'Lekker stoet, vers van vandoag!': 'Lekker brood, vers van vandaag!',
  'Grunneger metworst! Wie wil der nog ain?': 'Groninger metworst! Wie wil er nog een?',
  'Kom moar, t is hail goud spul!': 'Kom maar, het is heel goed spul!',
  'Dank joe wel, tot kiek!': 'Dank u wel, tot ziens!',
  'Tot kiek!': 'Tot ziens!',
  'Nait zo hard over de drempels, mien jong!': 'Niet zo hard over de drempels, jongen!',
  'Hou dij goud, chauffeur!': 'Hou je goed, chauffeur!',
  'Hou dij goud!': 'Hou je goed!',
  'Lauw. Nou ja, wat mout, dat mout.': 'Lauw. Nou ja, wat moet, dat moet.',
  'Nait soezen, moar deurbroezen! Hij mout waarm aankomen.': 'Niet treuzelen, gewoon doorfietsen! Hij moet warm aankomen.',
  'Hé, joe doar! Taxi!': 'Hé, u daar! Taxi!',
  'In Stad rieden ze as gekken. Doe toch nait, hè? Noar': 'In de stad rijden ze als gekken. Jij toch niet, hè? Naar',
  'Kiek, dat was nait slecht. Veur n Stadjer.': 'Kijk, dat was niet slecht. Voor een Stadjer.',
  'Mien jong! Hier! Taxi!': 'Jongen! Hier! Taxi!',
  'Rustig aan, hè. Ik heb n nije heup en die is nog nait inreden. Noar t UMCG.': 'Rustig aan, hè. Ik heb een nieuwe heup en die is nog niet ingereden. Naar het UMCG.',
  'Dank joe wel, mien jong. Hier, n pepermuntje. En wat veur de pot.': 'Dank u wel, jongen. Hier, een pepermuntje. En wat voor de pot.',
  '"Moi! Wat mag t wezen?" Een bakkie en n kniepertje': '"Hoi! Wat mag het zijn?" Een bakkie en een kniepertje',
  '"Zo, dat was goud, nait? Hou dij goud!"': '"Zo, dat was goed, niet? Hou je goed!"',
  'Moi! Doe mie mor n eierbal.': 'Hoi! Doe mij maar een eierbal.',
  'Kom op, mien jong, ik heb honger as n peerd.': 'Kom op, jongen, ik heb honger als een paard.',
  'Dat is goud spul, mien wicht!': 'Dat is goed spul, meisje!',
  'Ik goa wel noar hoes. Stoet eten.': 'Ik ga wel naar huis. Brood eten.',
  'Kon minder!': 'Geweldig! (Gronings: kon minder)',
  '"Dat heb ik van mien laven nog nait zain. Ze zwommen synchroon!"': '"Dat heb ik van mijn leven nog niet gezien. Ze zwommen synchroon!"',
  '"Twee reuzen op ain fatbike kochten alles op. Contant, oet n klomp. Kon minder, veur ons."': '"Twee reuzen op één fatbike kochten alles op. Contant, uit een klomp. Prima, voor ons."',
};

const ALL = { ...GRO, ...FY };
const KEYS = Object.keys(ALL).sort((a, b) => b.length - a.length);
const cache = new Map();

// The Dutch translation of a shown line, or null when it needs none.
export function dutchFor(text) {
  if (!text) return null;
  const s = String(text);
  if (cache.has(s)) return cache.get(s);
  let out = ALL[s] ?? null;
  if (out == null) {
    let t = s;
    for (const k of KEYS) if (k.length >= 5 && t.includes(k)) t = t.split(k).join(ALL[k]);
    out = t !== s ? t : null;
  }
  if (cache.size > 800) cache.clear();
  cache.set(s, out);
  return out;
}

export function langOf(text) {
  const s = String(text || '');
  if (s in FY) return 'fy';
  if (s in GRO) return 'gro';
  return KEYS.some((k) => k.length >= 5 && s.includes(k) && k in FY) ? 'fy' : dutchFor(s) ? 'gro' : null;
}

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// HTML for a line plus its Dutch subtitle (both escaped).
export function dualHtml(text) {
  const nl = dutchFor(text);
  return escHtml(text ?? '') + (nl ? `<span class="nl-sub" lang="nl">${escHtml(nl)}</span>` : '');
}

// Sets an element to a line plus its Dutch subtitle.
export function setDualText(el, text) {
  if (!el) return;
  el.textContent = text ?? '';
  const nl = dutchFor(text);
  if (!nl) return;
  const sub = document.createElement('span');
  sub.className = 'nl-sub';
  sub.lang = 'nl';
  sub.textContent = nl;
  el.appendChild(sub);
}

// Frisian words that Dutch and Gronings don't use (skûtsje and Fryslân as
// names aside, like the brands Us Mem and Snits Snel): a line with one needs a Dutch subtitle.
const FY_WORDS = /\b(moaie?|grinzers?|jimme|jim|hjir|hjoed|dyn|myn|wy|binne|tige|gjin|gjinien|fertelle|oant|sjoch|sjen|fan|foar|efkes|wiet|neat|noait|hawwe|priuw|mjitte|wyn|seil|hiel|grutte|werom|j[ûu]n|[úu]s|hear|fleugels|wachtsje|oefenje|fuort|lear|sis|seit|nedich|fakmanskip|skamje|bytsje|betiid|teminsten|ferhip|wrachtich|jild|gen[ôo]ch|mem|stipkes|flagge|sûkelade|kij|klear|famke|dysels|middei|Ljouwert|Snits|Operaasje|Aaibal|hekweach|gatsje|trapfyts|derop|potsje|ek|mar|Frysk|Fryske|dinsdei|gelok)\b/i;
export function looksFrisian(text) {
  const s = String(text || '').replace(/sk[ûu]tsje\w*|Fryslân|JelleWâld|Us Mem|Mem Terpstra|Snits Snel/gi, '');
  return /[ûêâôú]/.test(s) || FY_WORDS.test(s);
}
