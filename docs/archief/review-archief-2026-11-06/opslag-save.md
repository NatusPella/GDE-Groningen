# Review opslag, save en spelersstaat

## Dekking

Diep gelezen: `game/js/savegame.js`, `savemigrate.js`, `storagekeys.js`, `saveslots.js`,
`saveslotsui.js`, `savehook.js`, `coopsave.js`, `oudmigratie.js`, `settings.js`, `players.js`,
`cooploadrules.js`, `loopbaanlive.js`, `boerderijlive.js`; van de grote modules de relevante
delen van `achievements.js` (lifetime-opslag, merge, save-delen), `main.js` (imports,
`frameBody`, save-tik), `startscreen.js` (boot/menu/continue), `pausemenu.js` (acties,
opslaan/laden, afsluiten) en `desktop/main.js` (venster en quit). Verder `scripts/storage_migration_test.mjs`
en `scripts/saveslots_test.mjs` volledig, `save_migration_test.mjs` en `saveslots_fuzz_test.mjs`
via gerichte greps, de fixtures in `scripts/fixtures/saves/` op naam en steekproef, AGENTS.md,
coding-standards, constitution, ADR 0009 en ARCHITECTURE.md §Saves and versions.

Niet of alleen via grep bekeken: `achievementtracker.js` (bevat geen opslag), `player.js`
(geen eigen persistentie; de staat loopt via `savegame.serialize`), `sessionboot.js`/`coopsolo.js`,
de `web/`- en `android/`-schillen, de rest van `save_migration_test.mjs` en
`saveslots_fuzz_test.mjs`, en het pad waarin Android het proces vanuit de achtergrond doodt.
Geen Electron of spel gestart, geen volledige suite.

Al gemeld door een andere sessie en hier niet herhaald: #562 (nieuw spel laadt na reload de
oude save), #563 (mislukte save bij Afsluiten/Herstarten genegeerd), #564 (autosave maakt een
verwijderd actief spel weer aan), #565 (gast houdt dode schrijfplek na Spel opslaan op een lege
kaart), #566 (gast-checkpoint schrijft host-schade in eigen save), #569 (solo-sessie schrijft
elke minuut een volledige save). Waar mijn bevindingen daaraan raken, staat het erbij.

## Bevindingen (op ernst)

### [Hoog] Sluiten van venster of tab bewaart niet

- **Waar:** `game/js/savegame.js:554`, `desktop/main.js:228`; geen enkele `pagehide`/`beforeunload`-save in `game/js`.
- **Scenario:** de speler speelt en sluit het venster met X of Alt+F4 (of de browsertab). De enige save-op-verlaten is de `visibilitychange`-handler in `initSaveGame`, en er is nergens een `pagehide`- of `beforeunload`-handler die `saveGame` doet; de Electron-main heeft geen close-interceptie die de renderer eerst laat opslaan. Chromium draait bij het sluiten `pagehide`/`unload`; `visibilitychange` naar hidden is daar niet gegarandeerd.
- **Impact:** alles sinds de laatste autosave is weg, inclusief positie en speeltijd (en via de volgende bevinding ook geld). Het pauzemenu-pad "Afsluiten" doet het wel, de systeemknop niet.
- **Fix:** een `pagehide`-handler die synchroon `saveGame(world)` doet zolang `game-started` staat, en op desktop `win.on('close')` naar de renderer (eerst bewaren, dan sluiten).
- **Zekerheid:** waarschijnlijk (het ontbreken van `pagehide` is zeker; dat `visibilitychange` bij venstersluiten wegblijft is browserafhankelijk).

### [Hoog] De autosave-signatuur mist geld, dus sommige inkomsten worden nooit bewaard

- **Waar:** `game/js/savegame.js:377` (`stateSignature`), `game/js/cashvan.js:37`, `game/js/muggings.js:141`.
- **Scenario:** een opengeblazen geldwagen geeft €600-1100 via alleen `w.money += pay` plus `reportCrime` (`wanted` zit niet in de signatuur); een ontvreemde portemonnee komt op dezelfde manier terug. Geen van die paden roept `markDirty` of `saveGame`, en de signatuur (shops, missies, verhaal, prestaties, ...) verandert niet, dus tint `dirtyIn` niet aan. Pas bij een volgende statuswijziging (aankoop, missie) gaat het geld mee in een save.
- **Impact:** geld verdwijnt stil bij een crash of het sluiten van het venster (bevinding 1). Positie en speeltijd zitten wel in `serialize`, maar net zo min in de signatuur, dus die delen de blinde vlek.
- **Fix:** `w.money` (en bij voorkeur de financiën-ledger) in de signatuur opnemen, of in de geldpaden `markDirty()` aanroepen; een langzame periodieke save-tik voor solo zou hetzelfde afdekken. Al gemeld: #569 gaat over het omgekeerde probleem (te vaak bewaren in de solo-sessie); dit is de inhoudelijke kant.
- **Zekerheid:** zeker.

### [Midden] Een mislukte autosave wordt niet opnieuw geprobeerd

- **Waar:** `game/js/savegame.js:589`, `game/js/savegame.js:606`.
- **Scenario:** opslag zit vol of is tijdelijk geblokkeerd op het moment dat de debounced save afgaat. `missionSaveIn`/`dirtyIn` staan al onder nul en `saveGame` zet ze bij een fout niet terug; de volgende frame slaat de tak over (`if (dirtyIn >= 0)`). `lastSig` is bij de wijziging al bijgewerkt, dus dezelfde stand markeert zichzelf niet opnieuw.
- **Impact:** de voortgang blijft onbewaard tot de speler iets anders permanents doet; met een toevallige crash of het afsluiten van het venster is die tussenstand weg. Al gemeld: #563 beschrijft hetzelfde gevolg via Afsluiten/Herstarten; dit is de autosave-variant met een andere oorzaak.
- **Fix:** bij `false` de timer opnieuw zetten (bijvoorbeeld `dirtyIn = 20`, `missionSaveIn = 1`) en de fout in de errorlog laten vallen.
- **Zekerheid:** zeker.

### [Midden] Stille terugval op de herstelkopie bij het opstarten

- **Waar:** `game/js/saveslots.js:87` (`readSlot`, state `hersteld`), `game/js/savegame.js:105`, `game/js/startscreen.js:437`.
- **Scenario:** de hoofdsave van de actieve slot is afgekapt of onleesbaar. `readSlot` laadt dan de vorige goede schrijfbeurt als `state: 'hersteld'`. De boot gebruikt `readSave()` en `getSaveSummary()`, die alleen data teruggeven, en `hasSave()` is waar; `continueGame` laadt dus zonder melding. Alleen het scherm Opgeslagen spellen toont het chipje "Hersteld".
- **Impact:** de speler speelt door met een stand die één of meer saves terugligt, zonder het te weten; de eerstvolgende autosave schrijft die oudere stand als nieuwe save weg.
- **Fix:** de state uit `readSlot` doorgeven tot `applySave`/`loadLatestSave` en daar één melding tonen (zoals bij `restoredMoney`), plus de herstelde data meteen terugschrijven.
- **Zekerheid:** zeker.

### [Midden] De save-backup wordt alleen geschreven en nooit gelezen; de oude sleutel wordt niet gemigreerd

- **Waar:** `game/js/savegame.js:43`, `game/js/savegame.js:116`, `game/js/storagekeys.js:18`, `game/js/storagekeys.js:125`, `game/js/oudmigratie.js:50`, `ARCHITECTURE.md:1589`.
- **Scenario:** `backupOnce` bewaart de save vóór de eerste migratie (of de save van een nieuwer spel) onder `gde-save-backup-nieuw`. Geen enkele module leest die sleutel: er is geen herstel- of exportpad en geen test. De oude `gte-save-backup` wordt wel naar `gde-save-backup` gekopieerd, maar `migrateOudeOpslag` verhuist alleen de save en de prestaties naar de `-nieuw`-sleutels, dus die oude sleutel blijft orphan.
- **Impact:** het vangnet dat ARCHITECTURE.md belooft, is niet bereikbaar; een kapotte save is alleen via de jongere herstelkopie te redden. Bovendien kost de backup bijna twee keer de savegrootte aan quota, want `save` wordt als string dubbel JSON-gecodeerd.
- **Fix:** de sleutel in de save-UI als laatste redmiddel aanbieden wanneer een slot `kapot` is, of hem schrappen; `gte-save-backup` meenemen in `oudmigratie`; het schrijf- en leespad testen.
- **Zekerheid:** zeker.

### [Laag] De 45-seconden-throttle op savegame-thumbnails is dood

- **Waar:** `game/js/savegame.js:265`, `game/js/savegame.js:276`.
- **Scenario:** `keepThumb(saveTarget(), toast)` geeft de toast-vlag als `force` door. Elke autosave roept `saveGame(w)` zonder opties (`savegame.js:595`, `savegame.js:610`), dus `toast` en daarmee `force` is altijd waar, terwijl de comment op regel 270-272 belooft dat de autosave hooguit eens per 45 s een plaatje maakt.
- **Impact:** bij elke automatische save een canvas-readback (`getImageData`), JPEG-encode en localStorage-schrijfactie tot 40 kB: een hapering op tragere machines en onnodige quota-druk.
- **Fix:** een aparte `manual`-vlag naast `toast` doorgeven en alleen een echte handmatige save laten forceren.
- **Zekerheid:** zeker.

### [Laag] Een settings-bestand van een nieuwere versie wordt stil teruggezet

- **Waar:** `game/js/settings.js:140`, `game/js/settings.js:175`, `game/js/settings.js:205`.
- **Scenario:** een nieuwere build schrijft `gde-settings` met `v: 11`; een oudere build leest dat bestand als "nieuwer" (`migrateSettings` geeft null), neemt alleen de sleutels uit `DEFAULTS` over en schrijft bij de eerste wijziging `{...settings, v: 10}`. Onbekende sleutels zijn dan weg en de versie is gezakt; er is geen `keepNewerSave`-equivalent.
- **Impact:** instellingen uit de nieuwere versie (besturing, toestemming voor Samen spelen) raken stil kwijt na een korte terugstap.
- **Fix:** net als bij de save een kopie van het nieuwere bestand bewaren vóór overschrijven, of helemaal niet schrijven zolang `v > SETTINGS_VERSION`.
- **Zekerheid:** zeker.

### [Laag] De eenmalige gte- → gde-migratie negeert latere wijzigingen aan de oude sleutels

- **Waar:** `game/js/storagekeys.js:143`, `game/js/storagekeys.js:190`; gedrag vastgelegd in `scripts/storage_migration_test.mjs:63`.
- **Scenario:** een speler draait één keer een oude 0.28-build die nog onder `gte-*` schrijft, speelt verder en komt terug op de nieuwe build. `gde-migrated-v1` staat al, dus de migratie slaat over en de nieuwere `gte-save-v1` wordt nooit gekopieerd; de test bevestigt dat ("second run changes nothing").
- **Impact:** de voortgang uit de downgrade-sessie verdwijnt stil. Bewust eenrichtingsverkeer, maar nergens als risico gedocumenteerd.
- **Fix:** bij een bestaande marker alsnog per sleutel kopiëren wanneer de oude sleutel jonger is, of dit expliciet als beperking documenteren.
- **Zekerheid:** zeker.

### [Laag] Boerderij en hengeltuig overschrijven bij twee tabbladen waar loopbaan, visboek en gebieden samenvoegen

- **Waar:** `game/js/boerderijlive.js:39`, `game/js/hengeltuiglive.js:23`; tegenhangers `game/js/loopbaanlive.js:50`, `game/js/visboeklive.js:53`, `game/js/gebiedenlive.js:49`.
- **Scenario:** twee tabbladen hebben elk hun stand; de laatste die schrijft gooit de stand van de andere weg. Loopbaan, visboek, gebieden en prestaties lezen eerst de opgeslagen stand en voegen samen (`voegSamen`/`mergeStored`); boerderij en hengeltuig schrijven hun eigen kop.
- **Impact:** wisselend verlies van boerderij- of hengeltuigvoortgang per tab, precies het scenario dat `savegame.js:54` ("a second tab") en de andere profielen al afdekken.
- **Fix:** ook in `schrijfNu` eerst lezen en samenvoegen, of expliciet één tab afdwingen.
- **Zekerheid:** zeker.

## In orde

- De robuuste schrijfweg in `saveslots.js:184` (vorige goede save als herstelkopie, teruglezen en vergelijken,
  oude tekst terugzetten bij een torn write) en het bewaren van een save van een nieuwer spel als herstelkopie;
  `scripts/saveslots_test.mjs:50-98` dekt quota, torn writes en het "nieuwer"-geval.
- Sleuteldiscipline: alle opslagsleutels staan in `storagekeys.js` en `scripts/storage_migration_test.mjs:123-142`
  faalt op elke losse sleutel; dezelfde test eist dat `storagekeys.js` de eerste import van `main.js` is.
  De savefixtures (inclusief `toekomst-v99.json`) laten zien dat een oudere save migreert en een nieuwere niet
  gelezen/veranderd wordt.
- Geen PII in saves of sessies: de save bevat karakter-id's (`tammo`/`anita`), geen namen of IP's; slotnamen
  zijn apparaat-lokaal en worden bij import en hernoemen gecleand; thumbnails worden op `data:image`-URL's
  gecontroleerd (`saveslots.js:238`). Loopbaan, visboek, boerderij en gebieden staan volgens ADR 0009 bewust
  buiten de savegame.
