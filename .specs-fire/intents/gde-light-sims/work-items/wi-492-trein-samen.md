# #492 Trein samen: de gast als passagier

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-trein-passagiers

## Acceptatie

Een gast kan bij de gastheer in de trein stappen, meerijden en op tijd uitstappen.

- Nieuwe module `game/js/cooptrein.js` (geen THREE/DOM): de gastheer-trein, de crew uit
  `treincoop.js`, het instappen met E, het lichaam dat met een wagen meebeweegt, en het
  uitstappen als de trein stilstaat.
- De gastheer blijft machinist: bij de eerste gast doet de host `board(crew, 0)`; de gast
  wordt passagier. Zonder host in de trein gebeurt er niets.
- Het lichaam van de gast volgt een wagen (binnen 2 m over 60 tikken, ook bij een rijdende
  trein) en wordt niet door `gastTreinContact` of `resolveContacts` uit de wagen geduwd.
- E bij bijna stilstand zet de gast weer naast de wagen; bij het stoppen van de gastheer,
  het einde van de sessie of het wegvallen van de gast wordt de crew opgeruimd.
- Nieuw bericht `{ k: 'trein', aan: true|false, rol }` host→gast voor de eigen
  contact-check; `PROTO` en `CODEC_VERSION` blijven 2. Onbekende berichten worden genegeerd.
- Nieuwe test `scripts/cooptrein_test.mjs` (instappen, meerijden, niet duwen, uitstappen,
  host stopt, late join) en uitbreiding van `scripts/coop/treincoop_test.mjs` voor de
  gebruikte crew-helpers. `coopnet_test`, `coopgast_test`, `gasttrein_test`,
  `coopregressie_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

J (de wereld van de host). De host is machinist, de gast passagier; de gastheer bestuurt.
Geen nieuwe beloning in deze slice (die volgt apart met `splitReward`/`coopDeel`), geen
gedeelde kas, geen opslag. De gast ziet de trein al via de snapshot; deze slice koppelt
zijn lichaam aan een wagen.

## Niet

Geen conducteur (deuren/waak) in deze slice, geen gast als machinist, geen eigen
beloning, geen interieur/camera voor de gast, geen hostwissel-herstel, geen wijziging aan
`treincoop.js`-regels of `PROTO`.
