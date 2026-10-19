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
| host | **gastheer** | de speler die de kamer opent bij samen spelen; de ander is de gast |
| co-op, coöp, multiplayer | **samen spelen** | de naam van de modus in beeld; "gastheer" en "gast" voor host en guest. Interne namen, bestanden en issue-titels blijven `coop` |
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

## Ingeburgerd, dus toegestaan

Niet forceren: par, birdie, eagle, bogey, ace (vaktermen van discgolf), app, film, camera, hatchback, sedan, HUD, minimap, cheat(s), score, update, skatepark, minigame, streamer.
Wordt er later een goed alternatief gekozen, voeg het dan hier toe en zet het woord in `ANGLICISMEN`.

## Uitzonderingen

Regels die al zijn ingesproken veranderen niet zonder akkoord van de eigenaar en een nieuwe opname.
Ze staan met reden in `scripts/text_audit_allow.json` (nu: "deadline" in de regel van de fietser, wordt "uiterste tijd").
