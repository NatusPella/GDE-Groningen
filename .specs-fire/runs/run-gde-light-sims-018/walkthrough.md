# Walkthrough — wi-492-trein-crew (#492)

## Wat er is gedaan

- `game/js/cooptrein.js`: de eerste gast wordt conducteur, volgende gasten passagier;
  de gastheer blijft machinist. De dienstvlag op de trein weigert een late instap echt.
- `game/js/coopgastlokaal.js`: O en K van een gast gaan alleen bij `world.coopTrein` naar
  de host; `coopnet.js` controleert met `treincoop.may` en zet de deur-/waakvlag, of meldt
  de weigering aan de gast.
- `game/js/machinist.js`: de conducteur bedient de deuren via dezelfde `deuren()`-hulp;
  `traindrive.js` telt de waakvlag mee in beide `stepCab`-aanroepen. Bij de uitbetaling
  krijgt de gastheer `loopbaanVerdien(..., { deel: false })`, daarna één
  `world.coopDeel(betaald, { ...loopbaanDeel('trein', pay, xp), slots })` met de crewsloten
  uit `splitReward` zonder slot 0.
- Vlaggen en `coopTreinMeld` worden opgeruimd bij stoppen, uitstappen en het einde van de
  sessie.
- `CHANGELOG.md`, `docs/COOP-GAST.md` en `.specs-fire/standards/mechanica.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `cooptrein_test` 72/72, `coop/treincoop_test` 56/56, `coopgaten_test` 19/19,
  `coopnet_test` 36/36, `coopgast_test` 13/13, `coopregressie_test` 462 controles
  (2/4/8/16 spelers), `coopgastlokaal_test` 3/3, `gasttrein_test` 20/20,
  `treincabine_test` 46/46.
- `undef_check` 1721 modules, `import_check` 1873 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De changelogregel gebruikte "ieder … zijn"; herschreven naar "alle crewleden … hun".
- De late-instapweigering leunde op een vlag die alleen in de test werd gezet; de echte
  dienst zet nu `t.service`, en `cooptrein` geeft die door aan de crew voordat `board()`
  wordt aangeroepen.
- Nits die blijven: de conducteur ziet geen bevestiging van een geslaagde O (de deurstand
  gaat niet mee in de snapshot), een crewlid dat "N" zei bij een lopende missie valt
  buiten de deling (bestaand gedrag van `coopDeel`), en de deur-/waakvlaggen zijn met
  bronchecks gedekt, niet met een volledige sessie.

## Niet getest

- De deuren, de waakzaamheidsrem en de uitbetaling in een echte sessie met beeld.
- `machinist_test` in deze worktree (vraagt `GDE_PROVINCE_SRC`); de pure betaalweg is via
  `cooptrein_test` en bronchecks gedekt.
- De volledige suite, `province_test` en de Electron-verhaaltest.

## Open / volgende

- De zeven SIM-lussen hebben nu een samen-modus: boerderij, vissen, vracht, vliegen,
  trein (passagier + conducteur) en melee/PvP. Wat nog ontbreekt is polish: een eigen
  interieur/camera voor de treinpassagier, gasten als piloot, en de 1+1=3-bonus (ADR 0016).
