> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/mechanica.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Spelbot-rapport

Gemaakt door `scripts/bot/akte_rapport.mjs` uit de runs van de Spelbot (epic #186). De bot beoordeelt niet of het leuk is of hoe de besturing voelt; een vastzit- of cheatmelding kan aan de bot liggen in plaats van aan het spel.

## Akte 1 (M00 t/m M06)

Run akte12 (2026-10-18), uitkomst KLAAR, speltijd 11:42.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| M00 | Opening: verhuisdag | 0:01 | klaar | 0 | 0 | - |
| M01 | Nul krassen, vijftienhonderd punten | 1:27 | klaar | 0 | 4 | teleport, objective, win |
| M02 | Even pinnen | 1:55 | klaar | 0 | 4 | teleport, objective, win |
| M03 | Het Loket | 2:22 | klaar | 1 | 3 | objective, win |
| M04 | Kieken van boven | 1:48 | klaar | 0 | 3 | teleport, objective |
| M05 | Wind tegen, beide kanten op | 2:03 | klaar | 0 | 4 | teleport, objective, win |
| M06 | Het museum stond er al zo | 1:58 | klaar | 0 | 4 | teleport, objective, win |
| T2 |  | 0:00 | klaar | 0 | 0 | - |

Vastgezeten 22, cheat nodig 16, mislukt 1, consolefouten 1, NaN-waarschuwingen 0.

Bevindingen:

- [bug] Consolefout: cutscript Error: cutscene story-M02.intro: shot 6: 11.8 s zonder camerabeweging (cutscript Error: cutscene story-M02.intro: shot 6: 11.8 s zonder camerabeweging)
- [bug] Bot zit vast bij M01 (Op (227, -34), 20 s zonder voortgang, afstand tot doel 2 m)
- [bug] Bot zit vast bij M02 (Op (207, 405), 20 s zonder voortgang, afstand tot doel 2 m)
- [bug] Bot zit vast bij M03 (Op (82, 114), 20 s zonder voortgang, afstand tot doel 22 m)
- [bug] Bot zit vast bij M04 (Op (-110, 1060), 20 s zonder voortgang, afstand tot doel 205 m)
- [bug] Bot zit vast bij M05 (Op (-113, 46), 20 s zonder voortgang, afstand tot doel 2 m)
- [bug] Bot zit vast bij M06 (Op (28, 744), 20 s zonder voortgang, afstand tot doel 0 m)
- [bug] M01 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)
- [bug] M02 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)
- [bug] M03 had een cheat nodig om door te gaan (Rungs: objective, win)
- [bug] M04 had een cheat nodig om door te gaan (Rungs: teleport, objective)
- [bug] M05 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)
- [bug] M06 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)

## Akte 2 (M07 t/m M11)

Run akte2 (2026-10-18), uitkomst KLAAR, speltijd 21:19.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| M07 | Al het vet van Grunn | 1:48 | klaar | 1 | 4 | teleport, objective, win |
| M08 | Fatbikes tellen niet als fiets | 5:00 | tijd op | 10 | 1 | win |
| T1 |  | 0:00 | klaar | 0 | 0 | - |
| M09 | Heel aankomen is ook een kunst | 4:58 | tijd op | 0 | 12 | teleport, objective, win, win, win, win, win, win, win, win, win |
| M10 | Een trekker-limo op de wierde | 4:58 | tijd op | 0 | 13 | teleport, objective, win, win, win, win, win, win, win, win, win, win |
| T2 |  | 0:00 | klaar | 0 | 0 | - |
| M11 | Geleend van de Friezen | 4:26 | klaar | 4 | 2 | win, win |

Vastgezeten 32, cheat nodig 29, mislukt 15, consolefouten 0, NaN-waarschuwingen 0.

Bevindingen:

- [bug] Bot zit vast bij M07 (Op (1155, 414), 20 s zonder voortgang, afstand tot doel 2 m)
- [bug] Bot zit vast bij M08 (Op (119, -5), 20 s zonder voortgang, afstand tot doel 9 m)
- [bug] Bot zit vast bij M09 (Op (-651, -19173), 20 s zonder voortgang, afstand tot doel 12 m)
- [bug] Bot zit vast bij M10 (Op (2585, -20498), 20 s zonder voortgang, afstand tot doel 2 m)
- [bug] Bot zit vast bij M11 (Op (-3352, -12614), 20 s zonder voortgang, afstand tot doel 14709 m)
- [bug] M07 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)
- [bug] M08 had een cheat nodig om door te gaan (Rungs: win)
- [bug] M09 had een cheat nodig om door te gaan (Rungs: teleport, objective, win, win, win, win, win, win, win, win, win)
- [bug] M10 had een cheat nodig om door te gaan (Rungs: teleport, objective, win, win, win, win, win, win, win, win, win, win)
- [bug] M11 had een cheat nodig om door te gaan (Rungs: win, win)
- [opmerking] M08 mislukte 10 keer voor de bot (Dat kan aan de bot liggen; kijk of de missie ook voor een speler te moeilijk is)
- [opmerking] M11 mislukte 4 keer voor de bot (Dat kan aan de bot liggen; kijk of de missie ook voor een speler te moeilijk is)

## Akte 3 (M12 t/m M16)

Run akte3 (2026-10-18), uitkomst KLAAR, speltijd 9:03.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| M12 | Het staat niet in het rooster | 1:14 | klaar | 0 | 3 | teleport, objective |
| M13 | Het containerlabyrint | 2:49 | klaar | 0 | 4 | teleport, objective, win |
| M14 | De dijk | 5:00 | tijd op | 0 | 1 | - |

Vastgezeten 8, cheat nodig 5, mislukt 0, consolefouten 0, NaN-waarschuwingen 0.

Bevindingen:

- [bug] Bot zit vast bij M12 (Op (-24226, -20273), 20 s zonder voortgang, afstand tot doel 8 m)
- [bug] Bot zit vast bij M13 (Op (18962, -25391), 20 s zonder voortgang, afstand tot doel 83 m)
- [bug] Bot zit vast bij M14 (Op (20343, -19268), 20 s zonder voortgang, afstand tot doel 7978 m)
- [bug] M12 had een cheat nodig om door te gaan (Rungs: teleport, objective)
- [bug] M13 had een cheat nodig om door te gaan (Rungs: teleport, objective, win)

## Akte 4 en 5 (M17 t/m E), eerste sweep

Run akte45 (2026-10-18), uitkomst ONBEKEND, speltijd 0:00.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| M17 | Open, dicht | 5:00 | tijd op | 0 | 0 | - |
| M18 | Wie draaide de camera's uit? | 4:59 | tijd op | 0 | 0 | - |
| M19 | Stoom | 4:59 | tijd op | 0 | 0 | - |
| T4 | De bus naar Bourtange | 4:58 | tijd op | 0 | 0 | - |
| M20 | Het beleg van Bourtange | 4:58 | tijd op | 0 | 0 | - |
| M21 | Iedereen heeft een rode auto gezien | 4:59 | tijd op | 0 | 0 | - |
| M22 | Een luik erin | 4:58 | tijd op | 0 | 0 | - |
| M23 | De colonne | niet af | niet af | 0 | 0 | - |

Vastgezeten 0, cheat nodig 0, mislukt 0, consolefouten 0, NaN-waarschuwingen 0.

## Minigames

Run minigames (2026-10-18), uitkomst KLAAR, speltijd 7:15.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| (geen) | | | | | | |

| Minigame | Gestart | Gespeeld (s) | Geld | Vast | Gestopt | Fouten |
|---|---|---|---|---|---|---|
| carbid | ja | 30.2 | 0 | nee | backspace | 0 |
| kermis | ja | 31 | -3 | nee | backspace | 0 |
| hoogvlieger | **nee** | 0 | 0 | nee | - | 0 |
| geheimen | **nee** | 0 | 0 | nee | - | 0 |
| drift | **nee** | 0 | 0 | nee | - | 0 |
| discgolf | ja | 30.3 | 0 | nee | backspace | 0 |
| pitchputt | **nee** | 0 | 2500 | nee | - | 0 |
| skatepark | ja | 30.7 | 0 | nee | backspace | 0 |
| kartbaan | ja | 30.3 | 0 | nee | backspace | 0 |
| zwembad | ja | 30.1 | 0 | nee | backspace | 0 |
| klimtoren | ja | 30.2 | 0 | nee | backspace | 0 |
| waterski | **nee** | 0 | 0 | nee | - | 0 |
| carillon | **nee** | 0 | 0 | nee | - | 0 |
| pannenkoek | ja | 30.6 | 0 | nee | backspace | 0 |
| hengelen | **nee** | 0 | 0 | nee | - | 0 |
| wandeling | **nee** | 0 | 0 | nee | - | 0 |
| snackketen | **nee** | 0 | 0 | nee | - | 0 |
| duif | ja | 30.3 | 0 | nee | quit() | 0 |
| heli | ja | 30.4 | 0 | nee | quit() | 0 |

Vastgezeten 0, cheat nodig 0, mislukt 0, consolefouten 0, NaN-waarschuwingen 0.

Bevindingen:

- [bug] Waarschuwing: audio events TypeError: Failed to set the 'value' property on 'AudioParam': The provided float value is non-finite. (audio events TypeError: Failed to set the 'value' property on 'AudioParam': The provided float value is non-finite.)
- [bug] Waarschuwing: audio world TypeError: Failed to set the 'value' property on 'AudioParam': The provided float value is non-finite. (audio world TypeError: Failed to set the 'value' property on 'AudioParam': The provided float value is non-finite.)
- [opmerking] Minigame hoogvlieger start niet bij E (geen plek)
- [opmerking] Minigame geheimen start niet bij E (geen plek)
- [opmerking] Minigame drift start niet bij E (ef interact()=false)
- [opmerking] Minigame pitchputt start niet bij E (ef interact()=false)
- [opmerking] Minigame waterski start niet bij E (ef interact()=true; prompt: {"id":"waterski","x":1941.8538975171857,"y":-581.6719682340467,"h":2.2,"key":"E","label":"Waterskiën","sub":"Nie)
- [opmerking] Minigame carillon start niet bij E (ef interact()=true; prompt: {"id":"carillon","x":213.81,"y":22.4,"h":2.2,"key":"E","label":"Klokkenspel","sub":"Niet nu: eerst de politie kw)
- [opmerking] Minigame hengelen start niet bij E (ef interact()=false)
- [opmerking] Minigame wandeling start niet bij E (ef interact()=false; prompt: {"id":"wandeling","x":-3617.5163618414954,"y":-12748.059631904238,"h":2.2,"key":"E","label":"Wandeling Winsum",)
- [opmerking] Minigame snackketen start niet bij E (geen plek)

## M09, diagnose

Run m09 (2026-10-18), uitkomst KLAAR, speltijd 1:40.

| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |
|---|---|---|---|---|---|---|
| M09 | Heel aankomen is ook een kunst | 1:40 | tijd op | 0 | 6 | teleport, objective, win, win, win |

Vastgezeten 6, cheat nodig 5, mislukt 0, consolefouten 0, NaN-waarschuwingen 0.

Bevindingen:

- [bug] Bot zit vast bij M09 (Op (-635, -19174), 15 s zonder voortgang, afstand tot doel 4 m)
- [bug] M09 had een cheat nodig om door te gaan (Rungs: teleport, objective, win, win, win)

## Duiding

**Wat wel en niet te vertrouwen is.** De sweeps starten elke stap los via een sprong (`--mode=missions`), op het 'nieuw'-verhaal, in een testbuild zonder alle provinciedata. De meeste "vast" en "cheat"-meldingen zijn botzwakte: de bot rijdt en loopt maar speelt de stunt-, pin-, loket- en minigame-missies niet echt. De tabellen komen uit de eerste volledige sweeps (eerdere bot); een latere herhaling met de nieuwste bot is voor akte 1 na M03 en voor de rest gestopt, omdat de testronde voor de release voorrang kreeg.

**Akte 1 (M00 t/m M06).** In de eerste sweep alle zeven stappen klaar, elk met 3 tot 4 keer vastzitten en de hele cheat-ladder (teleport, objective, win). De herhaling met de nieuwste bot haalde M00 t/m M02 en liet M03 (Het Loket) de 4 minuten halen, 3 keer mislukt. Een echte bevinding: de cutscene `story-M02.intro` geeft de consolefout "shot 6: 11.8 s zonder camerabeweging" (bestaat al als #224, er is een comment bij gezet).

**Akte 2.** M07 en M11 klaar met cheats. M08 mislukte 10 keer: de missie vraagt te voet te gaan ("Uitstappen, jong. Fatbikes ontwijk je te voet.") en de bot zat in een auto. Dat is een botzwakte, geen onhaalbare stap; de bot stapt nu uit als de missie dat vraagt, maar dat is niet opnieuw gedraaid. M09 en M10 (beide `lazyStart`): de cheat "stap voltooien" start de missie en zet hem direct op `cooldown`, de stap blijft staan. Dat is issue #230.

**Akte 3.** M12 en M13 klaar met cheats, M14 haalde de limiet van 5 minuten zonder cheat; T3, M15 en M16 staan niet in het rapport (de bot haalde ze niet of de sprong deed niets).

**Akte 4 en 5.** In de eerste sweep deed de bot per stap 5 minuten niets: geen toets, geen vastzitmelding (wachten telde als "bezig"). Die run zegt dus niets over deze aktes. Daarop is een wachtbudget toegevoegd (45 s, daarna de redding-ladder en een bevinding "wacht te lang"); een opnieuw gedraaide sweep haalde alleen M17 (3 keer vast, teleport en objective nodig) voordat de runs zijn gestopt. Akte 4 en 5 zijn dus nog niet echt doorgelopen.

**Minigames.** 10 van 19 starten (duif en heli meegeteld) en worden 20 tot 30 s gespeeld zonder vastzitten; welke starten wisselt tussen runs. Drift, hengelen, wandeling en Pitch & putt starten niet via E, hoogvlieger, geheimen en snackketen hebben geen plek. De strategieën zijn toetspatronen. Een NaN-startpunt van Pitch & putt veroorzaakt AudioParam-fouten (issue #229).

**Geluid.** De audiotap werkt (RMS, piek, 28 effecten per buffergrootte), maar onder `--stil` is de uitgang gedempt: de gemeten stilte (434 s) zegt niets. Geluid per gebeurtenis is nog niet beoordeeld.

**Niet gedaan.** Geen volledige run van akte 1 tot en met 5 in één keer met de nieuwste bot; geen vergelijking met een vorige dag (er was nog geen vorige dagelijkse run); de dagelijkse run is niet ingepland; versnelbare tijd is niet gebouwd; screenshots zijn alleen automatisch gecontroleerd (zwart, leeg, NaN-pixels), nog door niemand bekeken.

## Wat er sinds de eerste runs is aangepast en nog te meten is

Deze wijzigingen zijn nog **niet in een Electron-run bekeken**; er is alleen met pure tests gecontroleerd (`botlogic_test`, `botanalysis_test`, `botstoryhaken_test`). Alles hieronder is dus een hypothese tot de volgende run.

- **Id-mismatch (qa-provincie).** `missionIndexOf('M02')` gaf -1 omdat `storyarc.js` alleen def-id's (`pinautomaat`) kende en de haken stap-id's (`M02`) geven. `missionIndexOf` accepteert nu beide. Te meten: `playStoryIntro` en de cutscene-preview in `visual_issues.page.js` moeten voor elke missiestap een index vinden (`rec.index >= 0`, `rec.played`).
- **Win-cheat M09/M10.** `missionDebug.win` zet nu `stagePending` en `resume` uit en slaat een lopende cutscene over voor het afrondt. Er is een vijfde sport `skip` bijgekomen (`forceer overslaan`) voor als win niet blijft hangen. Te meten: hooguit één `win` per stap in het cheat-overzicht van M09 en M10 (eerst 9 tot 12), en geen `skip` nodig.
- **Botlogic.** Stunts rijden met topsnelheid 30 zonder remmen voor het doel (herkend aan label of stage); een prompt bij het doel levert maximaal vier keer E op (pinautomaat, loket); een `board`-stage stapt in de dichtstbijzijnde vrije auto; een `hold`-stage blijft in de ring staan. Te meten: minder cheats bij M01, M02 en M03 (nu `teleport, objective, win`) en `handeling`-regels in de events.
- **Minigame-starts.** Per minigame een eigen opening (`startAttempts`), eerst wachten op de prompt, en bij niets een zijstap van 3 m (`jitterOffset`) rondom de plek. Te meten voor drift, hengelen, wandeling, pitchputt, hoogvlieger, geheimen en snackketen: `started` in drie runs op rij. Snackketen meldde "geen plek"; dat is een gebrek van de plekkenlijst (`a.spots()`), niet iets wat de bot kan oplossen.
- **Nog open om te meten:** de volledige run akte 1 tot en met 5 achter elkaar; of de nieuwe rung `skip` de score van "cheat nodig" eerlijk laat (een skip telt als cheat); akte 4 en 5 met het wachtbudget; M08 (te voet) na de `onFoot`-herkenning; geluid per gebeurtenis zonder `--stil`.
