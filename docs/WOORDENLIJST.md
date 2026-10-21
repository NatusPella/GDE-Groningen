# Woordenlijst voor schrijvers

Alles wat een speler ziet of hoort is Nederlands (constitution 1 in [AGENTS.md](../AGENTS.md)).
Deze lijst legt vast welk Nederlands woord we kiezen waar een Engels leenwoord voor de hand ligt.
`node scripts/text_audit.mjs` (regel `anglicisme`) faalt op de Engelse vorm in speltekst; zie de lijst `ANGLICISMEN` in dat script.
Code-identifiers, bestandsnamen en opslagsleutels (`gde-save-v1`, `saveslots.js`, `data-action="save"`) blijven zoals ze zijn: alleen de zichtbare tekst telt.

| Niet | Wel | Opmerking |
| --- | --- | --- |
| save, saves | **savegame**, **savegames** | zelfstandig naamwoord; "savegame" is het gekozen woord (eigenaar), geen anglicisme |
| (scherm en menu-item) | **Opgeslagen spellen** | knoppen: **Spel opslaan**, **Spel laden**, **Spel verwijderen**, **Spel exporteren**, **Spel importeren**; slotkaartjes heten "Opgeslagen spel 1", "Opgeslagen spel 2"; losse verwijzingen in lopende tekst mogen "savegame" zeggen |
| save (werkwoord), "save je spel" | **opslaan**, **bewaren** | "Opslaan" voor de knop, "bewaren" voor een naam of kopie |
| save slot, slot (voor een savegame) | **opslagplek** | "slot" als deursluiting is gewoon Nederlands en blijft |
| backup | **herstelkopie** | |
| load, loaden | **laden** | "Laatste savegame laden" |
| (hoofdmenu) single player, solo | **Alleen spelen** | de ene hoofdkeuze naast **Samen spelen**; opent het scherm **Opgeslagen spellen** met bovenaan **Doorgaan** (het laatst gespeelde spel) en als eerste kaart **Nieuw spel**. Kiezen van een kaart is laden. Geen losse "Nieuw spel" of "Hervatten" in het hoofdmenu |
| continue, resume, hervatten (hoofdmenu en pauzemenu) | **Doorgaan** | terug naar het spel (pauzemenu: **Terug**, Esc) of verder met het laatst gespeelde spel. "Hervatten" is voor het hervatpunt na een mislukking |
| main menu, titelscherm (in beeld) | **Naar het hoofdmenu** | de knop in het pauzemenu; het scherm zelf heet **Hoofdmenu** |
| host, gastheer, gastgever | **de naam van de speler** ("Tammo heeft het spel geopend", "Wacht tot Tammo het spel start"), of **de ander** | geen rolnaam bij samen spelen (eigenaar, 20-10): niet "gastheer" en niet "gastgever". De knoppen heten **Een spel openen** en **Meedoen**; de naam is die van het personage (Tammo, Tessa) of de profielnaam. "Gast" mag waar het moet ("de gast"), liever met naam. In code en docs blijft de interne naam `host` |
| co-op, coöp, multiplayer | **samen spelen** | de naam van de modus in beeld; zie ook de regel hierboven voor wie het spel opende. Interne namen, bestanden en issue-titels blijven `coop` |
| lobby | **kamer** (of wachtkamer) | alleen waar het in beeld staat |
| checkpoint (race, route) | **controlepunt** | "Controlepunt 4/9" |
| checkpoint (opnieuw beginnen na mislukken) | **hervatpunt** | "Je begint opnieuw bij het laatste hervatpunt." |
| ghost(s) | **spook**, **spookrijder(s)** | de doorzichtige rijder van je beste tijd |
| chain | **keten** | |
| run | **ronde**, **rit**, **poging** | kies per context; skate/waterski/drift: ronde |
| tricks | **kunstjes**, **toeren** | skatepark: "kunstjes" |
| ramps, rails | **hellingen**, **leuningen** | ollie, kickflip, heelflip en grind blijven (vakterm) |
| boost | **versnelling**, **stoot** | |
| combo | **reeks** | "Reeks x3" |
| livestream | **uitzending** | |
| deadline | **uiterste tijd** | |
| shopaholic | **winkelverslaafde** | |
| total loss | **afgeschreven** | "de auto is afgeschreven" |
| hole(s) (discgolf, pitch & putt) | **baan**, **banen** | "Baan 3/9"; de mand blijft de mand |
| respawn, spawn | **opnieuw verschijnen**, **hervatten**; **verschijnen** | |
| loading | **laden** | |
| game over | **einde spel** | |
| highscore | **topscore** | |
| unlock(ed) | **ontgrendel(d)** | |
| achievement(s) | **prestatie(s)** | zo heet het scherm al |
| tutorial | **uitleg** | |
| quest | **opdracht** | |
| loot | **buit** | |
| gameplay, gamer(s) | **spel**, **speler(s)** | in regieaanwijzingen van `script.json` (niet getoond) toegestaan |

## Ingeburgerd, dus toegestaan

Niet forceren: par, birdie, eagle, bogey, ace (vaktermen van discgolf), app, film, camera, hatchback, sedan, HUD, minimap, cheat(s), score, update, skatepark, minigame, streamer.
Wordt er later een goed alternatief gekozen, voeg het dan hier toe en zet het woord in `ANGLICISMEN`.

## Uitzonderingen

Regels die al zijn ingesproken veranderen niet zonder akkoord van de eigenaar en een nieuwe opname.
Ze staan met reden in `scripts/text_audit_allow.json` (nu: "deadline" in de regel van de fietser, wordt "uiterste tijd").

## Inclusieve taal

De speltekst is voor iedereen: geen woord dat een groep raakt, geen man als standaard.
Dat is geen verbod op humor. Satire over gedrag of instituties, en een personage met eigenheid (een norse kapitein, een boze automobilist), mogen blijven.
`node scripts/text_audit.mjs` (regel `inclusief`) wijst de woorden aan; de lijst staat in `INCLUSIEF` in dat script. Wat is aangepast en wat bewust bleef: [INCLUSIEVE-TAAL.md](INCLUSIEVE-TAAL.md).

| Categorie | Niet | Wel | Opmerking |
| --- | --- | --- | --- |
| Mannelijk als standaard | politieman, brandweerman, vuilnisman, zakenman, klusjesman, stuurman, cameraman | **agent**, **brandweerlieden** (of brandweer), **vuilnisophaler**, **zakenreiziger**, **klusser**, **iemand aan het roer**, **cameraploeg** | een personage met een bekend geslacht blijft zoals het is (buurman, kroegbaas, Kapitein Klaas) |
| Vrouwelijke varianten | serveerster, verpleegster, stewardess, schoonmaakster, werkster, dienstmeisje | **serveerder**, **verpleegkundige**, **cabinepersoneel**, **schoonmaker** | idem |
| Aanspreken van een groep | jongens, meisjes, meiden, dames en heren, beste heren | **allemaal**, **iedereen**, **mensen**, **beste aanwezigen**, **luisteraars**, **hoi allemaal** | "jongens" over bepaalde jongens (Jelles jongens) of in een citaat blijft |
| Onbekende persoon | iedereen/iemand/een fietser/de speler ... hij, zijn | **die**, **diegene**, **de**, **de eigen**, **je eigen** | "Iedereen houdt de eigen voortgang" |
| Aandoening of beperking als scheldwoord | mongool, spastisch, debiel, achterlijk, gestoord, psychopaat, schizo, krankzinnig, idioot, invalide, gehandicapt, kreupel, mismaakt, dwerg, "een gek" (voor een persoon) | **iemand**, **een persoon met een beperking**, of **benoem het gedrag** (agressief, onhandig, onbezonnen) | "gek" voor gedrag of voorkeur mag ("gek op de fanfare", "rijden als gekken"); een persoon een gek noemen niet |
| Afkomst of volk | zigeuner, neger, negerzoen, kaffer, hottentot, indiaan, eskimo, allochtoon, autochtoon, mohammedaan, gastarbeider | **het volk of de herkomst bij naam** (Roma en Sinti, Inuit), of laat het weg | Groninger, Fries, Drent en dorpsnamen zijn gewoon toegestaan |
| Gender en seksualiteit als scheldwoord | flikker, mietje, nicht, travestiet, wijf, slet, hoer, homo | **laat het weg** of benoem het gedrag | |
| Ziekte als vloek | kanker, tyfus, tering, pleuris, kolere, klere | **verdraaid**, **donders**, **sapperloot** | |
| Machtstermen | master/slave, blacklist/whitelist, slaaf, guest(s) | **hoofd/volger**, **blokkeerlijst/toegestaan**, **gast** (Nederlands) | `host` is al "gastheer" (zie boven); in Samen spelen gaat het om de rol, zie de sessie die dat schrijft |

Kom je een geval tegen dat niet in de lijst staat? Vraag: zou iemand uit die groep zich geraakt voelen, en is het nodig voor de grap? Zo nee: aanpassen.
Een ingesproken regel die mild is, blijft klinken en staat met de nieuwe tekst in `scripts/voice_stil.json` (bij de volgende opname). Een echt kwetsend woord krijgt zijn opname niet meer: de regel verschijnt als ondertitel of tekstballon (ook in `voice_stil.json`).
