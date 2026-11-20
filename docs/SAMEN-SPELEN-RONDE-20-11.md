# Samen spelen met vier: ronde van 20-11

Naslag. Wat deze ronde is gedaan, wat er met echte Electron-instanties is bewezen en wat nog openstaat (#982, #983, #429). Uitgangspunt: v0.64.0, de speeltest van de eigenaar met drie vrienden via internet.

## Gedaan

- **Bijbaan van een gast en de lichte sim-HUD.** Een bijbaan van een gast (`c.owner > 0`) draait op de machine van wie het spel opende. De strook zelf werd al overgeslagen, maar de pop-ups (`simHudPop`), de uitlegvlag (`zetUitlegGezien`) en het leegmaken bij het stoppen (`simHudTik(0, null)`) niet. Nu staan ze achter `c.owner` in taxi, bus, krantenwijk, bezorger en rondvaart. Test: `scripts/coop/simhudgast_test.mjs` (leest de bron, want de banen laden three van een CDN; elke aanroep moet een bewaking hebben).
- **Spookvelden bij de gast.** `gastVelden` (boerderijwereld.js) werd alleen geleegd in `resetBoerderijWereld`. Na het einde van een sessie (rol niet meer gast) bleven de velden van de ander staan. De tick ruimt ze nu op zodra de rol geen gast meer is (`ruimGastVelden`). Test: `scripts/farmfieldguest_test.mjs` (stap "spookvelden").
- Changelog onder [Unreleased], en `publicatie.md` stond nog op 0.63.0 (spec_check faalde al op main; gelijkgetrokken).

## Bewezen met echte Electron-instanties

Run op de machine van de coordinator: `scripts/coop/restage.mjs` op een volledige stage, daarna `scripts/coop/testbank.mjs` via de slotwrapper. Wat de eerdere poging liet vastlopen en nu werkt:

- Profielmap (`GDE_COOP_PROFILE_DIR`), slotenmap (`GDE_LOCKS`), `TEMP` en `TMP` onder de werkmap, niet onder `%TEMP%`.
- Extra Electron-vlaggen via `GDE_COOP_ELECTRON_ARGS=--no-sandbox,--in-process-gpu,--disable-background-timer-throttling,--disable-renderer-backgrounding,--disable-backgrounding-occluded-windows`.
- `ELECTRON_EXE` naar de Electron van de hoofdmap (een worktree heeft geen `node_modules`), en `desktop/vendor-cache` uit de hoofdmap gekopieerd voor de pure tests met three.
- Een run in de slotwrapper met `timeout` *binnen* het commando (`slot.mjs run samen -- timeout 540 node ...`): een `timeout` erbuiten telt de wachttijd op een vrij slot mee en doodt een run vlak voor het einde (zo gebeurde het bij de eerste net-poging, exit 124). Een gedode run laat bovendien sloten achter in `GDE_LOCKS`: ruim `desktop/build/locks` op voor de volgende run.

Uitkomsten:

| run | instanties | uitkomst |
|---|---|---|
| suite `basis` (`--gasten=1`) | host + 1 Electron-gast | ALLES OK: kamerverbinding, lijst, klok, geen desync |
| suite `net` (`--gasten=1`) | host + 1 Electron-gast + 2 headless gasten (vier spelers) | ALLES OK: spelerslijst klopt voor vier, slecht netwerk (80 ms, 5% verlies, rtt max 367 ms, status ok), desync hersteld, uitval van de host van 8 s en terugkomen, uitval en herverbinden van de gast (binnen 5 s terug, kamercode voorgevuld), betalen en opslaan (750 bij de gast), filmpje, een gast verlaat de sessie, een late gast sluit aan (`late mockgast verbonden`), de host stopt |
| suite `lijst` (`--gasten=1`) | host + 1 Electron-gast, nep-broker | niet gedraaid: afgebroken voor het prestatievenster van de coordinator |

Met drie Electron-instanties tegelijk (`--gasten=2`) is niet gedraaid: de slotwrapper stond de hele ronde op 3 van 3 bezet door andere sessies en er was 1 tot 3 GB geheugen vrij; drie instanties van elk ca. 2 GB vragen dat niet te forceren. Drie en vier spelers zijn wel gespeeld, maar dan met headless gasten (mock) naast de Electron-instanties.

Pure en TCP-tests die groen zijn op deze branch: alle `scripts/net_*_test.mjs` en `scripts/coop*_test.mjs`, `scripts/coop/regressie_test.mjs`, `vrijdag_test`, `hostwissel_test`, `bijbaanrollen_test`, `bijbaan_test`, `bijbaanparallel_test`, `farmfieldguest_test`, `boerderijwereld_test`, `simhudgast_test`. `coop_tcp_test` en `coopduur_test` zijn bewust niet opnieuw gedraaid (lang).

## De Samen-missies (M30, pannenkoekenwedstrijd, bezorgteam): niet in deze branch

De branch `worktree-agent-aeb7fdd3615b2bdcf` (zie docs/SAMEN-MISSIES-20-11.md op die branch) is in een aparte branch gemerged: `samen-ronde-20-11-met-missies` (merge van deze branch plus die van aeb7fdd). Op die branch zijn de eigen tests groen (`samenposten_test`, `coopmissie_posten_test`, `coopwedstrijd_pannenkoek_test`, `coop/bezorgteam_test`, en over echte TCP `samenmissies_tcp_test` en `samenwedstrijd_tcp_test` met 2 en 4 spelers). De merge had conflicten in `sidejob_bezorger.js` (de bewaking van deze ronde naast de teamlogica), `CHANGELOG.md` en `docs/README.md`; die zijn opgelost, en `bezorgteam_test` kreeg `addMesh` en `removeMesh` in de nepcontext omdat de bezorger sinds #985 een lichtkolom heeft.

Ze zijn **niet** naar deze branch gemerged. De Electron-runs hierboven bewijzen de sessie (verbinden, wegvallen, later aansluiten), niet M30, de pannenkoekenwedstrijd of het bezorgteam: die vragen een verhaalstand (M30) of een eigen testbankstap in Electron die er niet is. De TCP-tests bewijzen de berichten en de regels, niet wat een speler ziet. Wil de coordinator ze toch hebben, dan is de branch klaar om te mergen; ze zijn dan "nog niet bekeken" in beeld.

## Open

- Drie of vier Electron-instanties tegelijk (geheugen en sloten) en de suite `lijst` (join via de openbare lijst) in Electron.
- De taxirit in de `net`-suite werd niet beoordeeld (`rit-spawn` kon de host of Tessa niet laten instappen; de run meldt dat zelf als niet beoordeeld).
- M30, de pannenkoekenwedstrijd en het bezorgteam in Electron: een testbankstap met een gast-HUD-screenshot ontbreekt.
- De gast-HUD-bewaking is alleen op de bron getest; de echte bijbaan van een gast bij een host die zelf in een spel met sim-HUD zit is niet in beeld gezien.
