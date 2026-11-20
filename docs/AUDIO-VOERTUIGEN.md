# Voertuiggeluid met opnames: helikopter, vliegtuig en motorboot

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is de bronnenlijst en de uitleg van de koppeling. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

Sinds issue #988 klinken de helikopter, het vliegtuig van de speler en de motorboot met echte opnames (CC0 van Freesound) in plaats van alleen synth.
Elk geluid is een naadloze lus (of een eenmalige klank) in `game/audio/sfx/`, beschreven in `manifest.json`. De sturing staat in
`game/js/sfx/aircraftmap.js` (zuivere getallen, getest door `scripts/aircraft_sfx_test.mjs`) en `game/js/sfx/aircraft.js` (Web Audio, aangeroepen door `sfx/sky.js`).
Ontbreken de opnames, dan blijft de procedurele rotor van `sky.js` en de motorsynth van `audio.js` de terugval: er komt niets in de console.

## Bronnen

Alles is CC0 (publiek domein), dus er is geen naamsvermelding nodig. Elke opname is bewerkt met `scripts/audio/master_sfx_voertuigen.mjs`
(knippen, hoog- en laagdoorlaat, mono 44,1 kHz, statisch niveau RMS -21 dB met piek onder -2 dB, ogg Vorbis q3; lussen met nuldoorgang en een kruisfade van 100 ms).
Gedownload zijn de previews van Freesound (`scripts/audio/freesound_zoek.mjs`, alleen CC0 en CC-BY), in een eigen inbox-map buiten `game/`.

| Sleutel | Gebruik | Freesound-id | Auteur | Licentie |
| --- | --- | --- | --- | --- |
| `heli_rotor_stat` | rotor stationair en uitlopen | 184412 (OH-58 Helicopter Loop) | qubodup | CC0 |
| `heli_rotor_vlucht` | rotor in vlucht, wop-wop | 187681 (Helicopter Rotor Loop) | qubodup | CC0 |
| `vliegtuig_start` | motor aanslaan | 437851 (G07-07_4 Engine Prop Starts, 0 tot 5,6 s) | craigsmith | CC0 |
| `vliegtuig_stationair` | motor stationair | 437851 (6 tot 15,5 s) | craigsmith | CC0 |
| `vliegtuig_toeren` | propeller op hoge toeren | 789390 (Airplane Propeller Loop) | modusmogulus | CC0 |
| `vliegtuig_wind` | stromende lucht bij snelheid | 267899 (air_rush.wav, 20 tot 29 s) | ChemiCatz | CC0 |
| `vliegtuig_overtrek` | overtrekzoemer | 425272 (Airplane Stall Buzzer) | 77Pacer | CC0 |
| `vliegtuig_gestel` | landingsgestel in of uit | 425273 (Landing Gear) | 77Pacer | CC0 |
| `vliegtuig_rol_asfalt` | wielen op een harde baan | 490905 (Tire Roll, 19,9 tot 24,9 s) | JuandreSound | CC0 |
| `vliegtuig_rol_gras` | wielen op gras of grind | 251661 (Tires on Gravel Road 1) | OBXJohn | CC0 |
| `boot_motor_stat` | buitenboordmotor stationair | 637742 (outboard motor boat idle or slow rattly3) | kyles | CC0 |
| `boot_motor_vol` | buitenboordmotor op snelheid | 454199 (speed boat outboard motor medium high gear + waves splash) | kyles | CC0 |

Samen ruim 0,7 MB. Gekeken en niet gebruikt: de vluchten langs (flyby) van de helikopter en het vliegtuig (de rotor- en schroeflus met doppler doet dat al) en CC-BY-opnames
(niet nodig; elke CC-BY zou een regel in de credits vragen).

## Koppeling

- **Helikopter** (`rotorParams`): het rotortoerental (`v.rotor`, dat `heliflight.js` laat oplopen en uitlopen) stuurt de afspeelsnelheid (0,35 tot 1) en het niveau,
  dus het opstarten en het uitlopen na de landing klinken als een rotor die versnelt en vertraagt. Snelheid brengt de vluchtlaag omhoog en de stationairlaag omlaag;
  dalen in vooruitvaart en schuin vliegen geven sterkere wop-wop. In de cabine van je eigen helikopter dof, buiten luchtfilter naar afstand en doppler (ook voor de traumaheli).
- **Vliegtuig** (`updateAircraftSfx`): motorstart bij het instappen (de motor valt na 3,4 s in), stationair en hoge toeren kruisen op toeren uit gas en snelheid,
  wind groeit met snelheid, rollen op baan (`v.surface` asfalt of klinkers) of gras, overtrekzoemer kort boven de overtrek en tijdens de overtrek, landingsgestel een klank bij een wissel in de lucht,
  en een schroef die in een paar seconden uitloopt na het uitzetten. Het dichtstbijzijnde bezette toestel klinkt met doppler. De motorsynth van `audio.js` zwijgt voor een vliegtuig zolang de opnames er zijn.
- **Motorboot** (alleen die van de speler): stationair kruist met vol gas op gas en snelheid; de synth zwijgt voor de boot, het water- en zeilgeluid van `audio/water.js` blijft.

## Samen spelen

Lokaal: elke speler hoort zijn eigen stem- en wereldlaag. Het eigen vliegtuig of de eigen boot klinkt in de cabine; een toestel van een medespeler
klinkt als het dichtstbijzijnde bezette toestel (met `v.driver`) op afstand, met doppler. Voortgang en beloning raakt dit niet.

## Wat niet is getest

Alles is gerekend en gemeten (niveau, naad), niets is beluisterd. Eerlijk: of de toonhoogte bij het opspoelen van de rotor natuurlijk klinkt, of de motorstart op het juiste moment inzet en
of de rolklank op gras niet te hard is, moet een mens horen. De punten staan in [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md).
