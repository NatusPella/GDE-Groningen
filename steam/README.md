# Steam (SteamPipe) template

Prepared for when GDE Groningen gets a Steam app (Steam Direct, $100; see
ROADMAP.md, "Steam-klaar"). There is no Steam account or app id yet, so
nothing here has been uploaded, and nothing in this repo contacts Steam.

```
steam/
  scripts/app_build.vdf            the app build: app id, depots, content root
  scripts/depot_build_windows.vdf  one depot per OS, each mapping content/<os>/
  scripts/depot_build_mac.vdf
  scripts/depot_build_linux.vdf
  copy-builds.mjs                  desktop/dist -> content/<os>/
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
2. Replace the placeholders: `APP_ID` in `scripts/app_build.vdf`, and
   `DEPOT_ID_WINDOWS` / `DEPOT_ID_MAC` / `DEPOT_ID_LINUX` in `app_build.vdf`
   and in each `depot_build_*.vdf`.
3. **Installation > General**: a launch option per OS with the executable
   from the table above.
4. Install the Steamworks SDK (it contains `steamcmd` in
   `sdk/tools/ContentBuilder/builder_osx/`) or `brew install steamcmd`.
   Use a separate Steam account with only build rights, with Steam Guard.
5. Upload (from the repo root):

   ```bash
   steamcmd +login <build-account> +run_app_build "$(pwd)/steam/scripts/app_build.vdf" +quit
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
- **Steam Deck and Linux.** Test on the device. If Electron fails to start
  inside the Steam Linux Runtime with a sandbox error (`chrome-sandbox` is
  not setuid in a Steam install), add `--no-sandbox` as the launch argument
  for the Linux launch option.
- **macOS.** The app is ad-hoc signed (`desktop/scripts/adhoc-sign.cjs`);
  Steam downloads get no quarantine flag, so no Gatekeeper prompt. The copy
  keeps the symlinks inside the `.app`.
- **Overlay.** The Steam overlay with Electron is untested (ROADMAP).
