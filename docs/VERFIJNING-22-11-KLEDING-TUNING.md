# Verfijnronde 22-11: kleding, kapper, tuning en interieurs

Naslag (verfijnronde, geen nieuwe features). Scope: kledingwinkel en kast, outfits, pashokje, kapper, tuningmenu, garage en interieurs. Gewerkt vanuit code, data, pure tests en simulaties in node: er is geen Electron of beeldrun gedraaid, dus alles wat visueel is staat onderaan als "nog niet bekeken". Canonieke specs: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md) en [.specs-fire/standards/ui-taal.md](../.specs-fire/standards/ui-taal.md).

Samen spelen: kleding, kast, kapper en tuning zijn per speler en lokaal (elke speler heeft een eigen kast; alleen de outfit-code gaat mee in het bericht `outfit`). Geen van deze wijzigingen verandert het netwerkprotocol, een save of wat een gast ziet; de toets-6-melding en de afkoelers zijn lokaal.

## Kleding, kast en outfits

| Wrijving | Oplossing | Bewijs |
| --- | --- | --- |
| Toets 6 bleef hangen als twee outfits er hetzelfde uitzien (bijvoorbeeld een gedeelde code die je al had): de rij sprong steeds naar de kopie | Gelijke outfits zijn één stop; de toets gaat voorbij allemaal | `verfijn_kleding_tuning_test.mjs` (wisseltoets) |
| Een outfit die niet te dragen was blokkeerde de hele wisselrij | `cyclePreset` slaat een onbruikbare outfit over; bij één outfit die je al draagt komt een heldere melding | idem |
| Een outfit met alleen een ander kapsel of postuur stond als "Heb je al aan" en was niet aan te trekken | `presetMatches` kijkt ook naar kapsel en postuur; één functie voor kast en wisseltoets | idem (outfit "aan") |
| Een outfit overschrijven kon niet terug | `undoPreset`: een keuze "Zet de vorige outfit terug" (alleen geheugen, niet in de save) | idem (overschrijven) |
| Dezelfde look twee keer bewaren | De Bewaar-rij zegt "Staat al in ..." of "Staat hier al" en is dicht | idem |
| Een lege plek heet altijd "Outfit n" | Naam van de set die je aanhebt, een tweede krijgt een nummer | idem |
| Lege staat van de kast zegt niet wat je kunt doen | Bewaar-notitie "Nog geen outfits: bewaar je eerste, dan wissel je onderweg met 6" | idem |
| "1 stuk ontbreken" (verkeerde vervoeging op toets 6) en niet te zien wat er mist | Één meldingsregel voor kast en toets 6, met het eerste ontbrekende stuk erbij | `outfitmelding_test.mjs`, idem |
| Een set aantrekken waar stukken van missen zei "Nog niet alles in je kast" | Zegt hoeveel stukken | idem |
| Winkel: je ziet niet wat eruit gaat als je iets aantrekt | "Vervangt ..." in de beschrijving | idem (vergelijken) |
| Winkel: uitverkoop toont geen gewone prijs | "Gewoon ..." erbij | idem |
| Winkel: een set tegenover losse stukken | "Los ..., scheelt ..." bij een set | idem |
| Afkoeltijd van toets 6 en van het uitrusting-tegen-de-politie-effect bleef na een lading minutenlang dicht als de klok terugliep | `cooldownBusy`: een tijd vóór het laatste moment telt als verlopen | idem (afkoeltijd) |
| Kapotte of afgekapte saves | Fuzz (400 saves) en simulatie (3000 handelingen met opslaan en laden): de kast blijft draagbaar en een kringloop | idem |

## Kapper

| Wrijving | Oplossing | Bewijs |
| --- | --- | --- |
| Je kon haarkleur kopen bij een kaal hoofd (geld voor niets) | `colorBlock('bald')`: de kleurlijst is dicht met "Kaal: geen haar om te verven" | `verfijn_kleding_tuning_test.mjs`, `kapperkeuze_test.mjs` |

## Tuning en garage

| Wrijving | Oplossing | Bewijs |
| --- | --- | --- |
| "Te weinig geld" zonder bedrag bij Installeren | "Te weinig geld: je mist nog €X" | `tuningdraft_test.mjs` (aangescherpt) |
| Onzekerheid of er een inruil-exploit zit en of kosten ooit negatief kunnen zijn | Fuzz en simulatie (4500 stappen over drie voertuigsoorten): kosten zijn nooit negatief, de som klopt, wisselen en terugdraaien verdient nooit geld, een build is een kringloop | `verfijn_tuning_test.mjs` |

## Interieurs

| Wrijving | Oplossing | Bewijs |
| --- | --- | --- |
| Kassa-melding "Te weinig geld voor X (€40)" zonder tekort en zonder duizendtallen (€1250) | `TOO_POOR(item, prijs, saldo)` noemt het tekort, bedragen met `euro()` | `verfijn_kleding_tuning_test.mjs` |

## Bewust niet gedaan

- Een tekstveld om een outfit te hernoemen of een gedeelde code in te plakken (`importPresetCode` bestaat, het menu heeft geen invoerveld): nieuwe feature.
- Wisselen naar de vorige outfit en een knop voor de controller (nu alleen toets 6 vooruit): een nieuwe invoerbinding, in de eerste plaats iets om met een echte controller te proberen.
- De duw van een meubel in een interieur zet een loper af en toe een halve meter voorbij de hallmuur; het volgende beeld klemt hem terug. Een eerste poging om dat te klemmen zette 2 procent meer mensen krap tegen een meubel en liet `interior_core_test` ("de resolver zet vrijwel niemand in een meubel") falen: teruggedraaid.
- Een bevestiging bij verlaten van het tuningmenu bestond al (dubbele Esc), net als terugdraaien en de voor-na-vergelijking.

## Alleen in beeld of met een echte speler te bekijken

- De nieuwe regels ("Vervangt", "Gewoon", "Los ... scheelt") in de zeefdruk-lijst: lengte en afbreken op een smal scherm, contrast.
- De nieuwe Bewaar- en Terugzetrij in het pashokje en de kast: volgorde en wat de focus doet na een druk.
- Het gevoel van toets 6 bij twee gelijke outfits, en of de melding met het ontbrekende stuk in 2,5 seconde leesbaar is.
- Het kappersmenu met de gesloten kleurlijst bij een kaal hoofd (kleur van de rijen, de reden).
- Interieurloop (krap tegen meubels in hoeken) met een echte speler en met de metgezel.
- Met een echte controller: de hele kast, het pashokje en de werkplaats.
