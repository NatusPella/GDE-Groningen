# Verhaalrecap, dagboek en ankerzin (#1363, #1393)

Pure module `game/js/storyrecap.js`, test `scripts/storyrecap_test.mjs`. Bron: bijbel 01 §3.1 D en F, bijbel 03 §5.9.

## Wat de module doet

Alles volgt uit de verhaalstand van **één speler**: de set gedane stap-id's. Niets wordt opgeslagen of verstuurd.

- `buildRecap({ steps, done, dossiers, parts, why })` geeft `rows` voor "Waar staan we", "Laatst gedaan" (laatste twee stappen), "Nu" en "Wie is wie" (hoogstens vijf).
- `diaryEntries({ steps, done })` geeft per gedane stap met een doelregel één alinea, in de woorden van Tammo of Tessa. Geen datum.
- `earlyArrival({ step, steps, done, dossiers, why })` geeft `{ early, anchor }`: één zin die zegt wie en waarom voor een scène die eerder bereikt wordt dan zijn stap. Nooit blokkerend.

## Geen spoilers

Een personage staat alleen in de recap of ankerzin als zijn `firstStep` (dossier) door deze speler is gedaan, of de stap zelf hem inleidt. Noemt een doelregel een nog onbekend personage, dan valt de recap terug op een neutrale zin en de ankerzin op de deelregel (`WHY`) of een vaste zin. Alleen dossiers met `tier: 'supporting'` tellen; de twee hoofdpersonen en bijfiguren (cameo, minor) staan niet in "Wie is wie".

## Samen spelen

Recap en dagboek zijn per speler. Een gast die later aansluit geeft zijn eigen gedane stappen mee en krijgt een recap die daarbij past (getest met host en gast naast elkaar). Een gast die te vroeg aankomt krijgt dezelfde ankerzin; de scène blokkeert niemand anders.

## Koppelnotitie (nog niet bedraad)

De bestaande kaart (`recapcard.js`, `recapcardrun.js`) is bewust niet aangepast: hij heeft een woordbudget van 48 en een eigen test. Voor de koppeling:

1. In `recapcardrun.js` de gedane stappen afleiden met `stepDone(k, doneId, missionPassed)` uit `storyarc.js` en `buildRecap` aanroepen; de rij "Wie is wie" onder de kaart tonen (eerst een scrollvrije regel op 720p en ui 1,5 meten).
2. Dagboek: een tab in `verhaalui.js` met `diaryEntries`, per speler (ook bij een gast: eigen done-set uit `coopverhaal.js`).
3. Ankerzin: bij het starten van een gebiedsscène `earlyArrival` aanroepen en bij `early` de zin als ondertitel of regel vóór de scène tonen.
4. Telefoonrecap (nooit tijdens een missie, altijd overslaanbaar) en de koude-lezertoets zijn nog niet gebouwd.

## Bevinding

In het huidige verhaal houdt de module in 3 van de 69 stappen de doelregel terug en kiest bij 8 stappen (M12, K3, J2, M16, J4, N9, J6, T4) een neutrale ankerzin, omdat de regel een figuur noemt die volgens het dossier pas later wordt ingeleid. Dat zijn kandidaten voor het schrijfwerk of voor een correctie van `firstStep` in de dossiers.
