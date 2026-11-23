# UX/UI-audit 23-11 (senior-designerbril)

Branch `audit-uxui-23-11`. Bron: de code (`game/js`, `game/index.html`, `scripts/`), de eerdere audits (`docs/UI-KRITIEK-22-11-*`, `docs/reviews/gate-22-11/ux.json`, `docs/ESCAPEMENU-UX-21-11.md`) en 38 bestaande beelden uit `gde-gate-22-11/owner-review` (1920x1080, versie 0.64.0; het menu daarop is dus ouder dan `main`).
**Niet in beeld gecontroleerd:** alles wat hieronder staat als "uit code"; geen enkele fix van deze branch is in het spel gezien (geen Electron toegestaan). Wat de beelden toonden en de code al had verholpen (native keuzelijsten in Bezit, dubbele kop Loopbanen, foutkaart onderin) staat niet als bevinding.

Leidraad van de eigenaar: denk vanuit de speler. Per moment: wat wil ik weten, wat is nu het belangrijkste, wat is mijn doel, wat heb ik nodig om verder te kunnen? Het antwoord is nooit "meer tekst": één hoofddoel, de rest ondergeschikt of op aanvraag, wereld en icoon boven tekst, details pas als je ze zoekt.

## 1. Klantreizen

Per stap: **doel** van de speler, **nu**, **probleem**, **ingreep**. "Gedaan" = in deze branch doorgevoerd.

### R1 Eerste start tot eerste missie
| Stap | Doel | Nu | Probleem | Ingreep |
|---|---|---|---|---|
| Startscherm | Spelen | Alleen spelen, Samen spelen, Instellingen, Over, Afsluiten; geel = standaard | Goed: één primaire knop, toetshints onderin | Geen |
| Nieuw spel of doorgaan | Weten of ik verder kan | Keuzekaart "Hoe wil je spelen?" met twee grote tegels | Terugkerende speler moet via save-slots; de kaart zegt niet "waar was ik" | Doorgaan-regel met missie en speeltijd onder de tegel (open, zie schraplijst S9) |
| Laadscherm | Zien dat het werkt | Voortgangsbalk, bestemming, één statusregel, geen tips (bewust tekstdieet) | Chip "Kiezelweek" is zonder uitleg een raadsel | Chip alleen tonen bij een echt event, of een icoon met naam in de tooltip (open) |
| Opening en naamkaart | Het verhaal in | Cutscene, ondertitels, naamkaart | Ondertitels worden door een andere agent gedaan | Niet aangeraakt |
| Eerste missie | Weten wat te doen | Doelbalk boven ("Ga naar: ...", afstand), gele route op minimap, marker in de wereld, stilstand-hint na 90 s | Doelbalk heeft een tweede regel ("Volg de gele route naar de marker") die dubbel is met minimap en wereld; wordt na 9 s al gedempt (`obj-quiet`) | Houden; de regel hoort alleen de eerste keren (open, S6) |
| Vrij rondrijden | Plezier, niets in de weg | HUD "Slim": na 8 s alleen minimap en doel; geld en sterren alleen bij verandering | Goed. Wel: de prompt "Fluit een duif (E)" toont ook als hij niet kan ("Niet nu: eerst ...") | Alleen tonen als hij kan (open, S4) |
| Volgende missie vinden | Weten waar het volgende zit | Kaart, Verhaal, Activiteiten; story-gids tussen missies | Drie plekken die allemaal "wat nu" zeggen | Kaart en Verhaal verwijzen naar dezelfde stap (al zo: "Zet als doel"); Activiteiten blijft de lijst |

### R2 Terugkerende speler
Doorgaan in de rail (geel, bovenaan) en nog een keer als inhoudsknop op het Overzicht: twee keer hetzelfde woord op één scherm, en "Doorgaan" is ook de naam van "volgende stap" in de wizards (Samen spelen). Ingreep: de rail-knop is de enige primaire; de inhoudsknop op het Overzicht wordt secundair (open, S7). Het Overzicht is een halve lege pagina met negen tegeltjes; "Je voortgang 0% klaar" en "Net begonnen" zeggen bij een nieuw spel niets.

### R3 Bezit en boerderij beheren
Wens: "wat moet ik nu doen met mijn land?". Nu: één Overzicht met tegels, aandachtspunten, nieuws, filters, bulkknoppen, personeel, vee, ketens, markt; ook voor wie nog niets bezit. Probleem: een speler zonder land krijgt zes lege kopjes en twee alinea's. **Gedaan:** zonder bezit toont het Overzicht één zin met de volgende stap (kaart, laag Te koop) en niets anders (`bezitui.js`, test bijgewerkt). Open: met bezit blijven filters en bulkknoppen altijd staan; voorstel: filters pas vanaf 4 percelen, bulkknoppen pas na een vinkje (S12).

### R4 Garage en kleding
Pashokje had twaalf tabbladen in hoofdletters, waarvan zes "Passen: ..." naast dezelfde zes van je eigen kast ("Boven" tweemaal). **Gedaan:** het winkeldeel heet nu "Winkel: ..." zodat winkel en kast te onderscheiden zijn. Open: de 3D-preview is klein in een groot rasterveld; de bovenste helft van het paneel is leeg (S13). Spullen: "Geld" staat als eerste voorwerp, elk kledingstuk draagt een "Aan"-badge: ruis die het eigenlijke (wat kan ik gebruiken?) wegdrukt (S14).

### R5 Samen spelen opzetten en meedoen
Wizard met naam, kleur, akkoord (IP-adres wordt gedeeld), dan sessie. Goed: akkoord uitgeschreven, "Meer info". **Gedaan:** de knop "Toetsenbord" naast het naamveld was een ghost-knop zonder rand en las als een losse kop (op twee schermen te zien); nu een secundaire knop met rand. Open: het naamveld heeft label "Je naam" en toonde als placeholder dezelfde woorden; het akkoord-vakje staat vóór de primaire knop maar "Doorgaan" is zichtbaar actief zonder vinkje (S11).

### R6 Instellingen en grafisch
Negen tabbladen met een rechter uitlegpaneel (goed: live voorbeeld bij Toegankelijkheid). Problemen: de kop rechtsboven "Systeem · 1 van 2" is een telling zonder nut (#911) en "Standaard herstellen" staat als losse tekst op koplijn, naast de titel; uit-stand van een schakelaar is een donkere knop en kan voor "aan" doorgaan (S8, vraagt beeld). Het tabblad Besturing mengt per rij drie contexten in één regel ("Springen, handrem . menu: kiezen"); voorstel: kolommen Te voet, Rijden, Menu (S10).

### R7 Vastlopen en hulp vinden
Pauzemenu > Spel > "Vastgelopen?" (uitklap), Over > Problemen, foutkaart met "Kopieer foutrapport", stilstand-kaart "De weg kwijt?" na 90 s (max twee per sessie). Goed gedekt. Probleem: de hulp zit achter een uitklapregel in kleine hoofdletters onder de tegels; voorstel: bij 'vastgelopen' signalen (voertuig ondersteboven, lang stilstaan) één actieknop in het HUD-bericht (open, S15).

### R8 Afsluiten en opslaan
Autosave-chip van 1,5 s zonder tekst (`opgeslagen`); "Opslaan & stoppen" als tabblad. Probleem: "Opslaan" op het Overzicht is een kale tekstknop (geen rand) naast drie echte knoppen; "Afsluiten" staat in dezelfde rail onder alle onderdelen, wat goed is, maar zonder bevestiging bij onopgeslagen voortgang is dat een veilige weg (bestaat al, niet opnieuw bekeken).

## 2. Visuele hiërarchie per scherm

Per scherm: **primair / secundair / tertiair**, wat er niet hoort, wat ten onrechte aandacht trekt.

| Scherm | Primair | Secundair | Hoort er (nu) niet | Trekt ten onrechte aandacht |
|---|---|---|---|---|
| HUD te voet, begin | Doel + minimap | Prompt, bericht | Tweede doelregel, "Ze zoeken je"-label naast een kaart die dat al toont | Vier tegels tegelijk linksboven/midden; de prompt in grijs "Niet nu" |
| HUD rijden | Snelheid, afslag | Doel | Berichtkaart bij rijden (alleen P0/P1) | Foutmelding-tegel in de gate-beelden (zie 5) |
| Pauzemenu/Overzicht | Doorgaan | Missie, kaart | Negen tegeltjes met nullen; dubbele Doorgaan | Voortgangsbalk met 0% in groot lettertype |
| Kaart | De kaart, waypoint | Zoeken, lagen | "Zo werkt de kaart" als venster over het midden; nummerbadges 1 en 2 | Het venster blokkeert de kaart bij de eerste openstelling |
| Instellingen | De gekozen instelling | Uitleg rechts | Teller "1 van 2", herstelknop op koplijn | Kleine uit/aan-schakelaar die op uit zwaar oogt |
| Loopbanen | Nu-stop + "Nu starten" | Eis, beloning | Herhaalde "Eerste klus"-tekst (drie keer), dichte stops | Tien identieke dichte rijen (**gedaan**: één regel) |
| Spullen | Het gekozen voorwerp | Tabs | "Geld" als voorwerp, "Aan"-badges | Badges en categorielabels in 11 px op elke kaart |
| Land en bedrijf | Volgende stap | Tegels | Alles zonder bezit (**gedaan**) | Drie alinea's tekst bovenop de tegels |
| Pashokje | Wat ik nu pas | Outfit bewaren | Tweede set tabbladen (deels **gedaan**) | Twaalf tabbladen in hoofdletters |
| Samen-wizard | Naam + akkoord | Kleur | Tweede "Toetsenbord"-kop (**gedaan**) | Een ghost-knop die op kop lijkt |
| Laadscherm | Voortgang | Bestemming | Event-chip zonder uitleg | De schuine foto (hoort bij de stijl, geen bezwaar) |

## 3. Schraplijst (voegt het iets toe of leidt het af?)

| # | Element | Oordeel | Actie |
|---|---|---|---|
| S1 | Tien keer "Nog dicht, later in het verhaal" in de tour | leidt af | **Gedaan**: een regel |
| S2 | Nulltegels, filters, Personeel, Vee, Ketens, Markt zonder bezit | leidt af | **Gedaan** |
| S3 | "Systeem . 1 van 2" naast elke bladkop | voegt bijna niets toe | Open: weglaten of tot alleen naam (raakt #911 en `spelmenu_test`) |
| S4 | Prompt "Fluit een duif (E)" in grijs terwijl het niet kan | leidt af | Open: alleen bij mogelijk |
| S5 | Tweede en derde herhaling van de eerste-klus-tekst in Loopbanen | leidt af | Open: één bron (`lb-start`), de kopregel krijgt alleen de titel |
| S6 | Doelbalk-subregel "Volg de gele route ..." | houden de eerste drie keer, daarna weg | Open (uit code: `hud_panel.js` rond 1632) |
| S7 | Twee Doorgaan-knoppen op het Overzicht | dubbel | Open: inhoudsknop secundair |
| S8 | Uit-stand van de schakelaar | vraagt beeld | Open |
| S9 | "Je voortgang 0% klaar" bij een nieuw spel | zegt niets | Open: pas na eerste missie |
| S10 | Besturing: drie contexten per rij | te druk | Open: kolommen |
| S11 | Placeholder die het label herhaalt | ruis | Open (gate-beeld; in de code staat nu "Je figuur") |
| S12 | Filters en bulkknoppen bij 1 perceel | te vroeg | Open |
| S13 | Lege bovenhelft pashokje | verspilde ruimte | Open |
| S14 | "Aan"-badge op elk kledingstuk, Geld als voorwerp | ruis | Open |
| S15 | Hulp achter "Vastgelopen?" | te diep | Open |
| S16 | Toetsregel noemde Q/E soms "onderdeel", soms "tabblad", en ontbrak op het Overzicht | inconsistent | **Gedaan**: overal "tabblad", ook bij Overzicht |

## 4. Genre-patronen (alleen in deze audit genoemd: GTA V/Online, Red Dead 2, Watch Dogs, Saints Row, Forza Horizon, Spider-Man, Cyberpunk, Assassin's Creed, Zelda BotW/TotK)

| Patroon | Genre-standaard | Wij nu | Volgen we het? | Ingreep |
|---|---|---|---|---|
| Minimap met GPS-route en één doelkleur | Route in één kleur op de minimap, doel in dezelfde kleur | Gele route, gele marker, `--mk-*` rollen voor kleurenblind | ja | Geen |
| Missiemarkers met letter/icoon op kaart en in de wereld | Letter of icoon in kleur van het soort | Icoon in de wereld (bv. duifmarker), kaartglyphs (`mapglyphs.js`), vormen naast kleur | ja | Geen |
| Doeltekst kort en tijdelijk | Eén regel linksonder, vervaagt | Eén doelbalk boven met werkwoord en afstand; dempt na 9 s | deels | S6: tweede regel pas de eerste keren |
| "Wat nu"-hint na stilstand | Na een minuut een zachte hint | Kaart "De weg kwijt?" na 90 s, max twee per sessie (`firststeps.js`) | ja | Geen |
| Kaart: legenda, filters, waypoint met één knop, snel reizen | Lagen, klik = waypoint, reisopties | Lagen 29/31, klik plaatst waypoint, reiskaart met taxi/trein | ja | Uitleg als just-in-time ipv venster (nee, zie hieronder) |
| Pauzemenu-structuur (kaart eerst) | Kaart als eerste tab | Rail Spel, Doen (Verhaal, Activiteiten, Loopbanen, Kaart), Bezit, Voortgang, Systeem | deels | Kaart staat vierde; M opent hem direct (bestaat). Geen verplaatsing: de eigenaar koos deze indeling |
| Telefoon als menu | Telefoon met apps | Telefoon met nieuws en berichten, geen app-menu | deels | Open: telefoon blijft nieuws; menu is het pauzemenu |
| HUD verbergt zichzelf bij rust | Geld en wanted alleen bij verandering | Modus Slim: 8 s zonder invoer, geld 4 s na verandering (`hudrules.js`) | ja | Geen |
| Meldingen rechtsboven, één tegelijk | Een rij rechtsboven | Eén wachtrij (`notifyqueue.js`), links in zone A, één kaart + "+N in de wacht" | ja (andere hoek, zelfde regel) | Geen |
| Missiestart en -einde-kaarten | Titel in, resultaat met beloning uit | `bigmoment.js` (schermvullend, blokkeert de rest) | ja | Geen |
| Checkpoint/herstart bij falen met "Opnieuw proberen" | Direct opnieuw | Checkpoints per stage (`missioncheckpoint.js`); geen knop met die tekst in de missie-uitslag gevonden in een snelle zoekopdracht | deels | Open: controleren of het eindscherm "Opnieuw proberen" en "Terug" heeft |
| Garage/kleding met 3D-preview en vergelijken | Preview, vergelijk, stats | Showroom met tuning, kledingpreview naast figuur, geen vergelijking naast elkaar | deels | Open: stat-balk voor/na bij tuning (S13) |
| Laadscherm met tip en voortgang | Tip + voortgang | Voortgang + één statusregel; **tips bewust weg** (tekstdieet 21-11) | deels (bewust) | Geen: de eigenaar koos dit |
| Onboarding just-in-time | Knop pas uitleggen bij gebruik | `contexthints.js`: eerste voertuigsoort of minigame, één kaart, één keer; maar de kaart opent met een 4-stappen venster | deels | Kaartvenster kan op just-in-time: stap 1 (zoeken) pas bij focus op het zoekveld (open) |
| Contextuele knophints | Alleen als relevant | Toetsregel per scherm, HUD-prompts met toets in de knop | ja | S4 en S16 |
| Voertuig in-/uitstappen | Een knop, animatie | E/Y, prompt bij het voertuig | ja | Geen |
| Snel wisselen van radiozender | Wiel of toets | Radiokeuze, `radiocontrol.js` | ja | Geen |
| Samen spelen: lobby, invite, voortgang per speler, host-overdracht | Lobby, code, per-speler voortgang | Wizard, code, voortgang per speler (#429), host-overdracht (#439) | ja | Geen |
| Opslaan: autosave-icoon | Klein icoon bij opslaan | Statuschip van 1,5 s (`savegame.js`) | ja | Geen |

## 5. Rangschikking van de bevindingen

| Ernst | Scherm | Probleem | Voorstel | Stand |
|---|---|---|---|---|
| hoog | Samen-wizard, Besturing | Knop "Toetsenbord" zonder rand leest als kop | Secundaire knop | **Gedaan** |
| hoog | Land en bedrijf (nieuw spel) | Zes lege kopjes en twee alinea's voor wie niets bezit | Alleen volgende stap | **Gedaan** |
| hoog | Loopbanen | Tien identieke dichte rijen duwen de inhoud weg | Eén regel | **Gedaan** |
| middel | Pashokje | Winkel- en kasttabs heten bijna hetzelfde | "Winkel:" | **Gedaan** |
| middel | Pauzemenu | "onderdeel" en "tabblad" voor dezelfde toets; Overzicht mist Q/E | Eén woord, overal | **Gedaan** |
| middel | HUD | Prompt die niet kan toont toch | Verbergen | Open |
| middel | Overzicht | Dubbele Doorgaan, kale Opslaan-tekstknop | Eén primair, de rest secundair met rand | Open |
| middel | Besturing | Drie contexten per rij | Kolommen | Open |
| middel | Instellingen | Teller en herstelknop op koplijn | Weglaten / naar onder | Open |
| laag | Laadscherm | Chip "Kiezelweek" zonder uitleg | Alleen bij event of icoon | Open |
| laag | Spullen | "Aan"-badges, Geld als voorwerp | Eén vinkje-icoon, geld naar kop | Open |
| laag | Kaart | Uitlegvenster over het midden | Just-in-time pins | Open |
| ratel | DS3 | `ds3_ratel_test`: kleur 64, glas 114, oud 51, font 33, klein 1, svg 31 in 70 bestanden; "oud 49" zit grotendeels in `ds-components.css`, het tweede componentenstelsel `.ds-kaart/.ds-knop/.ds-chip` naast `.ds-z-*` | Eén stelsel (`.ds-z-*`) en `.ds-kaart` uitfaseren | Open, groot; niet in deze ronde |

**Gate-beelden met foutkaart:** drie beelden uit de gaterun (HUD rijden, HUD kaarten, telefoon/nieuws) tonen de kaart "Er ging iets mis" met afgeknipte titel bovenaan. De code zet die kaart onderin (`ds-schermen.css`, `bottom`). Dit lijkt een ouder stage of een echt scriptfout tijdens de run; niet te reproduceren zonder Electron. Aanbeveling: de gaterun-logs op `showFrameError` nakijken.

## 6. Wat niet gecontroleerd is
- Geen enkele wijziging is in beeld gezien. De vijf wijzigingen zijn alleen pure code en getest met `careertimeline_test`, `menu_aaa_test`, `onscreenkeyboard_test`, `bezitui_test` (aangepast), `bezit_verfijn_test`, `boerderij_tekstmassa_test`, `spullen_test`, `bezitlive_keten_test`, `spelmenu_test`, `kaartpopups_test`, `controlhint_test`, `menu_tabs_audit_test`.
- Controller- en focusvolgorde: alleen `controller_audit_overlays` (47 schermen, 1 bevinding) en `menu_tabs_audit` (18 tabbladen) gelezen; echte padnavigatie niet gespeeld.
- Contrast van de uit-schakelaar, beeldgrootte van de 3D-preview in het pashokje en de afstand tussen toetsregel en kaartknoppen onderaan de kaart zijn schattingen uit de beelden.
- Winkels, benchmark en tutorial: alleen code en vorige audits, geen eigen beeld.
