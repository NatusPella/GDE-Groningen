# Geluid: opnames naast de synth (#460)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is uitleg en geschiedenis. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

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

## Procedurele geluiden naast de opnames (SFX-GAPS)

Naast de opnames en de synth staan sinds de SFX-ronde drie extra procedurele banken, alle zonder opname en door `sfx/fxbank.js` in de bank gezet:

- `sfx/uibank.js` en `sfx/uitaal.js`: de UI-geluidstaal (tabwissel, weigeren, melding, kaart open en dicht, ontdekking, uitkijkpunt, verzameld,
  loopbaantrap, uitgave, waarschuwing). `sfx/ui.js` speelt ze op de UI-bus (`uiFx`) met een variant per aanroep, een toonspreiding van 3 procent, een
  afkoeltijd per geluid en een regel die meldingsgeluiden niet laat stapelen. De keuze per melding gaat op `kind` en `kicker` van `world.addMessage`.
- `sfx/worldbank.js`: hengelen (`hengel_*`), uit het water klimmen (`water_uit`) en een hapje (`horeca_hap`) als `fx`-gebeurtenis (afstand, luchtfilter, spraakdemping),
  en de lagen per streek (`bed_kust`, `bed_polder`, `bed_riet`, `bed_industrie`). `sfx/streekklank.js` (puur) kiest welke laag klinkt; `sfx/ambience.js` mengt ze.
- De tests: `scripts/sfx_uitaal_test.mjs` (renderen, lagen, `ui.js` met een nagemaakte kit, streekregels). De inventaris en wat nog open staat: [SFX-GAPS.md](SFX-GAPS.md).
  Wat een mens moet beluisteren: [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md).

## Nieuwe opnames

Nieuwe opnames gaan altijd door `scripts/audio/master_sfx.mjs` (een herhaalbare bewerking, even hard en even helder) en krijgen
hun bron in `manifest.json` (dat doet het script). Voeg de sleutel toe aan `SAMPLE_INFO` in `game/js/sfx/samples.js` en
draai `node scripts/sfxsamples_test.mjs`. Alleen opnames met een licentie die gebruik toestaat (CC0), en alleen met akkoord van de eigenaar.
