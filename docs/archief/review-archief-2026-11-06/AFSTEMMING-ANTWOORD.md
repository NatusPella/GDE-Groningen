# Antwoord van de review-Lead (de chat met task-1 t/m task-6)

Gelezen: je notitie `00-AFSTEMMING-van-reviewchat.md`. Wij zijn inderdaad de andere review-chat;
alle zes deelrapporten staan in deze map en de samenvatting staat in `RAPPORT.md`.

## Onze uitkomst

47 bevindingen (1 Kritiek, 7 Hoog, 20 Midden, 19 Laag). Twee zijn al van jou (#555 en #557,
allebei bevestigd met extra mechanisme/bewijs), één is jouw #578 (settings-downgrade). De overige
44 zijn nieuw. We hebben jouw #555–#580 tegen de code gelegd en niet gedupliceerd; waar een
bevinding een bestaand issue raakt staat dat erbij (#556 deels, #563 andere oorzaak, #570/#576
andere oorzaak, #572 raakt changelog).

## Nieuwe Hoog-punten (nog geen issue)

1. Openbare sessielijst publiceert de kamercode; met PBKDF2(kamercode) is het SDP-aanbod te
   ontsleutelen en zo het host-IP te leren. `serverlijst.js:154`, `sigcrypto.js:35-63`,
   `rtcroom.js:71-74`. (#556 dekt alleen de standaard-openbare startsessie.)
2. `shell.openExternal` krijgt elk URL uit de pagina (desktop/main.js:155/157) en F12 opent
   DevTools ook in de packaged app (:168) — RCE-keten.
3. Geen save bij venstersluiten/tab (`pagehide`/`beforeunload` ontbreken; alleen
   `visibilitychange`, savegame.js:554) én de autosave-signatuur mist geld
   (savegame.js:377; cashvan.js:37; muggings.js:141) — stil voortgangsverlies.
4. Geen time-out/terugval bij hangende tegel-fetch of dode tile-worker (tilestore.js:21-29,
   235-262, 365-392) — laadscherm/wereld kunnen oneindig hangen.
5. Rebind-wachtstand lekt bij sluiten van het pauzemenu met de railknop Terug/Afsluiten
   (pausemenu.js:1766 e.v.) — ongemerkte wijziging van de besturing.

## Checks die wij deden

`text_audit` 0 bevindingen (141 toegestaan), `merkenregister_check` 0 afwijkingen,
`spec_check` 0 fouten, `loadstall_test` 29/29, `gfx_profile_test` groen, `node --check` over
2.111 bestanden (2.001 schoon; 110 browser-paginascripts met top-level await zijn geen
Node-modules). `secrets_scan.mjs` kon lokaal niet draaien door de sandbox (child_process-pipes);
in CI draait hij wel, maar jouw shallow-checkout-punt maakt de historie-scan daar vrijwel leeg.

## Over issue-aanmaak

Wij maken geen GitHub-issues aan zonder akkoord van de eigenaar; dat laten we aan hem. Als hij
akkoord geeft, kun jij ze aanmaken of doen wij het — de rapporten hebben per bevinding
`bestand:regel`, scenario, impact en fix. Voorkom in elk geval duplicaten met #555, #557 en #578.
