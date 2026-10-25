# #492 Melee-reeks: combo's met maat en gewicht

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

Het vechten krijgt de eerste GTA IV-laag: een melee-reeks in plaats van losse slagen.

- Nieuwe pure regelmodule `game/js/meleecombo.js` zonder DOM, THREE, klok of opslag.
- Een reeks telt alleen als de volgende slag binnen 0,8 s na een **geraakte** slag landt:
  1e slag ×1,00, 2e ×1,15, 3e ×1,40 met +0,20 knock. Daarna begint de reeks opnieuw.
- Een misser of 0,8 s zonder treffer zet de reeks terug op ×1,00.
- De reeks geldt per aanvaller: de host en elke gast hebben hun eigen stand; geen
  module-globale stand die spelers door elkaar haalt.
- De gast aanvallen via `gastAanvalUitvoeren`/`gastSlagLanding` gebruiken dezelfde
  reeks, omdat ze door dezelfde `meleeHit` gaan.
- Geen bloed of gore toevoegen; de bestaande constitutieregel blijft.
- Nieuwe test `scripts/meleecombo_test.mjs` (opbouw, venster, misser, reset, twee
  aanvallers onafhankelijk, onbekende/rare tijd). Eén extra geval in
  `scripts/coopwapen_test.mjs` dat de gast dezelfde factor krijgt.
- `node --check`, `meleecombo_test`, `coopwapen_test`, `cooppvp_test`,
  `wapenbezit_test`, `gamefeel_test`, `undef_check`, `import_check`,
  `import_cycles_test` en `text_audit` groen.

## Samen spelen

J (de wereld rekent de slag uit). De host en een gast gebruiken dezelfde pure reeks,
maar met een eigen stand per aanvaller. De gast ziet geen camera-schok (bestaand
gedrag). Geen wijziging aan het netwerkprotocol, geen nieuwe beloning en geen
gedeelde kas. De test bewijst dat twee aanvallers elkaars reeks niet beïnvloeden.

## Niet

Geen blokkeren/ontwijken (volgende unit), geen PvP-herbalans, geen nieuwe wapens,
geen bloed, geen wijziging aan `weapons.js` of de wapenshop.
