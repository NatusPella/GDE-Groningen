# Fixes 22-11: UI en regels

Bronnen: `review-ds3-ui-22-11` (CODE-REVIEW-22-11-ds3-ui.md) en `review-regels-constitution-22-11` (CODE-REVIEW-22-11-regels-constitution.md). Branch `fix-ui-regels-22-11`, gebaseerd op origin/main (310892926). Elke fix heeft eerst een pure test die zonder de fix faalt.

| Bevinding | Commit | Test |
| --- | --- | --- |
| UI 2: Schermschudden Uit en Beweging beperken laten de camerazwaai in verhaalscènes staan | 218ac4c7c | `scripts/a11y_test.mjs` (`handheldOffset`) |
| UI 5: outfitmelding "maar 1 stuk ontbreken" | 8f74e53a0 | `scripts/outfitmelding_test.mjs` |
| UI 6: Tab-val in startkeuze, toestemmingskaart en moeilijkheidskaart | e91ea7d52 | `scripts/kaart_tabval_test.mjs` |
| UI 7: `in`-operator in settings.js | fca754c5d | `scripts/settings_eigen_sleutel_test.mjs` |
| Regels 1 en 5: credits, `PRIVACY-EN-CREDITS.md`, `onlineconsent.js` (live bussen en treinen ook bij Alleen spelen) en CC BY met titel en licentielink | 96fb16bc6 | `scripts/credits_netwerk_test.mjs`, `scripts/audio_licenties_test.mjs` |
| Regels 2: live treinen alleen opvragen zonder Samen spelen en met een station binnen 400 m | 68fa1be64 | `scripts/treinlive_bereik_test.mjs` |
| Regels 3: naamtaalpoort (coop als achtervoegsel, `scripts/`, bredere stammen, allowlist met 158 bestaande overtreders) | d0a6e19a2 | `scripts/naamtaal_test.mjs` |
| Nieuwe identifiers in het Engels (ADR 0027) | 717a6dfd7 | `scripts/naamtaal_check.mjs` |

## Keuzes

- Bij een CC BY-bron blijft de titel weg als hij een merknaam bevat (constitutie 2): nu alleen id 845619 (een autotype). De bronlink en licentielink staan er wel. De linkhosts (freesound.org en creativecommons.org) staan in `NETWERK_GOEDGEKEURD` van `rules_audit.mjs` en in `text_audit_allow.json`: het zijn links, het spel haalt er niets mee op.
- De allowlist van de naamtaalpoort mag alleen krimpen; een test bewaakt dat elke uitzondering nog een overtreder is.
- Live treinen: straal 400 m (`LIVE_R` in `stationlife.js`); de vertragingen blijven na een opvraag nog zichtbaar tot ze verouderen.

## Niet gedaan

- Niets in beeld of in Electron bekeken (Tab-val, zwaai in scènes, links in Over): alleen pure tests en broncontroles. Nog niet bekeken.
- Overige bevindingen uit beide rapporten (ds3 1, 3, 4; regels 4, 6, 7, 8) vallen buiten deze taak.
- `rules_audit --from=v0.64.0` geeft 1 blokkerend dat niet van deze branch is: `game/js/worldlifelines.js:16` ("ijs" als ijsje, #1181).
