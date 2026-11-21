# Kleding als eigen systeem (21-11, epic Kleding)

Eigenaar-wens: "De kleding is nu heel statisch. Kunnen we dat nog meer als een eigen systeem maken? Dus dat je losse kledingstukken kunt kopen en aan of uit kunt doen? En dat je in je kast ook kunt switchen tussen kledingstukken per persoon."
Alle NPC's gebruiken hetzelfde systeem (aanvulling eigenaar). Besluiten staan hieronder met reden; er is zelf beslist, zonder bottleneck.

## 1. Wat het is

Een kledingstuk is een **item in een slot, in een kleur**: `jack.blauw`. Twaalf slots: hoofd, bril, gezicht, hals, sieraad, shirt, jas, broek, schoenen, tas, pols, handen. De catalogus (`clothingdata.js`) heeft 63 winkelstukken met 39 paletkleuren (257 combinaties), 12 oude sets en 8 nieuwe looks, plus 4 stukken alleen voor NPC's (koksjas, uniformjas, veiligheidsjas, schort).

| Module | Rol |
|---|---|
| `clothingdata.js` | Puur: slots, palet, items, sets, looks, rolpools. Append-only: een id verandert nooit van betekenis. |
| `clothing.js` | Puur: de kast per personage, aan en uit, outfits, setbonus, verhaaloutfit, opslag en migratie, outfit-code, NPC-generator, winkelaanbod. |
| `clothingpanel.js` | Menu's in de vorm van `shopui.js`: de kledingwinkel en de kast. |
| `models3d_clothing.js` | Sieraden, horloge en handschoenen als kleine meshes aan een bot. |
| `models3d_people.js` | Kreeg `opts.role` (NPC-outfit) en haakt de accessoires aan; de rest van de kleding zit al in de ene rompgeometrie. |

## 2. Compositie en prestaties

Het model kende al tops (tee, longsleeve, sweater, hoodie, jacket, coat, blazer, raincoat, dress), broeken, schoenen, hoeden, bril, sjaal, tas en gezichtsbeharing via `opts.look`. `outfitToLook(worn, base)` vertaalt een outfit naar die opties. Er is dus **één rompmesh per figuur**, gecachet op look (LRU van 120), voor spelers en NPC's. Alleen sieraden, horloge en handschoenen zijn losse meshes (hoogstens vier, gedeelde geometrie per soort en kleur, één materiaal). Wie niets draagt, heeft er nul. Jas over shirt: de jas bepaalt de vorm, het shirt zit in `look.under`. `capColor` en `shades` zitten nu in de geometriesleutel.

## 3. Besluiten

| Besluit | Reden | Afgewezen |
|---|---|---|
| Kast per personage, niet per woning | Het verhaal laat de duo's verhuizen (homebase); de kast gaat mee. Elk huis opent dezelfde `wardrobeMenu(world)`. | Kast aan de flat binden. |
| Opslag als blok `kleding` in de shop-save, niet apart `gde-kleding-v1` | Opslagslots en back-ups kopiëren de save als geheel; een los sleutelbestand raakt uit de pas met een ander slot. Het blok is versie 1 en compact (kleiner dan 4 KB). | Aparte localStorage-sleutel (zoals `tuning`): kon met slot 2 of 3 niet kloppen. |
| Oude velden `outfit` en `ownedOutfits` blijven als afgeleide waarden in de save | Een oudere build vindt zijn outfit terug. | Weglaten. |
| Item plus kleur als id (`jack.blauw`) | Leesbaar in saves, stabiel bij uitbreiden. De code gebruikt de indexen (append-only). | Numerieke id's. |
| De oude sets zijn pakketten stukken | Zelfde kleuren en vormen; test bewijst identieke geometrie. Wie een set had, heeft de stukken. | Sets als aparte entiteit naast stukken. |
| Setbonus alleen waar het spel hem al kende | Zwart incognito geeft stealth 2 als alle stukken aan zijn; anders 1 ster per omkleden (cooldown) zoals vroeger. Geen exploits. | Stats op kleding. |
| Sets kosten de oude prijs, naar rato van wat je mist | Geen verlies voor wie al stukken had. | Korting of opslag. |
| Prijzen: basis x zeldzaamheid (1, 1,5, 2,5, 4), 8 tot 250 euro | Past bij BALANS-21-11 (ca. 1.100 euro netto per uur). Een hoodie kost ruim een kwartier spelen. | Duurdere sets. |
| Winkelaanbod: deterministisch per winkel en dag | Dezelfde winkel is voor iedereen hetzelfde, ook bij Samen spelen, zonder netwerk. Elke winkel heeft een of twee afdelingen (straat, sport, werk, chic, buiten, feest, strand). | Willekeur per bezoek. |
| Uitverkoop: vrijdag, een afdeling, 25 procent | Een reden om terug te komen; telt alleen in winkels met die afdeling. | Permanent. |
| Passen = de bestaande 3D-preview op je eigen personage | `shopui` draait de figuur al; elk item toont zichzelf over je huidige outfit. | Apart pashokje-scherm. |
| Spullen toont losse stukken en complete sets en laat ze aan- en uittrekken, ook onderweg | Het menu is de snelwissel; wisselen kost niets en is geen hostrecht. Politie-effect: 1 ster minder per cooldown, zoals thuis. | Alleen in de kast. |
| Een snelle toets voor outfits | Nog niet gedaan: nieuwe toets vraagt een besturingsreview. | Nu een toets kiezen. |
| Gezicht: alleen baard, snor, sik en stoppels | Het model kan geen make-up. | Make-up. |
| Geen opdruk, geen merken | Een stuk is vorm en kleur. De test bewaakt merken, winterwoorden en canvas. | Parodie-opdruk. |

## 4. Verhaal en cutscenes

`setStoryOutfit(id)` blijft bestaan: een setsleutel of `{ tammo, anita }` per personage, tijdelijk over wat je aan hebt (`forceStoryLook` in `clothing.js`), niet bewaard als kleding, zonder kosten. De heist bleef werken (`syncHeistOutfit`). Een cutscene die kleding forceert gebruikt hetzelfde; R-xx continuiteit uit de regie-bijbel (zelfde kleding binnen een scène) volgt vanzelf: forceren geldt tot het expliciet wordt opgeheven.
Teksten die kleding noemen: de oude zetnamen (Stadjer classic, Rode jas classic) bestaan nog als set. Gesprekken die "pet" of "jas" noemen kloppen niet meer als de speler iets anders draagt; dat is lijstwerk voor de verhaal-lead (grep `pet`, `jas`, `oranje` in `storytext`-regels).

## 5. Samen spelen

Per speler (#429): de kast is lokaal. Medespelers zien elkaars outfit via een **optioneel** veld `avatar.outfit` (code `k1` plus 4 tekens per stuk, 30 tekens bij vijf stuks) in de hello en de spelerslijst; `cleanOutfitCode` valideert, een oude client negeert het veld, PROTO blijft. `avatarLook` bouwt de figuur met dezelfde compositie. NPC's zijn deterministisch uit zaad, rol en context; geen netwerkverkeer.
Wie de wereld heeft (host): niets extra. Gast: draagt zijn eigen outfit. Wegvallen en later aansluiten: de code zit in de spelerslijst. Test: `scripts/clothing_test.mjs`, `coopspeler_test.mjs`.

## 6. NPC's

`npcOutfit(seed, rol, context)` kiest per slot gewogen uit `ROLE_POOLS` (voetganger, student, toerist, bouwvakker, boer, kok, bakker, winkelier, zakenman, sporter, feestganger); regen geeft vaker een jas, hitte een korte broek en geen jas. `buildPersonMesh(..., { role })` past het toe; gelijke zaden delen geometrie. Politie en verhaalfiguren behouden hun vaste looks in `models3d_people.js` en `missionstory.js`.

## 7. Tests

`node scripts/clothing_test.mjs` (24 tests): catalogus, geen merken of winter, oude sets gelijk aan `OUTFITS` en identieke geometrie, kast per personage, aan en uit, jurk, setbonus, outfits, verhaaloutfit, opslag en migratie, outfit-code, NPC-pools en weer, aanbod en uitverkoop, balans, prestaties, drawcalls en driehoeken, NaN per stuk, geheugen, menu's.
Prestaties: Nieuwe look, Past als gegoten, Hele kast (228 in totaal).

## 8. Ronde 2: gaten dichtgemaakt

- **NPC's in de echte bouwpaden (#1152):** gewone voetgangers (`scene3d.js` `buildPedActor`) krijgen een rol uit `pedRole(zaad, { buurtprofiel, uur })`: studenten rond de campus, toeristen en zakenlieden in het centrum, bouwvakkers op het industrieterrein, feestgangers in de avond; regen geeft vaker een jas, droge warme uren een korte broek. Ook halte-wachters, wachtprops, picknickers, fietsers-in-het-verkeer en het festivalpubliek gebruiken een rol. **Politie, figuren met een eigen `look` en alle verhaalpersonages (Jelle, Rikus, Mem, Durk, Douwe, Rotor Roelf, Beppe, Oma Trijntje) blijven zoals ze waren**: hun looks staan al als data in `storycast.js`/`missionstory.js` met exacte kleuren; omzetten naar paletstukken zou ze veranderen. Een eigen look gaat altijd voor een rol (test). Winkeliers in winkels hebben nog geen eigen persoon in de wereld.
- **Prestaties van NPC's:** één drawcall per NPC, altijd (de sieraden, het horloge en de handschoenen krijgen NPC's niet: `acc = null` zonder `outfitCtx.detail`); de rompgeometrie wordt gedeeld via de bestaande LRU (120). Gemeten met pure tests: 300 rolfiguren, gemiddeld 1,00 mesh en minder dan 6.500 driehoeken; 600 NPC's bouwen ongeveer even veel unieke rompen als de oude willekeurige look (geen extra geheugen).
- **Outfit-wissel midden in een sessie (#1153):** `{ k: 'outfit', o: code }` van gast naar host (alleen een geldige code komt door); de host zet hem in de spelerslijst en stuurt de lijst naar iedereen; de host zelf zet zijn eigen code direct. Een oude host kent het bericht niet en negeert het, een oude client negeert het veld. `coopfigures3d.js` bouwt de figuur opnieuw bij een andere code. Elke wissel (`applyLooks`) meldt zich via `emitLocalOutfitChange`.
- **Snelwisseltoets (#1154):** `6` te voet = de volgende gevulde outfit uit je kast (`cyclePreset`), overal, gratis, 1 ster minder per cooldown. Toets 6 was vrij (T is de trekker en de treinwandeling, B is bewust leeg). Het overzicht en Hulp noemen hem. Pashokje: de kledingwinkel past elk stuk in de 3D-preview op je eigen figuur; "in de auto" is Spullen > Kleding (aan en uit overal, ook in een voertuig).
- **Kapper:** haar is deel van de outfit (`worn.hair = 'stijl.kleur'`, data in `clothinghair.js`): 9 stijlen (Tammo 6, Tessa 7, eigen lijsten), 11 kleuren (natuurlijk plus zomers speels). Opslag per personage in dezelfde `kleding`-save (`h`); een oude save houdt zijn kapsel. Outfit-presets, de outfit-code (versie 2, twee tekens voorop; versie 1 blijft leesbaar), het verhaaloutfit (`setStoryOutfit({ tammo: { hair: 'bald.naturel' } })` forceert alleen het kapsel) en NPC's (kapsel per man of vrouw, oud wordt grijs) gebruiken hetzelfde. Eén haarmesh per figuur: het haar zit in de rompgeometrie. Na een kapperbezoek zegt Tammo of Tessa iets (4 korte regels per personage, alleen tekst), prestatie Nieuw kapsel. De kapper-preview is de bestaande hoofdkader-preview (de "spiegel"); of de kapper een interieur krijgt (epic-interieurs) is aan die epic.
- **Homebase:** `git fetch` toont geen `homebase`-model in `epic-verhaal-21-11` (nog niet gemerged). De kast hangt aan het personage; `wardrobeMenu(world)` is het enige ingangspunt, dus een data-gedreven huis roept hem aan.
- **Teksten:** zie [KLEDING-TEKSTEN-21-11.md](KLEDING-TEKSTEN-21-11.md).
- **Mocks (headless Chrome, geen Electron):** `docs/beeld-21-11/kleding/` (`mock.html` plus `serve.mjs`): winkel, kast, pashokje, NPC-rollen, kapper. De mocks lieten zien dat alles tekent; de Tammo-bermuda en de handschoenen staan er goed op. Ze zijn gemaakt met `desktop/vendor-cache` en tellen samen ongeveer 560 KB.

## 9. Niet gedaan en open

- Winkeliers en andere beroepsfiguren in interieurs: er zijn nog geen personen in de winkels; `opts.role` is er klaar voor.
- Chauffeurs, ambulancepersoneel en brandweer hebben nog geen eigen rolpool (politie blijft de vaste look).
- Een snelwisseltoets op de controller en op touch (nu toets 6; de controller gebruikt Spullen).
- Homebase: zodra `epic-verhaal-21-11` het model heeft, roept elk huis `wardrobeMenu(world)` aan; nu doen flat (`home.js`) en safehuis (`safehuizen.js`) dat al.
- Alles in beeld: zie [KLEDING-VERIFICATIE-21-11.md](KLEDING-VERIFICATIE-21-11.md).
