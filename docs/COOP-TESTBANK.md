# Coöp-testbank (#95)

Twee of drie echte Electron-instanties die op `127.0.0.1` met elkaar verbinden, plus pure tests zonder Electron.

## Zonder Electron (altijd draaien vóór een merge)

`node scripts/coopnet_test.mjs`, `net_hub_test`, `net_codec_test`, `net_protocol_test`, `net_hostmodel_test`, `net_rtcroom_test`, `net_loopback_test`, `lobbyui_consent_test`, `coopsave_test`, `cooproles_test`, `coopactivities_test` en `net_speelklok_test`.

Wat de pure laag dekt:

- **Gedeelde speelklok** (`game/js/net/speelklok.js`): de host meldt om de 2 s de tijd van de dag (`world.clock`); een gast volgt die zacht (geen schok in de zon) en snapt bij een sprong (slapen, nieuwe dag).
- **Desync-hash** (`game/js/net/desync.js`): de host meldt om de 5 s een hash van de gedeelde toestand (verhaalstap, missiestap en -toestand, wanted, spelersplekken, tegelhash). Een gast die drie meldingen achter elkaar iets anders ziet, vraagt de host om zijn toestand opnieuw (`requestResync`) en zet zijn wanted gelijk. `world.coopDesync` toont de afwijkende velden.
- **Drie of meer spelers**, **touch-client** (analoge stick via `padAxis`, sprint) en **wegvallen met pauze** staan in `coopnet_test`.

## Met Electron: `scripts/coop/testbank.mjs`

```
node scripts/coop/restage.mjs --base=<desktop/build/game van een volledige stage> --out=<map>
node scripts/coop/testbank.mjs --stage=<map> [--gasten=1|2] [--duration=20]
```

- Neemt Electron-sloten uit de slotenmap (`$GDE_LOCKS`, standaard `~/gde-locks`) (maximaal 3 totaal; `--gasten=2` neemt ze alle drie).
- `GDE_COOP_TEST=1`: geen UPnP, lokaal adres `127.0.0.1`. Wegwerpprofielen, poort 9000 blijft ongemoeid.
- Route `direct` (TCP op de loopback). De route met kamercode (WebRTC en openbare brokers) vraagt een lokale mock van STUN en tracker en is in de testbank nog niet bedraad; de pure tests (`net_rtcroom_test`, `net_loopback_test`) dekken de signalering wel.
- `--menu`: begint bij het hoofdmenu (ingang "Samen spelen", `GDE_MENU_TEST=1` laat de testharnas het menu met rust) en laat host en gast door de lobby verbinden zoals een speler. Geslaagd op 2026-10-19 met twee Electron-instanties (`ALLES OK`).
- Beoordeelt: toestemmingsscherm, beide kanten "Je speelt samen", Tammo/Tessa, posities, speelklok binnen 0,3 uur, geen desync, bij `--gasten=2` ook de derde speler op plek 2.

## Niet getest

Echte WebRTC-verbindingen, echte NAT/UPnP, openbare brokers en STUN, twee echte computers, een telefoon met aanraakbediening. `--menu --gasten=2` (host plus twee gasten, drie Electron-instanties, derde speler op plek 2) is op 2026-10-19 geslaagd.
