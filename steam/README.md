# Steam (SteamPipe) template

Prepared for when GDE Groningen gets a Steam app (Steam Direct, $100; see
the "Steam-klaar" issue on the GitHub board). There is no Steam account or app id yet, so
nothing here has been uploaded, and nothing in this repo contacts Steam.

```
steam/
  scripts/app_build.vdf            the app build: app id, depots, content root
  scripts/depot_build_windows.vdf  one depot per OS, each mapping content/<os>/
  scripts/depot_build_mac.vdf
  scripts/depot_build_linux.vdf
  copy-builds.mjs                  desktop/dist -> content/<os>/
  make-build-vdf.mjs               fills in the ids -> output/vdf/ (the templates stay as they are)
  make-steam-files.mjs             Steam Input actions + achievements table, from the game's own data
  achievements.json, steam_input/  the generated files
  content/   (gitignored)          what gets uploaded
  output/    (gitignored)          SteamPipe logs and cache
```

## 1. Build and fill `content/`

Steam installs the unpacked app, not the dmg, the portable exe or the
AppImage. electron-builder leaves those folders in `desktop/dist/`:

| Depot | Copied from | Launch option (executable) |
|---|---|---|
| windows | `dist/win-unpacked/` | `GDE Groningen.exe` |
| mac | `dist/mac-universal/GDE Groningen.app` | `GDE Groningen.app` |
| linux | `dist/linux-unpacked/` | `gde-groningen` |

```bash
cd desktop
npm run dist:mac && npx electron-builder --win --x64 && npx electron-builder --linux
node ../steam/copy-builds.mjs          # or: node ../steam/copy-builds.mjs linux
```

Or as part of a release: `npm run release -- minor --linux --steam` copies
the builds before it cleans `dist/`. The three folders take about 1 GB;
delete `steam/content/` after uploading.

## 2. Once there is an app id

1. In Steamworks: create the app, then under **SteamPipe > Depots** one depot
   per OS (Windows 64-bit, macOS, Linux + SteamOS). Note the ids.
2. Fill in the ids. Either run
   `node steam/make-build-vdf.mjs --app=<id> --windows=<id> --mac=<id> --linux=<id>`
   (writes filled copies to `steam/output/vdf/`, as a dry run: `"Preview" "1"`; add
   `--live-upload` for a real upload, `--beta=<branch>` to set a beta branch live; a depot id you
   leave out is dropped), or replace by hand `APP_ID` in `scripts/app_build.vdf` and
   `DEPOT_ID_WINDOWS` / `DEPOT_ID_MAC` / `DEPOT_ID_LINUX` in `app_build.vdf` and each `depot_build_*.vdf`.
   The templates in git keep the placeholders (`scripts/steam_test.mjs` checks that).
3. **Installation > General**: a launch option per OS with the executable
   from the table above.
4. Install the Steamworks SDK (it contains `steamcmd` in
   `sdk/tools/ContentBuilder/builder_osx/`) or `brew install steamcmd`.
   Use a separate Steam account with only build rights, with Steam Guard.
5. Upload (from the repo root). `make-build-vdf.mjs` prints the exact command; by hand:

   ```bash
   steamcmd +login <build-account> +run_app_build "$(pwd)/steam/output/vdf/app_build.vdf" +quit
   ```

   `"SetLive" ""` uploads without making the build live; set it live by
   hand in Steamworks (**SteamPipe > Builds**), first on a beta branch.
   `"Preview" "1"` does a dry run that only writes the manifest to
   `output/`.

## Notes

- **Saves.** The app keeps its data in the `GDE Groningen` folder on every OS
  (`desktop/userdata.js`; copied once from the pre-0.29 folder):
  `%APPDATA%\GDE Groningen`, `~/Library/Application Support/GDE Groningen`,
  `~/.config/GDE Groningen`. Use that for Steam Cloud (Auto-Cloud) later.
- **File modes.** A Windows disk keeps no Unix executable bits. Copy and upload the
  linux and mac depots from Linux or the Mac (`copy-builds.mjs` warns on Windows);
  otherwise Electron's helpers (`chrome_crashpad_handler`, the launch file) arrive
  without the executable flag.
- **Steam Deck and Linux.** Test on the device (checklist: `docs/STEAM-CHECKLIST.md`). If Electron
  fails to start inside the Steam Linux Runtime with a sandbox error (`chrome-sandbox` is
  not setuid in a Steam install), add `--no-sandbox` as the launch argument
  for the Linux launch option. Steam sets `SteamDeck=1` on the Deck; the game then starts
  with its Deck defaults (`game/js/deck.js`).
- **macOS.** The app is ad-hoc signed (`desktop/scripts/adhoc-sign.cjs`);
  Steam downloads get no quarantine flag, so no Gatekeeper prompt. The copy
  keeps the symlinks inside the `.app`.
- **Overlay.** The game has no Steamworks library (nothing here contacts Steam). The overlay
  hooks the window from outside; for Chromium that works best when the GPU work runs in the
  process Steam started. Put `--steam-overlay` in the launch options to switch that on
  (`desktop/steamflags.cjs`: `in-process-gpu`, plus `disable-direct-composition` on Windows);
  without it nothing changes. It has not been tried with a real Steam client: test Shift+Tab on
  Windows and on the Deck before you keep it. Achievements need the Steamworks library and are not
  connected (`achievements.json` is only the table).
- **Trial build.** `electron-builder --win --x64 --dir` and `--linux --x64 --dir` leave
  `win-unpacked/GDE Groningen.exe` and `linux-unpacked/gde-groningen` in `desktop/dist/`,
  which `copy-builds.mjs` copies as they are (tried on 20 Oct 2026: 620 MB and 535 MB).
