# Nieuwe stemregels, 28-11 (voetbal, #1374)

Alleen tekst: **er is geen audio gemaakt** en geen TTS gedraaid. Tot de TTS-ronde staan de regels als ondertitel met leestijd (`textOnly` in `game/storydata/script.json`). Bron: `docs/verhaal/nieuw/09-script-voetbal.md`; de code leest dezelfde tekst uit `game/js/careerdebut_voetbal.js` (V1.1 tot V1.3) en `game/js/footballrankmoments.js` (V3.2 tot V3.6). Een test (`scripts/careerdebut_voetbal_test.mjs`, `scripts/football_rank_test.mjs`) bewaakt dat code en script gelijk blijven; wijzig je een tekst, wijzig dan alle drie.

## Sprekers en stem (voorstel, nog te kiezen)

| Spreker | Sleutel in `script.json` | Stemwens |
|---|---|---|
| Albert Teuben | `albert` | druk en gul, een man van 66 met een sjaal; plat Gronings niveau 2, zacht |
| Eppo Rozema | `eppo` (in het spel de NPC "Trainer Eppo", sleutel `trainer`) | gepensioneerd onderwijzer, uitleggend en warm; plat Gronings niveau 2 |
| Hilbrand | `hilbrand` | de verslaggever, vlot (bestaand personage Hilbrand Kuipers) |
| Mevrouw De Vries-Jansen | `devries` | droog, kort, ziet alles; Standaardnederlands |
| Jaap Roorda | `jaap` | gul en praatziek, de bakker |
| Femke | `femke` | bestaand, energiek en gehaast |
| Tammo, Tessa | `T`, `A` | bestaand |

## Regels

Aantal: 6 (V1.1) + 7 (V1.2) + 12 (V1.3) + 3 + 3 + 3 + 3 + 3 (V3.2 tot V3.6) = 40 regels, allemaal `[NIEUW]`, geen `[BEHOUDEN]`. De volledige tekst per scène staat in het scriptbestand; hier alleen wat de TTS-ronde moet weten:

- **V1.1 tot V1.3** (de invalbeurt) worden als een scène van ca. 70 tot 90 seconden gespeeld; regels met `{ov}` laten de volgende beginnen voor het einde (Tessa "Scheidsrechter, Tammo." en Tammo "De papieren regel ik.", beide 0,3 s).
- **V3.2 tot V3.6** (rangmomenten) zijn ondertitelpraat zonder camera, 3 regels per moment; een regel is hooguit 25 woorden.
- Namen die uitgesproken worden: Albert Teuben, Eppo Rozema, De Hoekers, Mevrouw De Vries-Jansen, Jaap Roorda, De Stadjers en de Euroborg.
- Niet opgenomen en vervallen: Remco Zwart en Jan Kleibijter (Jan botst met de club De Kleibijters).

## Nog te doen vóór opname

1. Smaakronde van de eigenaar over de grappen (het suikerklontje, "Het klontje blijft in de kast", de potlood-regel).
2. Stemkeuze voor Albert, Eppo, Mevrouw De Vries-Jansen en Jaap Roorda (`scripts/tts_lines_list.mjs`, `scripts/voice_wacht.mjs --write` na de keuze).
3. Een luisterronde na de opname: de scène wordt korter met stem.
