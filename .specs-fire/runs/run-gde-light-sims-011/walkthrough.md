# Walkthrough — wi-369-down (#369)

## Wat er is gedaan

- `game/js/coopnet.js`: `spelerRecord` stuurt de echte gezondheid van de gastheer en Tessa
  mee (en `down` uit een ragdoll); `alive` blijft dood of gepakt. `meldNeer` reageert nu
  ook op een ragdoll, stuurt één regel per overgang naar de host en alle gasten, en
  gebruikt de avatar-naam van plek 1. De Tab-lijst van de host krijgt dezelfde `down`.
- `game/js/net/codec.js`: bit 32 van de bestaande vlagbyte is `down`; `CODEC_VERSION`
  blijft 2 en de berichtlengte verandert niet.
- `game/js/coopclient.js`: `applyHostState` neemt `health` en `down` over op de andere
  lichamen, met een valtijd bij de overgang.
- `game/js/partnerhud.js`: `down` én `alive:false` geven "neergeslagen"; `slotNeer` en
  `teamDown` blijven op dood/gepakt, zodat een val geen opdracht laat falen.
- `game/js/scene3d.js` en `game/js/coopfigures3d.js`: een neergeslagen figuur valt
  achterover, blijft liggen en staat weer recht op; het naamlabel verdwijnt zolang hij
  ligt.
- `.specs-fire/standards/multiplayer.md` noemt de snapshotvelden en de bijrijder.

## Checks

- `node --check` op alle gewijzigde JS.
- `net_codec_test` 11/11, `coopgaten_test` 18/18, `partnerhud_test` 14/14,
  `coopnet_test` 36/36, `coopgast_test` 12/12, `gasttrein_test` 20/20,
  `coopspeler_test`, `coopbestuur_test`, `coopwapen_test`, `cooppvp_test`,
  `coophostwissel_test`, `coopvoertuigen_test` groen.
- `undef_check` 1715 modules, `import_check` 1867 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- De host zag Tessa in zijn eigen Tab-lijst nog als "te voet"; de hostlijst krijgt nu
  dezelfde `down`.
- De Tessa-regel gebruikte de vaste personagenaam terwijl de lijst de online-avatar
  toont; de regel gebruikt nu dezelfde naam.
- Het naamlabel van een liggende figuur draaide plat mee; het label is verborgen zolang
  hij ligt.
- Nits die blijven: een echte `knockDown`/opsta-reeks wordt niet in een test doorlopen
  (de ragdoll is gestubt), en hostwissel, PvP-neergang en de 3D-stand zijn niet in beeld
  getest.

## Niet getest

- De figuur in beeld: vallen, blijven liggen en rechtop komen is niet in een browser of
  Electron gezien; alleen de datastroom (`health`, `down`, `coopVal`) is getest.
- Een echte sessie met een gast die later aansluit en de neer-status in de eerste
  snapshot ziet; de test gebruikt een nagebootste koppeling.
- Hostwissel en PvP-neergang in de snapshot.

## Open / volgende

- #366 (de figuren van speler 3/4 door gebouwen en water) is de volgende
  multiplayerstap; daarna de gastrollen voor trein en vliegen.
