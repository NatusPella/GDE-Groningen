# Showcase: bouwen met AI

Materiaal om te laten zien wat een klein team met AI in dit project heeft gebouwd. Alles is gemaakt uit de repo, GitHub en de gebouwde wereld;
niets is gepubliceerd of geüpload.

| Bestand | Wat |
|---|---|
| [SCHAAL.md](SCHAAL.md) | Het cijferblad: elk cijfer met zijn bron en een eventueel voorbehoud |
| [schaal.json](schaal.json) | Hetzelfde, machineleesbaar, met tijdlijnen (commits en issues per dag) |
| [schaal-cijfers.json](schaal-cijfers.json) | De cijfers die op een dia of in een video komen, met kort label |
| [SCHATTING.md](SCHATTING.md) | Schatting "traditioneel versus met AI", met aannames; nadrukkelijk een schatting |
| [SHOWCASE-VIDEO.md](SHOWCASE-VIDEO.md) en [showcase-video.json](showcase-video.json) | Scenario, storyboard en teksten voor een video van 3 minuten |

Opnieuw meten (de cijfers verouderen elk uur):

```bash
node scripts/stats/schaal.mjs --json=docs/showcase/schaal.json --md=docs/showcase/SCHAAL.md --overlays=docs/showcase/schaal-cijfers.json --stil
```

Voor de wereldcijfers is een gebouwde `game/world` nodig (`cd desktop && npm run stage`, of `--wereld=<map>`); voor de cutscene-, bijbaan- en prestatietellingen de three.js-cache van die stage
(`desktop/vendor-cache`). Wat ontbreekt, staat in `niet_gemeten` en niet als een verzonnen getal. `--geen-gh` slaat de GitHub-cijfers over.
Presentaties en teksten voor een bepaald evenement horen niet in git.
