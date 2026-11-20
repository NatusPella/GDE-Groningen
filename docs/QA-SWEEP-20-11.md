# QA-sweep van de schermen, 20-11

Een meetronde zonder menselijk oog (#988, #985): detectors lopen de belangrijkste schermen af op meerdere vensterformaten in Electron
met een wegwerpprofiel. Er is geen beeld door een mens beoordeeld; de gemaakte screenshots staan alleen onder `desktop/build/sw/` (niet in git).

## Wat het script doet

`node scripts/qa/schermen_sweep.mjs [--formaten=1280x720,1920x1080,800x360t,1024x768,2560x1080] [--schermen=kaart,winkel] [--slot=2]`
start per formaat één Electron (een `t` achter het formaat zet de raakbediening aan), start een nieuw spel, opent de schermen en meet:

- **buiten beeld**: het zichtbare deel (na het wegknippen door scrolcontainers) loopt buiten het venster.
- **afgekapte tekst**: `scrollWidth > clientWidth` bij `overflow: hidden` (zonder `…` is het een fout, met `…` een melding).
- **bedekte klikdoelen**: het midden van een knop is van een ander element (`elementFromPoint`).
- **contrast**: tekstkleur tegen de samengestelde achtergrond, onder 4,5:1 (3:1 bij grote tekst); alleen gemeten waar de achtergrond effen is, verlopen en afbeeldingen vallen af.
- **tekst onder 13 px** (CSS-pixels), en bij raakbediening **doelen onder 36 px**.
- **focus**: kan het element focus krijgen (toets), valt het onder de controllerselector van `gamepad.js`, en heeft het een zichtbare focusring.
- **console**: errors, onverwerkte beloftes en NaN-waarschuwingen tijdens de hele run.

Schermen: HUD, pauzemenu (Spel-overzicht), Spel-rail (Opslaan & stoppen), Samen spelen-hub, Te doen, Kaart, Prestaties, Instellingen, Spullen, Garage,
verhaal/telefoon, Loopbaan, Besturing, Veroverd, Foto's en een winkel. De pure kant staat in `scripts/schermen_sweep_test.mjs`.
`--samenvatting=<sweep.json>` drukt per formaat en scherm de aantallen af.

## Formaten die echt gemeten zijn

| Gevraagd | Gemeten venster | Opmerking |
| --- | --- | --- |
| 1280x720 | 1280x720 | volledig |
| 1920x1080 | 1904x993 | het venster past niet op dit scherm (titelbalk) |
| 800x360 met raakbediening | 800x360 | volledig |
| 1024x768 (4:3) | 1024x768 | volledig |
| 2560x1080 (21:9) | **1904x993** | **niet gemeten**: het venster werd tot het schermformaat ingekort. Opnieuw draaien op een breder scherm of met een virtueel scherm. |

## Bevindingen

Per formaat 16 schermen, ongeveer 3700 elementen en 575 klikdoelen. **Geen console-errors, geen NaN-waarschuwingen, geen elementen buiten beeld,
geen bedekte klikdoelen in de menu's en geen contrastfout** (het contrast is alleen gemeten op effen achtergronden).

| Bevinding | Waar | Ernst | Wie |
| --- | --- | --- | --- |
| Rail-knoppen (Spel, Verhaal, Loopbanen, Veroverd, Activiteiten, Kaart) zijn 101 x 24 px op 800x360 met raakbediening: onder de 36 px die een vinger nodig heeft | `pausemenu.css`, `button.ra` | midden (raakbediening) | **opgelost 20-11**: 44 schermpixels (gedeeld door `--mz`) onder `html.touch-device` en `pointer: coarse`; gemeten 101 x 44 px op 800x360 met `--touch`, was 101 x 24 |
| Zoekveld op de kaart krijgt focus maar geen zichtbare ring (1024x768) | `mapview.js` | laag | **regel toegevoegd 20-11** (`:focus-visible` met crème ring), in a11y_test bewaakt; niet in beeld gezien |
| Schuifregelaar `input.m-sl` onder Instellingen krijgt focus maar geen zichtbare ring (1024x768) | pauzemenu, Instellingen | laag | **regel toegevoegd 20-11** (`menu.css`: ring om de schuif en op de knop), in a11y_test bewaakt; niet in beeld gezien |
| `.ds-badge` met "Enter" in Te doen is 12 px | `todoui.js` met `ds-components.css` | laag: `.ds-badge` mag 12 px volgens het designsysteem | geen actie |
| De minikaart in de HUD (`.hud-minimap-wrap`, rol knop) is niet met Tab of de controller te bereiken | `hud_panel.js` | laag, bewust: tijdens het spelen staat de HUD buiten de focusvolgorde en M opent de kaart | geen actie |
| Op 800x360 met raakbediening ligt de minikaart onder de linker bedieningszone (`.t-zone.t-left`) | `hud_panel.js`, raaklaag | laag: de zone vangt de tik op | uitzoeken met een vinger |
| Tekst "Loop erheen, dan E" in de HUD-prompt is 11,8 CSS-px op 1904x993 | `prompts.css` (`--hud-min` is 13 px gedeeld door de UI-schaal) | geen fout: op het scherm is het 13 px; de detector telt CSS-px | geen actie |
| Afgekapte tekst met `…` in winkels, Spullen, Veroverd en de muziekregel van de HUD | winkelrijen, `np-artist` | geen fout: bedoeld, de volle tekst staat in het detailvlak | geen actie |

Eerder gemelde artefacten van de sweep zelf (verholpen in het script): het laadscherm of startscherm dat nog over de HUD en de winkel lag telde als "bedekt";
screenreader-teksten van 1 px telden als afgekapt; de focusring is alleen te beoordelen als `:focus-visible` geldt (anders telt het script het als "onbepaald").

## Niet gemeten of niet gezien

- Dialogen met een personage: geen vaste ingang zonder NPC; handwerk blijft nodig. Ook het startscherm en de Samen spelen-hub met een tweede speler zijn niet apart gemeten.
- 21:9 (zie boven).
- Echte toetsen en een echte controller: de detector kijkt of focus kan en of het element in de selector van `gamepad.js` valt, niet of een pijltjestoets in de goede volgorde door alle knoppen loopt.
- Contrast boven verlopen, afbeeldingen en het spelbeeld; de HUD is gemeten terwijl het laadscherm soms nog zichtbaar was (de run draaide naast andere Electron-processen).
- Niemand heeft de schermen met het oog beoordeeld.
