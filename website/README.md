# De marketingpagina (#37): runbook voor de eigenaar

Deze map bouwt de landingspagina van GDE Groningen: één statische pagina in het Nederlands,
met de screenshots uit `docs/screenshots/` en het social-preview-beeld. **Er gaat niets vanzelf
openbaar.** De pagina wordt pas gebouwd en gepubliceerd als jij de workflow met de hand start,
en dat kan pas nadat de repo publiek is. Zet de repo dus pas op Public als je er klaar voor bent.

Dit is de **marketingpagina**, niet de game-webversie. De webversie hosten is een apart spoor
(#57) en komt hier niet op: deze pagina laadt bewust niets van buiten (geen CDN, geen
lettertypen van derden, geen analytics) en gebruikt geen JavaScript.

## Stappen, in deze volgorde

1. **Maak de repo publiek.** Dat is #37 en een eigenaarshandeling: Settings → General →
   onderaan "Danger Zone" → Change visibility → Make public. Controleer eerst
   `node scripts/publish_check.mjs --history` en de checklist in `docs/PUBLICEREN.md`.
2. **Zet GitHub Pages aan.** Ga naar Settings → Pages en kies bij "Build and deployment"
   als Source: **GitHub Actions**.
3. **Start de workflow.** Ga naar Actions → **Pages (marketing)** → Run workflow (branch
   `main`). De workflow heeft alleen `workflow_dispatch`: niets anders start hem.
4. **Controleer de URL.** Na de deploy staat de pagina op
   <https://natuspella.github.io/GDE-Groningen/>. Kijk of het beeld, de knoppen naar de
   Releases en de perskit-link werken. Dit is meteen de canonical-URL en de basis voor
   `og:image` (dat is `https://natuspella.github.io/GDE-Groningen/img/social-preview.png`).
5. **Optioneel maar aan te raden: het environment `github-pages`.** De deploy-job gebruikt
   dat environment. Voeg in Settings → Environments → `github-pages` een verplichte
   beoordelaar toe (jezelf), dan vraagt GitHub je bij elke deploy om akkoord en kan een
   collaborator niets publiceren.

Onthoud bij stap 3: dit publiceert alleen de marketingpagina. De game-webversie komt hier
niet op te staan (#57) en heeft een eigen spoor nodig.

## Wat de workflow doet

1. `actions/checkout@v4` en `actions/setup-node@v4` (LTS).
2. `node website/build.mjs`: bouwt `website/_site/` uit `website/index.html`,
   `website/style.css`, het app-icoon `desktop/resources/icon.svg` en de gekozen beelden.
   Geen npm en geen netwerk: alleen Node built-ins.
3. `actions/upload-pages-artifact@v3` met pad `website/_site`.
4. `actions/deploy-pages@v4` in het environment `github-pages`.

Er is geen `actions/upload-artifact` en er worden geen releases of assets gepubliceerd.
`node scripts/publish_check.mjs` meldt deze workflow als WARN (`workflow-handmatig`): dat is
de bedoeling, want de eigenaar beslist wanneer de pagina live gaat.

## Lokaal bekijken

```bash
node website/build.mjs      # maakt website/_site/
node website/serve.mjs      # http://127.0.0.1:8099/
node scripts/website_test.mjs
```

`website/_site/` staat in `.gitignore` en hoort niet in git. De test bouwt zelf opnieuw en
controleert onder meer: geen externe laadbronnen, geen merknamen van anderen, de meta- en
Open Graph-tags, de 18+-vermelding, alle relatieve paden, de CTA naar de Releases en dat de
workflow alleen handmatig start.

## Kosten en privacy

- Een publieke repo heeft gratis Actions-minuten; deze workflow gebruikt er per deploy maar
  een paar (bouwen en uploaden, geen npm-install).
- De pagina op GitHub Pages is statisch: hij verstuurt niets van de bezoeker, gebruikt geen
  cookies of analytics en laadt niets van externe servers. Het spel zelf (dat je bij de
  Releases downloadt) is een apart verhaal: dat speelt offline en stuurt alleen iets als de
  speler Samen spelen of de live busposities zelf aanzet, zie `docs/PRIVACY-EN-CREDITS.md`.
- GitHub Pages is van GitHub en valt onder hun voorwaarden en privacybeleid; dat is de
  hosting, niet de pagina.
