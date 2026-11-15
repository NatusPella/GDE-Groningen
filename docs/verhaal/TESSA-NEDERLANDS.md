# Tessa spreekt standaard Nederlands (issue #134, #924)

**Besluit van de eigenaar (verhaalronde 3):** Tessa is Nederlandse en praat standaard Nederlands. Ze mag af en toe een Gronings woord zeggen als iemand van buiten de streek (voorzichtig, licht stuntelig, soms met een verbetering door een Groninger). Vastgelegd in [STIJLGIDS.md](STIJLGIDS.md).

**Stand 15-11-2026 (#924).** De stemkeuze in de code is goed (`tts_cast.mjs`: `Nederlandse vrouw`, standaard Nederlands, `lang: 'own'`). De oude opnames waren bijna allemaal met de Groningse spreektekst en stijlinstructie gemaakt; daardoor klonk Tessa soms Gronings. Daarnaast bleken 70 opgenomen autoritregels **stil** te zijn: `banter.js` zocht ze alleen in het banter-manifest terwijl het verhaal ze in `lines` opneemt. De selectie is gerepareerd en de opnameronde is op **15-11-2026** gedraaid: **367 + 21 + 2 clips** zijn opnieuw ingesproken via de LiteLLM-gateway (ca. **$0,23**), plus een proef van 8 clips in `game/audio/voicelines/proef/`. De sleutel is nooit gelezen of geprint; de TTS-scripts hebben hem zelf uit `.env` gehaald.

## Wat in de code is gerepareerd

1. `game/js/storytext.js`: `banterExchanges()` geeft per autoritregel het manifest mee waar zijn opname staat (`rec`: story, lines of banter) plus de naam waaronder hij in dat manifest staat; `banterLineVoice(line)` zoekt de opname daar op. `game/js/banter.js` gebruikt die resolver. Vóór #924 keek de autorit alleen in `banter`, waardoor 70 van de 86 gesproken autoritregels (Tammo én Tessa) zwegen terwijl de clips er wel waren.
2. `scripts/tts_cast.mjs`: `DUO.Anita` is `Nederlandse vrouw` met `accent` standaard Nederlands; de nieuwe helper `langOf(accent)` bepaalt per opdracht `lang: 'own'` (geschreven tekst) of `'gro'` (Groningse spreektekst).
3. De TTS-generatoren zetten die `lang` nu per regel: `tts_lines_list.mjs` (verhaal, banter, hints, sms), `tts_sidejobs_lines.mjs` (bijbaantjes) en `tts_barks_lines.mjs` (barks). Vóór #924 viel elke regel zonder `lang` terug op `'gro'`, ook Tessa's.
4. `tts_lines_list.mjs` keurt een opname nu op **taal**: een oude Groningse take van een Nederlandse regel geldt niet meer als actueel en komt opnieuw in de wachtrij. Dat geldt ook voor de verhaallijnen uit `script.json` (die alleen naar het model keken).
5. `tts_sidejobs.py` en `tts_barks.py` geven de taal mee aan `current()`, zodat een take in de verkeerde taal opnieuw wordt opgenomen en een Nederlandse take daarna blijft staan.
6. `scripts/tts_tessa_test.mjs` en `scripts/voice_lookup_audit_test.mjs` bewaken de resolutie, de stemkeuze per lijst en de taalcontrole.

## Wat er op 15-11 is opgenomen

| Ronde | Wat | Aantal | Resultaat |
|---|---|---:|---|
| Verhaal, autorit, hints, sms | Tessa's bestaande takes in het Nederlands, plus één Nederlandse toeristenbubbel | **367** | alle 367 current; `tts_lines.json` daarna **0 jobs** |
| Barks | Tessa's korte reactieclips | **21** | alle 21 `lang: own` |
| Bijbaantjes | Tessa's twee duo-regels | **2** | beide `lang: own` |

De wachtrij is na de ronde weer **0 jobs**; `voice_coverage` staat op **2664/2664** en `audio_herkomst` telt **4147** clips, allemaal gelogd. Eén bubbletekst (`~f|Mijn koffie!`) komt in twee contexten voor (toeriste op de boot en klant in de bus) en heeft maar één opname; de Nederlandse take dekt beide en wordt niet heen en weer opnieuw opgenomen (`SHARED_BUBBLE` in `tts_lines_list.mjs`).

**Wat nog open is:** de 18 regels van Geesje + 2 van Rotor Roelf (zie hieronder), de kapotte barks-generator (#812) en de stale, niet-gebruikte oude opnames (`audio_unused` meldt 1.874 manifestregels; aparte opruiming). Tessa's 8 stille appjes en Tammo's 6 zijn bewust `textOnly`.

**Grens bij de barks.** `scripts/tts_barks.json` heeft de taal per regel gekregen, zodat `tts_barks.py` Tessa's 21 clips opnieuw opneemt. De generator `tts_barks_lines.mjs` zelf loopt sinds de Kiekdoar-hernoeming (#812) vast op `WANTED_UP`; dat is een aparte bug (de lijst is nu met de hand bijgewerkt, zonder de nieuwsregels te wijzigen).

**Geesje (aanvulling op #924).** Geesje heeft haar stem (`Pulcherrima`) al, maar 18 nieuwe verhaalregels (M09, M21, M23, M26, M30) wachten op een **Groningse spreektekst** van een kenner; zonder die tekst weigert de generator terecht om in het Nederlands op te nemen. Dat is een tekstknoop, geen stemknoop: zie [GRONINGS-20-SPREEKTEKSTEN.md](GRONINGS-20-SPREEKTEKSTEN.md) en `scripts/gronings_spoken_draft.json`. Zodra de kenner de teksten invult (`node scripts/gronings_merge_draft.mjs --write`), komen de 18 regels met `node scripts/tts_lines_list.mjs` in de wachtrij. Hetzelfde geldt voor de 2 regels van Rotor Roelf.

## Geschiedenis: de eerste meting (15-11, vóór de reparatie)

De oude meting hieronder is bewaard als bewijs van de omvang; de aantallen zijn die van vóór de reparatie.


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
