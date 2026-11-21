# Samen spelen in vier echte vensters (21-11)

Schermafbeeldingen van een testbank-sessie met host en drie Electron-gasten (`scripts/coop/testbank.mjs`, 1280x720, software-GL, eigen wegwerpprofielen, alles op 127.0.0.1). Wat een agent hier niet in beeld zag, staat in `docs/COOP-GAST.md` (sectie "Vier echte vensters") als niet bewezen.

| Bestand | Wat je ziet | Run |
| --- | --- | --- |
| `spelers-lijst-en-hint-host.png` | Tab-lijst "Spelers 4" met ping en richting, en de hint "Spelers · 4" boven de minikaart | suite `vier` |
| `spelers-lijst-gast3.png` | dezelfde lijst bij de vierde speler | suite `vier` |
| `spelkeuze-host.png` | "Kies jullie spel" bij het openen van een sessie | suite `vier` |
| `bijbaan-gast-krantenwijk.png` | de gast die de krantenwijk startte: tip, tijd en E-gooien in zijn HUD | suite `vier` |
| `bijbaan-host-hud-ongemoeid.png` | de host terwijl een gast een baan doet: alleen zijn eigen doel, geen baanstrook | suite `bijbaan` |
| `kapotte-lampen-bij-gast.png` | een gast nadat de host drie lampen omver reed (kapot-lijst via EXTRA) | suite `bijbaan` |
| `verbinding-weg-voor-de-fix.png` | wachtscherm "Verbinding weg" bij een gast met aanraking: op de gele knop stond nog "Kies" (de Enter-toetshint als tekst); met de fix verborgen | suite `net` |
| `host-na-uitval-gast.png` | de host terwijl een gast wegvalt: bij vier spelers loopt het spel door | suite `net` |
| `hostwissel-oude-host-als-gast.png` | de oude host na de overdracht, nu als gast bij de nieuwe host | suite `overdracht` |
| `hostwissel-nieuwe-host.png` | de nieuwe host: zijn eigen verhaal begint met het openingsfilmpje (zie het issue) | suite `overdracht` |
