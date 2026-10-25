# Tech stack

## Overzicht

Eén spel in gewone ES-modules, zonder bundler. Dezelfde code draait in de browser,
in Electron (desktop) en via Capacitor op Android. De wereld is data die bij het
bouwen wordt gemaakt; de code is de bron van waarheid, [ARCHITECTURE.md](../../ARCHITECTURE.md)
is de kaart.

## Kern

### Taal

**Primair**: JavaScript (ES-modules, `import`/`export`, geen TypeScript, geen build-stap voor de gamecode).
**Node**: v24 op de ontwikkelmachine; de scripts draaien op Node 18 of hoger.

### Engine en rendering

**Engine**: Three.js **0.160.0**, geladen via een import map in `game/index.html`
(`https://cdn.jsdelivr.net/npm/three@0.160.0/...`). Er is geen bundler en er komen
geen nieuwe npm-pakketten in het spel zelf.

### Runtime

| Doel | Runtime | Entry |
| --- | --- | --- |
| Browser (hoofddoel) | moderne Chromium/WebGL2 | `game/index.html` → `game/js/main.js` |
| Desktop | Electron `^44.9.0`, electron-builder `^26.15.3` | `desktop/main.js` |
| Android | Capacitor `8.5.3` | `android/` |

### Data

Geen database en geen server. De wereld komt uit OpenStreetMap en open data, wordt
bij het bouwen omgezet naar `.gdt`-tegels (RD New, EPSG:28992) in `game/world/`
(staat niet in git), en wordt met streaming geladen. Spelvoortgang staat in
`localStorage` onder `gde-*`-sleutels met een versie en migraties
(`game/js/savemigrate.js`, `game/js/storagekeys.js`).

### Multiplayer

WebRTC met signalering via openbare brokers, STUN voor NAT-traversal en een
end-to-end versleutelde datachannel. Geen accounts, geen server van ons.

## Ontwikkelgereedschap

- **Packagemanager**: npm, per deel (`desktop/`, `android/`); geen root-`package.json`.
- **Build**: eigen scripts (`desktop/build.mjs` staget de wereld, `web/build.mjs` de webversie).
- **Tests**: gewone Node-scripts, geen framework (zie `testing-standards.md`).
- **Lint/format**: geen linter; `node --check` op gewijzigde JS is de minimale poort.
  Stijl volgt de omliggende code.

## Versie-eisen

| Gereedschap | Minimaal | Op de dev-machine |
| --- | --- | --- |
| Node | 18 | 24 |
| npm | 9 | mee met Node |
| Python 3 | 3.10 (kaartscripts) | aanwezig |

## Externe bronnen (alleen lezen, geen spelersgegevens)

OpenStreetMap (ODbL), PDOK/Kadaster/CBS, 3D BAG, AHN, Esri World Imagery (alleen
lokaal, niet meegeleverd) en de live buslocaties met een uitzetter in Instellingen.
Zie [docs/LICENTIES.md](../../docs/LICENTIES.md) en AGENTS.md regel 4.
