# System architecture

## Overzicht

Eén spel, drie schillen. De gamecode in `game/js` is één graaf van ES-modules die
in de browser, in Electron en via Capacitor op Android draait. Er is geen server
en geen database: de wereld is data, de voortgang staat lokaal.

## Context

```
        speler
          │
   ┌──────┴───────┬──────────────┐
   │              │              │
 browser        Electron      Android
 (web/build)    (desktop/)    (android/, Capacitor)
   │              │              │
   └──────► game/index.html ◄────┘
                  │
            game/js/main.js
                  │
    ┌─────────────┼──────────────┬─────────────┐
  World        streaming      audio/UI      net/
 (state)      (.gdt-tegels)  (HUD, stem)  (WebRTC)
                  │
            game/world/  ← build-time, niet in git
                  ▲
        scripts/world/ + worldbuilder.js
                  ▲
        OSM, PDOK, BAG, AHN (alleen lezen)
```

### Gebruikers

- **Speler**: speelt solo of Samen spelen (host + gasten, onderling gelijkwaardig).
- **Ontwikkelaar/eigenaar**: bouwt de wereld, draait tests, maakt releases.

### Externe systemen

- **OpenStreetMap / PDOK / BAG / AHN**: kaart- en hoogtedata, bij het bouwen.
- **STUN + openbare brokers**: alleen voor Samen spelen, end-to-end versleuteld,
  met toestemmingsmelding; geen accounts, geen IP-opslag.
- **Live buslocaties**: alleen ophalen, met uitzetter in Instellingen.

## Patroon

**Data-driven streaming wereld met één gedeelde state.** `World` is het enige
mutable stateobject; elk systeem bezit zijn eigen arrays en velden en leest de rest.
De wereld stroomt in tegels rond de speler; dezelfde code doet dat in Electron en
op het web.

## Componenten

| Component | Bestanden | Taak |
| --- | --- | --- |
| Boot en loop | `main.js` | `boot()`, `frame()`, vaste updatevolgorde |
| Wereld-state | `world.js` | `map`, `player`, `vehicles`, `peds`, `wanted`, `money`, ... |
| Streaming | `scene3d.js`, `tileworld.js`, `tilefocus.js`, `tilestore.js`, `gdt.js` | tegels laden, scene opbouwen, camera |
| Wereldbouw | `worldbuilder.js`, `scripts/world/*` | bronfeature → tegelrij (`.gdt`) |
| Speler en invoer | `player.js`, `input.js`, `controls.js`, `gamepad.js`, `touch.js` | beweging, toetsen, pad, touch |
| Voertuigen | `vehicle.js`, `heliflight.js`, `trailer.js`, `drift.js` | fysica, verkeers-AI, boten, schade |
| Peds en dieren | `pedestrians.js`, `pedroutes.js`, `wildlife.js` | lopen, routes, dieren |
| Politie en combat | `police.js`, `combat.js`, `crime.js`, `wantedstate.js` | wanted-level, kogels, effecten |
| Verhaal en missies | `missions.js`, `story.js`, `storyarc.js`, `missionstory.js`, `cutscenes*.js`, `cutscript.js` | missiestappen, scènes, regie |
| Samen spelen | `coopnet.js`, `coopglue.js`, `coopworld.js`, `coopspelers.js`, `net/*` | WebRTC-sessie, snapshot, gast-state |
| Opslag | `savegame.js`, `savemigrate.js`, `storagekeys.js`, `saveslots.js` | `gde-*`-sleutels, versies, migraties |
| Audio | `audio.js`, `speech.js`, `linevoice.js`, `radio.js`, `sfx/*` | muziek, stemmen, effecten |
| UI en HUD | `hud_panel.js`, `hudcards.js`, `hudbus.js`, `pausemenu.js`, `mapview.js`, `prompts.js` | HUD, menu's, kaart, prompts |
| Gates | `busy.js`, `activityhub.js`, `hudbus.js`, `latehooks.js` | wie mag wat wanneer |
| Desktop | `desktop/main.js`, `args.cjs`, `devtools.js` | venster, argumenten, testharnas |
| Web | `web/build.mjs`, `web/serve.mjs` | webversie bouwen en serveren |
| Android | `android/`, Capacitor | verpakken van dezelfde webapp |

## Gegevensstroom per frame

1. populatie bijhouden (verkeer, fietsers, bussen, boten, peds)
2. `player.update`, metgezel, kaart-overlay
3. verkeerslichten en verkeers-AI, boot-AI
4. politie, voertuig-botsingen, voertuigen te water
5. combat en kogels, peds, wildlife, luchtprops
6. missies, activiteiten, verhaal
7. audio, weer, `update3D`, `updateHud`, `input.endFrame()`

## Niet-functioneel

- **Prestaties**: 60 fps-doel op een gewone GPU; graphicspresets in `gfxprofile.js`,
  adaptieve kwaliteit en zichtafstand; benchmarks en perfscripts in `desktop/` en
  `scripts/perf/`.
- **Geheugen**: streaming met een vaste tegelstraal; gasten die objecten
  verwijderen geven geometrie vrij (`coopruim.js`).
- **Veiligheid**: geen secrets, geen spelersgegevens, geen IP-opslag; e2e-verkeer.
- **Toegankelijkheid**: instellingen voor bewegingsbeperking, HUD-schaal, kleuren
  met vorm naast kleur ([docs/](../) en WCAG-skills).

## Beperkingen

- Geen bundler: de import map en relatieve paden zijn de enige module-resolutie.
- Importcycli zijn verboden (grens 0); een nieuwe cyclus faalt de test.
- De wereld (`game/world/`) staat niet in git en moet gestaged worden voor 3D-tests.
- Eén Electron-instantie tegelijk.
- Alles wat een speler ziet of hoort is Nederlands; altijd zomer; geen echte merken.

## Belangrijke beslissingen

| Beslissing | Keuze | Waarom |
| --- | --- | --- |
| Coördinaten | RD New (EPSG:28992), verschoven oorsprong | echte kaartdata 1:1 |
| Wereld als data | `.gdt`-tegels, build-time gemaakt | streaming, niet in git |
| Geen bundler | import map | simpel houden, geen buildstap in dev |
| Eén `World` | gedeelde state, systeem bezit eigen velden | voorspelbare volgorde, geen globals |
| Pure kern + glue | rekenregels los van THREE/DOM | testbaar in Node |
| Saves lokaal | `localStorage` met migraties | geen accounts, geen server |

## Waar de bestandskaart staat

Deze spec geeft de regels en de componenten op hoofdlijnen. De volledige
bestandskaart met alle modules, secties en meetpunten staat in `ARCHITECTURE.md`
in de repo-root (ca. 200 KB). Die kaart is **naslag, geen spec**: grep erin op het
onderwerp dat je zoekt en lees hem nooit in zijn geheel. Wijkt de kaart af van de
code, dan is de kaart de fout en werk je hem bij in dezelfde commit.

De gebiedsspecs naast dit bestand:

| Spec | Gaat over |
| --- | --- |
| `constitution.md` | verwijzing naar `AGENTS.md`; geen tweede bron |
| `tech-stack.md` | de gebruikte techniek en waarom |
| `coding-standards.md` | stijl, naamgeving, modules, imports |
| `testing-standards.md` | de testfasen en wat een test moet bewijzen |
| `multiplayer.md` | Samen spelen: rollen, opdrachtstand, overdracht, PvP |
| `wereld.md` | wereld, kaart, tegels, provincie, POI's, gebieden |

