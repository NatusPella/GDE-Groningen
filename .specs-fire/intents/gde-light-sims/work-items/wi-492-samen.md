# #492 Samen spelen: contract voor naadloos in/uit, start vanaf de kaart en 1+1=3

- **Issue:** #492
- **Epic:** #492
- **Complexity:** high
- **Mode:** validate
- **Depends on:** wi-493-geld

## Acceptatie

### Slice 1: 1+1=3 — klaar
- `groepsbonus.js:11-19`: 0,5 per extra speler, max 3×, solo 1× (ADR 0020), over het bedrag van die
  speler (`standards/multiplayer.md (de sectie Rollen; regelnummers schuiven, #703)`), in missies, bijbanen, wedstrijden en de treincrew; toets
  `scripts/groepsbonus_test.mjs` en een late deelnemer (`coopnet.js:358`). Niets te bouwen.

### Slice 2: naadloos in
- Er is: later aansluiten via `lateInstap` (`coopmeedoen.js:44`), de bezig-standen voor een late gast
  (`docs/COOP-GAST.md:88`) en een wachtkamer die op de start wacht (`coopgate.js:1-15`); alleen `canJoin`
  (`coopnet.js:104-111`) weigert nog (voertuig, filmpje, herstel), met uitleg (`coop/gaststart_test.mjs`).

### Slice 3: naadloos uit
- Er is: `onLost` met beleid per speler (`coopnet.js:331-340`, `coopplayers.js` `holdBeleid`), het
  wachtscherm met Opnieuw verbinden (`coophold.js:23-45`) en overdracht na 12 s stilte.
- Open: de tussenstand van de opdracht gaat niet mee bij een overdracht (`docs/COOP-GAST.md:93`); de overnemer
  krijgt dezelfde opdracht, stap en tijd, of hoort eerlijk dat die stopt (`scripts/coop/hostwissel_test.mjs`).

### Slice 4: starten vanaf de kaart
- De kaart kiest en reist (`mapview.js:1708-1727`) en grijst uit wat niet samen werkt (`mapview.js:1108-1116`,
  `coopstatus.js`); starten gebeurt bij het startpunt met E, waar een gast het vraagt (`coopmissie.js`
  `verzoekBlok`, 188). Geen startknop op de kaart die andermans wereld verandert; elke loopbaan heeft een
  `samen`-status (`scripts/coopstatus_test.mjs`) en een klik start bij een gast niets (`coop388_test.mjs`).

## Samen spelen

Eén wereld, iedereen gelijkwaardig, eigen geld en voortgang, 1+1=3: de host simuleert, de gast vraagt.

## Niet

Geen protocolbump, geen tweede wereld, geen gedeelde kas, geen chat of spraak (#451), geen dedicated
servers (#450), geen instap halverwege een race of kluisklus.
