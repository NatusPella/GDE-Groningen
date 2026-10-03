# Steam-trailer

Wat de trailer op de winkelpagina nodig heeft, naast de bestaande
YouTube-trailer "GDE Groningen — Een zomer in Grunn" (`game/js/trailer.js`,
shotlijst in `docs/verhaal/E-trailer.md`, export met
`npx electron . --trailer-video`, zie README › Trailer mode).

## Eisen van Steam

Nagekeken in Steamworks (*Trailers*, 3 oktober 2026):

- **Formaat:** maximaal 1920×1080, bij voorkeur 16:9; `.mp4`, `.mov` of
  `.wmv`. H.264 met AAC-audio, stereo, 44,1 of 48 kHz. 30 of 60 fps.
  Bitrate minimaal 5.000 kbit/s.
  - De export (`--trailer-video`) levert H.264 yuv420p, CRF 18, 60 fps, AAC
    192k, 1920×1080. Dat past. Geen 4K-versie uploaden: Steam schaalt die
    toch terug.
- **Volgorde:** de eerste twee trailers komen vóór de screenshots. Steam
  maakt van de **eerste seconden van de eerste trailer** automatisch een
  microtrailer van 6 seconden (die zie je in lijsten en bij hover).
- **Gameplay eerst:** Steam raadt aan dat de eerste trailer laat zien hoe
  het spel speelt, met de HUD.
- **Thumbnails:** Steam maakt ze zelf (600×380 en 232×130); een eigen frame
  van 1920×1080 mag. Gebruik `beelden/screenshots/` of het PNG-thumbnail
  dat `--trailer-video` naast de mp4 zet.
- Een game kan niet uitkomen terwijl een trailer nog wordt gecodeerd: upload
  hem ruim op tijd.

## Lengte

- **Hoofdtrailer: 60–90 seconden.** De volledige cut is nu ~91 s. Dat kan,
  maar de eerste 4 s zijn zwart (Rikus op de radio). Voor Steam is dat
  zonde, want die eerste seconden worden de microtrailer.
- **Advies:** voor Steam de volgorde iets omgooien, of de korte cut
  (`--trailer-cut=kort`, ~38 s) als tweede trailer gebruiken.

## Het logo aan het begin

Nu komt het logo pas in shot 23 van 24 (1:23), op de luchtfoto bij
zonsondergang, met "Een zomer in Grunn" eronder. Op YouTube werkt dat als
ontknoping; op Steam niet: de microtrailer en wie na drie seconden
wegklikt, zien geen naam.

Voor de Steam-versie:

1. **Logo binnen de eerste 3 seconden**, over beeld (de zonsopgang bij de
   Martinitoren of de Vismarkt), 2 s in beeld, met de wordmark uit
   `logo.js` (`logoHtml()`). Daarna de radio-opening.
2. **De zwarte radio-opening inkorten** of er beeld onder leggen (de stad
   bij zonsopgang), zodat de microtrailer geen zwart vlak is.
3. **Aan het eind blijft het logo** zoals nu. Een regel als "Gratis op
   Steam" mag niet op de capsules, in een trailer wel; liever toch alleen
   het logo en de tagline.
4. **Meer gameplay met HUD**: nu is de hele trailer zonder HUD. Voeg twee of
   drie korte stukjes met HUD toe (rijden met de minimap en de missiekaart,
   de heli met de ringen). Zie `beelden/screenshots/01-missie-hud.jpg` en
   `04-heli-hud.jpg` voor de beelden.

Technisch is dat een nieuwe cut naast `vol` en `kort`, bijv. `steam`
(`cuts: ['steam']` op de shots, en een logo-shot met `cuts: ['steam']`
vooraan). Nog niet gebouwd.

## Het oude logo: is "GTE VI" er nog?

**Nee.** De logokaart in `trailer.js` (shot "Logo") gebruikt `logoHtml()`
uit `game/js/logo.js` en toont dus de nieuwe wordmark: **GDE**, het groene
plaatsnaambord GRONINGEN en *Zomer vol misdaad*, met de tagline "Een zomer
in Grunn". De standaardnaam van de export is
`GDE-Groningen-Een-zomer-in-Grunn.mp4`. Er staat in `trailer.js` geen "GTE
VI" of "Grand Theft" meer; alleen interne sleutels (`gte-benchmark-pending`,
`gte-muted`, `window.gteDesktop`) heten nog zo, en die zie je niet.

Wel nalopen vóór de upload:

- **Video's die vóór 0.24 zijn geëxporteerd** tonen nog de oude "GTE
  VI"-kaart (de 0.22-trailer heette "GTE VI — Een zomer in Grunn"). Exporteer
  opnieuw vanaf de huidige main; gebruik geen oude mp4 uit `~/Downloads`.
- De naamkaarten zijn bevroren beelden "in trailerstijl" (oranje-warme
  waas, grote naam linksonder). Dat is een knipoog die volgens
  `docs/LICENTIES.md` §8.2 mag, zolang naam en logo op zichzelf staan. Geen
  roze-paars zonsondergangverloop toevoegen.
- `docs/verhaal/E-trailer.md` noemt de toon "een trailerparodie op GTA VI".
  Dat is een interne notitie; niet overnemen in de trailertitel of de
  beschrijving op Steam of YouTube.

## Checklist voor de upload

- [ ] Steam-cut met het logo in de eerste 3 s en HUD-gameplay (of de huidige
      cut, als besluit).
- [ ] Opnieuw exporteren vanaf main (1920×1080, 60 fps).
- [ ] Eigen thumbnail kiezen (1920×1080).
- [ ] De korte cut als tweede trailer.
- [ ] Titel van de trailer op Steam: "Een zomer in Grunn" (geen andere
      merknamen).
