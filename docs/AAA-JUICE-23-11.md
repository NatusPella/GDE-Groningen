# AAA-juice, 23-11: waar het spel nog "game feel" mist

Branch `juice-aaa-23-11`. Eerst gemeten wat er al is, dan wat ontbreekt. Gebied: effecten, camera, UI en geluid (niet personages, dieren, omgeving of objecten).

## Al aanwezig (niet opnieuw doen)

- Camera: snelheids-FOV, lean en driftopening (`camlean.js`, `gamefeel.js`), schermschudden bij klappen (`lastImpact`), terugslag en FOV-stoot bij schoten (`world.camKick`), timescale-dip bij zware klappen.
- Voertuigen: bandensporen, rook, stof op gras, uitlaat, vonken, brokstukken en schade (`fx3d.js`).
- Wapens: treffermarkering (`combatfeel.js`), mondingsvuur, kogelinslagen (`gunfx3d.js`), knock- en gore-effecten.
- UI: DS3-microinteracties, tellers, meldingen, laadscherm, menu-overgangen (`ds-micro.css`, `menu.css`, `hud_panel.css`, `microinteractions.js`).
- Geluid: UI-taal met varianten, afkoeling en toonspreiding (`sfx/ui.js`, `uibank.js`), voetstappen, landingsgeluid (`sfx/steps.js`).
- Haptiek: `haptics.js` met profielen voor klap, schade, landing, schot, geld.

## Bevindingen, gerangschikt (impact, kosten)

| # | Wat ontbreekt | Waarom | Impact | Kosten | Stand |
|---|---|---|---|---|---|
| 1 | Te voet: een sprong of val heeft wel geluid maar geen beeld, geen camerazakking en geen tikje in de hand. Opstijgen en aanzetten tot rennen zonder stof. | Elke speler springt en rent honderden keren per uur; dit is de meest herhaalde handeling zonder gewicht. | hoog | S | gedaan |
| 2 | Auto's en fietsen die na een sprong of van een helling hard landen: alleen vering en schade, geen stofring, geen vonken van de bodem, geen dreun in beeld of in de hand. `landing` in `haptics.js` werd nergens gezet. | De stunts en sprongen zijn een belofte van de open wereld; de landing is het hoogtepunt ervan. | hoog | S | gedaan |
| 3 | Snelheid is alleen FOV en lean; de rand van het beeld blijft onbeweeglijk scherp (geen snelheidsgevoel in de periferie). | Goedkope motion-blur-truc: drie extra tikken, alleen bij hoge snelheid, alleen aan de rand. | middel | S | gedaan (shader, niet in beeld gezien) |
| 4 | Explosies in de verte (granaat, raket, brandende auto) schudden het beeld alleen als er een `lastImpact` is; de afstand telt niet mee. | Een knal op 15 m moet harder aankomen dan op 80 m. | middel | M | niet gedaan |
| 5 | Geld- en pickup-glans in de wereld (een kleine vonkenpoef bij oppakken). | Beloningsfeedback zit al in HUD en geluid; de wereld zelf blijft stil. | laag | M | niet gedaan |
| 6 | Instap- en uitstap-camera (zachte inzoom bij het pakken van een auto). | Nu een snee zonder overgang. | laag | M | niet gedaan |

UI, geluid en haptiek hadden geen grote lege plekken meer: de DS3-animaties, UI-geluiden en haptiek-profielen dekken de menu's, meldingen, HUD en het laadscherm. Een volgende ronde kan beter beeldmateriaal vergelijken dan nog meer code toevoegen.

## Uitvoering

- `game/js/landfeel.js`: pure regels (Node-safe): voet- en voertuiglanding, stofkleur per ondergrond, snelheidsstreep. Test: `scripts/landfeel_test.mjs`.
- `fx3d.js`: `footFx` en `vehicleLanding` gebruiken de bestaande pools (rook, vonken, brokstukken); geen allocaties per frame (hergebruikte toestand- en uitvoerobjecten).
- `vehicle.js`: zet `v.landHit` bij de landing; `fx3d.js` leest en wist hem. Ver weg wordt hij gewist, zodat er geen vertraagde wolk komt.
- `postfx3d.js` en `scene3d.js`: `uStreak` (alleen Middel/Hoog/Ultra), gevoed door de snelheids-FOV; uit met Beweging beperken of Snelheidsgevoel uit.
- Toegankelijkheid: camerazakking en strepen volgen `effectsFor` (Beweging beperken en Schermschudden); het stof zelf is een gewoon beeld.

## Samen spelen

Elke speler doet dit lokaal in zijn eigen spel: stof, zakking, strepen en trilling hangen aan het eigen lichaam en eigen voertuig (`hoofdspeler`). Er is geen snapshot, geen EXTRA-bericht en geen beloning of voortgang; wie wegvalt of later aansluit mist niets. Medespelers zien hun eigen voeten niet stuiven (alleen auto's in de buurt tonen de landing, omdat `landHit` op het voertuig staat). Dekking: pure test `landfeel_test.mjs`.

## Niet gemeten of gezien

Geen beeld- of fps-meting gedaan (de Electron-slot was bezet): de stofpuffs, de camerazakking en de shader zijn alleen op syntaxis en pure regels getoetst. Prestatie: de extra puffs komen uit de bestaande rookpool (420 plekken) en de shader doet 3 tikken alleen bij `uStreak > 0`.
