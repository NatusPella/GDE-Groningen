# #492 Vrachtmarkt: contracten met tarief, laad- en lostijd

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De vrachtbijbaan krijgt de eerste ETS2-laag: een contract in plaats van een random klant.

- Nieuwe pure regelmodule `game/js/vrachtmarkt.js` zonder DOM, THREE, klok of opslag:
  4 contracttypes (koel, zeil, bak, stukgoed), elk met `tariefPerKm`, `laadSeconden`,
  `losSeconden` en een kleine toeslag; `maakAanbod(seed, afstandKm, niveau)` is
  deterministisch en geeft 3 verschillende aanbiedingen uit één seed.
- `loon = afstandKm × tariefPerKm + toeslag`, afgerond en nooit negatief; de bestaande
  `completeRound`/`loopbaanVerdien`-haak blijft de enige uitbetaling (geen `world.money +=`).
- `game/js/sidejob_vracht.js` gebruikt het gekozen contract: het rondje kiest een aanbod,
  toont type en tarief in de opdrachttekst, en kent na het koppelen een laadtijd en bij
  de afnemer een lostijd. De bestaande time-out, laadschade, inklapper- en remstraf
  blijven werken; het rondje faalt niet op wachten.
- Nieuwe test `scripts/vrachtmarkt_test.mjs`: 4 types, tarief/laad/lostijd > 0,
  determinisme, 3 verschillende aanbiedingen, loonformule, onbekende/rare invoer.
- `node --check`, `vrachtmarkt_test`, `semitrailer_test`, `sidejob_glyph_test`,
  `undef_check`, `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

N (host-werk): de vrachtbijbaan is nu host-only (`coopstatus.js`), een gast kan hem niet
starten en de leen-truck is `missionCar`. Deze unit verandert daar niets aan en voegt
geen new reward-splitsing toe. De markt en het aanbod zijn van de speler die de baan
doet; geen gedeelde kas, geen netwerkbericht. Het bestaande gastgat (een gast krijgt
toch een deel via `completeRound`) wordt in #365/#371 aangepakt, niet hier.

## Niet

Geen eigen truck/trailer (volgende unit), geen brandstof/tol/APK, geen tweede kasboek,
geen transportbedrijf, geen wijziging aan `sidejobs.js` buiten wat strikt nodig is.
