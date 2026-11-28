# Rangmomenten: een verhaalmoment bij een rangstijging

Gedeelde haak voor alle loopbanen (bouwbrief 28-11, taak R1 en B1). Bij elke niveau-omhoog van een loopbaan (`loopbaanlive.meldOmhoog`) kan een aangemeld moment spelen: ondertitelpraat, een kaart met een personage of een eigen scène. Een rang zonder aangemeld moment doet niets extra's: de speler houdt het gewone kaartje.

## Bestanden

- `game/js/rankmoments.js`: puur. De registry (`registerRankMoment`), de keuze (`momentsFor`), wanneer het mag (`rankBlockers`) en de haak met zijn wachtrij (`makeRankHook`).
- `game/js/loopbaanlive.js`: `rankHook` wordt gevoed vanuit `meldOmhoog` en speelt via `playRankMoment`. Gezien-zijn staat in het profiel van de speler (`gde-loopbaan-v1`, veld `momenten`).
- `game/js/rankmomentsrun.js`: de dunne laag met de wereld; `main.js` roept `updateRankMoments` aan naast `updateCareerDebuts`.
- `scripts/rankmoments_test.mjs`: de gedragstest.

## Een moment aanmelden

Roep `registerRankMoment` aan bij het laden van de module van je loopbaantaak (een gewone top-level aanroep in je eigen bestand, dat door `loopbaanlive.js`-gebruikers wordt geïmporteerd). Velden:

| veld | betekenis |
|---|---|
| `id` | uniek, maximaal 60 tekens, bijvoorbeeld `bus-rang3-annemarie`; dit is de sleutel waarmee "gezien" wordt onthouden, dus nooit hernoemen na een release |
| `vak` | loopbaan-id uit `loopbaan.js` (`landbouw`, `bus`, `taxi`, `trein`, `water`, `lucht`, `horeca`, ...) |
| `rang` | 2 tot 6: het niveau dat de speler net bereikt |
| `scene` | zie onder |
| `voorwaarde` | optioneel, `(ctx) => boolean` met `ctx = { w, vak, van, naar }`; onwaar slaat het moment over (niet als gezien geteld) |

Scenes:

```js
import { registerRankMoment } from './rankmoments.js';

// 1. ondertitelpraat (storytalk.js); spreker is de spreeksleutel, elke regel maximaal 25 woorden
registerRankMoment({ id: 'bus-rang3-annemarie', vak: 'bus', rang: 3,
  scene: { soort: 'talk', regels: [['Annemarie', 'Drie sterren van mevrouw Wassink.'], ['Tammo', 'Dat zijn er twee meer dan ik dacht.']] } });

// 2. een kaart met een personage (kicker is de naam)
registerRankMoment({ id: 'lucht-rang4-roelfien', vak: 'lucht', rang: 4,
  scene: { soort: 'kaart', wie: 'Roelfien', tekst: 'Je mag vanaf nu zelf de route kiezen.' } });

// 3. een eigen scène (een bridge of playSpecScene); true als hij begon, false als hij nu niet kon
registerRankMoment({ id: 'landbouw-rang5-hindrik', vak: 'landbouw', rang: 5,
  scene: { soort: 'spel', speel: (w, { vak, rang }) => playSpecScene(w, { /* ... */ }) } });
```

Wees ervan bewust dat het register leeg is tot jouw module geladen is; importeer je module dus ergens waar hij altijd geladen wordt (bijvoorbeeld vanuit het bestand van je loopbaan dat `main.js` al kent).

## Gedrag

- Een moment speelt hoogstens één keer per speler. Wat gezien is staat in het profiel (`momenten`); een oude save zonder dat veld laadt gewoon (geen migratie, geen versiebump), rommel wordt opgeschoond en twee tabbladen voegen samen.
- Het moment speelt bij de stijging zelf. Een oude save die al op niveau 4 staat krijgt de momenten van niveau 2 en 3 dus nooit achteraf: er is geen stijging meer, het is stil. Een sprong over meer niveaus speelt de overgeslagen momenten in volgorde.
- Het wacht op rust: geen missie, activiteit, minigame, bijbaan of dienst, film, menu, melding in beeld, politie of lopende praat (`rankBlockers`, daarna 3 seconden rust). Het blijft in het geheugen wachten; wie het spel afsluit voordat het speelde, mist het moment (het kaartje had hij wel).
- Een scène die drie keer niet wil beginnen of die een fout geeft, wordt opgegeven en telt als gezien, zodat niets blijft hangen.
- Een kapotte `voorwaarde` telt als onwaar.

## Rangen buiten `loopbaan.js`: de voetbalcarrière (28-11, #1374)

De voetbalcarrière heeft zes eigen rangen (`footballstory.js` `storyRank`) en is geen vak van `loopbaan.js`. Een module als `footballrank.js` meldt zijn rangsoort aan met `registerRankKind('voetbal')` (daarna accepteert `registerRankMoment` die `vak`) en voedt de haak zelf: `feedFootballRank(career, rankHook, w)` vergelijkt de rang met de carrièrevlag `rankSeen` en roept `rankHook.omhoog` aan; `voetbalcarrierelive.updateBeats` doet dat elke twee seconden. Het gezien-zijn staat gewoon in het profiel (`momenten`). Een carrière zonder `rankSeen` krijgt de vlag stil op zijn huidige rang (geen moment achteraf) en de vlag zakt nooit. Zie `scripts/football_rank_test.mjs`; de scènes staan in `docs/verhaal/nieuw/09-script-voetbal.md` (V3.2 tot V3.6).

## Samen spelen

Lokaal per speler. Elke speler doorloopt zijn eigen profiel: een gast die door een beloning van de gastheer omhoog gaat (`loopbaanGast`) speelt zijn eigen moment op zijn eigen apparaat; er gaat niets over het netwerk en de gastheer ziet het niet. Een moment geeft nooit geld of voortgang aan een ander. Wegvallen: niets te herstellen. Later aansluiten: het moment speelt bij de eigen volgende stijging. Test: `scripts/rankmoments_test.mjs` (gast, activiteit, opslaan en laden).
