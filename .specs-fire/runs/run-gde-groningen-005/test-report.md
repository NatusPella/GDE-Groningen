# Testrapport — wi-436-rest

- **Fietswiel dat achteruit draait** — opgelost met een reflector op de velg (asymmetrisch merkteken); scripts/fietswiel_test.mjs 62 checks.
- **Taxi-lichtkrant** — bord is nu van de taxi (gedeelde resources), blijft staan als de mesh even weg is en scrolt per seconde; reklametaxi_test 447 checks.
- **Zwarte borden** — de bordatlas krijgt eerst bordkleur en borden zonder tekst leveren geen vlak meer op; boardquad_test 82 checks.
- **Hoogkerk-bebouwing** — niet op te lossen zonder de OSM/3BAG-bron in deze worktree; dat is werelddata, geen code.

Conclusie: drie van de vier punten zijn in code gedekt; het vierde is een datavraagstuk.
