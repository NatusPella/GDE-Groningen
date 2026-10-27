# #492 Trein: een vast dienstrooster per lijn en dag

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-trein-passagiers

## Acceptatie

De machinist rijdt een dienst uit het rooster in plaats van een zelfgekozen reeks halten.

- `game/js/dienstregeling.js` levert per lijn, richting en speldag een vast rooster met
  vertrektijden en halten; dezelfde dag geeft altijd dezelfde dienst.
- `machinistrules.startService` kan een rooster-dienst overnemen: de due-tijden komen uit
  het rooster, niet uit het instapmoment; zonder rooster blijft de bestaande route werken.
- `machinist.js` toont bij G de dienst (lijn, richting, vertrektijd) op het bord en start
  die; een gemiste dienst is geen crash, de volgende is kiesbaar.
- Tests: `dienstregeling_test` (rooster deterministisch, beide richtingen, speldag),
  `machinist_test` (rooster-due, bord, fallback), `simdienst_test`; bestaande tests groen.
- Geen protocolbump, geen nieuwe opslag, geen wijziging aan de conducteur/tickets of
  blokseinen.

## Samen spelen

N (host-werk). Het rooster is wereldgedrag van de host; een gast ziet de trein via de
snapshot. Geen beloning of gedeelde kas.

## Niet

Geen rangeersysteem, geen materieelbeheer, geen ATB/ERTMS, geen wijziging aan de
dienstregeling van AI-treinen buiten het rooster.
