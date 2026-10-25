# #492 Vracht samen: de bijrijder doet mee

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-vracht-markt

## Acceptatie

De vrachtbijbaan is samen te spelen: de host rijdt, een gast rijdt mee en helpt.

- `game/js/coopbijbaan.js` krijgt een regel voor `vracht`: rol `bijrijder`, met E als
  hulpactie. De gast kan de baan bij het startpunt met E aanvragen (bestaande
  `startVoor`-weg), krijgt de bestaande Meedoen?-uitnodiging en doet mee met J.
- Een gast kan als passagier in de leen-truck van de baan; hij bestuurt niet (dat blijft
  de host). Als `coopbestuur.js` een passagier in een `missionCar` nu weigert, staat de
  agent alleen die passagiersrol toe, zonder de bestuurdersregel te verruimen.
- Tijdens laden en lossen verkort E van de bijrijder de resterende tijd met een vaste
  stap (bijv. 1,5 s), met de bestaande actie-afkoeling en alleen binnen bereik van de
  truck. De host ziet een korte melding; de gast ziet de voortgang gewoon op het bord.
- De beloning blijft via de bestaande `bijbaanBeloning`/`completeRound`-haak: elke
  meespeler krijgt het volle bedrag in zijn eigen portemonnee en loopbaan, met de vaste
  gebeurtenis-id; geen bonus, geen gedeelde kas.
- `coopstatus.js` zet `vracht` op `WERKT` en `docs/COOP-GAST.md` noemt de bijrijder.
- Tests: `scripts/coop/bijbaan_test.mjs` (regel, uitnodiging, actie, beloning),
  `scripts/coopstatus_test.mjs` (status klopt met de regel), een pure test voor de
  laadstap in `vrachtmarkt_test.mjs`, en de bestaande vracht-/coöptests blijven groen.
- `node --check`, `coop/bijbaan_test`, `coopstatus_test`, `vrachtmarkt_test`,
  `coopnet_test`, `coopgast_test`, `undef_check`, `import_check`, `import_cycles_test`
  en `text_audit` groen.

## Samen spelen

J (de wereld van de host). De host is de chauffeur; de gast is bijrijder en helpt laden
en lossen. Iedere deelnemer krijgt de volledige beloning per ronde, zonder bonus; wie
wegvalt houdt wat hij al kreeg. Geen nieuw netwerkbericht: de bestaande
`bijbaan`/`bijbaangast`-berichten en `helperActie` worden hergebruikt.

## Niet

Geen tweede truck, geen eigen vrachtmarkt per gast, geen gast als chauffeur, geen
gedeelde kas, geen wijziging aan het contract-/loonmodel van de markt.
