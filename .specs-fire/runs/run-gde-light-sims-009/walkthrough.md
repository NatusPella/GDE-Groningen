# Walkthrough — wi-492-vracht-markt (#492)

## Wat er is gedaan

- `game/js/vrachtmarkt.js` (nieuw, puur): vier contracttypes (koel, zeil, bak, stukgoed),
  elk met tarief per km, laad- en lostijd en toeslag. `maakAanbod(seed, km, niveau)` is
  deterministisch en geeft drie verschillende aanbiedingen; `contractLoon` is
  `km × tarief + toeslag`, afgerond en nooit negatief.
- `game/js/sidejob_vracht.js` kiest per ronde een contract, toont type en tarief, koppelt
  zoals voorheen, kent daarna een laadfase en bij de afnemer een losfase, en lost alleen
  bij de afnemer. De bestaande time-out, laadschade, inklapper- en remstraf blijven
  werken; het loon gaat via de bestaande `completeRound`/`loopbaanVerdien`-haak.
- `docs/MERKENREGISTER.md` bijgewerkt (Zomerzoet staat nu in `vrachtmarkt.js`).

## Checks

- `node --check` op alle gewijzigde JS.
- `vrachtmarkt_test` 197 checks (band level 1: €73-163 over de echte afstand van 0,36 tot
  1,56 km), `semitrailer_test` ok, `sidejob_glyph_test` 22 checks,
  `merkenregister_check` 45 rijen en 0 afwijkingen.
- `undef_check` 1715 modules, `import_check` 1867 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De merkenregisterrij wees nog naar `sidejob_vracht.js`; bijgewerkt.
- De bandtest gebruikte de nominale 0,45-1,3 km terwijl de wereld 0,36-1,56 km geeft; de
  test gebruikt nu de echte grenzen en de belofte is bijgesteld.
- Lossen kon op elke plek nadat de speler één keer bij de afnemer was; nu moet hij bij de
  afnemer blijven staan.
- De stukgoedoplegger heette in de HUD anders dan in de klus; de naam is gelijkgetrokken.
- De toelichting over de seed beloofde een herhaalbaar rondje; de markt is deterministisch,
  de afstand niet. Commentaar rechtgezet.

## Niet getest

- De rit zelf: geen wereld- of Electron-test, dus de faseovergangen, het lossen bij de
  afnemer, de HUD en de time-out zijn alleen via de pure markt en een broncheck gedekt.
- Samen spelen is ongewijzigd: de baan blijft host-only en een gast kan hem niet starten.
  Het bestaande gastdeel via `completeRound` hoort bij #365/#371.

## Open / volgende

- Een keuzemenu op de markt (de speler kiest nu impliciet uit de drie aanbiedingen).
- Eigen truck en trailer, en daarna brandstof/tol/APK.
