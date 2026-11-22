# Sprint 22-11: snelheid (render en streaming)

> Tak `sprint-snelheid-render-22-11`. Details, meetpunten en wat bewust is blijven liggen: [PERF-CODE3-22-11.md](PERF-CODE3-22-11.md).

## Voor en na

| Onderdeel | Voor | Na |
|---|---|---|
| `nearestOnRoadList` (straatmeubilair, plaatsing, tegelbouw) | een object per wegsegment; 10,6% van de hoofdthread op de ringroute (profiel 21-11) | inline, geen object; x1,6 in de microbench, uitkomsten bit voor bit gelijk |
| `gridItems` (alle wegen, gebouwen, gras) | bij elke aanroep een Set over alle cellen (4 tot 16 ms op 12.000 wegen) | bewaard tot het raster verandert; een kopie per beller |
| `nearestRoadPoint` | een object per segment | inline; 1128 tegen ca. 840 ms voor 40.000 vragen op de echte kaart |
| Benchmark-advies | negeert de proefmetingen per stand | geen stap omhoog naar een stand die in de proef onder 55 fps zit; omlaag direct naar de stand die wel draait |

## Wat in beeld bekeken moet worden (niets hiervan is gezien)

- Straatmeubilair (lantaarns, borden, paaltjes) en de plaatsing van winkels en garages op een bekende plek (Grote Markt, Vismarkt): moet identiek zijn aan de vorige build, want de uitkomsten zijn in node bit voor bit gelijk bewezen.
- Het spawnpunt na Spel starten en na verplaatsen/reizen.
- De rapportkaart na een benchmark op Midden of Hoog: het advies noemt de gemeten fps van de hogere stand als die onder 55 zit.
- Frametijd en haperingen bij het streamen (routes foot en ring): zie de meetpunten in PERF-CODE3-22-11.md.
