# Walkthrough — wi-492-vracht-samen (#492)

## Wat er is gedaan

- `game/js/coopbijbaan.js` heeft een regel voor `vracht`: de gast is bijrijder, vraagt de
  baan met E bij het startpunt, doet mee met J en helpt met E bij laden en lossen. De
  bestaande uitnodigings-, doel- en beloningswegen zijn hergebruikt.
- `game/js/sidejob_vracht.js` heeft `kanHelpen`/`helperActie`: alleen tijdens laden of
  lossen, alleen bij stilstand, binnen 20 m van de trekker en bij het lossen ook bij de
  afnemer. De resterende tijd gaat met een vaste stap omlaag; lading, time-out en loon
  blijven onaangeroerd.
- De host publiceert met het doel of er nu iets te helpen valt (`help`); de gast claimt E
  alleen dan. Tijdens het koppelen en de rit blijft E gewoon uitstappen.
- `game/js/vrachtmarkt.js` heeft de pure `helpLaadTijd`; `coopstatus.js` zet `vracht` op
  `WERKT`; `docs/COOP-GAST.md`, `game/js/coopgast.js` en `ARCHITECTURE.md` noemen de
  bijrijder. De beloning blijft de bestaande volledige beloning per deelnemer.

## Checks

- `node --check` op alle gewijzigde JS.
- `coop/bijbaan_test` 19 tests, `vrachtmarkt_test` 236 checks, `coopstatus_test` 10
  groepen, `coopnet_test` 36/36, `coopgast_test` 12/12, `coopbestuur_test` 23 groepen.
- `undef_check` 1719 modules, `import_check` 1871 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De E-poort claimde E in elke fase, waardoor een bijrijder niet kon uitstappen tijdens
  het koppelen en de rit. De host publiceert nu `help`; E valt buiten laden/lossen door
  naar uitstappen.
- De canonieke gasttekst en de test die hem bewaakt noemden de vrachtrit nog niet;
  bijgewerkt, net als `ARCHITECTURE.md` en de changelog.
- De hulpactie keek alleen naar afstand; nu ook naar stilstand en (bij lossen) de
  afnemer.

## Niet getest

- De rit in beeld en in een echte sessie: de gast als passagier in de leen-truck, het
  instappen via `companion.js`, de HUD en het echte `sidejob_vracht.js` (dat three van een
  CDN laadt) zijn niet gedraaid. De tests gebruiken een nep-loper en de pure markt.
- De Electron-verhaaltest en de zware suite.

## Open / volgende

- De gast als chauffeur van de leen-truck is een latere stap; nu rijdt de host.
- Trein- en vliegrollen voor gasten zijn de volgende coöp-SIM-stap.
