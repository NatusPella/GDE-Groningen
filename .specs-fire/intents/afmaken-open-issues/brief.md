# Intent: alle openstaande issues afmaken (tot een release)

## Doel
Alles wat nog openstaat in de GitHub-issues afmaken, zelf testen (code en screenshots) en pas daarna één release maken. Issues die ik zelf aantoonbaar heb getest mag ik sluiten; wat op de eigenaar wacht blijft open.

##Waarom
De roadmap staat in GitHub (project 5). De grote blokken (#434, #435, #436, #437, #443, #452, #454) zijn gebouwd en getest; er resten een paar punten, een aantal visuele checks en de afronding.

## Succescriteria
- Elk codeerbaar issue is af of heeft een expliciete, onderbouwde restpost.
- Poorten groen: import_check, import_cycles, undef_check, spelers_budget, text_audit, en de lichte suite zonder nieuwe fouten.
- Visuele punten zijn met screenshots bekeken.
- CHANGELOG bijgewerkt; release pas als alles af is.

## Aannames (eigenaar is weg)
- Geen vragen; bij twijfel de kleinste veilige oplossing en de keuze in het issue vastleggen.
- Eigenaar-issues (publiceren, YouTube, IARC, Steam, TTS, menselijke tests) blijven open.

## Buiten scope
- Nieuwe grote systemen, enginewerk, TTS-opnames, release zonder groene suite.
