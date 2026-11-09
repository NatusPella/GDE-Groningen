# Gronings: de verhaalregels zonder spreektekst (open lijst voor #735)

Dit bestand is de **open lijst** van #735: de verhaalregels die nog geen Groningse spreektekst hebben.
Er staat **geen gegenereerd dialect** in: de citaten hieronder zijn bestaande, goedgekeurde rijen uit
`scripts/gronings_spoken.json` en dienen alleen als voorbeeld van woordkeuze. De Groningse tekst zelf
schrijft of keurt een **kenner**; een agent vult die niet in.

**Stand:** 20 regels, 0 op een stemkeuze, 20 op een spreektekst. Alle regels zijn van **Geesje** (18) en **Rotor Roelf** (2);
hun stem staat vast in `CAST` (`Pulcherrima` en `Achird`), dus dit is een tekstknoop, geen stemknoop.
Verdeling per stap: M09 10, M12 2, M21 1, M23 3, M26 2, M30 2.

Gegenereerd door `node scripts/gronings_open_doc.mjs` uit `docs/verhaal/TTS-OPNAMELIJST-735.jsonl`,
`scripts/gronings_spoken.json` en de knooppunten hieronder. Niet met de hand aanpassen.

## De lijst

| # | Stap | Spreker | Stem | Regel (Nederlands) | Knooppunt voor de kenner | Verwante goedgekeurde regel |
|---|---|---|---|---|---|---|
| 1 | M09.1 | Geesje | Pulcherrima | “Jullie zijn van Trijntje. Het zijn eieren, geen relikwieën. Maar ik ben kosteres, dus ik behandel ze zo.” | — | “Jullie zijn van Trijntje. Kom binnen. Schoenen mogen aan. Het huis is toch even niet van m…” → “Jim binnen van Trijntje. Kom binnen. Schoenen mogen aan. t Hoes is toch eefkes nait van mie.”<br>“Eierballen. Nog warm. Jullie zijn mijn helden.” → “Eierballen. Nog waarm. Jim binnen mien helden.” |
| 2 | M09.1 | Geesje | Pulcherrima | “Jelle Terpstra heeft alle eieren van het Hogeland gekocht, behalve de mijne. Mijn kippen hebben geen contract.” | Eigen namen (Jelle Terpstra), streeknaam Hogeland en het woord contract: alleen de zin eromheen wordt Gronings. | “Het recept van 1953 had vijf dingen van vijf vrienden: vet, eieren, zout, meel en mosterd.…” → “t Recept van 1953 har vief dingen van vief vrienden: vet, aaien, zout, meel en mosterd. Jelle koopt ze allemoal. Hier is…”<br>“Meneer Terpstra heeft de vier andere juryleden en mij uitgenodigd voor een treinreis met v…” → “Meneer Terpstra het de vier aander juryleden en mie oetnodigd veur n treinreis mit volpension: aal maaltijden der bie. V…” |
| 3 | M09.1 | Geesje | Pulcherrima | “Zijn moeder, Gerda, belt Trijntje elk jaar op haar verjaardag. Ze zeggen dan allebei niks.” | — | “Oma Trijntje vertelde over 1953. Over Gerda Terpstra. Zeventig jaar trots, in één zin.” → “Oma Trijntje vertelde over 1953. Over Gerda Terpstra. Zeventig joar trots, in ain zin.” |
| 4 | M09.1 | Geesje | Pulcherrima | “Jullie brengen ze heel naar de kerkkelder in Usquert. Daar is het koel, en daar komt Jelle niet.” | Plaatsnaam Usquert blijft staan; kerkkelder is een kerkelijk woord; "heel" (in één stuk) is betekenis, geen dialect. | — (geen precedent in `gronings_spoken.json`) |
| 5 | M09.1 | Geesje | Pulcherrima | “De trekker staat bij de schuur. Hij trekt hard.” | — | — (geen precedent in `gronings_spoken.json`) |
| 6 | M09.4 | Geesje | Pulcherrima | “De kratten staan heel. Dat is een kerkelijk wonder.” | Kerkelijke woordgrap (kerkelijk wonder); "kratten" en "heel" houden de betekenis. | — (geen precedent in `gronings_spoken.json`) |
| 7 | M09.4 | Geesje | Pulcherrima | “Dat is meer dan de dominee ooit haalde.” | — | — (geen precedent in `gronings_spoken.json`) |
| 8 | M09.4 | Geesje | Pulcherrima | “Ze staan in de kerkkelder. Jullie komen te laat.” | Kerkkelder; "jullie komen te laat" is een aanspreekvorm: kies dezelfde vorm als in de andere Geesje-regels. | — (geen precedent in `gronings_spoken.json`) |
| 9 | M09.4 | Geesje | Pulcherrima | “Dan koopt u een eierkoek.” | Beleefdheidsvorm "u" (kosteres tegen een klant): kies u of de Groningse vorm, consistent met de rest van M09. | — (geen precedent in `gronings_spoken.json`) |
| 10 | M09.5 | Geesje | Pulcherrima | “Weer eieren? De kippen sturen een kaartje.” | Droge grap over de kippen; geen dialect voor de grap zelf, alleen de zinsbouw. | — (geen precedent in `gronings_spoken.json`) |
| 11 | M12.2 | Rotor Roelf | Achird | “Moi! Rotor Roelf. Die heli is van mij, ik zette hem gisteren op het UMCG-dak.” | — | “Ik vlieg. Rotor Roelf denkt dat we een heli kopen. Dat laat ik even zo.” → “Ik vlieg. Rotor Roelf denkt dat wie n heli kopen. Dat loat ik eefkes zo.”<br>“Mijn traumaheli staat in onderhoud. Dit is die van Rotor Roelf, en mijn nachtdienst heeft …” → “Mien traumaheli stait in onderhoud. Dit is dij van Rotor Roelf, en mien nachtdienst het honger.” |
| 12 | M12.2 | Rotor Roelf | Achird | “De lunch is van Dijkstra. Nait tegen d'Olle Grieze aan, hè?” | De regel bevat al Gronings ("Nait") en de eigennaam "d'Olle Grieze": de kenner kiest of die vorm blijft en hoe de rest eromheen klinkt. | “Moi! Rotor Roelf, van Eelde. De proefvlucht is gratis. Nait tegen d'Olle Grieze aan, hè?” → “Moi! Rotor Roelf, van Eelde. De proefvlucht is gratis. Nait tegen d'Olle Grieze aan, hè?” |
| 13 | M21.4 | Geesje | Pulcherrima | “Mijn kerkvoogdij is gebeld. De kerkkelder is verhuurd. Het spijt me, jong.” | Kerkelijk bestuur (kerkvoogdij), kerkkelder; "jong" is een aanspreekvorm die Geesje vaker gebruikt. | — (geen precedent in `gronings_spoken.json`) |
| 14 | M23.1 | Geesje | Pulcherrima | “Ik rij op mijn scooter. Een bedevaart op twee wielen. Hij is sneller dan hij lijkt.” | Scooter en bedevaart zijn de grap; "op twee wielen" moet dezelfde droge toon houden. | — (geen precedent in `gronings_spoken.json`) |
| 15 | M23.8 | Geesje | Pulcherrima | “Ik rij naast jullie, op mijn scooter. Dit is een bedevaart. Ik ken elk steegje van hier tot de Grote Markt.” | Herhaalt de bedevaart-grap; "elk steegje van hier tot de Grote Markt" houdt de echte toponiemen. | — (geen precedent in `gronings_spoken.json`) |
| 16 | M23.8 | Geesje | Pulcherrima | “Een limo past niet in een steegje, jong.” | "jong" als aanspreekvorm; limo en steegje zijn spreektaal, geen dialect. | — (geen precedent in `gronings_spoken.json`) |
| 17 | M26.16 | Geesje | Pulcherrima | “De steeg bij de notaris is dicht. Scooter dwars. Ik zit erop te breien.” | Notaris en scooter zijn modern; "Scooter dwars" en "breien" zijn de grap, geen dialect. | — (geen precedent in `gronings_spoken.json`) |
| 18 | M26.16 | Geesje | Pulcherrima | “Wie blijft staan, mag breien.” | Korte spreuk: de kenner kiest de Groningse vorm van "blijven staan" en "mag". | — (geen precedent in `gronings_spoken.json`) |
| 19 | M30.1 | Geesje | Pulcherrima | “Ik zie alles vanaf mijn toren. Dit is geen toren. Het is een hooiberg. Ik zie alles toch.” | Toren/hooiberg: de grap zit in de betekenis; geen dialect toevoegen. | “Dat is geen toren. Dat is een uitnodiging.” → “Dat is gain toren. Dat is n oetnoodiging.”<br>“Grunn. Tweehonderdduizend mensen, driehonderdduizend fietsen en één toren die alles ziet.” → “Grunn. Tweehonderdduuzend mensen, driehonderdduuzend fietsen en ain toren dij aals ziet.” |
| 20 | M30.4 | Geesje | Pulcherrima | “Links. Het derde bolwerk. Ze kijken niet. Ze eten.” | Bolwerk is een echte plekterm; "derde bolwerk" en de korte zinnen blijven. | — (geen precedent in `gronings_spoken.json`) |

## Wat de kenner per regel kiest

De knoppen zijn per regel verschillend, maar steeds dezelfde soorten: (1) de Groningse vorm van de
werkwoorden en lidwoorden, (2) of een **eigennaam, plaatsnaam of bestaande Groningse vorm** blijft staan,
(3) of een kerkelijk woord (kosteres, kerkkelder, dominee, kerkvoogdij) in het Gronings of in het Nederlands
blijft, (4) de aanspreekvorm (jij/jullie/u/jong), en (5) of een grap in de betekenis zit (dan verandert de
spreektekst die grap niet). De kolom hierboven noemt per regel het belangrijkste knooppunt.

Toets de keuzes aan `docs/verhaal/STIJLGIDS.md` (§2 stemmen, §4 taal) en aan de bestaande rijen: een
nieuwe vorm die in `gronings_spoken.json` al bestaat, houdt dezelfde spelling. Twijfelgevallen gaan naar
`docs/verhaal/DIALECT-NALEZING.md`.

## Route naar de wachtrij (menselijke controle verplicht)

1. De kenner vult per regel **dezelfde Nederlandse regel als sleutel** in `scripts/gronings_spoken_draft.json`
   met de Groningse spreektekst als waarde (of laat de regel bewust open).
2. `node scripts/gronings_merge_draft.mjs` toont wat er nieuw is en welke rijen botsen; `--write` voegt ze toe.
3. `node scripts/tts_lines_list.mjs` zet de regels daarna in de wachtrij; `python scripts/tts_lines.py` neemt op.
4. Deze lijst en `docs/verhaal/TTS-OPNAMELIJST-735.md` opnieuw draaien met `node scripts/tts_opnamelijst.mjs`.

## Wat hier bewust niet staat

Geen door een agent verzonnen of gegenereerd Gronings, geen automatische vertaling en geen "concept" dat
alleen nog goedgekeurd hoeft te worden. De citaten zijn bestaand, goedgekeurd materiaal; de rest is werk
voor een kenner. Wie de lijst in de code wil bijwerken zonder dialect te schrijven, gebruikt dit bestand als
bron voor de open regels.
