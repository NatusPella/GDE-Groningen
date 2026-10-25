# Walkthrough — wi-492-trein-samen (#492)

## Wat er is gedaan

- `game/js/cooptrein.js` (nieuw, geen THREE/DOM): de gastheer-trein, de crew uit
  `treincoop.js`, instappen met E, het lichaam dat aan een wagen hangt, uitstappen bij
  stilstand en het opruimen van de crew.
- `game/js/coopnet.js`: `treinGebruik` vóór het gewone besturen, `treinTick` in de
  host-tick, `treinUit` bij wegvallen, `treinStop` bij het einde van de sessie, en het
  bericht `{ k: 'trein', aan, rol }` host→gast. `PROTO` en `CODEC_VERSION` blijven 2.
- `game/js/traindrive.js`: `treinStop` in `stopDriving`; `syncRider` laat een gast die
  meerijdt met rust.
- `game/js/companion.js` en `game/js/railway.js`: een meerijdende gast wordt niet
  meegesleept en niet uit de wagen geduwd.
- `game/js/coopstatus.js`: `trein` staat nu op `DEELS` met de uitleg "meerijden mag, zelf
  besturen niet"; `docs/COOP-GAST.md` noemt de treinpassagier.
- `scripts/cooptrein_test.mjs` (44 controles) en `scripts/coop/treincoop_test.mjs`
  (50 controles).

## Checks

- `node --check` op alle gewijzigde JS.
- `cooptrein_test` 44/44, `coop/treincoop_test` 50/50, `coopnet_test` 36/36,
  `coopgast_test` 13/13, `gasttrein_test` 20/20, `coopregressie_test` 462 controles
  (2/4/8/16 spelers), `coop388_test` 9/9, `coopstatus_test` 11 groepen.
- `undef_check` 1721 modules, `import_check` 1873 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De "wacht tot de trein stilstaat"-controle stond vóór de afstandscontrole, waardoor E
  van elke gast overal werd opgeslokt zodra de trein reed; de afstand wordt nu eerst
  gecontroleerd.
- `syncRider` zette de meerijdende gast elk frame in de cabine bij de machinist, vóór de
  snapshot; een gast met `coopTrein` wordt nu overgeslagen.
- Nits die blijven: bij een sessie-einde terwijl de trein rijdt, komen de lichamen naast
  de wagen; de late-instapweigering is in de praktijk onbereikbaar; een gast kan in het
  power-blok van sommige treintypes staan; de duw-uitzondering geldt voor alle treinen;
  `coopTreinMeld` wordt bij het einde van de sessie opgeruimd.

## Niet getest

- Instappen en meerijden in beeld (geen browser/Electron).
- De snapshot-volgorde in een echte sessie, twee gasten tegelijk, een bocht, en het
  bericht `{k:'trein'}` via `handleEvent`.
- De echte bedrading in `stopDriving`/`onLeave`/`onLost` is via directe functie-aanroepen
  getest, niet via een volledige sessie.

## Open / volgende

- Conducteur (O deuren, K waakzaamheid) en de eigen beloning per crewlid zijn de volgende
  twee treinstappen.
