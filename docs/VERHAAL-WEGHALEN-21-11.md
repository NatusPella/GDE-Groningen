# Wat uit het verhaal verdwijnt (21-11)

Eigenaar-besluit (21-11): gaswinning en aardbevingen halen we uit het spel, "dit voegt niets toe". Hier staat per plek wat er stond, wat er nu staat en wat dat voor de stemmen betekent. De constitution (AGENTS.md, punt 6) noemt gaswinning nog als gevoelig onderwerp; die zin blijft als waarschuwing staan, de coördinator past hem later aan. Samen spelen: alles hieronder is gewone scènetekst; een gast ziet de nieuwe tekst mee, er is geen voortgang of opslag bij betrokken.

| Waar | Oud | Nieuw | Voiceline |
|---|---|---|---|
| `docs/verhaal/nieuw/09-script-akte6.md` M27.1 (Willemien) | "Delfstof Noord zet het huis op nieuwe poten. ..." | "De aannemer zet het huis op nieuwe poten. ..." | de oude regel had al geen opname (Deel 4 is alleen tekst); nieuwe regel is `[NIEUW]` en staat op de wachtlijst |
| idem, regie M27.1 | bord "DELFSTOF NOORD · VERSTERKING", een haarscheur langs de voordeur | bord "AANNEMER · VERBOUWING", een stapel nieuwe kozijnen | geen |
| idem, kop | het gasbedrijf heet Delfstof Noord | de aannemer heeft geen naam | geen |
| `game/js/storyarc_nieuw.js` M27 `lead` | "Het wordt versterkt." | "Het wordt verbouwd." | geen (telefoonbericht) |
| `game/js/missions_akte6.js` intro M27 | "het wordt versterkt. Delfstof Noord zet het op nieuwe poten" | "het wordt verbouwd. De aannemer zet het op nieuwe poten" | geen |
| `game/js/cutscenes_akte6.js` | cue op "Delfstof Noord zet" | cue op "De aannemer zet" | geen |
| `game/js/eventrules.js` nieuwsregels bij de schudgebeurtenis | "Lichte aardbeving in het Hogeland ... Delfstof Noord volgt de metingen." en "aardbeving van {m}" | "Zware trilling in het Hogeland ...: een kolonne kranen reed door een dorp." en "kracht {m}, een zware wagen over de brug" | geen (nieuwsticker, tekst) |
| `game/js/stadmissies.js` bijbaan Herstelploeg | "Herstelploeg Delfstof Noord" langs "dorpen met scheuren in de muren" | "Herstelploeg Dorpshuis Noord" (verzonnen stichting) langs "dorpshuizen die een opknapbeurt krijgen" | geen |
| `scripts/akte6_test.mjs` | eiste dat Delfstof Noord eenmaal genoemd werd | eist dat gaswinning, aardbevingen en versterking niet meer voorkomen | n.v.t. |
| `docs/verhaal/nieuw/DEEL4.md` | "het bedrijf heet alleen Delfstof Noord" | gewone verbouwing, verwijst hiernaar | n.v.t. |

Nog open (bewust niet in deze ronde):

- De interne naam van de schudgebeurtenis en het geluid (`sfxlist.js` "Aardbeving", commentaar in `audio.js`, `eventrules.js`, `scene3d.js`) blijft als codenaam; wat de speler leest of hoort is aangepast. Een hernoeming van de identifiers raakt tests en de sfx-lijst van een andere werkstroom.
- Documenten buiten de speltekst die het thema noemen (`docs/groningen-memes*.md`, `docs/PROVINCIE-VERHAAL.md`, `docs/verhaal/nieuw/00-OVERZICHT.md`, `01-akte1.md`, `04-akte4.md`, `docs/verhaal/BALANS-TEMPO.md`, `docs/verhaal/DIALECT-CONCEPT.md`) zijn achtergrond en niet aangepast; wijkt een doc af van de code, dan is het doc de fout.
- De naam "wisselwoning" (M28) betekent een tijdelijk huis tijdens een verbouwing en blijft staan.
- Voice: er zijn geen ingesproken regels vervallen door deze ronde (Deel 4 was alleen tekst).
