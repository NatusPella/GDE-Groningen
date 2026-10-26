# Walkthrough — wi-492-melee-blok (#492)

## Wat er is gedaan

- `game/js/blockregels.js` (nieuw, puur): blok maximaal 2 s, 0,35 s herstel, melee-schade
  ×0,20, kogels ongewijzigd; een nieuwe blokstand begint pas bij een nieuwe druk.
- `game/js/combat.js`: rechtermuisknop met een melee-wapen zet de blokstand; met een
  vuurwapen blijft rechts richten. `damagePlayer`/`hitPlayer` onderscheiden melee en kogel.
- `game/js/cooppvpwereld.js`: host en gast blokkeren via dezelfde weg; een opgevangen
  PvP-slag doet 20% onder de cap, met een korte stoot en metaalklank, zonder bloed.
  De gast houdt lokaal dezelfde 2 s/0,35 s-stand bij voor de terugkoppeling.
- `game/js/coopwapen.js`: dezelfde `KNOP_ZICHT` is kijker of blok; een oude blokstand
  wordt bij vertrek opgeruimd.
- `COOP-GAST.md` en de changelog bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `blockregels_test` 8/8, `coopwapen_test` 21/21, `cooppvp_test` 27/27,
  `gamefeel_test` 671/671, `wapenbezit_test` ok, `meleecombo_test` 6/6.
- `undef_check` 1731 modules, `import_check` 1883 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De gast leidde zijn blok-terugkoppeling alleen uit de ingedrukte knop af, dus na 2 s of
  tijdens het herstel kreeg hij nog een stoot/klank terwijl de host volle schade rekende.
  De gast houdt nu dezelfde blokstand bij via `blockregels.js`.
- Een oude blokstand bleef na het vertrek van een gast op zijn plek staan; nu opgeruimd.

## Niet getest

- Het gevecht in beeld: blokhouding, klank en terugslag zijn niet visueel gecontroleerd.
- Een gast die in een echte sessie blokkeert, en de situatie na 2 s/herstel op zijn scherm.
- De hint in de HUD voor blokkeren.

## Open / volgende

- Ontwijken/rollen is de volgende gevechtslaag; die valt buiten deze blok-unit.
