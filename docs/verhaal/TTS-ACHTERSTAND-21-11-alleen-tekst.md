# TTS-achterstand 21-11: nieuwe regels die alleen tekst zijn

Geen audio gegenereerd (opdracht 21-11). Deze regels staan in beeld en zijn niet ingesproken; ze tellen als vrijgesteld in `voice_coverage`.

## AAA akte 1 en 2 (#955, `game/js/missionbeats.js`)

Tussen-beats (een zin in beeld, halverwege de missie) en nasleep-rijen (op de uitslagkaart) voor M01 tot M11. De bron is `BEATS` in `missionbeats.js`; spreker en tekst staan daar naast elkaar. Als de eigenaar ze wil laten inspreken: eerst de vaste stemmen kiezen voor Jelmer, Berend, Sjabbe, Bert, Sjoerd, Tammo, Durk, Oma Trijntje, Geesje, Jelle en Klaas (die hebben al een stem), de bijfiguren (man in de rij, eerstejaars, koster, chauffeur, fatbiker) krijgen er pas een als ze een eigen rol krijgen.

De banners van `missions_akte12.js` (PAND & POEN, GROOTHANDEL DE VETPOT, WIERDEMARKT, DUIVENVERENIGING) zijn beeldtekst, geen spraak.

## AAA akte 5 en 6 en bijbanen (#955)

| Waar | Soort | Tekst |
|---|---|---|
| M30 De poort, groot beeld | alleen tekst | Gewonnen. Het voelt verkeerd. |
| M26 De uitslag, groot beeld | alleen tekst | Gronings Ontzet: het plein klapt. |
| M30 nasleep | alleen tekst | De zon zakt achter de wal van Bourtange. De vesting is genomen, door een leger van karton. / Thuis is waar de kar staat. |
| M26 nasleep | alleen tekst | Het plein ruimt op. De vlaggen gaan in de doos, de laatste eierbal gaat rond. |
| Slotfeest M30, spandoek | alleen tekst | EIERBALLEN OP DE WAL: De vesting is genomen, de frituur is open |
| Bijbanen: opening, klantpraatjes, slotregels | alleen tekst (HUD-berichten en eindbord) | `game/js/bijbaanbeats.js`: tien lijnen, elk een opening, 3 tot 6 klantpraatjes en drie slotregels |

Opnemen kan later met de bestaande stemmen; de klantpraatjes zijn "Klant:", "Reiziger:", "Bewoner:", "Gast:" en "Passagier:" en horen dan bij een bijrol-stem.

## Tessa komt van het platteland (#1005, #981, 21-11)

Alleen tekst, niet ingesproken, niet in een geregistreerde spreektabel (`voice_coverage` ziet ze niet). De bron is `TESSA_REGELS` in `game/js/karakterbonus.js`. Zou de eigenaar ze willen laten inspreken: Tessa's bestaande stem, standaard Nederlands (geen Gronings), en een bijfiguur zonder eigen stem voor "een boer langs de weg" en "Mam".

| Waar | Soort | Tekst |
|---|---|---|
| Boerderij-HUD (strook, voor de klus) | alleen tekst | Tessa: boerendochter (15% sneller werk) |
| Begin van een klus als Tessa (om en om) | alleen tekst | Tessa: Dit gaat mij sneller af, ik ben hier opgegroeid. / Ik molk dit soort koeien al voor schooltijd. Een akker is makkelijker. / Rechte rijen. Mijn vader zag het meteen als het scheef was. |
| Na een klus (voor de voetbal- en farmagent, nog niet gekoppeld) | alleen tekst | Tessa: Zo hoort het. Mijn vader zou knikken, en dat doet hij nooit. |
| Eerste oogst als Tessa, bijmissie-beat | alleen tekst | Een boer langs de weg: "Jij komt niet uit de stad, hè?" Tessa: "Nee. Ergens op het platteland. Ik ruik nog naar koe." |
| Eerste oogst als Tessa, telefoonbericht | alleen tekst | Mam: Ik zag in het nieuws een trekker. Jij, hè? Eet iets. Pa vraagt of de kleppen goed staan. |
| Voetbal-uitleg (voor de voetbal-sim, nog niet gekoppeld) | alleen tekst | Tessa speelt al sinds haar zesde in het dorpsteam. ... |
| Voetbal-viering, keepersneer, tegenstandersneer (idem) | alleen tekst | zie `TESSA_REGELS.voetbal` (2 + 2 + 2 regels) |
| Kiekdoar-kop (idem, nog niet gekoppeld) | alleen tekst | KIEKDOAR: Boerendochter blijkt snelle voeten te hebben: "Ze rende al achter de koeien aan." |
| Prestatie | alleen tekst | Boerendochter: Oogst als Tessa een veld op je eigen akker |
