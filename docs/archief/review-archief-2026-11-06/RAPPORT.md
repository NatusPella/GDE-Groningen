# Codebase-review GDE Groningen — HEAD `9d63ab80` (main)

Datum: 6-11-2026. Scope: de hele code zoals die nu op `main` staat (geen diff-review).
Werkwijze: zes deelreviews door reviewers (kern/wereld, multiplayer, opslag/save, verhaal/missies,
UI/invoer/audio, desktop/tooling/CI) plus cross-cutting checks en verificatie door de Lead.
De zes deelrapporten staan in deze map; dit bestand is de samenvatting.

**Eerlijk vooraf:** dit is een risicogerichte steekproef, geen regel-voor-regel review. Van de
~930 modules in `game/js` (~230.000 regels) en ~1.250 scripts zijn er ~130 diep gelezen plus
gerichte greps. Er is niets runtime getest: geen Electron, geen spel, geen volledige suite, geen
netwerk, geen releasebouw. Zie "Dekking" onderaan.

## Samenvatting

**47 bevindingen: 1 Kritiek, 7 Hoog, 20 Midden, 19 Laag.**

| Gebied | Kritiek | Hoog | Midden | Laag | Totaal | Rapport |
|---|---|---|---|---|---|---|
| Kern, wereld, streaming | 1 | 1 | 2 | 3 | 7 | `kern-wereld.md` |
| Multiplayer, netwerk | – | 1 | 4 | 3 | 8 | `multiplayer-netwerk.md` |
| Opslag, save, staat | – | 2 | 3 | 4 | 9 | `opslag-save.md` |
| Verhaal, missies, minigames | – | 1 | 2 | 3 | 6 | `verhaal-missies.md` |
| UI, invoer, audio, a11y | – | 1 | 1 | 2 | 4 | `ui-invoer-audio.md` |
| Desktop, tooling, CI | – | 1 | 8 | 4 | 13 | `desktop-tooling-ci.md` |

Een andere reviewsessie heeft vandaag al **26 issues** op het bord gezet (#555–#580). Daarvan
dekken #555 (helikoptercrash) en #557 (laadscherm ~92%) twee van onze bevindingen; #578
(settings-downgrade) is dezelfde als een van onze Laag-punten. De overige **44 bevindingen zijn
nieuw** en nog geen issue. Onze reviewers hebben de bestaande issues tegen de code gelegd en niet
gedupliceerd; waar een bevinding een bestaand issue raakt staat dat erbij.

## Kritiek en Hoog (door de Lead in de code geverifieerd)

### [Kritiek] Laadscherm blijft op ~92% staan — Al gemeld: #557
- **Waar:** `game/js/main.js:557` (`await terrainReady()`), `game/js/geojobs.js:70-78` en
  `:135`/`:151-152` (`klaarQueue` alleen geleegd door `leegKlaar()` in `geoFrame()`),
  `game/js/scene3d.js:2497` (enige `geoFrame()`-aanroep, in `update3D`), `game/js/main.js:590`
  (startschermlus begint pas daarna).
- **Scenario/impact:** sinds `918243dc` gaan worker-resultaten via een wachtrij die pas in de
  spellus wordt geleegd, terwijl de boot op de terreinpromise wacht vóór die lus begint. De
  promise komt nooit, het laadscherm blijft op de 0,92-grens staan zonder fout of time-out.
  Elke normale start met de geometry-worker raakt dit; alleen `?noworker` of de terugval omzeilt het.
- **Fix:** een `flushGeoResults()` die de boot zelf aanroept (of `runGeo` met `{ direct: true }`
  voor jobs die vóór de spellus worden afgewacht), plus een time-out op `await terrainReady()`
  die `showLoadError` toont. De deterministische test (`scripts/loadstall_test.mjs`) dekt dit pad.

### [Hoog] Heli/vliegtuig besturen crasht: `figs.slice is not a function` — Al gemeld: #555
- **Waar:** `game/js/coopgast.js:217-219` (`bestuurInvoer`), aanroepers
  `game/js/heliflight.js:243` en `game/js/planeflight.js:155`; `world.coopFigures` is een object
  per slot (`game/js/coopclient.js:17`, `game/js/coopnet.js:236`, `:249`).
- **Scenario/impact:** `figs.slice(1)` op een object geeft direct een TypeError zodra de gastheer
  een heli of vliegtuig bestuurt. Sinds de sessie-van-één (#554) zet `prepareCoop` de figurenlijst
  al bij de start op `{}`, dus dit raakt nu ook Alleen spelen. Eén fout, twee aanroepers; alle
  andere lezers gebruiken `Object.values` of indexeren. Er is geen test op `bestuurInvoer`.
- **Fix:** `const figs = Object.values(world.coopFigures || {})` en filter op `f.slot >= 1`
  (of `[world.coopFigures[slot]]` als `coopWielSlot` gezet is); pure test toevoegen.

### [Hoog] Openbare sessielijst publiceert de kamercode → host-IP is voor iedereen te ontsleutelen
- **Waar:** `game/js/net/serverlijst.js:154` (kamercode in de onversleutelde aankondiging),
  `game/js/net/sigcrypto.js:35-40` (AES-sleutel = PBKDF2(kamercode)), `:60-63`
  (brokeronderwerp = SHA-256(kamercode)), `game/js/net/rtcroom.js:71-74` (SDP met ICE-kandidaten
  versleuteld met die sleutel op dat onderwerp), aankondiging in `game/js/lobbyui.js:281-284`
  en `game/js/sessionboot.js:213-215`.
- **Scenario/impact:** een willekeurige derde leest de vaste lijst, ziet de kamercode, leidt het
  onderwerp af, haalt het SDP-aanbod op en ontsleutelt dat met de kamercode. Daarin staan de
  ICE-kandidaten: het publieke en lokale IP van de host. Geen verbinding nodig, de host merkt
  niets. Dit is in strijd met constitutie 10 (IP alleen voor medespelers/goedgekeurde diensten)
  en met de eigen tekst "Je IP-adres staat er niet bij". #556 dekt alleen dat de startsessie
  standaard openbaar wordt, niet dit lek.
- **Fix:** publiceer geen sleutelmateriaal in de lijst (opaque sessie-id + aparte join-token die
  niet in de lijst staat), of maak de lijst voorbijganger-proof zonder de kamercode als
  decryptiesleutel te gebruiken.

### [Hoog] Electron: `shell.openExternal` krijgt elk URL uit de pagina; F12 opent DevTools ook in de release
- **Waar:** `desktop/main.js:155` (`setWindowOpenHandler`) en `:157` (`will-navigate`) geven elke
  niet-`app://game/`-URL 1-op-1 aan het OS; `desktop/main.js:168` zet F12/Ctrl+Shift+I buiten de
  `devtools`-vlag van regel 43.
- **Scenario/impact:** scriptuitvoering in de pagina (F12 in de packaged app is daar al een
  ingang) kan `file:`/`ms-msdt:`-achtige URL's naar de OS-shell sturen; de klassieke
  Electron-RCE-keten. Ook legitiem same-origin `window.open` (`game/js/testmenu.js:57`,
  `cutpreview.html`) belandt zo bij de OS-shell in plaats van in een nieuw venster.
- **Fix:** `new URL(url)` en alleen `http:`/`https:` (eventueel `mailto:`) doorgeven; `app://game/`
  in een eigen `BrowserWindow` openen; DevTools alleen achter een expliciete dev-vlag.

### [Hoog] Sluiten van venster/tab bewaart niet, en de autosave-signatuur mist geld
- **Waar:** `game/js/savegame.js:554-558` (alleen `visibilitychange`), geen enkele
  `pagehide`/`beforeunload`-save in `game/js`; `desktop/main.js:228` (`window-all-closed`) heeft
  geen close-interceptie; `game/js/savegame.js:377-387` (`stateSignature`), `game/js/cashvan.js:37`
  (€600–1100) en `game/js/muggings.js:141` veranderen alleen `w.money`.
- **Scenario/impact:** wie het venster met X/Alt+F4 sluit (of de tab) verliest alles sinds de
  laatste autosave; geld uit de geldwagen en teruggewonnen portemonnee staat niet in de
  signatuur en wordt dus zelden of nooit bewaard. Stil verlies, precies wat de
  save-afspraken willen voorkomen.
- **Fix:** `pagehide`-save (synchroon) zolang `game-started` staat plus `win.on('close')` op
  desktop, en `w.money` (of een financiën-ledger) in `stateSignature` of `markDirty()` in de
  geldpaden.

### [Hoog] Hangende tegel-fetch of dode tile-worker bevriest de wereld zonder time-out of terugval
- **Waar:** `game/js/tilestore.js:21-29` (`HttpRangeSource.read`, geen time-out),
  `:235-262` (`_load` wacht onbegrensd), `:365-392` (`makeWorkerDecoder`: `onerror` rejectert
  alleen open jobs, dode worker blijft in de pool), `game/js/tileworld.js:440`/`main.js:384`.
- **Scenario/impact:** een fetch die blijft hangen (webversie achter proxy, Electron-range zonder
  antwoord) laat `e.state` op `loading` staan; na vier zulke requests loopt de hele tegelwachtrij
  vast. Sterft een decode-worker, dan hangen alle volgende `decode`-promises. Gevolg: gaten in de
  wereld, laadscherm dat blijft wachten, `withTiles`-vensters die nooit openen, pins die nooit
  vrijkomen.
- **Fix:** `AbortController` + `setTimeout` per request, waiters rejecteren en als fout tellen;
  bij worker-`onerror` de pool vervangen of op de hoofdthread decoderen (zoals `geojobs.js:86-96`
  al doet); boot-time-out met `showLoadError`.

### [Hoog] Rebind-wachtstand lekt als je het pauzemenu met de railknop "Terug" sluit
- **Waar:** `game/js/pausemenu.js:1766` (`setOpen`), `:1071` (`input.captureKey`),
  `:1091` (`capturePadButton`), `:1101` (`cancelRebind`); annuleren gebeurt alleen bij Escape
  (`:841`) en tabwissel (`:1737`), niet in de sluit-tak.
- **Scenario/impact:** Pauze > Instellingen > Besturing > "Druk een toets…", daarna sluiten met
  de railknop Terug (of Afsluiten). De volgende toets/controllerknop in het spel wordt opgeslokt
  en voert stil `bindKey()` + `setSetting('keyBinds')` uit: een ongemerkte, bewaarde wijziging
  van de besturing.
- **Fix:** `cancelRebind(true)` als eerste regel van de sluit-tak van `setOpen` (en bij de
  prestart-close), inclusief `capturePadButton`-cancel.

## Nieuwe Midden-bevindingen (kort)

**Kern/wereld:** `geojobs.fail()` (geojobs.js:86-96) gooit wachtende jobs weg zonder hun `done`
te bellen → na workeruitval ontbreken straatmeubels en wateroevers zonder retry;
`freeRoadGeometry` (scene3d.js:2001-2004) dispost `_geoStruct`/`_geoOverDeck` van geëvacueerde
verhoogde wegen niet → GPU-lek op een lange rit (roadstructures3d.js:89-108).

**Multiplayer:** kicken is niet blijvend (geen verbod, `_release` laat `link.onmessage` staan en
sluit niet; coopnet.js:1545-1574, net/session.js:148-152); de lijst is niet authentiek (CRC16 is
geen MAC, vaste wereldwijde topics; serverlijst.js:145,189-207); geen berichtgroottegrens vóór
`JSON.parse`/`TextDecoder`/decryptie (brokers.js, sigcrypto.js:51-56) → remote geheugen/CPU-DoS;
transports (WebRTC/IPC) worden bij einde sessie, vertrek of kick nooit gesloten.

**Opslag/save:** een mislukte autosave wordt niet opnieuw geprobeerd (savegame.js:589/606; andere
oorzaak dan #563); de boot valt stil terug op de herstelkopie zonder melding (saveslots.js:87 →
startscreen.js:437); `gde-save-backup-nieuw` wordt alleen geschreven en nooit gelezen, `gte-save-backup`
blijft orphan (savegame.js:43/116, oudmigratie.js:50).

**Verhaal/missies:** een mislukte gast-opdrachtstart laat de keten van de gastheer op de opdracht
van de gast staan (missions.js:672-688: `eigenIndex` wordt niet hersteld als `startMission` niet
actief wordt); een chase-stage heeft één spawnpoging en faalt meteen bij een `null`-spawn
(missions.js:2627-2630/2373-2377/3510-3515).

**UI/a11y:** "Flitsen beperken" dekt de witte schermflits van de 3D-postprocessing niet
(postfx3d.js:151; trailer.js:257, dorpsuitjes.js:597, storyfun.js:286; `effectsFor(...).screenFlash`
wordt nooit met `reduceFlash` aangeroepen) — de instelling doet op postfx-machines niet wat ze belooft.

**Desktop/CI:** testrunner eindigt met exitcode 0 als er niets gedraaid is (test_all.mjs:335-340/573,
ander mechanisme dan #570); CI mist de wereldvelden-keuring `world_eigenaar` die de lichte fase wel
draait (run_tests.mjs:107-124 vs test_all.mjs:149); de geheimenscan over de geschiedenis is in CI
vrijwel leeg door de shallow checkout (.github/workflows/test.yml:28 + secrets_scan.mjs:63-65);
de pre-commit-haak scant de werkboom en niet de index (scripts/hooks/pre-commit:12,
secrets_scan.mjs:98-108) → staged geheim kan passeren; `build.mjs:165` wist bij `GDE_STAGE_OUT`
de hele meegegeven map recursief (typo = dataverlies buiten de repo); de offline-controle van de
stage waarschuwt alleen en faalt nooit (build.mjs:248-255); vendored three.js/fonts worden zonder
hash/integriteitscontrole binnengehaald (build.mjs:36-45,177-215).

## Nieuwe Laag-bevindingen (kort)

Kern: per-frame allocaties op hete streamingpaden (scene3d.js:2721/2172/2011, worldmarker3d.js:208,
geojobs.js:172); `TileStore.cancel`/`tokenPrefix` is dood (tilestore.js:189-198/324); lege `if` en
blijvende vlakke stukken in `elevation.js:158/186-212`.
Multiplayer: `HostSession.rejected` groeit onbegrensd; de gast bepaalt zelf zijn wapens en `n:-1`
betekent oneindig (coopwapen.js:45-51); betrouwbare events worden stil weggegooid bij een volle
wachtrij (protocol.js:52-58).
Opslag: dode 45s-thumbnail-throttle (savegame.js:265); een settings-bestand van een nieuwere versie
wordt stil teruggezet (settings.js:140/175/205 — dit is #578); eenmalige gte→gde-migratie negeert
latere wijzigingen (storagekeys.js:143); boerderij/hengeltuig overschrijven bij twee tabs
(boerderijlive.js:39, hengeltuiglive.js:23).
Verhaal: falen binnen ~6 m van de start laat het Opnieuw-aanbod vervallen (missions.js:1273/2020);
lazyStart zonder wegdata laat een stilstaande speler nooit starten (missions.js:1695-1703);
O-skip in de inbraak betaalt de volle beloning terwijl story-skip 50% betaalt (missions.js:3365-3372).
UI: ongevalideerde `avatar.kleur` uit het welkomstbericht in een `style`-attribuut
(coopnet.js:1054, coopspelersui.js:32) → CSS-injectie/extern verzoek door een kwaadwillende host;
per G-Music-revive lekt een `MediaElementAudioSourceNode` (radio.js:167-179/327-340).
Desktop: `app://`-padcontrole met stringprefix i.p.v. mapprens (main.js:73-74); `.cjs` buiten de
syntaxcontrole (run_tests.mjs:95, test_all.mjs:133); "eigenaar speelt"-detectie herkent
`GDE Groningen.exe` niet en is uit met een lockmap (test_all.mjs:289-300/335-337);
`--clip-repl` regex `${d}` i.p.v. `\d` (clipvideo.js:87).

## Cross-cutting checks (Lead)

- **Constitutie 1/2/3:** `node scripts/text_audit.mjs` → **0 bevindingen** (141 toegestane gevallen,
  elk met reden); `node scripts/merkenregister_check.mjs` → 45 rijen, 0 afwijkingen. Geen sneeuw/
  winter, geen "de Grunn", geen echte merken/personen in speltekst gevonden. De webversie haalt
  three.js en Google Fonts bij externe CDN's (staat als bronvermelding in de credits; desktop is
  gevendord). Dit is gedocumenteerd in docs/MERKENREGISTER.md §4, geen nieuwe afwijking.
- **Constitutie 5 (geheimen):** geen `.env` in git, geen sleutelpatronen in de werkboom
  (`git grep` op `sk-…`, private keys, `AIza…`). `scripts/secrets_scan.mjs` kon lokaal niet
  draaien (de sandbox blokkeert `child_process` met pipes — sandboxbeperking, geen repo-bug);
  in CI draait hij wel, maar zie de shallow-checkout-bevinding hierboven.
- **Specs:** `node scripts/spec_check.mjs` → 78 verwijzingen en 22 tellers, 0 fouten.
- **Syntax:** `node --check` over alle 2.111 getrackte `.js/.mjs/.cjs`: 2.001 schoon; de 110
  "fouten" zijn `.page.js`/scène-scripts die in de browser/Electron-pagina draaien en daar
  top-level `await` gebruiken — geen Node-modules, dus geen syntaxfouten in Node-geladen code.
- **Regressietests:** `scripts/loadstall_test.mjs` 29/29; `scripts/gfx_profile_test.mjs` groen
  (de fout uit #576 is op huidige main hersteld doordat de aggressieve zichtafstand in `ec5bbaec`
  is teruggedraaid).
- **Release-staat (Lead):** `desktop/package.json` staat op 0.57.0 en `## [0.57.0]` bestaat.
  **Maar:** in `CHANGELOG.md` zijn 13 regels beschadigd door commit `f2631d5f` ("Changelog: nieuwe
  regels echt als newline"): een vervanging van de tekenreeks `` `n `` door een echte newline heeft
  overal `` `node `` in "ode" veranderd (bijv. `ode scripts/spec_check.mjs`), en één `` `null ``
  werd `ull`. Ook is de `## [0.56.2]`-sectie verdwenen terwijl tag `v0.56.2` bestaat en de hotfix
  beschrijft; een lezer van 0.57.0 ziet de terugdraai niet meer. Repareer dit vóór de release
  (valt onder #572). De 0.57.0-sectie zelf is schoon.
- **Belangrijk om te weten:** de schadelijke 0.56.1-prestatiewijzigingen (wegen-idle-guard,
  matrixbevriezing) zijn op main teruggedraaid in `7a50f149`; `syncRoads` heeft nu geen idle-guard
  meer en de loadstall-test is groen. Er staat dus geen bekende laadhang meer in de release.

## Dekking en wat niet is bekeken

Wel: ~130 bestanden diep gelezen (per gebied in de deelrapporten), gerichte greps over de rest,
de bovenstaande checks, en de zwaarste punten door de Lead in de code nagelopen.

Niet: `models3d_*` op geheugen/dispose; grote delen van `scene3d.js` (camera, shaders, schaduw,
prewarm); de algoritmen in `roadsurface.js`; `provinceworld.js`, `grass.js`, `farprops.js`,
`railway3d.js`; de gevraagde steekproef van complexe minigames (`padel`, `arcadeplane`, `regatta`,
`pg_*`); `shops.js` (114k) en grote delen van `hud_panel.js`, `mapview.js`, `audio.js`;
de `web/`- en `android/`-schillen (alleen greps); `package-lock`/dependabot-PR's; de meeste tests;
de MP-delen van pauzemenu/startscreen; en niets runtime (Electron, spel, netwerk, release).
Ook niet: de directe IP-route in `desktop/coopcore.cjs` (TCP/UPnP) end-to-end.

## Advies (prioriteit volgens AGENTS.md: bugs eerst)

1. **#555** — crash bij vliegen, één lezer fixen + pure test (klein, groot effect).
2. **#557** — laadscherm-blokkade; flush van de geo-wachtrij vóór de boot + time-out.
3. **Save-cluster** — pagehide/close-save, geld in de signatuur, #562–#569; anders verlies je
   voortgang van spelers.
4. **#556 + nieuw IP-lek** — openbare lijst standaard privé en geen sleutelmateriaal publiceren
   (constitutie 10).
5. **Electron** — scheme-allowlist voor `shell.openExternal`, DevTools alleen in dev.
6. **Releasepoort** — #570/#576 plus de nieuwe exit-0-bij-niets-gedraaid en shallow-scan; en
   CHANGELOG repareren vóór 0.57.0.
7. Daarna de Midden/Laag-punten per gebiedsrapport.

De 44 nieuwe bevindingen zijn nog geen GitHub-issue. Zeg het als je wilt dat ik ze (per gebied,
met de juiste labels en de Samen-spelen-regel waar relevant) op het bord zet.
