# 0039 - Licentievrije audio van Freesound met credits

- **Status:** besloten (eigenaarsbeslissing 20-11-2026)
- **Datum:** 20-11-2026
- **Spec:** `.specs-fire/standards/mechanica.md` (geluid), `docs/AUDIO-LICENTIES.md`
- **Verwant:** constitutie punt 4 in AGENTS.md, #988

## Context

De procedurele SFX klonken soms goed en soms heel matig; voetstappen waren het slechtst. Echte opnames zijn beter voor voetstappen, weer en motoren. De repo is openbaar, dus bestanden worden herverdeeld.

## Besluit

Geluiden mogen tijdens de ontwikkeling worden opgehaald van Freesound (met de API, previews), Kenney en OpenGameArt, onder CC0 of CC-BY 3.0/4.0. De eigenaar geeft Freesound en de auteurs credits: elk bestand staat met bron, id, titel, auteurshandle, licentie en bewerking in `docs/AUDIO-LICENTIES.md` en in de credits van het spel. Het spel zelf haalt niets op. De API-sleutel staat buiten de repo (`<thuismap>/.gde/freesound.json`) en wordt nergens getoond of vastgelegd. De procedurele geluiden blijven als terugval.

## Afgewezen

- **Alleen procedureel:** voetstappen en weer klinken matig.
- **Alleen CC0:** te weinig keuze voor goede voetstappen en weer.
- **CC-BY-NC, -ND, Sampling+ of gratis voor persoonlijk gebruik:** niet te herverdelen in een openbare repo.
- **Betaalde packs:** kosten en licentieruimte voor een openbare repo.
- **Origineel downloaden met OAuth:** vraagt een browsersessie van de eigenaar; previews volstaan voor een spel.

## Gevolgen

Elk toegevoegd geluidsbestand heeft een regel in `docs/AUDIO-LICENTIES.md` en in het credits-gegevensbestand, en een test bewaakt dat. Auteurshandles in de repo zijn een uitzondering op "geen echte namen in credits" en gelden alleen voor third-party audio.
