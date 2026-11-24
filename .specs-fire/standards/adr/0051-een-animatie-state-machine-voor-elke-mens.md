# 0051 - Eén animatie-state-machine voor elke mens

- **Status:** besloten (wens eigenaar 23-11-2026); ingevoerd in fasen
- **Datum:** 23-11-2026
- **Spec:** `.specs-fire/standards/wereld.md` (mensen), `game/js/animstate.js`, `docs/COOP-GAST.md`
- **Verwant:** ADR 0050 (modulaire mensen), ADR 0005 (pure regelmodule plus glue), epic 'Personages die leven'

## Context

Er waren vier animatiepaden: `animatePersonWalk` voor speler en voorbijgangers, `actoranim.js` voor cutscenes en decorsets, losse houdingen in `seatPose`, `swimPose`, `applyAttackPose` en per minigame, en nu de clips van de Quaternius-mensen. Elk pad had eigen overgangen (of geen), eigen IK en eigen regels voor wat over het netwerk gaat. Een nieuwe beweging moest op vier plekken landen en zag er per systeem anders uit.

## Besluit

Elke mens (speler, voorbijganger, cutscene-acteur, medespeler) heeft één gedeelde, datagedreven state-machine (`animstate.js`):

- **States:** idle, locomotion (1D-loopruimte op snelheid: idle, walk, run, sprint), sprint, start, stop, turn, jump, fall, land, swim, climb, sit, drive, ride, enter, exit, knockdown, getup, emote en cutscene. Bovenlijflagen met een botmasker: carry, phone, talk, gesture, wave.
- **Overgangen** staan in één tabel met een conditie (snelheid, grond, water, voertuig, cutscene) en een mengduur per overgang. Alleen de knip naar een cutscene mag zonder menging; een test bewaakt dat.
- **Lagen:** basislaag (state), bovenlijf (masker), additief (ademhaling, blik, lipsync, knipperen). Per state ligt vast welke lagen mogen.
- **IK als nabewerking** (`actorlife.js` en de modulaire IK): per state vastgelegd: voeten op de grond bij idle en lopen, handen aan stuur of stang bij drive en ride, zit-IK bij sit, niets bij fall en swim.
- **Afstandstrap:** dichtbij alles; middel zonder lipsync en IK; ver alleen de basislaag, met een lagere frequentie.
- **Netwerk:** alleen state-id, snelheid, richting en genormaliseerde tijd (vier bytes); de rest leidt elke speler lokaal af.
- **Val en ineenzakken** (besluit eigenaar 23-11): de state knockdown gebruikt de val uit de Universal Animation Library (Death01) voor de bestaande DOOD- en OPGEPAKT-afloop van de speler, voor NPC's die in het spel uitgeschakeld raken en in PvP. Buiten PvP zonder bloed, gore of getoonde verwonding: alleen de val, met de bestaande afloop (scherm, geldverlies). Wie uitgeschakeld blijft, blijft liggen (geen getup zolang `knocked`). Hit_Chest en Hit_Head mogen als reactie op klappen en botsingen. Constitutie 6 in AGENTS.md zegt dit in één zin.
- **Cutscenes** sturen states en triggers aan in plaats van eigen animatiecode. De clips van het pack worden aan de states gekoppeld; wat het pack niet heeft (zitten, rijden, fietsen, zwemmen, klimmen, dragen, telefoon) komt uit de bestaande procedurele houdingen, als bron voor dezelfde state.

## Afgewezen

- **Losse animatiecode per systeem** (zoals het was): vier keer dezelfde overgang, en een gast ziet iets anders dan de host.
- **Alleen procedureel:** goedkoop, maar de clips van het pack zijn beter in silhouet en timing, en een state-machine maakt bron (clip of formule) een detail.
- **three.js AnimationMixer als machine:** maakt per mens acties en interpolanten aan (allocaties), kent geen overgangsconditie, lagen of IK-regels, en is niet te serialiseren voor het netwerk.
- **Geen val, alleen een gekantelde mesh** (zoals het was): leest als een plank die omvalt; de eigenaar koos voor de val zonder bloed.
- **Volledige pose over het netwerk:** tientallen bytes per mens per snapshot; vier bytes zijn genoeg omdat de rest deterministisch volgt.

## Gevolgen

Fase 1 gebruikt de machine voor de modulaire voorbijgangers (`modularpeople.js`). Volgende stappen, elk met een test: de speler en zijn medespelers (`player.js`, `coopfigures3d.js`, de vier bytes in het snapshot naast de pose), daarna cutscenes (`actoranim.js` en `cutscenehost.js` sturen states aan), daarna zitten, rijden en minigames. `scripts/animstate_test.mjs` bewaakt de tabel, de menging, de lagen, de IK per state en de codering.

**Aanvulling 24-11 (vaste houdingen en alledaagse gebaren):** een voorbijganger met een vaste houding (`pedgeom.js setPedPose`: zitten, bellen, appen, praten, hurken, vissen, hengelen, sjouwen, kraam, boos, muziek) blijft een modulaire mens: `models3d_people.js modularPosed` zet de basis via de state-machine (zit-clip, hurkclip, idle met gebaren) en legt de armen daarna met IK (`modularpeople.js modularReach`) naar punten in de assen van de mens, met een prop uit het propregister (telefoon, hengel, gitaar) die per beeld in de assen van de mens wordt gezet (`modularPlaceProp`). Wie stilstaat doet na 6 tot 22 s (per mens uit het zaad) een klein gebaar (`modularFidget`: telefoon, horloge, krabben, rondkijken), alleen dichtbij. Wat het pack niet als clip heeft (bellen, vissen, sjouwen) staat als IK-houding op de basis van een bestaande clip; nooit een stijve T-pose. Afgewezen: de houdingen als eigen clips opnemen (geen bron met een gratis licentie voor deze gebaren) en de oude procedurele mens voor wie een houding heeft (de reden van de 18 van 43 procedurele voorbijgangers op 24-11). Test: `scripts/modularpose_test.mjs`.
