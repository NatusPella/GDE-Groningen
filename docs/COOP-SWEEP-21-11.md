# Samen spelen: draaiboek voor de sweep (21-11)

> Hoort bij [COOP-DEKKING-21-11.md](COOP-DEKKING-21-11.md) (de matrix) en [COOP-TESTBANK.md](COOP-TESTBANK.md) (de suites). Dit document zegt wat de coördinator aan het eind van de ronde in één grote sweep draait, met hoeveel instanties en hoe lang. In de ronde zelf is **geen Electron** gedraaid: de suite `alles` en de stappen hieronder zijn geschreven maar niet in een echt venster gezien (nog niet bekeken).

## Volgorde

1. **Eerst zonder Electron** (kost minuten, mag altijd):
   - `node scripts/coop_coverage_audit.mjs` en `node scripts/player_singleton_audit.mjs` (blokkerend, ook in `test_all --fase=licht` en de releasegate static).
   - `node scripts/coop/all_systems_test.mjs`: de pure tegenhanger van de suite `alles` (host en twee gasten over een geheugentransport: spelerslijst, kaartping, beloning per speler, geld per speler, bijbaan- en minigame-status; kleding en Bezit worden overgeslagen tot de epics gemerged zijn). Ongeveer 2 s.
   - `node scripts/coop_licht_test.mjs` (alle pure coöp-tests onder `scripts/coop/`, waaronder `hostwissel_test.mjs`, `viersp_hostwissel_test.mjs` en `all_systems_test.mjs`) en de `coop*_test.mjs` in `scripts/`.
2. **Dan met Electron**, in de volgorde hieronder. Eén instantie-set tegelijk (sloten via `GDE_LOCKS`, maximaal drie Electron-instanties tegelijk; vier alleen met akkoord van de eigenaar). Geen nieuwe agents tijdens de sweep en geen fps-meting ernaast.

```
node scripts/coop/restage.mjs --base=<desktop/build/game van een volledige stage> --out=<map>
ELECTRON_EXE=<electron.exe> node scripts/coop/testbank.mjs --stage=<map> --suite=<naam> --out=<map>
```

## De suites

| Stap | Suite | Instanties | Duur | Wat het dekt |
|---|---|---|---|---|
| 1 | `alles` | 3 (host en twee gasten, route direct) | ca. 4 min plus opstart (programma van 190 s) | De rooktest voor de hele game: kaartping (9) van een gast bij host en gast 2; waypoint blijft per speler; outfit-code in de spelerslijst (epic Kleding, anders gelogd als wacht); tuning in het bezorg-bericht (wacht op #1158); Bezit-claim (epic Bezit, anders wacht); winkel en geld per speler (`gastwinkel`); bijbaan door een gast met Meedoen? en beloning per speler (`gastbijbaan`); cutscene-deelname (`filmpje`); opslag zonder IP of directe code (`opslagcheck`) |
| 2 | `gastacties` | 2 of 3 | ca. 4 min | Winkelen en een rit door een gast (#291) |
| 3 | `bijbaan` | 4 (vier vensters, akkoord eigenaar nodig) of `--gasten=2` met drie | ca. 3 min | Twee bijbanen door gasten, beloning per speler, kapotte borden |
| 4 | `overdracht` en `overname` | 4 of 3 | ca. 3 min per suite | Hostwissel en harde overname midden in een bijbaan (#439, #1011) |
| 5 | `wedstrijd` (`--gasten=0 --mock=2`) | 1 plus 2 headless | ca. 5 min | Race tegen elkaar met beloning per plek (minigames) |
| 6 | `verhaal` (`--until=T1 --speed=4`) | 3 | 20 tot 40 min | De spelbot speelt als host M01 t/m M08, gasten lopen mee (verhaalmissies, cutscenes, Meedoen?) |
| 7 | `net` | 1 plus 3 headless (of 3 Electron) | ca. 7 min | Slecht netwerk, uitval, betalen, vertrek, nieuwe gast, host stopt |
| 8 | `opening` en `touch` | 2 of 3 | ca. 4 min per suite | De menustroom en de aanraakbediening van een gast |

Samen ongeveer 1 tot 1,5 uur zonder `verhaal`, ruim 2 uur mét `verhaal`. De stappen 1, 2, 3 en 5 zijn de kern; 4, 6, 7 en 8 zijn de verdieping. Draai `alles` altijd eerst: faalt die, dan hoeven de rest-suites niet.

## Wat `alles` keurt

Per stap logt elk venster `alles-<stap>`; de testbank keurt dat (`scripts/coop/testbank.mjs`, blok "suite 'alles'"):

- **ping**: de host en gast 2 zien minstens een baken na een ping van de gast.
- **waypoint**: alleen de gast heeft zijn gekozen doel (een waypoint is per speler; delen is #1159).
- **outfit, tuning, bezit**: een venster dat de module mist logt `skip` (wordt een notitie, geen fout); een fout in de stap is wel een probleem. Zodra epic Kleding of Bezit is gemerged gaat de stap echt iets controleren; breid de stap dan uit (zie de lijsten per epic in COOP-DEKKING-21-11.md).
- **winkel en geld**: niemand verliest geld zonder aankoop.
- **bijbaan**: de gast start de baan, de host verdeelt de beloning, de host zonder J krijgt niets.
- **cutscene**: beide gasten zien het filmpje van de host.
- **opslag**: geen IP-adres of directe code in de opslag (constitutie 10).

## Wat de sweep niet dekt (bekend)

- Alles is **nog niet bekeken** in een echt venster; de stap `allesstap` in `scripts/coop/coop.page.js` is geschreven zonder run. Verwacht dat de eerste keer een toets of een module-naam bijgesteld moet worden (bijvoorbeeld `Digit9` bij de ping).
- De minigame-stap is de losse suite `wedstrijd`; `alles` doet er geen eigen (die kost 5 minuten extra).
- Interieurs (epic Interieurs) hebben nog geen stap; zodra de epic in main staat komt er een stap `interieur` (twee spelers in dezelfde kamer).
- Vier gelijktijdige Electron-vensters vragen akkoord van de eigenaar; `alles` blijft daarom bij drie.
