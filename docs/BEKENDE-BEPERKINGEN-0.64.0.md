# Bekende beperkingen in 0.64.0 (20-11-2026)

Voor wie vanavond speelt. Eerlijk wat er niet getest of niet af is. Niets hieronder is een reden om niet te spelen; het is wat je kunt tegenkomen.

## Samen spelen
- **Een echte vierspelerssessie met vier Electron-instanties is niet gedraaid.** De lobby, hostwissel, het wegvallen van een gast en het late aansluiten zijn met de pure tests en de TCP-tests met twee en vier spelers bewezen, maar niet met vier echte vensters. De eerste keer vanavond is dus ook de echte test.
- Druk op **Spel starten** pas als alle vier de spelers in de lijst staan. De host kan 10 tot 57 seconden stil staan bij het starten.
- Iedereen op **dezelfde versie** (0.64.0). Verbind **één voor één**. Zet Windows-firewall op "privé" toe. Alleen STUN: bij een strenge router (CGNAT) kan verbinden mislukken; gebruik dan "Verbinding testen".
- **Samen-missies** (M30 bolwerken per speler, pannenkoekenwedstrijd, bezorgteam) zitten **niet** in deze versie.
- Een bijbaan van een gast kan de lichte HUD-strook van de host beïnvloeden (de uitlegvlag en het verbergen van de strook); bekend, volgt in 0.64.1.
- Velden van de host kunnen als spookveld blijven staan bij de gast na het einde van een sessie.

## Wat nieuw is maar nog niet door een mens gespeeld
- De hele **zeefdruk-UI** (menu's, HUD, kaart, meldingen) is in het echte spel in beeld gecontroleerd, maar niet door een mens doorlopen.
- **Light sims** (hengelen, krantenwijk, bezorger, rondvaart, kartbaan, padel, discgolf, pitch & putt, zwembad, skatepark, klimtoren, reuzenrad, botsauto's), **farmen met perceelstoestanden**, de **terugkeerscène**, de **cutscene-gebaren**, de **taxi- en treincamera** (C of Y) en de **OV-missies** zijn gebouwd en getest, maar niet uitgespeeld.
- **Muziek:** alle tracks van de eigenaar zijn gekoppeld, maar niet beluisterd. De drie tracks die eerder niet pasten (Caper, Mayor's Morning Walk, Pavement Strut) staan nu bij lichtvoetige missies; bijsturen kan in `game/js/missiesfeer.js`.
- **Geluid:** de nieuwe opnames (SFX ronde 3 en 4) zijn gemeten en niet beluisterd (`docs/SFX-LUISTERLIJST.md`).

## Bekende visuele puntjes
- Op een klein venster (1024x600) kan een ondertitel van drie regels over de locatiekaart heen staan.
- De Boerderij rechts, de Spullen-lijst en een paar kleine menuregels (onder 13 px) kunnen nog beter.
- De Garage toont soms voor "Te koop" even een silhouet in plaats van een 3D-miniatuur.
- De toetsglyphs zijn nog klein (ca. 26 px in de HUD).
- In de Spullen-lijst worden groepskoppen soms afgekapt.

## Prestaties
- Er is **geen fps-meting** gedaan in deze release (verkorte gate). Het nieuwe spel laadt ca. 16 tot 18 seconden langer door het voorcompileren van het filmlicht.
- Alle geluiden worden bij de start gedecodeerd (ca. 94 MB); de scenariomuziek wordt per track vrijgegeven.

## Releasegate
Dit is een **verkorte gate** (besluit eigenaar, 20-11): de statische fase en de AI-review (zes aspecten, 0 blokkerend) zijn gedaan. De fasen world, perf en visual zijn niet gedraaid en staan als "onvolledig".
