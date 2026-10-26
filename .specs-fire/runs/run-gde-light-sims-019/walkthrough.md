# Walkthrough — wi-492-trein-lopen (#492)

## Wat er is gedaan

- `game/js/treincontrole.js` (nieuw, puur): vijf reizigers per ronde, een vaste uitkomst
  per reiziger, eenmalige beloning (€45 + 25 xp) en een rust van vijf minuten na een
  ronde, zodat kaartjes controleren geen geldmolen wordt.
- `game/js/cooptrein.js`: de conducteur start met T een loopstand, loopt met WASD/muis
  over het gangpad en tussen wagens, controleert met E bij een zittende reiziger en
  krijgt het loon in zijn eigen geld/loopbaan (`deel: false`). De machinist blijft rijden;
  een passagier kan niet controleren.
- `game/js/coopnet.js`: de looppositie gaat als `a:'walk'` mee in het bestaande
  `trein`-bericht; de host zet het gastlichaam in de juiste wagen. Geen `PROTO`-bump.
- `game/js/treininterieur.js`/`railway3d.js`: het interieur en de reizigers worden ook
  voor de gasttrein gebouwd; `coopgastlokaal.js` stuurt T/E naar de treinconducteur.
- `main.js` geeft `cooptrein.js` een treinbron, zodat die module zonder railway/THREE
  blijft.
- `CHANGELOG.md` noemt lopen en kaartjes controleren.

## Checks

- `node --check` op alle gewijzigde JS.
- `treincontrole_test` 58/58, `cooptrein_test` 109/109, `coop/treincoop_test` 56/56,
  `coopnet_test` 36/36, `coopgast_test` 13/13, `gasttrein_test` 20/20,
  `coopregressie_test` 462 controles (2/4/8/16 spelers), `treinlayout_test` 115/115,
  `coopgaten_test` 19/19.
- `undef_check` 1722 modules, `import_check` 1875 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De beloning was onbeperkt herhaalbaar: na vijf controles begon de volgende ronde meteen,
  en T reset te ook nog eens. Er zit nu een rust van vijf minuten op, en T hergebruikt de
  bestaande teller.
- Na een halte wisselt het reizigerszaadje; de teller wordt dan schoon maar de rust blijft
  gelden, zodat dezelfde stoel niet een andere passagier lijkt.
- De host laat alle crewleden lopen; alleen de conducteur mag controleren. Dat is bewust:
  passagiers mogen in de trein rondlopen, maar geen kaartjes knippen.

## Niet getest

- Het lopen en het interieur in beeld (geen browser/Electron): de pure logica, de camera-
  opbouw en de hostpositie zijn getest, niet visueel.
- Twee gasten die tegelijk lopen, een bocht en een halte tijdens een lopende ronde.
- De echte bedrading van het `trein`-walkbericht via `handleEvent` in een volledige sessie.

## Open / volgende

- De groeps-API (`coopGroepStart`/`coopGroepZet`) en `leider` in de UI, zodat iedereen een
  activiteit kan starten en meerdere groepen verschillende dingen kunnen doen.
