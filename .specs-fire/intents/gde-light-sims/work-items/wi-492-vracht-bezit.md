# #492 Vracht: eigen truck en trailer met sfeerkosten

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-vracht-markt

## Acceptatie

De vrachtbijbaan gebruikt je eigen truck als je die hebt, en een rit kost brandstof,
tol en afschrijving.

- `sidejob_vracht.start` kiest de eigen truck van de speler (`ownedvehicles`) als die
  er is en geschikt is; anders blijft de leen-truck. De eigen trailer/oplegger wordt
  gekoppeld zoals de bestaande semitrailer.
- Nieuwe pure `game/js/vrachtkosten.js`: brandstof (liter × prijs), tol en een
  APK/onderhoudsdeel per rit, deterministisch en nooit negatief. Het nettoloon is
  bruto − kosten; geen tweede kasboek, de kosten gaan via de bestaande `finance`/
  `uitgaven`-haak.
- De rit blijft host-only; een gast kan niet de eigen truck van de host besturen.
- Tests: `vrachtkosten_test`, `vrachtmarkt_test` (eigen truck versus leen-truck),
  `semitrailer_test`; bestaande vracht-/coöptests groen.

## Samen spelen

N (host-werk). De eigen truck is van de speler op zijn eigen apparaat; de baan blijft
op de wereld van de host. Geen gedeelde kas, geen nieuwe beloning per speler.

## Niet

Geen transportbedrijf, veerpont of weegbrug; geen nieuwe truckwinkel; geen tweede
kasboek; geen wijziging aan het contract-/laadmodel.
