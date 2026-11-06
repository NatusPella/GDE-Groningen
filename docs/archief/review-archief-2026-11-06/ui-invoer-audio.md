# Review UI, invoer, audio en toegankelijkheid

## Dekking

Gelezen (volledig of grotendeels): `a11y.js`, `a11ylogic.js`, `a11y.css`, `attention.js`,
`inputdevice.js`, `settings.js`, `motion.js`, `sfx/ui.js`, `input.js`, `gamepad.js`,
`controls.js` (op de PAD_MAPS-tabellen na volledig), `touch.js`, `hudcards.js`, `hudbus.js`,
`hudtext.js`, `phonefeed.js`, `coopspelers.js`, `coopspelersui.js`, `soundcaptions.js`,
`audio/spatial.js`, `audio/scenario.js`, `audio/vehiclevoices.js`, `audio/radio.js`,
`textfield.js`, `padkeyboard.js`, `spacegate.js`. Gericht gelezen (grote bestanden):
`pausemenu.js` (±600 van 1801: menu-opbouw, instellingen, toetsen/rebind, goBack, setOpen),
`startscreen.js` (boot/menu/Escape), `mapview.js` (±400 van 2669: zoeken, kaartkaart,
invoer-listeners, keydown), `hud_panel.js` (±200 van 2901: opbouw, updateHud, sense,
updateVisibility), `audio.js` (±700 van 3171: graafopbouw, ensureCtx/initAudio, tone/noise/buf,
voice-hulp, mediaelement, watchdog, updateAudio), `postfx3d.js` (flitsdeel), `subtitles.js`
(`dualHtml`/escaping), `lobbyui.js` (lijst/formulieren/invoer), `shopui.js` (opbouw/keys),
`main.js` (init-orde, pause-gating), `savegame.js` (toast), `coopnet.js`/`coopplayers.js`
(roster/welkomst), `sfx/menunav.js`, `index.html` (motion-tokens).

Niet of nauwelijks bekeken: `shops.js` (114k), `hudrules.js`, `hudlook.js`, `prompts.js`,
`sfx/fxbank.js`, `sfx/ambience.js`, `sfx/foley.js`, `sfx/dsp.js`, `engineworklet.js`, de
subtitle-flow in cinematics, `saveslotsui.js`, `phone.js`. Geen runtime, geen Electron, geen
spel, geen testsuite en geen visuele controle: uitspraken gaan over de code, niet over wat op
het scherm te zien is. Geen van de vier bevindingen valt onder #555–#577; #560/#571 liggen op
aangrenzend terrein (controller-indeling, aria-labels) maar dekken deze paden niet.

## Bevindingen (op ernst)

### [Hoog] Rebind blijft actief als het pauzemenu met de rail-"Terug" sluit

- **Waar:** `game/js/pausemenu.js:1766` (`setOpen`), `:1071` (`input.captureKey`), `:1091`
  (`capturePadButton`), `:1101` (`cancelRebind`), `:1737` (annuleren alleen bij tabwissel),
  `:572` (railknop "Terug", `data-action="resume"`); `game/js/input.js:164-172`;
  `game/js/gamepad.js:100-107`, `:403-417`.
- **Scenario:** Pauze > Instellingen > Besturing > Toetsenbord en muis, klik een actie ("Druk
  een toets…"), en sluit het menu daarna met de railknop **Terug** (of "Afsluiten").
  `runAction('resume')` roept direct `setOpen(false)` aan; `cancelRebind()` wordt daar niet
  aangeroepen. Alleen Escape (via de `captureKey`-callback) en het verlaten van het tabblad
  (`:1737`) ruimen de wachtstand op. De volgende toetsdruk in het spel wordt door
  `Input._translate` opgeslokt (`preventDefault` + `stopImmediatePropagation`) en de callback
  voert `bindKey(...)` + `setSetting('keyBinds', ...)` uit: de besturing verandert zonder dat er
  nog een scherm bij hoort. De controller-variant is identiek: `capturePadButton` blijft
  hangen en de eerstvolgende controllerknop in het spel wordt stil omgezet.
- **Impact:** één verloren toetsdruk plus een ongemerkte, bewaarde wijziging van de besturing;
  de speler merkt het pas als een actie niet meer werkt en moet dan zelf terug naar het
  rebind-scherm. Bij een pad kan de knop die je tijdens het rijden indrukt de nieuwe binding
  worden.
- **Fix:** in de sluit-tak van `setOpen` (en bij de prestart-close) `cancelRebind(true)`
  aanroepen, plus `input.captureKey = null` en de `capturePadButton`-cancel; of `cancelRebind()`
  als eerste regel van `setOpen(false)`.
- **Zekerheid:** zeker.

### [Midden] "Flitsen beperken" dekt de witte schermflits van de 3D-postprocessing niet

- **Waar:** `game/js/postfx3d.js:151-156` (`flashScreen`), `game/js/trailer.js:256-259`,
  `game/js/dorpsuitjes.js:597`, `game/js/storyfun.js:286`,
  `game/js/a11ylogic.js:119-126` (`effectsFor`), `game/js/a11y.css:124`.
- **Scenario:** Zet "Flitsen beperken" aan (Instellingen > Toegankelijkheid). `a11y.js:49` zet
  `html.reduce-flash`, en de CSS verbergt alleen de DOM-flitsen van de intro-montage en de
  trailer (`:124`) en twee HUD-animaties (`:126`). De schermvullende flits van de postprocessing
  (`flashScreen`, actief zodra `body.gpu-screenfx` bestaat) leest de instelling niet.
  `trailer.js:257` gebruikt die flits juist in plaats van de DOM-flits (`if (flashScreen(big))
  return;`), en `dorpsuitjes.js:597` en `storyfun.js:286` flitsen rechtstreeks met
  `flashScreen(true)`. `effectsFor({reduceFlash}).screenFlash`/`flashMaxPerSecond` bestaan in
  `a11ylogic.js`, maar geen enkele aanroep geeft `reduceFlash` mee.
- **Impact:** precies wat de instelling belooft ("geen witte schermflitsen in filmpjes en
  intro") gebeurt op machines met de postfx-pass nog steeds, en juist bij scènes/flitsen is dat
  de fotosensitieve categorie. Op de laagste kwaliteitsstand bestaat de pass niet en valt de
  trailer terug op de DOM-flits die wél verborgen is: het gedrag verschilt dus per preset.
- **Fix:** `flashScreen()` laten afhangen van `reduceFlash` (of van
  `effectsFor({ reduceFlash: getSettings().reduceFlash }).screenFlash`) en de directe
  `flashScreen(true)`-aanroepen in dorpsuitjes/storyfun via dezelfde poort laten lopen.
- **Zekerheid:** zeker (geen aanroep met `reduceFlash` gevonden; CSS dekt de postfx-flits niet).

### [Laag] Kleur van een medespeler komt ongevalideerd in een `style`-attribuut (CSS-injectie)

- **Waar:** `game/js/coopnet.js:1054`, `game/js/coopspelers.js:61`,
  `game/js/coopspelersui.js:32`; de validatie bestaat wél in `game/js/coopplayers.js:108`
  (`zetAvatar`) en `:131` (`leesLijstEvent`).
- **Scenario:** Een gast ontvangt het welkomstbericht en zet `world.coopRoster =
  s.welcome.lijst` zonder `leesLijstEvent()`. `spelersRijen()` neemt `av.kleur` over en
  `rijHtml()` zet die in `style="color:${esc(r.kleur)}"`. `esc()` escapet `"` maar niet `;`,
  `(`, `)` en `/`, dus een (aangepaste) host kan bv. `red;background-image:url(https://…)`
  meesturen; de browser van de gast doet dan een verzoek naar een door de host gekozen server
  en kan het paneel verleggen. Tot het eerste 'spelers'-bericht (dat wél gevalideerd wordt)
  blijft die lijst staan, en een host kan dat bericht overslaan.
- **Impact:** geen JS-uitvoering, maar wel een cookie-loos request/beacon vanaf het IP van de
  gast (constitutie 4: niets naar externe diensten) en mogelijke layout-manipulatie in de
  spelerslijst.
- **Fix:** het welkomstbericht door `leesLijstEvent`/`zetAvatar` halen, en bij het tekenen de
  kleur nog eens door de bestaande `^#[0-9a-f]{6}$`-controle (of `profielKleur()`) halen.
- **Zekerheid:** zeker voor de ontbrekende validatie; het netwerkverzoek is browserafhankelijk
  (waarschijnlijk).

### [Laag] Dode G-Music-elementen lekken een MediaElementSource in de audiograaf

- **Waar:** `game/js/audio/radio.js:167-179` (`wireGmusicEl`), `:327-340` (`reviveGmusicEl`).
- **Scenario:** Een nummer of jingle met een fout wordt door de watchdog vervangen door een
  nieuw `Audio`-element. `wireGmusicEl` maakt per element een `ctx.createMediaElementSource(el)`
  en connect die aan `musicBus`, maar bewaart de node niet; `reviveGmusicEl` ontkoppelt hem dus
  nooit en de oude `el` blijft via die node aan de graaf hangen (`removeAttribute('src')` +
  `load()` geeft hem niet vrij zolang de node bestaat). Elke revive laat één node achter.
- **Impact:** kleine, langzame lek in de audiograaf (CPU/GC, geen hoorbaar gevolg); meestal
  0–1 per sessie, meer bij een lange sessie met een haperende zender. Het is precies het soort
  aangroeien dat #473/#519 wilden voorkomen.
- **Fix:** de node op het element bewaren (`el.gmusicNode = …`) en bij `reviveGmusicEl` en bij
  het opruimen `node.disconnect()` aanroepen voordat het oude element wordt losgelaten.
- **Zekerheid:** zeker (node wordt nergens gedisconnect); impact klein.

## Gecontroleerd en in orde

- **Audio vóór `initAudio`:** na #553 dekt `audio/spatial.js:60` `host`/`ctx`/mute/voice-budget
  af. De exportfuncties die vóór de graaf bereikbaar zijn, hebben allemaal een eigen
  `if (!ctx ...) return` (`playPhonePing` `:1389`, `playPhoneRing` `:1570`, `playHeartbeat`
  `:1539`); `updateAudio` `:2925` stopt bij `!ctx || !worldReady` vóór `updateListener`.
  `playTone`/`playNoiseBurst` hebben zelf geen ctx-guard, maar elke aanroep die vóór
  `buildGraph()` kan lopen, zit achter `sfx/ui.js`'s `K`-controle of `onUiDom`'s `ensureCtx()`.
  Geen extra crashpad gevonden.
- **Tekst-injectie (XSS):** `dualHtml()` escapet (`subtitles.js:407,436`), HUD-kaarten
  (`hudcards.js:217`), telefoonkaarten (`phonefeed.js:154`), kaartzoekresultaten
  (`mapview.js:1649-1657`) en de lobby- en spelerslijst (`lobbyui.js:157`, `coopspelersui.js:20`)
  gebruiken escaping of `textContent`; het foutrapport escapet (`pausemenu.js:1393`). Alleen de
  kleur hierboven glipt er langs.
- **Vasthangende invoer:** `Input.reset()` op `blur` en `visibilitychange` (`input.js:109-112`),
  `releaseAll()` bij apparaat- en contextwissel (`gamepad.js:94,396`), `lostpointercapture` +
  `blur` in `touch.js:315-317,364`, de kaartdrag stopt op `blur`/`visibilitychange` en
  `e.buttons & 1` (`mapview.js:2497,2518`), en rebind/schermtoetsenbord ruimen hun listeners op.
- **Per-frame DOM:** `hud_panel.js` schrijft via `setText`/`hidden` met een vergelijking
  (`:468`), kaarten verversen alleen bij een nieuwe key (`hudcards.js:106`), de minimap is
  getimed (`hud_panel.js:549-557`) en `sfx/ui.js` polt menu's op 4 Hz (`:209`). Geen
  `innerHTML` per frame op een onveranderde waarde gevonden.
- **Sommige beloftes kloppen:** "Tekstgrootte" vergroot kaarten, hints en bubbels
  (`a11y.css:121`), "Contrast ondertitels: hoog" zet witte tekst op een bijna zwart vlak
  (`a11y.css:111-118`), en de kleurenblindmodi werken via `markerColors()`/`--mk-*` met fallbacks.
- **Toetsenbord en focus:** tekstvelden in menu's en lobby houden alle toetsen
  (`input.js:77`, `spacegate.js:15`), een gefocuste knop verliest Space/Enter aan het spel
  (`input.js:162`) en de zoekvelden schermen hun toetsen zelf af (`pausemenu.js:711-733`).

