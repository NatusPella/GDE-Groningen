# Vliegschool De Windwijzer: lessen voor het vliegtuig en de helikopter (#397)

Voor wie aan `vliegschool.js`, `vliegschoolrules.js` of `game/vliegplekken.json` werkt. Tests: `scripts/vliegschool_test.mjs`.

## Wat de speler ziet

Bij Groningen Airport Eelde, naast de baan en Rotor Roelf, staat een balie (E). Daar kies je met 1 of 2 een toestel (Kist Kees, het
vliegtuig, of de Wieken Wubbo, de helikopter) en daarna een les met een cijfer of met A, D en Enter. Een les begint na een korte
aftelling in de lucht, vlak bij waar hij gevlogen wordt; je vliegt met de gewone besturing van het toestel. Een bord bovenin toont
de stand, het volgende doel met afstand en richting, en de toetsen. Backspace stopt de les, nog een keer Backspace sluit de balie.

| Les | Vliegtuig | Helikopter |
|---|---|---|
| Door de ringen | acht ringen langs een bocht | zeven ringen, laag |
| Landen op de markering | de gele streep op de baan van Eelde | het midden van het helidek |
| Laag over het water | 1200 m tussen twee lagen boven het meer | idem, lager |
| Molenslalom | vier echte molens, om en om links en rechts | drie molens |
| Noodlanding | motor op 30%: het weiland met de gele rand in | de motor rookt: honderd seconden om aan de grond te zijn |
| Door de opening | drie keer tussen twee hoge gebouwen door, steeds krapper | idem, voor de rotor |
| Hoveren | | twaalf seconden stil boven een cirkel |

Per les een medaille (brons, zilver, goud) en een beloning: 25, 40 en 60 euro, **alleen de eerste keer dat je die medaille haalt**,
plus punten in het vak Lucht van de Loopbaan (docs/LOOPBAAN.md). Opnieuw doen geeft 6 punten. Records staan onder `vlieg-<les>`
(`recordChallengeResult`), prestaties `vlieg_geslaagd`, `vlieg_goud` en `vlieg_brevet` (alle lessen gehaald). Een crash kost niets:
het toestel is van de school en de les is dan voorbij. De hulpopties (ruimere poorten en ringen, meer tijd) werken mee.

## Hoe het werkt

- `vliegschoolrules.js` is puur: de lessen (`LESSEN`), de baan per les uit een omgeving (`bouwBaan`), de staat en de stap per beeld
  (`stap`), het oordeel (`beoordeel`), de beloning (`beloning`) en een piloot (`piloot`) die de toetsen geeft die een speler zou indrukken.
  Het toestel komt binnen als een monster `c = { x, y, z, agl, speed, vz, heading, onGround, touchdown, crashed, opBaan }`; `agl` is de
  hoogte boven de grond, of boven het water als het toestel daarboven vliegt.
- `vliegschool.js` is de lijm: het lesvliegtuig of de lesheli (`v.schoolKist`, een eigen voertuig, het eigen toestel van de speler
  blijft staan), de ringen en markeringen (THREE-groep `vliegschool`), het bord (`minigamekit.js`) en de uitslag (banner, Loopbaan,
  prestaties). Het toestel wordt gevlogen door `player.update` (`flyPlane` en `flyHeli`): de les kijkt alleen mee. Een crash van het
  vliegtuig wordt direct teruggedraaid (`wrecked` uit) en eindigt de les; de heli krijgt een ruime gezondheid. Voor het noodlanden
  en landen krijgt `world.planeStrip` tijdelijk de baan of het veld van de les (anders is elke aanraking van de grond een crash).
- Het is een activiteit (`activities.js`, `standActivity`): `window.__vliegschool` (debug) heeft `start(id)`, `state()`, `finish()`, `quit()`.
- Met een controller heeft het lesmenu een eigen indeling (`PAD_MAPS.vliegschool`, controls.js): A kiest, B gaat een niveau terug,
  de D-pad en de stick bladeren, en links of rechts kiest bij de balie het vliegtuig of de helikopter. Zodra je in het lesvliegtuig
  zit, kiest `gamepad.js` de gewone vliegindeling (`plane` of `heli`); zonder die uitzondering bleef de les een activiteit en kreeg
  de pad de minigame-indeling, zodat B de les stopte en rollen niet kon.

## De gemeten plekken (`game/vliegplekken.json`)

`node scripts/world/vliegplekken.mjs --world=game/world --write` meet ze op de tegels van de provincie (OSM en 3D BAG) rond Eelde:

- **water**: rechte stukken open water van 1200 m met een vrije halve breedte van minstens 100 m (nu bij De Tip, ruim 7 km van Eelde);
- **velden**: weiland van 420 x 80 m zonder gebouw, water, weg of spoor, ruim 2,8 km van Eelde;
- **molens**: de ketting van vier echte molens uit `landmarkkits.json` (De Witte Molen, De Hoop, De Helper, Helpermolen);
- **openingen**: plekken tussen twee gebouwen van minstens 14 m (hoogte `hm` uit 3D BAG) met een vrije aanloop van 90 m aan weerskanten.
  Drie poorten binnen anderhalve kilometer: ruim (65 m), middel (39 m) en krap (26 m). `hoogte` is het laagste dak min 3 m; de breedte is de
  afstand tussen de gevels. Een vliegtuig mag met de vleugel (5,3 m) niet in de marge komen, de helikopter met de rotor (4,6 m) ook niet.

De test (`vliegschool_test.mjs`) loopt het bestand na (afmetingen, echte molens, oplopende moeilijkheid, ruimte voor de vleugels) en laat
het echte arcade-vliegtuig met de piloot elke vliegtuigles halen (goud). De helikopterlessen krijgen een gesimuleerd toestel zonder
natuurkunde; de echte vlucht staat in de beeldscene `scripts/ui/shots_scenes_s6.js --only=vliegschool` (echte toetsen, de piloot).

## De eerste lessen en de instrumenten (#397, #444)

- `vliegbasis.js` (puur) heeft de soorten `opstijgen`, `koers` (rechtdoor, hoogte houden, naar voren), `peiling` (bochten), `rondje` (een baan van soort `ringen`)
  en `plek` (een baan van soort `landen`). `vliegschoolrules.js` roept het aan voor wat het zelf niet kent. Twintig lessen: elf vliegtuig, negen heli.
- `instrumenten.js`: het paneel (horizon, kompas, hoogte, snelheid, gas, kleppen, gestel, wind), de zomerwind (`zomerWind`) en de uitleg bij het instappen.
  Kleppen (K, controller LB) en landingsgestel (G, controller X) staan in `planecontrol.js`; het model (`arcadeplane.js`) kent kleppen, gestel en wind en
  oordeelt een landing zacht of hard op zinksnelheid, snelheid en neushoek. Test: `scripts/instrumenten_test.mjs`.
- Nog niet gedaan: routes tussen vliegvelden met bestemming en beloning, en een tweede speler als copiloot of passagier (coopzitten3d.js).

## Een les toevoegen

1. Een regel in `LESSEN` (id, toestel, soort, titel, grenzen, tijd) en tekst in `LIJNEN`.
2. Een nieuwe soort: `bouwBaan`, `stap`, `beoordeel`, `bordRij`, `doel` en `richt` (de piloot) in `vliegschoolrules.js`, de markering in
   `bouwMarkeringen` in `vliegschool.js`.
3. `node scripts/vliegschool_test.mjs` (en bij een nieuwe plek `scripts/world/vliegplekken.mjs --write`).
