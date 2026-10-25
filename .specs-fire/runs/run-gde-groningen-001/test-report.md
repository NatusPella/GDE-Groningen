# Testrapport — wi-463-beeld

Datum: 2026-10-25

## In code
- `nightrules_test` (foliageGlow dag/nacht/monotoon) groen.
- `furniture_test` (straatmeubilair niet op de rijbaan/in een gevel) groen.
- `farlod_test` (plint/kroonlijst/hoogstrook binnen de muur, ook bij een schuur van 2,4 m) 98 checks groen.
- `perrons_test` 39/39 (kap ondoorzichtig, lichte onderkant).
- `kermis_camera_test` 50/50 (volgcam buiten het voertuig).
- `cabin_test`/`import_check`/`text_audit` groen na de raamoffset-fix.

## In beeld (screenshots)
- Laadscherm, startscherm, opening en pauzemenu bekeken in de browser (v0.53.0 + deze tak).
- **SPATIE-hint over de ondertitel**: gefixt en met screenshot bevestigd (hint staat nu rechts boven de ondertitel).
- **Pauzemenu-kop**: datum, titel en uitleg staan onder elkaar; gemeten in de DOM: 112–136 / 143–203 / 208–256, geen overlap.
- **Naafkapjes**: van MeshBasic naar Lambert; de auto's zijn daarna niet opnieuw 's nachts gefotografeerd.

## Niet in beeld
- Nachtgebladerte, Helperzoom-paaltjes en de perronkap zijn niet opnieuw in het spel gefotografeerd: er is geen debughaak om de klok te zetten en de nacht duurt in het spel te lang. Ze zijn met pure tests en broncontroles gedekt.
- De verre LOD-tinten zijn niet visueel beoordeeld.

## Conclusie
De UI-fouten zijn bewezen weg. De 3D-punten zijn in code gedekt; een echte nacht-/perronsessie blijft open als visuele bevestiging.
