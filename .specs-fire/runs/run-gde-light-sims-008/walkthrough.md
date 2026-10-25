# Walkthrough — wi-492-melee-combo (#492)

## Wat er is gedaan

- `game/js/meleecombo.js` (nieuw, puur) legt de reeks vast: 1e slag ×1,00, 2e binnen 0,8 s
  ×1,15, 3e ×1,40 met +0,20 knock; een misser of het venster zet de reeks terug. Geen
  DOM, THREE, klok, opslag of random.
- `game/js/combat.js` houdt de stand per aanvaller én per wapen bij in een `Map` op de
  wereld en past de factor toe in `meleeHit`: voetgangers, auto's en PvP. De gast komt
  via dezelfde `meleeHit`, dus hij krijgt dezelfde reeks; geluid, effect en camera-schok
  houden de originele waarden. Geen bloed toegevoegd.
- `scripts/meleecombo_test.mjs` (nieuw) en één extra geval in `scripts/coopwapen_test.mjs`.

## Checks

- `node --check` op alle gewijzigde JS.
- `meleecombo_test` 6/6, `coopwapen_test` 20/20, `cooppvp_test` 20/20,
  `wapenbezit_test` ok, `gamefeel_test` 671/671.
- `undef_check` 1715 modules, `import_check` 1867 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De changelogregel ontbrak; toegevoegd onder `[Unreleased]`.
- De reeks hing alleen aan de aanvaller, waardoor een wapenwissel binnen het venster de
  zwaarste factor gaf; de stand hangt nu ook aan het wapen.
- Nits die bewust blijven: de polsstok (cooldown 1,3 s) kan door het venster van 0,8 s
  nooit een reeks maken; een vertrekkende gast laat zijn stand op zijn plek staan (de
  volgende speler op die plek erft hem alleen in theorie).

## Niet getest

- De host-aanval end-to-end (`updateCombat`/`meleeAttack`): de pure reeks en het gastpad
  zijn getest, de hostlus niet.
- Een reeks over de landing van een wapen met windup (knuppel/polsstok) heen.
- Het spelgevoel in beeld: geen Electron of echte speelsessie; 0,8 s tegen de cooldowns is
  niet met de hand gevoeld.

## Open / volgende

- Blokkeren en ontwijken zijn de volgende gevechtslaag; die raken `controls.js`,
  `input.js` en `combat.js` en komen als eigen unit.
