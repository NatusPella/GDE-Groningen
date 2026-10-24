# Geluid: opnames naast de synth (#460)

Het meeste geluid wordt in het spel zelf gesynthetiseerd (`game/js/audio.js`, `game/js/sfx/`). Een paar opnames van Freesound
(CC0) staan er naast in `game/audio/sfx/`. Het manifest `game/audio/sfx/manifest.json` beschrijft elk bestand: bron, auteur,
licentie, de gekozen knip en de meting waarop die is gekozen, en de bewerking.

## Hoe het werkt

- `game/js/sfx/samples.js` laadt het manifest en de ogg-bestanden lui op de achtergrond (bij het starten van de wereld) en
  decodeert ze naar AudioBuffers. Het pad is relatief (`./audio/sfx/`), dus gelijk voor Electron en web; er is geen externe URL.
- `playSample` in `audio.js` gebruikt dezelfde SFX-bus, panner (HRTF dichtbij), afstandsdemping, luchtfilter, spraakdemping
  en Effecten-volume als `playFx`. Elke keer een kleine variatie (toonhoogte +-4%, volume +-1,5 dB) en een afkoeling per sleutel.
- Ontbreekt een bestand of laadt het niet, dan speelt het bestaande synthgeluid en komt er niets in de console.
- Events lopen via `world.audioEvents`: `{ kind: 'door_open' | 'door_close', auto: true }` voor het portier en
  `{ kind: 'sample', key }` voor de rest. Andere spelers in Samen spelen komen via `coopzitten3d.js` (`deurGeluiden`) in dezelfde rij.

## Sleutel naar gebeurtenis

| Sleutel | Gebeurtenis |
| --- | --- |
| `auto_portiergreep` | vlak voor de deur open, bij in- en uitstappen van auto, bestelwagen en taxi (niet fiets, step, quad, boot, tractor, bus) |
| `auto_deur_open` | de deur gaat open bij in- of uitstappen |
| `auto_deur_dicht_1`, `auto_deur_dicht_2` | de deur gaat dicht, kort daarna (willekeurig een van de twee) |
| `band_piep_bocht` | één korte piep (loop): bandenslip in bochten en driften, volume en toonhoogte naar de slip, de synth blijft eronder |
| `handrem_bocht` | eenmalig bij het pakken van de handrem boven ongeveer 25 km/u of bij een slipstoot |
| `remmen_grind` | hard remmen op gras (`v.surface`) |
| `trein_deur_open` | de treindeuren gaan open (machinistdienst, `doorsOpen`) |
| `trein_deur_piep` | het waarschuwingssignaal in de laatste 2,4 s voor het automatisch sluiten |
| `trein_deur_dicht` | de treindeuren gaan dicht |

## Nieuwe opnames

Nieuwe opnames gaan altijd door `scripts/audio/master_sfx.mjs` (een herhaalbare bewerking, even hard en even helder) en krijgen
hun bron in `manifest.json` (dat doet het script). Voeg de sleutel toe aan `SAMPLE_INFO` in `game/js/sfx/samples.js` en
draai `node scripts/sfxsamples_test.mjs`. Alleen opnames met een licentie die gebruik toestaat (CC0), en alleen met akkoord van de eigenaar.
