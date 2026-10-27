# 0017 - Code in het Engels, teksten in het Nederlands

- **Status:** besloten
- **Datum:** 2026-10-25
- **Spec:** [coding-standards.md](../coding-standards.md) (Naamgeving), `AGENTS.md` (Code)

## Context

De repo is een mix, en die mix groeide. In `game/js` hebben **454 van de 848 modules**
overwegend Engelse comments en **307** overwegend Nederlandse; **181 bestandsnamen**
bevatten een Nederlands woord (`boerderijui.js`, `kartbaanspoor.js`,
`bijbaananker.js`) naast volledig Engelse (`railway3d.js`, `roadgraph.js`). Binnen één
bestand staan vaak Engelse functienamen met Nederlandse comments, en soms andersom
(`maakRace()` naast `createKart()`).

De oorzaak is niet slordigheid maar ontbrekende regel: `coding-standards.md` zegt bij
functies "werkwoord + zelfstandig naamwoord, Engels", maar niets over bestanden,
variabelen of comments; en omdat `AGENTS.md` in het Nederlands is, schreven mensen en
agents Nederlandse comments bij Engelse namen. De constitution zegt alleen iets over wat
de **speler** ziet, niet over de code.

## Besluit

Drie talen, elk met een eigen domein:

| Wat | Taal | Voorbeeld |
|---|---|---|
| Code: bestanden, modules, functies, variabelen, constanten, comments | **Engels** | `railway3d.js`, `buildTrackData()`, `// the city draws that` |
| Wat de speler ziet of hoort | **Nederlands** (constitution, ADR 0012) | `'KARTBAAN ULRUM'`, `'Startlichten...'` |
| Proza: docs, specs, ADR's, CHANGELOG, issues, commits, testuitvoer | **Nederlands** | `console.log('treeclear_test: ok ...')` |

Bestaande Nederlandse namen en comments **blijven staan**. Je hernoemt ze alleen in de
commit die dat bestand toch al aanraakt — dezelfde regel als coop → multiplayer. Geen
massale hernoeming, geen aparte vertaalronde.

## Afgewezen

- **Alles Nederlands, ook de code.** Dan leest de API als `maakRace()` naast
  `createTrack()`, dus de mix blijft, alleen aan de andere kant. Bovendien is Engels de
  taal van three.js, van de browser-API's en van twee derde van de bestaande modules.
- **Alleen namen Engels, comments Nederlands.** Dan staat er in elk nieuw bestand alsnog
  twee talen door elkaar — precies de mix die dit besluit wegneemt — en zijn de comments
  niet te lezen voor iemand die de code leest zonder Nederlands.
- **Nu alles in één keer hernoemen.** Duizenden regels churn, elke import, test en
  audit mee, en geen enkele diff is daarna nog te lezen. De winst is cosmetisch; de
  kosten zijn een week werk en een berg risico in de wereldbouw.
- **Het laten zoals het is.** Dan schrijft elke nieuwe sessie weer de taal van de buur,
  en groeit de mix verder. Dit is de derde keer dat het ter sprake komt.

## Gevolgen

- Nieuwe modules krijgen een Engelse naam; `boerderij*.js` en `kartbaanspoor.js` blijven
  voorlopig staan. Wie zo'n bestand opent voor een echte wijziging, hernoemt het in
  dezelfde commit, met imports, tests en docs mee.
- Een nieuwe regel in `AGENTS.md` en in `coding-standards.md`, zodat een agent die alleen
  `AGENTS.md` leest het ook weet.
- Testuitvoer en commentaar op een issue blijven Nederlands: dat is proza voor de bouwer,
  niet voor de speler en niet voor de code.
- De code van vóór 25-10-2026 houdt zijn Nederlandse comments tot hij toch open gaat; dit
  besluit is geen voorraad opdrachten.
