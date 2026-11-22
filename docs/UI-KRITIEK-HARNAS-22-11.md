# UI-kritiekharnas (22-11)

Naslag bij [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) en [ui-taal.md](../.specs-fire/standards/ui-taal.md).
Het harnas kijkt zelf naar de schermen, zodat de eigenaar niet elk scherm hoeft na te lopen: het bouwt elk spelersscherm
met nepdata, rendert het, en zet er automatische waarschuwingen (tripwires) bij. Een tripwire is een aanwijzing, geen
oordeel: de beelden blijven de bron.

## Hoe te draaien

Geen Electron en geen build nodig. Het harnas start een eigen headless Chrome of Edge (eigen PID, eigen tijdelijk
`--user-data-dir` buiten de repo) en een kleine webserver op `127.0.0.1` die `game/` serveert. Het raakt geen ander
browserproces aan en sluit zijn eigen proces op PID.

```
node scripts/ui_critic/render.mjs                       # alle schermen naar C:\Users\abuis\gde-ui-critic-22-11
node scripts/ui_critic/render.mjs --out=<map>           # andere uitvoermap
node scripts/ui_critic/render.mjs --cat=hud             # een categorie: menu, kaarten, hud, winkels
node scripts/ui_critic/render.mjs --only=pauze-spel,startscherm
node scripts/ui_critic/render.mjs --match=^pauze- --skip=samen
node scripts/ui_critic_test.mjs                         # pure logica van de tripwires (geen browser)
```

Een andere browser: zet `GDE_CRITIC_BROWSER` op het pad van de exe. De eerste pagina laadt koud honderden modules en
duurt even; daarna staan ze in de cache van die run. Een deelrun werkt alleen zijn eigen schermen bij in een bestaande
`index.json`.

## Wat er gebeurt

1. `scripts/ui_critic/catalogus.mjs` is de catalogus: per scherm een id, de bronmodule in `game/js`, een categorie
   (`menu`, `kaarten`, `hud`, `winkels`) en een `setup`: JS die in de pagina draait en de echte module met nepdata
   opbouwt (`makeWorld()` in `PRELUDE`, bijvoorbeeld `initPauseMenu(w)` en `openPauseMenu('garage')`). Dat is de echte
   DOM met de echte lay-out, niet een nagebouwde. Het pauzemenu heeft een scherm per blad en subblad.
2. `scripts/ui_critic/pagina.mjs` bouwt per scherm een statische HTML-pagina: de CSS in de volgorde van
   `game/index.html`, daarna alle overige `game/js/*.css` (de bundels `ds-tokens`, `ds-components`, `ds-keycap`, de
   schermbestanden), een neutrale achtergrond (`#6b7280`) en het module-script. De pagina's staan ook in
   `<uitvoermap>\pages\`.
3. `scripts/ui_critic/render.mjs` rendert elk scherm op 1280x720, 1920x1080 en op 1920x1080 met ui-schaal 1,5
   (`uiScale` in de instellingen; `--ui` en `--mz-fit` volgen `uiscale.js`) naar JPEG, kwaliteit 80:
   `<scherm>_<720p|1080p|ui15>.jpg`.
4. `scripts/ui_critic/collector.mjs` draait in de pagina en geeft per zichtbaar element geometrie en stijl;
   `scripts/ui_critic/tripwires.mjs` (puur, getest) beoordeelt dat.
5. `index.json` in de uitvoermap: per scherm `scherm`, `titel`, `module`, `categorie`, `bestanden`, `status`
   (`ok`, `deels`, `mislukt`), bij een mislukt scherm de `reden`, en per resolutie de tripwires met voorbeelden.

## Tripwires

| Soort | Betekenis |
|---|---|
| `overlap` | twee elementen met eigen inhoud (tekst, knop, plaatje) die over elkaar liggen, niet ouder en kind en niet bewust in een andere laag |
| `afgekapt` | tekst waarvan `scrollWidth` groter is dan `clientWidth` in een element dat afknipt |
| `tekstmassa` | meer dan 1800 tekens op een scherm, of een enkel element boven 450 tekens |
| `leeg` | een element met rand of achtergrond zonder inhoud en zonder kinderen |
| `scrollbar` | een scrollgebied met de standaard browserbalk (geen `scrollbar-width` en geen `::-webkit-scrollbar`) |
| `klein` | tekst kleiner dan 11 px |
| `contrast` | kleur tegen achtergrond onder 4,5:1 (3:1 voor grote tekst); een achtergrond met plaatje of verloop wordt overgeslagen |
| `buitenKader` | inhoud die buiten het venster valt, buiten scrollgebieden |
| `codeTekst` | `undefined`, `NaN`, `null`, `[object ...]` of code-achtige tekens in zichtbare tekst |
| `zonderFocus` | een klikbaar element (knop-rol, `cursor: pointer`) dat geen toets of focus kan krijgen (geen `tabindex` en geen native knop) |

De drempels staan in `DREMPELS` in `tripwires.mjs`.

## Wat het harnas niet is

- Geen vervanging van de beeldrunen in Electron (`scripts/ui_shots.mjs`): de nepwereld kent geen echte kaart,
  geen 3D en geen echte voortgang. Een scherm dat afhangt van die data toont lege lijsten; dat staat dan in het beeld.
- Geen oordeel over stijl. Overlap bij bewust gestapelde elementen en lege vakjes met een decoratieve rand komen als
  vals alarm voor; kijk naar het beeld voor je iets aanpast.
- Een scherm dat niet te bouwen is, krijgt `status: mislukt` met de reden in `index.json`; dat is zelf een bevinding
  (de module vraagt iets wat de nepwereld niet heeft) en geen fout van het harnas.
- De import van three.js komt via de importmap van de pagina van de CDN, zoals in de webversie; alleen het
  ontwikkelharnas doet dat, het spel zelf niet.

## Uitbreiden

Een nieuw scherm is een `sc(...)`-regel in `catalogus.mjs`: id, module, categorie, titel en een `setup` die de module
met nepdata bouwt. Voeg een veld toe aan `makeWorld()` als een paneel iets mist. Zet de test in
`scripts/ui_critic_test.mjs` mee als je een tripwire toevoegt.

## Stand van de eerste run (22-11)

78 schermen gerenderd, 0 mislukt, op drie resoluties (234 JPEG's) in `C:\Users\abuis\gde-ui-critic-22-11` (54 menu, 16 kaarten,
4 hud, 4 winkels). Tripwire-totalen over alle resoluties: overlap 146, afgekapt 143, tekstmassa 32, leeg 214, scrollbar 0,
klein 0, contrast 320, buitenKader 5, codeTekst 12, zonderFocus 162. Dit zijn aanwijzingen, geen bevestigde fouten; de
`codeTekst`-meldingen komen deels uit de nepdata (bijvoorbeeld een veld dat de nepwereld niet kent) en moeten in het beeld
worden bekeken. De hoofd-HUD toont zonder echte kaart geen minikaart (die gooit een uitzondering; de rest van het HUD is dan
al bijgewerkt). Nog niet gedekt: HUD-toestanden die een echte wereld vragen (achtervolging, voertuigpanelen, stunt- en
boerderij-HUD), de telefoon-feed en de schermen van minigames.
