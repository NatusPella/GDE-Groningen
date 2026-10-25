> **Archief (oktober 2026).** Dit document is vervangen door `.specs-fire/standards/mechanica.md`.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.

# Geluid: wat er nog mist (audit #460)

Een ronde door de code langs alle plekken die geluid zouden moeten maken, naast wat er al is: `game/js/audio.js` (de
gebeurtenissen die het spel duwt), `game/js/sfx/fxbank.js` (`FX_INFO`, de gesynthetiseerde effecten), `game/js/sfx/samples.js`
(`SAMPLE_INFO`, de opnames in `game/audio/sfx/`), `game/js/sfx/ambience.js` en `foley.js` (plek, dieren, voertuigen),
`game/js/sfx/ui.js` en `menunav.js` (menu's), `game/js/sfx/linkups.js` (gebeurtenis naar effect) en `game/js/stings.js`.
Daarnaast is per categorie nagegaan welke module een handeling afhandelt en of daar iets klinkt.

**Niet beluisterd:** deze audit is uit de code gelezen. Of iets mooi of te hard klinkt, is pas te horen in de preview van
`?sfxtest` (groep **Sport** voor de nieuwe effecten) en `node scripts/sfx_levels.mjs`.

## Per categorie

| Categorie | Heeft geluid | Mist nog |
| --- | --- | --- |
| **Voertuigen** | deuren (opnames: greep, open, dicht), motor aan en af, stationair en optrekken (synth), handrem, bandenslip, remmen op gras, toeter, fietsbel, busdeur, delen die losscheuren, kap dicht | richtingaanwijzer: de tik bestaat (`foley.js` blinker), maar hangt aan hard sturen in plaats van aan `v.indicator` (de speler die zijn knipperlicht aanzet hoort niets tot hij de bocht in draait); het vliegtuig krijgt de motor van een auto |
| **Deuren en gebouwen** | geheime houten deur, winkelbel bij de deur, trein-, bus- en sluisdeur, brugvergrendeling | de garagepoort en de lobbydeur van je eigen huis (`home.js`): geen geluid |
| **Voetstappen** | vijf ondergronden (klinkers, asfalt, gras, hout, nat) met vier varianten, afsprong en landing | trappen en ladders leunen op dezelfde vijf; niets eigens |
| **UI en menu** | tik, kiezen, terug, schakelaar, schuif, zoom op de kaart, waypoint ping, melding (buzz), kassa, geld, opslaan, prestatie, foto, stinger bij wanted/missie | snackautomaat: geen klik, geen klep als er iets uit valt |
| **Wereld** | wind, regen, stad, menigte, terras, krekels, glazen op het terras, deining, kerkklok en beiaard, onweer, vogels, verkeer op afstand | geen bekende stille plek |
| **Dieren** | koe, schaap, hond (dubbel), kat, duif, meeuw, eend, reiger, zeehond, vis, vleugelklep | zwaan en gans klinken als een eend |
| **Water** | plons, grote plons, deining langs de kant, golven, sluisstroom | waterski: alleen de plons bij de start, geen touw of boeggolf |
| **Trein en bus** | deuren, waarschuwingspiep, vertrek en halte (stings), overwegbel, trein die voorbij dendert, remmend staal | omroep is stem, geen effect |
| **Minigames** | padel (slaan, glas, gaas), golf en pitch & putt (slag, putt, rollen), kart (aftellen en finish als stings), botsauto's (kermis), waterski (plons) | **discgolf, skatepark en klimtoren hadden niets** (zie hieronder); reuzenrad heeft niets |
| **Boerderij** | tractor (motor), vee en landschap (ambience) | aftakas, hef, ploeg en kiep: `machines.js`, `werktuigen.js` en `werkgang.js` duwen geen enkel geluid |
| **Samen spelen** | aansluiten (sting), Meedoen? (sting), uitslag (winnaar/verliezer), trein en halte, spelers die wegvallen (stil) | wegvallen heeft geen eigen geluid; andere spelers klinken via dezelfde `fx`-weg als de wereld |

## De drie gaten die nu gevuld zijn

De drie minigames die alleen een stem hadden, hadden ook geen enkele foley. Ze krijgen elk hun eigen procedurele laag; de
gebeurtenis naar effect staat in `game/js/sfx/minigamefoley.js` (puur, met de bron per effect), de klank en het niveau in
`game/js/sfx/fxbank.js` (`cat: 'sport'`, nieuw in `mixplan.js`).

| Minigame | Effecten |
| --- | --- |
| Discgolf (`discgolf.js`) | `disc_whoosh` bij de worp (harder gooien is harder), `disc_ketting` als de disc de kettingen raakt (erin of er weer uit), `disc_boom` tegen een stam; het water gebruikt de bestaande plons |
| Skatepark (`skatepark.js`) | `skate_pop` (tail op het beton), `skate_grind` (leuning), `skate_land` (hoger landen is harder), `skate_val` bij een val, ook van de leuning |
| Klimtoren (`klimtoren.js`) | `klim_greep` (hand op de greep, grote greep vol), `klim_kalk` (magnesium), `klim_val` (op de mat, hoger is harder) |

Niveau: `node scripts/sfx_levels.mjs` zet ze tussen -18,7 en -24,6 dBFS, naast de deur (-19), de camerasluiter (-20,7) en de
kermis (-21,8); geen enkele klinkt boven de mediaan uit. De test is `scripts/minigamefoley_test.mjs`; `sfx_audit_test.mjs`
controleert dat de drie modules de foley echt duwen.

**Samen spelen:** iedereen speelt deze minigames in zijn eigen spel, dus de foley gaat in de eigen `world.audioEvents` en niet
naar de host: geen snapshot, geen tweede speler die dezelfde tik nog eens hoort en niets in `docs/COOP-GAST.md` dat verandert.
Een gast hoort dus zijn eigen board, disc en grepen, net als bij de voetstappen.

## Wat blijft liggen (voor een volgende ronde)

1. **Richtingaanwijzer aan `v.indicator` hangen** (`foley.js` blinker): nu een tik bij hard sturen, geen tik bij het knipperlicht zelf.
2. **Boerderijmachines**: aftakas, hef en ploeg (en de kiep van de wagen) — `kosten-M`, maar het is de enige hele categorie zonder geluid.
3. **Reuzenrad en de poort van je eigen huis**: in- en uitstappen en het optrekken van de gondel; de garagepoort en de lobbydeur.
4. **Snackautomaat**: de klik van de munt en de klep die opengaat.
5. **Vliegtuig en waterski**: een propellermotor in plaats van de automotor; het touw en de boeggolf achter de boot.
6. **Zwaan en gans**: een eigen (of gezwaander) buffer in plaats van de eend.
