# Testgaten na #799: wat nu gedragstests heeft en wat een gedocumenteerd gat blijft

Uit de afsluitende review van de bugronde #748-#796. Deze ronde voegt echte gedragstests toe waar
dat zonder browser, broker of Electron kan; de rest staat hieronder met de reden en de plek waar
zo'n test hoort. Niets hiervan verzwakt een bestaande test.

## Nu gedekt met gedrag (nieuw of uitgebreid)

| Gat | Test | Wat hij bewijst |
|---|---|---|
| ByteSource antwoordt nooit tijdens de boot | `scripts/tilestore_timeout_test.mjs` (11/11) | Tijdens de boot (body zonder `game-started`) verdubbelt de HTTP-grens: een fetch die nooit antwoordt valt af na `BOOT_HTTP_FACTOR * timeoutMs`, niet eeuwig; na de start geldt de gewone grens weer. |
| boot → vraagKamer(hostKey) → kamer → welkom | `scripts/sessionboot_test.mjs` (20/20) | De hele keten met een echte host en gast over `net/memtransport.js`: `bootSession` kiest meedoen, `vraagKamer` krijgt de `hostKey` uit de lijst, de kamerroute levert het transport, en het welkom van de host zet de gast in de echte hub. |
| Wachter op het welkom | `scripts/sessionboot_test.mjs` | Zonder welkom stopt `openSession` na `BOOT.verbindWacht` met `'geen antwoord'`, laat de wereld van de gast heel en ruimt de sessie op (geen halve verbinding). |
| Cancel-herlaad (#769) | `scripts/streaming_gaps_test.mjs` (4/4) | Een afgebroken load laat geen `cancelled`-entry achter; een nieuwe `request()` op dezelfde tegel maakt een verse entry en laadt hem. |
| LOS-budget (#785) | `scripts/streaming_gaps_test.mjs` | Het budget staat 3 aanvragen per 100 ms toe, weigert de vierde, en geeft in een nieuw venster weer ruimte: een uitgeput budget kost alleen de lijncontrole. |
| Hysterese (#792) | `scripts/streaming_gaps_test.mjs` | `shadowUpgradeAllowed`: omhoog pas na 120 s vraag, omlaag/gelijk altijd. |
| releaseRoadSource/dropRoad (#762) | `scripts/streaming_gaps_test.mjs` | Een sparse wegenlaag geeft `_roadsLive` vrij (en de vlag uit); een dichte wereld houdt de map-array voor `home.js`' `dropRoad`, dat de weg uit de lijst haalt. |
| Ontbrekend pack (#763) | bestaand `scripts/tilestore_test.mjs` | Al gedekt: één waarschuwing, `brokenPacks`, geen unhandled rejection. |

## Gedocumenteerde gaten (en waarom geen gedragstest hier)

| Gat | Reden | Waar de test hoort |
|---|---|---|
| 20 s-consenttimer bij de eerste start (#751) | `waitForOnlineStart` is een lokale functie in `game/js/main.js` met DOM, `keydown`, `document.hidden` en `onlineconsentui.js`; een gedragstest vereist een DOM met neptimers en de consent-UI, of een echte start. De bronchecks staan in `scripts/startroute_test.mjs`; de timer is daar bewust niet nagebootst. | Electron-smoke/verhaaltest: start zonder klik, wacht 20 s, controleer dat de vraag sluit zonder voorkeur en het spel alleen verdergaat. |
| Boot-wachter: fout + herlaadknop (#749) | `armBootWatchdog`/`showBootFailure` zitten in `main.js` en hangen aan 180 s zichtbare tijd, `visibilitychange`, `showLoadError` en `location.reload`; een unit-test zou de klok en DOM moeten vervangen en de echte boot overslaan. Bronchecks (ladder, `clearBootError`, `#boot-reload`) staan in `startroute_test.mjs`. | Electron-verhaaltest met een kunstmatig hangende tegelbron: na de grens moet de foutregel en `#boot-reload` zichtbaar zijn, en een late start moet ze opruimen. |
| nearR-index in `resolveDeadlocks` (#791) | `resolveDeadlocks` is een interne functie in `game/js/vehicle/traffic.js` die op een volledige voertuig-/kruispuntstaat werkt; de index-query en de randstrook zijn alleen in een rijdende simulatie te raken. `scripts/perfscan_test.mjs` controleert de query (geen volledige scan, `nearR`-straal). | Uitbreiding van `junction_sim_test.mjs`/`hamlet_traffic_test.mjs` met twee tegenliggers op 28,6-30 m en een remove/add van een voertuig. |
| Flood-grens #778 bewijst geen echte gasten | De poort (`GATE_MAX_OFFERS`, `GATE_OFFER_MS`, `gateBusy`) zit in de hostlevensduur van `game/js/lobbyui.js` en vraagt echte signaling-sockets, een openbare aankondiging en meerdere gelijktijdige join-verzoeken; de bestaande lobbytests dekken de lijst en toestemming, niet deze levensduur. De regel zelf staat in `docs/COOP-GAST.md`. | `lobbyui_serverlijst_test.mjs` uitbreiden met een host die openbaar staat en tien join-verzoeken laat lopen: daarna moeten echte gasten (binnen de 4 slots) nog steeds een kamer krijgen en de rest moet zonder antwoord wachten. |
| Ommeland-deuren en koude-schijf-ladder in de release-run (#750) | Het gedrag (deuren binnen enkele seconden na `game-started`, read+decode-bootgrens < `MAP_LOAD_MS` < boot-wachter) is een echte start met een koude schijf; dat kan alleen de Electron-verhaaltest meten. De ladder zelf is bron-vast in `scripts/startroute_test.mjs` en `scripts/tilestore_timeout_test.mjs`. | `desktop`-verhaaltest: na `game-started` binnen N seconden de garage/café/winkel-deuren aanwezig; en een koude run die binnen de ladder blijft. |

## CI-robustheid: Windows-CRLF

- `.gitattributes` heeft nu `*.md text eol=lf` (naast de bestaande `*.js`, `*.mjs`, `*.sh`-regels).
- `scripts/lineendings_test.mjs` bewaakt de regel en vraagt `git check-attr eol` na voor markdown,
  JS en mjs.
- `scripts/hudbus_inventory.mjs --check` vergelijkt nu op regeleinden-genormaliseerde tekst, zodat
  een bestaande checkout die al CRLF op schijf heeft niet rood wordt terwijl de inhoud klopt. De
  inhoudsvergelijking zelf blijft streng.

## Bewust niet gedaan

- Geen echte broker, RTC-verbinding, browser of Electron gestart: alle nieuwe tests gebruiken
  in-memory transporten, nepfetch of pure regels, en raken de echte opslag van de speler niet aan.
- De bestaande tests zijn niet aangepast behalve waar een nieuwe test in hetzelfde bestand hoort
  (`sessionboot_test`, `tilestore_timeout_test`); geen bestaande controle is verwijderd of
  versoepeld.
