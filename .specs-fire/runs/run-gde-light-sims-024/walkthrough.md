# Walkthrough — wi-492-vracht-bezit (#492)

## Wat er is gedaan

- `game/js/vrachtkosten.js` (nieuw, puur): brandstof (liters × prijs), tol en een
  APK/onderhoudsdeel per rit; eigen truck versus leen-truck; nooit negatief.
- `game/js/sidejob_vracht.js`: kiest de eigen truck uit `ownedvehicles` als die er is,
  anders de leen-truck; de bestaande oplegger/koppelweg blijft. De kosten worden bij de
  start via `noteMoney` betaald; het loon blijft via `complete` lopen. De melding toont
  het verwachte nettoloon op basis van de echte `c.pay`-haak.
- De truckprestaties worden na de rit hersteld; een eerdere geladen rit laat de eigen
  truck niet permanent traag achter.
- `game/js/sidejobs.js` ruimt de eigen truck niet op; `ownedvehicles.eigenVrachtTruck`
  kiest een geschikte, vrije truck en zet hem op de kerb.
- `coopbijbaan.js` noemt niet langer alleen de leen-truck.
- `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `vrachtkosten_test` 218 checks, `vrachtmarkt_test` 249 checks, `semitrailer_test` ok,
  `sidejob_glyph_test` 22, `coop/bijbaan_test` 19, `finance_test` ok.
- `undef_check` 1730 modules, `import_check` 1883 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De eigen truck hield de prestaties van een geladen oplegger; `stop()` herstelt nu de
  basis en `start()` leest niet opnieuw een verlaagde basis.
- Het getoonde nettoloon klopte niet met de echte uitbetaling; de melding gebruikt nu
  `c.pay`.
- De bijrijderstekst noemde alleen de leen-truck; nu de truck van de chauffeur.

## Niet getest

- De rit in beeld (start, eigen truck op de kerb, koppelen, kostenmelding).
- Een eigen truck in een echte save en een live sessie met een gast.
- De `eigenVrachtTruck`-takken (bezet, kapot, thuisgestald, tweede truck) zijn bronmatig
  gedekt, niet met een echte `ownedvehicles`-staat.

## Open / volgende

- De kosten worden bij de start betaald, ook bij een mislukte rit; dat is een bewuste
  keuze (brandstof en tol zijn al verbruikt).
