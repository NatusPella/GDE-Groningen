# Lengte- en tempoplan van het verhaal (21-11)

Onderdeel van epic #1121. De eigenaar vindt het niet erg als het verhaal flink langer wordt ("dat vind ik alleen maar mooi"); dit plan houdt de lengte leuk en niet vol. **Alles hieronder is een ontwerpraming, geen speelmeting:** de cijfers komen uit de verhaaltekst (`node scripts/verhaal_tempo.mjs`) en de ontwerpramingen per akte uit [VERHAAL-SYNOPSIS-21-11.md](VERHAAL-SYNOPSIS-21-11.md); niemand heeft het spel doorgespeeld en de speeltest- en bottooling (Electron) is in deze ronde niet gedraaid.

## 1. Geschatte speeltijd

| Deel | Verhaaltekst nu (min) | Verhaaltekst op main (min) | Ontwerpraming totaal (min) |
|---|---|---|---|
| Akte 1 Moi, Grunn | 21,1 | 18,5 | ca. 62 |
| Akte 2 Het Noorden is groot | 14,5 | 13,0 | ca. 55 |
| Akte 3 Aan de Eems | 14,3 | 10,6 | ca. 55 |
| Akte 4 Zuidwaarts | 17,0 | 14,0 | ca. 58 |
| Akte 5 Ontzet | 20,0 | 17,0 | ca. 47 |
| Deel 4 Nazomer | 7,8 | 6,3 | ca. 25 |
| **Totaal hoofdlijn** | **94,7** | **79,4** | **ca. 300** (5 uur) |

De verhaalherschrijving voegt ongeveer 15 minuten gesproken of gelezen tekst toe (ruim 19%): twaalf overgangsscènes van 20 seconden tot een minuut, Jelle in beeld, de aanlopen, de inspiratiescènes. De opnames van die regels volgen in een TTS-ronde; tot dan lezen ze als ondertitel (leestijd, `readingTime`), dus de raming is aan de ruime kant. Daar bovenop komt wat de speler zelf kiest en wat het spel zelf toevoegt:

- **Carrière-tour** (alle loopbanen en bijbanen, de profvoetbalcarrière): optioneel en onbegrensd; het hoofdverhaal telt het niet mee. Een speler die elke loopbaan eens probeert, voegt ruim 8 tot 10 uur toe (19 loopbanen van ca. 25 tot 30 minuten).
- **Verhuizingen** ([VERHAAL-THUIS-21-11.md](VERHAAL-THUIS-21-11.md)): vier verhuizingen van een paar minuten; ze vervangen reistijd, ze voegen die niet toe.
- **Endgame** (de snackwagen als bedrijf, standplaatsen, het imperium van Jelle): de lengte bepaalt de speler zelf; niets stopt.

Ontwerpraming totaal: hoofdlijn ca. 5 uur en kwartier, plus een open einde. Met de carrière-tour en de eerste endgame-uren zit een gemiddelde speler aan ongeveer 15 tot 20 uur voor hij "klaar" voelt. Dat is een schatting.

## 2. De tempocurve per akte

Elke akte wisselt rijden en klussen, carrière, romantiek, een Jelle-setpiece en rust af; geen twee setpieces direct achter elkaar.

| Akte | Open | Opbouw | Piek | Rust |
|---|---|---|---|---|
| 1 | de keuken: motief in een minuut | Berend, Sjabbe, het Loket: kleine opdrachten | de kraak | de nacht in de auto (O3) |
| 2 | Oma's recept | de boerderij (Tessa), het water | de sloot (Jelle laat zijn hart zien) | Mem aan de telefoon (O4, O5) |
| 3 | Jelle legt zijn koopboek zelf uit | de ballon, de haven, de dijk | de kus in de botsauto | "Over zaterdag" (O7) |
| 4 | de bruggen, de mosterd | het logboek, de jury | Mem in de kruitkelder | de telefoon waarin ze apart zijn (O9) |
| 5 | de knuffel | de colonne, de bak | het Ontzet, de vijf woorden, de kus | de rekening van Jelle (O10) |
| Deel 4 | Willemien | het proefbeleg | de uitnodiging voor de open wereld | "Wat nu" (O12) |

## 3. Regels tegen filler

1. Elke missie heeft een **verhaal- of relatiefunctie** (rode draad, een bewijsmoment uit [VERHAAL-RELATIE-21-11.md](VERHAAL-RELATIE-21-11.md) of een Jelle-obstakel), een **komisch of emotioneel doel** (één beat die blijft hangen) en een **beloning** (geld, een personage, een flag of een nieuwe wereld uit `unlockgate.js`).
2. **Geen herhaling zonder variatie:** een gag, een locatie of een mechaniek komt hoogstens drie keer terug en de derde keer verandert er iets.
3. Een scène die bij geen van de vier lijnen hoort (plek in de wereld, romance, Jelle, snackwagen), wordt geschrapt, ingekort of gekoppeld ([RUGGENGRAAT.md](verhaal/RUGGENGRAAT.md)).
4. Nooit twee overgangsscènes na twee opeenvolgende missies (`scripts/storybridge_test.mjs`); een scène is 2 tot 9 regels.
5. De eigenaar wil langer alleen met leuke nieuwe dingen: een nieuwe beat moet het panel halen ([HUMOR-KEUZELIJST.md](verhaal/HUMOR-KEUZELIJST.md)) of is een warme regel zonder grap.

## 4. Rustpunten en versnellers

- **Rustpunten:** de overgangsscènes (O1 tot en met O12), de autogesprekken, de nacht in de auto, de flat (koelkastlijst), de radio van Rikus; het kantelmoment na elke akte.
- **Versnellers:** de recapkaart "Waar waren we?" bij Doorgaan, het overslaan van een overgangsscène (Backspace of Escape), snelreizen en de reisbeats (T1 tot en met T5), de lead van elke stap (één zin met het doel), de hint-/aanwijzingenlijn in het escape-menu.

## 5. De speler bepaalt het tempo

Alles blijft optioneel doorspeelbaar. De hoofdlijn wordt nooit geblokkeerd door een bijbaan of loopbaan: de poort (`unlockgate.js`) opent werelden per akte, maar een gesloten wereld is een zachte hint, geen muur, en `devJumpTo` en de spelbot lopen er doorheen. Een speler die alleen het verhaal volgt, speelt de hoofdlijn uit; een speler die liever carrière maakt, komt vanzelf bij het verhaal terug. Missies blokkeren nooit op moeilijkheid (waarden via `difficulty.js` zodra aanwezig).

## 6. Samen spelen

De lengte en het tempo gelden per speler: elke speler loopt zijn eigen voortgang (per speler, #429); overgangsscènes zijn van wie het spel opende en worden niet gedeeld; een gast die later aansluit mist alleen een zin. Er is geen netwerk- of opslageffect.

## 7. Meten

`node scripts/verhaal_tempo.mjs` geeft de tabel uit de verhaaltekst. Wat nog moet in de Electron-sweep (door de coördinator): een speeltest van akte 1 tot en met 5 met de spelbot (`--page`, `--skip-stages`) voor echte minuten, en het controleren van de leestijd van ondertitels zonder opname.

## Ronde 4: akte 1 trager, akte 2 langer (gebouwd)

Acht nieuwe activiteiten (zonder beloning, spelers kunnen ze overslaan) zijn ingevoegd: vier in akte 1 vóór het Loket, vier in akte 2. Verhaaltekst nu: akte 1 23,3 min (was 21,1), akte 2 15,8 min (was 14,5), totaal 99,2 min. Ontwerpraming speeltijd: elke stap is een bestemming met een korte scène (ongeveer 1 minuut tekst plus 3 tot 5 minuten rijden of lopen), dus akte 1 ongeveer 62 naar 77 minuten en akte 2 ongeveer 55 naar 70 minuten; de hoofdlijn komt op ruim 5,5 uur (ontwerpraming, niet gemeten). Akte 2 haalt de eerder genoemde 85 minuten niet: dat vraagt meer boerderij- en carrière-missies met eigen gameplay. De nacht in de wagen (bottle-missie op een dijk) schuift naar akte 4 of 5, met een ouder busje tot de wagen er is.

## Ronde 5: akte 2 verder uitgebreid en de nacht op een dijk (gebouwd)

Vier activiteiten erbij, zonder beloning en overslaanbaar: N10 het terras (Stad), N11 het bezorgrondje bij Bedum, N12 de lijst op de koelkast (akte 2), en N9 de nacht op een dijk (akte 4, tussen M18 en M19). Verhaaltekst nu (`node scripts/verhaal_tempo.mjs`): akte 2 17,4 min (was 15,8), akte 4 17,6 min (N9 telt ruim een halve minuut), totaal 101,3 min. Dezelfde ontwerpraming als in ronde 4 (ongeveer 1 minuut tekst plus 3 tot 5 minuten reizen per stap, dus ongeveer 3,75 min per stap): akte 2 van ongeveer 70 naar **ongeveer 81 minuten**, akte 4 van ongeveer 58 naar ongeveer 62. Dat is een ontwerpraming, niet gemeten (geen speeltest, geen botrun): de 85 minuten voor akte 2 zijn dus bijna gehaald, zonder nieuwe gameplay. Een vierde stap (bijvoorbeeld een voetbalproefje van Tammo) kan de laatste vier minuten dichten; een proefles met eigen gameplay valt buiten deze ronde.

Samen spelen: de stappen zijn voortgang per speler (de eigen save, zie boven); een gast speelt ze lokaal in zijn eigen spel en de host ziet niets van de scène van de gast.
