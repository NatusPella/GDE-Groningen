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
import { MODS, grunnify } from './cheatmods.js';

export const FY = {
  // the definitive script (docs/verhaal/D-definitief.md)
  'Ljouwert': 'Leeuwarden',
  'pompeblêden': 'pompeblêden (de Friese plompenbladeren)',
  'iets wat van mem is': 'iets wat van mijn moeder is',
  'dan ziet mem hem': 'dan ziet mijn moeder hem',
  '…Tige tank.': '…Bedankt.',
  'Wat is dit?! Ik sjoch neat!': 'Wat is dit?! Ik zie niks!',
  'Moai foar in wykein': 'Mooi voor een weekendje',
  'dat famke yn it read: sa\'n leaf gesicht': 'dat meisje in het rood: wat een lief gezicht',
  'leit op it skûtsje': 'ligt op het skûtsje',
  'Oant sjen op it Ontset': 'Tot ziens op het Ontzet',
  'Tige tank foar de auto': 'Bedankt voor de auto',
  'Myn soan hat dy reade auto op de trein nei Ljouwert set.': 'Mijn zoon heeft die rode auto op de trein naar Leeuwarden gezet.',
  'Sjochst? Dat wie alles wat ik woe.': 'Zie je? Dat was alles wat ik wilde.',
  'Pas op dysels, famke. – M.': 'Pas op jezelf, meisje. – M.',
  'Ik bin sa werom': 'Ik ben zo terug',
  'Ik woe him allinnich oan mem jaan. Foar de útslach.': 'Ik wilde hem alleen aan mem geven. Voor de uitslag.',
  'Dit is net klear, Grinzer.': 'Dit is nog niet klaar, Groninger.',
  'Moai, Grinzer.': 'Mooi, Groninger.',
  'Moai, Rikus.': 'Mooi, Rikus.',
  'Dat vet was van mij. No ja.': 'Dat vet was van mij. Nou ja.',
  'As dat jild der is.': 'Als dat geld er is.',
  'Better as ús. Net fertelle.': 'Beter dan de onze. Niet doorvertellen.',
  'Net fertelle, hè': 'Niet doorvertellen, hè',
  'Foar mem': 'Voor mem (mijn moeder)',
  'foar mem': 'voor mem',
  'FOAR MEM': 'VOOR MEM',
  'Famke koopt haar eigen eierbal.': 'Dat meisje koopt haar eigen eierbal.',
  'Wie wint, mag famke een eierbal geven.': 'Wie wint, mag dat meisje een eierbal geven.',
  'Doe de groeten aan famke in het rood.': 'Doe de groeten aan het meisje in het rood.',
  'Tige tank, famke. – M.': 'Hartelijk dank, meisje. – M.',
  'famke': 'meisje',
  'Famke': 'Meisje',
  // Durk after the story bumper-car ride (storyarc.js r-kermis)
  'Maar eerst bier. Vanavond in de Poelestraat, de baas trakteert. Net fertelle, hè?': 'Maar eerst bier. Vanavond in de Poelestraat, de baas trakteert. Niet doorvertellen, hè?',
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
  'Tige tank! – J.': 'Hartelijk dank! – J.',
  'Tige tank foar de auto. J.': 'Hartelijk dank voor de auto. J.',
  'Priuw, jonge.': 'Proef, jongen.',
  // Mem Terpstra (storyarc.js contact)
  'Pas goed op dysels, famke. – M.': 'Pas goed op jezelf, meisje. – M.',
  'Tessa, famke? Met mij. Myn jonges hebben dyn auto.': 'Tessa, meisje? Met mij. Mijn jongens hebben jouw auto.',
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
  // phone and Kiekdoar feed (storyarc.js, phone.js, postgame.js)
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
  // the Ommeland extras (ommelandlines.js): a lost fierljepper, the twins, Jelle
  'Wêr is Fryslân? Ik sprong over één sloot te veel en nu is alles Gronings.': 'Waar is Friesland? Ik sprong over één sloot te veel en nu is alles Gronings.',
  'Douwe. Daar komt ien aan.': 'Douwe. Daar komt iemand aan.',
  'Doe gewoan. Wij zijn gewoon boeren.': 'Doe gewoon. Wij zijn gewoon boeren.',
  'Hé! Dat is ús koe!': 'Hé! Dat is onze koe!',
  'Naar de trekker, Durk! Gau!': 'Naar de trekker, Durk! Snel!',
  'Stean bliuwe, koe!': 'Blijf staan, koe!',
  'Jelle mag dit net weten.': 'Jelle mag dit niet weten.',
  'Jelle wit it al, Durk.': 'Jelle weet het al, Durk.',
  'Hebbe! Bijna!': 'Hebben! Bijna!',
  'Ús motor! Hij is stil!': 'Onze motor! Hij is stil!',
  'Niet aan de limo komen! Die is fan Jelle!': 'Niet aan de limo komen! Die is van Jelle!',
  'Hij doet het net mear. Wij lopen wel naar hûs.': 'Hij doet het niet meer. Wij lopen wel naar huis.',
  'Hebbe! Op nei Ljouwert!': 'Hebben! Op naar Leeuwarden!',
  'Moai, Grinzers. Durk en Douwe hebben een koe meegenomen. Zonder te vragen.': 'Mooi, Groningers. Durk en Douwe hebben een koe meegenomen. Zonder te vragen.',
  'Ze wilden mij toch nog iets laten winnen. De keuring in Ljouwert, met een Grinzer koe. Ik skamje my dea.': 'Ze wilden mij toch nog iets laten winnen. De keuring in Leeuwarden, met een Groninger koe. Ik schaam me dood.',
  // the new story (docs/verhaal/nieuw, game/storydata/script.json): lines where 'mem' is a Dutch word or a Frisian one
  'Dat noemen wij ondernemen. Oant sjen.': 'Dat noemen wij ondernemen. Tot ziens.',
  '"Voor mem." Voor zijn moeder.': '"Voor mijn moeder." Voor zijn moeder.',
  'Mem is eenennegentig. Zeventig jaar heeft ze tweede gestaan, Grinzers.': 'Mijn moeder is eenennegentig. Zeventig jaar is ze tweede geweest, Groningers.',
  'Wil je mem dat wel?': 'Wil je moeder dat wel?',
  'Mem wil niks. Daarom doe ik het.': 'Mijn moeder wil niks. Daarom doe ik het.',
  'Oant sjen!': 'Tot ziens!',
  'Baas heeft een afspraak met mem in de kruitkelder. Wij houden jullie een uur bezig.': 'De baas heeft een afspraak met zijn moeder in de kruitkelder. Wij houden jullie een uur bezig.',
  'Mem. Hier is hij. Voor u. Ik heb hem genomen zoals het hoort: netjes, met een bedankje.': 'Moeder. Hier is hij. Voor u. Ik heb hem genomen zoals het hoort: netjes, met een bedankje.',
  'Mem. Dat is een inbreuk op onze overeenkomst.': 'Moeder. Dat is een inbreuk op onze overeenkomst.',
  'Mem. De afspraak was: u houdt hem vast tot ik win. Dit is een overtreding van onze overeenkomst.': 'Moeder. De afspraak was: u houdt hem vast tot ik win. Dit is een overtreding van onze overeenkomst.',
  'Jij kende Mem.': 'Jij kende Mem. (Mem is Fries voor mama: de moeder van Jelle)',
  'Mem. Dit is nog niet voorbij. Mijn juristen noemen het een geschil.': 'Moeder. Dit is nog niet voorbij. Mijn juristen noemen het een geschil.',
  'Ik wist niet waar de bal lag. Ik wist wel dat Mem iets voor Jelle verborgen hield. Dat had ik tegen jou moeten zeggen.': 'Ik wist niet waar de bal lag. Ik wist wel dat Mem (Jelles moeder) iets voor Jelle verborgen hield. Dat had ik tegen jou moeten zeggen.',
  'Zeg maar Mem.': 'Zeg maar Mem. (Fries voor mama)',
  '"Tige tank foar de bal. – J."': '"Hartelijk bedankt voor de bal. – J."',
  'En nu zijn wij de bezigheid van mem.': 'En nu zijn wij de bezigheid van zijn moeder.',
  'Van Jelles mem?': 'Van Jelles moeder?',
  'Mem. Kom je morgen bij mijn kraam staan? Het is mijn naam.': 'Moeder. Kom je morgen bij mijn kraam staan? Het is mijn naam.',
  'Wij houden hem heel. Baas zegt… nee. Mem zegt.': 'Wij houden hem heel. De baas zegt… nee. Zijn moeder zegt.',
  'Mem. De notaris sluit…': 'Moeder. De notaris sluit…',
  '…Ja, mem.': '…Ja, moeder.',
  'Ja, mem.': 'Ja, moeder.',
  'Dank u, Mem.': 'Dank u, mevrouw.',
};

export const GRO = {
  "'t Het nog nooit zo donker west, of 't wer altied wel weer licht.": 'Het is nog nooit zo donker geweest, of het werd altijd weer licht.',
  'Wat mout, dat mout.': 'Wat moet, dat moet.',
  'Kom mor.': 'Kom maar.',
  'Mien jong.': 'Mijn jongen.',
  'Doe open, jonge.': 'Doe open, jongen.',
  // the definitive script (docs/verhaal/D-definitief.md)
  'Groot Loug': 'Een groot dorp',
  'Goidag': 'Goedendag',
  'Hij luustert noar dij, jong': 'Hij luistert naar jou, jongen',
  'Diep in de ogen kieken': 'Diep in de ogen kijken',
  'As \'t nait gait zoas \'t mot, mot \'t mor zoas \'t gait.': 'Als het niet gaat zoals het moet, moet het maar zoals het gaat.',
  'Braid noar de zin': 'Helemaal tevreden',
  'Valt mie nait of': 'Dat valt me niet tegen',
  'Eet je krentjebrij': 'Eet je pap met krenten',
  'Die bal is gien geld, jong': 'Die bal is geen geld, jongen',
  'Hest weer veur \'n ander?': 'Heb je het weer voor elkaar?',
  'Doar zuukt gain Fries noar': 'Daar zoekt geen Fries naar',
  'Kovvie mit kouke?': 'Koffie met koek?',
  'doe bist schier': 'jij bent mooi',
  'Doe bist schier': 'Jij bent mooi',
  'Ken ik ja nait roeken': 'Hoe moet ik dat nou weten',
  'Woist ja wel': 'Je weet het toch',
  'een kloet in de strotte': 'een brok in de keel',
  'Dan komt het goud': 'Dan komt het goed',
  'twijduustern': 'de schemer',
  'Nait tegen d\'Olle Grieze aan': 'Niet tegen de Martinitoren aan',
  '…Goud.': '…Goed. (Gronings compliment)',
  'Kon veel minder': 'Heel erg goed (Gronings: kon veel minder)',
  // kermisbaas Jan and Rotor Roelf in the story steps around the kermis and the demo flight (storyarc.js, kermis.js, storyfun.js)
  'Gratis rondje, jong! Bots die twij reuzen mor oet mien baan.': 'Gratis rondje, jongen! Bots die twee reuzen maar uit mijn baan.',
  'W is omhoog, de pijltjes vooruit. En nait tegen d\'Olle Grieze aan, hè?': 'W is omhoog, de pijltjes vooruit. En niet tegen de Martinitoren aan, hè?',
  '"De leste, hè."': '"De laatste, hè."',
  // boer Roelf and Hilje hide the Eierbal (storyarc.js s-carbid)
  'Roelf. Dat is de Gouden Eierbal. Uut t museum.': 'Roelf. Dat is de Gouden Eierbal. Uit het museum.',
  'In de melkbus, doar zuukt gain Fries noar. Op Ontzet breng ik hom zulf.': 'In de melkbus, daar zoekt geen Fries naar. Op Ontzet breng ik hem zelf.',
  // the Ommeland extras (ommelandlines.js): the people at the end of the world and in the villages
  'Doar achter is niks meer, mien jong. Doar holdt de wereld op. Ik heb t zulf zain.': 'Daar achter is niks meer, jongen. Daar houdt de wereld op. Ik heb het zelf gezien.',
  'Mooi, hè? Hier kiek ik al veertig joar noar. Der is nog nooit wat veranderd.': 'Mooi, hè? Hier kijk ik al veertig jaar naar. Er is nog nooit wat veranderd.',
  'Moi! n Bakje kovvie en n plak kouk? Doar wordst weer mens van.': 'Hoi! Een bakje koffie en een plak koek? Daar word je weer mens van.',
  'Stadjers in Hoaren. Kiek, dat mag ook wel es.': 'Stadjers in Haren. Kijk, dat mag ook wel eens.',
  'Drij vroagen over t Grunnegs. Goud antwoord, goud geld.': 'Drie vragen over het Gronings. Goed antwoord, goed geld.',
  'Goud zo! Doe bist n echte Grunneger.': 'Goed zo! Jij bent een echte Groninger.',
  'Nee, mien jong. Dat is t nait.': 'Nee, jongen. Dat is het niet.',
  'Alle drij goud! Doar mout ik n rondje van geven.': 'Alle drie goed! Daar moet ik een rondje van geven.',
  'Welkom op de stelling. Hou je vast, de wind is hier altied eerlijk.': 'Welkom op de stelling. Hou je vast, de wind is hier altijd eerlijk.',
  "Doar ligt t Reitdiep. Vroeger voeren ze zo noar zee. Nou voaren d'r allent nog toeristen.": 'Daar ligt het Reitdiep. Vroeger voeren ze zo naar zee. Nu varen er alleen nog toeristen.',
  'Pisa het n scheve toren. Wie hebben n schevere. Moak mor n foto.': 'Pisa heeft een scheve toren. Wij hebben een schevere. Maak maar een foto.',
  'Mooi! Nou liekt t net of ie hom tegenholden.': 'Mooi! Nu lijkt het net of je hem tegenhoudt.',
  'Moi! Alles van t aigen erf. Behalve de klanten.': 'Hoi! Alles van het eigen erf. Behalve de klanten.',
  'Eet smakelk! En nait alles in ain moal, hè.': 'Eet smakelijk! En niet alles in één keer, hè.',
  'Ain keer luden mag. Veur de gezelligheid.': 'Eén keer luiden mag. Voor de gezelligheid.',
  'Zo is t wel mooi west! t Hele dörp stait noast t bèr.': 'Zo is het wel mooi geweest! Het hele dorp staat naast zijn bed.',
  'Moi! Wat mag t wezen? Wie hebben kovvie, bier en proatjes.': 'Hoi! Wat mag het zijn? Wij hebben koffie, bier en praatjes.',
  'Kom der mor weer ais. Loppersum lopt nait weg.': 'Kom er maar weer eens. Loppersum loopt niet weg.',
  'Moi! IJsje, patatje of allebei? Hier op t strand telt t nait.': 'Hoi! IJsje, patatje of allebei? Hier op het strand telt het niet.',
  'Nait te lang in de zun, hè. Ook nait in Grunn.': 'Niet te lang in de zon, hè. Ook niet in Groningen.',
  // Ome Jan (pg_koe.js)
  'Moi. Geertje is vot. Mien beste kou. Kampioen van t Ommeland, drij joar achter nkander.': 'Hoi. Geertje is weg. Mijn beste koe. Kampioen van het Ommeland, drie jaar achter elkaar.',
  'Twij grote kerels in rooie truien, op ain fiets. Ze proatten zo raar.': 'Twee grote kerels in rode truien, op één fiets. Ze praatten zo raar.',
  'Gain idee. Ze zitten in de olle schuur, verderop in t laand. Hoal heur weer, den krigst wat van mie.': 'Geen idee. Ze zitten in de oude schuur, verderop in het land. Haal haar terug, dan krijg je wat van mij.',
  'Maak heur lös en rij heur noar t erf. Ze rent wel mit. Ze is kampioen.': 'Maak haar los en rij haar naar het erf. Ze rent wel mee. Ze is kampioen.',
  'Geertje! Mien wicht! Doar bist weer.': 'Geertje! Mijn meisje! Daar ben je weer.',
  'Hier, veur de muite. En n stukje kees van t erf.': 'Hier, voor de moeite. En een stukje kaas van het erf.',
  'Moi! Hebben jim mien Geertje ook zain?': 'Hoi! Hebben jullie mijn Geertje ook gezien?',
  'Geertje stait weer op stal. Doe mor rustig an.': 'Geertje staat weer op stal. Doe maar rustig aan.',
  // padel opponents (padellines.js)
  'Moi! Wie verliest, trakteert op n eierbal.': 'Hoi! Wie verliest, trakteert op een eierbal.',
  'Doe raakst hom nait eens, jong!': 'Jij raakt hem niet eens, jongen!',
  'Tegen t glas, en weg is e!': 'Tegen het glas, en weg is hij!',
  'Kon minder, hè? Volgende keer beter.': 'Goed, hè? (Gronings: kon minder) Volgende keer beter.',
  'Goed speuld. Ik trakteer wel.': 'Goed gespeeld. Ik trakteer wel.',
  'Ik speul al padel doe nog in de luier lagst.': 'Ik speel al padel sinds jij nog in de luier lag.',
  'Kiek, zo dust dat!': 'Kijk, zo doe je dat!',
  'Nait soezen, bal is al vot!': 'Niet treuzelen, de bal is al weg!',
  'Hé! Dat is nait eerlijk!': 'Hé! Dat is niet eerlijk!',
  'Noar hoes, joe baaident. Oefenen!': 'Naar huis, jullie allebei. Oefenen!',
  'Goed speuld, mien jong.': 'Goed gespeeld, jongen.',
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
  'Kon minder!': 'Prima! (Gronings: kon minder)',
  '"Dat heb ik van mien laven nog nait zain. Ze zwommen synchroon!"': '"Dat heb ik van mijn leven nog niet gezien. Ze zwommen synchroon!"',
  '"Twee reuzen op ain fatbike kochten alles op. Contant, oet n klomp. Kon minder, veur ons."': '"Twee reuzen op één fatbike kochten alles op. Contant, uit een klomp. Prima, voor ons."',
  // carbid schieten, the botsauto's and Radio Proat (funlines.js)
  'Moi! De melkbus ligt kloar. Nait te veul wotter, hè.': 'Hoi! De melkbus ligt klaar. Niet te veel water, hè.',
  'Kom mor gaauw, t wordt al schemerg.': 'Kom maar gauw, het wordt al schemerig.',
  'Te vroug, jong. Dat was n scheetje.': 'Te vroeg, jongen. Dat was een scheetje.',
  'Te loat! t Gas is der al oet.': 'Te laat! Het gas is er al uit.',
  'Wat n knaal!': 'Wat een knal!',
  'Kiek uut, hai gaait!': 'Kijk uit, hij gaat!',
  'Raak! Dat heurt ze in Winsum.': 'Raak! Dat horen ze in Winsum.',
  'Mis. Mor t geluud was goud.': 'Mis. Maar het geluid was goed.',
  'Kon minder.': 'Prima. (Gronings: kon minder, het hoogste compliment)',
  'Volgend joar beter. Of t joar doarnoa.': 'Volgend jaar beter. Of het jaar daarna.',
  'Doe mor normaal, den dousto al gek genog.': 'Doe maar normaal, dan doe je al gek genoeg.',
  'Wacht nou ais even op t gas!': 'Wacht nou eens even op het gas!',
  'Doe stoist te soezen, jong.': 'Je staat te suffen, jongen.',
  'Hai vlugt! Hai vlugt!': 'Hij vliegt! Hij vliegt!',
  'Dat ton ligt om! Mooi zo.': 'Die ton ligt om! Mooi zo.',
  'Dat deksel ligt nou bie de buurman.': 'Dat deksel ligt nu bij de buurman.',
  'Doar kinnen ze in Stad nog wat van leren.': 'Daar kunnen ze in de stad nog wat van leren.',
  't Was gezellig. Dat is ook wat.': 'Het was gezellig. Dat is ook wat.',
  'Instappen, instappen! Botsen mag, kopstoten nait!': 'Instappen, instappen! Botsen mag, kopstoten niet!',
  'Nog één rondje! Wie dut mit?': 'Nog één rondje! Wie doet mee?',
  'Leste rondje, mensen!': 'Laatste rondje, mensen!',
  'Afstappen, de tied is om!': 'Afstappen, de tijd is om!',
  'Au, mien nek!': 'Au, mijn nek!',
  'Hé! Kiek toch uut!': 'Hé! Kijk toch uit!',
  'Ik krieg die wel!': 'Ik krijg je wel!',
  'Radio Proat. Wie proaten, joe heuren. Veur Stad en Ommeland.': 'Radio Proat. Wij praten, jij luistert. Voor Stad en Ommeland.',
};

// German and English tourists on the rondvaartboot (rondvaartlines.js)
export const INTL = {
  'Wunderschön, diese Rosen!': 'Prachtig, die rozen!',
  'Wie viele Stufen hat der Turm?': 'Hoeveel treden heeft de toren?',
  'Four in the morning? I\'m in!': 'Vier uur \'s nachts? Ik doe mee!',
  'Münster? Oh. Entschuldigung.': 'Münster? O. Sorry.',
  'Is that the station or a palace?': 'Is dat het station of een paleis?',
  'Das ist wie in Amsterdam, nur ruhiger.': 'Dit is net Amsterdam, alleen rustiger.',
  'Kijk in... what?': 'Kijk in... wat?',
  'Ach du lieber Himmel!': 'Lieve hemel!',
  'Is this included in the ticket?': 'Zit dit bij het kaartje in?',
  'Lovely. Very relaxing.': 'Heerlijk. Echt ontspannend.',
  'So gemütlich hier!': 'Wat is het hier gezellig!',
  'Is this part of the tour?': 'Hoort dit bij de rondvaart?',
  'Wer ist dieser Mann?': 'Wie is die man?',
};

const ALL = { ...GRO, ...FY, ...INTL };
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


const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A long line that differs from its translation in a word or two only gets
// those words glossed inline ("twijduustern (de schemer)") instead of the
// whole line a second time underneath: { pre, word, nl, post } or null.
function glossOf(text, nl) {
  if (!text || !nl) return null;
  const a = String(text).split(' '), b = String(nl).split(' ');
  if (a.length < 6) return null;
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const wa = a.slice(p, a.length - q), wb = b.slice(p, b.length - q);
  if (!wa.length || !wb.length || wa.length > 3 || wb.length > 4) return null;
  let word = wa.join(' '), dut = wb.join(' '), tail = '';
  // punctuation both share stays outside the gloss: "Moi, (Hoi,)" -> "Moi (Hoi),"
  const m = /[.,!?:;…]+$/.exec(word);
  if (m && dut.endsWith(m[0])) { tail = m[0]; word = word.slice(0, -tail.length); dut = dut.slice(0, -tail.length); }
  const pre = a.slice(0, p).join(' '), post = a.slice(a.length - q).join(' ');
  return { pre: pre ? pre + ' ' : '', word, nl: dut, post: tail + (post ? ' ' + post : '') };
}

// HTML for a line plus its Dutch subtitle (both escaped); gloss: a film
// subtitle, where a near-identical second line reads as a doubled subtitle.
export function dualHtml(text, { gloss = false } = {}) {
  const nl = dutchFor(text);
  const g = gloss && glossOf(text, nl);
  if (g) return `${escHtml(g.pre + g.word)} <span class="nl-gloss" lang="nl">(${escHtml(g.nl)})</span>${escHtml(g.post)}`;
  return escHtml((MODS.gronings ? grunnify(text) : text) ?? '') + (nl ? `<span class="nl-sub" lang="nl">${escHtml(nl)}</span>` : '');
}

// Sets an element to a line plus its Dutch subtitle.
export function setDualText(el, text, { gloss = false } = {}) {
  if (!el) return;
  el.textContent = (MODS.gronings ? grunnify(text) : text) ?? '';
  const nl = dutchFor(text);
  if (!nl) return;
  const g = gloss && glossOf(text, nl);
  if (g) {
    el.textContent = g.pre + g.word + ' ';
    const gl = document.createElement('span');
    gl.className = 'nl-gloss';
    gl.lang = 'nl';
    gl.textContent = '(' + g.nl + ')';
    el.append(gl, g.post);
    return;
  }
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
