# Tessa spreekt standaard Nederlands (issue #134)

**Besluit van de eigenaar (verhaalronde 3):** Tessa is Nederlandse en praat standaard Nederlands. Ze mag af en toe een Gronings woord zeggen als iemand van buiten de streek (voorzichtig, licht stuntelig, soms met een verbetering door een Groninger). Vastgelegd in [STIJLGIDS.md](STIJLGIDS.md). De bestaande opnames hebben nog het Groningse accent; heropnemen kost TTS en wacht op akkoord.

Onderzoek, geen TTS gedraaid. Stand: nieuwe verhaal (`game/storydata/script.json`) en de stem-config.

## Bevinding

- **De geschreven tekst van Tessa is al standaard Nederlands.** Alle 274 tekst-only regels van Tessa zijn Nederlands (geen aanpassing nodig). Citaten van anderen blijven staan ("doe bist schier" is Tammo, "Foar mem"/"Tige tank" staan op kaartjes).
- **Het accent zit in de opname, niet in de tekst.** `scripts/tts_cast.mjs`: `Anita: { voice: 'Callirrhoe', who: 'Groningse vrouw, lacherig en ad rem', accent: ACCENT }`, met `ACCENT = GRO_ACCENT` ("spoken in Gronings dialect (Grunnegs) exactly as written, warm Groningen accent"). `TTS_LANG = 'gro'`: `scripts/gemini_tts.py` spreekt niet de geschreven tekst uit, maar de Gronings-vertaling uit `scripts/gronings_spoken.json` ("Een kat" wordt "N kat", "Hij heeft" wordt "Hai het", "Jij" wordt "Doe").
- Van de 106 opgenomen Tessa-regels in het nieuwe verhaal is de gesproken tekst bij **95** anders dan de geschreven. In het hele manifest zijn dat 295 van de 315 Anita-regels (oud en nieuw).

## Wat nodig is (geen tekstwijziging)

1. `tts_cast.mjs`: voor Tessa `who: 'Nederlandse vrouw ...'` en `accent`: standaard Nederlands, geen dialect. Gronings staat in de stijl en in het spoken-script.
2. Tessa-regels met `lang: 'own'` (gesproken = geschreven tekst) in plaats van `gro` (de code in `gemini_tts.py` kent die al).
3. De 95 hieronder (en de 200 oude Klassiek-regels) opnieuw inspreken; dat is TTS-uitgave en vraagt akkoord van de eigenaar.
4. Regels met Gronings/Fries in de geschreven tekst zelf (hieronder gemarkeerd **G**) kunnen blijven als citaat, maar "Moi." (M16.6) en "Mien jong." (M26.7) zijn Tessa die Gronings gebruikt; voorstel: "Hoi." en "Mijn jongen." als ze standaard Nederlands moet blijven (beslissing eigenaar).

## Opgenomen regels: geschreven (blijft) en de huidige Gronings gesproken tekst (verdwijnt bij heropname)

Scene | Geschreven tekst (voorstel: blijft zo, standaard Nederlands) | Huidig gesproken (Gronings)
--- | --- | ---
C00.2 | "Uw plan is sympathiek." Dat betekent nee, met een strikje. | "Uw plan is sympathiek." Dat betekent nee, mit n strikje.
C00.2 | Een kat is ook sympathiek. Die krijgt ook geen lening. | N kat is ook sympathiek. Dij kriegt ook gain lening.
C00.2 | Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto. | N frietwagen is n auto mit n luik, Tammo. En ik heb gain auto.
C00.2 | Die rijdt nauwelijks. | Dij rijdt nauwelks.
C00.2 | …Dat is het liefste wat iemand ooit tegen mijn papieren heeft gezegd. | …Dat is t liefste wat ain ooit tegen mien papieren zegd het.
C00.2 | Daarom. Paddepoel, elfde verdieping. Twee kamers en een garage, voor de Fjord. | Doarom. Paddepoel, elfde verdieping. Twij kamers en n garage, veur de Fjord.
C00.2 | Alleen kan ik de huur niet betalen. Jij ook niet. Samen net. | Aleen kin ik de huur nait betoalen. Doe ook nait. Samen net.
C00.2 | Als huisgenoten, Tammo. Teken nou maar. | As huisgenoten, Tammo. Teken nou mor.
C00.2 | Kom. Werk. | Kom. Wark.
C00.3 | Je bent niet rijk, Tammo. Je bent huisgenoot. | Doe bist nait riek, Tammo. Doe bist huisgenoot.
M01.1 | En jij als een fietser zonder fiets. Sleutels, Berend. | En doe as n fietser zonder fiets. Sleutels, Berend.
M01.3 | Spreek voor jezelf. Ik ben heel veel content. | Proat veur dissels. Ik ben hail völ content.
M01.5 | Groot Loug. Zo noemen wíj onszelf. Dat mag hij niet. | Groot Loug. Zo nuimen wíj ons dissels. Dat mag hai nait.
M01.5 | Is dat een vraag? | Is dat n vroage?
M01.6 | Trede twee van de complimentenladder, Tammo. | Trede twij van de complimentenladder, Tammo.
M01.6 | Tegen mij. | Tegen mie.
M01.6 | Vijftig euro. Dat is een ventieldopje van de Fjord. | Vieftig euro. Dat is n ventieldopje van de Fjord.
S01 | Lijstje. Twee bedden, één boekenkast, één lamp. Verder niks. | Lieske. Twij bedden, ain boekenkast, ain lamp. Verder niks.
S01 | Die past niet in de lift. | Dij past nait in de lift.
S01 | Wie krijgt de kamer met uitzicht? | Wel kriegt de kamer mit oetzicht?
S01 | Dan neem ik die bij de koelkast. | Dan nuim ik dij bie de koelkast.
S01 | Stap één: niet in paniek raken. | Stap ain: nait in paniek raken.
S01 | Dan kijk jij naar de plaatjes. Ik draai. | Dan kiek doe noar de plaatjes. Ik draai.
S01 | Er blijft één schroefje over. | Der bliedt ain schroefje over.
S01 | Het is een Gronings bedrijf. | t Is n Gronings bedrief.
M02.1 | Hij heeft mijn pas. Hij heeft mijn pas en hij… | Hai het mien pas. Hai het mien pas en hai…
M02.1 | Mijn pas zit in die automaat. En die automaat zit op die aanhanger. En die aanhanger is van niemand. | Mien pas zit in dij automaat. En dij automaat zit op dij aanhanger. En dij aanhanger is van niemand.
M02.3 | Daar koop je nog geen halve frietwagen van. | Doar koop je nog gain hailve frietwagen van.
M02.3 | Het museum. De Gouden Eierbal. | t Museum. De Gouden Eierbal.
M02.5 | Als iemand die bal steelt, Tammo, dan liever wij. Dan is hij tenminste nog in Stad. | As ain dij bal steelt, Tammo, dan liever wie. Dan is hai tenminste nog in Stad.
M02.5 | Je opa huilde bij elke voetbalwedstrijd. | Dien opa huilde bie elke voetbalwedstried.
M02.5 | …Je mag nee zeggen. | …Doe mogst nee zeggen.
M04.1 | Mijn vriend de duivenkoning. | Mien vriend de duvenkeuning.
M04.3 | Drie camera's, twee bewakers, en een stroomkast achter de fietsenstalling. | Drij camera's, twij bewakers, en n stroomkast achter de fietsenstalling.
M04.3 | Pompeblêden. Een Fries. Hij gaat het echt doen. | Pompeblêden. N Fries. Hai goat t echt doun.
M04.3 | Dat weet je gewoon. | Dat wait je gewoon.
M04.5 | We gaan hem eerder halen dan die Fries. Daarna zien we wel. | Wie goan hom aarder halen as dij Fries. Doarnoa zain wie wel.
M05.1 | Tammo heeft hier nog gestudeerd. Twee weken. | Tammo het hier nog studeerd. Twij weken.
M05.1 | Van het studeren? | Van t studeren?
M05.3 | Je neef werkt 's nachts in het museum? | Dien neef wark s nachts in t museum?
M05.3 | Drie minuten. | Drij menuten.
M05.3 | Dan wordt het tijd. | Dan wordt t tied.
M06.0 | Wachten is het ergste deel van een kraak. | Wachten is t slimste deel van n kraak.
M06.0 | Daarom weet ik het niet zeker. | Doarom wait ik t nait zeker.
M06.0 | Een hele late. | N hiele late.
M06.1 | Dat is architectuur. Eerst dertig jaar mopperen, dan trots. Zo gaat dat hier. | Dat is architectuur. Aarst dartig joar mopperen, dan trots. Zo gaait dat hier.
M06.1 | Geef me je hand. Het is donker daarbinnen. | Geef mie dien hand. t Is duuster doarbinnen.
M06.1 | Voor de grip. | Veur de grip.
M06.3 | Hij. Bedankt. Ons. | Hai. Bedankt. Ons.
M06.3 | En de camera's van daarnet hebben óns gefilmd. | En de camera's van doarnet hebben ons filmd.
M06.4 | Drie minuten. Hand. | Drij menuten. Hand.
M07.1 | Banden stuk, tankwagen pakken, naar de Oosterpoort. | Bannen stuk, tankwagen pakken, noar de Oosterpoort.
M07.1 | Zie je. Daar kun je op rekenen. | Ziest wel. Doar kinst op rekenen.
M07.3 | Trede drie, Tammo. | Trede drij, Tammo.
M11.6 | Niks. Iemand uit Friesland. | Niks. Iemand oet Fryslân.
M07.4 | Rijden, niet praten. | Rieden, nait proaten.
M08.4 | Wat bedoelde ze, "niet tegen haar"? | Wat bedoelde zai, "nait tegen heur"?
T1 | Een kaartje naar maakt niet uit waar. Jij kijkt te schuldig voor een conducteur. | N kaartje noar moakt nait oet woar. Doe kiekst te schuldig veur n conducteur.
T1 | Weet je nog? Met de trein naar Delfzijl, om naar de zee te kijken. | Wust nog? Mit de trein noar Delfzijl, om noar de zee te kieken.
T1 | Jij zei dat de zee achter de dijk lag. Ik heb het twintig jaar geloofd. | Doe zee dat de zee achter de diek lag. Ik heb t twintig joar leufd.
M09.3 | Twee. | Twij.
M11.1 | Jij stuurt, ik zeg wanneer. | Doe stuurst, ik zeg wanneer.
M11.3 | Een oefenbal. Hij oefent hoe hij hem aan zijn moeder geeft. | N oefenbal. Hai oefent hoe hai hom aan zien moeke geft.
M11.3 | Iedereen is romantischer dan jij. | Ieder is romantischer as doe.
M11.6 | Alleen? | Aleen?
M12.1 | Dat is geen noodgeval. | Dat is gain noodgeval.
M12.1 | Ik vraag het, Tammo. Wil je hangen? | Ik vroag t, Tammo. Wilst doe hangen?
M12.3 | Je praatte de hele tijd, aan dat touw. | Doe proatte de hiele tied, aan dat touw.
M14.1 | Famke koopt haar eigen eierbal. | Famke koopt heur aigen eierbal.
M14.1 | Dat was een hele zin, Tammo. | Dat was n hiele zin, Tammo.
M16.1 | O ja? Sinds wanneer bepaal jij dat? | O jo? Zied wanneer bepoal doe dat?
M16.1 | Jaloers? Jij? Wat heb je met Tammo gedaan? | Jaloers? Doe? Wat hest doe mit Tammo doan?
M16.2 | …Ja. Nog eentje dan. | …Jo. Nog ain dan.
M16.6 | Mag je nog steeds niet. | Mag doe nog aaltied nait.
M20.5 | …Ga je dit nu doen? Nu? | …Goast doe dit nou doun? Nou?
M20.5 | Ik haal jouw auto wel terug. Alleen. | Ik haal dien auto wel weer terug. Aleen.
M22.4 | Je zei net iets. | Doe zee nèt wat.
M22.4 | Het klonk goed. | t Klonk goud.
M26.7 | Kon veel minder. | Kon veul minder.
M24.1 | "Foar mem." Voor zijn moeder. | "Foar mem." Veur zien moeke.
M24.1 | Dat is eigenlijk best lief. | Dat is eigenlk best lief.
M24.3 | Heel Grunn klapt voor een duif. | Hail Grunn klapt veur n duuf.
M24.3 | Ik klapte ook. Een beetje. | Ik klapte ook. N betje.
M25.3 | …Het bod viel tegen. | …t Bod vol tegen.
M25.3 | Je biedt geld voor iets wat geen geld is. En je moeder wil iets anders. | Doe biedst geld veur wat gain geld is. En dien moeke wil wat aans.
M25.3 | Dat iemand één keer zegt dat ze de beste was. Dat koop je niet, Jelle. | Dat ain keer ain zegt dat zai de beste was. Dat koop je nait, Jelle.
M25.4 | Nu? | Nou?
M26.1 | Tammo bakt. Ik hou de kraam heel. | Tammo bakt. Ik hol de kraam hail.
M26.1 | Je doet alles onder druk. Daarom werkt het. | Doe dust aals onder druk. Doarom wark t.
M26.6 | Dan is het ernstig. | Dan is t ernstig.
M26.7 | Tammo. Iedereen luistert. | Tammo. Ieder luustert.
M26.7 | Dat telt. Maar ik wil het één keer horen. | Dat telt. Mor ik wil t ain keer hoeren.
M26.7 | Vijf woorden. | Vief woorden.
M26.7 | Mien jong. Dat duurde twaalf jaar. | Mien jong. Dat dúúrde twaalf joar.
E1 | Spijt van de zomer? | Spiet van de zomer?
