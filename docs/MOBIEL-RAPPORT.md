# Mobiel en touch zonder echt toestel (#96)

Gemeten en bekeken in Electron met Chromium-apparaatemulatie (`--emulate-mobile`, touchbediening geforceerd met `--touch`), wegwerpprofiel, één Electron tegelijk. Geen echt toestel, geen echte vingers: dit is een layoutcontrole, geen speltest.

Herhalen: `cd desktop && npm run stage`, dan `node scripts/mobile_shots.mjs [--devices=800x360,412x915] [--only=voet,auto,heli,overzicht]`. Het script neemt een slot uit `C:/Users/abuis/gde-locks`, schrijft beelden en `metrics-<scherm>.json` naar `%TEMP%\gde-mobile-shots` en sluit Electron na elk scherm. De scenes staan in `scripts/ui/mobile_scenes.js`: per situatie een meting (knoppen, HUD-blokken, kleine tekst, overlap) en een screenshot.

Schermen: 360x800, 412x915, 390x844 (telefoons) en 820x1180 (tablet), elk liggend en staand. Situaties: te voet, gezocht, auto, motor, boot, helikopter, duif, trein, pauzemenu (overzicht, kaart, instellingen, besturing, telefoon, ...), startscherm. Niet bereikt in de run: de minigame-situaties (de scene zette alleen `activityGame`; de knoppen bleven die van te voet) en de winkel (geen winkel gevonden).

## Wat fout was en nu is aangepast

| Bevinding | Aanpassing | Controle |
|---|---|---|
| Startscherm: het menu lag onder de onderrand (vast `top: 548px`); op een liggende telefoon was een spel starten onmogelijk | `startscreen.css`: onder 560 px hoog logo links en menu rechts als scrollende lijst; staand logo boven, menu eronder; het nieuwsvenster past erin | Beeld per scherm, items binnen beeld |
| HUD op schaal 1 in 800x360: minimap, kaarten en banners vulden het scherm | `uiScaleFor(.., touch)`: telefoon (korte zijde < 700) schaalt tussen 0,62 en 1; tablet en bureaublad ongewijzigd | `hud_layout_test` (nieuwe regels) en beeld |
| Linker knoppen lagen op de minimap; een vierde linker knop viel op de eerste (3 plekken voor 4 knoppen: Vuur op Rem) | 4 linkerplekken in een 2x2-blok, verschoven langs of boven de minimap (`hudMinimap`, `leftOffset`) | `touch_test`: voor 12 situaties x 10 schermen plek, beeld, 44 px, geen overlap, niet op de minimap |
| Gas overlapte Meer; Meer en pauze waren 43 px | Pauze en Meer in één rij bovenin, 60 px (na schaal >= 44) | idem |
| Klok en sterren (zone C) lagen onder pauze en Meer | HUD-blok rechtsboven schuift links van die knoppen | beeld |
| Snelheidsmeter en helikopterhoogte (rechtsonder) lagen onder de rechterknoppen | Verplaatst naar het midden onderin (alleen met touch) | beeld |
| Voertuignaam en racepaneel lagen onder Gas en Toeter | Schuiven op met touch | beeld |
| Straatnaam naast de minimap lag onder de verschoven knoppen | Boven de minimap | beeld |
| Kleine HUD-teksten 6,9 tot 9 px op scherm | Ondergrens 11 px (`.hud-key`, `small`, prestatietoast, `.nl-sub` e.d.) | Meting: niets meer onder 10,5 px, behalve `SPAN` 8 tot 9 px (zie hieronder) |

## Wat nu goed lijkt (op afbeelding en meting)

- Hoek- en randankers: pauze en Meer rechtsboven, geen knop buiten beeld, alle knoppen >= 44 px op alle 10 geteste schermen (pure test), geen overlap tussen knoppen onderling.
- Hover: alleen kleur-hovers (tientallen regels, geen `:hover`-UI die iets toont of verbergt). Blijvende hoverkleur na een tik niet bekeken.
- Pauzemenu liggend (800x360 en 915x412): leesbaar, het linkermenu scrolt (onderste items zitten onder de rand), de kaart vult het scherm.
- Kwaliteitsprofiel: op een telefoonscherm kiest `applyMobileProfile` de lage preset (schaduwen uit, korte zichtafstand, resolutie 60%); gemeten in `env`. Op tablet (1180x820) en bij hoge resolutie niet apart geverifieerd.

## Nog niet goed of niet gedaan (te kiezen of te testen)

1. Staand: het pauzemenu stort in (inhoudspaneel 90 px breed). Er is nu alleen een banner "Draai je toestel voor het menu" bij staand (CSS, niet in beeld bekeken); een echte staande layout is een ontwerpvraag. Het startscherm en het spel zelf werken staand wel, met de bestaande hint.
2. Tijdelijke meldingen ("Nul krassen...", missiepop) kunnen over de snelheidsmeter of de linkerknoppen vallen; de plaatsnaam-banner (`.hud-place`) loopt staand onder pauze en Meer. Deze zijn kortstondig.
3. Tekst: `SPAN` in het HUD blijft 8 tot 9 px op een kleine telefoon (selector niet aan te wijzen); tekst in menu's is ca. 9 tot 11 px na `--ui-fit` (0,6); de besturingstabel toont toetsnamen.
4. Menu's tonen toetsenbordhints (pijltjes, ENTER, ESC) en 'Spatie'-toetsen; op touch hoort dat tikken te zijn. Sleutelhints in het HUD zijn wel vervangen (eerdere stap).
5. Het linker menu van het pauzemenu laat op 360 px hoogte de onderste items buiten beeld (scrollbaar, geen scrollindicatie).
6. Minigames, winkel, telefoon, kaart met pinch en slepen, spelstanden en hulp/tutorial zijn niet via aanraking bediend (alleen opengezet en bekeken waar de scene dat kon); de pinchlogica heeft pure tests. De tik-naar-actie keten (pointerdown, touchend) is niet in de browser doorlopen.
7. Oriëntatiewissel tijdens het spelen: `touch.js` luistert naar `resize` en `orientationchange` en de pure layout is voor beide standen getest; een live wissel in het spel is niet gedaan (elke stand is een eigen run).
8. Kaart: slepen en pinch met twee vingers; zoomknoppen staan rechts.

## Wat een echt apparaat moet bevestigen

- Duimbereik en knopgrootte met echte duimen, ook met een hoes of grote handen; knopafstand bij langdurig spelen.
- Frames per seconde en geheugen per kwaliteitsprofiel op een telefoon; of de lage preset genoeg is.
- Safe-area (notch, gestuurbalk): `viewport-fit=cover` en `env(safe-area-inset-*)` zijn gezet, maar emulatie geeft overal 0.
- Echte multitouch (stick en camera tegelijk, twee knoppen), `touchcancel` bij systeemgebaren, WebAudio-autoplay, vergrendelen van het scherm.
- Browserbalken (iOS Safari, Chrome Android) die de hoogte laten wisselen.
- Of de besturingshint "Draai je toestel" ook in menu's moet verschijnen.

## Wijzigingen in de code

- `desktop/devtools.js`: `--emulate-mobile`, `--touch` (alleen test).
- `game/js/hudlook.js`, `uiscale.js`: HUD-schaal voor telefoons.
- `game/js/touchlogic.js`: plekken, `touchPlacement`, `touchRects`, `hudMinimap`, `leftOffset`; `touch.js` gebruikt ze en bevat de CSS voor het HUD rond de touchlaag.
- `game/js/startscreen.css`: telefoonlayout.
- Tests: `touch_test.mjs` (layout per situatie en scherm), `hud_layout_test.mjs` (telefoonschaal).

Android: `docs/ANDROID.md` is ongemoeid; dit rapport zegt niets over de APK.
