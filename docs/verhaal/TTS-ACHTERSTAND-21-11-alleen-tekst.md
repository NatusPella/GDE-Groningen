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
| Bijbanen: opening, klantpraatjes, slotregels | alleen tekst (HUD-berichten en eindbord) | `game/js/sidejobbeats.js`: tien lijnen, elk een opening, 3 tot 6 klantpraatjes en drie slotregels |

Opnemen kan later met de bestaande stemmen; de klantpraatjes zijn "Klant:", "Reiziger:", "Bewoner:", "Gast:" en "Passagier:" en horen dan bij een bijrol-stem.

## Beppe, de verhaalboog (#1063)

Beppe heeft geen stem en krijgt er geen: haar regels staan in het gesprekspaneel (`beppe_gesprek.js`). Geen audio gegenereerd, geen TTS-aanroep. Bron: `game/js/beppe_boog_texts.js` en `game/js/beppe_visit_texts.js`.

| Waar | Soort | Tekst |
|---|---|---|
| Eerste bezoek, met Tessa | alleen tekst (paneel) | `FIRST_VISIT`: knuffel, "Jullie zijn vrienden. Dat zie ik zo.", de keuze over waar Tessa vandaan komt (3 antwoorden) |
| Bezoeken terwijl ze leeft | alleen tekst | `GREETING`, `GOODBYE` en 25 briefjes en 7 tips (`BEATS`, `TIPS`), per akte, speler, dagdeel en weer |
| Nieuws, wenken, afscheid | alleen tekst (telefoonbericht en paneel) | `NEWS`, `NUDGE`, `FAREWELL_SCENE` |
| Herinnering en echo's | alleen tekst | `MEMORY` (12 briefjes "Wat Beppe zou zeggen"), `ECHOES` (3 regels van Tammo en Tessa) |

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

Persona-regels (21-11, alleen tekst, `PERSONA_POOL` in `karakterbonus.js`; kans 40% en cooldown 240 s per soort): farm: "Tammo: Tessa weet dat soort dingen. Ik ook, maar zij eerder." / "Een boer langs de weg: Die rij loopt als van iemand van het land."; voetbal: "Tessa: Het dorpsteam leerde me één ding: nooit eerst naar de keeper kijken." / "Tammo: Tessa speelt al sinds haar zesde. Ik sinds vanochtend."; land (dieren en weer): "Tessa: Die lucht betekent een bui voor het hooi. Mijn vader keek er altijd eerst naar." / "Tessa: Koeien gaan liggen voor regen, zeiden ze thuis. Het klopte half." / "Tammo: Tessa kent dieren. Ik ken eigenlijk alleen duiven.". Overgangsregels: "Tessa neemt het over: dit is haar terrein.", "Tessa neemt het over: dit is haar veld.", "Tammo neemt het weer over."
