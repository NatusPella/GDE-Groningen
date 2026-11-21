# Beeldronde 21-11: alles van de nacht samen in beeld

Build: `origin/main` (550891a1d, 0.64.0 + alle nachtelijke wijzigingen), gestaged met de wereld uit de hoofdmap, echte Electron
(`--no-sandbox --in-process-gpu`), wegwerpprofiel, vaste klok 13:00 en helder weer, 1920x1080 (1280x720 voor Loopbanen, Spullen, Boerderij, kaart en HUD).
Niets is door een mens gespeeld; alleen deze beelden zijn bekeken (door een agent). Beeldnamen: `<map>/<nummer>-<scherm>-<breedte>.png`.
Alleen een selectie PNG's staat in git; de rest staat lokaal in de worktree (zie "Bestanden").

Tooling (nieuw, `scripts/qa/`): `menufoto.mjs` kreeg `--page=<script>` en `--minuten=<n>` en een eigen TEMP; page-scripts
`beeldronde_rook.page.js` (rook), `beeldronde_missies.page.js`, `beeldronde_wereld.page.js`, `beeldronde_laadbench.page.js`.
De samen-mock van `menufoto.page.js` kreeg `removing`, `setInput` en `tick/release`, maar de lobby-beelden zijn in deze ronde niet opnieuw gemaakt (zie "Niet gelukt").

## Rookcontrole (map `rook/`, `rook/menufoto-1920.json`)

| Controle | Uitkomst |
|---|---|
| Nieuw spel start | ja; `game-started`, geen foutvenster |
| JS-fouten in de console (onerror, promise, console.error) | geen, behalve de twee hieronder |
| HUD na start (opening speelt, `cine-hide-hud`+`intro-montage` aan, 0 HUD-kinderen zichtbaar) | verwacht: de HUD is tijdens de openingsfilm bewust weg |
| HUD na de openingscutscene | zichtbaar (6 kinderen: rechtsboven, zone B, nowplaying, minikaart, kolom, prompts) |
| HUD na heli-missie (start, tijdens stappen, na het einde) | zichtbaar (5 tot 6 kinderen), geen `cine-hide-hud`; `hud-heli` aanwezig |
| HUD in duivenmodus en erna | zichtbaar (4, daarna 6) |
| HUD tijdens de benchmark | weg (`trailer-on`, `#hud` display none): bedoeld |
| HUD na de benchmark | terug (7 kinderen), `trailer-on` weg |
| `_bPre`-achtige ReferenceErrors | geen gezien (`popin_wiring_test` dekt dat statisch) |

"De UI is onzichtbaar bij een heli-missie" is **niet** gereproduceerd (heli vanaf de debug-start, met stappen overslaan). Een echte vlucht met
instappen is niet gedaan; dus niet uitgesloten.

Twee fouten in de log, beide door mijn aanroep (`runTrailer(..., env: {})` zonder renderomgeving), niet door het spel: `trailer render ... r.env.render is not a function` en
`updateBirds ... (reading 'dummy')`. De echte benchmark uit Instellingen draaide wel (zie hieronder) en gaf geen fout.

## 1. Escape-menu (map `menu/`, 1920; `menu1280/` voor 1280)

| Nr | Beeld | Wat te zien | Goed | Niet goed |
|---|---|---|---|---|
| 01 | `menu/01-escape-overzicht-1920` | Spel > Overzicht, rail in groepen Spel/Doen/Bezit/Voortgang/Systeem | rail rustig, geen tellers achter koppen; knoppenrij Doorgaan, Zet als doel, Kaart | rechts onder de kop staat "Spel / Doorgaan, samen spelen..." als losse kleine kop (rommelig, oud) |
| 02 | `menu/02-escape-verhaal-1920` | Verhaal: Opdrachten/Personages/Aanwijzingen | duidelijk, "Waar je nu bent" | **rail toont nog een getal "1" achter Verhaal** (opdracht was geen tellers; zie 30 waar het "2" is); onderaan wordt de lijst afgekapt (scroll, ok) |
| 03 | `menu/03-escape-activiteiten-1920` | Activiteiten | niet nader beoordeeld | |
| 04 | `menu/04-escape-loopbanen-1920`, `menu1280/04-...-1280` | NIEUWE Loopbanen: kaarten met pictogram, titel, niveau, "Nu starten", detail rechts met balk, Eis/Verdient nu/Volgende beloning | kaartenlijst en detail goed leesbaar op 1280 | **1920: de gele knop "Nu starten" onderaan het detail is afgekapt; het vinkje van de gekozen rij ligt over de pill "Nu starten"** (issue #1055) |
| 06 | `menu/06-escape-spullen-1920`, `menu1280/06-...-1280` | NIEUWE Spullen: raster van tegels (Geld, Vuisten, Stadjer classic...), filters, detail | raster en filters goed op 1280 | **de weggooien-bevestiging is niet in beeld gebracht** (niet gedaan); tegelnaam "In de ha..." is afgekapt (1280) |
| 07 | `menu/07-escape-garage-1920` | Garage | niet nader beoordeeld | |
| 08 | `menu/08-escape-boerderij-1920`, `menu1280/08-...-1280` | NIEUWE Boerderij: veldkaarten (Akker De Zonnehoek), fasebalk Ploegen..Afleveren | 1280: kaart "Akker De Zonnehoek" past, titel wordt wel afgebroken over twee regels | onderkant van de veldkaart wordt op 1280 afgekapt door de paneelrand (scroll, ok) |
| 09 | `menu/09-escape-veroverd-1920` | Veroverd: Gebieden / Beleidswinkel | leesbaar | |
| 10, 11 | `menu/10-...`, `menu/11-...` | Prestaties, Foto's | niet nader beoordeeld | |
| 12 | `menu/12-escape-instellingen-beeld-1920` | Instellingen > Beeld, tabs Beeld..Toegankelijkheid | tabs en Voorinstelling goed | |
| 13 | `menu/13-...camera-terugkeerscene-1920` | Camera met Terugkeerscene | niet nader beoordeeld | |
| 14 | `menu/14-escape-cheats-1920` | Cheats | niet nader beoordeeld | |
| 15..17 | `menu/15..17` | Besturing: toetsen, overzicht, controller | toetsplaatjes (WASD, SHIFT, SPACE, CTRL) overal; geen ruwe toetsnamen gezien | in 16 is de onderste rij ("Hengelen", "Weer mens worden") half afgekapt (lijst scrolt) |

## 2. Kaart (map `menu/`, `menu1280/`)

| Nr | Beeld | Wat te zien | Goed | Niet goed |
|---|---|---|---|---|
| 24 | `menu/24-kaart-zo-werkt-de-kaart-open-1920` | "Zo werkt de kaart" met knop Begrepen en verwijzing naar Instellingen > Besturing > Hulp | sluit met Begrepen; verschijnt alleen als het nog niet gezien is | de uitleg ligt in het midden over de kaart (bedoeld) |
| 20..22 | `menu/20..22-kaart-zoom-1/3/6` | kaart in drie zoomstanden, wereldmenging 0,4: donkergroen land, crème wegen, ronde markers | markers leesbaar, veroverd-legenda linksonder | het Lagen-paneel staat in de beelden open en dekt de rechterkant; bij zoom 3 zijn Klussen uit (bewust) |
| 23 | `menu/23-kaart-lagenpaneel-1920` | Paneel "Op de kaart": Altijd, Te doen (schakelaars), Diensten, Onderweg | schakelaars duidelijk | |
| 25 | `menu/25-...gesloten-1920` | kaart zonder uitleg | | |
| 26 | `menu/26-minikaart-hud-1920` | HUD met minikaart (2 rijen markers), duif-hint | minikaart goed leesbaar | de politielabel is hier niet zichtbaar (geen wanted); zie 52 |
| 52 | `hud3/52-hud-rijden-politie-wanted-minikaartlabel-1920` | minikaart met schild "7" en "3/5" sterren, drie sterren in beeld | politielabel goed | camera staat in/bij de auto: het beeld is een grote donkere massa |
| 60, 61 | `hud3/60..61-kaart-reisopties-taxi-...` | kaartkaart "Reis erheen": trein, bus, taxi (aanbevolen), zelf gaan, knop "Reis nu" | opties en prijs/tijd leesbaar | **de kaart is boven afgesneden en dekt de Lagen-knop** (issue #1054); 60 (uitgeschakeld met reden) is opnieuw niet gelukt: de taxi is bruikbaar |

## 3. HUD, telefoon, uitleg, Instellingen (map `hud3/`, `menu1280/`)

| Nr | Beeld | Wat te zien | Goed | Niet goed |
|---|---|---|---|---|
| 50 | `hud3/50-hud-te-voet-1920` | HUD te voet | leesbaar | |
| 51 | `hud3/51-hud-rijden-compacte-snelheidsmeter-1920` | in de auto: routehint "Over 40 m linksaf", voertuigplaat | | de snelheidsmeter staat hier niet in beeld (stilstaand); zie 52/53 voor de meter "11 km/u 1234" |
| 52, 53 | `hud3/52`, `hud3/53`, `menu1280/52` | compacte snelheidsmeter met versnellingen, sterren, hints met toetsplaatjes (W S A D SPACE E), politielabel, "Ontsnap aan de politie" | toetsplaatjes en meter goed | **1280: de kaart "Ontsnap aan de politie" is een hoge, halfleeg kaart (toetshints ontbreken)** |
| 54 | `hud3/54-hud-telefoon-nieuws-lange-kop-1920` | Kiekdoar-nieuws met lange tekst | kop wordt over meerdere regels gebroken, niet afgekapt | |
| 55 | `hud3/55-hud-kaarten-tip-missie-geld-1920` | nieuwskaart + "Nait duur Bisschopskwartier" + minikaart | | alleen de nieuwskaart kwam in beeld; tip/missie/geld-kaarten waren al weg |
| 56 | `hud3/56-hud-toetshints-instappen-1920` | te voet naast een auto | geen instaphint, camera in een muur | |
| - | `wereld3/w15-fiets-gepakt-1920` | op een gepakte fiets: "FIETS Omafiets", snelheid 0 km/u, Uitstappen E | compact en leesbaar | |
| 30 | `menu/30-samen-keuze-zonder-sessie-1920` | Spel > Samen spelen > Sessie: stap 1 van 3 (Meedoen, Zelf een sessie openen, Besloten spelen) | toestemmingstekst bij Meedoen duidelijk | **"Besloten spelen" wordt onderaan afgekapt** (scroll nodig; ook in de vorige ronde zo) |
| x1 | `wereld2/x1-penalty-uitleg-1920` | uitleg `.ds-uitleg` van de penaltyserie met toetsplaatjes (A D, W S, SPACE) | **gefixt:** "Houd [SPACE], laat los" had geen toets (zie "Gefixt") | "0 VAN" in de kop mist het getal (issue #1056) |
| - | `laadbench2/q2-benchmark-na-klik-1920` | Instellingen > Beeld: Benchmark draaien met bevestiging (Starten, Annuleren, ESC stopt) | duidelijke bevestiging | |

De QTE-instelling in Instellingen en de Hulp-pagina 'Zo werkt het' zijn **niet** apart in beeld gebracht (Hints & uitleg en Hulp zijn niet bezocht).

## 4. Missies

| Nr | Beeld (map `missies*/`) | Wat te zien | Goed | Niet goed |
|---|---|---|---|---|
| Fatbikes | `missies/m1-fatbikes-stap*-1920` | teller "Ontweken 0, Geraakt 0/2", tijd, tip "Stap opzij met [A] [D]", golven | teller leesbaar | de tipregel "Stap opzij met en ." had geen toetsplaatjes in de HUD-tekst; in het beeld niet apart gecontroleerd; bestandsnaam heet "stapundefined" (mijn script) |
| Kist Kees | `missies/m2-kist-kees-stap0/1-1920` | instaptip "Stap in het vliegtuig van Roelfien", stap 1/3; daarna vliegtuig met instrumenten, toetsplaatjes W S A D Q E K G, rechte luchtroute | toetsplaatjes goed, route ("Koers 292, rechts voor je") leesbaar | |
| Heli | `missies3/m3-heli-rooster-stap0-1920` | Het staat niet in het rooster: heli-HUD (Snelheid, Ballon, Score), Wieken Wubbo-paneel | paneel rechtsonder en toetsbalk goed | **de heli-kaart ligt over de missiekaart (uitleg half verborgen)** (issue #1058) |
| Loket | `missies2/m4-loket-stap0..5-1920` | binnen: wachtrij, loket A/C, antwoordkeuze 1-2-3 met toetsplaatjes, "De klok loopt harder" | binnen speelt zich echt binnen af (plafond, rij, posters); keuzekaart leesbaar | op `stap3` staat de camera in het midden een grote zwarte paal (kolom), de kaart "Loket A" ligt boven |
| Duivenspot | `missies2/m5-duivenspot-stap0-1920` | kaartenstapel | | **veel overlap** (issue #1053): vier kaarten boven elkaar, Duivenmelker-kaart afgekapt door een bordje, drie keer dezelfde toetsuitleg, naamplaten door elkaar |
| Container | `missies2/m6-container-stap0..4-1920` | "Sluip naar de kraan aan de kade", timer 7:46, "Het plan" met kraan-icoon, Eemshaven | kraan/dockplan en timer goed | de kraan zelf (3D op de kade) en de container naast de weg zijn **niet in beeld** gebracht: de camera blijft bij de spelers (alleen HUD gecontroleerd); in `missies2/m6-...-stap2` staat een grote zwarte vorm "Het plan" in het icoon (zwart vlak, geen details) |
| Penaltyserie | `missies2/p1..p6-penalty-*-1920` | poort aan de zuidkant (1804, 1549), keeper, doel, HUD rechtsonder | poort, richten en HUD leesbaar; `p6` toont het bord "FC Grunn-achtig Penaltyserie" met "ZILVER", "5 DOELPUNTEN" | zie #1056 voor "0 van"; 4 van 5 schoten in mijn scriptlus zijn niet gecontroleerd |
| Akte 5/6 | `missies2/a5*`, `a6*` (Dijk, Open dicht, Stoom, Bourtange; De colonne, Heel aankomen, Terug, Proefbeleg, Klassiek) | stappen met radio-kaart (Nachtstreek), tijdbalk, trekker-/sloep-/wachtkaarten | geen foutteksten ("undefined", "NaN") in de HUD-tekst van alle stappen | camera staat meestal op de speler en maatje, niet op het doel; het slot van akte 5 en 6 is niet als beeld beoordeeld |
| Bijbanen | `missies3/j*`, `bijbanen/` | taxi/bus/bezorger/taxinacht/fietssoep startten (`shifts` +1) | | **niet gelukt:** de debug-start geeft alleen een tip-kaart ("Centrale: Drie studenten..."), de rit zelf (instappen in de taxi, klant) is niet gespeeld; beelden verwijderd (leeg) |

## 5. Wereld (map `wereld/`, `wereld2/`, `wereld3/`)

| Nr | Beeld | Wat te zien | Goed | Niet goed |
|---|---|---|---|---|
| Station Veendam | `wereld2/w1..w3-station-veendam-*` | laag stationsgebouw met perron, treinreisbord "Vertrekbord Veendam", trein, parkeerterrein | geen kerkvorm; laag perron met luifel, trein en geparkeerde auto's | het stationsgebouw zelf zit buiten beeld (alleen perron, spoor en vertrekbord); de klokpaal niet apart gecontroleerd |
| Brug met pijlers | `wereld2/w4..w6-brug-*` | Laan 1940-1945 (6 m dek) | pijlers staan onder het dek (grijze steunen onder een donker dek) | de onderkant van het dek is een egaal donker vlak zonder detail; geen bewuste fout |
| Sloot (auto remt) | niet gelukt | | | geen sloot naast een weg gevonden door mijn zoeker |
| Plaatsnaambord omver | `wereld3/w10-bord-voor-1920` | bord ("Winsum / Onderdendam") bij een kruising | bord gevonden en in beeld | de rit erlangs is niet gelukt (geen weg bij het bord gevonden); niet omver gereden |
| Trekker 3e persoon | `trekker/shots-tk-trekker.png` (+ klein, maaidorser, bus, sedan) | camera boven en achter de cabine | cabine/dak niet in beeld, bestuurder, achterwielen en weg zichtbaar | |
| Eerste persoon | `wereld/w12`, `w13-eerste-persoon-*` | handen met blauwe handschoenen (geen wapen in w13 gezien) | handen zichtbaar | **wapen niet in beeld** (pistool pakken lukte niet); duif linksonder (de duif-sprite) |
| Fiets uit stalling | `wereld3/w14`, `w15` | fietsenstalling, fiets gepakt (Omafiets) | pakken lukte (`fietsInVoertuig`) | de camera staat in een gebouwenstraat; de fiets zelf wordt deels door de speler en Tessa verdekt |
| Vaarlijn op water | niet gelukt | | | geen boot kunnen maken (`spawnBoatOnWater` gaf null op de gekozen plek) |
| Luchtroute in vliegtuig | niet gelukt | | | niet geprobeerd na de boot; zie Kist Kees voor de route in de HUD |
| Bomen/heg niet op de weg | niet apart gecontroleerd | | | |
| Wereldkleuren op 3 plekken | `wereld/w17-wereldkleur-k1..k3-*` | Grote Markt, Usquert, haven | kleuren rustig, geen fouten | **Usquert: twee enorme zwarte zuilen met een brede schaduw** (issue #1057) |

## 6. Benchmark en laadscherm (map `laadbench2/`, `hud3/`)

- Start: `laadbench2/q1`, `q2` (knop, bevestiging). Lopend: `hud3/41` is **zwart** met "Benchmark stoppen"; mijn runtrailer-aanroep (zonder renderomgeving) tekent niets. De echte benchmark draaide 360 s (de run eindigde door de timer van mijn script op 6 min voordat het resultaat kwam), dus het echte resultaatscherm is niet gezien.
- Resultaatscherm (synthetische frametijden): `hud3/42`, `43`: kaart Benchmark met FPS gemiddeld/P95/Laagste 1%/JS-heap, tegels Stad/Provincie/Spoor/Water, advies "Midden", knoppen Toepassen/Nog een keer/Instellingen/Technische info kopiëren/Terug met toetsplaatjes (ESC). Alles leesbaar, aanklikbaar, geen overlap (de ondertitel uit de vorige ronde is er nu niet).
- Laadscherm, echt (kind `save` en `snel`): `laadbench2/lsave1..5`, `lsnel1`: logo, "Verder in Concordiabuurt", "Stap 3 van 4: De tegels rond je worden gelegd" en "Stap 4 van 4", gele balk, tip, knop "Verder [ENTER]". Dus de stappen komen werkelijk door (4 stappen).
- Eerste laadscherm (boot): `rook/_boot-1920/boot-00..11`.

Gefixt: de toets in een tip op het laadscherm hing onder de regel en kreeg de kopstijl (`lsave1`); nu op de regel (zie "Gefixt").

## 7. Samen spelen

Alleen het keuzescherm (30) is vastgelegd. De lobbybeelden (host, gast, spelerslijst, Tab-hint) zijn **niet** opnieuw gemaakt: de eerste run gaf nog het foutvenster
"Cannot convert undefined or null to object" door de nagebootste sessie (`coopnet.js:1152`, `removing` ontbrak) en `s.setInput is not a function`. De mock is daarna aangevuld, maar de run met `--sets=samen` is niet herhaald; de beelden uit de run met fout zijn verwijderd.

## Gevonden fouten (issues)

| # | Titel | Impact |
|---|---|---|
| 1053 | Duivenmodus: HUD-kaarten, naamplaten en toetsuitleg liggen over elkaar | hoog |
| 1054 | Kaart: de reisopties-kaart is boven afgesneden en dekt de Lagen-knop | laag |
| 1055 | Loopbanen: knop Nu starten is onderaan afgekapt en het vinkje ligt over de pill | laag |
| 1056 | Penaltyserie-HUD: "0 van 5" in de kop is afgekapt tot "0 VAN" | laag |
| 1057 | Usquert: enorme zwarte zuilen met brede schaduw bij de plek 2770, -20431 | midden |
| 1058 | Heli-missie: de heli-kaart ligt over de missiekaart linksboven | midden |

## Gefixt (eigen commits, met test)

- `game/js/uitleg.js`: een uitlegstap met pictogram en een toets in de tekst (`Houd {SPATIE}, laat los bij het streepje`) liet de toets uit de tekst vallen maar toonde hem niet; nu is de toets het grote beeld. Plus: geen losse spatie voor de komma. Test: `scripts/uitleg_test.mjs` (493/493).
- `game/js/loadscreen.css`: de kopstijl van de tip (`.ls-tip div span`) raakte ook het toetsplaatje in de tipregel; nu `div > span`. Test: `scripts/loadlogic_test.mjs` (1358/1358).
- Changelog onder `[Unreleased]` > Opgelost bijgewerkt.

## Niet gelukt of niet bekeken (eerlijk)

Lobby/Samen met sessie; echte benchmark-resultaatscherm; Spullen weggooien-bevestiging; QTE-instelling en Hulp; sloot (auto remt); bord omver; vaarlijn in boot; luchtroute in vliegtuig;
bomen/heg bij streekplekken; kraan en container in 3D; bijbaanbeats echt gespeeld; wapen in eerste persoon; "UI onzichtbaar" bij een echte heli-vlucht; 1280x720 van de lastigste missies.
Kleine punten zonder issue: Verhaal-teller in de rail (nog een getal); rechtsboven in Spel > Overzicht een losse kop; Spel > Samen spelen kader onderaan afgekapt (ook in de vorige ronde).

## Bestanden

Alle absolute paden onder `C:\Users\abuis\GIT\GDE-Groningen\.claude\worktrees\agent-a9a1cb8bcc4a260bf\docs\beeld-21-11\beeldronde\` (mappen `rook`, `menu`, `menu1280`, `hud3`, `missies`, `missies2`, `missies3`, `wereld`, `wereld2`, `wereld3`, `laadbench2`, `trekker`).
