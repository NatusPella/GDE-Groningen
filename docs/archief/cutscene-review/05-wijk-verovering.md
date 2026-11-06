# 05 — Wijkverovering: de inventaris en het raamwerk voor één lange cutscene

Review/ontwerp voor GDE Groningen. Branch `main`. **Gemeten HEAD: `41340dd4`** ("Docs: reviewarchieven van de andere sessies bewaard"), niet `e5e8b712`: dat is een voorouder (3 commits terug, "Boot-deadlock … #582"). De werkboom had bij aanvang veel gewijzigde bestanden (`M`); ik heb alleen gelezen en niets daarvan aangeraakt.

Scope: statische review. Geen runtime, geen Electron, geen spel, geen testsuite, geen commits, geen GitHub, geen `.env`, `desktop/main.js` niet aangeraakt. Alleen dit rapport is geschreven.

**Belangrijk vooraf (eerlijkheid over de cijfers).** De inventaris in §1 is een *statische* telling: ik heb de coördinaten uit de code en de pure databestanden gehaald en daarna `bouwIndeling()` uit `gebieden.js` zelf laten rekenen. Dat is dezelfde functie als het spel gebruikt, maar de catalogus is niet compleet: **122 van de 151 taken** uit `docs/GEBIEDEN.md:69` zijn te plaatsen (14 missies, 37 bijbanen, 39 spel, 24 vondsten, 8 geheimen); **29 taken konden niet hard geplaatst worden** (vooral missies met een berekende start, 2 bijbanen en 11 minigame-plekken). Elke niet-geplaatste taak kan een wijk alleen *bijkrijgen*, nooit kwijtraken. De 8 hieronder zijn dus de **bewezen ondergrens**; de vier stadswijken met precies één geplaatste taak staan er los bij als kandidaten. De exacte, harde bron is in het spel zelf beschikbaar: `window.__debug.achievements.gebieden()` (`achievementtracker.js:135`) geeft de hele indeling met taken; dat is de methode die ik aanraad om de telling te bevestigen.

Het wegwerpscript stond in `.cutscene-review/inventaris.mjs` en heeft één volledige run gedaan; de map is daarna van buiten mijn sessie leeggemaakt (het bestand was plots weg, en de shell van deze sessie viel daarna uit op een sandbox-backend). De cijfers hieronder komen uit die laatste volledige run. Ik heb ze niet opnieuw kunnen draaien.

---

## 1. Inventaris van veroverbare wijken

### 1.1 Wat "wijk" hier betekent (en waarom dat meteen een ontwerppunt is)

De veroverlaag volgt de **echte CBS-wijken**, niet de 66 buurtpunten van de oude wijkenkaart:

- `game/grenzen.json` (via `grenzen.js`): **1 provincie, 10 gemeenten, 202 woonplaatsen, 123 wijken, 644 buurten** (peiljaar 2025).
- Daarvan liggen **20 wijken in de gemeente Groningen**; de overige 103 over de andere 9 gemeenten.
- Een gebied is veroverbaar bij **≥ 2 taken** (`MIN_TAKEN = 2`, `gebieden.js:19`, toegepast in `gebieden.js:140`).
- De namen die de speler ziet komen uit `weergaveNamen()` (`gebieden.js:94-99`): het CBS-nummer gaat eraf ("Wijk 03 Veendam-kern" → "Veendam-kern") en een dubbele naam krijgt de gemeente erbij.

Dat is een andere laag dan de "wijk" van de huidige eerste-bezoek-scène: die werkt op `w.map.meta.neighbourhoodPoints` (`cinematics.js:765-773`), de 66 buurtpunten van de stad. Zie bevinding F5.

### 1.2 De veroverbare wijken (bewezen met de statische catalogus)

| # | Wijk | Gemeente | Taken | Wat er in ligt (per soort) |
|---|---|---|---|---|
| 1 | **Centrum** | Groningen | **38** | 11 missies (o.a. Nog eentje dan, Even pinnen, Olle Grieze, Het museum stond er al zo, Het Loket) · 18 bijbanen (taxi, bezorger, krantenwijk, fietsdepot, vracht, boa, cabaret, rechtbank, bus, lijnbus, rondvaart, rondvaarttour, snackoverlast, Het Loket, Studiestaat, Vigilantia, Promotie, Veerdienst Lauwers) · 9 spellen (kermis, reuzenrad, carillon Martinitoren, 6 regatta-havens) |
| 2 | **Oud-Zuid** | Groningen | **8** | 4 bijbanen (verhuizing, rave Telefoonhuis, Niemeyer, Bernard) · 4 spellen (stationsrotonde, discgolf Stadspark, skatepark Stadspark, regatta De Brede Vaart) |
| 3 | **Nieuw-Noord** | Groningen | **4** | 2 bijbanen (kamerkoning, wolkenhal) · 2 spellen (klimtoren, padel Paddepoel-Noord) |
| 4 | **Zuidoost** | Groningen | **4** | 1 missie (Al het vet van Grunn) · 3 spellen (rotonde Oost, padel Eemskanaal, padel Europapark) |
| 5 | **Nieuw-Oost** | Groningen | **3** | 3 spellen (pitch & putt Hunzepark, padel Vogelbuurt, padel Ulgersmaborg) |
| 6 | **Nieuw-West** | Groningen | **3** | 3 spellen (rotonde Hoendiep, padel Suikerfabriekterrein, padel Kostverloren) |
| 7 | **Oud-Oost** | Groningen | **2** | 1 bijbaan (helix) · 1 spel (waterski) |
| 8 | **Fivelzigt** | Eemsdelta | **2** | 2 bijbanen (strandwacht, brugwachter) — beide op het streekhart van Eemsdelta, dus ± |

Tussenstand per laag in dezelfde run: provincie 1/1 veroverbaar, gemeenten 6/10, woonplaatsen 3/202, wijken 8/123, buurten 11/644; samen 29 veroverbare gebieden van de 980.

**Lees dit als een ondergrens.** Zeven van de acht zijn hard (letterlijke coördinaten, meerdere taken per wijk); Fivelzigt hangt aan twee bijbanen die het spel pas in de wereld aan een weg vastklikt.

### 1.3 De kandidaten: wijken met precies één geplaatste taak

Deze 23 wijken zijn met één extra (niet-geplaatste) taak veroverbaar. De vier **stadswijken** zijn het meest waarschijnlijk, omdat de niet-geplaatste missies vooral in en om de stad liggen:

| Wijk | Gemeente | De ene taak die ik vond |
|---|---|---|
| **Midden-Zuid** | Groningen | zwembad |
| **Oud-Noord** | Groningen | energielabel (Archipelflat) |
| **Oud-West** | Groningen | regatta Jachthaven Het Hoofd |
| **Zuidwest** | Groningen | padel Martini Trade Park |
| Bedum | Het Hogeland | carbid schieten |
| Bourtange | Westerwolde | pitch & putt Vlagtwedde |
| Buitengebied Noord-Bierum | Eemsdelta | pitch & putt Losdorp |
| Buitengebied Noord-Loppersum | Eemsdelta | herstelploeg Delfstof Noord |
| Eemshavengebied | Het Hogeland | het containerlabyrint |
| Foxham en Hoogezand-Noord | Midden-Groningen | museumbus |
| Glimmen-Onnen-Noordlaren | Groningen | pitch & putt Glimmen |
| Haren-West e.o. | Groningen | zeilwedstrijd Hoornse Plas |
| Hoogkerk e.o. | Groningen | suikerbieten naar de fabriek |
| Leek | Westerkwartier | schoolbus |
| Meerstad e.o. | Groningen | hengelen |
| Midwolda | Oldambt | pitch & putt Oostwold |
| Tjuchem en Steendam | Midden-Groningen | pitch & putt Steendam |
| Uithuizen | Het Hogeland | bergingsdienst |
| Ulrum | Het Hogeland | kartbaan Ulrum |
| Veendam-buitengebied | Veendam | pitch & putt Borgercompagnie |
| Veendam-kern | Veendam | melkrijder |
| Winschoten | Oldambt | balenrit |
| Winsum | Het Hogeland | wandeling Winsum |

De overige **92 wijken** hadden in deze telling geen enkele geplaatste taak. Dat past bij `docs/GEBIEDEN.md:135`: "de meeste buurten en wijken buiten de stad hebben niets te doen".

**Ontwerpconclusie:** reken op **7 van de 20 stadswijken** die zeker een intocht verdienen (Centrum, Oud-Zuid, Nieuw-Noord, Zuidoost, Nieuw-Oost, Nieuw-West, Oud-Oost), plus 4 kandidaten (Midden-Zuid, Oud-Noord, Oud-West, Zuidwest) = **hoogstens 11 van de 20**. Buiten de stad is Fivelzigt de enige kandidaat in deze telling. Dat is een haalbaar aantal om de scènes echt goed te maken; 123 wijken hoeft niemand te authoreren.

### 1.4 Hoe ik dit heb afgeleid (en wat de beperkingen zijn)

Methode, in volgorde:

1. **Grenzen** — `game/grenzen.json` met `ontvouw()` uit `grenzen.js`. Dat is puur en exact; `puntInGebied()` (`grenzen.js:39-49`) doet de punt-in-polygoon. De 123/202/644-aantallen komen hieruit.
2. **Taken** — per soort de bron die `verzamelTaken()` (`gebiedenbronnen.js:19-41`) ook gebruikt:
   - **Missies** (`getMissionList()`): de letterlijke `start:` uit `missions_defs.js`, `missions.js`, `missions_nieuw.js` (`walk(x, y)`, `{x, y}`, `spotAt(lat, lon)`); beginselen als `kei(0)`, `fatStart`, `lokatAt()`, `AIRSTRIP.point()` heb ik uit de constanten gehaald (`keiroute.js`, `missions_defs.js:33-36`, `missions_nieuw.js:13-21`).
   - **Bijbanen** (`getSideJobList()`): het ankerpunt per baan uit de module (`nearestOnStreet(map, 'Stationsweg', 53.56, 875.23)` in `sidejob_taxi.js`, `namedBuildingSpot(map, 'Stadhuis')` in `sidejob_boa.js`), de keuzewerken uit `keuzewerk.js` (echte wgs per gebouw) en de streekbanen op het streekhart (`STREKEN` in `regioleven.js`).
   - **Minigames** (`activitySpots()`, padel, pitch & putt): de letterlijke constanten (`carbid.js:32 FIELD`, `driftzone.js:20-22`, `roadaccess.js:134 KERMIS_TENT`, `skatepark.js:33`, `zwembad.js:23`, `klimtoren.js:23`, `waterski.js:23`, `hengelen.js:31`, `wandelrules.js:16`), de havens uit `game/marinas.json`, de padelplekken uit `game/mapextras.json` (8, en `mapdata.js:740` zet die in `meta.padel`) en de golfbanen via `golfVenues()` (`echteplekken.js:138-161`) op `game/echteplekken.json`.
   - **Vondsten en geheimen**: `FINDS` + `findPos()` uit `regioleven.js` (lat/lon via `rdnew.js`), 24 + 8.
3. **Indeling** — `bouwIndeling({ grenzen, taken })` uit `gebieden.js:105-142`: dezelfde functie, dezelfde `MIN_TAKEN`, dezelfde weergavenamen. Daarna per wijk `voortgang()` (`gebieden.js:203-218`).

**Wat niet hard kan, en waarom:**

- **Bijbanen worden pas in de wereld geplaatst.** `initSideJobs()` (`sidejobs.js:236-251`) vraagt per baan `job.anchor(map)`, controleert water (`isInWater`/`findOpenSpawn`), zoekt een vrije plek (`spreadSpot`, `sidejobs.js:201-215`) en schuift het punt uit gebouwen (`escapeBuilding`). Het definitieve punt hangt dus af van de geladen tegels en kan tientallen meters (soms meer) van het anker in de code liggen. Mijn plaatsing is daarom ±, niet exact. Grensgevallen aan een wijkrand kunnen daardoor verschuiven.
- **Missies met een berekende start** (`kei(0)`, `fatStart`, `loketAt`, `spotAt(...)`, `DIJK_START`, `AIRSTRIP.point`) heb ik waar mogelijk uit de constanten gehaald; 12–16 missies bleven onplaatsbaar. Zij zijn de reden dat Midden-Zuid, Oud-Noord, Oud-West en Zuidwest op één taak staan.
- **Minigame-plekken**: elke `standActivity` geeft precies één plek (`standactivity.js:21`), dus daar zit het verschil niet. Ik heb onder meer de **pannenkoekenboot** niet geplaatst en de aantallen havens/banen kunnen in de wereld groter zijn dan in `marinas.json` en `echteplekken.json`; de 11 ontbrekende spel-plekken komen daar het meest waarschijnlijk vandaan (niet geverifieerd).
- **`echteplekken.json` staat in het spelframe**, niet in RD New (de `"frame": "rd-new"` in het bestand is de herkomst, niet het assenstelsel): de x/y gaan er rechtstreeks in, net als in `mapextras.json`. Wie hier `rdToWorld()` op loslaat, zet alle golfbanen 233 km westelijk (mijn eerste run deed dat; vandaar dat ik het hier noteer).
- **Wat ik niet heb geverifieerd:** of de wereldcatalogus op dit moment precies 151 taken heeft (dat is de telling uit de doc, niet uit een run), en of de peli jaa r 2025-grenzen de enige zijn (zie `docs/GEBIEDEN.md:139`).

**De exacte methode die het spel zelf gebruikt** (voor de teamleden die de telling hard willen):

```
verzamelTaken()            gebiedenbronnen.js:19-41   (missies, bijbanen, activities, padel, FINDS)
  → bouwIndeling()         gebieden.js:105-142        (punt-in-polygoon per laag, taken per gebied)
  → g.veroverbaar          gebieden.js:140            (taken.length >= MIN_TAKEN)
  → voortgang(p, ind, id)  gebieden.js:203-218        (per speler: klaar/totaal/voltooid)
  → markeer()              gebieden.js:256-271        (bij de laatste taak: beloond + huis)
```

In het spel zelf: **Pauzemenu › Loopbaan › Veroverd** (`veroverdpanel.js`, `gebiedenui.js`), of in de console `__debug.achievements.gebieden()` (`achievementtracker.js:135`).

---

## 2. Hoe het nu gaat

### 2.1 Eerste bezoek aan een wijk (wat er nu staat)

- `checkWijk()` (`cinematics.js:797-824`) kijkt elke 0,25 s in welke buurt de speler staat (`currentWijk()`, `cinematics.js:765-773`). Is de buurt nieuw (`wijkSeen`, uit `localStorage` sleutel `gde-wijken-seen`, `storagekeys.js:41`), dan moet de speler **1,5 s** blijven staan (`WIJK_DWELL`, `cinematics.js:46`) en daarna:
  - niet in een film zitten, geen respawn, geen `wanted`, geen `quietUntil`, geen missie/race/bijbaan (`busyWithJob`, `cinematics.js:793`), niet vliegen (`aloft`), en het aandachtbudget moet het toestaan (`mayInterrupt('wijk', w)`, `attention.js:33-46`);
  - in een voertuig: langzamer dan **12 m/s** (`WIJK_MAX_SPEED`, `cinematics.js:47`).
- Dan volgt standaard de **naamkaart** (`showWijkCard`, `cinematics.js:846-883`): kicker "Nieuwe wijk", de naam, één Rikus-regel (`wijkLine`, `cinematics.js:752-763`) met TTS (`lineVoiceFor('', text)`), en maximaal 3 highlights (`wijkHighlights`, `cinematics.js:828-840`). De kaart wacht onder een resultaatkaart of keuzepaneel (`isOverlayHeld('wijkkaart')`, regel 869) en verdwijnt na de stem + 1,5 s (minimaal 5 s).
- De **flyover** is opt-in: alleen als `getSettings().wijkFilm === true` (`cinematics.js:808`), en die staat **standaard op `false`** (`settings.js:60`; `cinematicMoments` staat op `true`, `settings.js:58`). Dan speelt `playWijk()` (`cinematics.js:897-909`) 11 s met `wijkStreetShot()` (`camerapath.js:177-216`), prioriteit 1, `keepMotion: true`, één regel.
- De regels staan in `WIJK_LINES` (`cinematics.js:687-726`), met `WIJK_ALIAS` voor buurten zonder eigen regels (`727-731`) en `WIJK_GENERIC` (`732-741`). De HUD-plaatsnaam gebruikt de eerste regel via `wijkBlurb()` (`cinematics.js:747-750`, gebruikt in `hud_panel.js:742`).
- `wijkSeen` is **per installatie**, niet per save: het staat in `localStorage` en wordt bij een nieuw spel geleegd (`loadWijken(!w.loadedFromSave)`, `cinematics.js:664`, `775-791`).

### 2.2 De verover-beloning (wat er nu staat)

- `betaal()` in `gebiedenlive.js:132-136` is **alles** wat er bij een verovering gebeurt:

```js
function betaal(w, b) {
  if (!w) return;
  if (b.geld > 0) { noteMoney('Overig inkomsten'); w.money = (w.money || 0) + b.geld; }
  if (w.addMessage) w.addMessage(`${b.titel}! ${b.regel} (+€${b.geld})${b.huis ? ' En de sleutel van je safehouse ligt op de mat.' : ''}`, 7, { kind: 'prestatie', kicker: `${…} veroverd`, key: 'gebied-' + b.gebied });
}
```

  Dus: geld erbij, en **één HUD-bericht van 7 seconden** (`kind: 'prestatie'`, sleutel `gebied-wk:…`). Geen scène, geen camera, geen vlag in beeld, geen muziek.
- De titel, het geld, de vlagkleur en de grap komen uit `beloningVan()` (`gebieden.js:247-253`); het gratis safehouse uit `geefHuis()` (`gebieden.js:349-354`) en `HUIS_PRIJS` (`gebieden.js:326`).
- `betaal()` wordt synchroon aangeroepen vanuit `doeTaak()` (`gebiedenlive.js:139-148`), dat zelf wordt aangeroepen uit `opSleutel()` (`gebiedenlive.js:151-158`) — dus op het moment dat een minigame, bijbaan of missie **net klaar is** (via `loopbaanlive.loopbaanTel/loopbaanOpStat`, `achievements.recordUnique`, of de missie-tik in `achievementtracker.js:156`).
- De documentatie zegt het zelf: `docs/GEBIEDEN.md:136` — "Er is geen aparte cutscène bij een veroverd gebied: een kaartje met titel, grapje en geld, en een vlag op de kaart."
- Verder is er de kaartlaag **Veroverd** (`mapview.js`, vlag + titel bij aanwijzen) en het tabblad **Loopbaan › Veroverd** (`veroverdpanel.js:19-47`, `gebiedenui.js`).

---

## 3. Raamwerk voor de verover-cutscene

### 3.1 Trigger: waar, wanneer, en vooral: niet meteen

**Plaats in de code:** `betaal()` is de enige juiste haak, maar daar moet **niet** gespeeld worden. Daar wordt alleen *gemeld* dat er iets te vieren is:

- `gebiedenlive.betaal()` → `w.veroverWacht.push({ gebied, titel, geld, vlag, huis, regel, at })` (klein, geen DOM, geen THREE; `gebiedenlive.js` blijft puur).
- Een nieuwe module `wijktour.js` leest die wachtrij in een tick die al per frame loopt: `updateAchievementTracker(dt, w)` (`achievementtracker.js:142`, met `dt`), of — netter — een eigen `updateWijktour(dt, w)` die daar wordt aangeroepen naast `bezoekPlek` (`achievementtracker.js:107`).

**Wanneer:** pas als de speler rustig is, met dezelfde poorten als `checkWijk()` (`cinematics.js:797-824`) plus de busy-laag:

| Poort | Bron |
|---|---|
| geen film actief, geen banner | `isCinematicActive()`, `isBannerUp()` (`cinematics.js`) |
| geen respawn | `w.pendingRespawn` (`busy.js:34`) |
| niet gezocht | `w.wanted === 0` (zoals `cinematics.js:810`) |
| uit een voertuig of < 12 m/s | `hoofdspeler(w).inVehicle`, `WIJK_MAX_SPEED` (`cinematics.js:47`) |
| geen missie/race/bijbaan/minigame/padel/heli/duif/trein | `playerBusy(w)` met `BUSY_ALL` (`busy.js:13-29`, `46-50`) |
| niet in pauzemenu of kaart | `isPauseMenuOpen()`, `isMapOpen()` (`pausestate.js`), al geïmporteerd in `cinematics.js:8` |
| geen overlay/resultaatkaart | `isOverlayHeld(...)` (`overlayhold.js`) |
| aandachtbudget | `mayInterrupt('veroverd', w)` (`attention.js:33`) — **vereist een nieuwe regel in `hudbus.js`**, zie F3 |
| rustmoment na de beloning | minimaal ~2 s (`performance.now() - w.veroverWacht[i].at > 2000`), zodat het 7 s-bericht niet wegvalt |
| niet tijdens de intro of het verhaal | `isIntroPlaying()`, `narrativeBusy()` (`narrative.js`) |

**Waarom niet meteen:** de verovering valt vrijwel altijd samen met het einde van een minigame of bijbaan (F1). Meteen spelen betekent: een camera die uit een kartbaan of uit een sluitend winkelmenu trekt. De wachtrij met een rust-poort is de bestaande oplossing van dit spel voor precies dit probleem (`checkWijk` doet het al, en `w.quietUntil` bestaat).

**Als de speler nooit rustig wordt:** na 60 s niet meer automatisch proberen, maar een knop **"Bekijk de intocht"** in Loopbaan › Veroverd (`gebiedenui.js`, naast "Reis erheen") en in het beloningskaartje. Zo verliest niemand de scène.

### 3.2 Eenmalig per save (of per speler?)

Let op het model: het gebiedprofiel staat **niet** in de savegame. Het is `gde-gebieden-v1` (`storagekeys.js:86`), per speler en per apparaat, en `savegame.js` bevat geen `beloond` (gegrepen op `beloond` in `game/js/*.js`: alleen `gebieden.js`). Gevolg:

- `p.beloond` (`gebieden.js:167`) is de bestaande "deze wijk is veroverd"-marker, maar hij overleeft een nieuw spel. Een scène die "eenmalig per save" moet zijn, kan daar niet op hangen.
- **Advies:** voeg een aparte lijst `p.tours` toe (id's van gebieden waarvoor de intocht gespeeld is), met dezelfde normalisatie/limieten als `beloond` (`gebieden.js:167-198`, `MAX` 600). Dan kan de speler in een nieuwe save de intocht opnieuw zien (of niet, als je `p.tours` bewust laat staan — kies en documenteer).
- **Nooit** de wachtrij vullen vanuit `zaai()` (`gebieden.js:276-290`): dat zet in één keer tientallen gebieden op `beloond` (oude speler, nieuwe sleutel, nieuwe grenzen). Alleen `betaal()` mag de wachtrij vullen. Zie F6.

### 3.3 Samen spelen

De verovering is **per speler** (`docs/GEBIEDEN.md:107-108`: elke speler telt op zijn eigen apparaat; `coopDeel` doet hier niets). Daaruit volgt de belangrijkste ontwerpkeuze:

- **Speel de intocht lokaal, per speler, zonder netwerk.** Iedere speler die zijn eigen wijk verovert, ziet zijn eigen intocht op zijn eigen scherm. Dat is exact zoals de bestaande wijkflyover werkt (lokaal, `wijkSeen` in `localStorage`) en het kost **geen** coöp-pakket.
- **Waarom niet via `cutscenehost`/`coopcut`:** het pakket heeft een harde limiet van **32.000 tekens** (`CUT_MAX_CHARS = CUT_CHUNK * CUT_MAX_CHUNKS` = 800 × 40, `coopcut.js:11-13`) en `cutStukken()` geeft bij overschrijding **stil een lege lijst** terug (`coopcut.js:32-38`) — dan speelt de host wel en de gasten niets. Een tour met 5 stops, 6 acteurs en 6 lijnen kan daar tegenaan lopen. Zie F4.
- **Als de eigenaar tóch wil dat iedereen meekijkt:** gebruik `playScript()` (`cutscenehost.js:267-337`) met een *compacte* def (weinig acteurs, geen props) en accepteer dat een gast de wijk van de host misschien niet zelf veroverd heeft. Zet er dan een regel bij in `docs/COOP-GAST.md` (die heeft nu **geen** verover-sectie, zie F12). Het alternatief — een "de gastheer bekijkt een filmpje"-laag (`coopscene.js`) — is voor 20–40 s te lang.
- De beloning zelf (geld, titel, huis) blijft van de speler die veroverde; de scène verandert daar niets aan.

### 3.4 Duur en opbouw (20–40 s)

Advies: **28 s** als standaard, 20 s voor een kleine wijk (2 taken), 40 s voor Centrum. Opbouw in vijf bedrijven:

| Bedrijf | Tijd | Wat |
|---|---|---|
| 1. Overzicht | 0–6 s | hoog boven de wijk, de grens volgt bijna, de naam in beeld (kicker "Veroverd") |
| 2. Stop 1 | 6–12 s | het eerste unieke punt: landmerk, safehouse of de plek van de belangrijkste taak |
| 3. Stops 2–3 | 12–24 s | 2–3 korte stops, elk 4–5 s, wisselend hoog/laag (straat, dak, water) |
| 4. Stops 4–5 (optioneel) | 24–30 s | alleen als de wijk genoeg heeft (Centrum, Oud-Zuid) |
| 5. Eindshot | 30–36 s | laag over de wijk terug naar de speler, titel + vlagkleur + "Wijkheld van …" |

Vuistregel: **3–5 stops** (het budget van `wijkHighlights` is 3, `cinematics.js:829`), één regel per stop, maximaal 2 stemmen (Rikus + één bewoner). Geen stop zonder beweging: de camera moet in elk bedrijf minimaal één keer van richting of hoogte veranderen.

### 3.5 Camera

Twee opties, met een duidelijke voorkeur:

**Voorkeur: een nieuwe tourbaan op `pathShot`.** `cutscript` kan een wereldtour niet aan (F8): de shots zijn `cut`/`dolly`/`orbit`/`follow` in **lokale** coördinaten rond een anker (`cutscript.js:26`, `309-345`), met een maximum van 10 s per shot en 9 s stilstand (`cutscript.js:125-130`). Een wijk is 1–3 km breed. `camerapath.js` is juist voor dit werk gemaakt: `pathShot()` (`20-30`), `roofAt()` (`34-42`), `clearKeys()` (`79-88`), `roofline()`/`clearPath()` (`143-175`) en het voorbeeld `wijkStreetShot()` (`177-216`).

Nieuwe functie in `game/js/wijktour.js`:

```js
// keys: overzicht → stops → eindshot; clearPath tilt elk been over de daken
export function wijkTourShot(w, gebied, stops, behind) {
  const c = { x: gebied.x, y: gebied.y };
  const keys = [
    { pos: W(c.x, 90, c.y), look: W(c.x, 0, c.y), fov: 50 },          // 1 overzicht
    ...stops.map((s) => ({ pos: W(s.x, s.h ?? 14, s.y), look: W(s.lx ?? s.x, s.lz ?? 2, s.ly ?? s.y), fov: 54 })),
    { pos: behind.pos, look: behind.look, fov: 58 },                   // 5 eindshot bij de speler
  ];
  return pathShot(clearPath(w, keys), easeInOut);
}
```

- **Hoogte:** minimaal `roofline(...) + 3` per been (`camerapath.js:166-175`), zoals `wijkStreetShot` doet.
- **Prewarm:** `prewarmPoints()` / `registerShots` met de posities en kijkpunten (zie `prepWijk`, `cinematics.js:890-895`), anders zie je gaten en LOD-popping bij een tocht van 400 m.
- **Hergebruik `wijkStreetShot`** voor hooguit één been (de straatstop): hij kiest één rechte straat binnen 260 m van de speler (`camerapath.js:113-140`) en is met 110 m te kort voor de hele scène (F9).
- **Terugkeer:** eindig met dezelfde `behindPose(w, 8, 3.8)` die `playWijk` gebruikt (`cinematics.js:901`), dan landt de camera precies achter de speler en is er geen sprong.

### 3.6 Wat je ziet: data-gedreven stops (geen 123 handgeschreven scènes)

De catalogus weet al wat er in een wijk ligt. Gebruik dat als scenario:

1. **Taken als stops.** `ind.gebied.get(id).taken` (`gebieden.js:104-142`) geeft de id's; `ind.taak.get(id)` geeft naam, soort en x/y. Voor Centrum zijn dat er 38 — kies er 3–5 met de hoogste "uniekheid": een missie > een bijbaan > een minigame, en binnen de minigames de grote (kermis, carillon) boven de kleine.
2. **Landmarks.** `w.map.meta.landmarks` (gebruikt in `wijkHighlights`, `cinematics.js:828-840`) — maar let op: die functie kiest op afstand tot het dichtstbijzijnde buurtpunt, niet tot de wijk. Voor de tour moet je de landmarks **binnen de wijkpolygoon** nemen (`grenzen.js:39`), anders krijg je de Martinitoren in Oud-Zuid.
3. **Het safehouse.** `huisVan()` (`gebieden.js:337-342`) geeft de plek en het verzonnen adres; de vlag op het dak groeit mee met de inrichting (`docs/GEBIEDEN.md:125-126`). Een stop bij "jouw" huis is de goedkoopste persoonlijke noot.
4. **Bewoners en voertuigen.** Geen nieuwe systemen: de wereld heeft al voetgangers, fietsers en verkeer. Zet hooguit één handmatige figuur neer (een buurvrouw die zwaait) via de bestaande modellen, zoals `cutscenes.js` doet met `BUURVROUW`/`FIETSER_A` (regels 6-8). In een tour op 20 m hoogte zijn acteurs toch klein.
5. **Unieke props per wijk.** Alleen voor de 8–11 wijken die het halen: één prop per wijk (een kermisattractie, een hijskraan, een roeiboot). Houd het bij de bestaande `PROP_KINDS` (`cutscript.js:24`) of de wereldprops; geen nieuwe modelbibliotheek.

Voor de wijken die alleen door padelbanen of havens veroverbaar zijn (Nieuw-Oost, Nieuw-West, Zuidoost, Oud-West) is de "stop" dus de baan of de haven — dat is niet erg, als de scène dat erkent: "Drie padelbanen en een parkeerterrein. Toch is het van jou." (toon, geen letterlijke tekst).

### 3.7 Audio, ondertitels, naamkaarten

- **Stem:** de bestaande weg. `lineVoiceFor('', text)` + `playStoryVoice()` (`cinematics.js:878-879`) of de verhaalstem van Rikus; één regel per stop, met ondertitel via `lines: [{ speaker, text, at, dur }]` in `playCinematic`.
- **Muziek:** `registerMusicProbe` bestaat (`safehuizen.js:417-419`); een korte "overwinnings"-muzieklaag is een aparte keuze, geen onderdeel van deze scène.
- **Naamkaarten:** `setNameCard(text)` (gebruikt door `cutscenehost.js:316`) voor een bewoner; de **titel** van de wijk zet je in de eindkaart via `kicker`/`title` van `playCinematic` (`cinematics.js:114`), niet via `fx 'naam'` (dat hoort bij `cutscenes.js`).
- **Vlag:** er is geen 3D-vlagmodel voor een veroverd gebied (de vlag bestaat op de kaart, `gebieden.js:37-41`). De goedkoopste oplossing: een 2D-eindkaart in de vlagkleur (`beloningVan().vlag`) met de titel; een 3D-vlag hijsen kan later.

### 3.8 Skip, letterbox, HUD

- `playCinematic` met `priority: 3`, `pause: true`, `letterbox: true`, `skippable: true`, `hideHud: true`, `keepMotion: false` (de wereld staat stil; `playWijk` gebruikt juist `keepMotion: true` omdat het een korte flyover is — voor 30 s intocht is stilstand beter).
- Overslaan: Spatie 0,9 s vasthouden (`SKIP_HOLD_S`, `cinematics.js:32`); de hint staat al in de DOM (`cinematics.js:118-119`).
- Na de scène: het 7 s-bericht van `betaal()` is dan al voorbij (het staat 2 s voor de scène in de wachtrij). Zet het geld en de titel **in de eindkaart** in plaats van in het bericht, of juist andersom: bericht direct, scène later — kies één van de twee, anders zie je dezelfde tekst twee keer (F13).

### 3.9 Waar het in de code hoort (bestands-/functieplan)

| Bestand | Wat | Regels (schatting) | Risico |
|---|---|---|---|
| **nieuw** `game/js/wijktour.js` | wachtrij, poorten, `wijkTourShot()`, `speelWijkTour()`, stops uit de indeling | ~250 | laag; pure camera + kleine DOM-glue |
| **nieuw** `game/js/wijktourdata.js` (optioneel) | alleen de handgeschreven regels/props per wijk (8–11 stuks) | ~120 | laag; data |
| `game/js/gebiedenlive.js` | `betaal()` vult `w.veroverWacht` (geen DOM) | +6 | laag; blijft puur |
| `game/js/achievementtracker.js` | `updateWijktour(dt, w)` naast `bezoekPlek` (r. 107/142) | +3 | laag |
| `game/js/hudbus.js` | `MOMENTS.veroverd` + eventueel `RATION` | +1 | **midden**: raakt het aandachtssysteem van alle momenten |
| `game/js/gebieden.js` | `p.tours` in profiel/normaliseer/voegSamen | +8 | midden: migratie van bestaande profielen |
| `game/js/settings.js` | schakelaar "Intochten" (net als `wijkFilm`) | +2 | laag |
| `game/js/hud_panel.js` | titel na verovering (zie F11) | +3 | laag |
| **nieuw** `scripts/wijktour_test.mjs` | pure test: elke veroverbare wijk levert een geldige baan, geen NaN, elke stop binnen de polygoon | ~120 | laag |
| `docs/GEBIEDEN.md`, `docs/COOP-GAST.md` | de regel "intocht per speler, lokaal" | +10 | laag |

**Alternatieven die ik afraad:** uitbreiden van `cinematics.js` (1229 regels, doet al wijk, landmerk, crash, wanted, missie-intro's) of `cutscenehost.js` (lokale coördinaten, acteurs, 4 shottypes — ongeschikt voor een wereldtour).Een uitzondering: de **provincie-finale** mag wél een `cutscenehost`-scène op één plein zijn.

---

## 4. Relatie met de bestaande wijk-scène

Advies: **laten staan, niet vervangen.** De eerste-bezoek-kaart is een oriëntatiemoment (waar ben ik, wat is hier), de intocht is een beloningsmoment (wat heb ik gedaan). Ze mogen niet in elkaar schuiven.

| Bestaand | Wat ermee |
|---|---|
| `WIJK_LINES` (`cinematics.js:687-726`) | **houden.** Het is de stem van Rikus bij binnenkomst en de HUD-regel. De intocht kan dezelfde toon gebruiken, maar niet dezelfde regel: één regel per scène, en de intochtregel gaat over de verovering, niet over de buurt. |
| `WIJK_ALIAS` / `WIJK_GENERIC` (`727-741`) | houden; alleen relevant voor de kaart, niet voor de intocht. |
| `wijkHighlights()` (`828-840`) | **houden voor de kaart**, niet hergebruiken voor de intocht: hij zoekt binnen 700 m van het dichtstbijzijnde buurtpunt en levert dus niet de landmark van de *wijk*. De intocht gebruikt de catalogus (§3.6). |
| `wijkFilm` / `playWijk()` (`897-909`) | houden als optie voor het eerste bezoek. Overweeg hem **uit te zetten voor de wijken die een intocht krijgen** (of prioriteit te verlagen), anders krijgt de speler binnen enkele minuten twee films over dezelfde wijk. |
| `wijkenSeen` (`gde-wijken-seen`, `storagekeys.js:41`) | **niet** hergebruiken voor de intocht: dat is per installatie en per buurt, niet per gebied en niet per speler. Nieuwe lijst `p.tours` (§3.2). |
| HUD-plaatsnaam (`wijkBlurb`, `hud_panel.js:742`) | laten, maar **uitbreiden**: als de wijk veroverd is, de titel als kicker tonen ("Wijkheld van Oud-Zuid"). Dat is de goedkoopste beloning die er is (F11). |
| De kaartlaag en het tabblad Veroverd | ongewijzigd; voeg daar de knop "Bekijk de intocht" toe (§3.1). |

Wat je **niet** moet doen: de bestaande kaart korter maken om ruimte te maken voor de intocht. De kaart is 5–12 s en komt op een ander moment; de intocht komt pas als de speler rustig is.

---

## 5. Andere lagen: wat verdient ook een scène?

| Laag | Aantal | Veroverbaar (meting) | Advies | Budget |
|---|---|---|---|---|
| **Buurt** | 644 | 11 | **Geen scène.** De bestaande kaart + het "x van y gedaan"-kaartje (`meldVoortgang`, `gebiedenlive.js:120-130`) is genoeg. Hooguit een stempel in de HUD. | 0 s |
| **Woonplaats** | 202 | 3 | **Korte scène, 8–12 s**, zelfde motor met 1–2 stops; alleen voor de 3 veroverbare (en alleen als ze niet in de stad liggen, anders is het dubbelop met de wijk). | 3 × 10 s |
| **Gemeente** | 10 | 6 | **15–20 s**, 3 stops: gemeentehuis, het centrum, de rand. Dit is de laag waar "de baas van …" het meest verdiend wordt. | 6 × 18 s |
| **Provincie** | 1 | 1 | **40–60 s finale**, 6–8 stops over de provincie (Eemsdelta, Hogeland, Veenkoloniën, Oldambt, Westerkwartier, stad). Dit mag de duurste scène van het spel zijn; hij komt één keer. | 1 × 50 s |
| **Wijk** | 123 | 8 (× 4 kandidaten) | **20–40 s**, de kern van deze opdracht. | 8–11 × 28 s |

Totaal aan scènes: **18–21** (8–11 wijken + 3 woonplaatsen + 6 gemeenten + 1 provincie). Als je alleen de wijken doet: 8–11. Als je ook de kandidaten meerekent: maximaal 11 wijken + 10 andere = 21. Dat is te overzien; 123 wijken authoreren is dat niet.

**Spaarzaamheid:** de provincie-finale en de gemeenten zijn de enige die je echt met de hand moet schrijven (eigen regels, eigen stops). De wijken kunnen voor 80% uit de catalogus komen (§3.6). De woonplaatsen kunnen dezelfde automaat zijn met één stop.

---

## 6. Bevindingen in het huidige systeem

Severity: **Kritiek** (blokkeert de opdracht of kost spelers een scène), **Hoog** (groot effect of veel werk later), **Midden** (merkbaar, met een omweg op te lossen), **Laag** (kwaliteit/documentatie). Labels: `impact-hoog/midden/laag`, `kosten-S/M/L`.

### F1 — De verovering is een HUD-bericht van 7 s, en er is geen haak om op te hangen
- **Waar:** `game/js/gebiedenlive.js:132-136` (`betaal`), `:139-148` (`doeTaak`), `:151-158` (`opSleutel`).
- **Wat/scenario:** de speler maakt de laatste taak van een wijk af (kartbaan, padelbaan, bijbaan). `betaal()` zet geld bij en duwt één bericht van 7 s in de HUD. Daarna is er niets: geen camera, geen muziek, geen vlag, geen titel in beeld. `docs/GEBIEDEN.md:136` bevestigt dat dit zo bedoeld is.
- **Impact:** het grootste moment van het gebiedsysteem voelt als een toast. Een lange cutscene kan hier niet aan hangen zonder de functie aan te passen; en wie hem *in* `betaal()` start, start hem midden in het slot van een minigame.
- **Fix:** `betaal()` laat de beloning in een wachtrij zetten (`w.veroverWacht`), een tick in `achievementtracker` speelt hem als de speler rustig is (§3.1). Geen DOM in `gebiedenlive.js`.
- **Labels:** `impact-hoog`, `kosten-S`.

### F2 — Geen rust-poort: de verovering valt samen met het einde van een minigame of dienst
- **Waar:** `gebiedenlive.js:139-148` (aanroep), `game/js/busy.js:13-29` (`BUSY_ALL`), `game/js/loopbaanlive.js` (`loopbaanTel`), `achievements.js` (`recordStat`).
- **Wat/scenario:** vrijwel elke taak meldt zich op het moment dat een scherm sluit (kartresultaat, padeluitslag, dienst-einde). Een scène die daar begint, trekt de camera uit een menu of minigame-HUD.
- **Impact:** eerste indruk van de duurste scène van het spel is "kapot".
- **Fix:** poorten zoals `checkWijk` (`cinematics.js:797-824`) plus `playerBusy(w)`; minimaal 2 s rust; anders wachten of overslaan naar de knop.
- **Labels:** `impact-hoog`, `kosten-S`.

### F3 — Het aandachtbudget kent geen "veroverd"-moment
- **Waar:** `game/js/hudbus.js` (`MOMENTS`: alleen `wijk`, `landmark`, `ommelanden`, `crash`, `wanted5`; `RATION.GLOBAL_GAP = 40`, `AFTER_HIGHER = 20`), `game/js/attention.js:33-46`.
- **Wat/scenario:** de speler veroverde net een wijk vlak na een andere onderbreking (landmerk, wijkkaart). `mayInterrupt('veroverd')` bestaat niet; als je `'wijk'` hergebruikt, blokkeert de 210 s-cooldown van `wijk` je intocht, en de 40 s globale gap kan net na de beloning een blokkade geven.
- **Impact:** de intocht wordt stil overgeslagen, of hij duikt op een moment dat een andere kaart al op het scherm staat.
- **Fix:** `MOMENTS.veroverd = { level: 'reward', group: 'reward', cooldown: 0, fast: false }` (of 'story' als je hem altijd wilt), en de intocht boekt zijn moment met `noteMoment('veroverd')`.
- **Labels:** `impact-hoog`, `kosten-S`.

### F4 — Coöp-pakket: 32.000 tekens, en bij overschrijding valt de scène stil weg
- **Waar:** `game/js/coopcut.js:11-13` (`CUT_CHUNK`, `CUT_MAX_CHUNKS`, `CUT_MAX_CHARS`), `:32-38` (`cutStukken` geeft `[]`).
- **Wat/scenario:** de host speelt een intocht met 5 stops, 6 acteurs, 6 props en 8 lijnen; `JSON.stringify(pakket).length > 32000` → `cutStukken` geeft een lege lijst, `cutHostStart` stuurt niets, de gasten zien niets en de host wel. Geen foutmelding.
- **Impact:** in Samen spelen ziet de helft van de spelers de scène niet, zonder dat iemand het merkt.
- **Fix:** **niet** via coöp sturen (de verovering is per speler, §3.3). Wil je het toch: een test die de pakketgrootte van elke tour meet, en een `cutSpoor`-melding als hij te groot is.
- **Labels:** `impact-hoog`, `kosten-S`.

### F5 — Twee betekenissen van "wijk" naast elkaar
- **Waar:** `cinematics.js:765-773` (`currentWijk` op `map.meta.neighbourhoodPoints`, 66 buurtpunten), `:687-726` (`WIJK_LINES` op buurtnamen) tegenover `gebieden.js:36-42`/`grenzen.js` (CBS-wijk: 123 in de provincie, 20 in de stad) en `achievements.js:102-104` (`wijken_10/33/alle` op de 66).
- **Wat/scenario:** de speler veroverd "Oud-Zuid" (CBS-wijk) en krijgt de titel "Wijkheld van Oud-Zuid"; de eerste-bezoek-kaart zei "Stadspark" of "Herewegbuurt" (buurt). De scène die de verovering viert, moet kiezen welke naam hij noemt.
- **Impact:** verwarring in tekst, HUD, prestaties en scènes; de scenenaam kan niet één-op-één op de bestaande `WIJK_LINES` worden gemapt.
- **Fix:** de lagen consequent benoemen (bijv. "buurt" voor de 66, "wijk" voor de CBS-laag), in de intocht de **CBS-naam** gebruiken en de buurtregels alleen als stem voor een stop.
- **Labels:** `impact-hoog`, `kosten-M`.

### F6 — Zaaien zou een lawine aan scènes kunnen geven
- **Waar:** `gebieden.js:276-290` (`zaai`), `gebiedenlive.js:105` (zaaien bij een nieuwe indeling), `:110-118` (`zaaiAlsNodig`).
- **Wat/scenario:** een speler met een oude save krijgt bij de eerste start tientallen gebieden op `beloond` (zonder geld). Als de intocht op `p.beloond` let in plaats van op `betaal()`, staan er meteen 20 scènes in de wachtrij.
- **Impact:** een spervuur van cutscènes bij het opstarten; de speler drukt ze allemaal weg.
- **Fix:** de wachtrij uitsluitend vullen vanuit `betaal()`; `zaai` nooit laten melden. En `p.tours` niet vullen bij zaaien.
- **Labels:** `impact-hoog`, `kosten-S`.

### F7 — "Eenmalig per save" kan niet op het gebiedprofiel
- **Waar:** `storagekeys.js:86` (`gde-gebieden-v1`), `gebieden.js:167` (`nieuwProfiel`), `savegame.js` (geen `beloond`; grep bevestigt dat `beloond` alleen in `gebieden.js` voorkomt).
- **Wat/scenario:** de eigenaar wil de intocht "eenmalig per save". Het profiel is per speler/apparaat en overleeft een nieuw spel. `p.beloond` is dus te grof; een nieuwe save ziet de intocht nooit meer.
- **Impact:** of de speler mist de scène in een replay, of hij ziet hem elke keer opnieuw; beide zijn verkeerd en het is duur om later te repareren (migratie).
- **Fix:** nu beslissen: `p.tours` (per speler) of een save-gebonden lijst in `savegame` (dan moet het profiel erbij kunnen). Documenteren in `docs/GEBIEDEN.md`.
- **Labels:** `impact-midden`, `kosten-M`.

### F8 — `cutscript` kan een wereldtour niet uitdrukken
- **Waar:** `game/js/cutscript.js:26` (`SHOTS = ['cut','dolly','orbit','follow']`), `:121-130` (eerste shot op t=0, max. 10 s per shot, 9 s stilstand).
- **Wat/scenario:** iemand probeert de intocht als `cutscenes.js`-data te schrijven (dat is de vorm die de verhaalscènes hebben). De coördinaten zijn lokaal rond een anker van enkele meters; een wijk van 2 km past daar niet in, en de validator weigert lange shots.
- **Impact:** verkeerde tool, veel verloren werk, of een scenelanguage die voor één scène wordt opgerekt.
- **Fix:** de intocht op `camerapath.js` bouwen (§3.5); `cutscript` houden voor scènes op één plek (de provincie-finale).
- **Labels:** `impact-midden`, `kosten-M`.

### F9 — `wijkStreetShot` is te kort en kiest niet de identiteit van de wijk
- **Waar:** `game/js/camerapath.js:113-140` (`pickWijkStreet`: binnen 260 m van de speler, 110 m recht stuk), `:186` (`WIJK_RUN = 110`), `cinematics.js:905` (11 s).
- **Wat/scenario:** de bestaande flyover kiest de langste rechte straat bij de speler. Voor een tocht van 30 s en 400 m over de wijk is dat één been, en het kan dezelfde straat zijn als de buurman-wijk.
- **Impact:** een intocht die alleen "een straat" laat zien, niet wat de wijk uniek maakt.
- **Fix:** nieuwe `wijkTourShot` met stops uit de catalogus; `wijkStreetShot` als één straatstop.
- **Labels:** `impact-midden`, `kosten-M`.

### F10 — De "korte scènes" zijn meestal geen film: de flyover staat standaard uit
- **Waar:** `game/js/settings.js:60` (`wijkFilm: false`), `cinematics.js:808` (`momentsOn() && getSettings().wijkFilm === true`).
- **Wat/scenario:** de eigenaar wil "de korte scènes/kaarten per wijk (nu bij eerste bezoek)" vervangen. In de praktijk is dat bij de meeste spelers de **naamkaart** van 5–12 s, niet de flyover.
- **Impact:** de opdracht wordt onderschat: er is geen bestaande film om te verlengen, er is een kaart om te vervangen én een nieuwe film te maken.
- **Fix:** in de planvorming de kaart en de film als twee dingen behandelen; de intocht is nieuw werk, geen uitbreiding.
- **Labels:** `impact-midden`, `kosten-S` (alleen de juiste verwachting).

### F11 — De HUD voelt niets van een verovering
- **Waar:** `game/js/hud_panel.js:742` (`wijkBlurb`), `cinematics.js:747-750`; het gebiedsprofiel wordt daar niet gelezen.
- **Wat/scenario:** na de intocht staat er nog steeds dezelfde buurtregel in de HUD; de titel bestaat alleen in het tabblad Veroverd en op de kaart.
- **Impact:** de beloning zakt weg; een van de goedkoopste manieren om de intocht te laten landen, blijft ongebruikt.
- **Fix:** in `hud_panel.js` bij een veroverde wijk de titel als kicker ("Wijkheld van …"), met de vlagkleur uit `beloningVan().vlag`.
- **Labels:** `impact-midden`, `kosten-S`.

### F12 — De documentatie zegt "geen cutscène" en samen spelen is niet beschreven
- **Waar:** `docs/GEBIEDEN.md:136`; `docs/COOP-GAST.md` (geen sectie over veroveren; grep op "verover|gebied" geeft alleen toevallige treffers op r. 51 en 163).
- **Wat/scenario:** de nieuwe regel (intocht per speler, lokaal, eenmalig) moet ergens staan, anders maakt de volgende sessie hem opnieuw anders. `AGENTS.md` verplicht bij elke nieuwe functie een regel over Samen spelen.
- **Impact:** de volgende agent bouwt een tweede, afwijkende intocht of stuurt hem wél naar gasten.
- **Fix:** `docs/GEBIEDEN.md` (wat de speler ziet), `docs/COOP-GAST.md` (per speler, lokaal, geen netwerk), en de changelog-regel.
- **Labels:** `impact-midden`, `kosten-S`.

### F13 — De beloning is een string, geen data
- **Waar:** `gebiedenlive.js:135` (één template met titel, regel, `+€`, huissleutel), `gebieden.js:247-253` (`beloningVan` geeft wél `{ titel, geld, vlag, regel, huis }`).
- **Wat/scenario:** de scène heeft de vlagkleur, het bedrag en de titel nodig; `betaal()` gooit die weg en maakt er één regel tekst van.
- **Impact:** de scène moet de tekst weer uit elkaar peuteren of `beloningVan` opnieuw aanroepen (kan, maar dan twee bronnen).
- **Fix:** `b` ongewijzigd doorgeven aan de wachtrij; de kaart/het bericht uit dezelfde data opbouwen.
- **Labels:** `impact-laag`, `kosten-S`.

### F14 — Geen prewarm of dedup voor een tocht over 400 m
- **Waar:** `cinematics.js:889-895` (`prepWijk`/`prewarmPoints`), `:673-678` (`playCinematic` met `shot`).
- **Wat/scenario:** de bestaande flyover prewarmt vier punten van één straat. Een tour met 5 stops over de wijk vraagt om 8–12 punten, anders laadt de wereld tijdens de scène en zie je gaten of LOD-popping.
- **Impact:** zichtbaar haperen in de duurste scène; op de webversie erger dan in Electron.
- **Fix:** `shotPoints()`/`prewarmPoints` over de hele baan (elke 25–30 m), en de eerste seconde van de scène als "inloop" gebruiken.
- **Labels:** `impact-midden`, `kosten-S`.

---

## Top 5 quick wins

1. **Wachtrij in `betaal()`** (`gebiedenlive.js:132-136`): beloning erbij, scene later. Zonder deze haak kan niets van §3. Kost: S. Ontgrendelt alles.
2. **Rust-poort + `MOMENTS.veroverd`** (`hudbus.js`, `attention.js`): één regel in de tabel en een poort zoals `checkWijk`. Kost: S. Voorkomt de twee ergste fouten (scène in een menu, scène die nooit komt).
3. **Stops uit de catalogus** (`ind.gebied.taken`): geen 123 handgeschreven scènes, maar 8–11 data-gedreven intochten. Kost: S/M. Maakt het verschil tussen "een film per wijk" en "een film voor de wijken die tellen".
4. **Titel in de HUD** na verovering (`hud_panel.js:742`). Kost: S. De goedkoopste beloning die er is, en hij versterkt de intocht.
5. **De regel opschrijven** in `docs/GEBIEDEN.md` en `docs/COOP-GAST.md`: intocht per speler, lokaal, eenmalig, skipbaar. Kost: S. Voorkomt een tweede, afwijkende implementatie.

---

## Wat ik niet heb bekeken

- **Geen runtime, geen Electron, geen spel, geen testsuite**: alles is statisch. Ik heb niet gezien hoe de scène er in de praktijk uitziet, hoe de camera door de stad loopt of hoe de HUD zich gedraagt.
- **De 29 niet-geplaatste taken**: 12–16 missies met een berekende start (o.a. `Wind tegen`, `Fatbikes`, `De dijk`, `Laag over het graan`, `Vlieg Dijkstra's lunch`), 2 bijbanen en 11 minigame-plekken (o.a. de pannenkoekenboot; de precieze rest heb ik niet kunnen achterhalen). Daardoor is §1.2 een ondergrens en §1.3 een kandidatenlijst.
- **De wereldkaart** (`game/world/`, niet in git): de weg- en gebouwsnapping van bijbanen (`initSideJobs`, `spreadSpot`, `escapeBuilding`) kon ik niet naspelen; vandaar de ± bij bijbaanlocaties.
- **`game/grenzen.json` is één regel**; ik heb de 20 stadswijken niet allemaal bij naam kunnen controleren. De namen in §1.2/§1.3 komen uit de run; de overige 92 hadden geen taak.
- **Audio/TTS**: niet gecontroleerd of er stemmen bestaan voor nieuwe intochtregels, en wat een nieuwe TTS-ronde kost.
- **De webversie en de UI-opmaak** van een 30 s-scène (letterbox, ondertitels, skip-hint) heb ik niet in beeld gezien.
- **Niet gelezen**: de volledige `gebiedenui.js`, `gebiedenkaart.js`, `mapview.js`, `coopscene.js`, `savegame.js` (alleen op `beloond` gegrepen), `desktop/*`.
- **De map `.cutscene-review` is tijdens het werk van buiten mijn sessie leeggemaakt** (het wegwerpscript en de ruwe uitvoer verdwenen; daarna viel de shell uit op een sandbox-backend). De cijfers komen uit de laatste volledige run; ik heb ze niet opnieuw kunnen draaien.

---

*Reviewer/ontwerper, statische review. Geen bestaande bestanden gewijzigd, geen commits, geen GitHub, geen `.env`, `desktop/main.js` niet aangeraakt.*
