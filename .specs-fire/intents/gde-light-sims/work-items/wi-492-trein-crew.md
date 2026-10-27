# #492 Treincrew: conducteur en eigen beloning per crewlid

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-trein-samen

## Acceptatie

De treinpassagier krijgt een echte rol en een eigen beloning.

- De eerste gast die instapt wordt conducteur, volgende gasten passagier. De gastheer
  blijft machinist; `treincoop.board/leave/may` blijven de bron.
- O van de conducteur bedient de deuren en K de waakzaamheid, via een nieuw
  `{ k: 'trein', a: 'deur'|'waak' }` gast→host-bericht. De host verwerkt het met
  `machinist.js`/`traindrive.js`; een passagier mag het niet. Geen `PROTO`-bump.
- Bij de uitbetaling van de dienst krijgt elk crewlid (conducteur en passagiers) het
  volle bedrag en de XP in zijn eigen geld en loopbaan; een gast die niet in de crew zit
  krijgt niets. De gastheer houdt zijn huidige `loopbaanVerdien`-bedrag.
- Geen dubbele betaling: één `coopDeel`-aanroep per dienst, met `info.slots` uit
  `treincoop.splitReward` (slot 0 eruit), via de bestaande gebeurtenis-id.
- Nieuwe/uitgebreide tests: conducteurrol, deuren/waak, passagier geweigerd, beloning per
  crewlid, niet-crew 0, één betaling per dienst. `cooptrein_test`, `coop/treincoop_test`,
  `coopnet_test`, `coopgast_test`, `coopgaten_test`, `coopregressie_test`, `undef_check`,
  `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

J. De gastheer is machinist; de eerste gast is conducteur, de rest passagier. Iedere
crewlid krijgt de volledige beloning per dienst in zijn eigen geld en loopbaan; wie niet
meerijdt krijgt niets. Geen gedeelde kas, geen bonus, geen nieuwe opslag.

## Niet

Geen gast als machinist, geen hostwissel-herstel, geen interieur/camera voor de gast,
geen wijziging aan `treincoop.js`-regels of `PROTO`.
