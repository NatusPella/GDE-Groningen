# Opening: diagnose (C00 en M01–M06)

Context: [#93](https://github.com/NatusPella/GDE-Groningen/issues/93). Na release 0.36.0 zegt de eigenaar dat het begin nog steeds slecht is: dialogen zijn niet te volgen, missies niet logisch. Eerder: "voelt hetzelfde als het vorige verhaal", "slaat soms nergens op", "de bal bestaat niet", "het doel waar je naartoe rijdt bestaat niet".

Zo is dit gelezen: als nieuwe speler, regel voor regel, alleen met wat het spel tot dat punt heeft gezegd of getoond (de stand van `09-script-akte1.md` vóór deze herbouw). Niets is gespeeld; alles hieronder komt uit het script, de regie, `missions*.js` en `storyarc_nieuw.js`.

## 1. De hoofdoorzaak

De eerste uren verdelen **dertien sprekers, zes bijzaken en drie geheimen** over zes missies. Elke missie introduceert iemand nieuws die een stukje van het raadsel geeft (Berend, een streamer, een torenwachter, twee reuzen, Sjabbe, een loketbediende, Jelle, de bewaarder, Bert, Sjoerd, Henk). De speler hoeft dus elke tien minuten een naam, een rol en een motief te onthouden, en het doel van het spel verschuift ondertussen drie keer zonder dat iemand het zegt:

1. "Geld verdienen voor de inschrijving" (C00.3, M01)
2. "Pas terughalen" (M02)
3. "Inschrijven" (M03)
4. "Uitzoeken wat de Fries bij het museum doet" (M03.4, M04)
5. "De bal eerst pakken, als bewaking" (M05.3, een bijzin in een café, na twee missies die er al naartoe werkten)
6. "Voor Jelle" de bal pakken (M06.1, een tikfout die het doel omkeert)

De vierde en vijfde stap staan in de verkeerde volgorde: de speler fotografeert camera's en de stroomkast (M04) vóór iemand heeft gezegd dat er iets gestolen wordt.

## 2. Dialogen die niet te volgen zijn

| Scène | Wat er mis is |
|---|---|
| C00.2 | Zeven nieuwe begrippen in twaalf regels: Snackprijs, Gouden Eierbal, standplaats, Gronings Ontzet, 28 augustus, Paddepoel, huisgenoten. Niemand legt de Snackprijs uit (wat is dat?), en het Ontzet wordt als bekend verondersteld. "Deel zes van een serie die niet bestaat" (C00.1) is een grap over iets dat de speler nog niet kent. |
| C00.3 | "Stap één van mijn plan", "ik heb het uitgetekend": een plan zonder stappen. Het doel (honderdvijftig euro, morgen vóór twaalf, bij Het Loket) staat niet in de scène, alleen "honderdvijftig voor de inschrijving en vijftig voor een klusje". |
| M01.1 | Vijf dingen tegelijk: een bakkie dat niet door het centrum mag "sinds 1977", een brief, krassen tellen, "Bommen Berend", en een complimentenladder met vijf treden in één adem. Waarom Tessa Berends bakkie leent, wordt niet gezegd. |
| M01.2 | Tessa's telefoon gaat en een onbekende aanbieder noemt een bedrag. De speler weet niet waarom die man Tessa belt. |
| M01.5 | "Groot Loug. Moai foar in wykein." en "famke yn it read": Fries zonder vertaling, plus een grap (Tessa: "Zo noemen wíj onszelf") die alleen werkt als je weet wat "Groot Loug" is. |
| M02.1 | Opent midden in een draad: "Hij heeft mijn pas. Hij heeft mijn pas en hij…". Wie is hij, waar zijn we, waarom pint ze? |
| M02.2 | "Wat is de tweede ster?" "Die krijg je als je het nog een keer probeert." Een spelmechanisme als dialoog, tussen twee mensen die in een achtervolging zitten. |
| M02.3 | Sjabbe zegt "Braid noar de zin" (een trede van Berends ladder, uit andermans mond) en lost in één lange regel vier dingen op: de reuzen, hun baas, de naam van de baas, het museum. |
| M02.5 | "Als iemand die bal steelt…": in een autogesprek, vóór de speler weet waarom die bal ertoe doet, en vóór iemand het plan opperde. "Je mag nee zeggen" terwijl niemand iets gevraagd heeft. |
| M03.2 | Zes mensen en drie reglementsartikelen in één scène: Jelle, Tessa, Tammo, de loketbediende, de bewaarder; artikel 4, artikel 9, meneer Bos, "de oudste jurylid". Jelle zegt dat hij alle standplaatsen koopt en daarna blijkt er toch één over te zijn, zonder dat iemand dat in de scène zegt. |
| M03.4 | Het einde van de missie is een mededeling over een gat in een plan, en dan belt iemand anders (Bert) over duiven. De speler weet niet wat hij nu moet. |
| M04.1 | Tessa legt uit waarom ze bij Bert zijn met een verwijzing naar iets dat in een telefoontje is gezegd dat de speler kan hebben gemist. |
| M04.2 | Twee telefoonstemmen (Tessa en Sjabbe) praten tijdens het vliegen over bewakers en koekjes. Wie "bewaker twee" is, is niet gezien. |
| M05.1 | Sjoerd belooft "iets over het museum" voor wie op het podium komt. Hoe weten Tessa en Tammo dat zijn neef er werkt? |
| M05.3 | In een café staat het scharnier van het hele verhaal, in een bijzin: "dan pakken wij hem eerst, als bewaking, en brengen we hem terug." |
| M06.1 | "…pakken wij de bal, **voor** Jelle." Het doel keert om (het moet "voordat Jelle" zijn). |
| M06.3 | "Die J schrijft overal een bedankje bij": wie J is, weet de speler pas twee regels later. |

## 3. Missies die niet logisch zijn

| Missie | Reden | Doel | Gevolg |
|---|---|---|---|
| M01 | Waarom lenen ze een bakkie van een vreemde, terwijl de chauffeur al zegt "nul krassen"? Het bakkie moet "naar zijn zus", maar niemand zegt waarom Berend het zelf niet brengt. | Twee doelen (stunt voor een onbekende streamer, bakkie bij een zus afleveren) zonder dat gezegd is dat het één klus is voor één reden: honderdvijftig euro. | Het geld komt binnen, maar het nieuwe doel (pinnen) staat in een bijzin. |
| M02 | Reuzen halen een pinautomaat uit de muur. Geen reden. | De pas terughalen is logisch, maar Sjabbe wordt pas met een zin aan het eind genoemd; waarom hij de automaat opent, niet. | Een naam (Jelle Terpstra) en een museumvraag vallen in één lange regel; de speler snapt niet dat dit dezelfde man is als de Fries van de radio, van Berend en van de chat. |
| M03 | Inschrijven is duidelijk. | De scène met Jelle komt midden in de missie en schuift het doel: van "inschrijven" naar "tegenhouden". | De missie eindigt met drie dingen (plakje één, het gat, een duivenmelker). |
| M04 | Waarom zou een museum fotograferen nodig zijn om "Jelle te stoppen"? | Het is verkenning voor een inbraak waar nog niemand over gepraat heeft. | De speler leert dat bewaker twee een koekje krijgt. Wat dat betekent (de bewaker is omgekocht, dus waarschuwen heeft geen zin) wordt niet gezegd. |
| M05 | Waarom een fietsrace? Omdat een neef die de camera's kent een gunst doet voor wie wint. Dat verband komt pas in de race. | Duidelijk zodra Sjoerd praat. | Eén tip: de camera's gaan om twaalf uur drie minuten uit. Eindelijk begint het plan. |
| M06 | De bal pakken is uitgewerkt, maar de reden staat vier scènes terug. | Duidelijk. | De bal is weg. Dat is het gewenste keerpunt, maar het nieuwe doel (de volgende dag) wordt niet gezegd; M07 begint daarmee. |

## 4. Waar het doel zonder woorden verschuift

- C00.3 → M01: "Eerst geld" wordt een bakkie-klus; de HUD zegt "Berend wil zijn bakkie bij zijn zus" (het doel van Berend, niet van de speler).
- M02 → M03: van "pas terug" naar "inschrijven" gaat goed, maar in M03.2 schuift het naar "Jelle tegenhouden" zonder dat het gezegd wordt.
- M03 → M04: de HUD van M04 zegt "Bert zit bij het Stationsplein. Zijn duiven zijn nerveus." Wat de speler daar moet, staat niet in het doel.
- M05 → M06: "Podium halen" wordt "wachten tot middernacht" en dan "de bal pakken", zonder dat de speler het ziet aankomen.

## 5. Andere punten die blijven hangen

- **Namen.** Berend, Jelmer, Torenwachter, Durk, Douwe, Sjabbe, Jelle, Mevrouw Hoving, Bert, Sjoerd, Henk: elf namen in het eerste uur. Alleen de eerste vier (Tessa, Tammo, Jelle, Sjabbe) dragen de plot; de rest geeft één dienst en verdwijnt (Berend, Bert, Henk komen terug, maar pas veel later).
- **De bal is onzichtbaar.** In geen enkele scène van akte 1 wordt de Gouden Eierbal getoond of beschreven. Het kaartje in de lege vitrine is de eerste (en laatste) keer dat de speler hem "ziet", als afwezigheid.
- **"Hetzelfde als het vorige verhaal"**: de stappen volgen de oude lijn (bakkie, pinnen, Loket, duif, fiets, museum), en de grappen blijven dezelfde soort (loketbureaucratie, Friezen, een compliment-ladder). De herbouw blijft dezelfde missies spelen (code en mechanics veranderen niet), maar elke missie krijgt een eigen reden, een eigen toon en een nieuwe uitkomst.
- **Geen zichtbare gevolgen.** Na M01 is er geen enkel teken dat het geld is verdiend; na M03 komt de bal pas terug als afwezigheid.

## 6. Wat blijft

De beste grappen werken omdat ze karakter tonen en geen context vragen: "Een kat is ook sympathiek", "Voor de grip", "Ik meld alleen", "Dat gezicht betekent: ik snap het niet." "Klopt.", de duif die op Tammo's pet landt, "Dat is een tegeltje", Henk en zijn "begrafenis". Die blijven.
