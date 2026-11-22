# Vision-review van de gate-run 0.65 (22-11): samenvatting

Het reviewrapport-JSON (`reviewrapport.json`, onderwerp `vision-visual-gate`, commit f962b77ed) en het beeldpakket stonden in de runmap van de gate. Die map is verloren gegaan doordat ik daarna opnieuw stagede (`desktop/build.mjs` wist `desktop/build`, ook de gate-uitvoer die ik daar had gezet). Hieronder staat wat de reviewer-agent meldde; het JSON is niet herbouwd, zodat er niets verzonnen wordt. De coördinator draait de vision-stap opnieuw in de definitieve gate-run.

Reviewer-agent: 0 blokkerend, 4 belangrijk, 6 nit. 20 beelden echt gezien (4 contactbladen en 16 beelden op volle grootte); de overige 20 uit het pakket alleen als tegel. De beeldregressie-set haalde zijn tijdslimiet en ontbrak. Niet beoordeeld: focusring, exacte kleurwaarden, touch-doelgrootte, z-fighting op kleine schaal.

## Belangrijk

1. `sweep/shots-v01-M09-t1.png`: lege vlakte bij Warffum, de minimap toont wegen en percelen maar in 3D zijn er geen weg, huis of boom (niet-geladen tegels of een opname vóór het laden; onzeker).
2. `sweep/shots-v05-M06-t1.png`: het missielabel valt over de kop van de radiokaart "Nachtstreek".
3. `ui/1280x720-menu-loopbaan.png`: in het detailpaneel van Loopbanen lopen "Nu te kiezen", "VOLGENDE KLUS" en "Zet a..." over elkaar.
4. `sweep/shots-w05-waddenzee-hoog.png`: het beeld "Waddenzee" toont bomenkruinen in de mist, geen water of kust (camera of kustwereld).

## Nit

Weggevallen detailkop bij Verhaal > Personages; trein-HUD waar "UITSTAPPEN" tegen de toetshints aan zit; laag contrast in de ondertitelbalk; kaartlabels onder 12 px; een bijna zwart nachtbeeld; `hud-auto` toont het laadscherm in plaats van de auto-HUD.

Geen sneeuw, geen Engelse tekst, geen echte merken of geweld gezien.
