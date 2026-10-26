# #492 Vissen: hengeltuig, aas en lijnsterkte met een hengelwinkel

- **Issue:** #492
- **Epic:** #492
- **Complexity:** high
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

Vissen krijgt de B-laag: uitrusting, aas en een winkel, zonder de bestaande vrije hengel
stuk te maken.

- Nieuwe pure `game/js/hengeltuig.js`: 4 hengels, 6 aassoorten, lijnsterkte (0-1) en
  upgrades 0-2; prijzen en een `normaliseer`; geen DOM/THREE/klok/opslag.
- Nieuwe `game/js/hengeltuiglive.js` bewaart het tuig in `gde-hengeltuig-v1`
  (`storagekeys.js`), met een veilige standaard die exact het huidige gedrag geeft.
- `hengelen.js`/`hengelrules.js` gebruiken hengel, aas en lijnsterkte: een sterke lijn
  verruimt het beetvenster, aas beïnvloedt de doelsoort, en zonder tuig verandert er
  niets. De HUD noemt hengel en aas.
- Een hengelwinkel bij een bestaande waterplek of in de bestaande winkel (`shops.js`/
  `facilities.js`): kopen en upgraden met eigen geld; een gast mag dat in zijn eigen spel.
- Tests: `hengeltuig_test`, `vis_test` (bestaand gedrag zonder tuig, effect van tuig,
  winkelprijzen, opslag), `coopstatus_test`; `text_audit` blijft schoon.

## Samen spelen

J (lokaal per speler). Iedere speler heeft zijn eigen tuig en visboek; de gast hengelt
op zijn eigen scherm en betaalt uit zijn eigen geld. Geen gedeelde kas, geen nieuwe
beloning en geen netwerkbericht.

## Niet

Geen drill, diepte/sonar, vergunningen of toernooien; geen nieuwe vissoorten buiten de
bestaande 29; geen wijziging aan de wedstrijd in Meerstad buiten de tuiginvloed.
