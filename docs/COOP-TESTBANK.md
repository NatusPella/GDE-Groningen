# Coöp-testbank (#95)

Echte Electron-instanties die op `127.0.0.1` met elkaar verbinden, een headless gast voor de vierde speler, en pure tests zonder Electron.

## Zonder Electron (altijd draaien vóór een merge)

`node scripts/coopnet_test.mjs`, `coop_scenarios_test`, `coop_tcp_test`, `coopcore_test`, `net_hub_test`, `net_codec_test`, `net_protocol_test`, `net_hostmodel_test`, `net_rtcroom_test`, `net_loopback_test`, `lobbyui_consent_test`, `coopsave_test`, `cooproles_test`, `coopactivities_test`, `coopworld_test` en `net_speelklok_test`.

- **`coop_scenarios_test`**: dezelfde koppeling als in het spel (host, hub, gasten) over een in-memory transport met vertraging, jitter en verlies. Vier spelers met 120 ms en 10% verlies, 35% verlies met 300 ms, wegvallen en terugkomen met hetzelfde token, een gast die met een nieuwe verbinding terugkomt, de plek vrijgeven na 120 s, een gast weg en een nieuwe erbij, de host stopt, een afwijking (desync) die hersteld wordt, de klok over middernacht, het maximum.
- **`coop_tcp_test`**: host en vier headless gasten (`scripts/coop/mockclient.mjs`) over echte TCP op de loopback met `desktop/coopcore.cjs`, met netwerksimulatie: koppelcode, vier spelers, de vijfde wordt geweigerd, kabel eruit en terug, een nieuwe gast neemt een vrije plek, de host stopt.
- **Gedeelde speelklok** (`game/js/net/speelklok.js`): de host meldt om de 2 s de tijd van de dag; een gast volgt die zacht en snapt bij een sprong.
- **Desync-hash** (`game/js/net/desync.js`): de host meldt om de 5 s een hash van de gedeelde toestand; na drie afwijkingen vraagt een gast een hersync.

## Met Electron: `scripts/coop/testbank.mjs`

```
node scripts/coop/restage.mjs --base=<desktop/build/game van een volledige stage> --out=<map>
ELECTRON_EXE=<electron.exe> node scripts/coop/testbank.mjs --stage=<map> --suite=<naam> [--out=<map>]
```

Een worktree heeft geen `node_modules`: wijs `ELECTRON_EXE` naar de Electron van de hoofdmap. Neemt Electron-sloten uit de slotenmap (`$GDE_LOCKS`, standaard `~/gde-locks`) (maximaal 3 totaal, elke 10 s opnieuw proberen, altijd vrijgeven), draait op BelowNormal, met wegwerpprofielen en `GDE_COOP_TEST=1` (geen UPnP, adres `127.0.0.1`). Poort 9000 en de geïnstalleerde app blijven ongemoeid. Per instantie komt een map met `events.jsonl` (elke seconde een `sample`, plus fasen en uitkomsten), `run.log` en `shots-*.png`.

| suite | wat | Electron |
|---|---|---|
| `basis` | hoofdmenu, lobby, toestemming, verbinden, lijst, klok, desync (`--menu`, `--gasten=1\|2`, `--duration`) | 2 of 3 |
| `net` | vier spelers (host, een Electron-gast met aanraakbediening, twee headless gasten met 80 ms en 5% verlies; `--gasten=2` neemt een tweede Electron-gast, `--gasten=0` alleen de host met drie headless gasten): slecht netwerk op een gast, desync inbrengen en herstel, Tessa loopt, aanraakbediening, kabel eruit en terug met pauzescherm aan beide kanten, de verbinding sluiten en opnieuw verbinden via het wachtscherm, de host betaalt een gast (eigen save), een ritje met Tessa als passagier, een filmpje, een gast verlaat het spel via het menu en een nieuwe gast neemt de plek, de host stopt via het menu | 1 tot 3 |
| `kamer` | de kamercode-route: WebRTC op de loopback met een lokale nep-tracker (`faketracker.mjs`, zonder STUN); controleert dat de tracker geen IP-adres en geen kamercode ziet | 2 |
| `verhaal` | de Spelbot speelt als host het verhaal (`--until=T1`: M01 t/m M08, `--speed=4` om het te versnellen), de gasten lopen achter Tammo aan; controleert opdrachtmeldingen, desync, klok (`--gasten=0 --mock=1`: alleen de host in Electron, een headless Tessa) | 1 tot 3 |
| `gastkant` (`scripts/coop/gastkant.mjs`) | de kant van de gast met één Electron-instantie en een gescripte host in Node (`nodehost.mjs`, dezelfde koppeling op een nep-wereld): toestemming, voertuigen, voetgangers en doel bij de gast, een opdracht, een filmpje, een keuze en een pauze van de gastheer (de laag bij de gast), wanted, een rit met Tessa als passagier, betalen, desync, aanraakbediening, opnieuw verbinden via het wachtscherm, verlaten en opnieuw aansluiten, de host stopt | 1 |
| `touch` | de gast met `--url-flags=touch=1`: de aanraakstick stuurt Tessa (half, vol, los) | 2 |

Wat elke run beoordeelt (de `PROBLEMEN`-lijst van de testbank): alle instanties `KLAAR`; vóór "Akkoord" en tijdens het wachten geen enkele `WebSocket`, `RTCPeerConnection` of `fetch` naar buiten (de pagina telt ze zelf); op de IP-route daarna ook niet (het verkeer loopt via TCP in het main-proces); op de kamercode-route alleen `ws://127.0.0.1`; iedereen ziet alle medespelers; speelklok binnen 0,3 uur; geen desync buiten de ingebrachte; geen `jserror` of consolefout.

Programma's staan in `testbank.mjs` (`P`), fasen in `coop.page.js` (`PHASES`): `wacht`, `netsim`, `uitval`, `uitvalHost`, `desync`, `betaal`, `loop`, `touch`, `rit`, `verlaat`, `stopHost`, `opgeslagen`, `verhaal`, `volg`. Een nieuwe fase is een functie die `log(...)` regels schrijft en een controle in de suite.

## Niet getest

Twee echte computers, NAT en UPnP, echte openbare brokers en STUN, een echte telefoon met een vinger op het scherm (de aanraakstick wordt met synthetische pointer-events bediend). Zie de comment op #95 voor de stand per scenario.
