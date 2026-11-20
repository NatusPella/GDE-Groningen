# Hertest-triage (label `hertest`)

Doel: de 485 issues met label `hertest` (gesloten werk van een ander AI-harnas dat de eigenaar niet vertrouwt, 24-10 t/m 17-11) sorteren op wat er in code te bewijzen valt. Er is **geen issue gesloten, heropend of van comment voorzien**. Peildatum: 20-11-2026, branch-HEAD `11aa9a0f0`. Een issue sluit pas met beeldbewijs.

## Methode en beperkingen

- Issues opgehaald met `gh issue list --label hertest --state all` (485, waarvan 483 gesloten en 2 open).
- Commits: `git log --all` op `#n` in de commitregel. Een commit met alleen `Refs #n` bewijst geen fix.
- Tests: elk `scripts/*_test.mjs` dat `#n` noemt, is één keer met gewone `node` gedraaid (455 bestanden, max. 90 s, zonder Electron): 443 groen, 5 rood, 7 overgeslagen omdat ze Electron of netwerk starten. De koppeling test-issue is **los** (de test noemt het nummer ergens): groen betekent "de logica waar de test over gaat klopt", niet "het issue is opgelost".
- Visueel/spelgevoel is bepaald op trefwoorden in de titel (overlap, camera, doorzichtig, HUD, geluid, enz.). Dat is een grove sorteerder; de eigenaar of een beeldrun moet het laatste woord hebben.
- Niets is in beeld bekeken (geen Electron: een andere agent heeft het slot). Alles hieronder is dus "nog niet bekeken".

## Aantallen

| Categorie | Aantal | Betekenis |
|---|---|---|
| A | 215 | niet-visueel, fix-commit en groene test(s) die het nummer noemen: waarschijnlijk in orde |
| A2 | 63 | niet-visueel, wel commit maar geen test die het dekt: codeleescontrole of nieuwe test nodig |
| B | 87 | zuiver visueel of spelgevoel: alleen met beeldbewijs te sluiten |
| C | 15 | achterhaald, dubbel of ontwerpkeuze |
| D | 105 | geen enkele commit met dit nummer: vermoedelijk niet gefixt |

Rode tests (alle vijf omgevingsgebonden of los van de issues, behalve de eerste): `voice_lookup_audit_test` (1283 !== 1286, raakt **#924**: stemregels ontbreken echt), `buildonly_test` (ds-galerij.js, #899 en #497), `kanalen_test` (KANALEN.md loopt achter, #696), `testketen_test` (16 i.p.v. 15 coop-tests, #646), `tileworld_test` (geen provincie-data in de worktree, #588).

## Werklijst: top 30 (meest waarschijnlijk nog stuk of snel met beeld te bewijzen)

Volgorde: eerst bugs met hoge impact zonder commit, die in één beeldrun of meetscript te bewijzen zijn; samengebonden issues staan bij elkaar.

| Rang | # | Titel | Waarom hier |
|---|---|---|---|
| 1 | #949 | Auto verdwijnt in het water via een graskade; graag physics/plons i.p.v. animatie | bug, impact hoog; geen commit; een test noemt het alleen |
| 2 | #936 | Auto kan door een graskade heen het water in rijden | bug, impact hoog; geen commit; een test noemt het alleen |
| 3 | #884 | De brug naar Friesland bij Visvliet is doorzichtig | bug, impact hoog; geen commit; een test noemt het alleen |
| 4 | #918 | Gras over water op het generatieve platteland | bug, impact hoog; geen commit; een test noemt het alleen |
| 5 | #948 | Bootmissie: je vaart onder de grond op een plek zonder water | bug, impact hoog; geen commit; een test noemt het alleen |
| 6 | #937 | Dikke lagspikes bij het laden van een nieuw stuk wereld, zeker bij hoge snelheid | bug, impact hoog; geen commit; een test noemt het alleen |
| 7 | #921 | Stadsdelen lijken opnieuw in/uit te laden of hard te poppen (LOD/streaming) | bug, impact hoog; geen commit; een test noemt het alleen |
| 8 | #970 | Politieauto rijdt door de garagemuur; mensen lopen door muren | bug, impact hoog; geen commit; een test noemt het alleen |
| 9 | #969 | Koeienmissie: de schuur waar je heen moet is niet zichtbaar | bug, impact hoog; geen commit; een test noemt het alleen |
| 10 | #947 | Reizen-paneel opent spontaan na een missie | bug, impact hoog; geen commit; een test noemt het alleen |
| 11 | #945 | Procedurele akkerranden lopen over de weg; alleen echte akkerranden maken | bug, impact hoog; geen commit; een test noemt het alleen |
| 12 | #942 | Interieur van sommige autos beweegt niet mee (zeker na schade) | bug, impact hoog; geen commit; een test noemt het alleen |
| 13 | #934 | Auto's gaan veel te snel kapot en impacts zijn te heftig | bug, impact hoog; geen commit; een test noemt het alleen |
| 14 | #933 | Politie spawnt veel te vaak, ook buiten de stad | bug, impact hoog; geen commit; een test noemt het alleen |
| 15 | #932 | Fast travel komt soms niet bij de bestemming uit (taxi) | bug, impact hoog; geen commit; een test noemt het alleen |
| 16 | #930 | Route loopt door het gras/kerkhof van de kerk (Usquert) | bug, impact hoog; geen commit; een test noemt het alleen |
| 17 | #923 | Horizontale plaat door het interieur van bepaalde auto's (o.a. Knakker) | bug, impact hoog; geen commit; een test noemt het alleen |
| 18 | #914 | Missie 'chaos op de Grote Markt' is niet haalbaar: te weinig punten en voertuig sloopt te  | bug, impact hoog; geen commit; een test noemt het alleen |
| 19 | #961 | Stationsperrons kloppen niet: spawn naast perron, automaat door perron, station Noord blok | bug, impact hoog; geen commit; een test noemt het alleen |
| 20 | #954 | Uitkijkpunt bij Bourtange werkt niet | bug, impact midden; geen commit; een test noemt het alleen |
| 21 | #951 | Treinmissie met mevrouw Hoving: geen trein en stil blijven staan volstaat | bug, impact hoog; geen commit; een test noemt het alleen |
| 22 | #927 | Kaartautomaat op station Warffum staat midden op het spoor | bug, impact hoog; geen commit; een test noemt het alleen |
| 23 | #859 | Keuken C00.2: Tessa zit met een stuurhouding (armen wijd, handen zweven) | bug, impact hoog; geen commit; een test noemt het alleen |
| 24 | #850 | Aanraak: vliegtuigpaneel ligt onder de knoppen en de labels zijn 8 px | bug, impact hoog; geen commit; een test noemt het alleen |
| 25 | #965 | Spel > Overzicht: grote kop schuift onder de tabs en wordt afgekapt | bug, impact hoog; geen commit; een test noemt het alleen |
| 26 | #977 | Kavelgrenzen lopen dwars door dorpen op de kaart (o.a. Marum) | bug, impact hoog; geen commit; een test noemt het alleen |
| 27 | #547 | HUD in de auto: cabine van de Knakker mist voor- en zijruiten | bug, impact midden; geen commit, geen test |
| 28 | #540 | Camera raakt los van grote voertuigen (trekker, bus) of zit erin | bug, impact midden; geen commit, geen test |
| 29 | #539 | Groene doorschijnende plaat bij garage Knalpot (marker/triggervolume als vlak getekend) | bug, impact midden; geen commit, geen test |
| 30 | #533 | Onzichtbare muren en de sluis waar je door de grond zakt (uit playtest 27-10) | bug, impact midden; geen commit, geen test |

Groepen die samen één beeldrun zijn: water/kade (#949, #936, #918, #948, #884), wereldladen (#937, #921), voertuigen en interieur (#970, #942, #923, #934, #540, #859 voor cutscene), station en spoor (#961, #927, #951), overige UI (#965, #947, #850).

## Categorie D: vermoedelijk niet gefixt (105)

| # | Titel | Soort | Impact | Commits | Tests | Reden |
|---|---|---|---|---|---|---|
| #979 | Escape > Spel > Camera & Richten en Hints & Uitleg horen bij Instellingen | wens | midden | 0 | 3 | geen commit; test noemt het alleen (groen) |
| #977 | Kavelgrenzen lopen dwars door dorpen op de kaart (o.a. Marum) | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #975 | Meldingen staan te kort in beeld (o.a. radiomelding) | bug | midden | 0 | 3 | geen commit; test noemt het alleen (rood) |
| #974 | Aardbeving: impact visueel en qua geluid veel heftiger maken | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #973 | Makkelijk een game van iemand anders joinen / serverbrowser | wens | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #972 | Loopbaan landbouw: veel meer begeleiding en eigen velden op de kaart | wens | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #971 | Grijze knop "Spelers" rechtsonder is vaag | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #970 | Politieauto rijdt door de garagemuur; mensen lopen door muren | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #969 | Koeienmissie: de schuur waar je heen moet is niet zichtbaar | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #967 | Wegmarkeringen blijven liggen als een brug openslaat | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #966 | Keybind-hints voor radio/muten weghalen uit de HUD | wens | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #965 | Spel > Overzicht: grote kop schuift onder de tabs en wordt afgekapt | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #964 | Voertuigen rijden door cutscenes heen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #961 | Stationsperrons kloppen niet: spawn naast perron, automaat door perron, station Noord blok | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #960 | Tessa en Tammo zeggen te vaak "wij tweeën tegen de rest" | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #957 | Timing-minigames (heen-en-weer-balk + spatie) zijn te moeilijk | wens | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #954 | Uitkijkpunt bij Bourtange werkt niet | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #951 | Treinmissie met mevrouw Hoving: geen trein en stil blijven staan volstaat | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #949 | Auto verdwijnt in het water via een graskade; graag physics/plons i.p.v. animatie | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #948 | Bootmissie: je vaart onder de grond op een plek zonder water | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #947 | Reizen-paneel opent spontaan na een missie | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #946 | Langere dagen en kortere nachten (zomerse daglichtcyclus) | wens | hoog | 0 | 3 | geen commit; test noemt het alleen (groen) |
| #945 | Procedurele akkerranden lopen over de weg; alleen echte akkerranden maken | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #942 | Interieur van sommige autos beweegt niet mee (zeker na schade) | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #941 | First-person camera op ooghoogte | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #939 | Hooibalen zijn no-clip; je kunt ze niet met de auto aan de kant beuken | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #938 | Zwaailampen op de politieauto bewegen niet mee bij remmen/optrekken | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #937 | Dikke lagspikes bij het laden van een nieuw stuk wereld, zeker bij hoge snelheid | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #936 | Auto kan door een graskade heen het water in rijden | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #935 | Drie missies zeggen allemaal "laatste klus voor vandaag" | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #934 | Auto's gaan veel te snel kapot en impacts zijn te heftig | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #933 | Politie spawnt veel te vaak, ook buiten de stad | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #932 | Fast travel komt soms niet bij de bestemming uit (taxi) | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #931 | Menumuziek begint bij elke Escape opnieuw; graag een flinke delay | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #930 | Route loopt door het gras/kerkhof van de kerk (Usquert) | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #927 | Kaartautomaat op station Warffum staat midden op het spoor | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #925 | Ontdekkingsvideos per wijk weghalen | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #924 | TTS: ontbrekende stemregels voor Tammo/Tessa en Tessa klinkt soms Gronings | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (rood) |
| #923 | Horizontale plaat door het interieur van bepaalde auto's (o.a. Knakker) | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #921 | Stadsdelen lijken opnieuw in/uit te laden of hard te poppen (LOD/streaming) | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #920 | Escape-menu opent dubbel na navigeren tussen schermen | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #918 | Gras over water op het generatieve platteland | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #914 | Missie 'chaos op de Grote Markt' is niet haalbaar: te weinig punten en voertuig sloopt te  | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #913 | Missienummers mogen weg uit de UI | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #912 | Missie-overzicht is onoverzichtelijk door aktes en 'deel 4' | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #910 | Foto's: lege staat met alleen uitleg onder Meer opties | wens | laag | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #902 | Uitkijkpunten: hovercontext en uitleg waarom je erheen gaat | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #901 | Kaart: randen van Friesland, Drenthe en Duitsland tonen en pan beperken | wens | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #900 | Kaart: één zoomniveau voor het unlocken van een gebied | wens | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #899 | Kaartontdekking: onbezochte gebieden echt uitgrijzen | wens | hoog | 0 | 3 | geen commit; test noemt het alleen (rood) |
| #898 | Voortgangspercentage van de game zichtbaar maken | wens | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #895 | Cheats-menu: uitleg pas zichtbaar na klikken | wens | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #894 | Instellingen: Besturing is een onoverzichtelijke chaos | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #893 | Instellingen: preset-switch en naamgeving Laag/Gemiddeld/Vlot/Hoog kloppen niet | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #892 | Garage: teksthiërarchie rechtsonder en voertuigen overlappen de besturinghints | bug | midden | 0 | 0 | geen commit en geen test |
| #891 | Moeilijkheid is te moeilijk te vinden | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #890 | First person valt terug naar third person na uitstappen | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #889 | HUD- en UI-teksten zijn selecteerbaar (blauwe highlight) | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #888 | Veroverde gevaarlijke buurten blijven gevaarlijk | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #887 | Kaart-hover toont Warffum bij de Waddeneilanden | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #886 | Uitkijkpunt-iconen zijn platgedrukte ovalen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #885 | Grenslijnen op de mini-map trillen heen en weer | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #884 | De brug naar Friesland bij Visvliet is doorzichtig | bug | hoog | 0 | 3 | geen commit; test noemt het alleen (groen) |
| #881 | Aanraak-vlieg-HUD staand (360x800): bord, paneel, kolom en ondertitel overlappen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #876 | Vliegtuigpaneel overlapt de toetshint-regels | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #874 | Samen: wachtkamer met veel spelers (15 kick-knoppen, één lange namenzin) | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #872 | Samen: ping- en naamlabels kappen af bij lange namen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #870 | Straatpraat-bubbels en naamkaarten kunnen buiten de viewport staan | bug | laag | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #869 | Besturing: de actie-uitleg wordt met '…' afgekapt | bug | laag | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #867 | Doel-HUD (zone G) wordt op 1024x768 128 px breed en kapt de opdracht af | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #863 | Cutscene-fietsers: rechte banen (water/bebouwing) en blijven stilstaan in rijpose | bug | laag | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #861 | Acteurs lopen in cutscenes dwars door geparkeerde voertuigen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #860 | C00.3: matras blijft zweven als de Escapade wegrijdt | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #859 | Keuken C00.2: Tessa zit met een stuurhouding (armen wijd, handen zweven) | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #857 | In het vliegtuig zegt de voertuignaam "VOERTUIG" met een auto-icoon | bug | laag | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #855 | Radio-ondertitel loopt over het vliegtuigpaneel en de linkerkolom/minimap | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #854 | Vliegschool-bord overlapt de klok/datum tijdens het vliegen | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #850 | Aanraak: vliegtuigpaneel ligt onder de knoppen en de labels zijn 8 px | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #765 | Passages #747-fallback opent dienstwegen die geen doorgang zijn: gat in de muur met een de | bug | midden | 0 | 0 | geen commit en geen test |
| #715 | Samen spelen: scenepakket groter dan 32.000 tekens valt stil weg | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #714 | Samen spelen: gast in menu, winkel of minigame mist de scène of springt erna | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #713 | Samen spelen: hostwissel of hostuitval midden in een scène breekt de scènereeks | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #711 | Samen spelen: gast hoort een andere stem en ziet andere ondertiteltijden (own valt uit het | bug | hoog | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #710 | Veroverde gebieden heten 'Wijk 00' of 'Wijk 14' in titel, HUD en safehouse | bug | midden | 0 | 2 | geen commit; test noemt het alleen (groen) |
| #586 | Rebind blijft actief als het pauzemenu met de rail-'Terug' sluit | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #585 | De autosave-signatuur mist geld, dus sommige inkomsten worden nooit bewaard | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #584 | Sluiten van venster of tab bewaart niet | bug | hoog | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #550 | Hoogkerk: te weinig bebouwing (OSM/3BAG-bron ontbreekt) | bug | laag | 0 | 0 | geen commit en geen test |
| #549 | Kaart: pins en labels overlappen in de binnenstad en "0 van 5" valt over de iconen | bug | midden | 0 | 0 | geen commit en geen test |
| #548 | Mobiel: plaatsnaamlabel en week-/berichtkaart over elkaar; 'Draai je toestel' dekt melding | bug | laag | 0 | 0 | geen commit en geen test |
| #547 | HUD in de auto: cabine van de Knakker mist voor- en zijruiten | bug | midden | 0 | 0 | geen commit en geen test |
| #546 | Cutscenes M02/M18: arm in de gevel, leeg raam en los blauw buisje | bug | midden | 0 | 0 | geen commit en geen test |
| #545 | Losse zwarte ring (fietswiel) zweeft op de klinkers op de Grote Markt | bug | laag | 0 | 0 | geen commit en geen test |
| #544 | Perron van station en Sauwerd 's nachts: egaal vlak zonder textuur | bug | laag | 0 | 0 | geen commit en geen test |
| #543 | Garage-draaischijf: wielen en schermen van Escapade en trekker als egale rode blokken | bug | midden | 0 | 0 | geen commit en geen test |
| #542 | Mobiel landschap: actieknoppen RENNEN/VUUR/HEF/REM over de minimap | bug | laag | 0 | 0 | geen commit en geen test |
| #540 | Camera raakt los van grote voertuigen (trekker, bus) of zit erin | bug | midden | 0 | 0 | geen commit en geen test |
| #539 | Groene doorschijnende plaat bij garage Knalpot (marker/triggervolume als vlak getekend) | bug | midden | 0 | 0 | geen commit en geen test |
| #538 | Waypoint bij het vliegveld staat op het veld in plaats van bij de ingang (uit playtest 27- | bug | laag | 0 | 0 | geen commit en geen test |
| #536 | "Knielen" komt als opdracht langs zonder uitleg (uit playtest 27-10) | bug | laag | 0 | 0 | geen commit en geen test |
| #535 | Bussen hobbelen over de weg in plaats van te rollen (uit playtest 27-10) | bug | laag | 0 | 0 | geen commit en geen test |
| #533 | Onzichtbare muren en de sluis waar je door de grond zakt (uit playtest 27-10) | bug | midden | 0 | 0 | geen commit en geen test |
| #484 | Juridische teksten: "geen online", muziektellingen en "effecten zelf gesynthetiseerd" | bug | midden | 0 | 1 | geen commit; test noemt het alleen (groen) |
| #472 | PERF-METING: de samenvatting spreekt de eigen vervolgen tegen | bug | hoog | 0 | 0 | geen commit en geen test |
| #467 | Audiobank: twee ongebruikte winterregels opruimen | wens | laag | 0 | 0 | geen commit en geen test |

## Categorie D: stand na codecontrole (20-11, tweede ronde)

De eerste indeling klopte niet: de fixes van 0.63.0 en 0.65.0 zaten in bundelcommits zonder `#n` in de commitregel, maar de code noemt het nummer wel (comment, test, CHANGELOG). Van de 105 hadden 104 code of een test met hun nummer; alleen #765 was echt niet gefixt (nu wel). Rode tests: `voice_lookup_audit_test` (#924, eigenaarsbesluit TTS), `buildonly_test` (ds-galerij.js, design-agent), `firstperson_test` (scene3d.js 4516 regels, grens 4500 van #497; wijziging van een andere agent) en `menu_issues_062_test` (#909/#910 in pausemenu.css, lopend werk van de design-agent). De commithashes in de oude issue-comments bestaan niet meer in deze geschiedenis; bewijs is dus de code plus de tests. **Niets is in beeld bekeken**: visuele issues blijven "beeld nodig" tot een beeldrun. Geen issue is gesloten.

| # | Titel | Stand |
|---|---|---|
| #979 | Escape > Spel > Camera & Richten en Hints & Uitleg horen bij Instellingen | code aanwezig (game/js/pausemenu.css, game/js/pausemenu.js); test groen: instellingen_test.mjs, menu_issues_062_test.mjs; wens, beeld nodig |
| #977 | Kavelgrenzen lopen dwars door dorpen op de kaart (o.a. Marum) | code aanwezig (game/js/countrymap.js, game/js/mapview.js); test groen: kavelgrenzen_test.mjs; beeld nodig |
| #975 | Meldingen staan te kort in beeld (o.a. radiomelding) | code aanwezig (game/js/hud_panel.js, game/js/hudrules.js); test groen: hudmeldingen_test.mjs, proef_detect_test.mjs; beeld nodig |
| #974 | Aardbeving: impact visueel en qua geluid veel heftiger maken | code aanwezig (game/js/audio.js, game/js/eventrules.js, game/js/worldevents.js); test groen: events_test.mjs; wens, beeld nodig |
| #973 | Makkelijk een game van iemand anders joinen / serverbrowser | code aanwezig (game/js/lobby.js); test groen: samenbrowser_test.mjs; wens, beeld nodig |
| #972 | Loopbaan landbouw: veel meer begeleiding en eigen velden op de kaart | code aanwezig (game/js/loopbaan.js, game/js/loopbaanui.js, game/js/mapview.js); test groen: landbouw_test.mjs; wens, beeld nodig |
| #971 | Grijze knop "Spelers" rechtsonder is vaag | code aanwezig (game/js/coopspelers.js, game/js/coopspelersui.js); test groen: hudmeldingen_test.mjs; beeld nodig |
| #970 | Politieauto rijdt door de garagemuur; mensen lopen door muren | code aanwezig (game/js/breakables.js); test groen: garage_muur_test.mjs; beeld nodig |
| #969 | Koeienmissie: de schuur waar je heen moet is niet zichtbaar | code aanwezig (game/js/pg_koe.js); test groen: ommelandplace_test.mjs; beeld nodig |
| #967 | Wegmarkeringen blijven liggen als een brug openslaat | code aanwezig (game/js/movablebridges.js, game/js/movablebridges3d.js, game/js/scene3d.js); test groen: movable_paint_test.mjs; beeld nodig |
| #966 | Keybind-hints voor radio/muten weghalen uit de HUD | code aanwezig (game/js/hud_panel.js); test groen: coopgeluid_test.mjs, hudmeldingen_test.mjs; wens, beeld nodig |
| #965 | Spel > Overzicht: grote kop schuift onder de tabs en wordt afgekapt | code aanwezig (game/js/pausemenu.css, game/js/pausemenu.js, game/js/todoui.js); test groen: progress_test.mjs, spelmenu_test.mjs; beeld nodig |
| #964 | Voertuigen rijden door cutscenes heen | code aanwezig (game/js/cinehide.js, game/js/cinematics.js, game/js/scene3d.js); test groen: cinehide_test.mjs; beeld nodig |
| #961 | Stationsperrons kloppen niet: spawn naast perron, automaat door perron, station Noord blok | code aanwezig (game/js/elevation.js, game/js/perrons3d.js, game/js/stationtravel.js); test groen: perrons_test.mjs, station_machine_test.mjs; beeld nodig |
| #960 | Tessa en Tammo zeggen te vaak "wij tweeën tegen de rest" | code aanwezig (game/js/missionstory.js); test groen: duo_repeat_test.mjs; beeld nodig |
| #957 | Timing-minigames (heen-en-weer-balk + spatie) zijn te moeilijk | code aanwezig (game/js/heist.js, game/js/missions.js, game/js/regelwidget.js); test groen: regelwidget_test.mjs, stagetiming_test.mjs; wens, beeld nodig |
| #954 | Uitkijkpunt bij Bourtange werkt niet | code aanwezig (game/js/regiolevenrt.js, game/js/verkenpunten.js); test groen: uitkijkpunt_test.mjs; beeld nodig |
| #951 | Treinmissie met mevrouw Hoving: geen trein en stil blijven staan volstaat | code aanwezig (game/js/missions_akte4.js, game/js/railway.js, game/js/stagerit.js); test groen: missieplek_test.mjs; beeld nodig |
| #949 | Auto verdwijnt in het water via een graskade; graag physics/plons i.p.v. animatie | code aanwezig (game/js/vehicle.js, game/js/wateredge.js); test groen: waterkant_test.mjs; beeld nodig |
| #948 | Bootmissie: je vaart onder de grond op een plek zonder water | code aanwezig (game/js/missions_akte4.js, game/js/util.js, game/js/vehicle.js); test groen: akte4_test.mjs, boat_land_test.mjs; beeld nodig |
| #947 | Reizen-paneel opent spontaan na een missie | code aanwezig (game/js/storytravel.js); test groen: storytravel_test.mjs; beeld nodig |
| #946 | Langere dagen en kortere nachten (zomerse daglichtcyclus) | code aanwezig (game/js/daynight.js, game/js/menuplekken.js, game/js/sunrules.js); test groen: menuplekken_test.mjs, summerday_test.mjs; wens, beeld nodig |
| #945 | Procedurele akkerranden lopen over de weg; alleen echte akkerranden maken | code aanwezig (game/js/countryside.js); test groen: fielderand_test.mjs; beeld nodig |
| #942 | Interieur van sommige autos beweegt niet mee (zeker na schade) | code aanwezig (game/js/carinterior.js, game/js/firstpersoncam.js, game/js/seating3d.js); test groen: firstperson_test.mjs; beeld nodig |
| #941 | First-person camera op ooghoogte | code aanwezig (game/js/carinterior.js, game/js/firstperson.js, game/js/firstpersoncam.js); test groen: firstperson_test.mjs; beeld nodig |
| #939 | Hooibalen zijn no-clip; je kunt ze niet met de auto aan de kant beuken | code aanwezig (game/js/bales.js, game/js/collision.js, game/js/countryplan.js); test groen: hooibaal_test.mjs; beeld nodig |
| #938 | Zwaailampen op de politieauto bewegen niet mee bij remmen/optrekken | code aanwezig (game/js/models3d_vehicles.js); test groen: police_lamps_test.mjs; beeld nodig |
| #937 | Dikke lagspikes bij het laden van een nieuw stuk wereld, zeker bij hoge snelheid | code aanwezig (game/js/main.js, game/js/streambudget.js); test groen: streambudget_test.mjs; beeld nodig |
| #936 | Auto kan door een graskade heen het water in rijden | code aanwezig (game/js/vehicle.js, game/js/wateredge.js); test groen: waterkant_test.mjs; beeld nodig |
| #935 | Drie missies zeggen allemaal "laatste klus voor vandaag" | code aanwezig (game/js/calendar.js, game/js/missionduo.js, game/js/missionstory.js); test groen: calendar_test.mjs, missionduo_test.mjs; beeld nodig |
| #934 | Auto's gaan veel te snel kapot en impacts zijn te heftig | code aanwezig (game/js/breakables.js, game/js/impactbalance.js, game/js/vehicle.js); test groen: impactbalance_test.mjs; beeld nodig |
| #933 | Politie spawnt veel te vaak, ook buiten de stad | code aanwezig (game/js/police.js, game/js/wantedlevels.js); test groen: police_tough_test.mjs, politie_dichtheid_test.mjs; beeld nodig |
| #932 | Fast travel komt soms niet bij de bestemming uit (taxi) | code aanwezig (game/js/meerijden.js, game/js/reisrit.js); test groen: meerijden_test.mjs, ritpad_test.mjs; beeld nodig |
| #931 | Menumuziek begint bij elke Escape opnieuw; graag een flinke delay | code aanwezig (game/js/audio/scenario.js, game/js/scenariomusic.js); test groen: scenariomusic_test.mjs; wens, beeld nodig |
| #930 | Route loopt door het gras/kerkhof van de kerk (Usquert) | code aanwezig (game/js/routing.js); test groen: cemetery_route_test.mjs; beeld nodig |
| #927 | Kaartautomaat op station Warffum staat midden op het spoor | code aanwezig (game/js/stationtravel.js); test groen: station_machine_test.mjs; beeld nodig |
| #925 | Ontdekkingsvideos per wijk weghalen | code aanwezig (game/js/cinematics.js); test groen: district_discovery_test.mjs; wens, beeld nodig |
| #924 | TTS: ontbrekende stemregels voor Tammo/Tessa en Tessa klinkt soms Gronings | rood: voice_lookup_audit_test 1283 !== 1286, drie stemregels hebben geen opname; nieuwe TTS vraagt een besluit van de eigenaar, niet aangeraakt |
| #923 | Horizontale plaat door het interieur van bepaalde auto's (o.a. Knakker) | code aanwezig (game/js/models3d_vehicles.js); test groen: vehicle_interior_plate_test.mjs; beeld nodig |
| #921 | Stadsdelen lijken opnieuw in/uit te laden of hard te poppen (LOD/streaming) | code aanwezig (game/js/farlod.js); test groen: farlod_rebuild_test.mjs, farlod_stream_test.mjs; beeld nodig |
| #920 | Escape-menu opent dubbel na navigeren tussen schermen | code aanwezig (game/js/pausemenu.js); test groen: menu_issues_062_test.mjs; beeld nodig |
| #918 | Gras over water op het generatieve platteland | code aanwezig (game/js/grass.js, game/js/greenwater.js); test groen: grass_water_paved_test.mjs; beeld nodig |
| #914 | Missie 'chaos op de Grote Markt' is niet haalbaar: te weinig punten en voertuig sloopt te | code aanwezig (game/js/stuntavond.js); test groen: bot_vlieg_test.mjs; beeld nodig |
| #913 | Missienummers mogen weg uit de UI | code aanwezig (game/js/todoui.js, game/js/verhaalui.js); test groen: verhaalopdrachten_test.mjs; wens, beeld nodig |
| #912 | Missie-overzicht is onoverzichtelijk door aktes en 'deel 4' | code aanwezig (game/js/pausemenu.css, game/js/storyarc.js, game/js/todoui.js); test groen: verhaalopdrachten_test.mjs; beeld nodig |
| #910 | Foto's: lege staat met alleen uitleg onder Meer opties | code aanwezig (game/js/fotomodusui.js, game/js/pausemenu.css); test groen: menu_issues_062_test.mjs; wens, beeld nodig |
| #902 | Uitkijkpunten: hovercontext en uitleg waarom je erheen gaat | code aanwezig (game/js/hud_panel.js, game/js/mapview.js, game/js/verkenpunten.js); test groen: verken_ontdekking_test.mjs; wens, beeld nodig |
| #901 | Kaart: randen van Friesland, Drenthe en Duitsland tonen en pan beperken | code aanwezig (game/js/kaartkader.js, game/js/mapview.js); test groen: kaartkader_test.mjs, kaartlabels_test.mjs; wens, beeld nodig |
| #900 | Kaart: één zoomniveau voor het unlocken van een gebied | code aanwezig (game/js/gebiedenkaart.js, game/js/mapview.js); test groen: gebieden_kaart_test.mjs, mapstyle_test.mjs; wens, beeld nodig |
| #899 | Kaartontdekking: onbezochte gebieden echt uitgrijzen | code aanwezig; rode buildonly_test gaat over ds-galerij.js (design-agent), niet over dit issue; beeld nodig |
| #898 | Voortgangspercentage van de game zichtbaar maken | code aanwezig (game/js/hud_panel.css, game/js/hud_panel.js, game/js/pausemenu.css); test groen: progress_test.mjs; wens, beeld nodig |
| #895 | Cheats-menu: uitleg pas zichtbaar na klikken | code aanwezig (game/js/cheatsui.js); test groen: menu_issues_062_test.mjs; wens, beeld nodig |
| #894 | Instellingen: Besturing is een onoverzichtelijke chaos | code aanwezig (game/js/pausemenu.css, game/js/pausemenu.js); test groen: menu_issues_062_test.mjs; beeld nodig |
| #893 | Instellingen: preset-switch en naamgeving Laag/Gemiddeld/Vlot/Hoog kloppen niet | code aanwezig (game/js/gfxprofile.js, game/js/pausemenu.css, game/js/pausemenu.js); test groen: menu_issues_062_test.mjs; beeld nodig |
| #892 | Garage: teksthiërarchie rechtsonder en voertuigen overlappen de besturinghints | code aanwezig (game/js/garageui.js, game/js/pausemenu.css); geen eigen test; beeld nodig |
| #891 | Moeilijkheid is te moeilijk te vinden | code aanwezig (game/js/pausemenu.css, game/js/pausemenu.js); test groen: menu_issues_062_test.mjs, spelmenu_test.mjs; beeld nodig |
| #890 | First person valt terug naar third person na uitstappen | code aanwezig (game/js/cinematics.js, game/js/firstperson.js, game/js/firstpersoncam.js); test groen: menu_issues_062_test.mjs; beeld nodig |
| #889 | HUD- en UI-teksten zijn selecteerbaar (blauwe highlight) | code aanwezig (game/js/menu.css); test groen: menu_issues_062_test.mjs; beeld nodig |
| #888 | Veroverde gevaarlijke buurten blijven gevaarlijk | code aanwezig (game/js/coopworld.js, game/js/gebieden.js, game/js/mapview.js); test groen: bus_handling_test.mjs, muggings_test.mjs; beeld nodig |
| #887 | Kaart-hover toont Warffum bij de Waddeneilanden | code aanwezig (game/js/borderplaces.js, game/js/mapview.js, game/js/regions.js); test groen: kaartlabels_test.mjs, regions_test.mjs; beeld nodig |
| #886 | Uitkijkpunt-iconen zijn platgedrukte ovalen | code aanwezig (game/js/hud_panel.js, game/js/mapicons.js); test groen: mapicons_test.mjs; beeld nodig |
| #885 | Grenslijnen op de mini-map trillen heen en weer | code aanwezig (game/js/hud_panel.js, game/js/mapborders.js, game/js/regions.js); test groen: mapborders_test.mjs; beeld nodig |
| #884 | De brug naar Friesland bij Visvliet is doorzichtig | code aanwezig (game/js/roadsurface.js); test groen: bridge_all_test.mjs, bridge_dek_test.mjs; beeld nodig |
| #881 | Aanraak-vlieg-HUD staand (360x800): bord, paneel, kolom en ondertitel overlappen | code aanwezig (game/js/hud_panel.js, game/js/minigamekit.js, game/js/touch.js); test groen: hud_layout_issues_test.mjs; beeld nodig |
| #876 | Vliegtuigpaneel overlapt de toetshint-regels | code aanwezig (game/js/prompts.css); test groen: hud_layout_issues_test.mjs; beeld nodig |
| #874 | Samen: wachtkamer met veel spelers (15 kick-knoppen, één lange namenzin) | code aanwezig (game/js/lobby.js, game/js/lobbyui.js, game/js/pausemenu.css); test groen: lobby_test.mjs, multiplayer_layout_test.mjs; beeld nodig |
| #872 | Samen: ping- en naamlabels kappen af bij lange namen | code aanwezig (game/js/coopfigures3d.js, game/js/cooppings3d.js, game/js/multiplayerlabels.js); test groen: multiplayerlabels_test.mjs; beeld nodig |
| #870 | Straatpraat-bubbels en naamkaarten kunnen buiten de viewport staan | code aanwezig (game/js/hudrules.js, game/js/namecard.js, game/js/scene3d.js); test groen: hud_layout_issues_test.mjs; beeld nodig |
| #869 | Besturing: de actie-uitleg wordt met '…' afgekapt | code aanwezig (game/js/menu.css); test groen: hud_layout_issues_test.mjs; beeld nodig |
| #867 | Doel-HUD (zone G) wordt op 1024x768 128 px breed en kapt de opdracht af | code aanwezig (game/js/hud_panel.css); test groen: hud_layout_issues_test.mjs; beeld nodig |
| #863 | Cutscene-fietsers: rechte banen (water/bebouwing) en blijven stilstaan in rijpose | code aanwezig (game/js/cutscenehost.js, game/js/cutscenes.js, game/js/cutscenes_akte1.js); test groen: cutscenes_akte2_test.mjs, cutscript_test.mjs; beeld nodig |
| #861 | Acteurs lopen in cutscenes dwars door geparkeerde voertuigen | code aanwezig (game/js/cutscenes_akte4.js); test groen: cutscenes_akte4_test.mjs; beeld nodig |
| #860 | C00.3: matras blijft zweven als de Escapade wegrijdt | code aanwezig (game/js/cutscenes.js); test groen: cutscript_test.mjs, vliegtuigprops_test.mjs; beeld nodig |
| #859 | Keuken C00.2: Tessa zit met een stuurhouding (armen wijd, handen zweven) | code aanwezig (game/js/cutscenehost.js, game/js/cutscenemodels.js); test groen: cutscript_test.mjs; beeld nodig |
| #857 | In het vliegtuig zegt de voertuignaam "VOERTUIG" met een auto-icoon | code aanwezig (game/js/hud_panel.js, game/js/vehiclenames.js); test groen: vliegtuigprops_test.mjs; beeld nodig |
| #855 | Radio-ondertitel loopt over het vliegtuigpaneel en de linkerkolom/minimap | code aanwezig (game/js/hud_panel.css); test groen: hud_layout_test.mjs; beeld nodig |
| #854 | Vliegschool-bord overlapt de klok/datum tijdens het vliegen | code aanwezig (game/js/hud_panel.js, game/js/minigamekit.js, game/js/touch.js); test groen: hud_layout_test.mjs; beeld nodig |
| #850 | Aanraak: vliegtuigpaneel ligt onder de knoppen en de labels zijn 8 px | code aanwezig (game/js/touch.js); test groen: hud_layout_test.mjs; beeld nodig |
| #765 | Passages #747-fallback opent dienstwegen die geen doorgang zijn: gat in de muur met een de | gefixt in deze sessie: de terugval opent geen dienstweg meer die hooguit 6 m in de muur doodloopt (garagedeur); test passage_thin_test (2 nieuwe checks); zware audit passage_open_audit niet gedraaid, nog niet bekeken |
| #715 | Samen spelen: scenepakket groter dan 32.000 tekens valt stil weg | code aanwezig (game/js/coopcut.js); test groen: coopcut_test.mjs; beeld nodig |
| #714 | Samen spelen: gast in menu, winkel of minigame mist de scène of springt erna | code aanwezig (game/js/cinematics.js, game/js/coopcut.js, game/js/coopnet.js); test groen: coopcut_test.mjs; beeld nodig |
| #713 | Samen spelen: hostwissel of hostuitval midden in een scène breekt de scènereeks | code aanwezig (game/js/cinematics.js, game/js/coophold.js, game/js/coophostwissel.js); test groen: coophostwissel_test.mjs; beeld nodig |
| #711 | Samen spelen: gast hoort een andere stem en ziet andere ondertiteltijden (own valt uit het | code aanwezig (game/js/cinematics.js, game/js/coopcut.js, game/js/cutscenehost.js); test groen: coopcut_test.mjs, voicetiming_test.mjs; beeld nodig |
| #710 | Veroverde gebieden heten 'Wijk 00' of 'Wijk 14' in titel, HUD en safehouse | code aanwezig (game/js/gebieden.js); test groen: gebieden_test.mjs, intocht_epic_test.mjs; beeld nodig |
| #586 | Rebind blijft actief als het pauzemenu met de rail-'Terug' sluit | code aanwezig (game/js/pausemenu.js); test groen: spelmenu_test.mjs; beeld nodig |
| #585 | De autosave-signatuur mist geld, dus sommige inkomsten worden nooit bewaard | code aanwezig (game/js/savegame.js); test groen: savegame_test.mjs; beeld nodig |
| #584 | Sluiten van venster of tab bewaart niet | code aanwezig (game/js/pausemenu.js, game/js/savegame.js); test groen: savegame_test.mjs; beeld nodig |
| #550 | Hoogkerk: te weinig bebouwing (OSM/3BAG-bron ontbreekt) | onduidelijk: de bron is niet leeg (966 gebouwen binnen 1,2 km). Vraag aan de eigenaar: welke plek in Hoogkerk mist bebouwing? Het dorpspunt ligt aan de rand van de bebouwde kom |
| #549 | Kaart: pins en labels overlappen in de binnenstad en "0 van 5" valt over de iconen | oplossing volgens het issue-commentaar in kaartlabels (labels wijken voor pins, eigen strook voor de teller); kaartlabels_test groen; beeld van de binnenstad nodig |
| #548 | Mobiel: plaatsnaamlabel en week-/berichtkaart over elkaar; 'Draai je toestel' dekt melding | oplossing volgens het commentaar (draaibanner wijkt voor melding, actieknoppen voor de minimap); hud_layout_test en touch_situaties_test groen; beeld op 360x800 en 800x360 nodig |
| #547 | HUD in de auto: cabine van de Knakker mist voor- en zijruiten | oplossing volgens het commentaar (ruit Knakker 0,94 breed); voertuigmodel_test groen; beeld van binnen nodig |
| #546 | Cutscenes M02/M18: arm in de gevel, leeg raam en los blauw buisje | beeld nodig: een eerdere agent kon het niet reproduceren; cutscene-foto's M02 en M18 bekijken |
| #545 | Losse zwarte ring (fietswiel) zweeft op de klinkers op de Grote Markt | oplossing volgens het commentaar (rommelatlas alleen naast een stoeprand); voertuigmodel_test groen; beeld nodig |
| #544 | Perron van station en Sauwerd 's nachts: egaal vlak zonder textuur | oplossing volgens het commentaar (eigen tegelmateriaal perron); perronmateriaal_test groen; nachtbeeld nodig |
| #543 | Garage-draaischijf: wielen en schermen van Escapade en trekker als egale rode blokken | oplossing volgens het commentaar (silhouet-SVG verborgen); garagepics_test groen; beeld van de draaischijf nodig |
| #542 | Mobiel landschap: actieknoppen RENNEN/VUUR/HEF/REM over de minimap | zie #548 (actieknoppen wijken voor de minimap); touch_situaties_test groen; beeld nodig |
| #540 | Camera raakt los van grote voertuigen (trekker, bus) of zit erin | oplossing volgens het commentaar (volgcam hoogte/z, dak per voertuigsoort, camera getest tegen gevels); camera_mobiel_test en kermis_camera_test groen; beeld met trekker en bus nodig |
| #539 | Groene doorschijnende plaat bij garage Knalpot (marker/triggervolume als vlak getekend) | oplossing volgens het commentaar (markerkolom is baken, binnen 8 m onzichtbaar); markervlak_test groen; beeld bij garage Knalpot nodig |
| #538 | Waypoint bij het vliegveld staat op het veld in plaats van bij de ingang (uit playtest 27- | oplossing volgens het commentaar (baliePlek() bij de ingang); vliegschool_stand_test slaat hier over (geen provinciedata); beeld nodig |
| #536 | "Knielen" komt als opdracht langs zonder uitleg (uit playtest 27-10) | oplossing volgens het commentaar (hintregel en titel bij K in de bus-UI); busui_test groen; beeld nodig |
| #535 | Bussen hobbelen over de weg in plaats van te rollen (uit playtest 27-10) | oplossing volgens het commentaar (één hoogtebron per rijstrook, #519); bus_hobbel_test groen; rit met bus nodig |
| #533 | Onzichtbare muren en de sluis waar je door de grond zakt (uit playtest 27-10) | oplossing volgens het commentaar (collider_keuring, 0 onzichtbare colliders); keuring niet gedraaid (provinciedata ontbreekt in deze worktree); sluis en loket nog niet bekeken |
| #484 | Juridische teksten: "geen online", muziektellingen en "effecten zelf gesynthetiseerd" | code aanwezig (geen bronbestand); test groen: muziek_telling_test.mjs; beeld nodig |
| #472 | PERF-METING: de samenvatting spreekt de eigen vervolgen tegen | doc bijgewerkt volgens het commentaar (docs/PERF-METING-2026-10-19.md); geen code, niets te testen; kan dicht na leescontrole |
| #467 | Audiobank: twee ongebruikte winterregels opruimen | winterregels volgens het commentaar uit de audiobank; voice_coverage aan het eind gedraaid; geen beeld nodig, kan dicht na leescontrole |

## Categorie B: visueel of spelgevoel, beeldbewijs nodig (87)

| # | Titel | Soort | Impact | Commits | Tests | Reden |
|---|---|---|---|---|---|---|
| #968 | Skûtsje-sprint is oneerlijk: brug gaat niet open, Jelle duwt/vaart magisch door | bug | zeer-hoog | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #916 | Beppe-huis niet zichtbaar bij de marker op de kaart (Visvliet) | bug | hoog | 4 | 3 | commit + groene test, beeld/spelgevoel nodig |
| #883 | Gras ligt op sommige plekken over de weg (o.a. bij Visvliet) | bug | hoog | 1 | 4 | commit + groene test, beeld/spelgevoel nodig |
| #880 | M15-spandoek: tekst afgekapt en doek zakt door de grond na de landing | bug | midden | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #877 | Aanraak-vlieg-HUD (800x360): doel, ondertitel en vliegschoolbord overlappen zone C; paneel | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #875 | Samen: wedstrijd-/PvP-kaart dekt op lage schermen de HUD | bug | laag | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #873 | Samen: spelerslijst (Tab) kapt af op lage en smalle schermen | bug | midden | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #866 | Weer/decals: mist 0.7 maakt het hoogbeeld 100% wit; natte plekken lezen als olie; bloedtap | bug | laag | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #858 | C00.3 (verhuisdag): camera klapt op Tessa's rug en op de auto in de eerste minuten | bug | hoog | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #852 | Vliegtuig: blobschaduw staat op vlieghoogte in plaats van op de grond | bug | laag | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #849 | Vlieg-HUD: instrumentenpaneel staat linksboven en deels buiten beeld | bug | hoog | 1 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #847 | Interieur-gaten: vliegtuig, boerderijmachines en gelede bus-achterwagen (en trekker/heli/b | bug | hoog | 30 | 12 | commit + groene test, beeld/spelgevoel nodig |
| #834 | Kaart: ook bijbanen en overige iconen van onbekende streken verbergen | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #826 | Mobiel: aanraakknoppen <44 px, HUD-overlap en tekst onder 12 px (punten 38/48) | bug | midden | 9 | 0 | commit, beeld/spelgevoel nodig |
| #825 | Kaart: provinciestreken per speler visueel verbergen en via uitkijkpunten onthullen | wens | hoog | 5 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #809 | Ontwerpbesluiten beeld: Samen-spelen-kleuren en een focusstijl (#803-rest) | wens | laag | 9 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #807 | Verkenning: na de stad levert de lege provincie te weinig bestemmingen op (punt 74 uit de  | wens | hoog | 2 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #803 | Beeld en stijl: leesbaarheid en UI-consistentie rechtzetten (punten 48-49 uit de UX-top100 | wens | laag | 10 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #802 | Toegankelijkheid: schermnarratie voor menu's, HUD en kaart (punt 42 uit de UX-top100) | wens | midden | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #799 | Testgaten en CI-robustheid na de bugronde: bootclaims, streamingpaden en Windows-CRLF | wens | laag | 2 | 4 | commit + groene test, beeld/spelgevoel nodig |
| #792 | Adaptieve schaduwmap kan heen-en-weer flippen zonder hysterese (hitch per opstap) | bug | laag | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #789 | pubStaticSig niet geïnvalideerd bij wereldwissel: stale missie-HUD na boot-load | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #772 | loadstall_test dekt alleen syncRoads, niet syncBuildings (broncheck #553) | bug | laag | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #759 | Kaart in Samen spelen: pins maken de statische laag elke frame vuil (60 Hz in plaats van 1 | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #755 | Far LOD bouwt zijn basisindex nooit opnieuw: de verre stad verdwijnt na de eerste tegel | bug | hoog | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #742 | M11.5/M11.6: de nachtscène op de zandplaat heeft geen eigen regie | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #739 | M21.4 is een dode scène: Tammo's dieptepunt komt niet in beeld | bug | hoog | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #738 | M00-opening: trailerbeelden, naamkaarten en titelkaart ontbreken; klok start op 17:30 | bug | hoog | 5 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #733 | Stemmenbank laadt asynchroon zonder retry: een vroege of mislukte fetch maakt scènes stil | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #731 | attachVoices rekt de scèneduur op ná compileScene: shots en cues lopen achter op de stem | bug | hoog | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #728 | Polsstok- en duifcamera gebruiken playCinematic als camerawrapper | wens | laag | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #721 | Landmark-ontdekking: Kardinge, Suikerfabriek, Eemshaven en Vesting Bourtange missen een sc | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #706 | Intocht-camera: veroverTourShot met data-gedreven stops uit de catalogus | wens | midden | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #702 | Verhaal- en stemdocumentatie: midden-/laagpunten uit de documentatie-review | bug | midden | 2 | 0 | commit, beeld/spelgevoel nodig |
| #686 | Samen spelen: laat de groep stemmen bij verhaal-keuzes | wens | midden | 2 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #685 | Samen spelen: maak de groepsbonus (1+1=3) zichtbaar in de beloning | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #674 | Loopbaan: geef de hoogste niveaus een zichtbaar, niet-geldelijk voordeel | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #667 | Bijbanen: splits in dienst en kantoorklus, met eigen HUD en Te-doen-groep | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #666 | Verhaal: geef M18 of M21 een keuze met een zichtbaar gevolg | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #659 | HUD blijft rekenen terwijl niets zichtbaar is: pauzemenu-gate ontbreekt en de promptzoeker | wens | midden | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #658 | Performance rendering/GPU: schaduwmap en post-keten op vaste hoge stand, voetgangersmesh z | bug | midden | 8 | 5 | commit + groene test, beeld/spelgevoel nodig |
| #651 | Performance wereld/streaming: 3 midden- en 3 laagpunten (spoorchunks, syncWater, prefetch, | bug | midden | 8 | 5 | commit + groene test, beeld/spelgevoel nodig |
| #644 | Ondertitels en gesproken tekst: leesbaar naast de snelheidsmeter en onder de 12 px | bug | hoog | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #643 | HUD-meldingen: één kaart per zone, maar de prestatiekaart en de telefoon doen hun eigen di | wens | midden | 2 | 3 | commit + groene test, beeld/spelgevoel nodig |
| #638 | HUD-basis: zones, minimap, snelheidsmeter en de plekken waar het schuurt | wens | laag | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #634 | Samen spelen: wachtkamer en sessies op de menu-set, met één toestemming en een leesbare li | wens | hoog | 6 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #632 | Cockpit-HUD's: bus, heli en vliegtuig elk een eigen sfeer binnen de tokens | wens | hoog | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #631 | Bijbanen: één HUD-kaart met eigen sfeer per baantje, in plaats van de mission-kaart | wens | hoog | 6 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #630 | Duiven: HUD van de duivenmelker, met eigen sfeer, leesbare tags en een gast die meekan | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #628 | Carbid: het schietbord heeft eigen kleuren buiten de tokens en een startkaart met brackett | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #627 | Kermis en reuzenrad: één Suikerspin-sfeer en één bord in plaats van twee kopieën | bug | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #625 | Machinist: cabinebord met eigen treinsfeer, zonder losse blauwe hexen en flits | bug | hoog | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #624 | PvP-arena: teamkleuren en bord zonder eigen team of vorm | bug | midden | 2 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #623 | Vluchtdienst: torenbord met eigen sfeer in plaats van de generieke dienstbalk | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #621 | Rondvaart-HUD: van generieke dienstbalk naar een kadebord met eigen sfeer | wens | midden | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #620 | Klimtoren-HUD: de armenbalk in een tweede rood | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #619 | Skatepark-HUD: de keten vecht met de balans | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #618 | Ringrace-HUD: een rood bord zonder icoon | wens | hoog | 2 | 0 | commit, beeld/spelgevoel nodig |
| #617 | Karten-HUD: de tussenstand als rij chips | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #616 | Regatta-HUD: de wind waait, de gast ziet niets | wens | hoog | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #615 | Zwembad-HUD: één balk met twee betekenissen | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #614 | Waterski-HUD: vijf getallen, geen baan | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #613 | Hengelen-HUD: twee borden voor één hengel | wens | midden | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #611 | Prestaties + Foto's: tekst voor beeld, en dezelfde voortgang drie keer | wens | midden | 2 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #608 | Verhaal: Personages is een muur van vraagtekens en Veroverd een getal zonder woorden | wens | hoog | 2 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #605 | Besturing: van toetsenmuur naar naleesbaar kindscherm | wens | midden | 8 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #599 | Padel-HUD: eigen blauw bord naast het systeem | wens | hoog | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #598 | Discgolf-HUD: de mand, de wind en te veel knoppen in één balk | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #597 | Golf (pitch & putt): bekakt clubhuis als eigen sfeer voor de golf-HUD | wens | hoog | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #596 | Activiteiten-HUD: de gedeelde minigamebalk als sfeerdrager (en de drie borden die erbuiten | wens | midden | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #571 | Toegankelijkheid: aria-label op een kale span werkt niet; hub-stappen gebruiken tabrollen  | bug | laag | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #570 | Testrunner toont bij een falende test alleen de laatste 25 regels, waardoor de echte fout  | bug | midden | 2 | 0 | commit, beeld/spelgevoel nodig |
| #556 | Start-sessie gaat standaard openbaar de lijst in; Enter in het naamveld geldt als toestemm | bug | hoog | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #553 | Performance: lag spikes en vasthangers, en het laden/ontladen van de wereld | bug | hoog | 32 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #525 | Samen spelen: plan voor de hele game in multiplayer (missies, menu's, toestemming en flows | wens | zeer-hoog | 48 | 14 | commit + groene test, beeld/spelgevoel nodig |
| #512 | Bootroute loopt 470 m over land sinds de wereld van 27-10 08:57 (vaar_route_water_test 9%) | bug | hoog | 22 | 3 | commit + groene test, beeld/spelgevoel nodig |
| #510 | Plataanlaan: fietspad onder een dek op 2,28 m (de strenge doorgangsregel ziet hem niet) | bug | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #505 | Ondertitel herhaalt de naam die de naamkaart al noemt | bug | laag | 2 | 0 | commit, beeld/spelgevoel nodig |
| #504 | Kartstart: camera zit in het startbord en de prestatiekaart valt over de toetshulp | bug | laag | 2 | 0 | commit, beeld/spelgevoel nodig |
| #503 | Tekst op borden staat van achteren in spiegelbeeld (KARTBAAN IN ULRUM, SKATEPARK) | bug | laag | 4 | 2 | commit + groene test, beeld/spelgevoel nodig |
| #492 | GDE Light Sims: zeven lichte beroepsloopbanen en Samen spelen als ruggengraat (epic) | wens | zeer-hoog | 161 | 44 | commit, beeld/spelgevoel nodig |
| #490 | Tessa's stemprofiel in tts_cast.mjs zegt 'Groningse vrouw' | bug | laag | 2 | 0 | commit, beeld/spelgevoel nodig |
| #482 | Twee testrunners: CI draait alleen de lichte set | wens | hoog | 2 | 0 | commit, beeld/spelgevoel nodig |
| #479 | Kleuren buiten de designtokens (tweede rood, blauw, losse hexen) | wens | midden | 4 | 1 | commit + groene test, beeld/spelgevoel nodig |
| #470 | Twee safehouse-systemen naast elkaar (verhaal vs gebieden) | wens | midden | 6 | 0 | commit, beeld/spelgevoel nodig |
| #463 | Visuele audit playtestvideo 23-10: zeven beeldpunten (nachtverlichting, kale vlakken, prop | bug | midden | 58 | 13 | commit + groene test, beeld/spelgevoel nodig |
| #459 | Voertuigen: instappen via de deuren met animatie, op de juiste stoel, en bestuurders eruit | wens | hoog | 16 | 7 | commit + groene test, beeld/spelgevoel nodig |

## Categorie A2: commit zonder eigen test (63)

| # | Titel | Soort | Impact | Commits | Tests | Reden |
|---|---|---|---|---|---|---|
| #841 | Eerste-dag-checklist in het spel | wens | midden | 1 | 0 | commit, geen test: codeleescontrole |
| #828 | Mobiel landschap: voertuignaam onder Instappen en wapentekst 10 px | bug | midden | 4 | 0 | commit, geen test: codeleescontrole |
| #827 | Input-latentie: p50 35 ms / p95 85 ms gemeten; budget en verbetering (punt 34) | wens | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #814 | Falen kost niets: zeg dat in de faalmelding | wens | midden | 1 | 0 | commit, geen test: codeleescontrole |
| #798 | Restgevallen bugronde #748-#796: #781 enum-waarde, #784 slotwissel, #779 kick-race en late | bug | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #788 | Voetganger-template-LRU: refcount wordt alleen door voetgangers teruggegeven (lek bij ande | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #787 | Voertuig-geoCache (LRU): geëvicteerde bodygeometrie wordt nooit gedisposed (GPU-lek) | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #782 | Joingate/serverlijst: klokverschil > 2 min blokkeert aansluiten via lijst en join | bug | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #775 | TTS-scripts: dode helpers en impliciete 24 kHz-sample-rate in kostenberekening | bug | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #773 | CHANGELOG: TTS-regel staat onder [0.58.0] terwijl de commits na de tag zijn | bug | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #767 | Verhaaltest-retry's maskeren einde-vanzelf: kartbaan/skatepark met dubbele finish, pitch&p | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #766 | Skûtsje-sprint: vaste startkade zonder runtime-guard; een verschoven wereldbouw laat je in | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #763 | TileStore: decoder-worker herstart eindeloos en een ontbrekend pack laat wachters voorgoed | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #753 | Weggeometrie-worker staat uit in de sparse wereld: alle 18.454 wegen worden op de hoofdthr | bug | zeer-hoog | 4 | 0 | commit, geen test: codeleescontrole |
| #751 | Eerste-startvraag Samen spelen heeft geen time-out of escape: boot kan op 100% blijven sta | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #750 | Opstart wacht na het laadscherm op de Ommeland-plaatsing (208 tegels, 9,1 MB) vóór de eers | bug | hoog | 4 | 1 | commit, geen test: codeleescontrole |
| #749 | Opstart kan oneindig hangen: tegel-time-outs staan uit tijdens de boot en er is geen boot- | bug | hoog | 10 | 2 | commit, geen test: codeleescontrole |
| #747 | Werelddata: vijf service-passages en vier ringwand-hits in de verse provinciebouw | bug | midden | 8 | 0 | commit, geen test: codeleescontrole |
| #740 | M20.5 en M21.3 missen de klomp met briefje en de Escapade | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #701 | Samen spelen-detaildocumentatie: midden-/laagpunten uit de documentatie-review | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #700 | Wereld- en systeemdocumentatie: midden-/laagpunten uit de documentatie-review | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #699 | Root- en procesdocumentatie: midden-/laagpunten uit de documentatie-review | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #698 | Besluit: UMCG en 'House of Groningen' in speltekst (constitutie 2) | wens | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #696 | KANALEN.md is verouderd gegenereerd en niemand controleert het | bug | midden | 2 | 1 | commit, test rood (omgeving?) |
| #695 | ONTWIKKELEN.md beschrijft een releaseproces dat niet meer bestaat | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #694 | Verhaalcanon loopt achter: KALENDER, 00-OVERZICHT en M06-samenvatting | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #693 | Samen spelen-docs: spelershandleiding, Meedoen-default en rollen lopen achter | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #691 | Juridische antwoorden (IARC, leeftijd, privacy) lopen achter op de altijd-online sessie | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #690 | README: 'de desktopapp gebruikt geen internet' klopt niet met Samen spelen en live bussen | bug | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #646 | Testketen: 12 coop-tests draaien nooit, 2 dubbele registraties, 82 bestanden zonder syntax | bug | midden | 5 | 3 | commit, test rood (omgeving?) |
| #641 | ADR's herzien en aanvullen: 0004-uitvoering, 0006/dev-tooling en ontbrekende besluiten | wens | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #637 | TypeScript: besluit landen (ADR hernummeren + tooling) of intrekken; main is nog 100% JS | wens | hoog | 2 | 0 | commit, geen test: codeleescontrole |
| #588 | Codebase-review kern/wereld: 2 midden- en 3 laagpunten | bug | midden | 4 | 4 | commit, test rood (omgeving?) |
| #587 | shell.openExternal krijgt elk URL uit de pagina, zonder scheme-allowlist | bug | hoog | 2 | 1 | commit, geen test: codeleescontrole |
| #581 | Oude meuk opruimen: oud startscherm en verweesde code | wens | midden | 10 | 3 | commit, geen test: codeleescontrole |
| #580 | Alleen spelen: 'Meedoen' uitzetten meldt een besloten sessie met kamercode die niet bestaa | bug | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #575 | Dependabot: drie open security-alerts en vier openstaande PR's afhandelen | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #574 | Electron 45 vraagt electron-builder >= 26.18.1 (Windows-WER-helper); de open PR gaat naar  | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #573 | linux-release.yml mist de arm64-input: --arm64 faalt en Linux-ARM64 is onbereikbaar | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #552 | World: 28 velden zonder lezer opruimen (wel schrijvers) | wens | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #529 | Eerste start: naam en meedoen in een keer vragen, en de keuze onthouden | wens | zeer-hoog | 6 | 0 | commit, geen test: codeleescontrole |
| #518 | Spullen: je kunt niets opeten, en Enter op een kaart doet niets | wens | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #517 | Garage: een wrakke auto komt gratis heel terug (en een betaalde reparatie kan terugspringe | bug | midden | 4 | 0 | commit, geen test: codeleescontrole |
| #514 | Betere eindschermen na missies | wens |  | 2 | 0 | commit, geen test: codeleescontrole |
| #513 | road_route_test: één weg van de 2621 (12961 bij 3714,-1418) begint de route 133 m van de a | bug | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #511 | build_province los gedraaid hangt zonder foutmelding in cityCoverOf (koude stadscache) | bug | midden | 4 | 0 | commit, geen test: codeleescontrole |
| #507 | Werelddata: ontbrekende tegels tussen Peize/Altena en de provincie (3,1 km omweg) | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #506 | Landspoor wordt in de stad dubbel getekend: 150 van 1428 sporen liggen op de stadse track | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #502 | Playtest 25-10: provincie - vee en voetgangers op de rijbaan, en wat er verder opviel | bug | hoog | 27 | 29 | commit, geen test: codeleescontrole |
| #499 | Specs lopen structureel achter op de code: een check die spec tegen code houdt | wens | midden | 4 | 0 | commit, geen test: codeleescontrole |
| #497 | Kernbestanden opsplitsen: missions, scene3d, vehicle en audio zijn te groot | wens | midden | 56 | 14 | commit, test rood (omgeving?) |
| #489 | Kiezelweek heet op vier plekken nog KEI-week (een echt evenement) | bug | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #487 | Tien audits draaien in geen enkele gate | wens | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #486 | Samen spelen: eenspeler is nog geen sessie van één (visie en code lopen uiteen) | wens | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #483 | Release: Android-versienaam blijft 0.35.0-android-test en de SHA-256-belofte klopt niet | bug | laag | 10 | 0 | commit, geen test: codeleescontrole |
| #481 | 3D-modelbrief: echt merk als stijlbron en tegenstrijdige stijlregels | wens | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #480 | Menudocumentatie klopt niet meer na #430/#434 | bug | laag | 4 | 0 | commit, geen test: codeleescontrole |
| #475 | personages.md is vóór de verhaalherschrijving blijven staan | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #474 | Docs: loopbaan, boerderij en vliegschool lopen achter op de code | bug | laag | 2 | 0 | commit, geen test: codeleescontrole |
| #471 | Gast: de boerderij groeit wél mee, de docs zeggen van niet | bug | midden | 2 | 0 | commit, geen test: codeleescontrole |
| #468 | Werelddocumentatie loopt achter op de code (tegels, citymap, POI, provinciewater) | wens | midden | 4 | 0 | commit, geen test: codeleescontrole |
| #466 | Naamgeving: nieuwe bestanden (23-25 okt) heten alsnog coop* | wens | laag | 6 | 0 | commit, geen test: codeleescontrole |
| #462 | Google AI Studio - Voices gebruiken? | wens |  | 34 | 0 | commit, geen test: codeleescontrole |

## Categorie C: achterhaald, dubbel of ontwerpkeuze (15)

| # | Titel | Soort | Impact | Commits | Tests | Reden |
|---|---|---|---|---|---|---|
| #911 | Escape-menu: informatiearchitectuur en vindbaarheid grondig herzien | wens | hoog | 0 | 2 | opgevolgd door het designsysteem (#980) |
| #909 | Prestaties > Alles: overzichtelijk maar saai; visueel aantrekkelijker | wens | midden | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #908 | Spullen: AAA-UI | wens | hoog | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #907 | Activiteiten: AAA-UI | wens | hoog | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #906 | Veroverd: AAA-UI | wens | hoog | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #905 | Loopbanen: AAA-UI | wens | hoog | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #904 | Verhaal > Opdrachten/Personages/Aanwijzingen: AAA-UI | wens | hoog | 0 | 0 | opgevolgd door het designsysteem (#980) |
| #903 | Samen spelen-scherm: flinke visuele overhaul | wens | hoog | 0 | 2 | opgevolgd door het designsysteem (#980) |
| #897 | Escape-menu: Spel > Spelen hoort bij Instellingen | wens | midden | 0 | 3 | opgevolgd door het designsysteem (#980) |
| #896 | Escape-menu: Spel > Overzicht is te vol; volume en losse info horen daar niet | wens | hoog | 0 | 1 | opgevolgd door het designsysteem (#980) |
| #816 | Attracties: volgende medaille-trede in de uitslag (#672-vervolg) | wens | midden | 2 | 1 | dubbel van #817 |
| #551 | Boten: snelheid en een speedboot als ontwerpkeuze | wens | laag | 0 | 0 | ontwerpkeuze (geen bug) |
| #541 | Mobiel landschap (800x360): camera onder maaiveld en in de bebouwing | bug | midden | 0 | 0 | dubbel van #548 |
| #534 | Pop-in van de wereld in de verte (LOD/streaming, uit playtest 27-10) | bug | midden | 0 | 0 | dubbel van #921 |
| #451 | Samen spelen: tekstchat en voicechat (geen prioriteit; alleen als het makkelijk en gratis  | wens | laag | 0 | 0 | ontwerpkeuze/geen prioriteit |

## Categorie A: commit en groene test (215)

| # | Titel | Soort | Impact | Commits | Tests | Reden |
|---|---|---|---|---|---|---|
| #976 | Bietencampagne: gebruik vrachtauto's met opleggers vol bieten i.p.v. bestelbusjes | wens | midden | 1 | 2 | commit + groene test |
| #940 | Missie "laag over het graan" is niet te starten: vliegtuig geweigerd door actieve missie | bug | zeer-hoog | 1 | 1 | commit + groene test |
| #928 | Container-missie: waypoints staan in het weiland naast de containers | bug | hoog | 1 | 1 | commit + groene test |
| #926 | Treinreis toont geen trein of omgeving, alleen progressbalk en skip | bug | hoog | 2 | 2 | commit + groene test |
| #882 | Taxi: tijdens de rit is er geen taxi te zien, alleen een progressbar en skip-knop | bug | hoog | 2 | 2 | commit + groene test |
| #878 | Werelddata: natte gebouwen weglaten/verplaatsen en auditdrempel provincie naar 0 (vervolg  | bug | midden | 1 | 2 | commit + groene test |
| #871 | Samen spelen op klein scherm: hub en wachtkamer vallen achter de onderrand (geen scrollbal | bug | hoog | 2 | 1 | commit + groene test |
| #868 | Menu-, kaart- en telefoontekst onder de 12px-vloer | bug | midden | 1 | 1 | commit + groene test |
| #865 | Gebouwen staan in het water (Meerstad, Eemshaven, Blauwestad) | bug | midden | 1 | 1 | commit + groene test |
| #864 | Gedragen props zweven voor de borst; kermiskarren zijn volledige auto's | bug | laag | 2 | 3 | commit + groene test |
| #862 | Cutscene-voertuigen rijden niet over de weg | bug | midden | 2 | 2 | commit + groene test |
| #856 | Kist Kees staat bij aanvang niet op Eelde (despawn/initialisatie) | bug | midden | 1 | 1 | commit + groene test |
| #853 | Vliegtuigwielen zweven 5 en 28 cm boven de grond | bug | laag | 1 | 1 | commit + groene test |
| #851 | Vliegtuigmodel: de vleugel snijdt horizontaal door de cockpitkap | bug | hoog | 1 | 1 | commit + groene test |
| #848 | GTA6-lijn: Hogelandrit, wrakduiken en onderdelen vindbaar maken | wens | midden | 1 | 1 | commit + groene test |
| #845 | Automatische navigatie: de afwisseling missie <-> side-activiteit terugbrengen | wens | midden | 3 | 5 | commit + groene test |
| #840 | Weer: visuele polish (plassen, regenboog, wind) | wens | laag | 1 | 3 | commit + groene test |
| #839 | Wrakduiken en schatten in de Wadden en Lauwersmeer | wens | hoog | 1 | 1 | commit + groene test |
| #838 | Heat: kleding wisselen en spuiterij met cooldown | wens | hoog | 1 | 1 | commit + groene test |
| #837 | Onderdelenjacht: één unieke auto laten bouwen | wens | midden | 2 | 1 | commit + groene test |
| #836 | Snel waypoint en taxi-app als diëgetisch reizen | wens | hoog | 2 | 2 | commit + groene test |
| #835 | Streekuitdaging met eigen vervoer (Wadden of Hogeland) | wens | midden | 1 | 1 | commit + groene test |
| #832 | Eerbetoon: het laatste bankje van Grunn, Beppes huis en een in-herinnering-kaart in de aft | wens | midden | 11 | 2 | commit + groene test |
| #830 | Dominante geldroute: korte missies betalen per stap veel meer (punten 10/13) | wens | midden | 7 | 1 | commit + groene test |
| #829 | Moeilijkheidscurve: M06/M20/M26/M30 uitschieters en oscillatie (punt 6) | wens | midden | 7 | 1 | commit + groene test |
| #823 | In het ommeland als je langs een trekker rijd ga je van 100 Naar 0. | bug | midden | 1 | 1 | commit + groene test |
| #822 | Musuem roof - weg varen met de boot. | bug | midden | 3 | 1 | commit + groene test |
| #821 | Overzicht: één blok 'Je voortgang' dat de drie lussen in gewone taal naast elkaar zet (#80 | wens | midden | 10 | 1 | commit + groene test |
| #820 | Herkenningspunten-album: kerken, molens en borgen in de provincie een doel geven | wens | midden | 10 | 1 | commit + groene test |
| #819 | Samen spelen: ontspannen rondvaart als passagier en een eigen-plan-tip bij host-only bijba | wens | midden | 4 | 2 | commit + groene test |
| #818 | Kiekdoar reageert op overvallen en gewonnen races | wens | midden | 2 | 2 | commit + groene test |
| #817 | Attracties met eigen eenheid: volgende medaille-trede in de uitslag | wens | midden | 1 | 1 | commit + groene test |
| #815 | Kaart-hover: noem doel plus medaille-eis en beloning | wens | midden | 2 | 2 | commit + groene test |
| #813 | Te doen: Begin hier met telling en de drie dichtstbijzijnde dingen | wens | hoog | 1 | 1 | commit + groene test |
| #812 | Kiekdoar: nieuws bij ontsnappen aan de politie en een nieuw snelheidsrecord | wens | midden | 1 | 1 | commit + groene test |
| #811 | Samen spelen: 1+1=3 uitleggen vóór de start (wachtkamer en startkaart) | wens | midden | 6 | 2 | commit + groene test |
| #810 | Routekwaliteit: twee vaste paren in de verse provinciebouw zijn 1,4-1,7x de kortste weg | bug | midden | 4 | 1 | commit + groene test |
| #808 | Steam-winkelpagina: verhaaltekst verouderd en privacyclaim klopt niet met Samen spelen (pu | bug | hoog | 4 | 1 | commit + groene test |
| #806 | Netwerk en platform: PvP-latency en zwakke hardware onderbouwen (punten 66, 68 en 69 uit d | wens | midden | 6 | 2 | commit + groene test |
| #805 | Mobiele port afmaken: pauzemenu staand en aanraakbediening (punt 60 uit de UX-top100) | bug | midden | 8 | 1 | commit + groene test |
| #801 | UX/onboarding: prompts op eigen tempo, touch-hints en stuurgevoeligheid (punten 27, 33 en  | bug | midden | 6 | 6 | commit + groene test |
| #800 | Gameplay: moeilijkheidskeuze en een heldere, minder extrinsieke progressielaag (punten 5 e | wens | midden | 28 | 9 | commit + groene test |
| #797 | Trailer: props van acteurs worden tot sessie-einde vastgehouden (clearShot dispost niet) | bug | laag | 2 | 1 | commit + groene test |
| #796 | Opruimpaden buiten disposeObject geven gedeelde person- en voertuiggeometrie niet terug (# | bug | midden | 6 | 4 | commit + groene test |
| #795 | Joingate: hostsleutel in de aankondiging bindt het join-antwoord aan de host (#777-vervolg | bug | hoog | 16 | 7 | commit + groene test |
| #794 | Ommeland-solids 4 Hz: nieuwe propjes zijn tot 250 ms niet botsbaar | bug | laag | 4 | 1 | commit + groene test |
| #793 | framecap rekent met 60 Hz op 120/144 Hz-schermen (zuinige modus meet te weinig wacht) | bug | laag | 2 | 1 | commit + groene test |
| #791 | resolveDeadlocks-index mist randstrook van de oude scan (tegenliggers 28,6-30 m) | bug | laag | 2 | 2 | commit + groene test |
| #790 | Wijkkaarten (#726) vallen buiten stateSignature: nieuwe kaart triggert geen autosave | bug | laag | 2 | 1 | commit + groene test |
| #786 | Bomen: gestreamde bomen verschijnen pas na >8 m beweging (treeSyncDue mist tile-stream) | bug | midden | 2 | 1 | commit + groene test |
| #785 | Politie-achtervolging stopt elke frame bij LOS-budget: early return slaat pursuit/movement | bug | hoog | 2 | 2 | commit + groene test |
| #784 | Autosave-retry kan in een andere tab een gewist slot herscheppen | bug | laag | 2 | 1 | commit + groene test |
| #783 | Joingate: trage hostRoom kan één verzoek twee keer beantwoorden; gateHandles groeit | bug | laag | 6 | 1 | commit + groene test |
| #781 | Instellingen: typewijziging van een bestaande sleutel in een toekomstige versie gaat verlo | bug | laag | 2 | 1 | commit + groene test |
| #780 | Nieuw spel: dialoog belooft herstelkopie te bewaren, maar deleteSlot verwijdert hem | bug | laag | 2 | 1 | commit + groene test |
| #779 | Kicken is alleen blijvend per token, niet per speler | bug | midden | 6 | 3 | commit + groene test |
| #778 | Openbare host: join-verzoeken kunnen de host overbelasten (aanbiedingen leven 15 minuten) | bug | hoog | 6 | 1 | commit + groene test |
| #777 | Joingate: een derde kan zich voordoen als host en de gast naar een eigen kamer sturen | bug | hoog | 6 | 3 | commit + groene test |
| #776 | opnameronde_test: jobs.length/wacht.length op een JSON-object wordt undefined | bug | laag | 2 | 1 | commit + groene test |
| #774 | Desktop httpcache: mtime-ETag kan bij gelijke grootte/millis stale data geven | bug | laag | 2 | 1 | commit + groene test |
| #771 | Cutscene-vangnet kan een bewuste pause:true-scene in de eerste 2 s overslaan | bug | laag | 2 | 1 | commit + groene test |
| #770 | Laadscherm: de rAF-lus stopt zonder done te resolven als het element losgekoppeld is | bug | laag | 2 | 1 | commit + groene test |
| #769 | TileStore: een afgebroken load blijft cancelled; een nieuwe request erop settelt nooit | bug | midden | 2 | 1 | commit + groene test |
| #768 | country_vehicles_test: retry op een warme map kan een koude-startregressie maskeren | bug | midden | 2 | 1 | commit + groene test |
| #764 | Tegelwereld-tests: prefetchPoints is weggecommentarieerd en tileworld_sparse_test faalt op | bug | midden | 2 | 2 | commit + groene test |
| #762 | Geheugen: overlay-residenten en _roadsLive blijven de hele sessie hangen (ongeveer 100 MB  | bug | midden | 6 | 2 | commit + groene test |
| #761 | G-Music: preload wordt nooit gedisarmd, na een ronde staat alles weer op preload auto | bug | midden | 2 | 1 | commit + groene test |
| #760 | Bomen: de #651-throttle spaart alleen de matrices; de treesNear-query draait nog elke fram | bug | midden | 2 | 1 | commit + groene test |
| #758 | Story: de 5 Hz-verversing van currentStep is dode code (een tick wordt twee keer gebruikt) | bug | midden | 2 | 1 | commit + groene test |
| #757 | Web: service worker precacht alle JS-modules en verdubbelt de eerste download | bug | hoog | 6 | 3 | commit + groene test |
| #756 | Watermasker bakeert nooit op een machine met structureel dt boven 30 ms (zuinig-stand/30 f | bug | hoog | 2 | 1 | commit + groene test |
| #754 | Elke gestroomde tegel herbouwt de routinggraaf (300 ms) en waterindex (70-90 ms) | bug | hoog | 4 | 1 | commit + groene test |
| #752 | Voertuig-buurtindex wordt in de spellus nooit ververst: 200 rebuilds per frame en een stal | bug | hoog | 4 | 1 | commit + groene test |
| #748 | Geïnstalleerde app crasht bij start: Cannot find module './guards.cjs' | bug | hoog | 2 | 2 | commit + groene test |
| #745 | `stage`-parameter wordt genegeerd in playStoryIntro/Outro | bug | midden | 2 | 2 | commit + groene test |
| #744 | Vijf te lange tekstscènes: M01 105 s, M16 96 s, M03/M08 85 s, M26 77 s | wens | midden | 2 | 1 | commit + groene test |
| #743 | M18.3: 54 s logboek-uitleg als talk tijdens de sluipstage | bug | midden | 2 | 1 | commit + groene test |
| #741 | Naamkaarten kloppen niet: Oma in M08.1, Durk & Douwe zonder kaart, Tessa/Tammo in C00.1 | bug | midden | 2 | 2 | commit + groene test |
| #737 | M16-outro: kermis en dijk in één set — verkeerde plek, water en dagdeel | bug | hoog | 2 | 2 | commit + groene test |
| #736 | Veroverlaag: geliefde buurten (Oosterparkwijk, Korrewegwijk, Selwerd, ...) zijn niet verov | wens | hoog | 2 | 1 | commit + groene test |
| #734 | Regie/techniek: bundel de 14 midden- en 2 laagpunten uit de cutscene-review | wens | midden | 6 | 3 | commit + groene test |
| #732 | Landmark- en Ommelanden-scènes starten op topsnelheid, tijdens een race of in pigeonmode | bug | hoog | 2 | 1 | commit + groene test |
| #730 | Regiehoogten en acteurs staan op absolute z=0; op dijken, viaducten en wierden zakken scèn | bug | hoog | 2 | 1 | commit + groene test |
| #729 | Cutscenes pauzeren de wereld en de speler niet (pause:true doet niets) | bug | zeer-hoog | 2 | 1 | commit + groene test |
| #727 | cutvervang is onbereikbaar en heeft geen gast-handler | wens | laag | 2 | 1 | commit + groene test |
| #726 | Nieuw spel wist de 'gezien'-lijst van wijken voor alle saves | bug | laag | 2 | 2 | commit + groene test |
| #725 | wijkHighlights kan bezienswaardigheden van een andere wijk tonen | bug | laag | 2 | 1 | commit + groene test |
| #724 | Tests: gast-kant van scriptscènes en de verover-intocht | wens | midden | 2 | 3 | commit + groene test |
| #723 | Cutscene-docs, preview en specs bijwerken na deze review | wens | midden | 2 | 3 | commit + groene test |
| #722 | Vijf missies zonder eigen outro-regie: M06, M10, M21, M22, M24 | wens | midden | 2 | 1 | commit + groene test |
| #720 | Activiteitenscènes: één gedeelde helper, één standaard en vier onthullingen | wens | midden | 2 | 1 | commit + groene test |
| #719 | Finale: geen harde teleport naar de Grote Markt; fade en voertuig afhandelen | bug | midden | 2 | 1 | commit + groene test |
| #718 | Opening: anker de keuken en straat bij thuis en laat de stap niet na 40 s vallen | bug | hoog | 2 | 1 | commit + groene test |
| #717 | Openingsmontage: hergebruiken als C00.1 of opruimen (besluit + docs) | wens | midden | 2 | 1 | commit + groene test |
| #716 | Wijkterminologie: 66 buurtpunten versus 123 CBS-wijken — één keuze, één UI | wens | hoog | 4 | 3 | commit + groene test |
| #712 | Samen spelen: filmpjes zonder script zijn host-only; gast ziet alleen balken of niets | wens | hoog | 2 | 3 | commit + groene test |
| #709 | Eerste bezoek aan een wijk: kaart, flyover en wijkFilm herzien | wens | midden | 2 | 4 | commit + groene test |
| #708 | Intocht: eenmalig per save, herspeelbaar via Veroverd en in de preview | wens | midden | 4 | 4 | commit + groene test |
| #707 | Intocht-content: 8-11 handgeschreven scènes per veroverbare wijk | wens | hoog | 4 | 3 | commit + groene test |
| #705 | Intocht-fundament: betaal-haak, wachtrij, rust-poort en MOMENTS.veroverd | wens | hoog | 2 | 2 | commit + groene test |
| #704 | Intocht: één lange cutscene per veroverde wijk (epic) | wens | hoog | 4 | 2 | commit + groene test |
| #703 | Specs, ADR's en FIRE-administratie: midden-/laagpunten uit de documentatie-review | bug | midden | 2 | 1 | commit + groene test |
| #697 | Documentatie-ingang ontbreekt: docs-index, spec-verwijzingen en reviewmappen | wens | midden | 2 | 1 | commit + groene test |
| #692 | Besluit: documentatie deels Engels terwijl ADR 0017 Nederlands voorschrijft | wens | midden | 2 | 1 | commit + groene test |
| #689 | TTS-generatie via de LiteLLM-gateway in plaats van Google AI Studio en OpenRouter | wens | midden | 6 | 1 | commit + groene test |
| #688 | Activiteiten: één invoer- en stopconventie over alle spellen | wens | midden | 2 | 1 | commit + groene test |
| #687 | Samen spelen: laat een menu alleen de eigen speler pauzeren | wens | midden | 2 | 1 | commit + groene test |
| #684 | Samen spelen: positieve samen-kan-lijst en een eigen-plan-kaart voor gasten | wens | midden | 4 | 2 | commit + groene test |
| #683 | Samen spelen: breid het coöp-aanbod in herhaalbare inhoud uit (banen en de 7 deels-activit | wens | hoog | 6 | 2 | commit + groene test |
| #682 | Spelerstekst: verouderde aantallen (vliegschool 13 vs 20) en één woordenlijst, met een aan | bug | laag | 4 | 2 | commit + groene test |
| #681 | Ommeland: één paspoort voor dorpen, eierballen, vondsten en evenementen | wens | midden | 2 | 1 | commit + groene test |
| #680 | Hengelen: houd het uurloon in lijn met de bijbanen | wens | midden | 2 | 1 | commit + groene test |
| #679 | Attracties: geef reuzenrad, snackketen, safehuizen en evenementen een doel en een aankondi | wens | midden | 2 | 1 | commit + groene test |
| #678 | Activiteiten: één startkaart met doel, medaille-eis, beloning en samen-status | wens | hoog | 4 | 2 | commit + groene test |
| #677 | Te doen: neem alle 26 activiteiten op in de catalogus | wens | hoog | 4 | 1 | commit + groene test |
| #676 | Veroverd: eigen tab, eerstvolgende taken en een zichtbare catalogusregel | wens | midden | 4 | 3 | commit + groene test |
| #675 | Postgame en Fjord Frituur: herbalanceer de prijzen en maak de Fjord een investeringslus | wens | midden | 2 | 2 | commit + groene test |
| #673 | Activiteiten: een variant of vervolgdoel na de hoogste medaille | wens | midden | 2 | 1 | commit + groene test |
| #672 | Medailles: één uitleg met bedrag en punten, plus de volgende trede in de uitslag | wens | hoog | 4 | 1 | commit + groene test |
| #671 | Loopbaan: toon per vak de eerstvolgende stap en waar je die doet | wens | hoog | 2 | 1 | commit + groene test |
| #670 | Machinist: één actieve vaardigheid en conducteurskeuzes per dienst | wens | midden | 4 | 1 | commit + groene test |
| #669 | Boerderij: maak de dagelijkse keuze centraal en de werkgang korter | wens | midden | 2 | 1 | commit + groene test |
| #668 | Bijbanen: laat het niveau ook variatie belonen, niet alleen rondes | wens | midden | 2 | 2 | commit + groene test |
| #665 | Verhaal: één echte tegenslag en een kalenderteller naar het Ontzet | wens | midden | 2 | 2 | commit + groene test |
| #664 | Verhaal: dicht het reisgat M12-M13 en maak de ruime timers een medaille-eis | wens | midden | 2 | 2 | commit + groene test |
| #663 | Verhaal: M09 en M10 - halveer of onderbreek de lange langzame ritten | wens | hoog | 2 | 2 | commit + groene test |
| #662 | Verhaal: comprimeer de opening en maak het eerste speelbare moment < 3 minuten | wens | hoog | 2 | 2 | commit + groene test |
| #661 | Performance UI/kaart: kaartoverlay hertekent elke frame terwijl de wereld stilstaat, plus  | wens | midden | 2 | 3 | commit + groene test |
| #660 | G-Music buffert bij elke start alle 34 nummers (~128 MB) terwijl er één speelt | bug | midden | 2 | 1 | commit + groene test |
| #657 | Laadtijd: web wacht op de service worker en laadt 892 losse modules (12 MB) zonder bundel; | wens | midden | 8 | 3 | commit + groene test |
| #655 | Save-pad: gast herprobeert mislukte save elke frame; save en boot parsen 3-8x meer dan nod | bug | midden | 8 | 5 | commit + groene test |
| #654 | Performance missies/verhaal/minigames: elke frame duur werk (3 midden- en 4 laagpunten) | wens | midden | 8 | 4 | commit + groene test |
| #653 | Performance actoren/verkeer/AI: voertuig-buurtindex en frequenties (5 midden- en 2 laagpun | wens | midden | 14 | 6 | commit + groene test |
| #652 | Verkeers-AI bouwt per voertuig per frame een nieuwe padpolyline (25-55 duizend objecten pe | bug | hoog | 4 | 1 | commit + groene test |
| #650 | Eén gestreamde tegel is één onbegrensd FrameQueue-item: grote provincietegels blokkeren ee | bug | hoog | 2 | 1 | commit + groene test |
| #649 | Watermasker wordt synchroon en onbegrensd opnieuw gerasterd (5-25 ms hapering tijdens stre | bug | hoog | 2 | 1 | commit + groene test |
| #648 | Specs en ADR's lopen achter op de code: versies, aantallen en verwijzingen | wens | midden | 4 | 1 | commit + groene test |
| #647 | Verhaaldata: [BEHOUDEN]-regels zonder opname falen niet in build_story_data --check | bug | laag | 4 | 1 | commit + groene test |
| #645 | Ontwerpsysteem: tokendrift en ongemeten woordbudgetten buiten de geteste bestanden | wens | midden | 2 | 2 | commit + groene test |
| #642 | Samen spelen: startknop, 'iedereen stoppen' en filmpje-overslaan zijn nog van de opener (A | wens | midden | 2 | 2 | commit + groene test |
| #640 | ADR 0017 (code in het Engels) herzien: regel is niet meetbaar en botst met 0018/0024 | wens | midden | 2 | 1 | commit + groene test |
| #639 | Samen spelen: bootorde vastleggen — ADR 0022 en 0024 spreken elkaar tegen | wens | hoog | 2 | 1 | commit + groene test |
| #635 | Startvangnet: skipCinematic niet geïmporteerd, dus undef_check (en CI) is rood | bug | hoog | 4 | 2 | commit + groene test |
| #633 | Overige uitjes: één gedeelde uitje-presentatie met per uitje een eigen sfeer | wens | midden | 2 | 2 | commit + groene test |
| #629 | Heist: blueprint en panelen met een eigen Klusje-van-een-uur-sfeer, zonder handgeschreven  | bug | hoog | 4 | 2 | commit + groene test |
| #626 | Boerenwerk: werkbalkje zonder zakdoek-sfeer en met bracket-tekst als hint | bug | midden | 2 | 1 | commit + groene test |
| #622 | Vliegschool: lesmenu als rapportkaart met eigen school-sfeer | wens | midden | 2 | 1 | commit + groene test |
| #612 | Over: de hele changelog in één luik, met een markering die alleen op het oude startscherm  | wens | laag | 2 | 2 | commit + groene test |
| #610 | Spullen + Garage: draaihint voor één apparaat en een lijst vol lege vlakken | wens | midden | 4 | 1 | commit + groene test |
| #609 | Loopbanen + Visboek + Boerderij: de sfeerband werkt, de rust en de sfeer ontbreken elders | wens | hoog | 2 | 3 | commit + groene test |
| #607 | Te doen: dezelfde rij doet in Alles en Dichtbij iets anders | wens | midden | 2 | 2 | commit + groene test |
| #606 | Opgeslagen spellen: verwijderen, autosave en wat een gast bewaart | bug | midden | 4 | 1 | commit + groene test |
| #604 | Instellingen en Cheats: één lijst met uitleg, zonder tab-doodlopers | wens | midden | 4 | 2 | commit + groene test |
| #603 | Telefoon: één plek voor berichten en kaarten die je terug kunt vinden | wens | midden | 8 | 1 | commit + groene test |
| #601 | Pauzemenu: vaste rail, rustig Overzicht en voorspelbare Q/E | wens | midden | 4 | 3 | commit + groene test |
| #600 | Start, boot en laadscherm: één rustige, eerlijke eerste indruk | wens | midden | 2 | 1 | commit + groene test |
| #595 | Eigen sfeer per activiteit: één sfeersysteem voor alle activiteiten-UI's (uitbreiding #453 | wens | hoog | 8 | 2 | commit + groene test |
| #594 | Kaart: "niet voor jou"-markering voor wegen weghalen | wens | laag | 2 | 1 | commit + groene test |
| #593 | Codebase-review desktop/tooling/CI: 8 midden- en 4 laagpunten | bug | midden | 4 | 8 | commit + groene test |
| #592 | Codebase-review UI/invoer/audio: 1 midden- en 2 laagpunten | bug | midden | 4 | 4 | commit + groene test |
| #591 | Codebase-review verhaal/missies: 2 midden- en 3 laagpunten | bug | midden | 4 | 1 | commit + groene test |
| #590 | Codebase-review opslag/save: 3 midden- en 3 laagpunten | bug | midden | 4 | 5 | commit + groene test |
| #583 | Openbare lijst publiceert de kamercode, en daarmee is het IP-adres van de host door iedere | bug | hoog | 1 | 7 | commit + groene test |
| #582 | Hangende tegel-fetch of dode tile-worker bevriest de wereld zonder fout of time-out | bug | hoog | 10 | 2 | commit + groene test |
| #579 | Gast ziet onterecht 'Opslaan mislukt' als er niets te bewaren viel | bug | laag | 4 | 2 | commit + groene test |
| #578 | Instellingen uit een nieuwere versie worden bij de eerste wijziging teruggezet | bug | laag | 4 | 1 | commit + groene test |
| #577 | Logo toont Grootste Diefstal Ever: Engels in spelerstekst (eigenaarsbeslissing) | wens | laag | 2 | 1 | commit + groene test |
| #576 | CI test main niet en de release gaat niet langs de suite: een tag kan op een rode commit s | bug | hoog | 2 | 1 | commit + groene test |
| #572 | Documentatie loopt achter: changelog 0.56.x, RELEASEN.md en de android-versie | bug | laag | 2 | 1 | commit + groene test |
| #569 | Alleen spelen schrijft elke minuut een volledige save (en synchroon bij Samen openen) | bug | laag | 4 | 2 | commit + groene test |
| #568 | De uitlegkaart Samen spelen verschijnt nooit meer | bug | laag | 4 | 1 | commit + groene test |
| #567 | Alleen spelen: 7/8/9 zet een eigen baken in de wereld | bug | laag | 4 | 1 | commit + groene test |
| #566 | Checkpoint van een gast schrijft de schade van de heldenauto van de gastheer in de eigen s | bug | midden | 6 | 1 | commit + groene test |
| #565 | Gast die op een lege kaart Spel opslaan kiest, houdt een dode schrijfplek over | bug | midden | 6 | 1 | commit + groene test |
| #564 | Een spel verwijderen dat je nu speelt: de autosave maakt het binnen een minuut weer aan | bug | midden | 6 | 2 | commit + groene test |
| #563 | Mislukte save bij Afsluiten/Herstarten wordt genegeerd: spel sluit en voortgang is weg | bug | midden | 4 | 2 | commit + groene test |
| #562 | Nieuw spel (nieuwe plek) laadt na de reload de oude save | bug | hoog | 4 | 2 | commit + groene test |
| #561 | Zuinige modus wordt als trage GPU gelezen: resolutie zakt naar 50% | bug | midden | 2 | 3 | commit + groene test |
| #560 | Alleen spelen: controller gebruikt de coöpindeling (radio en toeter weg) | bug | midden | 4 | 1 | commit + groene test |
| #559 | Alleen spelen: de metgezel volgt niet meer (volg-AI staat uit) | bug | midden | 4 | 1 | commit + groene test |
| #558 | Iedere push-collaborator kan releases publiceren of assets vervangen zonder eigenaarsakkoo | bug | hoog | 2 | 1 | commit + groene test |
| #557 | Laadscherm kan op ~92% blijven hangen als de geometry-worker resultaten levert | bug | hoog | 2 | 1 | commit + groene test |
| #555 | Heli of vliegtuig besturen crasht met 'figs.slice is not a function' | bug | zeer-hoog | 4 | 1 | commit + groene test |
| #554 | Alleen spelen is een sessie van één (multiplayer in je eentje) | wens | hoog | 18 | 6 | commit + groene test |
| #537 | Fietsen: leunen, wheelies en stoppies, dynamisch trappen en het skatepark (uit playtest 27 | wens | midden | 6 | 2 | commit + groene test |
| #530 | Eerste start: het scherm met naam en meedoen, plus de schakelaar in Instellingen | wens | zeer-hoog | 9 | 2 | commit + groene test |
| #528 | Multiplayer first: altijd een online sessie, ontsnappen naar besloten, en je naam een keer | wens | zeer-hoog | 20 | 4 | commit + groene test |
| #527 | Samen spelen: menu's terug naar een hub met drie stappen | wens | hoog | 6 | 1 | commit + groene test |
| #524 | Stad ontpinnen: 109 hele-array-lezers terug naar tegelvragen of rasters | wens | midden | 10 | 3 | commit + groene test |
| #523 | Missieketen per groep: coopGroepSleutel wordt gelezen maar nooit gezet | wens | hoog | 6 | 2 | commit + groene test |
| #520 | Meelopen: de pauzebanner blijft staan en de spelklok springt terug | bug | hoog | 8 | 3 | commit + groene test |
| #519 | Werkvoorraad na 0.54.0: wat klein en veilig is, wat groot maar afgebakend is, en wat op ee | wens | hoog | 32 | 1 | commit + groene test |
| #515 | Playtest 27-10: vrij spelen van 1,5 uur (besturing, verkeer, waypoints en sfeer) | bug | midden | 42 | 2 | commit + groene test |
| #509 | drive_audit: auto's botsen op een kluitje bij Kastanjelaan en worden van de rijbaan geduwd | bug | midden | 8 | 2 | commit + groene test |
| #508 | Tegelrand: de knip vervormt de rijbaan (5 bomen en 5 bochten op de kniprand) | bug | midden | 8 | 1 | commit + groene test |
| #501 | Twee sluimerende overspanningen: fietspad onder de Beneluxweg op 0,52 m en een laan naast  | bug | midden | 4 | 1 | commit + groene test |
| #500 | Samen spelen: world.player is een singleton door de hele code (geen speler-abstractie) | wens | hoog | 68 | 2 | commit + groene test |
| #498 | World-stateobject: eigenaarschap is een afspraak, geen afgedwongen grens | wens | midden | 16 | 1 | commit + groene test |
| #496 | Foutrapport 0.50.0: ontbrekende tegelpakketten, menu-404, treinrit-cap en oude meldingen | bug | hoog | 12 | 4 | commit + groene test |
| #495 | Drie controllertoetsen worden gelezen maar nooit verstuurd ('b', 'i', 't') | bug | midden | 8 | 1 | commit + groene test |
| #494 | Overspanning onder het Emmaviaduct: 1 weg onder de 4,2 m | bug | midden | 6 | 1 | commit + groene test |
| #493 | Geldcurve fase 1: mildere start, flitswaarschuwing en een hoger startbudget | wens | hoog | 6 | 1 | commit + groene test |
| #491 | Werelddata: routeren over de stad/provincie-naad, één landspoor en drie bomen op de rijbaa | bug | hoog | 8 | 2 | commit + groene test |
| #488 | stad.json kan echte winkelnamen bevatten; de render is niet gecontroleerd | bug | midden | 4 | 1 | commit + groene test |
| #485 | Webversie heeft geen enkele test | wens | hoog | 2 | 1 | commit + groene test |
| #478 | Speltekst: "GO!" en "Perfect!" staan op het scherm | bug | midden | 2 | 1 | commit + groene test |
| #477 | Verhaal: verouderde built-comment, dode Deel 4-data en een onjuiste kalender | bug | laag | 4 | 1 | commit + groene test |
| #476 | Mevrouw Hoving krijgt geen naamkaart; storytext verwijst naar de oude naam | bug | laag | 2 | 1 | commit + groene test |
| #473 | Audiopieken op de hoofdthread (1945 ms en 88 ms) | bug | midden | 10 | 1 | commit + groene test |
| #469 | Kruispuntmodel leest de gestreamde provincietegels niet | bug | hoog | 4 | 2 | commit + groene test |
| #465 | Speltekst: vier Engelse UI-termen (Kneel, Driver/Midrange/Putter, Grinds, Made with ♥) | bug | midden | 2 | 1 | commit + groene test |
| #464 | Samen spelen: echte serverbrowser (zoeken, filteren, sorteren, leeftijd, favorieten) | wens | midden | 8 | 2 | commit + groene test |
| #461 | Sound: volume na het starten van een game | bug |  | 4 | 1 | commit + groene test |
| #458 | Safehouses in bestaande gebouwen in plaats van een los huisje | wens | midden | 8 | 1 | commit + groene test |
| #449 | Samen spelen: eigen voertuigen en panden meenemen in de wereld van een ander (bezorgen en  | wens | hoog | 14 | 2 | commit + groene test |

## Beeldrun top 30 (20-11, `scripts/qa/hertest_beeld.mjs`)

Eén Electron per run, wegwerpprofiel, stage van de werkboom met de wereld van `desktop/build/game` (19-11). Vaste camerastanden lopen via een eigen cinematic: `world.cameraOverride` wordt door `cinematics.js` gewist zodra er geen filmpje loopt (het oude `plek_beeld.page.js` zet daarom nu een gewone speleropname neer). Beelden staan in `docs/img/qa/<nummer>-hertest-*.png`. De machine draaide tegelijk met twee andere Electron-runs (frames 25 fps): prestatiemetingen zijn daardoor niet eerlijk.

| # | Stand | Bewijs en opmerking |
|---|---|---|
| #884 | opgelost | `884-hertest-brug-visvliet-schuin/-onder`: N355-brug over de Lauwers heeft een dichte asfaltlaag, dichte liggers en pijlers; niets doorzichtig. |
| #918 | opgelost op de bekeken plek | `918-hertest-oever-lucht`: langs de Friese kanaaloever houdt het gras op bij de waterlijn, geen gras over water. Twee oevers gezien, de tweede lag naast de weg. |
| #936 | deels | `936-hertest-kade-houdt-tegen`: rustig aanrijden (< 9 m/s) stopt bij de wal, melding "De kade houdt je tegen". Harder dan 9 m/s rijdt de auto er bewust overheen (ontwerp van `wateredge.js`); wie een harde kade wil, moet dat besluiten. |
| #949 | opgelost | `949-hertest-plons-snel`, `949-hertest-gezonken`: snelle auto valt met plons en melding "Je auto zinkt, E om uit te stappen", zinkt daarna; de auto bleef zichtbaar in alle 9 metingen. |
| #970 | deels | `970-hertest-politie-tegen-muur`: politieauto en sedan op 8 panden in Usquert (12 m aanloop, 6 s gas): 0 frames binnen een pand, auto staat tegen de gevel. Voetgangers door muren en de garage zelf: niet bekeken. |
| #923 | opgelost | `923-hertest-knakker-raam`: Knakker (hatch) van opzij door het zijraam: zitten, dashboard en stuur, geen horizontale plaat. |
| #547 | opgelost | `547-hertest-knakker-ruiten` (voor- en zijruiten, ruiten donker maar aanwezig) en `547-hertest-knakker-binnen` (eerste-persoon-beeld: A-stijlen, geen open cabine). |
| #942 | deels | `942-hertest-knakker-schade`: auto op 22% gezondheid (rook en vuur) heeft het interieur nog gewoon in de carrosserie; echte botsvervorming (deuken) niet getest. |
| #927 | opgelost | `927-hertest-warffum-automaat-op-perron`: de kaartautomaat staat op het perron naast de speler, niet op het spoor. |
| #961 | deels | `961-hertest-zuidhorn-perron`: speler en Tessa spawnen op het perron, de automaat staat op het perron. Groningen Noord: speler staat op het verhoogde perron (`961-hertest-noord-perron`); of de overkapping de weg eronder visueel blokkeert is niet beoordeeld. |
| #954 | opgelost | `954-hertest-bourtange-uitkijk-prompt`: bij Bourtange Vesting (42437, 22721) verschijnt "Uitzicht bekijken (E)"; E gebruikt het punt (prompt weg, `isViewpointUsed` waar). |
| #965 | opgelost op 1280x720 | De tabs blijven bovenaan staan, de kop van Overzicht verdwijnt niet eronder bij scrollen (`965-hertest-spel-overzicht`). Kleinere vensters niet gemeten. |
| #977 | opgelost | `977-hertest-kaart-marum`: op de hoogste kaartzoom bij Marum lopen geen perceelgrenzen door de bebouwing; alleen enkele blauwe slootlijnen in een groen terrein. |
| #540 | deels | `540-hertest-trekker-camera`: volgcamera achter trekker (6,5 m) en bus (18,8 m) stabiel in stilstand en kruipend; het losraken na een bocht of botsing is niet gereproduceerd (beide voertuigen bleven in de wijk hangen). |
| #539 | niet bevestigd | `539-hertest-garage-knalpot`: Garage Knalpot Damsterkwartier heeft geen groene plaat. Eén van de vele vestigingen; de plaat kan bij een missiemarker horen. |
| #859 | waarschijnlijk opgelost | Bestaand beeld `986-opening-keuken-tessa.png`: Tessa zit met de handen voor haar; code gebruikt `arms:'lap'`. Geen eigen run. |

Niet in beeld bekeken (code en test staan groen, zie hierboven; geen beeldrun gedaan): #948 (boot onder grond), #937 en #921 (laadhapering: eigen meting op 55 m/s over 2,4 km gaf mediaan 39,7 ms en 12 frames van 100 ms of meer, maar op een belaste machine zonder referentie), #969 (koeienschuur: missie moet gestart worden), #947, #945, #934, #933, #932, #930, #914, #951, #850 (aanraakpaneel: venster 800x360 en aanraakmodus nodig), #533.

## Beeldrun akte 4 t/m 6, Elf Bruggenrace en de rest van de top 30 (20-11, tweede ronde)

Tooling: `scripts/qa/akte45_beeld.mjs` (een Electron, wegwerpprofiel, stage van de werkboom met de wereld van `desktop/build/game` van 17-11; missies met de debug-haak gestart en stap voor stap doorgelopen; vrije camera via `cinematics.startCameraTake`; per stap een meting van water en gebouwen onder de aankleding) en `hertest_beeld.mjs --only=koe,politie`. Elk beeld is door mij bekeken. Wat in een beeld niet te zien is, staat hieronder als "niet gezien". De camera is een kunstmatige vrije stand en de speler wordt per beeld neergezet: een beeld bewijst de plaatsing en het uiterlijk, niet het spelgevoel.

### Akte 4 en 5

| Missie | Gezien | Oordeel | Bewijs en opmerking |
|---|---|---|---|
| M19 Stoom, perron | ja | goed, 1 bug gefixt | `955-m19-perron-reizigers`, `955-m19-locomotief-bij-perron`: locomotief en rijtuig staan langs een echt perron, reizigers staan op het perron en niet op de rails. **Bug:** de startplek ligt 3 m van het doel van de eerste stap, dus die stap was meteen klaar en het perron (aangezet op die stap) bestond nul seconden. Nu staat het perron ook op de instapstap (`akte45_aaa_test`). Niet gezien: de aankomst van de trein bij het volgende perron en een fotograaf. |
| M26 plein | ja | goed | `955-m26-plein-publiek-jurytafel`: toeschouwers die juichen, kramen, een jurytafel met bekers, niets in een gebouw (0 van 13 onderdelen). `955-m26-spandoek-voor` en `-achter`: "FEEST OP HET PLEIN" is van beide kanten leesbaar en niet gespiegeld (de eerdere fix klopt). Het spandoek staat op 17 m van het doel; vanaf de speler is het klein. |
| M20 Bourtange, aankleding | ja | **bug gefixt** | `955-m20-aankleding-in-gracht-voor`: tenten, kanon en vlaggen stonden in de gracht (gemeten: 4, 15, 10 en 10 van 19 onderdelen in het water, per stap). `955-m20-aankleding-op-droog-na`: 0 in water, 0 in gebouw; onderdelen schuiven naar het doel toe of vervallen (`missiedecor.js`, `missiedecor_test`). |
| M20 wachtkring deur twee en drie | ja | bug gefixt, in beeld bevestigd | De doelen liggen op een brugdek over de gracht. De kring lag op het water eronder; nu op het dek (`955-m20-deur3-ring-op-brugdek`: de gele streepjes liggen op het dek). Fix in `wachtprops.js`: de hoogte van de speler als hint. Alleen bevestigd met de speler op het dek; een mens die er echt aankomt is niet gezien. |
| M20 kruitkelder (binnenset) | nee | niet gezien | De deurstappen (7 tot 15) spelen buiten met een wachtkring: de binnenset `kruitkelder` is in geen enkel beeld gebouwd (in de beelden bij stap 11 en 13 staat de speler buiten op het brugdek). Of de kamer op deze plek niet past (`buildStageSet` geeft dan null) of een andere oorzaak: niet uitgezocht. **Open.** |
| M20 wachtfiguren (Jelles mannen) | deels | niet herkend | In de wachtstappen staan kring, tenten en publiek; een figuur die kloppend of wachtend op de kring staat heb ik niet herkend. |
| M22 wachtfiguur bij het luik | nee | niet gezien | De doorloop van de stappen (zonder echt rijden) kwam niet bij de schuur-stap; het `schuur`-plan is niet in beeld. Open. |
| M17 Open, dicht | ja, deels | goed | `955-m17-brug8-doel-op-water`: de doelen van de vier bootstappen liggen in het water (gemeten, `doel` waar voor alle vier), de regelkaart en Wubbo staan er, het tijdvak is zichtbaar. De vaart zelf (onder de grond, #948) niet gevaren. |
| M09 eierkratten | ja | goed | `955-m09-eierkratten-achterop`: zes kratten zichtbaar achterop de trekker; `955-m09-hud-eierteller`: teller "60 van 60 eieren heel", snelheidsbalk met maximum 40 km/u en de richtingsbalk. |
| M10 afstandsmeter | nee | niet gezien | Quad en regelkaart wel (geen beeld bewaard); een afstandsmeter tot de limo heb ik niet gezien, alleen "1,2 km" naar het doel. |
| M08 Oma Trijntje | deels | niet herkend | Fatbikes op de kade, HUD "Geschept: 0, Gezondheid"; Oma Trijntje als wachtend figuur bij het doel zie ik niet (een boom en de kade). Open. |
| M07 plein | ja | goed | `955-m07-plein-kramen-publiek`: kramen, tafel en toeschouwers bij de Oosterpoort, niets in water of gebouw (0 van 13). Twee kramen staan half op het fietspad. |
| M23, M25 | ja, deels | geen klachten | Colonne: HUD "0/6 bij elkaar" en keuzekaart; M25: Oma's keuken met kraam bij de oefenronde. M13 en M15: aankleding 0 van 8 in water of gebouw. |
| M15 landing met publiek, M16 kroegset | nee | niet gezien | De oude `akte3_beeld` zet de speler niet in het vliegtuig en M16 start als race; geen van beide stappen kwam in beeld. Open. |
| A1 weegbrug en oplegger | nee | niet gezien | `akte2_beeld --only=a1`: de bietenspot laadt niet in deze stage (de terugvalplek in de stad); open. |

### Akte 6 en de Elf Bruggenrace

| Onderdeel | Gezien | Oordeel | Bewijs en opmerking |
|---|---|---|---|
| M27 Inpakken | ja | matig | `955-m27-inpakken-wachtring`: markering en wachtkring op een grasstrook, geen dozen of figuur herkend. |
| M28 De wisselwoning | ja | goed | `955-m28-wisselwoning-buren`: buren met een kast en stoelen langs de straat, 0 van 8 onderdelen in water of gebouw. |
| M29 Terug (erf) | ja, deels | goed | Tafels met kratten en figuren op het erf, 0 van 10 in water of gebouw; de camera stond in een boom, geen bewaard beeld. |
| M30 Het proefbeleg | ja | **bug gefixt** | Voor de fix stonden bij stap 7 twee van vijf onderdelen in een huis en bij stap 9 twee in een gracht. Na de fix 0 en 0 (alle stappen). |
| Elf Bruggenrace | ja | goed, 1 opmerking | `955-bruggenrace-start-hud`: regelkaart, "Jelle 8 m voor", "Bruggen 0/12", controlepuntkaart; `955-bruggenrace-finish-uitslag`: uitslagkaart na de winst. **Opmerking:** de HUD telt twaalf "bruggen" (elf bruggen plus de finish bij de Spilsluizen), de naam zegt elf. Niet gewijzigd (de tekst loopt ook via de Samen spelen-melding). Publiek bij de start niet herkend. |

### De nog niet bekeken top-30-issues

Geen enkel issue is gesloten: voor niets daarvan weerlegt een beeld de klacht duidelijk.

| # | Stand | Opmerking |
|---|---|---|
| #948 | deels | M17: de doelen van de vier bootstappen liggen in water, `boat_land_test` groen; niet gevaren (de klacht gaat over onder de grond varen), dus open. |
| #969 | niet gezien | De koe-uitdaging staat niet in de spotlijst van `__postgame` (alleen bruggen, fierljep, skutsje, fjord), dus niet te starten in het harnas; schuur en bord niet in beeld. De schuur ligt op (8772, -6000), 817 m van de boerderij (9494, -6396). Open. |
| #947 | niet gezien | Code in `storytravel.js` met een eigen guard (#947); geen beeld gemaakt. |
| #945 | niet gezien | De plaats "Wonschoten" staat nergens in de data; de klacht gaat over fictieve akkerranden; `countryside.js` maakt ze niet meer bij echte tegels. Geen beeld. |
| #934 | niet gezien | `impactbalance.js` en `breakables.js` dragen de fix; een rit tegen straatmeubilair niet gedaan. |
| #933 | gemeten | Op het platteland bij Usquert gaf 90 s (18 tellingen, straal 500 m) bij 0 sterren nul politieauto's (`933-hertest-platteland-90s`). Met sterren niet gemeten. Open voor de eigenaar. |
| #932 | niet gezien | Taxi-aankomst is gezien bij #882 (`882-taxi-aangekomen-winsum`); de specifieke bestemming Noord-Bierum niet. |
| #930 | niet gezien | De route langs het kerkhof van Usquert niet gereden. |
| #914 | niet gezien | Stuntavond (M01) startte niet in het harnas (`m01 startte niet`). |
| #951 | deels | `955-m19-locomotief-bij-perron`: de trein staat zichtbaar bij het perron, dus "geen trein te zien" klopt niet meer. Het tweede deel (stilstaan telt als geslaagd) niet bekeken: de rit-stap vraagt 2300 m en het harnas rijdt niet. Open. |
| #850 | niet gezien | Aanraakbediening met vliegtuigpaneel op 800x360: het harnas heeft een vast venster van 1280x720. |
| #533 | niet gezien | De plekken (loket Middenstad-Oost, sluis) niet opgezocht. |

## Derde ronde: Garage met de D-pad, M05, M06, M15 en de overige niet-bekeken issues (20-11)

Tooling: `scripts/qa/hertest_beeld.mjs` (nieuw: `--only=kerk,politie2,touchvlieg`, `--formaat=800x360 --touch=1`), `scripts/qa/garage_pad_probe.mjs`, `scripts/bot_landing_mens_test.mjs`. Electron via het gedeelde slot, werkboom-stage met de wereld van 19-11. Beelden onder `docs/img/qa/`. Wat een beeld niet toont, staat als "niet gezien".

| Punt | Stand | Opmerking |
|---|---|---|
| Garage, tab Alles, D-pad (#985) | **meetartefact, geen spelbug** | De graaf van wat de D-pad doet (`garage_pad_probe`, echte D-pad-druk vanaf de startfocus) bereikt alle 56 kaarten en 81 klikdoelen; de linkerkolom onderaan bereik je met links vanuit de rechterkolom. De sweep miste 8 kaarten door een te klein probeerbudget (14 doelen per ronde, de tabknoppen gebruikten het op); met budget 70 en de tab Alles geselecteerd: 81 van 81. Niet in beeld bekeken. |
| M05 fietsrace | te halen, hint toegevoegd | Zie `PROEFSPELER-DOORLOOP-20-11.md` punt 6: rivalen 203 tot 217 s, fiets 7 m/s (7,8 met sprint); zonder sprint nauwelijks podium. De regelkaart noemt de sprint nu. Niet door een mens gespeeld. |
| M06 sluipstap | te halen, niet door een mens gespeeld | Terugsturen, na drie keer kijken alle bewakers weg, O houden om over te slaan. De bot haalde hem niet omdat hij de kegels niet leest. |
| M15 landing | te halen, hint gefixt | `bot_landing_mens_test`: geoefend 295/300, rommelig 147/300, geen tijdslimiet; "Gas eraf" liet de kist voor de strook vallen, nu "Gas terug, niet eraf". |
| #850 | **bug gefixt**, deels gezien | `850-hertest-vliegtuigpaneel-touch` (800x360, aanraak): paneel ligt niet over de knoppen (0 px overlap met negen knoppen), labels 12 px of groter. Wel: Roer links stond rechts van Roer rechts (SLOT_ORDER); gefixt met test. Staand 360x800 niet gemeten. Issue blijft open. |
| #930 | deels | Route te voet van 160 m naar de Petrus en Pauluskerk (Usquert): 19 punten, 0 segmenten over het kerkhof, einde 10 m van de kerk, 1 segment door een gebouw (de laatste meters naar de kerk). `930-hertest-kerk-lucht`: de kerk staat op een ronde wierde met kerkhof; de routelijn zelf is in het luchtbeeld niet te zien. |
| #933 | gemeten | 0 sterren: Grote Markt 1 tot 2 politieauto's binnen 500 m, platteland (Usquert) 0 in 90 s (eerdere meting); 2 sterren op het platteland 3 tot 4. Dat past bij "gekoppeld aan gezocht". Geen beeld bekeken. |
| #969 | open | `969-hertest-erf-prompt`: bij het erf staat "De Koe van Ome Jan" met E; de schuur is een molen met rode voet (`969-hertest-schuur-22m`), op 22 m herkenbaar. De start met E lukte in het harnas niet (twee pogingen), dus de markering op de kaart is niet gezien. |
| #947, #945, #934, #932, #914, #533 | niet gezien | Alleen code en tests: `storytravel_test` 30/30, `impactbalance_test` 25/25, `vehicledamage_test`, `taxi_en_waypoint_test`, `reiskeuze_test`, `reklametaxi_test`. #914: `stuntavond.js` heeft een schadevloer en een doel van hooguit 55% van wat het plein biedt; de stunt startte niet in het harnas. #945: "Wonschoten" staat niet in de data. Geen beeld. |
| #948, #937, #921 | niet gezien | Geen Electron-run meer gedaan (slot werd vrijgegeven voor de UI-sessie). |

Geen enkel issue is gesloten: geen beeld weerlegt een klacht duidelijk.

## Beeldrun AAA-aankleding, derde ronde (20-11)

Tooling: dezelfde harnassen (`scripts/qa/akte45_beeld.mjs` met een missielijst, een eigen paginascript voor M08, M16 en de muziektest, `scripts/qa/akte2_beeld.mjs --only=a1`), één Electron per run via de slot-wrapper, stage van de werkboom met de wereld van `desktop/build/game`. Elk beeld hieronder is door mij bekeken; de camera is een kunstmatige vrije stand en de speler wordt neergezet, dus een beeld bewijst plaatsing en uiterlijk, niet het spelgevoel.

| Missie | Gezien | Oordeel | Bewijs en opmerking |
|---|---|---|---|
| M22 wachtfiguur en schuurplan | ja | goed | `955-m22-schuur-wachtfiguur`: bij "Laat Henk het luik inbouwen" staan een bank, tonnen, een statafel, een zwaaiende man op het gras en twee mensen bij de wagen; 11 onderdelen, 0 in water of gebouw. De wagen zelf is een auto uit het verkeer (de prompt "Auto jatten" staat erbij): niet gecontroleerd of dat de bedoelde missiewagen is. |
| M10 afstandsmeter | ja | goed | `955-m10-limo-afstandsmeter`: onder de stapregel staat de meter "45 m links voor" met een richtingswijzer. In het harnas rijdt de speler vooruit en de limo is ver weg gezet, dus de richting klopt niet met een echte achtervolging; de meter zelf werkt. |
| M08 Oma Trijntje | ja | goed | `955-m08-oma-trijntje-kade`: een oude vrouw met een blauw jasje zwaait naast een bank en een kist aan de Noorderhaven (groep `mission-dressing-trijntje` bestaat vanaf de start). Eerdere ronde: "niet herkend" kwam doordat de camera in een boom hing. |
| M27 inpakken | ja | **bug gefixt** | De kring, de spullen en de wachtfiguur stonden op 16 m van het doel (de straal van de stap) en waren daardoor niet te zien. De getekende kring is nu maximaal 7 m (`WAIT_RING_MAX`); `955-m27-wachtkring-met-figuur`: gele streepjes, een leesstandaard en de figuur om het doel. Dozen komen alleen als prop `kist` bij "de boeken"; geen binnenset `woonkamer` (open). |
| M16 kroegset | ja | **bug gefixt** | Voor de fix paste de kamer (11 bij 7 m) op alle drie de toastplekken in Winschoten niet naast de huizen: de toast viel terug op de straat (`955-m16-toast-zonder-kamer-voor`). Nu mag de kroegkamer in een gebouw staan; `955-m16-kroegkamer-binnen` en `955-m16-kroegkamer-van-boven`: bar, krukken, tafels, jukebox, kastelein, bordje, drie van drie plekken. Van boven steken de muren van de kamer uit het gebouw de straat in; tijdens de toast kijkt de camera van binnen. |
| M15 landing met publiek | deels | niet gezien | `955-m15-instap-graanstrook`: bij het vliegtuig van Roelfien staan balen en een figuur, aankleding `graanstrook` (8 onderdelen, 0 in water). De landing zelf (stap 3) is niet bereikt: het harnas vliegt niet. Open. |
| M19 stoom | ja, deels | goed | Het perron bij de rit-stap staat er (10 onderdelen op het droge, 2,3 km van de start); de aankomst van de trein en een fotograaf zijn niet gezien. De stoomfluit (H) staat in de regelkaart; of hij klinkt is niet gemeten. |
| M20 wachtfiguren en kruitkelder | deels | open | Wachtkring en aankleding bij de wallen staan er (0 van 19 onderdelen in water); de binnenset `kruitkelder` wordt bij de stappen 9, 11 en 13 nog steeds niet gebouwd (er staat een wachtkring in de open lucht): de kamer past daar niet. Open. De figuur van Jelles mannen is in dit harnas niet apart herkend. |
| M23 colonne, M24, M25 | ja | geen klachten | M23: keuze, instappen en colonne (geen aankleding bedoeld); M24 start bij de duif; M25 bakt in Oma's keuken (3 van 8 punten rond de ring in water: de keuken is een binnenset, dus geen belang). |
| M28 wisselwoning | ja | goed (eerste run was een harnasgevolg) | In de eerste run verscheen er geen aankleding en toonde de HUD 21,9 km: het harnas had de bus binnen de straal van het doel gezet, de stap sloot en de aankleding verdween; de HUD toonde de volgende opdracht (Nul krassen). Tweede run met de bus op 60 m: groep `mission-dressing-wisselwoning` met 8 onderdelen, 0 in water of gebouw, HUD "80 m". De vrije camera hing boven de daken, dus de buren zelf zijn deze ronde niet in beeld bevestigd (wel in `955-m28-wisselwoning-buren` van de vorige ronde). |
| M29 erf | ja | goed | `955-m29-erf-bus-figuren`: een oranje bus met twee figuren op het erf, 10 onderdelen, 0 in water of gebouw. |
| M30 proefbeleg | ja | goed | Aankleding `proefbeleg` bij de vlaggen (5 onderdelen, 0 in water of gebouw). |
| A1 weegbrug en oplegger | nee | open | De startplek van de bijbaan staat in dit harnas op de terugvalplek in de stad (228, -66): hij schuift niet naar de akker bij Hoogkerk, ook niet na een minuut wachten. Bij de eerste poging startte de bijbaan en bleef de speler bij de trekker staan (de hoop ligt 600 m verder); bij de tweede poging was de bijbaan na enkele seconden weer weg (waarschijnlijk "geen akker vrij"; niet bevestigd). Weegbrug en oplegger dus niet in beeld. Het beeldscript wacht nu tot een minuut op de bietenspot en zet de camera bij de hoop. Open: een run met de tegels bij Hoogkerk geladen (bijvoorbeeld de speler daar neerzetten voor de run). |
| Elf Bruggenrace | n.v.t. | **gefixt** | De HUD en de brugmeldingen telden twaalf bruggen ("Bruggen 0/12") bij een naam met elf: de twaalfde controlepost is de finish. Nu "Bruggen 0/11" (`brugTotaal` in `pg_bruggenrace.js`). |

### De nieuwe muziek-sferen (#988)

`scenariomusic.activityMusicKey(world)` tijdens echte missies in het spel (alle 30 verhaalmissies gestart met de debug-haak, harnas `--stil`, dus **zonder AudioContext**: de sleutel is gemeten, niet de geluidsgraaf of de loop zelf): M01 tot M05 `missie_komisch`; M06, M13, M14, M20, M21 `missie_sluipen`; M16 en M26 `missie_feest`; M11 `missie_water`; M27, M28 en M29 `missie_warm`; M30 `missie_finale`. Alle andere missies (M07, M08, M09, M10, M12, M15, M17, M18, M19, M22 tot M25) geven geen sleutel: de radio blijft. Na afbreken valt de sleutel terug. Waar het harnas de speler in een vliegtuig liet zitten (na M15) gaf de sleutel `vlucht`: dat is de bestaande vluchtmuziek en een harnasgevolg, geen fout. Niet gemeten: dat de loop daadwerkelijk hoorbaar start en dat de radio daarna weer terugkomt (daarvoor is een run zonder `--stil` met `--audio-graph` nodig). Open voor een volgende ronde.

Bevindingen over het slot van het harnas: de Electron-run kan alleen schrijven onder de werkmap (een profielmap of uitvoermap daarbuiten geeft "Toegang geweigerd" en een run zonder resultaat); `desktop/build/qa/` is daarvoor in orde en niet in git.
