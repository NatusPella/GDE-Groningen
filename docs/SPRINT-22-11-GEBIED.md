# Sprint 22-11: fun en gameplay

Doel: speelplezier. Kleine fun-versterkers op bestaande loops, zonder nieuw groot systeem. Alles is
pure regel (`game/js/gamefeel.js`, Node-safe) met een dunne koppeling in `achievementtracker.js`.

## Wat er al stond (nagelopen, niet aangepast)

- Rakelings-bonus (#216), drift met combo's en multiplier (`drift.js`), stuntavond, kart met elastiek
  (`kartrace.js`, `band`), sloot-val en vastzit-opruiming (`trafficstuck.js`, `ditchsweep.js`).
- Voertuigen konden al van een oprit of kruin springen (`vehicle.js`, `airborne`), maar dat gaf geen
  beloning en geen melding.

## Voor en na

| Onderdeel | Voor | Na |
| --- | --- | --- |
| Rakelings | elke rakelings los: EUR 5 tot 15 | opeenvolgende rakelings binnen 9 s tellen x1,5, x2 tot x3 mee; melding "Rakelings x3"; een botsing breekt de reeks |
| Prestatie | alleen totaalteller (10 en 50 keer) | "Op een haar, vijf keer": vijf in een reeks (stat `nearMissReeks`, hoogste reeks) |
| Sprong | geen beloning | echte sprong (0,7 s lucht, 8 m ver, netjes geland): EUR 5 tot 30 en "Sprong van N m"; 4 s afkoeling; geen wrak, geen hobbel |

## Beloningsritme

Klein en vaak: een losse rakelings blijft EUR 5 tot 15. Af en toe groot: een reeks van zes kost
ruim 30 s aandacht en levert hooguit ongeveer EUR 100 (test `gamefeel_test`, balansregel). De
sprongbonus is begrensd op EUR 30 met afkoeling, dus stuiteren of een cheat-bounce levert geen geldmachine op.

## Samen spelen

Allebei zijn lokaal en per speler (zoals de bestaande rakelings-bonus): geen nieuw bericht, geen
snapshotveld. Een gast krijgt de bonus in zijn eigen spel; er is geen host-aanname. Een speler die
wegvalt of later aansluit verliest hooguit een lopende reeks.

## Tests

`node scripts/gamefeel_test.mjs` (reeks, plafond, breken, balans, sprong, afkoeling, wrak),
`achievements_defs_test`, `steam_test` (tellers 253), `spec_check`.

## Nog niet in beeld bekeken

- De chip "+EUR 12 Rakelings x2" en "Sprong van 20 m": leesbaarheid, duur, botsing met andere chips.
- Gevoel van de sprongdrempel op echte opritten en dijken: halen spelers hem te makkelijk of nooit?
- Of de reeks-melding bij hoge snelheid te druk wordt naast de driftmelding.
