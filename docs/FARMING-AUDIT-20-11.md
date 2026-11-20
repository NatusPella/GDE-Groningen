# Farming: audit en ontwerp (20-11, #985, #980)

> Werkdocument bij de feedback van de eigenaar op 20-11: "de light sims zijn nog niet goed genoeg, met name farming is qua UI/UX/HUD/gameplay/map-weergave
> echt nog helemaal niks". Dit is een momentopname (audit, ontwerp, wat er is gebouwd en wat nog niet). De regels van de boerderij staan in
> [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md) en [BOERDERIJ.md](BOERDERIJ.md); bij verschil wint de spec.
> Beelden: `desktop/build/farm_voor/` en `desktop/build/farm_na/` (niet in git; opnieuw te maken met `node scripts/qa/boerderij_beeld.mjs --prefix=voor|na`).

## 1. Audit (voor de wijziging, gezien in Electron met een wegwerpprofiel)

**Wat kan de speler.** Eigen akker bij Hoogkerk, vijf gewassen, trekkers en werktuigen kopen of huren, werken in de wereld (E koppelen, T hef, G aftakas, R tanken), een
loonwerker, een kasboek met lening en een kaartlaag Percelen. De code is rijk (`boerderij.js`, `werktuigen.js`, `boerderijwereld.js`, `boerderijui.js`, `perceelmap.js`);
de spelervaring niet.

**De gameplaylus.** Kiezen (Gewas) → voorbereiden (ploegen, cultiveren) → zaaien → verzorgen (bemesten, spuiten) → groeien in speltijd → oogsten (maaidorser) → laden en
afleveren (aanhanger naar de afnemer) → geld. Elke rijtaak is vier rijen van 100 m in een snelheidsband. De lus is goed; je ziet hem nergens.

**Schermen en HUD-delen (voor).**

| Onderdeel | Soort | Wat er was |
|---|---|---|
| Pauzemenu › Boerderij, zeven onderdelen (Perceel, Percelen, Erf, Gewas, Machines, Kasboek, Bank) | UI | lijst links, kleine scrollende kolom rechts; platte tekst en knoppen; geen eerste-keer-uitleg; Perceel noemt alleen de fase ("Braak land: tijd om te ploegen") |
| Wereldprompt boven de machine (prompts.js) | UI in de wereld | alleen toets en stand van hef en aftakas |
| Meldingen ("Ploegen begonnen", "Te hard...") | UI | losse zinnen in de berichtenkaart |
| HUD-strook tijdens het werk | ontbrak | geen taak, geen voortgang, geen diesel, geen band |
| Kaartlaag Percelen | UI (kaart) | een pictogram per perceel (geel koop, blauw huur, groen van jou), eigen velden een groen vlak: dezelfde kleur voor braak, groeiend en oogstklaar |
| Velden, gewassen, erf, machines | wereld | veld met rijen, kleur per fase en per cel terwijl je werkt (bestond al), gewassen als één bol- of kegelvorm per gewas (alleen de kleur en grootte groeien), geen stoppel na het oogsten, geen markering van het veld, geen teken dat een veld rijp is |

**Wat de kaart toont (voor).** Alleen dat het perceel van jou is. Of het veld braak is, groeit of rijp is, staat niet op de kaart; de HUD-minimap kent alleen het pictogram.

**Wat is verwarrend of ontbreekt.**
- *Uitleg:* niemand zegt dat er een lus is (ploegen, zaaien, groeien, oogsten, afleveren) of dat je eerst een gewas kiest. Geen regelkaart bij de eerste keer.
- *Doel:* geen "wat nu" en geen markering van het volgende veld of de afnemer.
- *Voortgang en feedback:* geen strook met klus, voortgang, snelheid in de band, diesel en lading; afronden is één zin in de berichtenkaart, zonder sting of getal.
- *Wereld:* het gewas verandert van kleur en grootte, maar de vorm blijft hetzelfde; geen verschil tussen net gezaaid, groeiend en bijna rijp; na het oogsten verdwijnt alles
  (kale grond, geen stoppelveld); oogstklaar is niet te zien van een afstand.
- *Beloning:* geld en kilo's staan in een melding; geen getal dat opspringt.
- *Samen spelen:* een gast ziet het veld van de gastheer niet (de velden worden alleen bij de eigenaar gebouwd).
- *Kaartintro:* de kaart opent eerst een uitlegkaart (Begrepen) die de laag overdekt; voor de boerderij onbedoeld.

**Wat is UI en wat is wereldweergave** (voor het herstylen met het nieuwe designsysteem): *UI* = `boerderijui.js`, `farmcards.js`, `farmhud.js` (alle
opmaak in `farm.css`, alleen `var(--ds-...)`), de kaartstijl in `mapview.js`/`perceelmap.js`. *Wereld* = `boerderijwereld.js`, `farmcrops3d.js`,
`farmmarker3d.js`. *Data* (geen opmaak) = `farmstatus.js`. Het uiterlijk van de panelen mag later wisselen; de gegevens en de wereld blijven.

## 2. Ontwerp

**De lus, zichtbaar.** Vijf stappen als chips met pictogram: Ploegen, Zaaien, Groeien, Oogsten, Afleveren; gedaan, nu en straks (één chip met nadruk). Dezelfde zeven
veldstanden overal (`farmstatus.js`): *braak, stoppel, geploegd, zaailing, groeiend, bijna rijp, oogstklaar*. Altijd zomer: er is geen winterstand.

**Consequentie eerst.** Het paneel opent met "Nu: Oogsten" of "Nu: Ploegen" (wat moet er, en waar), dan pas de details. Een klus zonder werktuig zegt wat er mist
("Nog nodig: hef omlaag (T)"). Geld en opbrengst zijn per speler (#429): de boerderij leeft in de opslag van de speler zelf.

**Eén accent.** Geel is alleen oogstklaar (het doel): in de wereld de lichtkolom, op de kaart het geel vlak met letter O, in het paneel de ene hoofdknop. Selectie is bordgroen
(designbesluit 20-11). Kleur is nooit de enige betekenis: elke stand heeft een icoon, een woord, een letter op de kaart, een lijnpatroon (streepjes voor braak en stoppel) en
een eigen vorm bovenop de veldmarkering.

**Per veld één status op vier plekken.** Paneel (kaart per veld), kaart (vlak met letter en woord, icoon, legenda "Je velden"), HUD (strook tijdens het werk), wereld
(markering op de hoek, gewas per stadium, voren, stoppel). Alles komt uit `veldStatus()`; ze kunnen elkaar dus niet tegenspreken.

**Wereld.** Grond verandert terwijl je werkt: per cel van 5 m achter de ploeg komen voren omhoog, achter de zaaimachine verschijnt het zaaibed, achter de maaidorser blijft
stoppel. Het gewas heeft per gewas en per stadium een eigen vorm (aardappel: loof dat geel wordt; bieten: bladwaaier met een wortel die boven de grond komt; graan: stengels
met een aar, goud bij rijp; gras kort; uien: bladpijp met een bol), alles met InstancedMesh en een samengevoegde geometrie per gewas en stadium. Geen nieuwe shaders of lichten;
polygonOffset op de veldcellen en de voren, de lichtkolom heeft depthWrite uit.

**HUD-strook.** Taak, veld, voortgang, snelheid met de band waarin het werk netjes wordt (naald in een groene zone), diesel (rood als hij laag is), lading en één zin "wat nu".
Bij afronden springt een getal op (+kg of het percentage) met het bestaande UI-geluid; bij verminderde beweging blijft het getal gewoon staan.

**Samen spelen (per taak).** De wereld en de velden zijn van wie het spel opende. Een gast ziet ze (status en groei, compact, EXTRA-stukje MISC_VELDEN, 12 bytes per veld) en kan
meehelpen als bestuurder van een vrije machine (bestond: #434), waarbij zijn klus hem via `coopDeel` een deel oplevert. Hij werkt de velden niet zelf bij: zijn eigen boerderij is zijn
eigen spel op zijn eigen akker (lokale minigame, beloning per speler volgens #429). Valt de host weg, dan verdwijnen de velden bij de gast (leeg stukje of na 4 s); sluit een gast
later aan, dan krijgt hij ze met het volgende stukje (elke 1,5 s).

## 3. Wat is gebouwd (en hoe het is getest)

Zie de changelog. Pure tests: `farmstatus_test`, `farmfieldguest_test`; bestaande: `boerderij_test`, `boerderijwereld_test`, `boerderijui_*`, `percelen_test`,
`coopextra_test`, `hudbus_surfaces_test`, `hud_kleuren_test`, `ds_tokens_test`. Beelden (Electron, wegwerpprofiel): zie de stand op het issue.

## 4. Nog niet gedaan

- Haptiek en een eigen sting voor "oogst klaar" (er is geen nieuwe sfx gemaakt; het bestaande UI-geluid `ui_verzameld` wordt gebruikt).
- Balen, oogstlijnen en een afleverroute als lijn op de kaart; kaartfilter "alleen oogstklaar" (de laag Percelen aan of uit bestaat).
- Controllerknoppen voor koppelen, hef en aftakas (bestond al als open punt in BOERDERIJ.md).
- Een gast die een veld van de gastheer zelf bewerkt (bewust niet: eigen boerderij is eigen spel).
